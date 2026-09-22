// ============================================
// IziSolo — La facture qui part toute seule (v106, serveur)
// ============================================
//
// Retour Manon (Soleya), 2026-09-07 : « comment je fais pour que ça leur
// génère automatiquement une facture chaque début de mois ? »
//
// Un seul point d'entrée : `envoyerFactureAuto(admin, { profileId,
// paiementId })`, appelé APRÈS qu'un paiement est devenu réglé, par les trois
// chemins qui le font : la route Encaisser, la vente payée comptant (via
// /api/factures/auto, appelée par les deux tunnels) et le webhook Stripe
// élève. Toujours en fire-and-forget : l'encaissement est enregistré, un
// email raté ne doit jamais le faire douter.
//
// Ce que la fonction garantit :
//   • rien ne part si le réglage est à false, si le SIRET manque, si le
//     paiement n'est pas réglé ou si la fiche n'a pas d'email ;
//   • la facture est celle de v84 (RPC emettre_facture, même numéro, même
//     snapshot figé) : l'élève qui clique plus tard dans son espace obtient
//     LE MÊME document ;
//   • un seul email par paiement, quel que soit le nombre d'appels (claim
//     `emails_envoyes` type 'facture_auto', libéré si l'envoi échoue) ;
//   • le PDF est en pièce jointe : c'est ce qu'un CSE réclame, et l'élève n'a
//     pas à se connecter pour l'avoir.
//
// Lecture du réglage : requête SÉPARÉE et défensive (§12) — la colonne ne va
// jamais dans un select principal, et son absence = « pas d'automatisme ».
//
// v122 (2026-09-22) : l'EMAIL qui porte la facture part dans la langue de
// l'élève (sa fiche `clients.langue`, sinon le réglage du studio, sinon le
// français), lue par traducteurEleve (deux lectures défensives, jamais dans
// le select des fiches). Le PDF lui-même (lib/facture-pdf) ne change PAS :
// une facture est une pièce comptable française, on ne la traduit pas.

import { sendEmail } from './email.js';
import { reportError } from './report.js';
import { chargerFacturation, obtenirOuEmettreFacture, nomFichierFacture } from './factures-service.js';
import { genererFacturePdf } from './facture-pdf.js';
import { escapeHtml } from './utils.js';
import { traducteur } from './i18n-portail.js';
import { traducteurEleve } from './i18n-portail-serveur.js';

const COLONNE_ABSENTE = ['42703', 'PGRST204', 'PGRST205'];

/** Le réglage, lu seul. → { auto: boolean, migrationManquante: boolean } */
export async function lireFacturationAuto(client, profileId) {
  try {
    const { data, error } = await client
      .from('profiles')
      .select('facturation_auto')
      .eq('id', profileId)
      .maybeSingle();
    if (error) return { auto: false, migrationManquante: COLONNE_ABSENTE.includes(error.code) };
    return { auto: data?.facturation_auto === true, migrationManquante: false };
  } catch {
    return { auto: false, migrationManquante: false };
  }
}

/** Le réglage, écrit seul (route dédiée : jamais mêlé au payload des Paramètres). */
export async function poserFacturationAuto(client, profileId, valeur) {
  try {
    const { error } = await client
      .from('profiles')
      .update({ facturation_auto: valeur === true })
      .eq('id', profileId);
    if (error) return { ok: false, migrationManquante: COLONNE_ABSENTE.includes(error.code) };
    return { ok: true };
  } catch {
    return { ok: false, migrationManquante: false };
  }
}

/** « 12 € » / « 12,50 € » en français, « €12 » / « €12.50 » en anglais. */
function euros(n, langue = 'fr') {
  const v = Math.round((parseFloat(n) || 0) * 100) / 100;
  if (langue === 'en') return '€' + (Number.isInteger(v) ? String(v) : v.toFixed(2));
  return (Number.isInteger(v) ? String(v) : v.toFixed(2).replace('.', ',')) + ' €';
}

/** Le corps de l'email « ta facture ». PUR : testable sans envoi. */
export function renderEmailFacture({ prenom, studioNom, numero, montant, intitule, urlEspace, t = traducteur('fr') }) {
  const bonjour = prenom ? t('Bonjour {prenom}', { prenom: escapeHtml(prenom) }) : t('Bonjour');
  const studio = `<strong>${escapeHtml(studioNom)}</strong>`;
  const montantHtml = `<strong>${euros(montant, t.langue)}</strong>`;
  const enregistre = intitule
    ? t('Ton règlement de {montant} pour {intitule} est bien enregistré chez {studio}.', { montant: montantHtml, intitule: `<strong>${escapeHtml(intitule)}</strong>`, studio })
    : t('Ton règlement de {montant} est bien enregistré chez {studio}.', { montant: montantHtml, studio });
  return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#2b2320;line-height:1.55">
      <p>${bonjour},</p>
      <p>${enregistre}</p>
      <p>${t('Ta facture {numero} est en pièce jointe. Tu la retrouveras aussi à tout moment dans ton espace, rubrique « Mes paiements ».', { numero: `<strong>${escapeHtml(numero)}</strong>` })}</p>
      ${urlEspace ? `<p><a href="${escapeHtml(urlEspace)}" style="display:inline-block;background:#b87333;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:600">${t('Ouvrir mon espace')}</a></p>` : ''}
      <p style="color:#7a6a63;font-size:13px">${t('Une question sur cette facture ? Réponds simplement à cet email : il arrive directement chez {studio}.', { studio: escapeHtml(studioNom) })}</p>
    </div>`;
}

/**
 * Émet (ou re-sert) la facture du paiement et l'envoie à l'élève.
 * → { ok: true, envoye: true, numero }
 * → { ok: true, skipped: 'desactive' | 'sans_siret' | 'non_regle' | 'sans_email' | 'deja_envoye' | 'sans_fiche' | 'facture_impossible' | 'domaine_test' | 'blacklist' | … }
 * → { ok: false, error }
 * Ne jette jamais.
 */
export async function envoyerFactureAuto(admin, { profileId, paiementId, profile = null } = {}) {
  try {
    if (!profileId || !paiementId) return { ok: false, error: 'params' };

    const { auto } = await lireFacturationAuto(admin, profileId);
    if (!auto) return { ok: true, skipped: 'desactive' };

    const { active, facturation } = await chargerFacturation(admin, profileId);
    if (!active) return { ok: true, skipped: 'sans_siret' };

    const { data: paiement } = await admin
      .from('paiements')
      .select('id, intitule, montant, mode, date, date_encaissement, statut, client_id')
      .eq('id', paiementId)
      .eq('profile_id', profileId)
      .maybeSingle();
    if (!paiement) return { ok: true, skipped: 'introuvable' };
    if (paiement.statut !== 'paid') return { ok: true, skipped: 'non_regle' };
    if (!paiement.client_id) return { ok: true, skipped: 'sans_fiche' };

    const { data: client } = await admin
      .from('clients')
      .select('id, prenom, nom, email, adresse, adresse_postale, ville')
      .eq('id', paiement.client_id)
      .eq('profile_id', profileId)
      .maybeSingle();
    if (!client) return { ok: true, skipped: 'sans_fiche' };
    const dest = String(client.email || '').trim().toLowerCase();
    if (!dest.includes('@')) return { ok: true, skipped: 'sans_email' };

    // Le profil du studio (émetteur du snapshot). Fourni par la route quand
    // elle l'a déjà (auth.profile), relu sinon (webhook).
    let prof = profile;
    if (!prof) {
      const { data } = await admin.from('profiles').select('*').eq('id', profileId).maybeSingle();
      prof = data || null;
    }
    if (!prof) return { ok: true, skipped: 'sans_profil' };

    // Claim AVANT l'émission : deux appels concurrents (encaisser + tunnel,
    // double clic) ne fabriquent qu'un email. Fail-open si la table manque.
    const ref = `${profileId}:${paiementId}`;
    let claimed = true, persisted = false;
    try {
      const { data: claim, error: clErr } = await admin
        .from('emails_envoyes')
        .upsert({ type: 'facture_auto', destinataire: dest, ref }, { onConflict: 'type,destinataire,ref', ignoreDuplicates: true })
        .select('id');
      if (clErr) throw clErr;
      claimed = (claim || []).length > 0;
      persisted = true;
    } catch (err) {
      console.warn('[facture-auto] dédup indisponible :', err?.message);
    }
    if (!claimed) return { ok: true, skipped: 'deja_envoye' };

    const libererClaim = async () => {
      if (!persisted) return;
      await admin.from('emails_envoyes').delete().match({ type: 'facture_auto', destinataire: dest, ref }).then(() => {}, () => {});
    };

    const res = await obtenirOuEmettreFacture(admin, {
      profileId, clientId: client.id, profile: prof, facturation, client, paiement,
    });
    if (!res.facture) {
      await libererClaim();
      if (res.erreur) reportError('[facture-auto] émission refusée:', new Error(res.erreur), { paiementId });
      return { ok: true, skipped: 'facture_impossible' };
    }

    const pdfBytes = await genererFacturePdf({
      type: 'facture',
      numeroAffiche: res.facture.numero_affiche,
      dateEmission: res.facture.date_emission,
      snapshot: res.facture.snapshot,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.izisolo.fr';
    const urlEspace = prof.studio_slug ? `${appUrl}/p/${prof.studio_slug}/espace` : null;
    // v122 : la langue de l'élève (fiche > studio > français), lue à part.
    const t = await traducteurEleve(admin, { clientId: client.id, profileId });
    const studioNom = prof.studio_nom || t('ton studio');

    const envoi = await sendEmail({
      categorie: 'transactionnel',
      to: dest,
      subject: t('Ta facture {numero} · {studio}', { numero: res.facture.numero_affiche, studio: studioNom }),
      replyTo: prof.email_contact || undefined,
      html: renderEmailFacture({
        prenom: client.prenom, studioNom, numero: res.facture.numero_affiche,
        montant: paiement.montant, intitule: paiement.intitule, urlEspace, t,
      }),
      attachments: [{ filename: nomFichierFacture(res.facture), content: Buffer.from(pdfBytes) }],
    });

    if (!envoi.ok) {
      // Un skip (domaine de test, blacklist) n'est pas un échec : la facture
      // est émise, l'élève la trouve dans son espace. Le claim est libéré
      // pour qu'un vrai envoi reste possible si l'adresse change.
      await libererClaim();
      return envoi.skipped ? { ok: true, skipped: envoi.skipped, numero: res.facture.numero_affiche } : { ok: false, error: envoi.error };
    }
    return { ok: true, envoye: true, numero: res.facture.numero_affiche };
  } catch (err) {
    reportError('[facture-auto] err:', err, { paiementId });
    return { ok: false, error: err?.message || 'facture-auto' };
  }
}
