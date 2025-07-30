// Configura qui il tuo progetto Firebase
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
const db = firebase.firestore();

// Assicuriamoci che l’utente resti loggato anche chiudendo il browser
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
  .catch(err => console.error("Impossibile impostare persistenza:", err));

// Imposta FirebaseUI per email/password (puoi aggiungere altri provider)
const ui = new firebaseui.auth.AuthUI(auth);
const uiConfig = {
  signInOptions: [
    firebase.auth.EmailAuthProvider.PROVIDER_ID
  ],
  // Disabilita i campi “Nome/Cognome” di default
  credentialHelper: firebaseui.auth.CredentialHelper.NONE,
  callbacks: {
    signInSuccessWithAuthResult: (authResult) => {
      // Se è un nuovo utente, creo il suo profilo in Firestore
      if (authResult.additionalUserInfo.isNewUser) {
        db.collection('users').doc(authResult.user.uid).set({
          displayName: authResult.user.displayName || authResult.user.email,
          email: authResult.user.email,
          scores: {}
        }).catch(e => console.error("Errore creando profilo:", e));
      }
      // Ritorno false per non fare redirect automatico
      return false;
    }
  }
};
ui.start('#firebaseui-auth-container', uiConfig);

const appEl = document.getElementById('app');
const scoreboard = document.getElementById('scoreboard').querySelector('tbody');
const headerRow = document.querySelector('thead tr');
const gmControls = document.getElementById('gm-controls');

// Utente con email del Game Master
const GM_EMAIL = 'gamemaster@esempio.com';

let currentUser = null;
let races = []; // lista gare { id, name }

// Listener auth
auth.onAuthStateChanged(user => {
  if (user) {
    // Utente autenticato → mostro l’app
    document.getElementById('firebaseui-auth-container').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    currentUser = user;
    setupUI(user);
    loadRaces();
  } else {
    // Utente non autenticato → mostro solo il login
    document.getElementById('app').classList.add('hidden');
    document.getElementById('firebaseui-auth-container').classList.remove('hidden');
  }
});

// Mostra/nascondi controlli in base al ruolo
function setupUI(user) {
  if (user.email === GM_EMAIL) {
    gmControls.classList.remove('hidden');
    document.getElementById('add-race')
      .addEventListener('click', addRacePrompt);
  } else {
    gmControls.classList.add('hidden');
  }
}

// Carica gare e costruisce tabella
function loadRaces() {
  db.collection('races').orderBy('created').onSnapshot(snap => {
    races = [];
    headerRow.innerHTML = '<th>Partecipante</th>';
    snap.forEach(doc => {
      races.push({ id: doc.id, name: doc.data().name });
      const th = document.createElement('th');
      th.textContent = doc.data().name;
      headerRow.appendChild(th);
    });
    renderScores();
  });
}

// Rendering punteggi
function renderScores() {
  db.collection('users').onSnapshot(snap => {
    scoreboard.innerHTML = '';
    snap.forEach(uDoc => {
      const userData = uDoc.data();
      const tr = document.createElement('tr');
      const nameTd = document.createElement('td');
      nameTd.textContent = userData.displayName || userData.email;
      tr.appendChild(nameTd);

      races.forEach(r => {
        const td = document.createElement('td');
        const val = userData.scores?.[r.id] || 0;
        if (currentUser.uid === uDoc.id || currentUser.email === GM_EMAIL) {
          const inp = document.createElement('input');
          inp.type = 'number';
          inp.min = 0;
          inp.value = val;
          inp.addEventListener('change', () => {
            updateScore(uDoc.id, r.id, parseInt(inp.value));
          });
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

// Aggiungi gara (GM)
function addRacePrompt() {
  const name = prompt('Nome nuova gara:');
  if (!name) return;
  db.collection('races').add({
    name,
    created: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// Aggiorna punteggio in Firestore
function updateScore(userId, raceId, points) {
  const userRef = db.collection('users').doc(userId);
  const field = `scores.${raceId}`;
  if (currentUser.email === GM_EMAIL || currentUser.uid === userId) {
    userRef.set({ [field]: points }, { merge: true });
  } else {
    alert('Non hai i permessi per fare questa operazione.');
  }
}
