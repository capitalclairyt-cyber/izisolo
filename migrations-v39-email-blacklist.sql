-- Migration v39 : table email_blacklist pour désinscription mailing prospection
-- À exécuter dans Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.email_blacklist (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  reason text DEFAULT 'unsubscribe',
  source text,
  created_at timestamptz DEFAULT now()
);

-- Index pour lookup rapide
CREATE INDEX IF NOT EXISTS idx_email_blacklist_email ON public.email_blacklist (email);

-- RLS : lecture publique (pour vérifier avant envoi), écriture via service_role uniquement
ALTER TABLE public.email_blacklist ENABLE ROW LEVEL SECURITY;

-- Permettre l'insertion anonyme (pour la page de désinscription publique)
CREATE POLICY "allow_anon_insert_blacklist" ON public.email_blacklist
  FOR INSERT TO anon WITH CHECK (true);

-- Pas de SELECT/UPDATE/DELETE pour anon (seul service_role peut lire/supprimer)
CREATE POLICY "allow_service_role_all_blacklist" ON public.email_blacklist
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Table de suivi des envois prospection
CREATE TABLE IF NOT EXISTS public.prospection_envois (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  lot text,
  sequence_step integer DEFAULT 1,
  sent_at timestamptz DEFAULT now(),
  opened_at timestamptz,
  clicked_at timestamptz,
  bounced boolean DEFAULT false,
  unsubscribed boolean DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_prospection_envois_email ON public.prospection_envois (email);

ALTER TABLE public.prospection_envois ENABLE ROW LEVEL SECURITY;

-- Seul service_role peut lire/écrire la table de suivi
CREATE POLICY "allow_service_role_all_prospection" ON public.prospection_envois
  FOR ALL TO service_role USING (true) WITH CHECK (true);
