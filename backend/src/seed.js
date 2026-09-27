const bcrypt = require("bcryptjs");
const { query } = require("./db");
const config = require("./config");

/**
 * Seeds the reference data from Assessments 1 and 2 on first start only.
 * Passwords are stored as bcrypt hashes (cost factor 10); the plain-text
 * demo password never reaches the database.
 */
const USERS = [
  ["Saad Ebn Rashid Mrinmoy", "saadebnrashid10@gmail.com", "Administrator", true],
  ["Samir B K", "samir.bk@sistc.nsw.edu.au", "Administrator", true],
  ["Muhammad Khizar", "miankhizer86@gmail.com", "End User", true],
  ["Aawash Tripathi", "a.tripathi@sistc.nsw.edu.au", "End User", true],
  ["Prabin Chhantyal", "p.chhantyal@sistc.nsw.edu.au", "End User", false],
];

// [name, type, email of the End User it is assigned to]
const LOCATIONS = [
  ["Room A", "Classroom", "miankhizer86@gmail.com"],
  ["Room B", "Classroom", "miankhizer86@gmail.com"],
  ["Office", "Office", "a.tripathi@sistc.nsw.edu.au"],
  ["Lab", "Laboratory", "p.chhantyal@sistc.nsw.edu.au"],
];

const SOURCES = [
  ["DHT22 Sensor — Room A", "IoT Sensor", "gpio://dht22-a", false],
  ["DHT22 Sensor — Room B", "IoT Sensor", "gpio://dht22-b", false],
  ["OpenWeather API", "Public API", "https://api.openweathermap.org/data/2.5", false],
  ["Simulated Generator", "Simulated", "internal://generator", true],
  ["Legacy Lab Probe", "IoT Sensor", "gpio://probe-legacy", false],
];

const DEFAULT_BANDS = {
  temperature: [18, 26, 15, 30],
  humidity: [35, 60, 25, 70],
  air_quality: [0, 80, 0, 120],
};

const BASELINE = {
  "Room A": { temperature: 22.4, humidity: 47, air_quality: 38 },
  "Room B": { temperature: 23.1, humidity: 52, air_quality: 44 },
  Office: { temperature: 21.6, humidity: 44, air_quality: 31 },
  Lab: { temperature: 25.8, humidity: 58, air_quality: 76 },
};

const drift = (value, amplitude, min, max) =>
  Math.min(max, Math.max(min, value + (Math.random() - 0.5) * amplitude));

async function seed({ force = false } = {}) {
  const [{ n }] = await query("SELECT COUNT(*) AS n FROM roles");
  if (n > 0 && !force) return false;

  await query(
    "INSERT INTO roles (role_name, permission_set) VALUES (?, ?), (?, ?)",
    ["Administrator", "read:all,write:users,write:thresholds,write:sources,ack:alerts",
     "End User", "read:assigned"]
  );

  const hash = await bcrypt.hash(config.seedPassword, 10);
  for (const [name, email, role, active] of USERS) {
    await query(
      `INSERT INTO users (role_id, full_name, email, password_hash, is_active)
       SELECT role_id, ?, ?, ?, ? FROM roles WHERE role_name = ?`,
      [name, email, hash, active, role]
    );
  }

  for (const [name, type, email] of LOCATIONS) {
    await query(
      "INSERT INTO locations (user_id, name, type) SELECT user_id, ?, ? FROM users WHERE email = ?",
      [name, type, email]
    );
  }

  for (const [name, type, endpoint, active] of SOURCES) {
    await query(
      "INSERT INTO data_sources (name, source_type, endpoint, is_active) VALUES (?, ?, ?, ?)",
      [name, type, endpoint, active]
    );
  }

  const locations = await query("SELECT location_id, name FROM locations ORDER BY location_id");
  const [simulator] = await query("SELECT source_id FROM data_sources WHERE source_type = 'Simulated' LIMIT 1");

  for (const loc of locations) {
    for (const [metric, [wmin, wmax, cmin, cmax]] of Object.entries(DEFAULT_BANDS)) {
      await query(
        `INSERT INTO threshold_config (location_id, metric, warn_min, warn_max, crit_min, crit_max)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [loc.location_id, metric, wmin, wmax, cmin, cmax]
      );
    }

    // 48 hours of half-hourly history so the trends chart has data on day one.
    let s = { ...BASELINE[loc.name] };
    const now = Date.now();
    const rows = [];
    for (let i = 96; i >= 1; i--) {
      s = {
        temperature: drift(s.temperature, 1.1, 14, 32),
        humidity: drift(s.humidity, 3.2, 22, 74),
        air_quality: drift(s.air_quality, 9.0, 12, 140),
      };
      rows.push([loc.location_id, simulator.source_id, s.temperature.toFixed(2),
                 s.humidity.toFixed(2), s.air_quality.toFixed(2), new Date(now - i * 1800000)]);
    }
    await query(
      "INSERT INTO sensor_readings (location_id, source_id, temperature, humidity, air_quality, recorded_at) VALUES ?",
      [rows]
    );
  }
  return true;
}

module.exports = { seed, BASELINE };
