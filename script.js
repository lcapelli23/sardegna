// Configurazione Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCsXQofrgME-4DLLysQy6Jzz1DPJy6vz3E", // Sostituisci con la tua chiave API se necessario
  authDomain: "tabellone-punteggi.firebaseapp.com",
  databaseURL: "https://tabellone-punteggi-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "tabellone-punteggi",
  storageBucket: "tabellone-punteggi.appspot.com",
  messagingSenderId: "116153541822",
  appId: "1:116153541822:web:a0ac664310378aff7beaef",
};

// Modalità demo per test senza Firebase configurato
const DEMO_MODE = firebaseConfig.apiKey.startsWith("your-api-key" );

// Inizializzazione Firebase
if (!DEMO_MODE) {
    firebase.initializeApp(firebaseConfig);
    var auth = firebase.auth();
    var database = firebase.database();
}

// Variabili globali
let currentUser = null;
let isGameMaster = false;
let games = [];
let players = [];
let scores = {};
const GAME_MASTER_EMAIL = "lollocapelli@gmail.com"; // Email dell'amministratore

// Elementi DOM
const loginScreen = document.getElementById('loginScreen');
const mainScreen = document.getElementById('mainScreen');
const loadingOverlay = document.getElementById('loadingOverlay');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const logoutBtn = document.getElementById('logoutBtn');
const loginTabBtn = document.getElementById('loginTabBtn');
const registerTabBtn = document.getElementById('registerTabBtn');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const registerName = document.getElementById('registerName');
const registerEmail = document.getElementById('registerEmail');
const registerPassword = document.getElementById('registerPassword');
const confirmPassword = document.getElementById('confirmPassword');
const navTabs = document.querySelectorAll('.nav-tab');
const tabContents = document.querySelectorAll('.tab-content');
const userName = document.getElementById('userName');
const userPhoto = document.getElementById('userPhoto');
const userRole = document.getElementById('userRole');
const adminTabBtn = document.getElementById('adminTabBtn');
const leaderboardBody = document.getElementById('leaderboardBody');
const gamesHeader = document.getElementById('gamesHeader');
const totalGames = document.getElementById('totalGames');
const totalPlayers = document.getElementById('totalPlayers');
const resultsContainer = document.getElementById('resultsContainer');
const gameNameInput = document.getElementById('gameNameInput');
const gameSportSelect = document.getElementById('gameSportSelect');
const addGameBtn = document.getElementById('addGameBtn');
const adminGamesList = document.getElementById('adminGamesList');
const editPointsModal = document.getElementById('editPointsModal');
const modalTitle = document.getElementById('modalTitle');
const pointsInput = document.getElementById('pointsInput');
const savePoints = document.getElementById('savePoints');
const cancelEdit = document.getElementById('cancelEdit');
const closeModal = document.getElementById('closeModal');
let editingGameId = null, editingPlayerId = null, editingPlayerName = null;

// Inizializzazione App
document.addEventListener('DOMContentLoaded', initializeApp);

function initializeApp() {
    showLoading();
    if (DEMO_MODE) {
        console.log("Modalità demo attiva");
        hideLoading();
        showLoginScreen();
    } else {
        auth.onAuthStateChanged(user => {
            if (user) {
                currentUser = user;
                checkGameMasterStatus();
                setupRealtimeListeners();
                showMainScreen();
            } else {
                currentUser = null;
                isGameMaster = false;
                showLoginScreen();
                detachRealtimeListeners();
            }
            hideLoading();
        });
    }
    setupEventListeners();
}

function setupEventListeners() {
    loginTabBtn.addEventListener('click', () => switchAuthTab('login'));
    registerTabBtn.addEventListener('click', () => switchAuthTab('register'));
    loginBtn.addEventListener('click', signInWithEmail);
    registerBtn.addEventListener('click', registerWithEmail);
    logoutBtn.addEventListener('click', signOut);
    navTabs.forEach(tab => tab.addEventListener('click', () => switchTab(tab.dataset.tab)));
    addGameBtn.addEventListener('click', addGame);
    closeModal.addEventListener('click', closeEditModal);
    cancelEdit.addEventListener('click', closeEditModal);
    savePoints.addEventListener('click', savePointsEdit);
    editPointsModal.addEventListener('click', (e) => { if (e.target === editPointsModal) closeEditModal(); });
}

// Gestione UI
function showLoginScreen() {
    mainScreen.classList.remove('active');
    loginScreen.classList.add('active');
}

function showMainScreen() {
    loginScreen.classList.remove('active');
    mainScreen.classList.add('active');
    updateUserInfo();
}

function showLoading() { loadingOverlay.classList.add('active'); }
function hideLoading() { loadingOverlay.classList.remove('active'); }

function updateUserInfo() {
    if (!currentUser) return;
    const displayName = currentUser.displayName || currentUser.email.split('@')[0];
    userName.textContent = displayName;
    userPhoto.textContent = getInitials(displayName);
}

// Autenticazione
function switchAuthTab(tab) {
    loginTabBtn.classList.toggle('active', tab === 'login');
    registerTabBtn.classList.toggle('active', tab !== 'login');
    loginForm.classList.toggle('active', tab === 'login');
    registerForm.classList.toggle('active', tab !== 'login');
}

async function signInWithEmail() {
    showLoading();
    try {
        await auth.signInWithEmailAndPassword(loginEmail.value.trim(), loginPassword.value);
    } catch (error) {
        alert('Errore login: ' + error.message);
        hideLoading();
    }
}

async function registerWithEmail() {
    if (registerPassword.value !== confirmPassword.value) return alert('Le password non coincidono.');
    showLoading();
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(registerEmail.value.trim(), registerPassword.value);
        await userCredential.user.updateProfile({ displayName: registerName.value.trim() });
        await addNewPlayerToDatabase(userCredential.user.uid, registerName.value.trim(), userCredential.user.email);
        alert('Registrazione completata! Ora puoi accedere.');
        switchAuthTab('login');
    } catch (error) {
        alert('Errore registrazione: ' + error.message);
    } finally {
        hideLoading();
    }
}

async function signOut() {
    await auth.signOut();
}

function checkGameMasterStatus() {
    isGameMaster = currentUser && currentUser.email === GAME_MASTER_EMAIL;
    userRole.textContent = isGameMaster ? 'Game Master' : 'Giocatore';
    userRole.style.background = isGameMaster ? '#ef4444' : '#10b981';
    adminTabBtn.classList.toggle('show', isGameMaster);
    document.getElementById('adminTab').classList.toggle('admin-only', !isGameMaster);
}

// Dati Realtime
const refs = { games: null, players: null, scores: null };
function setupRealtimeListeners() {
    if (refs.games) return; // Listeners già attivi
    const gamesRef = database.ref('games');
    const playersRef = database.ref('players');
    const scoresRef = database.ref('scores');

    refs.games = gamesRef.on('value', snapshot => { games = formatSnapshot(snapshot); updateAllUI(); });
    refs.players = playersRef.on('value', snapshot => { players = formatSnapshot(snapshot); updateAllUI(); });
    refs.scores = scoresRef.on('value', snapshot => { scores = snapshot.val() || {}; updateAllUI(); });
}

function detachRealtimeListeners() {
    if (refs.games) database.ref('games').off('value', refs.games);
    if (refs.players) database.ref('players').off('value', refs.players);
    if (refs.scores) database.ref('scores').off('value', refs.scores);
    Object.keys(refs).forEach(key => refs[key] = null);
}

function formatSnapshot(snapshot) {
    const data = snapshot.val() || {};
    return Object.keys(data).map(key => ({ id: key, ...data[key] }));
}

function updateAllUI() {
    if (!currentUser) return;
    updateLeaderboard();
    updateResults();
    if (isGameMaster) updateAdminPanel();
    updateStats();
}

// UI Rendering
function switchTab(tabName) {
    navTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.tab === tabName));
    tabContents.forEach(content => content.classList.toggle('active', content.id === `${tabName}Tab`));
}

function updateLeaderboard() {
    const playerTotals = players.map(player => {
        const playerScore = scores[player.id] || {};
        const total = Object.values(playerScore).reduce((sum, game) => sum + (game.points || 0), 0);
        return { ...player, total };
    }).sort((a, b) => b.total - a.total);

    gamesHeader.innerHTML = games.map(game => `<div class="game-column" title="${game.name}">${game.name}</div>`).join('');
    leaderboardBody.innerHTML = playerTotals.map((player, index) => createPlayerRow(player, index + 1)).join('');
}

function createPlayerRow(player, position) {
    const playerScores = scores[player.id] || {};
    const gamesHtml = games.map(game => {
        const score = playerScores[game.id]?.points || 0;
        const editableClass = isGameMaster ? 'editable' : '';
        return `<div class="game-score ${editableClass}" onclick="isGameMaster && openEditModal('${game.id}', '${player.id}', ${score}, '${game.name}', '${player.name}')">${score}</div>`;
    }).join('');

    return `
        <div class="player-row">
            <div class="player-cell"><div class="position-badge position-${position <= 3 ? position : 'other'}">${position}</div></div>
            <div class="player-cell player-info">
                <div class="player-avatar">${getInitials(player.name)}</div>
                <span class="player-name">${player.name}</span>
            </div>
            <div class="player-games">${gamesHtml}</div>
            <div class="player-cell"><span class="total-score">${player.total}</span></div>
        </div>`;
}

function updateResults() {
    resultsContainer.innerHTML = games.map(game => {
        const gameScores = players.map(player => ({
            name: player.name,
            score: scores[player.id]?.[game.id]?.points || 0
        })).sort((a, b) => b.score - a.score);

        return `
            <div class="sport-results">
                <div class="sport-header"><h3>${game.name}</h3></div>
                <div class="leaderboard-table">
                    ${gameScores.map((player, index) => `
                        <div class="player-row" style="grid-template-columns: 50px 1fr 100px;">
                            <div class="player-cell"><div class="position-badge position-${index + 1 <= 3 ? index + 1 : 'other'}">${index + 1}</div></div>
                            <div class="player-cell player-info">${player.name}</div>
                            <div class="player-cell"><span class="total-score">${player.score}</span></div>
                        </div>
                    `).join('')}
                </div>
            </div>`;
    }).join('');
}

function updateAdminPanel() {
    adminGamesList.innerHTML = games.map(game => `
        <div class="admin-game-item">
            <span>${game.name} (${getSportName(game.sport)})</span>
            <button class="btn-danger" onclick="deleteGame('${game.id}')">Elimina</button>
        </div>
    `).join('');
}

function updateStats() {
    totalGames.textContent = games.length;
    totalPlayers.textContent = players.length;
}

// Funzioni Admin
async function addGame() {
    if (!gameNameInput.value) return alert('Inserisci il nome della gara.');
    showLoading();
    try {
        await database.ref('games').push({
            name: gameNameInput.value.trim(),
            sport: gameSportSelect.value,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
        });
        gameNameInput.value = '';
    } catch (error) {
        alert('Errore: ' + error.message);
    } finally {
        hideLoading();
    }
}

async function deleteGame(gameId) {
    if (!confirm('Sei sicuro? Verranno eliminati anche tutti i punteggi associati.')) return;
    showLoading();
    try {
        const updates = { [`/games/${gameId}`]: null };
        Object.keys(scores).forEach(playerId => {
            if (scores[playerId][gameId]) {
                updates[`/scores/${playerId}/${gameId}`] = null;
            }
        });
        await database.ref().update(updates);
    } catch (error) {
        alert('Errore: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Gestione Punti
function openEditModal(gameId, playerId, currentPoints, gameName, playerName) {
    editingGameId = gameId;
    editingPlayerId = playerId;
    editingPlayerName = playerName;
    modalTitle.textContent = `Modifica punti per ${playerName} in ${gameName}`;
    pointsInput.value = currentPoints;
    editPointsModal.classList.add('active');
}

function closeEditModal() {
    editPointsModal.classList.remove('active');
}

async function savePointsEdit() {
    const newPoints = parseInt(pointsInput.value, 10);
    if (isNaN(newPoints)) return alert('Inserisci un valore numerico.');
    showLoading();
    try {
        await database.ref(`scores/${editingPlayerId}/${editingGameId}`).set({
            points: newPoints,
            updatedAt: firebase.database.ServerValue.TIMESTAMP,
        });
        closeEditModal();
    } catch (error) {
        alert('Errore: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Utility
async function addNewPlayerToDatabase(userId, name, email) {
    await database.ref('players/' + userId).set({ name, email, joinedAt: firebase.database.ServerValue.TIMESTAMP });
}

function getInitials(name = '') {
    const words = name.trim().split(/\s+/);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + (words[words.length - 1][0] || '')).toUpperCase();
}

function getSportName(sport) {
    const names = { 'calcio': 'Calcio', 'badminton': 'Badminton', 'freccette': 'Freccette', 'ping-pong': 'Ping Pong', 'tiro-arco': 'Tiro con l\'Arco' };
    return names[sport] || sport;
}
