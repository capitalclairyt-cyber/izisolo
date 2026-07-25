-- ════════════════════════════════════════════════════════════════════════
-- v78 — FIX fusion de fiches #3 : la table `echeanciers` N'EXISTE PAS
--        (retest réel post-v76, campagne 2026-07-25)
--
--   Troisième bug de la même RPC, chacun caché derrière le précédent :
--     v75 → table fantôme `sondage_reponses` (42P01)
--     v76 → email copié avant suppression du doublon (23505 UNIQUE)
--     v78 → `UPDATE echeanciers` … or AUCUNE migration ne crée cette table :
--            v40 n'a ajouté qu'une COLONNE `paiements.echeancier_id` (UUID
--            partagé entre versements). Le retest réel lève 42P01.
--
--   La réassignation des échéanciers est déjà couverte par
--   `UPDATE paiements SET client_id …` (la ligne fantôme est simplement
--   retirée). Re-runnable. Après application : retest fusion réel en session.
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

  -- 1) Présences : éviter le doublon de séance, puis réassigner le reste.
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
  --    (v78 : `UPDATE echeanciers` retiré — la table n'existe pas ; les
  --    échéanciers vivent dans paiements.echeancier_id, déjà réassignés.)
  UPDATE paiements            SET client_id = p_primary WHERE client_id = p_secondary;
  UPDATE abonnements          SET client_id = p_primary WHERE client_id = p_secondary;
  UPDATE cas_a_traiter        SET client_id = p_primary WHERE client_id = p_secondary;
  UPDATE liste_attente        SET client_id = p_primary WHERE client_id = p_secondary;
  UPDATE conversations        SET client_id = p_primary WHERE client_id = p_secondary;
  UPDATE cours_essai_demandes SET client_id = p_primary WHERE client_id = p_secondary;
  UPDATE cours                SET client_id = p_primary WHERE client_id = p_secondary;
  UPDATE sondages_reponses    SET client_id = p_primary WHERE client_id = p_secondary;

  -- 4) Supprimer la fiche doublon AVANT de rapatrier ses champs (v76 :
  --    l'ordre inverse violait uniq_clients_profile_email).
  DELETE FROM clients WHERE id = p_secondary;

  -- 5) Compléter les champs vides de la principale (valeurs de v_sec).
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
  RAISE NOTICE '✅ v78 : UPDATE echeanciers retiré — rejouer le test de fusion réel.';
END $$;
