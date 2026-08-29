# Quizz en ligne — Vue 3 + Vuetify

Application de quizz à choix multiple organisée en **3 parties** :

- **Publique** (`/`) — les utilisateurs passent le quizz actuellement publié,
  avec un formulaire de contact (`/contact`).
- **Résultats** (`/resultats`) — score, appréciation (Faible/Moyen/Élevé/
  Parfait), export PDF et bouton « Plus d'informations ».
- **Admin** (`/admin`) — protégée par identifiant/mot de passe : gestion des
  questionnaires, des niveaux de score, des bannières (vendeurs et quizz),
  des messages de contact et des identifiants.

## Stack

- Vue 3 (`<script setup>`) + Vue Router
- Vuetify 3
- Pinia (quizz en cours, bibliothèque de fichiers, vendeurs, bannières
  de quizz, messages de contact, session admin)
- [mammoth.js](https://github.com/mwilliamson/mammoth.js) pour lire le `.docx` côté navigateur
- [jsPDF](https://github.com/parallax/jsPDF) pour l'export du résultat en PDF
- [idb](https://github.com/jakearchibald/idb) — petite couche au-dessus d'IndexedDB pour la persistance
- Vite

Tout est **100% côté client** : fichiers importés, bannières, messages de
contact (avec leurs éventuelles pièces jointes PDF) sont stockés dans
**IndexedDB** (pas de base de données serveur ni de backend). Seuls les
petits réglages admin (mot de passe modifié, domaines autorisés) restent
dans le `localStorage`, car ils sont minuscules et bénéficient de sa
simplicité d'accès synchrone. C'est adapté à une démo ou un usage
mono-poste ; voir "Aller plus loin" pour une vraie mise en production
multi-utilisateurs.

### Pourquoi IndexedDB plutôt que localStorage

Le `localStorage` a un quota très restreint (généralement 5 à 10 Mo par
site selon le navigateur) et se remplissait vite dès qu'on y stockait
plusieurs bannières/logos et des PDF de résultat en pièce jointe — d'où le
message *"stockage local plein"* qui pouvait apparaître. **IndexedDB**
n'a pas cette limite arbitraire : son quota dépend de l'espace disque
disponible sur l'appareil (souvent des centaines de Mo au minimum, parfois
beaucoup plus), ce qui le rend nettement plus robuste pour ce cas d'usage.
La compression d'image (`utils/imageResize.js`) reste appliquée pour garder
des temps de chargement rapides et un PDF léger, mais n'a plus besoin
d'être agressive pour éviter un quota serré.

**Auto-réparation du schéma** : `utils/idbKeyval.js` détecte si la base
IndexedDB locale est dans un état incohérent (par exemple un magasin
d'objets manquant, ce qui peut arriver si une base a été créée par une
version antérieure du projet avec un schéma différent) et la recrée
automatiquement avant de réessayer l'opération, sans intervention
manuelle. Si un enregistrement échoue malgré tout, le message d'erreur
technique réel est affiché dans l'onglet admin concerné pour faciliter le
diagnostic, et l'onglet **Identifiants** indique si IndexedDB est
disponible dans le navigateur actuel (il peut être bloqué en navigation
privée, par certains réglages de confidentialité, ou lorsque l'application
est ouverte directement depuis un fichier local plutôt que servie via
`http://`/`https://`).

## Installation

```bash
npm install
npm run dev
```

L'application est servie sur `http://localhost:5173`.

```bash
npm run build
npm run preview
```

## Identifiants admin (par défaut)

```
Identifiant : admin
Mot de passe : quizz2026
```

Le mot de passe peut être changé depuis l'onglet admin **Identifiants**
une fois connecté.

## Sécurité

- **Aucun identifiant ni mot de passe n'est jamais stocké en clair.** Seule
  l'empreinte SHA-256 du mot de passe est conservée (par défaut codée dans
  `src/config/adminAccess.js`, ou remplacée dans le `localStorage` si
  l'admin l'a changée depuis l'onglet Identifiants). La saisie de
  connexion elle-même n'est jamais écrite en `localStorage`/`sessionStorage` —
  uniquement un drapeau booléen `connecté: oui/non`, valable le temps de
  l'onglet et effacé à la fermeture ou via « Déconnexion ».
- **Lien Administration conditionnel** : le lien vers `/admin` n'apparaît
  dans le menu que sur les domaines listés dans l'onglet **Identifiants**
  (par défaut `localhost`/`127.0.0.1`). L'URL `/admin` reste malgré tout
  **accessible directement sur n'importe quel domaine**, toujours protégée
  par le login — cette liste ne fait que masquer/afficher le lien visuel.
- **Gestion des URL invalides** : toute route non reconnue affiche une page
  dédiée avec le message *« You have reached the edge of the internet. Turn
  back before things get weird. »* plutôt qu'une erreur brute.
- ⚠️ Cette authentification reste **côté client**, donc pas une sécurité
  forte à elle seule (le hash est visible dans le bundle JS livré au
  navigateur et reste théoriquement "cassable" hors-ligne). Pour une vraie
  protection en production, il faut déplacer l'authentification vers un
  backend (API + session/JWT) — voir "Aller plus loin".

## Partie publique (`/`)

- Si l'admin n'a publié aucun questionnaire → message **« Quizz non
  disponible »**.
- Sinon, le questionnaire publié est chargé automatiquement et l'utilisateur
  répond question par question.
- Le nom affiché **en haut à gauche** (dans la barre de navigation) est le
  **titre de la bannière de quizz active** (en gras, taille agrandie),
  au lieu d'un libellé générique. Repli sur « Quizz » si aucune bannière
  n'a de titre.
- L'**image** de la bannière du quizz actif (si définie) s'affiche en
  en-tête de la page, y compris sur le message « non disponible ». Le
  titre n'est plus dupliqué sous l'image puisqu'il apparaît déjà en haut
  à gauche.
- Une fois toutes les questions répondues, redirection automatique vers
  `/resultats`.
- Lien **Contact** (`/contact`) toujours visible :
  - la **bannière du vendeur actif** (nom + logo, très agrandie) s'affiche
    en en-tête du formulaire ;
  - champs : prénom, nom, email, question, case RGPD obligatoire ;
  - si l'utilisateur arrive depuis le bouton **« Plus d'informations »**
    de la page résultats, le **PDF de son résultat de quizz est
    automatiquement préparé et affiché en pièce jointe** (avec aperçu),
    sans action supplémentaire de sa part ;
  - à l'envoi, le message **et la pièce jointe éventuelle** sont
    **enregistrés dans un fichier plat** (émulation via IndexedDB,
    voir `stores/contactMessages.js`) et un message de confirmation
    s'affiche à l'écran.

## Partie résultats (`/resultats`)

- Score global (X/Y et %) et **appréciation** (Faible/Moyen/Élevé/Parfait)
  selon les seuils définis par l'admin.
- **Bannière du quizz actif** affichée en en-tête de la page (la même que
  sur la page du quizz, pour une identité visuelle cohérente sur tout le
  parcours de passation).
- Bouton **« Télécharger en PDF »** :
  - texte systématiquement replié + saut de page automatique → aucun
    débordement du cadre imprimable ;
  - en-tête : **uniquement le logo du vendeur, très agrandi** (aucun texte
    de nom associé) ;
  - juste en dessous : une **référence courte** du document, préfixée par
    `Réf : ` suivie du nom du fichier **sans l'extension `.docx`** et de
    **3 caractères alphanumériques aléatoires** (ex. `Réf : culture-generale-a7F`) ;
  - chaque **bonne réponse** est en **gras** et annotée
    **« (bonne réponse) »** ; la réponse choisie par l'utilisateur est
    **soulignée** ;
  - l'espacement entre les caractères des titres de question et des
    réponses est resserré pour un rendu plus compact et lisible.
- Bouton **« Plus d'informations »** : renvoie directement vers le
  **formulaire de contact** (`/contact`). Le PDF du résultat y est
  automatiquement préparé et proposé en pièce jointe (aperçu possible avant
  envoi) ; l'utilisateur n'a plus qu'à compléter ses coordonnées et sa
  question.
- Bouton pour recommencer le même quizz.
- Si aucun quizz n'a été terminé pendant la session, un message invite à
  aller sur la page du quizz.

## Partie admin (`/admin`)

Accès protégé par identifiant/mot de passe (session en `sessionStorage`,
effacée à la fermeture de l'onglet ou via « Déconnexion »).

**Onglet Questionnaires**
- Import d'un ou plusieurs fichiers `.docx` (glisser-déposer ou sélection).
- Bouton **Publier** pour activer un seul fichier de la bibliothèque comme
  quizz public (un seul actif à la fois), **Dépublier** pour le retirer.
- Suppression d'un fichier (avec confirmation).

**Onglet Niveaux de score**
- Seuils **Moyen** et **Élevé** (en %) ; **Faible** commence à 0%,
  **Parfait** correspond toujours à 100%. Aperçu visuel des 4 tranches.

**Onglet Bannières**
- *Bannières vendeurs* : liste de bannières (nom, logo, email de contact),
  une par vendeur/courtier. Une seule est **active** à la fois — utilisée
  sur le formulaire de contact, le bouton « Plus d'informations » et
  l'en-tête du PDF.
- *Bannières du quizz* : liste de bannières (titre + image), une par
  quizz. Une seule est **active** à la fois — son titre s'affiche en haut
  à gauche du site et son image en en-tête de la page publique du quizz.
- Chaque liste permet d'ajouter, d'activer et de supprimer des entrées.
- **Les images sont redimensionnées et compressées côté navigateur**
  (voir `utils/imageResize.js`) avant enregistrement, pour des temps de
  chargement rapides et un PDF léger — sans avoir besoin d'être agressif
  sur la qualité puisque le stockage se fait désormais dans **IndexedDB**
  (voir plus haut).
- Si le stockage venait malgré tout à saturer (disque de l'appareil presque
  plein), un message d'erreur explicite s'affiche dans l'onglet concerné,
  et l'onglet **Identifiants** propose un panneau **Stockage local**
  indiquant l'espace utilisé/quota disponible, avec un bouton pour tout
  vider en un clic si besoin.

**Onglet Messages**
- Lecture des messages envoyés via le formulaire de contact (le "fichier
  plat", désormais stocké dans IndexedDB), avec suppression individuelle
  ou totale.
- Lorsqu'un message inclut le **PDF de résultat joint** (envoyé depuis
  « Plus d'informations »), il apparaît sous le message avec un bouton
  **Télécharger** pour le récupérer.

**Onglet Identifiants**
- Changement du mot de passe admin (vérification de l'ancien mot de passe,
  nouveau mot de passe de 6 caractères minimum).
- Gestion de la liste des **domaines autorisés** à afficher le lien
  Administration dans le menu (ajout/suppression de domaines, ex.
  `localhost`, un nom de domaine de test, etc.).
- Panneau **Stockage local** : estimation de l'espace utilisé par
  l'application (IndexedDB) et du quota disponible sur l'appareil (via
  l'API `navigator.storage.estimate()`), avec un bouton pour tout vider
  (questionnaires, bannières, messages, seuils, mot de passe personnalisé)
  en cas de besoin.

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
src/
  App.vue                        # barre de navigation + <router-view>
  main.js
  router/index.js                # routes : / , /resultats , /admin , /contact , 404
  config/adminAccess.js          # identifiant/hash/domaines admin par défaut
  plugins/vuetify.js             # thème Vuetify personnalisé
  stores/
    quiz.js                      # état du quizz en cours (réponses, score)
    library.js                   # bibliothèque de fichiers, fichier publié, seuils
    vendors.js                   # liste de bannières vendeurs + vendeur actif
    quizBanners.js               # liste de bannières de quizz + bannière active
    contactMessages.js           # messages du formulaire de contact ("fichier plat")
    auth.js                      # session admin, changement mdp, domaines autorisés
  utils/
    docxParser.js                # extraction des questions depuis le .docx
    pdfExport.js                 # génération du PDF de résultat (save + blob)
    imageResize.js               # compression des images avant stockage
    idbKeyval.js                 # petite couche IndexedDB (get/set/delete/clear)
    storageUsage.js              # estimation d'usage + suppression des données de l'app
  views/
    PublicQuizView.vue           # partie publique
    ResultsView.vue              # partie résultats (garde d'accès)
    AdminView.vue                # partie admin (gate login + onglets)
    ContactView.vue              # formulaire de contact public
    NotFoundView.vue             # page 404 ("edge of the internet")
  components/
    OrgBanner.vue                 # bannière du vendeur actif (formulaire contact, résultats)
    QuizBanner.vue                # bannière du quizz actif (page du quizz)
    QuizPlayer.vue                # déroulé question par question
    QuizResults.vue               # score + appréciation + PDF + "Plus d'informations"
    admin/
      AdminLogin.vue
      AdminUploader.vue           # import multi-fichiers
      AdminFileList.vue           # bibliothèque, publier/dépublier/supprimer
      AdminThresholds.vue         # configuration des seuils de score
      AdminVendorBanners.vue      # liste de bannières vendeurs
      AdminQuizBanners.vue        # liste de bannières de quizz
      AdminMessages.vue           # lecture/suppression des messages de contact
      AdminCredentials.vue        # changement mdp + domaines admin autorisés
  assets/
    exemple-questions.docx        # fichier de démonstration
```

## Aller plus loin (mise en production)

- Remplacer l'authentification codée en dur par un vrai backend
  (API + hachage du mot de passe + session/JWT).
- Remplacer IndexedDB (fichiers, bannières, messages) par une vraie base de
  données serveur si plusieurs administrateurs ou plusieurs postes doivent
  partager les mêmes données (IndexedDB reste local à chaque navigateur).
- Ajouter un export CSV/Excel des messages de contact.
- Ajouter un minuteur par question ou global.
- Conserver un historique des scores par utilisateur.
