const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const config = require("./config");

/**
 * A connection pool reuses database connections across requests instead of
 * opening one per request, which keeps the five-second poll cheap.
 * Every query uses placeholders (?), so user input is never concatenated
 * into SQL — the standard defence against SQL injection.
 */
const pool = mysql.createPool({
  ...config.db,
  waitForConnections: true,
  connectionLimit: 10,
  multipleStatements: false,
  decimalNumbers: true,
  timezone: "Z",
});

const query = async (sql, params = []) => {
  const [rows] = await pool.query(sql, params);
  return rows;
};

/** Retries until MySQL accepts connections — containers start in any order. */
async function waitForDatabase(retries = 30, delayMs = 2000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch (err) {
      if (attempt === retries) throw err;
      console.log(`Waiting for database (${attempt}/${retries}): ${err.code || err.message}`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

/** Creates any missing tables. Safe to run on every start (CREATE ... IF NOT EXISTS). */
async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, "..", "db", "schema.sql"), "utf8");
  const statements = sql
    .split(/;\s*$/m)
    .map((s) => s.replace(/--.*$/gm, "").trim())
    .filter(Boolean);
  for (const statement of statements) await pool.query(statement);
}

module.exports = { pool, query, waitForDatabase, migrate };
