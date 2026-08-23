import { createAdminClient } from '@/lib/supabase-admin';
import DemandesClient from './DemandesClient';

export const metadata = { title: 'Demandes de studio' };
export const dynamic = 'force-dynamic';

/**
 * Les demandes publiques « on crée mon studio » (v96) — leur écran d'arrivée.
 *
 * Sans lui, une demande vit dans un email et se perd : c'est exactement ce
 * qu'on a corrigé pour les feedbacks du widget (v41, invisibles hors SQL
 * pendant des mois). Lecture DÉFENSIVE : sans la table, la page le dit et
 * n'explose pas.
 */
export default async function DemandesPage() {
  let demandes = [];
  let migrationManquante = false;
  try {
    const { data, error } = await createAdminClient()
      .from('demandes_studio')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    demandes = data || [];
  } catch {
    migrationManquante = true;
  }

  return <DemandesClient demandes={demandes} migrationManquante={migrationManquante} />;
}
