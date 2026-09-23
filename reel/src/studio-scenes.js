// Le réel « plan Studio » (2026-09-23, décision Colin après le réel « 0 € » qui a
// ramené Romain et Aurore : « on attaque les studios avec une belle offre de
// lancement »). Tout est ici, en .js PUR sauf le manifest : le script de rendu
// lit studio-formats.js.
//
// Ce qu'il raconte, dans l'ordre : la fin de mois d'une patronne de studio (sur
// une VRAIE photo de studio Reformer de la banque), le chiffre plein écran
// (59 €, toutes tes profs comprises), cinq écrans RÉELS du plan Studio pris sur
// un studio seedé pour l'occasion (scripts/shoot-reel-studio.mjs), l'acte « pas
// une usine à gaz » (sur la photo du studio de danse) qui dit ce que le plan fait
// ET ce qu'il ne fait pas, puis l'appel : l'offre de lancement et le DM.
//
// Règles tenues : tutoiement, aucun chiffre non mesuré, aucun concurrent nommé,
// rien que le produit ne fasse pas, et la frontière (ce qui n'est pas fait,
// ce qui coûte après la remise) dite aussi gros que la promesse.
//
// ⚠️ Le fichier ne s'appelle pas `studio.js` : à côté de `Studio.jsx`, sur un
// disque insensible à la casse, `./studio` et `./Studio` se confondent (piège
// de pov.js, 2026-09-10).
import manifest from '../public/manifest.json';

export const dims = (nom) => ({ src: `${nom}.jpg`, imgW: manifest[nom].w, imgH: manifest[nom].h });

export { PALETTE, TEINTES, PROFILS, DUREE, IMAGE_COUVERTURE } from './studio-formats';

// ── Les photos de la banque ─────────────────────────────────────────────────
// Deux vraies photos de studio (public/icons/persona-pilates.jpg, le Reformer
// sur mur vert ; persona-danse.jpg, la scène de danse) et le portrait de Maude
// devant son enseigne, redimensionnés dans public/ par scripts/shoot-reel-studio
// (sharp, hauteur 1920). Elles s'affichent sous un voile sombre : le texte
// reste lisible, la photo donne le lieu.
export const PHOTOS = {
  reformer: 'photo-studio-reformer.jpg',
  danse: 'photo-studio-danse.jpg',
  maude: 'photo-maude.jpg',
};

// ── Acte 1 : la fin de mois, sur la photo du studio Reformer ────────────────
export const ACTE1 = {
  eyebrow: 'Fin de mois, 21 h',
  lignes: [
    { texte: 'Tu recomptes les séances de chaque prof.', apparait: 8 },
    { texte: 'Tu vérifies qu’aucune salle n’est prise deux fois.', apparait: 50 },
    { texte: 'Tu devines quel cours te fait vivre.', apparait: 92 },
  ],
  pivot: { texte: ['Il existe un outil qui fait ça.', 'Sans le reste.'], apparait: 128 },
  fin: 178,
};

// ── Acte 2 : le chiffre, plein écran ────────────────────────────────────────
export const PRIX = {
  de: 178, chiffre: 186, lignes: 216, sous: 248, fin: 300,
  eyebrow: 'Le plan Studio',
  chiffre_texte: '59 €',
  lignesTexte: ['par mois.', 'Toutes tes profs comprises.'],
  sousTexte: ['Pas de prix par intervenante.', 'Pas d’engagement.', 'Pas d’usine à gaz.'],
};

// ── Acte 3 : cinq écrans réels, un mot chacun ───────────────────────────────
// Chaque écran est une capture d'un studio seedé (Studio Ondine : deux profs
// rémunérées, deux salles, un mois de séances pointées, des dépenses réglées),
// et chaque mot désigne quelque chose que le plan Studio fait vraiment.
// `defilement` en px de capture : ce que le téléphone montre en premier.
// `r` = le rayon de l'anneau, relu sur l'image rendue, jamais deviné.
export const ECRANS = {
  eyebrow: 'Ce que le plan Studio fait pour toi',
  arrivee: 304,
  debut: 308,
  parEcran: 52,
  liste: [
    { mot: 'Tes profs, payées juste', ...dims('studio-equipe'), defilement: 0, cible: manifest.reperes.studioRemu, r: 46 },
    { mot: 'Tes salles', ...dims('studio-salles'), defilement: 800, cible: manifest.reperes.studioSalle, r: 62 },
    { mot: 'Une salle, un cours', ...dims('studio-chevauchement'), defilement: 0, cible: manifest.reperes.studioToast, r: 84 },
    { mot: 'Leurs relevés, tout seuls', ...dims('studio-releve'), defilement: 900, cible: manifest.reperes.studioReleve, r: 54 },
    { mot: 'Ta marge, enfin', ...dims('studio-analyse'), defilement: 790, cible: manifest.reperes.studioResultat, r: 54 },
  ],
};
ECRANS.fin = ECRANS.debut + ECRANS.parEcran * ECRANS.liste.length; // 568

// ── Acte 4 : pas une usine à gaz, sur la photo du studio de danse ───────────
// Ce que le plan fait ET ce qu'il ne fait pas : la vitrine /studios le dit
// déjà, le réel le dit aussi gros. « Pensé avec des profs » : Maude est prof et
// cofondatrice, c'est vrai et vérifiable, on ne prétend rien de plus.
export const ESSENTIEL = {
  de: 578,
  eyebrow: 'Pas une usine à gaz',
  texte: ['L’essentiel d’un studio.', 'Pensé avec des profs.'],
  sous: [
    'Planning, salles, profs, relevés, marge, élèves, paiements.',
    'Pas de paie, pas de partie double : ton comptable garde son métier.',
  ],
  fin: 698,
};

// ── Acte 5 : l'offre et le DM ───────────────────────────────────────────────
// Le geste demandé est le message privé (c'est ce qui a produit les conversations
// de septembre) ; le like se demande dans la légende, jamais comme condition
// (Meta déclasse les appels explicites au like). Le code n'est pas « secret »,
// il est écrit sur la landing : le DM est la porte la plus courte pour l'avoir
// AVEC l'installation offerte.
export const APPEL = {
  de: 704,
  eyebrow: 'Offre de lancement',
  titre: ['Studio à moitié prix', 'pendant trois mois.'],
  bouton: 'Envoie STUDIO en message',
  sous: [
    '29,50 € par mois pour démarrer, puis 59 €. Jusqu’au 31 décembre.',
    'Je t’envoie le code, et j’installe ton studio avec toi, gratuitement.',
  ],
  signature: 'Maude, prof de yoga, cofondatrice',
};
