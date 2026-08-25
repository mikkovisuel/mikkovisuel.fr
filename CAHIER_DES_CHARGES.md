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
  de piliers, ajout/suppression/réorganisation de galeries par pilier et de
  photos/vidéos au sein d'une galerie (voir "Portfolio en galeries"
  ci-dessous).
- Page d'accueil : grille bento (5 tuiles) qui bascule en grille simple si le
  nombre de piliers est différent de 5.
- **Portfolio en galeries** (2026-08-16, refonte façon Adobe Portfolio) : un
  pilier contenait jusqu'ici des photos/vidéos posées à plat, sans texte de
  présentation. Restructuré en `Pilier → Galeries → Médias` : chaque galerie
  est un projet avec un titre, un texte facultatif avant ses médias et un
  texte facultatif après (indépendants l'un de l'autre), et ses propres
  photos/vidéos réordonnables (boutons monter/descendre, même principe que
  l'ancien réordonnancement). La page d'un pilier liste désormais ses
  galeries comme des cartes (vignette = premier média de la galerie, pas de
  couverture à uploader séparément) ; cliquer une galerie ouvre sa page
  dédiée (texte avant → médias → texte après, médias en 2 colonnes à partir
  de `sm` depuis le 2026-08-22, voir plus bas). L'ancien filtre
  **Tous / Photos / Vidéos** de la page pilier a été retiré : une galerie
  étant déjà un ensemble curaté, ce filtre par type n'avait plus vraiment de
  sens à ce niveau. Migration des données : les photos/vidéos déjà en ligne
  dans chaque pilier ont été regroupées automatiquement dans une galerie
  "Galerie" par défaut (aucune perte), à réorganiser ensuite à la main par
  l'admin en plusieurs galeries si besoin — choix explicite du client plutôt
  qu'une galerie par média existant.
- **Formats des médias uploadés** (précisé le 2026-07-14) :
  - Photos : format **3:4** ou **9:16**, au choix de l'admin à l'ajout.
  - Vidéos : toujours au format **9:16** (imposé automatiquement, pas de
    choix côté formulaire).
  - Chaque média de la page d'une galerie épouse son propre format (une
    galerie peut mélanger des médias 3:4 et 9:16).
- **Galerie publique en 2 colonnes, 2026-08-22** : les médias d'une galerie
  s'affichent désormais sur 2 colonnes à partir de `sm` (≥640px), en une
  seule colonne en dessous. Implémenté en colonnes CSS (`columns-2`,
  `break-inside-avoid`) plutôt qu'une grille : chaque média garde son propre
  format (3:4 ou 9:16, voir ci-dessus), une grille classique aurait laissé
  des trous béants dès que deux médias voisins n'ont pas la même hauteur —
  les colonnes CSS empilent chaque média à la suite dans sa colonne,
  indépendamment des autres, façon mur de photos. Conteneur de la page
  élargi (`max-w-3xl` → `max-w-5xl`) pour donner de la place aux deux
  colonnes, texte avant/après gardé lisible via `max-w-[65ch]`.
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
- Cycle de statut d'une tâche (confirmé par le client le 2026-07-13, "Non
  commencé" ajouté le 2026-07-21 sur demande explicite du client — voir
  section "Backend interne") :
  `Nouveau → Non commencé → En cours → À valider → BAT validé / À modifier → Terminé`
- Workflow de validation/refus des BAT par le client, et par l'admin en son
  nom depuis l'admin (ajouté le 2026-07-21 — voir section "Backend interne").
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
- Indicateur visuel payé/en attente (2026-08-16) : le statut de paiement
  n'était qu'une mention texte discrète — remplacé par une pastille colorée
  (verte "Payée" / rouge "En attente"), sur `/admin/documents`, la fiche
  client, l'espace client ("Administratif") et les paiements sans facture.
- Paiements sans facture rattachés aux Finances (2026-08-16) : le suivi
  "Paiements sans facture" (`PaymentRecord`, voir Backend interne) n'avait
  jusqu'ici aucune date et n'apparaissait jamais dans la page `/admin/
  finances` (seules les factures y comptaient). Nouveau champ `date`
  (éditable, mois affecté), et ces montants s'ajoutent désormais au
  Facturé/Encaissé, au graphique mensuel et au tableau par client de
  Finances, avec les mêmes filtres client/année/mois que les factures.
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
- Signalement (2026-07-17) : une cliente (La Mescla) a tenté de joindre 10
  photos en pièces jointes à une "Nouvelle demande" — échec avec une erreur
  générique navigateur ("This page couldn't load"), sans crash du conteneur
  cette fois (contrairement à l'incident vidéo du même jour — voir
  "Portfolio public" — aucun événement de crash correspondant dans les logs
  Scalingo). Cause la plus probable : les fichiers étaient envoyés au
  stockage S3 un par un, en série ; avec 10 fichiers, le temps de traitement
  cumulé peut dépasser le délai d'attente du routeur avant que la réponse ne
  revienne au navigateur. Corrigé en traitant les fichiers en parallèle
  (`Promise.all` au lieu d'une boucle séquentielle) sur les trois parcours
  d'upload multi-fichiers : pièces jointes côté client (`createTaskByClient`),
  livrables et pièces jointes côté admin (`uploadDeliverable`/
  `uploadAttachment`). Réduit le temps de réponse total sans changer la
  mémoire utilisée par requête.
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
- Application installable (PWA) pour accéder à l'espace client (2026-07-18) :
  nouvelle section "Votre espace client, comme une application" sur la page
  d'accueil, entre "Contact" et "Conditions" (lien "Application" ajouté à la
  navigation du header et du footer, en plus de l'ancrage direct). Manifest
  web (`app/manifest.ts`) avec icônes générées depuis le personnage du logo
  (fond citron `#dded2e`, icônes 192/512 + variante "maskable" pour Android,
  icône 180×180 pour iOS), et service worker minimal (`public/sw.js`, sans
  cache — l'espace client change en permanence, la mise en cache aurait
  affiché des données périmées) uniquement pour satisfaire le critère
  d'installabilité de Chrome/Android. `start_url` pointe vers
  `/espace-client` : une fois l'app installée et lancée, le client atterrit
  directement sur son espace (redirigé vers la connexion s'il n'est pas déjà
  identifié). Composant `InstallPwaCta` adapté à la plateforme : bouton
  d'installation natif quand le navigateur le permet (Android/Chrome/
  desktop), instructions manuelles "Partager → Sur l'écran d'accueil" sur
  iOS/Safari (Apple ne propose pas d'invite d'installation automatique),
  message générique de repli sur les autres navigateurs, et détection d'une
  app déjà installée pour ne pas répéter l'invite.
- Email de confirmation à la validation d'un BAT (2026-07-17) :
  `validateTask` n'envoyait jusqu'ici aucun email (seul le refus en
  envoyait un). Corrigé : à la validation, un email "Validation du BAT
  faite !" part à la fois vers l'admin et vers le compte client qui a
  validé, avec récapitulatif de la tâche, noms des livrables validés, date
  et nom de l'utilisateur.
- Icônes pièce jointe/livrable dans les vues résumées (2026-07-20) : le
  tableau de bord (`/espace-client`) et "Suivi" affichaient une tâche sans
  indiquer si des fichiers y étaient déjà attachés — nouveau composant
  partagé `AttachmentBadge` (pastille trombone/livrable + compteur),
  affiché à côté du titre partout où une tâche est résumée sans lister ses
  fichiers.
- Date d'évènement + tri sur l'onglet Livrables (2026-07-20) : chaque tâche
  affiche désormais sa date d'évènement avant le titre, et un contrôle "Trier
  par : Date d'évènement / Date d'ajout" (croissant/décroissant) a été ajouté
  en haut de `/espace-client/livrables`.
- Espace client de démonstration public (2026-07-20), pour que les
  prospects visualisent leur futur espace avant de signer : bouton "Voir
  l'espace client de démo" sur `/espace-client/connexion`, sans connexion
  requise. Nouveau champ `Client.isDemo` (client factice seedé avec des
  tâches d'exemple à différents stades). Espace strictement **en lecture
  seule** (décision explicite) : bandeau permanent + boutons d'action
  masqués/désactivés côté interface, et surtout verrou côté serveur
  (`assertNotDemo`, dans `src/lib/dal.ts`) sur chaque action d'écriture
  côté client (nouvelle demande, suggestion, validation/refus de BAT,
  commentaires, changement de mot de passe, paiement Stripe) — nécessaire
  car l'espace est accessible publiquement sans authentification, masquer
  les boutons ne suffit pas.
- Filigrane automatique sur les BAT (2026-07-20) : les livrables sont
  désormais typés `kind` = "BAT à valider" ou "livrable final" au moment de
  l'upload (choix admin sur la fiche tâche). Les BAT vus par le client
  (route `/api/fichiers/livrables/[id]`) sont filigranés à la volée (logo
  Mikko Visuel en tuile répétée, 10 % d'opacité, via `sharp`) — le fichier
  original en stockage n'est jamais modifié, et l'admin voit toujours
  l'original sans filigrane. Réglable (activé par défaut) depuis
  `/admin/reglages` — voir section "Backend interne".
- Pop-up d'annonce admin → tous les espaces clients (2026-07-20) : nouveau
  réglage (case à cocher + texte libre) sur `/admin/reglages`, affiché en
  modale à la connexion sur tous les comptes client (le client de
  démonstration y compris, pratique pour prévisualiser le rendu avant
  diffusion). Un message donné ne s'affiche qu'une fois par onglet
  (mémorisé en `sessionStorage`, pas de nouvelle table de suivi de lecture
  — un nouveau texte réapparaît même si le précédent avait été fermé).
- Motif de refus effacé (avec historique) à la validation du BAT
  (2026-07-20) : jusqu'ici `Task.refusalReason` restait affiché en rouge
  même après validation d'un BAT précédemment refusé. Corrigé : nouveau
  modèle `TaskRefusalHistory` (une ligne par refus, jamais réécrite ni
  supprimée), alimenté au moment du refus (`refuseTask`) ; le motif courant
  (`refusalReason`/`refusedAt`) est remis à `null` dès que le statut passe
  en "BAT validé", que ce soit via la validation client (`validateTask`) ou
  un changement de statut manuel par l'admin (`setTaskStatus`). L'historique
  complet reste consultable sur `/admin/taches/[taskId]`, section
  "Historique des refus".
- Motif de refus également effacé à la remise en validation (2026-08-01) :
  le point ci-dessus ne couvrait que le passage en "BAT validé" — remettre
  une tâche refusée directement en "À valider" (bouton "Mettre en
  validation" depuis "À modifier") laissait le bandeau rouge affiché sur la
  fiche tâche **et** sur les lignes des vues Liste/Kanban, alors qu'un
  nouveau tour de validation venait de commencer. `setTaskStatus` efface
  désormais `refusalReason`/`refusedAt` sur ce passage aussi, par le même
  mécanisme (testé en base : l'historique reste intact, seul le motif
  courant est effacé) — la fiche `TaskRefusalHistory` n'est jamais touchée.
- Notifications par email gérables par le client lui-même (2026-07-21) :
  jusqu'ici seul l'admin pouvait activer/désactiver les emails automatiques
  d'un profil (voir section "Backend interne"). Ajout d'une section
  "Notifications par email" sur `/espace-client/compte` ("Mon compte"),
  avec la même bascule — le client peut désormais s'auto-gérer sans passer
  par l'admin (même champ `ClientUser.emailNotificationsEnabled`, un point
  d'accès de plus, les deux restent synchronisés). Désactivée dans l'espace
  de démonstration, comme le reste de "Mon compte".

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
- Quatre sections supplémentaires sur le tableau de bord (2026-07-17, sur 4
  suggestions proposées + 1 apportée par le client, toutes retenues) :
  - **Prochains événements** : les 6 prochaines tâches par date d'évènement
    à venir (titre, client, statut, date), lien direct vers chaque tâche.
  - **Tâches par statut** : décompte par statut (les 6 statuts verrouillés,
    y compris à 0), lien vers la vue `Liste` filtrée par statut.
  - **Clients sans activité récente** : clients sans nouvelle tâche depuis
    30 jours ou plus (ou sans aucune tâche), pour repérer une relance
    commerciale à prévoir.
  - **Journal de connexion** : historique des connexions client à leur
    espace (nom du compte, client, date/heure), les 8 plus récentes.
    Nouveau modèle `ClientLoginEvent` (une ligne par connexion réussie),
    distinct de `ClientUser.lastLoginAt` qui ne garde que la toute
    dernière — alimenté depuis `clientLogin` (`src/lib/actions/
    client-auth.ts`).
- Tableau de bord admin installable (PWA), distinct de l'app client
  (2026-07-18) : même principe que la PWA client (voir "Espace client"),
  mais réservée à l'admin — carte "Installer le tableau de bord" affichée
  uniquement sur `/admin` (le tableau de bord, pas les autres pages admin),
  jamais visible côté public ou client. Manifest séparé
  (`/admin/manifest.webmanifest`, Route Handler dédié plutôt que la
  convention `app/manifest.ts` qui ne couvre que la racine du site) avec
  son propre `start_url`/`scope` (`/admin`) et ses propres icônes (mêmes
  visuels que la PWA client mais fond noir `#14141a` au lieu du citron,
  pour distinguer les deux icônes une fois installées côte à côte sur
  l'écran d'accueil). Le manifest admin n'est déclaré que sur les pages
  `/admin/*` (protégées par connexion, comme le reste du back-office) — un
  visiteur non connecté ou un client ne peut ni le voir ni l'installer.
  Favicon d'onglet navigateur également distinct sur tout `/admin/*`
  (`src/app/admin/icon.png`, même fond noir), en plus de l'icône une fois
  l'app installée, pour repérer l'onglet admin au premier coup d'œil parmi
  d'autres onglets ouverts.
- Signalement (2026-07-18) : l'app installée depuis le tableau de bord
  pointait quand même vers l'espace client. Cause : le manifest admin
  n'était déclaré que sur les pages protégées (`/admin/(protege)`), pas sur
  `/admin/connexion` — au premier chargement (avant identification), le
  navigateur voyait donc encore le manifest client, et la connexion
  redirige ensuite vers `/admin` sans rechargement complet de page,
  laissant certains navigateurs "figés" sur le manifest vu au tout premier
  chargement. Corrigé en remontant la déclaration du manifest admin dans un
  nouveau layout `src/app/admin/layout.tsx`, qui couvre tout `/admin/*` y
  compris la page de connexion elle-même — plus aucune page admin, même
  avant identification, ne peut afficher le manifest client. Note
  d'installation également déplacée tout en bas du tableau de bord (elle
  était juste sous le titre).
- Signalement (2026-07-20) : sur `/admin`, le navigateur (Chrome/Arc)
  proposait "Ouvrir dans l'appli" mais rouvrait l'app espace client déjà
  installée, jamais de proposition d'installer une app admin distincte —
  distinct du bug du 2026-07-18 ci-dessus (déjà corrigé). Cause : le
  manifest de l'espace client (`src/app/manifest.ts`) déclarait
  `scope: "/"` (tout le domaine) au lieu de se limiter à son propre
  périmètre — un `scope` racine revendique toutes les URL du site, y
  compris `/admin`, qui a pourtant son propre manifest avec son propre
  `scope: "/admin"` ; les navigateurs associent alors `/admin` à l'app déjà
  installée dont le scope le couvre, sans même regarder le manifest
  réellement lié sur cette page. Corrigé : `scope` resserré à
  `/espace-client` (aligné sur son `start_url`), qui n'entre plus en
  collision avec le scope `/admin` de l'app admin. Une app déjà installée
  avant ce correctif garde l'ancien scope en cache côté navigateur : il
  faut la désinstaller puis relancer l'installation depuis `/admin` (le
  bouton en bas du tableau de bord) pour obtenir une app admin distincte.
- Signalement (2026-07-20, suite du point ci-dessus) : même après le
  correctif de `scope`, aucune icône d'installation n'apparaissait au bas
  du tableau de bord (juste le texte générique "Depuis le menu de votre
  navigateur..."). Deuxième cause trouvée, indépendante du `scope` :
  `src/proxy.ts` protège tout `/admin/*` derrière la présence d'un cookie
  de session et ne laissait passer que `/admin/connexion` et
  `/admin/mot-de-passe-oublie` sans authentification — `/admin/
  manifest.webmanifest` et `/admin/icon.png` (générés par les conventions
  de fichiers Next.js sous `src/app/admin/`) étaient donc redirigés vers la
  page de connexion (HTML) au lieu de renvoyer le JSON/l'image attendue.
  Or le navigateur récupère lui-même le manifest via l'URL du `<link
  rel="manifest">`, y compris sur la page de connexion avant toute
  identification — un manifest invalide (redirigé vers du HTML) rend la
  page non installable, sans erreur visible pour l'utilisateur. Corrigé :
  ces deux chemins ajoutés aux routes publiques de `proxy.ts`.
- Signalement (2026-07-20, sans lien avec le code de ce dépôt) : en testant
  `mikkovisuel.fr/admin` (sans `www.`), le navigateur affiche un tout autre
  site (404 sur `/admin`, assets `/dist/js/main.js` et `/site/
  translations` qui n'appartiennent pas à ce projet) — vraisemblablement
  un ancien site resté actif sur le domaine nu. `www.mikkovisuel.fr`
  fonctionne normalement (Chrome masque le "www." dans la barre d'adresse,
  d'où la confusion). Le cahier notait pourtant une redirection `mikkovisuel.fr`
  → `www.` déjà en place chez OVH (voir "Décisions techniques déléguées",
  mise en ligne du 2026-07-17) — elle ne fonctionne plus ou n'a jamais
  couvert que la racine sans les sous-chemins. Point hors du code
  applicatif (configuration DNS/hébergement côté OVH) : à vérifier/corriger
  par le client directement dans son espace OVH, ou à signaler à Claude
  Code s'il faut de l'aide pour formuler la bonne règle de redirection.
- **Impact concret trouvé et corrigé (2026-08-01)** : "le lien pour inviter
  un contact à son espace ne fonctionne pas" — le domaine nu ne renvoie
  plus un ancien site mais une page d'erreur 403 (`HTTP ERROR 403`), et la
  variable Scalingo `NEXT_PUBLIC_SITE_URL` était réglée sur
  `https://mikkovisuel.fr` (sans `www.`), donc sur le domaine cassé. Cette
  seule variable sert de base à **tous** les liens envoyés par email de
  l'application (invitation contact, réinitialisation de mot de passe
  client, réinitialisation de mot de passe admin, invitation admin, rappel
  de paiement) : ils étaient donc **tous** cassés, pas seulement
  l'invitation contact. Corrigé en réglant la variable sur
  `https://www.mikkovisuel.fr` (testé : 403 sur le nu, 200 sur le `www.`)
  puis en redémarrant l'application — confirmation explicite demandée avant
  ce changement, puisqu'il s'agit d'un réglage de production hors du dépôt
  git. Le souci DNS/hébergement du domaine nu lui-même reste non résolu
  (toujours hors code applicatif) ; contourné ici en pointant l'app vers le
  domaine qui fonctionne plutôt que d'attendre sa correction côté OVH.
- Aperçu de l'espace client depuis la fiche client admin (2026-07-18) :
  bouton "Voir l'espace client" à côté de chaque compte de connexion sur
  `/admin/clients/[clientId]` — ouvre l'espace client exactement comme le
  client le voit (mêmes pages, aucune reconstruction séparée à maintenir),
  via une bascule temporaire et réversible de la session plutôt qu'une copie
  en lecture seule. Un bandeau citron ("Vous visualisez l'espace de X en
  tant qu'admin — Revenir à l'admin") reste affiché sur toutes les pages de
  l'espace client tant que l'aperçu est actif, avec un bouton de retour qui
  restaure la session admin d'origine (et son thème clair/sombre) sur la
  fiche du client concerné. Aperçu volontairement exclu du "journal de
  connexion" du tableau de bord (pas un vrai login client) et limité à 1h
  (expire tout seul même sans clic sur "Revenir à l'admin").
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

- Tri des tâches généralisé à toutes les vues (2026-07-20) : le tri par
  colonne existait déjà sur la vue `Liste` de `/admin/taches`
  (`buildTaskOrderBy`, statut/date d'évènement/date d'échéance/client/
  titre) mais restait invisible sur les autres vues et sur la liste des
  tâches d'une fiche client. Nouveau composant `TaskSortControl` (mêmes
  champs, mêmes liens `?tri=...&dir=...`), affiché sur toutes les vues de
  `/admin/taches` et sur `/admin/clients/[clientId]`.
- Réglages en direct + archivage automatique des livrables (2026-07-20) :
  nouvelle page `/admin/reglages` (icône ⚙️ dans l'en-tête admin), avec un
  nouveau modèle singleton `AppSettings` (même principe que
  `HomepageContent`) portant : le nombre de jours avant purge automatique
  des livrables finaux (60 par défaut, appliqué immédiatement à
  l'enregistrement), l'activation du filigrane BAT et le réglage de la
  pop-up (voir section "Espace client"). Purge = suppression réelle du
  fichier en stockage (décision explicite, pas un simple masquage), et ne
  concerne que les livrables **finaux** des tâches "Terminé" — jamais les
  BAT en attente de validation. Déclenchée quotidiennement via une tâche
  planifiée Scalingo (`cron.json`, appelle `/api/cron/purge-deliverables`
  protégée par un secret `CRON_SECRET` à configurer côté Scalingo — voir
  "Points encore ouverts") et disponible en déclenchement manuel immédiat
  ("Purger maintenant" sur `/admin/reglages`, utile en test ou en dehors de
  Scalingo).
- Règle de purge revue (2026-08-16) : le délai unique "N jours après
  l'upload" (60 par défaut) ne reflétait pas le bon repère — un livrable
  doit rester disponible jusqu'à l'évènement du client, pas un nombre de
  jours fixe depuis son envoi. Remplacé par deux délais indépendants et
  toujours réglables sur `/admin/reglages` : purge **7 jours après la date
  de l'évènement** de la tâche (par défaut) quand elle est renseignée, ou
  **30 jours après l'envoi du livrable** (par défaut) si la tâche n'a pas de
  date d'évènement. Toujours limité aux livrables **finaux** des tâches
  "Terminé" — les BAT restent protégés dans tous les cas, comme avant.
- Rapport PDF des tâches en cours, par client (2026-07-20) : bouton
  "Télécharger le rapport (PDF)" sur `/admin/clients/[clientId]`, à côté du
  titre "Tâches". Liste toutes les tâches non terminées (hors archivées)
  du client — titre, statut, type/formats, dates d'évènement/échéance,
  description — pour un point d'avancement à envoyer tel quel. Généré à la
  volée (`@react-pdf/renderer`, pas de navigateur headless type Puppeteer —
  trop lourd pour le conteneur de production, voir l'incident mémoire du
  2026-07-17). Téléchargement uniquement (décision explicite, pas d'envoi
  email intégré).
  - Habillé aux couleurs de la DA sombre du site (2026-07-21) : fond sombre,
    accent citron sur le nom de marque et le liseré sous l'en-tête, titres
    en Clash Display, badges de statut recolorés selon la couleur réelle du
    statut (même palette que l'admin). En construisant ce style, un bug de
    police a été corrigé au passage : le `.woff2` de Clash Display
    (auto-hébergé, utilisé côté web) provoquait des espaces parasites dans
    certains mots une fois rendu en PDF par `@react-pdf/renderer`/fontkit
    ("af che" au lieu de "affiche") — la police PDF utilise maintenant une
    version `.ttf` du même fichier (simple décompression, pas une police
    différente).
- Boîte mail Gmail intégrée à l'admin (2026-07-20) : nouveau bouton
  "Emails" sur la fiche client (`/admin/clients/[clientId]`), ouvrant la
  liste des fils de discussion Gmail échangés avec les adresses des
  comptes de connexion de ce client (recherche `from:`/`to:` en direct via
  l'API Gmail à chaque ouverture — aucun email stocké/synchronisé en
  base). Permet de répondre (correctement rattaché au fil dans le vrai
  Gmail), transférer, ou écrire un nouveau message sans jamais ouvrir
  Gmail. Connexion en OAuth2 depuis `/admin/reglages` ("Boîte mail"), un
  seul compte Google (celui de l'admin) — champs ajoutés sur `Admin`
  (`gmailEmail`, `gmailRefreshTokenEnc`, `gmailConnectedAt`), le refresh
  token étant chiffré en base (AES-256-GCM, nouvelle variable d'env
  `ENCRYPTION_KEY`) plutôt qu'en clair : ce token donne un accès permanent
  au Gmail personnel de l'admin, une fuite de la base ne doit pas suffire
  à elle seule à l'exploiter. Scopes volontairement restreints à
  lecture + envoi (jamais suppression/labellisation). Le corps HTML de
  chaque email (contenu externe, pas de confiance) est affiché dans une
  iframe `sandbox` sans script — protection contre une éventuelle
  injection XSS via un email reçu. Fonctionnalité codée et testée (état
  "non connecté", écran de réglages, garde-fous) mais l'usage réel dépend
  de la création d'identifiants Google côté client — voir "Points encore
  ouverts" et `GUIDE_GMAIL.md`.
- ~~Boîte mail globale "Mail" dans le bandeau admin (2026-07-20)~~ —
  **supprimée le 2026-07-30** à la demande du client ("l'onglet Mail ne me
  sert à rien") : l'onglet, la page `/admin/mails` et la pastille de
  compteur de non-lus ont été retirés. Le reste du module Gmail est
  **conservé** : bouton "Emails" par client, fil de discussion, réponse et
  transfert, composeur d'email prospect, connexion Gmail dans Réglages.
  Effet de bord bénéfique : `getUnreadThreadCount` déclenchait un appel à
  l'API Gmail à *chaque* chargement de page admin (malgré son cache 60s) —
  cet appel a entièrement disparu. Description d'origine conservée
  ci-dessous pour mémoire : nouvel onglet "Mail" entre "Documents" et
  "Portfolio" (`/admin/mails`),
  regroupant en une seule vue les fils Gmail échangés avec l'ensemble des
  clients (même principe que le bouton "Emails" par client — recherche
  `from:`/`to:` en direct, toujours aucun email stocké en base). Chaque fil
  est rattaché automatiquement au client dont une adresse de compte
  apparaît dans l'expéditeur/destinataire du dernier message, avec filtre
  par client et lien direct vers le fil (réutilise la page de fil existante
  `/admin/clients/[clientId]/emails/[threadId]`, pas de vue dupliquée pour
  répondre/transférer).
- Statut lu/non lu + recherche dans les vues email (2026-07-20) : icône
  lu/non lu ajoutée sur chaque fil (listes par client et "Mail" globale) et
  sur chaque message dans le détail d'un fil, reflétant le label Gmail réel
  `UNREAD` — l'app ne le modifie jamais (scope volontairement restreint à
  lecture + envoi, voir ci-dessus), donc l'indicateur suit l'état du vrai
  Gmail de l'admin, pas une lecture "dans l'app". Champ "Rechercher" ajouté
  sur les deux vues de liste, pour filtrer par mot-clé présent dans l'objet
  ou le corps du message (recherche Gmail standard côté serveur, pas
  d'index local).
- Adresse, SIRET et n° TVA sur la fiche client (2026-07-20) : nouveaux
  champs optionnels sur `Client` (`address`, `siret`, `vatNumber`),
  ajoutés au formulaire "Informations" de la fiche client
  (`/admin/clients/[clientId]`).
- Téléphone et rôle par compte de connexion (2026-07-20) : nouveaux champs
  optionnels sur `ClientUser` (`phone`, et `role` en texte libre — ex.
  "Directeur", "DJ", "Photographe", pas de liste fermée, trop variable
  d'un client à l'autre). Renseignables à la création d'un compte
  (formulaire existant) et modifiables ensuite pour un compte existant via
  un petit formulaire dédié affiché sous chaque compte sur la fiche
  client.
- Email de facturation + envoi de document par email (2026-07-20) : nouveau
  champ `Client.billingEmail` sur la fiche client, distinct des emails des
  comptes de connexion (usage uniquement pour l'envoi manuel des
  documents). Bouton "Envoyer le document" ajouté sur chaque document
  (fiche client et `/admin/documents`), visible seulement si un email de
  facturation est renseigné : envoie le fichier **en pièce jointe** à cette
  adresse, objet = nom du fichier, corps fixe ("Bonjour, ci-joint un
  nouveau document : "nom du document". Je reste à disposition pour tout
  renseignement complémentaire. Par avance, merci." — texte demandé par le
  client, légèrement corrigé sur l'accord "tout/tous"). Nouveau champ
  `Document.sentAt`, avec icône de statut envoyé/non envoyé à côté de
  chaque document (avion en papier plein si envoyé, contour sinon, avec la
  date du dernier envoi). Le service d'email (`src/lib/email/service.ts`)
  gère désormais les pièces jointes (support déjà présent chez Resend),
  avec repli console habituel si `RESEND_API_KEY` n'est pas configurée.
- Brouillon de mail manuel (2026-07-30) : bouton "Préparer le mail" ajouté
  **à côté** de "Envoyer le document", aux mêmes conditions d'affichage
  (email de facturation renseigné). Il n'envoie rien : il ouvre la
  messagerie de l'admin sur un brouillon `mailto:` prérempli (destinataire,
  objet = nom du fichier, corps dans le même ton que l'envoi Resend). Le
  mail part ainsi de la vraie boîte de l'admin, se retrouve dans ses
  "Envoyés", et le client répond à une adresse humaine plutôt qu'à
  `no-reply@`. **Contrainte assumée** : `mailto:` ne peut pas porter de
  pièce jointe (limite du protocole, RFC 6068) — le corps renvoie donc vers
  l'espace client, où le destinataire retrouve le document après connexion,
  plutôt que vers un lien de téléchargement public qui circulerait sans
  contrôle. Pour la même raison, ce bouton ne marque **pas** `Document.sentAt` :
  on ne peut pas savoir si l'admin a réellement cliqué sur "Envoyer" dans
  son client mail, et cet indicateur reste réservé à l'envoi Resend, qui est
  constaté. Voir `src/lib/mail-draft.ts`.
- Lien Google Drive par client (2026-07-20) : nouveau champ `Client.driveUrl`
  sur la fiche client (un seul lien par client, pas par compte de
  connexion — cohérent avec le fonctionnement "1 client = 1 espace"). Si
  renseigné, un onglet "Google Drive" apparaît dans le bandeau de l'espace
  client (`ClientNavTabs`), ouvrant le dossier dans un nouvel onglet ;
  absent sinon (pas de lien cassé affiché).
- Épinglage des tâches (2026-07-20) : nouveau champ `Task.pinnedAt` (même
  principe que `archivedAt` — une date plutôt qu'un simple booléen, sert
  aussi à trier). Petite pastille cliquable (`TaskPinButton`, un clic,
  bascule immédiate sans confirmation) affichée à côté du titre de la
  tâche partout où l'admin la croise : vue `Liste`, Kanban, fiche client,
  vue "Par client" et fiche de la tâche elle-même. Nouveau filtre
  "Épinglées uniquement" dans les filtres de `/admin/taches` (case à
  cocher, combinable avec les filtres client/statut existants, préservé en
  changeant de vue ou de tri). Nouvelle section "Tâches épinglées" en tête
  du tableau de bord (`/admin`), triée par date d'épinglage la plus
  récente. Désépinglage automatique dès qu'une tâche passe au statut
  "Terminé" (`setTaskStatus`) — une tâche terminée n'a plus besoin d'être
  mise en avant.
- Filtre "Épinglées uniquement" sur la fiche client (2026-07-20) : la liste
  des tâches d'un client n'avait jusqu'ici pas de filtre du tout (seulement
  un tri). Ajout d'un lien-pastille "Épinglées uniquement" à côté de
  "Télécharger le rapport (PDF)" sur `/admin/clients/[clientId]`, même
  logique que la case à cocher de `/admin/taches` (préservé au changement
  de tri). Message "Aucune tâche épinglée." si le filtre ne retourne rien.
- Glisser-déposer pour l'upload des livrables (2026-07-20) : le composant
  partagé `FilePicker` (bouton compact + chips, voir "Direction
  artistique") gagne un mode `dropzone` optionnel — grande zone à bordure
  pointillée, glisser-déposer en plus du clic pour choisir un fichier.
  Activé uniquement sur le formulaire d'ajout de livrables
  (`/admin/taches/[taskId]`, section "Livrables"), à la demande explicite
  du client ; les 4 autres endroits qui partagent `FilePicker` (pièces
  jointes, documents, médias/couvertures du portfolio) gardent le bouton
  compact d'origine, sans changement.
- Envoi groupé des livrables finaux par email (2026-07-20) : même mécanique
  que l'envoi de document (voir plus haut) — bouton "Envoyer les livrables
  finaux" sur la fiche tâche (section "Livrables"), visible seulement si un
  email de facturation est renseigné et qu'au moins un livrable "final"
  existe (les BAT ne sont jamais inclus). Tous les livrables finaux de la
  tâche partent en une seule fois, en pièces jointes, à l'email de
  facturation du client. Objet = "date de l'évènement - titre de la tâche"
  (ou juste le titre si la tâche n'a pas de date), corps fixe dans le même
  ton que l'envoi de document. Nouveau champ `Task.deliverablesSentAt`,
  avec la même icône de statut envoyé/non envoyé. Garde-fou ajouté (au-delà
  de la demande initiale) : au-delà de 25 Mo cumulés, l'envoi est refusé
  avec un message clair plutôt que d'échouer silencieusement ou de dépasser
  la limite réelle du fournisseur d'email (Resend, ~40 Mo par email tout
  compris) — le client peut toujours télécharger les fichiers depuis son
  espace client dans ce cas, l'email n'est qu'une commodité de notification.
  Bouton "Préparer le mail" ajouté à côté (2026-07-30), sur le même modèle
  que pour les documents (voir plus haut) : brouillon `mailto:` prérempli,
  sans pièce jointe, renvoyant vers l'espace client, et sans marquage de
  `Task.deliverablesSentAt`.
- Statut modifiable + bouton "Mettre en validation" sur la fiche tâche
  (2026-07-20) : `/admin/taches/[taskId]` n'exposait jusqu'ici aucun moyen
  de changer le statut (seul le sélecteur des vues Liste/Kanban/fiche client
  le permettait). Ajout du même sélecteur de statut sur la fiche tâche, et
  d'un bouton dédié "Mettre en validation" (raccourci vers le statut "À
  valider", plus visible qu'un menu déroulant) qui prévient automatiquement
  tous les profils du client par email ("vous avez un nouveau BAT à
  valider" — logique déjà existante de `setTaskStatus`, désormais aussi
  déclenchable depuis cette page). Désactivé si la tâche est déjà "À
  valider", pour éviter un second envoi accidentel.
- **Sauvegarde complète, fichiers inclus (2026-07-30).** `/api/exports/tout`
  ne zippait que trois CSV de métadonnées : l'archive décrivait des documents,
  livrables et médias qu'elle **ne contenait pas**. La réversibilité mise en
  avant côté commercial était donc fausse — un client repartait avec des
  lignes pointant vers des fichiers absents. L'archive embarque désormais tous
  les fichiers réels, rangés par client (`documents/`, `livrables/`,
  `pieces-jointes/`, `avatars/`, `portfolio/`), et un inventaire (nombre de
  fichiers, volume) est affiché sur `/admin/exports` avant le téléchargement.
  Deux contraintes techniques : l'archive est produite **en flux** (un seul
  livrable peut peser 500 Mo, le zippeur maison `src/lib/zip.ts` la
  construisait entièrement en mémoire et ferait tomber le conteneur — d'où
  l'ajout de `archiver`, `zip.ts` restant utilisé pour les petits exports
  CSV) ; et une méthode `exists()` a été ajoutée aux adaptateurs de stockage,
  parce que `readStream` ne rejette pas sur un fichier absent — il rend un
  flux qui échoue plus tard, ce qui figeait l'archive et produisait une
  sauvegarde silencieusement tronquée. Tout fichier absent ou illisible est
  désormais consigné dans un `RAPPORT-SAUVEGARDE.txt` joint à l'archive.
- **Alerte email en cas d'erreur serveur (2026-07-30).** Une erreur en
  production n'allait nulle part : trois `console.error` et les logs Scalingo,
  que personne ne lit. Un 500 chez un client restait invisible jusqu'à ce
  qu'il le signale. Le hook `onRequestError` de Next (`src/instrumentation.ts`)
  couvre désormais composants serveur, Server Actions et routes API, et
  prévient tous les comptes admin par email via l'infrastructure existante.
  Trois garde-fous, parce qu'une alerte qui s'emballe est pire que pas
  d'alerte : une même erreur (message + route) n'est notifiée qu'une fois par
  heure, un plafond global de 10 alertes/heure évite qu'une panne de base ne
  noie la boîte mail au pire moment, et l'ensemble est encapsulé pour ne
  jamais aggraver ni masquer l'incident d'origine. État en mémoire du
  processus, remis à zéro à chaque déploiement — voulu : après un correctif,
  on veut être renotifié si le problème persiste.
- **Archivage d'un client (2026-07-30).** Jusque-là, le seul moyen de sortir
  un ancien client des listes était `deleteClient`, qui supprime en cascade
  ses tâches, documents et livrables. Nouveau champ `Client.archivedAt` et
  bouton "Archiver / Désarchiver" sur la fiche : le client disparaît des
  listes et des sélecteurs de création, un bandeau le signale sur sa fiche,
  et **rien n'est détruit** — un clic suffit à revenir en arrière.
  Trois endroits gardent délibérément les clients archivés, et ce n'est pas
  un oubli : les **Finances** (les factures d'un ancien client font toujours
  partie du chiffre d'affaires — archiver ne doit pas réécrire l'historique
  comptable), les **exports** (une sauvegarde amputée n'en est pas une, et la
  réversibilité promise en dépend) et la **recherche globale** (c'est le
  chemin par lequel on retrouve un ancien client). La distinction est portée
  par deux constantes voisines, `ACTIVE_CLIENTS` et `EXCLUDE_DEMO_CLIENT`
  (src/lib/clients.ts). Les accès à l'espace client ne sont pas touchés :
  archiver est un geste de rangement, couper un accès reste explicite.
- **Planning de charge pondéré par le temps (2026-07-30).** Le graphique
  comptait des tâches à l'unité : trois flyers pesaient autant que trois
  aftermovies, ce qui le rendait inutilisable pour anticiper une surcharge.
  Il additionne désormais les `estimatedMinutes`, déjà saisis sur chaque
  tâche mais jusque-là exploités par la seule jauge d'une fiche. Seuils
  passés en heures (chargée à 25 h, surcharge à 40 h). Les tâches **sans**
  estimation ne peuvent pas être converties en hauteur de barre sans inventer
  une durée : elles sont signalées par un "+n" sous la semaine concernée et
  récapitulées sous le graphique, plutôt que de peser zéro en silence.
- **Moteur de capacité (2026-07-31), "le moteur d'abord".** Demande initiale
  très large (pop-up de saisie de charge par jour, tendance semaine par
  semaine, tableau de bord détaillé et complet, alerte à l'échéance) —
  découpage validé avec le client avant de coder : le moteur et les alertes
  maintenant, la tendance et le tableau de bord détaillé **explicitement
  reportés** à une prochaine session. Livré dans cette passe :
  - Nouveau modèle `WorkCapacityDay` (une ligne par jour, minutes
    disponibles) et pop-up `CapacityPopup` sur `/admin/planning` — une
    semaine à la fois, navigable, préchargée sur une fenêtre de 15 semaines
    (2 passées + 12 à venir) pour éviter un aller-retour serveur à chaque
    changement de semaine dans la modale.
  - **Charge non répartie** : nouvelle section listant les tâches actives
    sans date d'évènement, jusque-là absentes du graphique hebdomadaire (qui
    ne compte que les tâches datées) — sans ça, une tâche non planifiée
    disparaissait purement et simplement du planning.
  - Le graphique hebdomadaire compare désormais la charge à la **capacité
    réellement saisie** quand elle existe pour la semaine, et ne retombe sur
    les seuils fixes (25 h / 40 h) que pour les semaines sans capacité
    renseignée — l'un n'a pas remplacé l'autre, faute de donnée saisie sur
    toute la période.
  - **Alerte à la saisie de l'échéance** d'une tâche (`TaskEditForm`) :
    orange quand la marge restante avant l'échéance descend sous 20 % de la
    capacité saisie sur la période, rouge et message "Surcharge" si elle est
    négative — vérifiée avec des données réelles en base (surcharge,
    charge normale, marge à 20 % pile). **Sans capacité saisie sur la
    période, aucune alerte ne s'affiche** : l'absence de donnée n'est jamais
    interprétée comme une capacité nulle, ce qui produirait une fausse
    alerte de surcharge systématique.
  - Un jour de capacité explicitement mis à 0 (jour férié, absence) reste
    distinct d'un jour jamais saisi — testé en base : compter un jour
    "inconnu" comme 0 h fausserait le calcul de couverture et masquerait le
    besoin de compléter la saisie.
- **Planning, second passage (2026-08-01) : design, recopie, base de calcul.**
  - Graphique hebdomadaire redessiné avec la palette de statut validée par le
    skill data-viz du projet (good/warning/critical, vérifiée au contraste sur
    les deux thèmes), un repère en pointillés affichant la capacité saisie
    directement sur la barre, et une infobulle personnalisée accessible au
    clavier (remplace le `title` natif du navigateur).
  - Pop-up de capacité : bouton **"Copier la semaine précédente"** (remplit
    les 7 champs en un clic, rien n'est enregistré tant que le formulaire
    n'est pas soumis), total hebdomadaire affiché en direct, week-end
    distingué visuellement.
  - **Base de calcul au choix** : "par date d'évènement" (quand le travail a
    lieu) ou "par échéance" (quand il doit être livré) — un même graphique,
    juste rattaché à une date différente selon ce qu'on veut anticiper (utile
    par exemple pour un aftermovie livré bien après l'évènement filmé). La
    section "Charge non répartie" suit la même bascule : sous "échéance",
    elle liste les tâches sans échéance plutôt que sans date d'évènement.
    Testé en base avec deux tâches réelles (l'une avec date d'évènement
    seule, l'autre avec échéance seule) : chacune bascule bien de "comptée"
    à "non répartie" selon la base choisie.
- **Planning, troisième passage (2026-08-01) : tendance et tableau de bord —
  clôture des deux points reportés le 2026-07-31.** Deux maquettes proposées
  avant de coder (voir plus bas pour le détail des options), le client a
  choisi le format pour chacune :
  - **Tendance prévu/réel** (`TrendChart`, sous le graphique hebdomadaire) :
    barres appariées par semaine — format choisi face à l'alternative "deux
    courbes avec écart en trame". Le "réel" vient du temps chronométré
    (`TaskTimeEntry`), rattaché à la semaine où la session a **commencé**
    (même convention que le rapport Temps & rentabilité) — **indépendant de
    la base évènement/échéance** choisie pour le graphique au-dessus,
    puisqu'il s'agit de travail effectivement réalisé, pas d'un engagement
    rattaché à une date de tâche. Écart affiché en rouge/vert au-dessus de
    chaque paire de barres.
  - **Tableau de bord** : 4 tuiles choisies par le client parmi 6 proposées
    (tâches en retard, à risque, écart moyen, non réparti — client le plus
    chargé et vélocité récente proposés mais **non retenus**, à reprendre si
    besoin plus tard). "À risque" réutilise telle quelle l'alerte déjà
    construite sur la fiche tâche (`checkDueDateCapacity`), plutôt qu'un
    nouveau seuil inventé pour le tableau de bord. "Écart moyen" est calculé
    sur les 4 dernières semaines **complètes**, la semaine en cours étant
    exclue : la comparer à un prévu entier aurait affiché un écart négatif
    systématique et trompeur tant qu'elle n'est pas terminée.
  - Testé en base : décompte des tâches en retard, temps chronométré
    correctement rattaché à la semaine de début de session.
- **Planning, quatrième passage (2026-08-01) : retours d'usage sur les deux
  graphiques.**
  1. **Bulle "+n" (tâches sans estimation) déplacée sous le numéro de
     semaine**, au lieu d'au-dessus — simple réordonnancement visuel.
  2. **Vrai défaut trouvé sur les infobulles** : les deux graphiques vivent
     dans un conteneur à défilement horizontal (`overflow-x: auto`, pour les
     16 semaines) ; or dès qu'un conteneur a `overflow-x` différent de
     `visible`, le navigateur force `overflow-y` à `auto` aussi (règle CSS
     standard). L'infobulle, positionnée au-dessus de chaque barre, se
     retrouvait donc rognée par ce défilement vertical forcé, sans indice
     qu'il fallait défiler pour la voir — reproduit et confirmé par une page
     de test isolée (survol sans effet visible avant correction). Corrigé en
     réservant la place de l'infobulle par un padding (`pt-20`/`pt-24` selon
     le graphique) compensé par une marge négative égale, pour ne pas pousser
     le reste de la carte vers le bas.
  3. **Choix des semaines affichées** : navigation précédent/suivant par
     blocs de 16 semaines entières (`?semaine=N`), plutôt qu'une plage de
     dates libre ou un simple choix de durée — les deux options écartées lors
     du choix avec le client. Par défaut, la fenêtre se termine 4 semaines
     après la semaine en cours (pas pile sur aujourd'hui), pour garder visible
     le travail déjà planifié dans les prochaines semaines sans naviguer. Les
     semaines sont désormais générées à partir de dates calendaires fixes
     (et non plus seulement celles qui ont des tâches) : une semaine vide
     s'affiche à zéro plutôt que de disparaître et décaler toute la fenêtre.
  4. **Paliers chargée/surcharge basés sur la capacité saisie** : à défaut de
     capacité propre à une semaine, repli désormais sur la **capacité
     hebdomadaire moyenne** dérivée de toute la capacité déjà saisie
     (`getAverageWeeklyCapacityMinutes`, moyenne journalière × 7 pour que les
     jours à 0 h volontaires — week-ends, fériés — pèsent correctement) —
     option choisie par le client face à "aucun statut sans capacité" et
     "garder les seuils fixes". Les seuils fixes (25 h / 40 h) ne servent
     plus qu'en tout dernier recours, si aucune capacité n'a jamais été
     saisie nulle part.
  - Testé en base : mathématiques de la fenêtre glissante (décalage de
    16 semaines pile entre "précédent"/"suivant", fenêtre par défaut incluant
    bien la semaine en cours et les 4 suivantes) et calcul de la moyenne
    pondérée par jour saisi, avec des données temporaires réelles.
- **Barres du graphique de charge désalignées — vrai défaut de production
  trouvé (2026-08-01), repéré par le client via une capture d'écran.** Les
  colonnes de semaines sont alignées par le bas (`items-end` sur la ligne),
  et la bulle "+n" (tâches sans estimation) n'était rendue que si elle avait
  quelque chose à afficher — une colonne avec bulle a donc une hauteur totale
  différente d'une colonne sans bulle, ce qui décale la barre elle-même vers
  le haut ou vers le bas d'une semaine à l'autre selon la présence ou non de
  cette bulle. Corrigé en rendant systématiquement la bulle (juste rendue
  `invisible` quand il n'y a rien à signaler) : chaque colonne a désormais
  toujours la même hauteur totale, donc toutes les barres restent alignées.
  Reproduit et confirmé par une page de test isolée avant/après.
- **Planning, cinquième passage (2026-08-01) : échéance par défaut,
  surbrillance, écarts, vue jour.**
  1. **Échéance par défaut** pour la base de calcul (`?base=evenement` pour
     revenir à la date d'évènement) — ce qu'il faut surveiller en priorité
     est quand une tâche doit être livrée.
  2. **Semaine en cours mise en surbrillance** dans les deux graphiques
     (fond teinté + anneau), pour repérer où on en est d'un coup d'œil.
     Appliquée en marge/fond uniforme sur **toutes** les colonnes (juste
     transparente pour les autres) plutôt qu'une marge propre à la semaine
     en cours seule — sinon même défaut que la bulle "+n" ci-dessus, une
     colonne de taille différente aurait redécalé les barres.
  3. **Couleurs de l'écart prévu/réel corrigées** : vert quand le réel est
     **en dessous** du prévu (marge, pas de surcharge), rouge dans le cas
     inverse — l'exact opposé de ce qui avait été livré la veille (raisonné
     alors comme "en retard sur le travail", alors que le sens voulu est
     "risque de surcharge"). Corrigé sur le graphique de tendance **et** sur
     la tuile "Écart moyen" du tableau de bord, qui utilisait la même logique
     inversée.
  4. **Nouvelle vue jour** (`DailyChart`, bascule "Vue semaine"/"Vue jour") :
     une semaine à la fois, sélectionnée indépendamment de la fenêtre de
     16 semaines de la vue semaine (navigation propre, précédent/suivant
     d'une semaine), une jauge horizontale par jour (chargé vs capacité),
     statut en icône. Repli sur la capacité **journalière** moyenne
     (capacité hebdomadaire moyenne ÷ 7) pour un jour sans capacité propre,
     même logique que la vue semaine ; un jour sans aucune capacité connue
     (ni propre ni moyenne) reste neutre plutôt que coloré arbitrairement.
  - Testé en base : agrégation des tâches et de la capacité par jour exact
- **Vue jour : barre de temps réel restant (2026-08-01).** Sous la jauge
  charge/capacité de chaque jour, une seconde barre "Reste" = temps estimé
  des tâches de ce jour **moins** le temps déjà réellement chronométré sur
  ces mêmes tâches — pas seulement l'estimation brute, qui ne dit rien de ce
  qui a déjà été avancé. Le temps chronométré est agrégé **par tâche, tous
  jours confondus** (une tâche peut avoir été travaillée avant son échéance),
  contrairement à la tendance prévu/réel de la vue semaine qui rattache le
  temps chronométré à la semaine où la session a eu lieu — deux questions
  différentes. Cas de dépassement (déjà travaillé plus que l'estimation)
  affiché explicitement ("Dépassé de Xh") plutôt que masqué en "0 min", pour
  ne pas laisser croire que la tâche est bouclée. Testé en base avec deux
  tâches réelles (l'une avec du temps restant, l'autre en dépassement).
- **Suppression définitive d'un contact (2026-08-02).** Jusqu'ici, retirer un
  contact d'un client (`deleteClientUser`) ne supprimait que le rattachement
  — l'identité `Contact` restait en base indéfiniment, orpheline dès qu'elle
  n'était plus rattachée à aucun client, et **invisible partout dans
  l'admin** (`/admin/contacts` ne liste que des rattachements, pas des
  contacts bruts). C'est ce qui empêchait de "réaffecter" un contact déjà
  retiré : son identité existait toujours (bloquant la création d'un nouveau
  contact avec le même email), sans qu'il soit possible de la retrouver.
  Deux décisions prises avec le client avant de coder :
  1. **Filtre "Sans client"** sur `/admin/contacts` (badge avec le nombre de
     contacts concernés) : rend enfin visibles les contacts orphelins, avec
     une action rapide "Affecter à un client" (réutilise telle quelle
     `createClientContactAnyClient`, aucune nouvelle action nécessaire) en
     plus de la suppression définitive.
  2. **Suppression définitive toujours possible, même si le contact est
     encore rattaché à d'autres clients** (plutôt que de la limiter aux
     seuls orphelins) — avec avertissement explicite listant les clients
     concernés avant confirmation, car `ClientContact.contactId` est en
     cascade en base : supprimer un contact partagé le retire de **tous**
     ses clients d'un coup, pas seulement de celui où on l'a repéré.
  Action protégée par reconfirmation du mot de passe admin (même famille que
  `deleteClient`), sessions actives détruites avant suppression, journalisée
  dans `/admin/audit`. Testé en base : cycle complet réel (rattaché à
  2 clients → retiré des deux → redevenu orphelin → réaffecté → session
  détruite → suppression définitive confirmée en cascade).
- **Temps & rentabilité par client (2026-07-30)**, nouvelle section en bas de
  `/admin/finances`. Le temps était chronométré depuis le 2026-07-21 mais
  n'était lisible que tâche par tâche. Cette vue rapproche, sur une période
  au choix (30 jours / 12 mois / depuis le début), le temps réellement passé
  et le montant facturé, pour faire apparaître le **taux horaire réel** par
  client. Deux précautions structurantes : le taux n'est affiché que si les
  deux grandeurs sont renseignées (du temps sans facture n'est pas "0 €/h"
  mais "pas encore facturé" ; une facture sans temps suivi n'est pas un taux
  infini), et le taux global du pied de tableau n'agrège que les clients où
  les deux sont suivis — sinon un client facturé sans chrono gonflerait
  mécaniquement la moyenne. Une session à cheval sur la borne de période
  compte pour le jour où elle a commencé.
- **Carnet de contacts et accès à l'espace client dissociés (2026-07-30).**
  Jusque-là, `ClientUser` confondait deux choses : le contact chez le client
  (nom, fonction, email, téléphone) et son compte de connexion — impossible
  d'enregistrer un interlocuteur sans lui ouvrir un espace, ni de couper un
  accès sans supprimer la fiche. Les deux notions sont désormais séparées
  sur le même modèle, sans table supplémentaire :
  - `ClientUser.email` et `ClientUser.passwordHash` deviennent **nullables**
    (un contact peut n'avoir qu'un téléphone), et un nouveau champ
    `portalAccessEnabled` porte l'interrupteur d'accès.
  - Trois états lisibles dans l'admin, calculés par `contactAccessState`
    (src/lib/clients.ts) : **Contact seul** (pas d'accès), **Invitation à
    envoyer** (accès ouvert, mot de passe pas encore choisi), **Espace
    client actif**. L'état intermédiaire est volontairement distinct : un
    contact invité et jamais connecté ne doit pas passer pour opérationnel.
  - Section "Comptes de connexion" de la fiche client renommée
    **"Contacts"**. Chaque contact s'édite sur place (nom, email, téléphone,
    fonction), avec un bouton "Ouvrir/Fermer l'accès" et un bouton
    "Envoyer l'invitation" séparés — ouvrir sans inviter est un état valide.
    Fermer l'accès **conserve** le contact et son mot de passe (rouvrir ne
    demande pas de nouvelle invitation) mais révoque les sessions en cours,
    sinon la fermeture ne prendrait effet qu'à la déconnexion suivante.
  - Création d'un contact en trois modes (choix du client le 2026-07-30 :
    "les deux, au choix") : sans accès, avec invitation par email (lien de
    choix du mot de passe, même mécanique que "mot de passe oublié"), ou
    avec un mot de passe défini par l'admin.
  - Conséquences de sécurité, toutes couvertes : la connexion refuse un
    contact sans accès ouvert (`canLogIn`, message d'erreur inchangé pour ne
    pas révéler l'existence du compte) ; le formulaire public "mot de passe
    oublié" traite un contact sans accès comme inexistant ; l'usurpation
    d'espace client est refusée ; et les notifications automatiques ne
    partent qu'aux contacts ayant **à la fois** un email, l'interrupteur de
    notification activé et un accès ouvert (`notifiableEmails`, seul point
    de vérité) — ces emails disent tous "c'est disponible dans votre espace
    client", les envoyer à quelqu'un qui ne peut pas s'y connecter n'aurait
    aucun sens. La vue consolidée de `/admin/reglages` ne liste donc plus
    que les contacts ayant un accès.
  - Migration `20260730113943_contacts_client_category` : `ADD COLUMN
    portalAccessEnabled BOOLEAN NOT NULL DEFAULT false` aurait coupé l'accès
    à **tous** les comptes clients existants, un `UPDATE` explicite a été
    ajouté à la main pour rétablir `true` partout où un mot de passe
    existait déjà.
- **Catégorisation et tri des clients (2026-07-30).** Nouveau champ
  `Client.categoryId` pointant sur un `DropdownItem` de la liste
  `client_category` — donc gérée depuis `/admin/listes` comme les autres,
  avec badge coloré et ordre d'affichage gratuits, et aucune migration
  nécessaire pour ajouter une catégorie. Liste ouverte, aucun code ne
  branche sur un slug : les 6 valeurs seedées (Club, Marque, Artiste,
  Agence, Événementiel, Particulier) ne sont qu'un point de départ.
  `onDelete: SetNull` — supprimer une catégorie ne supprime pas les clients.
  Sur `/admin/clients` : recherche (portant sur le nom du client, son email
  de facturation **et** le nom/email de ses contacts — chercher "Julie" doit
  retrouver le club dont elle est la responsable), filtre par catégorie avec
  compteurs, pastille "Non catégorisés", et tri étendu à "Nombre de tâches"
  en plus de l'alphabétique et de la date d'ajout. Les compteurs des
  pastilles sont calculés sur tous les clients, pas sur le résultat filtré,
  sinon cliquer une catégorie ferait tomber les autres à zéro. Recherche,
  filtre et tri se conservent mutuellement dans l'URL.
- **Onglet "Contacts" dans le bandeau admin (2026-07-30)**, `/admin/contacts`
  : tous les contacts tous clients confondus, avec recherche (nom, email,
  téléphone, fonction), filtre par état d'accès et par client, email et
  téléphone cliquables, et lien vers la fiche du client. Volontairement en
  lecture seule : un contact se crée et se modifie depuis la fiche de son
  client, cette page sert à le **retrouver**. Le client de démonstration
  publique en est exclu (son "contact" est un compte technique).
- Administration des envois d'email par profil client (2026-07-20), pour
  éviter de spammer un contact qui n'a pas besoin d'être notifié (client
  avec plusieurs comptes de connexion) : nouveau champ
  `ClientUser.emailNotificationsEnabled`, **désactivé par défaut** (opt-in —
  ajusté le 2026-07-20 même jour, initialement activé par défaut) : un
  nouveau profil ne reçoit aucune notification tant que l'admin ne l'active
  pas explicitement. Bascule en un clic sur la fiche client (pastille
  cloche/cloche barrée, section "Comptes de connexion", même pattern que
  l'épinglage des tâches). Contrôle les notifications automatiques
  adressées aux comptes client (nouvelle tâche à valider, rappel d'échéance,
  nouveau livrable/document, relance de
  paiement, confirmation de BAT validé) — n'affecte jamais l'email de
  réinitialisation de mot de passe (sécurité, pas une notification). Vue
  consolidée ajoutée le 2026-07-20 (même jour) sur `/admin/reglages` :
  tous les comptes de connexion, tous clients confondus, regroupés par
  client avec la même bascule — pour ne pas avoir à ouvrir chaque fiche
  client un par un afin de vérifier qui est notifié.
- Historique des changements de statut d'une tâche — audit trail
  (2026-07-21) : nouveau modèle `TaskStatusHistory` (une ligne par
  changement, jamais réécrite ni supprimée — même pattern que
  `TaskRefusalHistory`), alimenté à la création de la tâche (statut initial
  "Nouveau") et à chaque changement ultérieur, admin (`setTaskStatus`) comme
  client (`validateTask`/`refuseTask`). Chaque ligne garde le statut
  atteint, la date et l'heure précises, et qui a fait le changement (nom +
  admin/client, dénormalisés pour rester lisibles même si le compte est
  supprimé plus tard). Consultable sur `/admin/taches/[taskId]`, section
  "Historique des statuts" — couvre aussi la validation de BAT, qui est un
  changement de statut comme un autre dans cet historique.
- Tâches du client de démo masquées des vues de gestion courantes
  (2026-07-21) : le client de démo public (`Client.isDemo`, voir section
  "Espace client") alimentait ses tâches d'exemple dans `/admin/taches`
  (toutes vues) et le tableau de bord (`/admin`), au milieu des vraies
  tâches. Corrigé en excluant ce client des requêtes de ces deux pages
  (nouveau filtre partagé `EXCLUDE_DEMO_CLIENT_TASKS`, `src/lib/tasks.ts`).
  Choix explicite de coder ce filtre en dur plutôt que d'ajouter un réglage
  admin dédié, pour rester simple — ses tâches restent entièrement
  consultables et gérables depuis la fiche du client de démo lui-même
  (`/admin/clients/[clientId]`), qui n'est pas concernée par ce filtre.
- Suppression de documents (2026-07-21) : jusqu'ici un document
  (devis/contrat/facture) ne pouvait être qu'ajouté, jamais supprimé.
  Nouvelle action `deleteDocument` (miroir de `deleteDeliverable`/
  `deleteAttachment` — efface aussi le fichier du stockage, pas seulement
  la ligne en base), bouton "Supprimer" ajouté sur chaque document, sur
  `/admin/documents` comme sur la fiche client.
- Suivi du temps passé par tâche (2026-07-21), avec chronomètre — jamais
  visible côté espace client. Décisions prises avec le client avant
  développement (les 4 points ci-dessous) : démarrage/arrêt uniquement
  depuis la fiche tâche (pas de bouton rapide sur les listes) ; ajout
  manuel de temps en plus du chronomètre (correction, oubli de lancer le
  chrono) ; journal détaillé des sessions (pas seulement le total) ; jauge
  colorée sur la vue Liste et la fiche tâche uniquement (pas Kanban/Par
  client). Livré :
  - Nouveau modèle `TaskTimeEntry` (une session = `startedAt`/`endedAt`,
    `endedAt: null` = session en cours). Un seul admin dans ce projet, donc
    un seul chronomètre actif à la fois : le démarrer sur une tâche arrête
    automatiquement celui en cours sur une autre tâche (`startTaskTimer`).
  - Chronomètre visible dans le header sur toutes les pages admin (pas
    seulement la fiche tâche), avec le titre de la tâche en cours, le temps
    écoulé en direct et un bouton "Arrêter".
  - Nouveau champ `Task.estimatedMinutes` (minutes, optionnel), éditable
    dans le formulaire de la fiche tâche.
  - Jauge colorée temps passé/temps estimé : vert en dessous de 80 % de
    l'estimation, orange de 80 % à 100 %, rouge au-delà — sur la colonne
    "Temps" de la vue Liste et sur la fiche tâche. Sans temps estimé
    renseigné, affiche juste le temps passé en texte (rien à comparer).
  - Sur la fiche tâche, journal des sessions (date, durée, "ajouté
    manuellement" si applicable) avec suppression individuelle, et
    formulaire d'ajout manuel de temps (date + durée en minutes) pour
    corriger un oubli de chronomètre.
  - Jamais exposé côté espace client (aucune page client n'importe ces
    champs/composants) ni dans les exports/rapports PDF existants.
- Validation/refus de BAT directement depuis l'admin (2026-07-21) : jusqu'ici
  seul le client pouvait valider/refuser un BAT depuis son espace. Ajout de
  boutons "Valider"/"Refuser" sur `/admin/taches/[taskId]`, visibles
  uniquement quand le statut est "À valider" (même formulaire de motif que
  côté client pour un refus). Décision prise avec le client avant
  développement : le client reçoit la même notification email que
  s'il avait validé/refusé lui-même, avec la mention "Validé/Refusé par
  Mikko (admin)" — l'admin ne se notifie pas lui-même dans ce cas (contre
  toujours notifié quand c'est le client qui valide/refuse).
- Échéance du jour distinguée du retard (2026-07-21) : une tâche dont
  l'échéance de livraison tombe aujourd'hui apparaissait comme "en retard"
  (rouge). Corrigé : le seuil de retard est désormais minuit du jour même
  (pas l'heure courante) — une échéance today s'affiche en bleu gras sans
  la mention "en retard", une échéance passée reste en rouge avec la
  mention. Appliqué aux 3 vues (Liste, Kanban, cartes fiche client) et au
  compteur "en retard" du tableau de bord.
- Numéros de semaine sur la vue Calendrier (2026-07-21) : chaque ligne de
  semaine affiche désormais "S27", "S28"... (numérotation ISO 8601),
  côté admin comme côté espace client (`TaskCalendarView` est partagé par
  les deux).
- Tri de la vue Clients (2026-07-21) : `/admin/clients` n'avait qu'un tri
  fixe (date d'ajout, plus récent en premier). Ajout d'un contrôle "Trier
  par" (alphabétique ou date d'ajout, croissant/décroissant), même pattern
  que le tri déjà existant sur les tâches.
- Nouveau statut "Non commencé" (2026-07-21) : ajouté entre "Nouveau" et "En
  cours" — rouvre explicitement le cycle des statuts verrouillé le
  2026-07-13, à la demande du client. Se replie sur l'étape "Nouveau" dans
  la timeline simplifiée de l'espace client (aucun changement visuel côté
  client, les deux statuts signifient "pas encore démarré" de son point de
  vue) ; a sa propre colonne sur la vue Kanban admin (générée
  automatiquement à partir de la liste des statuts, aucun code dédié
  nécessaire).
- Signalement : masquer les tâches de l'espace de démonstration des vues
  courantes (2026-07-21) — déjà livré le 2026-07-20 (`EXCLUDE_DEMO_CLIENT_TASKS`
  sur `/admin/taches` et le tableau de bord), confirmé par le client comme
  un doublon, rien à refaire.
- Module de notes internes façon Apple Notes (2026-07-23), nouvel onglet
  "Notes" du nav admin, jamais exposé côté espace client (précisé
  explicitement par le client). Trois choix tranchés avant développement :
  organisation en dossiers + épinglage (plutôt qu'une simple liste
  chronologique ou des tags), rattachement optionnel d'une note à un client
  (filtre par client dans le module, pas d'onglet dédié sur la fiche
  client), formatage riche complet (titres, gras/italique/souligné/barré,
  listes à puces/numérotées, checklists cochables, citation) via un éditeur
  Tiptap plutôt qu'un simple texte + checklists. Nouveaux modèles
  `NoteFolder` et `Note` ; page `/admin/notes` en petite SPA côté client
  (dossiers/notes/note sélectionnée en state React) avec sauvegarde
  automatique débouncée (600 ms) — pas de bouton "Enregistrer", pas de
  rechargement de page à chaque frappe, exactement le comportement d'Apple
  Notes.
- Rendre tout l'admin utilisable jusqu'à mobile (2026-07-23), à la demande
  du client ("resizer la fenêtre, adapté à la taille de l'écran"). Deux
  précisions tranchées avant développement : périmètre = tout l'admin (pas
  seulement le module Notes qui venait d'être livré) ; cible = jusqu'à
  tablette/mobile (pas seulement une fenêtre desktop réduite). Corrections
  concrètes : en-tête admin (bouton "Se déconnecter" en icône seule sous
  `sm`, évite le retour à la ligne qui le faisait déborder de la bande de
  64px) ; ligne d'actions d'un compte de connexion sur la fiche client qui
  débordait hors écran (passage en `flex-wrap`) et email de compte trop
  long qui débordait de sa carte (`break-all`) ; vue Calendrier des tâches
  (admin et espace client, composant partagé) dont la grille 8 colonnes
  faisait défiler la page entière horizontalement — encapsulée dans son
  propre conteneur à défilement, comme le Kanban et le tableau de la vue
  Liste le faisaient déjà ; module Notes passé d'un layout 3 colonnes figées
  (inutilisable sous ~900px) à une navigation à un seul panneau sur mobile
  façon Apple Notes iPhone (dossiers → notes → édition, avec retour),
  toujours 3 colonnes à partir de `md` (768px). Le reste de l'admin
  (Clients, Tâches en vue Liste, Documents, Mail, Portfolio, Listes,
  Exports, Réglages) était déjà correctement responsive (cartes empilables,
  tableaux déjà à défilement horizontal contenu) et n'a pas nécessité de
  changement.
- Épuration du tableau de la vue Liste des tâches (2026-07-23) : les
  colonnes Type/Formats/Temps, moins consultées au premier coup d'œil que
  l'échéance ou le statut, sont repliées par défaut derrière un triangle par
  ligne (`TaskTableRow`, nouveau composant client) plutôt que 3 colonnes
  toujours visibles — dépliage indépendant par ligne, pas de mémorisation
  entre rechargements. Le lien "Modifier" (dernière colonne) a été retiré :
  redondant avec le titre de la tâche, déjà cliquable vers sa fiche.
- Client de démo caché partout dans l'admin (2026-07-23), même logique que
  `EXCLUDE_DEMO_CLIENT_TASKS` mais appliquée aux requêtes qui listent des
  *clients* plutôt que des tâches (nouveau filtre partagé
  `EXCLUDE_DEMO_CLIENT`, `src/lib/clients.ts`) : liste `/admin/clients`,
  tableau de bord (compteur et "clients sans activité récente"), sélecteurs
  "Client" (Tâches, Documents, Notes, Mail, création de tâche), Réglages, et
  l'export CSV clients. Reste géré normalement depuis sa propre fiche
  (`/admin/clients/[clientId]`, qui n'utilise pas ce filtre).
- Nouvelles suggestions gestion des tâches (2026-07-23, proposées par Claude
  Code à la demande du client, 5 retenues sur 6 proposées) :
  - **Dupliquer une tâche** : bouton "Dupliquer" sur la fiche tâche
    (`duplicateTask`), recrée une tâche "Nouveau" pour le même client avec
    titre (suffixé " (copie)"), description, types, formats et temps estimé
    — sans dates ni historique/livrables/pièces jointes/commentaires/temps
    passé, spécifiques à l'exécution de l'originale. Redirige vers la copie.
  - **Checklist par tâche** : nouveau modèle `TaskChecklistItem`, section
    "Checklist" sur la fiche tâche (sous-étapes cochables, ex. "logo reçu"),
    ajout/coche/suppression, jamais exposée côté espace client.
  - **Actions groupées sur la vue Liste** : case à cocher par ligne + "tout
    sélectionner", barre d'actions apparaissant dès qu'une tâche est
    sélectionnée (changer le statut ou archiver plusieurs tâches en une
    fois) — `bulkSetTaskStatus`/`bulkArchiveTasks`, qui réutilisent
    `setTaskStatus`/`archiveTask` par tâche (mêmes notifications et
    historique que les actions individuelles).
  - **Pastille de compteur sur "Tâches" dans le nav admin** : nombre de
    tâches en retard + à valider, visible sans ouvrir la page (même calcul
    que les compteurs du tableau de bord).
  - **Glisser-déposer dans le Kanban** : déjà livré précédemment (pas une
    nouvelle demande, juste reconfirmé) — chaque carte est `draggable`,
    dépose sur une colonne = `setTaskStatus`, avec repli clavier/tactile via
    le menu déroulant de statut sur la carte.
- Signalement : page blanche en envoyant un JPG et un MP4 ensemble en
  livrable (2026-07-24). Le code de validation par type/taille était
  correct (les deux types sont autorisés), mais rien n'attrapait une
  exception venant du stockage ou de la mémoire serveur pendant l'envoi —
  elle remontait donc telle quelle jusqu'à l'écran d'erreur générique de
  Next.js (page blanche), au lieu d'un message dans le formulaire. Corrigé :
  `uploadDeliverable` et `uploadAttachment` (src/lib/actions/files.ts)
  attrapent maintenant ce type d'échec et renvoient un message clair
  ("réessayez avec moins de fichiers à la fois, ou un par un"). Ajout au
  passage d'un `src/app/admin/error.tsx` : filet de sécurité pour tout le
  reste de l'admin, qui n'avait jusqu'ici aucun écran d'erreur habillé
  (n'importe quelle exception non gérée ailleurs affichait la même page
  blanche par défaut).
- Nouvelles suggestions côté backend (2026-07-24, proposées par Claude Code
  à la demande du client, 4 retenues sur 5 — la relance automatique de
  factures impayées écartée) :
  - ~~**Pastille de compteur sur "Mail" dans le nav**~~ — **supprimée avec
    l'onglet Mail le 2026-07-30** (voir plus haut), ainsi que la fonction
    `getUnreadThreadCount` qui la calculait. Description d'origine : nombre
    de fils Gmail non lus, tous clients confondus, mis en cache 60s en
    mémoire process pour limiter les appels Gmail API.
  - **Panneau sécurité dans Réglages** : les tentatives de connexion
    échouées (`LoginAttempt`, déjà utilisées pour bloquer le brute-force)
    n'étaient jusqu'ici affichées nulle part ; nouvelle section "Sécurité"
    listant les 10 dernières tentatives échouées des 7 derniers jours, avec
    mise en évidence si le compte admin est concerné.
  - **Rappels sur une note** : nouveaux champs `Note.reminderAt`/
    `reminderSentAt`, sélecteur de date dans l'éditeur d'une note, nouvelle
    vue "Rappels" dans le module Notes (triée par échéance, pastille de
    compteur pour les rappels du jour ou en retard). Nouveau cron quotidien
    (`/api/cron/note-reminders`, 7h, même protection `CRON_SECRET` que la
    purge des livrables) envoyant un email récapitulatif pour les rappels
    arrivés à échéance.
  - **Export complet en un clic** : nouveau bouton "Exporter toutes mes
    données (ZIP)" sur `/admin/exports`, regroupant les 3 CSV (clients,
    tâches — et un nouvel export documents, qui n'existait pas encore) dans
    une seule archive. Écriture ZIP maison (`src/lib/zip.ts`, méthode
    "stored") plutôt qu'une dépendance dédiée, pour quelques fichiers texte.
- Signalement : l'envoi de plusieurs livrables d'un coup ("13 livrables pour
  8,4 Mo") faisait ramer l'admin (2026-07-24). Cause : la grille de fichiers
  (`FileGrid`, livrables et pièces jointes) affichait chaque vignette avec
  l'image **originale en pleine résolution** (juste réduite en CSS dans un
  carré de 112px) — une dizaine de photos, c'est une dizaine de téléchargements
  et décodages d'images complètes rien que pour les aperçus. Corrigé : nouvelle
  vignette générée à la volée (`src/lib/thumbnail.ts`, `sharp`, 320px, WEBP,
  orientation EXIF corrigée), servie via `?thumb=1` sur les routes de
  livrables/pièces jointes (après filigrane le cas échéant pour les BAT vus
  par le client, jamais avant), plus `loading="lazy"`. Le lightbox (clic sur
  la vignette) continue d'utiliser l'image d'origine en pleine résolution.
- Démarrer/arrêter le chronomètre directement depuis la vue Liste des
  tâches (2026-07-24), sans ouvrir la fiche tâche : nouveau
  `TaskTimerIconButton` (icône lecture/stop, à côté de l'épingle), même
  règle qu'ailleurs — démarrer sur une tâche arrête automatiquement le
  chrono d'une autre tâche s'il y en avait un en cours. Cela rouvre un choix
  pris le 2026-07-21 ("démarrage/arrêt sur la fiche tâche uniquement") à la
  demande explicite du client ; la version complète avec le temps écoulé en
  direct reste sur la fiche tâche.
- Compteur "Tâches" du tableau de bord corrigé (2026-07-28) : affichait le
  total de toutes les tâches, y compris "Terminé" — désormais le grand
  nombre est celui des tâches **en cours** (hors "Terminé"), le total
  complet affiché en petit en dessous.
- **Nouveau module Prospection (CRM léger), 2026-07-28** : nouvel onglet
  "Prospection" dans le bandeau admin (entre "Clients" et "Tâches"), avec
  pastille de compteur (relances dues aujourd'hui/en retard, même
  convention que "Tâches"/"Mail"). Nouveau modèle `Prospect` (nom,
  entreprise, adresse, téléphone, email, Instagram, notes) et nouvelle liste
  de statuts verrouillée (5 valeurs, même principe que les statuts de tâche) :
  **À faire → En cours → Discussions en cours → Fermé / Archivé**. Livré :
  - `/admin/prospection` : liste avec filtres (statut, recherche texte) et
    bascule Liste/Kanban (glisser-déposer natif, même pattern que le Kanban
    des tâches).
  - `/admin/prospection/nouveau` et fiche prospect
    (`/admin/prospection/[id]`) : création/édition, changement de statut,
    suppression (`DeleteButton`, même pattern que documents/livrables).
  - **Relances** : date de relance par prospect (préremplie depuis un
    nouveau réglage `AppSettings.prospectReminderDefaultDays`, éditable/
    effaçable sur `/admin/reglages`), alerte email **à l'admin** (pas au
    prospect) à échéance via un nouveau cron quotidien
    (`/api/cron/prospect-reminders`, même garde `CRON_SECRET` que les crons
    existants), plus un bouton "Envoyer une alerte maintenant" pour une
    relance manuelle immédiate.
  - **Envoi d'email** à un prospect directement depuis sa fiche, via le
    Gmail de l'admin déjà connecté (même composeur que pour les clients) —
    message de repli clair si Gmail n'est pas connecté.
  - **Conversion en client** ("Convertir en client") : crée un `Client` (et
    un `ClientUser` si un email est renseigné, avec mot de passe aléatoire
    puis email "définissez votre mot de passe" — jamais de mot de passe en
    clair choisi par l'admin), marque le prospect "Fermé" et le relie au
    client créé (jamais supprimé).
  - **Recherche automatique de prospects par IA** : bouton sur
    `/admin/prospection` qui interroge l'API Anthropic (recherche web) pour
    trouver et ajouter directement des prospects réels correspondant à une
    description libre (ex. "photographes de mariage à Lyon") — consigne
    stricte de ne jamais inventer de coordonnées, déduplication contre les
    prospects existants. Masqué proprement si `ANTHROPIC_API_KEY` n'est pas
    configurée (guide dédié : `GUIDE_PROSPECTION_IA.md` — contrairement aux
    autres services externes du projet, celui-ci n'est pas gratuit, facturé
    à l'usage par Anthropic).
  - **Signalement trouvé et corrigé pendant les tests de cette
    fonctionnalité** : l'envoi d'un email (prospect ou client) plantait
    entièrement la page si le token Gmail de l'admin était expiré/révoqué
    (`invalid_grant`) — seul le cas "jamais connecté" était géré proprement
    avant. Corrigé à la source (`getGmailClient` dans `src/lib/gmail.ts`),
    ce qui corrige aussi le même risque latent sur l'envoi d'email côté
    fiche client, pas seulement Prospection.
  - **Mini fil d'historique par prospect** (2026-07-28, suggestion retenue) :
    nouveau modèle `ProspectActivity` (une ligne par évènement, jamais
    réécrite ni supprimée — même esprit que `TaskStatusHistory`), affiché en
    ordre chronologique inverse sur la fiche prospect, section "Historique".
    Trace la création, chaque changement de statut (liste, fiche ou Kanban),
    chaque email envoyé, chaque relance (manuelle ou automatique via le
    cron) et la conversion en client.
  - **Lien direct vers la fiche client convertie** (2026-07-28, suggestion
    retenue) : une fois un prospect converti, "Voir la fiche client →"
    s'affiche directement sur sa ligne dans la vue Liste et sur sa carte
    dans le Kanban (pas seulement sur sa propre fiche), pour y accéder sans
    ouvrir le prospect d'abord.
  - **Vue Liste façon tableur éditable, 2026-08-17** : nom, entreprise,
    téléphone, email, Instagram et date de relance s'éditent désormais
    directement dans chaque cellule de `/admin/prospection` (enregistrement
    au blur/changement, sans ouvrir la fiche), même principe que le champ de
    date déjà éditable en place sur `/admin/finances` et
    `/admin/documents`. La pastille de statut reste le même
    `ProspectStatusSelect` que le Kanban. Le nom ne peut pas être vidé
    (champ requis, cellule ignorée si laissée vide) ; une cellule email
    invalide est ignorée plutôt qu'enregistrée. La fiche complète (notes,
    envoi d'email, historique, suppression) reste accessible en un clic via
    une icône en fin de ligne.
  - **Quatre nouveaux champs prospect, 2026-08-17** : `Prospect.city`
    (Ville), `Prospect.activityLevel` (note libre sur l'activité/l'audience,
    ex. "Très actif — 254 posts", distinct de `ProspectActivity` le fil
    d'historique), `Prospect.instagramUrl` (lien direct vers le profil, en
    plus du champ `instagram` existant qui garde le "@compte") et
    `Prospect.whatsappUrl` (lien `wa.me` direct) — déclenché par un fichier
    de repérage terrain réel (tableur ~90 lignes de clubs/lieux) fourni par
    le client, dont ces colonnes ne correspondaient à aucun champ existant.
    Choix confirmé avant de coder : nouveaux champs dédiés (visibles et
    éditables dans le tableau) plutôt que tout regrouper dans "Notes".
    Colonnes ajoutées à la vue Liste (tableur), à la fiche prospect
    (`ProspectForm`) et à l'import CSV.
  - **Import CSV enrichi pour ces 4 champs + repli sur une colonne "Contact"
    combinée, 2026-08-17** : `COLUMN_SYNONYMS` reconnaît désormais
    "Ville"/"Lien Instagram"/"Lien WhatsApp"/"Activité" (et "Établissement"
    comme synonyme de "Nom") — le fichier réel du client utilise ces
    intitulés tels quels. Une colonne "Contact" mélangeant téléphone(s) et
    email sur une même cellule (cas réel : `"03 28 50 90 28 / 07 86 47 01
    41 / contact@lemanoir.fr"`) est désormais scindée automatiquement
    (premier téléphone + premier email trouvés par expression régulière),
    tout numéro/texte en trop étant reversé dans les notes plutôt que perdu
    — seulement en repli, si les colonnes "Téléphone"/"Email" dédiées sont
    absentes. **Décision assumée** : "activite" était auparavant un
    synonyme de `company` (label du formulaire "Entreprise / activité") ;
    retiré de `company` et réservé à `activityLevel`, plus littéral une
    fois qu'un vrai fichier de référence existe — changement de
    comportement sur ce synonyme précis, aucun autre. Modèle CSV
    téléchargeable (`public/modele-import-prospects.csv`) mis à jour avec
    les nouvelles colonnes.
- **Guide client PDF ("mode d'emploi"), 2026-07-28** : nouveau bouton
  "Télécharger le mode d'emploi (PDF)" sur `/admin/reglages`, section "Mode
  d'emploi client". Document généré à la volée (`@react-pdf/renderer`, même
  thème/police que le rapport de tâches existant, désormais factorisé dans
  `src/components/pdf/pdf-theme.ts`) expliquant chaque onglet de l'espace
  client (connexion, application installable, accueil, à valider, suivi,
  calendrier, livrables, administratif, suggestion, mon compte) avec une
  illustration fidèle à l'interface réelle par section. Choix confirmé par
  le client : PDF téléchargeable uniquement (pas de page d'aide intégrée à
  l'espace client).
- **Validation logicielle (VSI) permanente, 2026-07-28** : nouveau document
  `VALIDATION.md` à la racine, même esprit que `CAHIER_DES_CHARGES.md` —
  cas passants et cas bloquants réellement testés, par fonctionnalité, mis
  à jour à chaque livraison désormais (règle ajoutée dans `CLAUDE.md`).
  Portée de cette première version : les fonctionnalités livrées le
  2026-07-28 seulement (l'historique complet n'a pas été rejoué
  rétroactivement).
- **Verrou paiement sur les livrables finaux, 2026-08-21** : accès aux
  livrables finaux (jamais les BAT, toujours visibles pour validation)
  conditionnable au paiement, activable par client (réglage par défaut pour
  tous ses évènements, case à cocher "Paiement requis avant l'accès aux
  livrables finaux" sur la fiche client) et/ou évènement par évènement
  (exception ponctuelle sur la fiche tâche : "Suivre le réglage client" /
  "Toujours verrouillé" / "Toujours débloqué" — le réglage évènement prime
  toujours sur celui du client). Quatre décisions confirmées avec le client
  avant de coder : (1) granularité à l'évènement, pas au fichier individuel ;
  (2) le réglage client est un défaut avec exceptions par évènement, pas deux
  interrupteurs indépendants ; (3) le déblocage est une **confirmation
  manuelle par l'admin** ("Marquer comme payé" sur la fiche tâche,
  annulable), volontairement indépendante du système de facturation — un
  évènement peut être débloqué avant même qu'une facture existe, ou laissé
  verrouillé après un paiement en ligne si l'admin veut garder la main ; (4)
  le client bloqué voit un message l'informant qu'un paiement est requis.
  Nouveaux champs `Client.requirePaymentForDeliverables`,
  `Task.deliverablesLockOverride`, `Task.deliverablesPaymentConfirmedAt` —
  calcul centralisé dans `src/lib/payment-locks.ts`. Verrou appliqué à deux
  endroits : l'affichage (`/espace-client/livrables`) **et** le
  téléchargement lui-même (`/api/fichiers/livrables/[id]`, code 402), pour
  qu'un lien direct ne contourne pas le blocage.
  - **Correction du 2026-08-22, "il ne s'agit pas de factures mais bien de
    paiement, on fera les liens aux factures beaucoup plus tard"** : le
    message côté client renvoyait vers `/espace-client/administratif` (les
    factures) avec le bouton "Voir mes factures et payer" — supprimé,
    laissant seulement le message d'attente de paiement, pour ne pas
    laisser croire à un lien avec une facture réelle qui n'existe pas
    encore.
- **Verrou paiement "avant de travailler", 2026-08-22** : même mécanique que
  le verrou livrables ci-dessus (réglage par défaut par client + exception
  ponctuelle par évènement, confirmation manuelle indépendante de la
  facturation), mais appliqué en amont plutôt qu'en aval : case à cocher
  "Paiement requis avant de commencer le travail" sur la fiche client,
  contrôle identique sur la fiche tâche (affiché seulement tant que la
  tâche est au statut "Nouveau", puisque le verrou ne concerne que le
  démarrage). Deux points confirmés avant de coder : (1) interrupteur
  manuel comme le verrou livrables, pas de bouton de paiement réel Stripe/
  PayPal pour ce lot (resterait à faire si besoin plus tard) ; (2)
  **blocage réel**, pas un simple rappel visuel — `setTaskStatus` refuse
  désormais toute sortie du statut "Nouveau" tant que le paiement n'est pas
  confirmé (Kanban glisser-déposer et sélecteur de statut inclus, les deux
  appellent la même fonction). Nouveaux champs
  `Client.requirePaymentBeforeWork`, `Task.workLockOverride`,
  `Task.workPaymentConfirmedAt`. Purement un contrôle interne admin, sans
  volet client-facing dans ce lot (non demandé). `src/lib/payment-locks.ts`
  (renommé depuis `deliverables-lock.ts`, qui ne portait plus que la
  moitié de la logique) centralise désormais les deux calculs
  (`isDeliverablesLocked`/`isWorkLocked`), et `TaskPaymentLockControl` sert
  les deux contrôles via une prop `kind`.
- **Deuxième moyen de paiement en ligne : PayPal, 2026-08-21** : à la
  demande explicite du client pendant la conception du verrou paiement
  ci-dessus ("est-ce possible avec PayPal ou Revolut ?"), PayPal ajouté **en
  plus** de Stripe (les deux boutons "Payer"/"Payer avec PayPal" s'affichent
  côte à côte sur `/espace-client/administratif` si les deux sont
  configurés) — Revolut écarté pour l'instant (compte Business avec accès
  API requis, non disponible sur tous les plans). Intégration via l'API REST
  PayPal Orders v2 en appel direct (`fetch`, pas de SDK Node officiel
  maintenu, contrairement à Stripe) — voir `src/lib/paypal.ts`. Capture au
  retour du paiement (`/api/paypal/capture`) plutôt qu'un webhook séparé :
  plus simple à configurer côté PayPal (aucune URL à déclarer dans leur
  tableau de bord), au prix de ne pas confirmer un paiement si le client
  ferme l'onglet avant d'être redirigé — limite connue, voir
  `VALIDATION.md`. `PAYPAL_CLIENT_ID`/`PAYPAL_CLIENT_SECRET` absents =
  bouton masqué proprement, même dégradation que Stripe.

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
- **Passe de performance** (2026-08-16, suite à un signalement "le site est
  relativement lent") : audit du SQL des migrations Prisma existantes, qui a
  montré que la plupart des colonnes de clé étrangère (`Task.clientId`,
  `Document.clientId`, `Deliverable.taskId`...) n'avaient jamais eu d'index
  dédié — Prisma n'en crée pas automatiquement, contrairement à certains
  autres ORM. 18 index ajoutés (migration purement additive, sans risque
  pour les données). Corrigé en parallèle : la page d'accueil et les pages
  pilier du portfolio (les plus visitées côté public) répétaient deux fois
  la même requête (une fois pour les métadonnées de la page, une fois pour
  son contenu) au lieu de la partager, et enchaînaient leurs sections l'une
  après l'autre plutôt que de lancer leurs requêtes en parallèle.
- **Deuxième passe de performance — cause des crashs trouvée** (2026-08-23,
  signalement "le site et l'app sont lentes, et ça crashe souvent") :
  diagnostic mené par la mesure, pas par lecture de code seule.
  - **Cause des crashs : saturation mémoire à l'envoi de livrables.** Le
    conteneur web Scalingo fait **512 Mo** (confirmé par le client). Or
    recevoir un fichier coûte **~2,5 fois sa taille** en mémoire (mesuré :
    corps de requête bufferisé par Next, puis copie de `file.arrayBuffer()`),
    et la limite applicative était de **500 Mo par fichier**, avec
    `bodySizeLimit`/`proxyClientMaxBodySize` à **2 Go** dans
    `next.config.ts`. Autrement dit, un seul livrable de 200 Mo réclamait
    ~500 Mo, soit plus que la machine entière : le conteneur était tué, ce
    qui explique à la fois les redémarrages et la lenteur juste avant
    (ramassage mémoire sous pression). Le message d'erreur du code
    anticipait d'ailleurs déjà ce cas ("fichier trop lourd pour la mémoire
    du serveur"). Corrigé en plafonnant à **50 Mo par fichier / 80 Mo par
    envoi**, avec les limites de corps de `next.config.ts` calées juste
    au-dessus (100 Mo). Les tailles sont désormais vérifiées **avant** toute
    lecture en mémoire, donc un envoi trop lourd est refusé sans rien
    allouer.
  - **Piste explorée puis abandonnée après mesure** : traiter les fichiers
    un par un plutôt que tous en mémoire. Sans effet — en Node,
    `File.arrayBuffer()` matérialise une copie que l'objet `File` retient
    ensuite lui-même (vérifié : 80 Mo → 160 Mo après copie, toujours 160 Mo
    après mise à `null` et `gc()`). Le code reste donc en envoi parallèle,
    qui protège du timeout routeur, et le seul levier réel est le plafond de
    cumul. Consigné ici pour éviter qu'on retente ce faux correctif.
  - **Mémoire réduite ailleurs** : les téléchargements de documents, de
    documents Société et de pièces jointes chargeaient le fichier entier en
    RAM (`storage.read`) **puis en faisaient une seconde copie**
    (`new Uint8Array(buffer)`), soit 2× la taille par téléchargement.
    Passés en streaming, l'adaptateur de stockage sachant déjà le faire.
  - **Avatars clients** : servis avec `max-age=0` sans `ETag`, donc
    intégralement retéléchargés depuis le stockage à **chaque** affichage
    d'une liste de clients. Ajout d'un `ETag` valant la clé de stockage (qui
    change à chaque remplacement) : le navigateur revalide toujours — un
    nouvel avatar apparaît donc immédiatement, comportement voulu préservé —
    mais reçoit un `304` sans lecture du stockage ni octet transféré.
  - **Écarté après mesure** : les vignettes (`createThumbnail`) étaient
    suspectées, à tort — 12 vignettes d'une photo 6000×4000 prennent 158 ms
    et +25 Mo. Ce n'est pas un problème.
- **Troisième passe de performance — pagination des listes Tâches et
  Documents** (2026-08-24, suite de la passe précédente, "oui tu peux") :
  la base de données seule n'expliquait pas la lenteur mesurée sur ces deux
  pages (toutes les requêtes Prisma seules < 200 ms) — la cause était la
  taille de la page HTML+React renvoyée à chaque affichage, qui grossit
  linéairement avec le nombre d'enregistrements puisque tout était chargé
  sans limite. Vérifié sur une base réaliste (120 clients / 724 tâches /
  120 documents, seedée pour l'occasion) : `/admin/documents` pesait 1,5 Mo
  et répondait en 2 à 2,6 s, `/admin/taches` 4,4 Mo en ~1 s — décomposition
  du payload Documents faite (56 % dû à la duplication du payload
  d'hydratation React, 17 % icônes SVG inline, 7 % câblage des Server
  Actions liées, ~20 % contenu réel), confirmant que réduire le nombre
  d'enregistrements envoyés était le levier le plus rentable, plutôt que la
  dédoublication d'icônes ou une virtualisation côté client (gains bien
  moindres pour un chantier plus lourd). Nouveau composant
  `src/components/admin/pagination.tsx` (Précédent/Page X sur Y/Suivant,
  conserve tous les filtres/tri déjà dans l'URL). Appliqué uniquement là où
  la lenteur était mesurée et où une vue paginée a du sens :
  - `/admin/taches`, vue **Liste** uniquement (40/page) — Kanban,
    Calendrier et Archivées gardent le jeu complet, ils en ont besoin pour
    fonctionner (répartition par statut, par date...). **Ajusté le
    2026-08-24 sur signalement client** : la pagination initiale portait
    sur l'ensemble actives+terminées confondu avant leur séparation à
    l'affichage, si bien qu'une tâche active pouvait se retrouver sur la
    page 2 ou 3 (masquée) selon le tri, tandis que la section "Terminées"
    (repliée par défaut) en affichait très peu sur certaines pages.
    Désormais les tâches actives sont toujours récupérées en entier, sans
    pagination ; seule la section "Terminées" pagine (toujours 40/page,
    contrôles déplacés dans le repli lui-même). Ce comportement ajusté ne
    s'applique que sans filtre de statut explicite — avec un statut précis
    sélectionné, la pagination porte sur l'ensemble filtré comme
    initialement livré.
  - `/admin/documents`, vue **Détaillé** uniquement (30/page) — la vue
    "Bacs" (regroupement par type) garde le jeu complet pour la même
    raison. L'encours de paiement affiché en haut de page reste calculé
    sur une requête séparée et non paginée, pour rester exact quelle que
    soit la page consultée (sommer uniquement les documents affichés
    aurait donné un total faux).
  - Mesuré après coup (même base, même méthode) : `/admin/taches` (Liste)
    passe de ~1,1 s / 4,4 Mo à ~0,3 s / 320 Ko une fois la compilation
    chaude ; `/admin/documents` (Détaillé) de ~2 à 2,6 s / 1,5 Mo à ~0,8 s /
    480 Ko. Kanban et Bacs, volontairement non paginés, restent inchangés
    (vérifié : toujours le jeu complet, aucune régression).
  - Clients, Prospection et Notes restent non paginés — volumes mesurés
    trop faibles à ce jour pour justifier le chantier (voir "Points encore
    ouverts" si la base grossit).

## Points encore ouverts

- **Renforcement de la sécurité — livré le 2026-07-28.** Audit complet mené
  en lecture seule le 2026-07-28 ("renforcer la sécurité au max"), 3 volets :
  authentification/sessions, en-têtes HTTP/infra, injections/XSS/IDOR.
  **Aucune faille critique trouvée** : pas d'IDOR (vérifié sur toutes les
  actions client-facing), pas de XSS via `dangerouslySetInnerHTML`, pas
  d'injection SQL, webhook Stripe correctement vérifié, iframe email
  correctement sandboxée, aucun secret en clair dans le dépôt. Plan de
  durcissement discuté et validé par le client sur 4 arbitrages (2FA en
  chantier séparé ; sessions gardées à 30 jours + reconfirmation du mot de
  passe avant les actions sensibles ; en-têtes simples tout de suite + CSP
  en mode Report-Only ; mise à jour Next.js), mis de côté une session puis
  repris et livré intégralement ("tu peux reprendre") :
  1. **Échappement HTML dans les emails transactionnels** (`escapeHtml`,
     nouveau `src/lib/html-escape.ts`) : faille XSS-via-email réelle
     corrigée sur 9 points d'interpolation (titre de tâche, motif de refus,
     nom de fichier, champs prospect) dans `contact.ts`, `feedback.ts`,
     `files.ts`, `tasks.ts`, `prospects.ts`, `prospect-reminders.ts`.
  2. `.env.example` complété (`CRON_SECRET`, `ENCRYPTION_KEY`,
     `GOOGLE_CLIENT_ID`/`SECRET`/`REDIRECT_URI`, `NEXT_PUBLIC_SITE_URL`).
  3. **Rate limiting des demandes de réinitialisation de mot de passe**
     (nouveau modèle `PasswordResetAttempt`, 3 demandes/15 min par email) —
     empêche le spam email via le formulaire public "mot de passe oublié".
  4. **Anciens tokens de réinitialisation invalidés** à chaque nouvelle
     demande (un seul lien valide à la fois) ; **autres sessions révoquées**
     au changement de mot de passe en étant connecté
     (`destroyOtherSessionsForSubject`, nouveau dans `src/lib/session.ts`),
     sans déconnecter la session en cours.
  5. **En-têtes de sécurité HTTP** (`next.config.ts` : HSTS,
     X-Content-Type-Options, X-Frame-Options, Referrer-Policy,
     Permissions-Policy) + **CSP en mode Report-Only** sur tout le site —
     aucune violation détectée sur les parcours public/admin/espace client
     testés.
  6. **Anti-bruteforce étendu par IP**, en plus de l'email
     (`LoginAttempt.ipAddress`, jusqu'ici jamais rempli) — seuil séparé (20
     échecs/15 min par IP, contre 8/15 min par compte) pour freiner une
     attaque distribuée sur plusieurs comptes depuis une même IP sans
     bloquer un réseau partagé sur une simple faute de frappe.
  7. **Reconfirmation du mot de passe admin (step-up)** avant les 3 actions
     les plus sensibles : suppression définitive d'un client
     (`deleteClient`), réinitialisation du mot de passe d'un client
     (`adminResetClientPassword`), usurpation d'espace client
     (`impersonateClient`) — nouveau composant partagé
     `StepUpButton`/`requireFreshAdminPassword`, remplace le simple
     `window.confirm` sur ces 3 actions précises uniquement.
  8. **Vérification par signature binaire (magic bytes)** des fichiers
     uploadés (`src/lib/file-signature.ts`, via `sharp` pour les images et
     l'en-tête `%PDF-` pour les PDF), en plus du type déclaré par le
     navigateur — appliquée aux livrables, pièces jointes, documents,
     couvertures et médias du portfolio, visuels du Hero.
  9. **Next.js mis à jour 16.2.10 → 16.2.12** (corrige plusieurs failles
     réelles : DoS, divulgation d'endpoints Server Actions, confirmées sur
     la base d'avis GitHub officiels). Dépendances restées volontairement
     en l'état par décision documentée (pas des oublis) : `@aws-sdk/
     client-s3` toujours figé à `3.726.1` (compatibilité OVH non confirmée
     comme résolue), `sharp`/`postcss` empaquetés en interne par `next`
     (aucun correctif sûr disponible côté projet), `prisma` gardé en
     dépendance de production (nécessaire au `postdeploy` Scalingo, qui
     élague les devDependencies après le build).
  10. (Priorité basse, non traité) rate limiting général au-delà du
      login/réinitialisation, sur les routes API les plus coûteuses.
  11. (Chantier séparé, non traité) 2FA/TOTP pour le compte admin.

  Détails des tests réels effectués (rate limiting déclenché en conditions
  réelles, step-up testé avec mot de passe correct/incorrect, en-têtes
  inspectés, etc.) : voir `VALIDATION.md`, section "Renforcement de la
  sécurité".
- **Suggestions de gestion globale du 2026-07-28 — 7 sur 8 livrées le
  2026-07-29** ("Peux tu aller sur ça" — le client a explicitement laissé le
  2FA de côté, chantier séparé) :
  1. **Sauvegardes automatiques de la base de données** — vérifié déjà
     couvert par l'addon Scalingo `postgresql-starter-512` (backups
     quotidiens automatiques, confirmé via `scalingo backups`). Aucun code
     nécessaire. Lacune restante : les fichiers OVH Object Storage
     (documents/livrables/médias portfolio) n'ont aucune sauvegarde
     automatisée — piste future non construite (cron `aws s3 sync` vers un
     second bucket).
  2. **Vue financière consolidée** (`/admin/finances`) — facturé/encaissé/
     reste dû, par mois (12 derniers) et par client, agrégé sur `Document`
     (factures uniquement, client démo exclu).
  3. **Recherche globale** — barre dans le header admin (`GlobalSearchBar`),
     `Promise.all` sur Client/Task/Prospect/Document, route
     `/api/admin/search` protégée (403 sans session).
  4. **Résumé hebdomadaire par email** — cron du lundi 7h
     (`/api/cron/weekly-digest`), tâches de la semaine + relances
     prospection dues + factures en retard, envoyé à tous les admins.
  5. *(Authentification à deux facteurs — explicitement laissée de côté par
     le client cette fois-ci aussi, reste un chantier séparé.)*
  6. **Journal d'audit global** (`/admin/audit`) — actions sensibles
     uniquement (connexions réussies/échouées, suppression client,
     réinitialisations de mot de passe, usurpation, invitation/révocation
     admin, exports), nouveau modèle `AuditLogEntry`, filtrable par type
     d'action.
  7. **Planning de charge** (`/admin/planning`) — nombre de tâches actives
     par semaine ISO (16 dernières), seuil de couleur vert/orange/rouge,
     basé sur `Task.eventDate`.
  8. **Rôles multi-admin** — décision validée avec le client : accès complet
     identique pour chaque compte, pas de permissions par module. Comptes
     gérés depuis `/admin/reglages` (invitation par email réutilisant le
     flux de réinitialisation de mot de passe existant, révocation protégée
     par reconfirmation du mot de passe). Chronomètre de tâche et connexion
     Gmail désormais par compte admin (`TaskTimeEntry.startedByAdminId`,
     `Admin.gmailEmail`/`gmailRefreshTokenEnc` déjà par compte) ; les
     notifications système (contact, feedback, relances, digest, devis
     signé) partent désormais vers tous les comptes admin
     (`getAdminEmails()`), plus un seul.

  (La 9ᵉ piste, modèles de tâches réutilisables pour les prestations
  récurrentes, reste explicitement écartée par le client depuis le
  2026-07-28 — ne pas la reproposer.)
- **Suggestions fonctionnalité/design du 2026-07-28 — les 3 retenues,
  livrées le 2026-07-29** :
  1. **Devis signables en ligne** — décision validée avec le client :
     signature légère sur le PDF déjà uploadé (pas de générateur de devis
     avec lignes de prix). Le client dessine sa signature à l'écran + tape
     son nom sur le devis existant dans son espace, horodatage + IP
     enregistrés (`Document.acceptedAt/acceptedByName/signatureDataUrl/
     acceptedFromIp`), admin notifié par email, badge "Accepté le ... par
     ..." affiché côté client et admin, re-signature bloquée.
  2. **Vérification du mode clair sur Prospection** — vérifié en navigateur
     (liste, Kanban, fiche détail, formulaire, fil d'activité) : les
     composants utilisent déjà les tokens de design partagés
     (`PALETTE_BADGE_CLASSES`, `text-ink-muted`), aucun défaut de contraste
     trouvé, rien à corriger.
  3. **Mini visite guidée à la première connexion client** — tooltips
     maison (pas de lib externe) pointant chaque onglet de nav dans l'ordre
     du guide PDF, affichée une seule fois (`ClientUser.hasSeenTour`),
     jamais affichée pour le compte de démonstration public partagé.

  (Les trois autres pistes — pages "étude de cas" sur le portfolio public,
  avis client à la clôture d'une tâche, lien de partage temporaire d'un BAT
  sans compte complet — restent explicitement écartées par le client depuis
  le 2026-07-28 : "pas le moment" — ne pas les reproposer sans qu'il les
  redemande.)
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
- ~~Identifiants Google OAuth pour la boîte mail Gmail~~ — **résolu**, Gmail
  connecté depuis le 2026-07-20 (confirmé sur `/admin/reglages` : "Connecté :
  mikko.visuel@gmail.com depuis le 20 juillet 2026"). Point retiré des
  points ouverts, cette ligne restait obsolète par erreur.
- Redirection `mikkovisuel.fr` → `www.mikkovisuel.fr` cassée ou incomplète
  (2026-07-20) : le domaine nu affiche un autre site (voir section
  "Backend interne", signalement du 2026-07-20). Configuration DNS/OVH,
  hors du code de ce dépôt — à corriger côté client dans son espace OVH,
  ou à reprendre avec Claude Code pour formuler la bonne règle si besoin
  d'aide.
- Clé API Anthropic pour la recherche automatique de prospects (2026-07-28) :
  fonctionnalité codée, mais inutilisable tant que le client n'a pas créé
  son compte console.anthropic.com et sa clé API (guide détaillé fourni :
  `GUIDE_PROSPECTION_IA.md`) — étape que Claude Code ne peut pas faire à sa
  place. Contrairement aux autres services externes du projet (Stripe,
  Resend, Gmail), celui-ci est payant à l'usage, pas seulement gratuit avec
  un palier. Une fois la clé transmise, il reste à l'ajouter en variable
  d'environnement (local + Scalingo) et à tester une recherche réelle.
- Reprise complète de l'historique de validation logicielle (2026-07-28) :
  `VALIDATION.md` ne couvre pour l'instant que les fonctionnalités livrées
  ce jour-là — les 150+ fonctionnalités antérieures ne sont pas rejouées
  rétroactivement (voir la portée notée en tête de ce fichier).
- **Déploiement chez des clients ("white-label") — étudié le 2026-07-30, pas
  encore construit.** Modèle retenu : une instance par client, hébergée par
  Mikko Visuel, en abonnement mensuel (voir le journal). Le SaaS
  multi-tenant est écarté : il faudrait porter un `tenantId` sur les 29
  modèles et re-cadrer chaque requête des ~40 fichiers de `src/lib`, avec un
  risque de fuite inter-clients à la moindre requête oubliée. Chantiers
  restant à traiter avant de pouvoir livrer une première instance :
  1. **Marque en dur** : ~104 occurrences de "Mikko Visuel" réparties sur
     ~60 fichiers (surtout des `metadata.title`), le SVG de
     `brand-logo.tsx`, les deux manifests PWA, les 8 icônes de
     `public/icons/`, et les jetons de couleur de `globals.css`. À
     externaliser dans une couche de configuration de marque, idéalement
     éditable depuis l'admin.
  2. **Licence de la police Clash Display** : les `.woff2` sont embarqués
     dans le dépôt. Redistribuer la police sur N sites clients est un
     sujet juridique à vérifier **avant** toute vente, pas un sujet
     technique.
  3. **Pages légales** : `mentions-legales` et `SalesTermsSection` sont
     encore des textes d'attente. Chez un client, ce sont des contenus
     obligatoires et propres à lui — à passer en base.
  4. **Domaine d'envoi des emails** : prévoir un expéditeur Resend unique
     et mutualisé (`no-reply@` du produit) pour toutes les instances,
     plutôt qu'un domaine à vérifier en DNS chez chaque client. Les resets
     de mot de passe imposent de toute façon un envoi serveur.
  5. **Module Gmail** : à désactiver par configuration dans les instances
     clientes (déclencherait sinon la vérification Google + l'évaluation
     CASA annuelle). Aucun code à supprimer, un simple drapeau suffit.
  6. **Exploitation** : script de provisionnement (créer app + base +
     bucket + seed + DNS) et intégration continue capable de pousser une
     mise à jour sur toutes les instances. Sans ça, le modèle tient à 3
     clients, pas à 15.
  7. **Cadre contractuel** : contrat de sous-traitance RGPD par client
     (Mikko Visuel devient sous-traitant), et test réel d'une restauration
     de sauvegarde Scalingo — jamais vérifié à ce jour.
  Réserve de marché notée : le vocabulaire du produit (BAT, livrables,
  piliers portfolio, aftermovie) est structurant dans le code comme dans
  l'interface. La cible réaliste est le studio ou l'agence créative, pas la
  PME générique.
- **Planning : tendance semaine par semaine et tableau de bord — livrés le
  2026-08-01**, voir section "Backend interne" ("Planning, troisième
  passage"). Deux tuiles candidates proposées mais **non retenues** par le
  client, à reprendre si besoin : **client le plus chargé** (répartition de
  la charge en cours par client) et **vélocité récente** (moyenne mobile des
  heures réellement travaillées par semaine).
- **Filtre Tous/Photos/Vidéos retiré de la page pilier (2026-08-16)**, en
  conséquence directe de la refonte en galeries : une galerie étant déjà un
  ensemble curaté par l'admin, filtrer par type de média n'avait plus le
  même sens à ce niveau qu'avant, quand la page listait tous les médias du
  pilier à plat. Décision prise par Claude Code, pas explicitement demandée
  — à reprendre si le client souhaite un filtre équivalent (par exemple,
  filtrer *quelles galeries* afficher selon leur contenu).
- **Rendu mobile des nouvelles pages portfolio en galeries (2026-08-16)** :
  non vérifié, seul le rendu desktop a été observé en navigateur pour cette
  passe. À confirmer à la première consultation depuis un téléphone.
- **Livrables volumineux (>50 Mo) — régression assumée du 2026-08-23.** Le
  plafond est redescendu de 500 Mo à 50 Mo par fichier parce que la machine
  ne peut pas faire autrement (voir "Deuxième passe de performance"), ce qui
  annule de fait la demande du 2026-07-14 ("retirer la limite de taille des
  livrables"). Deux façons de récupérer les gros fichiers vidéo, à
  arbitrer avec le client : (1) **envoi direct au stockage S3** depuis le
  navigateur, les octets ne transitant plus par la mémoire du serveur —
  c'est la vraie solution, elle demande une route d'upload dédiée et une
  configuration CORS côté OVH que seul le client peut faire ; (2)
  **augmenter le conteneur** Scalingo (512 Mo → 1 Go ou plus), solution
  immédiate mais payante et qui ne fait que déplacer le plafond.
- **Pagination admin — livrée le 2026-08-24 pour Tâches (Liste) et
  Documents (Détaillé)**, voir "Troisième passe de performance" ci-dessus.
  Clients, Prospection et Notes chargent toujours l'intégralité de leurs
  enregistrements à chaque affichage (seul l'Audit a par ailleurs un
  `take` fixe sans navigation) — sans conséquence visible au volume actuel
  de ces trois pages, mais à reprendre si leur volume grossit
  significativement.
- **Cache d'images perdu à chaque redémarrage.** Next optimise les photos du
  portfolio avec sharp et met le résultat dans `.next/cache`, or le disque
  Scalingo est éphémère : le cache est vidé à chaque déploiement et à chaque
  redémarrage, et les originaux pleine résolution sont alors re-décodés.
  Repéré le 2026-08-23, non traité — la correction passe par un CDN devant
  le site ou par la livraison des médias directement depuis le stockage,
  décision d'infrastructure qui appartient au client.
- **Sessions expirées jamais purgées.** Une session n'est supprimée que si
  quelqu'un la présente après expiration ; les sessions abandonnées restent
  en base indéfiniment. Sans effet sur la vitesse (la recherche se fait sur
  un index unique), mais la table grossit sans limite. Repéré le
  2026-08-23, non traité.

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
| 2026-07-17 | Signalement : échec de l'envoi de 10 photos en pièces jointes sur une "Nouvelle demande" (cliente La Mescla) | Corrigé : upload des fichiers parallélisé (au lieu de séquentiel) sur les 3 parcours multi-fichiers, pour rester sous le délai d'attente du routeur — voir section "Espace client" |
| 2026-07-17 | Suggestions pour enrichir le tableau de bord (+ demande du client : journal de connexion des clients) | Livré (les 4 retenues) : prochains événements, tâches par statut, clients sans activité récente, journal de connexion — voir section "Backend interne" |
| 2026-07-18 | Application installable (PWA) pour iOS/Android, téléchargeable sur le site au-dessus des "Conditions", pour l'accès à l'espace client | Livré : section dédiée sur la page d'accueil (entre "Contact" et "Conditions"), manifest + icônes + service worker minimal, `start_url` vers `/espace-client`, bouton d'installation natif ou instructions selon la plateforme — voir section "Espace client" |
| 2026-07-18 | Signalement : icône de l'app tronquée sur l'écran d'accueil + texte des instructions iOS mal affiché sur mobile | Corrigé : redimensionnement des icônes passé de "cover" (recadrait le personnage) à "contain", et paragraphe d'instructions iOS qui utilisait `inline-flex` (chaque fragment de texte devenait un bloc isolé au lieu de s'enrouler) — voir section "Espace client" |
| 2026-07-18 | Même principe de PWA installable, mais côté admin, avec le lien d'installation visible uniquement sur le tableau de bord (pas côté client/public) | Livré : manifest et icônes distincts (fond noir), carte d'installation affichée seulement sur `/admin` — voir section "Backend interne" |
| 2026-07-18 | Favicon admin également en fond noir (pas seulement l'icône PWA installée) + bouton "voir l'espace client" sur les fiches client, pour visualiser ce que voient réellement les clients | Livré : favicon dédié sur tout `/admin/*`, aperçu de l'espace client par bascule de session réversible (bandeau + retour à l'admin) — voir section "Backend interne" |
| 2026-07-18 | Signalement : l'app installée depuis le tableau de bord pointait vers l'espace client au lieu de l'admin ; demande de déplacer la note d'installation tout en bas du tableau de bord | Corrigé : manifest admin désormais déclaré dès `/admin/connexion` (plus seulement les pages protégées), note déplacée en bas de page — voir section "Backend interne" |
| 2026-07-20 | Pouvoir trier les tâches (statut, date d'évènement, date d'échéance...) dans la vue Tâches et sur la fiche client | Livré : nouveau contrôle `TaskSortControl`, généralisé à toutes les vues de `/admin/taches` et à la fiche client (le tri par colonne existait déjà, mais uniquement sur la vue Liste) — voir section "Backend interne" |
| 2026-07-20 | Icône visible dès qu'une pièce jointe/livrable est attaché, dans toutes les vues résumées | Livré : composant partagé `AttachmentBadge`, intégré dans les vues admin (tableau, cartes Kanban, liste archivée, fiche client) et client (accueil, suivi) — voir sections "Espace client" et "Backend interne" |
| 2026-07-20 | Client "démo" accessible sans connexion, pour montrer aux prospects leur futur espace client | Livré (lecture seule, décision validée avec le client) : bouton public sur `/espace-client/connexion`, nouveau champ `Client.isDemo`, verrou serveur `assertNotDemo` sur toutes les actions d'écriture côté client — voir section "Espace client" |
| 2026-07-20 | Archivage automatique des livrables clients après un nombre de jours réglable en direct (roue de réglage admin) | Livré (suppression réelle du fichier, décision validée avec le client) : nouvelle page `/admin/reglages`, modèle `AppSettings`, tâche planifiée Scalingo quotidienne + purge manuelle immédiate — voir section "Backend interne" |
| 2026-07-20 | Date d'évènement affichée devant le titre + tri (croissant/décroissant, par date d'évènement ou d'ajout) sur l'onglet Livrables de l'espace client | Livré : voir section "Espace client" |
| 2026-07-20 | Pop-up de message admin affichable sur tous les comptes/espaces clients (case d'activation + texte) | Livré : réglage sur `/admin/reglages`, modale à la connexion côté client (une fois par message) — voir sections "Espace client" et "Backend interne" |
| 2026-07-20 | Différencier les livrables des BAT, avec filigrane automatique (logo en répétition, 10 % d'opacité) réglable depuis l'admin | Livré (priorité images JPG/PNG, décision validée avec le client) : nouveau champ `Deliverable.kind`, filigrane généré à la volée via `sharp` sur les BAT vus par le client (jamais sur l'original ni côté admin), activable depuis `/admin/reglages` — voir section "Espace client" |
| 2026-07-20 | Boîte mail Gmail connectée à l'admin : par client, voir tous les échanges email liés à son profil, pouvoir répondre/transférer directement dans l'application, sans jamais ouvrir Gmail | Livré (rattachement automatique par adresse email des comptes client, décision validée avec le client) : bouton "Emails" sur la fiche client, connexion OAuth2 depuis `/admin/reglages`, aucune synchronisation en base (requêtes Gmail en direct) — bloqué en usage réel tant que le client n'a pas créé ses identifiants Google (guide fourni : `GUIDE_GMAIL.md`) — voir section "Backend interne" |
| 2026-07-20 | Export PDF par client de toutes les tâches en cours non terminées (rapport d'état à envoyer au client) | Livré (téléchargement uniquement, décision validée avec le client) : bouton "Télécharger le rapport (PDF)" sur la fiche client, généré à la volée via `@react-pdf/renderer` — voir section "Backend interne" |
| 2026-07-20 | Section "Mail" globale dans le bandeau admin, entre Documents et Portfolio, regroupant les emails de tous les clients | Livré : nouvel onglet `/admin/mails`, réutilisant la recherche Gmail existante sur l'ensemble des comptes clients avec rattachement automatique par client + filtre — voir section "Backend interne" |
| 2026-07-20 | Icône lu/non lu sur les vues email + recherche par mot-clé dans l'objet/le corps des messages | Livré : icône basée sur le label Gmail `UNREAD` (fils et messages), champ "Rechercher" sur les listes email par client et globale (recherche Gmail côté serveur) — voir section "Backend interne" |
| 2026-07-20 | Adresse, SIRET et n° TVA sur la fiche client | Livré : nouveaux champs optionnels sur `Client`, ajoutés au formulaire "Informations" de la fiche client — voir section "Backend interne" |
| 2026-07-20 | Téléphone et rôle (texte libre, ex. directeur/DJ/photographe) sur chaque compte de connexion d'un client | Livré : nouveaux champs optionnels sur `ClientUser`, renseignables à la création et modifiables ensuite via un formulaire dédié sous chaque compte — voir section "Backend interne" |
| 2026-07-20 | Email de facturation sur la fiche client + bouton "Envoyer le document" par document (objet = nom du fichier, corps de message fixe fourni) + statut envoyé/non envoyé | Livré : nouveau champ `Client.billingEmail`, action d'envoi en pièce jointe (`sendDocumentByEmail`), nouveau champ `Document.sentAt` avec icône de statut — voir section "Backend interne" |
| 2026-07-20 | Lien Google Drive par client (fiche client admin), affiché dans le bandeau de menu de l'espace client et redirigeant directement vers le Drive | Livré : nouveau champ `Client.driveUrl`, onglet "Google Drive" dans `ClientNavTabs` (ouverture dans un nouvel onglet) si renseigné — voir section "Backend interne" |
| 2026-07-20 | Système d'épinglage des tâches (pastille en un clic), filtre "épinglés" dans la liste des tâches, liste des tâches épinglées sur le tableau de bord, désépinglage automatique à la fin d'une tâche | Livré (les 4 points) : nouveau champ `Task.pinnedAt`, `TaskPinButton` sur toutes les vues de tâches, case à cocher "Épinglées uniquement" sur `/admin/taches`, section "Tâches épinglées" sur `/admin`, remise à zéro automatique dans `setTaskStatus` au passage en "Terminé" — voir section "Backend interne" |
| 2026-07-20 | Demande d'une application Mac pour l'admin ; signalement : `/admin` proposait d'"Ouvrir dans l'appli" mais rouvrait l'app espace client au lieu de proposer une app admin distincte | Expliqué que l'admin est déjà installable en PWA (existant depuis le 2026-07-18) ; bug identifié et corrigé : `scope: "/"` du manifest espace client revendiquait aussi `/admin`, resserré à `/espace-client` — voir section "Backend interne" |
| 2026-07-20 | Signalement (suite) : toujours aucune icône d'installation même après le correctif de `scope` | Corrigé : `src/proxy.ts` bloquait `/admin/manifest.webmanifest` et `/admin/icon.png` derrière la connexion, invalidant le manifest aux yeux du navigateur — ces deux chemins ajoutés aux routes publiques — voir section "Backend interne" |
| 2026-07-20 | (Constat, pas une demande) `mikkovisuel.fr` sans `www.` affiche un autre site (404 sur /admin, assets étrangers au projet) | Hors code applicatif : configuration DNS/redirection OVH à vérifier côté client — ajouté aux "Points encore ouverts" |
| 2026-07-20 | Ajouter un filtre "épinglées" dans la vue tâche | Déjà présent sur `/admin/taches` ; ajouté en complément sur la fiche client (`/admin/clients/[clientId]`), qui n'avait pas ce filtre — voir section "Backend interne" |
| 2026-07-20 | Zone de glisser-déposer pour l'upload des livrables/fichiers finaux ; système d'envoi des livrables finaux par email (comme pour les factures : pièce jointe + bouton d'envoi + icône de statut), objet = "date de l'évènement - titre de la tâche" | Livré (les 2 demandes) : mode `dropzone` sur `FilePicker` (livrables uniquement), bouton "Envoyer les livrables finaux" sur la fiche tâche avec nouveau champ `Task.deliverablesSentAt` — voir section "Backend interne" |
| 2026-07-20 | Effacer le motif de refus une fois le BAT validé, en gardant une trace en historique dans la tâche | Livré : nouveau modèle `TaskRefusalHistory` (une ligne par refus, jamais supprimée), `refusalReason`/`refusedAt` remis à `null` au passage en "BAT validé" (validation client ou changement de statut admin), historique consultable sur la fiche tâche — voir section "Espace client" |
| 2026-07-20 | Rendre le statut modifiable depuis la fiche tâche + bouton "Mettre en validation" qui passe la tâche en "À valider" et prévient les profils du client par email | Livré : sélecteur de statut ajouté sur `/admin/taches/[taskId]`, bouton dédié "Mettre en validation" (désactivé si déjà "À valider"), réutilise l'envoi d'email existant de `setTaskStatus` — voir section "Backend interne" |
| 2026-07-20 | Administration des envois d'email par profil, pour éviter de spammer les clients ayant plusieurs comptes | Livré : nouveau champ `ClientUser.emailNotificationsEnabled`, bascule en un clic sur la fiche client, applique le filtre à toutes les notifications automatiques adressées aux comptes client (hors réinitialisation de mot de passe) — voir section "Backend interne" |
| 2026-07-20 | Mettre les emails automatiques par profil désactivés par défaut (plutôt qu'activés) | Livré : `ClientUser.emailNotificationsEnabled` passé en opt-in (`@default(false)`), un nouveau profil ne reçoit rien tant que l'admin ne l'active pas explicitement — voir section "Backend interne" |
| 2026-07-20 | "Où on administre les mails ?" / demande d'un seul endroit pour gérer les notifications de tous les profils | Livré : nouvelle section "Notifications email par profil" sur `/admin/reglages`, tous les comptes de connexion de tous les clients listés avec la même bascule que sur chaque fiche client — voir section "Backend interne" |
| 2026-07-21 | Garder un historique des changements de statut d'une tâche (qui, date, heure), et tracer la validation du BAT | Livré : nouveau modèle `TaskStatusHistory`, alimenté à la création et à chaque changement de statut (admin et client) ; historique consultable sur `/admin/taches/[taskId]`, section "Historique des statuts" ; la validation de BAT est un changement de statut comme un autre et y apparaît donc aussi — voir section "Backend interne" |
| 2026-07-21 | Ne pas faire apparaître les tâches du client de démo dans les listes courantes (réglage ou filtre en dur) | Livré (filtre en dur retenu, plus simple) : nouveau filtre partagé `EXCLUDE_DEMO_CLIENT_TASKS`, appliqué sur `/admin/taches` et le tableau de bord `/admin` ; les tâches restent gérables depuis la fiche du client de démo lui-même — voir section "Backend interne" |
| 2026-07-21 | Ajouter une fonction de suppression des documents | Livré : nouvelle action `deleteDocument` (miroir de la suppression des livrables/pièces jointes), bouton "Supprimer" sur `/admin/documents` et sur la fiche client — voir section "Backend interne" |
| 2026-07-21 | Ajouter le réglage des notifications par email dans les pages profil de chaque client (dans les réglages) | Livré : nouvelle section "Notifications par email" sur `/espace-client/compte` ("Mon compte"), le client peut désormais activer/désactiver lui-même ses notifications, en plus du contrôle déjà existant côté admin — voir section "Espace client" |
| 2026-07-21 | Suivi du temps passé par tâche : chronomètre visible dans le header, arrêt automatique du précédent au démarrage d'un nouveau, vue du temps passé sur la vue globale, champ temps estimé (minutes), jauge colorée (vert/orange 80 %/rouge >100 %), rien de tout ça côté espace client. 4 précisions tranchées avant développement : démarrage/arrêt sur la fiche tâche uniquement, ajout manuel de temps possible, journal détaillé des sessions, jauge sur la vue Liste + fiche tâche | Livré (les 4 points, précisions comprises) : nouveau modèle `TaskTimeEntry`, chronomètre dans le header admin (toutes les pages), nouveau champ `Task.estimatedMinutes`, jauge colorée sur `/admin/taches` (colonne "Temps") et la fiche tâche, journal des sessions avec ajout manuel et suppression — voir section "Backend interne" |
| 2026-07-21 | Pouvoir valider/refuser un BAT directement depuis l'admin (boutons sur la fiche tâche quand le statut est "À valider") | Livré : `validateTaskByAdmin`/`refuseTaskByAdmin`, mêmes notifications email au client qu'aujourd'hui (précision tranchée avant développement), attribuées à "Mikko (admin)" — voir section "Backend interne" |
| 2026-07-21 | Bien distinguer "en retard" (rouge) d'une échéance le jour même (bleu gras, sans la mention "en retard") | Livré : seuil de retard basé sur minuit du jour même plutôt que l'heure courante, appliqué aux 3 vues de tâches et au compteur du tableau de bord — voir section "Backend interne" |
| 2026-07-21 | Afficher les numéros de semaine dans la vue Calendrier | Livré : numérotation ISO 8601 ("S27"...) sur `TaskCalendarView`, admin et espace client — voir section "Backend interne" |
| 2026-07-21 | Pouvoir trier la vue Clients par ordre d'ajout ou alphabétique | Livré : contrôle "Trier par" sur `/admin/clients`, même pattern que le tri des tâches — voir section "Backend interne" |
| 2026-07-21 | Signalement : masquer les tâches de l'espace de démonstration des listes courantes | Confirmé par le client comme doublon de la demande du 2026-07-20, déjà livrée (`EXCLUDE_DEMO_CLIENT_TASKS`) — rien à refaire |
| 2026-07-21 | Ajouter un statut de tâche "Non commencé" entre "Nouveau" et "En cours" | Livré : rouvre explicitement le cycle des statuts verrouillé le 2026-07-13 (demande explicite du client), se replie sur l'étape "Nouveau" côté timeline espace client — voir section "Backend interne" |
| 2026-07-21 | Styliser le rapport PDF par client (tâches en cours) pour coller à la DA sombre du site | Livré : fond sombre, accent citron, titres en Clash Display, badges de statut recolorés selon la vraie couleur du statut. Au passage, correction d'un bug de rendu du `.woff2` de Clash Display dans le PDF (espaces parasites dans certains mots) en passant à un `.ttf` du même fichier — voir section "Backend interne" |
| 2026-07-23 | Ajouter un module de notes internes qui se comporte comme Apple Notes | Livré : nouvel onglet "Notes" (admin uniquement, jamais visible côté espace client), dossiers + épinglage, rattachement optionnel à un client, éditeur de texte riche (Tiptap) avec checklists, sauvegarde automatique sans bouton ni rechargement — voir section "Backend interne" |
| 2026-07-23 | Rendre tout le côté admin utilisable jusqu'à mobile/tablette (pas seulement une fenêtre desktop réduite) | Livré : en-tête admin corrigé, ligne d'actions et email trop long corrigés sur la fiche client, vue Calendrier des tâches contenue dans son propre défilement horizontal (au lieu de faire défiler toute la page), module Notes passé en navigation à un seul panneau sous 768px façon Apple Notes iPhone — voir section "Backend interne" |
| 2026-07-23 | Sur la vue Liste des tâches, replier Type/Format/Temps derrière un triangle par ligne et retirer le bouton "Modifier" (redondant avec le titre, déjà cliquable) | Livré : nouveau composant `TaskTableRow`, tableau réduit à Évènement/Échéance/Client/Tâche/Statut par défaut, détails dépliables par ligne — voir section "Backend interne" |
| 2026-07-23 | Cacher le client "Espace de démonstration" partout dans l'admin | Livré : nouveau filtre partagé `EXCLUDE_DEMO_CLIENT` (miroir de `EXCLUDE_DEMO_CLIENT_TASKS`), appliqué à la liste Clients, au tableau de bord, aux sélecteurs "Client" (Tâches/Documents/Notes/Mail/nouvelle tâche), à Réglages et à l'export CSV clients ; reste géré normalement depuis sa propre fiche — voir section "Backend interne" |
| 2026-07-23 | Suggestions gestion des tâches : dupliquer une tâche, checklist par tâche (fonctionnalités) + actions groupées, pastille de compteur nav, glisser-déposer Kanban (ergonomie) — 5 retenues sur 6 proposées | Livré (les 5, glisser-déposer déjà existant reconfirmé) : bouton "Dupliquer" + `duplicateTask`, nouveau modèle `TaskChecklistItem` + section Checklist sur la fiche tâche, sélection multi-lignes + barre d'actions groupées sur la vue Liste, pastille "en retard + à valider" sur "Tâches" dans le nav — voir section "Backend interne" |
| 2026-07-24 | Signalement : page blanche en envoyant un JPG et un MP4 ensemble en livrable | Corrigé : `uploadDeliverable`/`uploadAttachment` attrapent désormais un échec de stockage/mémoire et renvoient un message clair au lieu de laisser planter la page ; ajout d'un écran d'erreur habillé (`src/app/admin/error.tsx`) pour tout le reste de l'admin — voir section "Backend interne" |
| 2026-07-24 | Suggestions backend : pastille "Mail" non lus, panneau sécurité (tentatives échouées), rappels sur les notes, export complet en ZIP — 4 retenues sur 5 (relance factures écartée) | Livré : `getUnreadThreadCount` (cache 60s), section "Sécurité" sur `/admin/reglages`, `Note.reminderAt`/`reminderSentAt` + vue "Rappels" + cron quotidien `/api/cron/note-reminders`, export ZIP `/api/exports/tout` (+ nouvel export documents.csv) — voir section "Backend interne" |
| 2026-07-24 | Signalement : l'envoi de plusieurs livrables d'un coup (13 fichiers, 8,4 Mo) fait ramer l'admin | Corrigé : vignettes redimensionnées (320px, WEBP) générées à la volée pour la grille de fichiers au lieu des images en pleine résolution, plus chargement différé (`loading="lazy"`) — voir section "Backend interne" |
| 2026-07-24 | Pouvoir démarrer/arrêter le chronomètre par une petite icône directement dans la vue Liste des tâches, avant de déployer | Livré : `TaskTimerIconButton` (icône lecture/stop à côté de l'épingle), rouvre le choix du 2026-07-21 limitant ça à la fiche tâche — voir section "Backend interne" |
| 2026-07-28 | Signalement : le compteur "Tâches" du tableau de bord compte toutes les tâches, y compris "Terminé" | Corrigé : le grand nombre est désormais les tâches en cours (hors "Terminé"), le total en petit en dessous — voir section "Backend interne" |
| 2026-07-28 | Nouvel onglet "Prospection" (CRM léger) : fiches prospect, statut sur 5 valeurs, envoi d'email, relances configurables, suppression, conversion en client, recherche automatique de prospects par IA | Livré : voir section "Backend interne" pour le détail complet (modèle `Prospect`, pages `/admin/prospection`, cron de relance, intégration Anthropic avec dégradation propre sans clé). Bug latent trouvé et corrigé pendant les tests : plantage de l'envoi d'email si le token Gmail est expiré (corrigé pour Prospection et pour les clients) |
| 2026-07-28 | Mode d'emploi client illustré, dans la DA du site, en PDF téléchargeable | Livré : bouton sur `/admin/reglages`, généré à la volée (`@react-pdf/renderer`), une section par onglet de l'espace client — voir section "Backend interne" |
| 2026-07-28 | Validation logicielle (VSI) permanente, à maintenir à chaque nouvelle fonctionnalité | Livré : nouveau `VALIDATION.md` (cas passants/bloquants réellement testés), règle de maintenance ajoutée dans `CLAUDE.md` — portée initiale limitée aux livraisons du 2026-07-28, historique antérieur non rejoué rétroactivement — voir section "Backend interne" et "Points encore ouverts" |
| 2026-07-28 | Suggestions Prospection : mini fil d'historique par prospect (emails/relances/statuts) + lien direct vers la fiche client convertie — 2 retenues sur 4 proposées | Livré : nouveau modèle `ProspectActivity` (créé/statut/email/relance/converti, ordre chronologique inverse) affiché sur la fiche prospect ; lien "Voir la fiche client →" ajouté sur la ligne (Liste) et la carte (Kanban) une fois converti — voir section "Backend interne" |
| 2026-07-28 | "As-tu des suggestions pour la gestion globale ?" | Pas construit — 9 pistes proposées, 8 retenues et notées dans "Points encore ouverts" pour être reprises plus tard (sauvegardes auto, vue financière, recherche globale, digest hebdomadaire, 2FA admin, journal d'audit global, planning de charge, rôles multi-admin) ; "modèles de tâches réutilisables" explicitement écartée par le client |
| 2026-07-28 | "Vois-tu autre chose à améliorer côté fonctionnalité ou design ?" | Pas construit — 6 pistes proposées, 3 retenues et notées dans "Points encore ouverts" (devis signables en ligne, vérification du mode clair sur Prospection, mini visite guidée à la première connexion client) ; 3 explicitement écartées pour l'instant par le client (pages "étude de cas" portfolio, avis client à la clôture d'une tâche, lien de partage temporaire d'un BAT) |
| 2026-07-28 | "Peux-tu voir pour renforcer la sécurité au max du site ?" | Audit complet mené (lecture seule) — aucune faille critique trouvée (pas d'IDOR, pas de XSS via `dangerouslySetInnerHTML`, pas d'injection SQL, webhook Stripe et sandbox email intacts). Plan de durcissement (11 points) discuté et validé sur 4 arbitrages avec le client, mis de côté une session ("quand les tokens seront rechargés") — voir ligne suivante pour la reprise |
| 2026-07-28 | "Tu peux reprendre" (renforcement de la sécurité) | Livré : les 9 points du plan (hors 2FA et rate limiting général, explicitement hors périmètre) — voir section "Points encore ouverts" pour le détail complet et `VALIDATION.md` pour les résultats de test réels (rate limiting déclenché en conditions réelles, step-up testé mot de passe correct/incorrect, en-têtes HTTP inspectés, CSP Report-Only sans violation sur les parcours testés) |
| 2026-07-29 | Reprise des 7 pistes "gestion globale" + 3 pistes "fonctionnalité/design" du 2026-07-28 (2FA explicitement laissé de côté, reste un chantier séparé) | Livré : les 10 points (sauvegardes déjà couvertes par Scalingo, vue financière, planning de charge, recherche globale, rôles multi-admin, journal d'audit global, digest hebdomadaire, devis signables en ligne, mode clair Prospection vérifié, visite guidée première connexion) — voir section "Points encore ouverts" pour le détail complet et `VALIDATION.md` pour les résultats de test réels |
| 2026-07-29 | "Peux tu vérifier la partie notes, je n'ai pas accès au bouton de suppression d'une note" | Bug trouvé et corrigé : la barre d'outils de l'éditeur de note (`notes-app.tsx`) était forcée sur une seule ligne sans pouvoir rétrécir ni passer à la ligne, débordait de son conteneur dès qu'une note n'avait ni dossier ni client lié, et le bouton "Supprimer" (dernier de la rangée) se retrouvait coupé/inatteignable au clic — reproduit à plusieurs largeurs d'écran, corrigé en autorisant la barre à passer à la ligne, re-testé après correctif |
| 2026-07-29 | "Ce ne serait pas un automatisme mais un agent, dans mon application Claude, qui pousse les lignes dans Scalingo" — pour la recherche/qualification automatique de prospects | Expliqué pourquoi un agent Claude Code planifié n'est pas le bon mécanisme (accès direct à la base de production nécessaire, plus risqué qu'utile) — le client a choisi de construire cet agent lui-même dans Cowork plutôt que de le faire développer ici. Demande reformulée en conséquence : fournir un modèle CSV + une fonction d'import sur le site |
| 2026-07-29 | "Donne-moi un modèle de tableau CSV à remplir, et ajoute une fonction d'import des prospects directement sur le site" | Livré : nouveau champ `Prospect.website` (site web, cohérent avec les 3 sources de prospects — manuel, recherche IA, import), modèle CSV téléchargeable (`public/modele-import-prospects.csv`), import CSV sur `/admin/prospection` (colonnes reconnues avec tolérance accents/casse/synonymes, déduplication contre la base existante et au sein du fichier par email/Instagram, lignes sans nom ignorées proprement) — voir `VALIDATION.md` pour le détail des tests |
| 2026-07-30 | "J'aimerais pouvoir scaler ce site pour le mettre en place chez des clients, penses-tu que c'est faisable ?" | Étude de faisabilité menée (lecture seule, aucun code produit) : verdict **faisable**, mais uniquement en « une instance par client », pas en SaaS multi-tenant — l'application est mono-tenant par construction (aucune notion d'organisation dans le schéma, singletons `AppSettings`/`HomepageContent`/`HomepageHero`, `Admin` = l'équipe et `Client` = ses clients). Points favorables relevés : couche d'autorisation centralisée (`dal.ts`), stockage déjà abstrait (S3/disque), tous les services externes optionnels avec dégradation propre, déploiement déjà scripté (Procfile + `cron.json`). Chantiers identifiés et arbitrages pris : voir "Points encore ouverts" |
| 2026-07-30 | Arbitrage sur le modèle commercial des instances clientes | Décidé : **hébergement par Mikko Visuel, en abonnement mensuel** (une app Scalingo par client sur son compte, domaine du client). Écarté : instance sur le compte du client, qui ferait perdre la main sur les mises à jour et le récurrent — conservée uniquement en option facturée plus cher pour un client qui l'exigerait. Implications à traiter : contrat de sous-traitance RGPD par client, test réel de restauration de sauvegarde, coût infra par instance à répercuter dans le prix. Argument commercial déjà en place : la réversibilité (exports CSV/ZIP complets) est déjà codée |
| 2026-07-30 | Module Gmail : sort dans l'offre client | Laissé **tel quel pour l'instant**, aucun code touché. Précision apportée au client, qui pensait que l'envoi de facture passait par Gmail : ce n'est pas le cas, il passe par Resend en pièce jointe (`sendDocumentByEmail`) — le module Gmail n'est que la boîte mail intégrée `/admin/mails`. Point à retenir pour le chantier white-label : la vérification Google + l'évaluation de sécurité CASA annuelle ne se déclenchent que si le module est distribué à d'autres comptes Google ; sur l'instance de Mikko Visuel seule (projet Cloud en mode Testing), il n'y a aucun coût ni vérification |
| 2026-07-30 | "Le fait d'appuyer sur envoyer la facture ouvre une nouvelle fenêtre avec le mail préparé" — retenu en **ajout** de l'envoi automatique, pas en remplacement | Livré : nouveau `src/lib/mail-draft.ts`, bouton "Préparer le mail" à côté de "Envoyer le document" (fiche client et `/admin/documents`) et de "Envoyer les livrables finaux" (fiche tâche). Limite du protocole signalée au client avant construction : `mailto:` ne peut pas porter de pièce jointe (RFC 6068) — le corps renvoie donc vers l'espace client (lien authentifié, pas de lien de téléchargement public), et le bouton ne marque ni `Document.sentAt` ni `Task.deliverablesSentAt`. Voir section "Backend interne" et `VALIDATION.md` |
| 2026-07-30 | "J'aimerais gérer mes clients d'une meilleure façon, notamment en termes de tri, catégorisation, contacts (prendre les profils d'espace client, mais ajouter la possibilité d'ouvrir ou non un espace client). Il faudrait également retrouver une section Contacts dans le bandeau du haut. Tu peux par contre supprimer l'onglet Mail qui ne me sert à rien." | Livré, 4 volets — voir section "Backend interne" pour le détail : (1) **contacts dissociés de l'accès** (`ClientUser.email`/`passwordHash` nullables + `portalAccessEnabled`, trois états d'accès, ouverture/fermeture et invitation par boutons séparés, création en 3 modes) ; (2) **catégorisation** (`Client.categoryId` sur la liste ouverte `client_category`, gérable depuis `/admin/listes`) ; (3) **tri/recherche/filtres** sur `/admin/clients` (recherche incluant les contacts, filtre par catégorie avec compteurs, tri par nombre de tâches) et nouvel onglet `/admin/contacts` ; (4) **suppression de l'onglet et de la page Mail** (le reste du module Gmail conservé). Migration corrigée à la main pour ne pas couper l'accès des comptes existants. Voir `VALIDATION.md` pour les tests réellement exercés |
| 2026-07-30 | Arbitrages pris avant construction (3 questions posées) | Périmètre Gmail : **onglet + page seulement**, fils par client et composeur prospect conservés. Catégories : **une catégorie unique** par client (les étiquettes multiples et la combinaison des deux ont été écartées). Ouverture d'accès : **les deux au choix** — invitation par email *et* mot de passe défini par l'admin |
| 2026-07-30 | Cinq demandes de réglage après la refonte clients : (1) pastille "Tâches" du bandeau, (2) tâche en retard fantôme sur le tableau de bord, (3) allègement de la liste clients + avatar, (4) refonte de la mise en page de la fiche client, (5) regroupement des tâches terminées | Livré, les 5 — voir section "Backend interne". (1) La pastille compte désormais toutes les tâches hors "Terminé" au lieu de "en retard + à valider". (2) **Bug trouvé, la piste du client était fausse** : ce n'était pas une tâche de l'espace de démo (déjà correctement exclu) mais une tâche **archivée** — le tableau de bord ne filtrait pas `archivedAt`, contrairement à la pastille et à la liste. Nouveau filtre partagé `ACTIVE_TASKS` appliqué aux 12 requêtes du tableau de bord. (3) Avatar rond (nouveau champ `Client.avatar*`, upload validé jusqu'à la signature binaire), catégorie affichée, compteurs de contacts/tâches et tri par nombre de tâches retirés. (4) Bandeau collant avec "Enregistrer" en haut à droite, informations sur deux colonnes (identité / facturation), contacts compacts et dépliables, création de contact et de tâche en modale `<dialog>` native, tâches affichées avec le même tableau que `/admin/taches`. (5) Tâches terminées repliées par défaut, sur la liste globale comme sur la fiche client. Voir `VALIDATION.md` — un second bug a été trouvé et corrigé pendant les tests |
| 2026-07-30 | "Peux-tu me donner des améliorations dans la gestion clients / tâches ?" | 6 pistes proposées après lecture du code (pas des généralités) : planning en heures, assignation des tâches, rapport de temps/rentabilité, archivage client, relance client, fil d'activité client. **3 retenues et livrées** : planning pondéré par le temps estimé, archivage réversible d'un client, rapport Temps & rentabilité sur `/admin/finances`. Écartées pour l'instant : relance client et fil d'activité. Les **dépendances entre tâches** ont été déconseillées (lourdes à maintenir, volume insuffisant) et les **tâches récurrentes** signalées comme voisines des "modèles de tâches réutilisables" déjà écartés le 2026-07-28 |
| 2026-07-30 | Assignation des tâches à un administrateur | Pas construit — le client a répondu "pas encore, mais c'est prévu" (il travaille seul aujourd'hui). Constat à l'origine de la proposition : les comptes multi-admin existent depuis le 2026-07-29 mais `Task` n'a aucun champ de responsable, donc à plusieurs personne ne sait qui fait quoi. À reprendre le jour où un second compte est réellement actif — voir "Points encore ouverts" |
| 2026-07-30 | "Penses-tu à d'autres améliorations globales ?" | 6 constats remontés après audit du projet (au-delà des clients/tâches) : absence totale de tests automatisés, absence de sauvegarde des fichiers, absence de remontée d'erreur en production, CSP en Report-Only qui ne collecte rien, dépendances à mettre à jour, mentions légales et CGV toujours en texte d'attente. **Correction apportée au passage** : la "réversibilité déjà codée" annoncée le 2026-07-30 dans le contexte white-label était inexacte — l'export ne contenait aucun fichier |
| 2026-07-30 | Retenu sur ces constats : sauvegarde des fichiers + alerte d'erreur en production | Livré (2 sur 6) — voir section "Backend interne". **Non retenus** : les tests automatisés (proposés en priorité n°1, écartés par le client), la CSP, les dépendances et les pages légales. Le constat sur les tests reste noté : les 3 dernières sessions ont chacune révélé en test manuel un bug qu'un test unitaire aurait attrapé immédiatement |
| 2026-07-30 | "Lorsque je suis sur l'écran d'une tâche, le retour se fait sur le client et non retour à la liste des tâches" | Corrigé : le lien de retour de `/admin/taches/[taskId]` pointait en dur vers la fiche client. Il renvoie désormais vers la liste des tâches, et le client reste accessible par un second lien juste à côté — c'était le seul lien vers lui sur cette page, le remplacer purement et simplement l'aurait rendu injoignable |
| 2026-07-30 | "Fais une passe globale sur le code, détecte les superflus, les incohérences et corrige-les" | Passe de nettoyage menée à l'outil (`knip`) plutôt qu'à l'œil, puis chaque signalement vérifié à la main avant suppression — les faux positifs (`public/sw.js` référencé par chaîne de caractères, `@prisma/client` requis par le client généré, types référencés par des interfaces exportées) ont été **écartés sans y toucher**. Supprimés : `src/lib/zip.ts` devenu orphelin, `movePillar` jamais branché depuis le commit initial, le bloc `searchThreadsAcrossClients` et ses deux types (restes de l'onglet Mail supprimé), `ColorSwatch`. Fusionnés : `formatBytes`/`formatFileSize` et `formatHoursLong`/`formatHours`, tous introduits en double lors des sessions précédentes. Retirées : dépendances `pg`, `@types/pg`, `@types/bcryptjs` (déjà fournies par `@prisma/adapter-pg` et `bcryptjs`). Harmonisés : deux requêtes réécrivaient `ACTIVE_TASKS` à la main. Lint désormais **sans aucun avertissement**. Total : 246 lignes retirées pour 53 ajoutées |
| 2026-07-30 | **Défaut trouvé pendant cette passe, présent en production** | `instrumentation.ts` entraînait Prisma dans le bundle **Edge** (le proxy y tourne), qui ne supporte pas les modules Node : le build affichait "Ecmascript file had an error" puis concluait malgré tout "Compiled successfully", et l'alerte d'erreur était inopérante côté Edge. Introduit avec l'alerte email et non détecté parce que la vérification du build filtrait uniquement la ligne de conclusion. Corrigé par un garde `NEXT_RUNTIME !== "nodejs"`, qui fait disparaître la branche et ses imports du bundle Edge. Build désormais réellement propre |
| 2026-07-31 | Cinq réglages d'ergonomie : (1) filtres et tris repliés dans un menu déroulant sur toutes les vues, (2) bouton "Ajouter un document" en pop-up comme pour les tâches, (3) champ "durée estimée" à la création d'une tâche, (4) styles de texte qui disparaissent au scroll dans les Notes, (5) possibilité de mettre des liens dans les tâches | Livré, les 5 — voir sections "Backend interne" et "Espace client". Deux points ont été **précisés avec le client avant de coder** plutôt que devinés : (5) signifiait la **détection automatique des URLs** dans les textes libres (pas un champ "liens" structuré en base, option écartée), et (1) portait sur l'**admin uniquement** (pas les tris de l'espace client, jugés déjà légers). Nouveau composant partagé `FilterMenu` (`<details>` natif, donc sans JavaScript, cohérent avec l'état-dans-l'URL des pages listes) appliqué à Tâches, Clients, Documents, Contacts, Prospection et Audit, avec une pastille indiquant le nombre de filtres actifs — replier des filtres ne doit jamais masquer qu'une liste est filtrée. Deux exceptions assumées : le **sélecteur de vue** (liste/kanban/calendrier) et la **recherche texte** restent hors du menu, l'un étant de la navigation et l'autre le chemin le plus fréquent vers une fiche |
| 2026-07-31 | Précision sur (3) : le champ existait déjà | `Task.estimatedMinutes` était en base et modifiable à l'**édition** d'une tâche depuis le 2026-07-30 (il alimente la jauge de temps et le planning de charge), mais absent du formulaire de **création** — il fallait donc créer la tâche puis la rouvrir pour l'estimer. Le parsing a été extrait dans `parseEstimatedMinutes` et partagé par la création et l'édition plutôt que dupliqué. Champ volontairement **réservé à l'admin** (prop `allowEstimate`) : c'est un suivi interne, jamais exposé au client, et `createTaskByClient` ne le lit pas |
| 2026-07-31 | Précision sur (4) : cause réelle | Ce n'était pas une disparition des styles appliqués mais de la **barre d'outils** : elle vivait à l'intérieur du conteneur défilant de l'éditeur, donc dès qu'une note dépassait la hauteur visible, gras/titre/listes devenaient inatteignables au milieu du texte. Corrigé en la rendant `sticky` avec un fond opaque |
| 2026-07-31 | "Dans l'onglet liste déroulante, changer la façon de déterminer les couleurs : il manque des couleurs, peut-être mettre une roue RGB ?" | Livré en **palette élargie de 8 à 24 teintes**, pas en roue RGB — arbitrage tranché avec le client après lui avoir exposé la contrainte réelle. Les couleurs ne sont pas stockées en hexadécimal mais sous forme de **noms** rendus par des classes Tailwind écrites en dur, ce qui est précisément ce qui fait fonctionner le mode sombre et les exports PDF ; une couleur libre aurait imposé de **calculer** le contraste du texte pour chaque teinte et chaque thème, faute de quoi un jaune pâle produit un badge illisible. Le client a préféré la palette élargie, avec deux demandes explicites : **aperçu par pastille de couleur** et **libellés en français**. Les 8 couleurs d'origine sont conservées à l'identique (aucune migration, les lignes en base restent valides), les gris quasi identiques de Tailwind (`zinc`, `neutral`) ont été écartés au profit de 4 tons foncés nettement distincts (Bordeaux, Brun, Vert sapin, Bleu nuit) — à 24 entrées, l'enjeu devient de rester distinguable d'un coup d'œil |
| 2026-07-31 | Sélecteur de couleur refait au passage | L'ancien `ColorSelect` était une liste déroulante native affichant les identifiants bruts en anglais ("slate", "emerald"...) **sans aucun aperçu** — déjà peu lisible à 8 couleurs, inutilisable à 24. Remplacé par un bouton montrant la pastille et le nom français de la couleur courante, ouvrant une grille de 24 pastilles (libellé français en infobulle et en nom accessible, coche sur la couleur active). Le contrat côté serveur est inchangé : la valeur part toujours dans `formData` sous le nom `color` |
| 2026-07-31 | Ajouter un statut de tâche "Bloqué", entre "Non commencé" et "En cours" | Livré — **3e réouverture du cycle verrouillé** (6 statuts figés le 2026-07-13, "Non commencé" ajouté le 2026-07-21, "Bloqué" le 2026-07-31). Le cycle compte désormais 8 statuts. Couleur : Rouge, rendue disponible par l'élargissement de palette du même jour. Reste `locked: true` comme les autres : impossible à supprimer depuis /admin/listes, seuls libellé, couleur et ordre y restent modifiables. Le Kanban, le sélecteur de statut et les filtres se peuplent depuis la base, donc le nouveau statut y apparaît sans code supplémentaire |
| 2026-07-31 | Conséquence à connaître : le client ne voit pas qu'une tâche est bloquée | La timeline de l'espace client se replie sur **4 étapes** (Nouveau, En cours, À valider, Terminé) : "Bloqué" se replie sur "Nouveau", exactement comme "Non commencé", puisqu'il est placé avant "En cours" dans le cycle. C'est un **choix de repli assumé, pas un oubli** — le blocage reste une information interne, visible de l'admin seul. À rouvrir si le client doit être averti d'un blocage : il faudrait alors une 5e étape ou un état d'avertissement, comme celui déjà utilisé pour "À modifier" |
| 2026-07-31 | Mise en production sur Scalingo | Demandée explicitement par le client à la suite de ces changements. Le statut "Bloqué" a nécessité une **migration de données** (`20260731000000_add_task_status_bloque`) et non une simple modification du seed : `prisma/seed.ts` ne tourne pas au déploiement (le Procfile n'exécute que `prisma migrate deploy`), et le lancer à la main en production écraserait les renommages et couleurs personnalisés depuis /admin/listes. Même raisonnement et même forme que la migration du 2026-07-30 sur les catégories de client |
| 2026-07-31 | "Les largeurs peuvent-elles être adaptées aux différents écrans ? Il reste de l'espace à droite et à gauche" | Corrigé : les conteneurs de l'application étaient plafonnés à `max-w-7xl` (1280 px), ce qui laissait ~320 px vides de chaque côté sur un écran de 1920 px. Plafond relevé à 1600 px **au-delà de 1536 px de large seulement** (`2xl:max-w-[100rem]`), sur les 28 conteneurs de l'admin et de l'espace client. En dessous de ce seuil (portables 1280/1440, tablettes, mobiles) **rien ne change** — le but est de récupérer l'espace des grands écrans, pas d'allonger les lignes de texte sur les petits. Le **site vitrine n'est pas touché** : sa colonne étroite est un parti pris de mise en page issu de la DA, pas un défaut d'adaptation |
| 2026-07-31 | "Les onglets Listes, Exports et Audit doivent être dans la roue des réglages. Optimiser l'affichage des réglages" | Livré. La barre de navigation admin passe de **13 à 10 onglets** : "Listes", "Exports" et "Audit" sont désormais sous la roue crantée (nouveau `SettingsMenu`, composant client avec fermeture au clic extérieur — un `<details>` seul ne se referme pas, contrairement au `FilterMenu` des vues listes où ça n'a pas d'importance). Critère de tri retenu : la barre garde le travail quotidien, la roue reçoit ce qu'on ouvre rarement. Les trois écrans sont **aussi rappelés en cartes en tête de /admin/reglages** : une fois sortis de la navigation, ils seraient devenus difficiles à retrouver pour qui avait l'habitude des onglets |
| 2026-07-31 | Refonte de l'affichage des réglages | La page était une colonne unique en `max-w-2xl` avec six sections empilées séparées par des filets — un seul long défilement, où "Comptes admin" et "Sécurité" se retrouvaient enterrés sous la liste des notifications, dont la hauteur croît avec le nombre de clients. Passage en **deux colonnes à partir de `lg`**, sections en cartes délimitées, et la liste des notifications repliée par défaut. Les deux colonnes sont composées à la main plutôt qu'en grille automatique, pour maîtriser ce qui tombe où plutôt que de le laisser au hasard des hauteurs |
| 2026-07-31 | "Dans les notes, ajouter les fonctions de taille de texte, de couleurs et de surlignage" | Livré : trois nouveaux menus dans la barre d'outils (taille, couleur du texte, surlignage), via les extensions TipTap `text-style`, `color` et `highlight` (mode multicolore). **Taille** = Normal / Sous-titre / Titre / Grand titre, c'est-à-dire des niveaux de titre réels et non des tailles arbitraires — le CSS ne stylait que `h2`, `h1` et `h3` ont donc été ajoutés. **Couleurs et surlignages en liste fermée**, pas en sélecteur libre : les notes s'affichent dans les deux thèmes et le fond passe de `#f7f6f3` à `#0b0b0d`, donc un texte quasi noir ou un surlignage très clair deviendrait illisible d'un thème à l'autre. Les surlignages sont à 40 % d'opacité, ce qui laisse le texte du thème lisible sur les deux fonds |
| 2026-07-31 | "Pendant que tu es dans les notes, vérifie les liens cliquables internet aussi" | Vérifié, et **un vrai défaut trouvé**. L'`autolink` fonctionnait bien (fourni par StarterKit, actif par défaut) : une adresse tapée devenait un lien avec `target="_blank"`. Mais **aucune règle CSS ne visait `.note-prose a`**, et le reset de Tailwind remet `color: inherit` et `text-decoration: inherit` sur les `<a>` — les liens étaient donc créés et cliquables, mais **strictement indiscernables du texte courant**. Corrigé par un style dédié (souligné, couleur `ink`, accent au survol, comme les autres liens en ligne du projet). Deux ajouts au passage : `defaultProtocol` passé de `http` à `https` (un "exemple.fr" tapé sans schéma partait en clair), et un bouton "Lien" pour transformer une sélection existante en lien — l'autolink ne couvre que les adresses tapées telles quelles. **Sécurité vérifiée et non supposée** : `isAllowedUri` de l'extension rejette `javascript:` et `data:` (testé, y compris en casse mélangée) tout en acceptant http, https et mailto |
| 2026-07-31 | Grand lot d'améliorations demandé en une fois, sur 10 écrans (Clients, fiche client, Contacts, Tâches, fiche tâche, Documents, Notes, Planning, Finances) | Traité par sections, dans l'ordre reçu, avec vérification (`tsc`/lint/build après chaque section, tests fonctionnels directs en base pour la logique la plus sensible) et point d'étape avant les deux morceaux les plus lourds (restructuration des Contacts, tableau de bord de Planning), qui touchent respectivement le modèle de données et sont un système entièrement nouveau — traités séparément, avec l'accord du client, plutôt que devinés dans le même lot. Détail des 8 sections livrées ci-dessous |
| 2026-07-31 | Onglet Clients : tri alphabétique par défaut, catégorie alignée à droite | Tri par défaut passé de "date d'ajout" à "nom" (A→Z, direction par défaut aussi corrigée — sinon le tri "alphabétique par défaut" se serait ouvert en Z→A). Badge de catégorie déplacé en fin de ligne : il était collé au nom, ce qui produisait une longueur de ligne irrégulière d'un client à l'autre |
| 2026-07-31 | Fiche client : Raison Sociale, lien Drive, contacts cliquables, confirmation d'enregistrement, retrait du bouton Emails, livrables disponibles | Nouveau champ **Raison sociale** (facultatif, distinct du nom commercial). "Lien Google Drive" renommé "Lien Drive" (le champ accepte n'importe quel service) avec un lien "Ouvrir" cliquable en nouvel onglet. Sur les contacts : email en `mailto:`, téléphone en `tel:`, statut d'accès aligné à droite, texte de présentation retiré. **Vrai défaut corrigé** : le bouton "Enregistrer" du bandeau ne donnait aucun retour visuel — techniquement il vivait hors de son formulaire (relié seulement par l'attribut HTML `form=`), ce que `useFormStatus` ne peut pas suivre. Les deux ont été fusionnés dans un seul composant client (`ClientInfoForm`) autour d'un unique `useActionState`, qui donne maintenant un vrai "Enregistrement..." puis "✓ Enregistré". Bouton "Emails" retiré du bandeau (demande explicite) et redonné comme lien discret en haut de page — sans lui, `/emails` devenait inatteignable. Nouvelle section dépliable "Livrables disponibles", agrégeant les livrables finaux de toutes les tâches du client |
| 2026-07-31 | Généraliser la confirmation "Enregistré" | Le motif venait de `ContactEditForm` (déjà correct). Étendu à 4 autres formulaires d'édition en place qui ne donnaient aucun retour après un enregistrement réussi : listes déroulantes (`/admin/listes`), pilier de portfolio, image d'accueil, contenu d'accueil. Les formulaires qui **redirigent** après succès (édition de tâche, création...) n'ont pas été touchés : la redirection est déjà sa propre confirmation, y ajouter un message qui ne s'affiche jamais aurait été inutile |
| 2026-07-31 | Onglet Tâches : coches, retrait de "Par client", défilement Kanban | **Vrai défaut trouvé** : aucun checkbox de l'app ne suivait le thème sombre/clair — `accent-color` teinte la coche une fois cochée, mais le contour et le fond à l'état non coché restent au rendu clair du navigateur sans la propriété CSS `color-scheme`, absente du projet. Corrigée une fois, globalement (`:root`/`.dark`), pas seulement sur les cases de sélection des tâches. Vue "Par client" retirée (composant `TaskByClientView` supprimé, désormais orphelin) — un lien `?vue=clients` existant retombe silencieusement sur "Liste". Chaque colonne du Kanban plafonnée en hauteur avec défilement propre, pour ne plus étirer toute la page |
| 2026-07-31 | Fiche tâche : largeur, historiques dépliables, BAT/livrables séparés, tailles | Page passée de `max-w-2xl` à la largeur standard de l'app, en deux colonnes à partir de `xl` (contenu de travail à gauche, suivi temps/historiques à droite) — élargir seul aurait juste étiré les champs sans les rendre plus lisibles. "Historique des statuts" et "Historique des refus" repliés par défaut (`CollapsibleSection`). Livrables séparés en deux panneaux côte à côte, "BAT à valider" et "Livrables finaux" — **et** un BAT rejoint désormais automatiquement les livrables finaux (perd son filigrane client) dès que la tâche passe au statut "BAT validé", quel que soit le chemin emprunté (bouton client, bouton admin, ou glissé-déposé Kanban — les trois appellent maintenant `promoteBatDeliverablesToFinal`). Description passée de 3 à 5 lignes. **Vérifié et non modifié** : la limite de taille des livrables est déjà à 500 Mo par fichier, largement au-dessus des 50 Mo demandés — la baisser à 50 Mo aurait été une régression contraire à l'intention ("augmenter") |
| 2026-07-31 | Onglet Documents : icônes, renommage, types Commercial/Société, vue Bacs, paiements sans facture, mensualisation | Section renommée "Factures / Devis / Contrats" (répercuté sur la fiche client) : elle ne couvre que ces 3 types, le titre générique "Documents" ne le disait pas. Toutes les actions de `DocumentRow` passées en icônes, la ligne tient sur une seule ligne. Nouvelle vue "Bacs" (bascule à côté de "Détaillé") : un panier compact par type, juste le nom du fichier, pour une vue d'ensemble. Deux nouveaux modèles : **`CompanyDocument`** (documents Commercial/Société, volontairement sans client associé — consultation/téléchargement/suppression seulement, catégories fixes et non une liste déroulante éditable) et **`PaymentRecord`** (suivi Client/montant/statut sans fichier, "marquer comme payé" en icône). Facture "mensuelle" : case à cocher + année/mois à l'ajout, rattache la facture au mois convenu plutôt qu'à sa date de chargement pour le rapport Temps & rentabilité — testé sur la base réelle (une facture mensuelle de juillet n'apparaît ni en août, ni confondue avec une facture ordinaire du même mois) |
| 2026-07-31 | Onglet Notes : images, export PDF, affectation aux prospects | Bouton "Image" dans la barre d'outils (upload direct, nouveau modèle `NoteImage` — pas de lien vers une note précise, une note peut en gagner/perdre au fil de l'édition de son HTML ; limite connue et acceptée : une image retirée du texte n'est pas purgée automatiquement du stockage). Export PDF par note : le HTML est reparsé avec `@tiptap/html` (mêmes extensions que l'éditeur) puis converti en PDF via `@react-pdf/renderer` — titres, gras/italique/souligné/barré, liens (**vraies annotations PDF cliquables**, pas seulement du texte souligné — corrigé après un premier test qui ne produisait qu'un style visuel), listes, checklists (cochées/non cochées), citations et images (récupérées côté serveur et encodées en PDF, la route de service exige une session admin que le moteur de rendu n'a pas). Affectation aux prospects : un seul sélecteur combiné Client/Prospect (encodage `client:<id>`/`prospect:<id>`), les deux étant mutuellement exclusifs en base — pas deux menus à synchroniser |
| 2026-07-31 | Onglet Finances : couleurs, filtres client/année/mois | Facturé en rouge, Encaissé en vert (cartes de résumé, graphique mensuel, tableau par client) — auparavant les deux étaient rendus dans la même couleur neutre. Filtre client + année + mois ajouté (remplace l'ancien sélecteur "30 derniers jours/12 derniers mois/depuis le début", devenu `FilterMenu` avec un vrai filtre par client). Le rapport Temps & rentabilité partage désormais exactement le même filtre plutôt qu'une logique séparée. Le filtre respecte les factures mensuelles (voir Documents ci-dessus) : une facture tagguée juillet 2026 compte pour juillet même si chargée en août |
| 2026-07-31 | Onglet Contacts, tous les points : alignement, bouton modifier, tri, "Nouveau"/"Affecter", table dédiée | Livré — c'est le chantier le plus lourd de la session, touchant l'authentification. Décision de découpage validée avec le client avant de coder (voir plus bas) : identité (`Contact`, partageable) séparée du compte d'accès à l'espace client (`ClientContact`, un par rattachement, accès et mot de passe indépendants "par client"). L'ancien modèle `ClientUser` confondait les deux, ce qui empêchait structurellement un contact d'être rattaché à plusieurs clients |
| 2026-07-31 | Détail du split Contact/ClientContact | Migration de données écrite à la main (`20260731180000_split_contact_from_client_user`), pas laissée à `prisma migrate dev` : chaque `ClientUser` existant devient une paire Contact+ClientContact, testée sur la base réelle (jointure identique aux données d'origine, sauvegarde `pg_dump` prise avant). `ClientContact` reprend l'id de l'ancien `ClientUser` tel quel — Task.createdById, TaskComment.authorId, Session.subjectId, PasswordResetToken.subjectId et AuditLogEntry.targetId (tous des chaînes libres, sans FK) restent donc valides sans la moindre réécriture. Connexion : l'email identifie désormais la personne (`Contact`), le mot de passe saisi désigne lui-même le bon accès parmi ceux ouverts (essayés un par un) — aucun écran de sélection de client n'était nécessaire |
| 2026-07-31 | Conséquence assumée : identité partagée = édition partagée | Modifier le nom/email/téléphone/fonction d'un contact depuis la fiche d'UN client le modifie désormais partout où ce même contact est rattaché — comportement voulu pour une identité partagée, pas un bug. Documenté explicitement dans le code au point d'édition |
| 2026-07-31 | Conséquence bénéfique trouvée en migrant : conversion prospect→client | Avant, convertir un prospect dont l'email correspondait à un contact déjà existant refusait silencieusement de créer un compte ("email-taken"). Désormais, le contact existant est directement **rattaché** au nouveau client — exactement l'usage que le split est censé permettre |
| 2026-07-31 | Onglet Contacts : alignement en grille, bouton "Modifier" en icône, tri alphabétique/date d'ajout (alphabétique par défaut), bouton "Créer un contact" avec choix Nouveau/Affecter | Tous livrés sur `/admin/contacts`. Le choix Nouveau/Affecter est aussi disponible depuis la fiche client (demande explicite couvrant les deux endroits). Le contact rattaché en mode "Affecter" ne peut être choisi que parmi ceux pas déjà liés à ce client |
| 2026-07-31 | Onglet Planning : pop-up de capacité par jour, charge non répartie, alerte à l'échéance | "Le moteur d'abord" retenu par le client face aux deux options proposées (l'autre étant "tout d'un bloc", avec tendance et tableau de bord détaillé en plus) — **la tendance semaine par semaine et le tableau de bord détaillé et complet restent donc à construire**, non oubliés. Livré : nouveau modèle `WorkCapacityDay`, pop-up de saisie hebdomadaire (`CapacityPopup`), section "Charge non répartie" pour les tâches sans date d'évènement (jusque-là absentes du graphique), graphique hebdomadaire comparé à la capacité réelle quand elle existe (repli sur les seuils fixes sinon), et alerte orange/rouge sur le champ Échéance de la fiche tâche — voir section "Backend interne" pour le détail, testé en base (surcharge, marge à 20 %, jour à 0 h distinct d'un jour non saisi) |
| 2026-07-31 | "Pas très bien aligné" (capture d'écran de `/admin/contacts` en production) | **Vrai défaut trouvé**, repéré une fois le lot précédent en ligne. Chaque ligne de `GlobalContactRow` est une grille CSS indépendante (pas une grille partagée entre lignes) : la colonne du badge d'accès était en largeur `auto`, donc dimensionnée sur le libellé de CE badge précis — "Contact seul" (court), "Espace client actif" ou "Invitation à envoyer" (plus longs) — ce qui décalait les colonnes précédentes (téléphone notamment) d'une ligne à l'autre selon le badge de chacune. Corrigé par une largeur fixe sur cette colonne (`w-44`), plus troncature ajoutée sur le téléphone par cohérence avec les autres colonnes texte. Vérifié par une reproduction isolée (mêmes classes, mêmes largeurs de contenu) avant/après, hors de l'admin qui reste inaccessible sans mot de passe |
| 2026-08-01 | "Améliore le design des charges, ajoute la recopie de la semaine précédente, ajoute des vues sur le board (charge semaine + charge jour)" | Design et recopie livrés (voir section "Backend interne"). Pour les vues, deux maquettes proposées avant de coder (widget interactif) — le client a ensuite redirigé la demande vers la base de calcul et les deux points explicitement reportés le 2026-07-31 (tendance, tableau de bord), traités séparément ci-dessous |
| 2026-08-01 | "Ajoute une option pour le calcul par date d'évènement ou par échéance ; la charge non répartie doit lister les tâches sans échéance également" | Livré : bascule "Par date d'évènement / Par échéance" sur `/admin/planning`, même moteur rattaché à une date différente. La section "Charge non répartie" suit désormais la même base (sous "échéance", liste les tâches sans échéance, pas sans date d'évènement) — testé en base avec deux tâches réelles, chacune bascule bien de "comptée" à "non répartie" selon la base active |
| 2026-08-01 | "Donne une tendance semaine par semaine des charges réelles et le delta prévu/réel ; il me faut un véritable tableau de bord détaillé et complet" | Clôture des deux points reportés le 2026-07-31, avec deux maquettes proposées avant de coder. **Tendance** : barres appariées prévu/réel par semaine (`TrendChart`), format choisi face à l'alternative deux-courbes ; le "réel" vient du temps chronométré, rattaché à la semaine où la session a commencé, indépendant de la base évènement/échéance. **Tableau de bord** : 4 tuiles choisies parmi 6 proposées (tâches en retard, à risque à 30 jours, écart moyen sur 4 semaines complètes, charge non répartie) — client le plus chargé et vélocité récente proposés mais non retenus, à reprendre si besoin — voir section "Backend interne" |
| 2026-08-01 | "Dans une tâche, après être refusée elle passe en statut à modifier : lorsque je la remets en validation, le statut sur la vue de la tâche doit disparaître (uniquement la ligne rouge). Je garde bien l'historique des refus" | Livré : `setTaskStatus` efface désormais `refusalReason`/`refusedAt` aussi au passage en "À valider" (pas seulement en "BAT validé" comme depuis le 2026-07-20) — voir section "Backend interne". Corrige au passage le même défaut sur les lignes Liste/Kanban admin, qui affichaient le motif sans condition de statut. Testé en base : l'historique (`TaskRefusalHistory`) reste intact, seul le motif courant est effacé |
| 2026-08-01 | "Le lien lorsque j'invite un contact à son espace ne fonctionne pas" (capture d'écran : erreur 403 sur mikkovisuel.fr) | **Vrai défaut de production trouvé, à fort impact** — voir section "Backend interne" pour le détail. La variable Scalingo `NEXT_PUBLIC_SITE_URL` pointait vers le domaine nu `mikkovisuel.fr`, cassé depuis le 2026-07-20 (403, souci DNS/hébergement OVH jamais résolu) ; cette variable sert de base à tous les liens envoyés par email (invitation contact, resets client/admin, invitation admin, rappel de paiement) — tous étaient donc cassés. Corrigée sur `https://www.mikkovisuel.fr` (confirmation explicite demandée avant ce changement de configuration de production) puis application redémarrée |
| 2026-08-01 | "1. La bulle +n doit être sous le numéro de semaine. 2. Les infobulles ont des soucis d'affichage. 3. Choix des semaines dans les affichages. 4. Les paliers charge/surcharge doivent dépendre des capacités mises dans les paramètres" | Les 4 livrés — voir section "Backend interne" ("Planning, quatrième passage") pour le détail complet. Point 2 : **vrai défaut trouvé et confirmé par test isolé** (infobulle rognée par le défilement horizontal des graphiques, un effet de bord d'une règle CSS standard). Points 3 et 4 : deux choix proposés au client avant de coder (navigation par blocs de 16 semaines plutôt qu'une plage libre ; moyenne des capacités saisies plutôt qu'aucun statut ou seuils fixes gardés) |
| 2026-08-01 | "Aligne toute les barres, les bulles en dessous" (capture d'écran : barres décalées verticalement les unes par rapport aux autres) | **Vrai défaut de production trouvé**, apparu après le point 1 ci-dessus. La bulle "+n" n'étant rendue que si elle avait quelque chose à afficher, une semaine avec bulle avait une hauteur de colonne différente d'une semaine sans bulle — décalant la barre elle-même puisque les colonnes sont alignées par le bas. Corrigé en rendant toujours la bulle (`invisible` si vide) pour que chaque colonne ait la même hauteur totale. Reproduit et confirmé par une page de test isolée reproduisant fidèlement le bug puis la correction |
| 2026-08-01 | "Mets la vue par échéance par défaut. Mets en surbrillance la semaine actuelle. Pour les écarts, vert quand le réel est en dessous du prévu, rouge l'inverse" | Les 3 livrés — voir section "Backend interne" ("Planning, cinquième passage"). **Correction assumée, pas un ajout** : le sens des couleurs de l'écart prévu/réel était inversé depuis sa livraison la veille (raisonné à tort comme "en retard sur le travail" plutôt que "risque de surcharge") — corrigé sur le graphique de tendance et sur la tuile "Écart moyen" du tableau de bord |
| 2026-08-01 | "Mets aussi une vue par jours (en sélectionnant la semaine)" | Livré : nouvelle bascule "Vue semaine"/"Vue jour" sur `/admin/planning`, la vue jour affichant une jauge par jour (chargé vs capacité) pour une semaine choisie par une navigation dédiée, indépendante de la fenêtre de 16 semaines de la vue semaine. Repli sur la capacité journalière moyenne (capacité hebdomadaire moyenne ÷ 7) pour un jour sans capacité propre — testé en base avec des données temporaires réelles (agrégation exacte par jour, pas par semaine) |
| 2026-08-01 | "Dans la vue planning par jour, ajoute une barre du temps réel restant (déduire le temps déjà fait)" | Livré : seconde barre "Reste" sous la jauge de chaque jour, temps estimé moins temps déjà chronométré sur ces mêmes tâches (agrégé par tâche tous jours confondus, pas seulement le jour affiché). Dépassement affiché explicitement ("Dépassé de Xh") plutôt que masqué à 0 — testé en base avec deux tâches réelles, l'une avec du temps restant, l'autre en dépassement |
| 2026-08-02 | "Je souhaite ajouter un contact mais je l'avais supprimé auparavant, je ne peux pas le réaffecter" puis "Possible de supprimer définitivement un contact ?" | **Cause du premier symptôme identifiée** : retirer un contact d'un client ne supprime que le rattachement, l'identité reste en base orpheline et invisible dans l'admin — bloquant la recréation (email déjà pris) sans moyen de la retrouver. Livré, avec deux choix validés avant de coder (voir section "Backend interne") : filtre "Sans client" sur `/admin/contacts` avec action rapide "Affecter à un client", et suppression définitive toujours possible (avec avertissement listant les clients concernés si le contact est encore rattaché ailleurs, la suppression étant en cascade). Protégée par reconfirmation du mot de passe admin, journalisée dans l'audit — testé en base sur un cycle complet réel |
| 2026-08-16 | "Le site est relativement lent, il faudrait voir pour accélérer les temps de réponse" | Audit du SQL des migrations existantes : la plupart des clés étrangères n'avaient jamais eu d'index dédié (Prisma ne les crée pas automatiquement) — 18 index ajoutés (migration additive, sans risque). Page d'accueil et pages pilier du portfolio : requêtes dupliquées dédupliquées (`React.cache`) et lancées en parallèle plutôt qu'enchaînées. Voir section "Décisions techniques déléguées à Claude Code" |
| 2026-08-16 | "Dans la liste des factures, ajouter un élément visuel : payé ou en attente de paiement, vert et rouge" | Livré : pastille colorée (verte "Payée" / rouge "En attente"), sur `/admin/documents`, la fiche client, l'espace client et les paiements sans facture — testé en navigateur, voir "Espace client" |
| 2026-08-16 | "Ajouter une fonction de suivi des paiements 'sans facture' : lié à un client, sans pièce jointe. Les dates doivent rentrer dans les finances des mois affectés" | Le suivi "Paiements sans facture" existait déjà (`PaymentRecord`, livré le 2026-07-31) mais sans date ni lien avec les Finances. Ajouté : champ `date` éditable (mois affecté), et ces montants s'ajoutent désormais au Facturé/Encaissé, au graphique mensuel et au tableau par client de `/admin/finances`, avec les mêmes filtres que les factures — testé en navigateur avec des montants réels, voir "Espace client" |
| 2026-08-16 | "La purge doit fonctionner autrement : purger les livrables 1 semaine après la date de l'évènement, 30 jours si pas de date, les deux délais paramétrables" | Livré, avec deux points confirmés avant de coder (garde "Terminé" uniquement conservée, BAT toujours protégés) : deux délais indépendants et réglables sur `/admin/reglages` (7 jours après `Task.eventDate`, 30 jours après l'upload si pas de date) remplaçant l'ancien délai unique basé sur l'upload. Testé sur la base réelle avec 6 scénarios couvrant chaque règle et chaque garde-fou (déclenchement + non-déclenchement), voir section "Backend interne" |
| 2026-08-16 | "Chaque item de chaque pilier doit être des galeries, avec du texte avant/après façon Adobe Portfolio, et la réorganisation des photos doit être possible" | Restructuration `Pilier → Galeries → Médias` (nouveau modèle `PortfolioGallery`), avec trois points confirmés avant de coder (garde-fou de statut hors sujet ici, mais même logique de confirmation préalable que pour la purge le même jour) : titre + texte avant/après indépendants et facultatifs par galerie, réordonnancement des galeries et des médias (boutons monter/descendre), page pilier listant les galeries en cartes, page dédiée par galerie. Médias existants migrés automatiquement dans une galerie "Galerie" par pilier (aucune perte, 24 médias vérifiés), à réorganiser ensuite à la main — choix explicite du client. Testé en navigateur de bout en bout (création, édition, texte, affichage public), voir "Portfolio public" |
| 2026-08-17 | "La vue Liste de la prospection doit être plus comme un tableur éditable (en gardant les pastilles de statut), inspirée du champ déjà éditable en place ailleurs sur le site" | Livré : vue Liste de `/admin/prospection` transformée en tableau où nom, entreprise, téléphone, email, Instagram et date de relance s'éditent directement dans la cellule, même pattern que `PaymentRecordDateField` (Finances/Documents) plutôt qu'un nouveau composant générique — voir section "Backend interne" pour le détail |
| 2026-08-17 | Fichier réel de repérage (~90 lieux) fourni ("MIKKO_VISUEL_PROSPECTION_v11.xlsx") : "peux-tu mettre ces colonnes là ? C'est un fichier que je peux importer directement ?" | Colonnes du fichier confrontées au modèle existant : Ville/Activité/Lien Instagram/Lien WhatsApp n'avaient pas d'équivalent — choix confirmé avant de coder (nouveaux champs dédiés plutôt que tout regrouper en Notes). Livré : 4 nouveaux champs `Prospect` (colonnes dans le tableau et la fiche), import CSV élargi (nouveaux synonymes d'en-têtes + repli de découpage automatique d'une colonne "Contact" téléphone+email combinés) — voir section "Backend interne". Le fichier n'était pas importable tel quel (.xlsx, pas de colonne "Nom" reconnue, "Contact" mélangé) ; converti en CSV et rejoué de bout en bout contre une base réelle avant livraison, les 87 lignes s'importent proprement avec les nouveaux en-têtes du fichier — voir `VALIDATION.md` |
| 2026-08-21 | "Fonction activable par client, par livrable, qui demanderait un paiement avant l'accès aux fichiers finaux par évènement ou activable par client en entier — as-tu bien compris, ou des suggestions/précisions ?" | Quatre points de conception soumis et confirmés avant de coder (granularité à l'évènement, réglage client en défaut+exceptions, confirmation manuelle indépendante de la facturation, message + bouton "Payer" côté client) — voir section "Backend interne" pour le détail complet et le raisonnement. Livré : case à cocher sur la fiche client, contrôle tri-état + bouton "Marquer comme payé" sur la fiche tâche, blocage appliqué à l'affichage **et** au téléchargement des livrables. Testé de bout en bout en navigateur (les 6 combinaisons client/évènement/paiement rejouées contre une base réelle, plus capture d'écran des 4 états) — voir `VALIDATION.md` |
| 2026-08-21 | "Penses-tu que c'est possible de faire quelque chose avec PayPal ou Revolut ?" (en discutant du signal de paiement ci-dessus) | PayPal ajouté en plus de Stripe (bouton "Payer avec PayPal" sur `/espace-client/administratif`) — Revolut écarté pour l'instant (compte Business + accès API requis, non vérifiable sans compte réel). Voir section "Backend interne" pour le détail technique. **Non testé en conditions réelles** : nécessite un compte PayPal Developer (sandbox) que seul le client peut fournir — voir `VALIDATION.md` |
| 2026-08-22 | "Pour le moment il ne s'agit pas de factures mais bien de paiement, on fera les liens aux factures beaucoup plus tard ! Peux-tu renommer en conséquence ? Peux-tu également me donner la possibilité de faire le paiement avant de travailler ? Au début de la tâche ?" | Renommage : le message client bloqué ne renvoie plus vers les factures (bouton "Voir mes factures et payer" supprimé, celui-ci les liait prématurément à un système de facturation volontairement pas encore branché). Deux points confirmés avant de coder pour le nouveau verrou "avant de travailler" : interrupteur manuel (pas de vrai bouton de paiement Stripe/PayPal pour ce lot) et blocage réel du statut (pas un simple rappel) — voir section "Backend interne". Livré : même mécanique que le verrou livrables (réglage client par défaut + exception par évènement + confirmation manuelle), appliquée cette fois à l'entrée de la tâche plutôt qu'à la sortie — `setTaskStatus` refuse toute sortie du statut "Nouveau" tant que non payé. Testé de bout en bout (logique + navigateur, tentative de changement de statut réellement bloquée puis débloquée après confirmation) — voir `VALIDATION.md` |
| 2026-08-22 | "Est-il possible de faire en sorte que les galeries dans les piliers affichent 2 colonnes en visuel sur le site internet (vision clients) ?" | Livré : page galerie publique (`/portfolio/[slug]/[galleryId]`) passée en 2 colonnes à partir de `sm`, 1 colonne en dessous, via colonnes CSS plutôt qu'une grille (voir section "Portfolio public" pour le raisonnement — une grille aurait laissé des trous dès que deux médias voisins n'ont pas la même hauteur, les galeries mélangeant librement du 3:4 et du 9:16). Testé en navigateur, desktop et mobile, avec des médias de hauteurs volontairement différentes pour vérifier l'absence de trous — voir `VALIDATION.md` |
| 2026-08-23 | "Peux-tu regarder pourquoi mon site et l'app sont lentes, et regarder pourquoi ça crash souvent ?" (capture Scalingo fournie : conteneur web M — 512 Mo) | **Cause des crashs trouvée et corrigée** : la limite d'envoi des livrables (500 Mo/fichier, corps de requête autorisé à 2 Go) dépassait la mémoire totale de la machine, un fichier coûtant ~2,5× sa taille en RAM — mesuré, pas supposé. Plafonds ramenés à 50 Mo/fichier et 80 Mo/envoi, vérification faite avant toute lecture en mémoire. Mémoire réduite en plus sur les téléchargements (documents, documents Société, pièces jointes passés en streaming au lieu de 2 copies en RAM) et sur les avatars clients (`ETag` → `304` au lieu d'un retéléchargement complet à chaque liste). Deux fausses pistes écartées **par la mesure** et consignées : les vignettes (158 ms pour 12, non coupables) et le traitement des fichiers un par un (sans effet, le `File` retient la copie). Régression assumée à arbitrer : les livrables >50 Mo ne passent plus — voir "Points encore ouverts" pour les deux façons de les récupérer (envoi direct S3, ou conteneur plus grand). Trois causes de lenteur restantes identifiées mais non traitées (pagination absente, cache d'images sur disque éphémère, sessions jamais purgées) |
| 2026-08-24 | "oui tu peux" (feu vert pour poursuivre les causes de lenteur restantes identifiées le 2026-08-23) | Pagination livrée pour les deux pages mesurées lentes à volume réaliste : `/admin/taches` (vue Liste, 40/page) et `/admin/documents` (vue Détaillé, 30/page) — Kanban/Calendrier/Archivées et la vue Bacs gardent le jeu complet, ils en ont besoin. Nouveau composant partagé `src/components/admin/pagination.tsx`. Vérifié avant/après sur une base seedée réaliste (120 clients/724 tâches/120 documents) : Tâches Liste 4,4 Mo/~1,1 s → 320 Ko/~0,3 s, Documents Détaillé 1,5 Mo/2 à 2,6 s → 480 Ko/~0,8 s — voir "Troisième passe de performance" et `VALIDATION.md`. Cache d'images éphémère et sessions non purgées restent non traités, voir "Points encore ouverts" |
| 2026-08-24 | "Pourquoi j'ai maintenant des pages dans la vue des tâches ?" puis "Option 3 comme avant" (choix parmi 3 options proposées : garder tel quel, augmenter la taille de page, ou toujours afficher les tâches actives en entier et ne paginer que les terminées) | Ajusté sur `/admin/taches` (vue Liste, sans filtre de statut explicite) : les tâches actives sont de nouveau récupérées et affichées en entier, sans pagination ; seule la section "Terminées" (repliée par défaut) pagine désormais (40/page, contrôles dans le repli). Avec un statut précis filtré, le comportement du 2026-08-24 précédent (pagination de l'ensemble filtré) est inchangé. Testé en base (90 tâches "Terminée" ajoutées temporairement) : page 1/3 puis 2/3 de la section "Terminées" corrects, les 6 tâches actives restant affichées en entier sur les deux — voir `VALIDATION.md` |
| 2026-08-24 | "Peut-on regarder ça : 32 vulnérabilités npm (22 modérées, 10 critiques) vues dans le dernier build, à trier avant d'ignorer ?" puis "oui" (feu vert pour traiter les 2 groupes nécessitant `--force`) | Triage complet des 32 (voir section "Backend interne" pour le détail) : 8 corrigées sans risque (`npm audit fix`, outillage Prisma CLI uniquement, aucune dépendance de runtime touchée), 3 sans correctif amont possible à ce jour (`prisma`/`@prisma/config`/`deepmerge-ts`, dev/build-time uniquement, exposition nulle, à surveiller), 21 corrigées avec vérification dédiée : **`next` 16.2.12 → 16.3.2** (corrige les CVE `postcss`/`sharp` embarqués — `sharp` est réellement exposé, `next/image` l'utilise sur les pages publiques du portfolio et l'admin ; testé en navigateur, une requête `_next/image` réelle confirmée 200/image·jpeg) et **`@aws-sdk/client-s3` 3.726.1 → 3.1117.0** (corrige `fast-xml-parser`, l'`override` associé retiré — devenu inutile). Ce dernier était figé depuis le 2026 sur confirmation d'un ticket OVH officiel (`ovh/public-cloud-roadmap#781`, incompatibilité de checksum causant des 403 `SignatureDoesNotMatch` sur tout envoi) : **vérifié que ce ticket est refermé côté OVH depuis le 04/06/2025**, avant de lever le figeage — non testable contre le vrai bucket OVH depuis cet environnement local (pas d'identifiants), à confirmer par un envoi/téléchargement réel juste après le déploiement (voir `VALIDATION.md`) |
