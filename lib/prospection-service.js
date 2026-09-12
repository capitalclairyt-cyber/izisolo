/**
 * Prospection à la main (v109) — ce qui ÉCRIT : Resend et la base.
 * Les règles sont dans lib/prospection.js ; ici on les applique.
 *
 * Tout passe par le client admin (service_role) : les deux tables n'ont
 * aucune policy, personne d'autre que l'admin ne doit lire des coordonnées
 * de tiers. Chaque fonction rend { ok, ... } ou { ok:false, code, message }
 * lisible par l'écran : un échec muet ici serait un email parti ou non parti
 * sans que Maude le sache.
 */
import { Resend } from 'resend';
import { estEmailDeTest } from './email-domaines';
import { isBlacklisted } from './email';
import {
  FROM, REPLY_TO, TIRAGE_MAX, MOTIFS_ECART,
  eligibleProspect, gabaritEmail, validerTexte, rendreEmail, heureParisAujourdhui,
} from './prospection';

/** PostgREST dit PGRST205 pour une table absente de son cache (leçon v97). */
export function migrationManquante(error) {
  return !!error && (error.code === 'PGRST205' || error.code === '42P01' || /schema cache|does not exist/i.test(error.message || ''));
}
const refus = (code, message, status = 400) => ({ ok: false, code, message, status });
const SANS_MIGRATION = refus('MIGRATION_V109_REQUISE', "La mise à jour v109 n'est pas encore appliquée : rien n'est enregistré.", 503);

const COLS_PROSPECT = 'id, nom, prenom, email, ville, site, specialite, source, notes, statut, motif_ecart, repondu_at, created_at, updated_at';
const COLS_EMAIL = 'id, prospect_id, objet, corps, relance, statut, programme_at, envoye_at, resend_id, created_at, updated_at';

/** Tire N profs « dans la pile », les passe « à rédiger » avec un brouillon chacune. */
export async function tirerProspects(admin, n) {
  const nb = Math.min(TIRAGE_MAX, Math.max(1, Number(n) || 5));
  // Tirage au hasard sans biais de position : on lit un lot large, on pioche.
  const { data: pile, error } = await admin.from('prospects').select(COLS_PROSPECT)
    .eq('statut', 'a_contacter').order('created_at').limit(400);
  if (error) return migrationManquante(error) ? SANS_MIGRATION : refus('LECTURE', error.message, 500);
  const pool = [...(pile || [])];
  const tires = [];
  while (tires.length < nb && pool.length) tires.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  const resultat = [];
  for (const p of tires) {
    const { data: maj, error: eMaj } = await admin.from('prospects')
      .update({ statut: 'en_cours', updated_at: new Date().toISOString() })
      .eq('id', p.id).eq('statut', 'a_contacter').select(COLS_PROSPECT);
    if (eMaj || !maj?.length) continue; // prise par un autre onglet entre-temps : on passe
    const g = gabaritEmail(maj[0]);
    const { data: brouillon, error: eB } = await admin.from('prospection_emails')
      .insert({ prospect_id: p.id, objet: g.objet, corps: g.corps }).select(COLS_EMAIL).single();
    if (eB) return refus('BROUILLON', eB.message, 500);
    resultat.push({ prospect: maj[0], email: brouillon });
  }
  return { ok: true, tires: resultat, restants: Math.max(0, (pile?.length || 0) - tires.length) };
}

/** Une prof trouvée à la main (site envoyé par Colin) : fiche + brouillon, dédup par adresse. */
export async function ajouterProspect(admin, champs) {
  const p = {
    nom: String(champs.nom || '').trim(),
    prenom: String(champs.prenom || '').trim() || null,
    email: String(champs.email || '').trim().toLowerCase(),
    ville: String(champs.ville || '').trim() || null,
    site: String(champs.site || '').trim() || null,
    specialite: String(champs.specialite || '').trim() || null,
    source: String(champs.source || 'site').trim(),
    notes: String(champs.notes || '').trim() || null,
  };
  const elig = eligibleProspect(p, { siteRequis: false });
  if (!elig.ok) return refus('INELIGIBLE', `On ne démarche pas cette adresse : ${elig.raison}.`);
  const { data: existante, error: eEx } = await admin.from('prospects').select(COLS_PROSPECT).ilike('email', p.email).maybeSingle();
  if (eEx) return migrationManquante(eEx) ? SANS_MIGRATION : refus('LECTURE', eEx.message, 500);
  if (existante) {
    if (existante.statut === 'ecartee') return refus('ECARTEE', `${existante.email} a été écartée (${MOTIFS_ECART[existante.motif_ecart] || existante.motif_ecart || 'sans motif'}).`, 409);
    if (existante.statut !== 'a_contacter') return refus('DEJA_LA', `${existante.email} est déjà dans le module (${existante.statut}).`, 409);
    const { data: maj } = await admin.from('prospects').update({ ...p, statut: 'en_cours', updated_at: new Date().toISOString() }).eq('id', existante.id).select(COLS_PROSPECT).single();
    const g = gabaritEmail(maj);
    const { data: brouillon } = await admin.from('prospection_emails').insert({ prospect_id: maj.id, objet: g.objet, corps: g.corps }).select(COLS_EMAIL).single();
    return { ok: true, prospect: maj, email: brouillon, reprise: true };
  }
  const { data: cree, error: eIns } = await admin.from('prospects').insert({ ...p, statut: 'en_cours' }).select(COLS_PROSPECT).single();
  if (eIns) return refus('INSERT', eIns.message, 500);
  const g = gabaritEmail(cree);
  const { data: brouillon, error: eB } = await admin.from('prospection_emails').insert({ prospect_id: cree.id, objet: g.objet, corps: g.corps }).select(COLS_EMAIL).single();
  if (eB) return refus('BROUILLON', eB.message, 500);
  return { ok: true, prospect: cree, email: brouillon, reprise: false };
}

async function chargerEmail(admin, emailId) {
  const { data: email, error } = await admin.from('prospection_emails').select(COLS_EMAIL).eq('id', emailId).maybeSingle();
  if (error) return { erreur: migrationManquante(error) ? SANS_MIGRATION : refus('LECTURE', error.message, 500) };
  if (!email) return { erreur: refus('INTROUVABLE', 'Email introuvable', 404) };
  const { data: prospect } = await admin.from('prospects').select(COLS_PROSPECT).eq('id', email.prospect_id).maybeSingle();
  if (!prospect) return { erreur: refus('INTROUVABLE', 'Prof introuvable', 404) };
  return { email, prospect };
}

/** Enregistre objet + corps d'un brouillon (validation faite à l'ENVOI, pour laisser écrire par étapes). */
export async function enregistrerTexte(admin, emailId, { objet, corps }) {
  const { email, erreur } = await chargerEmail(admin, emailId);
  if (erreur) return erreur;
  if (email.statut !== 'brouillon') return refus('PAS_BROUILLON', "Cet email n'est plus un brouillon.", 409);
  const { data, error } = await admin.from('prospection_emails')
    .update({ objet: String(objet || '').trim().slice(0, 160), corps: String(corps || '').trim().slice(0, 6000), updated_at: new Date().toISOString() })
    .eq('id', emailId).select(COLS_EMAIL).single();
  if (error) return refus('UPDATE', error.message, 500);
  return { ok: true, email: data };
}

/**
 * Envoie (ou programme à HH:MM Paris) un brouillon. Mêmes garde-fous que
 * lib/email.sendEmail, mais on parle à Resend directement : sendEmail ne
 * connaît ni scheduledAt ni l'id de retour qu'il faut garder pour annuler.
 */
export async function envoyerEmailProspection(admin, emailId, { a = null, maintenant = new Date() } = {}) {
  const { email, prospect, erreur } = await chargerEmail(admin, emailId);
  if (erreur) return erreur;
  if (email.statut !== 'brouillon') return refus('PAS_BROUILLON', 'Cet email est déjà parti ou programmé.', 409);
  if (prospect.statut === 'ecartee') return refus('ECARTEE', 'Cette prof a été écartée : on ne lui écrit pas.', 409);
  const validation = validerTexte(email);
  if (!validation.ok) return refus('TEXTE', validation.erreurs.join(' · '));
  if (estEmailDeTest(prospect.email)) return refus('DOMAINE_TEST', `${prospect.email} est un domaine de test (RFC 2606) : rien ne part.`);
  if (await isBlacklisted(prospect.email)) return refus('DESINSCRITE', `${prospect.email} s'est désinscrite : on ne lui écrit pas.`, 409);
  // Un seul email initial, une seule relance : jamais de troisième.
  const { count: dejaEnvoyes } = await admin.from('prospection_emails').select('id', { count: 'exact', head: true })
    .eq('prospect_id', prospect.id).in('statut', ['programme', 'envoye']);
  if ((dejaEnvoyes || 0) >= 2) return refus('TROISIEME', 'Deux emails sont déjà partis pour cette prof : jamais de troisième.', 409);
  if ((dejaEnvoyes || 0) === 1 && !email.relance) return refus('DOUBLON', 'Un premier email est déjà parti : celui-ci doit être une relance.', 409);

  let programme = null;
  if (a) {
    programme = heureParisAujourdhui(a, maintenant);
    if (!programme) return refus('HEURE', `Heure « ${a} » invalide (attendu HH:MM).`);
    if (programme.getTime() < maintenant.getTime() + 60_000) return refus('HEURE_PASSEE', `${a} est déjà passé : donne une heure à venir.`);
  }
  if (!process.env.RESEND_API_KEY) return refus('RESEND', 'RESEND_API_KEY manquante', 503);

  const rendu = rendreEmail({ to: prospect.email, source: prospect.source, objet: email.objet, corps: email.corps });
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from: FROM, to: prospect.email, subject: rendu.sujet, html: rendu.html, text: rendu.text, replyTo: REPLY_TO,
    headers: { 'List-Unsubscribe': `<${rendu.desinscription}>` },
    ...(programme ? { scheduledAt: programme.toISOString() } : {}),
  });
  if (error) return refus('RESEND', `Resend a refusé : ${error.message || JSON.stringify(error)}`, 502);

  const now = maintenant.toISOString();
  const { data: maj, error: eMaj } = await admin.from('prospection_emails').update({
    statut: programme ? 'programme' : 'envoye',
    programme_at: programme ? programme.toISOString() : null,
    envoye_at: programme ? null : now,
    resend_id: data?.id || null,
    updated_at: now,
  }).eq('id', emailId).select(COLS_EMAIL).single();
  if (eMaj) return refus('UPDATE', `Email parti chez Resend (${data?.id}) mais statut non enregistré : ${eMaj.message}`, 500);
  await admin.from('prospects').update({ statut: 'contactee', updated_at: now }).eq('id', prospect.id);
  return { ok: true, email: maj, programme: !!programme };
}

/** Annule un envoi programmé chez Resend et rend l'email au brouillon. */
export async function annulerProgramme(admin, emailId) {
  const { email, prospect, erreur } = await chargerEmail(admin, emailId);
  if (erreur) return erreur;
  if (email.statut !== 'programme') return refus('PAS_PROGRAMME', "Cet email n'est pas programmé.", 409);
  // Annuler exige une clé Resend à accès COMPLET : la clé d'envoi du projet est
  // restreinte à l'envoi seul (bonne posture, trouvée par la preuve du
  // 2026-09-12). D'où RESEND_API_KEY_GESTION, dédiée à ce seul geste.
  const cle = process.env.RESEND_API_KEY_GESTION || process.env.RESEND_API_KEY;
  if (!cle) return refus('RESEND', 'RESEND_API_KEY manquante', 503);
  if (email.resend_id) {
    const resend = new Resend(cle);
    const { error } = await resend.emails.cancel(email.resend_id);
    // Déjà parti, inconnu, ou clé d'envoi seul : Resend refuse. On ne ment
    // pas, l'email reste « programmé » et partira à l'heure dite.
    if (error) {
      const restreinte = /restricted/i.test(error.message || '');
      return refus(restreinte ? 'RESEND_CLE_RESTREINTE' : 'RESEND',
        restreinte
          ? "Resend refuse l'annulation : la clé du projet n'autorise que l'envoi. Ajoute une clé à accès complet dans RESEND_API_KEY_GESTION (Vercel), sinon l'email partira à l'heure prévue."
          : `Resend n'a pas pu annuler : ${error.message || JSON.stringify(error)}`, 502);
    }
  }
  const now = new Date().toISOString();
  const { data: maj, error: eMaj } = await admin.from('prospection_emails')
    .update({ statut: 'brouillon', programme_at: null, resend_id: null, updated_at: now })
    .eq('id', emailId).select(COLS_EMAIL).single();
  if (eMaj) return refus('UPDATE', eMaj.message, 500);
  // Sans autre email parti, la prof redevient « à rédiger ».
  const { count } = await admin.from('prospection_emails').select('id', { count: 'exact', head: true })
    .eq('prospect_id', prospect.id).in('statut', ['programme', 'envoye']);
  if (!count) await admin.from('prospects').update({ statut: 'en_cours', updated_at: now }).eq('id', prospect.id);
  return { ok: true, email: maj };
}

/** Un email programmé dont l'heure est passée est parti : on le marque envoyé à la lecture. */
export async function reconcilierProgrammes(admin, maintenant = new Date()) {
  const now = maintenant.toISOString();
  const { data, error } = await admin.from('prospection_emails')
    .update({ statut: 'envoye', envoye_at: now, updated_at: now })
    .eq('statut', 'programme').lt('programme_at', now).select('id');
  if (error) return 0;
  return data?.length || 0;
}

/** Marque la prof « a répondu » (ou l'inverse). */
export async function marquerReponse(admin, prospectId, repondu = true) {
  const now = new Date().toISOString();
  const { data, error } = await admin.from('prospects')
    .update(repondu ? { statut: 'repondu', repondu_at: now, updated_at: now } : { statut: 'contactee', repondu_at: null, updated_at: now })
    .eq('id', prospectId).select(COLS_PROSPECT);
  if (error) return migrationManquante(error) ? SANS_MIGRATION : refus('UPDATE', error.message, 500);
  if (!data?.length) return refus('INTROUVABLE', 'Prof introuvable', 404);
  return { ok: true, prospect: data[0] };
}

/** Écarte une prof, avec un motif de la liste. Ses brouillons sont supprimés, ses envois gardés. */
export async function ecarterProspect(admin, prospectId, motif) {
  if (!MOTIFS_ECART[motif]) return refus('MOTIF', 'Motif inconnu');
  const now = new Date().toISOString();
  const { data, error } = await admin.from('prospects')
    .update({ statut: 'ecartee', motif_ecart: motif, updated_at: now })
    .eq('id', prospectId).select(COLS_PROSPECT);
  if (error) return migrationManquante(error) ? SANS_MIGRATION : refus('UPDATE', error.message, 500);
  if (!data?.length) return refus('INTROUVABLE', 'Prof introuvable', 404);
  await admin.from('prospection_emails').delete().eq('prospect_id', prospectId).eq('statut', 'brouillon');
  return { ok: true, prospect: data[0] };
}

/** Remet une prof « à rédiger » dans la pile (brouillon jeté), sans rien envoyer. */
export async function remettreDansLaPile(admin, prospectId) {
  const now = new Date().toISOString();
  const { data, error } = await admin.from('prospects')
    .update({ statut: 'a_contacter', updated_at: now })
    .eq('id', prospectId).eq('statut', 'en_cours').select(COLS_PROSPECT);
  if (error) return migrationManquante(error) ? SANS_MIGRATION : refus('UPDATE', error.message, 500);
  if (!data?.length) return refus('PAS_EN_COURS', "Seule une prof « à rédiger » retourne dans la pile.", 409);
  await admin.from('prospection_emails').delete().eq('prospect_id', prospectId).eq('statut', 'brouillon');
  return { ok: true, prospect: data[0] };
}

/** Prépare la relance (un brouillon `relance`) d'une prof contactée sans réponse. */
export async function preparerRelance(admin, prospectId) {
  const { data: prospect, error } = await admin.from('prospects').select(COLS_PROSPECT).eq('id', prospectId).maybeSingle();
  if (error) return migrationManquante(error) ? SANS_MIGRATION : refus('LECTURE', error.message, 500);
  if (!prospect) return refus('INTROUVABLE', 'Prof introuvable', 404);
  if (prospect.statut !== 'contactee') return refus('PAS_CONTACTEE', 'Une relance ne se prépare que pour une prof contactée sans réponse.', 409);
  const { data: emails } = await admin.from('prospection_emails').select(COLS_EMAIL).eq('prospect_id', prospectId).order('created_at');
  if ((emails || []).some((e) => e.relance)) return refus('DEJA_RELANCEE', 'Une relance existe déjà : jamais de troisième email.', 409);
  const g = gabaritEmail(prospect, { relance: true });
  const { data: brouillon, error: eB } = await admin.from('prospection_emails')
    .insert({ prospect_id: prospectId, objet: g.objet, corps: g.corps, relance: true }).select(COLS_EMAIL).single();
  if (eB) return refus('BROUILLON', eB.message, 500);
  return { ok: true, email: brouillon };
}
