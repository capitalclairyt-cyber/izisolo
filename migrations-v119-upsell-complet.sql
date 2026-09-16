-- ════════════════════════════════════════════════════════════════════════
-- v119 — Faire SENTIR ce que Complet apporte, au lieu de le verrouiller
-- (2026-09-16, décision Colin : « j'ai peur que le 0 € ne pousse pas assez
--  vers le 29 € » → on ne retire rien d'Essentiel, on rend le manque visible)
--
-- Deux choses, toutes les deux additives, aucune n'est nécessaire au produit :
--
--   1. `vues_portail` : combien de fois la page publique d'un studio a été
--      OUVERTE, par jour. C'est ce qui permet de dire à une prof Essentiel
--      « ta page a été ouverte 14 fois cette semaine, et personne n'a pu
--      réserver ». ⚠️ AUCUNE donnée personnelle : ni IP, ni user agent, ni
--      identité, ni page visitée. Un compteur par jour et par studio, rien
--      d'autre, et la prof elle-même n'est jamais comptée.
--
--   2. `presences.source` : d'où vient une inscription (portail, essai,
--      liste d'attente, ou la prof elle-même). Sans elle, le bilan de fin
--      d'essai ne peut pas distinguer « tes élèves ont réservé 12 fois »
--      de « tu as ajouté 12 personnes à la main » : on ne compte QUE ce
--      qu'on sait attribuer, et une ligne qu'on ne sait pas compter ne
--      s'affiche pas plutôt que d'afficher zéro.
--
-- Re-runnable. Rien ne change pour l'existant (aucune vue, source à NULL).
-- ════════════════════════════════════════════════════════════════════════

-- ── 1. Le compteur de vues du portail ───────────────────────────────────
create table if not exists vues_portail (
  profile_id uuid references profiles(id) on delete cascade not null,
  jour       date not null,
  vues       integer not null default 0,
  primary key (profile_id, jour)
);

alter table vues_portail enable row level security;

-- Lecture : la prof (ou un membre qui gère les paramètres du studio) lit les
-- vues de SON studio. Écriture : AUCUNE policy — l'incrément passe par la RPC
-- ci-dessous, en security definer, appelée par le serveur pour un visiteur
-- anonyme qui n'a et ne doit avoir aucun droit sur cette table.
drop policy if exists "Prof lit les vues de son studio" on vues_portail;
create policy "Prof lit les vues de son studio" on vues_portail
  for select to authenticated
  using (profile_id in (select mes_studios_staff('parametres')));

-- Incrément du jour (heure de Paris : une journée de studio n'est pas une
-- journée UTC). Jamais d'erreur remontée à la page publique : le compteur est
-- un confort, il ne doit pouvoir casser aucune visite.
create or replace function bump_vue_portail(p_profile uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into vues_portail (profile_id, jour, vues)
  values (p_profile, (now() at time zone 'Europe/Paris')::date, 1)
  on conflict (profile_id, jour) do update set vues = vues_portail.vues + 1;
end;
$$;

revoke all on function bump_vue_portail(uuid) from public;
revoke all on function bump_vue_portail(uuid) from anon;
revoke all on function bump_vue_portail(uuid) from authenticated;
grant execute on function bump_vue_portail(uuid) to service_role;

-- ── 2. D'où vient une inscription ───────────────────────────────────────
-- NULL = on ne sait pas (tout l'existant, et tout ce que la prof saisit).
-- Écrite par un UPDATE séparé, jamais dans un insert ni dans une RPC
-- existante (patron poserLienVisio v86) : une colonne inconnue ferait
-- échouer TOUTE la réservation tant que cette migration n'est pas passée.
alter table presences add column if not exists source text;

-- Le bilan d'essai compte les présences d'un studio sur une fenêtre de dates :
-- sans cet index, il scanne toutes les présences du studio.
create index if not exists idx_presences_profile_cree on presences(profile_id, created_at);
