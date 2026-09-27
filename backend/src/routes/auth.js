const express = require("express");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const { query } = require("../db");
const { authenticate, signToken } = require("../auth");
const { EMAIL_PATTERN, ROLES } = require("../rules");
const { ah } = require("./helpers");

const router = express.Router();

// Brute-force protection: at most 10 sign-in attempts per 15 minutes per address.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.LOGIN_RATE_LIMIT || 10),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many sign-in attempts. Try again in 15 minutes." },
});

/** Describes the account the way the front end expects it. */
async function describe(user) {
  let locations = "All locations";
  if (user.role !== ROLES.ADMIN) {
    const rows = await query("SELECT name FROM locations WHERE user_id = ? ORDER BY location_id", [user.user_id]);
    locations = rows.map((r) => r.name).join(", ");
  }
  return { user_id: user.user_id, full_name: user.full_name, email: user.email, role: user.role, locations, is_active: !!user.is_active };
}

/** POST /api/auth/login — FR7 secure login. */
router.post("/login", loginLimiter, ah(async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  if (!EMAIL_PATTERN.test(email) || !password) {
    return res.status(400).json({ error: "Enter a valid email address and password." });
  }

  const [user] = await query(
    `SELECT u.user_id, u.full_name, u.email, u.password_hash, u.is_active, r.role_name AS role
       FROM users u JOIN roles r ON r.role_id = u.role_id WHERE u.email = ?`,
    [email]
  );

  // One generic message for an unknown email or a wrong password, so the
  // endpoint cannot be used to discover which email addresses have accounts.
  const valid = user && (await bcrypt.compare(password, user.password_hash));
  if (!valid) return res.status(401).json({ error: "Incorrect email or password." });
  if (!user.is_active) {
    return res.status(403).json({ error: "This account has been disabled or not yet activated. Contact an administrator." });
  }

  await query("UPDATE users SET last_login_at = NOW() WHERE user_id = ?", [user.user_id]);
  res.json({ token: signToken(user), user: await describe(user) });
}));

/** GET /api/auth/me — the signed-in account. */
router.get("/me", authenticate, ah(async (req, res) => res.json(await describe(req.user))));

module.exports = router;
