import { Router } from "express";
import { handleGitHubWebhook, webhookHealthCheck } from "../webhooks/githubWebhook.js";

const router = Router();

router.post('/github', handleGitHubWebhook)
router.get('/health', webhookHealthCheck)

export default router;