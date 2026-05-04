-- ════════════════════════════════════════════════════════════════════════════
-- SEED — Compte test Colin · colin@ateliermelusine.com
-- ════════════════════════════════════════════════════════════════════════════
-- Crée :
--   • Profil studio configuré (slug, nom, metier, ville, bio, etc.)
--   • 3 offres (carnet 10 séances, abo mensuel, cours unique)
--   • 8 clients (mix prospect/actif/fidèle/inactif, dates de naissance)
--   • 1 évènement (atelier ponctuel)
--   • 12 cours (3 passés, 3 cette semaine, 6 à venir)
--   • 5 abonnements (varied : actif, bientôt expiré, épuisé)
--   • 11 paiements (mix paid/pending/unpaid)
--   • Présences pointées pour les cours passés
--
-- À COLLER DANS : Supabase Dashboard → SQL Editor → Run
-- Idempotent : peut être lancé plusieurs fois (DELETE puis INSERT).
-- ════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_profile_id UUID;
  v_carnet_id UUID;
  v_abo_id UUID;
  v_unique_id UUID;

  -- IDs clients
  v_emma UUID;
  v_marie UUID;
  v_thomas UUID;
  v_sophie UUID;
  v_lucas UUID;
  v_julia UUID;
  v_nathan UUID;
  v_camille UUID;

  -- IDs cours
  v_cours_p1 UUID; v_cours_p2 UUID; v_cours_p3 UUID;
  v_cours_w1 UUID; v_cours_w2 UUID; v_cours_w3 UUID;
  v_cours_f1 UUID; v_cours_f2 UUID; v_cours_f3 UUID;
  v_cours_f4 UUID; v_cours_f5 UUID; v_cours_f6 UUID;

  -- IDs abonnements
  v_abo_emma UUID;
  v_abo_marie UUID;
  v_abo_thomas UUID;
  v_abo_sophie UUID;
  v_abo_julia UUID;

  -- ID évènement
  v_atelier_id UUID;

BEGIN
  -- ─────────────────────────────────────────────
  -- 1. Récupère le profil_id depuis l'email
  -- ─────────────────────────────────────────────
  SELECT id INTO v_profile_id
  FROM profiles
  WHERE email_contact = 'colin@ateliermelusine.com'
  LIMIT 1;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Aucun profil trouvé pour colin@ateliermelusine.com — tu dois d''abord t''inscrire dans l''app';
  END IF;

  -- ─────────────────────────────────────────────
  -- 2. Reset des données seed précédentes (idempotent)
  -- ─────────────────────────────────────────────
  DELETE FROM presences WHERE profile_id = v_profile_id;
  DELETE FROM paiements WHERE profile_id = v_profile_id;
  DELETE FROM abonnements WHERE profile_id = v_profile_id;
  DELETE FROM inscriptions_evenements WHERE profile_id = v_profile_id;
  DELETE FROM cours WHERE profile_id = v_profile_id;
  DELETE FROM evenements WHERE profile_id = v_profile_id;
  DELETE FROM clients WHERE profile_id = v_profile_id;
  DELETE FROM offres WHERE profile_id = v_profile_id;

  -- ─────────────────────────────────────────────
  -- 3. Update profil : slug, studio, bio, social
  -- ─────────────────────────────────────────────
  UPDATE profiles SET
    prenom         = 'Colin',
    nom            = 'Boulgakoff',
    studio_nom     = 'Atelier Mélusine',
    studio_slug    = 'atelier-melusine',
    metier         = 'yoga',
    adresse        = '12 rue des Lilas',
    code_postal    = '75011',
    ville          = 'Paris',
    telephone      = '06 12 34 56 78',
    portail_actif  = true,
    portail_message = 'Bienvenue à l''Atelier Mélusine. Réserve tes cours, suis ton planning et reste connecté·e à la pratique.',
    plan           = 'pro'
  WHERE id = v_profile_id;

  -- ─────────────────────────────────────────────
  -- 4. Offres
  -- ─────────────────────────────────────────────
  v_carnet_id := gen_random_uuid();
  v_abo_id    := gen_random_uuid();
  v_unique_id := gen_random_uuid();

  INSERT INTO offres (id, profile_id, nom, type, seances, duree_jours, prix, actif, ordre) VALUES
    (v_carnet_id, v_profile_id, 'Carnet 10 séances',     'carnet',       10, 180, 150.00, true, 1),
    (v_abo_id,    v_profile_id, 'Abonnement mensuel',    'abonnement',   NULL, 30,  90.00, true, 2),
    (v_unique_id, v_profile_id, 'Cours à l''unité',       'cours_unique',  1, NULL, 18.00, true, 3);

  -- ─────────────────────────────────────────────
  -- 5. Clients (8 personnes, mix de profils)
  -- ─────────────────────────────────────────────
  v_emma    := gen_random_uuid();
  v_marie   := gen_random_uuid();
  v_thomas  := gen_random_uuid();
  v_sophie  := gen_random_uuid();
  v_lucas   := gen_random_uuid();
  v_julia   := gen_random_uuid();
  v_nathan  := gen_random_uuid();
  v_camille := gen_random_uuid();

  INSERT INTO clients (id, profile_id, prenom, nom, email, telephone, date_naissance, ville, statut, niveau, source, objectifs, notes) VALUES
    (v_emma,    v_profile_id, 'Emma',    'Lefèvre',    'emma.lefevre@example.com',    '06 11 22 33 44', '1992-05-14', 'Paris', 'fidele',   'Intermédiaire', 'Bouche à oreille', 'Préparer son demi-marathon, gestion du stress',         'Vient depuis 2 ans, très assidue.'),
    (v_marie,   v_profile_id, 'Marie',   'Dubois',     'marie.dubois@example.com',     '06 22 33 44 55', '1985-09-22', 'Paris', 'actif',    'Avancé',        'Instagram',         'Approfondir le pranayama',                              'Préfère les cours du matin.'),
    (v_thomas,  v_profile_id, 'Thomas',  'Martin',     'thomas.martin@example.com',    '06 33 44 55 66', '1988-11-03', 'Paris', 'actif',    'Débutant',      'Site web',          'Souplesse, soulager le dos après le bureau',            'Découvert via la newsletter.'),
    (v_sophie,  v_profile_id, 'Sophie',  'Bernard',    'sophie.bernard@example.com',   '06 44 55 66 77', '1979-03-17', 'Paris', 'fidele',   'Avancé',        'Bouche à oreille', 'Maintenir sa pratique régulière',                       'Peut faire les ajustements profonds.'),
    (v_lucas,   v_profile_id, 'Lucas',   'Petit',      'lucas.petit@example.com',      '06 55 66 77 88', '1995-07-29', 'Paris', 'prospect', 'Débutant',      'Événement',         'Découverte du yoga après une période stressée',         'Premier cours d''essai prévu.'),
    (v_julia,   v_profile_id, 'Julia',   'Moreau',     'julia.moreau@example.com',     '06 66 77 88 99', '1990-12-08', 'Paris', 'actif',    'Intermédiaire', 'Instagram',         'Préparation à la grossesse, yoga prénatal',             'Enceinte de 4 mois.'),
    (v_nathan,  v_profile_id, 'Nathan',  'Roux',       'nathan.roux@example.com',      '06 77 88 99 00', '1983-04-25', 'Paris', 'inactif',  'Intermédiaire', 'Site web',          'En pause depuis 3 mois (déménagement)',                 'Relancer en avril.'),
    (v_camille, v_profile_id, 'Camille', 'Garnier',    'camille.garnier@example.com',  '06 88 99 00 11', '1998-01-12', 'Paris', 'actif',    'Débutant',      'Bouche à oreille', 'Reprendre une activité physique douce',                 'Ancienne danseuse.');

  -- ─────────────────────────────────────────────
  -- 6. Évènement (atelier ponctuel)
  -- ─────────────────────────────────────────────
  v_atelier_id := gen_random_uuid();
  INSERT INTO evenements (id, profile_id, nom, type, statut, date_debut, date_fin, lieu, capacite, prix, description) VALUES
    (v_atelier_id, v_profile_id, 'Atelier Yin & sons',  'Atelier ponctuel', 'ouvert',
     CURRENT_DATE + INTERVAL '21 days', CURRENT_DATE + INTERVAL '21 days',
     'Studio principal', 12, 35.00,
     'Une session de 2h alliant Yin Yoga et bain sonore. Posture longue tenue, retour au calme profond.');

  -- ─────────────────────────────────────────────
  -- 7. Cours (3 passés + 3 cette semaine + 6 futurs)
  -- ─────────────────────────────────────────────
  v_cours_p1 := gen_random_uuid(); v_cours_p2 := gen_random_uuid(); v_cours_p3 := gen_random_uuid();
  v_cours_w1 := gen_random_uuid(); v_cours_w2 := gen_random_uuid(); v_cours_w3 := gen_random_uuid();
  v_cours_f1 := gen_random_uuid(); v_cours_f2 := gen_random_uuid(); v_cours_f3 := gen_random_uuid();
  v_cours_f4 := gen_random_uuid(); v_cours_f5 := gen_random_uuid(); v_cours_f6 := gen_random_uuid();

  INSERT INTO cours (id, profile_id, nom, type_cours, date, heure, duree_minutes, lieu, capacite_max) VALUES
    -- Passés (semaine -1)
    (v_cours_p1, v_profile_id, 'Vinyasa flow matin',    'Vinyasa',  CURRENT_DATE - INTERVAL '7 days',  '09:00', 60, 'Studio principal', 12),
    (v_cours_p2, v_profile_id, 'Hatha doux',            'Hatha',    CURRENT_DATE - INTERVAL '5 days',  '18:30', 60, 'Studio principal', 10),
    (v_cours_p3, v_profile_id, 'Yin restoratif',        'Yin',      CURRENT_DATE - INTERVAL '3 days',  '19:30', 75, 'Studio principal',  8),

    -- Cette semaine
    (v_cours_w1, v_profile_id, 'Vinyasa flow matin',    'Vinyasa',  CURRENT_DATE,                       '09:00', 60, 'Studio principal', 12),
    (v_cours_w2, v_profile_id, 'Hatha doux',            'Hatha',    CURRENT_DATE + INTERVAL '2 days',  '18:30', 60, 'Studio principal', 10),
    (v_cours_w3, v_profile_id, 'Yoga prénatal',         'Prénatal', CURRENT_DATE + INTERVAL '3 days',  '11:00', 60, 'Studio principal',  6),

    -- Semaine suivante
    (v_cours_f1, v_profile_id, 'Vinyasa flow matin',    'Vinyasa',  CURRENT_DATE + INTERVAL '7 days',  '09:00', 60, 'Studio principal', 12),
    (v_cours_f2, v_profile_id, 'Hatha doux',            'Hatha',    CURRENT_DATE + INTERVAL '9 days',  '18:30', 60, 'Studio principal', 10),
    (v_cours_f3, v_profile_id, 'Yin restoratif',        'Yin',      CURRENT_DATE + INTERVAL '10 days', '19:30', 75, 'Studio principal',  8),

    -- Encore après
    (v_cours_f4, v_profile_id, 'Vinyasa flow matin',    'Vinyasa',  CURRENT_DATE + INTERVAL '14 days', '09:00', 60, 'Studio principal', 12),
    (v_cours_f5, v_profile_id, 'Yoga prénatal',         'Prénatal', CURRENT_DATE + INTERVAL '17 days', '11:00', 60, 'Studio principal',  6),
    (v_cours_f6, v_profile_id, 'Hatha doux',            'Hatha',    CURRENT_DATE + INTERVAL '23 days', '18:30', 60, 'Studio principal', 10);

  -- ─────────────────────────────────────────────
  -- 8. Abonnements (5 abonnements actifs varied)
  -- ─────────────────────────────────────────────
  v_abo_emma   := gen_random_uuid();
  v_abo_marie  := gen_random_uuid();
  v_abo_thomas := gen_random_uuid();
  v_abo_sophie := gen_random_uuid();
  v_abo_julia  := gen_random_uuid();

  INSERT INTO abonnements (id, profile_id, client_id, offre_id, offre_nom, type, date_debut, date_fin, seances_total, seances_utilisees, statut) VALUES
    -- Emma : carnet, à mi-chemin
    (v_abo_emma,   v_profile_id, v_emma,   v_carnet_id, 'Carnet 10 séances',   'carnet',
     CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '150 days', 10,  4, 'actif'),

    -- Marie : abo mensuel actif
    (v_abo_marie,  v_profile_id, v_marie,  v_abo_id,    'Abonnement mensuel',  'abonnement',
     CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '15 days', NULL, 6, 'actif'),

    -- Thomas : carnet bientôt épuisé (8/10) → trigger alerte
    (v_abo_thomas, v_profile_id, v_thomas, v_carnet_id, 'Carnet 10 séances',   'carnet',
     CURRENT_DATE - INTERVAL '120 days', CURRENT_DATE + INTERVAL '60 days', 10, 8, 'actif'),

    -- Sophie : abo qui expire dans 5j → trigger alerte expiration
    (v_abo_sophie, v_profile_id, v_sophie, v_abo_id,    'Abonnement mensuel',  'abonnement',
     CURRENT_DATE - INTERVAL '25 days', CURRENT_DATE + INTERVAL '5 days',  NULL, 9, 'actif'),

    -- Julia : abo prénatal actif
    (v_abo_julia,  v_profile_id, v_julia,  v_abo_id,    'Abonnement mensuel',  'abonnement',
     CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '20 days', NULL, 3, 'actif');

  -- ─────────────────────────────────────────────
  -- 9. Paiements (11 paiements : payés / en attente / impayé)
  -- ─────────────────────────────────────────────
  INSERT INTO paiements (profile_id, client_id, abonnement_id, intitule, type, montant, statut, mode, date) VALUES
    -- Payés (CB) — abonnements
    (v_profile_id, v_emma,    v_abo_emma,   'Carnet 10 séances',  'abonnement', 150.00, 'paid', 'CB',       CURRENT_DATE - INTERVAL '30 days'),
    (v_profile_id, v_marie,   v_abo_marie,  'Abonnement mensuel', 'abonnement',  90.00, 'paid', 'CB',       CURRENT_DATE - INTERVAL '15 days'),
    (v_profile_id, v_thomas,  v_abo_thomas, 'Carnet 10 séances',  'abonnement', 150.00, 'paid', 'Virement', CURRENT_DATE - INTERVAL '120 days'),
    (v_profile_id, v_sophie,  v_abo_sophie, 'Abonnement mensuel', 'abonnement',  90.00, 'paid', 'CB',       CURRENT_DATE - INTERVAL '25 days'),
    (v_profile_id, v_julia,   v_abo_julia,  'Abonnement mensuel', 'abonnement',  90.00, 'paid', 'CB',       CURRENT_DATE - INTERVAL '10 days'),

    -- En attente (cb pour paiement par carte mais pas encore encaissé)
    (v_profile_id, v_camille, NULL,         'Cours à l''unité',    'cours_unique', 18.00, 'pending', 'CB', CURRENT_DATE - INTERVAL '2 days'),

    -- Impayé (relance)
    (v_profile_id, v_lucas,   NULL,         'Cours à l''unité',    'cours_unique', 18.00, 'unpaid', 'Espèces', CURRENT_DATE - INTERVAL '14 days'),

    -- Cours unique payés en espèces
    (v_profile_id, v_camille, NULL,         'Cours à l''unité',    'cours_unique', 18.00, 'paid', 'Espèces', CURRENT_DATE - INTERVAL '20 days'),
    (v_profile_id, v_camille, NULL,         'Cours à l''unité',    'cours_unique', 18.00, 'paid', 'Espèces', CURRENT_DATE - INTERVAL '8 days'),

    -- Anciens paiements pour stats
    (v_profile_id, v_emma,    NULL,         'Carnet 10 séances',  'abonnement', 150.00, 'paid', 'CB',     CURRENT_DATE - INTERVAL '210 days'),
    (v_profile_id, v_sophie,  NULL,         'Abonnement mensuel', 'abonnement',  90.00, 'paid', 'Chèque', CURRENT_DATE - INTERVAL '55 days');

  -- ─────────────────────────────────────────────
  -- 10. Présences (cours passés)
  -- ─────────────────────────────────────────────
  -- Cours p1 (Vinyasa il y a 7j) : Emma + Marie + Sophie
  INSERT INTO presences (profile_id, cours_id, client_id, abonnement_id, pointee, heure_pointage) VALUES
    (v_profile_id, v_cours_p1, v_emma,   v_abo_emma,   true, (CURRENT_DATE - INTERVAL '7 days')::timestamptz + TIME '09:05'),
    (v_profile_id, v_cours_p1, v_marie,  v_abo_marie,  true, (CURRENT_DATE - INTERVAL '7 days')::timestamptz + TIME '09:02'),
    (v_profile_id, v_cours_p1, v_sophie, v_abo_sophie, true, (CURRENT_DATE - INTERVAL '7 days')::timestamptz + TIME '09:08');

  -- Cours p2 (Hatha il y a 5j) : Marie + Thomas + Camille
  INSERT INTO presences (profile_id, cours_id, client_id, abonnement_id, pointee, heure_pointage) VALUES
    (v_profile_id, v_cours_p2, v_marie,   v_abo_marie,  true, (CURRENT_DATE - INTERVAL '5 days')::timestamptz + TIME '18:30'),
    (v_profile_id, v_cours_p2, v_thomas,  v_abo_thomas, true, (CURRENT_DATE - INTERVAL '5 days')::timestamptz + TIME '18:32'),
    (v_profile_id, v_cours_p2, v_camille, NULL,         true, (CURRENT_DATE - INTERVAL '5 days')::timestamptz + TIME '18:35');

  -- Cours p3 (Yin il y a 3j) : Emma + Sophie (Thomas inscrit mais absent)
  INSERT INTO presences (profile_id, cours_id, client_id, abonnement_id, pointee, heure_pointage) VALUES
    (v_profile_id, v_cours_p3, v_emma,    v_abo_emma,   true,  (CURRENT_DATE - INTERVAL '3 days')::timestamptz + TIME '19:32'),
    (v_profile_id, v_cours_p3, v_sophie,  v_abo_sophie, true,  (CURRENT_DATE - INTERVAL '3 days')::timestamptz + TIME '19:30'),
    (v_profile_id, v_cours_p3, v_thomas,  v_abo_thomas, false, NULL);  -- inscrit, pas pointé

  -- Inscriptions (sans pointage encore) sur les cours à venir
  INSERT INTO presences (profile_id, cours_id, client_id, abonnement_id, pointee) VALUES
    -- Aujourd'hui
    (v_profile_id, v_cours_w1, v_emma,    v_abo_emma,   false),
    (v_profile_id, v_cours_w1, v_marie,   v_abo_marie,  false),
    -- Dans 2 jours
    (v_profile_id, v_cours_w2, v_thomas,  v_abo_thomas, false),
    (v_profile_id, v_cours_w2, v_sophie,  v_abo_sophie, false),
    -- Yoga prénatal dans 3 jours
    (v_profile_id, v_cours_w3, v_julia,   v_abo_julia,  false),
    -- Semaine suivante
    (v_profile_id, v_cours_f1, v_emma,    v_abo_emma,   false),
    (v_profile_id, v_cours_f1, v_marie,   v_abo_marie,  false);

  -- ─────────────────────────────────────────────
  -- 11. Inscriptions évènement
  -- ─────────────────────────────────────────────
  INSERT INTO inscriptions_evenements (profile_id, evenement_id, client_id) VALUES
    (v_profile_id, v_atelier_id, v_emma),
    (v_profile_id, v_atelier_id, v_marie),
    (v_profile_id, v_atelier_id, v_sophie);

  RAISE NOTICE '✅ Seed appliqué pour profile_id=% (Atelier Mélusine)', v_profile_id;
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- VÉRIFICATION (à lancer après pour confirmer)
-- ════════════════════════════════════════════════════════════════════════════
SELECT
  (SELECT studio_slug || ' / ' || studio_nom FROM profiles WHERE email_contact = 'colin@ateliermelusine.com') AS studio,
  (SELECT COUNT(*) FROM clients     WHERE profile_id = (SELECT id FROM profiles WHERE email_contact = 'colin@ateliermelusine.com')) AS nb_clients,
  (SELECT COUNT(*) FROM cours       WHERE profile_id = (SELECT id FROM profiles WHERE email_contact = 'colin@ateliermelusine.com')) AS nb_cours,
  (SELECT COUNT(*) FROM offres      WHERE profile_id = (SELECT id FROM profiles WHERE email_contact = 'colin@ateliermelusine.com')) AS nb_offres,
  (SELECT COUNT(*) FROM abonnements WHERE profile_id = (SELECT id FROM profiles WHERE email_contact = 'colin@ateliermelusine.com')) AS nb_abos,
  (SELECT COUNT(*) FROM paiements   WHERE profile_id = (SELECT id FROM profiles WHERE email_contact = 'colin@ateliermelusine.com')) AS nb_paiements,
  (SELECT COUNT(*) FROM presences   WHERE profile_id = (SELECT id FROM profiles WHERE email_contact = 'colin@ateliermelusine.com')) AS nb_presences;
