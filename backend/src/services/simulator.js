const { query } = require("../db");
const config = require("../config");
const { BASELINE } = require("../seed");
const { evaluateReading } = require("./alerting");

/**
 * Simulated data source (FR1). Physical sensors were out of scope for the
 * unit, so this generator produces realistic drifting readings through the
 * same path a real sensor would use: insert a reading, then evaluate it.
 * It only runs while the "Simulated" data source is enabled, so an
 * administrator can stop it from the Data Sources screen.
 */
const current = {};
const drift = (value, amplitude, min, max) =>
  Math.min(max, Math.max(min, value + (Math.random() - 0.5) * amplitude));

async function collectOnce() {
  const [source] = await query(
    "SELECT source_id, is_active FROM data_sources WHERE source_type = 'Simulated' ORDER BY source_id LIMIT 1"
  );
  if (!source || !source.is_active) return 0;

  const locations = await query("SELECT location_id, name FROM locations ORDER BY location_id");
  for (const loc of locations) {
    const base = current[loc.location_id] || { ...(BASELINE[loc.name] || { temperature: 22, humidity: 50, air_quality: 40 }) };
    const next = {
      temperature: drift(base.temperature, 0.6, 12, 34),
      humidity: drift(base.humidity, 2.0, 20, 78),
      air_quality: drift(base.air_quality, 6.0, 10, 150),
    };
    current[loc.location_id] = next;

    const result = await query(
      "INSERT INTO sensor_readings (location_id, source_id, temperature, humidity, air_quality) VALUES (?, ?, ?, ?, ?)",
      [loc.location_id, source.source_id, next.temperature.toFixed(2), next.humidity.toFixed(2), next.air_quality.toFixed(2)]
    );
    await evaluateReading({ reading_id: result.insertId, location_id: loc.location_id, ...next }, loc.name);
  }
  return locations.length;
}

/**
 * Data minimisation (Australian Privacy Principle 11.2): readings older than
 * the retention period are deleted, unless an alert still references them,
 * so the audit trail behind every alert is preserved.
 */
async function purgeOldReadings() {
  const result = await query(
    `DELETE r FROM sensor_readings r
      WHERE r.recorded_at < (NOW(3) - INTERVAL ? DAY)
        AND NOT EXISTS (SELECT 1 FROM alerts a WHERE a.reading_id = r.reading_id)`,
    [config.retentionDays]
  );
  return result.affectedRows;
}

function start() {
  const tick = () => collectOnce().catch((err) => console.error("Simulator error:", err.message));
  const collector = setInterval(tick, config.simulatorIntervalMs);
  const purger = setInterval(() => purgeOldReadings().catch(() => {}), 60 * 60 * 1000);
  tick();
  return () => { clearInterval(collector); clearInterval(purger); };
}

module.exports = { start, collectOnce, purgeOldReadings };
