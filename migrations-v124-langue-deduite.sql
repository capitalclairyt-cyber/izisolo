-- ============================================================================
-- IziSolo — v124 : une langue DEVINÉE n'est pas une langue CHOISIE
-- (2026-09-25). Re-runnable. Puis :
--   node scripts/verifier-selects.mjs
--   node scripts/proof-langue-auto.mjs
-- ----------------------------------------------------------------------------
-- `clients.langue` (v122) mémorise la langue d'une élève pour ses emails et
-- ses push. Depuis v123 elle peut venir de deux sources : le bouton FR / EN
-- (un CHOIX, posé par cookie) ou le navigateur de la visiteuse quand le studio
-- est en « auto » (un signal FAIBLE). Les deux s'écrivaient dans la même
-- colonne, et les emails lisent la fiche AVANT le studio : un studio qui
-- passait ensuite sa page en « Français » ne reprenait jamais la main sur les
-- fiches devinées.
--
-- POURQUOI. Le 24/09, Yasmine (Health Moment, Paris) a testé sa page depuis
-- un téléphone en anglais : ses quatre fiches ont appris « en » par le
-- navigateur, et régler sa page en français n'aurait rien changé à leurs
-- emails. Le trou n'était pas le navigateur, c'était l'oubli de la provenance.
--
-- `langue_deduite` dit d'où vient la valeur : false = choisie (cookie),
-- true = devinée (navigateur). Règle de lecture (lib/i18n-portail,
-- langueEleve) : une langue choisie prime toujours ; une langue devinée ne
-- vaut que tant que le studio est en « auto », et s'efface derrière son choix
-- (fr ou en). Le backfill marque « devinées » les langues posées depuis le
-- 23/09 (le jour où le navigateur a commencé à écrire) dans les studios en
-- « auto » : avant cette date, seul le cookie écrivait.
--
-- Sans v124 : tout marche comme avant (la colonne manque, les écritures se
-- rejouent sans elle, une langue devinée compte comme choisie).
-- ============================================================================

alter table public.clients
  add column if not exists langue_deduite boolean not null default false;

update public.clients c
   set langue_deduite = true
  from public.profiles p
 where p.id = c.profile_id
   and c.langue is not null
   and c.langue_deduite = false
   and coalesce(p.langue_portail, 'auto') = 'auto'
   and c.updated_at >= '2026-09-23';

do $$
begin
  raise notice '✅ v124 : clients.langue_deduite (false = choisie par le bouton FR / EN, true = devinée du navigateur) ; une langue devinée s''efface derrière le choix du studio';
end $$;
