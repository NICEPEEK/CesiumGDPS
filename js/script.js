const bannedPlayers = [
];

const imageCache = {};

document.addEventListener('DOMContentLoaded', function() {
    const tabButtons = document.querySelectorAll('.menu-item:not(.discord-btn)');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            if (!tabId) return;

            tabButtons.forEach(btn => {
                if (btn.classList) btn.classList.remove('active');
            });
            
            tabContents.forEach(content => {
                if (content.classList) content.classList.remove('active');
            });
            
            if (button.classList) button.classList.add('active');
            
            const tabContent = document.getElementById(tabId);
            if (tabContent && tabContent.classList) {
                tabContent.classList.add('active');
            }

            const filterBtn = document.getElementById('filter-btn');
            if (filterBtn) {
                filterBtn.style.display = tabId === 'demon-list' ? 'flex' : 'none';
            }

            if (tabId === 'top-players' && typeof window.loadTopPlayers === 'function') {
                window.loadTopPlayers();
            }
        });
    });
    
    loadDemonList();
    initTabs();
    initFilters();
    initUserPanel();
});
let scrollPosition = 0;
let allLevels = [];
let filteredLevels = [];
let originalOrder = [];
let authToken = localStorage.getItem("authToken") || null;

function initTabs() {
    const tabButtons = document.querySelectorAll('.menu-item:not(.discord-btn)');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            if (!tabId) return;
            
            switchTab(tabId);
            
            switch(tabId) {
                case 'top-players':
                    if (typeof window.loadTopPlayers === 'function') {
                        window.loadTopPlayers();
                    }
                    break;
                    
                case 'blitzkrieg':
                    const lastSessionId = localStorage.getItem('lastBlitzkriegSession');
                    if (lastSessionId) {
                        const sessionSelect = document.getElementById('session-select');
                        if (sessionSelect) {
                            sessionSelect.value = lastSessionId;
                            if (typeof window.initBlitzkrieg === 'function') {
                                window.initBlitzkrieg();
                            }
                        }
                    }
                    break;
                    
                case 'archive':
                    loadArchiveLevels('official');
                    break;
            }
        });
    });
}

async function fetchBlacklist() {
    try {
        const response = await fetch('./blacklist.json');
        if (!response.ok) throw new Error('Failed to load blacklist');
        const data = await response.json();
        return data.bannedPlayers || [];
    } catch (error) {
        console.error('Error loading blacklist:', error);
        return [];
    }
}

function switchTab(tabId) {
    closeAllModals();
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    document.querySelectorAll('.menu-item:not(.discord-btn)').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const tabContent = document.getElementById(tabId);
    if (tabContent) {
        tabContent.classList.add('active');
    }
    
    const activeButton = document.querySelector(`.menu-item[data-tab="${tabId}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
    
    const filterBtn = document.getElementById('filter-btn');
    if (filterBtn) {
        filterBtn.style.display = tabId === 'demon-list' ? 'flex' : 'none';
    }
}

function showNotification(message, isError = false) {
    const notification = document.createElement('div');
    notification.className = `notification${isError ? ' error' : ''}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 100);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

function initUserPanel() {
    if (authToken) {
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('profile-section').style.display = 'block';
        restoreUserData();
        
        const userData = JSON.parse(localStorage.getItem("userData")) || {};
        if (userData.username) {
            loadUserProfile(userData.username);
        }

        if (userData.role === 'mod') {
            document.getElementById('mod-section').style.display = 'block';
            initModTools();
        }
    }

    document.getElementById('login-button').addEventListener('click', handleLogin);
    document.getElementById('update-profile-button').addEventListener('click', handleProfileUpdate);
    document.getElementById('logout-button').addEventListener('click', handleLogout);
    document.getElementById('avatar-input').addEventListener('change', handleAvatarUpload);
    document.getElementById('banner-input').addEventListener('change', handleBannerUpload);
    
    document.getElementById('profile-description').addEventListener('input', function(e) {
        updateDescriptionPreview(e);
        saveUserData();
    });

    const resetBannerBtn = document.getElementById('clear-banner');
    if (resetBannerBtn) resetBannerBtn.style.display = 'none';
}

function saveUserData() {
    const userData = {
        username: document.getElementById('profile-username').value,
        avatar: document.getElementById('profile-avatar-url').value,
        banner: document.getElementById('profile-banner-url').value,
        description: document.getElementById('profile-description').value,
        country: document.getElementById('profile-country')?.value || '',
        role: document.getElementById('profile-role').value || 'user'
    };
    localStorage.setItem("userData", JSON.stringify(userData));
}

function restoreUserData() {
    const userData = JSON.parse(localStorage.getItem("userData")) || {};
    
    if (userData.username) document.getElementById('profile-username').value = userData.username;
    if (userData.avatar) {
        document.getElementById('profile-avatar-url').value = userData.avatar;
        updateAvatarPreview(userData.avatar);
    }
    if (userData.banner) {
        document.getElementById('profile-banner-url').value = userData.banner;
        updateBannerPreview(userData.banner);
    }
    if (userData.description) document.getElementById('profile-description').value = userData.description;
    if (userData.country && document.getElementById('profile-country')) {
        document.getElementById('profile-country').value = userData.country;
        updateCountryFlag(userData.country);
    }
    if (userData.role) document.getElementById('profile-role').value = userData.role;

    updateUsernamePreview({ target: { value: userData.username || '' } });
    updateDescriptionPreview({ target: { value: userData.description || 'No description yet' } });
}

async function handleLogin() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
        const res = await fetch('https://nicepeek.alex-bugrov104.workers.dev/api/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ username, password })
        });

        if (res.ok) {
            const data = await res.json();
            authToken = data.token;
            localStorage.setItem("authToken", authToken);
            
            showNotification("Login successful!");
            document.getElementById('auth-section').style.display = 'none';
            document.getElementById('profile-section').style.display = 'block';
            
            await loadUserProfile(username);
        } else {
            const errorData = await res.json();
            showNotification(errorData.message || "Invalid credentials.", true);
        }
    } catch (error) {
        showNotification("Network error. Please try again.", true);
    }
}

async function loadUserProfile(username) {
    try {
        const res = await fetch(`https://nicepeek.alex-bugrov104.workers.dev/api/profile/${username}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!res.ok) throw new Error(await res.text());
        
        const data = await res.json();
        updateProfileForm(data);
        saveProfileDataToLocalStorage(data);
        
        if (data.role === 'mod') {
            document.getElementById('mod-section').style.display = 'block';
            initModTools();
        }
    } catch (error) {
        showNotification("Using locally saved data", true);
        restoreUserData();
    }
}

function updateProfileForm(data) {
    document.getElementById('profile-username').value = data.username || '';
    document.getElementById('profile-avatar-url').value = data.avatar || '';
    document.getElementById('profile-banner-url').value = data.banner || '';
    document.getElementById('profile-description').value = data.description || '';
    document.getElementById('profile-role').value = data.role || 'user';
    if (document.getElementById('profile-country')) {
        document.getElementById('profile-country').value = data.country || '';
    }
    
    updateAvatarPreview(data.avatar);
    updateBannerPreview(data.banner);
    updateUsernamePreview({ target: { value: data.username || '' } });
    updateDescriptionPreview({ target: { value: data.description || 'No description yet' } });
    updateCountryFlag(data.country);
}

function saveProfileDataToLocalStorage(data) {
    const userData = {
        username: data.username,
        avatar: data.avatar,
        banner: data.banner,
        description: data.description,
        role: data.role,
        country: data.country,
        token: authToken
    };
    localStorage.setItem("userData", JSON.stringify(userData));
}

async function handleProfileUpdate() {
    const updatedData = {
        password: document.getElementById('profile-password').value || undefined,
        avatar: document.getElementById('profile-avatar-url').value,
        banner: document.getElementById('profile-banner-url').value,
        description: document.getElementById('profile-description').value,
        country: document.getElementById('profile-country')?.value || undefined
    };

    try {
        const res = await fetch('https://nicepeek.alex-bugrov104.workers.dev/api/profile', {
            method: "PUT",
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(updatedData)
        });

        if (!res.ok) throw new Error(await res.text());

        await loadUserProfile(); 
        showNotification("Profile updated successfully!");
        saveProfileDataToLocalStorage(updatedData);
    } catch (error) {
        showNotification("Failed to update profile: " + error.message, true);
    }
}

function handleLogout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userData");
    authToken = null;
    document.getElementById('auth-section').style.display = 'block';
    document.getElementById('profile-section').style.display = 'none';
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
}

function initModTools() {
    const editOrderBtn = document.getElementById('edit-order-btn');
    const createLevelBtn = document.getElementById('create-level-btn');
    
    if (editOrderBtn) editOrderBtn.addEventListener('click', openOrderEditor);
    if (createLevelBtn) createLevelBtn.addEventListener('click', openNewLevelModal);
    
    document.getElementById('save-order-btn')?.addEventListener('click', saveLevelOrder);
    document.getElementById('save-level-btn')?.addEventListener('click', saveLevelData);
    document.getElementById('add-record-btn')?.addEventListener('click', () => {
        currentEditingRecordIndex = null;
        openAddRecordModal();
    });
    document.getElementById('save-record-btn')?.addEventListener('click', saveRecord);
    document.getElementById('cancel-record-btn')?.addEventListener('click', closeRecordModal);

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => closeAllModals());
    });
    
    document.querySelector('.close-record-modal')?.addEventListener('click', () => {
        closeModal('record-edit-modal');
    });
}

let currentEditingLevel = null;
let currentEditingRecordIndex = null;



function backToLevelList() {
    document.getElementById('level-edit-form').style.display = 'none';
    document.getElementById('level-select-container').style.display = 'block';
    currentEditingLevel = null;
    const container = document.getElementById('levels-container');
    if (container) {
        container.style.margin = '';
        container.style.padding = '';
        container.style.display = '';
        container.style.flexDirection = '';
        container.style.gap = '15px'; 
        container.classList.remove('level-edit-container');
    }
    const levelCards = document.querySelectorAll('.level-card');
    levelCards.forEach(card => {
        const img = card.querySelector('img');
        if (img) {
            img.style.display = '';
            img.style.width = '';
            img.style.height = '';
            img.style.objectFit = '';
        }
        
        card.style.marginBottom = '15px'; 
    });

    displayLevels(originalOrder);
}

function openAddRecordModal() {
    currentEditingRecordIndex = null;
    document.getElementById('record-modal-title').textContent = 'Add New Record';
    document.getElementById('record-username').value = '';
    document.getElementById('record-progress').value = 100;
    document.getElementById('record-date').value = '';
    document.getElementById('record-video').value = '';
    document.getElementById('record-edit-modal').style.display = 'block';
}

function openEditRecordModal(index) {
    currentEditingRecordIndex = index;
    const record = currentEditingLevel.players[index];
    document.getElementById('record-modal-title').textContent = 'Edit Record';
    document.getElementById('record-username').value = record.id || ''; 
    document.getElementById('record-progress').value = record.progress || 100;
    document.getElementById('record-date').value = record.date || '';
    document.getElementById('record-video').value = record.video_link || '';
    document.getElementById('record-edit-modal').style.display = 'block';
}


function closeRecordModal() {
    document.getElementById('record-edit-modal').style.display = 'none';
}

function saveRecord() {
    if (!currentEditingLevel) return;

    const id = document.getElementById('record-username').value.trim();
    const progress = parseInt(document.getElementById('record-progress').value);
    const date = document.getElementById('record-date').value.trim();
    const videoLink = document.getElementById('record-video').value.trim();

    if (!id) {
        showNotification("Username is required", true);
        return;
    }

    const newRecord = {
        id,
        progress,
        date: date || undefined,
        video_link: videoLink || undefined
    };

    if (!currentEditingLevel.players) {
        currentEditingLevel.players = [];
    }

    if (currentEditingRecordIndex !== null) {
        currentEditingLevel.players[currentEditingRecordIndex] = newRecord;
    } else {
        currentEditingLevel.players.push(newRecord);
    }

    updatePlayerList(currentEditingLevel.players);
    closeRecordModal();
}

function removeRecord(index) {
    if (confirm("Are you sure you want to remove this record?")) {
        currentEditingLevel.players.splice(index, 1);
        updatePlayerList(currentEditingLevel.players);
    }
}

function openAddRecordModal() {
    currentEditingRecordIndex = null;
    document.getElementById('record-modal-title').textContent = 'Add New Record';
    document.getElementById('record-username').value = '';
    document.getElementById('record-progress').value = 100;
    document.getElementById('record-date').value = '';
    document.getElementById('record-video').value = '';
    document.getElementById('record-edit-modal').style.display = 'block';
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
    document.body.style.overflow = '';
    currentEditingLevel = null;
    resetNewLevelForm();
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

function openLevelDataEditor() {
    const modal = document.getElementById('level-edit-modal');
    const container = document.getElementById('level-select-container');
    const searchInput = document.getElementById('level-search');
    
    container.innerHTML = '';
    loadAllLevelsForEditing();
    
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const levelCards = container.querySelectorAll('.selectable-level');
        
        levelCards.forEach(card => {
            const levelName = card.querySelector('.level-name').textContent.toLowerCase();
            card.style.display = levelName.includes(searchTerm) ? 'flex' : 'none';
        });
    });
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    setTimeout(() => searchInput.focus(), 100);
}

function loadAllLevelsForEditing() {
    const container = document.getElementById('level-select-container');
    container.innerHTML = '';
    
    originalOrder.forEach((id, index) => {
        const level = allLevels.find(l => l.id === id);
        if (level) {
            const card = createSelectableLevelCard(level, index + 1);
            container.appendChild(card);
        }
    });
}

function createSelectableLevelCard(level, position) {
    const card = document.createElement('div');
    card.className = 'level-card selectable-level';
    card.dataset.id = level.id;
    card.style.display = 'flex';
    card.innerHTML = `
        <div class="level-preview">
            <div class="level-position">${position}</div>
            <img src="" alt="${level.name}" loading="lazy">
        </div>
        <div class="level-info">
            <div class="level-name">${level.name}</div>
            <div class="level-phase">Phase ${level.phase}</div>
            <div class="level-points">Points: ${level.points?.toFixed(1) || 'N/A'}</div>
        </div>
    `;
    
    const img = card.querySelector('img');
    if (level.players?.[0]?.video_link) {
        const videoId = extractYouTubeId(level.players[0].video_link);
        img.src = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` 
                          : '';
    } else {
        img.src = '';
    }
    
    img.onerror = () => img.src = '';
    
    card.addEventListener('click', () => {
        loadLevelDataForEditing(level);
    });
    
    return card;
}

function loadLevelDataForEditing(level) {
    currentEditingLevel = level;
    document.getElementById('level-select-container').style.display = 'none';
    document.getElementById('level-edit-form').style.display = 'block';

    document.getElementById('edit-name').value = level.name || '';
    document.getElementById('edit-phase').value = level.phase || 1;
    document.getElementById('edit-points').value = level.points || 0;
    document.getElementById('edit-percent').value = level.list_percent || 100;
    document.getElementById('edit-ggdl-phase').value = level.ggdl_phase || 0;
    document.getElementById('edit-skills').value = level.skill_sets?.join(', ') || '';
    
    if (!document.getElementById('edit-ggdl-phase')) {
        const container = document.querySelector('.level-edit-grid');
        const ggdlGroup = document.createElement('div');
        ggdlGroup.className = 'level-edit-group';
        ggdlGroup.innerHTML = `
            <label for="edit-ggdl-phase">GDDP Phase</label>
            <input type="number" id="edit-ggdl-phase" min="1">
        `;
        container.insertBefore(ggdlGroup, document.querySelector('.level-edit-group:nth-child(5)'));
    }
    document.getElementById('edit-ggdl-phase').value = level.ggdl_phase || 0;
    
    if (!document.getElementById('edit-skills')) {
        const container = document.querySelector('.level-edit-grid');
        const skillsGroup = document.createElement('div');
        skillsGroup.className = 'level-edit-group';
        skillsGroup.innerHTML = `
            <label for="edit-skills">Skill Sets (comma separated)</label>
            <input type="text" id="edit-skills">
        `;
        container.insertBefore(skillsGroup, document.querySelector('.level-edit-group:nth-child(6)'));
    }
    document.getElementById('edit-skills').value = level.skill_sets ? level.skill_sets.join(', ') : '';

    updatePlayerList(level.players || []);
    closeRecordModal();
}

async function saveLevelData() {
    if (!currentEditingLevel) return;
    
    const updatedData = {
        id: currentEditingLevel.id,
        name: document.getElementById('edit-name').value,
        phase: parseInt(document.getElementById('edit-phase').value),
        points: parseFloat(document.getElementById('edit-points').value),
        list_percent: parseFloat(document.getElementById('edit-percent').value),
        ggdl_phase: parseInt(document.getElementById('edit-ggdl-phase').value) || 0,
        skill_sets: document.getElementById('edit-skills').value
            .split(',')
            .map(s => s.trim())
            .filter(s => s),
        players: currentEditingLevel.players || []
    };
    
    try {
        const res = await fetch('https://nicepeek.alex-bugrov104.workers.dev/api/levels', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(updatedData)
        });
        
        if (res.ok) {
            showNotification("Level data updated successfully!");
            const index = allLevels.findIndex(l => l.id === currentEditingLevel.id);
            if (index !== -1) {
                allLevels[index] = { ...allLevels[index], ...updatedData };
            }
            closeAllModals();
            displayLevels(originalOrder);
        } else {
            throw new Error(await res.text());
        }
    } catch (error) {
        showNotification("Failed to update level data: " + error.message, true);
    }
}

function openOrderEditor() {
    const modal = document.getElementById('order-edit-modal');
    if (!modal) {
        return;
    }
    
    const container = document.getElementById('editable-levels-container');
    if (!container) {
        return;
    }

    container.innerHTML = '';
    
    originalOrder.forEach((id, index) => {
        const level = allLevels.find(l => l.id === id);
        if (level) {
            const card = createDraggableLevelCard(level, index + 1);
            container.appendChild(card);
        }
    });
    
    initDragAndDrop();
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function createDraggableLevelCard(level, position) {
    const card = document.createElement('div');
    card.className = 'level-card draggable-level';
    card.dataset.id = level.id;
    card.innerHTML = `
        <div class="level-preview">
            <div class="level-position">${position}</div>
            <img src="" alt="${level.name}" loading="lazy">
        </div>
        <div class="level-info">
            <div class="level-name">${level.name}</div>
            <div class="level-phase">Phase ${level.phase}</div>
            <div class="level-points">Points: ${level.points?.toFixed(1) || 'N/A'}</div>
        </div>
    `;
    
    const img = card.querySelector('img');
    if (level.players?.[0]?.video_link) {
        const videoId = extractYouTubeId(level.players[0].video_link);
        img.src = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` 
                          : '';
    } else {
        img.src = '';
    }
    
    img.onerror = () => img.src = '';
    
    return card;
}

function initDragAndDrop() {
    const container = document.getElementById('editable-levels-container');
    const levels = Array.from(container.querySelectorAll('.draggable-level'));
    
    let draggedItem = null;
    let scrollInterval = null;
    let scrollSpeed = 0;
    const scrollZoneHeight = 100; 
    const maxScrollSpeed = 20;   
    
    levels.forEach(level => {
        level.setAttribute('draggable', 'true');
        
        level.addEventListener('dragstart', function(e) {
            draggedItem = this;
            setTimeout(() => {
                this.classList.add('dragging');
                this.style.opacity = '0.5';
            }, 0);
        });
        
        level.addEventListener('dragend', function() {
            this.classList.remove('dragging');
            this.style.opacity = '1';
            clearInterval(scrollInterval);
            scrollInterval = null;
            draggedItem = null;
        });
    });

    container.addEventListener('dragover', function(e) {
        e.preventDefault();
        
        const rect = container.getBoundingClientRect();
        const yPos = e.clientY - rect.top;
        const containerHeight = rect.height;
        
        if (yPos < scrollZoneHeight) {
            scrollSpeed = -maxScrollSpeed * (1 - yPos / scrollZoneHeight);
        } else if (yPos > containerHeight - scrollZoneHeight) {
            scrollSpeed = maxScrollSpeed * 
                (1 - (containerHeight - yPos) / scrollZoneHeight);
        } else {
            scrollSpeed = 0;
        }
        
        if (scrollSpeed !== 0 && !scrollInterval) {
            scrollInterval = setInterval(() => {
                container.scrollTop += scrollSpeed;
                
                if (draggedItem) {
                    const afterElement = getDragAfterElement(container, e.clientY);
                    if (afterElement == null) {
                        container.appendChild(draggedItem);
                    } else {
                        container.insertBefore(draggedItem, afterElement);
                    }
                }
            }, 16); 
        } else if (scrollSpeed === 0 && scrollInterval) {
            clearInterval(scrollInterval);
            scrollInterval = null;
        }
        
        if (!draggedItem) return;
        const afterElement = getDragAfterElement(container, e.clientY);
        if (afterElement == null) {
            container.appendChild(draggedItem);
        } else {
            container.insertBefore(draggedItem, afterElement);
        }
    });

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.draggable-level:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    container.addEventListener('dragleave', function() {
        clearInterval(scrollInterval);
        scrollInterval = null;
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.draggable-level:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function closeOrderEditor() {
    document.getElementById('order-edit-modal').style.display = 'none';
    document.body.style.overflow = '';
}

async function saveLevelOrder() {
    const container = document.getElementById('editable-levels-container');
    const newOrder = Array.from(container.querySelectorAll('.draggable-level')).map(el => el.dataset.id);
    
    try {
        const res = await fetch('https://nicepeek.alex-bugrov104.workers.dev/api/order', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ level_ids: newOrder })
        });
        
        if (res.ok) {
            originalOrder = newOrder;
            showNotification("Level order updated successfully!");
            closeOrderEditor();
            displayLevels(originalOrder); 
        } else {
            throw new Error(await res.text());
        }
    } catch (error) {
        showNotification("Failed to update level order: " + error.message, true);
    }
}

async function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        updateAvatarPreview(URL.createObjectURL(file));
        const url = await uploadToImgBB(file);
        if (url) {
            document.getElementById('profile-avatar-url').value = url;
            updateAvatarPreview(url);
            showNotification("Avatar uploaded successfully!");
            saveUserData();
        }
    } catch (error) {
        showNotification("Failed to upload avatar.", true);
    }
}

async function handleBannerUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        updateBannerPreview(URL.createObjectURL(file));
        const url = await uploadToImgBB(file);
        if (url) {
            document.getElementById('profile-banner-url').value = url;
            updateBannerPreview(url);
            showNotification("Banner uploaded! Don't forget to save changes.");
            saveUserData();
        }
    } catch (error) {
        showNotification("Failed to upload banner.", true);
        updateBannerPreview(document.getElementById('profile-banner-url').value);
    }
}

async function uploadToImgBB(file) {
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await fetch(`https://api.imgbb.com/1/upload?key=54e6a572316f6dfded3c09f24fab60f2`, {
        method: 'POST',
        body: formData
    });
    
    const data = await response.json();
    if (!data.success) throw new Error(data.error?.message || 'Failed to upload image');
    return data.data.url;
}

function updateAvatarPreview(url) {
    const preview = document.getElementById('avatar-preview');
    if (!url) {
        preview.style.backgroundImage = 'url()';
        return;
    }
    const img = new Image();
    img.src = getCachedImage(url);
    img.onload = () => {
        preview.style.backgroundImage = `url(${url})`;
    };
    img.onerror = () => {
        preview.style.backgroundImage = 'url()';
    };
}

function updateBannerPreview(url) {
    const preview = document.getElementById('banner-preview');
    if (!url || url.trim() === '') {
        preview.style.backgroundImage = 'none';
        preview.style.backgroundColor = '#333';
        return;
    }
    
    const img = new Image();
    img.src = getCachedImage(url);
    img.onload = () => {
        preview.style.backgroundImage = `url(${url})`;
        preview.style.backgroundSize = 'cover';
        preview.style.backgroundPosition = 'center';
        preview.style.backgroundColor = 'transparent';
    };
    img.onerror = () => {
        preview.style.backgroundImage = 'none';
        preview.style.backgroundColor = '#333';
    };
}

function updateUsernamePreview(event) {
    const usernameElement = document.getElementById('preview-username');
    const role = document.getElementById('profile-role').value;
    const username = event.target.value || 'Username';
    
    usernameElement.innerHTML = '';
    
    const usernameText = document.createElement('span');
    usernameText.textContent = username;
    usernameText.className = 'bold-username';
    usernameElement.appendChild(usernameText);
    
    if (role === 'mod') {
        const modBadge = document.createElement('div');
        modBadge.className = 'mod-badge';
        modBadge.innerHTML = '<i class="fas fa-shield-alt"></i>';
        usernameElement.insertBefore(modBadge, usernameText);
    }
}

function updateDescriptionPreview(event) {
    const descElement = document.getElementById('preview-description');
    const text = event.target.value || 'No description yet';
    descElement.textContent = text.substring(0, 80);
    
    const charCount = document.getElementById('char-count');
    if (charCount) {
        charCount.textContent = text.length;
        charCount.style.color = text.length >= 80 ? '#ff5555' : '#aaa';
    }
}

function updateCountryFlag(countryCode) {
    const flagElement = document.getElementById('country-flag');
    if (!flagElement) return;
    
    flagElement.className = 'country-flag';
    flagElement.classList.add(
        countryCode && typeof countryCode === 'string' && countryCode.trim().length === 2 
            ? `flag-${countryCode.toLowerCase()}` 
            : 'flag-default'
    );
}

async function loadDemonList() {
    try {
        const [orderResponse, levelsResponse] = await Promise.all([
            fetch('https://nicepeek.alex-bugrov104.workers.dev/api/order'),
            fetch('https://nicepeek.alex-bugrov104.workers.dev/api/levels')
        ]);
        
        if (!orderResponse.ok || !levelsResponse.ok) {
            throw new Error(`HTTP error! status: ${orderResponse.status}, ${levelsResponse.status}`);
        }
        
        originalOrder = await orderResponse.json();
        allLevels = await levelsResponse.json();
        
        allLevels.forEach(level => {
            if (typeof level.phase === 'undefined') {
                console.warn(`Level ${level.id} is missing phase property - setting to '1'`);
                level.phase = '1';
            }
            level.phase = String(level.phase).trim();
        });
        
        filteredLevels = [...allLevels];
        displayFilteredLevels();
        initPhaseTags(allLevels);
    } catch (error) {
        document.getElementById('levels-container').innerHTML = `
            <div class="error-message">
                <p>Failed to load demon list. Please try again later.</p>
                <p>Error details: ${error.message}</p>
            </div>
        `;
    }
}

function createLevelCard(level, position) {
    const card = document.createElement('div');
    card.className = 'level-card';
    card.innerHTML = `
        <div class="level-preview">
            <div class="level-position">${position}</div>
            <img src="" alt="${level.name}" loading="lazy">
        </div>
        <div class="level-info">
            <div class="level-name">${level.name}</div>
            <div class="level-phase">Phase ${level.phase}</div>
            <div class="level-points">Points: ${level.points?.toFixed(1) || 'N/A'}</div>
        </div>
    `;

    const img = card.querySelector('img');
    if (level.players?.[0]?.video_link) {
        const videoId = extractYouTubeId(level.players[0].video_link);
        img.src = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` 
                          : '';
    } else {
        img.src = '';
    }

    img.onerror = () => img.src = '';

    const editBtn = createEditButton(level);
    card.appendChild(editBtn);

    const userData = JSON.parse(localStorage.getItem("userData")) || {};
    if (userData.role === 'mod') {
        editBtn.style.display = 'flex';
    }

    card.addEventListener('click', (e) => {
        if (!e.target.classList.contains('level-edit-btn') && 
            !e.target.closest('.level-edit-btn')) {
            window.location.href = `level.html?id=${level.id}`;
        }
    });

    return card;
}

function extractYouTubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url?.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function initFilters() {
    const filterBtn = document.getElementById('filter-btn');
    if (!filterBtn) return;

    const overlay = document.getElementById('filter-overlay');
    const panel = document.getElementById('filter-panel');
    const closeBtn = document.querySelector('.close-filter');
    const applyBtn = document.querySelector('.apply-filter');
    const resetBtn = document.querySelector('.reset-filter');
    
    filterBtn.addEventListener('click', () => {
        overlay.style.display = 'block';
        panel.style.display = 'block';
        document.body.style.overflow = 'hidden';
    });
    
    closeBtn.addEventListener('click', closeFilters);
    overlay.addEventListener('click', closeFilters);
    applyBtn.addEventListener('click', applyFilters);
    resetBtn.addEventListener('click', resetFilters);
    
    function closeFilters() {
        overlay.style.display = 'none';
        panel.style.display = 'none';
        document.body.style.overflow = '';
    }
        
    function applyFilters() {
        const searchTerm = document.getElementById('search').value.toLowerCase();
        const selectedPhases = Array.from(document.querySelectorAll('.phase-tag.selected'))
                                .map(tag => tag.dataset.phase); 
        
        filteredLevels = allLevels.filter(level => {
            const nameMatch = level.name.toLowerCase().includes(searchTerm);
            
            const levelPhase = String(level.phase).trim();
            const phaseMatch = selectedPhases.length === 0 || 
                            selectedPhases.includes(levelPhase);
            
            return nameMatch && phaseMatch;
        });
        
        displayFilteredLevels();
        closeFilters();
    }

    function resetFilters() {
        document.getElementById('search').value = '';
        document.querySelectorAll('.phase-tag').forEach(tag => {
            tag.classList.remove('selected');
        });
        filteredLevels = [...allLevels];
        displayFilteredLevels();
        closeFilters();
    }
}

function initPhaseTags(levels) {
    const container = document.getElementById('phase-tags');
    if (!container) return;
    
    const phases = [...new Set(levels.map(l => String(l.phase).trim()))]
        .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

    container.innerHTML = '';
    
    phases.forEach(phase => {
        const tag = document.createElement('div');
        tag.className = 'phase-tag';
        tag.textContent = `Phase ${phase}`;
        tag.dataset.phase = phase; 
        tag.addEventListener('click', () => {
            tag.classList.toggle('selected');
            tag.style.transform = tag.classList.contains('selected') ? 'scale(1.05)' : '';
            setTimeout(() => tag.style.transform = '', 200);
        });
        container.appendChild(tag);
    });
}

document.getElementById('profile-description')?.addEventListener('input', function() {
    const charCount = document.getElementById('char-count');
    if (charCount) {
        charCount.textContent = this.value.length;
        charCount.style.color = this.value.length >= 80 ? '#ff5555' : '#aaa';
    }
});

function resetNewLevelForm() {
    const form = document.getElementById('new-level-modal');
    if(form) {
        form.querySelectorAll('input').forEach(input => {
            input.value = '';
        });
        document.getElementById('new-phase').value = '1';
        document.getElementById('new-points').value = '0';
        document.getElementById('new-percent').value = '100';
    }
}

function updatePlayerList(players) {
    const playerList = document.getElementById('player-list');
    playerList.innerHTML = '';

    if (players?.length) {
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
                ${players.map((player, index) => `
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
                openEditRecordModal(parseInt(e.currentTarget.dataset.index));
            });
        });
        
        table.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeRecord(parseInt(e.currentTarget.dataset.index));
            });
        });
    } else {
        playerList.innerHTML = '<div class="no-records">No records available</div>';
    }
}

function initLevelCreationTools() {
    const modToolsDiv = document.querySelector('#mod-section .user-panel-card');
    if (modToolsDiv) {
        const createButton = document.createElement('button');
        createButton.id = 'create-level-btn';
        createButton.className = 'user-button primary';
        createButton.innerHTML = '<i class="fas fa-plus"></i> Create New Level';
        modToolsDiv.appendChild(createButton);
    }
}

function displayFilteredLevels() {
    const container = document.getElementById('levels-container');
    container.innerHTML = '';

    const isFilterActive = document.getElementById('search').value || 
                         document.querySelectorAll('.phase-tag.selected').length > 0;

    const levelsMap = new Map(allLevels.map(level => [level.id, level]));

    originalOrder.forEach((id, originalPosition) => {
        const level = levelsMap.get(id);
        if (level && filteredLevels.some(l => l.id === id) && !shouldRemoveLevel(level)) {
            const card = createLevelCard(level, originalPosition + 1); // Используем оригинальную позицию

            if (isFilterActive) {
                const viewInListBtn = document.createElement('button');
                viewInListBtn.className = 'view-in-list-btn';
                viewInListBtn.textContent = 'View in list';
                viewInListBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    resetFiltersAndScrollToLevel(id);
                });
                card.appendChild(viewInListBtn);
            }

            container.appendChild(card);
        }
    });

    if (container.children.length === 0) {
        container.innerHTML = '<div class="no-results">No levels match your filters</div>';
    }
}

function resetFiltersAndScrollToLevel(levelId) {
    document.getElementById('search').value = '';
    document.querySelectorAll('.phase-tag').forEach(tag => {
        tag.classList.remove('selected');
    });
    filteredLevels = [...allLevels];
    
    displayLevels(originalOrder);
    
    document.getElementById('filter-overlay').style.display = 'none';
    document.getElementById('filter-panel').style.display = 'none';
    document.body.style.overflow = '';
    
    const levelIndex = originalOrder.indexOf(levelId);
    if (levelIndex !== -1) {
        setTimeout(() => {
            const container = document.getElementById('levels-container');
            if (container.children.length > levelIndex) {
                const levelCard = container.children[levelIndex];
                levelCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                levelCard.classList.add('level-highlight');
                
                setTimeout(() => {
                    levelCard.classList.remove('level-highlight');
                }, 1500);
            }
        }, 100);
    }
}

function loadTopPlayers() {
    if (typeof window.loadTopPlayers === 'function') {
        window.loadTopPlayers();
    }
}

async function loadArchiveLevels(type = 'official') {
    try {
        const response = await fetch(`https://nicepeek.alex-bugrov104.workers.dev/api/${type}_archive`);
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const archiveLevels = await response.json();
        displayArchiveLevels(archiveLevels, type);
        
        document.querySelectorAll('.archive-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === type);
        });
        
    } catch (error) {
        document.getElementById('archive-levels-container').innerHTML = `
            <div class="error-message">
                <p>Failed to load archive levels. Please try again later.</p>
                <p>Error details: ${error.message}</p>
            </div>
        `;
    }
}

function displayArchiveLevels(archiveLevels, type) {
    const container = document.getElementById('archive-levels-container');
    container.innerHTML = '';

    const archiveMap = new Map(archiveLevels.map(item => [item.id, item]));
    
    const sortedLevels = originalOrder
        .filter(id => archiveMap.has(id))
        .map(id => {
            const level = allLevels.find(l => l.id === id);
            return {
                ...level,
                date: archiveMap.get(id).date
            };
        });

    sortedLevels.forEach(level => {
        const card = createArchiveLevelCard(level, level.date, type);
        container.appendChild(card);
    });
}


function createArchiveLevelCard(level, date, type) {
    const card = document.createElement('div');
    card.className = 'level-card archive-level-card';
    
    const position = originalOrder.indexOf(level.id) + 1;
    
    card.innerHTML = `
        <div class="level-preview">
            <div class="level-position">${position}</div>
            <img src="" alt="${level.name}" loading="lazy">
        </div>
        <div class="level-info">
            <div class="level-name">${level.name}</div>
            <div class="level-phase">Phase ${level.phase}</div>
            <div class="level-date">${date}</div>
        </div>
    `;

    const img = card.querySelector('img');
    if (level.players?.[0]?.video_link) {
        const videoId = extractYouTubeId(level.players[0].video_link);
        img.src = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` 
                          : '';
    } else {
        img.src = '';
    }

    img.onerror = () => img.src = '';

    card.addEventListener('click', () => {
        window.location.href = `level.html?id=${level.id}`;
    });

    return card;
}

document.querySelectorAll('.archive-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        loadArchiveLevels(type);
    });
});

function createEditButton(level) {
    const editBtn = document.createElement('button');
    editBtn.className = 'level-edit-btn';
    editBtn.innerHTML = '<i class="fas fa-cog"></i>';
    editBtn.title = 'Edit Level';
    editBtn.style.display = 'none';
    
    editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        openLevelDataEditorForLevel(level);
    });
    
    return editBtn;
}

function openLevelDataEditorForLevel(level) {
    const modal = document.getElementById('level-edit-modal');
    const container = document.getElementById('level-select-container');
    
    container.style.display = 'none';
    document.getElementById('level-edit-form').style.display = 'block';
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    loadLevelDataForEditing(level);
}

function shouldRemoveLevel(level) {
    if (!level.players || level.players.length === 0) {
        return true; 
    }

    const hasValidRecord = level.players.some(player => {
        const isBanned = bannedPlayers.includes(player.id);
        const is100Percent = player.progress === 100;
        return !isBanned && is100Percent;
    });

    return !hasValidRecord;
}

async function displayLevels(levelIds) {
    const container = document.getElementById('levels-container');

    if (!allLevels || allLevels.length === 0) {
        allLevels = await loadAllLevels();
    }

    container.innerHTML = '';

    levelIds.forEach((id, index) => {
        const level = allLevels.find(l => l.id === id);
        if (level && !shouldRemoveLevel(level)) {
            container.appendChild(createLevelCard(level, index + 1));
        }
    });
}

function getCachedImage(url) {
    if (!imageCache[url]) {
        imageCache[url] = new Image();
        imageCache[url].src = url;
    }
    return imageCache[url].src;
}

function getPlaceholderUrl() {
    return document.createElement('canvas').toDataURL('image/webp') 
        ? 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAQAAAAfQ//73v/+BiOh/AAA='
        : 'https://via.placeholder.com/300x180/333/666?text=Loading...';
}