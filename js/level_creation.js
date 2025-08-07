document.addEventListener('DOMContentLoaded', function() {
    initLevelCreationTools();
    
    document.querySelector('#new-level-modal .close-modal')?.addEventListener('click', closeNewLevelModal);
    document.getElementById('cancel-new-level-btn')?.addEventListener('click', closeNewLevelModal);
    document.getElementById('save-new-level-btn')?.addEventListener('click', saveNewLevel);
    
    document.getElementById('add-new-record-btn')?.addEventListener('click', openNewRecordModal);
    document.getElementById('save-new-record-btn')?.addEventListener('click', saveNewRecord);
    document.getElementById('cancel-new-record-btn')?.addEventListener('click', closeNewRecordModal);
});

let newLevelRecords = [];
let currentNewRecordIndex = null;
let recordsInitialized = false;

function initRecordsHandlers() {
    if (recordsInitialized) return;
    
    document.getElementById('add-new-record-btn')?.addEventListener('click', () => openNewRecordModal());
    document.getElementById('save-new-record-btn')?.addEventListener('click', saveNewRecord);
    document.getElementById('cancel-new-record-btn')?.addEventListener('click', closeNewRecordModal);
    
    recordsInitialized = true;
}

function initLevelCreationTools() {
    const modToolsDiv = document.querySelector('#mod-section .user-panel-card');
    if (modToolsDiv && !document.getElementById('create-level-btn')) {
        const createButton = document.createElement('button');
        createButton.id = 'create-level-btn';
        createButton.className = 'user-button primary';
        createButton.innerHTML = '<i class="fas fa-plus"></i> Create New Level';
        modToolsDiv.appendChild(createButton);
        
        createButton.addEventListener('click', openNewLevelModal);
    }
}

function openNewLevelModal() {
    closeAllModals();
    resetNewLevelForm();
    initRecordsHandlers();
    document.getElementById('new-level-modal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeNewLevelModal() {
    document.getElementById('new-level-modal').style.display = 'none';
    document.body.style.overflow = '';
    resetNewLevelForm();
}

function resetNewLevelForm() {
    document.getElementById('new-level-id').value = '';
    document.getElementById('new-name').value = '';
    document.getElementById('new-phase').value = '1';
    document.getElementById('new-points').value = '0';
    document.getElementById('new-percent').value = '100';
    document.getElementById('new-skills').value = '';
    
    newLevelRecords = [];
    updateNewPlayerList();
}

function updateNewPlayerList() {
    const playerList = document.getElementById('new-player-list');
    playerList.innerHTML = '';

    if (newLevelRecords.length > 0) {
        const table = document.createElement('table');
        table.className = 'records-table';
        
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Player</th>
                    <th>Progress</th>
                    <th>Date</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${newLevelRecords.map((player, index) => `
                    <tr class="${index === 0 ? 'first-place' : ''}">
                        <td>
                            ${player.video_link ? '<i class="fas fa-video video-icon"></i>' : ''}
                            ${player.id}
                        </td>
                        <td>${player.progress}%</td>
                        <td>${player.date || 'N/A'}</td>
                        <td>
                            <div class="record-actions">
                                <button class="action-btn edit-btn" data-index="${index}">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="action-btn delete-btn" data-index="${index}">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        
        playerList.appendChild(table);
        
        table.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                openNewRecordModal(parseInt(e.currentTarget.dataset.index));
            });
        });
        
        table.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('Are you sure you want to remove this record?')) {
                    newLevelRecords.splice(parseInt(e.currentTarget.dataset.index), 1);
                    updateNewPlayerList();
                }
            });
        });
    } else {
        playerList.innerHTML = '<div class="no-records">No records added yet</div>';
    }
}

function openNewRecordModal(index = null) {
    currentNewRecordIndex = index;
    
    if (index !== null) {
        const record = newLevelRecords[index];
        if (!record) {
            showNotification("Ошибка: запись не найдена", true);
            return;
        }
        document.getElementById('new-record-modal-title').textContent = 'Edit Record';
        document.getElementById('new-record-username').value = record.id || '';
        document.getElementById('new-record-progress').value = record.progress || 100;
        document.getElementById('new-record-date').value = record.date || '';
        document.getElementById('new-record-video').value = record.video_link || '';
    } else {
        document.getElementById('new-record-modal-title').textContent = 'Add New Record';
        document.getElementById('new-record-username').value = '';
        document.getElementById('new-record-progress').value = 100;
        document.getElementById('new-record-date').value = '';
        document.getElementById('new-record-video').value = '';
    }
    
    document.getElementById('new-record-modal').style.display = 'block';
}

function saveNewRecord() {
    const username = document.getElementById('new-record-username').value.trim();
    const progress = parseInt(document.getElementById('new-record-progress').value);
    const date = document.getElementById('new-record-date').value.trim();
    const videoLink = document.getElementById('new-record-video').value.trim();

    if (!username) {
        showNotification("Username is required", true);
        return;
    }

    const newRecord = {
        id: username,
        progress: progress,
        date: date || undefined,
        video_link: videoLink || undefined
    };

    if (currentNewRecordIndex !== null) {
        newLevelRecords[currentNewRecordIndex] = newRecord;
    } else {
        newLevelRecords.push(newRecord);
    }

    updateNewPlayerList();
    closeNewRecordModal();
}

function closeNewRecordModal() {
    document.getElementById('new-record-modal').style.display = 'none';
    currentNewRecordIndex = null;
}

async function saveNewLevel() {
    const idInput = document.getElementById('new-level-id').value.trim();
    const name = document.getElementById('new-name').value.trim();
    const phase = parseInt(document.getElementById('new-phase').value);
    const points = parseFloat(document.getElementById('new-points').value) || 0;
    const listPercent = parseFloat(document.getElementById('new-percent').value) || 100;
    const skills = document.getElementById('new-skills').value
        .split(',')
        .map(s => s.trim())
        .filter(s => s);

    const levelId = idInput || crypto.randomUUID();

    if (!name || name.length < 3) {
        showNotification("Level name must be at least 3 characters", true);
        return;
    }
    
    if (!window.allLevels || !Array.isArray(window.allLevels)) {
        window.allLevels = [];
    }
    const nameExists = window.allLevels.some(l => l.name && l.name.toLowerCase() === name.toLowerCase());
    if (nameExists) {
        showNotification("Level with this name already exists", true);
        return;
    }
    const newLevel = {
        id: levelId,
        name,
        phase,
        points,
        list_percent: listPercent,
        skill_sets: skills,
        players: newLevelRecords.map(player => ({
            id: player.id,  
            progress: player.progress,
            date: player.date || null,
            video_link: player.video_link || null
        }))
    };
    
    try {
        const response = await fetch(
            "https://nicepeek.alex-bugrov104.workers.dev/api/levels", 
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.authToken}`
                },
                body: JSON.stringify(newLevel)
            }
        );

        if (!response.ok) {
            let errorMsg = `HTTP Error: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMsg += " - " + (errorData.error || JSON.stringify(errorData));
            } catch {
                errorMsg += await response.text();
            }
            throw new Error(`Level creation failed: ${errorMsg}`);
        }

        const createdLevel = await response.json();
        window.allLevels = window.allLevels || [];
        window.originalOrder = window.originalOrder || [];
        window.allLevels = [createdLevel, ...window.allLevels]; 
        window.originalOrder = [createdLevel.id, ...window.originalOrder];
        displayLevels(window.originalOrder);
        
        showNotification("Level created successfully! 🎉");
        closeNewLevelModal();
    } catch (error) {
        const userMessage = error.message.includes('ggdl_phase') 
            ? "Missing 'ggdl_phase' field. Contact administrator." 
            : error.message;
        
        showNotification(`Error: ${userMessage}`, true);
    }
}
