// ============================================================================
// IziSolo — La vie de l'association, côté serveur (v113, lot 3). Le client
// passé en paramètre est celui de la SESSION (RLS) quand la route agit pour la
// structure, ou `admin` quand il faut écrire un paiement au nom d'une vente.
// Tout est DÉFENSIF : sans v113, { migrationManquante }.
// ============================================================================

import { adherentesAJour, libelleAdhesion, sanitizeVenteAdhesion } from './vie-asso.js';
import { reportError } from './report.js';

const ABSENT = ['PGRST204', 'PGRST205', '42703', '42P01'];
export const estAbsent = (e) => !!e && ABSENT.includes(e.code);

/** Les adhésions d'une structure, une saison ou toutes. */
export async function chargerAdhesions(client, studioId, { saison = null, clientId = null } = {}) {
  try {
    let q = client
      .from('adhesions')
      .select('id, client_id, offre_id, offre_nom, saison, date_debut, date_fin, montant, paiement_id, statut, created_at')
      .eq('profile_id', studioId)
      .order('created_at', { ascending: false })
      .limit(2000);
    if (saison) q = q.eq('saison', saison);
    if (clientId) q = q.eq('client_id', clientId);
    const { data, error } = await q;
    if (error) return { adhesions: [], migrationManquante: estAbsent(error) };
    return { adhesions: data || [], migrationManquante: false };
  } catch {
    return { adhesions: [], migrationManquante: false };
  }
}

/** Les adhérentes à jour à une date : Map client_id → adhésion. */
export async function adherentesAJourLe(client, studioId, dateIso) {
  const { adhesions, migrationManquante } = await chargerAdhesions(client, studioId);
  return { map: adherentesAJour(adhesions, dateIso), migrationManquante };
}

/**
 * Vendre une adhésion : le paiement (réglé ou à régler) puis l'adhésion qui
 * le porte. `supabase` = la session (RLS écrit le paiement et l'adhésion au
 * nom de la structure). Une seconde adhésion pour la même saison est refusée
 * par l'index unique (23505) : on le dit.
 */
export async function vendreAdhesion(supabase, { studioId, clientId, offre, brut, aujourdhui }) {
  const v = sanitizeVenteAdhesion(brut, aujourdhui);
  if (!v.ok) return { ok: false, code: 'INVALIDE', message: v.raison };
  const { vente } = v;
  const intitule = libelleAdhesion(offre?.nom, vente.saison);

  let paiementId = null;
  if (vente.montant > 0) {
    const { data: paiement, error: eP } = await supabase
      .from('paiements')
      .insert({
        profile_id: studioId,
        client_id: clientId,
        offre_id: offre?.id || null,
        intitule,
        type: 'adhesion',
        montant: vente.montant,
        statut: vente.paye ? 'paid' : 'pending',
        mode: vente.paye ? vente.mode : null,
        date: vente.date,
        date_encaissement: vente.paye ? vente.date : null,
      })
      .select('id')
      .single();
    if (eP) { await reportError('[adhesions] paiement', eP, { studioId }); return { ok: false, code: 'PAIEMENT', message: 'Le paiement n\'a pas pu être enregistré.' }; }
    paiementId = paiement.id;
  }

  const { data: adhesion, error } = await supabase
    .from('adhesions')
    .insert({
      profile_id: studioId,
      client_id: clientId,
      offre_id: offre?.id || null,
      offre_nom: offre?.nom || 'Adhésion',
      saison: vente.saison,
      date_debut: vente.date_debut,
      date_fin: vente.date_fin,
      montant: vente.montant,
      paiement_id: paiementId,
    })
    .select('*')
    .single();
  if (error) {
    if (paiementId) await supabase.from('paiements').delete().eq('id', paiementId).eq('profile_id', studioId);
    if (error.code === '23505') return { ok: false, code: 'DEJA_ADHERENTE', message: 'Cette personne a déjà une adhésion pour cette saison.' };
    return { ok: false, code: estAbsent(error) ? 'MIGRATION_V113_REQUISE' : 'INSERT', message: estAbsent(error) ? 'Les adhésions arrivent très bientôt : cette mise à jour n\'est pas encore appliquée.' : 'L\'adhésion n\'a pas pu être enregistrée.', migrationManquante: estAbsent(error) };
  }
  return { ok: true, adhesion, paiementId };
}

/** Les documents d'une structure (tous, la plus récente d'abord). */
export async function chargerDocuments(client, studioId) {
  try {
    const { data, error } = await client
      .from('documents_structure')
      .select('id, type, titre, url, date_document, assemblee_id, membre_id, created_at')
      .eq('profile_id', studioId)
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) return { documents: [], migrationManquante: estAbsent(error) };
    return { documents: data || [], migrationManquante: false };
  } catch {
    return { documents: [], migrationManquante: false };
  }
}

/** Les assemblées d'une structure, la plus récente d'abord. */
export async function chargerAssemblees(client, studioId) {
  try {
    const { data, error } = await client
      .from('assemblees')
      .select('id, type, titre, date, heure, lieu, ordre_du_jour, statut, convocation_envoyee_at, convoques, presentes, pouvoirs, pv_document_id, created_at')
      .eq('profile_id', studioId)
      .order('date', { ascending: false })
      .limit(100);
    if (error) return { assemblees: [], migrationManquante: estAbsent(error) };
    return { assemblees: data || [], migrationManquante: false };
  } catch {
    return { assemblees: [], migrationManquante: false };
  }
}
