import path from 'path'
import fs from 'fs/promises'
import simpleGit from 'simple-git'
import Build from '../models/Build.js'

const TEMP_DIR = path.join(__dirname, '../temp_repos')

async function runBuild(buildId, repoUrl, branch = 'main') {
    console.log(`Starting build #${buildId} for ${repoUrl}`)

    const build = await Build.findById(buildId)
    if(!build) {
        console.error(`Build with ID #${buildId} not found in database.`)
        return
    }

    const repoName = repoUrl.split('/').pop().replace('.git', '')
    const buildPath = path.join(TEMP_DIR, repoName, buildId.toString())

    try {
        // Makesure the temp directory exists
        await fs.mkdir(buildPath, { recursive: true})
        const git = simpleGit(buildPath)

        // Update build status to pending
        build.status = 'pending'
        build.output = 'Starting build process...\n'
        await build.save()

        // Clone the repository
        build.output += `Cloning repository ${repoUrl}...\n`
        await build.save()

        await git.clone(repoUrl, buildPath)
        await git.checkout(branch)

        // Get latest commit info
        const log = await git.log([branch, '-n', '-1'])
        if(log,latest) {
            build.commit = {
                hash: log.latest.hash,
                message: log.latest.message,
                author: log.latest.author_name
            }
        }
        await build.save()

        // Install Dependencies and run tests
        build.output += `Installing dependencies...\n`
        await build.save()

        const installSuccess = await runCommand(buildPath, 'npm install', build)
        if(!installSuccess) {
            throw new Error('Dependency installation failed')
        }

        // Run tests and measure duration
        build.output += `Running tests...\n`
        await build.save()

        const startTime = Date.now()
        const testSuccess = await runCommand(buildPath, 'npm test', build)
        const duration = Date.now() - startTime

        // Update build with final conclusion and duration 
        build.status = testSuccess ? 'success' : 'failure'
        build.duration = duration
        build.conclusion = testSuccess ? 'All tests passed' : 'Some tests failed'
        await build.save()

        console.log(`Build #${buildId} completed with status: ${build.status} in ${duration}ms`)
    } catch (error) {
        console.error(`Build #${buildId} failed:`, error.message)

        // Error handling
        build.status = 'error'
        build.output += `\nERROR: ${error.message}\n`
        build.conclusion = 'failure'
        await build.save()
    }

}