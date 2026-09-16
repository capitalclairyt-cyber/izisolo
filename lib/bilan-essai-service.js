/**
 * Le bilan d'essai, côté base (v119). Les règles vivent dans lib/bilan-essai.js ;
 * ici, on compte, et on ne décide de rien.
 *
 * Chaque compte est indépendant et DÉFENSIF : une table absente, une colonne
 * pas encore migrée ou une requête en erreur rend `undefined`, et la ligne
 * correspondante disparaît du bilan au lieu d'afficher zéro (règle 2 de
 * lib/bilan-essai.js : on ne montre pas un chiffre qu'on ne sait pas compter).
 */
import { filtreDateComptable } from './urssaf';

/**
 * D'où vient une inscription (v119). UPDATE SÉPARÉ, jamais dans l'insert ni
 * dans la RPC `reserver_place` : une colonne inconnue ferait échouer TOUTE la
 * réservation tant que la migration n'est pas passée (patron poserLienVisio,
 * v86). Un échec ici ne se voit nulle part, et c'est voulu : la place est déjà
 * prise, c'est la seule chose qui compte pour l'élève.
 */
export async function poserSourcePresence(admin, presenceId, source) {
  if (!presenceId || !source) return false;
  try {
    const { error } = await admin.from('presences').update({ source }).eq('id', presenceId);
    return !error;
  } catch {
    return false;
  }
}

const nombre = async (requete) => {
  try {
    const { count, error } = await requete;
    if (error) return undefined;
    return count || 0;
  } catch {
    return undefined;
  }
};

/**
 * `debut` / `fin` en AAAA-MM-JJ (la fenêtre de l'essai).
 * `admin` = client service_role (le cron n'a pas de session ; le tableau de
 * bord passe son client de session, la RLS le laisse lire son propre studio).
 */
export async function compterBilan(admin, profileId, debut, fin) {
  if (!profileId || !debut || !fin) return {};
  const finJour = `${fin}T23:59:59.999Z`;
  const debutJour = `${debut}T00:00:00.000Z`;

  const [reservations, annonces, comptesEleves, demandes, essais, listeAttente] = await Promise.all([
    // Les réservations que les ÉLÈVES ont faites : `source` est posée par les
    // portes publiques depuis v119. Avant, la colonne n'existe pas et la
    // requête échoue : la ligne ne s'affiche pas, elle ne s'invente pas.
    nombre(admin.from('presences').select('id', { count: 'exact', head: true })
      .eq('profile_id', profileId).eq('source', 'portail')
      .gte('created_at', debutJour).lte('created_at', finJour)),
    // Ce que la prof a envoyé dans la messagerie (annonces comprises).
    nombre(admin.from('messages').select('id, conversations!inner(profile_id)', { count: 'exact', head: true })
      .eq('conversations.profile_id', profileId).eq('sender_type', 'pro')
      .gte('created_at', debutJour).lte('created_at', finJour)),
    // Un état, pas un événement : « N élèves ont leur espace chez toi », et
    // c'est cet accès-là qui se ferme à la fin de l'essai.
    nombre(admin.from('clients').select('id', { count: 'exact', head: true })
      .eq('profile_id', profileId).not('auth_user_id', 'is', null)),
    nombre(admin.from('demandes_offre').select('id', { count: 'exact', head: true })
      .eq('profile_id', profileId).gte('created_at', debutJour).lte('created_at', finJour)),
    nombre(admin.from('cours_essai_demandes').select('id', { count: 'exact', head: true })
      .eq('profile_id', profileId).gte('created_at', debutJour).lte('created_at', finJour)),
    nombre(admin.from('liste_attente').select('id', { count: 'exact', head: true })
      .eq('profile_id', profileId).gte('created_at', debutJour).lte('created_at', finJour)),
  ]);

  // Les paiements encaissés EN LIGNE : un stripe_session_id, et la date
  // comptable (encaissement d'abord, vente en secours) comme partout depuis v93.
  let paiements;
  let montantPaiements = 0;
  try {
    const { data, error } = await admin
      .from('paiements')
      .select('montant')
      .eq('profile_id', profileId)
      .eq('statut', 'paid')
      .not('stripe_session_id', 'is', null)
      .or(filtreDateComptable(debut, fin));
    if (!error) {
      paiements = (data || []).length;
      montantPaiements = (data || []).reduce((t, p) => t + (parseFloat(p.montant) || 0), 0);
    }
  } catch { /* ligne omise */ }

  return { reservations, paiements, montantPaiements, annonces, comptesEleves, demandes, essais, listeAttente };
}
