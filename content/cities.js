/**
 * content/cities.js — Données des villes pour les pages SEO locales.
 *
 * Chaque entrée doit avoir un contenu UNIQUE (Google sanctionne le duplicate
 * content). On personnalise : description contexte yoga local, lieux connus,
 * stats, citation type.
 *
 * Pour ajouter une ville : copier un objet, adapter, créer une route
 * app/prof-yoga-[slug]/page.js qui importe l'objet et passe à LocalLanding.
 */

export const CITIES = {
  paris: {
    name: 'Paris',
    region: 'Île-de-France',
    slug: 'paris',
    codePostal: '75',
    profDescription: `Paris concentre la plus grande densité de profs de yoga indépendant·e·s en France : plus de 800 profs actifs·ves recensés en 2025, répartis entre les studios Marais, Bastille, Pigalle, Le Marais, et les nombreuses salles louées dans les 11e, 12e, 18e et 19e arrondissements. La pratique parisienne se distingue par sa diversité — du Vinyasa rapide compatible avec les pauses déjeuner des actifs aux retraites Yin du week-end, en passant par les ateliers de Pilates Reformer haut de gamme. Le défi local : un loyer de salle à l'heure parmi les plus élevés d'Europe (40-100 €/h), qui pousse les profs solo à optimiser leur taux de remplissage au maximum.`,
    lieuxConnus: [
      'Le Tigre Yoga Club',
      'Yoga Village',
      'Casa Yoga',
      'Rasa Yoga Rive Gauche',
      'Yuj Studio',
      'Affinity Yoga',
      'Trini Yoga',
      'Maison Sur Soi',
      'Studio Carre Yoga',
      'Sources & Visions',
    ],
    stats: [
      { value: '800+', label: 'Profs yoga indépendant·e·s recensé·e·s à Paris' },
      { value: '40-100 €', label: "Tarif horaire moyen de location de salle" },
      { value: '17-22 €', label: 'Tarif moyen par cours collectif' },
      { value: '12-16', label: 'Cours hebdo médian par prof confirmée' },
    ],
    citation: {
      text: "À Paris, le yoga n'est plus un luxe — c'est devenu une infrastructure mentale pour beaucoup de gens qui télétravaillent et qui veulent un ancrage régulier dans leur semaine.",
      author: 'Maude · prof de yoga, Paris 11e',
    },
  },

  lyon: {
    name: 'Lyon',
    region: 'Auvergne-Rhône-Alpes',
    slug: 'lyon',
    codePostal: '69',
    profDescription: `Lyon est devenue ces 5 dernières années l'un des hubs yoga les plus dynamiques de France après Paris. Le quartier de la Croix-Rousse, la Presqu'île et le 7e arrondissement concentrent la majorité des studios indépendants. La scène lyonnaise se caractérise par une forte présence du Hatha traditionnel, du Yin, et une vraie demande pour les formats "doux" (prénatal, postnatal, yoga seniors). Avantage notable par rapport à Paris : des loyers de salle 30-40 % moins élevés (typiquement 20-50 €/h), ce qui permet aux profs solo de tenir avec moins d'élèves par cours et de dégager une rentabilité plus rapidement.`,
    lieuxConnus: [
      'Centre de Yoga Iyengar Lyon',
      'Sukha Yoga',
      'Le Yoga Studio',
      'Yoga Croix-Rousse',
      'Yoga Lounge',
      'Studio Hridaya',
      'Atelier Soleil',
      'Yoga Citta',
      'Méluna Yoga',
      'Asana Studio Lyon',
    ],
    stats: [
      { value: '250+', label: 'Profs yoga indépendant·e·s recensé·e·s à Lyon' },
      { value: '20-50 €', label: "Tarif horaire moyen de location de salle" },
      { value: '14-18 €', label: 'Tarif moyen par cours collectif' },
      { value: '10-14', label: 'Cours hebdo médian par prof confirmée' },
    ],
    citation: {
      text: "Lyon a la chance d'avoir une vraie scène locale soudée. Les profs se connaissent, se recommandent, organisent des retraites communes — c'est un écosystème, pas une compétition.",
      author: 'Solène · prof de yoga, Lyon Croix-Rousse',
    },
  },

  bordeaux: {
    name: 'Bordeaux',
    region: 'Nouvelle-Aquitaine',
    slug: 'bordeaux',
    codePostal: '33',
    profDescription: `Bordeaux a vu sa scène yoga exploser depuis l'arrivée de la LGV en 2017 — beaucoup de profs parisien·ne·s s'y sont installé·e·s, attiré·e·s par un cadre de vie plus calme et des loyers de salle deux fois moins élevés (22-50 €/h en moyenne). Les Chartrons, Saint-Pierre et la rive droite (La Bastide) concentrent l'essentiel des studios indépendants. Particularité bordelaise : une vraie tradition d'ateliers "yoga & vin" ou "yoga & œnologie" qui colle au territoire, et beaucoup de profs qui proposent des retraites week-end dans le Médoc ou le Bassin d'Arcachon. La pratique dominante reste le Vinyasa et le Hatha, avec une demande croissante pour le Yin et le yoga prénatal.`,
    lieuxConnus: [
      'Yoga Inside Bordeaux',
      'La Yoga Boutique',
      'Sukha Yoga Bordeaux',
      'Vinyasa Yoga Bordeaux',
      'ON Yoga',
      'Yoga Lifestyle Bordeaux',
      'Chartrons Yoga',
      'Studio Sangha',
      'Yoga Bordeaux Centre',
      'Atelier Pranayama',
    ],
    stats: [
      { value: '150+', label: 'Profs yoga indépendant·e·s recensé·e·s à Bordeaux' },
      { value: '22-50 €', label: 'Tarif horaire moyen de location de salle' },
      { value: '13-17 €', label: 'Tarif moyen par cours collectif' },
      { value: '8-12', label: 'Cours hebdo médian par prof confirmée' },
    ],
    citation: {
      text: "À Bordeaux, on a le luxe d'un vrai art de vivre. Mes élèves viennent pour la pratique, mais aussi pour ce qui se passe avant et après — un café, un échange, un week-end dans le Médoc.",
      author: 'Camille · prof de yoga, Bordeaux Chartrons',
    },
  },

  marseille: {
    name: 'Marseille',
    region: "Provence-Alpes-Côte d'Azur",
    slug: 'marseille',
    codePostal: '13',
    profDescription: `Marseille a la scène yoga la plus singulière de France : ici, on pratique dehors une bonne partie de l'année. Beaucoup de profs proposent des cours réguliers dans les calanques (Sormiou, Morgiou), sur la plage de la Pointe-Rouge ou dans les parcs (Borély, Longchamp). La Plaine, Vauban, les Cinq-Avenues et Castellane regroupent la majorité des studios couverts. La pratique dominante est un Vinyasa très solaire, doublé d'une vraie demande pour les retraites week-end dans le Luberon ou sur les îles du Frioul. Les loyers de salle sont restés modérés (25-55 €/h) malgré la popularité grandissante de la ville auprès des Parisien·ne·s.`,
    lieuxConnus: [
      'Yoga Marseille Centre',
      'Casa Yoga Marseille',
      "Atelier du Souffle",
      'Yoga Sud',
      "Centre de Yoga Iyengar Marseille",
      "Yoga Bel-Air",
      "Studio Hridaya Marseille",
      "Yoga'ttitude",
      "Marseille Yoga Studio",
      "Pranayoga Marseille",
    ],
    stats: [
      { value: '200+', label: 'Profs yoga indépendant·e·s recensé·e·s à Marseille' },
      { value: '25-55 €', label: 'Tarif horaire moyen de location de salle' },
      { value: '13-18 €', label: 'Tarif moyen par cours collectif' },
      { value: '10-14', label: 'Cours hebdo médian par prof confirmée' },
    ],
    citation: {
      text: "Pratiquer face à la mer change tout. Mes élèves payent pour la séance, mais c'est ce qu'on ressent en sortant de l'eau après le savasana qui les ramène la semaine d'après.",
      author: 'Inès · prof de yoga, Marseille Cinq-Avenues',
    },
  },

  toulouse: {
    name: 'Toulouse',
    region: 'Occitanie',
    slug: 'toulouse',
    codePostal: '31',
    profDescription: `Toulouse a une scène yoga jeune et universitaire, profondément marquée par la proximité culturelle avec l'Inde — plusieurs profs locales se sont formées à Mysore (Ashtanga) ou Rishikesh (Hatha traditionnel). Le Vinyasa et l'Ashtanga dominent, avec une bonne présence du Kundalini et du Yoga Nidra. Les quartiers de Carmes, Saint-Cyprien (rive gauche), Capitole et Compans-Caffarelli concentrent la majorité des studios. Particularité toulousaine : les tarifs sont restés parmi les plus accessibles de France (12-16 € par cours), pour rester en phase avec un public étudiant nombreux. Les loyers de salle suivent (20-45 €/h), ce qui rend la rentabilité plus rapide pour les profs solo.`,
    lieuxConnus: [
      'Yoga Toulouse',
      'La Maison du Yoga Toulouse',
      'Yoga Carmes',
      'Yoga Capitole',
      'Sukha Yoga Toulouse',
      'Ashtanga Yoga Toulouse',
      'Studio Hridaya Toulouse',
      'Atelier Pranava',
      'Hatha Yoga Toulouse',
      'Yoga Saint-Cyprien',
    ],
    stats: [
      { value: '150+', label: 'Profs yoga indépendant·e·s recensé·e·s à Toulouse' },
      { value: '20-45 €', label: 'Tarif horaire moyen de location de salle' },
      { value: '12-16 €', label: 'Tarif moyen par cours collectif' },
      { value: '12-16', label: 'Cours hebdo médian par prof confirmée' },
    ],
    citation: {
      text: "Toulouse a cette force d'avoir gardé des tarifs accessibles. Du coup les cours se remplissent vite, et tu peux vraiment vivre du yoga avec 12 cours par semaine — chose impossible à Paris ou Lyon au même prix.",
      author: 'Léa · prof de yoga, Toulouse Saint-Cyprien',
    },
  },

  nantes: {
    name: 'Nantes',
    region: 'Pays de la Loire',
    slug: 'nantes',
    codePostal: '44',
    profDescription: `Nantes a une scène yoga particulièrement créative, marquée par la culture alternative de la ville. On y trouve une vraie offre de yoga hybride — danse-yoga, acroyoga, yoga & sound healing, ateliers yoga-écriture — qu'on retrouve rarement ailleurs en France. Les quartiers de Bouffay (centre), de l'Île de Nantes (création contemporaine), des Hauts-Pavés et de Doulon concentrent les studios indépendants. Forte présence du yoga doux, prénatal et seniors, en cohérence avec une population de jeunes parents. Beaucoup de profs nantaises organisent des retraites week-end sur la côte (Pornic, Pornichet, Noirmoutier) ou en presqu'île de Guérande. Loyers de salle modérés (22-48 €/h).`,
    lieuxConnus: [
      'Yoga Nantes Centre',
      'La Maison du Yoga Nantes',
      'Yoga Bouffay',
      'Sukha Yoga Nantes',
      'Atelier du Yoga Nantes',
      'Studio Air Nantes',
      'Yoga & Vibes',
      'Centre de Yoga Iyengar Nantes',
      'Hatha Yoga Nantes',
      'Studio Hridaya Nantes',
    ],
    stats: [
      { value: '120+', label: 'Profs yoga indépendant·e·s recensé·e·s à Nantes' },
      { value: '22-48 €', label: 'Tarif horaire moyen de location de salle' },
      { value: '13-17 €', label: 'Tarif moyen par cours collectif' },
      { value: '9-13', label: 'Cours hebdo médian par prof confirmée' },
    ],
    citation: {
      text: "Nantes laisse beaucoup de place à l'expérimentation. J'ai pu lancer un format danse-yoga qui aurait été inaudible ailleurs — ici les élèves cherchent justement ce mélange.",
      author: 'Marion · prof de yoga, Nantes Bouffay',
    },
  },
};
