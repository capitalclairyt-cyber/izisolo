/**
 * lib/reglement — règlement par virement (RIB) et email « comment régler ».
 *
 * Demande Colin 2026-08-23, dans la foulée de la demande d'offre (v97) : une
 * vente « à régler plus tard » doit pouvoir dire à l'élève COMMENT régler,
 * sans que la prof recopie son RIB dans WhatsApp. Trois variantes d'email,
 * choisies à la vente (ou automatiques selon le réglage) : virement (RIB +
 * référence + QR SEPA côté espace), espèces au studio, chèque au studio.
 *
 * SOURCE UNIQUE pour : la validation IBAN (mod-97), la config
 * `profiles.reglement_config` (v98 — un JSONB se lit par SON helper, §12),
 * la référence de virement, le payload du QR SEPA (standard EPC069-12) et
 * le rendu des emails. Module sans dépendance serveur (sa seule importation
 * est lib/i18n-portail, PUR lui aussi) : importable par les specs Node pures
 * (verrou CI tests/e2e/reglement.spec.js).
 *
 * v122 (2026-09-22) : `emailReglement` accepte un `t` (le traducteur de la
 * langue de l'élève, lib/i18n-portail) ; sans lui, l'identité française, et
 * le rendu français ne change pas d'un caractère. Le nom du studio, le
 * prénom, l'intitulé, l'IBAN et la référence viennent de la base : jamais
 * traduits.
 */
import { interpoler, localeDe } from './i18n-portail.js';

export const EMAIL_MODES = ['auto', 'choix', 'jamais'];
export const VARIANTES_EMAIL = ['virement', 'especes', 'cheque'];

const texte = (v, max) => {
  const s = String(v ?? '').replace(/[\r\n]+/g, ' ').trim();
  if (!s) return null;
  return s.length > max ? s.slice(0, max) : s;
};

// mod 97 incrémental sur une chaîne de chiffres (pas de BigInt : le calcul
// doit tourner tel quel côté navigateur ET dans les specs Node).
function mod97(chiffres) {
  let reste = 0;
  for (let i = 0; i < chiffres.length; i += 7) {
    reste = parseInt(String(reste) + chiffres.slice(i, i + 7), 10) % 97;
  }
  return reste;
}

// Longueurs exactes des pays qu'on croise vraiment (FR d'abord). Les autres
// pays passent par la règle générique 15-34 + mod-97.
const LONGUEURS_IBAN = { FR: 27, MC: 27, DE: 22, BE: 16, ES: 24, IT: 27, PT: 25, LU: 20, CH: 21, NL: 18 };

/**
 * Valide un IBAN (format + longueur pays + mod-97).
 * @returns {{ok: boolean, iban?: string, erreur?: string}} iban = nettoyé (sans espaces, majuscules)
 */
export function validerIban(brut) {
  const iban = String(brut || '').replace(/\s+/g, '').toUpperCase();
  if (!iban) return { ok: false, erreur: 'IBAN vide.' };
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(iban)) {
    return { ok: false, erreur: 'Format invalide : 2 lettres, 2 chiffres, puis 11 à 30 caractères.' };
  }
  const attendu = LONGUEURS_IBAN[iban.slice(0, 2)];
  if (attendu && iban.length !== attendu) {
    return { ok: false, erreur: `Un IBAN ${iban.slice(0, 2)} fait ${attendu} caractères (celui-ci en a ${iban.length}).` };
  }
  const rearrange = iban.slice(4) + iban.slice(0, 4);
  const chiffres = rearrange.replace(/[A-Z]/g, c => String(c.charCodeAt(0) - 55));
  if (mod97(chiffres) !== 1) {
    return { ok: false, erreur: 'Cet IBAN ne passe pas la vérification : une faute de frappe quelque part ?' };
  }
  return { ok: true, iban };
}

/** IBAN par blocs de 4, pour les yeux humains. */
export function formatIban(iban) {
  const clean = String(iban || '').replace(/\s+/g, '').toUpperCase();
  return clean.replace(/(.{4})/g, '$1 ').trim();
}

/**
 * Référence de virement STABLE PAR ÉLÈVE (dérivée de sa fiche) : la prof
 * reconnaît l'élève sur son relevé bancaire d'un coup d'œil, quel que soit
 * le nombre d'échéances. C'est le détail qui rend le rapprochement possible :
 * sans référence, un relevé dit « VIREMENT 45,00 € » et rien d'autre.
 */
export function referenceVirement(clientId) {
  const hex = String(clientId || '').replace(/-/g, '');
  if (!hex) return null;
  return 'IZI-' + hex.slice(0, 6).toUpperCase();
}

/**
 * Nettoie `profiles.reglement_config` (v98). LE seul lecteur du JSONB (§12).
 * Un RIB dont l'IBAN ne passe pas mod-97 est JETÉ (on n'envoie jamais un
 * IBAN faux à une élève). Tout vide → null (la colonne reste NULL).
 */
export function sanitizeReglementConfig(brut) {
  if (!brut || typeof brut !== 'object') return null;

  let rib = null;
  if (brut.rib && typeof brut.rib === 'object') {
    const v = validerIban(brut.rib.iban);
    const titulaire = texte(brut.rib.titulaire, 70);
    if (v.ok && titulaire) {
      const bicBrut = String(brut.rib.bic || '').replace(/\s+/g, '').toUpperCase();
      rib = {
        titulaire,
        iban: v.iban,
        bic: /^[A-Z0-9]{8}([A-Z0-9]{3})?$/.test(bicBrut) ? bicBrut : null,
      };
    }
  }

  const modeFourni = EMAIL_MODES.includes(brut.email_mode);
  const defautFourni = VARIANTES_EMAIL.includes(brut.email_defaut);
  if (!rib && !modeFourni && !defautFourni) return null;

  return {
    ...(rib ? { rib } : {}),
    email_mode: modeFourni ? brut.email_mode : 'choix',
    email_defaut: defautFourni ? brut.email_defaut : 'virement',
  };
}

/** Lecture unique de la config depuis un profil (défensive). */
export function lireReglementConfig(profile) {
  return sanitizeReglementConfig(profile?.reglement_config);
}

/**
 * Ce que le tunnel de vente présélectionne pour l'email « comment régler »
 * (réglage Colin 2026-08-23 : auto = part tout seul avec le moyen par défaut,
 * choix = la prof choisit à chaque vente, jamais = le bloc n'apparaît pas).
 * En auto avec défaut « virement » mais SANS RIB : aucune présélection, on ne
 * présume pas d'un moyen à la place de la prof (leçon Kim, les défauts qui
 * écrivent ce que personne n'a demandé).
 */
export function preselectionEmail(config) {
  const c = config || {};
  const mode = EMAIL_MODES.includes(c.email_mode) ? c.email_mode : 'choix';
  if (mode === 'jamais') return { actif: false, presel: null };
  if (mode === 'auto') {
    const defaut = VARIANTES_EMAIL.includes(c.email_defaut) ? c.email_defaut : 'virement';
    if (defaut === 'virement' && !c.rib) return { actif: true, presel: null };
    return { actif: true, presel: defaut };
  }
  return { actif: true, presel: null };
}

/**
 * Payload du QR de virement SEPA — standard EPC069-12 (« EPC QR », celui que
 * les applications bancaires scannent pour préremplir un virement).
 * Version 002 : le BIC est optionnel. Ordre des lignes FIGÉ par le standard :
 * BCD / version / encodage / SCT / BIC / nom / IBAN / montant / purpose /
 * référence structurée (vide) / texte libre (notre référence) / note.
 */
export function epcQrPayload({ titulaire, iban, bic = null, montant = null, reference = null } = {}) {
  const nom = texte(titulaire, 70);
  const ibanClean = String(iban || '').replace(/\s+/g, '').toUpperCase();
  if (!nom || !ibanClean) return null;
  const m = typeof montant === 'number' && montant > 0 && montant <= 999999999.99
    ? 'EUR' + montant.toFixed(2)
    : '';
  return [
    'BCD',
    '002',
    '1',
    'SCT',
    String(bic || '').replace(/\s+/g, '').toUpperCase(),
    nom,
    ibanClean,
    m,
    '',
    '',
    texte(reference, 140) || '',
    '',
  ].join('\n');
}

/** « 480,00 € » en français, « €480.00 » en anglais. */
const montantDe = (n, langue) => (langue === 'en' ? `€${Number(n).toFixed(2)}` : `${Number(n).toFixed(2).replace('.', ',')} €`);
const echap = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** L'identité française : sans traducteur, la phrase telle qu'elle est écrite. */
const identiteFr = (s, v) => interpoler(s, v);

/**
 * L'email « comment régler » envoyé à l'élève après une vente à régler plus
 * tard (ou un échéancier avec des versements à venir). Trois variantes, le
 * choix de la prof. Le ton dit un FAIT (le studio attend ce règlement) sans
 * jamais presser, et rappelle que si c'est déjà réglé, il n'y a rien à faire.
 *
 * `t` : le traducteur de la langue de l'élève (lib/i18n-portail, `traducteur`) ;
 * absent → français. `t.langue` décide du format des dates et des montants.
 */
export function emailReglement({
  variante, studioNom = 'Ton studio', prenom = '', intitule = '',
  montant = 0, rib = null, reference = null, versements = [],
  studioSlug = null, baseUrl = 'https://www.izisolo.fr', t = identiteFr,
} = {}) {
  if (!VARIANTES_EMAIL.includes(variante)) return null;
  if (variante === 'virement' && !rib) return null;

  const langue = t.langue === 'en' ? 'en' : 'fr';
  const locale = localeDe(langue);
  const montantFr = (n) => montantDe(n, langue);

  const studio = echap(studioNom);
  const bonjour = `${prenom ? t('Bonjour {prenom}', { prenom: echap(prenom) }) : t('Bonjour')},`;
  const quoi = intitule ? ` ${t('pour « {intitule} »', { intitule: echap(intitule) })}` : '';
  const lienEspace = studioSlug ? `${baseUrl}/p/${studioSlug}/espace` : null;
  const montantHtml = `<strong>${montantFr(montant)}</strong>`;

  const aVenir = (versements || []).filter(v => v && v.montant > 0);
  const blocVersements = aVenir.length > 1 ? `
    <p style="color:#555;margin:14px 0 6px;"><strong>${t('Ton échéancier :')}</strong></p>
    <table style="border-collapse:collapse;font-size:14px;color:#555;">
      ${aVenir.map(v => `<tr><td style="padding:2px 14px 2px 0;">${echap(v.date ? new Date(v.date + 'T12:00:00').toLocaleDateString(locale) : '')}</td><td style="padding:2px 0;font-weight:600;">${montantFr(v.montant)}</td></tr>`).join('')}
    </table>` : '';

  const pied = `
    ${lienEspace ? `<p style="color:#555;margin:14px 0;">${t('Tu retrouves ce montant (et ces informations) à tout moment dans {lien}.', { lien: `<a href="${lienEspace}" style="color:#b87333;">${t('ton espace élève')}</a>` })}</p>` : ''}
    <p style="color:#999;font-size:12px;margin:18px 0 0;">${t('Déjà réglé ? Alors tout est bon, tu peux ignorer ce message.')}</p>`;

  let titre;
  let corps;

  if (variante === 'virement') {
    titre = t('{montant} à régler par virement', { montant: montantFr(montant) });
    corps = `
      <p style="color:#555;margin:0 0 14px;">${bonjour}</p>
      <p style="color:#555;margin:0 0 14px;">${t('{studio} attend ton règlement de {montant}{quoi}, par virement :', { studio, montant: montantHtml, quoi })}</p>
      <div style="background:#faf8f5;border:1px solid #e8e0d5;border-radius:12px;padding:14px 16px;margin:0 0 14px;">
        <p style="margin:0 0 4px;color:#555;">${t('Titulaire :')} <strong>${echap(rib.titulaire)}</strong></p>
        <p style="margin:0 0 4px;color:#555;">${t('IBAN :')} <strong style="font-family:monospace;">${formatIban(rib.iban)}</strong></p>
        ${rib.bic ? `<p style="margin:0 0 4px;color:#555;">${t('BIC :')} <strong style="font-family:monospace;">${echap(rib.bic)}</strong></p>` : ''}
        ${reference ? `<p style="margin:10px 0 0;color:#b45309;">${t("Indique bien la référence {reference} dans le libellé du virement : c'est elle qui permet à {studio} de reconnaître ton règlement.", { reference: `<strong>${echap(reference)}</strong>`, studio })}</p>` : ''}
      </div>
      ${blocVersements}
      ${lienEspace ? `<p style="color:#555;margin:0 0 14px;">${t('Ton espace élève affiche aussi ce RIB et un QR code à scanner avec ton application bancaire.')}</p>` : ''}
      <p style="color:#777;font-size:13px;margin:0;">${t('Tu préfères régler en espèces ou par chèque ? Directement au studio, comme d\'habitude.')}</p>
      ${pied}`;
  } else if (variante === 'especes') {
    titre = t('{montant} à régler en espèces', { montant: montantFr(montant) });
    corps = `
      <p style="color:#555;margin:0 0 14px;">${bonjour}</p>
      <p style="color:#555;margin:0 0 14px;">${t('{studio} attend ton règlement de {montant}{quoi}, {especes} (au prochain cours, par exemple).', { studio, montant: montantHtml, quoi, especes: `<strong>${t('en espèces, directement au studio')}</strong>` })}</p>
      ${blocVersements}
      ${pied}`;
  } else {
    titre = t('{montant} à régler par chèque', { montant: montantFr(montant) });
    const ordre = rib?.titulaire ? ` ${t("(à l'ordre de {titulaire})", { titulaire: `<strong>${echap(rib.titulaire)}</strong>` })}` : '';
    corps = `
      <p style="color:#555;margin:0 0 14px;">${bonjour}</p>
      <p style="color:#555;margin:0 0 14px;">${t('{studio} attend ton règlement de {montant}{quoi}, {cheque}, à remettre directement au studio{ordre}.', { studio, montant: montantHtml, quoi, cheque: `<strong>${t('par chèque')}</strong>`, ordre })}</p>
      ${blocVersements}
      ${pied}`;
  }

  const subject = t('{studio} : {titre}', { studio: studioNom, titre });
  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;">
      <h2 style="color:#b87333;margin:0 0 14px;">${titre}</h2>
      ${corps}
    </div>`;

  return { subject, html };
}
