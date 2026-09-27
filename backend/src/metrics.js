const client = require("prom-client");

/**
 * Prometheus metrics (FR9), carried forward from Capstone Project 1.
 * The request-duration histogram is what the performance evaluation uses
 * to check the two-second response-time requirement.
 */
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [register],
});

function middleware(req, res, next) {
  const end = httpDuration.startTimer();
  res.on("finish", () => {
    const route = req.route ? `${req.baseUrl}${req.route.path}` : req.baseUrl || "unmatched";
    end({ method: req.method, route, status: res.statusCode });
  });
  next();
}

module.exports = { register, middleware };
