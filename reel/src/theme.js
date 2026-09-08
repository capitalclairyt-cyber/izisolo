// La charte de la landing v3 (palette sable, Fraunces + Inter, cuivre),
// les mêmes hex que scripts/shoot-facebook-visuels.mjs.
import { loadFont as loadFraunces } from '@remotion/google-fonts/Fraunces';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';

const fraunces = loadFraunces('normal', { weights: ['500', '600'], subsets: ['latin'] });
const inter = loadInter('normal', { weights: ['400', '500', '600'], subsets: ['latin'] });

export const FONT_DISPLAY = `${fraunces.fontFamily}, Georgia, serif`;
export const FONT_BODY = `${inter.fontFamily}, system-ui, sans-serif`;

export const P = {
  bgFrom: '#faf4ec',
  bgTo: '#f3eadd',
  ink: '#2c2118',
  inkSoft: '#7a6b5c',
  accent: '#b9794d',
  accentDeep: '#8f5a37',
  sage: '#6f8f5e',
  blanc: '#ffffff',
  bezel: '#1a1512',
};

// Les deux teintes vives des cartes de points forts, en alternance : elles
// tranchent avec le sable (demande Colin, 2026-09-08).
export const TEINTES = ['#c4552a', '#3b7d5e'];

// Format du réel : 9:16, 30 images par seconde.
export const W = 1080;
export const H = 1920;
export const FPS = 30;

// Durées (en images). Les transitions se chevauchent : la durée totale est
// la somme des séquences moins les transitions (calculée dans Root.jsx).
export const DUREE_INTRO = 78;
export const DUREE_OUTRO = 108;
export const DUREE_TRANSITION = 14;
