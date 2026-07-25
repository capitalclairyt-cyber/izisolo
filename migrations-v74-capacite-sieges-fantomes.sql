-- ════════════════════════════════════════════════════════════════════════
-- v74 — Capacité sans sièges fantômes + colonnes héritées (audit 2026-07-25)
--
--   1) reserver_place : le comptage de capacité ignorait les présences
--      « mortes » — annulations tardives (l'élève ne viendra pas, sanction
--      déjà appliquée) et statuts de résolution annule/declinee. Un cours
--      « complet » le restait à vie avec des sièges fantômes, et la liste
--      d'attente n'était jamais promue. Le doublon, lui, reste vérifié sur
--      TOUTES les présences (une annulation tardive ne permet pas de
--      re-réserver gratuitement).
--   2) Archive re-runnable des colonnes presences.type_presence (v6) et
--      presences.payer_plus_tard : leurs migrations d'origine vivent HORS
--      repo — sans elles, un environnement neuf monté depuis migrations*.sql
--      cassait le pointage (42703).
--
--   Re-runnable.
-- ════════════════════════════════════════════════════════════════════════

-- ── 2) Colonnes héritées (no-op en prod, vital pour un env neuf) ─────────
ALTER TABLE public.presences ADD COLUMN IF NOT EXISTS type_presence text DEFAULT 'normal';
ALTER TABLE public.presences ADD COLUMN IF NOT EXISTS payer_plus_tard boolean DEFAULT false;

-- ── 1) RPC reserver_place — capacité filtrée ─────────────────────────────
create or replace function public.reserver_place(
  p_profile_id uuid,
  p_cours_id uuid,
  p_client_id uuid,
  p_abonnement_id uuid default null,
  p_type_presence text default null
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_cours record;
  v_count int;
  v_presence_id uuid;
begin
  -- Sérialise les réservations sur CE cours (verrou de transaction)
  perform pg_advisory_xact_lock(hashtextextended(p_cours_id::text, 42));

  select id, profile_id, capacite_max, est_annule into v_cours
    from public.cours where id = p_cours_id;
  if v_cours.id is null or v_cours.profile_id <> p_profile_id then
    return jsonb_build_object('ok', false, 'reason', 'introuvable');
  end if;
  if v_cours.est_annule then
    return jsonb_build_object('ok', false, 'reason', 'annule');
  end if;

  -- Anti cross-tenant : le client doit appartenir au même studio
  if not exists (
    select 1 from public.clients
     where id = p_client_id and profile_id = p_profile_id
  ) then
    return jsonb_build_object('ok', false, 'reason', 'introuvable');
  end if;

  -- Déjà inscrit ? (toutes présences confondues — une annulation tardive ne
  -- rouvre pas le droit de re-réserver en douce)
  if exists (
    select 1 from public.presences
     where cours_id = p_cours_id and client_id = p_client_id
  ) then
    return jsonb_build_object('ok', false, 'reason', 'doublon');
  end if;

  -- Capacité — fiable car sous verrou. v74 : on ne compte QUE les places
  -- réellement occupées (ni annulations tardives, ni annule/declinee).
  if v_cours.capacite_max is not null then
    select count(*) into v_count from public.presences
     where cours_id = p_cours_id
       and coalesce(annulation_tardive, false) = false
       and coalesce(statut_pointage, 'inscrit') not in ('annule', 'declinee');
    if v_count >= v_cours.capacite_max then
      return jsonb_build_object('ok', false, 'reason', 'complet');
    end if;
  end if;

  if p_type_presence is null then
    insert into public.presences (profile_id, cours_id, client_id, abonnement_id)
    values (p_profile_id, p_cours_id, p_client_id, p_abonnement_id)
    returning id into v_presence_id;
  else
    insert into public.presences (profile_id, cours_id, client_id, abonnement_id, type_presence)
    values (p_profile_id, p_cours_id, p_client_id, p_abonnement_id, p_type_presence)
    returning id into v_presence_id;
  end if;

  return jsonb_build_object('ok', true, 'presence_id', v_presence_id);
exception when unique_violation then
  -- Ceinture + bretelles : l'UNIQUE(cours_id, client_id) de v1
  return jsonb_build_object('ok', false, 'reason', 'doublon');
end;
$$;

revoke all on function public.reserver_place(uuid, uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.reserver_place(uuid, uuid, uuid, uuid, text) to service_role;

DO $$ BEGIN
  RAISE NOTICE '✅ v74 : capacité sans sièges fantômes + colonnes type_presence/payer_plus_tard archivées.';
END $$;
