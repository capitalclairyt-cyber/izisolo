-- Migration v15 : Système de dette pour annulation tardive et no-show
--
-- Logique : quand un élève annule au-delà du délai libre OU est marqué absent
-- sans excuse valable, la séance est "due" — décomptée du carnet/abonnement
-- comme si l'élève était présent. L'app applique la règle automatiquement,
-- la prof n'a plus à se positionner en "méchant·e" face à ses élèves.
--
-- Stockage : 3 colonnes ajoutées à `presences` (le moins disruptif).
--   - annulation_tardive : true si l'élève a annulé après le délai libre
--   - est_due           : true si la séance compte (= séance utilisée même si absent)
--   - motif_due         : texte explicatif ('Annulation tardive (<24h)', 'No-show', etc.)
--
-- Le délai d'annulation libre est lu depuis profiles.regles_annulation.delai_heures
-- (déjà existant depuis v5-pointage). Default 24h.

alter table public.presences
  add column if not exists annulation_tardive boolean default false,
  add column if not exists est_due            boolean default false,
  add column if not exists motif_due          text;

-- Index pour calculer rapidement les dettes par client (déjà calculé au render
-- mais on prépare un futur job de relance des impayés)
create index if not exists presences_est_due_idx
  on public.presences (profile_id, client_id)
  where est_due = true;
