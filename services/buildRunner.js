import path from 'path'
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
}