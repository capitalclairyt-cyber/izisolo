-- ============================================================================
-- v93 — Compta / déclaration URSSAF (2026-08-22, demande Colin : « mâcher le
-- travail à la prof pour sa déclaration »)
--
-- Trois gestes, indépendants les uns des autres :
--
--   1. BACKFILL date_encaissement — le trou rouvert par v53.
--      v12 avait posé date_encaissement ET backfillé les paiements 'paid'.
--      Puis la RPC vendre_offre (v53), devenue LE chemin de vente principal,
--      insère ses paiements SANS jamais l'écrire : depuis, tout « Payé
--      maintenant » naît avec date_encaissement NULL. Conséquences visibles :
--      la colonne « Date encaissement » de l'export comptable est vide, et
--      les factures v84 retombent sur la date d'échéance (lib/factures.js
--      fait déjà un coalesce défensif, l'export non).
--
--   2. vendre_offre écrit date_encaissement quand le paiement naît 'paid'.
--      Un paiement 'pending' n'en a pas : il n'est pas encaissé, par
--      définition. Le champ est accepté depuis le JSON s'il est fourni
--      (échéancier réglé à une date différente), sinon il vaut `date`.
--
--   3. profiles.urssaf_config jsonb — les réglages de déclaration (régime,
--      taux, périodicité, versement libératoire, rappel). NULL = la prof n'a
--      rien réglé : aucune estimation affichée, aucun email de rappel.
--      Lecture UNIQUEMENT via lib/urssaf.js (sanitize + défauts), jamais brut
--      — anti-pattern « un JSONB de config se lit par SON helper » (bible §12).
--
-- Aucune colonne générée, aucune réécriture de table : la borne temporelle
-- comptable (coalesce(date_encaissement, date)) est calculée à la lecture par
-- lib/urssaf.js `filtreDateComptable()`, donc le code est EXACT avant comme
-- après cette migration. Elle répare les données et ouvre les réglages.
--
-- Re-runnable.
-- ============================================================================

begin;

-- ── 1. Backfill : un paiement réglé a forcément été encaissé un jour ────────
-- Meilleure information disponible pour l'historique : sa date. Exactement le
-- backfill de v12, rejoué pour tout ce que v53 a créé depuis.
update public.paiements
   set date_encaissement = date
 where statut = 'paid'
   and date_encaissement is null;

-- ── 2. vendre_offre — le paiement réglé naît avec sa date d'encaissement ────
-- Identique à v53 sur tout le reste (signature, SECURITY INVOKER, profile_id
-- forcé à auth.uid()). Seule la liste de colonnes du INSERT paiements change.
create or replace function public.vendre_offre(p_abonnement jsonb, p_paiements jsonb)
returns jsonb
language plpgsql security invoker set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_abo_id uuid;
  v_paiement_ids uuid[] := '{}';
  v_p jsonb;
  v_id uuid;
  v_statut text;
  v_date date;
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
    v_statut := v_p->>'statut';
    v_date   := (v_p->>'date')::date;

    insert into public.paiements
      (profile_id, client_id, offre_id, abonnement_id, echeancier_id, intitule,
       type, montant, statut, mode, date, date_encaissement, notes, numero_cheque)
    values (
      v_uid,
      (v_p->>'client_id')::uuid,
      nullif(v_p->>'offre_id', '')::uuid,
      v_abo_id,
      nullif(v_p->>'echeancier_id', '')::uuid,
      v_p->>'intitule',
      nullif(v_p->>'type', ''),
      (v_p->>'montant')::numeric,
      v_statut,
      nullif(v_p->>'mode', ''),
      v_date,
      -- Encaissé = date fournie, sinon la date du paiement. Un 'pending'
      -- n'est pas encaissé : le champ reste NULL (assiette de trésorerie).
      case when v_statut = 'paid'
           then coalesce(nullif(v_p->>'date_encaissement', '')::date, v_date)
           else nullif(v_p->>'date_encaissement', '')::date
      end,
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

-- ── 3. Vocabulaire unique des modes de règlement ───────────────────────────
-- Découvert en relisant un vrai export : `paiements.mode` contenait SEPT
-- orthographes pour quatre moyens de paiement, la plus fréquente en prod
-- (« Espèces », 46 lignes) n'étant reconnue par AUCUN écran.
--   • la tuile « Encaissé par mode » de /revenus affichait 0 € d'espèces ;
--   • le filtre « mode » de l'export comptable ratait ces lignes, en silence ;
--   • le récapitulatif sortait deux lignes « Virement ».
-- Cause : l'écran de pointage écrivait les LIBELLÉS comme valeurs. Corrigé
-- côté code (lib/modes-paiement.js) ; ici on aligne l'historique.
update public.paiements set mode = 'especes'
 where mode is not null and mode <> 'especes'
   and lower(mode) in ('espèces', 'especes', 'espece', 'espèce', 'cash', 'liquide');

update public.paiements set mode = 'cheque'
 where mode is not null and mode <> 'cheque'
   and lower(mode) in ('chèque', 'cheque', 'chèques', 'cheques');

update public.paiements set mode = 'virement'
 where mode is not null and mode <> 'virement'
   and lower(mode) in ('virement', 'vir');

update public.paiements set mode = 'CB'
 where mode is not null and mode <> 'CB'
   and lower(mode) in ('cb', 'carte', 'carte bancaire', 'carte bleue', 'stripe');

-- ── 4. Réglages de déclaration ─────────────────────────────────────────────
alter table public.profiles
  add column if not exists urssaf_config jsonb;

comment on column public.profiles.urssaf_config is
  'Réglages de déclaration URSSAF (v93) : {regime, taux_cotisations, taux_cfp, periodicite, versement_liberatoire, taux_liberatoire, rappel_email}. NULL = non configuré (aucune estimation, aucun rappel email). Lu UNIQUEMENT via lib/urssaf.js.';

commit;

do $$
declare
  v_restants int;
  v_modes    int;
begin
  select count(*) into v_restants
    from public.paiements
   where statut = 'paid' and date_encaissement is null;
  select count(distinct mode) into v_modes
    from public.paiements
   where mode is not null and mode not in ('especes', 'cheque', 'virement', 'CB');
  raise notice '✅ v93 : backfill date_encaissement (% réglé(s) encore sans date, doit être 0), vendre_offre écrit date_encaissement, % orthographe(s) de mode hors vocabulaire (doit être 0), profiles.urssaf_config posée.', v_restants, v_modes;
end $$;
