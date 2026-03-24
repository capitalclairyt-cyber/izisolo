-- ============================================================
-- MIGRATION v10 — Notifications + Messages envoyés + Anniversaires
-- ============================================================

-- Table notifications
CREATE TABLE IF NOT EXISTS notifications (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        text NOT NULL,
  -- 'anniversaire' | 'paiement_retard' | 'carnet_epuise' | 'abonnement_expire'
  titre       text NOT NULL,
  corps       text,
  data        jsonb DEFAULT '{}',
  lu          boolean DEFAULT false,
  ref_key     text,       -- clé de déduplication journalière
  created_at  timestamptz DEFAULT now(),
  expires_at  timestamptz -- suppression auto des notifs périmées
);

-- Empêche de recréer la même notif plusieurs fois dans la journée
CREATE UNIQUE INDEX IF NOT EXISTS notifications_ref_key_unique
  ON notifications (profile_id, ref_key)
  WHERE ref_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS notifications_profile_lu
  ON notifications (profile_id, lu, created_at DESC);

-- Table historique des messages envoyés
CREATE TABLE IF NOT EXISTS messages_envoyes (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id    uuid REFERENCES clients(id) ON DELETE SET NULL,
  canal        text NOT NULL,   -- 'email' | 'sms' | 'whatsapp'
  destinataire text,            -- email ou numéro
  sujet        text,
  corps        text NOT NULL,
  statut       text DEFAULT 'envoye',  -- 'envoye' | 'erreur'
  erreur       text,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_envoyes_profile
  ON messages_envoyes (profile_id, created_at DESC);

-- Paramètres anniversaire dans profiles
-- Préférences de notifications générales
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS notif_nouveau_client    boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_paiement_retard   boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_carnet_epuise     boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_abonnement_expire boolean DEFAULT true;

-- Paramètres anniversaire
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS anniversaire_mode       text DEFAULT 'semi',
  -- 'off' | 'manuel' | 'semi' | 'auto'
  ADD COLUMN IF NOT EXISTS anniversaire_message    text
    DEFAULT 'Joyeux anniversaire {{prenom}} ! 🎂 En ce jour spécial, toute l''équipe du studio vous souhaite une magnifique journée. À très bientôt sur le tapis !',
  ADD COLUMN IF NOT EXISTS anniversaire_cadeau_actif     boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS anniversaire_cadeau_offre_id  uuid REFERENCES offres(id),
  ADD COLUMN IF NOT EXISTS anniversaire_cadeau_type      text DEFAULT 'gratuit',
  -- 'gratuit' (offre à 0€) | 'remise' (% de remise)
  ADD COLUMN IF NOT EXISTS anniversaire_cadeau_remise_pct smallint DEFAULT 20;
