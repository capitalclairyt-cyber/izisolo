/**
 * Prospection à la main (v109, 2026-09-12) — règles PURES, source unique.
 *
 * Ce qu'on démarche, ce qu'on écrit, ce qu'on refuse d'envoyer, et comment se
 * lit le compteur. Aucune requête ici : l'écran /admin/prospection, les routes
 * admin, le script d'import et le verrou CI (prospection.spec.js) s'appuient
 * tous sur ce fichier.
 *
 * Décisions Colin du 2026-09-12 :
 *   - pas de cold mailing en volume : quelques emails par jour, chacun écrit
 *     pour une personne après lecture de son site, signé Maude ;
 *   - depuis bonjour@izisolo.fr (izisolo.com reste réservé au volume) ;
 *   - UN seul lien, vers la page concierge izisolo.fr/creer-mon-studio ;
 *   - envois DÉCALÉS dans la journée (Resend scheduledAt), sans script qui tourne.
 */
import { SOURCES, sourceNommable } from './prospection-sources.js';

export const FROM = 'Maude Pontet, IziSolo <bonjour@izisolo.fr>';
export const REPLY_TO = 'bonjour@izisolo.fr';
export const SITE = 'https://www.izisolo.fr';

/** Après SEUIL_ENVOIS emails, sous SEUIL_TAUX de réponses, on change l'angle. */
export const SEUIL_ENVOIS = 100;
export const SEUIL_TAUX = 0.03;
/** Une relance au plus, jamais avant ce délai, jamais de troisième email. */
export const DELAI_RELANCE_JOURS = 6;
export const TIRAGE_MAX = 10;

export const STATUTS_PROSPECT = {
  a_contacter: { label: 'Dans la pile', ton: 'neutral' },
  en_cours:    { label: 'À rédiger', ton: 'warning' },
  contactee:   { label: 'Contactée', ton: 'info' },
  repondu:     { label: 'A répondu', ton: 'success' },
  ecartee:     { label: 'Écartée', ton: 'neutral' },
};

export const STATUTS_EMAIL = {
  brouillon: { label: 'Brouillon' },
  programme: { label: 'Programmé' },
  envoye:    { label: 'Envoyé' },
};

export const MOTIFS_ECART = {
  pas_a_son_nom: 'Enseigne dans un studio, pas à son nom',
  deja_equipee:  'Déjà équipée et satisfaite',
  hors_cible:    'Hors cible (école, retraite, autre activité)',
  adresse_morte: 'Adresse qui ne répond plus',
  a_demande:     'Ne souhaite pas être contactée',
  autre:         'Autre',
};

const SUISSE = /gen[èe]ve|lausanne|suisse|neuch[âa]tel|fribourg|valais|\bvaud\b|\bCH\b|nyon|montreux|\bsion\b|yverdon/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Une ligne de la base est-elle démarchable ? Rend { ok, raison } : la raison
 * s'affiche (import) ou se compte, jamais un simple false muet.
 * `siteRequis` : true pour le tirage (sans site, rien de vrai à observer),
 * false pour une prof ajoutée à la main (Colin a déjà lu son site).
 */
export function eligibleProspect(p, { siteRequis = true } = {}) {
  const email = String(p?.email || '').trim().toLowerCase();
  const site = String(p?.site || '').trim();
  if (!EMAIL_RE.test(email)) return { ok: false, raison: 'adresse invalide' };
  if (!sourceNommable(p?.source)) return { ok: false, raison: 'source non citable' };
  if (siteRequis && (!site || !/\.[a-z]{2,}/i.test(site))) return { ok: false, raison: 'sans site' };
  if (/facebook\.com|instagram\.com/i.test(site)) return { ok: false, raison: 'site = réseau social (ligne sale)' };
  if (/^professeur/i.test(String(p?.nom || ''))) return { ok: false, raison: 'nom générique (ligne sale)' };
  if (/[ée]cole/i.test(String(p?.specialite || ''))) return { ok: false, raison: 'école' };
  if (SUISSE.test(String(p?.ville || ''))) return { ok: false, raison: 'Suisse (franc non géré)' };
  return { ok: true, raison: null };
}

/** Le prénom, depuis « NOM Prénom » ou « Prénom NOM » (la base mélange les deux). */
export function prenomDepuisNom(nom, prenom) {
  if (prenom && String(prenom).trim()) return String(prenom).trim();
  const mots = String(nom || '').trim().split(/\s+/).filter(Boolean);
  if (!mots.length) return '';
  const estMaj = (m) => m.length > 1 && m === m.toUpperCase();
  const candidat = mots.find((m) => !estMaj(m)) || mots[0];
  const bas = candidat.toLowerCase();
  return bas.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join('-');
}

/** L'adresse d'un site, normalisée pour un lien (les lignes portent parfois « https://http//… »). */
export function urlSite(site) {
  const brut = String(site || '').trim().replace(/^https?:\/\/http\/?\/?/i, '');
  if (!brut) return null;
  const candidat = /^https?:\/\//i.test(brut) ? brut : `https://${brut}`;
  try {
    const u = new URL(candidat);
    if (!['http:', 'https:'].includes(u.protocol) || !u.hostname.includes('.')) return null;
    return u.toString();
  } catch {
    return null;
  }
}

/**
 * Le gabarit proposé à la rédaction : la structure des DM de rentrée (une
 * observation vraie, une question, l'offre concierge, un seul lien), avec des
 * crochets là où il faut écrire quelque chose de VRAI. validerTexte refuse un
 * crochet resté en place : un gabarit envoyé tel quel est un email de masse.
 */
export function gabaritEmail(prospect, { relance = false } = {}) {
  const prenom = prenomDepuisNom(prospect?.nom, prospect?.prenom) || '[prénom]';
  if (relance) {
    return {
      objet: 'petit mot de suivi',
      corps: `Bonjour ${prenom},\n\nJe t'avais écrit la semaine dernière à propos de [ce que tu avais observé]. Pas de souci si ce n'est pas le moment, je sais ce que c'est en rentrée.\n\nSi un jour tu veux voir ton studio monté avec tes vrais cours, l'offre tient : tu m'envoies ton planning et tes tarifs, ici ou sur izisolo.fr/creer-mon-studio, et je te le monte gratuitement sous 48 h.\n\nBelle semaine,\nMaude`,
    };
  }
  return {
    objet: '[ce que tu as vu, en quatre mots]',
    corps: `Bonjour ${prenom},\n\nJe suis tombée sur ton site en cherchant des profs qui enseignent à leur nom, et j'ai vu [une observation vraie : le créneau, le lieu, l'atelier, le forfait]. Je suis prof de yoga aussi, entre Lyon et Grenoble.\n\nPetite question de rentrée : [une seule question, sur ce que tu as vu]. De mon côté c'est la première rentrée où je ne passe pas mes soirées à recopier des fiches d'inscription, et je savoure.\n\nJ'ai cofondé IziSolo pour ça : agenda, élèves, carnets, encaissements et pointage au même endroit, pensé pour une prof seule. Si tu veux voir ce que ça donne avec tes vrais cours, tu m'envoies ton planning et tes tarifs, ici ou sur izisolo.fr/creer-mon-studio, et je te monte ton studio gratuitement sous 48 h. Tu compares, tu gardes ou pas.\n\nBelle rentrée,\nMaude`,
  };
}

/**
 * Ce qu'on refuse d'envoyer, avec la raison écrite. Chaque règle vient d'une
 * décision consignée : pas de crochet (gabarit non rempli), pas de tiret
 * quadratin (règle Colin 2026-08-19), signé Maude, un seul lien et vers chez
 * nous, jamais un concurrent nommé.
 */
export function validerTexte({ objet, corps } = {}) {
  const erreurs = [];
  const o = String(objet || '').trim();
  const c = String(corps || '').trim();
  if (!o) erreurs.push("l'objet est vide");
  if (o.length > 160) erreurs.push("l'objet dépasse 160 caractères");
  if (!c) erreurs.push('le corps est vide');
  if (c.length > 6000) erreurs.push('le corps dépasse 6000 caractères');
  if (/\[[^\]]*\]/.test(o + '\n' + c)) erreurs.push('il reste un crochet du gabarit : écris quelque chose de vrai à sa place');
  if (/—/.test(o + c)) erreurs.push('pas de tiret quadratin dans un texte destiné à une humaine');
  if (c && !/\bMaude\s*$/.test(c)) erreurs.push('signe Maude, en dernière ligne');
  const liens = (c.match(/https?:\/\/[^\s)]+|\b(?:www\.)?[a-z0-9-]+\.[a-z]{2,}\/[^\s)]*/gi) || []);
  const externes = liens.filter((l) => !/izisolo\.fr/i.test(l));
  if (externes.length) erreurs.push(`un lien qui ne mène pas chez nous : ${externes[0]}`);
  if (liens.filter((l) => /izisolo\.fr/i.test(l)).length > 1) erreurs.push('un seul lien vers izisolo.fr, pas deux');
  if (/momoyoga|zenamu|aurarios|studioplan|web ?sport|punchpass|bsport|mindbody/i.test(c)) erreurs.push('jamais un concurrent nommé');
  return { ok: erreurs.length === 0, erreurs };
}

const echapper = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fr = (t) => t.replace(/ ([?!;:])/g, ' $1');
const lier = (t) => t.replace(/\b(www\.)?izisolo\.fr(\/[\w\-./?=&]*)?/g,
  (m) => `<a href="${SITE}${m.replace(/^(www\.)?izisolo\.fr/, '')}" style="color:#8f5a37">${m}</a>`);

/**
 * L'email tel qu'il part : texte brut → HTML sobre, plus le pied RGPD (d'où
 * vient l'adresse, désinscription en un clic vers la PAGE à bouton, jamais
 * l'API GET qu'un robot de messagerie exécuterait, et qui édite IziSolo).
 */
export function rendreEmail({ to, source, objet, corps }) {
  const dest = String(to || '').trim().toLowerCase();
  const provenance = SOURCES[source];
  if (!provenance) throw new Error(`source « ${source} » non citable`);
  const desinscription = `${SITE}/unsubscribe?email=${encodeURIComponent(dest)}`;
  const paragraphes = String(corps || '').trim().split(/\n\s*\n/);
  const piedTexte = `Je t'écris parce que ${provenance}. Si tu préfères ne plus recevoir de message de ma part : ${desinscription}\nIziSolo est édité par Maude Yoga (mentions légales : ${SITE}/legal/mentions).`;
  const piedHtml = '<p style="margin:28px 0 0;padding-top:12px;border-top:1px solid #e6dccf;font-size:13px;color:#7a6a5c">'
    + `Je t'écris parce que ${echapper(provenance)}. Si tu préfères ne plus recevoir de message de ma part : <a href="${desinscription}" style="color:#7a6a5c">se désinscrire</a>.<br>`
    + `IziSolo est édité par Maude Yoga · <a href="${SITE}/legal/mentions" style="color:#7a6a5c">mentions légales</a></p>`;
  const html = '<div style="font-family:Georgia,\'Times New Roman\',serif;font-size:16px;line-height:1.55;color:#2c2118;max-width:600px">'
    + paragraphes.map((p) => `<p style="margin:0 0 16px">${lier(echapper(fr(p))).replace(/\n/g, '<br>')}</p>`).join('')
    + piedHtml + '</div>';
  return {
    sujet: fr(String(objet || '').trim()),
    html,
    text: `${fr(String(corps || '').trim())}\n\n${fr(piedTexte)}`,
    desinscription,
  };
}

/**
 * « 09:40 » → l'instant correspondant AUJOURD'HUI en heure de Paris.
 * Rend null si le format est mauvais ; l'appelant vérifie que c'est à venir.
 */
export function heureParisAujourdhui(hhmm, maintenant = new Date()) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(hhmm || ''))) return null;
  const jour = maintenant.toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
  for (const off of ['+02:00', '+01:00']) {
    const d = new Date(`${jour}T${hhmm}:00${off}`);
    if (d.toLocaleString('sv-SE', { timeZone: 'Europe/Paris' }).startsWith(`${jour} ${hhmm}`)) return d;
  }
  return null;
}

/** Le compteur et ce qu'il dit : après SEUIL_ENVOIS, sous SEUIL_TAUX, on change l'angle. */
export function statsProspection({ envoyes = 0, repondus = 0 } = {}) {
  const taux = envoyes ? repondus / envoyes : 0;
  const seuilAtteint = envoyes >= SEUIL_ENVOIS;
  return {
    envoyes, repondus, taux,
    seuilAtteint,
    changerAngle: seuilAtteint && taux < SEUIL_TAUX,
    restants: Math.max(0, SEUIL_ENVOIS - envoyes),
  };
}

/** Une relance est-elle due ? Envoyé depuis ≥ DELAI_RELANCE_JOURS, pas de réponse, pas déjà relancée. */
export function relanceDue({ envoye_at, dejaRelancee = false, repondu = false }, maintenant = new Date()) {
  if (!envoye_at || dejaRelancee || repondu) return false;
  const jours = (maintenant.getTime() - new Date(envoye_at).getTime()) / 86400000;
  return jours >= DELAI_RELANCE_JOURS;
}

export { SOURCES, sourceNommable };
