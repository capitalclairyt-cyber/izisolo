-- ============================================================
-- MIGRATION v70 — Pointage : un cours « payable à la séance » ne
--                 résout plus AUCUN carnet (le moteur tient la promesse)
-- ============================================================
--
-- Cf. audit cohérence paiements 2026-07-22.
--
-- PROBLÈME corrigé : le formulaire de cours promet « Il ne décomptera aucun
-- carnet » quand `tarif_unitaire` est renseigné, et la RÉSERVATION portail
-- respecte cette promesse (règles carnet sautées). Mais la résolution v64 au
-- POINTAGE ignorait `cours.tarif_unitaire` : un élève à carnet applicable
-- (ex. carnet « tous cours ») pointé présent sur un atelier payant voyait son
-- carnet lié + décompté — l'élève payait deux fois, ou la prof perdait le
-- tarif de l'atelier.
--
-- FIX : la résolution AUTOMATIQUE du carnet est sautée quand
-- `coalesce(cours.tarif_unitaire, 0) > 0` (même sémantique « truthy » que le
-- JS). La présence reste non liée → l'UI de pointage affiche « À régler »
-- avec le tarif pré-rempli (pay-as-you-go).
--
-- IMPORTANT — l'override reste possible : si la présence est DÉJÀ liée à un
-- carnet (liaison explicite par la prof, ou historique), le décompte du
-- carnet lié continue de s'appliquer, y compris sur un cours tarifé. Seule la
-- résolution *automatique* est gatée.
--
-- Miroir JS : lib/carnet-resolution.js (même gate, pour l'affichage).
--
-- SECURITY INVOKER : inchangé (RLS). Même signature qu'en v53/v64 → aucun
-- changement de contrat d'appel côté client.
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
  v_abo_id       uuid;
  v_client_id    uuid;
  v_cours_id     uuid;
  v_cours_type   text;
  v_cours_date   date;
  v_cours_tarife boolean;
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
  -- SAUF si le cours est payable à la séance (tarif_unitaire) : promesse
  -- « aucun carnet décompté » → la présence reste pay-as-you-go (v70).
  if p_delta > 0 and v_abo_id is null then
    select c.type_cours, c.date, coalesce(c.tarif_unitaire, 0) > 0
      into v_cours_type, v_cours_date, v_cours_tarife
      from public.cours c
     where c.id = v_cours_id;

    if not coalesce(v_cours_tarife, false) then
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

do $$ begin
  raise notice '✅ v70 : pointer_presence ne résout plus de carnet sur un cours payable à la séance (tarif_unitaire).';
end $$;
