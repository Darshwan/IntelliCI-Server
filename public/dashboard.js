const socket = io('http://localhost:3000');
const buildsContainer = document.getElementById('builds-container');
const buildOutput = document.getElementById('build-output');
const currentBuildSection = document.getElementById('current-build');
let currentBuildId = null;

// Simple animation for status indicators
document.addEventListener('DOMContentLoaded', function () {
    const pendingItems = document.querySelectorAll('.status.pending, .status.running');

    setInterval(() => {
        pendingItems.forEach(item => {
            item.classList.toggle('blink');
        });
    }, 2000);

    // Load initial builds
    loadBuildHistory();
});

// Fetch initial builds
async function loadBuildHistory() {
    try {
        const response = await fetch('http://localhost:3000/api/builds?limit=10');

        // Check if response is OK
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Check content type to ensure it's JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Response is not JSON');
        }

        const builds = await response.json();
        renderBuilds(builds);
        updateMetrics(builds);
    } catch (error) {
        console.error('Failed to load build history:', error);
        // Show user-friendly error message
        buildsContainer.innerHTML = `
                    <div class="error-message">
                        <h3>⚠️ Could not load build history</h3>
                        <p>${error.message}</p>
                        <button onclick="loadBuildHistory()">Try Again</button>
                    </div>
                `;
    }
}

// Render Builds
function renderBuilds(builds) {
    buildsContainer.innerHTML = builds.map(build => `
                <div class="build-card ${build.status}" onclick="showBuildDetails('${build._id}')">
                    <div class="repo-header">
                        <div class="repo-name">
                            <i class="fab fa-github"></i>
                            ${build.repo}
                        </div>
                        <div class="branch">${build.branch}</div>
                    </div>
                    <div class="build-info">
                        <div class="timestamp">
                            <i class="far fa-calendar-alt"></i>
                            ${formatDate(build.createdAt)}
                        </div>
                        <div class="status ${build.status}">
                            <i class="${getStatusIcon(build.status)}"></i> ${build.status}
                        </div>
                    </div>
                </div>
            `).join('');
}

// Update metrics
function updateMetrics(builds) {
    const total = builds.length;
    const successes = builds.filter(b => b.status === 'success').length;
    const successRate = total > 0 ? Math.round((successes / total) * 100) : 0;
    const activeBuilds = builds.filter(b => b.status === 'running' || b.status === 'pending').length;
    const durations = builds.filter(b => b.duration).map(b => b.duration);
    const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

    document.getElementById('total-builds').textContent = total;
    document.getElementById('success-rate').textContent = `${successRate}%`;
    document.getElementById('avg-duration').textContent = `${avgDuration}s`;
    document.getElementById('active-builds').textContent = activeBuilds;
}

// Show build details
async function showBuildDetails(buildId) {
    try {
        currentBuildId = buildId;

        // Show loading state
        currentBuildSection.innerHTML = `
            <div class="detail-header">
                <div class="detail-title">
                    <i class="fas fa-spinner fa-spin"></i>
                    Loading build details...
                </div>
            </div>
        `;
        buildOutput.innerHTML = `<div class="output-line output-info">Loading build logs...</div>`;

        // Fetch build details from server
        const response = await fetch(`http://localhost:3000/api/builds/${buildId}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const build = await response.json();

        // Update build details section with real data
        currentBuildSection.innerHTML = `
            <div class="detail-header">
                <div class="repo-name">
                    <i class="fab fa-github"></i>
                    ${build.repo}
                </div>
                <div class="branch">${build.branch}</div>
                <div class="detail-meta">
                    <div class="timestamp">
                        <i class="far fa-calendar-alt"></i>
                        ${formatDate(build.createdAt)}
                    </div>
                    <div class="status ${build.status}">
                        <i class="${getStatusIcon(build.status)}"></i> ${build.status}
                    </div>
                </div>
                ${build.duration ? `
                <div class="duration" style="margin-top: 10px; color: #666;">
                    <i class="fas fa-clock"></i> Duration: ${formatDuration(build.duration)}
                </div>
                ` : ''}
            </div>
        `;

        // Fetch build logs from output field and split by newlines
        const logs = build.output ? build.output.split('\n') : [];

        // Display logs with proper formatting and > sign
        buildOutput.innerHTML = logs.map(log => {
            if (!log.trim()) return ''; // Skip empty lines
            const logClass = getOutputClass(log);
            // Add > sign at the beginning of each line
            return `<div class="output-line ${logClass}">> ${log}</div>`;
        }).join('');

        // Scroll to bottom of output
        buildOutput.scrollTop = buildOutput.scrollHeight;

    } catch (error) {
        console.error('Failed to load build details:', error);

        // Show error message
        currentBuildSection.innerHTML = `
            <div class="detail-header">
                <div class="detail-title">
                    <i class="fas fa-exclamation-triangle"></i>
                    Error Loading Build
                </div>
                <div style="color: #c62828; margin-top: 10px;">
                    ${error.message}
                </div>
            </div>
        `;

        buildOutput.innerHTML = `
            <div class="output-line output-error">> Failed to load build details: ${error.message}</div>
            <div class="output-line output-info">> Please check your connection and try again</div>
        `;
    }
}

// Get status icon
function getStatusIcon(status) {
    switch (status) {
        case 'success': return 'fas fa-check-circle';
        case 'error': return 'fas fa-exclamation-circle';
        case 'pending': return 'fas fa-clock';
        case 'running': return 'fas fa-sync-alt';
        default: return 'fas fa-question-circle';
    }
}

// Socket.io event listeners 
socket.on('connect', () => {
    console.log('Connected to server via WebSocket');
    // Add connection indicator to UI
    const footer = document.querySelector('footer');
    footer.innerHTML += ' • <span style="color: #4caf50;"><i class="fas fa-plug"></i> Connected</span>';
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
    // Update connection indicator
    const footer = document.querySelector('footer');
    if (footer.innerHTML.includes('Connected')) {
        footer.innerHTML = footer.innerHTML.replace('• <span style="color: #4caf50;"><i class="fas fa-plug"></i> Connected</span>',
            '• <span style="color: #f44336;"><i class="fas fa-plug"></i> Disconnected</span>');
    }
});

socket.on('new-build', (build) => {
    console.log('New Build Started:', build);
    // Add to top of the build list
    const buildElement = document.createElement('div');
    buildElement.className = `build-card pending`;
    buildElement.innerHTML = `
                <div class="repo-header">
                    <div class="repo-name">
                        <i class="fab fa-github"></i>
                        ${build.repo}
                    </div>
                    <div class="branch">${build.branch}</div>
                </div>
                <div class="build-info">
                    <div class="timestamp">
                        <i class="far fa-calendar-alt"></i>
                        Just now
                    </div>
                    <div class="status pending">
                        <i class="fas fa-clock"></i> pending
                    </div>
                </div>
                <div>Build ID: ${build._id}</div>
            `;
    buildElement.onclick = function () {
        showBuildDetails(build._id);
    };
    buildsContainer.insertBefore(buildElement, buildsContainer.firstChild);

    // Update metrics
    loadBuildHistory(); // Reload to get updated metrics
});

socket.on('build-update', (data) => {
    console.log('Build Update:', data);
    if (data.buildId === currentBuildId) {
        const messageClass = getOutputClass(data.message);
        buildOutput.innerHTML += `<div class="output-line ${messageClass}">> ${data.message}</div>`;
        buildOutput.scrollTop = buildOutput.scrollHeight;
    }
});

socket.on('build-complete', (build) => {
    console.log('Build Completed: ', build);
    // Update the build card status
    const buildCards = document.querySelectorAll('.build-card');
    if (buildCards.length > 0) {
        // Find the card with matching ID (in a real app, you'd have IDs on the elements)
        const firstCard = buildCards[0];
        firstCard.className = `build-card ${build.status}`;
        firstCard.querySelector('.status').className = `status ${build.status}`;
        firstCard.querySelector('.status').innerHTML = `<i class="${getStatusIcon(build.status)}"></i> ${build.status}`;

        if (build.duration) {
            const durationDiv = firstCard.querySelector('.duration') || document.createElement('div');
            durationDiv.className = 'duration';
            durationDiv.textContent = `Duration: ${formatDuration(build.duration)}`;
            if (!firstCard.querySelector('.duration')) {
                firstCard.appendChild(durationDiv);
            }
        }
    }

    // Update metrics
    loadBuildHistory(); // Reload to get updated metrics
});

// Utility Functions
function formatDate(dateString) {
    return new Date(dateString).toLocaleString();
}

function formatDuration(ms) {
    return `${Math.round(ms / 1000)}s`;
}

function getOutputClass(message) {
    if (message.includes('error') || message.includes('fail') || message.includes('failed')) {
        return 'output-error';
    } else if (message.includes('success') || message.includes('pass') || message.includes('passed')) {
        return 'output-success';
    } else if (message.includes('warn') || message.includes('warning')) {
        return 'output-warning';
    } else {
        return 'output-info';
    }
}
