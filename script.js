// Configurazione Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCsXQofrgME-4DLLysQy6Jzz1DPJy6vz3E",
  authDomain: "tabellone-punteggi.firebaseapp.com",
  databaseURL: "https://tabellone-punteggi-default-rtdb.europe-west1.firebasedatabase.app/",
  projectId: "tabellone-punteggi",
  storageBucket: "tabellone-punteggi.firebasestorage.app",
  messagingSenderId: "116153541822",
  appId: "1:116153541822:web:a0ac664310378aff7beaef",
  measurementId: "G-7F983TVLWF"
};

// Variabili globali
let sports = {};
let players = {};
let scores = {};
let winners = {};
let database = null;
let isFirebaseEnabled = false;
let currentSport = 'all';
let isDarkTheme = false;

// Inizializzazione
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadLocalData();
    updateStats();
    renderAll();
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
            database.ref('sports').on('value', (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    sports = data;
                    renderSportsNav();
                    updateStats();
                }
            });
            
            database.ref('players').on('value', (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    players = data;
                    updateStats();
                }
            });
            
            database.ref('scores').on('value', (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    scores = data;
                    renderScoreboard();
                    updateStats();
                }
            });
            
            database.ref('winners').on('value', (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    winners = data;
                    renderWinners();
                    updateStats();
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
    document.getElementById('addSportBtn').addEventListener('click', openAddSportModal);
    document.getElementById('quickAddSport').addEventListener('click', openAddSportModal);
    document.getElementById('addPlayerBtn').addEventListener('click', openAddPlayerModal);
    document.getElementById('resetBtn').addEventListener('click', resetAll);
    document.getElementById('declareWinnerBtn').addEventListener('click', openDeclareWinnerModal);
    document.getElementById('newMatchBtn').addEventListener('click', startNewMatch);
    
    // Modal sport
    document.getElementById('addSportForm').addEventListener('submit', addSport);
    document.getElementById('closeSportModal').addEventListener('click', closeAddSportModal);
    document.getElementById('cancelSportBtn').addEventListener('click', closeAddSportModal);
    
    // Modal partecipante
    document.getElementById('addPlayerForm').addEventListener('submit', addPlayer);
    document.getElementById('closePlayerModal').addEventListener('click', closeAddPlayerModal);
    document.getElementById('cancelPlayerBtn').addEventListener('click', closeAddPlayerModal);
    
    // Modal modifica punteggio
    document.getElementById('editScoreForm').addEventListener('submit', updateScore);
    document.getElementById('closeEditModal').addEventListener('click', closeEditScoreModal);
    document.getElementById('cancelEditBtn').addEventListener('click', closeEditScoreModal);
    document.getElementById('deleteScoreBtn').addEventListener('click', deleteScore);
    
    // Modal vincitore
    document.getElementById('declareWinnerForm').addEventListener('submit', declareWinner);
    document.getElementById('closeWinnerModal').addEventListener('click', closeDeclareWinnerModal);
    document.getElementById('cancelWinnerBtn').addEventListener('click', closeDeclareWinnerModal);
    
    // Selettore icone
    document.querySelectorAll('.icon-option').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            document.querySelectorAll('.icon-option').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            document.getElementById('selectedIcon').value = this.dataset.icon;
        });
    });
    
    // Overlay modal
    document.getElementById('modalOverlay').addEventListener('click', closeAllModals);
    
    // Tema e schermo intero
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.getElementById('fullscreenBtn').addEventListener('click', toggleFullscreen);
    
    // Escape key per chiudere modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
}

function loadLocalData() {
    if (!isFirebaseEnabled) {
        const savedData = localStorage.getItem('scoreboardDataV2');
        if (savedData) {
            const data = JSON.parse(savedData);
            sports = data.sports || {};
            players = data.players || {};
            scores = data.scores || {};
            winners = data.winners || {};
        }
    }
}

function saveLocalData() {
    if (!isFirebaseEnabled) {
        const data = { sports, players, scores, winners };
        localStorage.setItem('scoreboardDataV2', JSON.stringify(data));
    }
}

function saveToDatabase() {
    if (isFirebaseEnabled && database) {
        database.ref('sports').set(sports);
        database.ref('players').set(players);
        database.ref('scores').set(scores);
        database.ref('winners').set(winners);
    } else {
        saveLocalData();
    }
    updateLastUpdateTime();
}

// Gestione Sport
function openAddSportModal() {
    document.getElementById('addSportModal').classList.add('active');
    document.getElementById('modalOverlay').classList.add('active');
    document.getElementById('sportName').focus();
}

function closeAddSportModal() {
    document.getElementById('addSportModal').classList.remove('active');
    document.getElementById('modalOverlay').classList.remove('active');
    document.getElementById('addSportForm').reset();
    // Reset icona selezionata
    document.querySelectorAll('.icon-option').forEach(b => b.classList.remove('active'));
    document.querySelector('.icon-option[data-icon="fa-futbol"]').classList.add('active');
    document.getElementById('selectedIcon').value = 'fa-futbol';
}

function addSport(e) {
    e.preventDefault();
    
    const name = document.getElementById('sportName').value.trim();
    const icon = document.getElementById('selectedIcon').value;
    
    if (!name) {
        showNotification('Inserisci un nome valido per lo sport', 'error');
        return;
    }
    
    // Controlla se lo sport esiste già
    const existingSport = Object.values(sports).find(s => s.name.toLowerCase() === name.toLowerCase());
    if (existingSport) {
        showNotification('Uno sport con questo nome esiste già', 'error');
        return;
    }
    
    const sportId = generateId();
    sports[sportId] = {
        id: sportId,
        name: name,
        icon: icon,
        createdAt: Date.now()
    };
    
    saveToDatabase();
    renderSportsNav();
    updateStats();
    closeAddSportModal();
    
    showNotification(`Sport "${name}" aggiunto con successo!`, 'success');
}

function renderSportsNav() {
    const navScroll = document.querySelector('.nav-scroll');
    const sportsHtml = Object.values(sports).map(sport => `
        <button class="sport-tab" data-sport="${sport.id}">
            <i class="fas ${sport.icon}"></i>
            <span>${escapeHtml(sport.name)}</span>
        </button>
    `).join('');
    
    // Mantieni il tab "Tutti gli Sport"
    navScroll.innerHTML = `
        <button class="sport-tab ${currentSport === 'all' ? 'active' : ''}" data-sport="all">
            <i class="fas fa-list"></i>
            <span>Tutti gli Sport</span>
        </button>
        ${sportsHtml}
    `;
    
    // Aggiungi event listeners ai tab
    document.querySelectorAll('.sport-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            currentSport = this.dataset.sport;
            document.querySelectorAll('.sport-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            renderScoreboard();
            updateScoreboardTitle();
        });
    });
    
    // Attiva il tab corrente
    const currentTab = document.querySelector(`[data-sport="${currentSport}"]`);
    if (currentTab) {
        currentTab.classList.add('active');
    }
}

// Gestione Partecipanti
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

function addPlayer(e) {
    e.preventDefault();
    
    const name = document.getElementById('playerName').value.trim();
    
    if (!name) {
        showNotification('Inserisci un nome valido', 'error');
        return;
    }
    
    // Controlla se il partecipante esiste già
    const existingPlayer = Object.values(players).find(p => p.name.toLowerCase() === name.toLowerCase());
    if (existingPlayer) {
        showNotification('Un partecipante con questo nome esiste già', 'error');
        return;
    }
    
    const playerId = generateId();
    players[playerId] = {
        id: playerId,
        name: name,
        createdAt: Date.now()
    };
    
    saveToDatabase();
    updateStats();
    renderScoreboard();
    closeAddPlayerModal();
    
    showNotification(`${name} aggiunto con successo!`, 'success');
}

// Gestione Punteggi
function addScore(playerId, sportId, initialScore = 0) {
    const scoreId = generateId();
    scores[scoreId] = {
        id: scoreId,
        playerId: playerId,
        sportId: sportId,
        score: initialScore,
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
    
    saveToDatabase();
    renderScoreboard();
    updateStats();
}

function openEditScoreModal(scoreId) {
    const score = scores[scoreId];
    if (!score) return;
    
    const player = players[score.playerId];
    const sport = sports[score.sportId];
    
    if (!player || !sport) return;
    
    document.getElementById('editPlayerName').value = player.name;
    document.getElementById('editSportName').value = sport.name;
    document.getElementById('newScore').value = score.score;
    document.getElementById('editScoreModal').dataset.scoreId = scoreId;
    
    document.getElementById('editScoreModal').classList.add('active');
    document.getElementById('modalOverlay').classList.add('active');
    document.getElementById('newScore').focus();
}

function closeEditScoreModal() {
    document.getElementById('editScoreModal').classList.remove('active');
    document.getElementById('modalOverlay').classList.remove('active');
    document.getElementById('editScoreForm').reset();
}

function updateScore(e) {
    e.preventDefault();
    
    const scoreId = document.getElementById('editScoreModal').dataset.scoreId;
    const newScore = parseInt(document.getElementById('newScore').value);
    
    if (!scores[scoreId]) return;
    
    const oldScore = scores[scoreId].score;
    scores[scoreId].score = newScore;
    scores[scoreId].updatedAt = Date.now();
    
    saveToDatabase();
    renderScoreboard();
    updateStats();
    closeEditScoreModal();
    
    const player = players[scores[scoreId].playerId];
    showNotification(`Punteggio di ${player.name} aggiornato: ${oldScore} → ${newScore}`, 'success');
}

function deleteScore() {
    const scoreId = document.getElementById('editScoreModal').dataset.scoreId;
    
    if (!scores[scoreId]) return;
    
    const score = scores[scoreId];
    const player = players[score.playerId];
    
    if (confirm(`Sei sicuro di voler eliminare il punteggio di ${player.name}?`)) {
        delete scores[scoreId];
        saveToDatabase();
        renderScoreboard();
        updateStats();
        closeEditScoreModal();
        
        showNotification(`Punteggio di ${player.name} eliminato`, 'success');
    }
}

function adjustScore(scoreId, adjustment) {
    if (!scores[scoreId]) return;
    
    const oldScore = scores[scoreId].score;
    const newScore = Math.max(0, oldScore + adjustment);
    
    scores[scoreId].score = newScore;
    scores[scoreId].updatedAt = Date.now();
    
    saveToDatabase();
    renderScoreboard();
    updateStats();
    
    if (adjustment !== 0) {
        const player = players[scores[scoreId].playerId];
        showNotification(`${player.name}: ${oldScore} → ${newScore}`, 'info');
    }
}

// Gestione Vincitori
function openDeclareWinnerModal() {
    const winnerPlayerSelect = document.getElementById('winnerPlayer');
    const winnerSportSelect = document.getElementById('winnerSport');
    
    // Popola select partecipanti
    winnerPlayerSelect.innerHTML = '<option value="">Seleziona il vincitore...</option>';
    Object.values(players).forEach(player => {
        winnerPlayerSelect.innerHTML += `<option value="${player.id}">${escapeHtml(player.name)}</option>`;
    });
    
    // Popola select sport
    winnerSportSelect.innerHTML = '<option value="">Seleziona lo sport...</option>';
    Object.values(sports).forEach(sport => {
        winnerSportSelect.innerHTML += `<option value="${sport.id}">${escapeHtml(sport.name)}</option>`;
    });
    
    // Pre-seleziona lo sport corrente se non è "all"
    if (currentSport !== 'all') {
        winnerSportSelect.value = currentSport;
    }
    
    document.getElementById('declareWinnerModal').classList.add('active');
    document.getElementById('modalOverlay').classList.add('active');
}

function closeDeclareWinnerModal() {
    document.getElementById('declareWinnerModal').classList.remove('active');
    document.getElementById('modalOverlay').classList.remove('active');
    document.getElementById('declareWinnerForm').reset();
}

function declareWinner(e) {
    e.preventDefault();
    
    const playerId = document.getElementById('winnerPlayer').value;
    const sportId = document.getElementById('winnerSport').value;
    const notes = document.getElementById('winnerNotes').value.trim();
    
    if (!playerId || !sportId) {
        showNotification('Seleziona sia il vincitore che lo sport', 'error');
        return;
    }
    
    const winnerId = generateId();
    const today = new Date().toISOString().split('T')[0];
    
    winners[winnerId] = {
        id: winnerId,
        playerId: playerId,
        sportId: sportId,
        date: today,
        notes: notes,
        createdAt: Date.now()
    };
    
    saveToDatabase();
    renderWinners();
    updateStats();
    closeDeclareWinnerModal();
    
    const player = players[playerId];
    const sport = sports[sportId];
    showNotification(`${player.name} dichiarato vincitore di ${sport.name}!`, 'success');
}

function startNewMatch() {
    if (confirm('Sei sicuro di voler iniziare una nuova partita? Tutti i punteggi verranno azzerati.')) {
        // Azzera solo i punteggi, mantieni sport, partecipanti e vincitori
        Object.keys(scores).forEach(scoreId => {
            scores[scoreId].score = 0;
            scores[scoreId].updatedAt = Date.now();
        });
        
        saveToDatabase();
        renderScoreboard();
        updateStats();
        
        showNotification('Nuova partita iniziata! Punteggi azzerati.', 'success');
    }
}

// Rendering
function renderScoreboard() {
    const scoreboard = document.getElementById('scoreboard');
    const emptyState = document.getElementById('emptyState');
    
    // Filtra i punteggi per lo sport corrente
    let filteredScores = Object.values(scores);
    if (currentSport !== 'all') {
        filteredScores = filteredScores.filter(score => score.sportId === currentSport);
    }
    
    if (filteredScores.length === 0) {
        scoreboard.style.display = 'none';
        emptyState.style.display = 'flex';
        document.getElementById('declareWinnerBtn').style.display = 'none';
        document.getElementById('newMatchBtn').style.display = 'none';
        return;
    }
    
    scoreboard.style.display = 'grid';
    emptyState.style.display = 'none';
    document.getElementById('declareWinnerBtn').style.display = 'inline-flex';
    document.getElementById('newMatchBtn').style.display = 'inline-flex';
    
    // Ordina per punteggio (decrescente)
    filteredScores.sort((a, b) => b.score - a.score);
    
    scoreboard.innerHTML = filteredScores.map((score, index) => {
        const rank = index + 1;
        const rankClass = rank <= 3 ? `rank-${rank}` : '';
        const player = players[score.playerId];
        const sport = sports[score.sportId];
        
        if (!player || !sport) return '';
        
        return `
            <div class="player-card ${rankClass} fade-in" data-score-id="${score.id}">
                <div class="player-header">
                    <div class="player-info">
                        <h3>${escapeHtml(player.name)}</h3>
                        <div class="player-sport">
                            <i class="fas ${sport.icon}"></i>
                            <span>${escapeHtml(sport.name)}</span>
                        </div>
                    </div>
                    <div class="player-rank ${rankClass}">
                        ${getRankText(rank)}
                    </div>
                </div>
                <div class="player-score">${score.score}</div>
                <div class="player-actions">
                    <button class="btn btn-success btn-small" onclick="adjustScore('${score.id}', 1)">
                        <i class="fas fa-plus"></i>
                        +1
                    </button>
                    <button class="btn btn-secondary btn-small" onclick="adjustScore('${score.id}', -1)">
                        <i class="fas fa-minus"></i>
                        -1
                    </button>
                    <button class="btn btn-outline btn-small" onclick="openEditScoreModal('${score.id}')">
                        <i class="fas fa-edit"></i>
                        Modifica
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function renderWinners() {
    const winnersSection = document.getElementById('winnersSection');
    const winnersGrid = document.getElementById('winnersGrid');
    
    const winnersList = Object.values(winners);
    
    if (winnersList.length === 0) {
        winnersSection.style.display = 'none';
        return;
    }
    
    winnersSection.style.display = 'block';
    
    // Ordina per data (più recenti prima)
    winnersList.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    winnersGrid.innerHTML = winnersList.map(winner => {
        const player = players[winner.playerId];
        const sport = sports[winner.sportId];
        
        if (!player || !sport) return '';
        
        const formattedDate = new Date(winner.date).toLocaleDateString('it-IT', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        return `
            <div class="winner-card fade-in">
                <div class="winner-header">
                    <div class="winner-crown">
                        <i class="fas fa-crown"></i>
                    </div>
                    <div class="winner-info">
                        <h3>${escapeHtml(player.name)}</h3>
                        <div class="winner-sport">
                            <i class="fas ${sport.icon}"></i>
                            <span>${escapeHtml(sport.name)}</span>
                        </div>
                    </div>
                </div>
                <div class="winner-date">${formattedDate}</div>
                ${winner.notes ? `<div class="winner-notes">${escapeHtml(winner.notes)}</div>` : ''}
            </div>
        `;
    }).join('');
}

function updateStats() {
    document.getElementById('totalSports').textContent = Object.keys(sports).length;
    document.getElementById('totalPlayers').textContent = Object.keys(players).length;
    document.getElementById('totalWinners').textContent = Object.keys(winners).length;
    document.getElementById('totalMatches').textContent = Object.keys(scores).length;
}

function updateScoreboardTitle() {
    const title = document.getElementById('scoreboardTitle');
    if (currentSport === 'all') {
        title.innerHTML = '<i class="fas fa-medal"></i> Classifica Generale';
    } else {
        const sport = sports[currentSport];
        if (sport) {
            title.innerHTML = `<i class="fas ${sport.icon}"></i> Classifica ${escapeHtml(sport.name)}`;
        }
    }
}

function renderAll() {
    renderSportsNav();
    renderScoreboard();
    renderWinners();
    updateScoreboardTitle();
}

// Utility functions
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

// Modal management
function closeAllModals() {
    closeAddSportModal();
    closeAddPlayerModal();
    closeEditScoreModal();
    closeDeclareWinnerModal();
}

// Theme toggle
function toggleTheme() {
    isDarkTheme = !isDarkTheme;
    document.body.setAttribute('data-theme', isDarkTheme ? 'dark' : 'light');
    const icon = document.querySelector('#themeToggle i');
    icon.className = isDarkTheme ? 'fas fa-sun' : 'fas fa-moon';
    
    localStorage.setItem('theme', isDarkTheme ? 'dark' : 'light');
}

// Fullscreen toggle
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
        document.querySelector('#fullscreenBtn i').className = 'fas fa-compress';
    } else {
        document.exitFullscreen();
        document.querySelector('#fullscreenBtn i').className = 'fas fa-expand';
    }
}

// Reset completo
function resetAll() {
    if (confirm('Sei sicuro di voler cancellare tutti i dati? Questa azione non può essere annullata.')) {
        sports = {};
        players = {};
        scores = {};
        winners = {};
        currentSport = 'all';
        
        saveToDatabase();
        renderAll();
        updateStats();
        
        showNotification('Tutti i dati sono stati cancellati', 'success');
    }
}

// Notifiche
function showNotification(message, type = 'info') {
    // Rimuovi notifiche esistenti
    document.querySelectorAll('.notification').forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${getNotificationIcon(type)}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Rimuovi dopo 4 secondi
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 4000);
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

// Auto-creazione punteggi quando si aggiunge un partecipante
function createScoresForNewPlayer(playerId) {
    Object.keys(sports).forEach(sportId => {
        addScore(playerId, sportId, 0);
    });
}

// Auto-creazione punteggi quando si aggiunge uno sport
function createScoresForNewSport(sportId) {
    Object.keys(players).forEach(playerId => {
        addScore(playerId, sportId, 0);
    });
}

// Modifica le funzioni addPlayer e addSport per auto-creare i punteggi
const originalAddPlayer = addPlayer;
addPlayer = function(e) {
    e.preventDefault();
    
    const name = document.getElementById('playerName').value.trim();
    
    if (!name) {
        showNotification('Inserisci un nome valido', 'error');
        return;
    }
    
    const existingPlayer = Object.values(players).find(p => p.name.toLowerCase() === name.toLowerCase());
    if (existingPlayer) {
        showNotification('Un partecipante con questo nome esiste già', 'error');
        return;
    }
    
    const playerId = generateId();
    players[playerId] = {
        id: playerId,
        name: name,
        createdAt: Date.now()
    };
    
    // Crea punteggi per tutti gli sport esistenti
    createScoresForNewPlayer(playerId);
    
    saveToDatabase();
    updateStats();
    renderScoreboard();
    closeAddPlayerModal();
    
    showNotification(`${name} aggiunto con successo!`, 'success');
};

const originalAddSport = addSport;
addSport = function(e) {
    e.preventDefault();
    
    const name = document.getElementById('sportName').value.trim();
    const icon = document.getElementById('selectedIcon').value;
    
    if (!name) {
        showNotification('Inserisci un nome valido per lo sport', 'error');
        return;
    }
    
    const existingSport = Object.values(sports).find(s => s.name.toLowerCase() === name.toLowerCase());
    if (existingSport) {
        showNotification('Uno sport con questo nome esiste già', 'error');
        return;
    }
    
    const sportId = generateId();
    sports[sportId] = {
        id: sportId,
        name: name,
        icon: icon,
        createdAt: Date.now()
    };
    
    // Crea punteggi per tutti i partecipanti esistenti
    createScoresForNewSport(sportId);
    
    saveToDatabase();
    renderSportsNav();
    renderScoreboard();
    updateStats();
    closeAddSportModal();
    
    showNotification(`Sport "${name}" aggiunto con successo!`, 'success');
};

// Carica tema salvato
document.addEventListener('DOMContentLoaded', function() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        toggleTheme();
    }
});

// Debug utilities
window.debugScoreboardV2 = {
    getData: () => ({ sports, players, scores, winners }),
    addTestData: () => {
        // Aggiungi sport di test
        const testSports = [
            { name: 'Calcio', icon: 'fa-futbol' },
            { name: 'Basket', icon: 'fa-basketball-ball' },
            { name: 'Tennis', icon: 'fa-table-tennis' }
        ];
        
        testSports.forEach(sport => {
            const sportId = generateId();
            sports[sportId] = {
                id: sportId,
                name: sport.name,
                icon: sport.icon,
                createdAt: Date.now()
            };
        });
        
        // Aggiungi partecipanti di test
        const testPlayers = ['Mario', 'Luigi', 'Peach', 'Bowser'];
        testPlayers.forEach(name => {
            const playerId = generateId();
            players[playerId] = {
                id: playerId,
                name: name,
                createdAt: Date.now()
            };
        });
        
        // Crea punteggi casuali
        Object.keys(players).forEach(playerId => {
            Object.keys(sports).forEach(sportId => {
                const scoreId = generateId();
                scores[scoreId] = {
                    id: scoreId,
                    playerId: playerId,
                    sportId: sportId,
                    score: Math.floor(Math.random() * 20),
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                };
            });
        });
        
        saveToDatabase();
        renderAll();
        updateStats();
        showNotification('Dati di test aggiunti!', 'success');
    },
    clearAll: () => {
        resetAll();
    }
};

// Inizializza l'ultimo aggiornamento
updateLastUpdateTime();

