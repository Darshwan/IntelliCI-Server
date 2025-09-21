import path from 'path';
import fs from 'fs/promises';
import simpleGit from 'simple-git';
import Build from '../models/Build.js';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { Notifier } from './notifier.js';
import { BuildLogger } from './logger.js';

// __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directory where repositories will be cloned
const TEMP_DIR = path.join(__dirname, '../temp_repos');

// Ensure temp directory exists
fs.mkdir(TEMP_DIR, { recursive: true }).catch(() => {
    console.log('Temp directory ready');
});

/**
 * Main build function - Clones, installs dependencies, and runs tests for a repository
 * @param {string} buildId - MongoDB build document ID
 * @param {string} repoUrl - GitHub repository URL to clone
 * @param {string} branch - Branch to checkout (default: 'main')
 * @param {Object} io - Socket.io instance for real-time updates
 */
export async function runBuild(buildId, repoUrl, branch = 'main', io) {
    if (!io) {
        console.error('IO instance is undefined! Cannot emit real-time updates');
        // You might want to throw an error or handle this differently
        throw new Error('Socket.io instance not provided');
    } else {
        console.log(`io is present!`)
    }
    console.log(`Starting build #${buildId} for ${repoUrl}`);
    const logger = new BuildLogger(buildId);

    // Fetch build document from database
    const build = await Build.findById(buildId);
    if (!build) {
        console.error(`Build with ID #${buildId} not found in database`);
        return;
    }
    const notifier = new Notifier();
    const buildLogger = new BuildLogger(buildId);
    const repoName = repoUrl.split('/').pop().replace('.git', '');
    const buildPath = path.join(TEMP_DIR, repoName, buildId.toString());

    try {
        // ---------------------------
        // 1. INITIAL SETUP
        // ---------------------------
        await fs.mkdir(buildPath, { recursive: true });

        // Set initial build status
        build.status = 'pending';
        build.output = 'Starting build process...\n';
        await build.save();
        await logger.write(`> Starting build for ${repoUrl}#${branch}\n`);
        io.emit('new-build', build);

        // ---------------------------
        // 2. CLONE REPOSITORY
        // ---------------------------
        build.output += `Cloning ${repoUrl} (branch: ${branch})...\n`;
        await build.save();

        const git = simpleGit();
        await git.clone(repoUrl, buildPath, [
            '--branch', branch,
            '--single-branch', // Only clone the specified branch
            '--depth', '1'     // Shallow clone (only latest commit)
        ]);

        // Verify the cloned branch
        const repo = simpleGit(buildPath);
        const branchInfo = await repo.branch();

        build.status = 'running';
        build.output += `Cloned and checked out branch: ${branchInfo.current}\n`;
        await build.save();
        console.log(`Cloned branch: ${branchInfo.current}`);
        await logger.write("> Cloning repository...\n");

        // ---------------------------
        // 3. INSTALL DEPENDENCIES
        // ---------------------------
        build.output += `Installing dependencies...\n`;
        await build.save();
        await logger.write("> Installing dependencies...\n");

        // Debug information
        console.log(`Build path: ${buildPath}`);
        try {
            await fs.access(path.join(buildPath, 'package.json'));
            console.log('Package.json exists');
            build.output += 'Package.json found\n';
        } catch {
            console.log('Package.json not found');
            build.output += 'Package.json not found\n';
            throw new Error('No package.json found - not a Node.js project');
        }

        // Run npm install
        const installSuccess = await runCommand(buildPath, 'npm install', build, io, 120000);
        if (!installSuccess) {
            throw new Error('Dependency installation failed');
        }

        // ---------------------------
        // 4. RUN TESTS
        // ---------------------------
        build.output += `Running tests...\n`;
        await build.save();
        await logger.write("> Running tests...\n");

        const startTime = Date.now();
        const testSuccess = await runCommand(buildPath, 'npm test', build, io, 180000);
        const duration = Date.now() - startTime;

        // ---------------------------
        // 5. FINALIZE BUILD
        // ---------------------------
        build.status = testSuccess ? 'success' : 'failure';
        build.duration = duration;
        build.conclusion = testSuccess ? 'All tests passed' : testSuccess === false ? 'Tests failed' : 'No tests found';

        await build.save();
        io.emit('build-complete', build);
        if (build.status === 'success' || build.status === 'failure') {
            await notifier.sendBuildNotification(build, [`lamichhane3848@gmail.com`]);
        }
        console.log(`Build #${buildId} finished with status: ${build.status} in ${duration}ms`);
        await logger.write("> Build completed successfully\n");

    } catch (error) {
        // ---------------------------
        // ERROR HANDLING
        // ---------------------------
        console.error(`Build #${buildId} failed:`, error.message);

        build.status = 'error';
        build.output += `\n ERROR: ${error.message}\n`;
        build.conclusion = 'Build process failed';

        await build.save();
        io.emit('build-error', { buildId, error: error.message });
    }
}

/**
 * Executes a shell command with real-time output streaming
 * @param {string} cwd - Current working directory for the command
 * @param {string} command - Command to execute
 * @param {Object} build - Build document for saving output
 * @param {Object} io - Socket.io instance for real-time updates
 * @param {number} timeoutMs - Timeout in milliseconds (0 = no timeout)
 * @returns {Promise<boolean>} - True if command succeeded (exit code 0)
 */
async function runCommand(cwd, command, build, io, timeoutMs = 0) {
    return new Promise((resolve) => {
        console.log(`📝 Executing: ${command} in ${cwd}`);
        build.output += `\n$ ${command}\n`;
        io.emit('build-update', {
            buildId: build._id,
            output: `$ ${command}\n`
        });

        const child = exec(command, {
            cwd: cwd,
            shell: true,          // Use system shell
            windowsHide: true,    // Hide terminal window on Windows
            maxBuffer: 20 * 1024 * 1024, // 20MB output buffer
            env: {
                ...process.env,   // Inherit environment variables
                NODE_ENV: 'test'  // Set test environment
            },
        });

        let fullOutput = '';

        // Capture and stream stdout
        child.stdout?.on('data', (data) => {
            const text = data.toString();
            console.log(`[OUT] ${text.trim()}`);
            fullOutput += text;
            io.emit('build-update', {
                buildId: build._id,
                output: text
            });
        });

        // Capture and stream stderr
        child.stderr?.on('data', (data) => {
            const text = data.toString();
            console.error(`[ERR] ${text.trim()}`);
            fullOutput += text;
            io.emit('build-update', {
                buildId: build._id,
                output: text
            });
        });

        // Handle command completion
        child.on('close', async (exitCode) => {
            console.log(`🔚 Command exited with code: ${exitCode}`);

            // Save all output at once to avoid parallel save issues
            build.output += fullOutput;
            build.output += `\nCommand exited with code: ${exitCode}\n`;

            try {
                await build.save();
                io.emit('build-update', {
                    buildId: build._id,
                    output: `Command exited with code: ${exitCode}\n`
                });
            } catch (saveError) {
                console.error('❌ Final save failed:', saveError);
            }

            resolve(exitCode === 0);
        });

        // Handle command execution errors
        child.on('error', (error) => {
            console.error('❌ Command failed to start:', error);
            build.output += `\n❌ Command failed: ${error.message}\n`;
            io.emit('build-update', {
                buildId: build._id,
                output: `❌ Command failed: ${error.message}\n`
            });
            resolve(false);
        });

        // Set command timeout
        if (timeoutMs > 0) {
            setTimeout(() => {
                if (child.exitCode === null) {
                    console.log(`⏰ Timeout: Command exceeded ${timeoutMs / 1000}s`);
                    build.output += `\n⏰ Timeout: Command exceeded ${timeoutMs / 1000}s\n`;
                    io.emit('build-update', {
                        buildId: build._id,
                        output: `⏰ Timeout: Command exceeded ${timeoutMs / 1000}s\n`
                    });
                    child.kill('SIGTERM');
                }
            }, timeoutMs);
        }
    });
}

export default runBuild;