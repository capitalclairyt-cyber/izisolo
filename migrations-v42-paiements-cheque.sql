-- v42 : ajout numéro de chèque sur les paiements
ALTER TABLE paiements ADD COLUMN IF NOT EXISTS numero_cheque TEXT;
