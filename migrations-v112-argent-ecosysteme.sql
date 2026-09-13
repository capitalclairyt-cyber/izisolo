-- ============================================================================
-- IziSolo — v112 : l'argent de l'écosystème (2026-09-13)
-- Lot 2 du chantier Associations & Studios (PLAN-ASSOS-STUDIOS-2026.md §4.3,
-- §5.1 « l'argent de l'asso », §5.2 « les dépenses », §6.5 « pont 4 »).
-- Re-runnable. À appliquer APRÈS v111. Puis :
--   node scripts/verifier-selects.mjs
--   node scripts/proof-argent-ecosysteme.mjs
-- ----------------------------------------------------------------------------
-- Quatre gestes :
--
--   1. `studio_membres.remuneration` : ce que la structure a convenu avec
--      chaque intervenante (par séance, à l'heure, en pourcentage du CA de ses
--      séances, ou un forfait mensuel). Le RELEVÉ mensuel (séances pointées,
--      présentes, CA rattaché) se calcule à la lecture, jamais stocké : la
--      vérité vit dans `cours`, `presences` et `paiements`.
--
--   2. `depenses` : la première table de dépenses de l'app. Simple par
--      construction (date, catégorie, montant TTC, HT et TVA facultatifs,
--      fournisseur, justificatif, rattachement facultatif à une intervenante,
--      une salle, un cours). Sert l'association (rapport financier de saison)
--      comme le studio (marge, lot 4). Une dépense « à régler » est de l'argent
--      dû ; « réglée » porte sa date et son mode, comme un encaissement.
--
--   3. `prestations` : l'enregistrement UNIQUE du pont 4. Une structure valide
--      le relevé d'une intervenante pour un mois → une prestation naît, avec sa
--      dépense « à régler » côté structure. L'intervenante qui a son IziSolo la
--      voit dans SES revenus (« Mes prestations »), la FACTURE (facture v2, non
--      acquittée, dans SA séquence), et quand la structure règle sa dépense, le
--      règlement devient un paiement encaissé chez elle (mode virement, date),
--      donc dans son assiette URSSAF. Chaque côté n'en voit que sa vue, par RLS.
--
--   4. Les factures v2 : `factures.type` ('acquittee' = celle de v84, portée par
--      des paiements reçus ; 'a_regler' = émise AVANT le règlement, adressée à
--      une structure, statut 'emise' → 'payee'). Même séquence de numérotation,
--      même snapshot figé à l'émission. C'est aussi ce qui règle le cas du CE
--      payeur direct, noté depuis v84.
--
-- ⚠️ Les deux tables neuves ne portent AUCUNE policy anon : les dépenses et
-- les prestations d'une structure ne regardent que son équipe (argent_voir /
-- argent_gerer) et, pour une prestation, l'intervenante concernée.
-- ============================================================================

-- ── 1. La rémunération convenue ─────────────────────────────────────────────
alter table public.studio_membres
  add column if not exists remuneration jsonb;

comment on column public.studio_membres.remuneration is
  '{ mode: par_seance | horaire | pourcentage_ca | forfait_mensuel, montant: number }. Lecteur unique : lib/remuneration.js (sanitizeRemuneration). Null = rien de convenu, le relevé compte les séances sans montant dû.';

-- ── 2. Les dépenses ─────────────────────────────────────────────────────────
create table if not exists public.depenses (
  id               uuid primary key default gen_random_uuid(),
  profile_id       uuid not null references public.profiles(id) on delete cascade,
  date             date not null default (now() at time zone 'Europe/Paris')::date,
  categorie        text not null default 'autre',
  libelle          text not null,
  montant_ttc      numeric(10,2) not null check (montant_ttc >= 0),
  montant_ht       numeric(10,2) check (montant_ht is null or montant_ht >= 0),
  tva_taux         numeric(5,2)  check (tva_taux is null or (tva_taux >= 0 and tva_taux <= 100)),
  fournisseur      text,
  justificatif_url text,
  notes            text,
  -- Rattachements facultatifs (analytique : lot 4 pour la marge).
  membre_id        uuid references public.studio_membres(id) on delete set null,
  lieu_id          uuid references public.lieux(id) on delete set null,
  cours_id         uuid references public.cours(id) on delete set null,
  -- Le pont 4 : la dépense qui est la prestation d'une intervenante.
  prestation_id    uuid,
  statut           text not null default 'reglee' check (statut in ('a_regler', 'reglee')),
  date_reglement   date,
  mode_reglement   text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_depenses_profile_date on public.depenses (profile_id, date desc);
create index if not exists idx_depenses_prestation on public.depenses (prestation_id) where prestation_id is not null;

comment on table public.depenses is
  'Les dépenses d''une structure (v112). Simple par construction ; la profondeur analytique (marge par cours, salle, intervenante) est le plan Studio, lot 4.';

alter table public.depenses enable row level security;

-- Lire = argent_voir ; écrire = argent_gerer. Mêmes noms que lib/studio-membre.
drop policy if exists "depenses lecture" on public.depenses;
create policy "depenses lecture" on public.depenses
  for select to authenticated
  using (profile_id in (select public.mes_studios_staff('argent_voir')));

drop policy if exists "depenses ecriture" on public.depenses;
create policy "depenses ecriture" on public.depenses
  for insert to authenticated
  with check (profile_id in (select public.mes_studios_staff('argent_gerer')));

drop policy if exists "depenses modification" on public.depenses;
create policy "depenses modification" on public.depenses
  for update to authenticated
  using (profile_id in (select public.mes_studios_staff('argent_gerer')))
  with check (profile_id in (select public.mes_studios_staff('argent_gerer')));

drop policy if exists "depenses suppression" on public.depenses;
create policy "depenses suppression" on public.depenses
  for delete to authenticated
  using (profile_id in (select public.mes_studios_staff('argent_gerer')));

drop trigger if exists tr_depenses_updated on public.depenses;
create trigger tr_depenses_updated before update on public.depenses
  for each row execute function public.update_updated_at();

-- ── 3. Les prestations (le pont 4) ──────────────────────────────────────────
create table if not exists public.prestations (
  id            uuid primary key default gen_random_uuid(),
  -- La STRUCTURE qui a reçu la prestation.
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  -- L'intervenante (sa ligne d'équipe dans cette structure).
  membre_id     uuid not null references public.studio_membres(id) on delete cascade,
  -- Le mois, 'AAAA-MM'. Une prestation par intervenante et par mois.
  periode       text not null check (periode ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  montant       numeric(10,2) not null check (montant >= 0),
  -- Le relevé FIGÉ au moment de la validation (séances, présentes, CA, mode
  -- de rémunération) : ce que l'intervenante a vu, ce que la facture reprend.
  releve        jsonb not null default '{}'::jsonb,
  statut        text not null default 'emise'
                check (statut in ('emise', 'facturee', 'reglee', 'annulee')),
  -- Côté structure : sa dépense « à régler ».
  depense_id    uuid references public.depenses(id) on delete set null,
  -- Côté intervenante (si elle a son IziSolo) : sa facture, puis son paiement.
  facture_id    uuid references public.factures(id) on delete set null,
  paiement_id   uuid references public.paiements(id) on delete set null,
  created_at    timestamptz not null default now(),
  facturee_at   timestamptz,
  reglee_at     timestamptz,
  annulee_at    timestamptz,
  unique (membre_id, periode)
);

create index if not exists idx_prestations_profile on public.prestations (profile_id, periode desc);
create index if not exists idx_prestations_membre on public.prestations (membre_id);

comment on table public.prestations is
  'Le pont 4 (v112) : le relevé validé d''une intervenante pour un mois. Deux vues par RLS : la structure (argent_voir) et l''intervenante (sa ligne d''équipe).';

alter table public.prestations enable row level security;

-- La structure lit et écrit ses prestations avec les mêmes droits que ses
-- dépenses. L'intervenante lit celles de SES lignes d'équipe (son compte), et
-- rien d'autre : jamais les dépenses de la structure, jamais une autre prof.
drop policy if exists "prestations structure lecture" on public.prestations;
create policy "prestations structure lecture" on public.prestations
  for select to authenticated
  using (profile_id in (select public.mes_studios_staff('argent_voir')));

drop policy if exists "prestations intervenante lecture" on public.prestations;
create policy "prestations intervenante lecture" on public.prestations
  for select to authenticated
  using (membre_id in (select m.id from public.studio_membres m
                        where m.auth_user_id = (select auth.uid())));

drop policy if exists "prestations structure ecriture" on public.prestations;
create policy "prestations structure ecriture" on public.prestations
  for insert to authenticated
  with check (profile_id in (select public.mes_studios_staff('argent_gerer')));

drop policy if exists "prestations structure modification" on public.prestations;
create policy "prestations structure modification" on public.prestations
  for update to authenticated
  using (profile_id in (select public.mes_studios_staff('argent_gerer')))
  with check (profile_id in (select public.mes_studios_staff('argent_gerer')));

-- La dépense connaît sa prestation (posée après la création de la table).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'depenses_prestation_id_fkey') then
    alter table public.depenses
      add constraint depenses_prestation_id_fkey
      foreign key (prestation_id) references public.prestations(id) on delete set null;
  end if;
end $$;

-- ── 4. Les factures v2 : non acquittées, émise → payée ───────────────────────
alter table public.factures
  add column if not exists type text not null default 'acquittee',
  add column if not exists prestation_id uuid references public.prestations(id) on delete set null,
  add column if not exists payee_at timestamptz;

alter table public.factures drop constraint if exists factures_type_check;
alter table public.factures add constraint factures_type_check
  check (type in ('acquittee', 'a_regler'));

alter table public.factures drop constraint if exists factures_statut_check;
alter table public.factures add constraint factures_statut_check
  check (statut in ('emise', 'payee', 'annulee'));

comment on column public.factures.type is
  'acquittee (v84 : portée par des paiements reçus) | a_regler (v112 : émise avant le règlement, adressée à une structure, statut emise puis payee).';

-- Émettre une facture NON acquittée pour une prestation : même séquence, même
-- lock, même snapshot figé que emettre_facture (v84). Appelée par la route
-- /api/prestations/[id]/facturer, en service_role, après vérification que la
-- personne connectée est bien l'intervenante de cette prestation.
create or replace function public.emettre_facture_prestation(
  p_profile_id    uuid,
  p_prestation_id uuid,
  p_snapshot      jsonb
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_annee          int;
  v_numero         int;
  v_date           date;
  v_numero_affiche text;
  v_facture_id     uuid;
  v_statut         text;
begin
  select statut into v_statut from public.prestations where id = p_prestation_id;
  if v_statut is null then
    return jsonb_build_object('ok', false, 'reason', 'introuvable');
  end if;
  if v_statut <> 'emise' then
    return jsonb_build_object('ok', false, 'reason', 'deja_facturee');
  end if;

  v_date  := (now() at time zone 'Europe/Paris')::date;
  v_annee := extract(year from v_date)::int;

  perform pg_advisory_xact_lock(hashtext('facture:' || p_profile_id::text || ':' || v_annee::text));
  select coalesce(max(numero), 0) + 1 into v_numero
    from public.factures
   where profile_id = p_profile_id and annee = v_annee;

  v_numero_affiche := 'FAC-' || v_annee::text || '-' || lpad(v_numero::text, 4, '0');

  insert into public.factures (profile_id, client_id, annee, numero, numero_affiche, date_emission, snapshot, type, prestation_id)
  values (p_profile_id, null, v_annee, v_numero, v_numero_affiche, v_date, p_snapshot, 'a_regler', p_prestation_id)
  returning id into v_facture_id;

  update public.prestations
     set statut = 'facturee', facture_id = v_facture_id, facturee_at = now()
   where id = p_prestation_id;

  return jsonb_build_object(
    'ok', true,
    'facture_id', v_facture_id,
    'numero_affiche', v_numero_affiche,
    'annee', v_annee,
    'numero', v_numero,
    'date_emission', v_date
  );
end $$;

-- Régler une prestation : la structure marque sa dépense réglée. Atomique :
-- la dépense, la prestation, et chez l'intervenante (si elle a son IziSolo) un
-- paiement encaissé (mode, date : son assiette URSSAF) rattaché à sa facture,
-- qui passe « payée ». Sans compte, la prestation est réglée et c'est tout.
create or replace function public.regler_prestation(
  p_profile_id     uuid,
  p_prestation_id  uuid,
  p_date           date,
  p_mode           text
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_p            public.prestations%rowtype;
  v_membre       public.studio_membres%rowtype;
  v_studio_prof  uuid;
  v_paiement_id  uuid;
  v_structure    text;
begin
  select * into v_p from public.prestations where id = p_prestation_id and profile_id = p_profile_id;
  if v_p.id is null then
    return jsonb_build_object('ok', false, 'reason', 'introuvable');
  end if;
  if v_p.statut = 'reglee' then
    return jsonb_build_object('ok', false, 'reason', 'deja_reglee');
  end if;
  if v_p.statut = 'annulee' then
    return jsonb_build_object('ok', false, 'reason', 'annulee');
  end if;

  select * into v_membre from public.studio_membres where id = v_p.membre_id;
  select studio_nom into v_structure from public.profiles where id = p_profile_id;

  -- Côté structure : la dépense est réglée.
  if v_p.depense_id is not null then
    update public.depenses
       set statut = 'reglee', date_reglement = p_date, mode_reglement = p_mode
     where id = v_p.depense_id and profile_id = p_profile_id;
  end if;

  -- Côté intervenante : SON studio est son compte (une structure = un compte,
  -- §6.1) ; un paiement encaissé y naît, rattaché à sa facture si elle l'a
  -- émise. Sans compte, rien : elle a son relevé, pas de comptabilité ici.
  v_studio_prof := v_membre.auth_user_id;
  if v_studio_prof is not null and exists (select 1 from public.profiles where id = v_studio_prof) then
    insert into public.paiements (profile_id, client_id, intitule, type, montant, statut, mode, date, date_encaissement, notes)
    values (
      v_studio_prof, null,
      'Prestation · ' || coalesce(v_structure, 'structure') || ' · ' || v_p.periode,
      'prestation',
      v_p.montant, 'paid', p_mode, p_date, p_date,
      'Réglé par ' || coalesce(v_structure, 'la structure') || ' (relevé ' || v_p.periode || ').'
    )
    returning id into v_paiement_id;

    if v_p.facture_id is not null then
      update public.factures set statut = 'payee', payee_at = now()
       where id = v_p.facture_id and statut = 'emise';
      insert into public.factures_paiements (facture_id, paiement_id)
      values (v_p.facture_id, v_paiement_id)
      on conflict do nothing;
    end if;
  end if;

  update public.prestations
     set statut = 'reglee', reglee_at = now(), paiement_id = v_paiement_id
   where id = p_prestation_id;

  return jsonb_build_object('ok', true, 'paiement_id', v_paiement_id);
end $$;

revoke execute on function public.emettre_facture_prestation(uuid, uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.regler_prestation(uuid, uuid, date, text) from public, anon, authenticated;
grant execute on function public.emettre_facture_prestation(uuid, uuid, jsonb) to service_role;
grant execute on function public.regler_prestation(uuid, uuid, date, text) to service_role;

-- ── Constat ──────────────────────────────────────────────────────────────────
do $$
declare n_dep int; n_pres int;
begin
  select count(*) into n_dep from public.depenses;
  select count(*) into n_pres from public.prestations;
  raise notice '✅ v112 : remuneration par membre, depenses (%), prestations (%), factures v2 (type a_regler, statut payee), RPC emettre_facture_prestation + regler_prestation', n_dep, n_pres;
end $$;
