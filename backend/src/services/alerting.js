const { query } = require("../db");
const { METRICS, evaluate } = require("../rules");

const LABELS = { temperature: "Temperature", humidity: "Humidity", air_quality: "Air quality" };
const UNITS = { temperature: "°C", humidity: "%", air_quality: " AQI" };

// Last known state per "location:metric". An alert is stored on a transition
// into Warning or Critical, not on every reading, so a sustained breach is
// reported once rather than every five seconds.
const lastState = new Map();

/** Evaluates one stored reading against its location's bands (FR5). */
async function evaluateReading(reading, locationName) {
  const bands = await query(
    "SELECT config_id, metric, warn_min, warn_max, crit_min, crit_max FROM threshold_config WHERE location_id = ?",
    [reading.location_id]
  );
  const created = [];
  for (const metric of METRICS) {
    const band = bands.find((b) => b.metric === metric);
    const state = evaluate(reading[metric], band);
    const key = `${reading.location_id}:${metric}`;
    const previous = lastState.get(key);
    lastState.set(key, state);

    if (state !== "good" && state !== previous) {
      const message =
        `${LABELS[metric]} in ${locationName} reached ${Number(reading[metric]).toFixed(1)}${UNITS[metric]}, ` +
        `outside the ${state} band.`;
      const result = await query(
        "INSERT INTO alerts (reading_id, config_id, severity, message) VALUES (?, ?, ?, ?)",
        [reading.reading_id, band.config_id, state, message]
      );
      created.push({ alert_id: result.insertId, severity: state, metric, message });
    }
  }
  return created;
}

const resetState = () => lastState.clear();

module.exports = { evaluateReading, resetState };
