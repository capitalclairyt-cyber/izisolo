/**
 * Les vues de la page publique d'un studio — règles PURES (aucune requête).
 *
 * Pourquoi ce compteur existe (2026-09-16) : sur Essentiel, une visiteuse peut
 * lire le planning mais pas réserver. La prof ne le voit jamais. Elle colle son
 * QR à la sortie, elle intègre son planning sur son site, des gens regardent, et
 * il ne se passe rien. Le compteur transforme ce silence en une phrase vraie :
 * « ta page a été ouverte 14 fois cette semaine, personne n'a pu réserver ».
 *
 * Trois règles de sincérité, tenues ici et pas ailleurs :
 *   1. on ne compte QUE des ouvertures de page, et on le DIT comme ça : jamais
 *      « 14 personnes » (on ne sait pas si c'est 14 personnes ou 3 curieuses qui
 *      reviennent), toujours « ouverte 14 fois » ;
 *   2. la prof qui regarde son propre portail n'est jamais comptée (c'est
 *      l'appelant qui le sait, cf. `compterVue` dans le service) ;
 *   3. sous le SEUIL, on ne dit rien du tout : une carte bâtie sur deux
 *      ouvertures serait du bruit présenté comme un signal.
 */

export const FENETRE_JOURS = 7;
// En dessous, on se tait. Deux ouvertures dans une semaine, ce n'est pas une
// audience, et une prof qui lit « ta page a été ouverte une fois » entend
// « personne ne vient chez toi ».
export const SEUIL_CARTE = 3;

// Les robots qu'on ne compte pas. Liste volontairement courte et lisible :
// elle attrape les honnêtes (moteurs, aperçus de lien des messageries), et on
// ne prétend pas attraper les autres.
const ROBOTS = /bot|crawler|spider|crawling|facebookexternalhit|preview|slurp|bingpreview|whatsapp|telegram|discord|lighthouse|headlesschrome|pingdom|uptime/i;
export const estRobot = (userAgent) => !userAgent || ROBOTS.test(String(userAgent));

const jourISO = (d) => new Date(d).toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });

/** Les `jours` derniers jours, bornes comprises, au format AAAA-MM-JJ. */
export function fenetre(jours = FENETRE_JOURS, aujourdhui = new Date()) {
  const debut = new Date(aujourdhui);
  debut.setDate(debut.getDate() - (jours - 1));
  return { debut: jourISO(debut), fin: jourISO(aujourdhui) };
}

/** Somme des vues sur la fenêtre. Des lignes difformes ne font jamais tomber. */
export function totalVues(lignes, jours = FENETRE_JOURS, aujourdhui = new Date()) {
  const { debut, fin } = fenetre(jours, aujourdhui);
  return (Array.isArray(lignes) ? lignes : []).reduce((t, l) => {
    const j = String(l?.jour || '').slice(0, 10);
    if (j < debut || j > fin) return t;
    const v = Number(l?.vues);
    return t + (Number.isFinite(v) && v > 0 ? v : 0);
  }, 0);
}

/**
 * La phrase à afficher, ou null quand il n'y a rien d'honnête à dire.
 * `peutReserver` = la capacité reservation_en_ligne du studio : sur Complet on
 * ne pousse rien, la carte n'a plus de raison d'être.
 */
export function messageVues({ vues, peutReserver, seuil = SEUIL_CARTE }) {
  if (peutReserver) return null;
  if (!Number.isFinite(vues) || vues < seuil) return null;
  return {
    vues,
    titre: `Ta page publique a été ouverte ${vues} fois cette semaine.`,
    texte: 'Aucune de ces visiteuses n’a pu réserver sa place : la réservation en ligne, l’espace élève et le paiement par carte sont dans Complet.',
    // On dit ce qu'on mesure, et ce qu'on ne mesure pas. Une prof qui découvre
    // un compteur se demande toujours ce qu'on sait d'elle et de ses élèves.
    note: 'On compte les ouvertures de ta page, jamais les personnes : ni nom, ni adresse IP, ni page visitée.',
  };
}
