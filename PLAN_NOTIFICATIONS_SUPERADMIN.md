# Plan : Notifications au superadmin lors de création d'établissement

## Objectif
Notifier le superadmin lorsqu'un établissement s'inscrit publiquement (`/api/etablissements/inscription`) ou est créé manuellement par le superadmin (`POST /api/establishments`). Créer un onglet/section "Notifications" dans l'interface superadmin (dashboard ou manage) pour les consulter.

## État actuel
- Pas de système de notifications existant
- Création via inscription publique: `server.js:459-560` (crée établissement + utilisateur avec role `etablissement`)
- Création manuelle par superadmin: `server.js:436-457` (POST /api/establishments, requireSuperAdmin)
- Interface superadmin: `public/manage.html`, `public/manage.js`, `public/dashboard.html` avec onglets/sections existantes

## Approche

### 1) Backend - Modèle de données
- Créer `data/notifications.json` initialisé à `[]`
- Structure de notification proposée:
```json
{
  "id": "notif_<uuid>",
  "type": "etablissement_created" | "etablissement_registered",
  "message": "string",
  "establishmentId": "string",
  "establishmentName": "string",
  "userId": "string" (créateur si disponible),
  "read": false,
  "createdAt": "ISO8601"
}
```
- Charger dans `server.js` via `loadCollection('notifications', [])` comme les autres collections

### 2) Backend - Création de notifications
**A) Inscription publique** (`/api/etablissements/inscription`, ligne ~459)
- Après création réussie (mutation + persistence des 2 collections), créer une notification:
  - type: `etablissement_registered` (inscription autonome)
  - message: ex. "Nouvel établissement inscrit : {nom} ({type}) - {quartier}"
  - établir métadonnées
- Sauvegarder avec `saveCollection('notifications', notifications)`

**B) Création manuelle par superadmin** (`POST /api/establishments`, ligne ~436)
- Après création, ajouter notification:
  - type: `etablissement_created`
  - message: ex. "Établissement créé par le superadmin : {nom} ({type})"
- Sauvegarder

### 3) Backend - API notifications
Ajouter des routes (protégées par `requireSuperAdmin`):
- `GET /api/admin/notifications?limit=&offset=` - lister notifications (triées par `createdAt` desc)
- `GET /api/admin/notifications/unread-count` - compteur non lus
- `POST /api/admin/notifications/:id/read` ou `PUT /api/admin/notifications/mark-read` - marquer comme lu
- `POST /api/admin/notifications/mark-all-read` - tout marquer lu
- `DELETE /api/admin/notifications/:id` - supprimer (optionnel)

### 4) Frontend - Interface superadmin
**Option A: Ajouter un onglet "Notifications" dans `manage.html` / `manage.js`**
- Ajouter onglet dans barre de navigation ou section dédiée
- Afficher liste avec badge "non lu", bouton "Marquer comme lu", "Tout marquer comme lu"
- Lien vers l'établissement si `establishmentId` présent

**Option B: Ajouter section dans `dashboard.html`**
- Ajouter section "Notifications récentes" en haut
- Badge avec compteur non lus

**Recommandé:** Ajouter une section dans `manage.html` (page "Gérer" déjà dédiée au superadmin) avec un onglet/section "Notifications". Ajouter aussi un badge dans la nav pour le superadmin.

### 5) Fichiers à modifier/créer
- `data/notifications.json` (créer)
- `server.js` (charger notifications, créer notifications aux bons endroits, ajouter routes API)
- `public/manage.html` (ajouter section/onglet notifications)
- `public/manage.js` (logique affichage/marquage notifications)
- `public/nav.js` (badge compteur non lus pour superadmin)
- `public/styles.css` (styles badge/notifications si nécessaire)

## Considérations
- Utiliser `mutateAndPersist` pattern existant ou directement `saveCollection`
- Les notifications sont globales au superadmin (pas par utilisateur) - stocker simplement
- Garder cohérence avec le code existant (français, style)
- Ne pas casser les fonctionnalités existantes
