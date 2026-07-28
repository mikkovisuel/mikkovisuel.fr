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

## Points restant ouverts pour une prochaine passe de validation

- Glisser-déposer et `<select>` natif du Kanban Prospection (limite outil, voir ci-dessus).
- Cron `/api/cron/prospect-reminders` en conditions réelles (avec `CRON_SECRET`).
- Envoi d'email prospect avec un compte Gmail réellement connecté (le compte de test a un token expiré).
- Recherche IA avec une vraie clé `ANTHROPIC_API_KEY` (le client doit la fournir).
- Rendu visuel pixel du guide PDF (aucun visualiseur PDF disponible dans cette session).
- Reprise complète de l'historique pré-2026-07-28 (voir portée ci-dessus).
