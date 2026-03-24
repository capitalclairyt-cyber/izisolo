import { createServerClient } from '@/lib/supabase-server';
import RevenusClient from './RevenusClient';

export default async function RevenusPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const now = new Date();
  const debutMois = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const debutMoisDernier = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
  const finMoisDernier = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

  const [
    { data: paiementsMois },
    { data: paiementsMoisDernier },
    { data: paiementsRecents },
  ] = await Promise.all([
    supabase.from('paiements').select('montant, statut').eq('profile_id', user.id).gte('date', debutMois),
    supabase.from('paiements').select('montant').eq('profile_id', user.id).gte('date', debutMoisDernier).lte('date', finMoisDernier).eq('statut', 'paid'),
    supabase.from('paiements').select('*, clients(prenom, nom)').eq('profile_id', user.id).order('date', { ascending: false }).limit(20),
  ]);

  const revenuMois = paiementsMois?.filter(p => p.statut === 'paid').reduce((s, p) => s + parseFloat(p.montant || 0), 0) || 0;
  const enAttente = paiementsMois?.filter(p => p.statut === 'pending').reduce((s, p) => s + parseFloat(p.montant || 0), 0) || 0;
  const revenuMoisDernier = paiementsMoisDernier?.reduce((s, p) => s + parseFloat(p.montant || 0), 0) || 0;

  return (
    <RevenusClient
      revenuMois={revenuMois}
      enAttente={enAttente}
      revenuMoisDernier={revenuMoisDernier}
      paiementsRecents={paiementsRecents || []}
    />
  );
}
