const jwt = require("jsonwebtoken");
const config = require("./config");
const { query } = require("./db");
const { ROLES } = require("./rules");

/** Loads the account with its role and the names of its assigned locations. */
async function loadUser(userId) {
  const [user] = await query(
    `SELECT u.user_id, u.full_name, u.email, u.is_active, u.last_login_at, r.role_name AS role
       FROM users u JOIN roles r ON r.role_id = u.role_id
      WHERE u.user_id = ?`,
    [userId]
  );
  return user || null;
}

/**
 * Location IDs the account may see (Assessment 1, Table 1). Filtering is done
 * here, in the data layer, so an unassigned location is never sent to the
 * browser rather than merely hidden by it.
 */
async function visibleLocationIds(user) {
  const rows =
    user.role === ROLES.ADMIN
      ? await query("SELECT location_id FROM locations ORDER BY location_id")
      : await query("SELECT location_id FROM locations WHERE user_id = ? ORDER BY location_id", [user.user_id]);
  return rows.map((r) => r.location_id);
}

function signToken(user) {
  return jwt.sign({ sub: user.user_id, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
    algorithm: "HS256",
  });
}

/**
 * Verifies the bearer token, then re-reads the account from the database on
 * every request. A token therefore stops working the moment an administrator
 * disables the account, instead of remaining valid until it expires.
 */
async function authenticate(req, res, next) {
  const header = req.get("authorization") || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Authentication required." });
  }
  try {
    const payload = jwt.verify(token, config.jwtSecret, { algorithms: ["HS256"] });
    const user = await loadUser(payload.sub);
    if (!user || !user.is_active) {
      return res.status(401).json({ error: "This account is no longer active." });
    }
    req.user = user;
    req.locationIds = await visibleLocationIds(user);
    next();
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Session expired or invalid. Please sign in again." });
    }
    next(err);
  }
}

/** Role-based access control: only the listed roles may continue. */
const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role)
    ? next()
    : res.status(403).json({ error: "You do not have permission to perform this action." });

/** Object-level authorisation (OWASP API1:2023): the location must be visible to the caller. */
function canSeeLocation(req, locationId) {
  return req.locationIds.includes(Number(locationId));
}

module.exports = { authenticate, requireRole, signToken, loadUser, visibleLocationIds, canSeeLocation };
