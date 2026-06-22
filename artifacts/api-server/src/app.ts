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
app.use(cors());
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

// Public admin routes (no auth required)
app.use("/api", dashboardRouter);
app.use("/api", alertsRouter);
app.use("/api", inventoryRouter);
app.use("/api", shipmentsRouter);
app.use("/api", badTraysRouter);
// Cycles: GET routes are public for admin dashboard; write routes enforce auth internally
app.use("/api", cyclesRouter);
app.use("/api", layoutRouter);

// Health + authenticated routes
app.use("/api", healthRouter);
app.use("/api", requireSignedIn, router);

export default app;
