# Guide — connecter Gmail à l'admin

Ce guide explique comment créer les identifiants Google nécessaires à la
fonctionnalité "Boîte mail" de l'admin (`/admin/reglages`). C'est une
démarche à faire une seule fois, avec ton compte `mikko.visuel@gmail.com`
— je ne peux pas la faire à ta place (ça nécessite de créer un compte/des
identifiants Google).

Aucun frais : l'API Gmail est gratuite pour ce volume d'usage, pas besoin
d'activer la facturation sur le projet Google Cloud.

## 1. Créer un projet Google Cloud

1. Va sur [console.cloud.google.com](https://console.cloud.google.com/),
   connecte-toi avec `mikko.visuel@gmail.com`.
2. En haut de la page, clique sur le sélecteur de projet → **"Nouveau
   projet"**.
3. Nom du projet : par exemple `Mikko Visuel Admin`. Laisse
   l'organisation par défaut. Clique **"Créer"**.
4. Attends quelques secondes, puis sélectionne ce nouveau projet dans le
   sélecteur en haut (important : toutes les étapes suivantes doivent se
   faire avec ce projet sélectionné).

## 2. Activer l'API Gmail

1. Dans le menu de gauche (☰) → **"API et services"** → **"Bibliothèque"**.
2. Cherche **"Gmail API"**, clique dessus, puis **"Activer"**.

## 3. Configurer l'écran de consentement OAuth

1. Menu ☰ → **"API et services"** → **"Écran de consentement OAuth"**.
2. Type d'utilisateur : **"Externe"** (obligatoire pour un compte Gmail
   personnel, pas un Google Workspace). Clique **"Créer"**.
3. Renseigne :
   - Nom de l'application : `Mikko Visuel Admin`
   - Adresse e-mail d'assistance utilisateur : `mikko.visuel@gmail.com`
   - Logo : optionnel, laisse vide.
   - Coordonnées du développeur : `mikko.visuel@gmail.com`
4. Étape **"Champs d'application" (Scopes)** : clique **"Ajouter ou
   supprimer des champs d'application"**, puis cherche et coche ces trois
   scopes Gmail :
   - `.../auth/gmail.readonly`
   - `.../auth/gmail.send`
   - `.../auth/userinfo.email`
   Google les marque comme "Sensibles"/"Restreints" — c'est normal, on ne
   demande que le strict nécessaire (lire + envoyer, jamais supprimer).
5. Étape **"Utilisateurs test"** : clique **"Ajouter des utilisateurs"**
   et ajoute `mikko.visuel@gmail.com`.

   **C'est l'étape la plus importante du guide** : tant que l'app reste en
   mode **"Testing"** (le mode par défaut, ne clique jamais sur "Publier
   l'application") ET que tu es dans cette liste de testeurs, aucune
   validation Google n'est nécessaire (le processus de validation officiel
   prend plusieurs semaines et n'a aucun intérêt pour un usage strictement
   personnel comme celui-ci). Rester testeur évite aussi que la connexion
   expire au bout de 7 jours.
6. Termine l'assistant ("Retour au tableau de bord").

## 4. Créer les identifiants OAuth

1. Menu ☰ → **"API et services"** → **"Identifiants"**.
2. **"+ Créer des identifiants"** → **"ID client OAuth"**.
3. Type d'application : **"Application Web"**.
4. Nom : `Admin Mikko Visuel`.
5. **"URI de redirection autorisés"** → ajoute ces deux lignes (les deux
   en même temps, pour que ça marche aussi bien en local qu'en ligne) :
   ```
   http://localhost:3000/api/auth/gmail/callback
   https://www.mikkovisuel.fr/api/auth/gmail/callback
   ```
6. Clique **"Créer"**. Une fenêtre affiche ton **ID client** et ta **clé
   secrète (Client Secret)** — garde cette fenêtre ouverte ou copie les
   deux valeurs quelque part, tu en as besoin juste après (la clé secrète
   ne se réaffiche plus telle quelle par la suite, mais tu pourras
   toujours en régénérer une nouvelle si tu la perds).

## 5. Me transmettre les deux valeurs

Une fois que tu as l'**ID client** (se termine par
`.apps.googleusercontent.com`) et la **clé secrète** (commence par
`GOCSPX-`), transmets-les-moi (dans ce chat, ou en me disant où les
trouver si tu préfères les coller toi-même dans un fichier) — je m'occupe
ensuite de :

- les ajouter à ton `.env` local (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
  `GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/gmail/callback`) ;
- les ajouter sur Scalingo en production (même `GOOGLE_CLIENT_ID`/
  `GOOGLE_CLIENT_SECRET`, mais
  `GOOGLE_REDIRECT_URI=https://www.mikkovisuel.fr/api/auth/gmail/callback`) ;
- générer et ajouter `ENCRYPTION_KEY` (une clé technique supplémentaire,
  je la génère moi-même comme je l'avais fait pour `CRON_SECRET`) ;
- tester la connexion de bout en bout et te montrer le résultat.

## Ce que ça permettra, une fois connecté

Depuis la fiche de chaque client (`/admin/clients/[id]`), un bouton
**"Emails"** ouvrira la liste des échanges Gmail avec ce client (trouvés
automatiquement via l'adresse de son compte de connexion), avec la
possibilité de répondre, transférer, ou écrire un nouveau message sans
jamais quitter l'admin.
