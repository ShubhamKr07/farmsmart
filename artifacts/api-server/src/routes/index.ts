import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import cyclesRouter from "./cycles";
import growthProfilesRouter from "./growthProfiles";
import seedLotsRouter from "./seedLots";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(cyclesRouter);
router.use(growthProfilesRouter);
router.use(seedLotsRouter);

export default router;
