-- ═══════════════════════════════════════════════════════════════════════════
-- Migration v39 : Trial 14 jours UNIQUE par compte
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Garantit que `trial_started_at` ne peut pas être réinitialisé à NULL ou
-- avancé dans le futur une fois qu'il a été défini une première fois.
-- Sécurité contre :
--   • Bug applicatif qui voudrait reset le trial
--   • Manipulation directe en DB par erreur
--   • Re-démarrage du trial après une annulation d'abonnement
--
-- Règle métier : un compte n'a droit qu'à UNE SEULE période d'essai de 14
-- jours dans toute son existence. Si la prof annule son abo après le trial,
-- elle bascule en statut 'canceled' (compte gelé) et doit re-souscrire pour
-- ré-accéder aux features. Pas de nouveau trial.
--
-- Idempotent.

CREATE OR REPLACE FUNCTION protect_trial_started_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Si trial_started_at était déjà défini, on bloque toute modification
  -- vers NULL ou vers une date plus récente (= avancement du trial).
  -- On AUTORISE de le remettre à une date PLUS ANCIENNE (cas edge admin
  -- qui voudrait corriger un bug) — mais Postgres trace ça dans les logs.
  IF OLD.trial_started_at IS NOT NULL THEN
    -- Tentative de mettre à NULL → refus
    IF NEW.trial_started_at IS NULL THEN
      RAISE EXCEPTION
        'Le trial 14 jours est unique par compte. Impossible de réinitialiser trial_started_at.'
        USING HINT = 'Pour gérer un re-trial exceptionnel, contacte un admin Mélutek.';
    END IF;

    -- Tentative d'avancer trial_started_at → refus
    IF NEW.trial_started_at > OLD.trial_started_at THEN
      RAISE EXCEPTION
        'Impossible d''avancer trial_started_at (trial unique).'
        USING HINT = 'Le trial 14 jours est consommé une seule fois par compte.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_trial_started_at ON public.profiles;
CREATE TRIGGER trg_protect_trial_started_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_trial_started_at();

DO $$
BEGIN
  RAISE NOTICE '✅ v39 : trial_started_at protégé contre réinitialisation.';
END $$;
