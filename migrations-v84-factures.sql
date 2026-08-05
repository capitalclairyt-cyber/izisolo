-- ============================================================
-- MIGRATION v84 — Factures acquittées (CSE / mutuelles)
-- ============================================================
--
-- Demande terrain (Manon, 2026-08-05) : des élèves ont besoin d'une FACTURE
-- mensuelle de leur abonnement pour leur CSE — le « REÇU DE PAIEMENT » actuel
-- est refusé (pas une facture, pas de n° séquentiel, pas de SIRET, date de
-- règlement ambiguë).
--
-- Modèle (design validé par Colin) :
--   • une facture = 1..N paiements RÉGLÉS (ligne par paiement) ;
--   • un paiement appartient à AU PLUS une facture (UNIQUE paiement_id) —
--     jamais deux justificatifs pour le même argent ;
--   • numérotation séquentielle PAR STUDIO ET PAR ANNÉE (FAC-2026-0001),
--     attribuée atomiquement par la RPC (advisory lock transactionnel) ;
--   • le SNAPSHOT jsonb (émetteur/client/lignes/total/mention TVA) est gelé à
--     l'émission : re-télécharger redonne le MÊME document même si le profil
--     a changé depuis (une facture émise est immuable) ;
--   • pas de suppression : « annuler » = statut 'annulee' (le numéro reste
--     brûlé dans la séquence) + libération des paiements pour re-facturation.
--
-- Côté profil : facturation_siret / raison sociale / mention TVA. SIRET vide
-- = le portail continue de servir le reçu simple d'avant (aucune régression).
--
-- Écritures UNIQUEMENT via les 2 RPC, appelées par les routes API avec le
-- client service_role (execute révoqué pour anon/authenticated). Lectures :
-- la prof lit ses factures via RLS (fiche élève), l'élève passe par les
-- routes portail (service_role filtré par sa fiche).
--
-- Re-runnable (IF NOT EXISTS / OR REPLACE / DROP POLICY IF EXISTS).
-- ============================================================

-- ── 1. Identité de facturation du studio ────────────────────────────────────
alter table public.profiles
  add column if not exists facturation_siret text,
  add column if not exists facturation_raison_sociale text,
  add column if not exists facturation_mention_tva text;

comment on column public.profiles.facturation_siret is
  'SIRET (14 chiffres) affiché sur les factures (v84). Vide = pas de facturation : le portail sert un reçu simple.';
comment on column public.profiles.facturation_raison_sociale is
  'Nom / raison sociale sur les factures (v84). Vide = studio_nom.';
comment on column public.profiles.facturation_mention_tva is
  'Mention TVA au pied des factures (v84). Vide = « TVA non applicable, art. 293 B du CGI. »';

-- ── 2. Tables ───────────────────────────────────────────────────────────────
create table if not exists public.factures (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references public.profiles(id) on delete cascade,
  -- SET NULL : supprimer une fiche ne détruit jamais un document comptable
  -- (l'identité de l'élève survit dans le snapshot).
  client_id      uuid references public.clients(id) on delete set null,
  annee          int  not null,
  numero         int  not null,
  numero_affiche text not null,
  statut         text not null default 'emise' check (statut in ('emise', 'annulee')),
  date_emission  date not null,
  snapshot       jsonb not null,
  annulee_at     timestamptz,
  created_at     timestamptz not null default now(),
  unique (profile_id, annee, numero)
);

comment on table public.factures is
  'Factures acquittées émises pour les élèves (v84). Snapshot gelé à l''émission, numéro séquentiel par studio+année, jamais supprimées (statut annulee).';

create index if not exists idx_factures_profile on public.factures (profile_id);
create index if not exists idx_factures_client  on public.factures (client_id) where client_id is not null;

create table if not exists public.factures_paiements (
  facture_id  uuid not null references public.factures(id)  on delete cascade,
  -- CASCADE (pas RESTRICT) : la suppression d'un paiement facturé est bloquée
  -- CÔTÉ ROUTE (409 explicite) ; en DB, si un paiement disparaît quand même
  -- (suppression de compte RGPD en cascade), le document facture SURVIT avec
  -- son snapshot — seule la liaison de dédup s'efface.
  paiement_id uuid not null references public.paiements(id) on delete cascade,
  primary key (facture_id, paiement_id),
  -- LA règle d'or : un paiement ne peut figurer que sur UNE facture.
  unique (paiement_id)
);

comment on table public.factures_paiements is
  'Liaison facture ↔ paiements (v84). UNIQUE(paiement_id) = un paiement n''est jamais facturé deux fois (anti double justificatif CSE).';

create index if not exists idx_factures_paiements_facture on public.factures_paiements (facture_id);

-- ── 3. RLS — lecture prof uniquement (écritures via RPC service_role) ───────
alter table public.factures enable row level security;
alter table public.factures_paiements enable row level security;

drop policy if exists factures_select_own on public.factures;
create policy factures_select_own on public.factures
  for select using (auth.uid() = profile_id);

drop policy if exists factures_paiements_select_own on public.factures_paiements;
create policy factures_paiements_select_own on public.factures_paiements
  for select using (
    exists (select 1 from public.factures f
             where f.id = facture_id and f.profile_id = auth.uid())
  );

-- ── 4. RPC : émission atomique (numérotation + facture + liaisons) ──────────
create or replace function public.emettre_facture(
  p_profile_id   uuid,
  p_client_id    uuid,
  p_paiement_ids uuid[],
  p_snapshot     jsonb
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_attendus       int;
  v_valides        int;
  v_annee          int;
  v_numero         int;
  v_date           date;
  v_numero_affiche text;
  v_facture_id     uuid;
begin
  v_attendus := coalesce(array_length(p_paiement_ids, 1), 0);
  if v_attendus = 0 then
    return jsonb_build_object('ok', false, 'reason', 'aucun_paiement');
  end if;

  -- Tous les paiements : au studio, à cette fiche, et RÉGLÉS (une facture
  -- acquittée ne porte jamais un paiement en attente).
  select count(*) into v_valides
    from public.paiements p
   where p.id = any (p_paiement_ids)
     and p.profile_id = p_profile_id
     and p.client_id  = p_client_id
     and p.statut     = 'paid';
  if v_valides <> v_attendus then
    return jsonb_build_object('ok', false, 'reason', 'paiement_invalide');
  end if;

  if exists (select 1 from public.factures_paiements fp
              where fp.paiement_id = any (p_paiement_ids)) then
    return jsonb_build_object('ok', false, 'reason', 'deja_facture');
  end if;

  -- Date d'émission en heure de Paris (jamais now() UTC brut — piège minuit).
  v_date  := (now() at time zone 'Europe/Paris')::date;
  v_annee := extract(year from v_date)::int;

  -- Numérotation séquentielle par studio+année : deux émissions simultanées
  -- du même studio se sérialisent (max+1 sans trou possible sous le lock).
  perform pg_advisory_xact_lock(hashtext('facture:' || p_profile_id::text || ':' || v_annee::text));
  select coalesce(max(numero), 0) + 1 into v_numero
    from public.factures
   where profile_id = p_profile_id and annee = v_annee;

  v_numero_affiche := 'FAC-' || v_annee::text || '-' || lpad(v_numero::text, 4, '0');

  insert into public.factures (profile_id, client_id, annee, numero, numero_affiche, date_emission, snapshot)
  values (p_profile_id, p_client_id, v_annee, v_numero, v_numero_affiche, v_date, p_snapshot)
  returning id into v_facture_id;

  insert into public.factures_paiements (facture_id, paiement_id)
  select v_facture_id, unnest(p_paiement_ids);

  return jsonb_build_object(
    'ok', true,
    'facture_id', v_facture_id,
    'numero_affiche', v_numero_affiche,
    'annee', v_annee,
    'numero', v_numero,
    'date_emission', v_date
  );
end $$;

-- ── 5. RPC : annulation (numéro brûlé, paiements libérés) — atomique ────────
create or replace function public.annuler_facture(
  p_profile_id uuid,
  p_facture_id uuid
)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  update public.factures
     set statut = 'annulee', annulee_at = now()
   where id = p_facture_id
     and profile_id = p_profile_id
     and statut = 'emise';
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'introuvable_ou_deja_annulee');
  end if;

  -- Libère les paiements : re-facturables immédiatement.
  delete from public.factures_paiements where facture_id = p_facture_id;

  return jsonb_build_object('ok', true);
end $$;

-- ── 6. Exposition : service_role UNIQUEMENT ─────────────────────────────────
-- SECURITY DEFINER + execute public = n'importe quel JWT pourrait émettre pour
-- n'importe quel studio. On révoque tout : seules les routes API (qui vérifient
-- la propriété) appellent ces RPC via le client admin.
revoke execute on function public.emettre_facture(uuid, uuid, uuid[], jsonb) from public, anon, authenticated;
revoke execute on function public.annuler_facture(uuid, uuid) from public, anon, authenticated;
grant execute on function public.emettre_facture(uuid, uuid, uuid[], jsonb) to service_role;
grant execute on function public.annuler_facture(uuid, uuid) to service_role;

do $$
begin
  raise notice '✅ v84 : factures + factures_paiements + RPC emettre_facture/annuler_facture — colonnes facturation_* sur profiles.';
end $$;
