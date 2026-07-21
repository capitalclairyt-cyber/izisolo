-- ════════════════════════════════════════════════════════════════════════
-- v68 — Fusion de fiches élèves en double (côté prof)
--
--   Maude a des doublons : elle inscrit un·e élève (fiche sans email), puis
--   l'invitation / l'auto-inscription crée une 2e fiche (avec l'email). Cette
--   RPC fusionne la fiche « doublon » (secondary) dans la fiche « principale »
--   (primary) de façon ATOMIQUE : tout ce qui pointe vers secondary est
--   rapatrié sur primary, puis secondary est supprimée.
--
--   SECURITY DEFINER + garde auth.uid() : la prof ne peut fusionner QUE deux de
--   SES fiches (pas de fuite / vandalisme cross-studio). Transactionnel : en cas
--   de conflit imprévu, tout est annulé (jamais de fusion à moitié faite).
--
--   Tables réassignées (introspectées 2026-07-21) : presences, paiements,
--   abonnements, echeanciers, cas_a_traiter, liste_attente, conversations,
--   conversation_members, cours_essai_demandes, cours, sondage_reponses.
--   client_abos = VUE (dérivée d'abonnements) → non touchée.
--
--   Re-runnable (CREATE OR REPLACE).
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
  UPDATE sondage_reponses     SET client_id = p_primary WHERE client_id = p_secondary;

  -- 5) Supprimer la fiche doublon.
  DELETE FROM clients WHERE id = p_secondary;
END;
$$;

REVOKE ALL ON FUNCTION fusionner_clients(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION fusionner_clients(uuid, uuid) TO authenticated;
