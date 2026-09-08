// Ce que le réel montre, écran par écran. Tout mobile : chaque scène est une
// capture RÉELLE du démo Atelier Soleil (reel/public/, prise par
// scripts/shoot-reel-visuels.mjs, dimensions dans manifest.json), posée dans un
// téléphone, avec deux flèches qui visent un endroit PRÉCIS de l'image
// (coordonnées en px de la capture, 720 de large). Si une capture est refaite et
// que l'écran a bougé, ce sont ces coordonnées qu'il faut revoir.
//
// L'ordre suit la journée d'une prof : elle ouvre l'app, crée son cours et son
// offre, ses élèves réservent, elle pointe, elle encaisse, elle voit ses
// revenus, elle écrit à ses élèves.
import manifest from '../public/manifest.json';

const dims = (nom) => ({ src: `${nom}.jpg`, imgW: manifest[nom].w, imgH: manifest[nom].h });

// Téléphone à gauche : les cartes vivent à droite ; à droite : l'inverse.
const LARGEUR_ECRAN = 470;
const gauche = { x: 60, y: 470, screenW: LARGEUR_ECRAN };
const droite = { x: 1080 - 60 - LARGEUR_ECRAN - 56, y: 470, screenW: LARGEUR_ECRAN };
const carteDroite = (y) => ({ x: 560, y, w: 460, h: 120, cote: 'gauche' });
const carteGauche = (y) => ({ x: 60, y, w: 460, h: 120, cote: 'droite' });

// Un écran de téléphone = 1017 px de composition (la hauteur d'une capture de viewport).
const HAUTEUR_ECRAN = 1017;
const R = manifest.reperes;

export const SCENES = [
  {
    id: 'navigation',
    duree: 150,
    eyebrow: 'Sur ton téléphone',
    titre: ['Ton studio', 'dans ta poche.'],
    mockup: { ...dims('dashboard'), ...gauche, hauteurEcran: HAUTEUR_ECRAN },
    // Le doigt appuie sur le burger, le menu se déplie ; un second doigt choisit « Agenda ».
    taps: [
      { repere: R.burger, apparait: 22, presse: 30, disparait: 40 },
      { repere: R.agenda, apparait: 74, presse: 84, disparait: 94 },
    ],
    etapes: [
      { ecran: dims('menu'), effet: 'volet', de: 34, a: 48 },
      { ecran: dims('agenda'), effet: 'glisse', de: 88, a: 104 },
    ],
    callouts: [
      { cible: [95, 613], carte: carteDroite(700), courbure: 50, delai: 50, fin: 88,
        label: 'Tout est là', sous: 'Agenda, élèves, offres, revenus, messagerie' },
      { cible: [300, 678], carte: carteDroite(1000), courbure: -50, delai: 108,
        label: 'Ta semaine en un regard', sous: 'Séries récurrentes, vacances comprises' },
    ],
  },
  {
    id: 'cours',
    duree: 150,
    eyebrow: 'Créer un cours',
    titre: ['Une série,', 'en deux minutes.'],
    mockup: { ...dims('cours'), ...droite, hauteurEcran: HAUTEUR_ECRAN },
    defilement: [{ frame: 0, y: 0 }, { frame: 44, y: 0 }, { frame: 84, y: 2450 }, { frame: 150, y: 2450 }],
    callouts: [
      { cible: [521, 833], carte: carteGauche(560), courbure: 60, delai: 20, fin: 50,
        label: 'Unique ou régulier', sous: 'Type, heure, durée, lieu, capacité' },
      { cible: [300, 3357], carte: carteGauche(1000), courbure: -60, delai: 90,
        label: '12 séances créées d’un coup', sous: 'Vacances et fériés sautés' },
    ],
  },
  {
    id: 'offre',
    duree: 150,
    eyebrow: 'Créer une offre',
    titre: ['Carnets et abos,', 'à ta façon.'],
    mockup: { ...dims('offre'), ...gauche, hauteurEcran: HAUTEUR_ECRAN },
    defilement: [{ frame: 0, y: 0 }, { frame: 44, y: 0 }, { frame: 84, y: 1200 }, { frame: 150, y: 1200 }],
    callouts: [
      { cible: [400, 366], carte: carteDroite(560), courbure: 60, delai: 20, fin: 50,
        label: 'Carnet ou abonnement', sous: 'Séances, validité, prix' },
      { cible: [170, 1620], carte: carteDroite(1000), courbure: -60, delai: 90,
        label: 'Décompté sur les bons cours', sous: 'Tu choisis les types couverts' },
    ],
  },
  {
    id: 'portail',
    duree: 170,
    eyebrow: 'Côté élève',
    titre: ['Ta page publique,', 'sans site web.'],
    mockup: { ...dims('portail'), ...droite, hauteurEcran: HAUTEUR_ECRAN },
    // Défilement de la capture (px de capture) : on lit la vitrine, puis on descend au planning.
    defilement: [{ frame: 0, y: 0 }, { frame: 50, y: 0 }, { frame: 94, y: 2540 }, { frame: 170, y: 2540 }],
    callouts: [
      { cible: [360, 1190], carte: carteGauche(1150), courbure: 70, delai: 20, fin: 56,
        label: 'Ta vitrine à toi', sous: 'Photos, bio, tarifs, cours d’essai' },
      { cible: [488, 3440], carte: carteGauche(1000), courbure: -60, delai: 100,
        label: 'Réservation en ligne', sous: 'Sans compte, en trois secondes' },
    ],
  },
  {
    id: 'pointage',
    duree: 100,
    eyebrow: 'Pointage',
    titre: ['Fais l’appel', 'en un clic.'],
    mockup: { ...dims('pointage'), ...gauche },
    callouts: [
      { cible: [371, 788], carte: carteDroite(640), courbure: 60, delai: 20,
        label: 'Présences en un clic', sous: 'Depuis ton téléphone, sur le tapis' },
      { cible: [338, 990], carte: carteDroite(1090), courbure: -50, delai: 52,
        label: 'Carnets décomptés tout seuls', sous: 'Plus de comptes à refaire le soir' },
    ],
  },
  {
    id: 'vente',
    duree: 150,
    eyebrow: 'Encaisser',
    titre: ['Comme tes élèves', 'te paient.'],
    mockup: { ...dims('vente-moyens'), ...droite, hauteurEcran: HAUTEUR_ECRAN },
    // Espèces + CB le même jour ; puis le doigt bascule sur « En plusieurs fois ».
    taps: [{ repere: R.plusieursFois, apparait: 72, presse: 82, disparait: 92 }],
    etapes: [{ ecran: dims('vente-echeancier'), effet: 'fondu', de: 84, a: 96 }],
    callouts: [
      { cible: [520, 1104], carte: carteGauche(620), courbure: 60, delai: 20, fin: 84,
        label: 'Plusieurs moyens', sous: 'Espèces + carte le même jour, chacun en compta' },
      { cible: [620, 927], carte: carteGauche(1000), courbure: -60, delai: 100,
        label: 'Ou en plusieurs fois', sous: 'Un échéancier, le reste s’encaisse en un clic' },
    ],
  },
  {
    id: 'revenus',
    duree: 100,
    eyebrow: 'Revenus',
    titre: ['Tes revenus,', 'sans tableur.'],
    mockup: { ...dims('revenus'), ...gauche },
    callouts: [
      { cible: [478, 418], carte: carteDroite(560), courbure: 60, delai: 20,
        label: 'Encaissé et à percevoir', sous: 'En un regard, à jour à chaque paiement' },
      { cible: [300, 938], carte: carteDroite(1000), courbure: -60, delai: 52,
        label: 'Déclaration URSSAF', sous: 'Le montant à recopier, prêt à chaque échéance' },
    ],
  },
  {
    id: 'messagerie',
    duree: 100,
    eyebrow: 'Messagerie',
    titre: ['Un fil direct', 'avec tes élèves.'],
    mockup: { ...dims('messagerie'), ...droite },
    callouts: [
      { cible: [420, 312], carte: carteGauche(600), courbure: 60, delai: 20,
        label: 'Annonces et photos', sous: 'Tes élèves répondent, sans groupe WhatsApp' },
      { cible: [606, 1128], carte: carteGauche(1080), courbure: -50, delai: 52,
        label: 'Personne ne rate l’info', sous: 'Notification et email à chaque message' },
    ],
  },
];
