// Les réglages PURS du réel « 0 € » : palette, formats, durées. Séparés de
// gratuit-scenes.js parce que ce dernier lit `public/manifest.json`, et qu'un
// import de JSON exige une attribute en Node pur (le script de rendu plantait
// sur ERR_IMPORT_ATTRIBUTE_MISSING). Même découpage que carrousel-palettes.js.

// ── La palette : lavande, sauge, rose ───────────────────────────────────────
// On sort du sable (même geste que le carrousel bleu nuit du 15/09 : le feed
// en est plein). Lavande profond en fond parce qu'un écran d'appli est clair :
// les mockups s'y détachent au lieu de s'y fondre. Le crème est celui de la
// charte, pour que la marque reste reconnaissable. Contrastes vérifiés contre
// le clair du dégradé (#5b4184) par reel/scripts/contraste-gratuit.mjs.
export const PALETTE = {
  fond: '#3b2a5c',        // lavande nuit
  fond2: '#5b4184',       // lavande
  creme: '#f7f2ea',       // le sable de la charte
  doux: '#d3c4ec',        // lavande clair, textes secondaires
  sauge: '#8fd7ae',       // le chiffre, une carte sur deux
  saugeEncre: '#14402c',  // encre sur une pastille sauge
  rose: '#f6a8bf',        // le pivot, une carte sur deux
  roseEncre: '#6d2038',   // encre sur une pastille rose
  encre: '#2a1f3d',       // encre sur le crème
  bezel: '#1d1730',       // le cadre du téléphone
};

// Les deux teintes vives en alternance, comme TEINTES dans le réel principal.
export const TEINTES = [PALETTE.sauge, PALETTE.rose];

// ── Les deux formats ────────────────────────────────────────────────────────
// `reel` : 9:16, ce que lisent Instagram, Facebook et LinkedIn en vertical.
// `feed` : 4:5, le format du fil LinkedIn et Facebook sur ordinateur.
// Les temps sont les MÊMES, seule la mise en page change : chaque profil écrit
// ses positions en toutes lettres, jamais un facteur d'échelle deviné.
export const PROFILS = {
  reel: {
    W: 1080, H: 1920,
    marge: 90,
    texteHaut: 300,        // zone sûre Instagram : rien d'essentiel au-dessus de 200
    puces: 1640,           // ni en dessous de 1650
    logo: 1690,
    tailles: { eyebrow: 30, ligne: 64, pivot: 88, frontiere: 74, chiffre: 300, chiffrePetit: 92, zeroLigne: 84, sous: 36, mot: 92, appel: 88, domaine: 68 },
    phone: { x: 277, y: 540, screenW: 470, hauteurEcran: 980 },
    phoneFrontiere: { x: 277, y: 940, screenW: 470, hauteurEcran: 660 },
    pastille: { x: 655, y: 468, taille: 62 },
  },
  feed: {
    W: 1080, H: 1350,
    marge: 80,
    texteHaut: 150,
    // Le telephone s'arrete AU-DESSUS des puces, sinon elles se perdent sur son
    // cadre sombre (vu sur la planche de contact du 4:5).
    puces: 1232,
    logo: 1276,
    tailles: { eyebrow: 26, ligne: 52, pivot: 70, frontiere: 60, chiffre: 230, chiffrePetit: 74, zeroLigne: 66, sous: 30, mot: 74, appel: 70, domaine: 56 },
    phone: { x: 350, y: 430, screenW: 380, hauteurEcran: 690 },
    phoneFrontiere: { x: 350, y: 560, screenW: 380, hauteurEcran: 620 },
    pastille: { x: 700, y: 372, taille: 48 },
  },
};

// 830 images à 30 i/s = 27,7 s : sous les 30 s, là où Instagram relance le réel.
export const DUREE = 830;

// L'image de couverture (Instagram la demande à part) : le « 0 € » installé,
// avec ses trois lignes, avant que le téléphone arrive.
export const IMAGE_COUVERTURE = 268;
