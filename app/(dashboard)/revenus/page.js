import { createServerClient } from '@/lib/supabase-server';
import RevenusClient from './RevenusClient';

export default async function RevenusPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // On charge les paiements des 12 derniers mois ; le filtrage par période
  // se fait côté client pour un UX réactif sans round-trip serveur.
  const debutFenetre = new Date();
  debutFenetre.setMonth(debutFenetre.getMonth() - 12);
  const debutFenetreStr = debutFenetre.toISOString().split('T')[0];

  const { data: paiements } = await supabase
    .from('paiements')
    .select('id, intitule, type, montant, statut, mode, date, date_encaissement, notes, commission_montant, stripe_session_id, client_id, clients(prenom, nom, nom_structure)')
    .eq('profile_id', user.id)
    .gte('date', debutFenetreStr)
    .order('date', { ascending: false });

  return <RevenusClient paiements={paiements || []} />;
}
