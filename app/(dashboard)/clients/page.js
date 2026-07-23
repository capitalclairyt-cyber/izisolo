import { createServerClient } from '@/lib/supabase-server';
import ClientsClient from './ClientsClient';

export default async function ClientsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [
    { data: profile },
    { data: clients },
    { data: statuts },
    { data: presences },
  ] = await Promise.all([
    supabase.from('profiles').select('metier, vocabulaire, niveaux, sources, studio_slug, studio_nom, prenom').eq('id', user.id).single(),
    supabase.from('clients').select('*, abonnements(id, type, offre_nom, seances_total, seances_utilisees, statut, date_fin)')
      .eq('profile_id', user.id)
      .order('updated_at', { ascending: false }),
    // Statut de compte (RPC v67) — dégrade proprement si la migration n'est pas
    // appliquée (rpc renvoie une erreur → statuts null → aucun badge « actif »).
    supabase.rpc('eleves_statut_compte'),
    // Présences (légères) — pour dériver les segments « Ponctuel·les » (venu·es
    // uniquement à des évènements payables à la séance : pleine lune, stage…)
    // et « Jamais venu·e » (fiche sans aucune présence).
    supabase.from('presences').select('client_id, cours:cours_id(nom, date, tarif_unitaire)')
      .eq('profile_id', user.id),
  ]);

  // Map client_id → { has_account, last_sign_in_at }
  const statutMap = {};
  for (const s of statuts || []) statutMap[s.client_id] = s;

  // Map client_id → { nb, toutesTarifees, dernier: {nom, date} } — agrégé
  // serveur pour ne passer qu'un petit objet au client.
  const presenceInfo = {};
  for (const p of presences || []) {
    if (!p.client_id) continue;
    const info = presenceInfo[p.client_id] || (presenceInfo[p.client_id] = { nb: 0, toutesTarifees: true, dernier: null });
    info.nb++;
    if (Number(p.cours?.tarif_unitaire) > 0) {
      if (!info.dernier || (p.cours?.date || '') > (info.dernier.date || '')) {
        info.dernier = { nom: p.cours?.nom || 'Évènement', date: p.cours?.date || null };
      }
    } else {
      info.toutesTarifees = false;
    }
  }

  return <ClientsClient clients={clients || []} profile={profile} statutMap={statutMap} presenceInfo={presenceInfo} />;
}
