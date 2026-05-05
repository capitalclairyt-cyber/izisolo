-- ═══════════════════════════════════════════════════════════════════════════
-- Migration v35 : Cours / évènements payants à l'unité
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Ajoute 2 colonnes optionnelles sur `cours` pour gérer le cas
-- "workshop / stage / cours payant à l'unité" (cf. règle métier
-- workshop_vs_cours, et règle eleve_sans_carnet > forcer_stripe) :
--
--   - tarif_unitaire DECIMAL : prix du cours à l'unité (NULL = cours
--     régulier inclus dans le carnet/abo). Si défini, l'app traite
--     ce cours comme un évènement payant séparé.
--
--   - stripe_payment_link_unit TEXT : URL d'un Stripe Payment Link que
--     la prof a configuré côté Stripe pour ce cours/évènement précis
--     (ex: workshop yoga 2h à 30€). Si défini, c'est ce lien qu'on
--     redirige aux élèves quand la règle eleve_sans_carnet=forcer_stripe
--     se déclenche, ou directement à l'inscription pour un workshop.
--
-- Idempotent.

ALTER TABLE public.cours
  ADD COLUMN IF NOT EXISTS tarif_unitaire DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS stripe_payment_link_unit TEXT;

COMMENT ON COLUMN public.cours.tarif_unitaire IS
  'Prix du cours à l''unité (€) — NULL = cours régulier dans le carnet/abo. Si défini, l''app traite ce cours comme un évènement payant séparé (workshop/stage).';

COMMENT ON COLUMN public.cours.stripe_payment_link_unit IS
  'URL Stripe Payment Link pour acheter ce cours à l''unité. Si défini, l''app redirige les élèves sans carnet vers ce lien (cf. règle eleve_sans_carnet=forcer_stripe + règle workshop_vs_cours=separe).';

DO $$
BEGIN
  RAISE NOTICE '✅ v35 : cours.tarif_unitaire et cours.stripe_payment_link_unit ajoutées';
END $$;
