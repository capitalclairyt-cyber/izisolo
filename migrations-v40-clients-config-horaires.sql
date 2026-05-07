-- ═══════════════════════════════════════════════════════════════════════════
-- Migration v40 : Champs élèves configurables + horaires studio structurés
-- ═══════════════════════════════════════════════════════════════════════════
--
-- 1. profiles.client_fields_config JSONB
--    Configure les champs collectés sur les fiches élèves :
--    {
--      "predefined": {
--        "date_naissance": true|false,    // affiché au form si true
--        "adresse": true|false,
--        "niveau": true|false,
--        "source": true|false,
--        "notes": true|false
--      },
--      "custom": [
--        { "id": "uuid", "label": "Allergies", "type": "text"|"textarea"|"select",
--          "options": ["a","b"], "required": false, "ordre": 1 }
--      ]
--    }
--    NULL = config par défaut (cf. defaultClientFieldsConfig dans
--    lib/client-fields.js : tout coché sauf "source" qui est cochée si la prof
--    a activé le suivi de provenance).
--
-- 2. clients.custom_fields JSONB
--    Valeurs des champs perso saisis pour chaque élève. Forme :
--    { "<custom_field_id>": "<value>" }
--
-- 3. clients.adresse_postale TEXT
--    Adresse postale (le champ existant `adresse` est utilisé pour les pros).
--    On sépare pour ne pas créer de confusion.
--
-- 4. profiles.horaires_studio_jours JSONB
--    Horaires structurés (vs textarea libre actuel). Forme :
--    {
--      "lun": { "ouvert": true,  "plages": [{"debut":"09:00","fin":"20:00"}] },
--      "mar": { "ouvert": false, "plages": [] },
--      ...
--    }
--    On garde `horaires_studio` (text) pour la rétrocompat. L'UI settings
--    rendra les jours et synchronisera horaires_studio (text dérivé) pour la
--    page publique qui n'évolue pas tout de suite.
--
-- Idempotent.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS client_fields_config   JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS horaires_studio_jours  JSONB DEFAULT NULL;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS custom_fields    JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS adresse_postale  TEXT;

COMMENT ON COLUMN public.profiles.client_fields_config IS
  'Config des champs élève collectés (predefined toggles + custom fields). NULL = défaut (date_naissance + niveau actifs).';

COMMENT ON COLUMN public.profiles.horaires_studio_jours IS
  'Horaires structurés par jour de semaine (lun..dim) + plages horaires. Source de vérité, horaires_studio (text) en est dérivé pour la page publique.';

COMMENT ON COLUMN public.clients.custom_fields IS
  'Valeurs des champs perso configurés par la prof (cf. profiles.client_fields_config.custom). Forme : { custom_field_id: value }';

COMMENT ON COLUMN public.clients.adresse_postale IS
  'Adresse postale des élèves particuliers (le champ adresse est réservé aux structures pro).';

DO $$
BEGIN
  RAISE NOTICE '✅ v40 : clients_fields_config + horaires_studio_jours + clients.custom_fields + adresse_postale.';
END $$;
