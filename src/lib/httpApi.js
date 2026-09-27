/**
 * Client for the Express REST API (Capstone Project 2 back end).
 *
 * The function names and response shapes are the contract agreed in
 * Assessment 2, so no screen had to change when the mock was replaced.
 * The JWT is held in memory only (not localStorage), so a script injected
 * into the page cannot read a stored token, and signing out or closing the
 * tab ends the session.
 */
const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
let token = null;

async function request(path, { method = "GET", body } = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const error = new Error(data?.error || `Request failed (${res.status}).`);
    error.status = res.status;
    throw error;
  }
  return data;
}

export const httpApi = {
  mode: "live",

  /** POST /api/auth/login */
  async login(email, password) {
    const data = await request("/auth/login", { method: "POST", body: { email, password } });
    token = data.token;
    return { ...data.user, token: data.token };
  },

  logout() { token = null; },

  /** GET /api/sensors — latest reading for every visible location */
  getReadings: () => request("/sensors"),

  /** GET /api/sensors/:id/history */
  getHistory: (locationId, hours = 48) => request(`/sensors/${locationId}/history?hours=${hours}`),

  /** GET /api/readings — newest first */
  getAllReadings: () => request("/readings?limit=300"),

  getThresholds: () => request("/thresholds"),
  saveThresholds: (locationId, bands) => request(`/thresholds/${locationId}`, { method: "PUT", body: bands }),

  getAlerts: () => request("/alerts?status=open"),
  acknowledgeAlert: (alertId) => request(`/alerts/${alertId}/acknowledge`, { method: "POST", body: {} }),

  getUsers: () => request("/users"),
  setUserActive: (userId, isActive) => request(`/users/${userId}`, { method: "PATCH", body: { is_active: isActive } }),
  createUser: (user) => request("/users", { method: "POST", body: user }),

  getSources: () => request("/sources"),
  setSourceActive: (sourceId, isActive) => request(`/sources/${sourceId}`, { method: "PATCH", body: { is_active: isActive } }),
};
