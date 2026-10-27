# Cahier des charges fonctionnel — MVP Douala

## 1. Vision produit

Une plateforme de découverte locale pour restaurants et meublés à Douala, où l’utilisateur voit un produit avec prix et disponibilité, clique sur “Découvrir plus”, puis est redirigé vers une conversation WhatsApp pré-attribuée avec l’établissement.

Le produit ne vend pas une réservation ni un encaissement. Il vend de l’attention qualifiée.

## 2. Principes directeurs

- Le client est un établissement local : restaurant ou meublé
- L’utilisateur n’achète pas un service sur la plateforme ; il arrive dans une discussion WhatsApp
- L’unité de vente est la conversation attribuée, pas le clic
- La plateforme ne prend aucun risque financier
- Le revenu est un bloc prépayé, avec deux grilles de prix distinctes
- Les verticales sont séparées dans le produit et dans la facturation

## 3. Objectif du MVP

Valider 3 choses très rapidement :

- qu’un établissement accepte d’être listé avec prix visible
- qu’un clic génère une conversation WhatsApp attribuée
- qu’un établissement veut acheter un bloc de conversations

Le MVP ne doit pas viser la perfection. Il doit viser la preuve de marché.

## 4. Périmètre fonctionnel MVP

### 4.1 Côté utilisateur

- parcourir un feed de fiches
- voir pour chaque fiche :
  - photo
  - nom
  - catégorie
  - prix affiché
  - disponibilité / statut
  - bouton “Découvrir plus”
- cliquer sur “Découvrir plus”
- être redirigé vers un lien WhatsApp avec attribution
- arriver dans une conversation dédiée à l’établissement

### 4.2 Côté établissement

- créer un profil établissement
- renseigner :
  - nom
  - catégorie
  - quartier
  - téléphone WhatsApp
  - prix affiché
  - photo
  - disponibilité
  - description courte
- recevoir des clics sur sa fiche
- voir ses conversations attribuées
- acheter un bloc de conversations

### 4.3 Côté plateforme

- journaliser chaque clic
- générer un identifiant de clic unique
- associer le clic à l’établissement
- rediriger vers WhatsApp avec un paramètre d’attribution
- calculer le coût par conversation attribuée
- facturer les blocs prépayés
- afficher un dashboard d’attribution

## 5. Flux principal

### 5.1 Flux utilisateur

1. l’utilisateur ouvre la plateforme
2. il consulte des fiches de restaurants ou de meublés
3. il consulte le prix avant le clic
4. il clique sur “Découvrir plus”
5. le serveur crée un événement de clic :
   - id_clic
   - id_etablissement
   - id_utilisateur (si connu)
   - timestamp
   - canal d’origine
   - source de trafic
   - zone géographique
6. le serveur redirige vers WhatsApp avec l’identifiant de clic
7. la conversation est ouverte dans l’app WhatsApp
8. l’établissement reçoit le client
9. la plateforme enregistre la conversation comme attribuée

### 5.2 Flux établissement

1. l’établissement s’inscrit
2. il ajoute son profil et son WhatsApp
3. il publie un ou plusieurs produits
4. il reçoit des clics et des conversations
5. il achète un bloc de conversations
6. il peut suivre son rendement par fiche / catégorie / quartier

## 6. Modèle commercial

### 6.1 Tarification

- Restaurants : 350 à 420 FCFA par conversation attribuée
- Meublés : 1 500 à 1 800 FCFA par conversation attribuée

### 6.2 Facturation

- facturation par bloc prépayé
- pas de commission sur transaction
- pas de remboursement automatique dans le cas d’une conversion non aboutie
- la facturation se base sur les conversations attribuées, pas sur des clics bruts

### 6.3 Règle de valorisation

Le coût de l’attention qualifiée doit être inférieur à la valeur commerciale de la conversion donnée par l’établissement :

- meilleure qualification
- plus de réactivité
- meilleur ciblage par quartier
- prix visible avant le clic

## 7. Logique d’attribution

C’est le cœur du produit.

### 7.1 Règle de base

Chaque clic doit produire un identifiant unique.

Exemple :

- clic_id = 20261012_145233_89f2
- établissement_id = 382
- source = home_feed
- timestamp = 2026-10-12T07:42:33Z

Quand l’utilisateur arrive sur WhatsApp, le lien doit contenir l’identifiant de clic.

### 7.2 Ce qui doit être mesuré

- nombre total de clics
- clics uniques
- clics par établissement
- clics par canal
- clics par quartier
- conversations ouvertes
- conversations attribuées
- conversations payantes
- coût moyen par conversation
- taux de conversion clic → conversation

### 7.3 Objectif technique

La plateforme ne doit pas se contenter d’ouvrir WhatsApp. Elle doit prouver :

- qu’un clic est bien lié à une conversation
- qu’une conversation est bien attribuée à l’établissement
- qu’une conversation est bien facturable

## 8. Données minimales du produit

### 8.1 Fiche établissement

- id
- nom
- type : restaurant / meublé
- statut : actif / suspendu
- quartier
- adresse
- téléphone WhatsApp
- description
- prix affiché
- catégorie
- visibilités
- date d’ajout
- date de mise à jour

### 8.2 Fiche produit

- id
- id_etablissement
- type de produit
- nom
- prix
- disponibilité
- photo
- description
- tags
- statut

### 8.3 Clic / attribution

- id_clic
- id_etablissement
- id_produit
- source
- canal
- timestamp
- session_id
- url_source
- is_attributed
- id_conversation
- status

### 8.4 Bloc de facturation

- id_bloc
- id_etablissement
- type_verticale
- nombre_conversations
- prix_unitaire
- montant_total
- statut
- date_achat
- date_expiration

## 9. Dashboard minimal

Le dashboard doit comporter :

- vues par catégorie
- clics total
- conversations attribuées
- conversations payantes
- revenus par vertical
- rentabilité par établissement
- performance par quartier
- évolution du trafic
- coût par conversation

Le dashboard n’a pas besoin d’être sophistiqué au départ ; il doit être fiable et lisible.

## 10. UX / parcours interface

### 10.1 Page d’accueil

- grille de cartes
- titre clair
- lieu : Douala
- structure par catégorie
- filtre par type : restaurant / meublé
- filtre par quartier
- filtre par prix

### 10.2 Fiche produit

- photo
- nom
- quartier
- prix
- disponibilité
- description
- bouton “Découvrir plus”
- bouton “Voir le WhatsApp”

### 10.3 Conception de conversion

Le bouton “Découvrir plus” doit être visible, simple, sans friction.

## 11. Règles métier clés

- un établissement ne peut avoir qu’un seul WhatsApp principal
- le prix est affiché avant le clic
- aucun paiement sur la plateforme pour une réservation
- la plateforme ne prend aucun encours
- une conversation est attribuée uniquement via identifiant de clic
- le clic est journalisé au niveau serveur
- le produit doit pouvoir distinguer restaurant et meublé dans les niveaux de tarification
- l’établissement voit son propre rendement et la consommation de son bloc

## 12. Exigences techniques

### 12.1 Frontend

- interface web responsive
- liste et fiche produit
- filtrage
- CTA qui déclenche le redirect serveur
- support mobile d’abord

### 12.2 Backend

- API de gestion des établissements
- API de gestion des produits
- journal des clics
- service d’attribution
- service de génération de liens WhatsApp
- service de facturation blocs
- dashboard analytics

### 12.3 Sécurité

- validation du paramètre de clic
- anti-fraude simple : doublons, sessions répétées, bots
- journal immuable des logs de clic
- possibilité de tracer un clic jusqu’à une conversation

### 12.4 Outils de mesure

- tracking sur les clics
- logs serveur
- événements horodatés
- séparation des sources de trafic
- métriques de performance

## 13. MVP prioritaire : ce qu’on ne code pas encore

On ne met pas dans le MVP :

- marketplace avancée
- réservation en ligne
- paiement intégré
- encaissement
- complexité de CRM
- multi-établissement complexe
- moteur de recommandation
- gestion avancée des abonnements
- modules de fidélité

Le MVP doit rester centré sur :

- catalogue
- clic
- attribution
- WhatsApp
- facturation bloc

## 14. Plan d’exécution en 4 phases

### Phase 1 — validation produit

- 20 à 50 fiches d’établissements réelles
- catalogue simple
- prix visible
- clic → WhatsApp
- dashboard minimal
- facturation bloc

### Phase 2 — validation commerciale

- mesurer conversations / établissement
- tester plusieurs tarifs
- comparer restaurant vs meublé
- valider le modèle de bloc

### Phase 3 — croissance

- ajouter plus d’établissements
- améliorer le catalogue
- segmenter par quartier
- améliorer le tracking

### Phase 4 — scale

- SEO
- partenariats
- social
- petites campagnes testées

## 15. KPI de succès du MVP

- taux de clic par fiche
- taux de clic → conversation
- coût moyen par conversation attribuée
- nombre d’établissements actifs
- nombre de blocs vendus
- nombre de conversations journalisées
- pourcentage de trafic réel vs trafic non qualifié

## 16. Décisions non négociables

- le produit reste une plateforme de découverte
- la conversation WhatsApp est le point de conversion
- le clic est un évènement de mesure, pas une unité de vente
- les verticales sont distinctes
- le modèle de revenu est le bloc prépayé
- pas d’encaissement
- pas de marketplace transactionnelle dans le MVP

## 17. Proposition de suite immédiate

Je propose maintenant le prochain artefact concret :

- création d’un schéma de données complet
- définition des endpoints backend
- wireframe exact de la page d’accueil et de la fiche produit
- logique de tracking du clic et du redirect WhatsApp
- maquette du dashboard gestion

Si tu veux, je peux te le livrer immédiatement en mode “prêt à développer” et le structurer comme :

- user stories
- données
- backlog technique
- architecture fonctionnelle
- spécification de l’API

Je te le fais dans le format de vraie commande de produit, sans blabla.
