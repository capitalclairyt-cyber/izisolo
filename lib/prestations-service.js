// ============================================================================
// IziSolo — Les prestations, côté serveur (v112, lot 2 Associations &
// Studios, PLAN §6.5). Le client `admin` (service_role) est passé en
// paramètre : chaque route a vérifié AVANT qui appelle et pour quel studio.
// ----------------------------------------------------------------------------
// Trois gestes, un par côté de la boucle :
//   validerReleve      la STRUCTURE fige le relevé du mois → prestation
//                      « emise » + dépense « à régler » rattachée + email à
//                      l'intervenante (PDF joint).
//   facturerPrestation l'INTERVENANTE (son compte, son SIRET) émet sa facture
//                      v2 non acquittée dans SA séquence → email à la
//                      structure (PDF joint).
//   reglerPrestation   la STRUCTURE règle → RPC atomique : dépense réglée,
//                      prestation réglée, paiement encaissé chez elle,
//                      facture payée.
// Tout est DÉFENSIF : sans v112 (table absente), { migrationManquante }.
// ============================================================================

import { sendEmail } from './email.js';
import { reportError } from './report.js';
import { chargerFacturation } from './factures-service.js';
import { genererFacturePdf } from './facture-pdf.js';
import { genererRelevePdf } from './releve-pdf.js';
import { chargerReleve, estAbsent } from './releve-service.js';
import { labelIntervenante } from './intervenante.js';
import {
  construireSnapshotPrestation, emailRelevePret, emailFacturePrestation, libellePrestation,
} from './prestations.js';
import { moisCourant } from './remuneration.js';

const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL || 'https://www.izisolo.fr';

/** Un mois se valide quand il est FINI (ou le mois courant, pour un départ). */
export function moisValidable(mois, maintenant = new Date()) {
  return String(mois || '') <= moisCourant(maintenant);
}

/**
 * La structure valide le relevé d'un membre pour un mois.
 * @returns {{ ok:true, prestation, depense } | { ok:false, code, message, migrationManquante? }}
 */
export async function validerReleve(admin, { studioId, membreId, mois, montantOverride = null }) {
  if (!moisValidable(mois)) return { ok: false, code: 'MOIS_FUTUR', message: 'On ne valide pas un mois qui n\'a pas commencé.' };
  const { data: membre } = await admin.from('studio_membres').select('*').eq('id', membreId).eq('profile_id', studioId).maybeSingle();
  if (!membre) return { ok: false, code: 'MEMBRE_INTROUVABLE', message: 'Cette personne ne fait pas partie de l\'équipe.' };
  if (membre.role === 'proprietaire') return { ok: false, code: 'PROPRIETAIRE', message: 'La propriétaire ne se rémunère pas par un relevé : c\'est son propre argent.' };

  const r = await chargerReleve(admin, { studioId, membreId, mois });
  if (!r.ok) return { ok: false, code: r.code, message: r.code === 'MIGRATION_V103_REQUISE' ? 'Les intervenantes par séance ne sont pas encore actives (mise à jour en cours).' : 'Relevé illisible.' };
  const releve = r.releve;
  const montant = montantOverride != null ? Math.round(Number(montantOverride) * 100) / 100 : (releve.montant_du ?? 0);
  if (!Number.isFinite(montant) || montant < 0) return { ok: false, code: 'MONTANT', message: 'Le montant est invalide.' };
  if (releve.nb_seances === 0 && montant === 0) return { ok: false, code: 'VIDE', message: 'Aucune séance donnée sur ce mois : rien à valider.' };

  const { data: profile } = await admin.from('profiles').select('id, studio_nom, studio_slug, email_contact').eq('id', studioId).maybeSingle();

  // La prestation d'abord (une par membre et par mois : l'index unique
  // refuse un doublon en 23505, on le dit).
  const { data: prestation, error: eP } = await admin
    .from('prestations')
    .insert({ profile_id: studioId, membre_id: membreId, periode: mois, montant, releve: { ...releve, montant_du: montant }, statut: 'emise' })
    .select('*')
    .single();
  if (eP) {
    if (eP.code === '23505') return { ok: false, code: 'DEJA_VALIDE', message: 'Ce mois est déjà validé pour cette intervenante.' };
    return { ok: false, code: estAbsent(eP) ? 'MIGRATION_V112_REQUISE' : 'INSERT', message: estAbsent(eP) ? 'Les relevés arrivent très bientôt : cette mise à jour n\'est pas encore appliquée.' : 'Le relevé n\'a pas pu être enregistré.', migrationManquante: estAbsent(eP) };
  }

  // Puis sa dépense « à régler », rattachée à l'intervenante.
  const { data: depense, error: eD } = await admin
    .from('depenses')
    .insert({
      profile_id: studioId,
      date: `${mois}-01`,
      categorie: 'intervenante',
      libelle: libellePrestation(labelIntervenante(membre), mois).replace('Prestation · ', 'Séances de '),
      montant_ttc: montant,
      statut: montant > 0 ? 'a_regler' : 'reglee',
      date_reglement: montant > 0 ? null : `${mois}-01`,
      membre_id: membreId,
      prestation_id: prestation.id,
    })
    .select('*')
    .single();
  if (eD) await reportError('[prestations] dépense non créée', eD, { prestationId: prestation.id });
  else await admin.from('prestations').update({ depense_id: depense.id }).eq('id', prestation.id);

  // L'intervenante le sait (PDF joint). Fire-and-forget.
  const dest = String(membre.email || '').trim().toLowerCase();
  if (dest.includes('@')) {
    (async () => {
      try {
        const pdf = await genererRelevePdf({ structureNom: profile?.studio_nom, intervenanteNom: labelIntervenante(membre), mois, releve: { ...releve, montant_du: montant }, statut: 'valide' });
        const { subject, html } = emailRelevePret({
          prenom: membre.prenom, nomStructure: profile?.studio_nom || 'la structure', periode: mois, montant,
          aUnCompte: !!membre.auth_user_id, lien: membre.auth_user_id ? `${APP_URL()}/revenus` : null,
        });
        await sendEmail({ to: dest, subject, html, categorie: 'transactionnel', replyTo: profile?.email_contact || undefined, attachments: [{ filename: `releve-${mois}.pdf`, content: Buffer.from(pdf) }] });
      } catch (e) { reportError('[prestations] email relevé', e, { prestationId: prestation.id }); }
    })();
  }

  return { ok: true, prestation: { ...prestation, depense_id: depense?.id || null }, depense: depense || null };
}

/** La structure retire un relevé validé (non facturé, non réglé). */
export async function annulerPrestation(admin, { studioId, prestationId }) {
  const { data: p } = await admin.from('prestations').select('*').eq('id', prestationId).eq('profile_id', studioId).maybeSingle();
  if (!p) return { ok: false, code: 'INTROUVABLE' };
  if (p.statut !== 'emise') return { ok: false, code: 'TROP_TARD', message: 'Une prestation facturée ou réglée ne se retire plus.' };
  await admin.from('prestations').update({ statut: 'annulee', annulee_at: new Date().toISOString() }).eq('id', p.id);
  if (p.depense_id) await admin.from('depenses').delete().eq('id', p.depense_id).eq('profile_id', studioId).eq('statut', 'a_regler');
  return { ok: true };
}

/**
 * L'intervenante facture : la prestation doit être la sienne (sa ligne
 * d'équipe porte son compte), son studio est SON compte (§6.1), et sa
 * facturation doit être configurée (SIRET). Émet la facture v2 par la RPC,
 * rend le PDF, prévient la structure.
 */
export async function facturerPrestation(admin, { prestationId, userId, request }) {
  const { data: p, error } = await admin.from('prestations').select('*').eq('id', prestationId).maybeSingle();
  if (error) return { ok: false, code: estAbsent(error) ? 'MIGRATION_V112_REQUISE' : 'LECTURE' };
  if (!p) return { ok: false, code: 'INTROUVABLE' };
  const { data: membre } = await admin.from('studio_membres').select('*').eq('id', p.membre_id).maybeSingle();
  if (!membre || membre.auth_user_id !== userId) return { ok: false, code: 'PAS_LA_TIENNE' };
  if (p.statut !== 'emise') return { ok: false, code: p.statut === 'facturee' ? 'DEJA_FACTUREE' : 'STATUT' };

  const { active, facturation } = await chargerFacturation(admin, userId);
  if (!active) return { ok: false, code: 'SANS_SIRET' };
  const [{ data: profile }, { data: structure }] = await Promise.all([
    admin.from('profiles').select('*').eq('id', userId).maybeSingle(),
    admin.from('profiles').select('id, studio_nom, email_contact, adresse, code_postal, ville, rna, facturation_siret').eq('id', p.profile_id).maybeSingle(),
  ]);
  const snapshot = construireSnapshotPrestation({ profile, facturation, structure, prestation: p });
  // SON studio est son compte (§6.1) : ce n'est PAS le studio affiché.
  const sonStudioId = userId;
  const { data: res, error: eRpc } = await admin.rpc('emettre_facture_prestation', { p_profile_id: sonStudioId, p_prestation_id: p.id, p_snapshot: snapshot });
  if (eRpc) return { ok: false, code: estAbsent(eRpc) || eRpc.code === '42883' || eRpc.code === 'PGRST202' ? 'MIGRATION_V112_REQUISE' : 'RPC' };
  if (!res?.ok) return { ok: false, code: res?.reason === 'deja_facturee' ? 'DEJA_FACTUREE' : 'RPC' };

  const facture = { id: res.facture_id, numero_affiche: res.numero_affiche, date_emission: res.date_emission, snapshot };
  const pdf = await genererFacturePdf({ type: 'facture', numeroAffiche: facture.numero_affiche, dateEmission: facture.date_emission, snapshot });

  // La structure reçoit la facture : à son adresse de contact, sinon à
  // l'email de son compte.
  let dest = String(structure?.email_contact || '').trim().toLowerCase();
  if (!dest.includes('@')) {
    try { const { data: u } = await admin.auth.admin.getUserById(p.profile_id); dest = String(u?.user?.email || '').toLowerCase(); } catch { /* sans email : la facture reste téléchargeable */ }
  }
  if (dest.includes('@')) {
    const origine = request ? new URL(request.url).origin : APP_URL();
    const { subject, html } = emailFacturePrestation({
      nomIntervenante: snapshot.emetteur.nom, nomStructure: structure?.studio_nom || 'votre structure', periode: p.periode,
      montant: p.montant, numero: facture.numero_affiche, lien: `${origine}/compta?onglet=prestations`,
    });
    sendEmail({ to: dest, subject, html, categorie: 'transactionnel', replyTo: profile?.email_contact || undefined, attachments: [{ filename: `facture-${facture.numero_affiche.toLowerCase()}.pdf`, content: Buffer.from(pdf) }] })
      .catch(e => reportError('[prestations] email facture', e, { prestationId }));
  }
  return { ok: true, facture, pdf };
}

/** La structure règle une prestation (RPC atomique). */
export async function reglerPrestation(admin, { studioId, prestationId, date, mode }) {
  const { data: res, error } = await admin.rpc('regler_prestation', { p_profile_id: studioId, p_prestation_id: prestationId, p_date: date, p_mode: mode });
  if (error) return { ok: false, code: estAbsent(error) || error.code === '42883' || error.code === 'PGRST202' ? 'MIGRATION_V112_REQUISE' : 'RPC', message: error.message };
  if (!res?.ok) return { ok: false, code: String(res?.reason || 'RPC').toUpperCase() };
  return { ok: true, paiementId: res.paiement_id || null };
}

/** Les prestations d'une PERSONNE (toutes ses lignes d'équipe), pour « Mes prestations ». */
export async function chargerPrestationsIntervenante(admin, userId) {
  const { data: lignes, error: eM } = await admin.from('studio_membres').select('id, profile_id').eq('auth_user_id', userId).neq('role', 'proprietaire');
  if (eM || !(lignes || []).length) return { prestations: [], migrationManquante: false };
  const { data, error } = await admin
    .from('prestations')
    .select('id, profile_id, membre_id, periode, montant, releve, statut, facture_id, paiement_id, created_at, facturee_at, reglee_at')
    .in('membre_id', lignes.map(l => l.id))
    .neq('statut', 'annulee')
    .order('periode', { ascending: false })
    .limit(60);
  if (error) return { prestations: [], migrationManquante: estAbsent(error) };
  const ids = [...new Set((data || []).map(p => p.profile_id))];
  const [{ data: structures }, { data: factures }] = await Promise.all([
    ids.length ? admin.from('profiles').select('id, studio_nom').in('id', ids) : { data: [] },
    (data || []).some(p => p.facture_id) ? admin.from('factures').select('id, numero_affiche, statut').in('id', (data || []).map(p => p.facture_id).filter(Boolean)) : { data: [] },
  ]);
  const noms = Object.fromEntries((structures || []).map(s => [s.id, s]));
  const nums = Object.fromEntries((factures || []).map(f => [f.id, f.numero_affiche]));
  return { prestations: (data || []).map(p => ({ ...p, structure: noms[p.profile_id] || null, facture_numero: nums[p.facture_id] || null })), migrationManquante: false };
}

/** Les prestations d'une STRUCTURE (toutes ses intervenantes). */
export async function chargerPrestationsStructure(client, studioId) {
  const { data, error } = await client
    .from('prestations')
    .select('id, profile_id, membre_id, periode, montant, releve, statut, depense_id, facture_id, created_at, facturee_at, reglee_at')
    .eq('profile_id', studioId)
    .neq('statut', 'annulee')
    .order('periode', { ascending: false })
    .limit(200);
  if (error) return { prestations: [], migrationManquante: estAbsent(error) };
  const fIds = (data || []).map(p => p.facture_id).filter(Boolean);
  let nums = {};
  if (fIds.length) {
    // Les factures sont chez l'intervenante : lecture en service_role par la
    // route, seul le NUMÉRO en sort.
    const { createAdminClient } = await import('./supabase-admin.js');
    const { data: factures } = await createAdminClient().from('factures').select('id, numero_affiche').in('id', fIds);
    nums = Object.fromEntries((factures || []).map(f => [f.id, f.numero_affiche]));
  }
  return { prestations: (data || []).map(p => ({ ...p, facture_numero: nums[p.facture_id] || null })), migrationManquante: false };
}
