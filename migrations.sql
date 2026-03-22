-- ============================================
-- IziStudio — Migrations Supabase
-- Exécuter dans l'éditeur SQL de Supabase
-- ============================================

-- ============================================
-- 1. PROFILES
-- ============================================
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  prenom          TEXT,
  nom             TEXT,
  email_contact   TEXT,
  telephone       TEXT,

  -- Studio
  studio_nom      TEXT DEFAULT 'Mon Studio',
  studio_slug     TEXT UNIQUE,
  metier          TEXT DEFAULT 'yoga',
  adresse         TEXT,
  code_postal     TEXT,
  ville           TEXT,

  -- Personnalisation UI
  ui_couleur      TEXT DEFAULT 'rose',

  -- Configuration paramétrique (JSONB)
  types_cours     JSONB DEFAULT '["Hatha","Vinyasa","Yin","Restoratif","Prénatal"]',
  niveaux         JSONB DEFAULT '["Débutant","Intermédiaire","Avancé"]',
  sources         JSONB DEFAULT '["Bouche à oreille","Instagram","Site web","Événement","Autre"]',
  modes_paiement  JSONB DEFAULT '["CB","Virement","Espèces","Chèque"]',

  -- Vocabulaire adaptatif
  vocabulaire     JSONB DEFAULT '{"client":"élève","clients":"élèves","seance":"séance","seances":"séances","cours":"cours"}',

  -- Portail client
  portail_actif   BOOLEAN DEFAULT false,
  portail_message TEXT DEFAULT 'Bienvenue dans mon studio !',

  -- Seuils alertes
  alerte_seances_seuil          INTEGER DEFAULT 2,
  alerte_expiration_jours       INTEGER DEFAULT 7,
  alerte_paiement_attente_jours INTEGER DEFAULT 14,

  -- Plan IziStudio (SaaS)
  plan            TEXT DEFAULT 'decouverte',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_subscription_status TEXT,
  stripe_current_period_end TIMESTAMPTZ,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Voir son profil" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Modifier son profil" ON profiles FOR UPDATE USING (id = auth.uid());

-- Trigger : créer le profil automatiquement à l'inscription
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, prenom, email_contact)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'prenom', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 2. OFFRES
-- ============================================
CREATE TABLE offres (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  nom             TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('carnet', 'abonnement', 'cours_unique')),
  seances         INTEGER,
  duree_jours     INTEGER,
  prix            DECIMAL(8,2) NOT NULL,
  actif           BOOLEAN DEFAULT true,
  ordre           INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE offres ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CRUD offres" ON offres FOR ALL USING (profile_id = auth.uid());

CREATE INDEX idx_offres_profile ON offres(profile_id);

-- ============================================
-- 3. CLIENTS
-- ============================================
CREATE TABLE clients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  nom             TEXT NOT NULL,
  prenom          TEXT,
  email           TEXT,
  telephone       TEXT,
  date_naissance  DATE,
  ville           TEXT,
  statut          TEXT DEFAULT 'prospect' CHECK (statut IN ('prospect', 'actif', 'fidele', 'inactif')),
  niveau          TEXT,
  pratiques       JSONB DEFAULT '[]',
  source          TEXT,
  objectifs       TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CRUD clients" ON clients FOR ALL USING (profile_id = auth.uid());

CREATE INDEX idx_clients_profile ON clients(profile_id);
CREATE INDEX idx_clients_statut ON clients(profile_id, statut);

-- ============================================
-- 4. EVENEMENTS (créé avant cours pour la FK)
-- ============================================
CREATE TABLE evenements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  nom             TEXT NOT NULL,
  type            TEXT DEFAULT 'Cours ponctuel',
  statut          TEXT DEFAULT 'ouvert' CHECK (statut IN ('ouvert', 'complet', 'termine', 'annule')),
  date_debut      DATE,
  date_fin        DATE,
  lieu            TEXT,
  capacite        INTEGER,
  prix            DECIMAL(8,2),
  description     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE evenements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CRUD evenements" ON evenements FOR ALL USING (profile_id = auth.uid());

CREATE INDEX idx_evenements_profile ON evenements(profile_id);

-- ============================================
-- 5. COURS
-- ============================================
CREATE TABLE cours (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  nom             TEXT NOT NULL,
  type_cours      TEXT,
  date            DATE NOT NULL,
  heure           TIME,
  duree_minutes   INTEGER DEFAULT 60,
  lieu            TEXT,
  capacite_max    INTEGER,
  evenement_id    UUID REFERENCES evenements(id) ON DELETE SET NULL,
  recurrence_id   UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE cours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CRUD cours" ON cours FOR ALL USING (profile_id = auth.uid());

CREATE INDEX idx_cours_profile ON cours(profile_id);
CREATE INDEX idx_cours_date ON cours(profile_id, date);
CREATE INDEX idx_cours_recurrence ON cours(recurrence_id);

-- ============================================
-- 6. ABONNEMENTS
-- ============================================
CREATE TABLE abonnements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  client_id       UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  offre_id        UUID REFERENCES offres(id) ON DELETE SET NULL,
  offre_nom       TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('carnet', 'abonnement', 'cours_unique')),

  date_debut      DATE NOT NULL,
  date_fin        DATE,

  seances_total   INTEGER,
  seances_utilisees INTEGER DEFAULT 0,

  statut          TEXT DEFAULT 'actif' CHECK (statut IN ('actif', 'epuise', 'expire', 'annule')),
  paiement_id     UUID,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE abonnements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CRUD abonnements" ON abonnements FOR ALL USING (profile_id = auth.uid());

CREATE INDEX idx_abonnements_profile ON abonnements(profile_id);
CREATE INDEX idx_abonnements_client ON abonnements(client_id);
CREATE INDEX idx_abonnements_statut ON abonnements(profile_id, statut);

-- ============================================
-- 7. PRESENCES
-- ============================================
CREATE TABLE presences (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  cours_id        UUID REFERENCES cours(id) ON DELETE CASCADE NOT NULL,
  client_id       UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  abonnement_id   UUID REFERENCES abonnements(id) ON DELETE SET NULL,

  pointee         BOOLEAN DEFAULT false,
  heure_pointage  TIMESTAMPTZ,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cours_id, client_id)
);

ALTER TABLE presences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CRUD presences" ON presences FOR ALL USING (profile_id = auth.uid());

CREATE INDEX idx_presences_cours ON presences(cours_id);
CREATE INDEX idx_presences_client ON presences(client_id);
CREATE INDEX idx_presences_abonnement ON presences(abonnement_id);

-- ============================================
-- 8. INSCRIPTIONS EVENEMENTS
-- ============================================
CREATE TABLE inscriptions_evenements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  evenement_id    UUID REFERENCES evenements(id) ON DELETE CASCADE NOT NULL,
  client_id       UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(evenement_id, client_id)
);

ALTER TABLE inscriptions_evenements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CRUD inscriptions_evenements" ON inscriptions_evenements FOR ALL USING (profile_id = auth.uid());

-- ============================================
-- 9. PAIEMENTS
-- ============================================
CREATE TABLE paiements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  client_id       UUID REFERENCES clients(id) ON DELETE SET NULL,
  offre_id        UUID REFERENCES offres(id) ON DELETE SET NULL,
  abonnement_id   UUID REFERENCES abonnements(id) ON DELETE SET NULL,

  intitule        TEXT,
  type            TEXT,
  montant         DECIMAL(8,2) NOT NULL,
  statut          TEXT DEFAULT 'paid' CHECK (statut IN ('paid', 'pending', 'cb', 'unpaid')),
  mode            TEXT DEFAULT 'CB',
  date            DATE DEFAULT CURRENT_DATE,
  notes           TEXT,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE paiements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CRUD paiements" ON paiements FOR ALL USING (profile_id = auth.uid());

CREATE INDEX idx_paiements_profile ON paiements(profile_id);
CREATE INDEX idx_paiements_client ON paiements(client_id);

-- ============================================
-- 10. MAILINGS
-- ============================================
CREATE TABLE mailings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  sujet           TEXT NOT NULL,
  cible           TEXT,
  corps           TEXT,
  destinataires   INTEGER DEFAULT 0,
  statut          TEXT DEFAULT 'draft' CHECK (statut IN ('draft', 'sent', 'scheduled')),
  date            DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE mailings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CRUD mailings" ON mailings FOR ALL USING (profile_id = auth.uid());

CREATE INDEX idx_mailings_profile ON mailings(profile_id);

-- ============================================
-- 11. FONCTION UTILITAIRE : updated_at auto
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_profiles_updated BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_clients_updated BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_abonnements_updated BEFORE UPDATE ON abonnements FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_evenements_updated BEFORE UPDATE ON evenements FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_paiements_updated BEFORE UPDATE ON paiements FOR EACH ROW EXECUTE FUNCTION update_updated_at();
