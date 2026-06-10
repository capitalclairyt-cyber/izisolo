-- ============================================================
-- MIGRATION v53 — Intégrité des données (Sprint 1 audit technique)
-- À exécuter dans le SQL Editor Supabase. RE-RUNNABLE (idempotente).
-- ============================================================
-- Contexte (sondes prod du 2026-06-10) :
--   • incr_seances_utilisees : appelée par /api/cas-a-traiter/resolve
--     mais ABSENTE en prod (jamais archivée en migration) → le décompte
--     d'un cas « no-show décompté » ne s'est JAMAIS appliqué (erreur
--     avalée par .catch(() => {})).
--   • marquer_carnets_epuises : appelée par le cron expirations,
--     absente aussi → les carnets finis n'étaient jamais passés 'epuise'.
--   • presences.statut_pointage : CHECK v5 limité à 4 valeurs alors que
--     la résolution de cas écrit absent_compte/annule/confirme/declinee.
--   • presences n'a PAS de colonnes statut / present / source — le code
--     qui les utilisait est corrigé dans le même sprint (côté JS).
--   • UNIQUE(cours_id, client_id) sur presences : déjà en place (v1) ✓
--   • clients : aucune unicité (profile_id, email) — 0 doublon mesuré
--     le 2026-06-10 sur 54 lignes, l'index passera sans dédoublonnage.
-- ============================================================

begin;

-- ─────────────────────────────────────────────────────────────
-- 1. CHECK statut_pointage étendu (statuts de résolution de cas)
-- ─────────────────────────────────────────────────────────────
alter table public.presences drop constraint if exists presences_statut_pointage_check;
alter table public.presences add constraint presences_statut_pointage_check
  check (statut_pointage in (
    'inscrit', 'present', 'absent', 'excuse',          -- pointage (v5)
    'absent_compte', 'annule', 'confirme', 'declinee'  -- résolution de cas
  ));

-- ─────────────────────────────────────────────────────────────
-- 2. Unicité clients par studio + email
-- ─────────────────────────────────────────────────────────────
-- Si cette ligne échoue (doublons apparus depuis la sonde), lister avec :
--   select profile_id, lower(trim(email)), count(*) from public.clients
--   where email is not null group by 1, 2 having count(*) > 1;
create unique index if not exists uniq_clients_profile_email
  on public.clients (profile_id, lower(trim(email)))
  where email is not null and trim(email) <> '';

-- ─────────────────────────────────────────────────────────────
-- 3. Index perf : paiements filtrés par mois (dashboard, revenus)
-- ─────────────────────────────────────────────────────────────
create index if not exists idx_paiements_profile_date
  on public.paiements (profile_id, date);

-- ─────────────────────────────────────────────────────────────
-- 4. ajuster_seances — SEUL point d'ajustement du compteur carnet
--    (remplace tous les read-modify-write JS).
--    SECURITY INVOKER : appelée soit en service_role (routes portail,
--    cours/annuler — RLS bypassée), soit avec la session du PROF
--    (resolve/undo) — la RLS abonnements (profile_id = auth.uid())
--    garantit qu'une session ne touche que ses propres carnets.
-- ─────────────────────────────────────────────────────────────
create or replace function public.ajuster_seances(p_abo_id uuid, p_delta int)
returns integer
language sql security invoker set search_path = public as $$
  update public.abonnements
     set seances_utilisees = greatest(0, coalesce(seances_utilisees, 0) + p_delta),
         updated_at = now()
   where id = p_abo_id
  returning seances_utilisees;
$$;
revoke all on function public.ajuster_seances(uuid, int) from public, anon;
grant execute on function public.ajuster_seances(uuid, int) to authenticated, service_role;

-- Compat : le code resolve déjà déployé appelle incr_seances_utilisees
-- avec la session du prof. Dès que cette migration est appliquée, le
-- décompte (cassé depuis toujours) se met à marcher.
create or replace function public.incr_seances_utilisees(p_abo_id uuid)
returns integer
language sql security invoker set search_path = public as $$
  select public.ajuster_seances(p_abo_id, 1);
$$;
revoke all on function public.incr_seances_utilisees(uuid) from public, anon;
grant execute on function public.incr_seances_utilisees(uuid) to authenticated, service_role;

-- ─────────────────────────────────────────────────────────────
-- 5. marquer_carnets_epuises — appelée par le cron expirations (3h)
-- ─────────────────────────────────────────────────────────────
create or replace function public.marquer_carnets_epuises()
returns integer
language sql security definer set search_path = public as $$
  with upd as (
    update public.abonnements
       set statut = 'epuise', updated_at = now()
     where statut = 'actif'
       and seances_total is not null
       and coalesce(seances_utilisees, 0) >= seances_total
    returning id
  )
  select count(*)::int from upd;
$$;
revoke all on function public.marquer_carnets_epuises() from public, anon, authenticated;
grant execute on function public.marquer_carnets_epuises() to service_role;

-- ─────────────────────────────────────────────────────────────
-- 6. reserver_place — réservation ATOMIQUE (verrou par cours)
--    Tue la course « 2 résas simultanées sur la dernière place »
--    (avant : check → insert → recheck → delete, non atomique).
-- ─────────────────────────────────────────────────────────────
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

  -- Déjà inscrit ?
  if exists (
    select 1 from public.presences
     where cours_id = p_cours_id and client_id = p_client_id
  ) then
    return jsonb_build_object('ok', false, 'reason', 'doublon');
  end if;

  -- Capacité — fiable car sous verrou
  if v_cours.capacite_max is not null then
    select count(*) into v_count from public.presences where cours_id = p_cours_id;
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

-- ─────────────────────────────────────────────────────────────
-- 7. pointer_presence — pointage + compteur carnet en UN appel
--    SECURITY INVOKER : appelée depuis le navigateur (page pointage),
--    la RLS s'applique (la prof ne touche que ses propres lignes).
--    Remplace le read-modify-write client-side (lost update multi-device).
-- ─────────────────────────────────────────────────────────────
create or replace function public.pointer_presence(
  p_presence_id uuid,
  p_statut text,
  p_pointee boolean,
  p_heure timestamptz,
  p_delta int
)
returns jsonb
language plpgsql security invoker set search_path = public as $$
declare
  v_abo_id uuid;
  v_reste int;
begin
  update public.presences
     set statut_pointage = p_statut,
         pointee = p_pointee,
         heure_pointage = p_heure
   where id = p_presence_id
  returning abonnement_id into v_abo_id;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'introuvable');
  end if;

  if p_delta <> 0 and v_abo_id is not null then
    update public.abonnements
       set seances_utilisees = greatest(0, coalesce(seances_utilisees, 0) + p_delta),
           updated_at = now()
     where id = v_abo_id
    returning seances_utilisees into v_reste;
  end if;

  return jsonb_build_object('ok', true, 'abonnement_id', v_abo_id, 'seances_utilisees', v_reste);
end;
$$;
revoke all on function public.pointer_presence(uuid, text, boolean, timestamptz, int) from public, anon;
grant execute on function public.pointer_presence(uuid, text, boolean, timestamptz, int) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 8. vendre_offre — abonnement + paiement(s) ATOMIQUES
--    SECURITY INVOKER : appelée depuis le navigateur (fiche client),
--    RLS appliquée, profile_id forcé à auth.uid() (jamais pris du client).
--    Remplace les 2 INSERT séquentiels (abo orphelin si le 2e échouait).
-- ─────────────────────────────────────────────────────────────
create or replace function public.vendre_offre(p_abonnement jsonb, p_paiements jsonb)
returns jsonb
language plpgsql security invoker set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_abo_id uuid;
  v_paiement_ids uuid[] := '{}';
  v_p jsonb;
  v_id uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  end if;

  if p_abonnement is not null and p_abonnement <> 'null'::jsonb then
    insert into public.abonnements
      (profile_id, client_id, offre_id, offre_nom, type, date_debut, date_fin,
       seances_total, seances_utilisees, statut, types_cours_autorises)
    values (
      v_uid,
      (p_abonnement->>'client_id')::uuid,
      nullif(p_abonnement->>'offre_id', '')::uuid,
      p_abonnement->>'offre_nom',
      p_abonnement->>'type',
      (p_abonnement->>'date_debut')::date,
      nullif(p_abonnement->>'date_fin', '')::date,
      nullif(p_abonnement->>'seances_total', '')::int,
      0,
      'actif',
      case
        when p_abonnement ? 'types_cours_autorises'
         and jsonb_typeof(p_abonnement->'types_cours_autorises') = 'array'
        then array(select jsonb_array_elements_text(p_abonnement->'types_cours_autorises'))
        else null
      end
    )
    returning id into v_abo_id;
  end if;

  for v_p in select * from jsonb_array_elements(coalesce(p_paiements, '[]'::jsonb)) loop
    insert into public.paiements
      (profile_id, client_id, offre_id, abonnement_id, echeancier_id, intitule,
       type, montant, statut, mode, date, notes, numero_cheque)
    values (
      v_uid,
      (v_p->>'client_id')::uuid,
      nullif(v_p->>'offre_id', '')::uuid,
      v_abo_id,
      nullif(v_p->>'echeancier_id', '')::uuid,
      v_p->>'intitule',
      nullif(v_p->>'type', ''),
      (v_p->>'montant')::numeric,
      v_p->>'statut',
      nullif(v_p->>'mode', ''),
      (v_p->>'date')::date,
      nullif(v_p->>'notes', ''),
      nullif(v_p->>'numero_cheque', '')
    )
    returning id into v_id;
    v_paiement_ids := v_paiement_ids || v_id;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'abonnement_id', v_abo_id,
    'paiement_ids', to_jsonb(v_paiement_ids)
  );
end;
$$;
revoke all on function public.vendre_offre(jsonb, jsonb) from public, anon;
grant execute on function public.vendre_offre(jsonb, jsonb) to authenticated;

commit;
