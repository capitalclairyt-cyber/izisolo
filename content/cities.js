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
};
