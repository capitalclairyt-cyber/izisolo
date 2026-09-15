// Les réglages du carrousel « Avis Google », dans un .js PUR : le script de
// rendu (Node, sans JSX) les lit aussi. Trois palettes hors sable : bleu nuit
// par défaut, rose en second choix, vert écarté par Colin le 2026-09-15 (le
// feed en a déjà). Le crème des cartes reprend le sable de la charte pour que
// la marque reste reconnaissable ; les étoiles sont or partout.
export const LARGEUR_CARROUSEL = 1080;
export const HAUTEUR_CARROUSEL = 1350;
export const NB_SLIDES = 8;
export const PALETTE_DEFAUT = 'bleu';

export const PALETTES = {
  bleu: { fond: '#1b3358', fond2: '#254470', texte: '#f2f1ea', doux: '#b8c6dd', or: '#efb84a', carte: '#f2f1ea', encre: '#1a2233', encreDouce: '#5d6778', accent: '#efb84a' },
  rose: { fond: '#5a2b3f', fond2: '#7a3a54', texte: '#fbf1ee', doux: '#e4bfcc', or: '#f1bd4f', carte: '#fbf1ee', encre: '#2e1a22', encreDouce: '#7a5f68', accent: '#f1bd4f' },
  vert: { fond: '#173d31', fond2: '#1f5040', texte: '#f6efe3', doux: '#b9d4c3', or: '#e9b44c', carte: '#f6efe3', encre: '#1f2a25', encreDouce: '#5c6b63', accent: '#e9b44c' },
};
