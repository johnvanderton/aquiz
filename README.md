# Quizz en ligne — Vue 3 + Vuetify + Express/SQLite

Application de quizz à choix multiple organisée en **3 parties** :

- **Publique** (`/`) — les utilisateurs passent le quizz actuellement publié,
  avec un formulaire de contact (`/contact`).
- **Résultats** (`/resultats`) — score, appréciation (Faible/Moyen/Élevé/
  Parfait), export PDF et bouton « Plus d'informations ».
- **Admin** (`/admin`) — protégée par identifiant/mot de passe : gestion des
  questionnaires, des niveaux de score, des bannières (vendeurs et quizz),
  des messages de contact et des identifiants.

## Architecture

```
Navigateur (Vue 3 + Vuetify + Pinia)  ──  HTTP/JSON  ──►  Serveur Node (Express)  ──►  SQLite (1 fichier)
```

**Toute la persistance est côté serveur.** Le navigateur ne conserve plus
rien en local (ni `localStorage`, ni `sessionStorage`, ni IndexedDB) :
questionnaires, bannières, seuils, domaines autorisés, mot de passe et
messages de contact (avec leurs PDF joints) sont dans une base **SQLite**
— un seul fichier, aucun service à installer. Conséquence : un quizz publié
par l'admin est visible par tous les visiteurs, et les messages de contact
arrivent bien dans l'espace admin, quel que soit le navigateur utilisé.

- Serveur : Node ≥ 18.11, [Express](https://expressjs.com/),
  [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- Front : Vue 3 (`<script setup>`), Vue Router, Vuetify 3, Pinia,
  [mammoth.js](https://github.com/mwilliamson/mammoth.js) (lecture du `.docx`
  dans le navigateur), [jsPDF](https://github.com/parallax/jsPDF) (export PDF)
- Build : Vite

## Installation et lancement

```bash
npm install
```

**Développement** (serveur API + front avec rechargement à chaud) :

```bash
npm run dev          # API sur :3000, front sur http://localhost:5173 (proxy /api)
```

**Production** (un seul processus sert le front compilé ET l'API) :

```bash
npm run build
npm start            # http://localhost:3000
```

La base est créée automatiquement au premier démarrage dans
`server/data/quiz.db`. **Sauvegarde = copier ce fichier** (ainsi que
`quiz.db-wal` / `quiz.db-shm` s'ils existent, ou arrêter le serveur avant).

### Variables d'environnement (toutes optionnelles)

Voir `.env.example`. Le projet ne lit pas `.env` tout seul ; avec Node ≥ 20.6 :
`node --env-file=.env server/index.js`.

| Variable | Rôle | Défaut |
|---|---|---|
| `PORT`, `HOST` | Port / interface d'écoute | `3000`, `0.0.0.0` |
| `DB_PATH` | Emplacement du fichier SQLite | `server/data/quiz.db` |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | Identifiants admin — **uniquement au tout premier démarrage** | `admin` / `quizz2026` |
| `ADMIN_ALLOWED_DOMAINS` | Domaines affichant le lien Administration — **premier démarrage uniquement** (liste séparée par des virgules) | `localhost,127.0.0.1,::1` |
| `COOKIE_SECURE` | `true` ⇒ cookie de session `Secure` (à activer en HTTPS) | `false` |
| `TRUST_PROXY` | `true` derrière un reverse proxy (IP réelle pour la limitation de débit) | — |

> Après le premier démarrage, ce sont les valeurs **en base** (modifiables
> depuis l'interface d'administration) qui font foi : changer ces variables
> n'a plus d'effet sur un identifiant/mot de passe ou une liste de domaines
> déjà enregistrés.

## Identifiants admin (par défaut)

```
Identifiant : admin
Mot de passe : quizz2026
```

⚠ **À changer immédiatement** : définissez `ADMIN_PASSWORD` avant le premier
démarrage, ou utilisez l'onglet **Identifiants** une fois connecté.

## Sécurité

- **Authentification côté serveur.** Le mot de passe est vérifié par le
  serveur et stocké **haché** (scrypt + sel) en base. La connexion crée une
  session dont le jeton est dans un **cookie `HttpOnly` + `SameSite=Lax`**
  (illisible depuis le JavaScript de la page) ; seule l'empreinte du jeton est
  stockée en base. Durée : 8 h, ou jusqu'à la déconnexion.
- Toutes les routes `/api/admin/*` exigent cette session (réponse `401`
  sinon) ; la lecture des messages et le téléchargement des PDF joints
  aussi. Un changement de mot de passe invalide les autres sessions.
- **Limitation de débit** : 20 tentatives de connexion / 15 min et 20
  messages de contact / heure, par IP.
- **Validation stricte** de toutes les entrées côté serveur (tailles,
  formats ; images limitées à PNG/JPEG/WebP/GIF ; pièce jointe = vrai PDF).
- Le lien vers `/admin` n'apparaît dans le menu que sur les domaines
  listés dans l'onglet **Identifiants** (liste enregistrée côté serveur). Il
  s'agit d'un confort d'affichage : l'URL `/admin` reste accessible sur tout
  domaine, mais **toujours protégée par le login**.
- **Mettez le site en HTTPS en production** (reverse proxy Caddy/nginx) et
  définissez `COOKIE_SECURE=true` : sans TLS, identifiants et cookie
  circulent en clair sur le réseau.
- Pas de dépendance à `crypto.subtle` côté navigateur : la connexion
  fonctionne aussi sur un environnement de test servi en simple HTTP.
- Limite connue : la correction du quizz se fait dans le navigateur ; les
  bonnes réponses du quizz publié sont donc présentes dans la réponse de
  l'API publique.

## Partie publique (`/`)

- Si l'admin n'a publié aucun questionnaire → message **« Quizz non
  disponible »**.
- Sinon, le questionnaire publié est chargé automatiquement et l'utilisateur
  répond question par question.
- Le nom affiché **en haut à gauche** est le **titre de la bannière de quizz
  active** (repli sur « Quizz »). L'**image** de cette bannière s'affiche en
  en-tête des pages du quizz (questions et résultats).
- Une fois toutes les questions répondues, redirection vers `/resultats`.
- Lien **Contact** (`/contact`) toujours visible :
  - la **bannière du vendeur actif** s'affiche en en-tête du formulaire ;
  - champs : prénom, nom, email, question, case RGPD obligatoire ;
  - depuis le bouton **« Plus d'informations »** de la page résultats, le
    **PDF du résultat est automatiquement préparé et joint** (aperçu
    possible) ;
  - à l'envoi, le message **et sa pièce jointe** sont enregistrés dans la
    base du serveur.

## Partie résultats (`/resultats`)

- Score (X/Y et %) et **appréciation** (Faible/Moyen/Élevé/Parfait) selon
  les seuils définis par l'admin ; bannière du quizz actif en en-tête.
- Pour chaque question ratée, une ligne **« Votre réponse : … »** rappelle
  ce que l'utilisateur a sélectionné ; les bonnes réponses et sa mauvaise
  réponse sont marquées.
- Bouton **« Télécharger en PDF »** :
  - bannière du vendeur **centrée** en en-tête (≥ 50 % de la largeur de
    page), puis la référence (`Réf : nom-du-fichier-xxx`), la date et le
    nombre total de pages ;
  - **score** (sans l'appréciation) ;
  - titres de question en **gras** (Helvetica, équivalent d'Arial), puis les
    réponses en plus petit : **bonnes réponses en vert gras**, **mauvaise
    réponse choisie en rouge gras suffixée « (votre réponse) »**, autres
    réponses en noir ;
  - retour à la ligne automatique, saut de page avant tout débordement,
    **numéro de page** en bas à droite de chaque page.
- Bouton **« Plus d'informations »** : mène au formulaire de contact avec le
  PDF joint.
- Bouton pour recommencer le même quizz.

## Partie admin (`/admin`)

Accès protégé par identifiant/mot de passe (session serveur, voir
« Sécurité »).

**Onglet Questionnaires** — import d'un ou plusieurs `.docx` (lecture dans le
navigateur, enregistrement des questions sur le serveur) ; **Publier** un seul
fichier à la fois, **Dépublier**, **Supprimer**.

**Onglet Niveaux de score** — seuils **Moyen** et **Élevé** (en %) ;
**Faible** commence à 0 %, **Parfait** = 100 %.

**Onglet Bannières**
- *Vendeurs* : nom, logo, email de contact ; un seul **actif** (formulaire de
  contact + en-tête du PDF).
- *Quizz* : titre + image ; une seule **active** (haut à gauche du site et
  en-tête des pages du quizz).
- Les images sont redimensionnées/compressées dans le navigateur avant
  envoi (`utils/imageResize.js`).

**Onglet Messages** — lecture et suppression (individuelle ou totale) des
messages du formulaire de contact ; **Télécharger** le PDF de résultat joint.

**Onglet Identifiants** — changement du mot de passe ; liste des **domaines
autorisés** à afficher le lien Administration (enregistrée en base).

## API (aperçu)

| Route | Accès |
|---|---|
| `GET /api/public/config`, `GET /api/public/quiz` | public |
| `POST /api/contact` | public (limité) |
| `POST /api/auth/login` · `logout` · `GET /api/auth/me` | public |
| `POST /api/auth/password` | admin |
| `GET/POST/DELETE /api/admin/files`, `/vendors`, `/banners` | admin |
| `PUT /api/admin/active/{quiz,vendor,banner}` | admin |
| `PUT /api/admin/thresholds`, `/allowed-domains` | admin |
| `GET/DELETE /api/admin/messages`, `GET …/:id/attachment` | admin |

## Format du fichier .docx attendu

Un fichier d'exemple est fourni dans `src/assets/exemple-questions.docx`.

- Chaque **question** est un paragraphe qui commence par un numéro suivi
  de `.` ou `)` : `1. Quelle est la capitale de la France ?`
- Chaque **réponse** est un paragraphe qui commence par une lettre suivie
  de `.`, `)` ou `-` : `A) Paris`
- La ou les **bonnes réponses** doivent être mises en **gras** dans Word.
  - Une seule réponse en gras → réponse unique (boutons radio).
  - Plusieurs réponses en gras → réponses multiples (cases à cocher).

## Structure du projet

```
server/
  index.js              # Express : API + service du front compilé (dist/)
  routes.js             # routes publiques, auth, admin + validation
  db.js                 # schéma SQLite, réglages, éléments "actifs"
  security.js           # scrypt, sessions, cookies, limitation de débit
  seed.js               # valeurs par défaut au premier démarrage
  data/quiz.db          # base SQLite (créée au démarrage, ignorée par git)
src/
  App.vue  main.js      # main.js charge la config publique avant le montage
  router/index.js       # / , /resultats , /admin , /contact , 404
  stores/               # Pinia : quiz (en cours), library, vendors,
                        #   quizBanners, contactMessages, auth  → appels API
  utils/
    api.js              # client HTTP (cookies de session, erreurs)
    docxParser.js       # extraction des questions depuis le .docx
    pdfExport.js        # génération du PDF de résultat
    imageResize.js      # compression des images avant envoi
  views/ components/    # pages publiques, résultats, admin
```

## Déploiement (exemple)

1. `npm ci && npm run build`
2. Variables : `ADMIN_PASSWORD=…`, `COOKIE_SECURE=true`, `TRUST_PROXY=true`,
   `DB_PATH=/var/lib/quiz/quiz.db`
3. `npm start` sous un superviseur (systemd, pm2…), derrière un reverse proxy
   HTTPS (Caddy/nginx) qui redirige vers le port 3000.
4. Sauvegardes régulières du fichier `quiz.db`.

## Aller plus loin

- Un seul compte admin pour l'instant ; plusieurs comptes/rôles nécessiteraient
  une table `users`.
- Envoi réel d'un email à la réception d'un message de contact (SMTP).
- Export CSV des messages ; minuteur par question ; historique des scores.
