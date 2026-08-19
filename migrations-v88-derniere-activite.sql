-- Migration v88 : pouls d'activité des profs (2026-08-19, demande Colin —
-- « savoir quand elles sont sur IziSolo, la dernière heure d'activité »).
--
-- Pourquoi une colonne : auth.users.last_sign_in_at (GoTrue) ne bouge PAS au
-- refresh token — une session persistante (PWA) utilise l'app pendant des
-- semaines sans « connexion » (anti-pattern §12 de la bible). L'admin
-- sous-comptait l'usage réel des profs.
--
-- Écrivain UNIQUE : le layout dashboard (app/(dashboard)/layout.js) pose le
-- pouls à chaque page vue, throttlé à 5 min. Lecteurs : /admin/users
-- (« 🟢 sur IziSolo maintenant » / « active il y a X ») + /admin/studios/[id].
--
-- NULL = jamais vue depuis v88 (champ d'ACTION : naît NULL, jamais DEFAULT
-- now() — anti-pattern « Lu fantôme » §12).
--
-- Re-runnable.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS derniere_activite_at timestamptz;

COMMENT ON COLUMN public.profiles.derniere_activite_at IS
  'Pouls d''activité (v88) : dernière page vue du dashboard prof, throttlé 5 min par le layout. NULL = jamais vue depuis v88.';
