/**
 * Integration tests: every request goes through Express, the authentication
 * middleware and a real MySQL database (a separate test database).
 */
process.env.SIMULATOR = "off";
process.env.LOGIN_RATE_LIMIT = "1000";

const request = require("supertest");
const app = require("../src/app");
const { pool, query, migrate, waitForDatabase } = require("../src/db");
const { seed } = require("../src/seed");
const simulator = require("../src/services/simulator");
const { resetState } = require("../src/services/alerting");

const PASSWORD = "Demo@2026";
const ADMIN = "saadebnrashid10@gmail.com";
const END_USER = "miankhizer86@gmail.com";   // assigned Room A and Room B
const DISABLED = "p.chhantyal@sistc.nsw.edu.au";

let adminToken;
let userToken;

const login = (email, password = PASSWORD) =>
  request(app).post("/api/auth/login").send({ email, password });
const as = (token) => ({ Authorization: `Bearer ${token}` });

beforeAll(async () => {
  await waitForDatabase(15, 2000);
  await query("SET FOREIGN_KEY_CHECKS = 0");
  for (const t of ["alert_acknowledgements", "alerts", "threshold_config", "sensor_readings",
                   "data_sources", "locations", "users", "roles"]) {
    await query(`DROP TABLE IF EXISTS ${t}`);
  }
  await query("SET FOREIGN_KEY_CHECKS = 1");
  await migrate();
  await seed();
  resetState();
  adminToken = (await login(ADMIN)).body.token;
  userToken = (await login(END_USER)).body.token;
});

afterAll(() => pool.end());

describe("Health and monitoring (FR9)", () => {
  test("GET /health reports the API and database are up", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", database: "up" });
  });
  test("GET /metrics returns Prometheus exposition format", async () => {
    const res = await request(app).get("/metrics");
    expect(res.status).toBe(200);
    expect(res.text).toContain("http_request_duration_seconds");
  });
});

describe("Authentication (FR7)", () => {
  test("valid credentials return a JWT and the account profile", async () => {
    const res = await login(ADMIN);
    expect(res.status).toBe(200);
    expect(res.body.token.split(".")).toHaveLength(3);
    expect(res.body.user).toMatchObject({ email: ADMIN, role: "Administrator", locations: "All locations" });
    expect(res.body.user.password_hash).toBeUndefined();
  });
  test("wrong password and unknown email give the same generic 401", async () => {
    const wrong = await login(ADMIN, "not-the-password");
    const unknown = await login("nobody@example.com");
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error).toBe(unknown.body.error);
  });
  test("a disabled account is refused with 403", async () => {
    const res = await login(DISABLED);
    expect(res.status).toBe(403);
  });
  test("a malformed email is rejected with 400", async () => {
    expect((await login("not-an-email")).status).toBe(400);
  });
  test("an SQL-injection attempt is handled safely", async () => {
    const res = await login("' OR '1'='1' -- @x.com", "' OR '1'='1");
    expect([400, 401]).toContain(res.status);
  });
  test("passwords are stored as bcrypt hashes, never plain text", async () => {
    const rows = await query("SELECT password_hash FROM users");
    rows.forEach((r) => expect(r.password_hash).toMatch(/^\$2[aby]\$10\$/));
  });
});

describe("Protected endpoints", () => {
  test("a request without a token is rejected with 401", async () => {
    expect((await request(app).get("/api/sensors")).status).toBe(401);
  });
  test("a tampered token is rejected with 401", async () => {
    const res = await request(app).get("/api/sensors").set(as(adminToken.slice(0, -2) + "xx"));
    expect(res.status).toBe(401);
  });
});

describe("Sensor data and access control (FR2, FR3, FR4, FR6)", () => {
  test("an administrator receives the latest reading for all four locations", async () => {
    const res = await request(app).get("/api/sensors").set(as(adminToken));
    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual(["1", "2", "3", "4"]);
    expect(res.body[1]).toEqual(expect.objectContaining({
      temperature: expect.any(Number), humidity: expect.any(Number), air_quality: expect.any(Number),
    }));
  });
  test("an end user receives only their assigned locations", async () => {
    const res = await request(app).get("/api/sensors").set(as(userToken));
    expect(Object.keys(res.body).sort()).toEqual(["1", "2"]);
  });
  test("an end user cannot read history for an unassigned location (403)", async () => {
    const res = await request(app).get("/api/sensors/3/history").set(as(userToken));
    expect(res.status).toBe(403);
  });
  test("history is returned in time order as 30-minute averages", async () => {
    const res = await request(app).get("/api/sensors/1/history?hours=48").set(as(userToken));
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(90);
    const times = res.body.map((r) => r.recorded_at);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });
  test("the readings table is newest-first, limited, and filtered by access", async () => {
    const res = await request(app).get("/api/readings?limit=50").set(as(userToken));
    expect(res.body).toHaveLength(50);
    expect(new Set(res.body.map((r) => r.location))).toEqual(new Set(["Room A", "Room B"]));
    expect(res.body[0].recorded_at).toBeGreaterThanOrEqual(res.body[49].recorded_at);
  });
  test("the database refuses an out-of-range reading (CHECK constraint)", async () => {
    await expect(
      query("INSERT INTO sensor_readings (location_id, source_id, temperature, humidity, air_quality) VALUES (1, 4, 20, 140, 30)")
    ).rejects.toThrow();
  });
});

describe("Thresholds and alerts (FR5)", () => {
  const bands = {
    temperature: { warn_min: 18, warn_max: 26, crit_min: 15, crit_max: 30 },
    humidity: { warn_min: 35, warn_max: 60, crit_min: 25, crit_max: 70 },
    air_quality: { warn_min: 0, warn_max: 80, crit_min: 0, crit_max: 120 },
  };

  test("an end user cannot change thresholds (403)", async () => {
    const res = await request(app).put("/api/thresholds/1").set(as(userToken)).send(bands);
    expect(res.status).toBe(403);
  });
  test("a badly ordered band is rejected with 400", async () => {
    const res = await request(app).put("/api/thresholds/1").set(as(adminToken))
      .send({ ...bands, temperature: { warn_min: 18, warn_max: 26, crit_min: 20, crit_max: 30 } });
    expect(res.status).toBe(400);
  });
  test("a valid change is saved and returned by GET /api/thresholds", async () => {
    // A band far below Room A's ~22 °C baseline guarantees every simulated reading is Critical.
    const narrow = { ...bands, temperature: { warn_min: 19, warn_max: 19.5, crit_min: 18.5, crit_max: 20 } };
    expect((await request(app).put("/api/thresholds/1").set(as(adminToken)).send(narrow)).status).toBe(200);
    const res = await request(app).get("/api/thresholds").set(as(adminToken));
    expect(res.body[1].temperature).toEqual(narrow.temperature);
  });
  test("a reading outside the band creates a stored alert linked to that reading", async () => {
    await simulator.collectOnce();
    const res = await request(app).get("/api/alerts").set(as(adminToken));
    const roomA = res.body.filter((a) => a.location === "Room A" && a.metric === "temperature");
    expect(roomA.length).toBe(1);
    expect(roomA[0].severity).toBe("critical");
    const [row] = await query("SELECT reading_id FROM alerts WHERE alert_id = ?", [roomA[0].alert_id]);
    expect(row.reading_id).toBeGreaterThan(0);
  });
  test("a sustained breach does not create a duplicate alert", async () => {
    const before = (await query("SELECT COUNT(*) AS n FROM alerts a JOIN threshold_config t ON t.config_id = a.config_id WHERE t.location_id = 1 AND t.metric = 'temperature'"))[0].n;
    await simulator.collectOnce();
    const after = (await query("SELECT COUNT(*) AS n FROM alerts a JOIN threshold_config t ON t.config_id = a.config_id WHERE t.location_id = 1 AND t.metric = 'temperature'"))[0].n;
    expect(after).toBe(before);
  });
  test("only an administrator can acknowledge, and only once", async () => {
    const [alert] = (await request(app).get("/api/alerts").set(as(adminToken))).body;
    expect((await request(app).post(`/api/alerts/${alert.alert_id}/acknowledge`).set(as(userToken))).status).toBe(403);
    const ack = await request(app).post(`/api/alerts/${alert.alert_id}/acknowledge`).set(as(adminToken));
    expect(ack.status).toBe(201);
    expect(ack.body.acknowledged_by).toBe("Saad Ebn Rashid Mrinmoy");
    expect((await request(app).post(`/api/alerts/${alert.alert_id}/acknowledge`).set(as(adminToken))).status).toBe(409);
  });
});

describe("User and data-source administration (FR1, FR8)", () => {
  test("an end user cannot list users (403)", async () => {
    expect((await request(app).get("/api/users").set(as(userToken))).status).toBe(403);
  });
  test("the user list never exposes password hashes", async () => {
    const res = await request(app).get("/api/users").set(as(adminToken));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(5);
    res.body.forEach((u) => expect(u.password_hash).toBeUndefined());
  });
  test("an administrator can create an account, and duplicates or weak passwords are refused", async () => {
    const body = { full_name: "Test Person", email: "test.person@example.com", password: "Str0ngPass!", role: "End User" };
    expect((await request(app).post("/api/users").set(as(adminToken)).send(body)).status).toBe(201);
    expect((await request(app).post("/api/users").set(as(adminToken)).send(body)).status).toBe(409);
    expect((await request(app).post("/api/users").set(as(adminToken)).send({ ...body, email: "x@example.com", password: "short" })).status).toBe(400);
    expect((await login("test.person@example.com", "Str0ngPass!")).status).toBe(200);
  });
  test("an administrator cannot disable their own account", async () => {
    const [me] = await query("SELECT user_id FROM users WHERE email = ?", [ADMIN]);
    const res = await request(app).patch(`/api/users/${me.user_id}`).set(as(adminToken)).send({ is_active: false });
    expect(res.status).toBe(400);
  });
  test("disabling an account revokes its existing session immediately", async () => {
    const [khizar] = await query("SELECT user_id FROM users WHERE email = ?", [END_USER]);
    expect((await request(app).patch(`/api/users/${khizar.user_id}`).set(as(adminToken)).send({ is_active: false })).status).toBe(200);
    expect((await request(app).get("/api/sensors").set(as(userToken))).status).toBe(401);
    await request(app).patch(`/api/users/${khizar.user_id}`).set(as(adminToken)).send({ is_active: true });
  });
  test("disabling the simulated source stops readings being collected", async () => {
    const sources = (await request(app).get("/api/sources").set(as(adminToken))).body;
    const sim = sources.find((s) => s.source_type === "Simulated");
    await request(app).patch(`/api/sources/${sim.source_id}`).set(as(adminToken)).send({ is_active: false });
    expect(await simulator.collectOnce()).toBe(0);
    await request(app).patch(`/api/sources/${sim.source_id}`).set(as(adminToken)).send({ is_active: true });
    expect(await simulator.collectOnce()).toBe(4);
  });
});

describe("Data retention (privacy)", () => {
  test("readings past the retention period are purged unless an alert references them", async () => {
    await query("INSERT INTO sensor_readings (location_id, source_id, temperature, humidity, air_quality, recorded_at) VALUES (2, 4, 22, 50, 40, NOW() - INTERVAL 60 DAY)");
    const [old] = await query("SELECT reading_id FROM sensor_readings WHERE recorded_at < NOW() - INTERVAL 59 DAY");
    const purged = await simulator.purgeOldReadings();
    expect(purged).toBeGreaterThanOrEqual(1);
    const [gone] = await query("SELECT reading_id FROM sensor_readings WHERE reading_id = ?", [old.reading_id]);
    expect(gone).toBeUndefined();
  });
});

describe("Robustness", () => {
  test("an unknown endpoint returns 404 JSON", async () => {
    const res = await request(app).get("/api/does-not-exist").set(as(adminToken));
    expect(res.status).toBe(404);
  });
  test("a malformed JSON body returns 400, not a server error", async () => {
    const res = await request(app).post("/api/auth/login").set("Content-Type", "application/json").send("{bad json");
    expect(res.status).toBe(400);
  });
});
