-- ============================================================
-- MIGRATION v105 — Le pays d'un studio (Belgique, Luxembourg)
-- À exécuter dans le SQL Editor Supabase. RE-RUNNABLE.
-- ============================================================
-- Déclencheur : Melyflow, prof de yoga à Genly (Belgique), inscrite le
-- 2026-08-25. « La fonction facturation n'est pas adaptée pour moi. »
--
-- Elle n'était pas bloquée — son numéro d'entreprise passait, la validation
-- SIRET n'a jamais été bloquante — mais l'app lui affichait « SIRET :
-- 14 chiffres » en rouge et imprimait « SIRET » sur ses factures. Une app qui
-- dit à quelqu'un qu'il a tort alors qu'il a raison perd sa confiance en une
-- capture d'écran.
--
-- UNE colonne, UN lecteur (lib/pays.js). `not null default 'FR'` : les comptes
-- existants sont français, et le défaut doit être leur état actuel — personne
-- ne doit voir quoi que ce soit changer le jour de l'application.
--
-- Le CHECK ne liste QUE les pays réellement servis. La Suisse en est absente
-- volontairement : le franc suisse est un chantier à part (245 « € » écrits en
-- dur dans des textes, des emails et des PDF), et l'ouvrir ici donnerait des
-- montants faux — pire que de ne pas l'ouvrir.
-- ============================================================

alter table public.profiles
  add column if not exists pays text not null default 'FR';

alter table public.profiles drop constraint if exists profiles_pays_check;
alter table public.profiles add constraint profiles_pays_check
  check (pays in ('FR', 'BE', 'LU'));

do $$
begin
  raise notice '✅ v105 : profiles.pays en place (%)',
    (select string_agg(pays || '=' || n, ', ' order by n desc)
       from (select pays, count(*) n from public.profiles group by pays) t);
end $$;

-- ── Sonde (lecture seule, après application) ────────────────────────────────
-- select pays, count(*) from public.profiles group by 1 order by 2 desc;
