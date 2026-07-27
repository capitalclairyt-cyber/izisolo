-- ============================================================
-- MIGRATION v83 — FK DOUCE fiche ↔ compte (clients.auth_user_id)
-- ============================================================
--
-- Décision Colin 2026-07-27 (reco n°2 du brainstorm élèves 2026-07-22).
--
-- Le lien fiche ↔ compte était l'EMAIL SEUL : si la prof corrige l'email
-- d'une fiche, le compte de l'élève « perd » sa fiche en silence (espace
-- introuvable) et sa prochaine réservation crée un DOUBLON. La FK douce
-- solidifie le lien une fois posé :
--   • nullable — une fiche sans compte reste normale (prospect, saisie prof) ;
--   • NON unique — un même compte peut être élève dans PLUSIEURS studios
--     (une fiche par studio, cf. double identité post-Bruno) ;
--   • posée AUTOMATIQUEMENT à la connexion par lib/fiche-eleve.js
--     (résolution FK d'abord, email en secours → pose du lien) ;
--   • ON DELETE SET NULL — supprimer un compte (RGPD, sondes) ne casse
--     jamais la fiche du studio.
--
-- Backfill : lie les fiches existantes aux comptes existants par email
-- (lower) — les 36 comptes élèves du jour se lient immédiatement.
--
-- Re-runnable (IF NOT EXISTS + backfill idempotent sur NULL seulement).
-- ============================================================

alter table public.clients
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

comment on column public.clients.auth_user_id is
  'FK douce vers le compte de connexion de l''élève (v83). Posée à la connexion (lib/fiche-eleve). Le lien survit à un changement d''email de la fiche. NULL = fiche sans compte connu.';

create index if not exists idx_clients_auth_user_id
  on public.clients (auth_user_id) where auth_user_id is not null;

-- ── Backfill par email (idempotent : ne touche que les fiches non liées) ──
update public.clients c
   set auth_user_id = u.id
  from auth.users u
 where c.auth_user_id is null
   and c.email is not null
   and lower(c.email) = lower(u.email);

do $$
declare v_liees int;
begin
  select count(*) into v_liees from public.clients where auth_user_id is not null;
  raise notice '✅ v83 : clients.auth_user_id posée — % fiche(s) liée(s) à un compte.', v_liees;
end $$;
