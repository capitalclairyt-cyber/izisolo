// Les réglages PURS du réel « plan Studio » (2026-09-23) : palette, formats,
// durées. Séparés de studio-scenes.js parce que ce dernier lit
// `public/manifest.json`, qu'un script Node ne peut pas importer sans attribute
// (ERR_IMPORT_ATTRIBUTE_MISSING). Même découpage que gratuit-formats.js.

// ── La palette : charbon chaud, cuivre, sauge ───────────────────────────────
// Le réel « 0 € » était lavande, le carrousel Avis bleu nuit, le feed est plein
// de sable : celui-ci est CHARBON CHAUD, parce qu'il s'ouvre sur des PHOTOS de
// studios (les deux de la banque) et qu'un voile sombre les tient lisibles sous
// le texte. Le cuivre est celui de la charte, le crème aussi : la marque reste
// reconnaissable. Le chiffre et une carte sur deux sont cuivre, l'autre sauge.
export const PALETTE = {
  fond: '#241d1b',        // charbon chaud
  fond2: '#3d2f2a',       // brun profond
  creme: '#f7f2ea',       // le sable de la charte
  doux: '#d8c9bb',        // textes secondaires
  cuivre: '#e2a76f',      // le chiffre, une carte sur deux
  cuivreEncre: '#3a2410', // encre sur une pastille cuivre
  sauge: '#9fd3b4',       // une carte sur deux
  saugeEncre: '#14402c',
  encre: '#2a1f1b',       // encre sur le crème
  bezel: '#15100e',       // le cadre du téléphone
};

export const TEINTES = [PALETTE.cuivre, PALETTE.sauge];

// ── Les deux formats ────────────────────────────────────────────────────────
// `reel` : 9:16 (Instagram, Facebook, LinkedIn vertical). `feed` : 4:5 (le fil
// LinkedIn et Facebook sur ordinateur). Mêmes temps, mise en page écrite en
// toutes lettres par profil, jamais un facteur d'échelle deviné.
export const PROFILS = {
  reel: {
    W: 1080, H: 1920,
    marge: 90,
    texteHaut: 300,        // zone sûre Instagram : rien d'essentiel au-dessus de 200
    puces: 1640,           // ni en dessous de 1650
    logo: 1690,
    tailles: { eyebrow: 30, hook: 118, ligne: 62, pivot: 82, frontiere: 70, chiffre: 300, chiffrePetit: 92, zeroLigne: 76, sous: 36, mot: 84, appel: 84, domaine: 58 },
    phone: { x: 277, y: 560, screenW: 470, hauteurEcran: 960 },
    pastille: { x: 655, y: 488, taille: 58 },
    avatar: { taille: 220 },
  },
  feed: {
    W: 1080, H: 1350,
    marge: 80,
    texteHaut: 150,
    puces: 1232,
    logo: 1276,
    tailles: { eyebrow: 26, hook: 92, ligne: 50, pivot: 66, frontiere: 56, chiffre: 230, chiffrePetit: 74, zeroLigne: 60, sous: 30, mot: 68, appel: 66, domaine: 48 },
    phone: { x: 350, y: 440, screenW: 380, hauteurEcran: 680 },
    pastille: { x: 700, y: 382, taille: 46 },
    avatar: { taille: 170 },
  },
};

// 850 images à 30 i/s = 28,3 s : sous les 30 s où Instagram relance le réel.
export const DUREE = 850;

// L'image de couverture (Instagram la demande à part) : le « 59 € » installé,
// avec « toutes tes profs comprises » et les trois « pas de ».
export const IMAGE_COUVERTURE = 272;
