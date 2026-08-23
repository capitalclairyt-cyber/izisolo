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
 * le rendu des emails. Module sans dépendance : importable par les specs
 * Node pures (verrou CI tests/e2e/reglement.spec.js).
 */

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

const montantFr = (n) => `${Number(n).toFixed(2).replace('.', ',')} €`;
const echap = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * L'email « comment régler » envoyé à l'élève après une vente à régler plus
 * tard (ou un échéancier avec des versements à venir). Trois variantes, le
 * choix de la prof. Le ton dit un FAIT (le studio attend ce règlement) sans
 * jamais presser, et rappelle que si c'est déjà réglé, il n'y a rien à faire.
 */
export function emailReglement({
  variante, studioNom = 'Ton studio', prenom = '', intitule = '',
  montant = 0, rib = null, reference = null, versements = [],
  studioSlug = null, baseUrl = 'https://www.izisolo.fr',
} = {}) {
  if (!VARIANTES_EMAIL.includes(variante)) return null;
  if (variante === 'virement' && !rib) return null;

  const studio = echap(studioNom);
  const bonjour = prenom ? `Bonjour ${echap(prenom)},` : 'Bonjour,';
  const quoi = intitule ? ` pour « ${echap(intitule)} »` : '';
  const lienEspace = studioSlug ? `${baseUrl}/p/${studioSlug}/espace` : null;

  const aVenir = (versements || []).filter(v => v && v.montant > 0);
  const blocVersements = aVenir.length > 1 ? `
    <p style="color:#555;margin:14px 0 6px;"><strong>Ton échéancier :</strong></p>
    <table style="border-collapse:collapse;font-size:14px;color:#555;">
      ${aVenir.map(v => `<tr><td style="padding:2px 14px 2px 0;">${echap(v.date ? new Date(v.date + 'T12:00:00').toLocaleDateString('fr-FR') : '')}</td><td style="padding:2px 0;font-weight:600;">${montantFr(v.montant)}</td></tr>`).join('')}
    </table>` : '';

  const pied = `
    ${lienEspace ? `<p style="color:#555;margin:14px 0;">Tu retrouves ce montant (et ces informations) à tout moment dans <a href="${lienEspace}" style="color:#b87333;">ton espace élève</a>.</p>` : ''}
    <p style="color:#999;font-size:12px;margin:18px 0 0;">Déjà réglé ? Alors tout est bon, tu peux ignorer ce message.</p>`;

  let subject;
  let corps;

  if (variante === 'virement') {
    subject = `${studioNom} : ${montantFr(montant)} à régler par virement`;
    corps = `
      <p style="color:#555;margin:0 0 14px;">${bonjour}</p>
      <p style="color:#555;margin:0 0 14px;">${studio} attend ton règlement de <strong>${montantFr(montant)}</strong>${quoi}, par virement :</p>
      <div style="background:#faf8f5;border:1px solid #e8e0d5;border-radius:12px;padding:14px 16px;margin:0 0 14px;">
        <p style="margin:0 0 4px;color:#555;">Titulaire : <strong>${echap(rib.titulaire)}</strong></p>
        <p style="margin:0 0 4px;color:#555;">IBAN : <strong style="font-family:monospace;">${formatIban(rib.iban)}</strong></p>
        ${rib.bic ? `<p style="margin:0 0 4px;color:#555;">BIC : <strong style="font-family:monospace;">${echap(rib.bic)}</strong></p>` : ''}
        ${reference ? `<p style="margin:10px 0 0;color:#b45309;">Indique bien la référence <strong>${echap(reference)}</strong> dans le libellé du virement : c'est elle qui permet à ${studio} de reconnaître ton règlement.</p>` : ''}
      </div>
      ${blocVersements}
      ${lienEspace ? `<p style="color:#555;margin:0 0 14px;">Ton espace élève affiche aussi ce RIB et un QR code à scanner avec ton application bancaire.</p>` : ''}
      <p style="color:#777;font-size:13px;margin:0;">Tu préfères régler en espèces ou par chèque ? Directement au studio, comme d'habitude.</p>
      ${pied}`;
  } else if (variante === 'especes') {
    subject = `${studioNom} : ${montantFr(montant)} à régler en espèces`;
    corps = `
      <p style="color:#555;margin:0 0 14px;">${bonjour}</p>
      <p style="color:#555;margin:0 0 14px;">${studio} attend ton règlement de <strong>${montantFr(montant)}</strong>${quoi}, <strong>en espèces, directement au studio</strong> (au prochain cours, par exemple).</p>
      ${blocVersements}
      ${pied}`;
  } else {
    subject = `${studioNom} : ${montantFr(montant)} à régler par chèque`;
    corps = `
      <p style="color:#555;margin:0 0 14px;">${bonjour}</p>
      <p style="color:#555;margin:0 0 14px;">${studio} attend ton règlement de <strong>${montantFr(montant)}</strong>${quoi}, <strong>par chèque</strong>, à remettre directement au studio${rib?.titulaire ? ` (à l'ordre de <strong>${echap(rib.titulaire)}</strong>)` : ''}.</p>
      ${blocVersements}
      ${pied}`;
  }

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;">
      <h2 style="color:#b87333;margin:0 0 14px;">${subject.replace(`${studioNom} : `, '')}</h2>
      ${corps}
    </div>`;

  return { subject, html };
}
