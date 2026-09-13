-- ============================================================================
-- IziSolo — v114 : la gestion du studio (2026-09-13)
-- Lot 4 du chantier Associations & Studios (PLAN-ASSOS-STUDIOS-2026.md §5.2).
-- Re-runnable. À appliquer APRÈS v113. Puis :
--   node scripts/verifier-selects.mjs
--   node scripts/proof-gestion-studio.mjs
-- ----------------------------------------------------------------------------
-- Trois gestes, tous bornés :
--
--   1. Les SALLES : `lieux` gagne `salle_de` (l'id du lieu parent : une salle
--      EST une ligne de `lieux`, donc tout ce qui lit `cours.lieu_id` ou la
--      liste des lieux continue de marcher sans changement) et `capacite`.
--      Une séance porte sa salle par `cours.lieu_id`, comme avant un lieu.
--
--   2. Le CHEVAUCHEMENT refusé PAR LA BASE : deux séances dans la MÊME salle
--      qui se recouvrent dans le temps sont refusées à l'insert et à l'update
--      (trigger, message `CHEVAUCHEMENT_SALLE`). Seulement pour une SALLE
--      (`salle_de` non nul) : un lieu sans salles peut accueillir deux profs
--      en même temps, ce n'est pas à la base d'en décider. Le code vérifie
--      AVANT (lib/salles.js, aperçu à la création et sur les séries) ; la base
--      garantit. Une séance annulée ne bloque rien.
--
--   3. `profiles.releve_auto` : le studio (ou l'asso) demande que le relevé
--      du mois précédent parte tout seul à chaque intervenante le 1er du mois
--      (cron `expirations`, fenêtre de 5 jours, claim `emails_envoyes` type
--      `releve_auto`, même mécanique que le rappel URSSAF v93). Opt-in.
--
-- Rien ne change pour l'existant : aucune salle, aucun relevé automatique.
-- ============================================================================

-- ── 1. Les salles ────────────────────────────────────────────────────────────
alter table public.lieux
  add column if not exists salle_de uuid references public.lieux(id) on delete cascade,
  add column if not exists capacite integer;

alter table public.lieux drop constraint if exists lieux_capacite_check;
alter table public.lieux add constraint lieux_capacite_check
  check (capacite is null or (capacite >= 1 and capacite <= 500));

-- Une salle ne peut pas être la salle d'une salle (un seul niveau).
create or replace function public.lieux_un_seul_niveau()
returns trigger language plpgsql as $$
begin
  if new.salle_de is not null then
    if new.salle_de = new.id then
      raise exception 'SALLE_INVALIDE: une salle ne peut pas être sa propre salle';
    end if;
    if exists (select 1 from public.lieux p where p.id = new.salle_de and p.salle_de is not null) then
      raise exception 'SALLE_INVALIDE: une salle ne se rattache qu''à un lieu, pas à une autre salle';
    end if;
    if exists (select 1 from public.lieux p where p.id = new.salle_de and p.profile_id <> new.profile_id) then
      raise exception 'SALLE_INVALIDE: la salle et son lieu appartiennent à deux structures';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_lieux_un_seul_niveau on public.lieux;
create trigger trg_lieux_un_seul_niveau
  before insert or update of salle_de on public.lieux
  for each row execute function public.lieux_un_seul_niveau();

create index if not exists idx_lieux_salle_de on public.lieux (salle_de) where salle_de is not null;

-- ── 2. Le chevauchement de salle, refusé par la base ─────────────────────────
-- Miroir JS : lib/salles.js `chevauche()` (mêmes bornes : [début, fin[ ).
create or replace function public.refuser_chevauchement_salle()
returns trigger language plpgsql as $$
declare
  v_salle boolean;
  v_debut time;
  v_fin time;
  v_autre record;
begin
  if new.lieu_id is null or coalesce(new.est_annule, false) or new.date is null or new.heure is null then
    return new;
  end if;
  select (salle_de is not null) into v_salle from public.lieux where id = new.lieu_id;
  if not coalesce(v_salle, false) then
    return new;
  end if;
  v_debut := new.heure;
  v_fin := new.heure + make_interval(mins => coalesce(new.duree_minutes, 60));
  select c.id, c.nom, c.heure, c.duree_minutes into v_autre
    from public.cours c
   where c.lieu_id = new.lieu_id
     and c.date = new.date
     and c.id <> new.id
     and coalesce(c.est_annule, false) = false
     and c.heure < v_fin
     and (c.heure + make_interval(mins => coalesce(c.duree_minutes, 60))) > v_debut
   limit 1;
  if found then
    raise exception 'CHEVAUCHEMENT_SALLE: « % » occupe déjà cette salle le % à % (% min)', v_autre.nom, new.date, to_char(v_autre.heure, 'HH24:MI'), coalesce(v_autre.duree_minutes, 60)
      using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists trg_chevauchement_salle on public.cours;
create trigger trg_chevauchement_salle
  before insert or update of lieu_id, date, heure, duree_minutes, est_annule on public.cours
  for each row execute function public.refuser_chevauchement_salle();

create index if not exists idx_cours_lieu_date on public.cours (lieu_id, date) where lieu_id is not null;

-- ── 3. Le relevé automatique ─────────────────────────────────────────────────
alter table public.profiles
  add column if not exists releve_auto boolean not null default false;

-- ── Contrôle ─────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'lieux' and column_name = 'salle_de') then
    raise exception 'v114 : lieux.salle_de manquante';
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_chevauchement_salle') then
    raise exception 'v114 : trigger trg_chevauchement_salle manquant';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'releve_auto') then
    raise exception 'v114 : profiles.releve_auto manquante';
  end if;
end $$;
