document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get('username');
    
    if (!username) {
        window.location.href = 'index.html';
        return;
    }

    loadPlayerProfile(username);

    document.getElementById('back-to-top-players').addEventListener('click', function() {
        window.location.href = 'index.html#top-players';
    });
});

async function loadPlayerProfile(username) {
    try {
        const [playerData, allLevels, order] = await Promise.all([
            fetchPlayerData(username),
            fetch('https://nicepeek.alex-bugrov104.workers.dev/api/levels').then(res => res.json()),
            fetch('https://nicepeek.alex-bugrov104.workers.dev/api/order').then(res => res.json())
        ]);

        const levelPositions = {};
        order.forEach((levelId, index) => {
            levelPositions[levelId] = index + 1;
        });

        playerData.completedLevels.sort((a, b) => levelPositions[a.id] - levelPositions[b.id]);
        
        playerData.progressLevels.sort((a, b) => levelPositions[a.id] - levelPositions[b.id]);

        renderPlayerProfile(playerData, allLevels);
    } catch (error) {
        document.getElementById('player-profile-container').innerHTML = `
            <div class="error-message">
                Failed to load player profile: ${error.message}
                <button onclick="window.location.reload()">Retry</button>
            </div>
        `;
    }
}

async function fetchPlayerData(username) {
    const [usersResponse, levelsResponse, orderResponse] = await Promise.all([
        fetch('https://nicepeek.alex-bugrov104.workers.dev/api/levels'),
        fetch('https://nicepeek.alex-bugrov104.workers.dev/api/levels'),
        fetch('https://nicepeek.alex-bugrov104.workers.dev/api/order')
    ]);

    if (!usersResponse.ok || !levelsResponse.ok || !orderResponse.ok) {
        throw new Error('Failed to fetch player data');
    }

    const [users, levels, order] = await Promise.all([
        usersResponse.json(),
        levelsResponse.json(),
        orderResponse.json()
    ]);

const playerRecords = [];
levels.forEach(level => {
    const record = level.players?.find(p => p.id === username);
    if (record) {
        playerRecords.push({ level, record });
    }
});
if (playerRecords.length === 0) {
    throw new Error('Player not found');
}

    const levelsMap = new Map(levels.map(level => [level.id, level]));

    const stats = {
        points: 0,
        completions: 0,
        progresses: 0,
        osc: 0,
        attemptsFor1Point: 0,
        limitPercent: 0
    };

    const completedLevels = [];
    const progressLevels = [];

    order.forEach((levelId, index) => {
        const level = levelsMap.get(levelId);
        if (!level) return;

        const playerRecord = level.players?.find(p => p.id === username);
        if (!playerRecord) return;

        const position = index + 1;
        const levelWithPosition = { ...level, position };

        if (playerRecord.progress >= 100) {
            stats.points += level.points || 0;
            stats.completions++;
            completedLevels.push({
                ...levelWithPosition,
                record: playerRecord
            });
        } else if (playerRecord.progress > 0) {
            const partialPoints = (level.points || 0) / 4;
            stats.points += partialPoints;
            stats.progresses++;
            progressLevels.push({
                ...levelWithPosition,
                record: playerRecord,
                partialPoints: partialPoints
            });
        }
    });

    completedLevels.sort((a, b) => (b.points || 0) - (a.points || 0));
    
    progressLevels.sort((a, b) => (b.record.progress || 0) - (a.record.progress || 0));

    const user = {
        username,
        role: 'user',
        avatar: undefined,
        banner: undefined,
        country: undefined,
        description: undefined
    };

    return {
        ...user,
        stats,
        completedLevels,
        progressLevels,
        rank: await getPlayerRank(username)
    };
}

async function getPlayerRank(username) {
    const players = await fetchPlayersData();
    const playerIndex = players.findIndex(p => p.username === username);
    return playerIndex !== -1 ? playerIndex + 1 : 'N/A';
}

function renderPlayerProfile(playerData, allLevels) {
    const container = document.getElementById('player-profile-container');
    
    const cardHTML = `
        <div class="player-card-container">
            <div class="player-banner-large">
                <div class="profile-banner" style="${playerData.banner ? `background-image: url('${playerData.banner}')` : 'background: linear-gradient(135deg, #6a1b9a 0%, #8B0000 100%)'}"></div>
                <div class="player-rank-badge-large">#${playerData.rank}</div>
            </div>
            <div class="profile-main-info">
                <div class="profile-avatar-wrapper-large">
                    <div class="profile-avatar-large" style="${playerData.avatar ? `background-image: url('${playerData.avatar}')` : 'background-color: #444'}"></div>
                </div>
                <div class="profile-text-info">
                    <div class="name-flag-wrapper">
                        <div class="username-container">
                            <div class="username-content">
                                ${playerData.role === 'mod' ? '<div class="mod-badge"><i class="fas fa-shield-alt"></i></div>' : ''}
                                <span class="username-text">${playerData.username}</span>
                            </div>
                        </div>
                        <div class="flag-container">
                            <div class="country-flag ${playerData.country ? `flag-${playerData.country.toLowerCase()}` : 'flag-default'}"></div>
                        </div>
                    </div>
                    ${playerData.description ? `
                    <div class="player-description">
                        ${playerData.description}
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
    
    const statsHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${playerData.stats.points.toFixed(1)}</div>
                <div class="stat-label">Total Points</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${playerData.stats.completions}</div>
                <div class="stat-label">Completed Levels</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${playerData.stats.progresses}</div>
                <div class="stat-label">Progress Levels</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${playerData.osc?.toFixed(2) || '0.00'}</div>
                <div class="stat-label">OSC</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${playerData.attempts_for_1?.toFixed(0) || '0'}</div>
                <div class="stat-label">Attempts for 1 point level</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${playerData.limit_percent?.toFixed(2) || '0.00'}%</div>
                <div class="stat-label">LIMIT%</div>
            </div>
        </div>
    `;
    
    let completedLevelsHTML = '';
    playerData.completedLevels.forEach(level => {
        completedLevelsHTML += createLevelCard(level);
    });
    
    let progressLevelsHTML = '';
    playerData.progressLevels.forEach(level => {
        progressLevelsHTML += createProgressLevelCard(level);
    });
    
    container.innerHTML = cardHTML + `
        <div id="player-stats-section" class="profile-section">
            <h2>Player Statistics</h2>
            ${statsHTML}
        </div>
        <div id="completed-levels-section" class="profile-section">
            <div class="section-header">
                <h2>Completed Levels</h2>
                <span class="section-count">${playerData.completedLevels.length} records</span>
            </div>
            <div class="levels-container">
                ${completedLevelsHTML || '<div class="no-results">No completed levels yet</div>'}
            </div>
        </div>
        <div id="progress-levels-section" class="profile-section">
            <div class="section-header">
                <h2>Progress Levels</h2>
                <span class="section-count">${playerData.progressLevels.length} records</span>
            </div>
            <div class="levels-container">
                ${progressLevelsHTML || '<div class="no-results">No progress levels yet</div>'}
            </div>
        </div>
    `;
    
    const firstPlacePositions = document.querySelectorAll('.level-position');
    firstPlacePositions.forEach(pos => {
        if (pos.textContent === '1') {
            pos.classList.add('first-place');
        }
    });
    
    setupLevelCardsClickHandlers();
}

function createLevelCard(level) {
    const imgSrc = level.players?.[0]?.video_link 
        ? `https://img.youtube.com/vi/${extractYouTubeId(level.players[0].video_link)}/mqdefault.jpg`
        : '';
    
    return `
        <div class="level-card clickable-level" data-id="${level.id}">
            <div class="level-preview">
                <div class="level-position">${level.position}</div>
                <img src="${imgSrc}" alt="${level.name}" loading="lazy" onerror="this.src=''">
            </div>
            <div class="level-info">
                <div class="level-name">${level.name}</div>
                <div class="level-phase">Phase ${level.phase}</div>
                <div class="level-points">Points: ${level.points?.toFixed(1) || 'N/A'}</div>
                <div class="level-date">${level.record?.date || ''}</div>
                <div class="level-actions">
                    <i class="fas fa-external-link-alt"></i>
                </div>
            </div>
        </div>
    `;
}

function createProgressLevelCard(level) {
    const imgSrc = level.players?.[0]?.video_link 
        ? `https://img.youtube.com/vi/${extractYouTubeId(level.players[0].video_link)}/mqdefault.jpg`
        : '';
    
    return `
        <div class="level-card clickable-level" data-id="${level.id}">
            <div class="level-preview">
                <div class="level-position ${level.position === 1 ? 'first-place' : ''}">${level.position}</div>
                <img src="${imgSrc}" alt="${level.name}" loading="lazy" onerror="this.src=''">
            </div>
            <div class="level-info">
                <div class="level-name">${level.name} <span class="progress-percent">(${level.record?.progress || 0}%)</span></div>
                <div class="level-phase">Phase ${level.phase}</div>
                <div class="level-points">Points: ${level.partialPoints?.toFixed(1) || '0.0'} (of ${level.points?.toFixed(1) || '0.0'})</div>
                <div class="level-date">${level.record?.date || 'No date'}</div>
                <div class="level-actions">
                    <i class="fas fa-external-link-alt"></i>
                </div>
            </div>
        </div>
    `;
}

function extractYouTubeId(url) {
    if (!url) return null;
    
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    
    return (match && match[2].length === 11) ? match[2] : null;
}

async function fetchPlayersData() {
    const levelsResponse = await fetch('https://nicepeek.alex-bugrov104.workers.dev/api/levels');
    if (!levelsResponse.ok) {
        throw new Error('Failed to fetch players data');
    }
    const levels = await levelsResponse.json();

    const stats = {};
    levels.forEach(level => {
        level.players?.forEach(player => {
            const username = player.id;
            stats[username] = stats[username] || { points: 0, completions: 0 };
            if (player.progress >= 100) {
                stats[username].points += level.points || 0;
                stats[username].completions++;
            } else if (player.progress > 0) {
                stats[username].points += (level.points || 0) / 4;
            }
        });
    });

    return Object.keys(stats).map(username => ({
        username,
        points: parseFloat(stats[username].points.toFixed(1)),
        completions: stats[username].completions
    })).sort((a, b) => b.points - a.points);
}

function setupLevelCardsClickHandlers() {
    document.querySelectorAll('.clickable-level').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.tagName === 'A' || e.target.closest('a')) {
                return;
            }
            
            const levelId = card.dataset.id;
            window.open(`level.html?id=${levelId}`, '_blank');
        });
    });
}