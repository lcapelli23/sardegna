// Configurazione Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCsXQofrgME-4DLLysQy6Jzz1DPJy6vz3E",
  //apiKey: "your-api-key",
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

	// Forza persistenza locale
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
      .then(() => console.log('Auth persistence: LOCAL'))
      .catch(err => console.warn('Errore impostando persistence:', err));
} else {
    console.log("Modalità demo attiva - Firebase non configurato");
}

// Variabili globali
let currentUser = null;
let isGameMaster = false;
let games = [];
let players = [];
let scores = {};
let archives = {};
let realtimeRefs = [];
let registrationInProgress = false;

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
const adminTabBtn = document.getElementById('adminTabBtn');

// Leaderboard
const leaderboardBody = document.getElementById('leaderboardBody');
const gamesHeader = document.getElementById('gamesHeader');
const totalGames = document.getElementById('totalGames');
const totalPlayers = document.getElementById('totalPlayers');
const leaderboardSportSelect = document.getElementById('leaderboardSportSelect');

// Results (ex User games)
const resultsContainer = document.getElementById('resultsContainer');
const resultsSportSelect = document.getElementById('resultsSportSelect');

// Archivio (Albo d'Oro)
const archiveControls = document.getElementById('archiveControls');
const archiveYearSelect = document.getElementById('archiveYearSelect');
const archiveSportSelect = document.getElementById('archiveSportSelect');
const archiveContainer = document.getElementById('archiveContainer');
const archiveYearInput = document.getElementById('archiveYearInput');
const archiveEditionBtn = document.getElementById('archiveEditionBtn');

// Admin
const gameNameInput = document.getElementById('gameNameInput');
const gameSportSelect = document.getElementById('gameSportSelect');
const addGameBtn = document.getElementById('addGameBtn');
const adminGamesList = document.getElementById('adminGamesList');

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
let editingPlayerName = null;

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
        auth.onAuthStateChanged(async user => {
            if (user) {
                currentUser = user;
                checkGameMasterStatus();
                showMainScreen();

                // Durante la registrazione il player viene creato con il nome scelto dall'utente
                if (!registrationInProgress) {
                    await ensurePlayerExists();
                }

                setupRealtimeListeners();
            } else {
                detachRealtimeListeners();
                currentUser = null;
                isGameMaster = false;
                resetData();
                showLoginScreen();
                hideLoading();
            }
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
    
    // Filtri per sport
    if (leaderboardSportSelect) leaderboardSportSelect.addEventListener('change', updateLeaderboard);
    if (resultsSportSelect) resultsSportSelect.addEventListener('change', updateResults);

    // Archivio
    if (archiveYearSelect) archiveYearSelect.addEventListener('change', () => renderArchive(archiveYearSelect.value));
    if (archiveSportSelect) archiveSportSelect.addEventListener('change', () => renderArchive(archiveYearSelect.value));

    // Admin
    if (addGameBtn) addGameBtn.addEventListener('click', addGame);
    if (archiveEditionBtn) archiveEditionBtn.addEventListener('click', archiveCurrentEdition);
    
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
                setupRealtimeListeners();

                // Reset form
                loginEmail.value = '';
                loginPassword.value = '';
                hideLoading();
            }, 1000);
        } else {
            await auth.signInWithEmailAndPassword(email, password);
            // showMainScreen() e hideLoading() sono gestiti da onAuthStateChanged
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

    if (name.length < 4) {
        alert('Il nome deve avere almeno 4 caratteri');
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
            registrationInProgress = true;

            // 1. Crea l'utente
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // 2. AGGIORNA il profilo e ATTENDI il completamento
            await user.updateProfile({
                displayName: name
            });

            // 3. (Opzionale ma consigliato) Ricarica l'oggetto utente per essere sicuro al 100%
            // che l'oggetto locale `currentUser` sia sincronizzato.
            await user.reload();
            currentUser = auth.currentUser; // Riassegna l'utente corrente aggiornato

            // 4. Aggiungi il giocatore al tuo database Realtime
            // Questa funzione ora può usare `currentUser.displayName` con la certezza che sia corretto.
            await addNewPlayerToDatabase(currentUser.uid, name, email);

            // A questo punto, `currentUser.displayName` è GARANTITO che contenga il nome corretto.
            // Le funzioni che seguono funzioneranno come previsto.

            // --- FINE MODIFICHE CHIAVE ---

            // Reset form
            registerName.value = '';
            registerEmail.value = '';
            registerPassword.value = '';
            confirmPassword.value = '';

            registrationInProgress = false;

            // Firebase esegue il login in automatico dopo la registrazione: prepariamo il tab
            // login per il prossimo accesso e aggiorniamo l'header con il nome appena salvato.
            switchAuthTab('login');
            showMainScreen();
            hideLoading();
        }
    } catch (error) {
        registrationInProgress = false;
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
        adminTabBtn.style.display = 'flex';
        userRole.textContent = 'Game Master';
        userRole.style.background = '#ef4444';
    } else {
        adminTabBtn.style.display = 'none';
        userRole.textContent = 'Giocatore';
        userRole.style.background = '#10b981';
    }
}

// Ricrea il nodo del giocatore se manca, per esempio dopo la cancellazione
// dei dati di un'edizione: l'account resta su Firebase Auth ma non in 'players'.
async function ensurePlayerExists() {
    try {
        const playerRef = database.ref('players/' + currentUser.uid);
        const snapshot = await playerRef.once('value');

        if (!snapshot.exists()) {
            const name = currentUser.displayName || currentUser.email.split('@')[0];
            await addNewPlayerToDatabase(currentUser.uid, name, currentUser.email);
        }
    } catch (error) {
        console.error('Errore nella verifica del player nel database:', error);
    }
}

function resetData() {
    games = [];
    players = [];
    scores = {};
    archives = {};
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
    
    // Imposta sempre l'avatar con le iniziali
    const initials = getInitials(displayName);
    userPhoto.textContent = initials; // Imposta le iniziali come testo del div
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
function setupRealtimeListeners() {
    if (DEMO_MODE) {
        // La modalità demo non ha listener, quindi carichiamo i dati una volta e basta.
        loadDemoData();
        return;
    }

    showLoading();

    // Evita listener duplicati se l'utente esce e rientra
    detachRealtimeListeners();

    // --- Listener per i GIOCHI ---
    const gamesRef = database.ref('games');
    realtimeRefs.push(gamesRef);
    gamesRef.on('value', (snapshot) => {
        const gamesData = snapshot.val() || {};
        games = Object.keys(gamesData).map(key => ({
            id: key,
            ...gamesData[key]
        }));

        // Dopo aver ricevuto i dati, aggiorna tutte le parti dell'interfaccia
        updateAllUI();
    }, (error) => {
        console.error('Errore nel listener dei giochi:', error);
        hideLoading();
    });

    // --- Listener per i GIOCATORI ---
    const playersRef = database.ref('players');
    realtimeRefs.push(playersRef);
    playersRef.on('value', (snapshot) => {
        const playersData = snapshot.val() || {};
        players = Object.keys(playersData).map(key => ({
            id: key,
            ...playersData[key]
        }));
	    
        updateAllUI();
    }, (error) => {
        console.error('Errore nel listener dei giocatori:', error);
        hideLoading();
    });

    // --- Listener per i PUNTEGGI ---
    const scoresRef = database.ref('scores');
    realtimeRefs.push(scoresRef);
    scoresRef.on('value', (snapshot) => {
	const scoresData = snapshot.val() || {};
    	scores = scoresData;

        updateAllUI();
    }, (error) => {
        console.error('Errore nel listener dei punteggi:', error);
        hideLoading();
    });

    // --- Listener per l'ARCHIVIO (edizioni passate) ---
    const archiveRef = database.ref('archive');
    realtimeRefs.push(archiveRef);
    archiveRef.on('value', (snapshot) => {
        archives = snapshot.val() || {};

        updateArchiveUI();
    }, (error) => {
        console.error('Errore nel listener dell\'archivio:', error);
    });
}

function detachRealtimeListeners() {
    realtimeRefs.forEach(ref => ref.off());
    realtimeRefs = [];
}

function updateAllUI() {
    updateSportFilters();
    updateLeaderboard();
    updateResults();
    if (isGameMaster) {
        updateAdminPanel();
    }
    updateStats();
    hideLoading();
}

function loadDemoData() {
    // Dati demo per test
    games = [
        { id: 'game1', name: 'Calcio - Finale', sport: 'calcio' },
        { id: 'game2', name: 'Ping Pong - Semifinale', sport: 'ping-pong' },
        { id: 'game3', name: 'Freccette - Quarti', sport: 'freccette' },
	{ id: 'game4', name: 'A- Quarti', sport: 'freccette' },
	{ id: 'game5', name: 'B - Quarti', sport: 'freccette' },
	{ id: 'game6', name: 'C - Quarti', sport: 'freccette' },
	{ id: 'game7', name: 'D - Quarti', sport: 'freccette' },
	{ id: 'game8', name: 'E - Quarti', sport: 'freccette' },
    ];
    
    players = [
        { id: 'player1', name: 'Mario Rossi', email: 'mario@example.com', photoURL: null },
        { id: 'player2', name: 'Luigi Verdi', email: 'luigi@example.com', photoURL: null },
        { id: 'player3', name: currentUser.displayName, email: currentUser.email, photoURL: null }
    ];
    
    // Stessa struttura del Realtime Database: scores[playerId][gameId] = { points }
    scores = {
        player1: { game1: { points: 8 }, game2: { points: 7 }, game3: { points: 9 } },
        player2: { game1: { points: 7 }, game2: { points: 8 }, game3: { points: 5 } },
        player3: { game1: { points: 0 }, game2: { points: 0 }, game3: { points: 0 } }
    };

    // Aggiorna UI
    updateSportFilters();
    updateLeaderboard();
    updateResults();
    updateArchiveUI();
    updateAdminPanel();
    updateStats();
}

// Filtro per disciplina, condiviso da Classifica, Risultati e Albo d'Oro
function populateSportSelect(select, gamesList) {
    const availableSports = [...new Set(gamesList.map(game => game.sport))].sort(compareSports);

    const previous = select.value;
    select.innerHTML = '';

    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'Tutti gli sport';
    select.appendChild(allOption);

    availableSports.forEach(sport => {
        const option = document.createElement('option');
        option.value = sport;
        option.textContent = getSportName(sport);
        select.appendChild(option);
    });

    // Conserva la selezione se lo sport esiste ancora
    select.value = availableSports.includes(previous) ? previous : 'all';
}

function updateSportFilters() {
    populateSportSelect(leaderboardSportSelect, games);
    populateSportSelect(resultsSportSelect, games);
}

function filterGamesBySport(gamesList, sport) {
    return sport === 'all' ? gamesList : gamesList.filter(game => game.sport === sport);
}

// Leaderboard
function updateLeaderboard() {
    const visibleGames = filterGamesBySport(games, leaderboardSportSelect.value);

    // Calcola totali per ogni giocatore sulle sole gare visibili
    const playerTotals = players.map(player => {
        return {
            ...player,
            total: computeTotal(scores[player.id], visibleGames)
        };
    });

    // Ordina per punteggio totale
    playerTotals.sort((a, b) => b.total - a.total);

    // Aggiorna header delle gare
    updateGamesHeader(gamesHeader, visibleGames);

    // Aggiorna righe giocatori
    leaderboardBody.innerHTML = '';

    let lastPoints = null;
    let lastPosition = 0;
    let skip = 0;

    playerTotals.forEach(player => {
        if (player.total === lastPoints) {
            // Pareggio → stessa posizione
            skip++;
        } else {
            // Nuovo punteggio → avanza posizione contando anche i pareggi precedenti
            lastPosition = lastPosition + 1 + skip;
            skip = 0;
        }
    
        const row = createPlayerRow(player, lastPosition, visibleGames, scores, isGameMaster);
        leaderboardBody.appendChild(row);
    
        lastPoints = player.total;
    });
}

function updateGamesHeader(container, gamesList) {
    container.innerHTML = '';
    gamesList.forEach(game => {
        const gameColumn = document.createElement('div');
        gameColumn.className = 'game-column';
        gameColumn.textContent = game.name;
        gameColumn.title = `${game.name} (${game.sport})`;
        container.appendChild(gameColumn);
    });
}

// Somma i punti di un giocatore sulle gare indicate
function computeTotal(scoreObj, gamesList) {
    const playerScores = scoreObj || {};
    return gamesList.reduce((sum, game) => sum + (playerScores[game.id]?.points || 0), 0);
}

function createPlayerRow(player, position, gamesList, scoresMap, editable) {
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
    
    const scoreObj = scoresMap[player.id] || {};

    gamesList.forEach(game => {
        const gameScore = document.createElement('div');
        gameScore.className = 'game-score';

        // Qui prendo i punti, controllando se esiste il gioco dentro player.scores
        const points = scoreObj[game.id]?.points || 0;
        gameScore.textContent = points;

        // Permetti editing se sei game master
        if (editable) {
            gameScore.classList.add('editable');
            gameScore.addEventListener('click', () => openEditModal(game.id, player.id, points, game.name, player.name));
        } else {
            gameScore.classList.add('read-only');
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

// Results by Sport
function updateResults() {
    resultsContainer.innerHTML = '';

    const visibleGames = filterGamesBySport(games, resultsSportSelect.value);

    if (visibleGames.length === 0) {
        resultsContainer.innerHTML = '<div class="no-games-message">Nessuna gara disponibile al momento.</div>';
        return;
    }

    // Raggruppa le gare per disciplina
    const gamesBySport = {};
    visibleGames.forEach(game => {
        if (!gamesBySport[game.sport]) {
            gamesBySport[game.sport] = [];
        }
        gamesBySport[game.sport].push(game);
    });

    // Crea una sezione per ogni sport, con dentro le sue gare
    Object.keys(gamesBySport)
        .sort(compareSports)
        .forEach(sport => {
            resultsContainer.appendChild(createSportSection(sport, gamesBySport[sport]));
        });
}

function createSportSection(sport, sportGames) {
    const section = document.createElement('div');
    section.className = 'sport-results';

    // Header dello sport
    const header = document.createElement('div');
    header.className = 'sport-header';

    const icon = document.createElement('div');
    icon.className = 'sport-icon-large';
    icon.innerHTML = getSportIcon(sport);

    const title = document.createElement('h3');
    title.textContent = getSportName(sport);

    const count = document.createElement('span');
    count.className = 'sport-game-count';
    count.textContent = sportGames.length === 1 ? '1 gara' : `${sportGames.length} gare`;

    header.appendChild(icon);
    header.appendChild(title);
    header.appendChild(count);
    section.appendChild(header);

    // Una tabella per ogni gara della disciplina
    sportGames.forEach(game => {
        const block = document.createElement('div');
        block.className = 'game-block';

        const gameTitle = document.createElement('h4');
        gameTitle.className = 'game-title';
        gameTitle.textContent = game.name;

        block.appendChild(gameTitle);
        block.appendChild(createGameLeaderboard(game));
        section.appendChild(block);
    });

    return section;
}

function createGameLeaderboard(game) {
    // Crea la leaderboard per questa gara
    const leaderboardContainer = document.createElement('div');
    leaderboardContainer.className = 'leaderboard-container';

    const leaderboardTable = document.createElement('div');
    leaderboardTable.className = 'leaderboard-table';

    // Header della tabella
    const tableHeader = document.createElement('div');
    tableHeader.className = 'table-header';
    tableHeader.style.gridTemplateColumns = '60px minmax(200px, 1fr) 120px';

    // Colonna posizione
    const posHeader = document.createElement('div');
    posHeader.className = 'header-cell position';
    posHeader.textContent = 'Pos.';

    // Colonna giocatore
    const playerHeader = document.createElement('div');
    playerHeader.className = 'header-cell player';
    playerHeader.textContent = 'Giocatore';

    // Colonna punteggio gara
    const gameHeader = document.createElement('div');
    gameHeader.className = 'header-cell total';
    gameHeader.textContent = 'Punteggio';

    tableHeader.appendChild(posHeader);
    tableHeader.appendChild(playerHeader);
    tableHeader.appendChild(gameHeader);

    leaderboardTable.appendChild(tableHeader);

    // Body della tabella
    const tableBody = document.createElement('div');
    tableBody.className = 'table-body';

    // Calcola punteggi per ogni giocatore per questa gara
    const playerGameScores = players.map(player => {
	const scoreObj = scores[player.id] || {};

        // Punteggio per questa gara specifica
        const gameScore = scoreObj[game.id]?.points || 0;

        return {
            ...player,
            gameScore: gameScore
        };
    });

    // Ordina per punteggio di questa gara specifica
    playerGameScores.sort((a, b) => b.gameScore - a.gameScore);

    let lastPoints = null;
    let lastPosition = 0;
    let skip = 0;

    playerGameScores.forEach(player => {
        if (player.gameScore === lastPoints) {
            skip++;
        } else {
            lastPosition = lastPosition + 1 + skip;
            skip = 0;
        }

        const row = createGamePlayerRow(player, lastPosition, game);
        tableBody.appendChild(row);

        lastPoints = player.gameScore;
    });

    leaderboardTable.appendChild(tableBody);
    leaderboardContainer.appendChild(leaderboardTable);

    return leaderboardContainer;
}

function createGamePlayerRow(player, position, game) {
    const row = document.createElement('div');
    row.className = 'player-row';
    row.style.gridTemplateColumns = '60px minmax(200px, 1fr) 120px';

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

    // Punteggio di questa gara
    const gameScoreCell = document.createElement('div');
    gameScoreCell.className = 'player-cell';

    const gameScore = document.createElement('div');
    gameScore.className = 'game-score';
    gameScore.textContent = player.gameScore;

    // Permetti editing SOLO se sei game master
    if (isGameMaster) {
        gameScore.classList.add('editable');
        gameScore.addEventListener('click', () => openEditModal(game.id, player.id, player.gameScore, game.name, player.name));
    } else {
        gameScore.classList.add('read-only');
    }

    gameScoreCell.appendChild(gameScore);

    row.appendChild(positionCell);
    row.appendChild(playerCell);
    row.appendChild(gameScoreCell);

    return row;
}

// Albo d'Oro (edizioni archiviate)
function updateArchiveUI() {
    const years = Object.keys(archives).sort((a, b) => b - a);

    if (years.length === 0) {
        archiveControls.style.display = 'none';
        archiveYearSelect.innerHTML = '';
        archiveSportSelect.innerHTML = '';
        archiveContainer.innerHTML = '<div class="no-games-message">Nessuna edizione archiviata.</div>';
        return;
    }

    // Conserva l'anno selezionato se è ancora disponibile
    const selectedYear = years.includes(archiveYearSelect.value) ? archiveYearSelect.value : years[0];

    archiveYearSelect.innerHTML = '';
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        archiveYearSelect.appendChild(option);
    });
    archiveYearSelect.value = selectedYear;
    archiveControls.style.display = 'flex';

    renderArchive(selectedYear);
}

function renderArchive(year) {
    archiveContainer.innerHTML = '';

    const edition = archives[year];
    if (!edition) return;

    const editionGames = Object.keys(edition.games || {}).map(key => ({
        id: key,
        ...edition.games[key]
    }));

    // Il filtro elenca solo le discipline presenti in questa edizione
    populateSportSelect(archiveSportSelect, editionGames);
    const archivedGames = filterGamesBySport(editionGames, archiveSportSelect.value);

    const archivedScores = edition.scores || {};
    const archivedPlayers = Object.keys(edition.players || {}).map(key => ({
        id: key,
        ...edition.players[key],
        total: computeTotal(archivedScores[key], archivedGames)
    }));

    if (archivedPlayers.length === 0) {
        archiveContainer.innerHTML = '<div class="no-games-message">Questa edizione non contiene giocatori.</div>';
        return;
    }

    archivedPlayers.sort((a, b) => b.total - a.total);

    // Intestazione della tabella, speculare a quella della classifica generale
    const table = document.createElement('div');
    table.className = 'leaderboard-table';

    const tableHeader = document.createElement('div');
    tableHeader.className = 'table-header';

    const posHeader = document.createElement('div');
    posHeader.className = 'header-cell position';
    posHeader.textContent = 'Pos.';

    const playerHeader = document.createElement('div');
    playerHeader.className = 'header-cell player';
    playerHeader.textContent = 'Giocatore';

    const gamesHeaderCell = document.createElement('div');
    gamesHeaderCell.className = 'header-cell games-header';
    updateGamesHeader(gamesHeaderCell, archivedGames);

    const totalHeader = document.createElement('div');
    totalHeader.className = 'header-cell total';
    totalHeader.textContent = 'Totale';

    tableHeader.appendChild(posHeader);
    tableHeader.appendChild(playerHeader);
    tableHeader.appendChild(gamesHeaderCell);
    tableHeader.appendChild(totalHeader);
    table.appendChild(tableHeader);

    const tableBody = document.createElement('div');
    tableBody.className = 'table-body';

    let lastPoints = null;
    let lastPosition = 0;
    let skip = 0;

    archivedPlayers.forEach(player => {
        if (player.total === lastPoints) {
            skip++;
        } else {
            lastPosition = lastPosition + 1 + skip;
            skip = 0;
        }

        // L'archivio è sempre in sola lettura, anche per il Game Master
        tableBody.appendChild(createPlayerRow(player, lastPosition, archivedGames, archivedScores, false));

        lastPoints = player.total;
    });

    table.appendChild(tableBody);

    const container = document.createElement('div');
    container.className = 'leaderboard-container';
    container.appendChild(table);
    archiveContainer.appendChild(container);
}

async function archiveCurrentEdition() {
    const year = parseInt(archiveYearInput.value, 10);

    if (!year || year < 2000 || year > 2100) {
        alert('Inserisci un anno valido (es: 2025)');
        return;
    }

    if (games.length === 0 || players.length === 0) {
        alert('Non ci sono dati da archiviare');
        return;
    }

    // Ricostruisce i nodi nella stessa forma usata dal database
    const gamesSnapshot = {};
    games.forEach(({ id, ...gameData }) => {
        gamesSnapshot[id] = gameData;
    });

    const playersSnapshot = {};
    players.forEach(({ id, ...playerData }) => {
        playersSnapshot[id] = playerData;
    });

    if (DEMO_MODE) {
        archives[year] = {
            year: year,
            archivedAt: Date.now(),
            archivedBy: currentUser.email,
            games: gamesSnapshot,
            players: playersSnapshot,
            scores: scores
        };
        updateArchiveUI();
        alert(`Edizione ${year} archiviata (modalità demo)`);
        return;
    }

    if (archives[year] && !confirm(`L'edizione ${year} è già archiviata. Vuoi sovrascriverla?`)) {
        return;
    }

    if (!confirm(`Archiviare ${games.length} gare e ${players.length} giocatori come edizione ${year}?`)) {
        return;
    }

    try {
        showLoading();

        await database.ref('archive/' + year).set({
            year: year,
            archivedAt: firebase.database.ServerValue.TIMESTAMP,
            archivedBy: currentUser.email,
            games: gamesSnapshot,
            players: playersSnapshot,
            scores: scores
        });

        archiveYearInput.value = '';
        hideLoading();
        alert(`Edizione ${year} archiviata correttamente. Ora puoi cancellare i dati del torneo.`);
    } catch (error) {
        console.error('Errore archiviazione edizione:', error);
        alert('Errore durante l\'archiviazione dell\'edizione');
        hideLoading();
    }
}

// Admin Panel
function updateAdminPanel() {
    if (!isGameMaster) return;
    
    updateAdminGamesList();
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
        updateAllUI();
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
        
        await database.ref('games').push(gameData);
        
        // Reset form
        gameNameInput.value = '';
        gameSportSelect.value = 'calcio';

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
        updateAllUI();
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
	editingPlayerName = playerName;
    
    modalTitle.textContent = `${gameName} - ${playerName}`;
    pointsInput.value = currentPoints;
    pointsInput.focus();
    
    editPointsModal.classList.add('active');
}

function closeEditModal() {
    editPointsModal.classList.remove('active');
    editingGameId = null;
    editingPlayerId = null;
	editingPlayerName = null;
}

async function savePointsEdit() {
    const newPoints = parseInt(pointsInput.value) || 0;
    
    if (newPoints < -10 || newPoints > 10) {
        alert('I punti devono essere tra -10 e 10');
        return;
    }
    
    if (DEMO_MODE) {
        // Modalità demo: salva localmente
        if (!scores[editingPlayerId]) {
            scores[editingPlayerId] = {};
        }
        scores[editingPlayerId][editingGameId] = { points: newPoints };

        // Update UI
        updateAllUI();

        closeEditModal();
        return;
    }
    
    try {
        showLoading();
        
        // Salva nel Realtime Database
        await database.ref(`scores/${editingPlayerId}/${editingGameId}`).set({
            points: newPoints,
            updatedAt: firebase.database.ServerValue.TIMESTAMP,
            updatedBy: currentUser.email,
			updatedTo: editingPlayerName
        });

        closeEditModal();
        hideLoading();
    } catch (error) {
        console.error('Errore salvataggio punti:', error);
        alert('Errore durante il salvataggio dei punti');
        hideLoading();
    }
}

// Ensure Player Exists
async function addNewPlayerToDatabase(userId, name, email) {
    try {
        const playerData = {
            name: name,
            email: email,
            joinedAt: firebase.database.ServerValue.TIMESTAMP
        };

        // Usa l'ID utente di Firebase come chiave nel tuo nodo 'players'
        // Questo crea un collegamento diretto e robusto.
        await database.ref('players/' + userId).set(playerData);

        // Non è più necessario fare il push nell'array locale 'players'
        // perché il listener in tempo reale rileverà il nuovo utente e aggiornerà l'array automaticamente.

    } catch (error) {
        console.error('Errore nella creazione del player nel database:', error);
    }
}

function getSportIcon(sport) {
    const icons = {
        'calcio': '<i class="fas fa-futbol"></i>',
        'badminton': '<i class="fas fa-feather-alt"></i>',
        'freccette': '<i class="fas fa-bullseye"></i>',
        'ping-pong': '<i class="fas fa-table-tennis-paddle-ball"></i>',
        'tiro-arco': '<i class="fas fa-crosshairs"></i>',
        'altro': '<i class="fas fa-shapes"></i>'
    };
    return icons[sport] || '<i class="fas fa-trophy"></i>';
}

function getSportName(sport) {
    const names = {
        'calcio': 'Calcio',
        'badminton': 'Badminton',
        'freccette': 'Freccette',
        'ping-pong': 'Ping Pong',
        'tiro-arco': 'Tiro con l\'Arco',
        'altro': 'Altro'
    };
    return names[sport] || sport;
}

// Ordine di visualizzazione: alfabetico, con "Altro" sempre in fondo
function compareSports(a, b) {
    if (a === 'altro') return 1;
    if (b === 'altro') return -1;
    return getSportName(a).localeCompare(getSportName(b));
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
    const words = (name || '').trim().split(/\s+/).filter(Boolean); // rimuove spazi in eccesso e divide su 1+ spazi
    if (words.length === 0) {
        return '?';
    } else if (words.length === 1) {
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
