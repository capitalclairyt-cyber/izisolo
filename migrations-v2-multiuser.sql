-- ============================================
-- IziSolo — Migration v2 : Multi-Users
-- Support équipe (optionnel, activable par studio)
-- ============================================

-- Table des membres d'équipe
-- Le "owner" est le profile principal (celui qui paie le plan)
-- Les membres ont un rôle : admin, instructor, viewer
CREATE TABLE team_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id       UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,  -- le profil "owner"
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, -- le membre
  role            TEXT NOT NULL DEFAULT 'instructor' CHECK (role IN ('owner', 'admin', 'instructor', 'viewer')),
  nom_affiche     TEXT,
  actif           BOOLEAN DEFAULT true,
  permissions     JSONB DEFAULT '{"voir_revenus": false, "modifier_offres": false, "gerer_clients": true, "pointer": true}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(studio_id, user_id)
);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Le owner voit tous les membres de son studio
CREATE POLICY "Owner voit ses membres" ON team_members
  FOR SELECT USING (studio_id = auth.uid());

-- Le owner peut gérer ses membres
CREATE POLICY "Owner gère ses membres" ON team_members
  FOR ALL USING (studio_id = auth.uid());

-- Un membre voit son propre enregistrement
CREATE POLICY "Membre voit son profil" ON team_members
  FOR SELECT USING (user_id = auth.uid());

CREATE INDEX idx_team_studio ON team_members(studio_id);
CREATE INDEX idx_team_user ON team_members(user_id);

-- Trigger updated_at
CREATE TRIGGER tr_team_members_updated
  BEFORE UPDATE ON team_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Ajouter colonne multi_user au profil (activation optionnelle)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS multi_user_actif BOOLEAN DEFAULT false;

-- ============================================
-- Fonction helper : résoudre le profile_id effectif
-- Si l'user est membre d'un studio, retourne le studio_id
-- Sinon retourne son propre id (usage solo classique)
-- ============================================
CREATE OR REPLACE FUNCTION get_effective_profile_id()
RETURNS UUID AS $$
DECLARE
  effective_id UUID;
BEGIN
  -- D'abord chercher si l'user est membre d'un studio
  SELECT studio_id INTO effective_id
  FROM team_members
  WHERE user_id = auth.uid() AND actif = true
  LIMIT 1;

  -- Sinon, c'est son propre profil
  IF effective_id IS NULL THEN
    effective_id := auth.uid();
  END IF;

  RETURN effective_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- Note : Les RLS existantes utilisent profile_id = auth.uid()
-- Pour le mode multi-user, les instructeurs accèdent aux données
-- via le studio_id. On ajoute des policies alternatives.
-- ============================================

-- Clients : les membres du studio peuvent voir/modifier
CREATE POLICY "Membre voit clients studio" ON clients
  FOR SELECT USING (
    profile_id IN (
      SELECT studio_id FROM team_members
      WHERE user_id = auth.uid() AND actif = true
    )
  );

CREATE POLICY "Membre modifie clients studio" ON clients
  FOR ALL USING (
    profile_id IN (
      SELECT studio_id FROM team_members
      WHERE user_id = auth.uid() AND actif = true
      AND (permissions->>'gerer_clients')::boolean = true
    )
  );

-- Cours : les membres voient tous les cours du studio
CREATE POLICY "Membre voit cours studio" ON cours
  FOR SELECT USING (
    profile_id IN (
      SELECT studio_id FROM team_members
      WHERE user_id = auth.uid() AND actif = true
    )
  );

-- Présences : les membres peuvent pointer
CREATE POLICY "Membre gère presences studio" ON presences
  FOR ALL USING (
    profile_id IN (
      SELECT studio_id FROM team_members
      WHERE user_id = auth.uid() AND actif = true
      AND (permissions->>'pointer')::boolean = true
    )
  );

-- Abonnements : les membres voient les abonnements
CREATE POLICY "Membre voit abonnements studio" ON abonnements
  FOR SELECT USING (
    profile_id IN (
      SELECT studio_id FROM team_members
      WHERE user_id = auth.uid() AND actif = true
    )
  );
