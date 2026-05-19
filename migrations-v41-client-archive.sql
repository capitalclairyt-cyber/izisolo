-- Migration v41 : Ajouter le statut 'archive' aux clients
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_statut_check;
ALTER TABLE clients ADD CONSTRAINT clients_statut_check
  CHECK (statut IN ('prospect', 'actif', 'fidele', 'inactif', 'archive'));
