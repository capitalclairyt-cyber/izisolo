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
- [x] **B1d** Onboarding prof & première heure — FAIT 2026-07-25 (1 agent, 16 findings, ~13 corrigés, commit 0dcd113). 🔴 : collision `studio_slug` UNIQUE non gérée à l'onboarding (la 2e « Studio Yoga » bloquée à vie sur « vérifie ta connexion ») → `lib/slug-studio.js` partagé (fallback + dédoublonnage). Oranges : « Passer » créait quand même l'offre du template ; insert offre muet ; UPDATE profil 0-ligne « réussi » (boucle infinie wizard↔dashboard, + réordonnancement de /api/eleve/compte) ; garde d'onboarding sur `studio_slug` (une prof nommant son studio « Mon Studio » re-onboardait à vie) ; re-visite du wizard = slug REGÉNÉRÉ (liens portail cassés) → redirect ; **porte des profs fantômes rouverte par le magic link du login** (`shouldCreateUser:false` manquant) refermée ; open redirect `?redirect=` ; « email non confirmé » ≠ « mot de passe incorrect » ; prefill métier DEFAULT 'yoga' retiré. Jaunes : PKCE cross-device = « Email confirmé ! Connecte-toi » ; relance trial J-1 honnête (« expire le {date} ») + fallback email de connexion ; « 4 étapes ». **Trouvaille méta : le « voice-fill onboarding » promis par la bible n'a JAMAIS existé dans le code** (bible corrigée — seuls consommateurs IA réels : photo-import, support, assistant portail). **Restes assumés** : counts de la checklist dashboard sans check d'erreur → B2c ; messages register/login à unifier avec un helper → B2d.
- [x] **B1e** Parcours élève bout-en-bout (mobile) — FAIT 2026-07-25 (walkthrough Playwright vrai navigateur, viewport 390×844, build prod local → prod, studio démo ; commit 6e55297). **8/8 étapes vertes, zéro requête en échec** : portail (privé masqué) → résa invitée → connexion élève → espace (badge) → annulation self-service RÉELLE → messages → manifest PWA → cours privé 404. Bug dormant trouvé PAR la capture réseau du walkthrough : le header du portail interrogeait `profiles` depuis le navigateur (JWT élève) → 406 RLS silencieux → **le prénom ne s'affichait jamais et le badge messages non lus du portail était mort depuis toujours** → GET `/api/portail/[slug]/profil` + assertion dédiée. Outillage réutilisable : `parcours-eleve-live.spec.js` (local, se skippe sans fixtures) + scripts prepare/cleanup (plan démo pro temporaire restauré, données de test purgées, vérifié 0 restante). **Signal vitrine : le portail démo était VIDE** (tous les cours du seed passés) — 3 cours futurs re-seedés, laissés en place. **À trancher par Colin** : le compte démo est en plan `free` avec trial expiré depuis mai → toute démo à un prospect montre les bandeaux de gel ; le passer durablement en `pro` via /admin/users ?
- [x] **B1f** Revenus, reçus & exports — FAIT 2026-07-25 (1 agent, ~24 findings, ~18 corrigés, commit 5e0e4d3). 🔴×4 : « À percevoir » comptait les cours ANNULÉS et les résas annule/declinee (miroir argent de v74) ; **CSV comptable tronqué à 1000 lignes en silence** (les mois récents manquaient) ; **reçu PDF forgeable pour un paiement jamais réglé** (garde UI-only → 403 route) ; **fusion de fiches : 2e bug caché derrière v75** (email copié avant suppression du doublon → 23505 → la fusion n'a JAMAIS marché) → **v76 à appliquer + retest scripté**. Oranges : deux totaux réconciliés (même assiette), refund Stripe partiel ne bascule plus tout en « overdue » + notes concaténées, delete abo détache l'encaissé (compta rétroactive stable), delete paiement lié refusé, injection formule Excel neutralisée + séparateur ';' FR + bornes Paris, erreurs lues + .in() chunké sur la page argent, récap pointage sans absent souple, cloche « pense au remboursement » sur annulation d'une séance réglée, fiches Fidèle/Inactif finançables, date_encaissement posée. **Restes assumés** : mentions légales du reçu (TVA 293 B en dur, pas de SIRET — décision produit à trancher), **reçu côté PROF + numérotation séquentielle = feature à construire**, échéances futures écran vs export, cap 1000 page Revenus (agrégat SQL un jour), fuite de gel insert paiement navigateur → B3b, assiettes mortes RevenusClient → B2d.
- [x] **B1g** Crons & tâches de fond — FAIT 2026-07-25 (1 agent, ~20 findings, ~16 corrigés, commit 65b9d05). 🔴×2 dans la couche anti-doublon elle-même : **CHECK v19 sans 'push' → TOUS les push de crons élèves morts en silence depuis v59** (prouvé par sonde 23514 ; **migration v77 à appliquer**, claim distingue désormais doublon/erreur) ; **dédup des règles SI/ALORS sur related_id NULL → « une fois par règle » = un email par JOUR** (relatedId=regle.id). Oranges : opt-out élève ignoré en PASS 1 (notif_prefs manquant du select), contexte présences refondu (fenêtre 365 j !inner paginée — « tu nous manques » aux habituées + règles Régulier mortes), alerte pro dédupée ref_key, archivées exclues, relance trial fiable (flag posé seulement si email PARTI + corps honnête), promotion prospects batchée, purge liste_attente paginée, rappels J-1 chunkés + **replyTo la prof**. Claims failed re-clamés au run suivant. SMS honnête (kill-switch respecté, action grisée, prix unifié 0,08). **Table gating plan × cron documentée** (notifs-eleves = Pro non gaté ; rappel J-1 = décision produit) → **B3b**. **Restes assumés** : coût/timeout multi-centaines de studios (requêtes par profil → précharger/curseur), commentaire « plafond Hobby » vs 4 crons (vérifier le plan Vercel au dashboard), recharge de carnet qui ne re-déclenche pas « crédits faibles » (époque dans related_id un jour).
- [x] **B2a** Fusion des règles d'annulation — FAIT 2026-07-25 (0 agent, tout en session ; commits b04e77b → 79033d8). **Méthode verrou-d'abord respectée** : spec `regles-annulation.spec.js` étendue 8→26 tests contre les modules ACTUELS (défauts, JSONB partiels, choix null conservé, délai 0, string rejetée), commit, PUIS fusion à comportement constant (26/26 identiques avant/après). **Une seule loi** : `lib/regles-annulation.js` absorbé par `lib/regles-metier.js` (= LA politique du studio : 7 cas + délais, les 2 JSONB documentés en en-tête), 5 imports re-pointés (spec, CoursReservationClient, EspaceClient, reserver, annuler), fichier supprimé. **Conflit latent AUDIT-TECHNIQUE §3 tué avant de naître** : action dormante `annulation_libre` supprimée de `lib/regles.js` (bientot:true depuis v8, option disabled dans le builder → aucune règle stockée possible, 0 consommateur runtime — elle aurait porté un 2e `delai_heures`) ; frontière gravée dans les 2 en-têtes (regles.js = automations SI/ALORS, AUCUNE loi d'annulation, une automation LIT le module). **3 lectures brutes divergentes branchées sur les helpers** : PointageClient (inline `|| {delai_heures:24}` → JSONB partiel `{message}` = « jusqu'à undefinedh » / bandeau masqué en silence), assistant portail (`|| 24` écrasait un délai 0 en « 24 h »), paramètres (défaut 24 dupliqué ; message custom volontairement lu brut = placeholder input). Au passage : label « SMS auto (0,10 €) » en dur → `SMS_PRIX_UNITAIRE` (survivant de B1g). Radar `erreurs_app` : 0 erreur/30 j à l'ouverture. 101/101 specs CI + build verts. **Restes assumés** : le « message affiché à l'élève » (paramètres annulation) n'est en réalité rendu QU'AU pointage côté prof (bizarrerie produit à trancher un jour, pas un bug B2a) ; `regles_par_type` sans UI (post-launch — helpers et spec prêts) ; actions dormantes `reservation_hebdo`/`acces_prioritaire` toujours « bientôt » dans le builder (promesse UI sans code) → passe promesse B2d/B3c ; nota : la config launch.json du build prod local (B1e) a voyagé dans le commit du lot B.
- [x] **B2b** Prefs de notifs unifiées — FAIT 2026-07-25 (commit cf2092a, 0 agent). Constat : v61 + B1a avaient déjà fait l'essentiel (cloche via `notif_prefs` canal inapp ; digest unifié sur `notif_prefs.message.email` ; branche 'instant' tuée en B1a — décision « tuer l'instant-email » entérinée : aucun envoi instantané n'a jamais existé). Restait la tuyauterie morte de parametres : les 4 états `notif_*` (v10) encore CHARGÉS (2 sites) et RÉÉCRITS à chaque sauvegarde sans plus aucun rendu ni lecteur → états + loads + payload + CSS orphelin `.notif-general` purgés (le fichier perd 21 lignes et des warnings lint). **Un seul système** : `notif_prefs` (profiles + clients, catalogue `lib/notif-prefs.js`, spec CI `notif-prefs.spec.js`). Colonnes vestigiales documentées (0 lecteur, 0 writer) : `notif_nouveau_client`/`paiement_retard`/`carnet_epuise`/`abonnement_expire` (v10) + `notif_messagerie_canal` (v24, profiles ET clients). Radar 0 erreur/30 j. 101/101 specs + build verts. **Restes assumés** : DROP des 5 colonnes vestigiales non urgent (selects en `'*'`, aucun risque 42703) — à glisser dans une future passe SQL si l'occasion se présente ; accusé « Lu » non branché et digest sans groupes-cours restent les restes B1a.
- [x] **B2c** `withRoute` partout + zéro catch muet — FAIT 2026-07-25 (0 agent, 8 lots, commits jusqu'à ~103 specs vertes ; radar 0 erreur/30 j à l'ouverture). **59/59 routes sur withRoute** (le recensement disait 60 — la 60e était la route démo v62 déjà supprimée) et **0 catch strictement vide** : les DEUX allowlists du ratchet sont VIDES. Méthode verrou-d'abord : `route-standards.spec.js` écrite AVANT toute migration (2 lois « qui ne peuvent que rétrécir », liste honnête : une entrée migrée non retirée fait AUSSI échouer — prouvé en situation réelle, elle a attrapé l'oubli `unsubscribe` au lot 5), ajoutée au gate CI (6 fichiers de specs bloquants désormais). `withRoute` étendu : `auth:'admin'` (requireAuth+isAdminEmail centralisés). Migration par familles à comportement constant : messagerie ×7, notifications ×2, profile ×3, cas ×2, divers ×5, admin ×3, crons ×4, portail public ×8 (reserver 650 l. — coque seule, antibot/zod/RPC intacts au byte), leads/unsubscribe/portail-login/og/sondage, Stripe ×4 (webhooks : l'auth EST la signature sur body brut, commentaire gravé), support streaming (Response stream passe le wrapper). Prises au passage : mark-read vérifie ses UPDATE (badge fantôme → 500+erreurs_app), refus d'essai vérifié (demande restait « en attente » pendant que l'UI confirmait), DELETE push vérifié, **admin/essais/[id] démasquée** (chemin /admin/ mais c'est la route du PRO → auth:'active' + avertissement), promotion liste d'attente avalée à l'annulation → reportError (place libérée pouvait rester vide sans trace), marqueur d'idempotence Stripe → reportError. 20 catch restants = intention déclarée (fail-open commentés). **Incident de méthode assumé** : le commit du lot 5 est parti malgré un ratchet rouge (chaînage `;` au lieu d'un `if` sur le code de sortie — variante de l'anti-pattern « gate avalé » §12) ; rattrapé au commit suivant, gates conditionnés ensuite. **Restes assumés** : erreurs admin/support-ticket passées de texte brut à JSON withRoute (401/403 plus corrects, UIs sur res.ok — changement de forme voulu) ; requireAuth charge le profil pour checkout/portal/support (1 requête de plus, négligeable) ; validations zod locales des routes non repliées sur l'option `schema` du wrapper (unification opportuniste, pas un bug) ; ~980 warnings no-unused-vars → ratchet B2d.
- [x] **B2d** Purge & découpe (Tailwind, Sentry, monolithes) — FAIT 2026-07-25 (0 agent, ~14 commits ; radar 0 erreur/30 j). **Code mort** : `lib/alertes.js` (0 import depuis toujours) + `lib/client-fields.js` (réf commentaire seule) supprimés ; `pillStyle` (helper défini APRÈS un return, jamais appelé) purgé au passage. **Tailwind OUT avec preuve** : captures Playwright vrai navigateur avant/après (landing, login, calculateur, mobile) — le retrait nu cassait 2 choses (h1-h6 non stylés regras navigateur, inputs sans fonte héritée) → le sous-ensemble utile du preflight est POSSÉDÉ dans le reset maison de globals.css (2 règles, spécificité minimale), re-captures identiques au pixel, CSS servi 0 `--tw-`. **Sentry OUT (D4 entérinée)** : instrumentation.js + 3 configs + wrapper next.config + dep supprimés, captures doublonnées retirées (chacune avait déjà son reportError ; email.js bascule — les échecs d'envoi entrent ENFIN dans erreurs_app), **pages légales rectifiées** (Sentry listé sous-traitant RGPD alors que plus rien ne lui part) ; bonus : le build passe de « Compiled with warnings » (OpenTelemetry tiré par @sentry/nextjs) à « ✓ Compiled successfully ». **Découpe parametres/page.js : 3 513 → 1 672 l.**, les 9 sections extraites dans `sections/` (Horaires, ChampsEleves, NotifsEleves, AbonnementCheckout, ReglesAnnulation, PagePublique 396 l., StripePaiement, Visibilite, CoursEssai), déplacements verbatim, **smoke réel prouvé** : login démo + 5 onglets + 7 sous-onglets en vrai navigateur, zéro erreur console/page, capture archivée. **Ratchet warnings CI** : `--max-warnings=1033` (un de plus = CI rouge, toute baisse doit abaisser le plafond). 103/103 specs + build verts. **Incident de méthode consigné** : un sed décalé de +1 (import ajouté avant la suppression) a laissé un `}` orphelin — attrapé par le parseur au lint suivant ; règle : bornes vérifiées dans la MÊME commande que la coupe, imports ajoutés APRÈS. **Restes assumés** : 9 fichiers >1000 l. subsistent (max 2 239 — FicheClient, CoursDetail, Pointage étaient le « si le temps », non entamés) ; runtime nodejs de /api/og hérité de l'époque Sentry (changer = hors périmètre purge) ; le smoke a montré le démo SANS bandeaux de gel sur /parametres (à recouper avec le signal B1e « compte gelé ») ; actions dormantes reservation_hebdo/acces_prioritaire → B3c.
- [x] **B3a** Matrice 2 plans & plan-guard capacités — FAIT 2026-07-26 (0 agent ; radar : 1 seule « erreur » = la dégradation v79 prévue, pas un bug). **D1 et D2 entérinées** (go de Colin sur le batch = les recos ✅ du §5) : carnets manuels + export comptable dans Essentiel. **UNE source** : `CAPACITES` (constantes) + `can(profile, capacite)` (plan-guard réécrit) remplacent 17 flags × 4 plans + `FEATURE_TO_MIN_PLAN` parallèle + `verifierLimite` à quotas — helpers morts supprimés (canUseFeature, minPlanForFeature, studioHasFeature→`studioCan`, guardOrFail→`requireCapacite` sur le profil déjà chargé, fin du re-fetch). `premium` mappé → `pro` dans `effectivePlan()` (jamais 'premium' en sortie, spec le verrouille), Studio retiré de `PUBLIC_PLANS` et des cartes (vidéos/white-label → backlog sans carte grisée). **Zéro quota** : limites 40 élèves / 5 offres mortes côté code (lecteurs null-safe éteints d'eux-mêmes) + **migration v80** (DROP des triggers v54 clients/offres, noms EXACTS relevés dans la source — un DROP IF EXISTS mal nommé réussit en silence ; le trigger sondages RESTE, c'est une capacité). **Gate nouveau assumé** : `reserver` + `reserver-serie` exigent enfin `reservation_en_ligne` (la matrice le promettait, la résa n'était PAS gâtée — sans conséquence : aucun studio Essentiel payant n'existe avant P4) ; piège évité : le select profil de reserver-serie n'avait NI plan NI champs trial → can() aurait lu undefined → gate fermé à tort pour les Pro. sms/send + CoursDetail sur can('sms') ; panneau Abonnement in-app sur la matrice, 2 cartes. **Verrou** : `plan-guard.spec.js` (14 tests) au gate CI → 7 fichiers, 115/115 ; le ratchet warnings a MORDU en cours de batch (2 orphelins sms/send attrapés avant commit — il fait son travail), plafond recalé au réel 1033. **Restes assumés → B3b/B3c** : UX « portail vitrine » élève pour studios Essentiel (aujourd'hui : 403 API propre mais boutons visibles) ; gel/étanchéité triggers ; gating UI espace élève/messagerie côté élève ; masquer/griser photo-import pour non-Complet (validé Colin) ; cartes landing.
- [x] **B3b** Étanchéité (gel, crons, upsell) — FAIT 2026-07-26 (commit 07c2f4f, 0 agent ; radar : toujours la seule ligne v79 attendue). **Gel étanche = migration v81 à appliquer** : `compte_gele(uuid)` (miroir SQL exact de `isAccountFrozen` — past_due PAS gelé, manuels pro/premium abonnés, free exempt) + 5 triggers INSERT (clients/cours/offres/abonnements/paiements) qui ne contraignent QUE `auth.role()='authenticated'` — le service_role (crons, webhooks Stripe qui enregistrent de l'argent réel, admin) passe ; INSERT seulement, lecture + export RGPD restent ouverts (promesse §5). **Crons gâtés** (la fuite « features Pro gratuites en Solo » de B1g) : notifs-eleves saute les studios sans `notifs_eleves_auto`, rappel J-1 d'alertes exige `espace_eleve` (décision produit tranchée par la matrice adoptée en B3a) ; piège évité ×2 : les selects profils des crons n'avaient NI plan NI champs trial → can() aurait gâté TOUT LE MONDE en silence ; compteurs `profils_gates_plan`/`plans_gates` exposés dans les réponses cron (observabilité). **Upsell photo-import** : bouton grisé + hint « passe en Pro » pour les non-Complet (fini le 403 surprise), sans flash pour les Pro. Vérifié : 115/115, smoke réel /clients/nouveau (démo free = bouton normal, zéro erreur console), build vert. **Restes assumés** : v81 à PROUVER par le chemin réel après application (insert JWT d'un compte gelé rejeté — leçon v75-v78, aucun compte gelé sous la main aujourd'hui) ; l'UX côté gelé reste les bandeaux existants (l'erreur trigger apparaîtrait brute si un flux UI non-gaté subsistait) ; UX vitrine élève → B3c.
- [x] **B3c** Landing 2 cartes — FAIT 2026-07-26 (commit 1cd5a84, 0 agent). **Pricing 3 → 2 cartes** (Studio 79/49 retiré partout, vidéos/white-label au backlog sans trace), features = matrice §5 exacte, **quotas faux retirés** (« Jusqu'à 40 élèves » / « 5 formules » affichés sur la landing alors que v80 les a tués), footer frais Pro seul, Founding 100 conservé (stratégie actée), prix = placeholders P4. Calculateur et FAQ étaient déjà 2 plans (rien à faire), personas propres. **Passe promesse = produit** : la fausse promesse sondages de B1c corrigée (« votent depuis leur espace » → « partage le lien, iels votent en un clic », « temps réel » retiré — Sections + FAQ) ; actions dormantes `reservation_hebdo`/`acces_prioritaire` retirées du builder (« bientôt » sans moteur, même sort qu'`annulation_libre` en B2a). **Portail vitrine Essentiel** (reste B3a soldé) : planning + PWA restent, zéro CTA transactionnel — boutons « Réserver » 1-clic masqués, prochain cours « Voir le cours », CTA + page essai fermés (404), formulaire de résa → « ce studio prend les réservations en direct » ; selects profil des pages portail étendus (plan+trial, sans eux studioCan aurait tout fermé). Vérifié vrai navigateur : pricing 2 cartes/0 Studio/0 quota (capture), portail démo free non régressé, zéro erreur console ; 115/115, build vert. **Restes assumés** : espace élève d'un studio Essentiel reste LISIBLE (données de l'élève, esprit RGPD) — les actions y sont déjà 403 API ; fermeture UI fine de l'espace/messagerie si de vrais studios Essentiel naissent (post-P4) ; assistant portail non gaté par plan (coût IA borné par rate-limit, à trancher en P4).
- [x] **B2e** Paramètres — audit fonctionnel + save par carte + réorg par destinataire — FAIT 2026-07-26 (commit e125129, 0 agent, hors plan initial : demandé par Colin après constat que la section n'avait JAMAIS eu son audit B1 ; radar : 1 seule erreur/14 j = la dégradation v79 attendue, résolue). **Lot A (audit)** : 🔴 deep-links `?tab=`/`&s=` jamais lus depuis la naissance de la page — les 6 surfaces qui deep-linkaient (upsell photo, offres, emails J-3/J-1 du cron, bannière gel, retour Stripe `?abo=success` lui-même) atterrissaient toutes sur Profil → lecture au 1er rendu + alias anciens ids ; 🟠 `alerte_paiement_attente_jours` triple-fantôme (bindé UI mais absent du payload = jamais sauvé, aucun consommateur, cloche 7 j en dur) → branché de bout en bout, défaut 14 = la promesse UI ; 🟠 cloche alignée sur les réglages : carnet (`< 2` en dur → `alerte_seances_seuil`), abo expirant (14 j en dur → `alerte_expiration_jours`) — un réglage, trois surfaces, enfin UN comportement ; 🟠 slug studio re-unifié sur `lib/slug-studio` (la boucle locale avait survécu à l'extraction B1d = double source) ; 🟠 anniversaires réduits au réel (modes semi/auto jamais branchés — aucun envoi auto nulle part —, zone cadeau 100 % factice avec promesse « carnet 0 € auto » sans une ligne de code ; le réel : cloche J-1/J-0 → messagerie préremplie → envoi manuel) ; `lieu_principal` retiré (0 consommateur), `email_contact` clarifié (≠ login), hint « fidèles » honnête, select messagerie purgé des `anniversaire_cadeau_*` chargés-jamais-lus. Sonde prod : les 48 colonnes du payload existent toutes (0 colonne fantôme). **Lot B (save par carte)** : `CARTES` + `SERIALIZERS` (transforms miroir de l'ancien monolithe) — chaque carte a son bouton (grisé si rien à sauver) et son UPDATE partiel ; fini le save ~45 champs où une colonne en erreur tuait toute la page et où un onglet réécrivait les autres (last-write-wins inter-appareils réduit à la carte) ; `portail_actif` n'est plus re-forcé par les autres onglets ; dirty PAR carte (l'onglet anniv ne marquait jamais dirty = modifs perdables) ; `handleDiscard` mort depuis 2026-05-05 purgé. **Lot C (réorg)** : Notifications 4 → 2 sous-onglets PAR DESTINATAIRE (« Ce que je reçois » = panneau + seuil paiement / « Ce que tes élèves reçoivent » = emails auto + seuils carnet/abo + anniversaires), alias `?s=seuils|anniv` conservés ; « Paiement » → « Paiement en ligne » (collision mentale avec « Abonnement IziSolo ») ; bouton « Fiches » sur la page Élèves → champs perso (config près de l'usage) — et le test l'a attrapé né incliquable : le FAB feedback (fixe haut-droite z-50) recouvrait le dernier bouton du header, prouvé `elementFromPoint` (le pattern exact du bouton de checklist) → padding réservé, re-prouvé libre. **Vérifié vrai navigateur** (msedge, démo) : 21/22 checks — deep-links ×3, réorg ×5, save par carte ×6 avec relecture DB (UPDATE partiel prouvé : sauver le prénom n'a pas touché le seuil), Fiches ×2, mobile 375 px sans débordement, zéro erreur console ; démo restauré à l'identique (Maude/NULL/NULL). 115/115 specs, build vert, **ratchet lint abaissé 122 → 105** (purge imports morts). **Restes assumés** : une prof ne peut toujours pas DÉSACTIVER son portail une fois le slug créé (design « zéro friction » assumé, à trancher un jour) ; le FAB feedback reste une zone de collision potentielle pour tout futur bouton haut-droite (fix local /clients seulement) ; colonnes `anniversaire_cadeau_*`, `anniversaire_mode` valeurs semi/auto et `lieu_principal` restent en DB, vestiges documentés ; ReglesMetierTab garde son save autonome (déjà propre) ; pas de verrou spec dédié (aucune logique financière — les zones à verrou de la page, annulation et plans, ont déjà les leurs).
- [x] **B2f** Cours MIXTES & liaison carnets (R1+R2+R3 du MODELE-COURS-CARNETS-2026.md) — FAIT 2026-07-26 (commits 44c3203→9dc5ba7, 0 agent, hors plan initial : question produit de Colin « un cours qui accepte plusieurs abonnements ET un paiement 20 € à l'unité ? » → analyse complète (doc commité) → go des 3 recos). **Verrou d'abord** : carnet-resolution.spec 12→15, les 2 tests mixte ROUGES avant l'implémentation (prouvé en transcript), les 13 v70-constants verts avant ET après. **R1 moteur** : `cours.carnets_acceptes` (défaut false = zéro changement pour l'existant) — coché, le tarif devient un FILET : carnet applicable → décompte, sinon « à régler X € » ; migration **v82** (colonne + `pointer_presence` même gate + RPC `relier_presence_carnet`) appliquée par Colin AVANT le push (les selects explicites étendus auraient fait des 42703 silencieux — anti-pattern n°1 respecté) ; formulaires (création/édition occurrence/édition série) avec texte honnête des 2 modes, duplication + ajout d'occurrence + prolongation recopient le flag ; les 4 appelants de `resoudreCarnetApplicable` passent le champ. **R2 transparence élève** : la page cours calcule la prévision de l'élève connectée (même résolution que le pointage) — « décomptée de Carnet Sonde ×10, il te restera 6 » / « à 20 €, à régler » / « ton carnet ne couvre pas ce type » ; conséquence d'annulation tardive affinée pareil ; liste portail « 20 € ou carnet » ; **espace élève** : la dérivation « à régler » v65 ignorait `abonnement_id` (une séance liée par override s'affichait AUSSI à régler — préexistant) et aurait montré une fausse dette à toute couverte d'un mixte → filtre corrigé (liée = couverte ; mixte non pointé = prévision, converge au pointage). **R3 choix prof** : menu ··· du pointage → « Décompter sur » (carnets de l'élève avec reste, « ne couvre pas ce type », épuisé grisé) + « À l'unité (X €) » ; route `/api/presences/[id]/relier` (withRoute, ratchet vert) — le JS décide avec la formule verrouillée pointage-delta (la séance comptait-elle ?), la RPC exécute atomiquement (re-crédit ancien + décompte nouveau + re-liaison) ; garde « déjà encaissée à l'unité » → 409. **Collatéraux préexistants réparés** : `reserver-serie` n'avait JAMAIS l'exemption tarif de la règle sans-carnet (élève bloquée sur un atelier récurrent payable à l'unité) ; prévisionnel du détail cours : carnet lié AVANT tarif ; prévision lisait `offres(nom)` au lieu du snapshot `offre_nom` (attrapé par le walkthrough). **Walkthrough réel 11/11** (msedge, fixtures jetables, démo intact vérifié) : tag portail, prévision élève exacte (10−3−1=6), pas de fausse dette espace, résolution au pointage, liaison DB 3→4 + B non liée, **boucle R3 aller-retour prouvée en DB** (à l'unité : re-crédit 4→3 + lien NULL ; re-liée : 3→4), duplication porte la case, zéro erreur console. 119/119 specs, build vert, lint 105 = plafond. **Restes assumés** : Revenus « à percevoir » côté PROF garde l'ancienne dérivation (les séances mixtes non pointées de couvertes y comptent « à percevoir » jusqu'au pointage — surestimation temporaire, converge ; symétriser = prochain passage Revenus) ; choix du carnet par l'ÉLÈVE volontairement non fait (non-reco du doc) ; annulation tardive « decompter » sur mixte résout le carnet même non applicable ? non — même résolution v82 partout ✓ ; carnet famille + périmètre par cours = non-recos documentées.
- [x] **B2g** Planning intégrable — widget/iframe pour les sites des profs (demande Manon) — FAIT 2026-07-26 (commits 212ec7a→8746463, 0 agent, 0 migration). **Architecture Calendly** (l'option propre parmi 3 étudiées : iframer le portail = cookies tiers morts + chrome dupliqué ; widget DOM-injecté = collisions CSS/XSS/support infini) : route **`/embed/[slug]`** HORS de `/p/` (le layout portail ne s'hérite pas dans l'iframe), vue ANONYME seule (cours publics, `filterCoursVisibles(null)` — le cours privé du seed n'apparaît pas, prouvé), l'ACTION sort de l'iframe (chaque cours → portail en nouvel onglet `?src=embed`, tracking façon QR), jauge v74, tags prix mixte B2f, vitrine Essentiel (« Voir » sans « Réserver », prouvé par flip de plan + restore), pied « propulsé par IziSolo » (acquisition), noindex, `?semaines=`/`?type=`. **Headers chirurgicaux** : XFO SAMEORIGIN partout SAUF `/embed/*` (lookahead négatif) + `frame-ancestors *` sur l'embed seul — prouvé aux 4 coins (embed sans XFO + CSP ; portail ET dashboard toujours protégés). **widget.js une-ligne** : `<script src=…/widget.js data-studio=X async>` — iframe créée au point de collage, origine dérivée du src du script, auto-hauteur postMessage (garde-fous origine+source+shape, bornée 120-20000), options data-semaines/type/hauteur ; iframe nue en fallback (builders sans JS). **Paramètres → Ma page** : bloc snippet copiable à côté du QR + aperçu. **Walkthrough 13/13 en page HÔTE réelle** (serveur cross-origin 8888 simulant le site de Manon, les 2 variantes côte à côte) — 3 prises : le proxy default-deny 307-redirigeait `/embed/` ET `/widget.js` vers /login (allowlist étendue) ; l'auto-hauteur mesurait `documentElement.scrollHeight` qui ne descend JAMAIS sous le viewport d'une iframe → `body.scrollHeight`, prouvé par départ forcé 1200 px → ajusté 269 px (la taille exacte du contenu) ; un `finally` qui jette masque l'erreur d'origine (builder PostgREST = thenable sans `.catch`). Zéro erreur console, démo intact. 119/119, build vert, lint 105 pile. **Restes assumés** : rendu dynamique à chaque hit (pas de cache — optimiser si le trafic embed devient réel) ; ~~pas de thème/couleurs paramétrables (v2 si demande)~~ ; premier vrai test terrain = le site de Manon.
  - **B2g-v2 (2026-07-28, retours terrain de Manon — l'embed remplace sur son site une grille manuelle qui renvoyait vers Momoyoga)** : « il n'y a que lundi et mardi » = pas un bug mais la fenêtre « aujourd'hui + 4 sem » tronquée par sa coupure d'été (rentrée lun 24/08 ; la fenêtre finissait mar 25/08 — 95 séances juste après, prouvé par sonde). Fix : **fenêtre ancrée sur la PREMIÈRE séance à venir** (en période normale ancre = aujourd'hui, comportement inchangé). « Changer les couleurs ? » = la v2 thème demandée → **`data-palette="rose|sauge|sable|lavande"`** (presets seulement, variables CSS scopées `.emb`, badge Complet rouge partout, palette invalide → sable), passthrough widget.js + `?palette=`, options documentées dans le snippet Paramètres. Preuve navigateur 7/7 sur les données réelles de Soleya (27 séances lun/mar/JEU sur 4 semaines de rentrée, lavande assortie à son site, capture). Notes produit : ses cours du mercredi (parc) + atelier samedi n'existent PAS dans IziSolo (à créer par elle — sa grille manuelle affiche même un atelier « 27 juin » périmé, l'argument du live).
  - **B2g-v3 (2026-07-28, demandes Colin dans la foulée)** : **couleurs libres (2 max)** — `lib/embed-couleurs.js` dérive TOUS les rôles (titres/bordures/pastilles/pied) depuis 1-2 hex avec plancher de contraste WCAG 4.6:1 vs blanc (assombrissement HSL itératif — le test clé : `c1=ffee55` jaune pâle → titres à 5.10:1, prouvé navigateur) ; jamais de couleur brute sur du texte, hex invalide → sable, priment sur la palette. **Mode d'affichage** `affichage=semaine|liste` — grille datée 7 colonnes Lun→Dim façon Momoyoga (le modèle mental de Manon), jours vides « — » desktop / masqués+empilés mobile <560px, `max-width` élargie 1080px, scroll-x de secours. **Sélecteurs dans Paramètres → Ma page** (select affichage, select palette désactivé si couleurs, 2 `<input type=color>` + Réinitialiser) → widget + iframe + lien aperçu régénérés en direct, zéro stockage DB. Preuves : embed 10/10 (5 semaines × 7 colonnes sur les données réelles Soleya, mobile empilé) + UI 4/4 (piège sonde consigné : input contrôlé React = setter NATIF de HTMLInputElement sinon le value-tracker avale l'event ; et un dev server vautré par l'HMR fait échouer le LOGIN en silence — redémarrer avant de conclure). Restes : contraste calculé vs fond blanc des cartes (si un jour le fond de carte devient paramétrable, recalculer contre lui).
  - **Fix portail « Acheter en ligne » (2026-07-28, screenshot Colin sur /p/soleya)** : la section des offres à Payment Link (markup v13, PortailHome) n'a JAMAIS eu une seule règle CSS — liens bleus nus, invisible depuis sa naissance car aucun studio n'avait d'offre à lien Stripe avant que Manon ne branche les siennes (variante du « feature morte en silence » : une section peut naître sans sa feuille styled-jsx et personne ne le voit tant que la condition d'affichage reste fausse en prod). Styles écrits dans le `<style jsx global>` existant (cartes, grille auto-fill, chip icône, hover Stripe), prouvé vrai navigateur sur les 3 offres réelles de Soleya (flex/grid/radius, capture). Au passage : sa page collée = iframe `?affichage=semaine&c1=dab2f5&c2=fdb563` → prod vérifiée (style inline `--e-*` rendu, violet dérivé 4.69:1) — le « ça ne prend pas mes couleurs » de Manon = pastel choisi → titres assombris par le garde-fou (voulu), ses pastels vivent dans fonds/bordures + probable fenêtre de déploiement. ~~Reste noté : la grille semaine du PORTAIL (PortailHome) démarre à la semaine COURANTE (vide pendant sa coupure) — l'ancrer sur la 1re séance comme l'embed = candidat naturel, non fait.~~ → FAIT (trio 2026-07-28 ci-dessous).
  - **Trio remontées terrain (2026-07-28, go Colin)** : (1) **grille semaine du portail ancrée** sur la 1re séance à venir si elle existe, sinon semaine courante vide assumée (spec Colin) — prouvé sur Soleya (et pendant l'enquête, Manon a créé un cours au 17/08 : l'ancre a suivi toute seule). (2) **Toast « Fiche mise à jour ✓ »** à la sauvegarde d'une fiche élève (retour Maude : succès silencieux — router.push sans confirmation), prouvé navigateur. (3) **ENQUÊTE prénoms tronqués (« K » pour Karine, ×3)** : PAS un pseudo — fiches nées à la même seconde que leur présence via `reserver`, élève CONNECTÉE sans fiche dans ce studio, champ « Prénom et nom » arrivé amputé à sa 1re lettre (metadata d'inscription CORRECTE : « KAREN »→« K », « natacha »→« n » ; saisie desktop+mobile reproduite SAINE au Playwright → état client amputé, vol de focus pendant la frappe suspecté — le widget Turnstile async charge dans ce formulaire). Triple blindage : **préremplissage** du champ avec `user_metadata.prenom` (la connectée bascule même en 1-clic « Tu réserves au nom de… » — la fenêtre de frappe disparaît), **filet serveur** dans reserver (saisie ≤ 2 chars + metadata ≥ 3 → metadata préférée), **minLength=2** sur les 2 champs nom (résa + liste d'attente). Preuve : POST brut « S » → fiche « Sylvette ». **Données réparées en prod** : « n »→« Natacha » (AEBEA), « K »→« KAREN » (RENKA), valeurs issues de leur propre metadata ; le « K »/« G » de Maude avaient déjà été fusionnés par elle. Leçon : pour un·e élève connecté·e, la metadata d'inscription est plus fiable qu'une saisie client courte — tout créateur de fiche côté portail devrait avoir ce filet (promouvoir/invite = à l'occasion).
  - **Modale réservation sur la fiche cours (2026-07-28, demande Colin)** : clic sur un·e inscrit·e → modale « Réservation — {élève} » avec **« Ouvrir la fiche élève »**, **type de séance Normale/Essai/Offerte** (même mécanique que le pointage : `seanceDeltaChangementType` + RPC `pointer_presence`, rollback si ko — passer une séance décomptée en offerte la re-crédite, prouvé 5→4 en DB) et **« Supprimer la réservation »** (double confirmation). Nouvelle route `DELETE /api/presences/[presenceId]` (withRoute auth:active, RLS) : recrédit UNIQUEMENT si réellement décompté (formule verrouillée + tardive sanctionnée — règle de l'annulation prof), **encaissement lié = 409** (« annule-le d'abord au pointage »), place libérée → `promouvoirListeAttente` (la promesse produit « désinscription → promotion auto »). Lignes tardives/annulées : suppression seule (pas de changement de type). Après action : `router.refresh()` (presences est une prop, pas d'état local à désynchroniser). Preuve navigateur 7/7 : recrédit au type, zéro double recrédit à la suppression, inscrit simple sans recrédit, zéro pageerror. Reste assumé : les cas à traiter liés à une présence supprimée ne sont pas fermés automatiquement (rare — la prof les résout à la main).
  - **Cohérence offres ↔ cours — analyse système + 3 coups de pouce (2026-07-28, go Colin, déclencheur : question Manon « choisir une option à la résa ? »)** : la réponse produit est « pas de menu élève, le système résout » (non-reco MODELE-COURS-CARNETS confirmée) — mais l'audit de SA config a révélé une famille de **pièges silencieux** autour de la sémantique figée 2026-07-13 : **un cours SANS type est TOUJOURS accepté, même par un carnet restreint** (JS `carnet-resolution` = SQL v64/v82, vérifié — aucun des deux ne diverge). 4 classes recensées : (1) **restriction inerte** — offre limitée à un type + séances sans type = la limite ne limite rien (Manon : abo « Vinyasa » couvre TOUT, y compris le Yin — ⚠️ le 1er message envoyé disait l'inverse « ne couvrirait aucun cours », corrigé) ; (2) **type fantôme** — restriction vers un type sans aucune séance à venir ; (3) exclusion réelle = la feature, informatif ; (4) **legacy `cours_unique`** — l'unité se règle par `tarif_unitaire` du cours depuis Lot C, l'offre à l'unité ne s'affiche pas à la résa. **Livré** : `lib/coherence-offres.js` (verdict DÉLÉGUÉ à `resoudreCarnetApplicable` via carnet fictif — ne peut pas diverger de la formule, test miroir au verrou `carnet-resolution.spec.js` 15→20 tests) + 3 nudges : hint LIVE sous « Vaut pour quels cours ? » (formulaires offre nouveau + edit, comptes réels de séances sans type/fantôme), hint 💡 sous le type de cours (cours/nouveau + édition fiche cours) quand type vide ∧ offres restreintes existent, **bandeau « À vérifier dans tes offres »** sur /offres (diagnostic des 3 pièges par offre, non-dismissible tant que ça persiste). Preuve navigateur 5/5 (fixtures : abo restreint + cours sans type + offre legacy), zéro pageerror. Restes : hint type non posé sur l'éditeur de récurrences (le formulaire cours/nouveau couvre la création de séries) ; ces nudges lisent ≤ 500 séances à venir (au-delà, compter côté SQL).
  - **Salve terrain 2026-07-30 (13 feedbacks admin + 2 incidents Maude)** — traités ce jour :
    - 🔴 **« Requête invalide » à la résa (Nathalie Maclet, vidéo Maude)** : LE HONEYPOT — l'autofill mobile remplit les champs par heuristique de NOM même cachés + `autocomplete=off` (`name="website"` = « site web » de la fiche contact) → vraie élève traitée en bot. Fix double : identité DOM du champ rendue opaque (`verif_hp`, 4 formulaires : résa, liste d'attente, essai, sondage — la clé JSON `website` de l'API inchangée) + message serveur auto-réparateur (« … réessaie en remplissant à la main, sans le remplissage automatique »). Prouvé : humaine passe, bot bloqué 400 avec le nouveau message. ⚠️ Données Nathalie : sa fiche ET son compte auth portent `dmaclet@gmail.col` (typo — domaine qui ne reçoit RIEN : magic links impossibles, `email_verified` posé par un createUser applicatif) + une 2e fiche « Nathalie X » sans email — **geste Maude/Colin : confirmer la vraie adresse (.com ?) puis corriger la fiche (la FK v83 survit) et le compte auth (admin)**.
    - 🔴 **Paiements pleine lune « à refaire plusieurs fois » (29/07 soir)** : zéro erreur serveur, zéro doublon (10 élèves × 1 paiement — 6 sur place 18h28-18h45, 4 finis à 22h de chez elle) → échecs CLIENT muets sur 4G de parc : `supabase-js` SANS timeout, un fetch qui pend = spinner infini, et un fetch qui JETTE (réseau tombé) n'était pas attrapé par `handleMarquer` (optimisme jamais rollback, zéro toast). Blindage pointage : `AbortSignal.timeout(12 s)` + try/catch sur le RPC de pointage ET l'encaissement rapide, messages distincts (« Réseau trop lent — NON enregistré, réessaie »), rollback garanti. (Feedback « j'ai dû faire deux fois Marie Pierre » = même famille.)
    - **Liens « type internet explorer » sur /essais (Camille ×2)** : styled-jsx scoped ne pose PAS son hash sur les composants custom — les 2 seuls liens signalés étaient les 2 `<Link>` (« Voir la fiche », « Configurer »), les `<a>` mailto/tel de MÊME classe étaient stylés (la preuve par le rapport lui-même). Règles déplacées en `<style jsx global>`, prouvé computed-style (cuivre/brun, zéro bleu). **Anti-pattern générique** : toute classe scoped posée sur `<Link>`/composant custom = règle morte — candidat à un détecteur script (chip spawné).
    - **Bandeau offres « deux fois la même chose » (Camille)** : pas un bug de logique — l'Atelier Soleil a DEUX offres nommées « Cours à l'unité » (+1 « découverte », toutes legacy) → 3 lignes quasi identiques. Les legacy se groupent désormais en UNE ligne.
    - **Modale résa : « Envoyer un message »** (Maude « doit ouvrir la messagerie, pas assez d'options ») → lien `/messagerie?with={clientId}` dans la modale (deep-link existant), prouvé.
    - Pièges de sonde consignés : `process.exit()` dans un try SAUTE le finally (cleanup non exécuté — démo restauré à la main) ; la page /essais rend l'état « configure » si `essai_actif=false` quel que soit le contenu (fixtures aveugles sans le flag).
    - **Cas Sarah — RÉSOLU (même jour)** : Sarah Peres excusée par Maude (appel avant le cours) restait « à régler 20 € » sur la FICHE DU COURS. La donnée était SAINE (statut=excuse, tardive=false, est_due=false — l'excuse avait marché) : le récap financier de la fiche cours était la SEULE des 4 surfaces à avoir raté le filtre statuts B1f (pointage/Revenus/espace excluent excuse/annule/declinee + absent-souple-impayé ; la fiche cours, née après en « miroir du pointage », avait copié la logique carnet mais pas le filtre). Aligné sur LE prédicat commun + chip explicite « Excusée — rien à régler » ; l'absent souple impayé ne compte plus non plus dans le prévisionnel. Prouvé 4/4 (excusée sans dette, inscrite normale à 20 €, prévisionnel 20 et pas 40). NB produit pour Maude : « ne pas faire payer sur décision » = Excuser (pointage/cas) OU passer la séance en « Offerte » (modale résa de la fiche cours) — les deux existent.
    - **PJ dans les annonces — RÉSOLU (2026-07-31, go Colin ; couvre aussi « manque la photo dans la messagerie »)** : Maude ne pouvait pas envoyer les photos de la pleine lune aux participantes — le tuyau existait DE BOUT EN BOUT (upload Blob `/api/messagerie/upload` déjà utilisé par ChatInput 1-à-1, `announce.media_urls` au schéma zod, `sendMessage → messages.media_urls`, bulles partagées pro/élève qui rendent) : il ne manquait QUE le bouton dans les 2 UI d'annonce. Livré `components/messagerie/AttachmentPicker.js` (contrôlé, miroir upload ChatInput, max 10, previews+retrait) branché sur le modal « message aux participants » (fiche cours) ET l'onglet Annoncer ; photos SEULES autorisées (garde client = miroir du « Message vide » serveur). Preuve 5/5 : sélecteurs visibles, announce 200 count=2, 1 message par participante avec `media_urls` en DB, image RENDUE dans la bulle (naturalWidth 192). ⚠️ `BLOB_READ_WRITE_TOKEN` absent de .env.local (upload 503 en local — en prod il sert déjà le 1-à-1) : la preuve passe par media_urls directes, la brique upload est la même que ChatInput. Reste assumé : ChatInput garde son propre code d'upload (unification vers AttachmentPicker = à l'occasion). ~~L'email de notification ne mentionne pas les PJ~~ → FAIT (2026-07-31, go Colin) : le digest 16h mentionne « , avec N photo(s) ou fichier(s) joint(s) » — côté élève (agrégat par destinataire depuis `media_urls`) ET côté prof (le count HEAD est devenu un select `media_urls` limité 1000, un élève peut aussi joindre en 1-à-1). Preuve = relecture + gates (le cron ne se déclenche pas en local : Resend enverrait de VRAIS emails) — validation terrain au prochain digest de 16h.
    - **Restants triés, non traités ce jour** : « marquer absente SANS dette sur décision prof » (largement couvert par Excuser + Offerte — vérifier avec Maude s'il manque encore un geste) ; ~~personnalisation des emails (« Salut » de l'invitation)~~ → FAIT 2026-07-31 (go Colin) : « Salut {prenom} » / « Coucou » → « Bonjour {prenom} » / « Bonjour » sur les 3 constructeurs (InviteModal — l'email exact du feedback —, invitation cours privés, magic link portail) ; grep = zéro Salut/Coucou restant dans les textes sortants. NB : la « personnalisation » complète des emails (gabarits éditables par la prof) reste un chantier produit séparé, non ouvert. Et geste Colin FAIT : OTP Supabase 1 h → 24 h (dashboard) ; validité magic link 1 h → 48 h (= réglage Supabase dashboard, geste Colin : Auth → Email OTP expiry) ; corbeille non visible sur fiche mobile (non reproduit à 375 px — demander appareil/fiche exacte à Camille) ; ~~titres de cartes cliquables (fiche)~~ → FAIT 2026-07-31 (go Colin) : le titre de chaque carte carnet/abo de la fiche élève devient un bouton (chevron + survol) → modale détail « {offre} » : statut/période/souscription, **séances décomptées** (liées à CE carnet, cliquables vers la fiche du cours — le détail qui n'existait nulle part), paiements liés + total reçu/restant, et les options EN TOUTES LETTRES (Modifier, Mettre en pause/Réactiver, Encaisser un versement, Supprimer) qui enchaînent vers les modales existantes. Prouvé 7/7 navigateur (8/10 restantes, séance listée, 80 € réglé, Modifier → édition, zéro pageerror). Limite héritée : la fiche charge les 50 dernières présences (mention « 50 dernières » si tronqué) ; affichage calendrier sondage (horaires fixes).
- [x] **P4-prix** Grille définitive & purge Founding — FAIT 2026-07-27 (décision Colin en session : « on oublie les founding dans tous les cas… ok pour les tarifs »). **Essentiel 15 € / Complet 29 € TTC** (analyse concurrentielle web à l'appui : websport 25 € annuel/35 € mensuel — lu au vrai navigateur, site JS-only —, Momoyoga 29, Mirandaflow 29, fenêtre stratégique « <29 € »), **Founding 100 / Early Bird ABANDONNÉS** (jamais lancés) → **offre de lancement −50 % pendant 3 mois** (code Stripe LANCEMENT50) + **parrainage à construire** (AUCUNE promesse UI d'ici là). Alignés le jour même : constantes.js (noms définitifs Essentiel/Complet dans PLANS + commentaire canonique), landing Pricing (15/29, bandeau lancement à la place du bandeau Founding, plus de barrés), Calculateur (prix + listes remises sur la matrice §5 — les « 40 élèves »/« export en Pro » y traînaient encore), LocalLanding (CTA villes), 10 descriptions SEO + blog + outil calculateur (« dès 17 €/mois (12 € pour les 100 premières) » → « dès 15 €/mois »), panneau Abonnement in-app (15/29, bannière « annulé » sans les quotas morts, frais 1,5 % unifiés), admin/plans (matrice réelle, premium = legacy), FAQ (« plan Complet »), toasts/erreurs API (« réservé au plan Complet », fallback export neutre — l'export est Essentiel depuis D2), `setup-stripe-saas.mjs` (2 Products renommés au besoin par metadata, prices 1500/2900, coupon LANCEMENT50 percent_off, PREMIUM plus créé). **Reste de P4 : brancher la caisse avec Colin** (script test → live → env vars Vercel → redéploiement → checkout E2E code LANCEMENT50 → webhook → Customer Portal → billing admin → emails lifecycle).
- [ ] **P4** Stripe & prix (avec Colin, à la fin)

*Rituel de fin de batch : commits par lot → vérif live démo → verrou CI si
zone financière → cocher ici → mettre à jour la bible (section 10 + §12
anti-patterns si leçon nouvelle).*
