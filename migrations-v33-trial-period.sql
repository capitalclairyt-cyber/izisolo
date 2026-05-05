-- ═══════════════════════════════════════════════════════════════════════════
-- Migration v33 : Trial 14 jours (Option B — full Pro pendant le trial)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Logique métier validée le 2026-05-05 :
--   - Tous les nouveaux signups ont 14 jours d'essai en plan PRO (le top tier
--     hors Premium), sans CB demandée
--   - Compteur visible sur dashboard et /parametres
--   - À J14, l'app passe en read-only tant que l'user ne souscrit pas
--     (enforcement UI-only pour MVP, triggers DB plus tard si nécessaire)
--   - Plan `free` (interne, exempté) ignore la logique trial = full access infini
--
-- Cette migration ajoute :
--   1. La colonne `trial_started_at` sur profiles
--   2. Un trigger BEFORE INSERT qui set trial_started_at = NOW() automatiquement
--      pour tous les nouveaux profils (sans toucher au trigger handle_new_user
--      existant qui crée la row à l'inscription)
--   3. Backfill des profils existants : trial_started_at = NOW() pour leur
--      offrir un trial à partir d'aujourd'hui (sauf Maude/free, sauf si déjà
--      souscrits)
--
-- Idempotent : DROP IF EXISTS partout.

-- ── 1. Colonnes ────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ;

-- Flags pour ne pas envoyer 2× le même rappel (cron J-3 / J-1, à venir)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_reminder_sent_j3 BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS trial_reminder_sent_j1 BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.profiles.trial_started_at IS
  'Début du trial 14j en plan Pro. NULL = pas de trial (typiquement plan free interne ou compte legacy avant la feature).';

-- ── 2. Trigger BEFORE INSERT pour set trial_started_at automatiquement ────
-- Évite de toucher au trigger handle_new_user existant. S'exécute juste
-- après lui. Si la row est insérée avec trial_started_at déjà set (par ex.
-- via un script admin), on respecte cette valeur.

CREATE OR REPLACE FUNCTION set_trial_started_on_profile_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.trial_started_at IS NULL THEN
    -- Pas de trial pour les comptes 'free' (exemptés) si on les insert
    -- explicitement via admin. Pour les NEW signups (trigger handle_new_user),
    -- le plan est généralement NULL ou 'solo' à ce moment, donc le trial
    -- est bien défini.
    IF COALESCE(NEW.plan, '') <> 'free' THEN
      NEW.trial_started_at := NOW();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_trial_on_profile_insert ON public.profiles;
CREATE TRIGGER trg_set_trial_on_profile_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_trial_started_on_profile_insert();

-- ── 3. Backfill des profils existants ──────────────────────────────────────
-- Logique :
--   - Plans 'free' (Maude, Colin) → on laisse NULL (pas de trial pertinent)
--   - Souscription Stripe active ou en trial → on laisse NULL (Stripe gère)
--   - Tous les autres → on set NOW() : ils gagnent un trial 14j à partir
--     d'aujourd'hui (cadeau "early adopter")
UPDATE public.profiles
SET trial_started_at = NOW()
WHERE trial_started_at IS NULL
  AND COALESCE(plan, 'solo') <> 'free'
  AND COALESCE(stripe_subscription_status, '') NOT IN ('active', 'trialing');

-- ── Vérif ──────────────────────────────────────────────────────────────────
do $$
declare
  n_total int;
  n_trial int;
  n_free int;
begin
  select count(*) into n_total from public.profiles;
  select count(*) into n_trial from public.profiles where trial_started_at is not null;
  select count(*) into n_free from public.profiles where plan = 'free';
  raise notice '✅ Trial v33 : % profils total, % en trial, % en free (exempt)',
    n_total, n_trial, n_free;
end $$;
