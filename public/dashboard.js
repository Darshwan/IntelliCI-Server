const socket = io();

const buildsContainer = document.getElementById('builds-container')
const buildOutput = document.getElementById('build-output');
const currentBuildSection = document.getElementById('current-build');

// fetch intial builds
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
        updateStatus(builds);
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
        <div class="build-card ${build.status} "onClick="showBuildDetails('${build._id}')">
            <div class="build-header">
            <div class="build-info">
                <div class="build-repo">${build.repo}</div>
                <div class="build-branch">${build.branch} • ${formatDate(build.createdAt)}</div>
            </div>
            <span class="build-status-${build.status}">${build.status}</span>
            </div>
            ${build.duration ? `<div>Duration: ${formatDuration(build.duration)}</div>` : ''}
            </div>
    `).join('');
}

// Live Built Updates via WebSocket
function updateStatus(builds) {
    const total = builds.length
    const successes = builds.filter(b => b.status === 'success').length
    const successRate = total > 0 ? Math.round((successes / total) * 100) : 0
    const durations = builds.filter(b => b.duration).map(b => b.duration)
    const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0

    document.getElementById('total-builds').textContent = total
    document.getElementById('success-rate').textContent = `${successRate}%`
    document.getElementById('avg-duration').textContent = `${avgDuration} s`

}

// Socket.io event listeners 
socket.on('connnect', () => {
    console.log('Connected to server via WebSocket');
})

socket.on('new-build', (build) => {
    console.log('New Build Started:', build)
    // Add to top of the build list
    const buildElement = document.createElement('div')
    buildElement.className = `build-card pending`
    buildElement.innerHTML = `<div class="build-header">
            <div class="build-info">
                <div class="build-repo">${build.repo}</div>
                <div class="build-branch">${build.branch} • Just now</div>
            </div>
            <span class="build-status status-pending">pending</span>
        </div>
        <div>Build ID: ${build._id}</div>`
    buildsContainer.insertBefore(buildElement, buildsContainer.firstChild)
})

socket.on('build-update', (data) => {
    console.log('Build Update:', data)
    if (data.buildId === currentBuildId) {
        buildOutput.innerHTML += `<div>${data.message}</div>`;
        buildOutput.scrollTop = buildOutput.scrollHeight
    }
})

socket.on('build-complete', (build) => {
    console.log('Build Completed: ', build)
    // Update the build card status
    const buildCard = document.querySelector(`.build-card:nth-child(1)`);
    if (buildCard) {
        buildCard.className = `build-card ${build.status}`
        buildCard.querySelector('.build-status').className = `build-status-${build.status}`
        buildCard.querySelector('.build-status').textContent = build.status
    }
})

// Utility Functions
function formatDate(dateString) {
    return new Date(dateString).toLocaleString();
}

function formatDuration(ms) {
    return `${Math.round(ms / 1000)} s`;
}

// Initialize
loadBuildHistory();