import path from 'path'
import fs from 'fs/promises'
import simpleGit from 'simple-git'
import Build from '../models/Build.js'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { io } from '../index.js'

// __dirname for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const TEMP_DIR = path.join(__dirname, '../temp_repos')

// Ensure TEMP_DIR exists
fs.mkdir(TEMP_DIR, { recursive: true }).catch(() => { })

export async function runBuild(buildId, repoUrl, branch = 'main') {
    console.log(`Starting build #${buildId} for ${repoUrl}`)

    const build = await Build.findById(buildId)
    if (!build) {
        console.error(`Build with ID #${buildId} not found in DB.`)
        return
    }

    const repoName = repoUrl.split('/').pop().replace('.git', '')
    const buildPath = path.join(TEMP_DIR, repoName, buildId.toString())

    try {
        // 1. Prepare build folder
        await fs.mkdir(buildPath, { recursive: true })

        // 2. Set to pending immediately
        build.status = 'pending'
        build.output = 'Starting build process...\n'
        await build.save()
        io.emit('new-build', build)

        // 3. Clone repo
        build.output += `Cloning repo ${repoUrl} (branch: ${branch})...\n`
        await build.save()
        await simpleGit().clone(repoUrl, buildPath, [
            '--branch', branch,
            '--single-branch',
            '--depth', '1'
        ])

        const repo = simpleGit(buildPath)
        const branches = await repo.branch()

        build.status = 'running'
        build.output += `Cloned and checked out branch: ${branches.current}\n`
        await build.save()
        console.log(`Cloned branch: ${branches.current}`)

        // 4. Install dependencies with timeout
        build.output += `Installing dependencies...\n`
        // await build.save()
        console.log(`📁 Build path: ${buildPath}`);
        try {
            await fs.access(path.join(buildPath, 'package.json'));
            console.log('📦 Package.json exists: true');
        } catch {
            console.log('📦 Package.json exists: false');
        }
        try {
            const files = await fs.readdir(buildPath);
            console.log(`🔍 Directory contents: ${files.join(', ')}`);
        } catch (error) {
            console.log('🔍 Could not read directory:', error.message);
        }

        const installOk = await runCommand(buildPath, 'npm install', build, io, 120000);
        if (!installOk) throw new Error('Dependency installation failed')

        // 5. Run tests with timeout
        build.output += `Running tests...\n`
        await build.save()

        const startTime = Date.now()
        const testOk = await runCommand(buildPath, 'npm test', build, 3 * 60 * 1000)
        const duration = Date.now() - startTime

        build.status = testOk ? 'success' : 'failure'
        build.duration = duration
        build.conclusion = testOk ? 'All tests passed' : 'Some tests failed'
        await build.save()

        io.emit('build-complete', build)
        console.log(`Build #${buildId} finished with ${build.status} in ${duration}ms`)
    } catch (err) {
        build.status = 'error'
        build.output += `\n❌ ERROR: ${err.message}\n`
        build.conclusion = 'failure'
        await build.save()

        io.emit('build-error', { buildId, error: err.message })
        console.error(`Build #${buildId} failed:`, err.message)
    }
}

// ---------------------------
// Helper: Run shell commands
// ---------------------------
async function runCommand(cwd, command, build, timeoutMs = 0) {
    return new Promise((resolve) => {
        const [cmd, ...args] = command.split(' ')
        console.log(`Running: ${command} in ${cwd}`)

        const child = spawn(cmd, args, {
            cwd,
            shell: true,
            windowsHide: true,
            stdio: ["ignore", "pipe", "pipe"], // capture both
            env: { ...process.env, NODE_ENV: 'test' },
        })

        let lastSave = 0
        let saveScheduled = false

        const scheduleSave = () => {
            const now = Date.now()
            if (saveScheduled || now - lastSave < 1500) return
            saveScheduled = true
            lastSave = now
            setTimeout(() => {
                build.save().catch((err) => console.error('Build save error:', err))
                saveScheduled = false
            }, 0)
        }

        // Timeout guard
        let timeout
        if (timeoutMs > 0) {
            timeout = setTimeout(() => {
                build.output += `\n Timeout: ${command} exceeded ${timeoutMs / 1000}s\n`
                child.kill('SIGKILL')
            }, timeoutMs)
        }

        child.stdout.on('data', (data) => {
            const text = data.toString()
            process.stdout.write(text + '\n')
            console.log(text)
            build.output += text
            scheduleSave()
            io.emit('build-update', { buildId: build._id, output: text })
        })

        child.stderr.on('data', (data) => {
            const text = data.toString()
            build.output += text
            scheduleSave()
        })

        child.on('close', (code) => {
            if (timeout) clearTimeout(timeout)
            scheduleSave()
            resolve(code === 0)
        })

        child.on('error', (err) => {
            build.output += `\nCommand error: ${err.message}\n`
            scheduleSave()
            resolve(false)
        })
    })
}

export default runBuild
