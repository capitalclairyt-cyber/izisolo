-- ═══════════════════════════════════════════════════════════════════════════
-- Migration v34 : Règles métier (cas particuliers paramétrables)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Validé le 2026-05-05 : la prof répond une fois à 7 questions phares pour
-- cadrer les cas problématiques (élève sans carnet réserve, annulation
-- hors délai, no-show, cours annulé prof, carnet expiré, liste d'attente,
-- workshop). L'app applique ensuite la règle automatiquement, ou remonte
-- le cas dans une "inbox à traiter" si la prof a choisi le mode manuel.
--
-- Ajoute :
--   1. profiles.regles_metier (JSONB) : config des 7 cas
--   2. table cas_a_traiter : inbox pour les cas en mode manuel ou nécessitant
--      une action manuelle de la prof

-- ── 1. Colonne regles_metier ──────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS regles_metier JSONB DEFAULT NULL;

COMMENT ON COLUMN public.profiles.regles_metier IS
  'Config des règles métier (cas particuliers). 7 clés (eleve_sans_carnet, annulation_hors_delai, no_show, cours_annule_prof, carnet_expire_avant_cours, liste_attente, workshop_vs_cours). Chaque entrée : { mode: "auto" | "manuel", choix: "...", notifProf: bool, notifEleveEmail: bool, notifEleveSms: bool, messageCustom: string|null }. NULL = config par défaut appliquée (cf. defaultRegles dans lib/regles-metier.js).';

-- ── 2. Table cas_a_traiter ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cas_a_traiter (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  case_type     TEXT NOT NULL,
  -- Références des entités concernées (toutes optionnelles selon le cas)
  client_id     UUID REFERENCES public.clients(id)   ON DELETE SET NULL,
  cours_id      UUID REFERENCES public.cours(id)     ON DELETE SET NULL,
  presence_id   UUID REFERENCES public.presences(id) ON DELETE SET NULL,
  -- Contexte métier (détails du cas, ex: { montant: 25, raison: "annulation 1h avant" })
  context       JSONB DEFAULT '{}'::jsonb,
  -- Résolution
  resolu_at     TIMESTAMPTZ,
  resolu_action TEXT, -- 'encaisse' | 'excuse' | 'decompte' | 'rembourse' | 'ignore' | autre
  resolu_par    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolu_notes  TEXT,
  -- Audit
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cas_a_traiter_profile_open_idx
  ON public.cas_a_traiter (profile_id, created_at DESC)
  WHERE resolu_at IS NULL;

CREATE INDEX IF NOT EXISTS cas_a_traiter_profile_all_idx
  ON public.cas_a_traiter (profile_id, created_at DESC);

ALTER TABLE public.cas_a_traiter ENABLE ROW LEVEL SECURITY;

-- Le pro voit/gère ses propres cas
DROP POLICY IF EXISTS "Pro gere ses cas a traiter" ON public.cas_a_traiter;
CREATE POLICY "Pro gere ses cas a traiter"
  ON public.cas_a_traiter FOR ALL
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- ── Trigger updated_at automatique ────────────────────────────────────────
-- Si la fonction update_updated_at existe déjà (migrations.sql), on réutilise.
-- Sinon on la crée.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at') THEN
    CREATE OR REPLACE FUNCTION update_updated_at()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $f$
    BEGIN
      NEW.updated_at := NOW();
      RETURN NEW;
    END;
    $f$;
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_cas_a_traiter_updated ON public.cas_a_traiter;
CREATE TRIGGER trg_cas_a_traiter_updated
  BEFORE UPDATE ON public.cas_a_traiter
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ── Vérif ─────────────────────────────────────────────────────────────────
DO $$
DECLARE
  has_col bool;
  has_table bool;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'regles_metier'
  ) INTO has_col;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'cas_a_traiter'
  ) INTO has_table;

  RAISE NOTICE '✅ v34 : profiles.regles_metier=%   cas_a_traiter.table=%', has_col, has_table;
END $$;
