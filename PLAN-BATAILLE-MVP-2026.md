# PLAN DE BATAILLE — « Un MVP fiable et connu » (2026-07-25)

> **Mission** : rendre IziSolo fluide et fonctionnel. Traque des bugs, des
> mauvaises routes, des complexités inutiles nées des constructions
> successives. **Rien d'autre** : pas de nouvelle feature pendant la
> campagne (une exception : la restructuration à 2 plans, §5).
>
> **Hors périmètre jusqu'à la fin** : Stripe SaaS et les prix des
> abonnements (Colin travaille encore dessus) → Phase 4, dernière.
>
> **Document de pilotage** : on coche ici (§7) batch par batch. Chaque
> batch est divisible en lots (A, B, C…) au moment de son audit, comme
> pour l'audit résa du 25/07.

---

## 1. Diagnostic — pourquoi on trouve des bugs à CHAQUE vérification

Ce n'est pas de la malchance. Cinq causes structurelles, toutes prouvées
par les audits passés. La campagne attaque les **causes**, pas seulement
les symptômes — sinon on écopera indéfiniment.

1. **Les échecs sont silencieux par défaut.** Supabase/PostgREST ne jette
   pas : colonne fantôme (annulation élève morte depuis v21 sans un log),
   RPC jamais créée mais appelée, `.is(uuid)` invalide, `reply_to` ignoré
   par Resend pendant des mois. Recensement du jour : **31 `catch` vides
   dans 22 fichiers**, et **45 routes sur 60 hors du standard `withRoute`**
   (30 ont quand même `requireAuth`/`reportError`, mais chacune à sa façon).
   Tant qu'une écriture peut échouer sans bruit, un bug reste invisible
   jusqu'au retour utilisateur.
2. **Doubles sources de vérité.** Délai d'annulation dans 2 fichiers
   synchronisés à la main (`regles-metier` vs `regles-annulation` — le
   conflit latent est documenté depuis l'audit technique), prefs de
   notifs en 2 systèmes, capacité comptée de 4 façons avant v74, 2 totaux
   sur Revenus. Chaque duplication diverge un jour = bug garanti.
3. **Filet de non-régression partiel.** Bonne nouvelle du recensement :
   la CI exécute déjà 4 specs métier pures en BLOQUANT (pointage-delta,
   carnet-resolution, notif-prefs, regles-annulation) + le build. Mais le
   lint est `continue-on-error` (17 erreurs préexistantes qui masquent
   les nouvelles) et les 9 autres specs (navigateur/DB) ne tournent qu'en
   local, à la main.
4. **La promesse a couru devant le produit.** Mode équipe (retiré),
   Studio `comingSoon` promu, scope « créneau » en messagerie, grilles de
   prix divergentes. Une promesse sans chemin de code = un bug perçu par
   l'utilisatrice.
5. **Constructions jamais dégraissées.** ~69 000 lignes de JS applicatif,
   **8 fichiers > 1 000 lignes** (record : `parametres/page.js` 3 513),
   3 fichiers de règles, Tailwind chargé dans le CSS (`globals.css` l.1)
   pour ~0 classe utilisée, SDK Sentry no-op câblé dans 10 fichiers,
   `lib/alertes.js` sans aucun import, vestiges démo. Le code mort cache
   les vrais chemins et ralentit chaque audit.

**Définition de la victoire** (« MVP fiable et connu ») : chaque flux
cœur a été (1) audité, (2) réparé, (3) vérifié en live sur le démo,
(4) verrouillé par un test ; `erreurs_app` calme sur 7 jours glissants ;
CI verte et bloquante ; 2 plans étanches ; la landing ne promet que ce
qui existe. Alors seulement : Stripe, prix, prospection.

---

## 2. Doctrine (règles de combat)

- **Un batch = une session** : audit ciblé → lots de fixes commités par
  lot → vérification live (compte démo, mobile si flux élève) → verrou
  (spec ajoutée à la CI si zone à risque) → mise à jour de la bible.
  C'est la méthode qui a fait ses preuves 3 fois (paiements 22/07,
  fiches/comptes 23/07, résa 25/07).
- **Ouvrir le radar d'abord** : chaque batch commence par lire
  `/admin/erreurs` (`erreurs_app`, vivante depuis v71). Les erreurs
  réelles de Maude/Manon priment sur toute intuition.
- **Frugalité Fable** (consigne Colin) : analyses ciblées, 1 à 3 agents
  max par audit, jamais de fan-out massif ; campagne étalée en sessions
  courtes plutôt qu'un marathon qui grille le quota et fait basculer sur
  Opus.
- **Zéro écriture aveugle** : tout `error` Supabase vérifié, toute route
  touchée migrée vers `withRoute`, tout email via `sendEmail()`. Après
  toute migration : `node scripts/verifier-selects.mjs`.
- **Les anti-patterns de la bible (§12) sont la checklist de revue** de
  chaque lot (colonnes fantômes, `replyTo`, `.is()`, `time` → slice(0,5),
  heure de Paris, etc.).
- **On assume par écrit** ce qu'on ne corrige pas (comme les « restes
  assumés » de l'audit résa) — un risque connu et noté n'est plus une
  mine.

---

## 3. Ordre de bataille

Vue d'ensemble (détail ensuite) :

| Phase | Batches | Objet | Effort estimé |
|---|---|---|---|
| **P0 Fondations** | B0a, B0b | Radar, solde des migrations, CI qui mord | 1 session (~3 h) |
| **P1 Traque** | B1a → B1g | Vérifier flux par flux tout ce qui n'a jamais été audité | 6-7 sessions (~22-28 h) |
| **P2 Dégraissage** | B2a → B2d | Tuer la complexité qui fabrique les bugs | 4 sessions (~15-20 h) |
| **P3 Deux plans** | B3a → B3c | Produit honnête à 2 plans (sans les prix) | 2-3 sessions (~8-10 h) |
| **P4 Stripe & prix** | — | Tout à la fin, avec Colin | ~4-6 h |

Ordre recommandé : P0 → P1 → P2 → P3. Les batches d'une même phase sont
permutables ; P2a peut remonter juste après B1a si l'audit messagerie
touche trop aux règles.

### P0 — Fondations (avant de traquer, empêcher les bugs de se cacher)

**B0a — Radar & solde** (~1-2 h + actions Colin)
- Lire et trier `erreurs_app` (premières vraies erreurs de prod depuis le
  24/07) → alimenter les batches P1 avec du réel.
- Solder les actions en attente : appliquer **v72** (segments /clients +
  rate-limit partagé + drop démo) et **v61** (prefs cloche unifiées) puis
  `verifier-selects` ; retirer `DEMO_SECRET` de Vercel ; exécuter
  `fix-desarchivage-fantome.sql` (fiches de Maude).
- Hygiène repo : statuer sur les non-versionnés (`bible/IziSolo_Growth_OS_v1`,
  `ressources/visuels`, `izisolo-audit-strategique-2026.pdf`,
  `seed-mockup-camille.sql` → .gitignore ou rangement hors repo) ; purger
  `public/worker-XX3bu9_wdEEdksyIYhfb5.js` (artefact PWA orphelin, à
  gitignorer avec son pattern).

**B0b — CI verrouillée** (~1-2 h)
- Lint **bloquant** : corriger les 17 erreurs préexistantes (globals
  navigateur de push-client, workers PWA générés → ignores ESLint
  propres, pas des désactivations sauvages), puis retirer
  `continue-on-error`.
- Confirmer le gate des 4 specs métier ✓ (déjà en place) ; convention :
  **chaque batch qui répare une zone financière ajoute sa spec Node pure
  au gate**.
- Documenter le rituel E2E navigateur local (`--workers=1` sur Windows,
  quand relancer) dans la bible — pas de E2E navigateur en CI pour
  l'instant (flaky, coût > bénéfice).

### P1 — Traque, flux par flux (rendre le MVP « connu »)

Méthode identique pour chaque batch : radar `erreurs_app` → audit ciblé
(1-3 agents read-only) → lots de fixes → vérif live démo → verrou → bible.

**B1a — Messagerie & emails sortants** (~4-6 h) — jamais auditée en profondeur, 🟡 carte de chaleur
- Conversations 1-à-1, canaux par cours, announce/mailing groupé, upload,
  réactions (v48 fraîchement appliquée — jamais vérifiée en live), unread,
  digest 16h.
- Points connus à instruire : double système de prefs
  (`notif_messagerie_canal` vs `notif_prefs.message.push`), instant-email
  mort, scope « créneau » promis mais absent (→ décision D3), digest sans
  groupes-cours.
- Emails : cohérence de TOUS les gabarits après le fix `replyTo` global,
  blacklist v39 enfin vivante à re-tester (unsubscribe bout-en-bout).

**B1b — Agenda & récurrences** (~4-6 h) — le cœur d'usage quotidien de Maude
- Création/édition de série, exceptions, fériés/vacances, parité,
  « Prolonger la série » (récent, un seul cas réel testé), édition d'une
  occurrence vs la série, duplication, `tarif_unitaire` porté par cours.
- Timezone Paris systématique (l'anti-pattern `time` + `sv-SE` a déjà
  mordu deux fois).
- Cohérence agenda ↔ pointage ↔ portail (une séance modifiée/annulée se
  reflète partout ?).

**B1c — Sondages planning** (~2-3 h) — jugés 🟢 mais jamais vérifiés
- Vote élève depuis l'espace, conversion gagnants → cours en 2 clics,
  pagination, clôture, notifs associées.

**B1d — Onboarding prof & première heure** (~3-4 h) — l'activation, critique pour un MVP
- Signup → onboarding (voice-fill Claude : dégradation propre sans clé ?)
  → checklist dashboard → premier cours → premier élève → premier
  pointage. Import CSV de fin d'onboarding. Écran élève dans /onboarding.
- Chaque friction notée = fix ou item produit listé (lien avec la mémoire
  « frictions d'activation » : récurrence non adoptée, drop-off ajout élèves).

**B1e — Parcours élève bout-en-bout, mobile réel** (~2-3 h) — walkthrough de VALIDATION (la zone vient d'être réparée, on prouve)
- Portail → essai → résa → espace → annulation → liste d'attente →
  promotion → PWA installée (manifest par studio) → magic link → notifs.
  Sur mobile (ou viewport mobile + vrai téléphone pour la PWA).
- Objectif : zéro surprise sur le chemin que verront les élèves de Maude.

**B1f — Revenus, reçus & exports** (~3-4 h) — 🟡 carte de chaleur + restes assumés du 25/07
- Les 2 totaux de Revenus réconciliés (une seule formule), récap
  financier vs absent souple, échéanciers, « À percevoir » sous tous les
  angles.
- **Reçu/justificatif côté prof** (aujourd'hui élève-only) + numérotation
  séquentielle — la prof doit pouvoir sortir un justificatif propre.
- Exports CSV comptable et élèves : round-trip re-testé.

**B1g — Crons & tâches de fond** (~2-3 h)
- Les 4 crons : pagination (requêtes 1000-cap signalées le 25/07),
  idempotence (re-run sans double envoi), fenêtres horaires, erreurs
  remontées à `erreurs_app`.
- Gating plan du cron `notifs-eleves` (fuite Pro→Solo connue) — préparé
  ici, tranché en P3.

### P2 — Dégraissage (la complexité qui FABRIQUE les bugs)

**B2a — Une seule loi d'annulation** (~4-6 h) — la double source la plus dangereuse
- Fusionner `lib/regles-metier.js` (164 l.) + `lib/regles-annulation.js`
  (86 l.) en un module unique ; clarifier la frontière avec `lib/regles.js`
  (352 l., SI/ALORS custom). Consommateurs cartographiés (12 fichiers :
  reserver, reserver-serie, annuler ×2, promotion, notif-eleve-regle,
  Pointage, CasATraiter, Espace, CoursReservation, 2 onglets paramètres).
- Étendre la spec `regles-annulation.spec.js` en verrou du module fusionné
  AVANT la fusion (filet), puis fusion à comportement constant.

**B2b — Un seul système de prefs de notifs** (~2-3 h)
- Solder v61 côté code (retirer les vestiges du sous-onglet « Général »,
  colonnes `notif_*` documentées vestigiales), replier
  `notif_messagerie_canal` dans `notif_prefs`, tuer l'instant-email mort
  (ou le brancher, décision au vu de B1a).

**B2c — `withRoute` pour tout le monde** (~5-7 h) — mécanique mais rentable : tue une classe entière de bugs
- Migrer les ~45 routes restantes par familles (messagerie ×8, profile ×3,
  admin ×3, portail publiques, stripe/webhooks avec leur auth propre,
  crons ×4 — étendre `withRoute` pour `auth:'cron'`/`auth:'webhook'` si besoin).
- Vider les 31 `catch` muets : soit gestion réelle, soit `reportError`
  + commentaire d'intention. Zéro `catch {}` à la fin.
- Verrou : petit script/spec qui liste les routes sans `withRoute` et
  échoue si la liste grandit (ratchet).

**B2d — Purge & découpe** (~4-6 h)
- Code mort : `lib/alertes.js` (0 import — supprimer), `lib/client-fields.js`
  (1 référence relative à vérifier dans clients/nouveau), vestiges démo,
  écrans/blocs morts.
- **Tailwind out** (décision déjà actée) : retirer `@import "tailwindcss"`
  de `globals.css` + postcss + deps. ⚠️ Le preflight Tailwind reset des
  styles de base → vérification visuelle des pages clés avant/après.
- SDK Sentry no-op : décision D4 (retirer les 3 configs +
  instrumentation + 10 refs, `reportError` couvre) — reco : retirer.
- Découpe des monolithes, par ordre de douleur : `parametres/page.js`
  (3 513 l. → un fichier par onglet), puis si le temps :
  `FicheClientClient.js` (2 239), `CoursDetailClient.js` (2 170),
  `PointageClient.js` (2 154). Découpe MÉCANIQUE (déplacement, zéro
  changement de comportement), un commit par extraction.

### P3 — Deux plans, une promesse honnête (SANS les prix)

Détail de la proposition au §5. Batches :

**B3a — Matrice & plan-guard « capacités »** (~3-4 h)
- Implémenter la matrice §5 dans `constantes.js` + `plan-guard.js` :
  différenciation par **capacités** (pas par quotas), helper unique
  `can(profile, 'boucle_eleve')` au lieu de checks `plan === 'pro'`
  éparpillés.
- Clés DB conservées : `solo` = Essentiel, `pro` = Complet ; `premium`
  **mappé → pro** dans `effectivePlan()` (aucune migration, même astuce
  que premium→Studio) ; retrait de Studio de `PUBLIC_PLANS`, des cartes
  et de `FEATURE_TO_MIN_PLAN` (`brandingEmail` → backlog).
- Trial 14 j = plan Complet (inchangé).

**B3b — Étanchéité** (~2-3 h)
- Boucher les fuites de gel : un compte `trial_expired` ne doit plus
  pouvoir créer clients/cours/offres par inserts navigateur (RLS ou
  triggers étendus au-delà de v54).
- Gater le cron `notifs-eleves` sur le plan effectif (préparé en B1g).
- Upsell visible : masquer/griser photo-import pour les non-Complet
  (déjà validé par Colin).

**B3c — Landing & pages alignées** (~2-3 h)
- 2 cartes au lieu de 3 (Studio retiré partout : Sections, Pricing,
  Calculateur, FAQ, personas, comparaison), features listées = matrice
  exacte, prix en placeholders tant que Colin n'a pas tranché.
- Passe « promesse = produit » sur toute la landing (le mode équipe a
  déjà été retiré ; on vérifie qu'il ne reste rien d'autre de fantôme).

### P4 — Stripe & prix (LA FIN, avec Colin)

Séquence déjà scriptée (`scripts/setup-stripe-saas.mjs`, tranche 1 du
23/07) : répétition en test → live → env vars Vercel → redéploiement →
checkout E2E avec coupon → webhook → Customer Portal → visibilité billing
dans l'admin → emails lifecycle. Les montants et noms marketing des 2
plans se décident ici.

---

## 4. Recensement du 25/07 (chiffres de référence)

Pour mesurer le progrès en fin de campagne :

| Indicateur | Valeur au 25/07 | Cible fin de campagne |
|---|---|---|
| Routes API | 60, dont 15 sur `withRoute` | 60/60 `withRoute` (ou équivalent webhook/cron) |
| `catch` vides | 31 (22 fichiers) | 0 |
| Fichiers de règles | 3 | 1 module |
| Systèmes de prefs notifs | 2 | 1 |
| Fichiers > 1 000 lignes | 8 (max 3 513) | ≤ 4 (max < 1 500) |
| Specs bloquantes en CI | 4 (sur 13) | 8+ (toutes les Node pures) |
| Lint CI | non bloquant (17 err.) | bloquant, 0 erreur |
| Plans dans le code | 4 (free/solo/pro/premium) | 3 (free/solo/pro), premium mappé |
| Tailwind | chargé, ~0 usage | retiré |
| Migrations en attente | v72, v61 | 0 |

---

## 5. Proposition — les 2 abonnements (mécanique maintenant, prix en P4)

**Principe directeur** : *Essentiel = ton cahier, en mieux. Complet = tes
élèves entrent dans la boucle.* Tout ce qui fait **agir l'élève**
(réserver, annuler, payer en ligne, recevoir des notifs, voter, écrire)
est Complet. Tout ce que la prof fait **seule** est Essentiel. Une seule
frontière → un seul interrupteur dans le code → un gating simple à
comprendre, à vendre et à maintenir. Exit le 3e plan : Studio disparaît
(vidéos/white-label → backlog, sans carte grisée).

| Capacité | Essentiel (`solo`) | Complet (`pro`) |
|---|---|---|
| Portail public vitrine : page studio, planning affiché, PWA installable | ✅ | ✅ |
| Élèves illimités, fiches, champs perso, import/export CSV | ✅ | ✅ |
| Agenda, cours, récurrences, lieux illimités (v66) | ✅ | ✅ |
| Pointage 1-clic + carnets/abos gérés à la main | ✅ *(D1)* | ✅ |
| Mini-compta : encaissements manuels, « à percevoir », export comptable | ✅ *(D2)* | ✅ |
| Réservation en ligne + annulation élève + règles d'annulation | ❌ | ✅ |
| Espace élève connecté (compte, historique, notifs, rappels J-1) | ❌ | ✅ |
| Cours d'essai en ligne, liste d'attente, cours privés sur invitation | ❌ | ✅ |
| Messagerie, mailing groupé, sondages planning | ❌ | ✅ |
| Paiement en ligne élèves (Stripe Payment Link) | ❌ | ✅ |
| Import fiche par photo (IA) | ❌ | ✅ |

- Trial 14 j = Complet. À expiration sans abonnement : lecture seule +
  export (RGPD), zéro création (cf. B3b).
- Un studio qui rétrograde Complet → Essentiel ne perd **aucune donnée** :
  les surfaces élèves se ferment proprement (portail passe en vitrine,
  message clair côté élève), les données restent.

**Décisions attendues de Colin** :
- **D1** — Carnets/abos manuels dans Essentiel ? **Reco : OUI**, sinon le
  pointage promis est vide de sens pour une prof yoga (décompte = le cœur
  du geste). La différenciation est la boucle élève, pas le carnet.
- **D2** — Export comptable CSV dans Essentiel ? **Reco : OUI** (« mini
  compta » sans export = promesse boiteuse). L'export RGPD élèves reste
  gratuit pour tous, inchangé.
- **D3** — Scope « créneau » en messagerie : construire ou retirer la
  promesse de l'UI ? **Reco : retirer** (anti-usine à gaz), à re-proposer
  si une utilisatrice le demande.
- **D4** — SDK Sentry no-op : retirer complètement ? **Reco : OUI** en
  B2d (`reportError`/`erreurs_app` couvre, et un DSN futur se rebrancherait
  sur une intégration fraîche).
- **D5** — `bible/` et `ressources/` à la racine du repo : .gitignore ou
  déplacement hors du repo ? **Reco : .gitignore** (comme `prospection/`).

---

## 6. Ce qu'on ne fait PAS pendant la campagne

- Vidéos/visio, white-label, SMS (reste `SMS_ENABLED=false`), mode
  équipe : hors périmètre, backlog.
- Pas de refonte design, pas de nouvelle page, pas de renommage marketing
  (les noms des 2 plans se décident avec les prix en P4).
- Pas d'application de `migrations-v2-multiuser.sql` (toujours interdite).
- Pas de méga-audits multi-agents : la frugalité Fable est une règle de
  combat, pas une option.

---

## 7. Suivi de campagne

- [x] **B0a** Radar & solde — FAIT 2026-07-25 (commit c912652). Trouvaille : le catch de `withRoute` n'écrivait PAS dans `erreurs_app` (Sentry no-op + console.error) → les 15 routes standard étaient invisibles au radar ; réparé (reportError awaité sur le chemin d'erreur + contexte.route). Pipe prouvé par ligne témoin. 6 fiches désarchivées en prod (5 Maude + 1 test, vérifié). Hygiène repo ✓. **Reste côté Colin : appliquer v72 + v61, retirer DEMO_SECRET de Vercel.**
- [x] **B0b** CI verrouillée — FAIT 2026-07-25 (commit b3ba170). 11 erreurs lint → 0 (globals navigateur/worker + disable-comment mort), `continue-on-error` retiré, no-console off sur scripts/tests. Restent 995 warnings no-unused-vars (ratchet → B2d). 75/75 specs métier vertes, build vert.
- [x] **B1a** Messagerie & emails sortants — FAIT 2026-07-25 (2 agents, 30 findings vérifiés, ~25 corrigés). 🔴 Conversations de groupe : membres FIGÉS à la création + insert avalé (une annonce « à tous les inscrits » pouvait ne toucher personne pendant que l'UI disait « Envoyé ! ») → sync des membres à chaque accès, erreurs vérifiées, annulés exclus. Autres gros fixes : announce continue-on-error + réponse honnête (fin des doublons au re-clic), push aux groupes-cours (avant : AUCUN canal ne prévenait), digest unifié sur `notif_prefs.message.email` (fin du double système `notif_messagerie_canal` sans UI + promesse fantôme du pied de mail + branche 'instant' morte ; dédup par studio pour l'élève multi-studios), fuite cross-studio de la liste élève filtrée, PDF rendus en chip fichier (fin de l'image cassée), read marqué en continu (badge qui redescend), tempête réactions ÷6, « Messages précédents » (cap 100), res.ok gardé partout (liste/cloche/badge ne se vident plus sur une 500), rate-limits announce+upload, `addRandomSuffix` blob, Enter picker gardé, 100dvh élève. Hors-messagerie : `reserver-serie` ne chargeait pas `regles_metier` → la règle « bloquer sans carnet » ne s'appliquait JAMAIS aux séries (corrigé). Vérifié en vrai navigateur (6 convs, bulles, annoncer) — le proxy du panneau preview tronque le streaming SSR, ne pas s'y fier. **Restes assumés** : accusé « Lu » non branché (donnée dispo), digest sans groupes-cours (push couvre), pagination >1000 digest → B1g, gate UI plan onglet Annoncer → B3b, compression image client, media objets {url,kind,name} en écriture.
- [x] **B1b** Agenda & récurrences — FAIT 2026-07-25 (2 agents, ~40 findings, ~30 corrigés, commits 6d6a9b6 + 5b6c0d2). 🔴×7 : parité bimensuelle flippée par l'heure d'été (prouvé par exécution — série « 1 sem./2 » sur la mauvaise semaine après fin mars, fix `semainesEntre` jours civils + spec verrou) ; select récurrences sans domicile/client_id → fix « séries à domicile » du lot C mort-né ; **sièges fantômes v74 sur 6 surfaces** (portail « Complet » à tort = places vendables perdues, page résa poussant vers la liste d'attente pour une place LIBRE, détail prof cachant « Promouvoir », liste/agenda/stats pointage gonflés) → `lib/presences.js` = formule unique + spec en CI ; séance annulée 100 % pointable (re-décompte carnets) → verrou + bandeau ; résa résolue « annulée » affichée « Inscrit·e » avec bouton qui SANCTIONNAIT → badge + garde 409 ; duplication perdant tarif_unitaire (atelier 25 € → décompte carnets) et visibilite (privé → PUBLIC). Aussi : borne génération 24 mois affichée (cap 500 j muet), couverture vacances/fériés 2027 avertie, dédup prolongation sur dates réelles (+ anti re-clic doublons), suppressions fail-closed avec réservations comptées + renvoi vers « Annuler », promotion liste d'attente câblée sur résolution de cas (promesse UI enfin vraie), annulation agenda avec feedback, « aujourd'hui » en heure de Paris partout, pause de série honnête. **Restes assumés** : déplacement d'occurrence sans notif aux inscrits (feature email à créer — incohérence produit vs annulation) ; re-réservation impossible après declinee (dédup /reserver, chantier route+RPC dédié) ; promotion auto sur hausse de capacité / suppression de présence (non câblée) ; requêtes >1000 non bornées cours/agenda → B1g ; erreurs Supabase muettes sur les fetchs agenda/cours pages → B2c ; exceptions de série ressuscitées à la prolongation + « cours frère » le plus récent qui contamine (documentés) ; schéma recurrences sur-promet (date_fin NULL, intervalle N, jour_mois — vestiges → B2d).
- [x] **B1c** Sondages planning — FAIT 2026-07-25 (1 agent, 14 findings, ~10 corrigés, commit 4d962b0). 🔴×2 : conversion créneau→cours datée en UTC (série hebdo générée le MAUVAIS jour entre minuit et 2 h) ; **RPC `fusionner_clients` (v68) référençait la table fantôme `sondage_reponses`** → toute vraie fusion de doublons rollbackait en 42P01 (la « vérif live » de v68 n'avait testé que les gardes) → **migration v75 à appliquer + tester une vraie fusion sur le démo**. Intégrité des votes réparée : re-vote = bulletin remplacé en entier, plus de double comptage anonyme+connecté, rate-limit à borne fixe (RPC v72), compteurs répondants cohérents liste/détail, clôture en heure de Paris, création compensée, échecs clore/supprimer visibles. **Restes assumés** : pré-remplissage des votes au re-vote (GET à créer — le remplacement complet rend le comportement cohérent en attendant), confirmation email des votes anonymes (bourrage lent toujours possible → si les sondages pilotent de vraies décisions, chantier dédié), `from_sondage` jamais consommé (pas de marqueur « converti », re-clic = 2e série possible), **promesse landing « votent depuis leur espace » fausse** (aucune surface sondage dans l'espace élève, zéro notification — diffusion 100 % manuelle → B3c passe promesse ou mini-lot surface espace), résultats sans refresh (« temps réel » généreux), gate plan UI → B3b, embed réponses non borné → B1g.
- [ ] **B1d** Onboarding prof & première heure
- [ ] **B1e** Parcours élève bout-en-bout (mobile)
- [ ] **B1f** Revenus, reçus & exports
- [ ] **B1g** Crons & tâches de fond
- [ ] **B2a** Fusion des règles d'annulation
- [ ] **B2b** Prefs de notifs unifiées
- [ ] **B2c** `withRoute` partout + zéro catch muet
- [ ] **B2d** Purge & découpe (Tailwind, Sentry, monolithes)
- [ ] **B3a** Matrice 2 plans & plan-guard capacités
- [ ] **B3b** Étanchéité (gel, crons, upsell)
- [ ] **B3c** Landing 2 cartes
- [ ] **P4** Stripe & prix (avec Colin, à la fin)

*Rituel de fin de batch : commits par lot → vérif live démo → verrou CI si
zone financière → cocher ici → mettre à jour la bible (section 10 + §12
anti-patterns si leçon nouvelle).*
