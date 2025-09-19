import runBuild from "../services/buildRunner";
import crypto from 'crypto';
import Build from '../models/Build.js';
import { runBuild } from '../services/buildRunner.js';

export function verifyGitHubSignature(req, secret) {
    const signature = req.headers['x-hub-signature-256']
    const payload = JSON.stringify(req.body)

    if (!signature || !secret) {
        console.warn('Missing signature or secret');
        return false;
    }

    const hmac = crypto.createHmac('sha256', secret)
    const digest = 'sha256=' + hmac.update(payload).digest('hex')

    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(digest)
    )
}

// Extract the relevant information from the webhook payload

export function parseWebhookPayload(body) {
    const { repository, ref, head_commit } = body

    if (!repository || !ref || !head_commit) {
        throw new Error('Invalid webhook payload: missing repository or ref')
    }
    const branch = ref.replace('refs/heads/', '')

    return {
        repoFullName: repository.full_name,
        repoUrl: repository.clone_url,
        branch: branch,
        commit: head_commit ? {
            hash: head_commit, id,
            message: head_commit.message,
            author: head_commit.author?.name || 'unknown'
        } : null
    }
}

// Main WebHook Handler

export async function handleGitHubWebhook(req, res) {
    const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET
    const eventType = req.headers['x-github-event']

    try {
        // 1 Verify Webhook Signature
        if (!verifyGitHubSignature(req, WEBHOOK_SECRET)) {
            console.warn('Invalid signature')
            return res.status(401).json({ error: 'Invalid Signature' })
        }

        // 2 Only handle push events
        if (eventType !== 'push') {
            console.log(`Ignoring non-push event: ${eventType}`);
            return res.status(200).json({ message: 'Ignoring non-push event' });
        }

        // 3 parse the webhook payload
        const { repoFullName, repoUrl, branch, commit } = parseWebhookPayload(req.body)
        console.log(`GitHub webhook received: ${repoFullName}@${branch}`)

        // 4 Create a new build record
        const newBuild = new Build({
            repo: repoFullName,
            branch: branch,
            commit: commit,
            status: 'pending',
            trigger: 'github_webhook',
            eventType: eventType
        })

        await newBuild.save()

        // 5 Start the build process asynchronously
        runBuild(newBuild._id, repoUrl, branch)

        // 6 Respond to Github immediately
        res.status(202).json({
            message: "Buid Started Successfully",
            buildId: newBuild._id,
            repo: repoFullName,
            branch: branch
        })
        console.log(`Build started: ${newBuild._id} for ${repoFullName}`);
    } catch (error) {
        console.error('Webhook processing error:', error);
        res.status(500).json({
            error: 'Failed to process webhook',
            details: error.message
        });
    }
}