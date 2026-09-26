// Les réels « conversation » (2026-09-26, demande Colin devant une pub Scalapay
// sur Instagram : « tu arriverais à faire un réel de ce genre, une conversation
// entre profs qui répond à une douleur ? »).
//
// Le format : une messagerie dans un téléphone, deux profs, celle qui a la
// douleur écrit, l'autre répond avec ce qu'elle fait aujourd'hui. Les bulles
// arrivent une à une, avec les trois points « en train d'écrire » avant chaque
// réponse, et le nom de l'appli n'arrive qu'à la dernière bulle, quand la
// question est posée. Puis la carte de fin commune, « Commente STUDIO ».
//
// Règles d'écriture (les mêmes que les POV) : tutoiement, aucun chiffre non
// mesuré, aucun nom de concurrent, des prénoms d'exemple (Léa, Camille, Sophie,
// Marc, comme sur la landing), zéro tiret cadratin, et rien que le produit ne
// fasse pas : l'appel en un tap et le décompte au pointage, l'échéancier à
// plusieurs moyens, la réservation et le rappel de la veille, le lien de
// pointage confié (prénom et nom seulement, expiration en fin de journée), la
// déclaration URSSAF calculée en trésorerie existent tous. ⚠️ La dernière
// bulle ne dit que « IziSolo » : la ligne « Gratuit, sans carte, pour toujours »
// vit sur la carte de fin, une seule fois, parce que deux des cinq douleurs
// se règlent avec des fonctions du plan Complet (l'essai de 30 jours le donne).
//
// Ce fichier est PUR (aucun import Remotion) : le script de rendu Node le lit.

// Une couleur de fond par variante, aucune sable (retour Colin 2026-09-26 :
// « il y a trop de sable sur notre compte ») : un dégradé sombre et deux halos
// qui dérivent, le téléphone se détache dessus. Les cinq sont distinctes entre
// elles et reprennent celles déjà posées sur le compte (lavande du réel 0 €,
// bleu nuit du carrousel avis, charbon chaud du réel Studio) ; pas de vert
// (le feed en a déjà). Le crème est le sable de la charte : la marque reste.
// `pill` / `pillTexte` : le bouton « Commente STUDIO » de la carte de fin.
export const PALETTES = {
  lavande:    { fond: '#3b2a5c', fond2: '#5b4184', halo1: '#8fd7ae', halo2: '#f6a8bf', creme: '#f7f2ea', doux: '#d3c4ec', bezel: '#1d1730', pill: '#8fd7ae', pillTexte: '#14402c', goutte: '#f6a8bf' },
  bleuNuit:   { fond: '#1b3358', fond2: '#254470', halo1: '#efb84a', halo2: '#7fa6d9', creme: '#f2f1ea', doux: '#b8c6dd', bezel: '#0f1d33', pill: '#efb84a', pillTexte: '#1a2233', goutte: '#efb84a' },
  bordeaux:   { fond: '#5a2b3f', fond2: '#7a3a54', halo1: '#f1bd4f', halo2: '#f6a8bf', creme: '#fbf1ee', doux: '#e4bfcc', bezel: '#2e1620', pill: '#f1bd4f', pillTexte: '#2e1a22', goutte: '#f1bd4f' },
  terracotta: { fond: '#6e3520', fond2: '#9a4a2b', halo1: '#f7d9a8', halo2: '#e2a76f', creme: '#fbf3ea', doux: '#eccbb5', bezel: '#2a1610', pill: '#fbf3ea', pillTexte: '#6e3520', goutte: '#f7d9a8' },
  charbon:    { fond: '#241d1b', fond2: '#3d2f2a', halo1: '#e2a76f', halo2: '#9fd3b4', creme: '#f7f2ea', doux: '#d8c9bb', bezel: '#15100e', pill: '#e2a76f', pillTexte: '#3a2410', goutte: '#e2a76f' },
};

export const VARIANTES = [
  {
    id: 'dimanche',
    palette: 'lavande',
    eyebrow: 'Une conversation entre deux profs',
    contact: { nom: 'Camille', sous: 'prof de pilates', initiale: 'C' },
    messages: [
      { de: 'moi', texte: 'Dimanche soir. Je recopie mes présences de la semaine dans mon cahier 😩', heure: '21:48' },
      { de: 'moi', texte: 'Tu fais comment, toi ?', heure: '21:49' },
      { de: 'elle', texte: 'Je fais l’appel à la fin du cours, un tap par élève', heure: '21:52' },
      { de: 'elle', texte: 'Et le carnet se décompte tout seul', heure: '21:52' },
      { de: 'moi', texte: 'Et le dimanche soir ?', heure: '21:53' },
      { de: 'elle', texte: 'Rien. Je regarde une série 🛋️', heure: '21:54' },
      { de: 'moi', texte: 'C’est quoi, comme appli ?', heure: '21:54' },
      { de: 'elle', texte: 'IziSolo 🌿', heure: '21:55' },
    ],
    fin: ['Et toi, tes dimanches', 'ressemblent à quoi ?'],
  },
  {
    id: 'cheques',
    palette: 'bleuNuit',
    eyebrow: 'Une conversation entre deux profs',
    contact: { nom: 'Sophie', sous: 'prof de yoga', initiale: 'S' },
    messages: [
      { de: 'moi', texte: 'Une élève veut me payer son abonnement en trois chèques', heure: '18:10' },
      { de: 'moi', texte: 'Je note ça où ? Sur un post-it ?', heure: '18:10' },
      { de: 'elle', texte: 'Dans l’échéancier : trois versements, chacun sa date et son moyen', heure: '18:14' },
      { de: 'elle', texte: 'Si le deuxième arrive en espèces, tu l’encaisses tel quel', heure: '18:14' },
      { de: 'moi', texte: 'Et je sais qui me doit encore quoi ?', heure: '18:15' },
      { de: 'elle', texte: 'Sans fouiller ton sac, oui 🙂', heure: '18:16' },
      { de: 'moi', texte: 'Tu utilises quoi ?', heure: '18:16' },
      { de: 'elle', texte: 'IziSolo 🌿', heure: '18:17' },
    ],
    fin: ['Et toi, tes chèques,', 'tu les suis où ?'],
  },
  {
    id: 'soiree',
    palette: 'bordeaux',
    eyebrow: 'Une conversation entre deux profs',
    contact: { nom: 'Camille', sous: 'prof de yoga', initiale: 'C' },
    messages: [
      { de: 'moi', texte: '23 h. « C’est complet mardi ? » 😴', heure: '23:12' },
      { de: 'moi', texte: 'Je réponds à ça tous les soirs', heure: '23:13' },
      { de: 'elle', texte: 'Mes élèves voient les places qui restent et réservent seules', heure: '23:20' },
      { de: 'elle', texte: 'Et elles reçoivent le rappel la veille', heure: '23:20' },
      { de: 'moi', texte: 'Et « tu me renvoies le lien ? »', heure: '23:21' },
      { de: 'elle', texte: 'Le lien est dans leur espace. Je ne renvoie plus rien', heure: '23:22' },
      { de: 'moi', texte: 'Je veux la même chose', heure: '23:22' },
      { de: 'elle', texte: 'IziSolo 🌿', heure: '23:23' },
    ],
    fin: ['Et toi, à 23 h,', 'tu réponds encore ?'],
  },
  {
    id: 'remplacante',
    palette: 'terracotta',
    eyebrow: 'Une conversation entre deux profs',
    contact: { nom: 'Sophie', sous: 'prof de pilates', initiale: 'S' },
    messages: [
      { de: 'moi', texte: 'Malade. Ma remplaçante me demande la liste du cours de 9 h', heure: '07:40' },
      { de: 'moi', texte: 'Je lui envoie les prénoms par SMS ?', heure: '07:41' },
      { de: 'elle', texte: 'Tu lui envoies un lien, elle pointe depuis son téléphone', heure: '07:45' },
      { de: 'elle', texte: 'Elle voit prénom et nom, rien d’autre. Ni carnets, ni tarifs', heure: '07:45' },
      { de: 'moi', texte: 'Et après le cours ?', heure: '07:46' },
      { de: 'elle', texte: 'Le lien expire ce soir, et tu retrouves le pointage chez toi', heure: '07:46' },
      { de: 'moi', texte: 'Dis-moi le nom de l’appli', heure: '07:47' },
      { de: 'elle', texte: 'IziSolo 🌿', heure: '07:47' },
    ],
    fin: ['Et toi, malade un mardi,', 'tu fais comment ?'],
  },
  {
    id: 'urssaf',
    palette: 'charbon',
    eyebrow: 'Une conversation entre deux profs',
    contact: { nom: 'Camille', sous: 'prof de yoga', initiale: 'C' },
    messages: [
      { de: 'moi', texte: 'C’est le 25. Déclaration URSSAF.', heure: '14:02' },
      { de: 'moi', texte: 'Je ne sais même plus ce que j’ai encaissé en août 😩', heure: '14:02' },
      { de: 'elle', texte: 'Chez moi le montant est déjà calculé, arrondi à l’euro', heure: '14:06' },
      { de: 'elle', texte: 'Avec la date limite. Je copie, je colle, c’est fait', heure: '14:06' },
      { de: 'moi', texte: 'Et les chèques encaissés en retard ?', heure: '14:07' },
      { de: 'elle', texte: 'Comptés à la date où tu les encaisses, pas à la vente', heure: '14:08' },
      { de: 'moi', texte: 'Tu m’envoies le nom ?', heure: '14:08' },
      { de: 'elle', texte: 'IziSolo 🌿', heure: '14:09' },
    ],
    fin: ['Et toi, le 25,', 'tu calcules encore ?'],
  },
];

// Chronologie (images à 30 i/s). Une bulle envoyée arrive tout de suite ; une
// réponse est précédée des trois points « en train d'écrire ». Une bulle
// longue laisse un peu plus de temps de lecture avant la suivante. Après la
// dernière bulle, une tenue, puis la carte de fin (100 images, AppelStudio).
export const RYTHME = { debut: 28, ecrit: 20, gap: 26, lecture: 0.4, tenue: 50, appel: 100, queue: 16 };

export function chrono(variante) {
  let t = RYTHME.debut;
  const messages = variante.messages.map((m) => {
    const ecritDe = m.de === 'elle' ? t : null;
    const apparait = m.de === 'elle' ? t + RYTHME.ecrit : t;
    t = apparait + RYTHME.gap + Math.round(m.texte.length * RYTHME.lecture);
    return { ...m, ecritDe, apparait };
  });
  const cta = t + RYTHME.tenue;
  return { messages, cta, duree: cta + RYTHME.appel + RYTHME.queue };
}

export const dureeConversation = (id) => chrono(VARIANTES.find((v) => v.id === id) || VARIANTES[0]).duree;
