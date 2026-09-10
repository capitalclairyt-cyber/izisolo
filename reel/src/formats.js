// Les formats « déclencheurs » du 2026-09-10 (après les réels POV) : ce qu'ils
// montrent, image par image. Tous se terminent par la même carte de fin
// (« Commente STUDIO », composants/AppelStudio.jsx), pour que le compte parle
// d'une seule voix. Même règle d'écriture que les POV : aucun chiffre non
// mesuré, aucun concurrent, des prénoms d'exemple, rien que le produit ne
// fasse pas. Les écrans sont les captures RÉELLES du démo (public/, manifest.json),
// et les repères visent des pixels de capture (720 de large), comme scenes.js.
import manifest from '../public/manifest.json';

export const dims = (nom) => ({ src: `${nom}.jpg`, imgW: manifest[nom].w, imgH: manifest[nom].h });

// ── Avant / après : trois messages de 23 h, et l'écran qui y répond ──────────
// Le troisième message parle de la pleine lune parce que l'écran de messagerie
// du démo montre précisément cette annonce (« Il reste 2 places pour le 18 »).
export const SPLIT = {
  eyebrow: 'Avant / après',
  titre: ['Tes soirées,', 'avant et après.'],
  messages: [
    { texte: 'C’est complet mardi ?', heure: '23:04', apparait: 30 },
    { texte: 'Je peux payer en deux fois ?', heure: '23:12', apparait: 150 },
    { texte: 'C’est quand, la pleine lune ?', heure: '23:31', apparait: 270 },
  ],
  // L'écran qui répond à chaque message (fondu entre `de` et `a`), le point
  // visé (px de capture) et la carte qui le nomme.
  reponses: [
    { ecran: dims('portail'), defilement: 3000, de: 0, a: 1, cible: [488, 3440], carte: 80,
      label: 'Elle voit les places qui restent', sous: 'Et réserve seule, sans compte' },
    { ecran: dims('vente-echeancier'), defilement: 500, de: 190, a: 202, cible: [620, 927], carte: 200,
      label: 'Un échéancier, une fois', sous: 'Chaque versement a sa date et son moyen' },
    { ecran: dims('messagerie'), defilement: 0, de: 310, a: 322, cible: [500, 190], carte: 320,
      label: 'Une annonce à toutes', sous: 'Avec la photo, et personne ne rate l’info' },
  ],
  fin: 400,
  duree: 500,
};

// ── Réponse à un DM : la vraie question d'une prof, anonymisée, et huit écrans ──
export const REPONSE_DM = {
  eyebrow: 'Une prof m’a écrit hier',
  question: 'Ok, c’est quoi les fonctions ? Tu attises ma curiosité 🤣',
  debut: 70,
  parEcran: 60,
  ecrans: [
    { mot: 'Réserver', ...dims('portail'), defilement: 3000, cible: [488, 3440] },
    { mot: 'Planifier', ...dims('agenda'), defilement: 0, cible: [300, 678] },
    { mot: 'Créer', ...dims('cours'), defilement: 2500, cible: [300, 3357] },
    { mot: 'Vendre', ...dims('offre'), defilement: 1200, cible: [170, 1620] },
    { mot: 'Pointer', ...dims('pointage'), defilement: 0, cible: [371, 788] },
    { mot: 'Encaisser', ...dims('vente-moyens'), defilement: 250, cible: [560, 1156] },
    { mot: 'Déclarer', ...dims('revenus'), defilement: 0, cible: [300, 938] },
    { mot: 'Écrire', ...dims('messagerie'), defilement: 0, cible: [420, 312] },
  ],
  finTitre: ['Le reste, je te le montre', 'sur tes vrais cours.'],
};
REPONSE_DM.fin = REPONSE_DM.debut + REPONSE_DM.parEcran * REPONSE_DM.ecrans.length;
REPONSE_DM.duree = REPONSE_DM.fin + 100;

// ── Ta rentrée qui se range toute seule : l'agenda se remplit, puis les revenus ──
// Les pastilles de l'agenda (px de capture) : elles apparaissent une à une,
// comme les séries qu'on pose. Relevées sur public/agenda.jpg.
export const RENTREE = {
  eyebrow: 'Septembre',
  titre: ['Ta rentrée,', 'si elle se rangeait', 'toute seule.'],
  agenda: dims('agenda'),
  pastilles: [
    [145, 400, 675, 452], [145, 524, 675, 578], [145, 650, 675, 706],
    [145, 776, 675, 832], [145, 902, 675, 958], [145, 1028, 675, 1084],
  ],
  premierePastille: 50,
  cadence: 22,
  carteAgenda: { delai: 195, label: 'Six séries, posées une fois', sous: 'Vacances et fériés sautés' },
  bascule: { de: 262, a: 276 },
  revenus: dims('revenus'),
  cartesRevenus: [
    { delai: 286, cible: [380, 418], label: 'Encaissé, à jour', sous: 'À chaque paiement, sans tableur' },
    { delai: 346, cible: [330, 903], label: 'Le montant URSSAF', sous: 'Prêt à recopier à chaque échéance' },
  ],
  fin: 430,
  duree: 530,
};
