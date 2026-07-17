# Cahier des charges — Site Mikko Visuel

> Document vivant. Il reflète le cahier des charges d'origine (Google Drive,
> `Cahier des charges Mikko Visuel.docx`) **et** toutes les modifications
> demandées à Claude Code au fil du projet. Il est mis à jour systématiquement
> à chaque nouvelle demande de fonctionnalité ou changement de scope, pour
> rester la référence unique de ce qui a été décidé.

## Contexte

Mikko Visuel est un graphiste freelance (micro-entreprise). Le site combine
trois volets, par ordre de priorité :

1. **Portfolio public** — vitrine du travail, organisée en 5 piliers.
2. **Espace client** (module le plus important du projet) — validation des
   BAT, suivi, livrables, documents administratifs, paiement.
3. **Backend interne** de gestion clients/tâches/documents, sans dépendance
   tierce (explicitement pas de Notion — base de données native).

Le site est 100% en français, entièrement responsive, avec une direction
artistique premium (pas de template générique).

## Direction artistique (Figma "Mikko Visuel 2026", planche "DA")

Depuis le 2026-07-14, la DA officielle du client (récupérée depuis Figma) est
appliquée à l'ensemble du site :

- **Logo** : personnage illustré façon sticker + lettering manuscrit "Mikko
  Visuel" (remplace l'ancien wordmark texte seul), assets dans `public/brand/`.
- **Palette** : accent principal citron `#dded2e` (fixe, même valeur en clair
  et sombre). Orange `#f18a2f`, violet `#84239f`, bleu-sarcelle `#1e8993` en
  touches décoratives ponctuelles uniquement (pas de mapping par pilier).
- **Typographie** : Clash Display (Fontshare, auto-hébergée) pour les titres,
  Manrope conservée pour le corps de texte.
- **Favicon** : tête du personnage seule.
- Les badges/stickers manuscrits par activité vus sur la planche DA
  ("Flyers Club", "Photos Club", etc.) ne sont pas repris pour l'instant —
  piste future si le client le souhaite.
- Icône calendrier des champs de date en citron (2026-07-16) : l'icône native
  du sélecteur de date (`<input type="date">`, ex. "Date de l'évènement" /
  "Échéance") était grise par défaut ; recolorée en citron (accent DA) via
  `::-webkit-calendar-picker-indicator` dans `globals.css`. Chromium
  uniquement (pas d'équivalent Firefox pour ce pseudo-élément).
- Contrôle d'upload de fichiers explicite (2026-07-16) : le champ natif
  `<input type="file">` (bouton minimal + texte "aucun fichier choisi" peu
  visible) remplacé partout par un composant partagé `FilePicker` — bouton
  "Choisir un fichier(s)" avec icône, et fichiers sélectionnés listés en
  chips (nom, taille, retrait avant envoi) plutôt que la mention native peu
  visible. Deux options maquettées et proposées (zone glisser-déposer vs
  bouton compact + liste) ; la seconde a été retenue pour rester compacte
  dans les formulaires existants. Appliqué aux 5 endroits où l'admin/le
  client dépose des fichiers : livrables de tâche, documents administratifs,
  médias et couverture de pilier du portfolio, pièces jointes du client sur
  "Nouvelle demande".

## 1. Portfolio public

- 5 piliers : **Flyers Club, Motion Design, Direction Artistique, Photos
  Club, Vidéo Aftermovies**.
- Administrable depuis le backend, sans toucher au code : ajout/suppression
  de piliers, ajout/suppression/réorganisation de photos et vidéos par
  pilier.
- Page d'accueil : grille bento (5 tuiles) qui bascule en grille simple si le
  nombre de piliers est différent de 5.
- Page de détail par pilier : filtres **Tous / Photos / Vidéos**.
- **Formats des médias uploadés** (précisé le 2026-07-14) :
  - Photos : format **3:4** ou **9:16**, au choix de l'admin à l'ajout.
  - Vidéos : toujours au format **9:16** (imposé automatiquement, pas de
    choix côté formulaire).
  - Chaque tuile de la grille de détail épouse le format propre à son média
    (donc une ligne peut mélanger des tuiles 3:4 et 9:16).
- Visuels du Hero administrables (2026-07-16) : les deux photos sous le
  bouton "Voir le travail" (composant `HeroVisual`) étaient codées en dur
  (placeholders Picsum) — corrigé sur le même principe que les couvertures
  de pilier (nouveau modèle singleton `HomepageHero`, upload via
  `/admin/portfolio`, section "Page d'accueil" en tête de page). Tant
  qu'aucune image n'est uploadée pour un emplacement, le placeholder Picsum
  d'origine reste affiché (dégradation propre, pas de page cassée). Tailles
  conseillées : image principale 1200×900 px (ratio 4:3), image de détail
  600×800 px (ratio 3:4) — voir aussi le récapitulatif complet des visuels
  de la page d'accueil communiqué au client le 2026-07-16.
- Textes de l'accueil administrables (2026-07-17) : le titre/sous-titre/
  texte du bouton du Hero, ainsi que le titre/sous-titre de la section
  portfolio, étaient codés en dur. Même principe que les visuels
  ci-dessus : nouveau modèle singleton `HomepageContent`, formulaire dans
  `/admin/portfolio` sous "Textes de l'accueil". Un champ laissé vide
  restaure le texte par défaut d'origine (pas de page cassée). Les titres/
  descriptions de chaque pilier restaient déjà modifiables (voir plus haut) —
  ce point ne couvrait que les deux blocs de titre de la page d'accueil.
- Entrée en rotation 3D + balancement perpétuel des visuels du Hero
  (2026-07-17) : les deux images sous le bouton "Voir le travail"
  (`HeroVisual`) jouaient un simple fondu + glissement vertical à
  l'affichage — remplacé par une entrée en rotation 3D (`rotateY` + léger
  zoom, via Motion), chaque image pivotant depuis un angle opposé à
  l'autre (effet miroir) jusqu'à se stabiliser bien en face. Une fois
  l'entrée terminée, un léger balancement perpétuel prend le relais
  (rotation 2D en boucle, amplitude ~2-2,5°, durées légèrement différentes
  entre les deux images pour ne pas être parfaitement synchronisées) — via
  des transitions par-propriété Motion (`rotateY`/zoom en une fois,
  `rotate` en boucle infinie décalée). Entièrement désactivé si
  l'utilisateur préfère moins d'animations (`useReducedMotion`, déjà en
  place).
- Aperçus vidéo autoplay + limite de taille retirée (2026-07-17) : sur la
  page de détail d'un pilier (`/portfolio/[slug]`), les vidéos uploadées ne
  se lançaient pas automatiquement (attribut `muted` manquant, bloqué par
  les navigateurs). Corrigé avec un nouveau composant `PortfolioVideo`
  (muet, en boucle, `playsInline`) piloté par IntersectionObserver pour ne
  jouer que les vidéos réellement visibles à l'écran. Limite de 50 Mo par
  vidéo (`src/lib/actions/portfolio.ts`) supprimée à la demande du client
  (voir plus bas pour la suite : ce point a été révisé le jour même après un
  incident en production) ; format QuickTime (`.mov`) ajouté aux formats
  vidéo acceptés en plus de MP4/WebM, pour corriger un rejet d'upload
  signalé sur le pilier Vidéo Aftermovies.
- Signalement (2026-07-17, en production) : après le correctif ci-dessus,
  une vidéo réellement uploadée par le client sur le pilier Motion Design
  affichait toujours une icône de lecture barrée sur mobile (Safari iOS) —
  cause distincte du problème `muted` déjà corrigé. `/api/portfolio-media/
  items/[itemId]` chargeait le fichier entier en mémoire et ne répondait
  jamais aux requêtes `Range` ; or Safari mobile refuse purement et
  simplement de lire une vidéo si le serveur ne répond pas en `206 Partial
  Content` à ce type de requête (contrairement aux navigateurs desktop, plus
  tolérants). Corrigé en alignant cette route sur `/api/fichiers/
  livrables/[id]` (déjà réparée le 2026-07-16 pour la même raison) :
  streaming + support `Range`. Nouveau champ `sizeBytes` sur
  `PortfolioMediaItem` (absent à la création du modèle), renseigné pour les
  nouveaux envois et rétro-rempli automatiquement à la première requête pour
  les médias déjà en ligne (dont la vidéo signalée), sans ré-upload
  nécessaire côté client.
- Signalement (2026-07-17, en production) : tentative d'upload d'une vidéo
  sur le pilier Vidéo Aftermovies renvoyant "This page couldn't load"
  (erreur générique navigateur). Diagnostiqué via les logs serveur
  (`scalingo logs`) : le conteneur de production a été tué par manque de
  mémoire (`Killed`, redémarrage automatique) au moment de l'upload.
  Cause : l'upload charge actuellement le fichier entier en mémoire (pas de
  streaming), et la suppression de la limite de 50 Mo plus tôt dans la
  journée a supprimé le seul garde-fou empêchant ça sur un conteneur
  d'environ 1 Go de RAM. Le client a choisi, parmi 3 options proposées
  (upload en streaming, conteneur plus gros, plafond recalibré), de
  réintroduire un plafond, plus généreux qu'avant : **200 Mo maximum par
  vidéo** (`MAX_VIDEO_SIZE` dans `src/lib/actions/portfolio.ts`). Le passage
  en upload streaming (vraiment "sans limite", sans risque mémoire) reste
  une amélioration possible plus tard si le besoin de vidéos plus lourdes se
  confirme — voir "Points encore ouverts".

## 2. Espace client

- Accès sécurisé par compte (email + mot de passe), un compte par client.
- 7 onglets (2026-07-16 : ajout d'**Accueil** en tête ; 2026-07-17 : ajout de
  **Calendrier** et **Suggestion**, voir plus bas) :
  **Accueil / À valider / Suivi / Calendrier / Livrables / Administratif /
  Suggestion**.
- Cycle de statut d'une tâche (confirmé par le client le 2026-07-13, ne pas
  rediscuter sauf demande explicite) :
  `Nouveau → En cours → À valider → BAT validé / À modifier → Terminé`
- Workflow de validation/refus des BAT par le client.
- Paiement en ligne (Stripe Checkout), montants en EUR.
- Préférence de thème clair/sombre par compte, mémorisée.
- Notifications email aux étapes clés (dégradé proprement en log console si
  pas de clé Resend configurée). **Resend branché et domaine `mikkovisuel.fr`
  vérifié le 2026-07-17** (compte créé par le client, domaine vérifié via 4
  enregistrements DNS ajoutés dans la zone OVH — DKIM, MX + TXT SPF sur le
  sous-domaine `send`, DMARC — sans toucher aux enregistrements MX existants
  sur `@`, qui restent la messagerie OVH du client). `RESEND_API_KEY`
  configurée sur Scalingo. Testé de bout en bout avec un vrai envoi depuis
  le formulaire de contact public, reçu avec succès. Les emails transitent
  désormais réellement, ce n'est plus juste un log console.
- Upload des livrables (ajusté le 2026-07-14) : plusieurs fichiers à la fois,
  jusqu'à 500 Mo par fichier (au lieu de 1 fichier / 20 Mo). Les documents
  administratifs (devis/contrat/facture) restent à 20 Mo, toujours 1 fichier
  à la fois — ce sont de simples PDF, pas de gros fichiers de livraison.
- Statut de paiement d'un document modifiable manuellement par l'admin
  (ajouté le 2026-07-14) : bouton "Marquer comme payée"/"impayée" sur
  `/admin/documents`, pour les paiements reçus hors Stripe (virement,
  chèque, espèces...) ou pour corriger une erreur.
- Gestion des documents enrichie (2026-07-14) : documents visibles aussi
  sur la fiche de chaque client (pas seulement dans la liste globale) ;
  filtres par client/type/statut sur `/admin/documents` ; échéance
  optionnelle sur un document et bouton "Envoyer une relance" (email
  manuel, pas de relance automatique — pas d'infra de tâche planifiée dans
  ce projet) ; tag "En retard" si échéance dépassée et toujours impayé.
- Gestion des tâches enrichie (2026-07-14) : échéance de livraison
  distincte de la date de l'évènement, avec tag "En retard" (échéance
  dépassée et statut différent de "Terminé") ; filtres client/statut et tri
  par date d'évènement la plus proche sur `/admin/taches` ; page de
  modification d'une tâche existante (`/admin/taches/[taskId]` — titre,
  description, date de l'évènement, échéance, types, formats).
- Vues de gestion des tâches façon Notion (2026-07-14) : `/admin/taches`
  propose désormais plusieurs vues (onglets `Liste` / `Kanban` / `Calendrier` /
  `Par client`, + `Archivées` depuis l'ajout de l'archivage — voir plus bas),
  inspirées de la façon dont le client pilote sa production dans sa
  base Notion "TASKS" personnelle. Le Kanban permet de glisser-déposer une
  tâche d'une colonne de statut à l'autre (ou de changer le statut via le
  menu déroulant existant). Le Calendrier affiche les tâches par échéance,
  avec une section "Sans échéance" pour ne pas en perdre. Décision explicite
  de ne **pas** rouvrir à cette occasion le cycle des 6 statuts verrouillé le
  2026-07-13, ni d'ajouter un champ "Personne assignée" (un seul compte admin
  existe). Toujours sans pont API vers Notion — base de données native
  inchangée, seules les vues s'en inspirent.
- Vue `Liste` en tableau compact (2026-07-14) : les cartes empilées ont été
  remplacées par un vrai tableau à colonnes (Évènement / Échéance / Client /
  Tâche / Type / Formats / Statut / Modifier — Type et Formats séparés, dates
  en premières colonnes) pour scanner beaucoup de tâches d'un coup d'œil.
  Dates au format court (16/07/2026). Colonnes Évènement/Échéance/Client/
  Tâche/Statut triables en cliquant l'en-tête (bascule croissant/décroissant).
  Les vues Kanban/Calendrier/Par client et la liste des tâches sur la fiche
  client gardent l'affichage en cartes, plus adapté à ces contextes.
- Tâches "Terminées" isolées + couleur du statut (2026-07-17) : sur la vue
  `Liste`, les tâches "Terminé" étaient mélangées avec les tâches actives —
  désormais séparées en deux tableaux, les tâches actives en premier et les
  tâches terminées regroupées en dessous sous un intitulé "Terminées (n)"
  (n'affiché que s'il y en a). Couleur du statut "Terminé" changée de
  violet à vert (`emerald`, la seule teinte verte de la palette figée —
  déjà utilisée par "BAT validé"). Changement de couleur propagé via le
  script de seed (idempotent, `prisma/seed.ts`), pas une migration de
  schéma.
- Résumé d'activité + création rapide (2026-07-14) : le tableau de bord
  (`/admin`) affiche désormais, sous le total de tâches, le nombre en retard
  (lien vers la liste triée par échéance) et le nombre "à valider" (lien
  filtré) quand ils sont non nuls. Bouton "Nouvelle tâche" ajouté sur
  `/admin/taches`, ouvrant `/admin/taches/nouveau` avec un sélecteur de
  client — jusqu'ici la création ne se faisait que depuis la fiche client.
- Suppression de livrables + archivage/suppression de tâche (2026-07-14),
  pour limiter le stockage en ligne et gérer les tâches abandonnées par un
  client : bouton "×" par livrable (efface le fichier du stockage, pas
  seulement la ligne en base). Sur la page d'une tâche
  (`/admin/taches/[taskId]`), boutons "Archiver"/"Désarchiver" (nouveau champ
  `archivedAt`, séparé du cycle de statut — pas de 7ᵉ statut "Abandonné" pour
  ne pas rouvrir la décision du 2026-07-13) et "Supprimer définitivement"
  (efface aussi les livrables du stockage). Une tâche archivée disparaît de
  toutes les vues actives (`/admin/taches`, fiche client, espace client) et
  n'apparaît que dans le nouvel onglet `Archivées` ; l'export CSV des tâches
  garde tout, avec une colonne "archivee".
- Livrables consolidés sur la page de la tâche (2026-07-15) : l'ajout/
  suppression de livrables, auparavant uniquement sur la fiche client, se
  fait désormais depuis `/admin/taches/[taskId]` (un seul endroit pour gérer
  une tâche : champs, archivage, livrables).
- Rappel d'échéance pour une tâche en retard (2026-07-15) : lien "Rappel" sur
  la vue `Liste` (à côté du tag "en retard"), symétrique du bouton "Envoyer
  une relance" des documents impayés — email manuel au client, nouveau champ
  `lastReminderAt`, toujours pas de tâche planifiée dans ce projet.
- Recherche + filtres Type/Format sur la vue `Liste` (2026-07-15) : champ
  "Rechercher" (titre) et sélecteurs Type/Format, en plus des filtres Client/
  Statut existants. Scope volontairement limité à la vue `Liste`.
- Aperçu visuel des livrables + pièces jointes du client (2026-07-15) :
  auparavant le client validait/refusait un BAT ("À valider") sans jamais
  voir le fichier proposé — l'onglet n'affichait aucun livrable. Corrigé :
  les livrables déjà déposés s'affichent désormais sur "À valider" comme sur
  "Livrables", avec vignette pour les images (composant `FileGrid` partagé,
  téléchargement en `inline` pour les images côté API plutôt que forcé en
  téléchargement). Le client peut aussi joindre des fichiers de référence
  (moodboard, logo...) en soumettant "Nouvelle demande" — nouveau modèle
  `Attachment`, distinct de `Deliverable` pour ne pas mélanger les
  références du client avec le travail livré par Mikko ; visibles et
  supprimables côté admin sur `/admin/taches/[taskId]`, section "Pièces
  jointes du client". Un pop-up de confirmation ("Merci, votre demande a été
  prise en compte.") s'affiche après l'envoi d'une nouvelle demande.
- Aperçus enrichis dans `FileGrid` (2026-07-16), sur les 3 emplacements qui
  l'utilisent (`/espace-client/livrables`, `/espace-client/a-valider`,
  `/admin/taches/[taskId]`) : taille et date affichées sous chaque fichier
  (`sizeBytes`/`uploadedAt`, déjà en base) ; icône différenciée par type
  (PDF, vidéo, zip) au lieu de l'icône générique unique ; aperçu en lightbox
  au clic (image en grand, PDF dans le lecteur natif du navigateur, vidéo
  lue directement) plutôt qu'ouverture d'onglet ou téléchargement forcé ;
  vignette vidéo (première frame, via fragment `#t=0.1`, sans génération
  serveur) avec pastille de lecture. Prérequis technique : la route de
  téléchargement des livrables (`/api/fichiers/livrables/[id]`) supporte
  désormais les requêtes `Range` et sert les fichiers en flux plutôt qu'en
  mémoire, pour permettre la lecture/défilement de vidéos jusqu'à 500 Mo
  sans tout charger d'un coup.
- Suggestions expérience client (2026-07-16, les 4 retenues) : jusqu'ici le
  client atterrissait directement sur l'onglet "À valider" sans vue
  d'ensemble, et la nav n'indiquait ni l'onglet actif ni ce qui nécessitait
  une action.
  - **Page d'accueil** (`/espace-client`, nouvelle redirection après
    connexion) : 3 cartes résumé (tâches à valider, prochaine échéance,
    montant impayé) + liste des tâches actives (hors "Terminé"/archivées)
    avec leur timeline de statut.
  - **Compteurs sur les onglets** : badge citron sur "À valider" (nombre de
    tâches en attente) et "Administratif" (nombre de documents impayés),
    masqué à zéro.
  - **Onglet actif surligné** dans la nav (`ClientNavTabs`, via
    `usePathname`) — absent jusqu'ici.
  - **Timeline de statut visuelle** (`TaskStatusTimeline`) remplaçant le
    badge coloré plat sur "Suivi" et la page d'accueil : les 6 statuts
    verrouillés se replient sur 4 étapes (Nouveau / En cours / À valider /
    Terminé), "BAT validé" et "À modifier" étant deux issues de l'étape "À
    valider" (validée vs à corriger — ce dernier cas affiché en rouge avec
    le motif de refus, sans réouvrir le cycle de statut verrouillé le
    2026-07-13).
- Correctif upload de livrables volumineux (2026-07-16) : l'upload de
  fichiers de plus de 10 Mo (vidéos notamment) échouait ("Unexpected end of
  form") malgré la limite de 500 Mo déjà configurée pour les Server Actions
  (`bodySizeLimit`). Cause distincte : `src/proxy.ts`, qui intercepte toutes
  les requêtes `/admin/*` et `/espace-client/*`, bufferise le corps de la
  requête à 10 Mo par défaut dans cette version de Next.js
  (`proxyClientMaxBodySize`), indépendamment de la limite des Server
  Actions — le fichier était tronqué avant même d'atteindre l'action
  d'upload. Corrigé en alignant `proxyClientMaxBodySize` sur `bodySizeLimit`
  (2 Go) dans `next.config.ts`. Vérifié avec un upload réel de 15 Mo.
- Formulaire de contact public branché sur un vrai envoi d'email
  (2026-07-17) : `ContactSection` simulait l'envoi (attente factice, aucun
  email réel) — corrigé avec une Server Action (`submitContactForm`) qui
  envoie le message à l'adresse admin courante (compte `Admin` en base,
  `mikko.visuel@gmail.com` actuellement).
- Calendrier admin basé sur la date de l'évènement (2026-07-17) : la vue
  `Calendrier` de `/admin/taches` groupait les tâches par échéance de
  livraison interne, pas par date d'évènement client — corrigé
  (`groupTasksByEventDate`), avec le statut de la tâche affiché en plus du
  titre sur chaque case du calendrier (pas seulement la pastille de
  couleur).
- Section "Suggestion" côté espace client (2026-07-17) : nouvel onglet
  (`/espace-client/suggestion`) avec un simple message texte envoyé par
  email à l'admin, pour du feedback sur l'expérience utilisateur de
  l'espace client.
- Fil de commentaires par tâche (2026-07-17) : nouveau modèle
  `TaskComment` (auteur, nom, date, message), affiché et alimentable à la
  fois sur la fiche tâche admin (`/admin/taches/[taskId]`) et sur une
  nouvelle page de détail tâche côté client
  (`/espace-client/taches/[taskId]`, accessible depuis "Suivi" et "À
  valider"). Permet de discuter d'une tâche sans passer par email.
- Vue calendrier côté espace client (2026-07-17) : `TaskCalendarView`
  (jusqu'ici réservé à `/admin/taches`) généralisé avec des props
  `basePath`/`taskBasePath`, et réutilisé sur une nouvelle page
  `/espace-client/calendrier` — mêmes demandes classées par date
  d'événement, avec titre et statut, mais scopées au client connecté (pas
  de filtre client/statut, inutile ici) et pointant vers les fiches tâche
  de l'espace client plutôt que celles de l'admin.
- Email de confirmation à la validation d'un BAT (2026-07-17) :
  `validateTask` n'envoyait jusqu'ici aucun email (seul le refus en
  envoyait un). Corrigé : à la validation, un email "Validation du BAT
  faite !" part à la fois vers l'admin et vers le compte client qui a
  validé, avec récapitulatif de la tâche, noms des livrables validés, date
  et nom de l'utilisateur.

## 3. Backend interne (admin)

- Gestion des clients, tâches, documents, sans outil tiers.
- Export CSV (clients, tâches).
- Listes déroulantes administrables (statuts, types de document, catégories
  portfolio, type de tâche, formats de tâche), avec éléments verrouillés
  quand le cahier des charges fixe une liste fermée (ex. les 6 statuts de
  tâche).
- Un seul compte admin (Mikko), pas de route d'inscription dans le code.
- Lien de connexion admin discret en bas de la page d'accueil (ajouté le
  2026-07-14), menant à `/admin/connexion`.
- **Champs de tâche** (ajoutés le 2026-07-14, migrés depuis le planning
  Notion du client) : date de l'évènement, Type (choix multiple : Vidéo,
  Photo, Graphisme, Montage, Flyer, Motion, 3D, PSD) et Formats (choix
  multiple : 4:5, 9:16, 16:9, 15x15, 1:1, PNG, Custom, Logo). Saisissables à
  la création d'une tâche (admin et formulaire de demande client), affichés
  dans la gestion des tâches admin. Listes ouvertes, extensibles depuis
  `/admin/listes`.
- Retour à la liste après modification d'une tâche (2026-07-17) : le
  formulaire d'édition sur `/admin/taches/[taskId]` ("Enregistrer")
  renvoyait vers la fiche client, ce qui cassait le fil "je scanne la liste,
  je modifie une tâche, je reviens à la liste" — redirige désormais vers
  `/admin/taches`.
- Pièces jointes ajoutables côté admin (2026-07-17) : jusqu'ici seul le
  client pouvait déposer des pièces jointes de référence (à la création
  d'une demande) ; l'admin ne pouvait que les consulter/supprimer.
  `uploadAttachment` (miroir de `uploadDeliverable`) permet désormais à
  l'admin d'en ajouter directement depuis la fiche tâche, section
  "Pièces jointes" (toujours affichée, plus seulement quand il y en a déjà).
- Résumé d'activité "depuis votre dernière connexion" (2026-07-17) : le
  tableau de bord (`/admin`) affiche désormais, sous les compteurs
  existants, ce qui s'est passé depuis la dernière connexion admin — BAT
  validés, refus (avec motif), nouvelles demandes clients, nouveaux
  commentaires clients (les 4 catégories retenues sur 5 proposées). Chaque
  entrée pointe vers la tâche concernée. Nécessite le suivi de connexion
  admin (nouveaux champs `Admin.lastLoginAt`/`previousLoginAt`, ce dernier
  étant le curseur de comparaison — capturé à la connexion, avant d'être
  écrasé par l'heure de la session en cours) et un nouveau champ précis
  `Task.refusedAt` (miroir de `batValidatedAt`, jusqu'ici seul le champ
  `updatedAt`, trop générique, existait pour dater un refus). Rien ne
  s'affiche à la toute première connexion (pas de point de comparaison).
- Modification de mot de passe côté client + réinitialisation côté admin
  (2026-07-17) : le client peut désormais changer son mot de passe en étant
  connecté (mot de passe actuel + nouveau + confirmation), depuis un nouveau
  lien "roue crantée" dans l'en-tête de l'espace client
  (`/espace-client/compte`) — pop-up de confirmation à la validation, même
  composant modal que "Nouvelle demande". Distinct du parcours "mot de passe
  oublié" existant (celui-ci ne demande pas le mot de passe actuel, part
  d'un lien email). Côté admin, un bouton "Réinitialiser le mot de passe" a
  été ajouté à côté de chaque compte de connexion sur la fiche client
  (`/admin/clients/[clientId]`) : envoie le même email de réinitialisation
  que le formulaire public, sans que l'admin ait à ressaisir l'email du
  client.
- **Incident de sécurité, découvert et corrigé le 2026-07-17** : pour
  propager le changement de couleur du statut "Terminé" (ci-dessus) en
  production, `prisma/seed.ts` a été relancé sur la base réelle — son
  commentaire affirmait qu'un garde-fou empêchait la création du compte de
  démonstration hors développement local, mais ce garde-fou n'existait pas
  réellement. Conséquence : un compte `demo@client.test` / `demo-password`
  (identifiants publics, présents dans le code source) a été créé sur la
  base de production, à côté des vrais clients, pendant environ 10 minutes.
  Repéré immédiatement après l'exécution du script, sans tâche ni document
  créé sur ce compte entre-temps. Corrigé dans la foulée : compte supprimé
  de la production, garde-fou réel ajouté à `seedDemoClient()` (ce script
  refuse maintenant de s'exécuter si `DATABASE_URL` n'est pas du SQLite
  local). Aucune action nécessaire de votre côté.

## Décisions techniques déléguées à Claude Code

Le client a explicitement délégué ces choix :

- **Hébergement** : Scalingo (écarté OVH VPS — gestion manuelle trop lourde
  pour ce besoin). RGPD/hébergement UE. Mis en ligne le 2026-07-17,
  addon PostgreSQL "Starter 512M". Domaine mikkovisuel.fr actif depuis le
  2026-07-17 (`www.mikkovisuel.fr` en CNAME vers Scalingo, `mikkovisuel.fr`
  redirigé vers `www.` via la redirection déjà existante chez OVH,
  certificat SSL généré automatiquement par Scalingo).
- **Stockage des fichiers** : disque local en dev (`./storage`, gitignored),
  bascule vers S3 en production (garde-fou dans `src/instrumentation.ts`
  qui refuse de démarrer en prod sans S3 configuré, Scalingo ayant un
  disque éphémère). Fournisseur retenu : **OVH Object Storage**
  (conteneur `marked-reines`, région Gravelines/GRA, 1-AZ Standard) —
  Scalingo n'a pas d'addon de stockage natif, et le client avait déjà un
  compte OVH pour le nom de domaine. Correctif du 2026-07-17 : les envois
  de fichiers échouaient en production (`SignatureDoesNotMatch`) à cause
  d'une incompatibilité connue entre les versions récentes du SDK AWS S3
  et l'implémentation d'OVH ; `@aws-sdk/client-s3` fixé à la version
  3.726.1 (la dernière compatible d'après OVH), vérifié par un envoi réel.
- **Base de données** : bascule de SQLite (dev initial) vers PostgreSQL
  effectuée le 2026-07-17 pour la mise en ligne (voir migration
  `20260717000000_init_postgres`). Le dev local tourne désormais aussi sur
  PostgreSQL (installé via Homebrew), plus sur SQLite.
- **Cycle de statut des tâches** : proposé par Claude Code, confirmé par le
  client le 2026-07-13 (voir ci-dessus).

## Points encore ouverts

- Contenu détaillé de la page Contact.
- Contenu des Conditions de vente / grille tarifaire (actuellement : "tarifs
  et modalités établis au cas par cas").
- Délai de livraison du projet (non précisé).
- Assets réels (photos/flyers/vidéos de Mikko) — le portfolio est actuellement
  seedé avec des placeholders Picsum, à remplacer via l'admin (y compris,
  depuis le 2026-07-16, les 2 photos du Hero — voir section "Portfolio
  public").
- Upload vidéo en streaming (2026-07-17) : la limite de 200 Mo par vidéo est
  un plafond calibré pour la RAM du conteneur actuel, pas une limite
  définitive — repasser en upload streaming (jamais tout le fichier en
  mémoire) permettrait de la lever sans risque si des vidéos plus lourdes
  deviennent nécessaires. Non fait par choix du client (option "plafond"
  retenue plutôt que "streaming" ou "conteneur plus gros").

## Journal des modifications demandées

| Date | Demande | Traitement |
|---|---|---|
| 2026-07-13 | Cahier des charges initial transmis | Scope ci-dessus, 3 volets |
| 2026-07-13 | Confirmation du cycle de statut de tâche | Cycle figé, non rediscuté |
| 2026-07-13 | Recommandation d'hébergement | Scalingo retenu (vs OVH) |
| 2026-07-13 | Construction du backend (espace client + admin) | Livré |
| 2026-07-13 | Administration du portfolio depuis le backend | Livré (piliers/médias en base, CRUD admin) |
| 2026-07-14 | Bouton de connexion admin en bas de la page d'accueil | Livré (lien "Admin" dans le pied de page) |
| 2026-07-14 | Formats photo 3:4/9:16, vidéo 9:16 imposé | Livré (champ `aspectRatio` par média, sélecteur à l'upload pour les photos) |
| 2026-07-14 | Récupération et application de la DA officielle (Figma "Mikko Visuel 2026", planche "DA") | Livré : logo, favicon, palette (citron en accent principal), Clash Display pour les titres — voir section "Direction artistique" ci-dessus |
| 2026-07-14 | Ajout date de l'évènement + Type + Formats sur les tâches (options reprises du planning Notion du client) | Livré : nouveaux champs sur les tâches, choix multiple dans le formulaire de demande, affichage dans la gestion des tâches admin |
| 2026-07-14 | Retirer la limite de taille des livrables + upload multi-fichiers | Livré : 500 Mo par fichier (au lieu de 20 Mo), plusieurs fichiers en un seul envoi — voir section "Espace client" |
| 2026-07-14 | Pouvoir changer le statut d'un document (ex. "payée") manuellement | Livré : bouton bascule payée/impayée sur `/admin/documents` |
| 2026-07-14 | Documents sur la fiche client + filtres + échéance/relance | Livré : les 3 suggestions proposées — voir section "Espace client" |
| 2026-07-14 | Échéance de tâche + filtres/tri + édition d'une tâche existante | Livré : les 3 suggestions proposées — voir section "Espace client" |
| 2026-07-14 | Rapprocher la gestion des tâches du fonctionnement de la base Notion "TASKS" du client (plutôt qu'un pont API) | Livré : vues Kanban/Calendrier/Par client sur `/admin/taches`, en gardant les 6 statuts verrouillés et sans champ d'assignation — voir section "Espace client" |
| 2026-07-14 | Affichage de liste de tâches plus compact, en colonnes | Livré : vue `Liste` de `/admin/taches` passée en tableau à colonnes (Client/Tâche/Type-formats/Évènement/Échéance/Statut) — voir section "Espace client" |
| 2026-07-14 | Date en première colonne, Type et Formats séparés | Livré : colonnes réordonnées (Évènement/Échéance en tête), Type et Formats en colonnes distinctes — voir section "Espace client" |
| 2026-07-14 | Suggestions gestion des tâches : résumé tableau de bord, création rapide, tri par colonne (retenues 1, 2 et 4 sur 4 proposées) | Livré : compteurs "en retard"/"à valider" sur `/admin`, bouton "Nouvelle tâche" + `/admin/taches/nouveau`, en-têtes de colonnes triables sur `/admin/taches` — voir section "Espace client" |
| 2026-07-14 | Suppression de livrables (limiter le stockage) + archivage/suppression de tâche (client qui abandonne) | Livré : bouton supprimer par livrable (efface aussi le fichier stocké), archivage (`archivedAt`, hors cycle de statut) + suppression définitive sur `/admin/taches/[taskId]`, nouvel onglet `Archivées` — voir section "Espace client" |
| 2026-07-15 | Suggestions gestion des tâches : livrables sur la fiche tâche, rappel d'échéance, recherche/filtres Type-Format (les 3 retenues) | Livré : livrables déplacés sur `/admin/taches/[taskId]`, lien "Rappel" (`lastReminderAt`) sur la vue Liste, recherche + filtres Type/Format sur la vue Liste — voir section "Espace client" |
| 2026-07-15 | Suggestions espace client : aperçu BAT sur "À valider", vignettes image, pièces jointes sur "Nouvelle demande" (les 3 retenues) + pop-up de confirmation à l'envoi | Livré : livrables affichés (avec vignette) sur "À valider" et "Livrables", nouveau modèle `Attachment` pour les pièces jointes du client (visibles/supprimables côté admin), pop-up "Merci, votre demande a été prise en compte." — voir section "Espace client" |
| 2026-07-16 | Suggestions vue livrables : taille/date, icônes par type, lightbox au clic, vignette vidéo + lecture inline (les 4 retenues, sur admin et espace client) | Livré : `FileGrid` enrichi (taille/date, icônes PDF/vidéo/zip, lightbox image/PDF/vidéo), route `/api/fichiers/livrables/[id]` passée en streaming avec support `Range` pour la lecture vidéo — voir section "Espace client" |
| 2026-07-16 | Signalement : upload de livrables vidéo en échec ("Unexpected end of form") | Corrigé : `proxyClientMaxBodySize` (10 Mo par défaut, distinct de la limite Server Actions) relevé à 2 Go dans `next.config.ts` — voir section "Espace client" |
| 2026-07-16 | Icône calendrier en citron + contrôle d'upload plus explicite (2 options maquettées, option "bouton compact + liste" retenue), appliqué à tous les endroits d'upload | Livré : icône native des champs date recolorée en citron, composant partagé `FilePicker` (bouton + chips de fichiers) sur les 5 formulaires d'upload — voir section "Direction artistique" |
| 2026-07-16 | Suggestions expérience client : page d'accueil, compteurs sur les onglets, onglet actif surligné, timeline de statut visuelle (les 4 retenues) | Livré : nouvelle page `/espace-client` (redirection après connexion), badges sur "À valider"/"Administratif", nav active via `ClientNavTabs`, composant `TaskStatusTimeline` sur "Suivi" et l'accueil — voir section "Espace client" |
| 2026-07-16 | Contrôle admin pour les 2 photos du Hero (page d'accueil) + dimensions pixel des visuels homepage à fournir | Livré : modèle `HomepageHero`, upload dans `/admin/portfolio` ("Page d'accueil"), fallback propre sur les placeholders Picsum tant que rien n'est uploadé — voir section "Portfolio public" |
| 2026-07-17 | Mise en ligne du site | Livré : hébergement Scalingo + PostgreSQL, stockage OVH Object Storage, bascule SQLite→Postgres, dépôt git initialisé, site en ligne sur `https://mikkovisuel.osc-fr1.scalingo.io` |
| 2026-07-17 | Signalement : échec de l'upload d'image (page d'accueil) en production, erreur serveur générique | Corrigé : incompatibilité `@aws-sdk/client-s3` récent vs OVH Object Storage (`SignatureDoesNotMatch`), SDK fixé à la version 3.726.1 — voir "Décisions techniques déléguées" |
| 2026-07-17 | Premier retour d'expérience (7 points) : formulaire de contact → email admin ; aperçus vidéo motion en autoplay ; limite 50 Mo vidéo à retirer + bug d'upload signalé sur Aftermovie ; vue calendrier par date d'évènement (admin) ; section "demande d'amélioration interface" ; chat de commentaires par tâche ; email de confirmation à la validation d'un BAT | Livré (les 7) : voir sections "Portfolio public" et "Espace client" ci-dessus pour le détail de chaque point |
| 2026-07-17 | Ajouter la vue calendrier (par date d'évènement) côté espace client, pas seulement admin | Livré : nouvel onglet "Calendrier" sur `/espace-client/calendrier`, réutilisant `TaskCalendarView` généralisé — voir section "Espace client" |
| 2026-07-17 | Pointage du domaine mikkovisuel.fr | Livré : CNAME `www.mikkovisuel.fr` → Scalingo, redirection `mikkovisuel.fr` → `www.` déjà en place côté OVH, SSL automatique — site accessible sur son vrai domaine |
| 2026-07-17 | Signalement : sur mobile, la vidéo réellement en ligne sur le pilier Motion Design affiche toujours une icône de lecture barrée malgré le correctif autoplay | Corrigé : `/api/portfolio-media/items/[itemId]` ne supportait pas les requêtes `Range`, requises par Safari mobile pour lire une vidéo — voir section "Portfolio public" |
| 2026-07-17 | Signalement : upload d'une vidéo sur le pilier Vidéo Aftermovies en échec ("This page couldn't load") | Corrigé : conteneur de production tombé à court de mémoire (upload sans streaming + limite retirée plus tôt dans la journée) ; client a choisi de réintroduire un plafond (200 Mo, contre 3 options proposées) plutôt que le streaming ou un conteneur plus gros — voir section "Portfolio public" |
| 2026-07-17 | Rendre modifiables depuis l'admin le titre/sous-titre/bouton du Hero et le titre/sous-titre de la section portfolio | Livré : nouveau modèle `HomepageContent`, formulaire "Textes de l'accueil" dans `/admin/portfolio` — voir section "Portfolio public" |
| 2026-07-17 | Faire tourner les deux images du Hero en 3D | Livré : entrée en rotation 3D (`rotateY` miroir + zoom léger) au chargement, remplace l'ancien fondu/glissement — voir section "Portfolio public" |
| 2026-07-17 | Ajouter un mouvement perpétuel type balancement sur les images du Hero | Livré : léger balancement en boucle (`rotate` ±2-2,5°) après l'entrée 3D, désactivé si "réduire les animations" — voir section "Portfolio public" |
| 2026-07-17 | Isoler les tâches terminées en dessous dans la vue Liste + couleur verte pour le statut "Terminé" | Livré : vue `Liste` en deux tableaux (actives puis "Terminées (n)"), couleur du statut passée de violet à `emerald` — voir section "Espace client" |
| 2026-07-17 | Après modification d'une tâche, retour à la liste des tâches plutôt qu'à la fiche client | Livré : redirection changée sur `updateTask` — voir section "Backend interne" |
| 2026-07-17 | Pouvoir ajouter des pièces jointes à une tâche côté admin | Livré : nouvelle action `uploadAttachment` + formulaire sur la fiche tâche — voir section "Backend interne" |
| 2026-07-17 | Suggestions pour un résumé d'activité "depuis ma dernière connexion" sur le tableau de bord (ex. BAT validés, refus + motif) | Livré (4 des 5 catégories proposées retenues) : BAT validés, refus, nouvelles demandes clients, nouveaux commentaires clients — voir section "Backend interne" |
| 2026-07-17 | Modification de mot de passe pour les clients (avec pop-up de confirmation) + bouton de réinitialisation admin en face de chaque profil client | Livré : `/espace-client/compte` (changement avec mot de passe actuel + pop-up), bouton "Réinitialiser le mot de passe" sur la fiche client admin (envoie l'email de réinitialisation existant) — voir section "Backend interne" |
| 2026-07-17 | (Incident interne, pas une demande client) Relance du script de seed en production pour la couleur du statut "Terminé" | Corrigé le jour même : compte de démonstration créé par erreur sur la prod, supprimé, garde-fou ajouté à `seedDemoClient()` — voir section "Backend interne" |
| 2026-07-17 | Brancher Resend pour l'envoi d'emails réel | Livré : compte Resend créé, domaine `mikkovisuel.fr` vérifié (DNS chez OVH), `RESEND_API_KEY` configurée sur Scalingo, testé avec un envoi réel depuis le formulaire de contact et reçu — voir section "Espace client" |
