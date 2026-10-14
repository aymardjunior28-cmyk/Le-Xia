# Douala Discovery — MVP (Le Xia)

Feed de découverte locale pour **Douala** (restaurants & meublés), avec :

- **Attribution WhatsApp** : chaque clic génère un identifiant unique embarqué dans le message WhatsApp envoyé au professionnel, permettant de tracer la conversation jusqu'à son origine.
- **Facturation par blocs prépayés** : le professionnel achète un bloc de conversations, consommé automatiquement à chaque conversation attribuée.
- **Anti-fraude** : filtrage des bots, des doublons et des bursts de clics.
- **Dashboard** : mesures de performance (conversion, coût/conversation, rentabilité par verticale/établissement/quartier).

## Démarrage

```bash
npm install
npm start          # démarre le serveur sur http://localhost:3000
```

## Tests

```bash
npm test           # 15 tests (attribution + facturation) via node:test
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

- **Établissement** (`§8.1`) : `id`, `nom`, `type` (restaurant|meuble), `quartier`, `whatsapp`, `products[]`.
- **Produit** (`§8.2`) : `id`, `id_etablissement`, `nom`, `prix`, `disponibilite`, `photo`, `description`.
- **Clic** (`§8.3`) : `id_clic` (format `YYYYMMDD_HHMMSS_xxxx`), `id_etablissement`, `id_produit`, `source`, `canal`, `zone_geo`, `session_id`, `is_attributed`, `status` (pending|attributed), `id_conversation`.
- **Bloc** (`§8.4`) : `id_bloc`, `id_etablissement`, `type_verticale`, `nombre_conversations`, `conversations_consommees`, `prix_unitaire`, `montant_total`, `statut`.

## Grilles tarifaires (`§6`)

| Verticale  | Prix / conversation |
| ---------- | ------------------- |
| Restaurant | 350 – 420 FCFA      |
| Meublé     | 1 500 – 1 800 FCFA  |

Les blocs sont valables 90 jours. Toute conversation attribuée consomme une unité du bloc actif (FIFO).

## API

| Méthode | Route                                      | Description                                  |
| ------- | ------------------------------------------ | -------------------------------------------- |
| GET     | `/api/health`                              | Santé du service                             |
| GET     | `/api/establishments`                      | Liste des établissements (+ produits)        |
| GET     | `/api/establishment/:id`                   | Détail d'un établissement                    |
| POST    | `/api/establishments`                      | Créer un établissement (produits embarqués)  |
| POST    | `/api/blocks`                              | Acheter un bloc prépayé                      |
| POST    | `/api/redirect`                            | Clic attribué → URL WhatsApp + consommation  |
| GET     | `/api/dashboard`                           | Données brutes pour le dashboard             |
| GET     | `/api/product/:establishmentId/:productId` | Fiche produit                                |

### Pages

| Route                          | Page                          |
| ------------------------------ | ----------------------------- |
| `/`                            | Feed + filtres (type/quartier/prix) |
| `/produit/:establishmentId/:productId` | Fiche produit dédiée    |
| `/dashboard`                   | Dashboard administrateur       |

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
