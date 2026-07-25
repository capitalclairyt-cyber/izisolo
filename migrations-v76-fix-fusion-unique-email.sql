-- ════════════════════════════════════════════════════════════════════════
-- v76 — FIX fusion de fiches #2 : violation UNIQUE email (audit B1f, test réel)
--
--   v75 avait corrigé la table fantôme (42P01) de la RPC v68. Le PREMIER test
--   de fusion RÉEL (prof authentifiée, 2 fiches, cas nominal de Maude :
--   principale SANS email + doublon AVEC) a alors révélé le bug suivant,
--   inatteignable derrière le premier :
--
--     23505 duplicate key "uniq_clients_profile_email"
--
--   Cause : l'étape 1 copiait email/téléphone du doublon SUR la principale
--   PENDANT que le doublon existait encore avec ce même email → l'index
--   UNIQUE v53 (profile_id, lower(email)) rejette → ROLLBACK complet.
--   La fusion n'a donc JAMAIS fonctionné, ni en v68 ni en v75.
--
--   v76 : le rapatriement des champs passe APRÈS la suppression du doublon
--   (les valeurs sont déjà capturées dans v_sec). Re-runnable.
--   Après application : `node scripts/verifier-selects.mjs` — le test réel
--   scripté (fiches jetables) est rejoué en session.
-- ════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fusionner_clients(p_primary uuid, p_secondary uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prof uuid := auth.uid();
  v_prim clients%ROWTYPE;
  v_sec  clients%ROWTYPE;
BEGIN
  IF p_primary IS NULL OR p_secondary IS NULL OR p_primary = p_secondary THEN
    RAISE EXCEPTION 'Fiches invalides ou identiques';
  END IF;

  SELECT * INTO v_prim FROM clients WHERE id = p_primary   AND profile_id = v_prof;
  SELECT * INTO v_sec  FROM clients WHERE id = p_secondary AND profile_id = v_prof;
  IF v_prim.id IS NULL OR v_sec.id IS NULL THEN
    RAISE EXCEPTION 'Fiche introuvable ou non autorisée';
  END IF;

  -- 1) Présences : éviter le doublon de séance (même cours déjà pointé sur la
  --    principale), puis réassigner le reste.
  DELETE FROM presences s
   WHERE s.client_id = p_secondary
     AND EXISTS (SELECT 1 FROM presences p
                  WHERE p.client_id = p_primary AND p.cours_id = s.cours_id);
  UPDATE presences SET client_id = p_primary WHERE client_id = p_secondary;

  -- 2) Membres de conversation : éviter le doublon (même conversation).
  DELETE FROM conversation_members s
   WHERE s.client_id = p_secondary
     AND EXISTS (SELECT 1 FROM conversation_members p
                  WHERE p.client_id = p_primary AND p.conversation_id = s.conversation_id);
  UPDATE conversation_members SET client_id = p_primary WHERE client_id = p_secondary;

  -- 3) Réassignation simple des autres tables.
  UPDATE paiements            SET client_id = p_primary WHERE client_id = p_secondary;
  UPDATE abonnements          SET client_id = p_primary WHERE client_id = p_secondary;
  UPDATE echeanciers          SET client_id = p_primary WHERE client_id = p_secondary;
  UPDATE cas_a_traiter        SET client_id = p_primary WHERE client_id = p_secondary;
  UPDATE liste_attente        SET client_id = p_primary WHERE client_id = p_secondary;
  UPDATE conversations        SET client_id = p_primary WHERE client_id = p_secondary;
  UPDATE cours_essai_demandes SET client_id = p_primary WHERE client_id = p_secondary;
  UPDATE cours                SET client_id = p_primary WHERE client_id = p_secondary;
  UPDATE sondages_reponses    SET client_id = p_primary WHERE client_id = p_secondary;

  -- 4) Supprimer la fiche doublon AVANT de rapatrier ses champs : l'ordre
  --    inverse (v68/v75) violait uniq_clients_profile_email dès que le
  --    doublon portait l'email à copier — LE cas nominal (B1f, test réel).
  DELETE FROM clients WHERE id = p_secondary;

  -- 5) Compléter les champs vides de la principale avec ceux du doublon
  --    (valeurs capturées dans v_sec ; on ne remplace jamais une valeur
  --    déjà présente sur la principale).
  UPDATE clients SET
    email           = COALESCE(email, v_sec.email),
    telephone       = COALESCE(telephone, v_sec.telephone),
    date_naissance  = COALESCE(date_naissance, v_sec.date_naissance),
    adresse_postale = COALESCE(adresse_postale, v_sec.adresse_postale),
    invitation_envoyee_at = COALESCE(invitation_envoyee_at, v_sec.invitation_envoyee_at),
    notes = CASE
      WHEN COALESCE(notes, '') = ''      THEN v_sec.notes
      WHEN COALESCE(v_sec.notes, '') = '' THEN notes
      ELSE notes || E'\n---\n' || v_sec.notes
    END
  WHERE id = p_primary;
END;
$$;

REVOKE ALL ON FUNCTION fusionner_clients(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION fusionner_clients(uuid, uuid) TO authenticated;

DO $$ BEGIN
  RAISE NOTICE '✅ v76 : fusionner_clients réordonnée — rejouer le test de fusion réel.';
END $$;
