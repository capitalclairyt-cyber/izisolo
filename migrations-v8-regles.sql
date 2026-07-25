-- ============================================================
-- Migration v8 — Système de règles automatiques
-- ============================================================
-- Chaque règle = une condition (SI) + une action (ALORS)
-- Stockée par prof (profile_id), activable/désactivable
-- ============================================================

CREATE TABLE IF NOT EXISTS regles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Libellé libre
  nom             TEXT NOT NULL,
  actif           BOOLEAN DEFAULT true,
  ordre           INTEGER DEFAULT 0,

  -- ── Condition (SI) ──────────────────────────────────────
  -- condition_type : 'toujours' | 'abonnement_actif' | 'abonnement_type' | 'statut_client'
  condition_type  TEXT NOT NULL DEFAULT 'abonnement_actif',
  -- condition_params exemples :
  --   abonnement_type → { "type": "abonnement" }
  --   statut_client   → { "statut": "actif" }
  condition_params JSONB NOT NULL DEFAULT '{}',

  -- ── Action (ALORS) ───────────────────────────────────────
  -- action_type : 'payer_plus_tard_auto' | 'reservation_hebdo'
  --             | 'annulation_libre'     | 'acces_prioritaire'
  action_type     TEXT NOT NULL,
  -- action_params exemples :
  --   annulation_libre → { "delai_heures": 24 }
  action_params   JSONB NOT NULL DEFAULT '{}',

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE regles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CRUD regles"
  ON regles FOR ALL
  USING (profile_id = auth.uid());

-- Index de lecture rapide sur les règles actives d'un profil
CREATE INDEX IF NOT EXISTS idx_regles_profile_actif
  ON regles (profile_id)
  WHERE actif = true;

-- ============================================================
-- Exemples de règles à insérer manuellement ou via l'UI :
--
-- INSERT INTO regles (profile_id, nom, condition_type, action_type) VALUES
--   ('<uuid>', 'Abonnés → payer plus tard auto', 'abonnement_actif', 'payer_plus_tard_auto');
-- ============================================================
