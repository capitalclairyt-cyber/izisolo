-- Migration v49 : Index de scalabilité pour les scans cross-studio des crons
--
-- Contexte : audit scalabilité data (mai 2026). Les tables qui grossissent sans
-- borne (presences = 1 ligne par élève × cours, messages = conversationnel) sont
-- déjà bien indexées pour les lectures dashboard (filtrées par cours_id/client_id/
-- conversation_id). MAIS deux crons quotidiens les balayent par un axe NON indexé,
-- ce qui devient un seq scan de toute la table à mesure que les données grossissent.
--
-- On ajoute exactement 2 index (pas plus) — ceux qui comblent un vrai trou, pas
-- ceux que couvre déjà un index existant.
--
-- ── 1. presences (profile_id, created_at) ──────────────────────────────────
-- La table presences n'a QUE des index sur ses FK enfants (cours_id, client_id,
-- abonnement_id) + un index PARTIEL (profile_id, client_id) WHERE est_due = true
-- (v15, réservé au futur job de relance d'impayés — n'aide pas un scan général).
-- Aucun index ne mène par profile_id sur l'ensemble des lignes.
--
-- Or le cron notifs-eleves (8h, le plus lourd) fait, POUR CHAQUE studio :
--     .from('presences').eq('profile_id', X).gte('cours.date', il30j)
--     .from('presences').eq('profile_id', X).order('id').limit(2000)
-- → sans index profile_id, chaque appel = seq scan de TOUTE la table presences
--   (tous studios confondus). Avec N studios c'est N seq scans complets / jour.
-- La liste "payer plus tard" du pointage fait aussi .eq('profile_id').eq(...).
--
-- (profile_id, created_at desc) = pattern multi-tenant classique "tenant + récence".
create index if not exists presences_profile_created_idx
  on public.presences (profile_id, created_at desc);

-- ── 2. messages (created_at) ────────────────────────────────────────────────
-- messages a déjà messages_conversation_idx (conversation_id, created_at desc),
-- parfait pour lire un fil. Mais le cron digest-messagerie (16h) fait une requête
-- SANS filtre conversation, cross-studio :
--     .from('messages').eq('sender_type','pro').gte('created_at', il24h)
-- → l'index composite ne sert pas (pas de conversation_id en tête) ⇒ seq scan.
-- Un index sur created_at seul permet un range-scan des dernières 24h puis filtre
-- sender_type (bas cardinal, donc en tête il serait un mauvais lead → on l'exclut).
create index if not exists messages_created_idx
  on public.messages (created_at desc);
