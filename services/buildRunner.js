import path from 'path'
import fs from 'fs/promises'
import simpleGit from 'simple-git'
import Build from '../models/Build.js'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'

// __dirname for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const TEMP_DIR = path.join(__dirname, '../temp_repos')

// Ensure TEMP_DIR exists
fs.mkdir(TEMP_DIR, { recursive: true }).catch(() => {})

export async function runBuild(buildId, repoUrl, branch = 'main') {
    console.log(`Starting build #${buildId} for ${repoUrl}`)

    const build = await Build.findById(buildId)
    if (!build) {
        console.error(`Build with ID #${buildId} not found in database.`)
        return
    }

    const repoName = repoUrl.split('/').pop().replace('.git', '')
    const buildPath = path.join(TEMP_DIR, repoName, buildId.toString())

    try {
        // 1 Prepare build folder
        await fs.mkdir(buildPath, { recursive: true })

        // 2 Set status to pending
        build.status = 'pending'
        build.output = 'Starting build process...\n'
        await build.save()

        console.log(`Build #${buildId} status set to pending.`)

        // 3 Clone repository (shallow clone for speed)
        build.output += `Cloning repository ${repoUrl} (branch: ${branch})...\n`
        await build.save()
        await simpleGit().clone(repoUrl, buildPath, [
            '--branch', branch,
            '--single-branch',
            '--depth', '1'
        ])

        const repo = simpleGit(buildPath)
        const branches = await repo.branch()
        build.output += `Cloned and checked out branch: ${branches.current}\n`
        await build.save()
        console.log(`Cloned and checked out branch: ${branches.current}`)

        // 4 Install dependencies
        build.output += `Installing dependencies...\n`
        console.log(`Installing dependencies for build #${buildId}...`)
        const installSuccess = await runCommand(buildPath, 'npm install --legacy-peer-deps', build)
        if (!installSuccess) throw new Error('Dependency installation failed')

        // 5 Run tests
        build.output += `Running tests...\n`
        await build.save()

        const startTime = Date.now()
        const testSuccess = await runCommand(buildPath, 'npm test', build)
        const duration = Date.now() - startTime
        console.log(`Tests completed in ${duration}ms with success: ${testSuccess}`)

        // 6️ Update final build status
        build.status = testSuccess ? 'success' : 'failure'
        build.duration = duration
        build.conclusion = testSuccess ? 'All tests passed' : 'Some tests failed'
        await build.save()

        console.log(`Build #${buildId} completed with status: ${build.status} in ${duration}ms`)
    } catch (error) {
        // 7 Handle errors
        console.error(`Build #${buildId} failed:`, error.message)
        build.status = 'error'
        build.output += `\nERROR: ${error.message}\n`
        build.conclusion = 'failure'
        await build.save()
    }
}

// ---------------------------
// Helper: Run shell commands
// ---------------------------
async function runCommand(cwd, command, build) {
    return new Promise((resolve) => {
        console.log(`Running: ${command} in ${cwd}`)

        // Split command for spawn
        const [cmd, ...args] = command.split(' ')

        const child = spawn(cmd, args, {
            cwd,
            shell: true,
            windowsHide: true,
            env: { ...process.env, NODE_ENV: 'test' }, // isolate env
        })

        let lastSave = 0
        let saveScheduled = false

        // Throttled save function
        const scheduleSave = () => {
            const now = Date.now()
            if (saveScheduled || now - lastSave < 2000) return
            saveScheduled = true
            lastSave = now
            setTimeout(() => {
                build.save().catch(err => console.error('Build save error:', err))
                saveScheduled = false
            }, 0)
        }

        // STDOUT
        child.stdout.on('data', (data) => {
            const text = data.toString()
            process.stdout.write(text)
            build.output += text
            scheduleSave()
        })

        // STDERR
        child.stderr.on('data', (data) => {
            const text = data.toString()
            build.output += text
            scheduleSave()
        })

        // Process finished
        child.on('close', (code) => {
            console.log(`Command "${command}" finished with exit code ${code}`)
            scheduleSave()
            resolve(code === 0)
        })

        // Process error
        child.on('error', (error) => {
            build.output += `\nCommand execution error: ${error.message}\n`
            scheduleSave()
            resolve(false)
        })
    })
}

export default runBuild
