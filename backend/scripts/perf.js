/**
 * Response-time measurement for the non-functional requirement
 * "respond to user requests within two seconds" (Capstone Project 1, Table 3.2).
 *
 * Usage (inside Docker):  docker compose exec api npm run perf
 * Optional environment:   API_URL, PERF_REQUESTS (default 200), PERF_CONCURRENCY (default 10)
 */
const API = process.env.API_URL || `http://localhost:${process.env.PORT || 4000}`;
const TOTAL = Number(process.env.PERF_REQUESTS || 200);
const CONCURRENCY = Number(process.env.PERF_CONCURRENCY || 10);
const EMAIL = process.env.PERF_EMAIL || "saadebnrashid10@gmail.com";
const PASSWORD = process.env.PERF_PASSWORD || process.env.SEED_PASSWORD || "Demo@2026";

const percentile = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];

async function measure(label, path, token) {
  const times = [];
  let failures = 0;
  let issued = 0;
  const worker = async () => {
    while (issued < TOTAL) {
      issued++;
      const start = performance.now();
      const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
      await res.text();
      times.push(performance.now() - start);
      if (!res.ok) failures++;
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  times.sort((a, b) => a - b);
  const avg = times.reduce((s, t) => s + t, 0) / times.length;
  return {
    Endpoint: label, Requests: times.length, Failed: failures,
    "Avg (ms)": avg.toFixed(1), "p95 (ms)": percentile(times, 95).toFixed(1),
    "Max (ms)": times[times.length - 1].toFixed(1),
    "Under 2 s": times.every((t) => t < 2000) ? "Yes" : "No",
  };
}

(async () => {
  const loginStart = performance.now();
  const res = await fetch(`${API}/api/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const loginMs = performance.now() - loginStart;
  if (!res.ok) throw new Error(`Login failed: ${res.status} ${await res.text()}`);
  const { token } = await res.json();

  console.log(`\nPerformance test — ${TOTAL} requests per endpoint, ${CONCURRENCY} concurrent clients, against ${API}`);
  console.log(`Login (bcrypt verification + token issue): ${loginMs.toFixed(1)} ms\n`);

  const results = [];
  results.push(await measure("GET /api/sensors (live poll)", "/api/sensors", token));
  results.push(await measure("GET /api/sensors/1/history?hours=48", "/api/sensors/1/history?hours=48", token));
  results.push(await measure("GET /api/readings?limit=200", "/api/readings?limit=200", token));
  results.push(await measure("GET /api/alerts", "/api/alerts", token));
  results.push(await measure("GET /api/thresholds", "/api/thresholds", token));
  console.table(results);
})().catch((err) => { console.error(err.message); process.exit(1); });
