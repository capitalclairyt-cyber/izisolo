// Ce que le réel montre, écran par écran. Chaque scène = une capture RÉELLE du
// démo Atelier Soleil (public/icons/landing/, dimensions dans manifest.json) et
// deux flèches qui pointent un endroit PRÉCIS de l'image (coordonnées en pixels
// de la capture). Si une capture est refaite et que l'écran a bougé, ce sont
// ces coordonnées qu'il faut revoir.
import manifest from '../../public/icons/landing/manifest.json';

const dims = (nom) => ({ src: `${nom}.jpg`, imgW: manifest[nom].w, imgH: manifest[nom].h });

// Téléphone à gauche : les cartes vivent à droite ; à droite : l'inverse.
const PHONE_LARGEUR = 470;
const phoneGauche = { x: 60, y: 470, screenW: PHONE_LARGEUR };
const phoneDroite = { x: 1080 - 60 - PHONE_LARGEUR - 56, y: 470, screenW: PHONE_LARGEUR };
const carteDroite = (y) => ({ x: 560, y, w: 460, h: 120, cote: 'gauche' });
const carteGauche = (y) => ({ x: 60, y, w: 460, h: 120, cote: 'droite' });
const carteBas = (x, y) => ({ x, y, w: 470, h: 120, cote: 'haut' });

export const SCENES = [
  {
    id: 'agenda',
    eyebrow: 'Agenda',
    titre: ['Ta semaine, posée', 'une fois pour toutes.'],
    mockup: { type: 'navigateur', ...dims('row-agenda'), x: 40, y: 540, w: 1000, echelle: 1.15, panDe: -20, panA: -380 },
    callouts: [
      { cible: [505, 327], carte: carteBas(60, 1230), courbure: -70, delai: 24,
        label: 'Séries récurrentes', sous: 'Créées d’avance, vacances comprises' },
      { cible: [530, 40], carte: carteBas(550, 1230), courbure: 90, delai: 58,
        label: 'Jour, semaine ou mois', sous: 'La vue qui te parle, sur mobile aussi' },
    ],
  },
  {
    id: 'pointage',
    eyebrow: 'Pointage',
    titre: ['Fais l’appel', 'en un clic.'],
    mockup: { type: 'telephone', ...dims('hero-pointage'), ...phoneGauche },
    callouts: [
      { cible: [330, 700], carte: carteDroite(640), courbure: 60, delai: 24,
        label: 'Présences en un clic', sous: 'Depuis ton téléphone, sur le tapis' },
      { cible: [300, 880], carte: carteDroite(1090), courbure: -50, delai: 58,
        label: 'Carnets décomptés tout seuls', sous: 'Plus de comptes à refaire le soir' },
    ],
  },
  {
    id: 'portail',
    eyebrow: 'Réservation',
    titre: ['Tes élèves', 'réservent seules.'],
    mockup: { type: 'telephone', ...dims('row-portail'), ...phoneDroite },
    callouts: [
      { cible: [325, 47], carte: carteGauche(560), courbure: 60, delai: 24,
        label: 'Ta page publique', sous: 'Planning, tarifs, à propos' },
      { cible: [405, 615], carte: carteGauche(1040), courbure: -60, delai: 58,
        label: 'Réservation en ligne', sous: 'Sans compte, en trois secondes' },
    ],
  },
  {
    id: 'revenus',
    eyebrow: 'Revenus',
    titre: ['Tes revenus,', 'sans tableur.'],
    mockup: { type: 'navigateur', ...dims('row-revenus'), x: 40, y: 500, w: 1000, echelle: 1.1, panDe: 0, panA: -150, hVisible: 700 },
    callouts: [
      { cible: [350, 255], carte: carteBas(60, 1330), courbure: -60, delai: 24,
        label: 'Encaissé et à percevoir', sous: 'En un regard, à jour à chaque paiement' },
      { cible: [220, 380], carte: carteBas(550, 1330), courbure: 80, delai: 58,
        label: 'Déclaration URSSAF', sous: 'Le montant à recopier, prêt à chaque échéance' },
    ],
  },
  {
    id: 'messagerie',
    eyebrow: 'Messagerie',
    titre: ['Un fil direct', 'avec tes élèves.'],
    mockup: { type: 'telephone', ...dims('row-messagerie'), ...phoneGauche },
    callouts: [
      { cible: [350, 260], carte: carteDroite(600), courbure: 60, delai: 24,
        label: 'Annonces et photos', sous: 'Tes élèves répondent, sans groupe WhatsApp' },
      { cible: [505, 940], carte: carteDroite(1080), courbure: -50, delai: 58,
        label: 'Personne ne rate l’info', sous: 'Notification et email à chaque message' },
    ],
  },
];
