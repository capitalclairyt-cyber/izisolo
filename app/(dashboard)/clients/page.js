import { createServerClient } from '@/lib/supabase-server';
import { resoudreStudioActif } from '@/lib/studio-actif';
import ClientsClient from './ClientsClient';

// Boucle .range() (AUDIT-PERF cat 2.8) : le select nu plafonne à 1000 fiches
// EN SILENCE — au-delà, des élèves « disparaissaient » de la liste ET de
// l'export CSV (qui lit cette liste côté client = portabilité RGPD fausse).
async function fetchTousLesClients(supabase, profileId) {
  const rows = [];
  for (let page = 0; page < 30; page++) {
    const { data, error } = await supabase
      .from('clients')
      .select('*, abonnements(id, type, offre_nom, seances_total, seances_utilisees, statut, date_fin)')
      .eq('profile_id', profileId)
      .order('updated_at', { ascending: false })
      .order('id')
      .range(page * 1000, page * 1000 + 999);
    if (error) break;
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

export default async function ClientsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { studioId } = await resoudreStudioActif(supabase, user);

  const [
    { data: profile },
    clients,
    { data: statuts },
    { data: segments, error: segmentsError },
  ] = await Promise.all([
    supabase.from('profiles').select('metier, vocabulaire, niveaux, sources, studio_slug, studio_nom, prenom').eq('id', studioId).single(),
    fetchTousLesClients(supabase, user.id),
    // Statut de compte (RPC v67) — dégrade proprement si la migration n'est pas
    // appliquée (rpc renvoie une erreur → statuts null → aucun badge « actif »).
    supabase.rpc('eleves_statut_compte'),
    // Segments « Ponctuel·les » / « Jamais venu·e » — agrégat serveur (RPC v72).
    // Avant : chargement de TOUTES les présences du studio + jointure cours à
    // chaque affichage — et FAUX au-delà de 1000 présences (plafond PostgREST
    // silencieux). L'agrégat renvoie une ligne par élève, borné par nature.
    supabase.rpc('presences_par_eleve'),
  ]);

  // Map client_id → { has_account, last_sign_in_at }
  const statutMap = {};
  for (const s of statuts || []) statutMap[s.client_id] = s;

  // Map client_id → { nb, toutesTarifees, dernier: {nom, date} }.
  // v72 pas appliquée → null : ClientsClient masque alors les segments basés
  // sur les présences (plutôt que d'afficher tout le monde en « Jamais venu·e »).
  let presenceInfo = null;
  if (!segmentsError) {
    presenceInfo = {};
    for (const s of segments || []) {
      presenceInfo[s.client_id] = {
        nb: s.nb,
        toutesTarifees: !!s.toutes_tarifees,
        dernier: s.dernier_date || s.dernier_nom
          ? { nom: s.dernier_nom || 'Évènement', date: s.dernier_date || null }
          : null,
      };
    }
  }

  return <ClientsClient clients={clients || []} profile={profile} statutMap={statutMap} presenceInfo={presenceInfo} />;
}
