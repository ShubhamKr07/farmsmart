import app from "./app";
import { logger } from "./lib/logger";
import { seedDataIfEmpty } from "./routes/growthProfiles";
import { scanOverdueCyclesAndAlert } from "./lib/overdue-scanner";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

await seedDataIfEmpty();

// Overdue-cycle alert scan (R6): runs on startup and every 5 min. Removed from
// GET /dashboard so that endpoint stays read-only.
const runScan = () =>
  scanOverdueCyclesAndAlert(logger).catch((err) =>
    logger.error({ err }, "overdue scan failed"),
  );
void runScan();
setInterval(runScan, 5 * 60 * 1000);

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
