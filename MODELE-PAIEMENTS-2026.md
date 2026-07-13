# Modèle Paiements & Carnets — Cahier des charges 2026

> **But** : refondre le cœur de l'app (offre → attribution → pointage → alertes)
> pour qu'il soit **enfantin au premier usage**, tout en gardant les cas
> particuliers accessibles en second plan.
> **Statut** : spec validée (Colin, 2026-07-13) — à coder par lots. Rien n'est
> encore implémenté à la rédaction de ce doc.

---

## 1. Principe directeur

Aujourd'hui l'app n'a **qu'un seul objet** pour tout ce qu'un élève « achète » :
l'`abonnement`, un **compteur qui se décrémente**. Cet objet fait deux métiers
incompatibles :

1. « combien de séances prépayées il reste » → utile, c'est un vrai **carnet** ;
2. « cette séance-là est-elle payée » → pour une séance à l'unité, mauvais outil.

Conséquence : une séance à l'unité *payée + faite* devient un carnet `0/1` en
statut `épuisé`, et l'app **crie un problème (rouge) là où tout va bien**.

**Reformulation : deux concepts nets.**

| Concept | Pour qui | Comportement |
|---|---|---|
| **Carnet / abonnement** | le régulier qui prépaie un pack (10 séances, mensuel…) | se décompte ; quand bas → *nudge doux « renouveler ? »* (jamais rouge) |
| **Paiement à la séance** | le pay-as-you-go (drop-in, cours ponctuel d'un autre type) | enregistré **sur la séance** ; **aucun carnet, aucun compteur, aucune alarme** |

**La règle d'or : le choix carnet vs paiement-séance est PAR SÉANCE, jamais par
élève.** Un même élève peut avoir un carnet 10 yoga (décompté sur les yogas) ET
payer à l'unité un renfo ponctuel (aucun impact sur le carnet yoga), le même jour.

---

## 2. La résolution par séance (l'algorithme central)

Au moment de pointer un élève **présent** sur un cours donné :

```
Résoudre le(s) carnet(s) actif(s) applicable(s) à CE cours :
  candidats = abonnements de l'élève où :
      statut = 'actif'
      ET (seances_total IS NULL  OU  seances_restantes > 0)
      ET (date_fin IS NULL  OU  date_fin >= date_du_cours)
      ET pas en pause à la date du cours
      ET type de cours autorisé (types_cours_autorises vide/NULL = tous,
                                 sinon doit contenir cours.type_cours)

  si candidats non vide :
      choisir : le plus SPÉCIFIQUE d'abord (restreint au type avant « tous »),
                puis celui qui EXPIRE LE PLUS TÔT (on consomme ce qui périme)
      → défaut = « sur carnet » : décompter ce carnet (seances_utilisees += 1),
        lier presence.abonnement_id
  sinon :
      → défaut = « paiement à la séance » : Payé / À régler / Offert
```

Cette résolution est faite **dynamiquement au pointage**, PAS à la création de la
présence. → **agnostique à l'ordre** : « pointer puis attribuer le carnet » et
« attribuer puis pointer » donnent le même résultat. C'est ce qui corrige le bug
de départ (le `presence.abonnement_id` figé à la création qui ne décomptait pas).

**Override discret** sur la ligne de pointage (menu `⋯`), dans les deux sens :
- élève sur carnet → « payer à la séance à la place » (garder le carnet) / « offert » ;
- élève sans carnet → rien à forcer (le défaut paiement-séance couvre tout).

**Décisions de bord figées (Colin, 2026-07-13)** :
- carnet **non restreint** (`types_cours_autorises` vide) = **couvre tous les cours** ;
- **plusieurs carnets applicables** → plus spécifique, puis expire le plus tôt ;
- **override** = petit menu 3 choix par ligne, en second plan.

---

## 3. Modèle de données (changements minimaux)

On **garde** `abonnements` (carnets) et `paiements` tels quels. Un seul ajout :

- **`paiements.presence_id` (uuid, nullable, FK presences ON DELETE SET NULL)** —
  lie un **paiement à la séance** à la présence précise. Un paiement-séance =
  ligne `paiements` avec `presence_id` renseigné et `abonnement_id` NULL. Permet
  d'afficher « cette séance : payé/à régler » par ligne et d'éviter le double
  encaissement. (Migration légère, rétro-compatible.)

**État de paiement d'une présence (dérivé, pas de nouvelle colonne d'état)** :
- `presence.abonnement_id` renseigné → **sur carnet** (prépayé, rien de plus à régler) ;
- sinon, paiement lié (`paiements.presence_id = presence.id`) :
  - `paid` → **payé** ; `pending` → **à régler** ;
- `type_presence IN ('essai','offert')` → **gratuit** ;
- sinon (présent, ni carnet ni paiement) → **à régler** (invite douce).

Le `seances_restantes` reste **calculé** (`seances_total - seances_utilisees`),
jamais une colonne stockée (une lecture directe existe dans `/api/notifications/check`
et échoue en silence car la colonne n'existe pas → à corriger, cf. §6).

---

## 4. Les flux cibles

### 4.1 Création d'une offre (`/offres/nouveau`)

Trois familles, présentées simplement :

1. **Carnet** (X séances) — *« Vaut pour tes cours : ▸ Tous (défaut) / choisir »*.
   Le scope type-de-cours devient **structurant** (il décide carnet vs paiement),
   donc lisible d'un coup d'œil, coché « tous » par défaut, dépliable pour restreindre.
2. **Abonnement** (période : mensuel/trimestriel/annuel, illimité ou capé).
3. **Séance à l'unité** — c'est un **tarif**, pas un carnet. Sert de prix par
   défaut au paiement-séance (pointage / portail), ne crée **jamais** de compteur.

### 4.2 Attribution d'un carnet à un élève (fiche client)

Inchangé sur le principe (RPC atomique `vendre_offre` : carnet + paiement(s)),
avec les 3 modes de règlement conservés en second plan :
- **Payé maintenant** (paid) · **À régler plus tard** (pending) · **En plusieurs
  fois** (échéancier). Voir §7.

Nuance : « attribuer une offre » sert à **vendre un pack**. Encaisser une **séance
à l'unité** ne passe plus par là → ça se fait au **pointage** (cf. 4.3) ou via un
« encaisser une séance » direct sur la fiche, sans créer de carnet.

### 4.3 Pointage (le cœur — doit être enfantin)

Chaque ligne élève, après résolution §2 :

| Cas | Affichage ligne | Geste | Effet |
|---|---|---|---|
| **Sur carnet** | badge « Carnet yoga · 9 → 8 » | tap *Présent* | décompte le carnet, vert |
| **Paie à la séance** | chip prix (défaut = tarif unité / dernier utilisé) | tap *Présent* → *Payé (espèces) ▾* / *À régler* | paiement lié à la présence, vert |
| **Essai / offert** | badge « Essai » / « Offert » | tap *Présent* | gratuit |

- Idéal : action combinée **« Présent + Payé »** en un geste pour le cas courant.
- Override `⋯` : « sur carnet ▾ / payer à la séance / offert ».
- Le montant du paiement-séance se pré-remplit (tarif unitaire du cours, sinon
  défaut studio, sinon dernier montant saisi).

### 4.4 Alertes / dashboard (opportunités, jamais erreurs)

Refonte de `dashboard/page.js` + `/api/notifications/check` (carnet) + vocabulaire :

- **N'alerter QUE pour les vrais packs** : `type IN ('carnet','abonnement')`
  **ET** `seances_total > 1`. Un `cours_unique` ou un carnet de 1 → **jamais** d'alerte.
- **Bas mais > 0** → ambre doux *« Il reste 1 séance à Marie — proposer la suite ? »*.
- **Terminé (reste = 0)** → **neutre** *« Marie a terminé son carnet »* + bouton
  *« proposer un renouvellement »*, **dismissable**. Plus jamais de rouge « crédit épuisé ».
- **Drop-in payé + fait = vert et silencieux.** Zéro notif.
- Réglage : seuil d'alerte déjà présent (`alerte_seances_seuil`) ; ajouter la
  possibilité de couper les nudges de renouvellement.

**Effet immédiat pour Maude** : ce seul changement (ne plus alerter sur
`cours_unique` / `seances_total <= 1`, retirer le rouge « épuisé ») **éteint les 3
alertes** de Leila / Bruno / Karine sans toucher à leurs données.

---

## 5. Vocabulaire (à figer, cohérent avec le lexique global)

- ❌ « crédit épuisé » (rouge) → ✅ « carnet terminé » (neutre) / « à renouveler ? » (opportunité)
- ❌ « 0/1 séance » pour un drop-in → **rien** (pas de carnet)
- « Payé » / « À régler » / « Offert » / « Sur carnet » = les 4 états de règlement d'une séance
- Cohérent avec le lexique bible : *cours* = modèle, *séance* = occurrence, *carnet/abo* = attribué à l'élève.

---

## 6. Rétro-compatibilité & données existantes

- **Carnets `cours_unique` / `seances_total = 1` déjà en base** : on **arrête d'en
  créer** (nouveau modèle) ; l'exclusion des alertes (§4.4) les rend silencieux
  sans migration de données. Optionnel plus tard : les convertir en paiements-séance.
- **Les 3 élèves de Maude** : réglés par le changement d'alerte (silence). Si on
  veut le « 0/1 » propre, on les convertira avec le lot data.
- **Bug latent à corriger au passage** : `/api/notifications/check` lit une colonne
  `seances_restantes` **qui n'existe pas** (le carnet_epuise de la cloche échoue en
  silence) → remplacer par `seances_total - seances_utilisees`.

---

## 7. Ce qui reste en second plan (garder, ne pas encombrer le 1er usage)

Échéanciers (multi-versements) · pauses/gel d'abonnement · pro-rata · cap
`seances_par_semaine` · restrictions par type de cours (désormais surfacées mais
défaut sain) · Stripe Payment Link · règles d'annulation / no-show.

---

## 8. Découpage en lots

| Lot | Contenu | Risque | Valeur |
|---|---|---|---|
| **1 — Alertes reframe** | dashboard + cloche + vocabulaire : ne plus alerter drop-in/épuisé, nudges d'opportunité, fin du rouge. Corrige aussi le `seances_restantes` inexistant. | faible | **soulagement immédiat Maude** |
| **2 — Pointage pay-as-you-go + résolution par séance** | `paiements.presence_id` ; résolution du carnet actif au pointage (agnostique à l'ordre) ; chemin « Payé/À régler/Offert » par ligne ; override `⋯`. | moyen | **le cœur** |
| **3 — Création d'offre clarifiée** | « Séance à l'unité » = tarif (pas de carnet) ; scope carnet « vaut pour quels cours » lisible, défaut tous. | faible | cohérence |
| **4 — Attribution / encaissement séance** | séparer « vendre un pack » de « encaisser une séance » ; polish fiche. | faible | confort |
| **Data** | convertir/nettoyer les `cours_unique` legacy si on veut le « 0/1 » propre. | faible | cosmétique |

Ordre recommandé : **Lot 1 d'abord** (rapide, éteint la douleur de Maude), puis
Lot 2 (le vrai fond), puis 3–4.

---

## 9. Invariants à ne pas casser

- `vendre_offre` reste **atomique** (carnet + paiements en une transaction).
- Décompte via RPC `SECURITY INVOKER` (RLS : la prof ne touche que ses lignes).
- Snapshots immables sur `abonnements` (`offre_nom`, `type`, `types_cours_autorises`).
- Idempotence Stripe (`stripe_session_id` unique).
- Cohérence compta : tout paiement (carnet, séance, échéance) reste dans `paiements`
  → une seule source pour Revenus / export.
