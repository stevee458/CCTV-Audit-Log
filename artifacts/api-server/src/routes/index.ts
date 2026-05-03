import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import referenceRouter from "./reference";
import inspectionsRouter from "./inspections";
import findingsRouter from "./findings";
import statsRouter from "./stats";
import drivesRouter from "./drives";
import assetsRouter from "./assets";
import stockRouter from "./stock";
import maintenanceRouter from "./maintenance";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(referenceRouter);
router.use(inspectionsRouter);
router.use(findingsRouter);
router.use(statsRouter);
router.use(drivesRouter);
router.use(assetsRouter);
router.use(stockRouter);
router.use(maintenanceRouter);

export default router;
