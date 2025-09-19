import { Router } from "express";
import Build from "../models/Build.js";
import { getBuilds, getBuildStatus, startBuild } from "../controllers/build.controller.js";
const router = Router();

router.post('/test-build', startBuild)
router.get('/builds/:id', getBuildStatus)
router.get('/builds', getBuilds)

export default router;