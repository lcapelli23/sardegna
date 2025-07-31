// Configurazione Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCsXQofrgME-4DLLysQy6Jzz1DPJy6vz3E",
  authDomain: "tabellone-punteggi.firebaseapp.com",
  databaseURL: "https://tabellone-punteggi-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "tabellone-punteggi",
  storageBucket: "tabellone-punteggi.firebasestorage.app",
  messagingSenderId: "116153541822",
  appId: "1:116153541822:web:a0ac664310378aff7beaef",
  measurementId: "G-7F983TVLWF"
};

// Modalità demo per test senza Firebase configurato
const DEMO_MODE = firebaseConfig.apiKey === "your-api-key";

// Inizializzazione Firebase
if (!DEMO_MODE) {
    firebase.initializeApp(firebaseConfig);
    var auth = firebase.auth();
    var database = firebase.database(); // Realtime Database invece di Firestore
} else {
    console.log("Modalità demo attiva - Firebase non configurato");
}

// Variabili globali
let currentUser = null;
let isGameMaster = false;
let games = [];
let players = [];
let scores = {};

// Email del Game Master (da configurare)
const GAME_MASTER_EMAIL = "lollocapelli@gmail.com"; // Sostituire con l'email del game master

// Elementi DOM
const loginScreen = document.getElementById('loginScreen');
const mainScreen = document.getElementById('mainScreen');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const logoutBtn = document.getElementById('logoutBtn');
const loadingOverlay = document.getElementById('loadingOverlay');

// Auth tabs e forms
const loginTabBtn = document.getElementById('loginTabBtn');
const registerTabBtn = document.getElementById('registerTabBtn');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

// Login form elements
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');

// Register form elements
const registerName = document.getElementById('registerName');
const registerEmail = document.getElementById('registerEmail');
const registerPassword = document.getElementById('registerPassword');
const confirmPassword = document.getElementById('confirmPassword');

// Tabs
const navTabs = document.querySelectorAll('.nav-tab');
const tabContents = document.querySelectorAll('.tab-content');

// User info
const userName = document.getElementById('userName');
const userPhoto = document.getElementById('userPhoto');
const userRole = document.getElementById('userRole');
const adminTab = document.getElementById('adminTab');

// Leaderboard
const leaderboardBody = document.getElementById('leaderboardBody');
const gamesHeader = document.getElementById('gamesHeader');
const totalGames = document.getElementById('totalGames');
const totalPlayers = document.getElementById('totalPlayers');

// User games
const userGamesGrid = document.getElementById('userGamesGrid');

// Admin
const gameNameInput = document.getElementById('gameNameInput');
const gameSportSelect = document.getElementById('gameSportSelect');
const addGameBtn = document.getElementById('addGameBtn');
const adminGamesList = document.getElementById('adminGamesList');
const pointsManagement = document.getElementById('pointsManagement');

// Modal
const editPointsModal = document.getElementById('editPointsModal');
const modalTitle = document.getElementById('modalTitle');
const pointsInput = document.getElementById('pointsInput');
const savePoints = document.getElementById('savePoints');
const cancelEdit = document.getElementById('cancelEdit');
const closeModal = document.getElementById('closeModal');

// Variabili per editing
let editingGameId = null;
let editingPlayerId = null;

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Inizializzazione app
function initializeApp() {
    showLoading();
    
    if (DEMO_MODE) {
        // In modalità demo, simula l'autenticazione
        console.log("Modalità demo: autenticazione simulata");
        hideLoading();
        showLoginScreen();
    } else {
        // Listener per stato autenticazione
        auth.onAuthStateChanged(user => {
            if (user) {
                currentUser = user;
                checkGameMasterStatus();
                showMainScreen();
                loadData();
            } else {
                currentUser = null;
                isGameMaster = false;
                showLoginScreen();
            }
            hideLoading();
        });
    }
    
    // Event listeners
    setupEventListeners();
}

function setupEventListeners() {
    // Auth tabs
    if (loginTabBtn) loginTabBtn.addEventListener('click', () => switchAuthTab('login'));
    if (registerTabBtn) registerTabBtn.addEventListener('click', () => switchAuthTab('register'));
    
    // Login/Register/Logout
    if (loginBtn) loginBtn.addEventListener('click', signInWithEmail);
    if (registerBtn) registerBtn.addEventListener('click', registerWithEmail);
    if (logoutBtn) logoutBtn.addEventListener('click', signOut);
    
    // Enter key support for forms
    if (loginForm) {
        loginForm.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') signInWithEmail();
        });
    }
    
    if (registerForm) {
        registerForm.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') registerWithEmail();
        });
    }
    
    // Navigation tabs
    if (navTabs) {
        navTabs.forEach(tab => {
            tab.addEventListener('click', () => switchTab(tab.dataset.tab));
        });
    }
    
    // Admin
    if (addGameBtn) addGameBtn.addEventListener('click', addGame);
    
    // Modal
    if (closeModal) closeModal.addEventListener('click', closeEditModal);
    if (cancelEdit) cancelEdit.addEventListener('click', closeEditModal);
    if (savePoints) savePoints.addEventListener('click', savePointsEdit);
    
    // Click outside modal to close
    if (editPointsModal) {
        editPointsModal.addEventListener('click', (e) => {
            if (e.target === editPointsModal) {
                closeEditModal();
            }
        });
    }
}

// Autenticazione
function switchAuthTab(tab) {
    if (tab === 'login') {
        loginTabBtn.classList.add('active');
        registerTabBtn.classList.remove('active');
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
    } else {
        registerTabBtn.classList.add('active');
        loginTabBtn.classList.remove('active');
        registerForm.classList.add('active');
        loginForm.classList.remove('active');
    }
}

async function signInWithEmail() {
    const email = loginEmail.value.trim();
    const password = loginPassword.value;
    
    if (!email || !password) {
        alert('Inserisci email e password');
        return;
    }
    
    try {
        showLoading();
        
        if (DEMO_MODE) {
            // Modalità demo: simula l'autenticazione
            setTimeout(() => {
                currentUser = {
                    email: email,
                    displayName: email.split('@')[0],
                    photoURL: null,
                    uid: 'demo-user-' + Date.now()
                };
                
                checkGameMasterStatus();
                showMainScreen();
                loadDemoData();
                
                // Reset form
                loginEmail.value = '';
                loginPassword.value = '';
                hideLoading();
            }, 1000);
        } else {
            await auth.signInWithEmailAndPassword(email, password);
            // Reset form
            loginEmail.value = '';
            loginPassword.value = '';
        }
    } catch (error) {
        console.error('Errore login:', error);
        let message = 'Errore durante il login. ';
        switch (error.code) {
            case 'auth/user-not-found':
                message += 'Utente non trovato.';
                break;
            case 'auth/wrong-password':
                message += 'Password errata.';
                break;
            case 'auth/invalid-email':
                message += 'Email non valida.';
                break;
            case 'auth/too-many-requests':
                message += 'Troppi tentativi. Riprova più tardi.';
                break;
            default:
                message += 'Riprova.';
        }
        alert(message);
        hideLoading();
    }
}

async function registerWithEmail() {
    const name = registerName.value.trim();
    const email = registerEmail.value.trim();
    const password = registerPassword.value;
    const confirmPass = confirmPassword.value;
    
    if (!name || !email || !password || !confirmPass) {
        alert('Compila tutti i campi');
        return;
    }
    
    if (password !== confirmPass) {
        alert('Le password non coincidono');
        return;
    }
    
    if (password.length < 6) {
        alert('La password deve essere di almeno 6 caratteri');
        return;
    }
    
    try {
        showLoading();
        
        if (DEMO_MODE) {
            // Modalità demo: simula la registrazione
            setTimeout(() => {
                currentUser = {
                    email: email,
                    displayName: name,
                    photoURL: null,
                    uid: 'demo-user-' + Date.now()
                };
                
                checkGameMasterStatus();
                showMainScreen();
                loadDemoData();
                
                // Reset form
                registerName.value = '';
                registerEmail.value = '';
                registerPassword.value = '';
                confirmPassword.value = '';
                
                // Torna al tab login
                switchAuthTab('login');
                hideLoading();
            }, 1000);
        } else {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            
            // Aggiorna il profilo con il nome
            await userCredential.user.updateProfile({
                displayName: name
            });
            
            // Reset form
            registerName.value = '';
            registerEmail.value = '';
            registerPassword.value = '';
            confirmPassword.value = '';
            
            // Torna al tab login
            switchAuthTab('login');
        }
        
    } catch (error) {
        console.error('Errore registrazione:', error);
        let message = 'Errore durante la registrazione. ';
        switch (error.code) {
            case 'auth/email-already-in-use':
                message += 'Email già in uso.';
                break;
            case 'auth/invalid-email':
                message += 'Email non valida.';
                break;
            case 'auth/weak-password':
                message += 'Password troppo debole.';
                break;
            default:
                message += 'Riprova.';
        }
        alert(message);
        hideLoading();
    }
}

async function signOut() {
    try {
        if (DEMO_MODE) {
            // Modalità demo: simula il logout
            currentUser = null;
            isGameMaster = false;
            showLoginScreen();
        } else {
            await auth.signOut();
        }
    } catch (error) {
        console.error('Errore logout:', error);
    }
}

function checkGameMasterStatus() {
    isGameMaster = currentUser.email === GAME_MASTER_EMAIL;
    
    if (isGameMaster) {
        adminTab.style.display = 'flex';
        userRole.textContent = 'Game Master';
        userRole.style.background = '#ef4444';
    } else {
        adminTab.style.display = 'none';
        userRole.textContent = 'Giocatore';
        userRole.style.background = '#10b981';
    }
}

// UI Management
function showLoginScreen() {
    loginScreen.classList.add('active');
    loginScreen.classList.remove('hidden');
    mainScreen.classList.remove('active');
}

function showMainScreen() {
    loginScreen.classList.remove('active');
    loginScreen.classList.add('hidden');
    mainScreen.classList.add('active');
    
    // Assicurati che la pagina sia posizionata correttamente
    window.scrollTo(0, 0);
    document.body.style.overflow = 'auto';
    
    // Update user info
    const displayName = currentUser.displayName || currentUser.email.split('@')[0];
    userName.textContent = displayName;
    
    // Crea avatar con iniziali
    const initials = getInitials(displayName);
    userPhoto.innerHTML = initials;
    userPhoto.style.background = 'linear-gradient(135deg, #1e40af, #3b82f6)';
    userPhoto.style.color = 'white';
    userPhoto.style.display = 'flex';
    userPhoto.style.alignItems = 'center';
    userPhoto.style.justifyContent = 'center';
    userPhoto.style.fontWeight = '600';
    userPhoto.style.fontSize = '0.8rem';
    userPhoto.style.textTransform = 'uppercase';
}

function showLoading() {
    loadingOverlay.classList.add('active');
}

function hideLoading() {
    loadingOverlay.classList.remove('active');
}

function switchTab(tabName) {
    // Update nav tabs
    navTabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    // Update tab contents
    tabContents.forEach(content => {
        content.classList.toggle('active', content.id === tabName + 'Tab');
    });
}

// Data Management
async function loadData() {
    if (DEMO_MODE) {
        loadDemoData();
        return;
    }
    
    try {
        showLoading();
        
        // Carica giochi dal Realtime Database
        const gamesSnapshot = await database.ref('games').once('value');
        const gamesData = gamesSnapshot.val() || {};
        games = Object.keys(gamesData).map(key => ({
            id: key,
            ...gamesData[key]
        }));
        
        // Carica giocatori
        const playersSnapshot = await database.ref('players').once('value');
        const playersData = playersSnapshot.val() || {};
        players = Object.keys(playersData).map(key => ({
            id: key,
            ...playersData[key]
        }));
        
        // Carica punteggi
        const scoresSnapshot = await database.ref('scores').once('value');
        const scoresData = scoresSnapshot.val() || {};
        scores = Object.keys(scoresData).map(key => ({
          id: key,
          ...scoresData[key]
        }));
        
        // Assicurati che l'utente corrente sia nei giocatori
        await ensurePlayerExists();
        
        // Aggiorna UI
        updateLeaderboard();
        updateUserGames();
        updateAdminPanel();
        updateStats();
        
        hideLoading();
    } catch (error) {
        console.error('Errore caricamento dati:', error);
        hideLoading();
    }
}

function loadDemoData() {
    // Dati demo per test
    games = [
        { id: 'game1', name: 'Calcio - Finale', sport: 'calcio' },
        { id: 'game2', name: 'Ping Pong - Semifinale', sport: 'ping-pong' },
        { id: 'game3', name: 'Freccette - Quarti', sport: 'freccette' }
    ];
    
    players = [
        { id: 'player1', name: 'Mario Rossi', email: 'mario@example.com', photoURL: null },
        { id: 'player2', name: 'Luigi Verdi', email: 'luigi@example.com', photoURL: null },
        { id: 'player3', name: currentUser.displayName, email: currentUser.email, photoURL: null }
    ];
    
    scores = {
        'player1': { 'game1': 85, 'game2': 70, 'game3': 90 },
        'player2': { 'game1': 75, 'game2': 80, 'game3': 85 },
        'player3': { 'game1': 0, 'game2': 0, 'game3': 0 }
    };
    
    // Aggiorna UI
    updateLeaderboard();
    updateUserGames();
    updateAdminPanel();
    updateStats();
}

async function ensurePlayerExists() {
    const existingPlayer = players.find(p => p.email === currentUser.email);
    
    if (!existingPlayer) {
        const newPlayer = {
            email: currentUser.email,
            name: currentUser.displayName || 'Utente',
            photoURL: currentUser.photoURL || '',
            joinedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        const docRef = await db.collection('players').add(newPlayer);
        players.push({
            id: docRef.id,
            ...newPlayer
        });
    }  
}

// Leaderboard
function updateLeaderboard() {
    // Calcola totali per ogni giocatore
    const playerTotals = players.map(player => {
        // Trovo l'oggetto corrispondente al giocatore in scores (usando l'id)
        const scoreObj = scores.find(score => score.id === player.id) || {};
        
        // Calcolo il totale sommando tutti i punti tranne la chiave "id"
        const total = Object.keys(scoreObj).reduce((sum, key) => {
            if (key === 'id') return sum;
            return sum + (scoreObj[key]?.points || 0);
        }, 0);
    
        return {
            ...player,
            total: total
        };
    });
    
    // Ordina per punteggio totale
    playerTotals.sort((a, b) => b.total - a.total);
    
    // Aggiorna header delle gare
    updateGamesHeader();
    
    // Aggiorna righe giocatori
    leaderboardBody.innerHTML = '';
    playerTotals.forEach((player, index) => {
        const row = createPlayerRow(player, index + 1);
        leaderboardBody.appendChild(row);
    });
}

function updateGamesHeader() {
    gamesHeader.innerHTML = '';
    games.forEach(game => {
        const gameColumn = document.createElement('div');
        gameColumn.className = 'game-column';
        gameColumn.textContent = game.name;
        gameColumn.title = `${game.name} (${game.sport})`;
        gamesHeader.appendChild(gameColumn);
    });
}

function createPlayerRow(player, position) {
    const row = document.createElement('div');
    row.className = 'player-row';
    
    // Posizione
    const positionCell = document.createElement('div');
    positionCell.className = 'player-cell';
    const positionBadge = document.createElement('div');
    positionBadge.className = `position-badge position-${position <= 3 ? position : 'other'}`;
    positionBadge.textContent = position;
    positionCell.appendChild(positionBadge);
    
    // Giocatore
    const playerCell = document.createElement('div');
    playerCell.className = 'player-cell player-info';
    
    const avatar = createAvatarWithInitials(player.name, player.photoURL);
    
    const name = document.createElement('span');
    name.className = 'player-name';
    name.textContent = player.name;
    
    playerCell.appendChild(avatar);
    playerCell.appendChild(name);
    
    // Punteggi gare
    const gamesCell = document.createElement('div');
    gamesCell.className = 'player-cell';
    
    const gamesContainer = document.createElement('div');
    gamesContainer.className = 'player-games';
    
    games.forEach(game => {
        const gameScore = document.createElement('div');
        gameScore.className = 'game-score';
    
        // Qui prendo i punti, controllando se esiste il gioco dentro player.scores
        const scoreObj = scores.find(score => score.id === player.id) || {};
        const points = scoreObj[game.id]?.points || 0;
        gameScore.textContent = points;
    
        // Permetti editing se sei game master o se è il tuo punteggio
        if (isGameMaster || player.email === currentUser.email) {
            gameScore.classList.add('editable');
            gameScore.addEventListener('click', () => openEditModal(game.id, player.id, points, game.name, player.name));
        }
    
        gamesContainer.appendChild(gameScore);
    });
    
    gamesCell.appendChild(gamesContainer);
    
    // Totale
    const totalCell = document.createElement('div');
    totalCell.className = 'player-cell';
    const totalScore = document.createElement('span');
    totalScore.className = 'total-score';
    totalScore.textContent = player.total;
    totalCell.appendChild(totalScore);
    
    row.appendChild(positionCell);
    row.appendChild(playerCell);
    row.appendChild(gamesCell);
    row.appendChild(totalCell);
    
    return row;
}

// User Games
function updateUserGames() {
    const currentPlayer = players.find(p => p.email === currentUser.email);
    if (!currentPlayer) return;
    
    userGamesGrid.innerHTML = '';
    
    games.forEach(game => {
        const gameCard = createGameCard(game, currentPlayer);
        userGamesGrid.appendChild(gameCard);
    });
}

function createGameCard(game, player) {
    const card = document.createElement('div');
    card.className = 'game-card';
    
    const header = document.createElement('div');
    header.className = 'game-header';
    
    const sportIcon = document.createElement('div');
    sportIcon.className = 'sport-icon';
    sportIcon.innerHTML = getSportIcon(game.sport);
    
    const gameInfo = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'game-title';
    title.textContent = game.name;
    
    const sport = document.createElement('div');
    sport.className = 'game-sport';
    sport.textContent = getSportName(game.sport);
    
    gameInfo.appendChild(title);
    gameInfo.appendChild(sport);
    
    header.appendChild(sportIcon);
    header.appendChild(gameInfo);
    
    const pointsSection = document.createElement('div');
    pointsSection.className = 'points-section';
    
    const currentPoints = document.createElement('div');
    currentPoints.className = 'current-points';
    const scoreObj = scores.find(score => score.id === player.id) || {};
    const points = scoreObj[game.id]?.points || 0;
    currentPoints.textContent = `${points} punti`;
    
    const editBtn = document.createElement('button');
    editBtn.className = 'btn-primary edit-points-btn';
    editBtn.innerHTML = '<i class="fas fa-edit"></i> Modifica';
    editBtn.addEventListener('click', () => openEditModal(game.id, player.id, points, game.name, player.name));
    
    pointsSection.appendChild(currentPoints);
    pointsSection.appendChild(editBtn);
    
    card.appendChild(header);
    card.appendChild(pointsSection);
    
    return card;
}

// Admin Panel
function updateAdminPanel() {
    if (!isGameMaster) return;
    
    updateAdminGamesList();
    updatePointsManagement();
}

function updateAdminGamesList() {
    adminGamesList.innerHTML = '';
    
    games.forEach(game => {
        const gameItem = document.createElement('div');
        gameItem.className = 'admin-game-item';
        
        const gameInfo = document.createElement('div');
        gameInfo.className = 'game-info';
        
        const sportIcon = document.createElement('div');
        sportIcon.className = 'sport-icon';
        sportIcon.style.width = '30px';
        sportIcon.style.height = '30px';
        sportIcon.style.fontSize = '1rem';
        sportIcon.innerHTML = getSportIcon(game.sport);
        
        const gameDetails = document.createElement('div');
        const gameName = document.createElement('strong');
        gameName.textContent = game.name;
        const gameSport = document.createElement('div');
        gameSport.style.fontSize = '0.9rem';
        gameSport.style.color = 'var(--text-secondary)';
        gameSport.textContent = getSportName(game.sport);
        
        gameDetails.appendChild(gameName);
        gameDetails.appendChild(gameSport);
        
        gameInfo.appendChild(sportIcon);
        gameInfo.appendChild(gameDetails);
        
        const gameActions = document.createElement('div');
        gameActions.className = 'game-actions';
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-danger';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Elimina';
        deleteBtn.addEventListener('click', () => deleteGame(game.id));
        
        gameActions.appendChild(deleteBtn);
        
        gameItem.appendChild(gameInfo);
        gameItem.appendChild(gameActions);
        
        adminGamesList.appendChild(gameItem);
    });
}

function updatePointsManagement() {
    pointsManagement.innerHTML = '';
    
    if (games.length === 0 || players.length === 0) {
        pointsManagement.innerHTML = '<p>Aggiungi prima delle gare per gestire i punti.</p>';
        return;
    }
    
    const table = document.createElement('div');
    table.className = 'leaderboard-table';
    
    // Header
    const header = document.createElement('div');
    header.className = 'table-header';
    header.innerHTML = `
        <div class="header-cell player">Giocatore</div>
        <div class="header-cell games-header" id="adminGamesHeader"></div>
        <div class="header-cell total">Totale</div>
    `;
    
    const adminGamesHeader = header.querySelector('#adminGamesHeader');
    games.forEach(game => {
        const gameColumn = document.createElement('div');
        gameColumn.className = 'game-column';
        gameColumn.textContent = game.name;
        adminGamesHeader.appendChild(gameColumn);
    });
    
    table.appendChild(header);
    
    // Body
    const body = document.createElement('div');
    body.className = 'table-body';
    
    players.forEach(player => {
        const row = document.createElement('div');
        row.className = 'player-row';
        row.style.gridTemplateColumns = '1fr auto 100px';
        
        // Player info
        const playerCell = document.createElement('div');
        playerCell.className = 'player-cell player-info';
        playerCell.innerHTML = `
            <img src="${player.photoURL || 'https://placehold.co/35x35'}" alt="${player.name}" class="player-avatar">
            <span class="player-name">${player.name}</span>
        `;
        
        // Games scores
        const gamesCell = document.createElement('div');
        gamesCell.className = 'player-cell';
        const gamesContainer = document.createElement('div');
        gamesContainer.className = 'player-games';
        
        let total = 0;
        games.forEach(game => {
            const gameScore = document.createElement('div');
            gameScore.className = 'game-score editable';
            const points = scores[player.id]?.[game.id]?.points || 0;
            gameScore.textContent = points;
            total += points;
            
            gameScore.addEventListener('click', () => openEditModal(game.id, player.id, points, game.name, player.name));
            gamesContainer.appendChild(gameScore);
        });
        
        gamesCell.appendChild(gamesContainer);
        
        // Total
        const totalCell = document.createElement('div');
        totalCell.className = 'player-cell';
        totalCell.innerHTML = `<span class="total-score">${total}</span>`;
        
        row.appendChild(playerCell);
        row.appendChild(gamesCell);
        row.appendChild(totalCell);
        
        body.appendChild(row);
    });
    
    table.appendChild(body);
    pointsManagement.appendChild(table);
}

// Game Management
async function addGame() {
    const name = gameNameInput.value.trim();
    const sport = gameSportSelect.value;
    
    if (!name) {
        alert('Inserisci il nome della gara');
        return;
    }
    
    if (DEMO_MODE) {
        // Modalità demo: aggiungi localmente
        const newGame = {
            id: 'game' + Date.now(),
            name: name,
            sport: sport,
            createdAt: Date.now(),
            createdBy: currentUser.email
        };
        
        games.push(newGame);
        
        // Reset form
        gameNameInput.value = '';
        gameSportSelect.value = 'calcio';
        
        // Update UI
        updateLeaderboard();
        updateUserGames();
        updateAdminPanel();
        updateStats();
        return;
    }
    
    try {
        showLoading();
        
        const gameData = {
            name: name,
            sport: sport,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            createdBy: currentUser.email
        };
        
        const newGameRef = await database.ref('games').push(gameData);
        
        games.push({
            id: newGameRef.key,
            ...gameData
        });
        
        // Reset form
        gameNameInput.value = '';
        gameSportSelect.value = 'calcio';
        
        // Update UI
        updateLeaderboard();
        updateUserGames();
        updateAdminPanel();
        updateStats();
        
        hideLoading();
    } catch (error) {
        console.error('Errore aggiunta gara:', error);
        alert('Errore durante l\'aggiunta della gara');
        hideLoading();
    }
}

async function deleteGame(gameId) {
    if (!confirm('Sei sicuro di voler eliminare questa gara? Tutti i punteggi associati verranno persi.')) {
        return;
    }
    
    if (DEMO_MODE) {
        // Modalità demo: elimina localmente
        games = games.filter(g => g.id !== gameId);
        Object.keys(scores).forEach(playerId => {
            if (scores[playerId] && scores[playerId][gameId] !== undefined) {
                delete scores[playerId][gameId];
            }
        });
        
        // Update UI
        updateLeaderboard();
        updateUserGames();
        updateAdminPanel();
        updateStats();
        return;
    }
    
    try {
        showLoading();
        
        // Elimina la gara dal Realtime Database
        await database.ref('games').child(gameId).remove();
        
        // Elimina tutti i punteggi associati
        const scoresSnapshot = await database.ref('scores').once('value');
        const scoresData = scoresSnapshot.val() || {};
        
        const updates = {};
        Object.keys(scoresData).forEach(playerId => {
            if (scoresData[playerId] && scoresData[playerId][gameId] !== undefined) {
                updates[`scores/${playerId}/${gameId}`] = null;
            }
        });
        
        if (Object.keys(updates).length > 0) {
            await database.ref().update(updates);
        }
        
        // Aggiorna dati locali
        games = games.filter(g => g.id !== gameId);
        Object.keys(scores).forEach(playerId => {
            if (scores[playerId] && scores[playerId][gameId] !== undefined) {
                delete scores[playerId][gameId];
            }
        });
        
        // Update UI
        updateLeaderboard();
        updateUserGames();
        updateAdminPanel();
        updateStats();
        
        hideLoading();
    } catch (error) {
        console.error('Errore eliminazione gara:', error);
        alert('Errore durante l\'eliminazione della gara');
        hideLoading();
    }
}

// Points Management
function openEditModal(gameId, playerId, currentPoints, gameName, playerName) {
    editingGameId = gameId;
    editingPlayerId = playerId;
    
    modalTitle.textContent = `${gameName} - ${playerName}`;
    pointsInput.value = currentPoints;
    pointsInput.focus();
    
    editPointsModal.classList.add('active');
}

function closeEditModal() {
    editPointsModal.classList.remove('active');
    editingGameId = null;
    editingPlayerId = null;
}

async function savePointsEdit() {
    const newPoints = parseInt(pointsInput.value) || 0;
    
    if (newPoints < 0 || newPoints > 100) {
        alert('I punti devono essere tra 0 e 100');
        return;
    }
    
    if (DEMO_MODE) {
        // Modalità demo: salva localmente
        if (!scores[editingPlayerId]) {
            scores[editingPlayerId] = {};
        }
        scores[editingPlayerId][editingGameId] = newPoints;
        
        // Update UI
        updateLeaderboard();
        updateUserGames();
        updateAdminPanel();
        
        closeEditModal();
        return;
    }
    
    try {
        showLoading();
        
        // Salva nel Realtime Database
        await database.ref(`scores/${editingPlayerId}/${editingGameId}`).set({
            points: newPoints,
            updatedAt: firebase.database.ServerValue.TIMESTAMP,
            updatedBy: currentUser.email
        });
        
        // Aggiorna dati locali
        if (!scores[editingPlayerId]) {
            scores[editingPlayerId] = {};
        }
        scores[editingPlayerId][editingGameId] = newPoints;
        
        // Update UI
        updateLeaderboard();
        updateUserGames();
        updateAdminPanel();
        
        closeEditModal();
        hideLoading();
    } catch (error) {
        console.error('Errore salvataggio punti:', error);
        alert('Errore durante il salvataggio dei punti');
        hideLoading();
    }
}

// Ensure Player Exists
async function ensurePlayerExists() {
    if (DEMO_MODE) return;
    
    if (!currentUser) return;
    
    const existingPlayer = players.find(p => p.email === currentUser.email);
    if (existingPlayer) return;
    
    try {
        console.log(currentUser)
        const playerData = {
            name: currentUser.displayName || currentUser.email.split('@')[0],
            email: currentUser.email,
            photoURL: currentUser.photoURL || null,
            joinedAt: firebase.database.ServerValue.TIMESTAMP
        };
        
        const newPlayerRef = await database.ref('players').push(playerData);
        
        players.push({
            id: newPlayerRef.key,
            ...playerData
        });
    } catch (error) {
        console.error('Errore creazione giocatore:', error);
    }
}

function getSportIcon(sport) {
    const icons = {
        'calcio': '<i class="fas fa-futbol"></i>',
        'badminton': '<i class="fas fa-feather-alt"></i>',
        'freccette': '<i class="fas fa-bullseye"></i>',
        'ping-pong': '<i class="fas fa-table-tennis-paddle-ball"></i>',
        'tiro-arco': '<i class="fas fa-crosshairs"></i>'
    };
    return icons[sport] || '<i class="fas fa-trophy"></i>';
}

function getSportName(sport) {
    const names = {
        'calcio': 'Calcio',
        'badminton': 'Badminton',
        'freccette': 'Freccette',
        'ping-pong': 'Ping Pong',
        'tiro-arco': 'Tiro con l\'Arco'
    };
    return names[sport] || sport;
}

function createAvatarWithInitials(name, photoURL = null) {
    const avatar = document.createElement('div');
    avatar.className = 'player-avatar';

    if (photoURL && photoURL !== 'https://placehold.co/35x35') {
        const img = document.createElement('img');
        img.src = photoURL;
        img.alt = name;
        img.onerror = function () {
            avatar.innerHTML = ''; // rimuove l'immagine
            avatar.textContent = getInitials(name);
        };
        avatar.appendChild(img);
    } else {
        avatar.textContent = getInitials(name);
    }

    return avatar;
}

function getInitials(name) {
    const words = name.trim().split(/\s+/); // rimuove spazi in eccesso e divide su 1+ spazi
    if (words.length === 1) {
        const firstWord = words[0];
        return firstWord.slice(0, 2).toUpperCase();
    } else {
        const firstInitial = words[0].charAt(0);
        const lastInitial = words[words.length - 1].charAt(0);
        return (firstInitial + lastInitial).toUpperCase();
    }
}

function updateStats() {
    totalGames.textContent = games.length;
    totalPlayers.textContent = players.length;
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // ESC to close modal
    if (e.key === 'Escape' && editPointsModal.classList.contains('active')) {
        closeEditModal();
    }
    
    // Enter to save points in modal
    if (e.key === 'Enter' && editPointsModal.classList.contains('active')) {
        savePointsEdit();
    }
});
