-- ════════════════════════════════════════════════════════════════════════
-- v67 — État de compte des élèves (côté prof)
--   La prof doit voir, pour chaque élève :
--     • s'il/elle a un compte sur l'appli (et sa dernière connexion)
--     • si une invitation a déjà été envoyée (et quand)
--
--   1) clients.invitation_envoyee_at : posé par /api/invite à chaque envoi.
--   2) RPC eleves_statut_compte() : joint clients.email → auth.users (par email)
--      pour renvoyer has_account + last_sign_in_at, SCOPÉ à auth.uid() (la prof
--      connectée). SECURITY DEFINER car auth.users n'est pas lisible autrement ;
--      le WHERE c.profile_id = auth.uid() garantit qu'on ne renvoie QUE les
--      élèves de la prof appelante (pas de fuite cross-studio).
--
--   Re-runnable.
-- ════════════════════════════════════════════════════════════════════════

-- 1) Trace de l'invitation
ALTER TABLE clients ADD COLUMN IF NOT EXISTS invitation_envoyee_at timestamptz;

-- 2) RPC statut de compte (scopé à la prof connectée)
CREATE OR REPLACE FUNCTION eleves_statut_compte()
RETURNS TABLE (
  client_id uuid,
  has_account boolean,
  last_sign_in_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT
    c.id,
    (u.id IS NOT NULL)   AS has_account,
    u.last_sign_in_at
  FROM clients c
  LEFT JOIN auth.users u
    ON lower(u.email) = lower(c.email)
  WHERE c.profile_id = auth.uid()
    AND coalesce(c.email, '') <> '';
$$;

-- La fonction est appelable par les utilisateurs authentifiés (elle s'auto-scope
-- via auth.uid()). On restreint tout de même l'exécution aux rôles applicatifs.
REVOKE ALL ON FUNCTION eleves_statut_compte() FROM public;
GRANT EXECUTE ON FUNCTION eleves_statut_compte() TO authenticated;
