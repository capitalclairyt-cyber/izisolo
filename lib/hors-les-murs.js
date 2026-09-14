/**
 * « Hors les murs » (v118, 2026-09-14) : le backoffice de Maude pour ses
 * événements de yoga dans des lieux qui ont déjà leur public (grotte, ferme,
 * château, musée, entreprise, EHPAD, gîte…).
 *
 * Le CATALOGUE (les lieux, les mini-projets, les emails prêts à partir) est un
 * fichier VERSIONNÉ : content/hors-les-murs.js. Chaque fiche y a été vérifiée
 * sur la page de l'exploitant le jour de sa rédaction, et le texte de l'email
 * est écrit pour Maude, qui l'envoie depuis SA boîte (maude@maude-yoga.com).
 *
 * Ce module ne contient que les RÈGLES, pures : le vocabulaire des statuts, ce
 * qu'on refuse d'envoyer, la fusion fiche + suivi, les compteurs, l'ordre de
 * la liste, le lien mailto. Aucune requête, aucun import de contenu. Ce qui
 * ÉCRIT vit dans lib/hors-les-murs-service.js.
 */

export const FAMILLES = {
  nature: { label: 'Nature et lieux insolites', court: 'Nature' },
  producteur: { label: 'Producteurs et artisans', court: 'Producteurs' },
  culture: { label: 'Culture et patrimoine', court: 'Culture' },
  evenement: { label: 'Rendez-vous où s’insérer', court: 'Rendez-vous' },
  pro: { label: 'Entreprises, seniors, collectivités', court: 'Pro' },
  hebergeur: { label: 'Stages et week-ends', court: 'Stages' },
};

export const PRIORITES = {
  1: 'Proche, exploitant déjà organisé, format évident : à contacter en premier',
  2: 'Très bon lieu, un peu plus loin ou une négociation à mener',
  3: 'À garder sous le coude, pour une saison 2 ou une occasion précise',
};

/**
 * Le statut d'une piste = où en est MAUDE avec elle. Le défaut est « à relire » :
 * le texte existe, elle ne l'a pas encore lu. Elle peut demander une modif
 * (Colin reprend), valider tel quel, envoyer, noter la réponse, écarter.
 */
export const STATUTS = {
  a_relire: { label: 'À relire', ton: 'warning', action: 'Relire, puis demander une modif ou valider' },
  modif_demandee: { label: 'Modif demandée', ton: 'info', action: 'Colin reprend le texte' },
  valide: { label: 'Prêt à partir', ton: 'success', action: 'Envoyer depuis ma boîte' },
  envoye: { label: 'Envoyé', ton: 'neutral', action: 'Attendre la réponse' },
  repondu: { label: 'A répondu', ton: 'success', action: 'Caler le repérage ou la date' },
  en_cours: { label: 'En cours', ton: 'info', action: 'Suivre la discussion' },
  ecarte: { label: 'Écarté', ton: 'neutral', action: 'Remettre dans la liste si ça change' },
};

/** L'ordre dans lequel on veut voir les pistes : ce qui attend un geste d'abord. */
const POIDS_STATUT = { valide: 0, repondu: 1, a_relire: 2, en_cours: 3, modif_demandee: 4, envoye: 5, ecarte: 6 };

export const MOTIFS_ECART = {
  pas_le_moment: 'Pas le moment',
  trop_loin: 'Trop loin',
  refus: 'Le lieu a dit non',
  pas_de_reponse: 'Pas de réponse après relance',
  doublon: 'Déjà couvert par une autre piste',
};

/** Les actions et le statut qu'elles posent. `null` = l'action ne change pas le statut. */
export const ACTIONS = {
  enregistrer: null,
  demander_modif: 'modif_demandee',
  valider: 'valide',
  marquer_envoye: 'envoye',
  reponse: 'repondu',
  en_cours: 'en_cours',
  ecarter: 'ecarte',
  remettre: 'a_relire',
};

/** Depuis quel statut une action a un sens. Une piste écartée ne bouge plus, sauf « remettre ». */
export function transition(statutActuel, action) {
  const actuel = STATUTS[statutActuel] ? statutActuel : 'a_relire';
  if (!(action in ACTIONS)) return { ok: false, raison: 'action inconnue' };
  if (actuel === 'ecarte' && action !== 'remettre') return { ok: false, raison: 'la piste est écartée : remets-la dans la liste d’abord' };
  if (action === 'remettre' && actuel !== 'ecarte') return { ok: false, raison: 'la piste n’est pas écartée' };
  if (action === 'reponse' && !['envoye', 'repondu', 'en_cours'].includes(actuel)) return { ok: false, raison: 'on note une réponse après un envoi' };
  return { ok: true, statut: ACTIONS[action] || actuel };
}

/** Le relais et la copie : chaque email part de la boîte de Maude, avec bonjour@ en copie pour que l'équipe suive. */
export const EMAIL_MAUDE = 'maude@maude-yoga.com';
export const CC_EQUIPE = 'bonjour@izisolo.fr';
export const SIGNATURE = 'Maude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com';
/** Pour une entreprise ou une collectivité, la signature renvoie vers le site pro. */
export const SIGNATURE_PRO = 'Maude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · pro.maude-yoga.com';
const signatureDe = (c) => (c.endsWith(SIGNATURE_PRO) ? SIGNATURE_PRO : c.endsWith(SIGNATURE) ? SIGNATURE : null);
const DOMAINES_PERMIS = /^(?:https?:\/\/)?(?:www\.)?(?:pro\.)?maude-yoga\.com(?:\/|$)/i;

/**
 * Ce qu'on refuse d'envoyer au nom de Maude, avec la raison écrite. Chaque règle
 * vient d'une décision consignée : vouvoiement (on écrit à un exploitant, pas à
 * une collègue), aucun crochet (un gabarit à trous est un email de masse), pas
 * de tiret quadratin (règle Colin 2026-08-19), jamais Bordeaux (la ville du
 * démo, pas la sienne), jamais IziSolo ni un concurrent (hors sujet ici), un
 * seul lien et chez elle, et sa signature sur trois lignes.
 */
export function validerEmailLieu({ objet, corps } = {}) {
  const erreurs = [];
  const o = String(objet || '').trim();
  const c = String(corps || '').trim();
  const tout = `${o}\n${c}`;
  if (!o) erreurs.push('l’objet est vide');
  if (o.length > 120) erreurs.push('l’objet dépasse 120 caractères');
  if (!c) erreurs.push('le corps est vide');
  if (c.length > 4000) erreurs.push('le corps dépasse 4000 caractères');
  if (/\[[^\]]*\]/.test(tout)) erreurs.push('il reste un crochet : écris quelque chose de vrai à sa place');
  if (/—/.test(tout)) erreurs.push('pas de tiret quadratin dans un texte destiné à un humain');
  if (/\bBordeaux\b/i.test(tout)) erreurs.push('Bordeaux est la ville du démo, pas celle de Maude');
  if (/izisolo/i.test(tout)) erreurs.push('IziSolo n’a rien à faire dans un email sur le yoga de Maude');
  if (/momoyoga|zenamu|aurarios|studioplan|web ?sport|punchpass|bsport|mindbody/i.test(tout)) erreurs.push('jamais un concurrent nommé');
  if (/\b(tu|toi)\b/i.test(c) || /\bt['’](?:as|es|en|y|ai)\b/i.test(c)) erreurs.push('vouvoiement : on écrit à un exploitant');
  const signature = signatureDe(c);
  if (c && !signature) erreurs.push('signature attendue sur trois lignes : Maude Pontet / Maude Yoga, Gillonnay / 06 42 63 52 38 · maude-yoga.com (ou pro.maude-yoga.com)');
  const corpsSansSignature = signature ? c.slice(0, -signature.length) : c;
  const liens = corpsSansSignature.match(/\b(?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s)]*)?/gi) || [];
  const liensSansEmail = liens.filter((l) => !new RegExp(`@${l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(corpsSansSignature));
  const externes = liensSansEmail.filter((l) => !DOMAINES_PERMIS.test(l));
  if (externes.length) erreurs.push(`un lien qui ne mène pas chez Maude : ${externes[0]}`);
  if (liensSansEmail.length > 1) erreurs.push('un seul lien dans le texte (la signature en porte déjà un)');
  return { ok: erreurs.length === 0, erreurs };
}

/**
 * Le lien qui ouvre la boîte de Maude avec tout prérempli : destinataire, copie
 * à l'équipe, objet, corps. C'est ELLE qui appuie sur Envoyer, depuis son
 * adresse ; on ne fait pas partir un email à sa place depuis un serveur.
 * Rend null sans adresse connue (le lieu n'affiche qu'un formulaire ou un numéro).
 */
export function lienMailto(destinataire, { objet, corps } = {}, { cc = CC_EQUIPE } = {}) {
  const to = String(destinataire || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(to)) return null;
  const p = new URLSearchParams();
  if (cc) p.set('cc', cc);
  p.set('subject', String(objet || '').trim());
  p.set('body', String(corps || '').trim());
  // URLSearchParams encode l'espace en « + », que les clients mail lisent comme un plus.
  return `mailto:${to}?${p.toString().replace(/\+/g, '%20')}`;
}

/** La fiche telle que l'écran la lit : le catalogue + ce que Maude en a fait. */
export function fusionner(lieu, suivi = null) {
  const s = suivi || {};
  return {
    ...lieu,
    statut: STATUTS[s.statut] ? s.statut : 'a_relire',
    objet: typeof s.objet === 'string' && s.objet.trim() ? s.objet : lieu.email.objet,
    corps: typeof s.corps === 'string' && s.corps.trim() ? s.corps : lieu.email.corps,
    texteModifie: !!((s.objet && s.objet !== lieu.email.objet) || (s.corps && s.corps !== lieu.email.corps)),
    commentaire: s.commentaire || '',
    reponse: s.reponse || '',
    motif_ecart: s.motif_ecart || null,
    envoye_at: s.envoye_at || null,
    updated_at: s.updated_at || null,
    historique: Array.isArray(s.historique) ? s.historique : [],
  };
}

export function compteurs(fiches = []) {
  const c = { total: fiches.length };
  for (const k of Object.keys(STATUTS)) c[k] = 0;
  for (const f of fiches) c[STATUTS[f.statut] ? f.statut : 'a_relire']++;
  c.a_relire_prio1 = fiches.filter((f) => f.statut === 'a_relire' && Number(f.prio) === 1).length;
  return c;
}

/** Ce qui attend un geste d'abord, puis la priorité, puis la distance. */
export function trier(fiches = []) {
  return [...fiches].sort((a, b) =>
    (POIDS_STATUT[a.statut] ?? 9) - (POIDS_STATUT[b.statut] ?? 9)
    || Number(a.prio) - Number(b.prio)
    || Number(a.km) - Number(b.km)
    || String(a.nom).localeCompare(String(b.nom), 'fr'));
}

const sansAccents = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function filtrer(fiches = [], { famille = 'toutes', statut = 'tous', prio = 0, kmMax = 0, q = '' } = {}) {
  const recherche = sansAccents(q).trim();
  return fiches.filter((f) =>
    (famille === 'toutes' || f.cat === famille)
    && (statut === 'tous' || (statut === 'actives' ? f.statut !== 'ecarte' : f.statut === statut))
    && (!prio || Number(f.prio) === Number(prio))
    && (!kmMax || Number(f.km) <= Number(kmMax))
    && (!recherche || sansAccents(`${f.nom} ${f.lieu} ${f.gest} ${f.projet?.titre || ''}`).includes(recherche)));
}

/**
 * Les occasions datées (une fête, un marché, un pilote) qui tombent dans les
 * N jours : à appeler cette semaine ou laisser passer. Une piste écartée ou
 * déjà envoyée n'y figure plus.
 */
export function occasionsProches(fiches = [], { aujourdhui = new Date(), horizonJours = 60 } = {}) {
  const jour = new Date(Date.UTC(aujourdhui.getUTCFullYear(), aujourdhui.getUTCMonth(), aujourdhui.getUTCDate()));
  return fiches
    .filter((f) => f.echeance && /^\d{4}-\d{2}-\d{2}$/.test(f.echeance) && !['ecarte', 'envoye', 'repondu', 'en_cours'].includes(f.statut))
    .map((f) => ({ ...f, joursRestants: Math.round((Date.parse(`${f.echeance}T00:00:00Z`) - jour.getTime()) / 86400000) }))
    .filter((f) => f.joursRestants >= 0 && f.joursRestants <= horizonJours)
    .sort((a, b) => a.joursRestants - b.joursRestants);
}

/** Envoyé depuis plus de N jours sans réponse : à relancer, une fois. */
export function relancesDues(fiches = [], { aujourdhui = new Date(), delaiJours = 10 } = {}) {
  return fiches.filter((f) => f.statut === 'envoye' && f.envoye_at && (aujourdhui.getTime() - Date.parse(f.envoye_at)) / 86400000 >= delaiJours);
}

/** Un identifiant de fiche : minuscules, chiffres et tirets, comme une URL. */
export function idValide(id) {
  return /^[a-z0-9][a-z0-9-]{1,60}$/.test(String(id || ''));
}
