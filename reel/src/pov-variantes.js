// Les réels « POV », en texte pur (2026-09-10, demande Colin : « des idées en
// Remotion pour déclencher des essais, tout de suite »).
//
// Le constat qui les motive : deux réels de démo sponsorisés (130 €, 18 000 vues)
// ont fait 14 j'aime et zéro message. Des écrans d'appli n'arrêtent pas le pouce
// d'une prof qui ne nous connaît pas ; une scène de sa propre soirée, si. Chaque
// variante est donc une SITUATION (le titre), trois messages qu'elle a déjà reçus
// (les bulles), une question (le pivot), et un seul geste demandé : commenter
// STUDIO. Le commentaire ouvre un DM, le seul canal qui a produit des
// conversations cette semaine (cf. BRIEF-DM-INSTA-2026.md) ; Maude y répond à la
// main avec le message concierge.
//
// Règles d'écriture : tutoiement, aucun chiffre non mesuré (pas de « 180 h par
// an »), aucun nom de concurrent, aucun prénom réel (Sophie, Julie, Marc, Léa
// sont des prénoms d'exemple, comme sur la landing), zéro tiret quadratin, et
// rien que le produit ne fasse pas : l'échéancier, le décompte au pointage, le
// lien de pointage confié, la déclaration URSSAF calculée existent tous.
export const VARIANTES = [
  {
    id: 'soiree',
    pov: 'POV : tu es prof de yoga',
    titre: ['Il est 23 h.'],
    bulles: [
      { texte: 'C’est complet mardi ?', heure: '23:04' },
      { texte: 'Je peux payer en deux fois ?', heure: '23:12' },
      { texte: 'Tu me renvoies le lien ?', heure: '23:31' },
    ],
    pivot: 'Et si tes élèves trouvaient la réponse toutes seules ?',
  },
  {
    id: 'cheques',
    pov: 'POV : tu vends un carnet de 10',
    titre: ['« Je peux te faire', 'trois chèques ? »'],
    bulles: [
      { texte: 'Encaisser Sophie après le 10', note: true },
      { texte: 'Le deuxième chèque, c’était quand ?', note: true },
      { texte: 'L’enveloppe est dans quel sac ?', note: true },
    ],
    pivot: 'Et si l’échéancier se souvenait à ta place ?',
  },
  {
    id: 'tableur',
    pov: 'POV : c’est dimanche soir',
    titre: ['Le tableur', 'des présences.'],
    bulles: [
      { texte: 'Julie, il lui reste 3 ou 4 séances ?', note: true },
      { texte: 'Marc a payé en espèces ?', note: true },
      { texte: 'Qui était là jeudi ?', note: true },
    ],
    pivot: 'Et si le carnet se décomptait tout seul, au pointage ?',
  },
  {
    id: 'remplacement',
    pov: 'POV : tu es malade un mardi',
    titre: ['Ta remplaçante', 'n’a pas la liste.'],
    bulles: [
      { texte: 'Tu m’envoies les prénoms ?', heure: '17:40' },
      { texte: 'Elle a un carnet ou elle paie ?', heure: '17:52' },
      { texte: 'Je note où ?', heure: '18:03' },
    ],
    pivot: 'Et si un lien suffisait pour qu’elle pointe à ta place ?',
  },
  {
    id: 'urssaf',
    pov: 'POV : c’est le 25 du mois',
    titre: ['La déclaration', 'URSSAF.'],
    bulles: [
      { texte: 'J’ai encaissé combien en juillet ?', note: true },
      { texte: 'Le chèque de Léa, c’est ce trimestre ?', note: true },
      { texte: 'Où est le relevé ?', note: true },
    ],
    pivot: 'Et si le montant était déjà calculé ?',
  },
];

export const CTA = {
  pill: 'Commente STUDIO',
  sous: ['et je t’envoie le lien en message.', '30 jours gratuits, sans carte.'],
};

// Chronologie commune (images à 30 i/s) : le POV, la situation, les trois
// bulles à une seconde d'intervalle, la question, puis l'appel qui reste à
// l'écran. 13 secondes : assez court pour être revu en boucle.
export const CHRONO = { pov: 6, titre: 20, bulles: [58, 88, 118], pivot: 166, cta: 214, fin: 390 };
export const DUREE_POV = CHRONO.fin;
