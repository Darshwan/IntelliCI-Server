import { Router } from "express";
import Build from "../models/Build.js";
import { getBuildStatus, startBuild } from "../controllers/build.controller.js";
const router = Router();

router.post('/test-build', startBuild)
router.get('/builds/:id', getBuildStatus)

export default router;