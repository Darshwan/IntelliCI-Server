// WebSocket connection management
const socket = io('http://localhost:3000');
const connectionIndicator = document.getElementById('connection-indicator');
const connectionText = document.getElementById('connection-text');

// UI state
let autoScrollEnabled = true;
let selectedBuildId = null;
let logs = [];

// DOM elements
const buildsList = document.getElementById('builds-list');
const buildDetails = document.getElementById('build-details');
const logsContent = document.getElementById('logs-content');
const autoScrollIndicator = document.getElementById('auto-scroll-indicator');

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', function () {
    // Load initial builds
    loadBuildHistory();
    // Set up socket event listeners
    setupSocketListeners();
});

// WebSocket event handlers
function setupSocketListeners() {
    socket.on('connect', () => {
        console.log('Connected to server via WebSocket');
        updateConnectionStatus(true);
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        updateConnectionStatus(false);
    });

    socket.on('reconnect', () => {
        console.log('Reconnected to server');
        updateConnectionStatus(true);
        // Reload data after reconnection
        loadBuildHistory();
    });

    socket.on('new-build', (build) => {
        console.log('New Build Started:', build);
        addBuildCard(build);
        updateMetrics();
    });

    socket.on('build-update', (data) => {
        console.log('Build Update:', data);
        updateBuildCard(data);

        if (data.buildId === selectedBuildId) {
            addLogLine(data.message);
        }
    });

    socket.on('build-complete', (build) => {
        console.log('Build Completed:', build);
        updateBuildCard(build, true);
        updateMetrics();
    });
}

// Connection status management
function updateConnectionStatus(connected) {
    if (connected) {
        connectionIndicator.classList.add('connected');
        connectionText.textContent = 'Connected';
    } else {
        connectionIndicator.classList.remove('connected');
        connectionText.textContent = 'Disconnected';
    }
}


function scrollToBottom() {
    if (autoScrollEnabled) {
        logsContent.scrollTop = logsContent.scrollHeight;
    }
}

// Log management
function addLogLine(message) {
    const logLine = document.createElement('div');
    logLine.className = `log-line ${getLogClass(message)}`;
    logLine.textContent = `> ${message}`;

    logsContent.appendChild(logLine);
    logs.push({ message, timestamp: new Date() });

    scrollToBottom();
}

function clearLogs() {
    logsContent.innerHTML = '';
    logs = [];
}

function getLogClass(message) {
    if (message.includes('error') || message.includes('fail') || message.includes('failed')) {
        return 'log-error';
    } else if (message.includes('success') || message.includes('pass') || message.includes('passed')) {
        return 'log-success';
    } else if (message.includes('warn') || message.includes('warning')) {
        return 'log-warning';
    } else {
        return 'log-info';
    }
}

// Build data management
async function loadBuildHistory() {
    try {
        const response = await fetch('http://localhost:3000/api/builds?limit=10');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const builds = await response.json();
        renderBuilds(builds);
        updateMetrics(builds);
    } catch (error) {
        console.error('Failed to load build history:', error);
        buildsList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Failed to load builds</p>
                        <button onclick="loadBuildHistory()">Try Again</button>
                    </div>
                `;
    }
}

function renderBuilds(builds) {
    buildsList.innerHTML = builds.map(build => createBuildCard(build)).join('');
}

function createBuildCard(build) {
    return `
        <div class="build-card ${build.status}" data-build-id="${build._id}" onclick="selectBuild('${build._id}')">
            <div class="build-header">
                <div class="repo-info">
                    <div class="repo-name">${build.repo}</div>
                    <div class="branch">${build.branch}</div>
                </div>
                <div class="build-status status-${build.status}">
                    <i class="${getStatusIcon(build.status)}"></i>
                    ${build.status}
                </div>
            </div>
            <div class="build-meta">
                <span><i class="far fa-clock"></i> ${formatDate(build.createdAt)}</span>
                ${build.duration ? `<span class="duration"><i class="fas fa-hourglass-half"></i> ${formatDuration(build.duration)}</span>` : ''}
            </div>
        </div>
    `;
}

function addBuildCard(build) {
    const buildCard = document.createElement('div');
    buildCard.className = `build-card ${build.status}`;
    buildCard.setAttribute('data-build-id', build._id);
    buildCard.onclick = () => selectBuild(build._id);
    buildCard.innerHTML = `
        <div class="build-header">
            <div class="repo-info">
                <div class="repo-name">${build.repo}</div>
                <div class="branch">${build.branch}</div>
            </div>
            <div class="build-status status-${build.status}">
                <i class="${getStatusIcon(build.status)}"></i>
                ${build.status}
            </div>
        </div>
        <div class="build-meta">
            <span><i class="far fa-clock"></i> Just now</span>
        </div>
    `;

    buildsList.insertBefore(buildCard, buildsList.firstChild);
}

function updateBuildCard(build, isComplete = false) {
    console.log('Updating build card:', build);

    const buildCards = document.querySelectorAll('.build-card');

    for (const card of buildCards) {
        // Get the build ID from the card's data attribute
        const cardBuildId = card.getAttribute('data-build-id');

        if (cardBuildId === build._id) {
            // Update status
            card.className = `build-card ${build.status}`;
            const statusElement = card.querySelector('.build-status');
            statusElement.className = `build-status status-${build.status}`;
            statusElement.innerHTML = `
                <i class="${getStatusIcon(build.status)}"></i>
                ${build.status}
            `;

            // Update duration if complete
            if (isComplete && build.duration) {
                const metaElement = card.querySelector('.build-meta');
                // Find and update duration or add it if it doesn't exist
                let durationSpan = metaElement.querySelector('.duration');
                if (durationSpan) {
                    durationSpan.innerHTML = `<i class="fas fa-hourglass-half"></i> ${formatDuration(build.duration)}`;
                } else {
                    durationSpan = document.createElement('span');
                    durationSpan.className = 'duration';
                    durationSpan.innerHTML = `<i class="fas fa-hourglass-half"></i> ${formatDuration(build.duration)}`;
                    metaElement.appendChild(durationSpan);
                }
            }

            break;
        }
    }
}

function selectBuild(buildId) {
    selectedBuildId = buildId;

    // Highlight selected build
    document.querySelectorAll('.build-card').forEach(card => {
        card.style.borderLeftWidth = '4px';
        card.style.opacity = '0.8';
    });

    const selectedCard = document.querySelector(`[data-build-id="${buildId}"]`);
    if (selectedCard) {
        selectedCard.style.borderLeftWidth = '6px';
        selectedCard.style.opacity = '1';
    }

    // Load build details
    loadBuildDetails(buildId);
}

async function loadBuildDetails(buildId) {
    try {
        buildDetails.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Loading build details...</p>
                    </div>
                `;

        clearLogs();

        const response = await fetch(`http://localhost:3000/api/builds/${buildId}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const build = await response.json();

        // Display build details
        buildDetails.innerHTML = `
                    <div class="detail-item">
                        <div class="detail-label">Repository</div>
                        <div class="detail-value">${build.repo}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Branch</div>
                        <div class="detail-value">${build.branch}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Status</div>
                        <div class="detail-value">
                            <span class="build-status status-${build.status}">
                                <i class="${getStatusIcon(build.status)}"></i>
                                ${build.status}
                            </span>
                        </div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Started</div>
                        <div class="detail-value">${formatDate(build.createdAt)}</div>
                    </div>
                    ${build.duration ? `
                    <div class="detail-item">
                        <div class="detail-label">Duration</div>
                        <div class="detail-value">${build.duration > 60 ? `${Math.floor(build.duration / 6000)}m ${build.duration % 60}s` : `${build.duration}s`}</div>
                    </div>
                    ` : ''}
                `;

        // Load existing logs if any
        if (build.output) {
            const logs = build.output.split('\n');
            logs.forEach(log => {
                if (log.trim()) {
                    addLogLine(log);
                }
            });
        }

    } catch (error) {
        console.error('Failed to load build details:', error);
        buildDetails.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Failed to load build details</p>
                    </div>
                `;
    }
}

function updateMetrics(builds) {
    // In a real app, we would calculate these from the builds data
    // For this demo, we'll use placeholder values that update with new builds
    console.log("Builds:", builds);
    
    const total = parseInt(document.getElementById('total-builds').textContent) + 1;
    document.getElementById('total-builds').textContent = builds.length;

    // Simulate metric updates
    const successes = builds.filter(b => b.status === 'success').length;
    const successRate = total > 0 ? Math.round((successes / total) * 100) : 0;
    document.getElementById('success-rate').textContent = `${successRate / 10}%`;

    const durations = builds.filter(b => b.duration).map(b => b.duration);
    const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
    document.getElementById('avg-duration').textContent = `${avgDuration}ms`;

    const activeBuilds = builds.filter(b => b.status === 'running' || b.status === 'pending').length;
    document.getElementById('active-builds').textContent = activeBuilds;
}

// Utility functions
function getStatusIcon(status) {
    switch (status) {
        case 'success': return 'fas fa-check-circle';
        case 'error': return 'fas fa-exclamation-circle';
        case 'pending': return 'fas fa-clock';
        case 'running': return 'fas fa-sync-alt fa-spin';
        default: return 'fas fa-question-circle';
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString();
}

function formatDuration(ms) {
    return `${Math.floor(ms / 1000)}s`;
}