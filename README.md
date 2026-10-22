# Douala Discovery — MVP (Le Xia)

Feed de découverte locale pour **Douala** (restaurants & meublés), avec :

- **Attribution WhatsApp** : chaque clic génère un identifiant unique embarqué dans le message WhatsApp envoyé au professionnel, permettant de tracer la conversation jusqu'à son origine.
- **Facturation par blocs prépayés** : le professionnel achète un bloc de conversations, consommé automatiquement à chaque conversation attribuée.
- **Anti-fraude** : filtrage des bots, des doublons et des bursts de clics.
- **Solde de points** : 1 000 points à la création d'un établissement, débit de 50 points par redirection acceptée et recharges réservées au super-admin.
- **Dashboard** : mesures de performance (conversion, coût/conversation, rentabilité par verticale/établissement/quartier).

## Démarrage

En développement local, le premier démarrage crée un mot de passe aléatoire pour
le super-admin et l'affiche une seule fois dans le terminal. Conservez-le : seul
son hash est persisté. En production, les identifiants doivent être configurés
explicitement via l'environnement.

```bash
npm install
npm start          # démarre le serveur sur http://localhost:3000
```

Pour contrôler les identifiants en développement, ou initialiser le compte en
production, fournissez `SUPERADMIN_EMAIL` et `SUPERADMIN_PASSWORD` avant le
démarrage. Utilisez une adresse valide et un mot de passe aléatoire de 12 à
1024 caractères.

Après la création initiale, le compte est conservé dans `data/users.json` et ces
variables ne sont plus nécessaires. Si l'application est déployée derrière un
reverse proxy qui remplace les en-têtes `X-Forwarded-*`, configurez
`TRUST_PROXY=true`. Ne l'activez pas derrière un proxy qui transmet ces en-têtes
sans les valider.
Une ancienne installation utilisant le compte super-admin historique doit
fournir ces variables une fois pour renouveler et renommer ce compte.

## Tests

```bash
npm test           # tests unitaires et d'intégration via node:test
```

## Architecture

```
server.js            Point d'entrée Express + routes API
src/
  store.js           Persistance JSON atomique dans data/
  seed.js            Données de démonstration (établissements + produits)
  attribution.js     Cœur : création de clic, identifiants, cycle pending -> attributed
  whatsapp.js        Construction de l'URL WhatsApp attribuée
  antifraud.js       Détection bots / doublons / bursts
  billing.js         Blocs prépayés + grilles tarifaires + consommation
public/              Front (feed index.html, fiche produit, dashboard)
test/                Tests unitaires (node:test)
data/                Données persistées (générées, ignorées par git)
```

## Modèle de données (schéma français)

- **Établissement** (`§8.1`) : `id`, `nom`, `type` (restaurant|meuble), `quartier`, `whatsapp`, `points_solde`, `products[]`.
- **Produit** (`§8.2`) : `id`, `id_etablissement`, `nom`, `prix`, `disponibilite`, `photo`, `description`.
- **Clic** (`§8.3`) : `id_clic` (format `YYYYMMDD_HHMMSS_xxxx`), `id_etablissement`, `id_produit`, `source`, `canal`, `zone_geo`, `session_id`, `is_attributed`, `status` (pending|attributed), `id_conversation`.
- **Bloc** (`§8.4`) : `id_bloc`, `id_etablissement`, `type_verticale`, `nombre_conversations`, `conversations_consommees`, `prix_unitaire`, `montant_total`, `statut`.

## Grilles tarifaires (`§6`)

| Verticale  | Prix / conversation |
| ---------- | ------------------- |
| Restaurant | 350 – 420 FCFA      |
| Meublé     | 1 500 – 1 800 FCFA  |

Les blocs sont valables 90 jours. Toute conversation attribuée consomme une unité du bloc actif (FIFO).

Chaque établissement commence avec 1 000 points. Un clic accepté par l'anti-fraude et redirigé vers WhatsApp débite 50 points ; les clics refusés ne débitent rien. À moins de 50 points, le bouton de redirection est désactivé. Le super-admin recharge les soldes par multiples de 50 depuis `/manage`.

Une inscription établissement doit inclure au moins un produit ou une offre avec un prix. Les établissements sans produit ne sont pas affichés dans le catalogue public ni dans ses filtres. Le propriétaire peut ajouter ou supprimer ses offres depuis `/profil-etablissement` ; s'il supprime toutes ses offres, sa fiche disparaît du catalogue jusqu'à l'ajout d'une nouvelle offre.

## API

| Méthode | Route                                      | Description                                  |
| ------- | ------------------------------------------ | -------------------------------------------- |
| GET     | `/api/health`                              | Santé du service                             |
| GET     | `/api/establishments`                      | Liste des établissements (+ produits)        |
| GET     | `/api/establishment/:id`                   | Détail d'un établissement                    |
| POST    | `/api/establishments`                      | Créer un établissement (produits embarqués)  |
| POST    | `/api/blocks`                              | Créer un bloc prépayé (super-admin)          |
| GET     | `/api/admin/points`                        | Soldes des établissements (super-admin)      |
| POST    | `/api/admin/points/recharge`               | Recharger un solde (super-admin)              |
| POST    | `/api/redirect`                            | Clic attribué → URL WhatsApp + consommation  |
| GET     | `/api/dashboard`                           | Données brutes pour le dashboard             |
| GET     | `/api/product/:establishmentId/:productId` | Fiche produit                                |

### Pages

| Route                          | Page                          |
| ------------------------------ | ----------------------------- |
| `/`                            | Feed + filtres (type/quartier/prix) |
| `/produit/:establishmentId/:productId` | Fiche produit dédiée    |
| `/dashboard`                   | Dashboard administrateur       |
| `/manage`                      | Gestion et recharge des établissements |
| `/etablissement-dashboard`     | Statistiques et solde de points de l'établissement |

## Exemple d'attribution

```bash
curl -X POST http://localhost:3000/api/redirect \
  -H 'Content-Type: application/json' \
  -d '{"establishmentId":"rest-1","productId":"prod-rest-1-1","source":"home_feed"}'
```

Réponse :

```json
{
  "clickId": "20261012_145233_89f2",
  "whatsappUrl": "https://wa.me/237655000001?text=...%20identifiant%20de%20clic%20est%2020261012_145233_89f2.",
  "billing": { "consumed": true, "remaining": 9 }
}
```

## Limite MVP assumée

La confirmation réelle de l'ouverture de la conversation WhatsApp n'est pas observable sans callback (WhatsApp Business API). Au stade MVP, la conversation est marquée `attributed` au moment où le lien WhatsApp est effectivement servi. Le schéma conserve `status`, `id_conversation` et `conversation_opened_at` pour brancher ultérieurement une validation temps réel sans migration. 
