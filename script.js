// 1) Firebase init
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
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();

// 2) DOM Elements
const loginForm   = document.getElementById('login-form');
const signupForm  = document.getElementById('signup-form');
const showLogin   = document.getElementById('show-login');
const showSignup  = document.getElementById('show-signup');
const authContainer = document.getElementById('auth-container');
const appEl       = document.getElementById('app');
const logoutBtn   = document.getElementById('logout');
const scoreboard  = document.querySelector('#scoreboard tbody');
const headerRow   = document.querySelector('#scoreboard thead tr');
const gmControls  = document.getElementById('gm-controls');

const GM_EMAIL    = 'gamemaster@esempio.com';
let currentUser, races = [];

// 3) Toggle forms
showLogin.addEventListener('click', () => {
  signupForm.classList.add('hidden');
  loginForm.classList.remove('hidden');
});
showSignup.addEventListener('click', () => {
  loginForm.classList.add('hidden');
  signupForm.classList.remove('hidden');
});

// 4) Signup handler
signupForm.addEventListener('submit', async e => {
  e.preventDefault();
  const username = document.getElementById('signup-username').value.trim();
  const email    = document.getElementById('signup-email').value.trim();
  const pass     = document.getElementById('signup-password').value;

  // Controllo che username non esista già
  const snap = await db.doc(`usernames/${username}`).get();
  if (snap.exists) {
    return alert('Username già utilizzato.');
  }

  // Creo utente
  const cred = await auth.createUserWithEmailAndPassword(email, pass);
  const uid  = cred.user.uid;

  // Salvo mapping username→uid e profilo utente
  await db.doc(`usernames/${username}`).set({ uid });
  await db.doc(`users/${uid}`).set({
    username, email, displayName: username,
    scores: {}
  });

  // Entra direttamente
});

// 5) Login handler
loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const pass     = document.getElementById('login-password').value;

  // Recupero uid da username
  const snap = await db.doc(`usernames/${username}`).get();
  if (!snap.exists) return alert('Username non trovato.');

  const { uid } = snap.data();
  // Recupero email da profilo
  const userDoc = await db.doc(`users/${uid}`).get();
  if (!userDoc.exists) return alert('Profilo utente mancante.');

  const { email } = userDoc.data();
  // Effettuo il login con email/password
  await auth.signInWithEmailAndPassword(email, pass);
});

// 6) Logout
logoutBtn.addEventListener('click', () => auth.signOut());

// 7) Auth state listener
auth.onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    authContainer.classList.add('hidden');
    appEl.classList.remove('hidden');
    setupUI(user);
    loadRaces();
  } else {
    appEl.classList.add('hidden');
    authContainer.classList.remove('hidden');
  }
});

// 8) Ruoli e controlli
function setupUI(user) {
  if (user.email === GM_EMAIL) {
    gmControls.classList.remove('hidden');
    document.getElementById('add-race')
      .addEventListener('click', addRacePrompt);
  } else {
    gmControls.classList.add('hidden');
  }
}

// 9) Carica gare e tabellone
function loadRaces() {
  db.collection('races').orderBy('created')
    .onSnapshot(snap => {
      races = [];
      headerRow.innerHTML = '<th>Partecipante</th>';
      snap.forEach(d => {
        races.push({ id: d.id, name: d.data().name });
        const th = document.createElement('th');
        th.textContent = d.data().name;
        headerRow.appendChild(th);
      });
      renderScores();
    });
}

function renderScores() {
  db.collection('users').onSnapshot(snap => {
    scoreboard.innerHTML = '';
    snap.forEach(uDoc => {
      const data = uDoc.data();
      const tr   = document.createElement('tr');
      const nameTd = document.createElement('td');
      nameTd.textContent = data.username || data.email;
      tr.appendChild(nameTd);

      races.forEach(r => {
        const td = document.createElement('td');
        const val = data.scores?.[r.id] || 0;
        if (currentUser.email === GM_EMAIL || currentUser.uid === uDoc.id) {
          const inp = document.createElement('input');
          inp.type = 'number'; inp.min = 0; inp.value = val;
          inp.addEventListener('change', () =>
            updateScore(uDoc.id, r.id, parseInt(inp.value))
          );
          td.appendChild(inp);
        } else {
          td.textContent = val;
        }
        tr.appendChild(td);
      });

      scoreboard.appendChild(tr);
    });
  });
}

function addRacePrompt() {
  const name = prompt('Nome nuova gara:');
  if (!name) return;
  db.collection('races').add({
    name,
    created: firebase.firestore.FieldValue.serverTimestamp()
  });
}

function updateScore(userId, raceId, points) {
  const userRef = db.collection('users').doc(userId);
  if (currentUser.email === GM_EMAIL || currentUser.uid === userId) {
    userRef.set({ [`scores.${raceId}`]: points }, { merge: true });
  } else {
    alert('Non hai i permessi per questa operazione.');
  }
}
