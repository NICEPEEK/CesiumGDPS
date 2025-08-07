document.addEventListener('DOMContentLoaded', function() {
    const blitzkriegTab = document.getElementById('blitzkrieg');
    if (!blitzkriegTab) return;
    const startPositionsInput = document.getElementById('start-positions');
    const generateBtn = document.getElementById('generate-btn');
    const stagesContainer = document.getElementById('blitzkrieg-stages');
    const sessionSelect = document.getElementById('session-select');
    const newSessionBtn = document.getElementById('new-session-btn');
    const deleteSessionBtn = document.getElementById('delete-session-btn');

    let sessions = JSON.parse(localStorage.getItem('blitzkriegSessions')) || {};
    let currentSessionId = null;

    function init() {
        updateSessionSelect();
        loadLastSession();
        generateBtn.addEventListener('click', generateBlitzkrieg);
        newSessionBtn.addEventListener('click', createNewSession);
        deleteSessionBtn.addEventListener('click', deleteCurrentSession);
        sessionSelect.addEventListener('change', loadSelectedSession);
    }
    function updateSessionSelect() {
        sessionSelect.innerHTML = '<option value="">Select a session</option>';
        
        Object.keys(sessions).forEach(id => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = sessions[id].name || `Session ${id.slice(0, 4)}`;
            sessionSelect.appendChild(option);
        });
    }
    function createNewSession() {
        const sessionName = prompt('Enter session name:');
        if (!sessionName) return;
        
        const sessionId = 'session-' + Date.now();
        sessions[sessionId] = {
            name: sessionName,
            startPositions: '',
            stages: [],
            completed: {}
        };
        
        saveSessions();
        updateSessionSelect();
        sessionSelect.value = sessionId;
        loadSession(sessionId);
    }
    function deleteCurrentSession() {
        if (!currentSessionId || !confirm('Are you sure you want to delete this session?')) return;
        
        delete sessions[currentSessionId];
        saveSessions();
        updateSessionSelect();
        clearInterface();
        currentSessionId = null;
    }
    function loadLastSession() {
        const lastSessionId = localStorage.getItem('lastBlitzkriegSession');
        if (lastSessionId && sessions[lastSessionId]) {
            sessionSelect.value = lastSessionId;
            loadSession(lastSessionId);
        }
    }
    function loadSelectedSession() {
        const sessionId = sessionSelect.value;
        if (sessionId) {
            loadSession(sessionId);
        } else {
            clearInterface();
            currentSessionId = null;
        }
    }
    function loadSession(sessionId) {
        if (!sessions[sessionId]) return;
        
        const session = sessions[sessionId];
        currentSessionId = sessionId;
        localStorage.setItem('lastBlitzkriegSession', sessionId);
        
        startPositionsInput.value = session.startPositions;
        renderStages(session.stages, session.completed);
    }
    function clearInterface() {
        startPositionsInput.value = '';
        stagesContainer.innerHTML = '';
    }
    function generateBlitzkrieg() {
        if (!currentSessionId) {
            alert('Please select or create a session first');
            return;
        }
        
        const positionsText = startPositionsInput.value.trim();
        if (!positionsText) {
            alert('Please enter start positions');
            return;
        }
        const positions = positionsText.split(',')
            .map(pos => pos.trim())
            .filter(pos => pos)
            .map(pos => {
                const isPractice = (pos.match(/\./g) || []).length;
                const value = parseFloat(pos.replace(/\./g, ''));
                return { value, isPractice };
            });
        
        if (positions.length < 2) {
            alert('You need at least 2 start positions');
            return;
        }
        
        const stages = [];
        const maxOffset = positions.length - 1;
        
        for (let offset = 1; offset < maxOffset; offset++) {
            const stageItems = [];
            
            for (let i = 0; i < positions.length - offset; i++) {
                const from = positions[i];
                const to = positions[i + offset];
                stageItems.push({ from, to });
            }
            
            if (stageItems.length > 0) {
                stages.push({
                    offset,
                    items: stageItems
                });
            }
        }
        
        sessions[currentSessionId].startPositions = positionsText;
        sessions[currentSessionId].stages = stages;
        saveSessions();
        
        renderStages(stages, sessions[currentSessionId].completed);
    }

    function renderStages(stages, completedData) {
        stagesContainer.innerHTML = '';
        
        if (!stages || stages.length === 0) {
            stagesContainer.innerHTML = '<div class="no-stages">Generate Blitzkrieg to see stages</div>';
            return;
        }
        
        stages.forEach((stage, stageIndex) => {
            const stageElement = document.createElement('div');
            stageElement.className = 'stage';
            
            const totalItems = stage.items.length;
            const completedItems = stage.items.filter(item => {
                const key = `${item.from.value}-${item.to.value}`;
                return completedData[key];
            }).length;
            
            stageElement.innerHTML = `
                <div class="stage-header">
                    <div class="stage-title">Stage ${stageIndex + 1}</div>
                    <div class="stage-progress">${completedItems}/${totalItems} completed</div>
                </div>
                <div class="stage-items"></div>
            `;
            
            const itemsContainer = stageElement.querySelector('.stage-items');
            
            stage.items.forEach(item => {
                const key = `${item.from.value}-${item.to.value}`;
                const isCompleted = completedData[key] || false;
                
                const itemElement = document.createElement('div');
                itemElement.className = `stage-item ${isCompleted ? 'completed' : ''}`;
                itemElement.innerHTML = `
                    <span class="stage-item-range">
                        ${item.from.value}${item.from.isPractice ? '.' : ''} → ${item.to.value}${item.to.isPractice ? '.' : ''}
                    </span>
                    <input type="checkbox" class="stage-item-checkbox" ${isCompleted ? 'checked' : ''}
                        data-key="${key}">
                `;
                
                const checkbox = itemElement.querySelector('.stage-item-checkbox');
                checkbox.addEventListener('change', function() {
                    toggleCompleted(key, this.checked);
                });
                
                itemsContainer.appendChild(itemElement);
            });
            
            stagesContainer.appendChild(stageElement);
        });
    }

    function toggleCompleted(key, isCompleted) {
        if (!currentSessionId) return;
        
        if (isCompleted) {
            sessions[currentSessionId].completed[key] = true;
        } else {
            delete sessions[currentSessionId].completed[key];
        }
        
        saveSessions();
        
        document.querySelectorAll(`.stage-item-checkbox[data-key="${key}"]`).forEach(checkbox => {
            const itemElement = checkbox.closest('.stage-item');
            if (itemElement) {
                if (isCompleted) {
                    itemElement.classList.add('completed');
                } else {
                    itemElement.classList.remove('completed');
                }
            }
        });
        
        document.querySelectorAll('.stage').forEach(stageElement => {
            const totalItems = stageElement.querySelectorAll('.stage-item').length;
            const completedItems = stageElement.querySelectorAll('.stage-item.completed').length;
            
            const progressElement = stageElement.querySelector('.stage-progress');
            if (progressElement) {
                progressElement.textContent = `${completedItems}/${totalItems} completed`;
            }
        });
    }

    function saveSessions() {
        localStorage.setItem('blitzkriegSessions', JSON.stringify(sessions));
    }

    init();
});