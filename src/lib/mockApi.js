/**
 * In-browser mock of the REST API (Assessment 2).
 *
 * Kept so the public Netlify prototype still works without a server, and so
 * the interface can be demonstrated offline. It implements exactly the same
 * functions and response shapes as httpApi.js, which talks to the real
 * Express API. src/lib/api.js chooses between the two at build time.
 */
import { LOCATIONS, USERS, DATA_SOURCES, defaultThresholds, evaluate, visibleLocations } from "./data.js";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clone = (v) => JSON.parse(JSON.stringify(v));

const baseline = {
  1: { temperature: 22.4, humidity: 47, air_quality: 38 },
  2: { temperature: 23.1, humidity: 52, air_quality: 44 },
  3: { temperature: 21.6, humidity: 44, air_quality: 31 },
  4: { temperature: 25.8, humidity: 58, air_quality: 76 },
};

const drift = (value, amplitude, min, max) =>
  Math.min(max, Math.max(min, value + (Math.random() - 0.5) * amplitude));

const live = clone(baseline);
let users = clone(USERS);
let sources = clone(DATA_SOURCES);
let thresholds = defaultThresholds();
let alerts = [];
let session = null;
const lastState = {};

function tick() {
  Object.keys(live).forEach((id) => {
    live[id].temperature = drift(live[id].temperature, 0.6, 12, 34);
    live[id].humidity = drift(live[id].humidity, 2.0, 20, 78);
    live[id].air_quality = drift(live[id].air_quality, 6.0, 10, 150);
    // Same rule as the server: store an alert on transition into Warning or Critical.
    ["temperature", "humidity", "air_quality"].forEach((metric) => {
      const state = evaluate(live[id][metric], thresholds[id][metric]);
      const key = `${id}:${metric}`;
      if (state !== "good" && state !== lastState[key]) {
        const location = LOCATIONS.find((l) => l.location_id === Number(id));
        alerts.unshift({
          alert_id: alerts.length + 1, severity: state, metric, location_id: Number(id),
          location: location.name, created_at: Date.now(), acknowledged: false,
          message: `${metric} in ${location.name} outside the ${state} band.`,
        });
      }
      lastState[key] = state;
    });
  });
}

/** Seed 96 half-hourly readings (48 hours) per location so trends have something to draw. */
const history = {};
LOCATIONS.forEach((l) => {
  history[l.location_id] = [];
  const now = Date.now();
  let s = { ...baseline[l.location_id] };
  for (let i = 95; i >= 0; i--) {
    s = {
      temperature: drift(s.temperature, 1.1, 14, 32),
      humidity: drift(s.humidity, 3.2, 22, 74),
      air_quality: drift(s.air_quality, 9.0, 12, 140),
    };
    history[l.location_id].push({ recorded_at: now - i * 1800000, ...s });
  }
});

const allowedIds = () => visibleLocations(session).map((l) => l.location_id);
const pick = (obj) => Object.fromEntries(Object.entries(obj).filter(([id]) => allowedIds().includes(Number(id))));

export const mockApi = {
  mode: "mock",

  async login(email, password) {
    await delay(600);
    const user = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user || password.length < 4) throw new Error("Incorrect email or password.");
    if (!user.is_active) throw new Error("This account has been disabled or not yet activated. Contact an administrator.");
    session = user;
    return { ...user, token: `mock.jwt.${user.user_id}` };
  },

  logout() { session = null; },

  async getReadings() {
    await delay(120);
    tick();
    return clone(pick(live));
  },

  async getHistory(locationId) {
    await delay(300);
    return history[locationId];
  },

  async getAllReadings() {
    await delay(400);
    const rows = [];
    LOCATIONS.filter((l) => allowedIds().includes(l.location_id)).forEach((l) => {
      history[l.location_id].slice(-18).forEach((r) => rows.push({ location_id: l.location_id, location: l.name, ...r }));
    });
    return rows.sort((a, b) => b.recorded_at - a.recorded_at);
  },

  async getThresholds() { await delay(100); return clone(pick(thresholds)); },
  async saveThresholds(locationId, bands) { await delay(200); thresholds[locationId] = clone(bands); return bands; },

  async getAlerts() {
    await delay(80);
    return clone(alerts.filter((a) => !a.acknowledged && allowedIds().includes(a.location_id)));
  },
  async acknowledgeAlert(alertId) {
    await delay(150);
    alerts = alerts.map((a) => (a.alert_id === alertId ? { ...a, acknowledged: true, acknowledged_by: session.full_name } : a));
    return { alert_id: alertId, acknowledged: true };
  },

  async getUsers() { await delay(200); return clone(users); },
  async setUserActive(userId, isActive) {
    await delay(150);
    users = users.map((u) => (u.user_id === userId ? { ...u, is_active: isActive } : u));
    return users.find((u) => u.user_id === userId);
  },
  async createUser() { throw new Error("Creating accounts needs the live back end."); },

  async getSources() { await delay(200); return clone(sources); },
  async setSourceActive(sourceId, isActive) {
    await delay(150);
    sources = sources.map((s) => (s.source_id === sourceId ? { ...s, is_active: isActive } : s));
    return sources.find((s) => s.source_id === sourceId);
  },
};
