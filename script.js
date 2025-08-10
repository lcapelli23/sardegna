// Configurazione Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCsXQofrgME-4DLLysQy6Jzz1DPJy6vz3E",
  authDomain: "tabellone-punteggi.firebaseapp.com",
  databaseURL: "https://tabellone-punteggi-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "tabellone-punteggi",
  storageBucket: "tabellone-punteggi.appspot.com",
  messagingSenderId: "116153541822",
  appId: "1:116153541822:web:a0ac664310378aff7beaef",
};

// Modalità demo per test
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
const GAME_MASTER_EMAIL = "lollocapelli@gmail.com";

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

// Gestione UI (Stabile)
function showLoginScreen() {
    mainScreen.classList.remove('active');
    loginScreen.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function showMainScreen() {
    loginScreen.classList.remove('active');
    mainScreen.classList.add('active');
    document.body.style.overflow = 'auto';
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
    refs.scores = scoresRef.on('value', snapshot => { scores = snapshot.val
