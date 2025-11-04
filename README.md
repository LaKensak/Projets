# StreamCircle

Plateforme auto-hébergée inspirée de Twitch pour partager un stream d'écran (films / séries entre amis) via OBS, un serveur RTMP et une application web temps réel.

## Aperçu

- **OBS → RTMP** : l'utilisateur pousse son flux vers `nginx-rtmp`.
- **Transcodage** : `ffmpeg` expose le flux en HLS (`.m3u8`) pour les spectateurs.
- **Webapp** : lecteur vidéo HLS, chat Socket.IO, gestion de salons privés.
- **Sécurité** : tokens d'accès, salons protégés, configuration adaptable.

## Vue d'ensemble des dossiers

```
.
├── backend/           # API REST + Socket.IO pour gestion de sessions et chat
├── frontend/          # Application React (Vite) pour le lecteur et l'interface
├── infra/
│   ├── rtmp/          # Image nginx-rtmp custom (conf + script ffmpeg)
│   └── docker-compose.yml
└── README.md
```

## Prérequis

- Docker 24+ et Docker Compose plugin
- Port TCP ouverts : `1935` (RTMP), `8080` (segments HLS), `4000` (API), `3000` (web)
- Optionnel : Node.js 20+ si vous souhaitez lancer les services en dehors de Docker

## Configuration

1. Copier les fichiers d'environnement :

   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

2. Mettre à jour :
   - `SERVER_ADMIN_TOKEN` (clé secrète pour les routes admin)
   - `STREAM_HOST` (URL publique exposant `/hls`, ex : `https://stream.yourdomain.xyz:8080`)
   - `VITE_API_BASE_URL` et `VITE_BACKEND_SOCKET_URL` côté frontend (URL publique de l'API, ex : `https://app.yourdomain.xyz/api`)

3. Initialiser la base de données :

   ```bash
   cd backend
   npm install
   npx prisma migrate deploy
   ```

   La base SQLite est stockée dans `data/streamcircle.db`.

## Lancer via Docker Compose

```bash
cd infra
docker compose up --build -d
```

Services exposés :

- `rtmp` : `rtmp://<host>:1935/live`
- `rtmp` : segments HLS accessibles sur `http://<host>:8080/hls/<STREAM_KEY>/index.m3u8`
- `backend` : API REST + Socket.IO sur `http://<host>:4000`
- `frontend` : SPA React servie sur `http://<host>:3000` (proxy `/api` et `/socket.io` vers le backend)

## Gestion des salons (API)

Les routes admin nécessitent l'en-tête `x-admin-token: <SERVER_ADMIN_TOKEN>`.

- **Lister les salons** :

  ```bash
  curl http://<host>:4000/api/rooms
  ```

- **Créer un salon** :

  ```bash
  curl -X POST http://<host>:4000/api/rooms \
    -H "Content-Type: application/json" \
    -H "x-admin-token: <SERVER_ADMIN_TOKEN>" \
    -d '{"name":"Soiree series"}'
  ```

  La réponse contient la `streamKey` à configurer dans OBS et le lien HLS à partager.

- **Régénérer la clé stream** :

  ```bash
  curl -X POST http://<host>:4000/api/rooms/<slug>/rotate \
    -H "x-admin-token: <SERVER_ADMIN_TOKEN>"
  ```

- **Messages historiques** :

  ```bash
  curl http://<host>:4000/api/rooms/<slug>/messages
  ```

## Diffuser avec OBS

1. Paramétrer OBS → `Flux` :
   - URL : `rtmp://<host>:1935/live`
   - Clé de flux : `STREAM_KEY` récupérée via l'API.
2. Démarrer le streaming. À la première connexion OBS :
   - `nginx-rtmp` appelle le backend (`/hooks/rtmp/publish`) pour valider la clé.
   - `ffmpeg-transcode.sh` transcode et pousse l'HLS dans `data/hls/<STREAM_KEY>`.
3. Pour arrêter, stoppez OBS : le backend marque le salon `isLive = false` via `/hooks/rtmp/done`.

## Frontend & UX

- Page d'accueil : liste des salons, indication `En direct`/`Hors ligne`.
- Formulaire de pseudo : `POST /api/rooms/<slug>/join` fournit le token chat.
- Lecteur vidéo : `hls.js` + fallback natif.
- Chat temps réel : Socket.IO, historique 50 derniers messages, proxy `/socket.io`.

## Développement local

1. Installer les dépendances :

   ```bash
   (cd backend && npm install)
   (cd frontend && npm install)
   ```

2. Lancer les services :

   ```bash
   cd backend && npm run dev
   cd frontend && npm run dev
   ```

   Le Vite dev server proxiera `/api` vers la valeur de `VITE_API_BASE_URL` (par défaut `http://localhost:4000`).

3. Lancer nginx-rtmp en parallèle (depuis `infra/`) ou pousser directement un `.m3u8` de test pour le lecteur.

## Technologies

- **Ingest** : `nginx-rtmp` + `ffmpeg`
- **Backend** : Node.js 20, Express, Socket.IO, Prisma (SQLite par défaut)
- **Frontend** : React 18, Vite, `hls.js`, TailwindCSS

## Fonctionnalités clés

- Authentification par lien d'invitation (token)
- Création de salons privés, chaque salon expose une clé stream unique
- Chat temps réel par salon, présence utilisateurs
- Lecteur vidéo HLS avec reconnect automatique
- Dashboard streamer : status du flux, copie de la clé stream

## Limitations & évolutions

- HLS introduit ~5-10s de latence; pour latence ultra-faible, intégrer WebRTC (`mediamtx`, `Janus`).
- Transcodage par défaut en 720p/30fps; adaptez `ffmpeg` dans `infra/rtmp/ffmpeg-transcode.sh`.
- Veillez à respecter le droit d'auteur des contenus que vous diffusez.
- Ajouter modération, emotes personnalisés, watch parties synchronisées.

## Maintenance

- Surveillez l'espace disque (segments HLS).
- Configurez le logging (`infra/nginx/nginx.conf`) et la rotation.
- Sauvegardez la base SQLite ou migrez vers PostgreSQL.

## Notes légales

- Vérifiez les licences des contenus diffusés avant de streamer.
- Protégez l'accès (reverse proxy HTTPS, tokens courts, limitation IP).
- Ajoutez une charte d'utilisation pour vos amis et définissez les responsabilités.

## Licence

Projet livré sans licence; ajoutez-en une si nécessaire.
