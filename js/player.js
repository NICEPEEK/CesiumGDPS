document.addEventListener('DOMContentLoaded', function() {
    const profileContainer = document.getElementById('player-profile-container');
    if (!profileContainer) return;

    const urlParams = new URLSearchParams(window.location.search);
    const playerId = urlParams.get('id');

    if (playerId) {
        loadPlayerProfile(playerId);
    } else {
        showError("Player ID not specified in URL");
    }

    const backButton = document.getElementById('back-to-top-players');
    if (backButton) {
        backButton.addEventListener('click', function() {
            window.location.href = 'index.html#top-players';
        });
    }
});

function displayPlayerProfile(playerData) {
    document.title = `${playerData.username} | Geometry Dash Demon List`;

    const statsGrid = document.getElementById('player-stats-grid');
    if (statsGrid) {
        statsGrid.innerHTML = `
            <div class="stat-item">
                <div class="stat-value">${playerData.totalPoints?.toFixed(1) || '0'}</div>
                <div class="stat-label">Total Points</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${playerData.completedDemons || '0'}</div>
                <div class="stat-label">Completed Demons</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${playerData.hardestDemon?.name || 'N/A'}</div>
                <div class="stat-label">Hardest Demon</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">#${playerData.rank || 'N/A'}</div>
                <div class="stat-label">Global Rank</div>
            </div>
        `;
    }

    const completedContainer = document.getElementById('completed-levels-container');
    if (completedContainer && playerData.completedLevels) {
        completedContainer.innerHTML = playerData.completedLevels
            .map(level => createLevelCard(level, true))
            .join('');
    }

    const progressContainer = document.getElementById('progress-levels-container');
    if (progressContainer && playerData.progressLevels) {
        progressContainer.innerHTML = playerData.progressLevels
            .map(level => createLevelCard(level, false))
            .join('');
    }
}

function getLevelThumbnail(level) {
    const img = new Image();
    img.src = '';
    
    if (level.players?.[0]?.video_link) {
        const videoId = extractYouTubeId(level.players[0].video_link);
        if (videoId) {
            const ytImg = new Image();
            ytImg.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
            ytImg.onload = () => {
                img.src = ytImg.src;
            };
            ytImg.onerror = () => {
                img.src = '';
            };
            return img.src;
        }
    }
    return img.src;
}

function extractYouTubeId(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function showError(message) {
    const container = document.getElementById('player-profile-container');
    if (container) {
        container.innerHTML = `
            <div class="error-message">
                <p>${message}</p>
            </div>
        `;
    }
}