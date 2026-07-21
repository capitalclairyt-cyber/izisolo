-- ============================================================
-- MIGRATION v66 — Lieux ILLIMITÉS pour tous les plans
-- ============================================================
--
-- Décision produit (2026-07-13) : les lieux ne sont plus un différenciateur de
-- plan (retour utilisatrice : prof nomade qui loue des salles différentes chaque
-- mois → la limite « 3 lieux » ne colle pas). On passe en lieux illimités pour
-- tout le monde.
--
-- Côté code : lib/constantes.js limiteLieux = null partout (le guard
-- lib/plan-guard.js `ajouter_lieu` laisse alors passer). Mais un TRIGGER DB
-- (v32/v54 `check_lieux_limit_for_plan`) plafonnait aussi à l'insert → il faut le
-- neutraliser, sinon la base bloque toujours.
--
-- On retire le trigger et on transforme la fonction en no-op (au cas où une
-- référence subsisterait). Re-runnable.
-- ============================================================

drop trigger if exists trg_check_lieux_limit_for_plan on public.lieux;

-- No-op défensif : si un trigger est recréé ailleurs, il n'imposera plus rien.
create or replace function public.check_lieux_limit_for_plan()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Lieux illimités pour tous les plans (v66). Aucune limite imposée.
  return new;
end;
$$;

do $$ begin
  raise notice '✅ v66 : lieux illimités (trigger de limite retiré).';
end $$;
