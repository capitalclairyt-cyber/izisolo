-- Diagnostic colonnes nécessaires à /p/[slug]/espace
-- À lancer dans Supabase SQL Editor.
-- Tous les résultats doivent être TRUE.

SELECT
  -- v5 pointage
  EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'profiles' AND column_name = 'regles_annulation') AS v5_profiles_regles,
  EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'presences' AND column_name = 'statut_pointage') AS v5_presences_statut,

  -- v12 paiements compta (date_encaissement)
  EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'paiements' AND column_name = 'date_encaissement') AS v12_paiements_encaissement,

  -- v15 dette annulation tardive
  EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'profiles' AND column_name = 'regles_annulation') AS v15_regles,

  -- Test : on peut bien lire le profil 'atelier-melusine' anonymement (RLS public)
  EXISTS (SELECT 1 FROM profiles WHERE studio_slug = 'atelier-melusine' AND portail_actif = true) AS profile_visible,

  -- Combien de cours futurs publics
  (SELECT COUNT(*) FROM cours c
   JOIN profiles p ON p.id = c.profile_id
   WHERE p.studio_slug = 'atelier-melusine'
     AND coalesce(c.est_annule, false) = false
     AND c.date >= CURRENT_DATE) AS cours_futurs_publics;
