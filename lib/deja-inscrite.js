/**
 * « Ajouter des élèves » : dire quand la personne cherchée est DÉJÀ sur la
 * séance, au lieu de « Aucun résultat » (règles pures).
 *
 * Retour Maude (2026-09-22, le soir de son Yoga du Mardi) : elle tape
 * « Catherine » dans le modal d'ajout, ne trouve pas Catherine Mazoyer, et
 * conclut que la fiche a disparu. En base, tout était juste : Catherine avait
 * réservé depuis le portail cinq jours plus tôt, et elle était DÉJÀ sur la
 * liste de pointage, marquée présente. Le modal retire de ses propositions
 * toute élève déjà inscrite (c'est voulu, sinon on fabriquerait des doublons
 * d'inscription), mais quand la recherche ne tombait que sur des inscrites il
 * disait « Aucun résultat pour « Catherine » » et proposait « Créer la fiche »,
 * soit un doublon SANS email que l'index unique v53 ne peut pas arrêter.
 *
 * Deux règles :
 *   • si la recherche correspond à des personnes déjà sur la séance, on les
 *     NOMME avec leur état (présente, inscrite, a annulé…) ;
 *   • on ne propose « Créer la fiche » que si la recherche ne correspond à
 *     PERSONNE, ni parmi les proposables ni parmi les inscrites.
 *
 * Module sans dépendance navigateur : importable par les specs Node pures.
 */
import { matchRecherche } from './utils';

/**
 * L'état d'une présence, dit comme une prof le lirait sur la liste.
 * Une annulation tardive prime sur le statut : c'est une ligne info, pas
 * une inscrite qu'on peut pointer.
 */
export function etatPresence(p) {
  if (!p) return 'inscrit·e';
  if (p.annulation_tardive) return 'annulation tardive';
  const s = p.statut_pointage || (p.pointee ? 'present' : 'inscrit');
  switch (s) {
    case 'present':  return 'présent·e';
    case 'absent':   return 'absent·e';
    case 'excuse':   return 'excusé·e';
    case 'annule':   return 'a annulé sa réservation';
    case 'declinee': return 'invitation déclinée';
    case 'inscrit':
    default:         return 'inscrit·e';
  }
}

const nomComplet = (c) => `${c?.prenom || ''} ${c?.nom || ''}`.trim();

/**
 * Parmi les présences de la séance, celles dont l'élève correspond à la
 * recherche. Rendu prêt à afficher : nom complet + état. Une recherche vide
 * ne correspond à personne (le modal affiche alors la liste, pas une note).
 *
 * @param {string} query
 * @param {Array<{ client_id?: string, clients?: { id?: string, prenom?: string, nom?: string } }>} presences
 * @returns {Array<{ id: string, nom: string, etat: string }>}
 */
export function inscritesCorrespondantes(query, presences) {
  const q = String(query ?? '').trim();
  if (!q) return [];
  const vues = new Set();
  const out = [];
  for (const p of presences || []) {
    const c = p?.clients;
    if (!c) continue;
    const id = c.id || p.client_id;
    if (!id || vues.has(id)) continue;
    if (!matchRecherche(q, c.prenom, c.nom)) continue;
    vues.add(id);
    out.push({ id, nom: nomComplet(c), etat: etatPresence(p) });
  }
  return out.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}

/**
 * La phrase à afficher. Une personne : « Catherine Mazoyer est déjà sur cette
 * séance (présent·e). » Plusieurs : « Déjà sur cette séance : Catherine
 * Mazoyer (présent·e), Anne Dupont (inscrit·e). »
 */
export function texteDejaInscrites(liste) {
  if (!liste?.length) return '';
  if (liste.length === 1) return `${liste[0].nom} est déjà sur cette séance (${liste[0].etat}).`;
  return `Déjà sur cette séance : ${liste.map(i => `${i.nom} (${i.etat})`).join(', ')}.`;
}

/**
 * Proposer « Créer la fiche » ? Seulement si la recherche ne correspond à
 * personne : ni une proposable, ni une inscrite. Une recherche vide ne
 * propose rien non plus.
 */
export function proposerCreation({ query, proposables = [], inscrites = [] }) {
  const q = String(query ?? '').trim();
  if (!q) return false;
  return proposables.length === 0 && inscrites.length === 0;
}
