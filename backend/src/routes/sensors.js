const express = require("express");
const { query } = require("../db");
const { canSeeLocation } = require("../auth");
const { ah, idParam } = require("./helpers");

const router = express.Router();
const toMs = (d) => new Date(d).getTime();

/** GET /api/locations — the locations this account may monitor (FR4). */
router.get("/locations", ah(async (req, res) => {
  if (!req.locationIds.length) return res.json([]);
  res.json(await query(
    "SELECT location_id, name, type FROM locations WHERE location_id IN (?) ORDER BY location_id",
    [req.locationIds]
  ));
}));

/** GET /api/sensors — latest reading for every visible location (FR3). */
router.get("/sensors", ah(async (req, res) => {
  if (!req.locationIds.length) return res.json({});
  const rows = await query(
    `SELECT r.location_id, r.temperature, r.humidity, r.air_quality, r.recorded_at
       FROM sensor_readings r
       JOIN (SELECT location_id, MAX(recorded_at) AS latest
               FROM sensor_readings WHERE location_id IN (?) GROUP BY location_id) m
         ON m.location_id = r.location_id AND m.latest = r.recorded_at`,
    [req.locationIds]
  );
  const out = {};
  rows.forEach((r) => {
    out[r.location_id] = { temperature: r.temperature, humidity: r.humidity, air_quality: r.air_quality, recorded_at: toMs(r.recorded_at) };
  });
  res.json(out);
}));

/**
 * GET /api/sensors/:id/history?hours=48 — FR6 historical trends.
 * Readings are averaged into 30-minute buckets in the database, so the
 * response stays small however many raw readings the window contains.
 */
router.get("/sensors/:id/history", ah(async (req, res) => {
  const id = idParam(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid location id." });
  if (!canSeeLocation(req, id)) return res.status(403).json({ error: "You do not have access to this location." });

  const hours = Math.min(Math.max(Number(req.query.hours) || 48, 1), 168);
  const rows = await query(
    `SELECT FLOOR(UNIX_TIMESTAMP(recorded_at) / 1800) * 1800 AS bucket,
            ROUND(AVG(temperature), 2) AS temperature,
            ROUND(AVG(humidity), 2)    AS humidity,
            ROUND(AVG(air_quality), 2) AS air_quality
       FROM sensor_readings
      WHERE location_id = ? AND recorded_at >= NOW(3) - INTERVAL ? HOUR
      GROUP BY bucket ORDER BY bucket`,
    [id, hours]
  );
  res.json(rows.map((r) => ({
    recorded_at: Number(r.bucket) * 1000,
    temperature: Number(r.temperature),
    humidity: Number(r.humidity),
    air_quality: Number(r.air_quality),
  })));
}));

/** GET /api/readings?limit=200 — full tabular record, newest first (FR2, FR6). */
router.get("/readings", ah(async (req, res) => {
  if (!req.locationIds.length) return res.json([]);
  const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 1000);
  const rows = await query(
    `SELECT r.reading_id, r.location_id, l.name AS location, r.temperature, r.humidity, r.air_quality, r.recorded_at
       FROM sensor_readings r JOIN locations l ON l.location_id = r.location_id
      WHERE r.location_id IN (?)
      ORDER BY r.recorded_at DESC LIMIT ?`,
    [req.locationIds, limit]
  );
  res.json(rows.map((r) => ({ ...r, recorded_at: toMs(r.recorded_at) })));
}));

module.exports = router;
