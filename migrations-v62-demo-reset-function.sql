-- ============================================================
-- MIGRATION v62 — fonction reset_demo_data() (reset nocturne démo)
-- À exécuter dans le SQL Editor Supabase. RE-RUNNABLE.
-- Wrap idempotent du seed seed-demo-bonjour.sql en fonction, pour que
-- le cron /api/cron/reset-demo puisse la rejouer chaque nuit.
-- ⚠️ Feature TEMPORAIRE (démo privée). Pour retirer : drop function +
--    supprimer le cron + la route /demo + l'env DEMO_SECRET.
-- ============================================================

CREATE OR REPLACE FUNCTION public.reset_demo_data() RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE
  v_user_id UUID;
  v_profile_id UUID;
  -- Lieux
  v_lieu_principal UUID;
  -- Offres
  v_offre_carnet5 UUID;
  v_offre_carnet10 UUID;
  v_offre_abo_mensuel UUID;
  v_offre_unique UUID;
  -- Récurrence
  v_recurrence_vinyasa_lundi UUID;
  v_recurrence_yin_jeudi UUID;
  -- Évènement (workshop)
  v_evenement_workshop UUID;
  -- Clients
  v_c1 UUID; v_c2 UUID; v_c3 UUID; v_c4 UUID; v_c5 UUID; v_c6 UUID;
  v_c7 UUID; v_c8 UUID; v_c9 UUID; v_c10 UUID; v_c11 UUID; v_c12 UUID;
  -- Cours (id de qq cours pour relier paiements/cas)
  v_cours_passe1 UUID;
  v_cours_passe_annule UUID;
  v_cours_aujourdhui UUID;
  v_cours_demain UUID;
  -- Abonnements
  v_abo_active1 UUID;
  v_abo_active2 UUID;
  v_abo_expire UUID;
  -- Variables boucles
  i INTEGER;
  v_date DATE;
  v_jour INT;
BEGIN
  -- ── 1. Trouver le profil cible ──────────────────────────────────────────
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'bonjour@melutek.com' LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Aucun utilisateur trouvé avec l''email bonjour@melutek.com. Crée le compte d''abord via /register.';
  END IF;

  v_profile_id := v_user_id;
  RAISE NOTICE '👤 Profil cible : %', v_profile_id;

  -- ── 2. Nettoyage : on vide tout ce qui appartient à ce profil ──────────
  --    (on ne touche pas au profil lui-même ni à auth.users)
  -- Messagerie & engagement (avant clients/cours pour les FK)
  DELETE FROM public.messages          WHERE conversation_id IN (SELECT id FROM public.conversations WHERE profile_id = v_profile_id);
  DELETE FROM public.conversation_members WHERE conversation_id IN (SELECT id FROM public.conversations WHERE profile_id = v_profile_id);
  DELETE FROM public.conversations     WHERE profile_id = v_profile_id;
  DELETE FROM public.sondages_reponses WHERE creneau_id IN (SELECT cr.id FROM public.sondages_creneaux cr JOIN public.sondages_planning s ON s.id = cr.sondage_id WHERE s.profile_id = v_profile_id);
  DELETE FROM public.sondages_creneaux WHERE sondage_id IN (SELECT id FROM public.sondages_planning WHERE profile_id = v_profile_id);
  DELETE FROM public.sondages_planning WHERE profile_id = v_profile_id;
  DELETE FROM public.notifications     WHERE profile_id = v_profile_id;
  DELETE FROM public.messages_envoyes  WHERE profile_id = v_profile_id;
  -- Métier
  DELETE FROM public.cas_a_traiter   WHERE profile_id = v_profile_id;
  DELETE FROM public.presences        WHERE profile_id = v_profile_id;
  DELETE FROM public.inscriptions_evenements WHERE profile_id = v_profile_id;
  DELETE FROM public.paiements        WHERE profile_id = v_profile_id;
  DELETE FROM public.abonnements      WHERE profile_id = v_profile_id;
  DELETE FROM public.cours            WHERE profile_id = v_profile_id;
  DELETE FROM public.recurrences      WHERE profile_id = v_profile_id;
  DELETE FROM public.evenements       WHERE profile_id = v_profile_id;
  DELETE FROM public.clients          WHERE profile_id = v_profile_id;
  DELETE FROM public.offres           WHERE profile_id = v_profile_id;
  DELETE FROM public.lieux            WHERE profile_id = v_profile_id;
  DELETE FROM public.mailings         WHERE profile_id = v_profile_id;

  RAISE NOTICE '🧹 Anciennes données nettoyées.';

  -- ── 3. Profil : on s'assure qu'il a les infos studio + trial actif ──────
  UPDATE public.profiles SET
    prenom = COALESCE(NULLIF(prenom, ''), 'Maude'),
    nom = COALESCE(NULLIF(nom, ''), 'Démo'),
    studio_nom = 'Studio Démo IziSolo',
    studio_slug = COALESCE(studio_slug, 'studio-demo'),
    metier = 'yoga',
    ville = 'Paris',
    code_postal = '75011',
    plan = COALESCE(plan, 'pro'),  -- on met Pro pour avoir accès à toutes les features
    trial_started_at = COALESCE(trial_started_at, NOW() - INTERVAL '2 days'),
    portail_actif = true
  WHERE id = v_profile_id;

  RAISE NOTICE '✏️  Profil mis à jour.';

  -- ── 4. LIEUX ─────────────────────────────────────────────────────────────
  INSERT INTO public.lieux (id, profile_id, nom, adresse, ville, ordre)
  VALUES (gen_random_uuid(), v_profile_id, 'Studio principal', '12 rue des Lilas', 'Paris 11e', 0)
  RETURNING id INTO v_lieu_principal;

  -- ── 5. OFFRES (cartes / abos) ────────────────────────────────────────────
  INSERT INTO public.offres (id, profile_id, nom, type, seances, duree_jours, prix, ordre) VALUES
    (gen_random_uuid(), v_profile_id, 'Cours d''essai',     'cours_unique', 1,  NULL, 0,    0),
    (gen_random_uuid(), v_profile_id, 'Carnet 5 cours',     'carnet',       5,  90,   75,   1),
    (gen_random_uuid(), v_profile_id, 'Carnet 10 cours',    'carnet',       10, 120,  130,  2),
    (gen_random_uuid(), v_profile_id, 'Abo mensuel illim.', 'abonnement',   NULL, 30, 95,   3);

  SELECT id INTO v_offre_unique     FROM public.offres WHERE profile_id = v_profile_id AND nom = 'Cours d''essai';
  SELECT id INTO v_offre_carnet5    FROM public.offres WHERE profile_id = v_profile_id AND nom = 'Carnet 5 cours';
  SELECT id INTO v_offre_carnet10   FROM public.offres WHERE profile_id = v_profile_id AND nom = 'Carnet 10 cours';
  SELECT id INTO v_offre_abo_mensuel FROM public.offres WHERE profile_id = v_profile_id AND nom = 'Abo mensuel illim.';

  -- ── 6. CLIENTS (12 élèves, statuts variés) ──────────────────────────────
  v_c1 := gen_random_uuid(); v_c2 := gen_random_uuid(); v_c3 := gen_random_uuid();
  v_c4 := gen_random_uuid(); v_c5 := gen_random_uuid(); v_c6 := gen_random_uuid();
  v_c7 := gen_random_uuid(); v_c8 := gen_random_uuid(); v_c9 := gen_random_uuid();
  v_c10 := gen_random_uuid(); v_c11 := gen_random_uuid(); v_c12 := gen_random_uuid();

  INSERT INTO public.clients (id, profile_id, nom, prenom, email, telephone, date_naissance, ville, statut, niveau, source) VALUES
    (v_c1,  v_profile_id, 'Bernard',   'Léa',       'lea.bernard@example.com',     '0612345601', '1988-03-12', 'Paris',     'fidele',   'Intermédiaire', 'Bouche à oreille'),
    (v_c2,  v_profile_id, 'Dupont',    'Marc',      'marc.dupont@example.com',     '0612345602', '1975-07-22', 'Paris',     'fidele',   'Avancé',        'Instagram'),
    (v_c3,  v_profile_id, 'Lefèvre',   'Inès',      'ines.lefevre@example.com',    '0612345603', '1992-11-04', 'Paris',     'actif',    'Débutant',      'Site web'),
    (v_c4,  v_profile_id, 'Martin',    'Camille',   'camille.martin@example.com',  '0612345604', '1985-05-18', 'Vincennes', 'actif',    'Intermédiaire', 'Bouche à oreille'),
    (v_c5,  v_profile_id, 'Garcia',    'Théo',      'theo.garcia@example.com',     '0612345605', '1995-09-30', 'Paris',     'actif',    'Débutant',      'Événement'),
    (v_c6,  v_profile_id, 'Durand',    'Sophie',    'sophie.durand@example.com',   '0612345606', '1980-02-14', 'Montreuil', 'actif',    'Intermédiaire', 'Instagram'),
    (v_c7,  v_profile_id, 'Moreau',    'Yannick',   'yannick.moreau@example.com',  '0612345607', '1972-12-01', 'Paris',     'fidele',   'Avancé',        'Bouche à oreille'),
    (v_c8,  v_profile_id, 'Petit',     'Agathe',    'agathe.petit@example.com',    '0612345608', '1990-06-25', 'Paris',     'actif',    'Intermédiaire', 'Site web'),
    (v_c9,  v_profile_id, 'Roux',      'Lucas',     'lucas.roux@example.com',      '0612345609', '1998-04-09', 'Paris',     'prospect', 'Débutant',      'Instagram'),
    (v_c10, v_profile_id, 'Vincent',   'Elena',     'elena.vincent@example.com',   '0612345610', '1983-08-17', 'Paris',     'inactif',  'Intermédiaire', 'Bouche à oreille'),
    (v_c11, v_profile_id, 'Blanc',     'Romain',    'romain.blanc@example.com',    '0612345611', '1989-10-21', 'Paris',     'actif',    'Avancé',        'Site web'),
    (v_c12, v_profile_id, 'Faure',     'Margaux',   'margaux.faure@example.com',   '0612345612', '1993-01-05', 'Paris',     'actif',    'Débutant',      'Bouche à oreille');

  RAISE NOTICE '👥 12 élèves créés.';

  -- ── 7. RÉCURRENCES (2 cours hebdo) ──────────────────────────────────────
  INSERT INTO public.recurrences (id, profile_id, nom, type_cours, heure, duree_minutes, lieu_id, capacite_max, frequence, jours_semaine, date_debut)
  VALUES
    (gen_random_uuid(), v_profile_id, 'Vinyasa Lundi 19h', 'Vinyasa', '19:00:00', 75, v_lieu_principal, 12, 'hebdomadaire', '[1]'::jsonb, CURRENT_DATE - INTERVAL '60 days')
  RETURNING id INTO v_recurrence_vinyasa_lundi;

  INSERT INTO public.recurrences (id, profile_id, nom, type_cours, heure, duree_minutes, lieu_id, capacite_max, frequence, jours_semaine, date_debut)
  VALUES
    (gen_random_uuid(), v_profile_id, 'Yin Jeudi 18h30', 'Yin', '18:30:00', 90, v_lieu_principal, 10, 'hebdomadaire', '[4]'::jsonb, CURRENT_DATE - INTERVAL '60 days')
  RETURNING id INTO v_recurrence_yin_jeudi;

  -- ── 8. ÉVÈNEMENT : workshop payant ──────────────────────────────────────
  INSERT INTO public.evenements (id, profile_id, nom, type, statut, date_debut, date_fin, lieu, capacite, prix, description)
  VALUES (
    gen_random_uuid(), v_profile_id,
    'Atelier respiration & ouverture du cœur',
    'Atelier ponctuel', 'ouvert',
    CURRENT_DATE + INTERVAL '14 days', CURRENT_DATE + INTERVAL '14 days',
    'Studio principal — 12 rue des Lilas', 15, 35,
    'Atelier 2h30 axé pranayama et asanas d''ouverture thoracique. Tous niveaux.'
  ) RETURNING id INTO v_evenement_workshop;

  -- ── 9. COURS : on génère ~30 cours sur 60 jours (passé + futur) ────────
  -- Lundis 19h Vinyasa et Jeudis 18h30 Yin pour les 8 dernières semaines + 4 prochaines
  FOR i IN -8..3 LOOP
    -- Lundi : on prend le lundi de la semaine i (lundi=1 en ISO)
    v_date := DATE_TRUNC('week', CURRENT_DATE) + (i * INTERVAL '7 days');
    -- v_date est un lundi
    IF v_date <> DATE_TRUNC('week', CURRENT_DATE - INTERVAL '14 days') THEN  -- on annule un cours pour démo
      INSERT INTO public.cours (profile_id, nom, type_cours, date, heure, duree_minutes, lieu_id, capacite_max, recurrence_parent_id, est_annule)
      VALUES (v_profile_id, 'Vinyasa Lundi 19h', 'Vinyasa', v_date, '19:00:00', 75, v_lieu_principal, 12, v_recurrence_vinyasa_lundi, false);
    ELSE
      INSERT INTO public.cours (profile_id, nom, type_cours, date, heure, duree_minutes, lieu_id, capacite_max, recurrence_parent_id, est_annule, notes)
      VALUES (v_profile_id, 'Vinyasa Lundi 19h', 'Vinyasa', v_date, '19:00:00', 75, v_lieu_principal, 12, v_recurrence_vinyasa_lundi, true, 'Annulé : maladie de la prof')
      RETURNING id INTO v_cours_passe_annule;
    END IF;

    -- Jeudi : lundi + 3 jours
    INSERT INTO public.cours (profile_id, nom, type_cours, date, heure, duree_minutes, lieu_id, capacite_max, recurrence_parent_id)
    VALUES (v_profile_id, 'Yin Jeudi 18h30', 'Yin', v_date + 3, '18:30:00', 90, v_lieu_principal, 10, v_recurrence_yin_jeudi);
  END LOOP;

  -- Récupérer quelques IDs de cours utiles pour la suite
  SELECT id INTO v_cours_passe1
    FROM public.cours WHERE profile_id = v_profile_id AND date < CURRENT_DATE
    ORDER BY date DESC LIMIT 1 OFFSET 1;
  SELECT id INTO v_cours_aujourdhui
    FROM public.cours WHERE profile_id = v_profile_id AND date >= CURRENT_DATE
    ORDER BY date ASC LIMIT 1;
  SELECT id INTO v_cours_demain
    FROM public.cours WHERE profile_id = v_profile_id AND date > CURRENT_DATE
    ORDER BY date ASC LIMIT 1 OFFSET 1;

  RAISE NOTICE '📅 ~24 cours créés (12 lundis Vinyasa + 12 jeudis Yin).';

  -- ── 10. ABONNEMENTS : 8 actifs, 1 expiré ───────────────────────────────
  -- Léa : carnet 10 actif (utilisé 4 fois)
  INSERT INTO public.abonnements (id, profile_id, client_id, offre_id, offre_nom, type, date_debut, date_fin, seances_total, seances_utilisees, statut)
  VALUES (gen_random_uuid(), v_profile_id, v_c1, v_offre_carnet10, 'Carnet 10 cours', 'carnet',
          CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '90 days', 10, 4, 'actif')
  RETURNING id INTO v_abo_active1;

  -- Marc : abo mensuel actif
  INSERT INTO public.abonnements (id, profile_id, client_id, offre_id, offre_nom, type, date_debut, date_fin, statut)
  VALUES (gen_random_uuid(), v_profile_id, v_c2, v_offre_abo_mensuel, 'Abo mensuel illim.', 'abonnement',
          CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '20 days', 'actif')
  RETURNING id INTO v_abo_active2;

  -- Inès : carnet 5 actif (utilisé 1 fois)
  INSERT INTO public.abonnements (profile_id, client_id, offre_id, offre_nom, type, date_debut, date_fin, seances_total, seances_utilisees, statut)
  VALUES (v_profile_id, v_c3, v_offre_carnet5, 'Carnet 5 cours', 'carnet',
          CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '75 days', 5, 1, 'actif');

  -- Camille : carnet 10 actif (utilisé 7 fois — bientôt à recharger)
  INSERT INTO public.abonnements (profile_id, client_id, offre_id, offre_nom, type, date_debut, date_fin, seances_total, seances_utilisees, statut)
  VALUES (v_profile_id, v_c4, v_offre_carnet10, 'Carnet 10 cours', 'carnet',
          CURRENT_DATE - INTERVAL '60 days', CURRENT_DATE + INTERVAL '60 days', 10, 7, 'actif');

  -- Théo : carnet 5 (utilisé 4 fois)
  INSERT INTO public.abonnements (profile_id, client_id, offre_id, offre_nom, type, date_debut, date_fin, seances_total, seances_utilisees, statut)
  VALUES (v_profile_id, v_c5, v_offre_carnet5, 'Carnet 5 cours', 'carnet',
          CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE + INTERVAL '70 days', 5, 4, 'actif');

  -- Sophie : abo mensuel actif
  INSERT INTO public.abonnements (profile_id, client_id, offre_id, offre_nom, type, date_debut, date_fin, statut)
  VALUES (v_profile_id, v_c6, v_offre_abo_mensuel, 'Abo mensuel illim.', 'abonnement',
          CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '25 days', 'actif');

  -- Yannick : carnet 10 EXPIRÉ (date_fin dépassée) - sert au cas "carnet expiré"
  INSERT INTO public.abonnements (id, profile_id, client_id, offre_id, offre_nom, type, date_debut, date_fin, seances_total, seances_utilisees, statut)
  VALUES (gen_random_uuid(), v_profile_id, v_c7, v_offre_carnet10, 'Carnet 10 cours', 'carnet',
          CURRENT_DATE - INTERVAL '150 days', CURRENT_DATE - INTERVAL '5 days', 10, 8, 'expire')
  RETURNING id INTO v_abo_expire;

  -- Agathe : carnet 5 (utilisé 2)
  INSERT INTO public.abonnements (profile_id, client_id, offre_id, offre_nom, type, date_debut, date_fin, seances_total, seances_utilisees, statut)
  VALUES (v_profile_id, v_c8, v_offre_carnet5, 'Carnet 5 cours', 'carnet',
          CURRENT_DATE - INTERVAL '40 days', CURRENT_DATE + INTERVAL '50 days', 5, 2, 'actif');

  -- Romain : carnet 10 (utilisé 5)
  INSERT INTO public.abonnements (profile_id, client_id, offre_id, offre_nom, type, date_debut, date_fin, seances_total, seances_utilisees, statut)
  VALUES (v_profile_id, v_c11, v_offre_carnet10, 'Carnet 10 cours', 'carnet',
          CURRENT_DATE - INTERVAL '50 days', CURRENT_DATE + INTERVAL '70 days', 10, 5, 'actif');

  RAISE NOTICE '🎫 9 abonnements créés (8 actifs + 1 expiré).';

  -- ── 11. PRESENCES : on remplit les cours passés avec ~5 présents/cours ──
  -- Pour chaque cours passé non-annulé, on inscrit Léa, Marc, Inès, Camille, Théo
  INSERT INTO public.presences (profile_id, cours_id, client_id, abonnement_id, pointee, heure_pointage)
  SELECT v_profile_id, c.id, cl.client_id, cl.abo_id, true, c.date + c.heure + INTERVAL '30 minutes'
  FROM public.cours c,
       (VALUES
         (v_c1, v_abo_active1),
         (v_c2, v_abo_active2),
         (v_c3, NULL),
         (v_c4, NULL),
         (v_c5, NULL)
       ) AS cl(client_id, abo_id)
  WHERE c.profile_id = v_profile_id
    AND c.date < CURRENT_DATE
    AND c.est_annule = false
  ON CONFLICT (cours_id, client_id) DO NOTHING;

  -- Pour les 2 prochains cours : inscriptions sans pointage
  INSERT INTO public.presences (profile_id, cours_id, client_id, abonnement_id, pointee)
  SELECT v_profile_id, c.id, cl.client_id, cl.abo_id, false
  FROM public.cours c,
       (VALUES
         (v_c1, v_abo_active1),
         (v_c2, v_abo_active2),
         (v_c6, NULL),
         (v_c11, NULL)
       ) AS cl(client_id, abo_id)
  WHERE c.profile_id = v_profile_id
    AND c.date >= CURRENT_DATE
    AND c.est_annule = false
  ORDER BY c.date ASC
  LIMIT 8
  ON CONFLICT (cours_id, client_id) DO NOTHING;

  RAISE NOTICE '✅ Présences générées (~50 pointées + ~8 à venir).';

  -- ── 12. INSCRIPTIONS WORKSHOP ───────────────────────────────────────────
  INSERT INTO public.inscriptions_evenements (profile_id, evenement_id, client_id) VALUES
    (v_profile_id, v_evenement_workshop, v_c1),
    (v_profile_id, v_evenement_workshop, v_c4),
    (v_profile_id, v_evenement_workshop, v_c7),
    (v_profile_id, v_evenement_workshop, v_c11)
  ON CONFLICT (evenement_id, client_id) DO NOTHING;

  -- ── 13. PAIEMENTS (mix CB/Espèces/Stripe + 2 en attente) ────────────────
  -- 9 paiements pour les abonnements
  INSERT INTO public.paiements (profile_id, client_id, offre_id, abonnement_id, intitule, type, montant, statut, mode, date)
  VALUES
    (v_profile_id, v_c1,  v_offre_carnet10,    v_abo_active1, 'Carnet 10 cours - Léa',     'carnet',     130, 'paid', 'CB',       CURRENT_DATE - INTERVAL '30 days'),
    (v_profile_id, v_c2,  v_offre_abo_mensuel, v_abo_active2, 'Abo mensuel - Marc',         'abonnement',  95, 'paid', 'Virement', CURRENT_DATE - INTERVAL '10 days'),
    (v_profile_id, v_c3,  v_offre_carnet5,     NULL,          'Carnet 5 cours - Inès',      'carnet',      75, 'paid', 'Espèces',  CURRENT_DATE - INTERVAL '15 days'),
    (v_profile_id, v_c4,  v_offre_carnet10,    NULL,          'Carnet 10 cours - Camille',  'carnet',     130, 'paid', 'CB',       CURRENT_DATE - INTERVAL '60 days'),
    (v_profile_id, v_c5,  v_offre_carnet5,     NULL,          'Carnet 5 cours - Théo',      'carnet',      75, 'paid', 'Chèque',   CURRENT_DATE - INTERVAL '20 days'),
    (v_profile_id, v_c6,  v_offre_abo_mensuel, NULL,          'Abo mensuel - Sophie',       'abonnement',  95, 'paid', 'CB',       CURRENT_DATE - INTERVAL '5 days'),
    (v_profile_id, v_c8,  v_offre_carnet5,     NULL,          'Carnet 5 cours - Agathe',    'carnet',      75, 'paid', 'CB',       CURRENT_DATE - INTERVAL '40 days'),
    (v_profile_id, v_c11, v_offre_carnet10,    NULL,          'Carnet 10 cours - Romain',   'carnet',     130, 'paid', 'CB',       CURRENT_DATE - INTERVAL '50 days'),
    -- Paiement workshop
    (v_profile_id, v_c1,  NULL, NULL, 'Atelier respiration - Léa',    'cours_unique', 35, 'paid', 'CB',     CURRENT_DATE - INTERVAL '3 days'),
    (v_profile_id, v_c4,  NULL, NULL, 'Atelier respiration - Camille','cours_unique', 35, 'paid', 'CB',     CURRENT_DATE - INTERVAL '4 days'),
    -- Paiement Yannick (carnet expiré, payé il y a longtemps)
    (v_profile_id, v_c7,  v_offre_carnet10, v_abo_expire, 'Carnet 10 cours - Yannick',     'carnet',     130, 'paid', 'CB',       CURRENT_DATE - INTERVAL '150 days'),
    -- 2 paiements en attente (élèves qui doivent payer)
    (v_profile_id, v_c9,  v_offre_unique,   NULL,          'Cours d''essai - Lucas',       'cours_unique', 0, 'pending', 'CB',  CURRENT_DATE - INTERVAL '2 days'),
    (v_profile_id, v_c12, v_offre_carnet5,  NULL,          'Carnet 5 cours - Margaux',     'carnet',      75, 'pending', 'Virement', CURRENT_DATE - INTERVAL '7 days'),
    -- 1 impayé qui traîne
    (v_profile_id, v_c10, v_offre_carnet5,  NULL,          'Carnet 5 cours - Elena',       'carnet',      75, 'unpaid',  'Espèces',  CURRENT_DATE - INTERVAL '45 days');

  RAISE NOTICE '💳 14 paiements créés (11 OK + 2 pending + 1 unpaid).';

  -- ── 14. CAS À TRAITER (l'inbox des règles métier — différenciant) ──────
  -- Cas 1 : no-show de Théo au cours d'avant-hier
  INSERT INTO public.cas_a_traiter (profile_id, case_type, client_id, cours_id, context)
  VALUES (
    v_profile_id, 'no_show', v_c5, v_cours_passe1,
    jsonb_build_object(
      'message', 'Théo Garcia ne s''est pas pointé au cours du ' || (CURRENT_DATE - INTERVAL '2 days')::text,
      'montant_potentiel', 15
    )
  );

  -- Cas 2 : carnet expiré pour Yannick qui veut s'inscrire à un prochain cours
  INSERT INTO public.cas_a_traiter (profile_id, case_type, client_id, context)
  VALUES (
    v_profile_id, 'carnet_expire_avant_cours', v_c7,
    jsonb_build_object(
      'message', 'Yannick Moreau a tenté de réserver mais son carnet 10 cours a expiré il y a 5 jours',
      'abo_expire_id', v_abo_expire::text
    )
  );

  -- Cas 3 : cours annulé par la prof — il faut décider quoi faire des inscrits
  INSERT INTO public.cas_a_traiter (profile_id, case_type, cours_id, context)
  VALUES (
    v_profile_id, 'cours_annule_prof', v_cours_passe_annule,
    jsonb_build_object(
      'message', 'Cours Vinyasa annulé pour cause de maladie — 5 élèves inscrits à recréditer',
      'nb_eleves', 5
    )
  );

  RAISE NOTICE '⚠️  3 cas à traiter ouverts (no-show, carnet expiré, cours annulé).';

  -- ── 15. MAILINGS ────────────────────────────────────────────────────────
  INSERT INTO public.mailings (profile_id, sujet, cible, corps, destinataires, statut, date) VALUES
    (v_profile_id, 'Rentrée 2026 — nouveaux créneaux', 'tous', 'Bonjour à toustes,\n\nLe planning de septembre est en ligne...', 12, 'sent', CURRENT_DATE - INTERVAL '21 days'),
    (v_profile_id, 'Atelier respiration — il reste 11 places', 'actifs', 'Hello !\n\nJ''ai gardé une place pour toi à l''atelier...', 0, 'draft', NULL);

  RAISE NOTICE '📨 2 mailings (1 envoyé + 1 brouillon).';

  -- ── 16. MESSAGERIE : 4 conversations 1-to-1 + 1 conversation cours ─────
  -- Helper inline : une conversation 1-to-1 avec un client + ses messages.
  -- Le trigger tr_messages_update_conv met automatiquement à jour
  -- conversations.last_message_at à chaque insert dans messages.
  DECLARE
    v_conv_lea     UUID; v_conv_marc    UUID; v_conv_sophie  UUID;
    v_conv_lucas   UUID; v_conv_camille UUID; v_conv_groupe  UUID;
    v_msg_id       UUID;
  BEGIN
    -- Conv 1 : Léa (élève fidèle) — remerciement + question workshop
    INSERT INTO public.conversations (profile_id, type, client_id)
      VALUES (v_profile_id, 'client', v_c1) RETURNING id INTO v_conv_lea;

    INSERT INTO public.messages (conversation_id, sender_type, sender_client_id, content, created_at) VALUES
      (v_conv_lea, 'eleve', v_c1, 'Coucou Maude ! Merci infiniment pour la séance de lundi, j''avais besoin de cette pause 🙏', NOW() - INTERVAL '6 days'),
      (v_conv_lea, 'pro',   NULL, 'Avec plaisir Léa ! C''était une chouette énergie hier soir 🌿', NOW() - INTERVAL '6 days' + INTERVAL '2 hours');
    INSERT INTO public.messages (conversation_id, sender_type, sender_client_id, content, created_at) VALUES
      (v_conv_lea, 'eleve', v_c1, 'Petite question : ton atelier respiration du 20, c''est ouvert aux niveaux intermédiaires ? J''hésite à m''inscrire.', NOW() - INTERVAL '2 days'),
      (v_conv_lea, 'pro',   NULL, 'Carrément ! C''est tout niveaux, on adapte ensemble. Tu peux te lancer 🌸', NOW() - INTERVAL '2 days' + INTERVAL '3 hours'),
      (v_conv_lea, 'eleve', v_c1, 'Top, j''ai validé mon inscription. À très vite !', NOW() - INTERVAL '1 day');

    -- Conv 2 : Marc — demande de cours privé
    INSERT INTO public.conversations (profile_id, type, client_id)
      VALUES (v_profile_id, 'client', v_c2) RETURNING id INTO v_conv_marc;

    INSERT INTO public.messages (conversation_id, sender_type, sender_client_id, content, created_at) VALUES
      (v_conv_marc, 'eleve', v_c2, 'Bonjour Maude, j''aurais besoin de quelques séances privées pour bosser mes inversions. Tu fais ça ?', NOW() - INTERVAL '4 days'),
      (v_conv_marc, 'pro',   NULL, 'Bonjour Marc ! Oui je propose des séances individuelles à 60 € l''heure. On peut se caler quand tu veux. Tu préfères en semaine ou le week-end ?', NOW() - INTERVAL '4 days' + INTERVAL '1 hour'),
      (v_conv_marc, 'eleve', v_c2, 'Plutôt mercredi soir si tu as. Et est-ce que c''est possible de faire un pack de 5 séances ?', NOW() - INTERVAL '3 days'),
      (v_conv_marc, 'pro',   NULL, 'Mercredi 19h c''est bon pour moi. Pour le pack 5 séances je te fais 270 € au lieu de 300 €. Je te confirme par email.', NOW() - INTERVAL '3 days' + INTERVAL '4 hours');

    -- Conv 3 : Sophie — info pratique (parking)
    INSERT INTO public.conversations (profile_id, type, client_id)
      VALUES (v_profile_id, 'client', v_c6) RETURNING id INTO v_conv_sophie;

    INSERT INTO public.messages (conversation_id, sender_type, sender_client_id, content, created_at) VALUES
      (v_conv_sophie, 'eleve', v_c6, 'Hello, je viens en voiture jeudi pour la 1ère fois — tu sais s''il y a du parking facile près du studio ?', NOW() - INTERVAL '12 hours'),
      (v_conv_sophie, 'pro',   NULL, 'Hello Sophie ! Il y a un parking gratuit rue Pasteur (à 2 min à pied) sinon Rue des Lilas c''est zone bleue 1h30. À jeudi 🌿', NOW() - INTERVAL '8 hours');

    -- Conv 4 : Lucas (prospect) — question pour s'inscrire au cours d'essai
    INSERT INTO public.conversations (profile_id, type, client_id)
      VALUES (v_profile_id, 'client', v_c9) RETURNING id INTO v_conv_lucas;

    INSERT INTO public.messages (conversation_id, sender_type, sender_client_id, content, created_at) VALUES
      (v_conv_lucas, 'eleve', v_c9, 'Bonjour, je suis tombé sur ton site, je n''ai jamais fait de yoga. C''est ouvert aux grands débutants ?', NOW() - INTERVAL '3 hours'),
      (v_conv_lucas, 'pro',   NULL, 'Bienvenue Lucas ! Bien sûr, le 1er cours est offert pour qu''on se rencontre. Le lundi 19h Vinyasa ou le jeudi 18h30 Yin (plus doux pour démarrer) — tu choisis.', NOW() - INTERVAL '2 hours');
    -- Lucas n'a pas encore répondu → conv "en attente de réponse"

    -- Conv 5 : Camille — message simple récent
    INSERT INTO public.conversations (profile_id, type, client_id)
      VALUES (v_profile_id, 'client', v_c4) RETURNING id INTO v_conv_camille;

    INSERT INTO public.messages (conversation_id, sender_type, sender_client_id, content, created_at) VALUES
      (v_conv_camille, 'pro',   NULL, 'Camille, tu auras besoin de recharger ton carnet bientôt — il te reste 3 cours sur 10. Pas de pression 🌿', NOW() - INTERVAL '20 hours'),
      (v_conv_camille, 'eleve', v_c4, 'Merci pour le rappel ! Je passe te voir lundi pour reprendre un nouveau carnet 🙏', NOW() - INTERVAL '15 hours');

    -- Conv 6 : Conversation GROUPE pour le cours Vinyasa du lundi qui vient
    -- (annonce groupée à tous les inscrits)
    INSERT INTO public.conversations (profile_id, type, cours_id)
      VALUES (v_profile_id, 'cours', v_cours_demain) RETURNING id INTO v_conv_groupe;

    INSERT INTO public.messages (conversation_id, sender_type, content, created_at) VALUES
      (v_conv_groupe, 'pro', 'Hello à toustes 🌿 Pour le cours de demain, on va travailler les ouvertures de hanches. Pensez à venir avec un lainage pour la relaxation finale, il fait frais le soir.', NOW() - INTERVAL '4 hours');

    -- conversation_members : on ajoute la prof comme membre de chaque conversation
    -- (pour le tracking de last_read_at + préférence notif)
    INSERT INTO public.conversation_members (conversation_id, profile_id, last_read_at, notif_canal) VALUES
      (v_conv_lea,     v_profile_id, NOW() - INTERVAL '12 hours', 'instant'),
      (v_conv_marc,    v_profile_id, NOW() - INTERVAL '3 days',   'instant'),
      (v_conv_sophie,  v_profile_id, NOW() - INTERVAL '8 hours',  'instant'),
      (v_conv_lucas,   v_profile_id, NOW() - INTERVAL '4 hours',  'instant'),  -- pas lu le dernier message de Lucas
      (v_conv_camille, v_profile_id, NOW() - INTERVAL '15 hours', 'instant'),
      (v_conv_groupe,  v_profile_id, NOW() - INTERVAL '4 hours',  'digest');

    -- Et les élèves dans leur conv
    INSERT INTO public.conversation_members (conversation_id, client_id, last_read_at, notif_canal) VALUES
      (v_conv_lea,     v_c1,  NOW() - INTERVAL '1 day',     'instant'),
      (v_conv_marc,    v_c2,  NOW() - INTERVAL '3 days',    'digest'),
      (v_conv_sophie,  v_c6,  NOW() - INTERVAL '8 hours',   'digest'),
      (v_conv_lucas,   v_c9,  NOW() - INTERVAL '3 hours',   'digest'),
      (v_conv_camille, v_c4,  NOW() - INTERVAL '15 hours',  'digest');
  END;

  RAISE NOTICE '💬 6 conversations + ~17 messages.';

  -- ── 17. SONDAGE PLANNING : 1 sondage actif "Rentrée 2026" ──────────────
  DECLARE
    v_sondage_id UUID;
    v_creneau1   UUID; v_creneau2   UUID; v_creneau3   UUID; v_creneau4   UUID;
  BEGIN
    INSERT INTO public.sondages_planning (profile_id, slug, titre, message, date_fin, visibilite, actif)
    VALUES (
      v_profile_id, 'rentree-2026-' || substr(v_profile_id::text, 1, 6),
      'Planning rentrée 2026 — vos préférences',
      'Salut tout le monde ! Pour la rentrée j''hésite entre plusieurs créneaux. Dis-moi lesquels te conviennent (oui / peut-être / non), ça m''aidera à finaliser le planning. Merci 🌿',
      CURRENT_DATE + INTERVAL '14 days', 'mixte', true
    ) RETURNING id INTO v_sondage_id;

    INSERT INTO public.sondages_creneaux (id, sondage_id, type_cours, jour_semaine, heure, duree_minutes, ordre)
    VALUES (gen_random_uuid(), v_sondage_id, 'Vinyasa', 1, '07:30', 60, 0) RETURNING id INTO v_creneau1;
    INSERT INTO public.sondages_creneaux (id, sondage_id, type_cours, jour_semaine, heure, duree_minutes, ordre)
    VALUES (gen_random_uuid(), v_sondage_id, 'Vinyasa', 2, '12:30', 45, 1) RETURNING id INTO v_creneau2;
    INSERT INTO public.sondages_creneaux (id, sondage_id, type_cours, jour_semaine, heure, duree_minutes, ordre)
    VALUES (gen_random_uuid(), v_sondage_id, 'Yin',     3, '20:00', 75, 2) RETURNING id INTO v_creneau3;
    INSERT INTO public.sondages_creneaux (id, sondage_id, type_cours, jour_semaine, heure, duree_minutes, ordre)
    VALUES (gen_random_uuid(), v_sondage_id, 'Hatha',   6, '10:00', 90, 3) RETURNING id INTO v_creneau4;

    -- Réponses : ~7 répondants
    INSERT INTO public.sondages_reponses (creneau_id, client_id, prenom, valeur, commentaire) VALUES
      (v_creneau1, v_c1, 'Léa',     'oui',       'Parfait pour démarrer la semaine'),
      (v_creneau1, v_c2, 'Marc',    'non',       NULL),
      (v_creneau1, v_c4, 'Camille', 'peut_etre', 'Si je peux déposer les enfants à temps'),
      (v_creneau2, v_c1, 'Léa',     'peut_etre', NULL),
      (v_creneau2, v_c8, 'Agathe',  'oui',       'Idéal sur ma pause déj'),
      (v_creneau2, v_c11,'Romain',  'oui',       NULL),
      (v_creneau3, v_c2, 'Marc',    'oui',       'Yes Yin le mercredi soir, j''adore'),
      (v_creneau3, v_c6, 'Sophie',  'oui',       NULL),
      (v_creneau3, v_c11,'Romain',  'peut_etre', NULL),
      (v_creneau4, v_c1, 'Léa',     'oui',       NULL),
      (v_creneau4, v_c4, 'Camille', 'oui',       'Le samedi matin c''est top !'),
      (v_creneau4, v_c8, 'Agathe',  'peut_etre', NULL);

    -- Une réponse anonyme pour montrer la fonctionnalité
    INSERT INTO public.sondages_reponses (creneau_id, email, prenom, valeur, commentaire)
    VALUES (v_creneau3, 'visiteur@example.com', 'Sarah', 'oui', 'Découvert via Insta, ça m''intéresse !');
  END;

  RAISE NOTICE '📊 1 sondage actif (4 créneaux, 13 réponses).';

  -- ── 18. NOTIFICATIONS PRO (la cloche en haut à droite) ─────────────────
  -- IMPORTANT : la colonne `data` JSONB doit contenir au moins `client_id`
  -- pour que le clic sur la notif renvoie vers la bonne fiche élève
  -- (cf. NotificationBell.js : routing par type avec deep-link client).
  INSERT INTO public.notifications (profile_id, type, titre, corps, data, lu, ref_key, created_at) VALUES
    (v_profile_id, 'anniversaire',
      'Anniversaire de Camille demain 🎂',
      'Camille MARTIN fête ses 41 ans demain. Pense à un petit mot 🌿',
      jsonb_build_object('client_id', v_c4::text),
      false, 'anniv-' || v_c4::text || '-' || CURRENT_DATE,
      NOW() - INTERVAL '2 hours'),
    (v_profile_id, 'paiement_retard',
      'Paiement en attente — Margaux Faure',
      'Le carnet 5 cours de Margaux est en pending depuis 7 jours (75 €).',
      jsonb_build_object('client_id', v_c12::text),
      false, 'pay-pending-' || v_c12::text || '-' || CURRENT_DATE,
      NOW() - INTERVAL '6 hours'),
    (v_profile_id, 'carnet_epuise',
      'Camille a presque épuisé son carnet',
      'Camille a utilisé 7/10 cours. Pense à proposer un renouvellement.',
      jsonb_build_object('client_id', v_c4::text),
      true, 'carnet-' || v_c4::text || '-' || (CURRENT_DATE - 1)::text,
      NOW() - INTERVAL '1 day'),
    (v_profile_id, 'abonnement_expire',
      'Abonnement de Yannick expiré',
      'Le carnet 10 cours de Yannick a expiré il y a 5 jours. Il a essayé de réserver — voir cas à traiter.',
      jsonb_build_object('client_id', v_c7::text),
      false, 'abo-exp-' || v_c7::text || '-' || CURRENT_DATE,
      NOW() - INTERVAL '4 hours');

  RAISE NOTICE '🔔 4 notifications (3 non lues + 1 lue).';

  -- ── 19. HISTORIQUE MESSAGES ENVOYÉS (mailing + rappels auto) ───────────
  INSERT INTO public.messages_envoyes (profile_id, client_id, canal, destinataire, sujet, corps, statut, created_at) VALUES
    (v_profile_id, v_c1,  'email', 'lea.bernard@example.com',     'Rentrée 2026 — nouveaux créneaux', 'Bonjour Léa, ...', 'envoye', CURRENT_DATE - INTERVAL '21 days'),
    (v_profile_id, v_c2,  'email', 'marc.dupont@example.com',     'Rentrée 2026 — nouveaux créneaux', 'Bonjour Marc, ...', 'envoye', CURRENT_DATE - INTERVAL '21 days'),
    (v_profile_id, v_c4,  'email', 'camille.martin@example.com',  'Rentrée 2026 — nouveaux créneaux', 'Bonjour Camille, ...', 'envoye', CURRENT_DATE - INTERVAL '21 days'),
    (v_profile_id, v_c1,  'email', 'lea.bernard@example.com',     'Rappel cours demain 19h',          'Salut Léa, à demain pour le Vinyasa !', 'envoye', NOW() - INTERVAL '20 hours'),
    (v_profile_id, v_c2,  'email', 'marc.dupont@example.com',     'Rappel cours demain 19h',          'Salut Marc, à demain pour le Vinyasa !', 'envoye', NOW() - INTERVAL '20 hours'),
    (v_profile_id, v_c12, 'email', 'margaux.faure@example.com',   'Rappel paiement carnet 5',         'Bonjour Margaux, ton paiement de 75 € est encore en attente...', 'envoye', NOW() - INTERVAL '3 days');

  RAISE NOTICE '📧 6 messages envoyés (historique).';

  -- ── 20. RÉCAP FINAL ─────────────────────────────────────────────────────
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ Seed démo terminé pour bonjour@melutek.com';
  RAISE NOTICE '   Profil          : Studio Démo IziSolo (Pro plan, trial actif)';
  RAISE NOTICE '   Lieux           : 1';
  RAISE NOTICE '   Offres          : 4 (essai gratuit + 2 carnets + 1 abo)';
  RAISE NOTICE '   Élèves          : 12 (statuts variés)';
  RAISE NOTICE '   Récurrences     : 2 (Vinyasa lundi + Yin jeudi)';
  RAISE NOTICE '   Cours           : ~24 (8 sem passées + 4 sem futures, 1 annulé)';
  RAISE NOTICE '   Workshop        : 1 (à J+14, 4 inscrits)';
  RAISE NOTICE '   Abonnements     : 9 (8 actifs + 1 expiré)';
  RAISE NOTICE '   Présences       : ~58';
  RAISE NOTICE '   Paiements       : 14 (11 OK / 2 pending / 1 impayé)';
  RAISE NOTICE '   Cas à traiter   : 3 (no-show / carnet expiré / cours annulé)';
  RAISE NOTICE '   Mailings        : 2 (1 envoyé + 1 brouillon)';
  RAISE NOTICE '   Conversations   : 6 (5 1-to-1 + 1 groupe cours)';
  RAISE NOTICE '   Messages        : ~17 (entrants + sortants)';
  RAISE NOTICE '   Sondage planning: 1 actif (4 créneaux, 13 réponses)';
  RAISE NOTICE '   Notifications   : 4 (3 non lues + 1 lue)';
  RAISE NOTICE '   Mails envoyés   : 6 (rappels + mailing rentrée)';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '🎬 Connecte-toi sur bonjour@melutek.com pour faire des screenshots !';
END;
$func$;

REVOKE ALL ON FUNCTION public.reset_demo_data() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_demo_data() TO service_role;
