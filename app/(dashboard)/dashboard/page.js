import { createServerClient } from '@/lib/supabase-server';
import { resoudreStudioActif } from '@/lib/studio-actif';
import { createAdminClient } from '@/lib/supabase-admin';
import { escapeIlike } from '@/lib/utils';
import DashboardClient from './DashboardClient';
import { SMS_PRIX_UNITAIRE } from '@/lib/notifs-eleves';

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Le studio affiché (v101) : pour une prof seule c'est elle-même,
  // pour une prof invitée dans une association c'est le studio de l'asso.
  const { studioId } = await resoudreStudioActif(supabase, user);

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
    supabase.from('profiles').select('*').eq('id', studioId).single(),
    // Les LIGNES de présence, pas un count brut : le dashboard doit savoir ce
    // qui reste À POINTER (retour Manon 2026-08-26 — elle décomptait les
    // carnets à la main faute de voir le geste qui le fait pour elle), et
    // compter les inscrits passe par la formule v74 (lib/presences), qui
    // ignore les annulations. Les cours du jour sont peu nombreux : aucun
    // risque de cap PostgREST ici.
    supabase.from('cours').select('*, presences(id, statut_pointage, annulation_tardive)').eq('profile_id', studioId).eq('date', today).order('heure'),
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('profile_id', studioId).in('statut', ['prospect', 'actif', 'fidele']),
    supabase.from('cours').select('*', { count: 'exact', head: true }).eq('profile_id', studioId),
    supabase.from('abonnements').select('*, clients(id, nom, prenom)').eq('profile_id', studioId).eq('statut', 'actif'),
    supabase.from('paiements').select('montant, commission_montant').eq('profile_id', studioId).gte('date', debutMois),
    supabase.from('notifications_eleves').select('id', { count: 'exact', head: true })
      .eq('profile_id', studioId).eq('channel', 'sms').eq('statut', 'sent').gte('sent_at', debutMoisISO),
    // Compteur de cas non résolus pour le widget dashboard
    supabase.from('cas_a_traiter').select('id', { count: 'exact', head: true })
      .eq('profile_id', studioId).is('resolu_at', null),
  ]);

  // A-t-il déjà créé un sondage ? (pour décider d'afficher le CTA)
  const { count: nbSondages } = await supabase
    .from('sondages_planning')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', studioId);

  // A-t-elle déjà invité au moins un·e élève ? (étape checklist « Invite tes élèves »)
  const { count: nbInvites } = await supabase
    .from('clients')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', studioId)
    .not('invitation_envoyee_at', 'is', null);

  // Boucle argent (checklist étendue 2026-08-18) : la checklist s'arrêtait
  // AVANT l'argent — or offre créée + première vente = LE moment d'activation.
  const [{ count: nbOffres }, { count: nbVentes }] = await Promise.all([
    supabase.from('offres').select('id', { count: 'exact', head: true }).eq('profile_id', studioId),
    supabase.from('abonnements').select('id', { count: 'exact', head: true }).eq('profile_id', studioId),
  ]);

  // Double identité (26/07) : ce compte prof est-il AUSSI élève ailleurs ?
  // Lookup par email en service-role (la RLS interdit de lire les fiches des
  // autres studios avec le client session) — même contrat que le GET de
  // /api/eleve/compte. Décoratif : le dashboard vit très bien sans.
  let espacesEleve = [];
  try {
    const admin = createAdminClient();
    const email = (user.email || '').trim().toLowerCase();
    // v90 : lookup indexé lower(email) via RPC — le .ilike global seq-scannait
    // toute la table clients à CHAQUE affichage du dashboard (AUDIT-PERF 2.6).
    let fiches = null;
    const { data: viaRpc, error: rpcErr } = await admin.rpc('fiches_par_email', { p_email: email });
    if (!rpcErr && viaRpc) {
      const autresIds = [...new Set(viaRpc.map(f => f.profile_id))];
      if (autresIds.length > 0) {
        const { data: profs } = await admin
          .from('profiles')
          .select('id, studio_slug, studio_nom, portail_actif')
          .in('id', autresIds);
        const profById = new Map((profs || []).map(p => [p.id, p]));
        fiches = viaRpc.map(f => ({ profile_id: f.profile_id, profiles: profById.get(f.profile_id) || null }));
      } else {
        fiches = [];
      }
    } else {
      // Pré-migration v90 : chemin historique
      const { data } = await admin
        .from('clients')
        .select('profile_id, profiles(studio_slug, studio_nom, portail_actif)')
        .ilike('email', escapeIlike(email));
      fiches = data;
    }
    const vus = new Set();
    for (const row of fiches || []) {
      const p = row.profiles;
      if (!p?.studio_slug || !p.portail_actif) continue;
      if (row.profile_id === user.id || vus.has(p.studio_slug)) continue;
      vus.add(p.studio_slug);
      espacesEleve.push({ slug: p.studio_slug, nom: p.studio_nom || p.studio_slug });
    }
  } catch { /* fail-open : pas de pont élève affiché, rien de cassé */ }

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
      nbInvites={nbInvites || 0}
      nbOffres={nbOffres || 0}
      nbVentes={nbVentes || 0}
      nbCasATraiter={nbCasOuverts || 0}
      espacesEleve={espacesEleve}
    />
  );
}
