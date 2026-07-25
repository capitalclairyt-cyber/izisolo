-- ════════════════════════════════════════════════════════════════════════
-- v75 — FIX fusion de fiches : table fantôme dans la RPC v68 (audit B1c)
--
--   `fusionner_clients` (v68) référence `sondage_reponses` (SINGULIER) alors
--   que la table réelle est `sondages_reponses` (v23:77). plpgsql ne valide
--   pas les noms de tables au CREATE : la RPC « répond » aux sondes et aux
--   gardes, mais la PREMIÈRE vraie fusion lève 42P01 (relation inexistante)
--   → ROLLBACK complet → la feature fusion était morte sans avoir servi.
--
--   v75 = copie intégrale de la fonction v68 avec le nom corrigé.
--   Re-runnable (CREATE OR REPLACE). Après application :
--   `node scripts/verifier-selects.mjs` puis tester une fusion sur 2 fiches
--   de test du studio démo (créer un doublon volontaire, fusionner, vérifier).
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

  -- 1) Compléter les champs vides de la principale avec ceux de la doublon
  --    (on ne remplace jamais une valeur déjà présente sur la principale).
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

  -- 2) Présences : éviter le doublon de séance (même cours déjà pointé sur la
  --    principale), puis réassigner le reste.
  DELETE FROM presences s
   WHERE s.client_id = p_secondary
     AND EXISTS (SELECT 1 FROM presences p
                  WHERE p.client_id = p_primary AND p.cours_id = s.cours_id);
  UPDATE presences SET client_id = p_primary WHERE client_id = p_secondary;

  -- 3) Membres de conversation : éviter le doublon (même conversation).
  DELETE FROM conversation_members s
   WHERE s.client_id = p_secondary
     AND EXISTS (SELECT 1 FROM conversation_members p
                  WHERE p.client_id = p_primary AND p.conversation_id = s.conversation_id);
  UPDATE conversation_members SET client_id = p_primary WHERE client_id = p_secondary;

  -- 4) Réassignation simple des autres tables.
  UPDATE paiements            SET client_id = p_primary WHERE client_id = p_secondary;
  UPDATE abonnements          SET client_id = p_primary WHERE client_id = p_secondary;
  UPDATE echeanciers          SET client_id = p_primary WHERE client_id = p_secondary;
  UPDATE cas_a_traiter        SET client_id = p_primary WHERE client_id = p_secondary;
  UPDATE liste_attente        SET client_id = p_primary WHERE client_id = p_secondary;
  UPDATE conversations        SET client_id = p_primary WHERE client_id = p_secondary;
  UPDATE cours_essai_demandes SET client_id = p_primary WHERE client_id = p_secondary;
  UPDATE cours                SET client_id = p_primary WHERE client_id = p_secondary;
  -- v68 disait `sondage_reponses` (table inexistante) → 42P01 à l'exécution.
  UPDATE sondages_reponses    SET client_id = p_primary WHERE client_id = p_secondary;

  -- 5) Supprimer la fiche doublon.
  DELETE FROM clients WHERE id = p_secondary;
END;
$$;

REVOKE ALL ON FUNCTION fusionner_clients(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION fusionner_clients(uuid, uuid) TO authenticated;

DO $$ BEGIN
  RAISE NOTICE '✅ v75 : fusionner_clients corrigée (sondages_reponses) — tester une fusion réelle sur le démo.';
END $$;
