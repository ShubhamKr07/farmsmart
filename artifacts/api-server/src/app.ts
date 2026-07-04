import express, { type Express, type Request, type Response, type NextFunction } from "express";
import path from "node:path";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware, getAuth } from "@clerk/express";
import router from "./routes";
import healthRouter from "./routes/health";
import dashboardRouter from "./routes/dashboard";
import alertsRouter from "./routes/alerts";
import inventoryRouter from "./routes/inventory";
import shipmentsRouter from "./routes/shipments";
import badTraysRouter from "./routes/badTrays";
import cyclesRouter from "./routes/cycles";
import layoutRouter from "./routes/layout";
import sensorsRouter from "./routes/sensors";
import sensorReadingsRouter from "./routes/sensor-readings";
import tasksRouter from "./routes/tasks";
import cropsRouter from "./routes/crops";
import metricsRouter from "./routes/metrics";
import userSettingsRouter from "./routes/userSettings";
import { logger } from "./lib/logger";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
} from "./middlewares/clerkProxyMiddleware";
import { UPLOADS_DIR } from "./routes/media";

const app: Express = express();

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
// CORS: in production set CORS_ORIGIN to the dashboard URL; unset = allow all (dev).
app.use(cors({ origin: process.env.CORS_ORIGIN ?? true }));
app.use("/uploads", express.static(path.resolve(UPLOADS_DIR)));
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(clerkMiddleware());

function requireSignedIn(req: Request, res: Response, next: NextFunction) {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

// Public: health check only.
app.use("/api", healthRouter);

// Everything else requires a signed-in Clerk session (S1/S2). Per-route
// `enforceAuth` handlers in cycles/media remain as defense-in-depth.
app.use("/api", requireSignedIn, dashboardRouter);
app.use("/api", requireSignedIn, alertsRouter);
app.use("/api", requireSignedIn, inventoryRouter);
app.use("/api", requireSignedIn, shipmentsRouter);
app.use("/api", requireSignedIn, badTraysRouter);
app.use("/api", requireSignedIn, cyclesRouter);
app.use("/api", requireSignedIn, layoutRouter);
app.use("/api", requireSignedIn, sensorsRouter);
app.use("/api", requireSignedIn, sensorReadingsRouter);
app.use("/api", requireSignedIn, tasksRouter);
app.use("/api", requireSignedIn, cropsRouter);
app.use("/api", requireSignedIn, metricsRouter);
app.use("/api", requireSignedIn, userSettingsRouter);
app.use("/api", requireSignedIn, router);

export default app;
