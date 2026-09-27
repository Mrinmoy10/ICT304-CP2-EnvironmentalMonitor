const express = require("express");
const bcrypt = require("bcryptjs");
const { query, pool } = require("../db");
const { requireRole, canSeeLocation } = require("../auth");
const { METRICS, ROLES, validateBand, EMAIL_PATTERN } = require("../rules");
const { ah, idParam, lastActive } = require("./helpers");

const router = express.Router();
const adminOnly = requireRole(ROLES.ADMIN);

/* ---------------- Thresholds (FR5, FR8) ---------------- */

/** GET /api/thresholds — bands for every visible location, keyed by location then metric. */
router.get("/thresholds", ah(async (req, res) => {
  if (!req.locationIds.length) return res.json({});
  const rows = await query(
    "SELECT location_id, metric, warn_min, warn_max, crit_min, crit_max FROM threshold_config WHERE location_id IN (?)",
    [req.locationIds]
  );
  const out = {};
  rows.forEach(({ location_id, metric, ...band }) => {
    out[location_id] = out[location_id] || {};
    out[location_id][metric] = band;
  });
  res.json(out);
}));

/** PUT /api/thresholds/:locationId — replace all three bands for one location (Administrator). */
router.put("/thresholds/:locationId", adminOnly, ah(async (req, res) => {
  const id = idParam(req.params.locationId);
  if (!id || !canSeeLocation(req, id)) return res.status(404).json({ error: "Location not found." });

  for (const metric of METRICS) {
    const problem = validateBand(req.body?.[metric]);
    if (problem) return res.status(400).json({ error: `${metric}: ${problem}` });
  }

  // All three bands change together or not at all.
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const metric of METRICS) {
      const b = req.body[metric];
      await conn.query(
        `INSERT INTO threshold_config (location_id, metric, warn_min, warn_max, crit_min, crit_max)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE warn_min = VALUES(warn_min), warn_max = VALUES(warn_max),
                                 crit_min = VALUES(crit_min), crit_max = VALUES(crit_max)`,
        [id, metric, b.warn_min, b.warn_max, b.crit_min, b.crit_max]
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
  res.json({ location_id: id, ...Object.fromEntries(METRICS.map((m) => [m, req.body[m]])) });
}));

/* ---------------- Alerts (FR5) ---------------- */

/** GET /api/alerts?status=open|all — alerts for visible locations, newest first. */
router.get("/alerts", ah(async (req, res) => {
  if (!req.locationIds.length) return res.json([]);
  const openOnly = req.query.status !== "all";
  const rows = await query(
    `SELECT a.alert_id, a.severity, a.message, a.created_at, t.metric, l.location_id, l.name AS location,
            ack.acknowledged_at, u.full_name AS acknowledged_by
       FROM alerts a
       JOIN threshold_config t ON t.config_id = a.config_id
       JOIN locations l ON l.location_id = t.location_id
       LEFT JOIN alert_acknowledgements ack ON ack.alert_id = a.alert_id
       LEFT JOIN users u ON u.user_id = ack.user_id
      WHERE l.location_id IN (?) ${openOnly ? "AND ack.ack_id IS NULL" : ""}
      ORDER BY a.created_at DESC LIMIT 100`,
    [req.locationIds]
  );
  res.json(rows.map((r) => ({
    ...r,
    created_at: new Date(r.created_at).getTime(),
    acknowledged: !!r.acknowledged_at,
    acknowledged_at: r.acknowledged_at ? new Date(r.acknowledged_at).getTime() : null,
  })));
}));

/** POST /api/alerts/:id/acknowledge — records who cleared an alert and when (Administrator). */
router.post("/alerts/:id/acknowledge", adminOnly, ah(async (req, res) => {
  const id = idParam(req.params.id);
  const [alert] = id ? await query("SELECT alert_id FROM alerts WHERE alert_id = ?", [id]) : [];
  if (!alert) return res.status(404).json({ error: "Alert not found." });

  const [existing] = await query("SELECT ack_id FROM alert_acknowledgements WHERE alert_id = ?", [id]);
  if (existing) return res.status(409).json({ error: "This alert has already been acknowledged." });

  const note = req.body?.note ? String(req.body.note).slice(0, 255) : null;
  await query("INSERT INTO alert_acknowledgements (alert_id, user_id, note) VALUES (?, ?, ?)", [id, req.user.user_id, note]);
  res.status(201).json({ alert_id: id, acknowledged: true, acknowledged_by: req.user.full_name });
}));

/* ---------------- Users (FR8) ---------------- */

const USER_SELECT = `
  SELECT u.user_id, u.full_name, u.email, u.is_active, u.last_login_at, r.role_name AS role,
         IF(r.role_name = 'Administrator', 'All locations',
            IFNULL((SELECT GROUP_CONCAT(l.name ORDER BY l.location_id SEPARATOR ', ')
                      FROM locations l WHERE l.user_id = u.user_id), '—')) AS locations
    FROM users u JOIN roles r ON r.role_id = u.role_id`;

const presentUser = (u) => ({
  user_id: u.user_id, full_name: u.full_name, email: u.email, role: u.role,
  locations: u.locations, is_active: !!u.is_active, last_active: lastActive(u.last_login_at),
});

/** GET /api/users — every account; password hashes are never returned. */
router.get("/users", adminOnly, ah(async (req, res) => {
  const rows = await query(`${USER_SELECT} ORDER BY u.user_id`);
  res.json(rows.map(presentUser));
}));

/** POST /api/users — create an account (no self-registration; A1 business rules). */
router.post("/users", adminOnly, ah(async (req, res) => {
  const full_name = String(req.body?.full_name || "").trim();
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const role = req.body?.role === ROLES.ADMIN ? ROLES.ADMIN : ROLES.END_USER;

  if (full_name.length < 2 || full_name.length > 100) return res.status(400).json({ error: "Full name is required." });
  if (!EMAIL_PATTERN.test(email)) return res.status(400).json({ error: "A valid email address is required." });
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });

  const [clash] = await query("SELECT user_id FROM users WHERE email = ?", [email]);
  if (clash) return res.status(409).json({ error: "An account with this email already exists." });

  const hash = await bcrypt.hash(password, 10);
  const result = await query(
    `INSERT INTO users (role_id, full_name, email, password_hash)
     SELECT role_id, ?, ?, ? FROM roles WHERE role_name = ?`,
    [full_name, email, hash, role]
  );
  const [created] = await query(`${USER_SELECT} WHERE u.user_id = ?`, [result.insertId]);
  res.status(201).json(presentUser(created));
}));

/** PATCH /api/users/:id — enable or disable an account. Accounts are disabled, never deleted. */
router.patch("/users/:id", adminOnly, ah(async (req, res) => {
  const id = idParam(req.params.id);
  if (typeof req.body?.is_active !== "boolean") return res.status(400).json({ error: "is_active must be true or false." });
  if (id === req.user.user_id && req.body.is_active === false) {
    return res.status(400).json({ error: "You cannot disable your own account." });
  }
  const result = id ? await query("UPDATE users SET is_active = ? WHERE user_id = ?", [req.body.is_active, id]) : null;
  if (!result || result.affectedRows === 0) return res.status(404).json({ error: "User not found." });
  const [updated] = await query(`${USER_SELECT} WHERE u.user_id = ?`, [id]);
  res.json(presentUser(updated));
}));

/* ---------------- Data sources (FR1, FR8) ---------------- */

router.get("/sources", adminOnly, ah(async (req, res) => {
  const rows = await query("SELECT source_id, name, source_type, endpoint, is_active FROM data_sources ORDER BY source_id");
  res.json(rows.map((s) => ({ ...s, is_active: !!s.is_active })));
}));

router.patch("/sources/:id", adminOnly, ah(async (req, res) => {
  const id = idParam(req.params.id);
  if (typeof req.body?.is_active !== "boolean") return res.status(400).json({ error: "is_active must be true or false." });
  const result = id ? await query("UPDATE data_sources SET is_active = ? WHERE source_id = ?", [req.body.is_active, id]) : null;
  if (!result || result.affectedRows === 0) return res.status(404).json({ error: "Data source not found." });
  const [updated] = await query("SELECT source_id, name, source_type, endpoint, is_active FROM data_sources WHERE source_id = ?", [id]);
  res.json({ ...updated, is_active: !!updated.is_active });
}));

module.exports = router;
