document.addEventListener('DOMContentLoaded', function() {
    const loadingOverlay = document.getElementById('loading-overlay');
    const urlParams = new URLSearchParams(window.location.search);
    const levelId = urlParams.get('id');
    
    if (levelId) {
        loadLevelData(levelId);
    } else {
        loadingOverlay.innerHTML = `
            <div class="error-message">
                <p>No level ID provided. Redirecting to main page...</p>
            </div>
        `;
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 3000);
    }
    
    const menuItems = document.querySelectorAll('.menu-item:not(.discord-btn)');
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.getAttribute('data-tab');
            if (tab === 'demon-list') {
                window.location.href = 'index.html';
            } else {
                alert(`${tab} section is coming soon!`);
            }
        });
    });
    
    const levelIdElement = document.getElementById('level-id');
    if (levelIdElement) {
        levelIdElement.addEventListener('click', copyLevelId);
    }
});

async function loadLevelData(levelId) {
    try {
        const response = await fetch('https://nicepeek.alex-bugrov104.workers.dev/api/levels');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const levels = await response.json();
        const level = levels.find(l => l.id.toString() === levelId.toString());
        
        if (!level) throw new Error('Level not found');
        
        const orderResponse = await fetch('https://nicepeek.alex-bugrov104.workers.dev/api/order');
        if (!orderResponse.ok) throw new Error(`HTTP error! status: ${orderResponse.status}`);
        const order = await orderResponse.json();
        const position = order.indexOf(level.id) + 1;
        
        updateLevelPage(level, position);
        
        setTimeout(() => {
            const loadingOverlay = document.getElementById('loading-overlay');
            loadingOverlay.classList.add('hidden');
            loadingOverlay.addEventListener('transitionend', () => {
                loadingOverlay.style.display = 'none';
            });
        }, 500);
        
    } catch (error) {
        const loadingOverlay = document.getElementById('loading-overlay');
        loadingOverlay.innerHTML = `
            <div class="error-message">
                <p>Failed to load level data. Please try again later.</p>
                <p>Error details: ${error.message}</p>
                <p><a href="index.html">Return to main page</a></p>
            </div>
        `;
    }
}

function updateLevelPage(level, position) {
    document.querySelector('.level-position').textContent = `#${position}`;
    document.querySelector('.level-name').textContent = level.name;
    document.querySelector('.level-phase').textContent = `Phase ${level.phase}`;
    document.getElementById('level-id').textContent = `ID: ${level.id}`;
    document.querySelectorAll('.info-card')[0].querySelector('.info-value').textContent = level.ggdl_phase || 'N/A';
    document.querySelectorAll('.info-card')[1].querySelector('.info-value').textContent = 
        level.players && level.players[0] ? level.players[0].id : 'Unknown';
document.querySelectorAll('.info-card')[2].querySelector('.info-value').textContent = 
    Array.isArray(level.skill_sets) ? level.skill_sets.join(', ') : (level.skill_sets || 'None');
    document.querySelectorAll('.info-card')[3].querySelector('.info-value').textContent = 
        level.points ? level.points.toFixed(1) : '0.0';
    document.querySelectorAll('.info-card')[4].querySelector('.info-value').textContent = 
        level.list_percent ? `${level.list_percent}%` : '0%';

    const emptyCard = document.querySelector('.info-row:nth-child(3) .empty');
    if (level.nong) {
        emptyCard.classList.remove('empty');
        emptyCard.classList.add('nong-card');
        emptyCard.innerHTML = `
            <div class="info-label">NONG</div>
            <div class="nong-value">Download</div>
        `;
        
        emptyCard.addEventListener('click', () => {
            window.open(level.nong, '_blank');
        });
    } else {
        emptyCard.style.display = 'none';
        document.querySelector('.info-row:nth-child(3)').style.gridTemplateColumns = '1fr 1fr';
    }
    
    const videoContainer = document.getElementById('first-completion-video');
    if (level.players && level.players.length > 0 && level.players[0].video_link) {
        videoContainer.innerHTML = `
            <iframe 
                width="100%" 
                height="100%" 
                src="https://www.youtube.com/embed/${extractYouTubeId(level.players[0].video_link)}" 
                frameborder="0" 
                allowfullscreen>
            </iframe>
        `;
    }
    
    const recordsList = document.getElementById('records-list');
    const recordsCount = document.getElementById('records-count');
    
    if (level.players && level.players.length > 1) {
        const sortedPlayers = [...level.players.slice(1)].sort((a, b) => {
            const progressA = parseInt(a.progress) || 0;
            const progressB = parseInt(b.progress) || 0;
            return progressB - progressA;
        });
        
        recordsCount.textContent = sortedPlayers.length;
        
        recordsList.innerHTML = sortedPlayers.map(player => `
            <div class="record-item" data-video="${player.video_link || '#'}">
                <div class="record-info">
                    <span class="record-player">${player.id || 'Unknown'}</span>
                    <span class="record-date">${player.date || 'Unknown date'}</span>
                </div>
                <div class="record-progress">${player.progress || 0}%</div>
            </div>
        `).join('');
        
        document.querySelectorAll('.record-item').forEach(item => {
            item.addEventListener('click', () => {
                const videoUrl = item.getAttribute('data-video');
                if (videoUrl && videoUrl !== '#') {
                    window.open(videoUrl, '_blank');
                }
            });
        });
    } else {
        recordsCount.textContent = '0';
        recordsList.innerHTML = '<div class="no-records">No additional records available</div>';
    }
}


function copyLevelId() {
    const idText = this.textContent.replace('ID: ', '');
    navigator.clipboard.writeText(idText).then(() => {
        showCopyNotification();
    }).catch(err => {
    });
}

function showCopyNotification() {
    const notification = document.getElementById('copy-notification');
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 2000);
}

function extractYouTubeId(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}