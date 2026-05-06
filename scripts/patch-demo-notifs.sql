-- ═══════════════════════════════════════════════════════════════════════════
-- Patch des notifications du compte demo `bonjour@melutek.com` :
-- ajoute `data.client_id` aux 4 notifs déjà insérées par le seed précédent
-- (qui ne remplissait pas la colonne `data`, d'où le clic-vers-mauvaise-page
-- diagnostiqué le 6 mai 2026).
--
-- À COLLER dans le SQL Editor Supabase. Idempotent.
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_profile_id uuid;
  v_camille    uuid;
  v_margaux    uuid;
  v_yannick    uuid;
BEGIN
  -- Récupérer le profil demo
  SELECT id INTO v_profile_id FROM auth.users WHERE email = 'bonjour@melutek.com';
  IF v_profile_id IS NULL THEN
    RAISE NOTICE '⚠️  Compte demo bonjour@melutek.com introuvable, patch skipped.';
    RETURN;
  END IF;

  -- Récupérer les 3 clients par prénom (Camille / Margaux / Yannick)
  SELECT id INTO v_camille FROM clients WHERE profile_id = v_profile_id AND prenom ILIKE 'camille' LIMIT 1;
  SELECT id INTO v_margaux FROM clients WHERE profile_id = v_profile_id AND prenom ILIKE 'margaux' LIMIT 1;
  SELECT id INTO v_yannick FROM clients WHERE profile_id = v_profile_id AND prenom ILIKE 'yannick' LIMIT 1;

  -- Patch — anniversaire & carnet_epuise → Camille
  UPDATE notifications
     SET data = jsonb_build_object('client_id', v_camille::text)
   WHERE profile_id = v_profile_id
     AND type IN ('anniversaire', 'carnet_epuise')
     AND (data IS NULL OR data = '{}'::jsonb OR NOT (data ? 'client_id'));

  -- Patch — paiement_retard → Margaux
  UPDATE notifications
     SET data = jsonb_build_object('client_id', v_margaux::text)
   WHERE profile_id = v_profile_id
     AND type = 'paiement_retard'
     AND (data IS NULL OR data = '{}'::jsonb OR NOT (data ? 'client_id'));

  -- Patch — abonnement_expire → Yannick
  UPDATE notifications
     SET data = jsonb_build_object('client_id', v_yannick::text)
   WHERE profile_id = v_profile_id
     AND type = 'abonnement_expire'
     AND (data IS NULL OR data = '{}'::jsonb OR NOT (data ? 'client_id'));

  RAISE NOTICE '✅ 4 notifs demo patchées avec data.client_id.';
END $$;

-- Vérif rapide : doit retourner 4 lignes avec client_id non null dans data
SELECT type, titre, data->>'client_id' AS client_id, lu
  FROM notifications n
  JOIN auth.users u ON u.id = n.profile_id
 WHERE u.email = 'bonjour@melutek.com'
 ORDER BY created_at DESC;
