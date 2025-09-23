import Build from '../models/Build.js';
import { buildQueue } from '../services/buildQueue.js';
import mongoose from 'mongoose'

export const startBuild = async (req, res) => {
    try {
        const io = req.app.locals.io;

        const { repoUrl, branch = 'main' } = req.body
        // Add to queue
        const job = await buildQueue.add("build", {
            repoUrl,
            branch,
            buildId: new mongoose.Types.ObjectId(),
        });
        

        if (!repoUrl) {
            return res.status(400).json({ error: 'repoUrl is required' });
        }

        // Create a new build
        const newBuild = new Build({
            repo: repoUrl,
            branch: branch,
            status: 'pending'
        })
        await newBuild.save()

        // Run the build process asynchronously
        const { runBuild } = await import('../services/buildRunner.js')
        runBuild(newBuild._id, repoUrl, branch, io)
        res.json({
            message: 'Build started!',
            jobId: job.id,
            buildId: newBuild._id,
            viewBuild: `http://localhost:${process.env.PORT}/api/builds/${newBuild._id}`
        })
    } catch (error) {
        console.error('Test build error:', error);
        res.status(500).json({ error: error.message });
    }
}

export const getBuildStatus = async (req, res) => {
    try {
        const build = await Build.findById(req.params.id)
        if (!build) {
            return res.status(404).json({ error: 'Build not found' });
        }
        res.json(build)
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export const getBuilds = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const builds = await Build.find()
            .sort({ createdAt: -1 })
            .limit(limit);

        res.json(builds);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch builds" });
    }
}