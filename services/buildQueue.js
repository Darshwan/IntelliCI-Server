import { Queue, Worker } from "bullmq"
import { runBuild } from "./buildRunner.js";
import IORedis from "ioredis"

const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  tls: {},
});

export const buildQueue = new Queue("builds", { connection })

const worker = new Worker("builds", async job => {
    console.log(`Processing build: ${job.id}`);
    return await runBuild(job.data.repoPath);
}, { connection });

worker.on("completed", (job, result) => {
  console.log(`Build ${job.id} finished:`, result);
});

worker.on("failed", (job, error) => {
  console.error(`Build ${job.id} failed:`, error.message);
});