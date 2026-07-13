import { createServerClient } from '@/lib/supabase-server';
import DashboardClient from './DashboardClient';
import { SMS_PRIX_UNITAIRE } from '@/lib/notifs-eleves';

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const today = new Date().toISOString().split('T')[0];
  const debutMois = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const debutMoisISO = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  // Charger les données en parallèle
  const [
    { data: profile },
    { data: coursDuJour },
    { count: nbClients },
    { count: nbCoursTotal },
    { data: alertesAbos },
    { data: derniersPaiements },
    { count: smsMois },
    { count: nbCasOuverts },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('cours').select('*, presences(count)').eq('profile_id', user.id).eq('date', today).order('heure'),
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('profile_id', user.id).in('statut', ['prospect', 'actif', 'fidele']),
    supabase.from('cours').select('*', { count: 'exact', head: true }).eq('profile_id', user.id),
    supabase.from('abonnements').select('*, clients(id, nom, prenom)').eq('profile_id', user.id).eq('statut', 'actif'),
    supabase.from('paiements').select('montant, commission_montant').eq('profile_id', user.id).gte('date', debutMois),
    supabase.from('notifications_eleves').select('id', { count: 'exact', head: true })
      .eq('profile_id', user.id).eq('channel', 'sms').eq('statut', 'sent').gte('sent_at', debutMoisISO),
    // Compteur de cas non résolus pour le widget dashboard
    supabase.from('cas_a_traiter').select('id', { count: 'exact', head: true })
      .eq('profile_id', user.id).is('resolu_at', null),
  ]);

  // A-t-il déjà créé un sondage ? (pour décider d'afficher le CTA)
  const { count: nbSondages } = await supabase
    .from('sondages_planning')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', user.id);

  // Calculer les stats
  const revenusMois = derniersPaiements?.reduce((sum, p) => sum + parseFloat(p.montant || 0), 0) || 0;
  const fraisStripeMois = derniersPaiements?.reduce((sum, p) => sum + parseFloat(p.commission_montant || 0), 0) || 0;
  const coutSmsMois = (smsMois || 0) * SMS_PRIX_UNITAIRE;
  const totalACoutsMois = parseFloat((coutSmsMois + fraisStripeMois).toFixed(2));

  // Alertes = OPPORTUNITÉS de renouvellement, jamais des erreurs
  // (cf. MODELE-PAIEMENTS-2026.md §4.4). On n'alerte QUE sur de vrais packs :
  //   - type carnet/abonnement (JAMAIS une séance à l'unité 'cours_unique') ;
  //   - seances_total > 1 (un « carnet » d'1 séance = un drop-in payé+fait,
  //     état normal et réussi → aucune alerte, aucun rouge) ;
  //   - le pack a commencé à être consommé (reste < total) → pas de nudge sur
  //     un carnet flambant neuf.
  // Un carnet terminé n'est PAS une alarme rouge : c'est un « proposer la suite ? ».
  const seuil = profile?.alerte_seances_seuil || 2;
  const alertes = [];
  if (alertesAbos) {
    for (const abo of alertesAbos) {
      const total = abo.seances_total;
      const estVraiPack = total != null && total > 1 && abo.type !== 'cours_unique';
      if (!estVraiPack) continue;
      const reste = total - (abo.seances_utilisees || 0);
      const nom = `${abo.clients?.prenom || ''} ${abo.clients?.nom || ''}`.trim();
      const client_id = abo.clients?.id || null;
      if (reste > 0 && reste <= seuil && reste < total) {
        alertes.push({
          type: 'renew',
          message: `${nom} — il reste ${reste} séance${reste > 1 ? 's' : ''}`,
          hint: 'proposer la suite ?',
          client_id,
        });
      } else if (reste <= 0) {
        alertes.push({
          type: 'renew',
          message: `${nom} — carnet terminé`,
          hint: 'renouveler ?',
          client_id,
        });
      }
    }
  }

  return (
    <DashboardClient
      profile={profile}
      coursDuJour={coursDuJour || []}
      nbClients={nbClients || 0}
      nbCoursTotal={nbCoursTotal || 0}
      revenusMois={revenusMois}
      alertes={alertes}
      coutsMois={{
        sms: { count: smsMois || 0, montant: parseFloat(coutSmsMois.toFixed(2)) },
        stripe: { montant: parseFloat(fraisStripeMois.toFixed(2)) },
        total: totalACoutsMois,
      }}
      hasSondage={(nbSondages || 0) > 0}
      nbCasATraiter={nbCasOuverts || 0}
    />
  );
}
