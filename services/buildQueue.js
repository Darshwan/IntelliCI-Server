import { Queue, Worker } from "bullmq"
import { runBuild } from "./buildRunner.js";

const connection = { host: "localhost", port: 6379 };

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