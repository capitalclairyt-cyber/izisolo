-- ============================================================
-- v92 — Tarif du cours d'essai PAR TYPE DE COURS (retour Kim 2026-08-20 :
-- « le tarif d'un essai en particulier n'est pas le même qu'en collectif »)
--
-- profiles.essai_prix_par_type jsonb : surcharges {type_de_cours: prix}.
-- NULL (défaut) = prix unique essai_prix, comportement historique intact.
-- Ne s'applique QU'AU mode 'sur_place' : le mode 'stripe' a UN SEUL lien de
-- paiement (essai_stripe_payment_link), un prix variable y mentirait.
--
-- Lecture UNIQUEMENT via lib/essai-tarif.js (sanitize + prixEssai + fetch
-- DÉFENSIF séparé — la colonne ne va JAMAIS dans les selects principaux,
-- anti-pattern « colonnes fantômes » de la bible §12).
-- Re-runnable.
-- ============================================================

alter table public.profiles
  add column if not exists essai_prix_par_type jsonb;

comment on column public.profiles.essai_prix_par_type is
  'Surcharges du tarif du cours d''essai par type de cours ({type: prix}, v92). NULL = prix unique essai_prix. Mode sur_place uniquement. Lu via lib/essai-tarif.js.';

do $$ begin
  raise notice '✅ v92 : profiles.essai_prix_par_type (tarif d''essai par type de cours).';
end $$;
