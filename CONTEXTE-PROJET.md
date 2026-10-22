# DOSSIER DE REPRISE — Plateforme publicitaire de découverte restaurants & meublés, Douala (Cameroun)

> **Ce fichier est un point de reprise.** Quand tu me l'envoies demain, je dois pouvoir reconstruire seul : le contexte, les décisions déjà prises, ce qui est ouvert, et par quoi continuer. Ne le modifie pas en douce — si une décision change, écris-la ici.

**Créé le** : 5 octobre 2026
**Mis à jour le** : 5 octobre 2026 — **PIVOT MAJEUR DU MODÈLE, voir §0 bis**
**Statut** : analyse stratégique terminée, aucune ligne de code écrite, projet en phase d'arbitrage
**Livrable associé** : `Autopsie-Modele-Decouverte-Douala.pdf` (16 pages, source de vérité visuelle)

---

## 0 bis. ⚠️ PIVOT DU 5 octobre 2026 — lire en premier

**Le modèle a changé.** Le §1 décrit le modèle *ancien*, conservé comme historique de raisonnement. **La vérité actuelle est au §1 bis.**

### Ce qui a été abandonné

| Ancien modèle | Raison de l'abandon |
|---|---|
| Marketplace de meublés avec encaissement mobile money | L'encours, les impayés, la commission de 10 %, le merchant of record : tout ce risque financier a été retiré du périmètre |
| Les restaurants « plus tard » | Les restaurants sont désormais **coeur de cible**, au même titre que les meublés |
| Refus du site « restaurants + meublés » | **Annulé** — c'est exactement ce qu'on fait maintenant, et c'est cohérent |
| Commission à la réservation confirmée | Abandonné — on ne touche plus aux transactions |

### Le modèle actuel

> Une **plateforme publicitaire de découverte** : elle affiche un plat phare ou un meublé avec son prix, l'utilisateur clique, et arrive dans une **conversation WhatsApp pré-attribuée** vers l'établissement. On ne paie pas la commission sur une réservation — on facture l'**attention qualifiée**.

**Différences structurelles avec l'ancien modèle :**

| | Ancien | Actuel |
|---|---|---|
| Unité de vente | commission sur réservation | **conversation attribuée** ou clic |
| Encaissement par la plateforme | Oui (MoMo) | **Non** |
| Risque financier | élevé | **nul** |
| Revenu | variable, lié aux réservations | **prévisible, bloc prépayé** |
| Modèle | marketplace transactionnelle | **média** |
| Client | propriétaire de meublé | **restaurant et meublé** |

### Ce qui est resté identique

- **Le pays et la ville** : Douala, Cameroun.
- **Les deux verticales** : restaurants et meublés — mais plus comme « deux économies à ne pas mélanger », plutôt comme **deux clients, deux grilles tarifaires**.
- **Le canal WhatsApp** : c'est toujours le point de conversion. Il est même devenu le cœur du modèle.
- **Le nom, les technos, le contexte** : rien de tout ça n'a été construit, donc rien n'est perdu.

---

## 1. Le projet — HISTORIQUE (modèle abandonné, conservé pour le raisonnement)

---

## 1 bis. Le projet — ÉTAT ACTUEL (vérité en vigueur)

> **Une plateforme publicitaire de découverte pour restaurants et meublés à Douala.** Elle met en avant un plat phare ou un meublé avec son prix et sa disponibilité ; l'utilisateur clique sur « Découvrir plus » et arrive dans une **conversation WhatsApp pré-attribuée** avec l'établissement. La plateforme ne fait aucun encaissement : elle facture l'attention qualifiée, en blocs prépayés.

### Le parcours utilisateur

1. L'utilisateur parcourt un fil de plats ou de meublés, avec **prix affiché avant le clic**.
2. Il clique sur « Découvrir plus ».
3. **Redirect serveur** portant un identifiant de clic unique → journal horodaté.
4. Ouverture de `wa.me` avec l'identifiant → la conversation est **attribuée** à la plateforme et à l'établissement.
5. L'utilisateur négocie ou réserve directement sur le numéro du restaurant.
6. L'établissement consulte son tableau de bord et achète un bloc de conversations.

### Ce que vend la plateforme, précisément

| Élément | Détail |
|---|---|
| L'unité de vente | la **conversation attribuée** (recommandé), pas le clic |
| Le prix envisagé initialement | 50 FCFA par clic |
| Le prix recommandé | 350 à 420 FCFA par conversation (restaurant) / 1 500 à 1 800 FCFA (meublé) |
| Le mode de paiement | **blocs prépayés**, jamais de commission sur transaction |
| La promesse | un client déjà intéressé, avec le prix connu, qui arrive en discussion |

### Le problème central du modèle

```
Trafic acheté à 50 FCFA le clic ou plus  →  ROAS ≤ 100 %  →  mort
Trafic organique à coût marginal nul      →  viable
```

**Le modèle ne survit qu'en trafic organique.** C'est le point sur lequel tout le reste de l'analyse doit returning. Le document `Autopsie-Modele-Decouverte-Douala.pdf` (§4 à §6) identifie six trajectoires de trafic et conclut qu'un **mixte est obligatoire**.

---

## 0. Comment je dois lire ce dossier

En quatre temps, dans cet ordre :

1. **§1 bis Projet actuel** — ce que tu veux construire, en une phrase. Le §1 qui suit est l'historique du modèle abandonné.
2. **§2 Rappel de la conversation** — ce qui a été dit et dans quel ordre, pour que tu ne repartes pas de zéro.
3. **§3 Décisions prises** — les points sur lesquels on a tranché, avec leur justification. **Ce sont des acquis, pas des pistes à rouvrir** sauf signal contraire de ta part.
4. **§4 Points ouverts et suite** — ce que je te proposerai à la reprise.

Convention de lecture des chiffres dans ce dossier :
- `[SOURCE]` = donnée publiée, vérifiable (filing SEC, page publique de l'acteur).
- `[ESTIMATION]` = calcul de l'auteur, réfutable, avec hypothèses explicitées.

---

## 1. Le projet

**Intention initiale (ta formulation, 5 octobre)** : « un projet de la taille de Booking.com et de Trivago, mais pour les restaurants et meublés à Douala au Cameroun, un peu comme Ayila'a Cameroun ».

**Après analyse (§3), la formulation de travail retenue est :**

> Une marketplace transactionnelle de **meublés** à **Douala intra-muros**, avec encaissement mobile money en rôle de *merchant of record*. Les restaurants entrent plus tard, via un modèle publicitaire — pas via la réservation de tables.

### Ce que le projet n'est PAS

| Ce n'est pas | Pourquoi |
|---|---|
| Un clone d'Ayila'a | Modèle sans transaction, non exposé à son propre succès |
| Un metasearch (type trivago) | ROAS de 124 %, ne marginerait pas |
| Un site « restaurants + meublés » à la fois | Erreur de catégorie : deux économies, deux moteurs, deux clients |
| Une copie de Booking à l'identique | L'échelle de Booking vient de la structure d'un marché mondial, pas de l'exécution |

---

## 2. Rappel de la conversation

**Étape 1 — Demande initiale.** Autopsie de Booking.com, trivago et Ayila'a Cameroun.

**Étape 2 — Recherche internet** (5 searches + fetches des pages Ayila'a). Découvertes structurantes :
- Booking : 10-K 2025, take rate 14,5 %, merchant 61 % → 68 %, OpenTable noyé dans les 5,9 % de « Advertising and other ».
- trivago : ROAS 124 %, 34 % du revenu sur Expedia Group, rachat de Holisto (22,3 M€) → trivago DEALS.
- Ayila'a : 5 offres B2B, **zéro commission**, tunnel qui se termine sur WhatsApp, avis générés sans avis réels.
- Concurrents réels : Uniresa (288 établissements, 10 % de commission, mais 149 logements à Yaoundé contre 70 à Douala), Camhebergement, YayaBooking, Wakalooka (mort), Reeyo, Zuma Eats (« Launching soon »).

**Étape 3 — Analyse rédigée en français**, structurée en 9 sections, dont la conclusion centrale : *ton cadrage est une erreur de catégorie*.

**Étape 4 — Production du PDF** (via HTML + Chrome headless). Nettoyage de caractères parasites détectés au contrôle qualité. Vérification : 27 pages, 6 786 mots, 484 Ko, aucun artefact.

**Étape 5 — Ce fichier.**

---

## 3. Décisions prises

Chacune est **tranchée**, pas seulement évoquée. Ne pas les rouvrir sans demande explicite.

### D1 — Les deux verticales sont séparées
> **Décision** : meublés en premier, restaurants plus tard et en média.

**Justification** : ce n'est pas une intuition, c'est ce que font déjà les acteurs en place. Ayila'a monétise les restaurants en publicité (seule chose qui y fonctionne). Uniresa monétise les meublés en commission (10 %). **Personne n'a essayé de fondre les deux** — et l'analyse section 6.3 du dossier montre pourquoi la fusion serait fausse.

**Corollaire** : ne jamais présenter une traction en meublés comme une traction en restauration.

### D2 — Le cœur de cible est le long tail des meublés, pas les hôtels
> **Décision** : viser les meublés/douars non professionnels, pas les hôtels.

**Justification** : les hôtels ont déjà des systèmes de distribution. Le long tail n'a ni photo, ni prix affiché, ni disponibilité, ni encaissement — il se réserve par WhatsApp. Chaque établissement est un **prospect, pas un concurrent**.

**Preuve à l'appui** : Booking fait croître ses *alternative accommodations* à deux chiffres. Uniresa n'a capté que 70 logements à Douala sur 288 au Cameroun → **20 % du marché**. Le verrou est la conquête de l'offre, pas la demande.

### D3 — Merchant of record intégral
> **Décision** : encaisser par mobile money, reverser à l'établissement. Non négociable.

**Justification** : sans cela, zéro donnée propriétaire et zéro garantie. C'est la migration que Booking est en train d'effectuer (61 % → 68 % de merchant) parce que **la commission se dégrade et la marge de paiement ne se négocie pas**.

### D4 — Commission de 10 à 12 %
> **Décision** : 10 – 12 % du prépaiement.

**Justification arithmétique** : rail de paiement ≈ 3,2 % aller-retour (MTN 1,70 % + 1,30 % ; Orange 1,50 % + 2,10 %). À 10 %, il reste 6,8 % avant impôt et structure. À 5 %, il reste 1,8 %. **La commission n'est pas une variable commerciale, c'est une variable arithmétique.**

### D5 — Périmètre : Douala intra-muros, par quartier
> **Décision** : pas de Yaoundé au lancement.

**Justification** : la densité fournit la liquidité, la distance la détruit. (Yaoundé est le marché d'Uniresa — c'est leur point fort et leur angle mort sur Douala.)

### D6 — Prépaiement obligatoire
> **Décision** : prépaiement intégral obligatoire. Ce n'est pas une option, c'est la condition de survie.

**Justification** : sans carte sur fichier, le no-show est structurellement plus élevé qu'en Europe. Le mobile money rend le prépaiement naturel — c'est un avantage, pas une contrainte.

### D7 — L'actif à construire est l'historique de réservations enrichi
> **Décision** : investir dans la donnée transactionnelle, pas dans le trafic.

**Justification** : c'est le seul élément non reproductible en trois mois. Il permet (a) de fixer les prix dynamiquement, (b) de rendre l'hôte indispensable. Un historique de 2 000 chambres à Douala est constitable en 18 mois et non réplicable à Douala par un acteur national.

### D8 — Le trafic est un coût, pas un actif
> **Décision** : pas de SEO comme canal principal d'acquisition de l'offre.

**Justification** : le SEO est déjà pris par Ayila'a, et il est plus lent que la fenêtre. Canal d'offre : **terrain + WhatsApp**. Canal de demande : **direct** dès la première saison (cf. Genius chez Booking, qui pousse le canal direct à mi-50 %).

### D9 — Publicité = revenu complémentaire en phase 2, jamais socle
> **Décision** :comme un module additionnel, posé sur une base transactionnelle.

**Justification** : c'est utile, mais ça ne margine pas. Un socle publicitaire = modèle Ayila'a = mort à la deuxième saison.

---

## 4. Les données à réutiliser

Toutes vérifiées lors de l'autopsie. Ne pas refaire la recherche.

### 4.1 Marché meublés — chiffres clés

| Paramètre | Valeur | Statut |
|---|---|---|
| Population Douala | ≈ 3,9 M | `[SOURCE]` |
| Prix moyen / nuit | 15 000 – 45 000 FCFA (fourchette Camhebergement) | `[SOURCE]` |
| Prix retenu pour le calcul | 20 000 FCFA | `[ESTIMATION]` |
| Chambres louables | 2 000 | `[ESTIMATION]` |
| Taux d'occupation | 30 % | `[ESTIMATION]` prudente |
| **GMV annuel du segment** | **≈ 4,38 Md FCFA** | `[ESTIMATION]` |
| **Revenu plateforme à 10 %** | **≈ 440 M FCFA/an** (≈ 670 k €) | `[ESTIMATION]` |

> ⚠️ **440 M FCFA est le plafond du marché entier de Douala, pas l'objectif.** C'est une base de calcul, pas une ambition.

### 4.2 Rail de paiement mobile money

| Réseau | Payin | Payout | Aller-retour |
|---|---|---|---|
| MTN Cameroon | 1,70 % | 1,30 % | **3,00 %** |
| Orange Cameroon | 1,50 % | 2,10 % | **3,60 %** |
| CamerPay Starter | 3,00 % | 1 % + 1 % (Orange) / 2,75 % (MTN) | ≈ 4,0 – 6,7 % |
| CamerPay Business | 1,50 % | idem | ≈ 3,5 – 6,2 % |
| CamerPay Pro / BYOK | 1,00 % | idem | ≈ 3,0 – 5,7 % |
| **Hypothèse de travail** | — | — | **≈ 3,2 %** |

Agrégateurs : **CamerPay** (via Y-Note, partenaire régulé), **AangaraaPay** (API REST). Interopérabilité : **Mowali** (JV MTN/Orange, sous-sol Mojaloop). USSD disponible même sans smartphone (`#150*47#`).

### 4.3 Concurrents — position de départ

| Acteur | Ce qu'il faut retenir |
|---|---|
| **Ayila'a** | 3 840 fiches. Revendique 1 M visites/mois (web) + 200 k (app) — **non vérifié**. 5 offres B2B, 0 commission. Ne peut pas commoditer : son revenu ne dépend d'aucune réservation. **Menace uniquement s'il se relance dans la transaction.** |
| **Uniresa** | Le vrai concurrent. 288 établissements, 226 propriétaires, 573 chambres, 10 villes, commission 10 % à la réservation confirmée, encaisse et gère le client. **Meublés uniquement, aucun restaurant, biaisé Yaoundé (149 vs 70 à Douala).** |
| **Zuma Eats** | Super-app africaine. **Douala « Launching soon », Cameroun tier 2, page d'attente.** C'est le futur concurrent direct. Fenêtre ouverte mais temporaire. |
| Camhebergement | Annuaire + WhatsApp, traitement manuel, pas d'encaissement |
| YayaBooking | Conciergerie, modèle service (non scalable logiquement) |
| Wakalooka | **Mort** — site « suspended ». Trace d'un marché tenté sans succès. |
| Reeyo | Livraison + dine-in par QR. Segment adjacent. |

### 4.4 Les trois scénarios de référence (pour benchmark)

| Acteur | Architecture | Enseignement |
|---|---|---|
| **Booking Holdings** | Possède stock + disponibilité + prix + paiement + client | Take rate 14,5 %. Merchant 68 % du GB. **Restaurant = 0,3 % du groupe** `[ESTIMATION]`. Alternative accommodations +2 chiffres. |
| **trivago** | Possède l'instant de la comparaison | ROAS 124 %. 34 % du revenu sur Expedia Group. ~30 % du trafic porte son propre nom. A payé 22,3 M€ pour devenir merchant. |
| **Ayila'a** | Possède le trafic + les catégories | Revenu indexé sur le classement et l'affichage, pas sur la transaction. |

---

## 5. Points ouverts

Aucun de ces points n'a été tranché. Ils sont **à trancher à la reprise**, pas à rediscuter longuement.

| # | Question | Pourquoi c'est bloquant |
|---|---|---|
> ⚠️ **Ces questions O1 à O6 concernent le modèle abandonné** (encaissement mobile money, meublés seuls). Elles sont conservées pour mémoire. **Les questions ouvertes du modèle actuel sont en §5 bis.**

| O1 | ~~Quel modèle juridique et fiscal ?~~ | **Caduc** — plus d'encaissement par la plateforme. Reste l'obligation fiscale d'une activité publicitaire (impôt sur les revenus commerciaux, registre unique). |
| O2 | ~~Quel prestataire mobile money ?~~ | **Caduc** — aucun prestataire nécessaire. |
| O3 | **Quel budget, et sur quelle horizon ?** | Toujours ouvert. Détermine si le SEO (T1) est finançable ou doit être raccourci. |
| O4 | ~~Quel sous-segment de meublés en premier ?~~ | **Caduc** — les deux verticales sont retenues dès le départ, avec deux grilles tarifaires. |
| O5 | **Faut-il une application mobile, ou le web suffit ?** | Toujours ouvert. Question à trancher tôt, coûteuse à corriger tard. |
| O6 | **Quel statut juridique pour les établissements non professionnels ?** | Toujours ouvert. Comment contractualiser avec un établissement sans RCS ni NIF ? Premier obstacle terrain. |

---

## 5 bis. Points ouverts — MODÈLE ACTUEL

| # | Question ouverte | Pourquoi c'est bloquant |
|---|---|---|
| **O1** | **Quel prix de vente ?** 50 FCFA au clic, ou 350 à 420 (restaurant) et 1 500 à 1 800 (meublé) à la conversation ? | Détermine si l'achat de trafic est viable ou mort-né. **Décision la plus urgente.** |
| **O2** | **Quelle trajectoire de trafic en priorité ?** (T1 SEO, T2 social, T4 partenariats WhatsApp, T5 payant, T6 terrain) | Détermine le séquencement et le budget. Voir §4 à §6 du PDF. |
| **O3** | **Modèle juridique et fiscal**, même sans encaissement | Une activité de publicité a des obligations, moins lourdes que le merchant of record mais non nulles. |
| **O4** | **Quel statut pour les établissements sans RCS ni NIF ?** | Premier obstacle terrain, dans les deux verticales. |
| **O5** | **Application mobile ou web ?** | À trancher tôt, coûteuse à corriger tard. |
| **O6** | **Quel budget, et sur quel horizon ?** | Détermine si le SEO est finançable en 3 mois ou doit être raccourci. |

> **Ce qui n'est PAS une question ouverte anymore** : l'interface (plat/meublé + prix + « Découvrir plus » → WhatsApp), l'unité de vente (conversation attribuée), le mode de règlement (blocs prépayés), l'absence d'encours, et le fait que les restaurants sont au cœur de la cible autant que les meublés.

---

## 6. Séquencement retenu — HISTORIQUE (modèle abandonné)

> ⚠️ **Séquencement de l'ancien modèle transactionnel.** Conservé pour mémoire. **Le séquencement actuel est au §6 bis.**

À détailler en documents séparés. Ne pas produire avant que O1 – O3 soient tranchés.

| Phase | Durée | Objectif | Indicateur de sortie |
|---|---|---|---|
| **0 — Preuve de la demande** | 4 – 6 semaines | 100 fiches réelles, vérifiées à la main, dans 2 – 3 quartiers. Canal : WhatsApp Business + groupes de propriétaires (Bonamoussadi, Bonapriso, Akwa, Makepe). | **Le nombre d'établissements qui demandent à être listés avant d'être payés.** Si personne ne le demande gratuitement, il n'y a pas de marché — et il faut le savoir maintenant. |
| **1 — Boucle transactionnelle** | 3 mois | Réservation, paiement MoMo, confirmation, notification. **Rien d'autre.** | Zéro réservation perdue. 100 % des paiements traçables. |
| **2 — Dense-side** | 6 mois | Prépaiement systématique, gestion des no-shows mesurée et publique, avis vérifiés post-séjour, premiers accords de distribution. Premiers revenus publicitaires. | Taux de no-show mesuré par établissement. |
| **3 — Restaurants** | 12 mois et + | Entrée **par la publicité** (« bon coin vérifié »), comme Ayila'a. | — |

---

## 6 bis. Séquencement retenu — MODÈLE ACTUEL

Le socle technique (étapes 1 à 4) est **indépendant de toute décision stratégique** : il peut commencer immédiatement, quel que soit le prix de vente et la trajectoire de trafic choisies.

### Socle technique — à lancer tout de suite

| # | Élément | Pourquoi | Durée |
|---|---|---|---|
| 1 | Redirect serveur + identifiant de clic unique + journal horodaté | Sans ça, ni mesure ni facturation. Redirect HTTP, pas de JavaScript. | 1 à 2 semaines |
| 2 | Lien `wa.me` portant l'identifiant | C'est le mécanisme d'attribution de la conversation. | 1 semaine |
| 3 | Tableau de bord en chaîne (clics → conversations → attribuées) | L'attribution justifie la facturation. Montrer la chaîne, pas un chiffre isolé. | 1 à 2 semaines |
| 4 | Facturation par conversation attribuée, en blocs prépayés, deux grilles | Restaurant et meublé. Le prépaiement supprime le risque de crédit. | 1 à 2 semaines |
| 5 | Instrumentation de mesure du trafic | Sans elle, T1 à T6 sont indistinguables. | 1 semaine |

### Trajectoire de trafic — après O1 et O2

| Phase | Trajectoire | Objectif |
|---|---|---|
| **M0 à M3** | T6 (terrain, pour l'offre) + T4 (partenariats WhatsApp) + amorce T2 (social) | **Validation** : des conversations se produisent, des établissements veulent en acheter. |
| **M3 à M9** | **T1 (SEO, en masse)** + T2 régulier + T4 étendu | **Croissance** : le SEO monte. |
| **M9 à M12** | T1 + T3 (partage) + T4 + T5 (test plafonné) | **Amplification** : mesurer et optimiser. |

---

## 7. Les cinq pièges (mémo)

À relire avant toute décision.

1. **Le no-show** → parade : prépaiement intégral, remboursement en cas d'annulation 72 h avant, et **taux mesuré et public par établissement** (devenu critère de classement + arme commerciale).
2. **La dépendance au rail** → parade : passer par les agrégateurs, ne jamais coder en dur contre une API opérateur. Un opérateur peut supprimer 30 % de part de marché d'un revers de main.
3. **La qualité du catalogue** → parade : accepter moins d'établissements et les vérifier physiquement. C'est long, et c'est **exactement le coût qui rend l'actif défendable**.
4. **Le copycat** → parade : l'interface se copie en 6 semaines ; l'historique de réservations, jamais.
5. **L'erreur de catégorie** → parade : séquencer strictement, mesurer chaque verticale séparément.

---

## 8. Test de succès (repère à 18 mois)

> 200 établissements · 8 000 nuits réservées · 400 M FCFA de GMV · 40 M FCFA de revenus · et **un propriétaire qui ne part pas quand un concurrent arrive**.

Ce dernier critère est le seul qui vraiment compte : il mesure la dépendance, pas le trafic.

---

## 9. Limites de l'étude (à ne pas oublier quand on argumente)

- **Aucun trafic Ayila'a n'est vérifié indépendamment.** Le « 1 M/mois » est une déclaration commerciale. Sans outil accessible (Similarweb, Semrush, GA public).
- **Aucune donnée financière sur les acteurs camerounais.** Aucun n'est coté. Seules données comptables disponibles : MTN Cameroun (209,1 Md FCFA de revenus T1 2025, EBITDA 90,9 Md FCFA, marge 43,5 %, ~6 M d'utilisateurs MoMo visés fin 2025).
- **Le TAM de 4,38 Md FCFA est une estimation à 3 hypothèses** (2 000 chambres, 20 000 FCFA/nuit, 30 % d'occupation). Seuls le prix et la répartition d'Uniresa sont observés.
- **L'analyse technique d'Ayila'a est inférentielle** (arborescence `/build/`, style des routes) — déduction, pas déclaration.
- **Les états d'Ayila'a sont ponctuels** et datent du 5 octobre 2026.

---

## 10. Ce que je te proposerai à la reprise

Par ordre de valeur. **Je ne dois pas commencer à coder avant que O1 – O3 soient tranchés.**

1. **Trancher O1 – O3** (juridique/fiscal, prestataire de paiement, budget) — c'est le seul déblocage qui compte.
2. **Cahier des charges fonctionnel** du module réservation + paiement : machine d'état d'une réservation, gestion du no-show, refus de paiement, webhook MoMo, réconciliation.
3. **Dimensionnement financier par cohorte** : CAC/LTV par canal (WhatsApp, terrain, référence), seuil de rentabilité, et le calcul des 18 mois avec les paramètres réels plutôt que les hypothèses de §4.1.
4. **Architecture technique** de l'intégration mobile money : ce qui est réutilisable chez les agrégateurs, ce qui doit être construit, et les pièges (webhooks non fiables, idempotence, retries).
5. **Registre réglementaire et fiscal** camerounais : BEAC, MINFI, protection des données (loi sur les données personnelles), obligations d'un merchant of record.

---

## 11. Journal de bord

| Date | Action | Résultat |
|---|---|---|
| 2026-10-05 | Recherche internet + autopsie des 3 acteurs | Données collectées, 9 sections rédigées |
| 2026-10-05 | Production du PDF (27 p.) via HTML + Chrome headless | Livré, contrôle qualité passé |
| 2026-10-05 | Création de ce dossier de reprise | — |
| 2026-10-05 | **Pivot du modèle** : marketplace transactionnelle → plateforme publicitaire de découverte | Analyse en chat : pricing, attribution, risks |
| 2026-10-05 | Recherche sources trafic (marché numérique, SEO, social, partenariats) | Sources BeonWeb 2026, Neurone, DataReportal |
| 2026-10-05 | **Nouvelle autopsie** : `Autopsie-Modele-Decouverte-Douala.pdf` (16 p.) | 6 trajectoires de trafic comparées, mixte recommandé |
| 2026-10-05 | Mise à jour de ce dossier (§0 bis, §1 bis, §5 bis, §6 bis) | Dossier aligné sur le modèle actuel |
| | | |

---

*Fin du dossier. À l'ouverture de la session suivante, envoyer ce fichier et indiquer « reprends le projet Douala ».*