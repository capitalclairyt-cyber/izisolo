# AUDIT PERFORMANCE PRÉVENTIF — IziSolo (2026-08-19)

> **Audit en lecture seule** demandé par Colin le soir du passage en Supabase Pro
> (org Kapt, compute Micro). Objectif : identifier ce qui cassera à l'échelle
> (50 puis 500 professeurs actives), PAS corriger des lenteurs actuelles.
> Méthode : 4 agents parallèles (requêtes, index, RLS, front) sur tout le code
> + reconstruction de l'état SQL depuis les ~88 migrations. AUCUNE modification
> appliquée — chaque correctif attend validation.
>
> Signaux prod le soir de l'audit (Observability, 24 h) : CPU 6 % post-Micro,
> 247 slow queries/24 h, 14,9 % d'erreurs DB (largement gonflées par les
> redémarrages transfert/resize + les 35 tests de preuve du jour — à relire
> sur une journée calme).

---

## ⚠️ FINDING SÉCURITÉ (hors périmètre perf, mais levé par l'audit RLS)

La policy v26 `Eleve lit ses fiches client` matche par
`lower(email) = lower(coalesce(auth.email(), ''))`. Pour un client **anon**
(clé publique, PostgREST direct), `auth.email()` est NULL → coalesce → `''` →
**toute fiche `clients` dont l'email est la chaîne vide `''` devient lisible
par n'importe qui**. Les fiches à email NULL ne matchent pas (NULL ≠ '').

- **Sonde à exécuter en prod** : `select count(*) from clients where email = '';`
  Si 0 → risque théorique, à fermer quand même. Si > 0 → fuite réelle de PII.
- **Fermeture** : la réécriture RLS P1 (annexe C) scope la policy
  `TO authenticated` et passe par `mes_client_ids()` — le trou disparaît.
  Fermeture minimale sans attendre P1 : ajouter `AND email <> ''` à la policy.

---

## CATÉGORIE 1 — À corriger MAINTENANT (structurel, coût faible)

> **STATUT : CATÉGORIE 1 SOLDÉE (2026-08-19 soir)**. Code livré (build + lint
> verts, fallback du portail prouvé iso-comportement contre la prod) ET
> **v89 appliquée par Colin le soir même** : `verifier-selects` ✅, RPC
> `places_occupees` = formule v74 recalculée en JS sur 12 cours réels 12/12
> (dont le Yoga Pleine Lune complet 16/16), jauges du portail prod identiques
> sur le chemin RPC. 1.7 : annexe A exécutée (résultats plus bas).

### 1.1 🔴 Jauges de places FAUSSES sur le portail public (cap 1000 silencieux)
- **Fichier** : `app/p/[studioSlug]/page.js:136-147` (atténué : `essai/page.js:58-66`)
- **Problème** : le comptage des inscrits fait `presences.in('cours_id', [jusqu'à
  240 uuids])` sans limite. Dès ~1000 présences dans la fenêtre affichée
  (UN studio bien rempli suffit : 170 cours × 10 résas), PostgREST tronque en
  silence → jauges fausses, « Complet » erroné, sur la page la plus vue par
  les prospects. C'est le piège documenté bible §12, sur une vitrine.
- **Correctif** : RPC d'agrégat `count(*) GROUP BY cours_id` avec la formule de
  capacité v74 en SQL (miroir de `lib/presences.js`). En attendant : chunker
  les ids à 200 (pattern déjà utilisé partout ailleurs) + `.limit()` explicite.

### 1.2 🔴 Index manquants à fort impact (pur SQL, zéro risque de régression)
- **Problème / justification** (détail + statements complets en annexe B) :
  - `cours(date)` — 2 crons quotidiens balayent cours cross-studio sur la date
    seule ; l'index existant a profile_id en tête, inutilisable.
  - `cours(recurrence_parent_id)` — TOUT l'écran Cours récurrents + « Libérer
    la série » filtrent dessus ; l'index existant porte `recurrence_id`,
    colonne legacy JAMAIS écrite (index mort).
  - `conversation_members(conversation_id)` — `syncMembresCours` scanne par
    conversation à CHAQUE ouverture d'une conversation de groupe (design B1a) ;
    aucun index existant utilisable (les UNIQUE partiels ne matchent pas).
  - `paiements(abonnement_id)`, `messages(sender_client_id)` — FK `ON DELETE
    SET NULL` sans index : chaque suppression d'abo / fusion de fiches (v78)
    seq-scanne des tables qui ne font que grossir.
  - `clients(lower(email))` — requis par les policies RLS élève ET par les
    lookups email globaux (voir 2.6) ; l'UNIQUE v53 `(profile_id, lower(trim(email)))`
    ne sert aucun de ces chemins.
- **Correctif** : annexe B (CREATE INDEX, à exécuter un par un — CONCURRENTLY
  ne passe pas en transaction dans le SQL Editor). Vérification avant/après :
  annexe A (pg_indexes + pg_stat_user_indexes).

### 1.3 🔴 Intervalles des pollers messagerie (constantes à changer, gain ÷3 immédiat)
- **Fichiers** : `components/messagerie/MessagesBadge.js:27` (30 s),
  `app/p/[studioSlug]/PortailLayoutClient.js:58` (30 s),
  `components/messagerie/ConversationList.js:58` (**8 s**),
  `components/messagerie/ChatRoom.js:21` (5 s, alors que le realtime est déjà
  branché ligne ~277).
- **Problème** : ces 4 pollers portent ~80 % de la charge DB projetée à 500
  profs (estimation front : 12-15 000 requêtes/min sans correctif). Aucun ne
  s'arrête quand l'onglet est caché.
- **Correctif immédiat (constantes)** : badge 30→90 s, liste 8→30 s, fil
  5→20 s, + garde `document.visibilityState === 'visible'` partout.
  La refonte en RPC agrégée (le vrai fix) est en 2.1.

### 1.4 🟠 /admin/stats non paginé (ton propre outil de pilotage ment dès ~10-30 profs)
- **Fichier** : `app/(admin)/admin/stats/page.js:29-33`
- **Problème** : `getStats` charge profiles/cours/clients TOUS studios sans
  pagination, contrairement à la doctrine du fichier voisin `admin-stats.js`.
  `cours` crèvera le plafond des 1000 le premier → graphes 12 mois faux.
- **Correctif** : passer par `fetchAllRows` (existe déjà dans `lib/admin-stats.js`),
  ou mieux, une RPC `GROUP BY month`.

### 1.5 🟡 Police Caveat chargée pour rien (60-80 Ko par page, portail 4G compris)
- **Fichier** : `app/layout.js:59-64`
- **Problème** : `--font-script` n'a AUCUN consommateur (grep app+components+css).
- **Correctif** : supprimer la déclaration. (⚠️ Instrument Serif n'est PAS
  morte : PortailHome, blog.css, LocalLanding, outils — ne pas y toucher.)

### 1.6 🟡 `/illustrations/*` passe par la branche auth du proxy
- **Fichier** : `proxy.js` (matcher) + `components/navigation/Sidebar.js:183`
- **Problème** : servir un JPEG statique de la sidebar déclenche une
  vérification GoTrue à chaque chargement (assets en `max-age=0`).
- **Correctif** : exclure `illustrations/` du matcher, comme `icons/`.

### 1.7 🟡 Sonde sécurité email vide (cf. encadré en tête) + dump pg_policies
- **Correctif** : exécuter l'annexe A en prod (3 requêtes : index/usage,
  policies réelles, sonde `email = ''`) pour ancrer la suite sur l'état réel
  et non sur les fichiers de migration.

---

## CATÉGORIE 2 — Avant 50 profs actives

> **STATUT : CATÉGORIE 2 SOLDÉE (2026-08-19/20)**. Code livré (build + lint +
> ratchet verts, 34 routes marketing STATIQUES au build) ET **v90 + v91
> appliquées par Colin le soir même** (v91 en 2e run : la forme
> `= ANY ((select …))` du 1er jet échouait en 42883 — corrigée en helpers
> SETOF + `IN (select …)`). Preuves chemin réel :
> - `verifier-selects` ✅ (17 RPC) ;
> - **v90** : messages_non_lus_total = boucle historique (1=1),
>   conversations_stats = requêtes unitaires sur les 6 convs du démo — seule
>   divergence ASSUMÉE : `eleve_last_read_at` des convs de GROUPE (l'ancien
>   code plantait en silence sur .maybeSingle() multi-lignes → null ; la RPC
>   renvoie max(last_read), plus juste), fiches_par_email = ilike,
>   purger_liste_attente(1970)=0 ;
> - **v91** : walkthrough élève live 1/1 (portail → résa invitée → espace →
>   annulation → messages → PWA → 404 cours privé, zéro requête ≥400,
>   fixtures nettoyées) + navigation pro complète en vrai navigateur
>   (dashboard/agenda/élèves/revenus/cas/messagerie, zéro erreur JS, l'API
>   conversations sur le chemin RPC : 6 convs, non-lus et ✓✓ lecture élève
>   corrects). Reste à regarder une fois : l'Advisor « auth_rls_initplan ».
> Resté hors lot (assumé) : push_subscriptions en .ilike (table minuscule),
> fenêtrage visuel de la page Cours (paginé, pas borné : les stats de séries
> restent exactes).

### 2.1 🔴 Messagerie : remplacer les N+1 par des agrégats (LE mur n°1)
- **Fichiers** : `lib/messagerie.js:332-355` (`countUnread` : 1 count PAR
  conversation, en boucle séquentielle), `app/api/messagerie/conversations/route.js:76-147`
  et `:203-254` (2-3 requêtes PAR conversation, jusqu'à ~300 requêtes par
  affichage de liste).
- **Problème** : multiplié par les pollers (1.3), c'est le premier poste de
  charge à l'échelle. Un pro d'un an = 150-300 conversations.
- **Correctif** : 1 RPC `messages_non_lus(viewer)` (count GROUP BY
  conversation_id joint à conversation_members sur last_read_at) + 1 RPC
  « liste des conversations » (dernier message par LATERAL + counts groupés).
  Puis utiliser le realtime déjà branché pour invalider au lieu de poller.
  Estimation front : correctifs 1.3 + 2.1 = charge ÷8-10.

### 2.2 🔴 Crons : sources cross-studio non paginées (résultats FAUX en silence à l'échelle)
- **Fichiers / problèmes** :
  - `app/api/cron/alertes/route.js:32-36` — cours de demain sans limite : au
    cap 1000 (~200-500 profs), des rappels J-1 disparaissent sans un log ;
    `.in(profileIds)` non chunké (l.88) ; boucle d'envoi séquentielle qui
    crèvera `maxDuration` (l.119-188).
  - `app/api/cron/expirations/route.js:100-103` — prospects sans pagination :
    au-delà de 1000 prospects globaux, plus aucune promotion prospect→actif.
  - `app/api/cron/expirations/route.js:44-58` — purge liste_attente triée
    ascendant sur des cours jamais supprimés : re-scanne chaque nuit les mêmes
    5000 vieux cours et n'atteint plus jamais les nouveaux expirés.
  - `app/api/cron/digest-messagerie/route.js:45-134` — N requêtes + 1
    `getUserById` GoTrue PAR profil ; messages récents cross-studio sans limite.
  - `app/api/cron/notifs-eleves/route.js:42-74` — `abos` chargés sans filtre
    statut ni limite (tous les carnets jamais vendus d'un studio).
- **Correctifs** : paginer chaque source (`.range()` en boucle, modèle
  `export/paiements-csv`), chunker tous les `.in()` à 200, purge liste_attente
  par jointure SQL (RPC DELETE USING), filtrer `abos.statut='actif'`, batcher
  la résolution d'emails, paralléliser les envois par lots (p-limit ~5).

### 2.3 🔴 RLS : réécritures P1 (5 tables chaudes) + P2 (messagerie) + helpers
- **Problème** : `auth.uid()`/`auth.email()` nus réévalués par ligne, et le
  bras élève des policies (sous-requête clients-par-email) seq-scanne
  `clients` entier faute d'index — payé par le dashboard (RLS = chemin des
  pages serveur + composants client), par 31 routes API sur 72, et par le
  moteur Realtime À CHAQUE événement × abonné.
- **Correctif** : annexe C — helpers `SECURITY DEFINER` (`mes_client_ids`,
  `mes_studio_ids`, `mes_cours_ids`, iso-périmètre v26 vérifié) + `(select
  auth.uid())` partout + policies scoped `TO authenticated`. Ferme aussi le
  finding sécurité. AVANT d'appliquer : dump `pg_policies` (annexe A) + passer
  l'Advisor Supabase « auth_rls_initplan » pour confronter à la prod réelle.
  APRÈS : `EXPLAIN (ANALYZE, BUFFERS)` sur pointage/revenus/getEleveConversations.

### 2.4 🟠 33 pages marketing rendues dynamiques pour un check cookie
- **Fichiers** : `app/page.js:54-58` + toutes les pages persona/villes/outils
  (`createServerClient()` + `auth.getUser()` par visite).
- **Problème** : tout le trafic d'acquisition (SEO, QR, prospection) paie une
  lambda au lieu d'un hit CDN ; Googlebot aussi.
- **Correctif** : déplacer « connecté → /dashboard » dans `proxy.js` (simple
  présence du cookie `sb-*`) et retirer le check des pages → statiques au build.

### 2.5 🟠 Embed sans cache (trafic externe multiplicatif)
- **Fichier** : `app/embed/[studioSlug]/page.js`
- **Problème** : chaque visiteur du site d'une prof = 1 render + 4 requêtes DB
  (dont toutes les presences des cours affichés, juste pour compter).
- **Correctif** : `unstable_cache(getData, { revalidate: 120 })` keyé
  slug+params (vue anonyme par design, cas idéal) + jauge par agrégat SQL.
  Bonus même motif : dédupliquer les 3 lectures `profiles` du portail avec
  React `cache()` (`app/p/[studioSlug]/layout.js` + `page.js` +
  `lib/portail-metadata.js`).

### 2.6 🟠 Lookups email GLOBAUX sans index ni scope studio
- **Fichiers** : `app/(dashboard)/dashboard/page.js:66-69` (pastille « aussi
  élève »), `app/api/eleve/compte/route.js:34-37`, `lib/push-server.js:130-133`,
  `/api/messagerie/unread` (branche élève).
- **Problème** : `.ilike('email', …)` sur clients/push_subscriptions SANS
  profile_id = seq scan de toute la table, sur des chemins pollés. ⚠️ ILIKE
  n'utilisera PAS l'index `lower(email)` : il faut AUSSI passer le code en
  `.eq()` sur l'email normalisé (l'index 1.2 sert immédiatement la RLS, et
  servira ces chemins après la retouche code).
- **Correctif** : index (annexe B) + remplacer ilike par eq(lower(email)).

### 2.7 🟠 Revenus : totaux d'argent plafonnés à 1000 lignes
- **Fichier** : `app/(dashboard)/revenus/page.js:15-43`
- **Problème** : paiements 12 mois + présences tarifées sans pagination → un
  studio à >1000 paiements/an affiche des totaux FAUX (le bug du CSV B1f,
  jamais corrigé sur la page).
- **Correctif** : boucle `.range()` (modèle `export/paiements-csv:100-124`)
  ou agrégats serveur.

### 2.8 🟠 Page Élèves : liste + export tronqués à 1000 fiches
- **Fichier** : `app/(dashboard)/clients/page.js:15-17`
- **Problème** : toutes les fiches (archives comprises) + abos embarqués,
  `select('*')`, sans `.range()` → au-delà de 1000 fiches, des élèves
  « disparaissent » de la liste ET du CSV d'export (portabilité RGPD fausse).
- **Correctif** : pagination serveur en boucle au minimum pour l'export ;
  colonnes explicites ; à terme recherche/segments côté serveur.

### 2.9 🟡 Divers bon rapport coût/gain
- `app/(dashboard)/cours/page.js:47-53` : borner la fenêtre des « prochaines
  séances » (8 semaines) — les séries prolongées à l'année crèvent le cap.
- `app/api/portail/[studioSlug]/reserver/route.js:320` + `reserver-serie:173` :
  le cap hebdo charge TOUT l'historique de l'élève — filtrer sur la semaine.
- `next.config.mjs` : AUCUN `images.remotePatterns` → next/image ne peut pas
  optimiser les photos uploadées ; couverture portail servie 1920px à un
  mobile 375px (`PortailHome.js:262-300`). Ajouter remotePatterns + next/image
  avec `sizes` + `priority` (LCP du portail).
- `components/portail/QrPortailModal.js` : `qrcode` dans le bundle du
  dashboard pour une modale rare → `next/dynamic`.

---

## CATÉGORIE 3 — À garder en tête pour plus tard (~500 profs)

- **Admin** : `fetchAllRows` rapatrie des tables entières (garde-fou 50k lignes,
  troncature silencieuse au-delà) → passer les stats en RPC d'agrégats SQL ;
  `admin/messagerie` a son propre N+1 (2 requêtes × 200 fils).
- **Crons** : au-delà de la pagination (2.2), découper par tranches de studios
  et/ou déporter les envois en file (le fan-out d'annonce à 500 élèves peut
  déjà dépasser `maxDuration` dans `after()` — `lib/messagerie-email.js`,
  claim posé AVANT envoi = ni instantané ni filet en cas de kill).
- **Rétention** : `emails_envoyes` et `notifications_eleves` ne sont JAMAIS
  purgées. ⚠️ La dédup des règles SI/ALORS « une fois par client à vie » VIT
  dans notifications_eleves : purge par TYPE uniquement (rappel_cours/digest/
  message_instant > 90 j purgeables ; `regle:*` à conserver À VIE).
- **Cloche prof** : `/api/notifications/check` dérive 8 requêtes tous les 5 min
  par prof connectée → déplacer anniversaires/retards dans un cron quotidien,
  la cloche ne faisant plus que lire.
- **`requireAuth` / layout dashboard** : `profiles.select('*')` (45 colonnes +
  4 JSONB) re-transféré à chaque navigation ET chaque appel API → liste de
  colonnes (attention : `notifications/check` compte sur le `*`).
- **Fonts** : `preload: false` sur les familles décoratives, audit des
  graisses Inter réellement utilisées ; envisager de descendre Instrument
  Serif dans les layouts des segments qui la consomment.
- **Espace élève** : historique complet chargé à chaque ouverture →
  `.limit(200)` + « voir plus ».
- **Index hygiène** (après lecture pg_stat annexe A) : doublons sûrs
  (`paiements_stripe_session_idx` vs unique v13, `idx_email_blacklist_email`,
  préfixes couverts par des composites) + index morts (`idx_cours_recurrence`
  sur colonne jamais écrite, `idx_presences_type_presence`…) — ne supprimer
  qu'avec idx_scan≈0 constaté.
- **À surveiller sans agir** : scalabilité Realtime (policies évaluées par
  événement×abonné — mesurer quand la messagerie sera agrégée), runtime
  caching next-pwa, rate-limit partagé v72.

---

## Couverture et limites

- Les 4 agents ont couvert : les 72 routes API (dont ~15 en diagonale, listées
  dans leurs rapports), les 4 crons ligne à ligne, les pages dashboard/portail
  principales, l'état SQL reconstruit v1→v88, les composants client des
  chemins chauds. Non couvert : plans EXPLAIN réels (lecture seule), tailles
  de chunks au build, internals complets des 6 gros composants client
  (requêtes vérifiées par grep, logique non relue), realtime WALRUS.
- Les verdicts d'index et de RLS sont déduits des migrations : **la prod peut
  avoir dérivé** (tout passe par le SQL Editor à la main) → toujours exécuter
  l'annexe A avant d'appliquer les annexes B/C.

---

## ANNEXE A — SQL de vérification (à coller dans le SQL Editor, lecture seule)

```sql
-- A1. Index existants + usage réel (confronte la carte statique à la prod).
SELECT
  s.relname                                   AS table_name,
  s.indexrelname                              AS index_name,
  pg_get_indexdef(s.indexrelid)               AS definition,
  ix.indisunique                              AS is_unique,
  s.idx_scan                                  AS scans,
  pg_size_pretty(pg_relation_size(s.indexrelid)) AS index_size,
  st.n_live_tup                               AS approx_rows,
  st.seq_scan                                 AS table_seq_scans
FROM pg_stat_user_indexes s
JOIN pg_index ix            ON ix.indexrelid = s.indexrelid
JOIN pg_stat_user_tables st ON st.relid = s.relid
WHERE s.schemaname = 'public'
ORDER BY s.relname, s.idx_scan DESC;

-- A2. Tables au ratio seq_scan le plus suspect (crons cross-studio).
SELECT relname, seq_scan, seq_tup_read, idx_scan, n_live_tup,
       pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY seq_tup_read DESC
LIMIT 20;

-- A3. Policies RÉELLES en prod (diff contre l'audit avant toute réécriture).
SELECT tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- A4. Sonde sécurité : fiches à email vide (exposées par la policy v26 à anon).
SELECT count(*) AS fiches_email_vide FROM public.clients WHERE email = '';
```

## ANNEXE B — Index proposés (exécuter chaque statement SEUL : CONCURRENTLY
## ne passe pas en transaction ; tables encore petites → retirer CONCURRENTLY
## est acceptable aujourd'hui)

```sql
-- Impact fort
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cours_date_seule ON public.cours (date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cours_recurrence_parent ON public.cours (recurrence_parent_id) WHERE recurrence_parent_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conv_members_conversation ON public.conversation_members (conversation_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_paiements_abonnement ON public.paiements (abonnement_id) WHERE abonnement_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_sender_client ON public.messages (sender_client_id) WHERE sender_client_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_lower_email ON public.clients (lower(email)) WHERE email IS NOT NULL AND email <> '';

-- Impact moyen
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_abonnements_actifs_date_fin ON public.abonnements (date_fin) WHERE statut = 'actif';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_prospects ON public.clients (id) WHERE statut = 'prospect';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cas_presence ON public.cas_a_traiter (presence_id) WHERE presence_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cas_cours ON public.cas_a_traiter (cours_id) WHERE cours_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cas_client ON public.cas_a_traiter (client_id) WHERE client_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_paiements_offre ON public.paiements (offre_id) WHERE offre_id IS NOT NULL;

-- Hygiène FK (mordent à la fusion v78 / suppressions en masse)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_envoyes_client ON public.messages_envoyes (client_id) WHERE client_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_essai_demandes_client ON public.cours_essai_demandes (client_id) WHERE client_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_essai_demandes_presence ON public.cours_essai_demandes (presence_id) WHERE presence_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sondages_reponses_client ON public.sondages_reponses (client_id) WHERE client_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_liste_attente_client ON public.liste_attente (client_id) WHERE client_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_abonnements_offre ON public.abonnements (offre_id) WHERE offre_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_client ON public.conversations (client_id) WHERE client_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_cours ON public.conversations (cours_id) WHERE cours_id IS NOT NULL;
```

## ANNEXE C — Réécritures RLS
## ⚠️ VERSION PÉRIMÉE, ne pas coller : la forme `= ANY ((select helper()))`
## de cette annexe échoue en 42883 « uuid = uuid[] » (Postgres ignore les
## doubles parenthèses et lit la forme sous-requête — constaté au premier run
## le 2026-08-19). LA source à appliquer = `migrations-v91-rls-perf.sql`
## (helpers en SETOF uuid + policies en `IN (select helper())`, sous-plan
## hashé évalué une fois). Le reste de l'annexe reste utile comme référence
## de périmètre.

### C0 — Helpers SECURITY DEFINER + prérequis

```sql
-- Fiches de l'utilisateur connecté (FK douce v83 EN PREMIER, email en secours).
-- SECURITY DEFINER coupe la récursion RLS ; STABLE = 1 évaluation par requête.
create or replace function public.mes_client_ids()
returns uuid[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(id), '{}'::uuid[])
  from public.clients
  where auth_user_id = auth.uid()
     or (email is not null and email <> ''
         and lower(email) = lower(coalesce(auth.email(), '')));
$$;
revoke all on function public.mes_client_ids() from public;
grant execute on function public.mes_client_ids() to authenticated;

create or replace function public.mes_studio_ids()
returns uuid[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct profile_id), '{}'::uuid[])
  from public.clients
  where auth_user_id = auth.uid()
     or (email is not null and email <> ''
         and lower(email) = lower(coalesce(auth.email(), '')));
$$;
revoke all on function public.mes_studio_ids() from public;
grant execute on function public.mes_studio_ids() to authenticated;

create or replace function public.mes_cours_ids()
returns uuid[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct p.cours_id), '{}'::uuid[])
  from public.presences p
  where p.client_id = any (public.mes_client_ids()) and p.cours_id is not null;
$$;
revoke all on function public.mes_cours_ids() from public;
grant execute on function public.mes_cours_ids() to authenticated;
-- + index idx_clients_lower_email et idx_conversations_client de l'annexe B.
```

### C1 — Les 5 tables chaudes (presences, paiements, clients, cours, abonnements)

```sql
alter policy "CRUD presences" on public.presences
  to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));
drop policy if exists "Eleve lit ses presences" on public.presences;
create policy "Eleve lit ses presences" on public.presences
  for select to authenticated
  using (client_id = any ((select public.mes_client_ids())));

alter policy "CRUD paiements" on public.paiements
  to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));
drop policy if exists "Eleve lit ses paiements" on public.paiements;
create policy "Eleve lit ses paiements" on public.paiements
  for select to authenticated
  using (client_id = any ((select public.mes_client_ids())));

alter policy "CRUD clients" on public.clients
  to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));
drop policy if exists "Eleve lit ses fiches client" on public.clients;
create policy "Eleve lit ses fiches client" on public.clients
  for select to authenticated
  using (id = any ((select public.mes_client_ids())));

alter policy "CRUD cours" on public.cours
  to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));
drop policy if exists "Eleve lit cours de ses studios" on public.cours;
create policy "Eleve lit cours de ses studios" on public.cours
  for select to authenticated
  using (profile_id = any ((select public.mes_studio_ids())));

alter policy "CRUD abonnements" on public.abonnements
  to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));
drop policy if exists "Eleve lit ses abonnements" on public.abonnements;
create policy "Eleve lit ses abonnements" on public.abonnements
  for select to authenticated
  using (client_id = any ((select public.mes_client_ids())));
```

### C2 — Messagerie (conversations, messages, conversation_members, réactions)

```sql
alter policy "Pro CRUD ses conversations" on public.conversations
  to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));
drop policy if exists "Eleve lit ses conversations 1-to-1" on public.conversations;
create policy "Eleve lit ses conversations 1-to-1" on public.conversations
  for select to authenticated
  using (type = 'client' and client_id = any ((select public.mes_client_ids())));
drop policy if exists "Eleve lit conversations cours auxquels inscrit" on public.conversations;
create policy "Eleve lit conversations cours auxquels inscrit" on public.conversations
  for select to authenticated
  using (type = 'cours' and cours_id = any ((select public.mes_cours_ids())));
-- NB : type='support' (v87) reste invisible élève par construction.

alter policy "Pro voit messages ses conversations" on public.messages
  to authenticated
  using (conversation_id in (select id from public.conversations
                             where profile_id = (select auth.uid())));
alter policy "Pro insere messages ses conversations" on public.messages
  to authenticated
  with check (sender_type in ('pro','system')
    and conversation_id in (select id from public.conversations
                            where profile_id = (select auth.uid())));
drop policy if exists "Eleve voit messages ses conversations" on public.messages;
create policy "Eleve voit messages ses conversations" on public.messages
  for select to authenticated
  using (conversation_id in (
    select c.id from public.conversations c
    where (c.type = 'client' and c.client_id = any ((select public.mes_client_ids())))
       or (c.type = 'cours'  and c.cours_id  = any ((select public.mes_cours_ids())))
  ));
drop policy if exists "Eleve insere messages ses conversations" on public.messages;
create policy "Eleve insere messages ses conversations" on public.messages
  for insert to authenticated
  with check (
    sender_type = 'eleve'
    and sender_client_id = any ((select public.mes_client_ids()))
    and conversation_id in (
      select c.id from public.conversations c
      where (c.type = 'client' and c.client_id = messages.sender_client_id)
         or (c.type = 'cours'  and c.cours_id  = any ((select public.mes_cours_ids())))
    )
  );

alter policy "Pro CRUD members de ses conversations" on public.conversation_members
  to authenticated
  using (conversation_id in (select id from public.conversations
                             where profile_id = (select auth.uid())))
  with check (conversation_id in (select id from public.conversations
                                  where profile_id = (select auth.uid())));
drop policy if exists "Eleve CRUD ses members" on public.conversation_members;
create policy "Eleve CRUD ses members" on public.conversation_members
  for all to authenticated
  using (client_id = any ((select public.mes_client_ids())))
  with check (client_id = any ((select public.mes_client_ids())));

alter policy reactions_select on public.messages_reactions
  using (exists (
    select 1 from public.messages m
    join public.conversation_members cm on cm.conversation_id = m.conversation_id
    where m.id = messages_reactions.message_id
      and (cm.profile_id = (select auth.uid())
           or cm.client_id = any ((select public.mes_client_ids())))));
alter policy reactions_insert on public.messages_reactions
  with check ((user_type = 'pro' and user_id = (select auth.uid()))
           or (user_type = 'eleve' and user_id = any ((select public.mes_client_ids()))));
alter policy reactions_delete on public.messages_reactions
  using ((user_type = 'pro' and user_id = (select auth.uid()))
      or (user_type = 'eleve' and user_id = any ((select public.mes_client_ids()))));
```

### C3 — Motif générique pour les policies pro-only (gain modeste, gratuit)

```sql
-- Exemple (les 2 du layout dashboard, évaluées à CHAQUE page) :
alter policy "Pro gere ses cas a traiter" on public.cas_a_traiter
  to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));
alter policy "Pro CRUD demandes essai" on public.cours_essai_demandes
  to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));
-- À décliner sur : notifications, offres, liste_attente, regles, lieux,
-- recurrences, evenements, inscriptions_evenements, mailings, messages_envoyes,
-- templates_communication, videos_cours, notifications_eleves, sondages_*,
-- support_tickets (⚠️ filtre RÉEL en prod = profile_id, vérifié A3),
-- push_subscriptions (user_id), factures, factures_paiements, profiles.
-- Les policies anon v25/v31/v36 : NE PAS toucher (jamais empruntées, défense
-- de la clé anon).
```

---

## RÉSULTATS DE L'ANNEXE A EN PROD (exécutée par Colin le 2026-08-19 au soir)

**A4 (sonde sécurité)** : `0` fiche à email vide → le trou v26 est purement
théorique aujourd'hui, personne n'a jamais rien pu lire. Fermeture maintenue
dans le lot RLS (un futur import écrivant `''` au lieu de NULL le rouvrirait).

**A3 (policies réelles)** : la prod correspond à la carte reconstruite de
l'audit — l'annexe C est applicable telle quelle, à UNE correction près :
`support_tickets` filtre `profile_id` (pas `user_id`). Détail utile : seules
les 5 policies élève à `coalesce(auth.email(),'')` (clients, presences,
paiements, abonnements, cours) ont le quirk « email vide » ; celles de la
messagerie utilisent `auth.email()` nu (NULL pour anon → sûres).

**A1 (index réels + usage)** : tout confirmé —
- `idx_cours_recurrence` : 2 scans (index mort, colonne jamais écrite) ;
- `paiements_stripe_session_idx` : 0 scans (doublon du unique v13) ;
- `idx_abonnements_gele` : 0 scans (sous-ensemble du composite) ;
- `push_subscriptions_email_idx` : 0 scans (mismatch `.ilike` confirmé) ;
- `uniq_clients_profile_email` : 0 scans en LECTURE — normal, c'est une
  contrainte d'écriture, ne pas s'en inquiéter ;
- aucun des index proposés en annexe B n'existe déjà (rien à dédoublonner).

**A2 (fréquence d'accès)** : confirmation EMPIRIQUE du mur messagerie/RLS —
les compteurs cumulés placent en tête `clients` (278 028 seq scans, 29,3 M
de lignes lues en séquentiel pour 217 lignes vivantes !), `messages` (190 533),
`conversation_members` (98 381), `conversations` (96 260). C'est la signature
des pollers messagerie + de la sous-requête RLS clients-par-email : la charge
projetée à 500 profs est DÉJÀ la charge dominante à 5 profs, et elle explique
une partie du CPU 90 % de l'ère Nano et des 247 slow queries.
⚠️ Nuance de lecture : sur des tables de 35-450 lignes, le planner CHOISIT le
seq scan (moins cher qu'un index) — ces compteurs mesurent la FRÉQUENCE, pas
une souffrance actuelle. Les index de l'annexe B prendront le relais
automatiquement quand les tables grossiront.

**🆕 DÉCOUVERTE (absente de l'audit statique)** : la prod porte
`clients_unique_nom_prenom` — UNIQUE `(profile_id, lower(trim(nom)),
lower(trim(prenom)))`, posé par `fix-doublons-clients.sql` (étape 5
« optionnelle » de la crise des doublons, appliquée à l'époque).
- **Risque produit** : deux VRAIES homonymes dans un même studio ne peuvent
  pas coexister — à 100+ élèves par studio, une « Marie Martin » n°2 fera
  échouer en 23505 la création de fiche (réservation portail, essai, pointage
  « créer+ajouter », ligne d'import CSV), avec un message générique.
- **Contexte** : ce verrou date d'AVANT la vraie stratégie anti-doublons
  (UNIQUE email v53 + détection `lib/doublons.js` + fusion v78). Il fait
  doublon avec elle, en plus brutal.
- **Reco** : le DROPPER — décision Colin. Avant : vérifier d'où viennent ses
  5 563 scans (probablement le planner qui s'en sert comme chemin d'accès
  banal, mais grep `nom.*prenom` dans les requêtes pour s'en assurer).

---

*Rapport rédigé le 2026-08-19 au soir, vérifié contre la prod le même soir
(annexe A exécutée, résultats ci-dessus). Aucune modification appliquée.
Ordre conseillé d'exécution : catégorie 1 → annexes B/C au fil des
validations de Colin.*
