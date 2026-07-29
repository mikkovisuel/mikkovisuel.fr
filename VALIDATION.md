# VALIDATION.md — Validation logicielle (VSI)

> Document vivant, comme `CAHIER_DES_CHARGES.md`. À chaque fonctionnalité ou
> correctif livré, une ligne est ajoutée ici avec au moins un **cas
> passant** (le chemin nominal) et un **cas bloquant** (une erreur de
> validation, un garde-fou, une dépendance absente...) réellement exercés —
> pas supposés. Le résultat noté est celui observé au moment du test, avec
> la date.
>
> **Portée de la première version (2026-07-28)** : les lignes ci-dessous
> couvrent ce qui a été construit ou modifié dans la session du 2026-07-28
> (correctif tableau de bord, module Prospection complet, guide PDF), testé
> réellement en navigateur contre l'environnement de développement local.
> L'historique des 150+ fonctionnalités livrées avant cette session
> (voir le "Journal des modifications demandées" de `CAHIER_DES_CHARGES.md`)
> n'est **pas** rejoué ici rétroactivement — ce serait un chantier à part,
> à programmer séparément si souhaité. À partir de maintenant, toute
> nouvelle fonctionnalité ou tout correctif ajoute sa ligne ici, en continu.

## Légende

- **Cas passant** : le chemin d'usage normal, attendu pour fonctionner.
- **Cas bloquant** : une entrée invalide, un état manquant, ou une
  dépendance absente, qui doit être refusé/dégradé proprement — jamais un
  plantage (page blanche, 500) ni un comportement silencieusement incorrect.
- ✅ Validé = testé en navigateur et conforme. ⚠️ Hérité = repose sur un
  garde-fou existant et déjà éprouvé ailleurs dans le projet, non re-testé
  isolément cette fois-ci.

## Notes (module interne)

| Fonction | Cas passant | Résultat | Cas bloquant | Résultat | Dernière validation |
|---|---|---|---|---|---|
| Suppression d'une note (`deleteNote`) | Bouton "Supprimer la note" cliqué → note retirée de la liste | ✅ Testé de bout en bout après correctif : note créée, supprimée, "Aucune note." affiché | Signalé par le client : bouton de suppression inaccessible | ✅ **Bug trouvé et corrigé** : la barre d'outils de l'éditeur (dossier/client/rappel/épingler/supprimer, `src/components/admin/notes-app.tsx`) était forcée sur une seule ligne (`md:shrink-0 md:flex-nowrap`) sans pouvoir rétrécir ni passer à la ligne ; dès que le conteneur de l'éditeur n'était pas assez large (cas courant — reproduit y compris à 1800px et 1280px de large dès qu'une note n'a ni dossier ni client lié), les boutons "Épingler"/"Supprimer" débordaient et étaient coupés par le conteneur parent (`overflow-hidden`) — présents dans le DOM et signalés "visibles" par le navigateur, mais physiquement inatteignables au clic. Corrigé en autorisant la barre d'outils à passer à la ligne (`flex flex-wrap`, sans les forçages `md:`) ; reproduit puis re-testé après correctif à 1800px et 1280px, bouton cliquable dans les deux cas | 2026-07-29 |

## Tableau de bord admin

| Fonction | Cas passant | Résultat | Cas bloquant | Résultat | Dernière validation |
|---|---|---|---|---|---|
| Compteur de tâches (`/admin`) | Le grand nombre affiché est celui des tâches **en cours** (hors "Terminé"), le total en petit en dessous | ✅ Testé : "Tâches en cours : 0" / "0 au total" affichés correctement après connexion | — (affichage seul, pas d'entrée utilisateur) | — | 2026-07-28 |

## Prospection (nouveau module)

| Fonction | Cas passant | Résultat | Cas bloquant | Résultat | Dernière validation |
|---|---|---|---|---|---|
| Liste + filtres (`/admin/prospection`) | Filtre par statut/recherche, bascule Liste/Kanban | ✅ Testé : les 5 statuts verrouillés s'affichent, bascule Kanban fonctionnelle, colonnes correctes | Aucun prospect ne correspond au filtre | ✅ Testé : "Aucun prospect pour le moment." (jamais d'erreur) | 2026-07-28 |
| Création (`/admin/prospection/nouveau`) | Nom + coordonnées renseignés → prospect créé, redirection vers sa fiche | ✅ Testé : prospect "Julie Martin" créé, redirigé vers `/admin/prospection/[id]` | Nom vide **et** email au format invalide | ✅ Testé : validation HTML5 native bloque l'envoi (focus sur "Nom" vide, puis sur "Email" mal formé) — aucune requête serveur envoyée, aucune ligne créée | 2026-07-28 |
| Édition + statut (`ProspectForm`/`updateProspect`) | Changement de statut via le sélecteur de la fiche | ✅ Testé : "À faire" → "En cours" appliqué en base, plus la conversion (voir plus bas) qui utilise la même résolution de statut (`getProspectStatusItem`) | — | ⚠️ Glisser-déposer et `<select>` natif du Kanban non pilotables par clic/frappe simulés dans cette session (l'outil de navigateur a cessé de répondre aux clics/frappes en cours de session, y compris sur un nouvel onglet — contournement : soumission de formulaire via JS, cf. note plus bas) ; limite déjà documentée pour le Kanban des tâches, pattern identique et déjà éprouvé en production | 2026-07-28 |
| Mini fil d'historique par prospect (`ProspectActivity`) | Création, changement de statut, relance manuelle, conversion → chacun ajoute une ligne au fil, ordre chronologique inverse | ✅ Testé de bout en bout : les 4 évènements apparaissent dans le bon ordre avec le bon message ("Prospect créé...", "Statut changé : À faire → En cours.", "Relance envoyée manuellement.", au moment de la conversion le prospect passe à "Fermé") | Prospect sans aucun évènement | ⚠️ Hérité par construction (liste vide → "Aucun évènement pour le moment.", pas de cas d'erreur possible côté lecture) | 2026-07-28 |
| Lien vers la fiche client convertie (listes/Kanban) | Une fois converti, "Voir la fiche client →" apparaît sur la ligne (liste) et sur la carte (Kanban), pointant vers `/admin/clients/[id]` | ✅ Testé : lien visible et correct dans les deux vues après conversion | Prospect non converti | ✅ Testé : aucun lien affiché (rendu conditionnel sur `convertedClient`) | 2026-07-28 |
| Suppression (`deleteProspect`) | Confirmation puis suppression, retour à la liste | ✅ Testé : prospect supprimé, liste revenue à "Aucun prospect pour le moment." | — | ⚠️ Hérité (composant `DeleteButton` partagé, déjà éprouvé ailleurs) | 2026-07-28 |
| Relance planifiée + manuelle | Date de relance enregistrée à la création (préremplie depuis Réglages, éditable) ; bouton "Envoyer une alerte maintenant" | ✅ Testé : email `prospect_reminder` loggé (`EmailLog`) à l'admin, `reminderSentAt` daté correctement en base | — | — | 2026-07-28 |
| Cron de relance (`/api/cron/prospect-reminders`) | Requête avec le bon `CRON_SECRET` → email récapitulatif si des relances sont dues | ⚠️ Non exécuté en conditions réelles (pas de secret configuré en local) — code strictement identique au cron déjà en production (`note-reminders`) | Secret absent ou incorrect | ⚠️ Hérité : même garde `503`/`401` que `/api/cron/purge-deliverables` et `/api/cron/note-reminders`, déjà éprouvée en production | 2026-07-28 |
| Envoi d'email (`sendProspectEmail`) | Gmail connecté + email valide → message envoyé | ⚠️ Non testable en local (token Gmail de l'admin expiré, voir ci-dessous) | Gmail connecté mais token expiré/révoqué (`invalid_grant`) | ✅ **Bug trouvé et corrigé pendant ce test** : plantage complet de la page (écran d'erreur générique) avant correctif ; après correctif de `getGmailClient()` (src/lib/gmail.ts), message propre "Connectez Gmail depuis Réglages..." — corrige aussi le même risque latent sur les 3 actions d'email client déjà existantes (`sendReply`/`forwardMessage`/`sendNewMessage`) | 2026-07-28 |
| Conversion en client (`convertProspectToClient`) | Prospect avec email → `Client` + `ClientUser` créés, email "définissez votre mot de passe" envoyé, prospect marqué "Fermé" et lié au client | ✅ Testé de bout en bout : `Client`/`ClientUser` créés avec les bonnes valeurs, `EmailLog` confirme l'envoi `password_reset`, prospect `statusId`→"ferme", `convertedClientId`/`convertedAt` corrects, bouton "Convertir" disparaît ensuite, bandeau "Converti le..." affiché | Prospect déjà converti (reconversion) | ⚠️ Non testé isolément : le bouton est masqué côté UI dès que `convertedClientId` est renseigné (empêche l'aller-retour par l'interface) ; le garde serveur (`if (prospect.convertedClientId) return { error: ... }`) n'a pas été déclenché manuellement | 2026-07-28 |
| Recherche de prospects par IA (`searchProspectsWithAI`) | `ANTHROPIC_API_KEY` configurée → résultats ajoutés, dédupliqués | ⚠️ Non testable en local (clé non fournie — le client doit la créer lui-même, voir `GUIDE_PROSPECTION_IA.md`) | `ANTHROPIC_API_KEY` absente | ✅ Testé : bouton de recherche remplacé par un message explicatif sur `/admin/prospection`, aucune tentative d'appel API, aucun plantage | 2026-07-28 |
| Nav + pastille "Prospection" | Lien visible entre "Clients" et "Tâches", pastille = relances dues aujourd'hui/en retard | ✅ Testé : lien présent, aucune pastille tant qu'aucune relance n'est due (cohérent, 0 attendu) | — | — | 2026-07-28 |

## Guide client PDF

| Fonction | Cas passant | Résultat | Cas bloquant | Résultat | Dernière validation |
|---|---|---|---|---|---|
| Téléchargement (`/api/exports/guide`) | Admin connecté → PDF valide généré | ✅ Testé : réponse 200, `Content-Type: application/pdf`, en-tête `%PDF-`, 6 pages (1 couverture + 5 sections), 27,4 Ko, `Content-Disposition` avec le bon nom de fichier | Non connecté | ⚠️ Hérité : même garde `getAdminSession()`/403 que la route de rapport PDF existante, non re-testée isolément | 2026-07-28 |
| Rendu visuel (police, couleurs, mise en page) | — | ⚠️ **Non vérifié visuellement pixel par pixel** : aucun visualiseur PDF disponible dans le navigateur automatisé de cette session (page blanche lors d'un essai d'aperçu en iframe). Le document réutilise telles quelles les mêmes constantes de thème (`pdf-theme.ts`) que le rapport de tâches déjà en production et visuellement validé — confiance élevée mais pas une vérification pixel de cette session | — | — | 2026-07-28 |

## Renforcement de la sécurité (2026-07-28, suite de l'audit)

| Fonction | Cas passant | Résultat | Cas bloquant | Résultat | Dernière validation |
|---|---|---|---|---|---|
| Échappement HTML dans les emails transactionnels (`escapeHtml`) | Titre de tâche/motif de refus/champs prospect normaux → email correctement formé | ✅ Vérifié par relecture de code sur les 9 points d'interpolation identifiés par l'audit (`contact.ts`, `feedback.ts`, `files.ts`×2, `tasks.ts`×4, `prospects.ts`, `prospect-reminders.ts`) | Titre de tâche contenant `<script>`/`&`/`"` | ✅ Vérifié par relecture : `escapeHtml` transforme `&`/`<`/`>`/`"`/`'` avant interpolation — non re-testé en conditions réelles (aurait nécessité un vrai envoi via Resend) | 2026-07-28 |
| Rate limiting connexion, par email **et par IP** (`isRateLimited`) | Connexion normale non affectée | ✅ Testé : connexion admin réussie après le changement | 8 échecs sur un identifiant en 15 min | ✅ Testé : 9ᵉ tentative bloquée ("Trop de tentatives. Réessayez dans quelques minutes."), vérifié en insérant 8 lignes `LoginAttempt` puis en tentant une connexion réelle | 2026-07-28 |
| Rate limiting des demandes de réinitialisation (`isPasswordResetRateLimited`) | Message générique identique dans tous les cas (pas d'énumération de comptes) | ✅ Testé : message "Si ce compte existe..." affiché | 4ᵉ demande sur un email en 15 min | ✅ Testé : après 3 lignes `PasswordResetAttempt` pré-existantes, une 4ᵉ demande réelle n'ajoute aucune ligne en base (comptage resté à 3) — silencieusement refusé, même message générique affiché | 2026-07-28 |
| Invalidation des anciens tokens de réinitialisation à la demande d'un nouveau | Un seul token valide à la fois par compte | ✅ Vérifié par relecture de code (`deleteMany` sur les tokens `usedAt: null` avant `create`) | — | — | 2026-07-28 |
| Invalidation des autres sessions au changement de mot de passe en étant connecté (`destroyOtherSessionsForSubject`) | La session en cours reste active après le changement | ⚠️ Vérifié par relecture de code uniquement (logique dérivée de `destroyAllSessionsForSubject`, déjà en production) — non testé avec plusieurs sessions réelles simultanées (nécessiterait deux navigateurs/appareils) | — | — | 2026-07-28 |
| En-têtes de sécurité HTTP (`next.config.ts`) | Toutes les pages renvoient HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy | ✅ Testé : en-têtes inspectés via `fetch` sur `/`, valeurs exactes confirmées | CSP Report-Only sur les parcours public/admin/espace client | ✅ Testé : accueil, tableau de bord admin, connexion/accueil/à-valider/administratif espace client démo — **aucune violation** dans la console sur ces parcours | 2026-07-28 |
| Réauthentification step-up (suppression client, réinitialisation mot de passe client, usurpation) | Mot de passe admin correct → action exécutée | ✅ Testé sur `adminResetClientPassword` : mot de passe correct → "Email envoyé", email `password_reset` confirmé en base | Mot de passe admin incorrect | ✅ Testé : "Mot de passe incorrect." affiché, aucun email envoyé, formulaire reste ouvert pour réessayer. `deleteClient`/`impersonateClient` partagent le même composant (`StepUpButton`) et helper (`requireFreshAdminPassword`) déjà prouvés par ce test — formulaire de suppression vérifié visuellement (ouverture + annulation), non poussé jusqu'à la suppression réelle pour ne pas perdre les données de test du compte de démo | 2026-07-28 |
| Validation du contenu réel des fichiers uploadés (magic bytes, `contentMatchesDeclaredType`) | Vraie image PNG / vrai PDF → acceptés | ✅ Testé en isolation (script Node autonome, hors navigateur — outil de navigateur sans capacité de sélection de fichier, limite déjà documentée) : PNG réel détecté correctement par `sharp` | Fichier texte étiqueté `image/png`, HTML étiqueté `application/pdf` | ✅ Testé en isolation : les deux correctement rejetés (`looksLikeImage`/`looksLikePdf` retournent `false`) — le branchement dans les 4 fichiers d'action (`files.ts`, `portfolio.ts`, `homepage.ts`) vérifié par `tsc`/lint uniquement, pas par upload réel en navigateur | 2026-07-28 |
| Mise à jour Next.js 16.2.10 → 16.2.12 | Build de production, toutes les routes | ✅ Testé : `npm run build` réussi, toutes les routes générées, `tsc`/lint propres | — | — | 2026-07-28 |

**Décisions documentées, pas des oublis** : `@aws-sdk/client-s3` reste figé à `3.726.1` (compatibilité OVH Object Storage non confirmée comme résolue — ticket `ovh/public-cloud-roadmap#781` fermé mais sans confirmation explicite) ; `sharp`/`postcss` empaquetés en interne par `next` restent vulnérables mais `npm audit fix --force` proposerait de revenir à `next@9.3.3` (artefact de l'outil face aux plages de versions "canary", pas une vraie option) ; `prisma` reste en dépendance de production (nécessaire à `postdeploy: npx prisma migrate deploy` sur Scalingo, qui élague les devDependencies après le build — voir mémoire de projet sur `tsx`) ; la chaîne transitive `googleapis`/Prisma Studio (`gaxios`/`glob`/`minimatch`/`brace-expansion`/`rimraf`/`fast-uri`) a un correctif non cassant disponible (`npm audit fix`) mais qui embarque une mise à jour Prisma non testée (7.8→7.9, avec un large arbre de dépendances Prisma Studio ajoutées) — jugé hors du périmètre "sécurité" de cette passe, à traiter dans un futur chantier dédié aux dépendances.

## Gestion globale + fonctionnalité/design (2026-07-29)

| Fonction | Cas passant | Résultat | Cas bloquant | Résultat | Dernière validation |
|---|---|---|---|---|---|
| Sauvegardes automatiques (Scalingo) | Backups quotidiens actifs | ✅ Vérifié en conditions réelles : `scalingo backups` liste 9 sauvegardes quotidiennes consécutives sur l'addon `postgresql-starter-512` | — (rien à construire) | — | 2026-07-29 |
| Vue financière (`/admin/finances`) | 2-3 factures test, statuts variés → totaux facturé/encaissé/reste dû corrects par mois et par client | ✅ Testé : 2 300 € facturé / 1 500 € encaissé / 800 € reste dû, calcul manuel vérifié, graphique mensuel juin/juillet cohérent, lien vers la fiche client fonctionnel | Facture du client de démonstration public (`Client.isDemo`) | ✅ Testé : facture de 9 999 € créée sur ce compte, totalement absente des totaux affichés | 2026-07-29 |
| Planning de charge (`/admin/planning`) | Tâches groupées sur une même semaine ISO → compteur exact, seuil de couleur correct | ✅ Testé : 5 tâches sur S31 → barre orange "chargée", 1 tâche sur S32 → barre verte "charge normale" | Tâches sans date d'évènement | ✅ Testé : état vide propre tant qu'aucune tâche n'a de date, aucune ligne "Invalid Date" | 2026-07-29 |
| Recherche globale (barre + `/api/admin/search`) | Recherche d'un nom existant → résultats groupés par type (Clients/Tâches/Prospects), navigation correcte | ✅ Testé : recherche "Test" → 3 groupes de résultats corrects et cliquables | Recherche sans résultat / route sans session | ✅ Testé : "Aucun résultat." affiché proprement ; `curl` sans cookie sur `/api/admin/search` → 403 | 2026-07-29 |
| Rôles multi-admin — invitation (`createAdmin`) | Email valide → compte créé, email d'invitation envoyé (lien de définition de mot de passe) | ✅ Testé : compte `assistant@...` créé, "Invitation envoyée." affiché, entrée `Admin` confirmée en base | Email déjà utilisé par un admin existant | ⚠️ Vérifié par relecture de code (`findUnique` avant création, message d'erreur clair) — non redéclenché manuellement dans cette passe | 2026-07-29 |
| Rôles multi-admin — révocation (`revokeAdmin`, step-up) | Mot de passe admin correct → compte révoqué, disparaît de la liste | ✅ Testé : compte de test révoqué avec succès, absent de `db.admin.findMany()` ensuite | Mot de passe incorrect ; tentative d'auto-révocation | ✅ Testé : "Mot de passe incorrect." affiché sans révoquer ; bouton "Révoquer" absent sur son propre compte (auto-révocation impossible depuis l'UI) | 2026-07-29 |
| Rôles multi-admin — isolation du chronomètre par compte | Admin A démarre un chrono, Admin B se connecte | ✅ Testé avec un vrai second compte : chrono d'Admin A visible en base (`startedByAdminId` = A), widget header d'Admin B ne l'affiche pas, chrono d'Admin A toujours actif après la connexion de B (non interrompu) | — | — | 2026-07-29 |
| Rôles multi-admin — notifications à tous les admins (`getAdminEmails`) | Export CSV déclenché → email visible pour chaque admin | ✅ Vérifié par relecture de code sur les 6 points d'appel (`sendEmailToAdmins`) — un seul compte admin actif lors des tests, comportement multi-destinataires non observable directement avec un seul compte réel | — | — | 2026-07-29 |
| Journal d'audit global (`/admin/audit`) | Connexion échouée puis réussie, export CSV, invitation/révocation admin → une ligne par évènement, IP correcte | ✅ Testé de bout en bout : les 5 types d'évènements apparaissent avec le bon acteur/cible/IP (`::1` en local), filtre par type d'action fonctionnel | — | — | 2026-07-29 |
| Digest hebdomadaire (`/api/cron/weekly-digest`) | Bon `CRON_SECRET` → email agrégé avec les 3 sections | ✅ Testé : `sent:true`, `taskCount:5`, `overdueInvoiceCount:1` corrects, contenu de l'email vérifié dans les logs (tâches/relances/factures), client démo public exclu | Sans header / mauvais secret / `CRON_SECRET` absent | ✅ Testé : 401 / 401 / 503 respectivement | 2026-07-29 |
| Devis signables en ligne (`acceptDevis`) | Nom + signature dessinée → devis marqué accepté, email admin envoyé, badge affiché | ✅ Testé de bout en bout (2 devis distincts) : `acceptedAt`/`acceptedByName`/`signatureDataUrl` corrects en base, email `devis_accepted` reçu, badge "Accepté le ... par ..." affiché côté client **et** admin | Signature manquante ; re-signature d'un devis déjà accepté ; document non-devis | ✅ Testé : "Veuillez dessiner votre signature." bloque l'envoi côté client (aucun appel serveur) ; bouton "Accepter et signer" disparaît après acceptation (re-signature impossible depuis l'UI) ; jamais affiché sur les factures | 2026-07-29 |
| **Bug trouvé et corrigé pendant ce test** (`AcceptDevisDialog`) | — | Un essai de soumission sans signature effaçait ensuite le champ "Nom complet" (React réinitialise les champs non contrôlés d'un `<form action={...}>` après chaque cycle de l'action) — un client tapant son nom, oubliant de signer, puis signant, perdait son nom déjà saisi | — | ✅ Corrigé : champ nom passé en contrôlé (`useState`), reproduit puis re-testé après correctif — le nom persiste bien à travers un essai sans signature | 2026-07-29 |
| Mode clair Prospection (vérification) | Bascule en thème clair, parcours liste/Kanban/détail/formulaire/fil d'activité | ✅ Vérifié : composants déjà sur les tokens de design partagés (`PALETTE_BADGE_CLASSES`, `text-ink-muted`), badges de statut lisibles, aucun défaut trouvé — rien à corriger | — | — | 2026-07-29 |
| Visite guidée première connexion (`FirstLoginTour`) | `hasSeenTour: false` → démarre automatiquement, ordre des 7 étapes correct, ciblage visuel correct | ✅ Testé : démarre sur "Accueil", "Suivant" avance bien vers "À valider" avec le bon encadré | "Passer" à mi-parcours ; rechargement après | ✅ Testé : `hasSeenTour` passe à `true` en base, aucune réapparition après rechargement | 2026-07-29 |
| Visite guidée — exclusion du compte de démonstration public | Connexion via "Voir la démo" (`Client.isDemo`) | ✅ Testé : aucune visite affichée pour "Espace de démonstration", conforme (évite qu'un visiteur la marque "vue" pour tous les autres) | — | — | 2026-07-29 |

## Points restant ouverts pour une prochaine passe de validation

- Glisser-déposer et `<select>` natif du Kanban Prospection (limite outil, voir ci-dessus).
- Cron `/api/cron/prospect-reminders` en conditions réelles (avec `CRON_SECRET`).
- Envoi d'email prospect avec un compte Gmail réellement connecté (le compte de test a un token expiré).
- Recherche IA avec une vraie clé `ANTHROPIC_API_KEY` (le client doit la fournir).
- Rendu visuel pixel du guide PDF (aucun visualiseur PDF disponible dans cette session).
- Reprise complète de l'historique pré-2026-07-28 (voir portée ci-dessus).
- Invalidation multi-session réelle (`destroyOtherSessionsForSubject`) avec deux appareils/navigateurs simultanés.
- Suppression réelle d'un client via le step-up (`deleteClient`) — vérifié uniquement jusqu'à l'ouverture du formulaire.
- Upload réel en navigateur pour la validation par signature binaire (outil sans sélecteur de fichier).
- CSP en mode bloquant (une fois le Report-Only confirmé propre sur une période d'usage réel).
- Rate limiting général au-delà du login/reset (routes API coûteuses) — priorité basse, non traité cette passe.
- 2FA/TOTP admin — chantier séparé, non traité cette passe.
- Notifications multi-admin (`getAdminEmails`/`sendEmailToAdmins`) avec plusieurs comptes admin réellement actifs simultanément (vérifié par relecture de code uniquement, un seul compte réel disponible pour les tests du 2026-07-29).
- Digest hebdomadaire (`sendWeeklyDigest`) en conditions cron réelles sur Scalingo (testé manuellement en local avec le bon secret, pas encore observé via le planificateur Scalingo lui-même).
- Sauvegarde des fichiers OVH Object Storage (documents/livrables/médias) — aucune solution automatisée à ce jour, piste notée dans le cahier des charges.
- Cas `createAdmin` avec un email déjà utilisé par un admin existant — vérifié par relecture de code uniquement.
