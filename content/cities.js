/**
 * content/cities.js — données par ville pour les pages locales SEO.
 *
 * RÈGLE D'ÉCRITURE (2026-09-05, après l'audit Search Console) :
 * on n'écrit ici QUE du vérifiable. Aucun nom d'établissement tiers, aucun
 * témoignage, aucun chiffre de marché sans source.
 *
 * Ce fichier a porté jusqu'au 2026-09-05 trois blocs supprimés ce jour-là :
 *   - lieuxConnus : 220 noms d'établissements, dont 43 % suivaient un gabarit
 *     mécanique répété de ville en ville, dont notre propre studio de démo
 *     (« Atelier Soleil ») donné comme lieu connu à Lyon et à Strasbourg, et
 *     dont une minorité de VRAIS établissements nommés sans leur accord.
 *   - citation : 22 témoignages attribués à des profs nommées avec leur
 *     quartier, tous inventés.
 *   - stats : des recensements chiffrés (« 800+ profs recensé·e·s ») sans source.
 * C'est exactement ce que la landing v2 avait retiré le 2026-08-19 sous la
 * mention « plus jamais de faux ». Ne pas les faire revenir.
 *
 * Ces listes étaient aussi la cause SEO du problème : ce sont elles qui
 * faisaient matcher des requêtes d'ÉLÈVES (« rasa yoga rive gauche »,
 * « pilates reformer rive gauche ») sur des pages qui vendent un logiciel
 * à des PROFS. 105 impressions et 1 clic sur le trimestre.
 *
 * Champs :
 *   name, region, slug, codePostal : état civil de la ville, vérifiable.
 *   zoneVacances : 'A' | 'B' | 'C'. Source = ZONES_VACANCES de
 *     lib/vacances-scolaires.js, lui-même bundlé depuis le calendrier officiel
 *     data.education.gouv.fr. C'est le seul fait chiffré de ces pages, et il
 *     est vrai. Il sert en plus à quelque chose : une série de cours s'arrête
 *     aux vacances de SA zone, et IziSolo sait générer ou sauter ces dates.
 *   profDescription : ce qui change concrètement quand on enseigne LÀ.
 *     Géographie, climat, rythme de la ville. Aucun chiffre inventé.
 *   pilates.profDescription : la même chose pour la discipline Pilates.
 */

export const CITIES = {
  paris: {
    name: 'Paris',
    region: 'Île-de-France',
    slug: 'paris',
    codePostal: '75',
    zoneVacances: 'C',
    profDescription: `Paris s'enseigne en éclaté : on donne rarement ses cours là où on habite, et souvent dans trois ou quatre lieux différents dans la semaine. La salle se loue à l'heure, ce qui rend chaque créneau à moitié rempli douloureux, et les trajets entre deux cours mangent une vraie part de la journée. Les horaires qui se remplissent le mieux sont ceux qui s'encastrent dans une journée de bureau : la pause de midi et la fin d'après-midi. Le quotidien parisien, c'est donc un planning serré, plusieurs lieux à ne pas confondre, et des désistements de dernière minute qui coûtent d'autant plus cher que la salle, elle, est déjà payée.`,
    pilates: {
      profDescription: `Le Pilates parisien recouvre deux métiers qui n'ont pas du tout les mêmes contraintes. Le Mat se transporte : un tapis, une salle louée à l'heure, et on peut enseigner d'un arrondissement à l'autre. Le Reformer, non : la machine fixe le lieu, donc on enseigne là où l'équipement se trouve, souvent en partageant le studio avec d'autres profs et donc en négociant ses créneaux. Dans les deux cas les groupes sont plus petits qu'en yoga et le suivi de chaque élève compte davantage, ce qui déplace le travail administratif vers les carnets individuels plutôt que vers le remplissage.`,
    },
  },
  lyon: {
    name: 'Lyon',
    region: 'Auvergne-Rhône-Alpes',
    slug: 'lyon',
    codePostal: '69',
    zoneVacances: 'A',
    profDescription: `Lyon oblige à composer avec son relief et ses deux rivières. Monter à la Croix-Rousse ou passer d'une rive à l'autre entre deux cours n'a rien d'anodin quand on enchaîne, et beaucoup de profs finissent par se concentrer sur un secteur plutôt que de traverser la ville toute la semaine. Les quartiers d'affaires appellent des créneaux courts en pleine journée, la Presqu'île et les pentes plutôt des cours du soir. Deux publics, deux rythmes, souvent dans la même semaine, et un planning qui doit tenir les deux sans les mélanger.`,
    pilates: {
      profDescription: `À Lyon, la géographie décide beaucoup du modèle Pilates. Le Reformer impose un lieu fixe et bien desservi, sinon les élèves ne montent pas jusqu'à la salle, tandis que le Mat permet de rayonner d'une rive à l'autre avec un simple tapis. La demande des quartiers de bureaux se porte sur des séances courtes en journée, celle des quartiers résidentiels sur du travail plus posé, souvent en petit groupe ou en individuel. Deux offres différentes, qu'il faut tarifer et suivre séparément sans s'y perdre.`,
    },
  },
  bordeaux: {
    name: 'Bordeaux',
    region: 'Nouvelle-Aquitaine',
    slug: 'bordeaux',
    codePostal: '33',
    zoneVacances: 'A',
    profDescription: `Bordeaux a la douceur qui permet de sortir du studio une bonne partie de l'année : les quais, les parcs et les jardins accueillent des cours dès les premiers beaux jours et jusque tard en automne. C'est un confort, et c'est aussi une organisation à part, parce qu'un cours en extérieur se replie sous la pluie et qu'il faut alors prévenir tout le monde vite. La ville a grandi vite et continue d'accueillir des gens qui arrivent d'ailleurs, donc une part du travail consiste à transformer des curieuses de passage en élèves régulières.`,
    pilates: {
      profDescription: `À Bordeaux, le Pilates se pratique presque toujours à l'intérieur, même quand la météo invite à sortir : le travail au sol et les appareils s'accommodent mal du vent et du sable. La ville attire beaucoup de nouvelles arrivantes, ce qui alimente un flux régulier de premières séances, avec la contrepartie classique du Pilates : il faut souvent plusieurs séances avant qu'une personne s'engage sur un carnet. Suivre qui en est à son essai, qui a un carnet entamé et qui a disparu après deux séances devient vite le vrai sujet.`,
    },
  },
  marseille: {
    name: 'Marseille',
    region: "Provence-Alpes-Côte d'Azur",
    slug: 'marseille',
    codePostal: '13',
    zoneVacances: 'B',
    profDescription: `Marseille est la ville où l'extérieur n'est pas une exception mais un mode d'enseignement : les calanques, les plages et les parcs servent de salle une grande partie de l'année. Ça change deux choses très concrètement. D'abord la météo devient un paramètre de planning, avec des séances déplacées ou annulées que personne n'avait vues venir la veille. Ensuite la ville est vaste et étalée, donc le lieu exact compte autant que l'heure, et une élève qui se trompe de point de rendez-vous a fait le trajet pour rien.`,
    pilates: {
      profDescription: `Le Pilates marseillais se donne à l'intérieur alors que la ville pousse à sortir, ce qui le met en concurrence directe avec des pratiques qui, elles, profitent du soleil. Le Reformer demande un studio équipé, donc un lieu fixe, dans une ville où les distances sont réelles et où une élève ne traverse pas Marseille pour une séance de plus. La conséquence pratique : on travaille surtout dans un rayon proche, on mise sur des petits groupes fidèles, et chaque abandon se voit tout de suite dans le chiffre du mois.`,
    },
  },
  toulouse: {
    name: 'Toulouse',
    region: 'Occitanie',
    slug: 'toulouse',
    codePostal: '31',
    zoneVacances: 'C',
    profDescription: `Toulouse est une ville étudiante et étalée, ce qui donne un public renouvelé à chaque rentrée et des trajets qui pèsent dans une journée chargée. Les bords de Garonne et les parcs permettent de sortir du studio une bonne partie de l'année, mais l'été y est franchement chaud, et les créneaux de milieu de journée se vident quand la température monte. Beaucoup de profs déplacent alors leurs cours tôt le matin ou en soirée, ce qui revient à refaire son planning deux fois par an.`,
    pilates: {
      profDescription: `À Toulouse, le Pilates s'adresse à deux publics qui se croisent peu : des séances collectives sur tapis d'un côté, du travail individuel plus technique de l'autre, souvent après le passage chez un professionnel de santé. Ces deux publics n'ont ni le même tarif, ni le même rythme, ni la même façon de payer. L'été chaud vide les créneaux de milieu de journée, ce qui pousse à concentrer les séances tôt le matin et en soirée pendant plusieurs semaines.`,
    },
  },
  nantes: {
    name: 'Nantes',
    region: 'Pays de la Loire',
    slug: 'nantes',
    codePostal: '44',
    zoneVacances: 'B',
    profDescription: `Nantes se traverse facilement à vélo, et beaucoup d'élèves viennent en pédalant, ce qui rend les cours de fin de journée plus fragiles dès que le temps tourne. Le climat atlantique est doux mais imprévisible : on peut enseigner dehors une bonne partie de l'année à condition d'avoir toujours un repli sous la main. La ville a une vraie densité de lieux associatifs et de salles partagées, donc l'enjeu tient moins à trouver un créneau qu'à garder un groupe stable d'une saison à l'autre.`,
    pilates: {
      profDescription: `À Nantes, le Pilates se donne à l'intérieur toute l'année, ce qui protège des aléas météo mais rend la salle déterminante : accessible à vélo et à pied, sinon les inscriptions du soir s'effritent dès l'automne. Le tissu associatif est dense, donc beaucoup de profs commencent en partageant des créneaux avant d'avoir leur propre lieu. Cette période de partage est celle où le suivi devient compliqué, avec des élèves qui viennent d'un créneau puis d'un autre, et des carnets qui doivent suivre la personne et non la salle.`,
    },
  },
  strasbourg: {
    name: 'Strasbourg',
    region: 'Grand Est',
    slug: 'strasbourg',
    codePostal: '67',
    zoneVacances: 'B',
    profDescription: `À Strasbourg, l'hiver dicte le calendrier : de novembre à mars, tout se passe à l'intérieur, et la fréquentation dépend beaucoup de la facilité à venir sans se mouiller. Le centre est compact et se fait à pied ou à vélo, ce qui joue en faveur des cours du soir, à condition que la salle soit sur le chemin. La ville est frontalière et une partie du public travaille en horaires décalés ou de l'autre côté du Rhin, d'où une demande réelle pour des créneaux inhabituels, tôt le matin ou en début d'après-midi.`,
    pilates: {
      profDescription: `À Strasbourg, l'hiver joue pour le Pilates : c'est une pratique d'intérieur, et la saison froide est longue. La contrepartie tombe au printemps, quand une partie du public repart vers l'extérieur et que les groupes s'allègent d'un coup. La ville, frontalière et compacte, amène un public aux horaires variés, dont une partie cherche des séances individuelles ou en tout petit groupe plutôt que le cours collectif classique. Le travail de gestion se concentre alors sur des formules courtes et sur des paiements qui n'ont pas tous la même forme.`,
    },
  },
  lille: {
    name: 'Lille',
    region: 'Hauts-de-France',
    slug: 'lille',
    codePostal: '59',
    zoneVacances: 'B',
    profDescription: `À Lille, on enseigne à l'intérieur presque toute l'année, et la pluie fait partie du modèle : elle ne vide pas les cours, mais elle rend la régularité plus difficile à tenir sur les créneaux du soir. Le centre est dense et se parcourt vite, ce qui permet d'avoir plusieurs lieux sans y perdre sa journée, contrairement à des villes plus étalées. La population étudiante est importante, donc les groupes se renouvellent beaucoup et le mois de septembre pèse très lourd dans une année.`,
    pilates: {
      profDescription: `À Lille, le Pilates profite d'un climat qui garde tout le monde à l'intérieur, et d'une ville assez dense pour qu'une élève accepte de venir même par mauvais temps si la salle est proche. La forte population étudiante crée une demande pour des séances collectives accessibles, quand le Reformer s'adresse à un public plus installé. Faire cohabiter les deux dans une même semaine suppose des tarifs distincts, des tailles de groupe différentes, et une visibilité claire sur qui a droit à quoi.`,
    },
  },
  montpellier: {
    name: 'Montpellier',
    region: 'Occitanie',
    slug: 'montpellier',
    codePostal: '34',
    zoneVacances: 'C',
    profDescription: `Montpellier cumule un climat méditerranéen et une population étudiante nombreuse, ce qui donne une année à deux vitesses. De septembre à juin, les groupes se remplissent et l'extérieur reste praticable une grande partie du temps. L'été, une partie du public quitte la ville, et les profs qui vivent uniquement du cours collectif le sentent passer. Anticiper ce creux, en gardant le contact pendant les mois vides et en préparant la rentrée à l'avance, fait souvent la différence sur l'année.`,
    pilates: {
      profDescription: `Le Pilates à Montpellier suit le rythme universitaire, avec une rentrée qui remplit tout d'un coup et un été qui se vide. La chaleur pousse à privilégier les séances tôt le matin ou en fin de journée pendant plusieurs mois. Comme partout en Pilates, la conversion se joue sur les premières séances : beaucoup viennent essayer, une partie seulement s'engage sur la durée, et repérer tôt qui est en train de décrocher vaut mieux que de le découvrir en comptant les recettes du mois.`,
    },
  },
  rennes: {
    name: 'Rennes',
    region: 'Bretagne',
    slug: 'rennes',
    codePostal: '35',
    zoneVacances: 'B',
    profDescription: `Rennes est une ville compacte où l'on se déplace vite, ce qui permet d'enseigner dans plusieurs quartiers sans y laisser sa journée. Le climat est doux mais humide, donc les cours se donnent surtout à l'intérieur et la salle compte beaucoup dans le choix des élèves. La forte présence étudiante donne un rythme très marqué par le calendrier universitaire : des groupes qui se remplissent d'un coup à la rentrée, et qui s'allègent aussi vite à la fin du printemps.`,
    pilates: {
      profDescription: `À Rennes, la ville compacte permet d'enseigner le Pilates dans plusieurs quartiers sans y perdre sa journée, ce qui aide quand on démarre et qu'on multiplie les lieux pour remplir. Le calendrier universitaire donne une année très contrastée, avec des groupes qui se forment vite à la rentrée. Le climat humide garde la pratique à l'intérieur toute l'année, ce qui stabilise la fréquentation mais rend la salle et son accessibilité déterminantes dans le choix de l'élève.`,
    },
  },
  nice: {
    name: 'Nice',
    region: "Provence-Alpes-Côte d'Azur",
    slug: 'nice',
    codePostal: '06',
    zoneVacances: 'B',
    profDescription: `Nice permet d'enseigner dehors une bonne partie de l'hiver, ce qui est rare en France, et le bord de mer sert de salle à ciel ouvert dès les beaux jours. La contrepartie est la saisonnalité : l'été amène du public de passage et fait bouger les habitudes des habitué·e·s, entre départs en vacances et horaires décalés par la chaleur. C'est une ville où l'on jongle entre un noyau d'élèves à l'année et une fréquentation qui gonfle puis retombe, avec un planning à réajuster plusieurs fois dans la saison.`,
    pilates: {
      profDescription: `À Nice, le Pilates compose avec une saisonnalité forte : un noyau d'élèves à l'année, et des périodes où le public de passage change la composition des groupes. Le Reformer impose un studio équipé, donc un lieu fixe et des créneaux partagés, quand le Mat permet de suivre la demande là où elle est. La douceur de l'hiver joue contre l'intérieur une partie de l'année, et il faut souvent réajuster les horaires plusieurs fois dans la saison, ce qui veut dire retoucher des séries de cours déjà programmées.`,
    },
  },
};
