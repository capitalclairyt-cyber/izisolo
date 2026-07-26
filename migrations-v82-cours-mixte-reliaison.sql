-- ============================================================
-- MIGRATION v82 — Cours MIXTE (carnets + tarif à l'unité) et
--                 re-liaison du carnet d'une présence par la prof
-- ============================================================
--
-- Cf. MODELE-COURS-CARNETS-2026.md (analyse 2026-07-26, recos R1 + R3).
--
-- 1) `cours.carnets_acceptes` (défaut false) : sur un cours à tarif_unitaire,
--    true = le tarif devient un FILET — les carnets applicables se résolvent
--    normalement (v64), seuls les élèves non couvertes paient à la séance.
--    false/absent = comportement v70 strict (atelier pur : personne ne
--    décompte). Les cours existants ne changent pas (défaut false).
--
-- 2) `pointer_presence` : le gate v70 devient
--    « tarifé ET carnets NON acceptés » — seule modification, le reste de la
--    résolution (priorité restreints d'abord / expire le plus tôt) est inchangé.
--    Miroir JS : lib/carnet-resolution.js (verrou carnet-resolution.spec.js).
--
-- 3) `relier_presence_carnet` (R3) : la prof choisit/corrige le carnet d'une
--    présence depuis le pointage. Le JS DÉCIDE des mouvements de compteur
--    (formule unifiée lib/pointage-delta.js, verrouillée par spec) et la RPC
--    EXÉCUTE atomiquement : re-crédit de l'ancien carnet + décompte du
--    nouveau + re-liaison, dans UNE transaction. La RPC re-vérifie ce qui la
--    protège (propriété de l'abo, place disponible) sans re-dériver la
--    formule de décompte (une seule source de vérité, côté JS).
--
-- SECURITY INVOKER : la RLS scoppe presences/abonnements au studio du JWT.
-- Re-runnable (IF NOT EXISTS / CREATE OR REPLACE).
-- ============================================================

-- ── 1. Colonne ──────────────────────────────────────────────────────────────
alter table public.cours
  add column if not exists carnets_acceptes boolean not null default false;

comment on column public.cours.carnets_acceptes is
  'Cours à tarif_unitaire : true = les carnets compatibles décomptent quand même (cours mixte, v82) ; false = personne ne décompte (atelier pur, v70). Sans effet si tarif_unitaire est vide.';

-- ── 2. pointer_presence : gate mixte ────────────────────────────────────────
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
  v_abo_id       uuid;
  v_client_id    uuid;
  v_cours_id     uuid;
  v_cours_type   text;
  v_cours_date   date;
  v_sans_carnets boolean;  -- tarifé ET carnets non acceptés (v70 ∩ v82)
  v_reste        int;
begin
  update public.presences
     set statut_pointage = p_statut,
         pointee = p_pointee,
         heure_pointage = p_heure
   where id = p_presence_id
  returning abonnement_id, client_id, cours_id
       into v_abo_id, v_client_id, v_cours_id;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'introuvable');
  end if;

  -- ── Résolution agnostique à l'ordre ──────────────────────────────────────
  -- On CONSOMME (delta>0) une présence non liée → trouver le carnet applicable.
  -- SAUF si le cours est payable à la séance SANS accepter les carnets
  -- (atelier pur v70). Un cours MIXTE (carnets_acceptes, v82) résout
  -- normalement : le tarif n'est que le filet des élèves non couvertes.
  if p_delta > 0 and v_abo_id is null then
    select c.type_cours, c.date,
           (coalesce(c.tarif_unitaire, 0) > 0 and not coalesce(c.carnets_acceptes, false))
      into v_cours_type, v_cours_date, v_sans_carnets
      from public.cours c
     where c.id = v_cours_id;

    if not coalesce(v_sans_carnets, false) then
      select a.id
        into v_abo_id
        from public.abonnements a
       where a.client_id = v_client_id
         and a.statut = 'actif'
         and (a.seances_total is null
              or coalesce(a.seances_utilisees, 0) < a.seances_total)
         and (a.date_fin is null
              or a.date_fin >= coalesce(v_cours_date, current_date))
         and not (a.date_pause_debut is not null
                  and a.date_pause_fin is not null
                  and a.date_pause_debut <= coalesce(v_cours_date, current_date)
                  and a.date_pause_fin   >= coalesce(v_cours_date, current_date))
         and (
               coalesce(array_length(a.types_cours_autorises, 1), 0) = 0  -- non restreint = tous
               or v_cours_type is null
               or v_cours_type = any (a.types_cours_autorises)
             )
       order by
         -- plus spécifique d'abord (restreint au type avant « tous »)
         (case when coalesce(array_length(a.types_cours_autorises, 1), 0) > 0 then 0 else 1 end),
         -- puis expire le plus tôt (les « jamais » en dernier)
         a.date_fin asc nulls last
       limit 1;

      if v_abo_id is not null then
        update public.presences set abonnement_id = v_abo_id where id = p_presence_id;
      end if;
    end if;
  end if;

  -- ── Décompte / crédit du carnet lié ──────────────────────────────────────
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
grant execute on function public.pointer_presence(uuid, text, boolean, timestamptz, int) to authenticated, service_role;

-- ── 3. relier_presence_carnet : choix/correction du carnet par la prof ──────
create or replace function public.relier_presence_carnet(
  p_presence_id        uuid,
  p_abo_id             uuid,      -- null = délier (à l'unité / sans carnet)
  p_crediter_ancien    boolean,   -- la séance était décomptée de l'ancien → +1
  p_decompter_nouveau  boolean    -- la séance doit compter sur le nouveau → -1 dessus (utilisees+1)
)
returns jsonb
language plpgsql security invoker set search_path = public as $$
declare
  v_pres   record;
  v_abo    record;
  v_reste  int;
begin
  select id, abonnement_id, client_id, profile_id
    into v_pres
    from public.presences
   where id = p_presence_id
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'introuvable');
  end if;

  if p_abo_id is not distinct from v_pres.abonnement_id then
    return jsonb_build_object('ok', true, 'noop', true, 'abonnement_id', v_pres.abonnement_id);
  end if;

  -- Cible : un carnet du MÊME élève, actif, avec de la place si on décompte.
  if p_abo_id is not null then
    select id, client_id, statut, seances_total, seances_utilisees
      into v_abo
      from public.abonnements
     where id = p_abo_id
     for update;

    if not found or v_abo.client_id is distinct from v_pres.client_id then
      return jsonb_build_object('ok', false, 'reason', 'abo_invalide');
    end if;
    if v_abo.statut <> 'actif' then
      return jsonb_build_object('ok', false, 'reason', 'abo_inactif');
    end if;
    if p_decompter_nouveau
       and v_abo.seances_total is not null
       and coalesce(v_abo.seances_utilisees, 0) >= v_abo.seances_total then
      return jsonb_build_object('ok', false, 'reason', 'abo_epuise');
    end if;
  end if;

  -- Re-crédit de l'ancien carnet (si la séance y était réellement comptée —
  -- décision prise côté JS avec la formule unifiée pointage-delta).
  if p_crediter_ancien and v_pres.abonnement_id is not null then
    update public.abonnements
       set seances_utilisees = greatest(0, coalesce(seances_utilisees, 0) - 1),
           updated_at = now()
     where id = v_pres.abonnement_id;
  end if;

  -- Décompte sur le nouveau.
  if p_decompter_nouveau and p_abo_id is not null then
    update public.abonnements
       set seances_utilisees = coalesce(seances_utilisees, 0) + 1,
           updated_at = now()
     where id = p_abo_id
    returning seances_utilisees into v_reste;
  end if;

  update public.presences
     set abonnement_id = p_abo_id
   where id = p_presence_id;

  return jsonb_build_object(
    'ok', true,
    'ancien_abo', v_pres.abonnement_id,
    'abonnement_id', p_abo_id,
    'seances_utilisees', v_reste
  );
end;
$$;

revoke all on function public.relier_presence_carnet(uuid, uuid, boolean, boolean) from public, anon;
grant execute on function public.relier_presence_carnet(uuid, uuid, boolean, boolean) to authenticated, service_role;

do $$ begin
  raise notice '✅ v82 : cours mixtes (carnets_acceptes) + re-liaison du carnet d''une présence (relier_presence_carnet).';
end $$;
