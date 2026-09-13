// ============================================================================
// IziSolo — Le relevé mensuel d'une intervenante : chargement (v112, lot 2
// Associations & Studios). SERVEUR : prend le client en paramètre (session
// RLS pour la structure, service_role pour le lien d'intervenante).
// ----------------------------------------------------------------------------
// Rien n'est stocké : le relevé se recalcule à la lecture depuis `cours`
// (intervenant_id, v103), `presences` (pointage), `paiements` (séances payées
// à l'unité, prix des carnets) et `abonnements` (nombre de séances). Le CALCUL
// vit dans lib/remuneration.js (pur) ; ici on ne fait que rassembler.
//
// Lectures SÉPARÉES et défensives (§12) : `remuneration` naît avec v112 et ne
// va jamais dans un select principal ; sans elle, le relevé compte les
// séances sans montant dû.
// ============================================================================

import { bornesMois, calculerReleve, sanitizeRemuneration, REGEX_MOIS } from './remuneration.js';

const ABSENT = ['PGRST204', 'PGRST205', '42703', '42P01'];
export const estAbsent = (e) => !!e && ABSENT.includes(e.code);

/** La rémunération convenue d'un membre, lue seule. */
export async function lireRemuneration(client, membreId) {
  try {
    const { data, error } = await client
      .from('studio_membres')
      .select('remuneration')
      .eq('id', membreId)
      .maybeSingle();
    if (error) return { remuneration: null, migrationManquante: estAbsent(error) };
    return { remuneration: sanitizeRemuneration(data?.remuneration), migrationManquante: false };
  } catch {
    return { remuneration: null, migrationManquante: false };
  }
}

/** Pose (ou retire, null) la rémunération d'un membre. UPDATE séparé. */
export async function poserRemuneration(client, membreId, remuneration) {
  try {
    const { error } = await client
      .from('studio_membres')
      .update({ remuneration: remuneration ? sanitizeRemuneration(remuneration) : null })
      .eq('id', membreId);
    if (error) return { ok: false, migrationManquante: estAbsent(error) };
    return { ok: true };
  } catch {
    return { ok: false, migrationManquante: false };
  }
}

/**
 * Le relevé d'un membre pour un mois.
 * @param client    client Supabase (RLS ou admin)
 * @param studioId  la structure
 * @param membreId  la ligne d'équipe de l'intervenante
 * @param mois      'AAAA-MM'
 * @param aujourdhui 'AAAA-MM-JJ' (Paris) : seules les séances PASSÉES comptent
 * @returns {{ ok:true, releve, mois } | { ok:false, code }}
 */
export async function chargerReleve(client, { studioId, membreId, mois, aujourdhui = null }) {
  if (!REGEX_MOIS.test(String(mois || ''))) return { ok: false, code: 'MOIS_INVALIDE' };
  const bornes = bornesMois(mois);
  const today = aujourdhui || new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
  const fin = bornes.to < today ? bornes.to : today;

  // Les séances de l'intervenante sur le mois, passées, non annulées, avec
  // leurs présences. `intervenant_id` est v103 : si la colonne manque, il n'y
  // a pas de relevé possible, et on le dit.
  const { data: cours, error } = await client
    .from('cours')
    .select('id, nom, date, heure, duree_minutes, est_annule, intervenant_id, presences(id, statut_pointage, pointee, annulation_tardive, abonnement_id)')
    .eq('profile_id', studioId)
    .eq('intervenant_id', membreId)
    .gte('date', bornes.from)
    .lte('date', fin)
    .order('date').order('heure')
    .limit(500);
  if (error) return { ok: false, code: estAbsent(error) ? 'MIGRATION_V103_REQUISE' : 'LECTURE' };

  const seances = (cours || []).filter(c => !c.est_annule);
  const presenceIds = seances.flatMap(c => (c.presences || []).map(p => p.id));
  const aboIds = [...new Set(seances.flatMap(c => (c.presences || []).map(p => p.abonnement_id).filter(Boolean)))];

  // Les séances payées à l'unité : un paiement réglé rattaché à la présence.
  const montantParPresence = new Map();
  for (let i = 0; i < presenceIds.length; i += 200) {
    const { data: lot } = await client
      .from('paiements')
      .select('presence_id, montant, statut')
      .eq('profile_id', studioId)
      .in('presence_id', presenceIds.slice(i, i + 200));
    for (const p of (lot || [])) {
      if (p.statut === 'paid' && p.presence_id) montantParPresence.set(p.presence_id, (montantParPresence.get(p.presence_id) || 0) + (Number(p.montant) || 0));
    }
  }

  // Le prix d'un carnet = ce qui a été réglé pour lui ; ses séances = le
  // total vendu. Un abonnement illimité n'a pas de prix par séance : le
  // relevé le compte comme « CA inconnu », jamais deviné.
  const abonnements = new Map();
  if (aboIds.length) {
    const [{ data: abos }, { data: paies }] = await Promise.all([
      client.from('abonnements').select('id, seances_total').in('id', aboIds),
      client.from('paiements').select('abonnement_id, montant, statut').eq('profile_id', studioId).in('abonnement_id', aboIds),
    ]);
    const prix = new Map();
    for (const p of (paies || [])) {
      if (p.statut === 'paid') prix.set(p.abonnement_id, (prix.get(p.abonnement_id) || 0) + (Number(p.montant) || 0));
    }
    for (const a of (abos || [])) abonnements.set(a.id, { seances_total: a.seances_total, prix: prix.get(a.id) || 0 });
  }

  const { remuneration } = await lireRemuneration(client, membreId);
  const enrichies = seances.map(c => ({
    ...c,
    presences: (c.presences || []).map(p => ({ ...p, paiement_montant: montantParPresence.get(p.id) || 0 })),
  }));
  return { ok: true, mois, releve: calculerReleve(enrichies, abonnements, remuneration) };
}
