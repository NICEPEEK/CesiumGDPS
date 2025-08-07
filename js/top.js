window.loadTopPlayers = async function() {
    const container = document.getElementById('players-list');
    if (!container) {
        return;
    }

    try {
        container.innerHTML = '<div class="loading">One moment...</div>';
        
        const players = await fetchPlayersData();
        
        container.innerHTML = '';
        players.forEach((player, index) => {
            container.appendChild(createPlayerCard(player, index + 1));
        });
        
    } catch (error) {
        container.innerHTML = `
            <div class="error">
                Ошибка загрузки: ${error.message}
                <button onclick="window.loadTopPlayers()">Повторить</button>
            </div>
        `;
    }
};

async function fetchPlayersData() {
    const [usersResponse, levelsResponse] = await Promise.all([
        fetch('https://nicepeek.alex-bugrov104.workers.dev/api/levels'), // <-- update this URL
        fetch('https://nicepeek.alex-bugrov104.workers.dev/api/levels')
    ]);

    if (!usersResponse.ok || !levelsResponse.ok) {
        throw new Error('Ошибка при получении данных с сервера');
    }

    const [users, levels] = await Promise.all([
        usersResponse.json(),
        levelsResponse.json()
    ]);

    const usersMap = {};
    users.forEach(user => usersMap[user.username] = user);

    const stats = {};
    levels.forEach(level => {
        level.players?.forEach(player => {
            const username = player.id;

            if (bannedPlayers.includes(username)) return;

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
        role: usersMap[username]?.role || 'user',
        avatar: usersMap[username]?.avatar,
        banner: usersMap[username]?.banner,
        country: usersMap[username]?.country,
        points: parseFloat(stats[username].points.toFixed(1)),
        completions: stats[username].completions
    })).sort((a, b) => b.points - a.points);
}

function createPlayerCard(player, rank) {
    const card = document.createElement('div');
    card.className = 'player-profile-card';
    
    const bannerStyle = player.banner 
        ? `background-image: url('${player.banner}'); background-size: cover; background-position: center;`
        : 'background: linear-gradient(135deg, #6a1b9a 0%, #8B0000 100%)';
    
    const avatarStyle = player.avatar 
        ? `background-image: url('${player.avatar}')`
        : 'background-color: #444';

    const countryFlag = player.country ? `flag-${player.country.toLowerCase()}` : 'flag-default';

    card.innerHTML = `
        <div class="profile-banner-container">
            <div class="profile-banner" style="${bannerStyle}"></div>
            <div class="player-rank-badge">#${rank}</div>
        </div>
        <div class="profile-main-info">
            <div class="profile-avatar-wrapper">
                <div class="profile-avatar" style="${avatarStyle}"></div>
            </div>
            <div class="profile-text-info">
                <div class="name-flag-wrapper">
                    <div class="username-container">
                        <div class="username-content">
                            ${player.role === 'mod' ? '<div class="mod-badge"><i class="fas fa-shield-alt"></i></div>' : ''}
                            <span class="username-text">${player.username}</span>
                        </div>
                    </div>
                    <div class="flag-container">
                        <div class="country-flag ${countryFlag}"></div>
                    </div>
                </div>
                <div class="player-stats-row">
                    <div class="stat-item">
                        <i class="fas fa-star"></i>
                        <div class="stat-value">${player.points}</div>
                        <div class="stat-label">Points</div>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-trophy"></i>
                        <div class="stat-value">${player.completions}</div>
                        <div class="stat-label">Completions</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    card.addEventListener('click', () => {
        window.location.href = `player-profile.html?username=${encodeURIComponent(player.username)}`;
    });
    
    return card;
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('CesiumList 0.1!');
    console.log('________00000000000___________000000000000_________');
    console.log('______00000000_____00000___000000_____0000000______');
    console.log('____0000000_____________000______________00000_____');
    console.log('__000000____________________________________0000___');
    console.log('__00000_____________________________________ 0000__');
    console.log('_00000______________________________________00000__');
    console.log('_00000_____________________________________000000__');
    console.log('__000000_________________________________0000000___');
    console.log('___0000000______________________________0000000____');
    console.log('_____000000____________________________000000______');
    console.log('_______000000________________________000000________');
    console.log('__________00000_____________________0000___________');
    console.log('_____________0000_________________0000_____________');
    console.log('_______________0000_____________000________________');
    console.log('_________________000_________000___________________');
    console.log('_________________ __000_____00_____________________');
    console.log('______________________00__00_______________________');
    console.log('________________________00_________________________');

    if (document.getElementById('top-players').classList.contains('active')) {
        window.loadTopPlayers();
    }
});