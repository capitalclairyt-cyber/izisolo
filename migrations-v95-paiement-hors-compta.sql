-- ============================================================================
-- v95 — « Ne pas faire apparaître dans ma compta, je déclare à part »
--
-- Demande Colin (2026-08-23, feedback in-app du 04:30 puis précision :
-- « du genre, sur un paiement, un toggle ne pas faire apparaître dans la
-- compta, je déclarerai à part »). Retour terrain récurrent : certaines profs
-- encaissent des espèces qu'elles déclarent par un autre canal (autre statut,
-- autre structure, don, remboursement de frais) et ne veulent pas les voir
-- remonter dans la déclaration que l'app leur prépare.
--
-- CE QUE ÇA FAIT : un drapeau POSÉ PAR LA PROF, encaissement par encaissement.
-- L'argent reste enregistré dans IziSolo (l'élève garde son historique, le
-- carnet est décompté, la facture éventuelle reste valable) ; seuls la
-- déclaration URSSAF, le livre des recettes et la base déclarée de l'export
-- comptable l'ignorent.
--
-- CE QUE ÇA NE FAIT PAS : ça n'efface rien et ça ne se cache pas. Tout
-- document qui exclut des lignes DOIT dire combien et pour quel montant
-- (lib/urssaf.mentionExclusions). Un registre qui se prétend complet en
-- masquant des lignes serait un faux ; celui-ci annonce ce qu'il ne contient
-- pas, et la responsabilité de ce qui est déclaré ailleurs reste à la prof.
--
-- Le défaut est FALSE : rien ne change pour les 100 % de paiements existants.
-- Re-runnable.
-- ============================================================================

alter table public.paiements
  add column if not exists exclu_compta boolean not null default false;

comment on column public.paiements.exclu_compta is
  'La prof a demandé que cet encaissement n''apparaisse pas dans sa déclaration (elle le déclare à part). Les documents qui l''excluent doivent le mentionner.';

-- Index partiel : les exclusions sont rares par nature, on ne paie que pour
-- elles. Sert les lectures « lesquels sont exclus sur la période ».
create index if not exists idx_paiements_exclu_compta
  on public.paiements (profile_id)
  where exclu_compta = true;
