import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import rulesRouter from "./rules";
import alertsRouter from "./alerts";
import methodsRouter from "./methods";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(rulesRouter);
router.use(alertsRouter);
router.use(methodsRouter);
router.use(settingsRouter);

export default router;
