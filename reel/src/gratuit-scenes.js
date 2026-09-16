// Le réel « 0 € » (2026-09-16, demande Colin : « un réel pour promouvoir le
// plan à 0 €, des belles couleurs, avec les mockups, pour ramener le plus
// d'utilisatrices possibles »). Tout est ici, en .js PUR : le script de rendu
// (Node, sans JSX) lit les mêmes dimensions et les mêmes profils.
//
// Ce qu'il raconte, dans l'ordre : le geste qu'on a fait (on a enlevé le prix),
// le chiffre plein écran, six écrans RÉELS de ce qui est gratuit, la frontière
// dite sans détour, puis l'adresse. Même écriture que les POV : tutoiement,
// aucun chiffre non mesuré, aucun concurrent nommé, rien que le produit ne
// fasse pas, et jamais « gratuit » tout seul sans dire où s'arrête le gratuit.
//
// ⚠️ Le fichier ne s'appelle pas `gratuit.js` : à côté de `Gratuit.jsx`, sur un
// disque insensible à la casse, `./gratuit` et `./Gratuit` se confondent et le
// composant arrive `undefined` (le piège de pov.js, 2026-09-10).
import manifest from '../public/manifest.json';

export const dims = (nom) => ({ src: `${nom}.jpg`, imgW: manifest[nom].w, imgH: manifest[nom].h });

export { PALETTE, TEINTES, PROFILS, DUREE, IMAGE_COUVERTURE } from './gratuit-formats';

// ── Acte 1 : le geste qu'on a fait ──────────────────────────────────────────
// L'accroche parle du parcours de la visiteuse, jamais d'un concurrent : c'est
// le constat qui a décidé du freemium (« le prix rebute des visiteuses »,
// Colin, 2026-09-13), raconté de son point de vue à elle.
export const ACTE1 = {
  eyebrow: 'Un dimanche soir, 22 h',
  lignes: [
    { texte: 'Tu as cherché un outil pour ton studio.', apparait: 8 },
    { texte: 'Tu as vu le prix.', apparait: 48 },
    { texte: 'Tu as refermé l’onglet.', apparait: 84 },
  ],
  pivot: { texte: 'Alors on a enlevé le prix.', apparait: 118 },
};

// ── Acte 2 : le chiffre, plein écran ────────────────────────────────────────
export const ZERO = {
  de: 168, chiffre: 176, lignes: 208, sous: 240, fin: 292,
  // Le plan est NOMMÉ au-dessus du chiffre : « IziSolo est gratuit » tout seul
  // promettrait le produit entier, et l'acte 4 ne peut pas rattraper une
  // image de couverture qu'on regarde sans le son ni la suite.
  eyebrow: 'Le plan Essentiel',
  lignesTexte: ['IziSolo est gratuit.', 'Pour toujours.'],
  // ⚠️ Le texte ne s'appelle pas `sous` : la clé `sous` porte déjà l'image
  // où il arrive, et la seconde écrasait la première en silence (spring sur un
  // tableau = « Frame NaN is not finite », attrapé au premier rendu).
  sousTexte: ['Sans carte bancaire.', 'Sans limite d’élèves.', 'Sans date de fin.'],
};

// ── Acte 3 : six écrans réels, un mot chacun ────────────────────────────────
// Chaque écran est une capture du démo Atelier Soleil (public/, manifest.json),
// et chaque mot désigne quelque chose que le plan Essentiel fait vraiment.
export const ECRANS = {
  eyebrow: 'Tout ça, sans payer',
  arrivee: 296,
  debut: 300,
  parEcran: 45,
  // `r` = le rayon de l'anneau, en px de composition : il ENTOURE le badge
  // visé, il ne s'assied pas dessus. Chaque valeur a été relue sur l'image
  // rendue, jamais devinée dans le code.
  liste: [
    { mot: 'Tes élèves', ...dims('eleves'), defilement: 0, cible: [217, 185], r: 42 },
    { mot: 'Ton agenda', ...dims('agenda'), defilement: 0, cible: [300, 678], r: 58 },
    { mot: 'Le pointage', ...dims('pointage'), defilement: 0, cible: [84, 992], r: 42 },
    { mot: 'Tes carnets', ...dims('fiche'), defilement: manifest.fiche.h - 1558, cible: manifest.reperes.carnet, r: 52 },
    { mot: 'Tes encaissements', ...dims('vente-moyens'), defilement: 250, cible: [525, 1156], r: 50 },
    { mot: 'L’URSSAF', ...dims('revenus'), defilement: 0, cible: [330, 903], r: 52 },
  ],
};
ECRANS.fin = ECRANS.debut + ECRANS.parEcran * ECRANS.liste.length; // 570

// ── Acte 4 : la frontière, dite sans détour ─────────────────────────────────
// Règle du guide freemium : jamais « gratuit » tout seul. Ce qui est payant se
// dit dans le réel, pas seulement dans la légende.
export const FRONTIERE = {
  de: 580,
  titre: 'Et le payant, alors ?',
  texte: 'Quand tes élèves réservent et paient elles-mêmes, en ligne.',
  sous: ['Complet, 29 € par mois, 30 jours pour voir.', 'Ensuite tu choisis. Rien ne se bloque.'],
  ecran: { ...dims('portail'), defilement: 3000, cible: [488, 3440], r: 88 },
};

// ── Acte 5 : l'appel ────────────────────────────────────────────────────────
// Deux portes, parce que le réel part sur trois réseaux : l'adresse (qu'on peut
// taper, et que LinkedIn laisse cliquer depuis la légende) et le commentaire
// (qui ouvre un DM, la seule chose qui a produit des conversations en septembre).
export const APPEL = {
  de: 720,
  titre: ['Ouvre ton studio.', 'C’est gratuit.'],
  domaine: 'izisolo.fr',
  sous: ['Sans carte bancaire, en cinq minutes.', 'Ou commente STUDIO, je t’envoie le lien.'],
  signature: 'Maude, prof de yoga, cofondatrice',
};
