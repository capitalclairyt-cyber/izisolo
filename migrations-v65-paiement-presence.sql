-- ============================================================
-- MIGRATION v65 — Paiement à la séance (lien paiement ↔ présence)
-- ============================================================
--
-- Cf. MODELE-PAIEMENTS-2026.md §3 — Lot 2b.
--
-- Ajoute `paiements.presence_id` : un PAIEMENT À LA SÉANCE (pay-as-you-go,
-- drop-in, cours d'un type non couvert par un carnet) est enregistré
-- directement sur la présence — sans créer de carnet qui se décompterait.
-- Permet d'afficher « payé / à régler » par ligne au pointage et d'éviter le
-- double encaissement, tout en gardant le paiement dans `paiements` (source
-- unique pour Revenus / export).
--
-- Nullable, ON DELETE SET NULL (si la présence est supprimée, le paiement reste
-- en compta). Rétro-compatible : les paiements existants ont presence_id NULL.
--
-- Re-runnable.
-- ============================================================

alter table public.paiements
  add column if not exists presence_id uuid references public.presences(id) on delete set null;

create index if not exists paiements_presence_idx
  on public.paiements (presence_id)
  where presence_id is not null;

do $$ begin
  raise notice '✅ v65 : paiements.presence_id ajoute (paiement a la seance).';
end $$;
