# Modèle cours ↔ carnets/abonnements — analyse & cible (2026-07-26)

> Déclencheur : question de Colin — « une prof peut-elle mettre au planning un
> cours qui accepte plusieurs types d'abonnements ET un paiement à l'unité
> (20 € pour une nouvelle élève ou une élève non couverte) ? »
> Réponse courte : **non, pas aujourd'hui** — et l'analyse complète ci-dessous
> montre que le manque est plus large : le carnet n'est ni visible ni
> choisissable à AUCUN moment, par personne.
>
> Prolonge MODELE-PAIEMENTS-2026.md (intégralement implémenté). Chaque fait
> ci-dessous est vérifié dans le code au 2026-07-26 (fichier:ligne).

---

## 1. Le modèle actuel en une phrase

Le lien cours ↔ carnet passe par le **type de cours** (`cours.type_cours` ↔
`types_cours_autorises` snapshotté sur l'abonnement à la vente), la liaison se
fait par **résolution automatique au pointage** (RPC v64, miroir JS
`lib/carnet-resolution.js`) — jamais à la réservation, jamais choisie par
l'élève, jamais corrigeable par la prof.

## 2. Les moments du cycle de vie (qui lie quoi, quand)

| # | Moment | Acteur | Ce qui se passe aujourd'hui | État |
|---|--------|--------|------------------------------|------|
| 1 | **Vente** (`PaiementStep` → RPC `vendre_offre`) | prof | Périmètre du carnet figé (`types_cours_autorises`, défaut « tous tes cours ») | ✅ |
| 2 | **Résa élève** (`reserver`, `reserver-serie`) + **promotion liste d'attente** | élève / système | Présence créée **sans liaison** — aucun appelant ne passe `p_abonnement_id` à `reserver_place` (v53:108). L'élève ne voit qu'une phrase générique : « décomptée de ton carnet si tu en utilises un » (CoursReservationClient:387) | ⚠️ aveugle |
| 3 | **Ajout par la prof** (batch-add au pointage, fiche à la volée) | prof | Sans pré-liaison depuis l'audit paiements (Lot A 2026-07-22) — v64 résoudra | ✅ |
| 4 | **Pointage** (RPC `pointer_presence` v64/v70) | prof | Résolution auto : candidats = actifs, non épuisés/expirés/en pause, type couvert ; priorité **restreints d'abord, expire le plus tôt, « jamais » en dernier** (carnet-resolution.js:56-64). Affiche « sur carnet · 10 → 9 ». Gestes : statut, type Essai/Offert, encaisser à l'unité (v65), excuser tardive. **Aucun choix du carnet** | ❌ choix |
| 5 | **Cas à traiter** (`resolve` « décompté ») | prof | Résout et lie a posteriori (resolve:297) — réparé par l'audit résa/pointage | ✅ |
| 6 | **Annulation / undo** | élève / prof | Recrédit **seulement** le réellement décompté (`decompte_applique`), symétrique | ✅ |
| 7 | **Correction après coup** | prof | **Aucune UI** pour changer le carnet pris ou passer une présence « à l'unité » — seul chemin : excuser/undo puis re-pointer | ❌ |

La règle v70 en travers de tout ça : `tarif_unitaire > 0` sur un cours →
**aucun** carnet n'est jamais résolu (carnet-resolution.js:31, même règle dans
la RPC), promesse du formulaire de cours (« il ne décomptera aucun carnet »).
Un carnet DÉJÀ lié reste décompté (override), mais rien dans l'UI ne permet de
poser cet override.

## 3. La matrice des cas

Configurations de cours × situations d'élève. ✅ = géré, ⚠️ = géré avec
angle mort, ❌ = pas possible.

### Configurations de cours

| Config | Exemple | Aujourd'hui |
|---|---|---|
| **Carnets seuls** (pas de tarif) | cours de yoga hebdo | ✅ le cas nominal |
| **À l'unité pur** (`tarif_unitaire`, carnets ignorés) | atelier 25 € ouvert à tous | ✅ prix affiché portail, résa exemptée de la règle sans-carnet (reserver:294), « à régler » au pointage |
| **MIXTE** (carnets compatibles + tarif pour les autres) | cours régulier + drop-in 20 € | ❌ **n'existe pas** — v70 binaire |
| Cours d'essai (`type_presence='essai'`) | premier cours | ✅ jamais décompté, quota d'essais visible au pointage |
| Cours offert (`type_presence='offert'`) | rattrapage offert | ✅ jamais décompté |
| Cours privé (v73) / individuel (capacité 1) | — | ✅ orthogonal au paiement (visibilité) |

### Situations d'élève (sur un cours à carnets)

| Situation | Aujourd'hui |
|---|---|
| 1 carnet applicable | ✅ résolu, décompté, visible au pointage |
| **Plusieurs carnets applicables** | ⚠️ l'algo tranche seul (restreint d'abord, expire le plus tôt — bon défaut), mais ni l'élève ni la prof ne peuvent dévier. Cas réel : carnet 10 séances qui expire + abo mensuel illimité → parfois on veut consommer l'illimité et GARDER le carnet |
| Carnet du mauvais type | ✅ non résolu ; email d'annulation tardive honnête (« ton carnet ne couvre pas ce type de cours ») ; MAIS l'élève ne l'apprend qu'après coup | 
| Épuisé / expiré / en pause | ✅ exclu de la résolution ; règles métier `eleve_sans_carnet` / `carnet_expire_avant_cours` à la résa |
| **Walk-in** (aucun carnet) | ⚠️ règle sans-carnet (bloquer / autoriser + dette) ; **aucun prix nulle part** ; encaissement = geste manuel au montant tapé à la main |
| Cap hebdo (`seances_par_semaine`) | ✅ compté à la résa (unitaire + série) |
| Échéancier en cours | ✅ orthogonal (paiement de l'offre, pas de la séance) |

## 4. Cible — 3 recommandations, par priorité

### R1 — Le cours mixte (le manque de la question)

`cours.carnets_acceptes` boolean (défaut **false** = comportement actuel
préservé pour tous les cours existants à tarif). Formulaire de cours : quand
un tarif est saisi, case « Accepter aussi les carnets/abos compatibles ».

**Ordre de résolution unique** (RPC + miroir JS, verrou spec) :
1. carnet déjà lié à la présence (override explicite) ;
2. si `tarif_unitaire > 0` et `!carnets_acceptes` → personne ne résout (atelier pur, = v70) ;
3. carnet **applicable** (périmètre couvre le type) → décompte ;
4. sinon si `tarif_unitaire > 0` → « à régler X € » (machinerie v65 existante) ;
5. sinon → cas `eleve_sans_carnet`.

L'élève « qui ne fait pas ce type de cours » a un carnet restreint ailleurs →
non applicable → 20 €. L'abonnée « tous mes cours » → décomptée. Exactement le
scénario demandé.

### R2 — La résa élève dit la vérité AVANT de confirmer

Sur la page cours du portail, remplacer « décomptée de ton carnet si tu en
utilises un » par le résultat du MÊME calcul (`resoudreCarnetApplicable`,
exposé par l'API du cours pour l'élève connectée) :
- « Cette séance sera décomptée de ton **Carnet Pilates ×10** (il t'en restera 4). »
- « Ce cours est à **20 €**, à régler sur place. » (mixte non couverte / atelier)
- « Ton carnet ne couvre pas ce type de cours — la séance sera à régler (20 €). »
- « Tu n'as pas de carnet actif — [selon la règle du studio]. »

Zéro choix élève en v1 : juste la transparence (le choix élève est le piège
usine à gaz — l'algo + la correction prof couvrent le besoin réel).

### R3 — La prof choisit/corrige au pointage (UN seul endroit)

Le menu de la carte de présence (aujourd'hui : Essai / Offert) gagne :
- « **Utiliser un autre carnet…** » → liste des carnets de l'élève :
  applicables (normal) + non-applicables marqués « ne couvre pas ce type »
  (choisir = override assumé, celui que v70 prévoyait sans UI) ;
- « **Passer à l'unité (X €)** » sur un cours à tarif (mixte ou pur) pour une
  élève couverte qui préfère payer sa séance ;
- symétrie : re-choisir AVANT pointage = simple liaison ; APRÈS pointage =
  re-créditer l'ancien + décompter le nouveau (transaction RPC, même esprit
  que `seanceDeltaChangementType`).

### Non-recommandé (nommé pour ne pas y revenir par accident)

- **Choix du carnet par l'élève** à la résa (v1) : rare, corrigeable par la
  prof, et chaque option élève = du support pour les profs.
- **Périmètre d'offre par cours précis** (liste d'uuid) : le TYPE de cours est
  la bonne granularité ; un double système type+cours = divergence garantie.
- **Carnet partagé famille** (2 fiches, 1 carnet) : vraie demande potentielle,
  autre chantier (modèle de données), pas ce batch.
- **Tarif d'essai par cours** : l'essai est une politique studio (`essai_*`) ;
  un « atelier découverte 10 € » = cours à l'unité, déjà couvert.

## 5. Découpage en lots (si go)

- **Lot A — moteur mixte** : migration v82 (colonne + RPC `pointer_presence`
  ordre de résolution) + miroir `carnet-resolution.js` + case du formulaire de
  cours (création/édition/duplication/prolongation de série — tarif_unitaire y
  voyage déjà) + **extension du verrou `carnet-resolution.spec.js`** (zone
  financière = spec au gate CI, écrite AVANT le changement, comportement v70
  constant quand la case est décochée).
- **Lot B — transparence élève** : API cours expose la prévision pour l'élève
  connectée ; page cours + confirmation de résa affichent la phrase vraie ;
  liste portail : « dès X € » sur les mixtes.
- **Lot C — choix prof au pointage** : menu « autre carnet / à l'unité »,
  RPC de re-liaison transactionnelle, affichage « sur carnet Y (choisi) ».

Ordre conseillé : A seul livre déjà le cas de la question ; B et C peuvent
suivre dans la même session ou après retour terrain de Maude.
