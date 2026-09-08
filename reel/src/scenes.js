// Ce que le réel montre, écran par écran. Tout mobile : chaque scène est une
// capture RÉELLE du démo Atelier Soleil (reel/public/, prise par
// scripts/shoot-reel-visuels.mjs, dimensions dans manifest.json), posée dans un
// téléphone, avec deux flèches qui visent un endroit PRÉCIS de l'image
// (coordonnées en px de la capture, 720 de large). Si une capture est refaite et
// que l'écran a bougé, ce sont ces coordonnées qu'il faut revoir.
import manifest from '../public/manifest.json';

const dims = (nom) => ({ src: `${nom}.jpg`, imgW: manifest[nom].w, imgH: manifest[nom].h });

// Téléphone à gauche : les cartes vivent à droite ; à droite : l'inverse.
const LARGEUR_ECRAN = 470;
const gauche = { x: 60, y: 470, screenW: LARGEUR_ECRAN };
const droite = { x: 1080 - 60 - LARGEUR_ECRAN - 56, y: 470, screenW: LARGEUR_ECRAN };
const carteDroite = (y) => ({ x: 560, y, w: 460, h: 120, cote: 'gauche' });
const carteGauche = (y) => ({ x: 60, y, w: 460, h: 120, cote: 'droite' });

// Un écran de téléphone = 1017 px de composition (la hauteur d'une capture de viewport).
const HAUTEUR_ECRAN = Math.round(1017);

export const SCENES = [
  {
    id: 'navigation',
    duree: 165,
    eyebrow: 'Sur ton téléphone',
    titre: ['Ton studio', 'dans ta poche.'],
    ecran: 'navigation',
    mockup: { ...dims('dashboard'), ...gauche, hauteurEcran: HAUTEUR_ECRAN },
    ecrans: { menu: dims('menu'), agenda: dims('agenda') },
    reperes: manifest.reperes,
    // Chronologie des gestes (images de la scène)
    tempo: { doigt: 26, tapBurger: 32, menuDe: 36, menuA: 50, versAgenda: 78, tapAgenda: 92, pageDe: 96, pageA: 112, doigtParti: 116 },
    callouts: [
      { cible: [140, 445], carte: carteDroite(700), courbure: 50, delai: 54, fin: 96,
        label: 'Tout est là', sous: 'Agenda, élèves, offres, revenus, messagerie' },
      { cible: [300, 678], carte: carteDroite(1000), courbure: -50, delai: 118,
        label: 'Ta semaine en un regard', sous: 'Séries récurrentes, vacances comprises' },
    ],
  },
  {
    id: 'pointage',
    duree: 112,
    eyebrow: 'Pointage',
    titre: ['Fais l’appel', 'en un clic.'],
    ecran: 'simple',
    mockup: { ...dims('pointage'), ...gauche },
    callouts: [
      { cible: [371, 788], carte: carteDroite(640), courbure: 60, delai: 24,
        label: 'Présences en un clic', sous: 'Depuis ton téléphone, sur le tapis' },
      { cible: [338, 990], carte: carteDroite(1090), courbure: -50, delai: 58,
        label: 'Carnets décomptés tout seuls', sous: 'Plus de comptes à refaire le soir' },
    ],
  },
  {
    id: 'portail',
    duree: 180,
    eyebrow: 'Côté élève',
    titre: ['Ta page publique,', 'sans site web.'],
    ecran: 'defilement',
    mockup: { ...dims('portail'), ...droite, hauteurEcran: HAUTEUR_ECRAN },
    // Défilement de la capture (px de capture) : on lit la vitrine, puis on descend au planning.
    defilement: [{ frame: 0, y: 0 }, { frame: 56, y: 0 }, { frame: 100, y: 2540 }, { frame: 180, y: 2540 }],
    callouts: [
      { cible: [360, 1190], carte: carteGauche(1150), courbure: 70, delai: 22, fin: 62,
        label: 'Ta vitrine à toi', sous: 'Photos, bio, tarifs, cours d’essai' },
      { cible: [488, 3440], carte: carteGauche(1000), courbure: -60, delai: 106,
        label: 'Réservation en ligne', sous: 'Sans compte, en trois secondes' },
    ],
  },
  {
    id: 'revenus',
    duree: 112,
    eyebrow: 'Revenus',
    titre: ['Tes revenus,', 'sans tableur.'],
    ecran: 'simple',
    mockup: { ...dims('revenus'), ...droite },
    callouts: [
      { cible: [478, 418], carte: carteGauche(560), courbure: 60, delai: 24,
        label: 'Encaissé et à percevoir', sous: 'En un regard, à jour à chaque paiement' },
      { cible: [300, 938], carte: carteGauche(1000), courbure: -60, delai: 58,
        label: 'Déclaration URSSAF', sous: 'Le montant à recopier, prêt à chaque échéance' },
    ],
  },
  {
    id: 'messagerie',
    duree: 112,
    eyebrow: 'Messagerie',
    titre: ['Un fil direct', 'avec tes élèves.'],
    ecran: 'simple',
    mockup: { ...dims('messagerie'), ...gauche },
    callouts: [
      { cible: [420, 312], carte: carteDroite(600), courbure: 60, delai: 24,
        label: 'Annonces et photos', sous: 'Tes élèves répondent, sans groupe WhatsApp' },
      { cible: [606, 1128], carte: carteDroite(1080), courbure: -50, delai: 58,
        label: 'Personne ne rate l’info', sous: 'Notification et email à chaque message' },
    ],
  },
];
