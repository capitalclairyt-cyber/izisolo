-- ============================================================
-- Migration v9 — Offres avancées
-- Carnet : référence prix unitaire
-- Abonnement : dates, séances/semaine, vacances, pro-rata
-- ============================================================

-- Référence prix unitaire (pour calcul remise carnet)
ALTER TABLE offres ADD COLUMN IF NOT EXISTS prix_unitaire_ref   DECIMAL(10,2);

-- Dates explicites pour les abonnements annuels/semestriels
ALTER TABLE offres ADD COLUMN IF NOT EXISTS date_debut          DATE;
ALTER TABLE offres ADD COLUMN IF NOT EXISTS date_fin            DATE;

-- Cadence hebdomadaire (1 séance/semaine, 2/semaine, etc.)
ALTER TABLE offres ADD COLUMN IF NOT EXISTS seances_par_semaine SMALLINT;

-- Inclure ou exclure les vacances scolaires dans le décompte
ALTER TABLE offres ADD COLUMN IF NOT EXISTS inclut_vacances     BOOLEAN DEFAULT true;

-- Pro-rata : activer + date limite de souscription
ALTER TABLE offres ADD COLUMN IF NOT EXISTS pro_rata_actif      BOOLEAN DEFAULT false;
ALTER TABLE offres ADD COLUMN IF NOT EXISTS pro_rata_date_limite DATE;
