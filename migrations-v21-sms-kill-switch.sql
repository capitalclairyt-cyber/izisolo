-- Migration v21 : Kill-switch SMS + seuil mensuel + nettoyage Twilio
--
-- Le kill-switch (sms_global_off) vit dans le jsonb notifs_eleves déjà existant
-- → pas de nouvelle colonne pour ça, juste un toggle UI dans Paramètres.
--
-- Nouveau : sms_seuil_mois (int, nullable). Si renseigné, l'app bloque
-- automatiquement les envois SMS après ce nombre dans le mois (anti-explosion
-- de facture). Par défaut illimité (null).
--
-- Cleanup : on supprime les colonnes Twilio (twilio_account_sid, twilio_auth_token,
-- twilio_phone_number) — Mélutek est passé sur OctoPush en infra globale,
-- les pros n'ont plus à configurer leur propre provider.

alter table public.profiles
  add column if not exists sms_seuil_mois int;

-- Comment expliquant la logique du jsonb pour les futurs contributeurs
comment on column public.profiles.notifs_eleves is
  'Préférences notifs élèves : { type: { email: bool, sms: bool }, sms_global_off: bool }. Le kill-switch sms_global_off bloque tout SMS quel que soit le détail.';

comment on column public.profiles.sms_seuil_mois is
  'Seuil d''envois SMS sur le mois en cours. Au-delà, les SMS sont bloqués (track skipped). NULL = illimité.';

-- Cleanup Twilio (pros n'ont plus accès)
alter table public.profiles
  drop column if exists twilio_account_sid,
  drop column if exists twilio_auth_token,
  drop column if exists twilio_phone_number;
