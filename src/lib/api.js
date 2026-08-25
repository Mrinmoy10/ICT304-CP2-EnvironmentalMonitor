/**
 * Mock API layer.
 *
 * Every screen calls this module exactly as it will call the Express REST API
 * delivered in Assessment 3. Replacing the mock with live HTTP means editing
 * this file only — no component changes. The response shapes below are the
 * agreed API contract.
 */
import { LOCATIONS, USERS } from "./data.js";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const baseline = {
  1: { temperature: 22.4, humidity: 47, air_quality: 38 },
  2: { temperature: 23.1, humidity: 52, air_quality: 44 },
  3: { temperature: 21.6, humidity: 44, air_quality: 31 },
  4: { temperature: 25.8, humidity: 58, air_quality: 76 },
};

const drift = (value, amplitude, min, max) =>
  Math.min(max, Math.max(min, value + (Math.random() - 0.5) * amplitude));

const live = JSON.parse(JSON.stringify(baseline));

function tick() {
  Object.keys(live).forEach((id) => {
    live[id].temperature = drift(live[id].temperature, 0.6, 12, 34);
    live[id].humidity = drift(live[id].humidity, 2.0, 20, 78);
    live[id].air_quality = drift(live[id].air_quality, 6.0, 10, 150);
  });
}

/** Seed 48 half-hourly readings per location so trends have something to draw. */
const history = {};
LOCATIONS.forEach((l) => {
  history[l.location_id] = [];
  const now = Date.now();
  let s = { ...baseline[l.location_id] };
  for (let i = 47; i >= 0; i--) {
    s = {
      temperature: drift(s.temperature, 1.1, 14, 32),
      humidity: drift(s.humidity, 3.2, 22, 74),
      air_quality: drift(s.air_quality, 9.0, 12, 140),
    };
    history[l.location_id].push({ recorded_at: now - i * 1800000, ...s });
  }
});

export const api = {
  /** POST /api/auth/login */
  async login(email, password) {
    await delay(600);
    const user = USERS.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user) throw new Error("No account matches that email address.");
    if (!user.is_active) {
      throw new Error("This account has been invited but not yet activated. Contact an administrator.");
    }
    if (password.length < 4) throw new Error("Password must be at least 4 characters.");
    return { ...user, token: `mock.jwt.${user.user_id}` };
  },

  /** GET /api/sensors — latest reading for every location */
  async getReadings() {
    await delay(120);
    tick();
    return JSON.parse(JSON.stringify(live));
  },

  /** GET /api/sensors/:locationId/history */
  async getHistory(locationId) {
    await delay(300);
    return history[locationId];
  },

  /** GET /api/readings — full tabular record, most recent first */
  async getAllReadings() {
    await delay(400);
    const rows = [];
    LOCATIONS.forEach((l) => {
      history[l.location_id].slice(-18).forEach((r) => {
        rows.push({ location_id: l.location_id, location: l.name, ...r });
      });
    });
    return rows.sort((a, b) => b.recorded_at - a.recorded_at);
  },
};
