# Torneo Sardegna 2025 - Prima Edizione

Sito web per la gestione del tabellone del torneo multi-sport Sardegna 2025.

## Sport Inclusi
- Calcio
- Badminton
- Freccette
- Ping Pong
- Tiro con l'Arco

## Funzionalità

### Per tutti gli utenti:
- Autenticazione obbligatoria tramite Google (Firebase Auth)
- Visualizzazione classifica generale in tempo reale
- Modifica dei propri punti nelle gare
- Interfaccia responsive (desktop e mobile)

### Per il Game Master:
- Aggiunta e rimozione gare
- Modifica punti di tutti i giocatori
- Gestione completa del torneo

## Configurazione Firebase

### 1. Creare un progetto Firebase
1. Vai su [Firebase Console](https://console.firebase.google.com/)
2. Clicca "Aggiungi progetto"
3. Inserisci nome progetto (es: "torneo-sardegna-2025")
4. Segui la procedura guidata

### 2. Configurare Authentication
1. Nel pannello Firebase, vai su "Authentication"
2. Clicca "Inizia"
3. Vai su "Sign-in method"
4. Abilita "Google" come provider
5. Inserisci email di supporto del progetto

### 3. Configurare Firestore Database
1. Nel pannello Firebase, vai su "Firestore Database"
2. Clicca "Crea database"
3. Scegli "Inizia in modalità test" (per sviluppo)
4. Seleziona una regione (es: europe-west)

### 4. Configurare il sito web
1. Nel pannello Firebase, vai su "Impostazioni progetto"
2. Scorri fino a "Le tue app"
3. Clicca sull'icona web (</>)
4. Registra l'app con un nickname
5. Copia la configurazione Firebase

### 5. Aggiornare il codice
Nel file `script.js`, sostituisci la configurazione Firebase:

```javascript
const firebaseConfig = {
    apiKey: "la-tua-api-key",
    authDomain: "il-tuo-progetto.firebaseapp.com",
    projectId: "il-tuo-project-id",
    storageBucket: "il-tuo-progetto.appspot.com",
    messagingSenderId: "123456789",
    appId: "il-tuo-app-id"
};
```

### 6. Configurare Game Master
Nel file `script.js`, sostituisci l'email del Game Master:

```javascript
const GAME_MASTER_EMAIL = "tua-email@gmail.com";
```

### 7. Configurare regole Firestore (Opzionale)
Per maggiore sicurezza, aggiorna le regole Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permetti lettura a tutti gli utenti autenticati
    match /{document=**} {
      allow read: if request.auth != null;
    }
    
    // Permetti scrittura solo al game master per games
    match /games/{gameId} {
      allow write: if request.auth != null && 
        request.auth.token.email == "tua-email@gmail.com";
    }
    
    // Permetti scrittura per players (auto-registrazione)
    match /players/{playerId} {
      allow write: if request.auth != null;
    }
    
    // Permetti scrittura per scores con restrizioni
    match /scores/{scoreId} {
      allow write: if request.auth != null && (
        // Game master può modificare tutto
        request.auth.token.email == "tua-email@gmail.com" ||
        // Giocatori possono modificare solo i propri punti
        (resource.data.playerId == request.auth.uid)
      );
    }
  }
}
```

## Struttura Database

### Collection: games
```javascript
{
  name: "Nome Gara",
  sport: "calcio|badminton|freccette|ping-pong|tiro-arco",
  createdAt: timestamp,
  createdBy: "email@example.com"
}
```

### Collection: players
```javascript
{
  email: "player@example.com",
  name: "Nome Giocatore",
  photoURL: "url-foto",
  joinedAt: timestamp
}
```

### Collection: scores
```javascript
{
  playerId: "player-document-id",
  gameId: "game-document-id",
  points: 0-100,
  updatedAt: timestamp,
  updatedBy: "email@example.com"
}
```

## Deployment

### Hosting locale
1. Apri il file `index.html` in un browser web
2. Assicurati di avere una connessione internet per Firebase

### Firebase Hosting (Opzionale)
1. Installa Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Inizializza: `firebase init hosting`
4. Deploy: `firebase deploy`

## Supporto

Per problemi o domande, contatta il Game Master del torneo.

## Tecnologie Utilizzate
- HTML5, CSS3, JavaScript (Vanilla)
- Firebase Authentication
- Firebase Firestore
- Font Awesome Icons
- Google Fonts (Poppins)

