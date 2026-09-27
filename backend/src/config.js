/**
 * Configuration is read from environment variables so the same image runs
 * unchanged on a laptop, in CI and in the cloud (twelve-factor style).
 */
const env = process.env;

const config = {
  port: Number(env.PORT || 4000),
  db: {
    host: env.DB_HOST || "localhost",
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER || "envapp",
    password: env.DB_PASSWORD || "envapp_password",
    database: env.DB_NAME || "envmonitor",
    ssl: env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  },
  jwtSecret: env.JWT_SECRET || "dev-only-secret-change-me",
  jwtExpiresIn: env.JWT_EXPIRES_IN || "8h",
  corsOrigin: env.CORS_ORIGIN || "*",
  simulatorIntervalMs: Number(env.SIM_INTERVAL_MS || 5000),
  simulatorEnabled: env.SIMULATOR !== "off",
  retentionDays: Number(env.RETENTION_DAYS || 30),
  seedPassword: env.SEED_PASSWORD || "Demo@2026",
};

if (env.NODE_ENV === "production" && config.jwtSecret === "dev-only-secret-change-me") {
  // Failing fast is safer than silently signing tokens with a public secret.
  throw new Error("JWT_SECRET must be set in production.");
}

module.exports = config;
