import { createServerClient } from '@/lib/supabase-server';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const today = new Date().toISOString().split('T')[0];

  // Charger les données en parallèle
  const [
    { data: profile },
    { data: coursDuJour },
    { count: nbClients },
    { data: alertesAbos },
    { data: derniersPaiements },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('cours').select('*, presences(count)').eq('profile_id', user.id).eq('date', today).order('heure'),
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('profile_id', user.id).in('statut', ['prospect', 'actif', 'fidele']),
    supabase.from('abonnements').select('*, clients(nom, prenom)').eq('profile_id', user.id).eq('statut', 'actif'),
    supabase.from('paiements').select('montant').eq('profile_id', user.id).gte('date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]),
  ]);

  // Calculer les stats
  const revenusMois = derniersPaiements?.reduce((sum, p) => sum + parseFloat(p.montant || 0), 0) || 0;

  // Alertes simples
  const alertes = [];
  if (alertesAbos) {
    for (const abo of alertesAbos) {
      if (abo.seances_total !== null) {
        const reste = (abo.seances_total || 0) - (abo.seances_utilisees || 0);
        if (reste <= (profile?.alerte_seances_seuil || 2) && reste > 0) {
          alertes.push({
            type: 'warning',
            message: `${abo.clients?.prenom || ''} ${abo.clients?.nom || ''} — ${reste} séance${reste > 1 ? 's' : ''} restante${reste > 1 ? 's' : ''}`,
          });
        }
        if (reste <= 0) {
          alertes.push({
            type: 'danger',
            message: `${abo.clients?.prenom || ''} ${abo.clients?.nom || ''} — crédit épuisé`,
          });
        }
      }
    }
  }

  return (
    <DashboardClient
      profile={profile}
      coursDuJour={coursDuJour || []}
      nbClients={nbClients || 0}
      revenusMois={revenusMois}
      alertes={alertes}
    />
  );
}
