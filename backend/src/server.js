const config = require("./config");
const app = require("./app");
const { waitForDatabase, migrate } = require("./db");
const { seed } = require("./seed");
const simulator = require("./services/simulator");

async function main() {
  await waitForDatabase();
  await migrate();
  if (await seed()) console.log("Database seeded with reference data.");
  if (config.simulatorEnabled) simulator.start();
  app.listen(config.port, () => console.log(`API listening on port ${config.port}`));
}

main().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
