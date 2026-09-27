/**
 * Business rules shared by the API, the simulator and the tests.
 * They mirror the front end's src/lib/data.js so both sides agree.
 */
const METRICS = ["temperature", "humidity", "air_quality"];
const ROLES = { ADMIN: "Administrator", END_USER: "End User" };

/**
 * State model from Capstone Project 1, Figure 3.8: outside the critical band
 * is Critical, outside the warning band is Warning, otherwise Normal
 * ("good"). Critical is tested first so the more severe state always wins.
 */
function evaluate(value, band) {
  if (!band) return "good";
  if (value < band.crit_min || value > band.crit_max) return "critical";
  if (value < band.warn_min || value > band.warn_max) return "warning";
  return "good";
}

/** Returns an error message for an invalid band, or null when it is valid. */
function validateBand(band) {
  if (!band || typeof band !== "object") return "Band is missing.";
  const fields = ["warn_min", "warn_max", "crit_min", "crit_max"];
  for (const f of fields) {
    if (typeof band[f] !== "number" || !Number.isFinite(band[f])) return `${f} must be a number.`;
  }
  if (band.warn_min > band.warn_max) return "The warning minimum must not exceed the maximum.";
  if (band.crit_min > band.crit_max) return "The critical minimum must not exceed the maximum.";
  if (band.crit_min > band.warn_min) return "The critical minimum must sit at or below the warning minimum.";
  if (band.crit_max < band.warn_max) return "The critical maximum must sit at or above the warning maximum.";
  return null;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = { METRICS, ROLES, evaluate, validateBand, EMAIL_PATTERN };
