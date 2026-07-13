-- ============================================================
-- MIGRATION v64 — Pointage : décompte du carnet AGNOSTIQUE À L'ORDRE
-- ============================================================
--
-- Cf. MODELE-PAIEMENTS-2026.md §2 (résolution par séance) — Lot 2a.
--
-- PROBLÈME corrigé : le décompte du carnet au pointage dépendait de
-- `presence.abonnement_id`, figé à la CRÉATION de la présence. Si le carnet
-- était attribué APRÈS la création de la présence (« pointer puis attribuer »,
-- ou réservation sans carnet puis achat), la présence restait `abonnement_id
-- NULL` et le pointage ne décomptait jamais rien.
--
-- FIX : quand on CONSOMME une séance (p_delta > 0) sur une présence non liée à
-- un carnet, le RPC résout dynamiquement le carnet actif APPLICABLE À CE COURS
-- (bon type de cours, séances restantes, non expiré, pas en pause), le lie à la
-- présence, puis le décompte — le tout dans la même transaction (atomique).
--
-- Règles de résolution (figées avec Colin, 2026-07-13) :
--   - carnet non restreint (types_cours_autorises vide) = couvre TOUS les cours ;
--   - plusieurs carnets applicables → le plus SPÉCIFIQUE d'abord (restreint au
--     type avant « tous »), puis celui qui EXPIRE LE PLUS TÔT.
--
-- Ne résout JAMAIS pour un crédit (p_delta < 0) : il n'y a rien à recréditer sur
-- une présence qui n'a jamais consommé de carnet.
--
-- SECURITY INVOKER : la RLS s'applique → le RPC ne voit que les carnets/cours de
-- la prof connectée. Même signature qu'en v53 (résolution 100% interne) → aucun
-- changement de contrat d'appel côté client, hormis passer le vrai delta.
--
-- Re-runnable (CREATE OR REPLACE).
-- ============================================================

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
  v_abo_id     uuid;
  v_client_id  uuid;
  v_cours_id   uuid;
  v_cours_type text;
  v_cours_date date;
  v_reste      int;
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
  if p_delta > 0 and v_abo_id is null then
    select c.type_cours, c.date
      into v_cours_type, v_cours_date
      from public.cours c
     where c.id = v_cours_id;

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

do $$ begin
  raise notice '✅ v64 : pointer_presence résout le carnet applicable au pointage (agnostique à l''ordre).';
end $$;
