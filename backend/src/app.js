const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const config = require("./config");
const metrics = require("./metrics");
const { query } = require("./db");
const { authenticate } = require("./auth");

/**
 * The Express application, exported separately from server.js so the
 * integration tests can drive it in-process with Supertest.
 */
const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);                       // correct client IP behind Nginx / cloud proxy
app.use(helmet());                               // secure HTTP response headers
app.use(cors({ origin: config.corsOrigin === "*" ? true : config.corsOrigin.split(",") }));
app.use(express.json({ limit: "20kb" }));        // reject oversized request bodies
app.use(metrics.middleware);

app.get("/health", async (req, res) => {
  try {
    await query("SELECT 1");
    res.json({ status: "ok", database: "up" });
  } catch {
    res.status(503).json({ status: "degraded", database: "down" });
  }
});

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", metrics.register.contentType);
  res.send(await metrics.register.metrics());
});

app.use("/api/auth", require("./routes/auth"));
// Every other /api route requires a valid token.
app.use("/api", authenticate, require("./routes/sensors"), require("./routes/admin"));

app.use("/api", (req, res) => res.status(404).json({ error: "Endpoint not found." }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: "Malformed JSON body." });
  if (err.type === "entity.too.large") return res.status(413).json({ error: "Request body too large." });
  if (err.code === "ER_CHECK_CONSTRAINT_VIOLATED") return res.status(400).json({ error: "Value outside the allowed range." });
  console.error(err);
  // Internal details are logged, never returned to the client.
  res.status(500).json({ error: "Something went wrong on the server." });
});

module.exports = app;
