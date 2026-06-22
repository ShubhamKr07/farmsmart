import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import growthProfilesRouter from "./growthProfiles";
import seedLotsRouter from "./seedLots";
import mediaRouter from "./media";
import layoutRouter from "./layout";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(growthProfilesRouter);
router.use(seedLotsRouter);
router.use(mediaRouter);
router.use(layoutRouter);

export default router;
