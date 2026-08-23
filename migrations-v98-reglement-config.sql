-- ============================================================
-- MIGRATION v98 — Règlement par virement (RIB + email « comment régler »)
-- À exécuter dans le SQL Editor Supabase. RE-RUNNABLE.
-- ============================================================
-- Demande Colin 2026-08-23 (suite v97) : après une vente « à régler plus
-- tard » (demande d'offre ou autre), un email part vers l'élève avec le
-- moyen choisi par la prof : virement (RIB + référence + QR SEPA côté
-- espace), espèces ou chèque au studio.
--
-- UNE colonne jsonb, UN lecteur (lib/reglement.js — sanitizeReglementConfig,
-- règle §12 : un JSONB de config se lit par SON helper) :
--   {
--     "rib":          { "titulaire": "...", "iban": "FR76...", "bic": "..." } | absent,
--     "email_mode":   "auto" | "choix" | "jamais",   -- défaut 'choix'
--     "email_defaut": "virement" | "especes" | "cheque"
--   }
-- NULL = rien configuré : le bloc « quel email envoyer » du tunnel reste
-- proposé (espèces/chèque marchent sans RIB), virement désactivé.
--
-- Le code déployé DÉGRADE proprement sans cette colonne (lectures séparées
-- défensives, PGRST204/205 attrapés) : seule la sauvegarde de la carte
-- « Règlement par virement » des Paramètres la réclame.
-- ============================================================

alter table public.profiles add column if not exists reglement_config jsonb;

do $$
begin
  raise notice '✅ v98 : profiles.reglement_config prête (% profils configurés)',
    (select count(*) from public.profiles where reglement_config is not null);
end $$;
