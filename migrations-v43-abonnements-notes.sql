-- Migration v43 : ajout colonne notes sur abonnements
-- Permet aux profs de laisser des observations libres sur l'offre d'un·e élève
-- (ex. "16 séances saisies à la création de l'app mais pas sûre du décompte")

ALTER TABLE abonnements ADD COLUMN IF NOT EXISTS notes TEXT;
