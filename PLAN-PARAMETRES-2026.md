# Plan « Paramètres qui respirent » (2026-09-09)

> Demande Colin : « il faut que l'on replie beaucoup de choses dans la section
> Paramètres, ça fait beaucoup trop impressionnant et fouilli ». Document de
> pilotage du chantier. Mesures prises en vrai navigateur contre la prod, compte
> démo Atelier Soleil, desktop 1280 et mobile 390 (script temporaire, non gardé).

## 1. Ce qu'on a mesuré

18 destinations (5 onglets, 13 sous-onglets), 23 cartes, 15 boutons Enregistrer.

| Écran | Hauteur desktop | Hauteur mobile | Champs | Boutons | Mots |
|---|---|---|---|---|---|
| Portail › Ma page | 3 735 px | 4 928 px | 15 | 27 | 703 |
| Profil › Activité | 2 928 px | 4 256 px | 21 | 13 | 564 |
| Notifications › élèves | 1 954 px | 2 984 px | 4 | 19 | 335 |
| Portail › Types de cours | 1 882 px | 2 334 px | 8 | 63 | 191 |
| Portail › Cours d'essai | 1 955 px | 2 218 px | 16 | 11 | 184 |
| Abonnement IziSolo | 1 824 px | 3 305 px | 0 | 8 | 405 |
| Notifications › moi | 1 797 px | 2 383 px | 1 | 34 | 268 |
| Profil › Profil | 907 px | 1 118 px | 5 | 10 | 45 |

Quatre causes, dans l'ordre d'importance :

1. **Rien n'est replié.** Toutes les cartes d'un sous-onglet sont ouvertes, avec
   tous leurs champs, que la prof les ait remplis ou non. « Activité » empile
   Mon activité, Facturation, Règlement par virement et Ma déclaration URSSAF :
   quatre cartes, 21 champs, quatre boutons Enregistrer, pour une prof qui
   voulait changer sa ville.
2. **Les explications sont dans l'écran, pas derrière un « ? ».** Ma page fait
   703 mots, Activité 564. Chaque champ porte une, deux ou trois phrases sous lui.
   La moitié du « fouilli » est de la prose.
3. **Le plus technique est en tête.** Sur Ma page, les quatre extraits de code
   du planning intégré, les sélecteurs de palette et de couleurs viennent AVANT
   la photo de couverture et la bio. Une seule prof (Manon) a collé un widget ;
   toutes voient le code en premier.
4. **Deux niveaux d'onglets qui débordent.** Sur mobile, « Abonnement IziSolo »
   est hors écran ; sur desktop, le sous-onglet « Paiement en ligne » est
   recouvert par la bulle « Un truc à dire ? ». Et les réglages qui parlent
   d'argent sont dispersés sur trois onglets (Facturation et virement dans
   Profil, Stripe dans Portail, prix d'essai dans Portail).

Un mensonge d'interface au passage : « SMS bientôt disponibles » + le bloc
« SMS : facturation au volume, 0,08 € l'unité, bloquer après N/mois » vivent dans
Notifications élèves alors que `SMS_ENABLED = false` depuis toujours (promesse >
produit, cause racine n°4 du plan de bataille).

## 2. Le principe : une liste, des rubriques, des cartes fermées

Le modèle est celui des Réglages d'un téléphone, pas celui d'un back-office :

- **Une page d'accueil `/parametres`** = une liste de rubriques, groupées par la
  question que se pose la prof, chaque ligne avec un **résumé d'état** (« SIRET
  renseigné · TVA 293 B », « Pas encore branché », « 8 types ») et un chevron.
  Sur desktop, la liste reste en colonne gauche et la rubrique s'ouvre à droite ;
  sur mobile, la rubrique est un écran avec un bouton retour. Fin des deux
  niveaux d'onglets, fin du débordement.
- **Une rubrique = une URL** (`/parametres/facturation`). Les 17 deep-links
  actuels (`?tab=&s=`) restent servis par une table d'alias, y compris les
  retours Stripe (`success_url`, `return_url`) et l'email du cron de fin d'essai.
- **Une carte = fermée par défaut, avec son résumé sur une ligne**, sauf la
  première de la rubrique. Ouverte au clic, elle montre ses champs et SON bouton
  Enregistrer (le save par carte de B2e est conservé tel quel : `CARTES` et
  `SERIALIZERS` ne bougent pas, c'est ce qui rend le chantier peu risqué).
- **Un champ = une ligne d'aide au plus.** Le reste part dans le « ? » contextuel
  (`AideContextuelle`, ancre du tuto) ou dans un « En savoir plus » replié.
- **Ce qui est vide reste court.** Une carte non configurée affiche une phrase
  et un bouton « Configurer », pas ses douze champs vides.

## 3. La nouvelle carte des rubriques

```
MON STUDIO
  Profil               Camille Leroux · camille@atelier-soleil.fr
  Studio & lieux       L'Atelier Soleil · Pilates · Bordeaux · 2 lieux
  Équipe               (Multi seulement, renvoie vers /equipe)

MA PAGE PUBLIQUE
  Ma page              photos, bio, réseaux, FAQ, horaires, tarifs, offres dans l'espace
  Types de cours       8 types · 4 photos
  Cours d'essai        Activé · validation manuelle · 10 €
  Documents            2 PDF
  Intégrer sur mon site   planning + offres, QR code, couleurs de marque   <- sort de Ma page

ARGENT
  Facturation          SIRET · TVA 293 B · facture auto : non
  Paiement en ligne    Webhook branché · 2 offres avec lien        <- quitte Portail
  Virement (RIB)       FR76 … 123 · email au choix à chaque vente   <- quitte Activité
  Déclaration URSSAF   Micro BNC · trimestrielle · rappel activé    <- quitte Activité, France seulement

ÉLÈVES & COURS
  Infos collectées     3 champs perso                               <- quitte Profil
  Visibilité par défaut   Public · inscrits affichés                <- quitte Portail
  Annulation           24 h · séance décomptée
  Cas particuliers     7 règles (no-show, retard, atelier…)         <- ex « Règles métier »
  Seuils d'alerte      2 séances · 7 jours · 14 jours               <- les 3 alerte_* réunis

NOTIFICATIONS
  Ce que je reçois     push activé · 11 types
  Ce que tes élèves reçoivent   4 emails · anniversaires

ABONNEMENT IZISOLO    Complet · 29 €/mois · prochain prélèvement le …
```

Ce qui change de place et pourquoi :
- **Argent** regroupe ce qui était éclaté sur trois onglets. C'est la rubrique
  que Manon, Patricia et Maude ouvrent le plus, et c'est celle qu'elles
  cherchaient le plus longtemps (« où est le webhook ? »).
- **Intégrer sur mon site** isole le code, les couleurs de marque et le QR :
  c'est le bloc le plus impressionnant, et le moins utilisé.
- **Seuils d'alerte** réunit `alerte_paiement_attente_jours` (aujourd'hui dans
  « Ce que je reçois ») et les deux seuils de « Ce que tes élèves reçoivent » :
  trois nombres qui parlent de la même chose, sur un seul écran.
- **Cas particuliers** remplace « Règles métier » : le guide et deux tutos
  l'appellent déjà comme ça.
- « Profil » et « Activité » fusionnent en **Studio & lieux** : nom, métier, ville,
  pays, et la liste des lieux en dessous (la carte Lieux n'a pas de champ, elle
  n'a pas besoin d'un sous-onglet à elle).

## 4. Ce qu'on replie ou retire, carte par carte

**Ma page** (3 735 px, objectif 1 400 px au plus, fermée) :
- Ouvert : couverture, avatar, bio courte, réseaux.
- Replié « Aller plus loin » : années d'expérience, formations, philosophie, FAQ,
  horaires (le toggle reste visible, l'éditeur s'ouvre dessous).
- Les trois interrupteurs (horaires, tarifs, offres dans l'espace) deviennent une
  petite carte « Ce que ta page montre », trois lignes.
- Le paragraphe « Ta bio s'affiche en accroche… » (le repère de v105, utile) passe
  en « ? ». Le bloc « Ces enrichissements sont une feature Pro » ne s'affiche
  qu'à une prof Essentiel.
- Planning intégré, offres intégrées, couleurs, QR : partent dans la rubrique
  « Intégrer sur mon site ».

**Facturation** : fermée si SIRET renseigné (résumé), ouverte sinon avec UNE
phrase (« Avec ton numéro, tes élèves téléchargent de vraies factures ») et le
pays en premier. La case facture auto reste dedans.

**Virement et URSSAF** : fermées par défaut, résumé sur une ligne. La carte
URSSAF garde ses champs mais perd trois des cinq phrases d'aide (elles vivent
déjà dans le tuto `/aide#urssaf`).

**Types de cours** (63 boutons) : une ligne par type = photo miniature + pastille
de couleur + nom ; le clic ouvre le choix des cinq tons et le dépôt de photo pour
CE type. On passe de 8 cartes ouvertes à 8 lignes.

**Cours d'essai** : les champs de prix et de lien Stripe n'apparaissent que si
« Payant » est choisi ; le prix par type n'apparaît que si « Un prix différent
selon le type » est coché (16 champs, 4 visibles au départ).

**Notifications élèves** : le bloc SMS disparaît (kill-switch global, jamais
livré). La matrice se réduit à une colonne « Email ». Les seuils partent dans
« Seuils d'alerte ». L'anniversaire reste : toggle + message replié.

**Ce que je reçois** : la matrice 11 × 3 reste (elle est le produit), mais avec
les trois canaux en en-tête fixe et des lignes plus basses ; le PushToggle
devient une carte « Notifications sur ce téléphone » en tête, fermée si actif.

**Abonnement IziSolo** : le plan actuel en carte fermée avec résumé ; les trois
cartes de plans ne s'affichent que sur « Changer de plan ».

## 5. Lots, dans l'ordre

Chaque lot suit la règle immuable : preuve en vrai navigateur, centre d'aide
dans le même commit, commit, push. Aucune migration, `verifier-selects` sans
objet (aucune colonne nouvelle).

**Lot 1 : la structure (le plus gros, zéro changement de champ) — ✅ LIVRÉ le 2026-09-09**, prouvé 73/73 en vrai navigateur (`scripts/proof-parametres-structure.mjs`) + non-régression pays 27/27, virement 16/16, offres-espace 18/18, paiement en ligne 22/22, vignettes 35/35, frontière des plans 38/38, 725 specs CI. Décisions Colin appliquées dans ce lot : « Argent », fusion Studio & lieux, SMS retiré. Reste après déploiement : refaire les illustrations du guide qui photographient Paramètres (`node scripts/shoot-aide-illustrations.mjs`).
- `/parametres` = liste des rubriques avec résumés d'état ; `/parametres/[rubrique]`
  = une rubrique ; layout deux colonnes desktop, écran + retour mobile.
- Table d'alias `?tab=…&s=…` vers rubrique (les 17 sites du code + 2 URL Stripe +
  l'email cron : on ne touche pas aux appelants, la redirection les sert).
- Les composants `sections/*.js` sont réutilisés tels quels ; `page.js` (1 938
  lignes) éclate en un fichier par rubrique, `CARTES` / `SERIALIZERS` / le save
  par carte vont dans `lib/parametres-cartes.js` (PUR, verrou CI : chaque carte
  déclarée possède des colonnes connues, chaque rubrique a un résumé).
- Preuve : les 18 anciens deep-links atterrissent sur le bon écran, chaque
  bouton Enregistrer écrit encore SES colonnes (relecture DB), navigation sans
  débordement à 390 px, `elementFromPoint` sur chaque entrée de la liste.
- Aide : les 39 mentions « Paramètres → … » du guide, de la FAQ, des emails et
  des écrans sont réécrites (table de correspondance ancien vers nouveau chemin).

**Lot 2 : le repli (le lot qui répond à la demande) — ✅ LIVRÉ le 2026-09-09**, prouvé 35/35 (`scripts/proof-parametres-repli.mjs`, relevé avant/après figé dans le script) : Ma page 2 276 → 1 375 px et 332 → 106 mots, Abonnement 1 950 → 276 px, Types de cours 1 585 → 764 px, Cours d'essai 1 686 → 1 023 px, 19 rubriques 3 299 → 1 890 mots, aucune au-dessus de 1 400 px fermée sur desktop. Non-régression : structure 73/73, pays 27/27, virement 16/16, offres-espace 18/18, paiement en ligne 22/22, vignettes 35/35, frontière des plans 38/38.
- Composant `CarteReglage` : titre, résumé d'état, ouvert/fermé, bouton
  Enregistrer à l'intérieur. Résumés dérivés du profil (PURS, testés).
- Textes : une ligne par champ, le reste en « ? » ou « En savoir plus ».
- Ma page : découpage ouvert / « Aller plus loin » ; Intégrer sur mon site ;
  Types de cours en lignes ; Cours d'essai conditionnel ; Abonnement replié.
- Preuve : hauteur fermée de chaque rubrique mesurée (objectif : aucune rubrique
  au-dessus de 1 400 px fermée sur desktop, 2 000 px sur mobile), mots par
  rubrique divisés par deux au moins, et chaque carte repliée qui s'ouvre au clic
  ET montre les valeurs déjà enregistrées (pas de champ vide fantôme).

**Lot 3 : le ménage**
- Retrait du bloc SMS (`sms_seuil_mois` reste en base, 0 lecteur ; « Bloquer
  après » n'est plus rendu).
- Rubrique « Seuils d'alerte » ; « Cas particuliers » ; fusion Profil + Activité.
- Indicateur « à compléter » sur la liste (SIRET absent, webhook absent alors
  qu'une offre porte un lien, RIB absent avec « virement » choisi), aligné sur
  la checklist du dashboard.

## 6. Ce qu'on ne fait PAS

- Aucune colonne, aucune migration, aucun changement de ce qui est enregistré.
- On ne touche pas aux sept cas de `ReglesMetierTab` ni à la matrice de
  notifications : ils changent de place et de hauteur, pas de contenu.
- On ne supprime aucun réglage : replier n'est pas retirer. Le seul retrait est
  le SMS, qui n'a jamais existé côté produit.
- On ne réintroduit pas `ReglesTab` (le constructeur SI/ALORS), retiré en mai.

## 7. Décisions de Colin (tranchées le 2026-09-09)

Argent · fusion Studio & lieux · SMS retiré · structure d'abord. Les quatre
questions ci-dessous sont conservées pour mémoire.

### Questions posées

1. Rubrique « Argent » : ce nom, ou « Paiements & facturation » ?
2. « Studio & lieux » fusionnés, ou garder « Lieux » à part ?
3. Le bloc SMS : retiré (reco), ou gardé en « Bientôt » ?
4. Ordre des lots : 1 puis 2 puis 3 (reco, la structure d'abord pour que le repli
   s'écrive une fois au bon endroit), ou 2 seul en premier sur l'écran actuel
   (plus vite visible, mais à refaire au lot 1) ?
