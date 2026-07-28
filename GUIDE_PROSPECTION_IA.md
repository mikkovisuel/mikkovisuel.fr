# Guide — activer la recherche automatique de prospects (IA)

Ce guide explique comment créer la clé nécessaire au bouton **"Rechercher
des prospects (IA)"** de l'onglet Prospection (`/admin/prospection`). C'est
une démarche à faire une seule fois, avec ton propre compte — je ne peux
pas créer ce compte à ta place.

Contrairement à Gmail/Resend/Stripe, ce n'est **pas gratuit** : chaque
recherche déclenche des appels à l'API Anthropic (Claude), facturés à
l'usage (quelques centimes par recherche selon le nombre de résultats).
Tant que la clé n'est pas configurée, le bouton reste simplement masqué —
rien ne casse.

## 1. Créer un compte et une clé API

1. Va sur [console.anthropic.com](https://console.anthropic.com/),
   crée un compte (ou connecte-toi si tu en as déjà un).
2. Ajoute un moyen de paiement (menu **"Billing"**) — nécessaire pour que
   les appels API fonctionnent, même pour un usage ponctuel.
3. Menu **"API Keys"** → **"Create Key"**. Donne-lui un nom, par exemple
   `Mikko Visuel — Prospection`.
4. Copie la clé (elle commence par `sk-ant-`) — elle ne se réaffiche plus
   telle quelle par la suite.

## 2. Me transmettre la clé

Transmets-la-moi (dans ce chat, ou en me disant où la coller toi-même dans
un fichier) — je m'occupe ensuite de l'ajouter à ton `.env` local
(`ANTHROPIC_API_KEY`) et sur Scalingo en production, puis de tester la
recherche de bout en bout.

## Ce que ça permettra, une fois connecté

Sur `/admin/prospection`, le bouton "Rechercher des prospects (IA)" devient
utilisable : décris le type de prospect recherché (ex. "photographes de
mariage indépendants à Lyon"), l'IA cherche sur le web et ajoute
directement les fiches trouvées (statut "À faire"), sans jamais inventer de
coordonnées — un champ reste vide si l'information n'est pas trouvée
publiquement. Vérifie toujours les fiches ajoutées avant tout envoi
d'email.

## Point de vigilance

Une recherche mal ciblée peut renvoyer peu ou pas de résultats exploitables
— c'est un point de départ pour repérer des prospects, pas un remplacement
de ta connaissance du terrain. Vérifie systématiquement les coordonnées
avant un premier contact.
