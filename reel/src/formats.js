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

// ── Le freemium (2026-09-14, demande Colin : « une jolie vidéo pour attirer pour
// le freemium ») : le cahier et le tableur du dimanche soir, puis « 0 €, pour
// toujours », puis six écrans RÉELS de ce qui est gratuit (un mot chacun, avec
// la pastille « 0 € » qui ne quitte pas le téléphone), puis la frontière dite
// sans détour (« le seul truc payant, c'est quand tes élèves réservent et paient
// elles-mêmes »), puis la carte de fin commune. Même écriture que les POV :
// tutoiement, prénoms d'exemple, aucun chiffre non mesuré, aucun concurrent, et
// rien que le produit ne fasse pas (chaque écran est une capture du démo).
export const FREEMIUM = {
  pov: 'POV : c’est dimanche soir',
  titre: ['Ton cahier.', 'Ton Excel.'],
  notes: [
    { texte: 'Julie, il lui reste 3 ou 4 séances ?', apparait: 50 },
    { texte: 'Marc a payé en espèces ?', apparait: 82 },
  ],
  pivot: { texte: 'Ils peuvent prendre leur retraite.', apparait: 116 },
  // Le « 0 € » : tout s'efface, le chiffre arrive, puis les deux lignes.
  zero: { de: 170, chiffre: 184, lignes: 204, sous: 232, fin: 268 },
  zeroLignes: ['IziSolo est gratuit.', 'Pour toujours.'],
  zeroSous: 'Sans carte. Sans date de fin. Sans limite d’élèves.',
  // Six écrans, un mot chacun (1,4 s), la pastille « 0 € » accrochée au téléphone.
  ecransDebut: 280,
  parEcran: 42,
  ecrans: [
    { mot: 'Tes élèves', ...dims('eleves'), defilement: 0, cible: [360, 964] },
    { mot: 'Ton agenda', ...dims('agenda'), defilement: 0, cible: [300, 678] },
    { mot: 'Le pointage', ...dims('pointage'), defilement: 0, cible: [371, 788] },
    { mot: 'Les carnets', ...dims('fiche'), defilement: manifest.fiche.h - 1558, cible: manifest.reperes.carnet },
    { mot: 'Les encaissements', ...dims('vente-moyens'), defilement: 250, cible: [560, 1156] },
    { mot: 'L’URSSAF', ...dims('revenus'), defilement: 0, cible: [330, 903] },
  ],
  // La frontière : ce qui est payant, dit avec l'écran qui le montre (la
  // réservation par l'élève sur le portail public).
  frontiere: {
    de: 540, titre: 'Le seul truc payant ?', texte: 'Quand tes élèves réservent et paient elles-mêmes en ligne.',
    sous: ['30 jours de Complet pour voir,', 'puis tu choisis. Rien ne se bloque.'],
    ecran: { ...dims('portail'), defilement: 3000, cible: [488, 3440] },
  },
  fin: 690,
  finTitre: ['Gratuit, sans carte,', 'pour toujours.'],
};
FREEMIUM.ecransFin = FREEMIUM.ecransDebut + FREEMIUM.parEcran * FREEMIUM.ecrans.length; // 532
FREEMIUM.duree = FREEMIUM.fin + 100;

// ── Le réel « Avis Google » (2026-09-14, v117) ──────────────────────────────
// Captures : avis-carte (Paramètres → Ma page → « Mes avis Google » ouverte),
// avis-espace (l'espace élève, aperçu démo, pleine page) et avis-affiche (la
// feuille A4 « Un mot sur ton cours ? »), par
// `node scripts/shoot-reel-visuels.mjs --seulement=avis-carte,avis-espace,avis-affiche`.
// L'écran du téléphone montre 860 px de composition = ~1317 px de capture :
// l'espace est DÉFILÉ pour que le bouton « Laisser un avis Google » tombe au
// tiers bas de l'écran.
const HAUTEUR_ECRAN_CAPTURE = Math.round(860 / (470 / 720));
const defilementVers = (nom, y, marge = 900) => Math.max(0, Math.min(manifest[nom].h - HAUTEUR_ECRAN_CAPTURE, y - marge));
export const AVIS = {
  // Acte 1 : la couverture. Cinq étoiles qui tombent une à une, puis l'accroche.
  etoiles: { de: 6, pas: 7 },
  titre: { apparait: 46, lignes: ['Tes élèves', 't’adorent.'] },
  contre: { apparait: 78, texte: 'Google ne le sait pas.' },
  sous: { apparait: 108, texte: 'Nouveau dans IziSolo' },
  acte1Fin: 170,
  // Acte 2 : le seul réglage, le champ puis l'interrupteur, cerclés.
  reglage: {
    de: 170, eyebrow: 'Un seul réglage', titre: ['Colle ton lien Google.', 'Une fois.'],
    ecran: dims('avis-carte'), defilement: 0,
    reperes: [
      { cible: manifest.reperes.avisLien, delai: 40, fin: 104, carteDy: 60, label: 'Le lien « Demander des avis » de ta fiche' },
      { cible: manifest.reperes.avisAuto, delai: 110, carteDy: 50, label: 'Et l’email part tout seul' },
    ],
  },
  // Acte 3 : trois portes, 84 images chacune.
  portesDebut: 360,
  parPorte: 84,
  portesEyebrow: 'Ensuite, tout se fait tout seul',
  portes: [
    { type: 'ecran', mot: 'Dans leur espace', ecran: dims('avis-espace'), defilement: defilementVers('avis-espace', manifest.reperes.avisBouton[1]), cible: manifest.reperes.avisBouton },
    // Le VRAI texte de lib/avis-google.js (emailAvis), pas une paraphrase.
    { type: 'email', mot: 'Par email, après sa 3e séance', email: {
      de: 'L’Atelier Soleil', quand: 'via IziSolo', heure: '08:12',
      sujet: 'Un mot sur tes séances chez L’Atelier Soleil ?',
      lignes: ['Bonjour Léa, tu es venue plusieurs fois maintenant, et ça fait vraiment plaisir.', 'Si tu as une minute, un avis sur Google aide énormément.', 'Tu écris ce que tu veux, ce que tu penses vraiment. Ce message n’est envoyé qu’une seule fois.'],
    } },
    { type: 'affiche', mot: 'Et à la sortie du studio', image: dims('avis-affiche') },
  ],
  // Acte 4 : les règles de Google, dites sans détour.
  regles: {
    de: 620, titre: 'Comme Google le demande.',
    lignes: ['Une seule fois par élève.', 'Jamais plus de 5 par jour.', 'Jamais rien en échange.'],
    sous: 'Pas de rafale, pas de cadeau, pas de tri : tes avis restent en ligne.',
  },
  fin: 770,
  finTitre: ['Tes avis Google,', 'sans y penser.'],
};
AVIS.portesFin = AVIS.portesDebut + AVIS.parPorte * AVIS.portes.length; // 612
AVIS.duree = AVIS.fin + 100;
