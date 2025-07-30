// Configurazione Firebase (da sostituire con le tue credenziali)
const firebaseConfig = {
    // Queste sono credenziali di esempio - dovrai sostituirle con le tue
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    databaseURL: "https://your-project-default-rtdb.firebaseio.com/",
    projectId: "your-project",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};

// Variabili globali
let players = {};
let database = null;
let isFirebaseEnabled = false;

// Inizializzazione
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadLocalData();
});

function initializeApp() {
    // Prova a inizializzare Firebase
    try {
        if (typeof firebase !== 'undefined' && firebaseConfig.apiKey !== "your-api-key") {
            firebase.initializeApp(firebaseConfig);
            database = firebase.database();
            isFirebaseEnabled = true;
            console.log('Firebase inizializzato con successo');
            
            // Ascolta i cambiamenti in tempo reale
            database.ref('players').on('value', (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    players = data;
                    renderScoreboard();
                    updateLastUpdateTime();
                }
            });
        } else {
            console.log('Firebase non configurato, uso localStorage');
            isFirebaseEnabled = false;
        }
    } catch (error) {
        console.log('Errore Firebase, uso localStorage:', error);
        isFirebaseEnabled = false;
    }
}

function setupEventListeners() {
    // Bottoni principali
    document.getElementById('addPlayerBtn').addEventListener('click', openAddPlayerModal);
    document.getElementById('resetBtn').addEventListener('click', resetScoreboard);
    
    // Modal aggiungi partecipante
    document.getElementById('addPlayerForm').addEventListener('submit', addPlayer);
    document.getElementById('closeModal').addEventListener('click', closeAddPlayerModal);
    document.getElementById('cancelBtn').addEventListener('click', closeAddPlayerModal);
    
    // Modal modifica punteggio
    document.getElementById('editScoreForm').addEventListener('submit', updateScore);
    document.getElementById('closeEditModal').addEventListener('click', closeEditScoreModal);
    document.getElementById('cancelEditBtn').addEventListener('click', closeEditScoreModal);
    document.getElementById('deletePlayerBtn').addEventListener('click', deletePlayer);
    
    // Overlay modal
    document.getElementById('modalOverlay').addEventListener('click', closeAllModals);
    
    // Escape key per chiudere modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
}

function loadLocalData() {
    if (!isFirebaseEnabled) {
        const savedData = localStorage.getItem('scoreboardData');
        if (savedData) {
            players = JSON.parse(savedData);
            renderScoreboard();
        }
    }
}

function saveLocalData() {
    if (!isFirebaseEnabled) {
        localStorage.setItem('scoreboardData', JSON.stringify(players));
    }
}

function saveToDatabase() {
    if (isFirebaseEnabled && database) {
        database.ref('players').set(players);
    } else {
        saveLocalData();
    }
    updateLastUpdateTime();
}

function openAddPlayerModal() {
    document.getElementById('addPlayerModal').classList.add('active');
    document.getElementById('modalOverlay').classList.add('active');
    document.getElementById('playerName').focus();
}

function closeAddPlayerModal() {
    document.getElementById('addPlayerModal').classList.remove('active');
    document.getElementById('modalOverlay').classList.remove('active');
    document.getElementById('addPlayerForm').reset();
}

function openEditScoreModal(playerId) {
    const player = players[playerId];
    if (!player) return;
    
    document.getElementById('editPlayerName').value = player.name;
    document.getElementById('newScore').value = player.score;
    document.getElementById('editScoreModal').dataset.playerId = playerId;
    
    document.getElementById('editScoreModal').classList.add('active');
    document.getElementById('modalOverlay').classList.add('active');
    document.getElementById('newScore').focus();
}

function closeEditScoreModal() {
    document.getElementById('editScoreModal').classList.remove('active');
    document.getElementById('modalOverlay').classList.remove('active');
    document.getElementById('editScoreForm').reset();
}

function closeAllModals() {
    closeAddPlayerModal();
    closeEditScoreModal();
}

function addPlayer(e) {
    e.preventDefault();
    
    const name = document.getElementById('playerName').value.trim();
    const initialScore = parseInt(document.getElementById('initialScore').value) || 0;
    
    if (!name) {
        alert('Inserisci un nome valido');
        return;
    }
    
    // Controlla se il nome esiste già
    const existingPlayer = Object.values(players).find(p => p.name.toLowerCase() === name.toLowerCase());
    if (existingPlayer) {
        alert('Un partecipante con questo nome esiste già');
        return;
    }
    
    const playerId = generateId();
    players[playerId] = {
        id: playerId,
        name: name,
        score: initialScore,
        createdAt: Date.now()
    };
    
    saveToDatabase();
    renderScoreboard();
    closeAddPlayerModal();
    
    // Mostra notifica
    showNotification(`${name} aggiunto con successo!`, 'success');
}

function updateScore(e) {
    e.preventDefault();
    
    const playerId = document.getElementById('editScoreModal').dataset.playerId;
    const newScore = parseInt(document.getElementById('newScore').value);
    
    if (!players[playerId]) return;
    
    const oldScore = players[playerId].score;
    players[playerId].score = newScore;
    players[playerId].updatedAt = Date.now();
    
    saveToDatabase();
    renderScoreboard();
    closeEditScoreModal();
    
    // Mostra notifica
    const playerName = players[playerId].name;
    showNotification(`Punteggio di ${playerName} aggiornato: ${oldScore} → ${newScore}`, 'success');
}

function deletePlayer() {
    const playerId = document.getElementById('editScoreModal').dataset.playerId;
    
    if (!players[playerId]) return;
    
    const playerName = players[playerId].name;
    
    if (confirm(`Sei sicuro di voler eliminare ${playerName}?`)) {
        delete players[playerId];
        saveToDatabase();
        renderScoreboard();
        closeEditScoreModal();
        
        showNotification(`${playerName} eliminato`, 'success');
    }
}

function resetScoreboard() {
    if (Object.keys(players).length === 0) {
        showNotification('Nessun dato da cancellare', 'warning');
        return;
    }
    
    if (confirm('Sei sicuro di voler cancellare tutti i dati? Questa azione non può essere annullata.')) {
        players = {};
        saveToDatabase();
        renderScoreboard();
        showNotification('Tabellone resettato', 'success');
    }
}

function renderScoreboard() {
    const scoreboard = document.getElementById('scoreboard');
    const emptyState = document.getElementById('emptyState');
    
    if (Object.keys(players).length === 0) {
        scoreboard.style.display = 'none';
        emptyState.style.display = 'flex';
        return;
    }
    
    scoreboard.style.display = 'grid';
    emptyState.style.display = 'none';
    
    // Ordina i giocatori per punteggio (decrescente)
    const sortedPlayers = Object.values(players).sort((a, b) => b.score - a.score);
    
    scoreboard.innerHTML = sortedPlayers.map((player, index) => {
        const rank = index + 1;
        const rankClass = rank <= 3 ? `rank-${rank}` : '';
        
        return `
            <div class="player-card ${rankClass}" data-player-id="${player.id}">
                <div class="status-indicator"></div>
                <div class="player-header">
                    <div class="player-info">
                        <h3>${escapeHtml(player.name)}</h3>
                    </div>
                    <div class="player-rank ${rankClass}">
                        ${getRankText(rank)}
                    </div>
                </div>
                <div class="player-score">${player.score}</div>
                <div class="player-actions">
                    <button class="btn btn-primary btn-small" onclick="adjustScore('${player.id}', 1)">
                        <i class="fas fa-plus"></i>
                        +1
                    </button>
                    <button class="btn btn-secondary btn-small" onclick="adjustScore('${player.id}', -1)">
                        <i class="fas fa-minus"></i>
                        -1
                    </button>
                    <button class="btn btn-secondary btn-small" onclick="openEditScoreModal('${player.id}')">
                        <i class="fas fa-edit"></i>
                        Modifica
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function adjustScore(playerId, adjustment) {
    if (!players[playerId]) return;
    
    const oldScore = players[playerId].score;
    const newScore = Math.max(0, oldScore + adjustment);
    
    players[playerId].score = newScore;
    players[playerId].updatedAt = Date.now();
    
    saveToDatabase();
    renderScoreboard();
    
    // Mostra notifica per cambiamenti significativi
    if (adjustment !== 0) {
        const playerName = players[playerId].name;
        showNotification(`${playerName}: ${oldScore} → ${newScore}`, 'info');
    }
}

function getRankText(rank) {
    switch(rank) {
        case 1: return '🥇 1°';
        case 2: return '🥈 2°';
        case 3: return '🥉 3°';
        default: return `${rank}°`;
    }
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function updateLastUpdateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('it-IT');
    document.getElementById('lastUpdate').textContent = timeString;
}

function showNotification(message, type = 'info') {
    // Crea elemento notifica
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${getNotificationIcon(type)}"></i>
        <span>${message}</span>
    `;
    
    // Aggiungi stili se non esistono
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 16px;
                border-radius: 8px;
                color: white;
                font-weight: 500;
                z-index: 10000;
                display: flex;
                align-items: center;
                gap: 8px;
                animation: slideInRight 0.3s ease-out;
                max-width: 300px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }
            .notification-success { background: #10b981; }
            .notification-error { background: #ef4444; }
            .notification-warning { background: #f59e0b; }
            .notification-info { background: #3b82f6; }
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Rimuovi dopo 3 secondi
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

function getNotificationIcon(type) {
    switch(type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        case 'info': return 'info-circle';
        default: return 'info-circle';
    }
}

// Funzioni di utilità per il debug
window.debugScoreboard = {
    getPlayers: () => players,
    addTestPlayers: () => {
        const testPlayers = [
            { name: 'Mario', score: 15 },
            { name: 'Luigi', score: 12 },
            { name: 'Peach', score: 18 },
            { name: 'Bowser', score: 8 }
        ];
        
        testPlayers.forEach(player => {
            const id = generateId();
            players[id] = {
                id: id,
                name: player.name,
                score: player.score,
                createdAt: Date.now()
            };
        });
        
        saveToDatabase();
        renderScoreboard();
        showNotification('Giocatori di test aggiunti!', 'success');
    },
    clearAll: () => {
        players = {};
        saveToDatabase();
        renderScoreboard();
        showNotification('Tutti i dati cancellati!', 'success');
    }
};

// Inizializza l'ultimo aggiornamento
updateLastUpdateTime();

