import { createClient } from '@supabase/supabase-js';

// Client admin avec service_role — UNIQUEMENT pour les crons et l'admin
// Ne JAMAIS utiliser côté client ou dans les API routes classiques
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
