// ===== 1) Inizializza Firebase =====
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

// ===== 2) Persistenza dell’autenticazione =====
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
  .catch(err => console.error("Impossibile impostare persistenza:", err));

// ===== 3) Configura FirebaseUI =====
const ui = new firebaseui.auth.AuthUI(auth);
const uiConfig = {
  signInOptions: [
    firebase.auth.EmailAuthProvider.PROVIDER_ID
  ],
  // Disabilita i campi “Nome/Cognome”
  credentialHelper: firebaseui.auth.CredentialHelper.NONE,
  callbacks: {
    signInSuccessWithAuthResult: (authResult) => {
      // Se è un nuovo utente, creo il suo documento in Firestore
      if (authResult.additionalUserInfo.isNewUser) {
        db.collection('users').doc(authResult.user.uid).set({
          displayName: authResult.user.email,
          email: authResult.user.email,
          scores: {}
        }).catch(e => console.error("Errore creando profilo:", e));
      }
      // Ritorno false per NON fare redirect automatico
      return false;
    }
  }
};
ui.start('#firebaseui-auth-container', uiConfig);

// ===== 4) Elementi del DOM =====
const appEl        = document.getElementById('app');
const scoreboard   = document.querySelector('#scoreboard tbody');
const headerRow    = document.querySelector('thead tr');
const gmControls   = document.getElementById('gm-controls');
const GM_EMAIL     = 'gamemaster@esempio.com';
let currentUser    = null;
let races          = [];

// ===== 5) Listener stato auth =====
auth.onAuthStateChanged(user => {
  if (user) {
    // Utente loggato → mostra l’app, nascondi il login
    document.getElementById('firebaseui-auth-container').classList.add('hidden');
    appEl.classList.remove('hidden');

    currentUser = user;
    setupUI(user);
    loadRaces();
  } else {
    // Utente non loggato → mostra solo il login
    appEl.classList.add('hidden');
    document.getElementById('firebaseui-auth-container').classList.remove('hidden');
  }
});

// ===== 6) UI in base al ruolo =====
function setupUI(user) {
  if (user.email === GM_EMAIL) {
    gmControls.classList.remove('hidden');
    document.getElementById('add-race')
      .addEventListener('click', addRacePrompt);
  } else {
    gmControls.classList.add('hidden');
  }
}

// ===== 7) Carica e mostra gare =====
function loadRaces() {
  db.collection('races').orderBy('created')
    .onSnapshot(snap => {
      races = [];
      // ricostruisco l’intestazione
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

// ===== 8) Rendering punteggi =====
function renderScores() {
  db.collection('users')
    .onSnapshot(snap => {
      scoreboard.innerHTML = '';
      snap.forEach(uDoc => {
        const data = uDoc.data();
        const tr = document.createElement('tr');
        // Nome/Email
        const nameTd = document.createElement('td');
        nameTd.textContent = data.displayName || data.email;
        tr.appendChild(nameTd);

        // Una cella per ogni gara
        races.forEach(r => {
          const td   = document.createElement('td');
          const val  = data.scores?.[r.id] || 0;
          // Se sono io (GM) o è il mio profilo, input editabile
          if (currentUser.email === GM_EMAIL || currentUser.uid === uDoc.id) {
            const inp = document.createElement('input');
            inp.type  = 'number';
            inp.min   = 0;
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

// ===== 9) Aggiungi gara (solo GM) =====
function addRacePrompt() {
  const name = prompt('Nome nuova gara:');
  if (!name) return;
  db.collection('races').add({
    name,
    created: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// ===== 10) Aggiorna punteggio =====
function updateScore(userId, raceId, points) {
  const userRef = db.collection('users').doc(userId);
  if (currentUser.email === GM_EMAIL || currentUser.uid === userId) {
    const field = `scores.${raceId}`;
    userRef.set({ [field]: points }, { merge: true });
  } else {
    alert('Non hai i permessi per questa operazione.');
  }
}
