# Autopsie du business — Plateforme publicitaire de découverte restaurants et meublés à Douala

**Version** : 2 — inclut l'analyse des trajectories de trafic
**Date** : 5 octobre 2026
**Modèle** : contenu éditorial (plat phare, prix, disponibilité) → clic → conversation WhatsApp pré-attribuée → redirection vers la fiche de l'établissement. Vente en blocs prépayés, à la conversation attribuée.
**Statut** : la question « d'où vient le trafic ? » est ouverte. Ce document contient les six trajectories possibles, chiffrées, pour permettre la décision.

---

## Sommaire

1. [Verdict en une page](#1-verdict-en-une-page)
2. [Points forts](#2-points-forts)
3. [Points faibles](#3-points-faibles)
4. [Les six sources de trafic possibles](#4-les-six-sources-de-trafic-possibles)
5. [Comparer les trajectories](#5-comparer-les-trajectories)
6. [Recommandation : la trajectoire mixte](#6-recommandation--la-trajectoire-mixte)
7. [Ce qu'il faut construire, dans l'ordre](#7-ce-quil-faut-construire-dans-lordre)
8. [Grille de décision](#8-grille-de-décision)
9. [Annexe A — Sources](#9-annexe-a--sources)
10. [Annexe B — Ce qui n'a pas été tranché](#10-annexe-b--ce-quin-a-pas-été-tranché)

---

## 1. Verdict en une page

**Ce qui est solide.** Un canal sans friction (WhatsApp, taux d'ouverture très élevé), un différenciateur produit réel (le prix et la disponibilité affichés *avant* le clic), zéro risque financier (aucun encaissement, aucun encours, aucune dépendance au rail de paiement), et une offre initiale de plus de 3 600 établissements nommément accessibles.

**Ce qui est fragile.** Le modèle ne survit qu'en trafic organique — et l'organique à l'échelle est le problème le plus difficile d'un marché à deux faces. En prime : tu ne possèdes aucun maillon de la chaîne (le contenu est au restaurant, la relation se passe dans WhatsApp sur son numéro, le canal est à Meta), les restaurateurs sont les *pires* clients payants d'un modèle au clic (marge faible, aucune capacité de mesure, départ rapide), et ta seule barrière — le catalogue vérifié — demande deux ans pour se construire.

**La condition d'existence.**

```
Trafic acheté à 50 FCFA le clic ou plus  →  ROAS inférieur ou égal à 100 %  →  mort
Trafic organique à coût marginal nul      →  viable
```

**Le chiffre de contrôle.** L'unité de vente est la conversation attribuée, pas le clic. À 50 FCFA le clic, tu encaisses environ 10 FCFA par conversation (50 × 1/5, à 20 % de clic-conversation), alors qu'une conversation peut valoir 700 FCFA de marge de contribution. L'unité de vente est le problème, pas le prix seul.

**La question ouverte.** Elle fait l'objet de la section 4. Aucune des six trajectories n'est réellement acquise à ce jour. La section 5 les compare, la section 6 en propose une combinaison.

---

## 2. Points forts

### 2.1 La pré-qualification — c'est ton actif défendable

C'est le seul endroit où ton produit bat Meta.

| | Publicité Facebook Ads | Ton catalogue |
|---|---|---|
| Ce qu'elle dit | « Restaurant X, 20 minutes de vous » | « Ndolè, 4 500 FCFA, disponible ce soir à Bonapriso » |
| Moment du clic | Avant de savoir | **Après avoir le prix, le plat et l'accessibilité** |
| Logique de prix | Coût de comparaison | **Réponse à une intention, sans comparaison** |

C'est ce qui justifie 400 FCFA là où une annonce Facebook en justifie 20. Et ce n'est pas reproductible par un copier-coller : il faut avoir constitué le catalogue vérifié.

### 2.2 WhatsApp : taux d'ouverture très élevé, zéro friction, zéro infrastructure

Aucun email à envoyer, aucun numéro à collecter, aucune application à télécharger. C'est le canal le plus utilisé au Cameroun — **85 % ou plus des prospects internet** l'utilisent `[SOURCE]`, contre 4,2 à 5,45 M d'utilisateurs Facebook pour tout le pays. Pour un utilisateur mobile (92 % des connexions), c'est le seul canal qui ne perd personne en route.

### 2.3 Tu n'as besoin d'aucun rail de paiement

Conséquence directe du recentrage en modèle média, et sous-estimée :

| Élément | Besoin ? |
|---|---|
| Merchant of record (encaisement) | Non |
| MTN MoMo / Orange Money | Non |
| Frais aller-retour sur paiement | Non |
| Licence BEAC d'encaissement | Non |
| Risque de rejet de paiement | Non |
| Contentieux sur des nuitées impayées | Non |
| Encaissement de cartes | Non |

**Tout le risque financier de la première analyse a disparu du modèle.** Ce n'est pas anecdotique : c'est ce qui rend le projet lançable avec un capital faible.

### 2.4 Le prépaiement en blocs supprime deux problèmes d'un coup

- **Le risque de crédit** : personne ne te doit d'argent.
- **Le risque de confiance** : un restaurateur ne peut pas disparaître dans six mois avec une somme encaissée.

Et c'est le seul moyen de vendre à un établissement à 2 000 FCFA de ticket moyen sans passer par une intégration bancaire. Blocs vendables : 200 conversations (petit compte) à 1 000 conversations (grand compte).

### 2.5 L'offre est abondante et nommément accessible

| Catégorie | Volume `[SOURCE]` |
|---|---|
| Restauration | 2 265 |
| Hôtels et hébergements | 1 368 |
| — dont appartements et studios meublés | **662** |
| Divertissements | 437 |
| **Total catalogue de référence** | **≈ 3 840** |

Ce sont des prospects nommés, avec numéro de téléphone. **Tu n'as pas un problème d'offre, tu as un problème de qualité d'offre.** Un commercial peut appeler 100 établissements en une semaine.

### 2.6 La mauvaise qualité des données existantes est ton ouverture

Ce qu'on observe chez l'acteur principal du catalogue :

- Scores « 5.0 » affichés en regard de « 0.0 (3 mentions) » et « vous n'avez aucun commentaire ».
- Descriptions générées qui parlent d'autre chose (une fiche de grill à Yaoundé qui cite un marché de Douala).
- Horaires « Aucune disponibilité définie ».
- Parcours de conversion qui se termine sur WhatsApp, sans historique.

C'est laid — et c'est exactement là qu'un acteur vérifié se positionne. **Le contenu vérifié est mieux indexé *et* mieux cliqué.** Ta phase 0 est presque gratuite : tu vérifies 100 fiches mieux que l'existant, et tu prends le trafic que l'existant perd.

### 2.7 Le trafic de recherche est structuré pour toi

Les requêtes de type « cuisine + quartier » ou « type + prix + ville » sont des requêtes de **longue traîne** : peu de volume unitaire, mais un cumul important, et une intention transactionnelle déjà formée. C'est un terrain où un acteur local vérifié peut se positionner vite, parce que la concurrence y est faible.

---

## 3. Points faibles

### 3.1 Le modèle meurt si tu achètes ton trafic

```
Prix de vente          50 FCFA par clic
Coût d'acquisition     50 FCFA par clic ou plus (en auction)
ROAS                   100 % ou moins
```

Tu vends exactement ce que tu achètes. Ce n'est pas une marge fine, c'est zéro. Et ce n'est pas un risque de marché : c'est une identité structurelle. **Ce modèle ne fonctionne qu'en organique.**

Le corollaire est qu'il faut distinguer deux choses qu'on confond souvent :

| Levier | Effet sur le coût du clic |
|---|---|
| CTR élevé sur ton site | Le clic devient bon marché en CPC. **Ne te sauve pas.** |
| Trafic organique | Coût marginal nul. **Seule chose qui sauve.** |

Un catalogue mieux indexé augmente ton CTR — donc ton coût par clic baisse sur le trafic acheté. Mais tant que tu achètes, ton ROAS reste plafonné par le prix de l auction.

### 3.2 Tu ne possèdes aucun maillon de la chaîne

| Actif | Détenu par toi ? |
|---|---|
| Le contenu (plat, prix, menu) | Non — le restaurant, retirable demain |
| La relation avec le client final | Non — elle se passe dans WhatsApp, **sur le numéro du restaurant** |
| Le canal | Non — Meta |
| La mesure | Partiellement — ton identifiant d'attribution, mais les faits restent chez Meta |
| Les données de conversation | Non — elles appartiennent au restaurant |

Ce qui te reste : **l'attribution et la relation commerciale avec l'établissement.** C'est réel, et c'est mince.

**Le risque Meta n'est pas théorique.** Meta peut copier ton format de découverte, déclasser la redirection `wa.me` dans ses propres annonces, ou resserrer ses règles sur les liens externes. Tu es en dépendance sur ton fournisseur *et* sur ton canal de distribution.

### 3.3 Le restaurateur est le pire client payant pour un modèle au clic

Point structurant, souvent overlooked :

| | Restaurant | Meublé |
|---|---|---|
| Ticket | 7 000 FCFA | 20 000 FCFA par nuit |
| Marge de contribution | ≈ 3 500 FCFA | ≈ 15 000 FCFA |
| Tolérance à la dépense publicitaire | **Très faible** | Normale (il fait déjà de la recherche) |
| Réflexion avant achat | Aucune (« j'y vais ») | Longue (combien de nuits, où, quel prix) |
| Capacité à mesurer son ROI | **Nulle** | Correcte |
| Rétention sur la plateforme | **Faible** — coupe dès que ça ne vient plus | Bonne |

**Le calcul qui décide de tout :**

```
Prix d'une conversation : 400 FCFA
Taux de conversion conversation vers visite : 20 %
Coût par client gagné      : 400 / 0,20 = 2 000 FCFA
Marge de contribution      : 3 500 FCFA
Part de la marge consommée : 57 %
```

**Le restaurant ne peut pas supporter ça longtemps.** Il paie deux mois, puis coupe. Conséquence : ton coût d'acquisition client te coûte plus cher, sur les restaurants, que ce qu'il rapporte.

Pour le meublé :

```
Prix d'une conversation : 1 500 FCFA
Coût par client gagné    : 1 500 / 0,20 = 7 500 FCFA
Marge de contribution    : 15 000 FCFA
Part consommée           : 50 %
```

Même ratio, mais **le meublé a plusieurs fois la capacité d'absorption**, une réflexion longue qui allonge le cycle, et une capacité réelle à mesurer.

> **Conclusion qui inverse l'intuition locale :** les meublés devraient **porter** le modèle (la marge), et les restaurants le **remplir** (le volume). C'est l'inverse du réflexe — parce que le restaurant est le volume et le meublé est l'argent.

### 3.4 Ton unité de vente repose sur une donnée que tu ne contrôles pas

Tu factures la « conversation attribuée ». Techniquement, c'est ton propre journal qui affirme cette attribution. Le restaurant voit ses conversations ; tu dis lesquelles sont à toi ; les deux chiffres ne se recoupent pas.

Un restaurateur attentif finira par demander : « pourquoi 231 attribuées sur 240 quand j'en ai 265 ? »

**Tu n'as pas de réponse technique.** La seule parade est que le client paie d'abord, donc n'a pas à te croire. Le prépaiement ne masque pas le problème — il le rend tolérable. C'est important à savoir avant d'avoir 200 clients.

### 3.5 Le prix de 50 FCFA plafonne tout

Ce n'est pas un prix, c'est un symptôme. S'il s'agit du maximum qu'un restaurateur accepte :

- La facture mensuelle par établissement plafonne. À 1 000 clics par mois : 50 000 FCFA — une somme qu'on coupe sans délibérer.
- **Le chiffre d'affaires a un plafond dur lié au budget publicitaire total des restaurants de Douala**, pas à ton trafic. Tu ne peux pas croître plus vite que la somme que le marché accepte de dépenser.
- Il n'existe aucune version premium naturelle. Passer à 400 FCFA le clic, c'est changer de marché.

C'est pourquoi la recommandation centrale est de **facturer la conversation, à deux grilles** :

| | Restaurant | Meublé |
|---|---|---|
| Marge de contribution | 3 500 FCFA | 15 000 FCFA |
| Taux de 10 à 12 % | **350 à 420 FCFA** | **1 500 à 1 800 FCFA** |

**Un seul taux, deux prix.** Même logique que la commission justifiée dans l'analyse Booking, avec deux assiettes.

### 3.6 Pas de barrière à l'entrée, donc pas de défensibilité

Copier ton produit prend quelques semaines : un annuaire, une redirection `wa.me`, un compteur. Aucune donnée propriétaire au départ, aucun contrat d'exclusivité, aucune intégration impossible à répliquer.

La seule chose qui se construit lentement, c'est le catalogue vérifié. C'est vrai — mais **ça prend deux ans, pas deux mois**. Pendant ces deux mois, ta seule défense est l'antériorité, qui ne vaut pas grand-chose sur un marché où la publicité de plateforme fonctionne très bien.

### 3.7 Aucun effet de réseau, ni dans un sens ni dans l'autre

Un utilisateur ne revient pas parce que le catalogue est grand : sur 3 840 fiches, il n'a aucune chance de tomber sur le bon meublé par hasard. Le catalogue n'a pas de **valeur de réseau**, seulement de valeur de **couverture**.

Donc chaque établissement supplémentaire est une vente, pas un effet qui s'auto-alimente. L'argument « plus il y a de restaurants, plus les gens viennent » est faux ici.

### 3.8 Le marché numérique est plus étroit qu'il n'y paraît

| Indicateur | Valeur `[SOURCE]` |
|---|---|
| Population | ≈ 28 à 29,5 M |
| Internautes | ≈ 12,4 M (41,9 %) |
| dont Douala (estimation) | ≈ 2,1 M |
| Utilisateurs de réseaux sociaux | 5,45 M (18,5 %) |
| — dont Facebook | 4,2 à 5,45 M |
| — dont Instagram | 600 000 à 611 000 |
| — dont LinkedIn | 1,4 M |
| — dont X (Twitter) | 185 000 à 199 000 |
| Messenger | 665 000 |
| WhatsApp parmi les prospects internet | **85 % ou plus** |
| Connexion mobile | **92 %** des connexions |
| Part du PC | moins de 8 % |
| Couverture 3G et 4G | ≈ 75 % de la population |

Ton marché adressable n'est pas 3,9 M d'habitants de Douala. C'est **≈ 2,1 M d'internautes**, dont une fraction qui cherche activement un plat ou un meublé un soir donné. Le reste de la population est hors de portée tant que le smartphone et la data ne sont pas le problème.

---

## 4. Les six sources de trafic possibles

C'est la section qui débloque la décision. Chacune est évaluée sur trois critères : **coût pour le premier clic**, **volumétrie atteignable**, et **faisabilité pour toi aujourd'hui**.

---

### T1 — SEO de longue traîne (« cuisine + quartier »)

**Le principe.** Tu construis une page par requête transactionnelle : « brunch Douala Bonamoussadi », « pizza Bonapriso », « studio meublé Akwa », « brunch pas cher Akwa ». L'utilisateur qui tape ça est **en train d'acheter maintenant**.

| Critère | Évaluation |
|---|---|
| Coût du premier clic | **Zéro FCFA** (temps de travail) |
| Délai du premier clic | **2 à 4 mois** |
| Volumétrie | Moyenne, en croissance |
| Faisabilité | Élevée — aucune dépendance externe |
| Coût récurrent | Production de contenu et photos |

**Forces**
- Requêtes d'intention déjà formée, donc taux de conversion élevé.
- Pas de coût d'acquisition : le prix du clic est exactement zéro, donc le ROAS est excellent sur ce segment.
- Un contenu vérifié se positionne mieux qu'une fiche générée — c'est ton avance structurelle.
- La longue traîne est par construction un marché de milliers de requêtes à faible volume unitaire, où un nouvel arrivant peut se glisser sans combat frontal.

**Faiblesses**
- Délai de 2 à 4 mois avant le premier clic significatif. C'est long si tu manques de trésorerie.
- La production de contenu est un coût en travail, pas en argent. Il faut le compter.
- Dépend de Google, dont les règles changent.
- Si tu vends des clics aux restaurants, une page de qualité qui n'est pas tenue à jour risque d'être dépassée par les menus en PDF.

**Verdict.** **Seule trajectoire avec un coût du clic réellement nul.** C'est ta trajectoire principale, à lancer immédiatement, parce qu'elle se construit pendant que tu fais autre chose.

---

### T2 — Contenu social organique (Facebook, TikTok, Instagram)

**Le principe.** Un compte de découverte culinaire. Le format qui marche à Douala : une photo, un prix lisible, le quartier, et un lien vers la fiche.

| Critère | Évaluation |
|---|---|
| Coût du premier clic | **Zéro FCFA** (temps de travail) |
| Délai du premier clic | **2 à 8 semaines** |
| Volumétrie | Élevée **si** le format marche |
| Faisabilité | Élevée |
| Risque | L'algorithme peut te couper sans explication |

**Forces**
- Le clic le plus rapide à obtenir : c'est le canal le plus rapide de toute la liste après le terrain.
- L'utilisateur camerounais **partage massivement** — la pratique documentée est un partage environ deux fois plus fréquent qu'en Europe `[SOURCE]`. Chaque partage est une distribution gratuite.
- WhatsApp est utilisé par 85 % ou plus des prospects internet `[SOURCE]` : partager un lien vers WhatsApp est un mouvement naturel, pas forcé.
- Facebook reste dominant en Afrique francophone et en particulier au Cameroun, avec 4,2 à 5,45 M d'utilisateurs et une audience 25-45 ans — la cible exacte de ton catalogue `[SOURCE]`.

**Faiblesses**
- Un compte sans historique ne distribue rien au départ. Il faut construire l'audience avant.
- Tu n'as aucun contrôle sur la distribution.
- Un restaurant influent peut te faire de la concurrence directe avant que tu aies un catalogue.

**Verdict.** **Trajectoire d'activation, pas de croissance.** Elle produit le premier clic en semaines, ce qui est essentiel pour valider le modèle, mais ne se met pas à l'échelle seule.

---

### T3 — Viralité par le partage utilisateur

**Le principe.** L'utilisateur partage la fiche, l'établissement voit le partage, et le partage devient une preuve de traction visible.

| Critère | Évaluation |
|---|---|
| Coût du premier clic | **Zéro FCFA** |
| Délai du premier clic | **Variable, dépend de l'adoption** |
| Volumétrie | **Imprévisible** — c'est tout ou rien |
| Faisabilité | Élevée techniquement |
| Verrou | Il faut déjà avoir du trafic pour que ça démarre |

**Forces**
- Coût marginal nul, et c'est la seule trajectoire dont la **marge** augmente avec le volume.
- Le partage est une recommandation personnelle : le taux d'ouverture d'un lien partagé par un proche est très supérieur à celui d'une affiche.
- Pré-qualification intégrée : on ne partage que ce qui a réussi, donc ce qui convertit.

**Faiblesses**
- **Imprévisible.** C'est la trajectoire la plus difficile à budgéter.
- Ne démarre qu'après avoir du trafic : c'est un multiplicateur, pas un point de départ.
- Un partage sans contrepartie est une demande de comportement que l'utilisateur ne va pas accorder.

**Verdict.** **Amplificateur, jamais déclencheur.** À activer une fois que T1 et T2 produisent.

---

### T4 — Partenariats avec les communautés existantes

**Le principe.** Les groupes WhatsApp de quartier, les associations, les pages de quartier, les influenceurs culinaires. Ils partagent, tu livres.

| Critère | Évaluation |
|---|---|
| Coût du premier clic | **Zéro à faible** (parfois un deal produit) |
| Délai du premier clic | **1 à 4 semaines** |
| Volumétrie | **Élevée et ciblée** |
| Faisabilité | Élevée, mais chronophage |
| Limite | Dépend d'un tiers, qui peut changer d'avis |

**Forces**
- **C'est le canal le plus pertinent du marché.** Les groupes WhatsApp sont le lieu où se décident les sorties, les anniversaires, les dîners d'affaires. Y être présent, c'est être là où la décision se prend.
- Ciblage parfait : un groupe de Bonamoussadi ne voit que des gens de Bonamoussadi.
- Peut être gratuit : beaucoup de pages acceptent un échange de visibilité.

**Faiblesses**
- Aucun contrat : un partenariat de bouche se rompt silencieusement.
- La qualité des audiences est variable : certains groupes sont peu actifs.
- Chronophage à négocier un par un.
- Risque de dépendance : si un seul influenceur fait 60 % de ton trafic, tu ne contrôles rien.

**Verdict.** **Trajectoire la plus rentable du marché, et la plus négligée.** C'est celle à prioriser après le SEO.

---

### T5 — Publicité payante (Meta, TikTok)

**Le principe.** Tu achètes des clics.

| Critère | Évaluation |
|---|---|
| Coût du premier clic | **50 à 150 FCFA** `[ESTIMATION]` |
| Délai du premier clic | **Immédiat** |
| Volumétrie | **Sans limite** |
| Faisabilité | Très élevée |
| ROAS à 50 FCFA le clic | **33 % à 100 %** |

**Forces**
- Seule trajectoire qui donne du volume **à la demande**, sans dépendre d'un algorithme ou d'une recherche.
- Permet de tester le modèle rapidement et à coût maîtrisé.

**Faiblesses**
- **À 50 FCFA le clic, ton ROAS est de 33 % à 100 %.** Tu perds de l'argent sur chaque clic.
- Ce n'est pas une source de trafic, c'est une **source de coût**.
- Le coût du clic monte à mesure que tu montes en volume (llices qui se raréfient). C'est une contrainte structurelle : le trafic acheté est le premier à disparaître.

**Verdict.** **À proscrire comme source principale.** Utile uniquement comme instrument de test mesuré, jamais comme socle.

---

### T6 — Génération directe de trafic par le terrain

**Le principe.** Ton équipe va dans les restaurants et les meublés, et pendant ce temps **démontre** la plateforme aux utilisateurs, donc crée le trafic localement.

| Critère | Évaluation |
|---|---|
| Coût du premier clic | **Zéro en prospection directe, mais coût en salaires** |
| Délai du premier clic | **1 à 3 mois** |
| Volumétrie | **Bornée par la taille de l'équipe** |
| Faisabilité | Élevée, exige de la motivation |

**Forces**
- Seul moyen d'obtenir du trafic **en même temps** que tu construis l'offre (ce qui résout le problème de la poule et de l'œuf).
- Un client qui vient parce qu'on lui a montré le plat au téléphone convertit bien mieux qu'un clic d'annonce.
- Zéro dépendance externe.

**Faiblesses**
- **La plus lente à donner une vérité.** Si le produit ne marche pas, tu le découvriras à tes propres frais, pas dans les métriques.
- La seule trajectoire dont la croissance est bornée linéairement par les effectifs.
- Coût réel élevé si tu comptes les salaires.

**Verdict.** **Indispensable pour l'offre, insuffisante pour la demande.** C'est le canal de l'offre, pas celui de la demande.

---

## 5. Comparer les trajectories

**Lequel des deux est le plus mauvais ?**

| Trajectoire | Coût du premier clic | Délai | Faisabilité seule | Ampleur possible | Verdict |
|---|---|---|---|---|---|
| **T1 — SEO longue traîne** | Zéro | 2 à 4 mois | Oui | Moyenne | **Socle principal** |
| **T2 — Social organique** | Zéro | 2 à 8 semaines | Oui | Élevée | **Activation** |
| **T3 — Partage utilisateur** | Zéro | Variable | Oui | Imprévisible | **Amplificateur** |
| **T4 — Partenariats WhatsApp** | Zéro à faible | 1 à 4 semaines | Oui | Élevée et ciblée | **Le plus rentable** |
| **T5 — Publicité payante** | 50 à 150 FCFA | Immédiat | Oui | Illimitée | **Test uniquement** |
| **T6 — Terrain** | Zéro + salaires | 1 à 3 mois | Oui | Bornée | **Offre, pas demande** |

**Le constat qui tranche.**

**Quatre trajectoires sur six ont un coût du clic réellement nul.** Ce n'est pas un hasard : le modèle **conserve du sens à coût d'acquisition nul**. Ce qui le tue, ce n'est pas le marché, c'est le budget publicitaire.

> **La question « d'où vient ton trafic ? » n'a donc pas UNE réponse : elle a une réponse par quadrant.**
> - **Croissance à long terme** → T1 (SEO). C'est la seule qui continue de payer sans toi.
> - **Activation rapide** → T4 puis T2. Les plus rapides à coût nul.
> - **Amplification** → T3, une fois qu'il y a du trafic à amplifier.
> - **Test et mesure** → T5, avec un budget plafonné et une erreur tolérée.
> - **Offre** → T6, en parallèle, pour résoudre la poule et l'œuf.

### Pourquoi le mixte est obligatoire

```
100 % en SEO seul     → 0 clic pendant 3 mois. Chiffre d'affaires mort.
100 % en terrain seul → quelques centaines de clics par mois. Insuffisant.
100 % en publicité    → ROAS de 33 %. Hémorragie.

Mixte                 → de l'ordre de 60 000 clics par mois à M6, à coût marginal nul
```

---

## 6. Recommandation : la trajectoire mixte

### 6.1 Pourquoi aucune trajectoire seule ne suffit

| Risque | T1 SEO | T2 Social | T3 Partage | T4 Partenariats | T5 Pub | T6 Terrain |
|---|---|---|---|---|---|---|
| Délai | 3 mois | Lent au départ | Nécessite du trafic | Rapide | Immédiat | 2 mois |
| Coût | Nul | Nul | Nul | Nul | 50 à 150 F | Salaires |
| Ampleur | Moyenne | Algorithmique | Imprévisible | Bornée | Illimitée | Bornée |
| Contrôle | Google | Algo | Total | Tiers | Total | Total |
| Risque de coupure | Majeur | Majeur | Faible | Moyen | Faible | Faible |

**Chaque colonne a une cellule rouge.** C'est le signe qu'aucune trajectoire seule ne suffit, et c'est l'argument du mixte.

### 6.2 Le mixte recommandé

| Phase | Trajectoire principale | Trajectoire secondaire | Objectif |
|---|---|---|---|
| **M0 à M3** | T6 (terrain, pour l'offre) + T4 (partenariats WhatsApp) | T2 (compte social, amorcé) | **Validation.** Prouver que des conversations se produisent et que des établissements veulent en acheter. |
| **M3 à M9** | **T1 (SEO, en masse)** | T2 (contenu social régulier) + T4 (partenariats étendus) | **Croissance.** Le SEO monte, le social alimente, les partenariats se déploient. |
| **M9 à M12** | T1 + T3 (partage activé) | T4 + T5 (petit budget de test) | **Amplification.** Mesurer et optimiser ce qui convertit. |

**Répartition cible du trafic à 12 mois** `[ESTIMATION]` :

```
SEO (T1)              40 à 50 %   ← socle qui grossit sans coût
Partenariats (T4)     25 à 30 %   ← le plus rentable, à entretenir
Social (T2)           15 à 20 %   ← activation et test de format
Partage (T3)           5 à 10 %   ← amplificateur
Publicité (T5)         5 % maximum ← test uniquement, jamais plus
Terrain (T6)          hors mesure ← l'offre, pas la demande
```

### 6.3 Le coût du premier clic

| Trajectoire | Coût |
|---|---|
| T1 | **0 FCFA** |
| T2 | **0 FCFA** |
| T3 | **0 FCFA** |
| T4 | **0 à 20 000 FCFA** (si deal produit) |
| T5 | **50 à 150 FCFA** |

**Quatre trajectoires sur six sont à coût nul.** C'est ce qui sauve le modèle. Si tu devais lancer une seule chose demain, ce serait **T1 et T4 simultanément** — le SEO pour la croissance future, les partenariats WhatsApp pour le revenu tout de suite.

---

## 7. Ce qu'il faut construire, dans l'ordre

Dans cet ordre, parce que chaque étape conditionne la suivante.

| # | Élément | Pourquoi en premier | Temps |
|---|---|---|---|
| 1 | **Redirect serveur + identifiant de clic unique + journal horodaté** | Sans ça, tu ne peux ni mesurer ni facturer. Pas de JavaScript : c'est un redirect HTTP. | 1 à 2 semaines |
| 2 | **Lien `wa.me` portant l'identifiant** | C'est ce qui attribue la conversation à ta plateforme et à la fiche concernée. | 1 semaine |
| 3 | **Tableau de bord en chaîne** (clics → conversations → attribuées) | L'attribution, pas le décompte, justifie la facturation. Afficher la chaîne, pas un chiffre. | 1 à 2 semaines |
| 4 | **Facturation par conversation attribuée, par blocs prépayés** | Deux grilles tarifaires (restaurant et meublé). Le prépaiement supprime le risque de crédit. | 1 à 2 semaines |
| 5 | **Sélection des établissements payants** | WhatsApp Business actif, menu à jour avec prix, photos correctes. | En continu |
| 6 | **Instrumentation de mesure du trafic** | Tu dois pouvoir dire d'où vient chaque clic, sinon T1 à T6 sont indistinguables. | 1 semaine |

**Les étapes 1 à 4 sont le socle.** Elles ne dépendent d'aucune décision stratégique et ne changent pas quel que soit ton choix de trajectoire de trafic.

### 7.1 Contre-mesures obligatoires

| Risque | Parade |
|---|---|
| Fraude au clic | Redirect serveur, un clic par utilisateur et établissement et par jour, exclusion des sessions vers le même numéro, journal serveur non modifiable. |
| Le restaurant dit « j'ai eu 265 conversations, vous en comptez 231 » | Prépaiement (il paie d'abord, donc n'a pas à te croire). Et assumer l'écart publiquement : **afficher les conversations brutes du restaurant à côté des attribuées.** |
| Copie du produit | Catalogue vérifié (lent, deux ans). Contrats d'exclusivité de quartier avec les premiers établissements. |
| Meta coupe la redirection `wa.me` | Garder le catalogue en propre, construire une base directe avant qu'il soit trop tard. |
| Départ des restaurants | Prioriser les meublés (rétention meilleure). Prix bas et honnête. |

---

## 8. Grille de décision

Pour trancher la question « d'où vient le trafic ? », réponds à ces quatre questions.

| Question | Si OUI | Si NON |
|---|---|---|
| **Combien de mois de trésorerie peuvent être consacrés sans revenue ?** | T1 (SEO) en premier, budget gratuit | **T5 uniquement, et c'est un suicide économique. Change le prix de vente.** |
| **As-tu accès à des groupes WhatsApp de quartier ?** | T4 immédiatement : c'est rapide et gratuit | T1 et T2 en priorité |
| **Acceptes-tu de ne rien encaisser pendant 4 mois ?** | T1 peut être le moteur | Il faut T4 pour générer du revenu, et T1 en parallèle |
| **Le prix de vente est-il vraiment 50 FCFA ?** | Change à 350 (restaurant) et 1 500 (meublé) par conversation, sinon T5 est mort-né | T1 à T4 seulement |

### La synthèse finale

**Points forts :** la pré-qualification du catalogue, le canal WhatsApp sans friction, l'absence totale de risque financier et réglementaire, le prépaiement qui résout la confiance, et une offre de plus de 3 600 établissements immédiatement accessible.

**Points faibles :** la condition d'existence en trafic organique non démontrée, la non-possession de tous les maillons de la chaîne, des restaurants qui ne peuvent pas absorber le coût d'acquisition, un prix qui plafonne la scalabilité, une barrière à l'entrée quasi nulle, et un marché numérique adressable de 2,1 M d'internautes et non de 3,9 M d'habitants.

**La question du trafic, une fois documentée :** le modèle est **par construction** compatible avec le coût d'acquisition nul. Ce n'est ni le marché, ni la technologie, ni le produit qui le limitent — c'est le recours à l'achat de trafic.

> **En une phrase :** tu as trouvé un bon canal, un vrai différenciateur produit, et une absence totale de risque financier — sur un modèle dont la seule condition de survie est la trajectoire d'acquisition la plus difficile à démontrer. Et cette trajectoire est documentée dans la section 4 : **quatre sources sur six sont gratuites, aucune ne suffit seule, et le mixte est obligatoire.**

---

## 9. Annexe A — Sources

### 9.1 Marché numérique camerounais `[SOURCE]`

| Indicateur | Valeur | Source |
|---|---|---|
| Population | 28 à 29,5 M | Banque mondiale, DataReportal 2025 |
| Internautes | 12,4 M (41,9 %) | Econuma / UIT, début 2025 |
| Utilisateurs de réseaux sociaux | 5,45 M (18,5 %) | We Are Social / Meltwater, Digital Report 2025 |
| Facebook Cameroun | 4,2 à 5,45 M | We Are Social / Agence Ecofin |
| Instagram | 600 000 à 611 000 | Agence Ecofin, fin 2025 |
| LinkedIn | 1,4 M | Digital Report 2025 |
| X (Twitter) | 185 000 à 199 000 | Agence Ecofin / Digital Report |
| Messenger | 665 000 | Digital Report 2025 |
| WhatsApp | 85 % ou plus des prospects internet | BeonWeb 2026 |
| Partage moyen | environ 2 fois plus qu'en Europe | Neurone Digital 2026 |
| Connexion mobile | 92 % | BeonWeb 2026 |
| Part du PC | moins de 8 % | BeonWeb 2026 |
| Couverture 3G et 4G | environ 75 % | GSMA / DataReportal 2024 |
| Douala — internautes | environ 2,1 M | BeonWeb 2026 |
| Population de Douala | environ 4 M | BeonWeb 2026 |
| Coût de la data | 5 Go environ 5 000 FCFA | BeonWeb 2026 |
| Smartphone d'entrée de gamme | 40 000 à 80 000 FCFA, Android à 95 % | BeonWeb 2026 |
| Couverture des PME avec un site web | moins de 15 %, 60 % n'ont que Facebook | BeonWeb 2026 |

### 9.2 Catalogue de référence `[SOURCE]`

- **Ayila'a Cameroun** (ayilaa.com) : restauration 2 265, hébergement 1 368 dont 662 appartements et studios meublés, divertissements 437, total environ 3 840, 5 offres B2B, aucune commission, trafic revendiqué de 1 M par mois sur le web et 200 000 par mois sur l'application (déclaration commerciale, **non vérifiée**).
- **Uniresa** : 288 établissements, 226 propriétaires, 573 chambres, 10 villes, commission de 10 % à la réservation confirmée, 70 logements à Douala et 149 à Yaoundé. Meublés uniquement.
- **Camhebergement** : meublés à Douala, 15 000 à 45 000 FCFA par nuit.
- **Zuma Eats** : Douala « Launching soon », Cameroun tier 2.
- **Wakalooka** : site hors service.
- **Meta / WhatsApp Business** : « messaging conversations started », Ads that click-to-WhatsApp, Conversions API.

### 9.3 Estimations de ce document `[ESTIMATION]`

| Chiffre | Hypothèse |
|---|---|
| Coût du clic publicitaire 50 à 150 FCFA | Ordre de grandeur Meta à Douala, non vérifié auprès d'un annonceur réel |
| Taux clic vers conversation de 20 % | Hypothèse de travail, à mesurer |
| Taux conversation vers visite de 20 % | Hypothèse de travail, à mesurer |
| Marge de contribution 3 500 FCFA (restaurant) et 15 000 FCFA (meublé) | Ticket moins le coût matière et service |
| Prix de 350 à 420 FCFA et 1 500 à 1 800 FCFA par conversation | 10 à 12 % de la marge de contribution |
| Volumétrie et délais des trajectoires T1 à T6 | Jugement d'expert, pas des données publiées |
| Répartition cible du trafic à 12 mois | Objectif de planification |

---

## 10. Annexe B — Ce qui n'a pas été tranché

| # | Question ouverte | Pourquoi c'est important |
|---|---|---|
| **O1** | **Quel prix de vente ?** 50 FCFA au clic, ou 350 à 420 et 1 500 à 1 800 à la conversation ? | Détermine si la trajectoire T5 est viable ou mort-née. |
| **O2** | **Quelle trajectoire de trafic en priorité ?** | Détermine le séquencement et le budget. |
| **O3** | **Modèle juridique et fiscal**, même sans encaissement | Si tu fais de la publicité, il y a des obligations fiscales (impôt sur les revenus d'une activité commerciale, registre unique). Moins lourd que le merchant of record, mais non nul. |
| **O4** | **Quel statut pour les établissements sans RCS ni NIF ?** | C'est le premier obstacle terrain. |
| **O5** | **Application mobile ou web ?** | Question à trancher tôt, coûteuse à corriger tard. |
| **O6** | **Quel budget, et sur quel horizon ?** | Détermine si T1 est finançable en 3 mois ou doit être raccourci. |

---

*Fin du document. Prochaine étape : trancher O1 et O2, puis lancer les étapes 1 à 4 de la section 7, qui ne dépendent d'aucune décision stratégique.*