/**
 * content/cities-extra.js — Contenu additionnel par ville pour différenciation SEO.
 *
 * Objectif : sortir les 20 pages "Explorée non indexée" en Search Console en
 * ajoutant du contenu unique par ville (Google sanctionnait la similarité
 * structurelle entre /prof-yoga-paris, /prof-yoga-lyon, etc.).
 *
 * Chaque ville ajoute :
 *   - quartiers : 3-5 quartiers populaires pour la pratique (nom + ambiance)
 *   - marcheLocal : 2-3 phrases sur opportunités/défis spécifiques locaux
 *   - faq : 3 questions/réponses ultra-locales (uniques à la ville)
 *   - villesProches : array de slugs pour cross-linking géographique
 *
 * Mergé dans LocalLanding.js via spread du city object original.
 */

export const CITIES_EXTRA = {
  paris: {
    quartiers: [
      { name: 'Le Marais (3e-4e)', ambiance: "Studios premium et boutiques wellness, clientèle CSP+, créneaux du midi très demandés." },
      { name: 'Bastille / 11e', ambiance: "Cœur de la scène yoga indé parisienne. Salles louables à la séance, ambiance arty et exigeante." },
      { name: 'Pigalle / 9e', ambiance: "Vinyasa moderne, clientèle jeune et active, beaucoup de cours après le travail (18h30-20h)." },
      { name: '15e-16e', ambiance: "Yoga doux, prénatal, seniors. Clientèle familiale et CSP+ qui cherche du qualitatif sur des créneaux journée." },
      { name: 'Sud-Est (12e-13e)', ambiance: "Studios coopératifs et collectifs émergents. Loyers plus accessibles, clientèle créative." },
    ],
    marcheLocal: `Le marché parisien est le plus dense de France, et c'est en même temps celui qui laisse le plus de place aux niches : yoga parents-enfants, séances courtes en entreprise, retraites de week-end à moins d'une heure de train. Le vrai défi reste le loyer de salle, le plus élevé du pays, qui fait dépendre la rentabilité du remplissage : un cours à moitié vide coûte exactement le même prix qu'un cours plein. Beaucoup de profs parisien·ne·s équilibrent avec un mélange de cours collectifs en salle louée et de séances particulières à domicile, qui amortissent ce fixe.`,
    faq: [
      {
        q: "Combien gagne réellement un·e prof de yoga à Paris ?",
        r: "Une prof confirmée avec 12-16 cours hebdo (mix collectifs + particuliers) facture 3 500 à 6 500 € brut/mois. Net après URSSAF (21,2 %) et IR (versement libératoire 2,2 %) : 2 700 à 5 000 €. À retrancher : 600-1 200 €/mois de location de salle si tu loues, 50-150 €/mois d'assurance + abonnements outils. La fourchette nette réaliste à Paris est donc 2 000 à 4 200 €/mois pour une activité solide."
      },
      {
        q: "Où louer une salle de yoga pas chère à Paris ?",
        r: "Quatre pistes économiques : (1) les paroisses et associations cultuelles (15-30 €/h en Île-de-France) — souvent peu connues mais excellent rapport qualité-prix ; (2) les bars-coworkings comme Anticafé ou Wojo qui louent leurs salles à l'heure ; (3) les centres culturels municipaux (15-25 €/h, dossier à monter à la mairie d'arrondissement) ; (4) les studios partagés type Yogamatrix ou Wellow qui sous-louent leurs créneaux creux à 20-40 €/h."
      },
      {
        q: "Quels arrondissements sont les plus rentables pour démarrer un studio yoga à Paris ?",
        r: "Le 11e, le 12e et le 18e sont actuellement les zones les plus équilibrées : densité de clientèle suffisante, loyers de salle encore raisonnables (35-60 €/h), mais sans la concurrence saturée du Marais ou des 6e-7e. Le 19e et le 20e montent vite, portés par les nouvelles populations actives. Évite le 1er, 2e, 6e, 7e, 8e si tu démarres : les coûts y sont 2-3x plus élevés et la clientèle attend du premium qui demande de l'expérience."
      },
    ],
    villesProches: [],  // Paris n'a pas de ville proche logique parmi nos 11
  },

  lyon: {
    quartiers: [
      { name: 'Croix-Rousse (4e)', ambiance: "Le cœur du yoga lyonnais indé. Studios coopératifs, clientèle créative et fidèle." },
      { name: 'Presqu\'île (2e)', ambiance: "Cours du midi pour cadres et travailleurs du tertiaire, créneaux 12h30-14h très demandés." },
      { name: '6e arrondissement', ambiance: "Clientèle CSP+ et seniors actifs, demande forte pour Hatha doux et yoga thérapeutique." },
      { name: '7e (Guillotière, Jean-Macé)', ambiance: "Quartier jeune et étudiant, studios collectifs émergents avec tarifs accessibles." },
      { name: 'Confluence', ambiance: "Quartier neuf avec bureaux et logements premium. Demande pour yoga d'entreprise et cours en visio." },
    ],
    marcheLocal: `Lyon est une ville où démarrer une activité indépendante reste tenable : les loyers de salle y sont plus abordables qu'à Paris, la clientèle est fidèle et le bouche-à-oreille entre profs fonctionne bien. Le défi local est la saisonnalité, très marquée : août et décembre sont creux, septembre et janvier remplissent tout d'un coup. Beaucoup de profs lyonnaises complètent avec des retraites de week-end dans les Monts du Lyonnais ou le Beaujolais.`,
    faq: [
      {
        q: "Combien gagne un·e prof de yoga à Lyon en 2026 ?",
        r: "Une prof confirmée avec 10-14 cours hebdo facture 2 800 à 5 000 € brut/mois. Net après URSSAF et IR : 2 200 à 3 800 €. À retrancher 400-800 €/mois de location de salle. Net réaliste : 1 700 à 3 200 €/mois pour une activité bien posée. Lyon offre un excellent rapport qualité de vie / revenu net comparé à Paris."
      },
      {
        q: "Enseigner à la Croix-Rousse, qu'est-ce que ça change ?",
        r: "C'est un quartier dense en studios indépendants et en associations, donc la concurrence y est réelle et le bouche-à-oreille compte plus qu'ailleurs. La pente est le vrai paramètre : une salle en haut des pentes n'a pas le même public qu'une salle en bas, et les élèves choisissent souvent celle qu'elles atteignent sans effort après le travail. Aux beaux jours, le parc de la Croix-Rousse permet de sortir, avec la logistique que ça suppose : prévenir tout le monde en cas de pluie, et un point de rendez-vous que personne ne peut manquer."
      },
      {
        q: "Le marché yoga à Lyon est-il saturé ?",
        r: "Pas encore, contrairement à Paris. Lyon reste nettement moins dense que Paris, et la marge de croissance y est réelle, particulièrement sur les niches : yoga prénatal, yoga enfants, yoga thérapeutique, yoga d'entreprise."
      },
    ],
    villesProches: ['marseille', 'montpellier'],  // Sud-Est
  },

  marseille: {
    quartiers: [
      { name: 'La Plaine / Cours Julien', ambiance: "Cœur de la scène yoga indé alternative. Studios créatifs, ambiance arty et solidaire." },
      { name: 'Vauban / Castellane (6e)', ambiance: "Clientèle CSP+ et clientèle premium. Forte demande pour Yin et yoga thérapeutique." },
      { name: 'Bonneveine / Pointe-Rouge (8e)', ambiance: "Yoga en bord de mer (plages, parcs Borély). Beaucoup de cours d'été en plein air." },
      { name: 'Cinq-Avenues / Longchamp (4e-5e)', ambiance: "Familles et jeunes parents. Demande forte yoga prénatal, postnatal, parents-enfants." },
      { name: 'Endoume / Catalans (7e)', ambiance: "Calanques accessibles à pied. Beaucoup de retraites week-end et stages organisés ici." },
    ],
    marcheLocal: `Marseille est singulière : la pratique en plein air est une vraie composante de l'offre 6-8 mois de l'année. Les profs qui dominent localement combinent un cours hebdo en studio (revenus stables) avec des stages mensuels dans les calanques, sur les îles du Frioul, ou en bord de mer (revenus premium). Tarifs cours collectifs intermédiaires (13-18 €), mais possible de monter à 35-50 € pour un format "yoga + sortie bateau" très demandé l'été. Le défi : le creux estival pendant la canicule (juillet-août) où la pratique régulière s'effondre.`,
    faq: [
      {
        q: "Donner des cours en plein air à Marseille, comment ça s'organise ?",
        r: "Les calanques, les plages et les parcs se prêtent aux cours en extérieur d'avril à octobre, et beaucoup de profs marseillais·es en font une part de leur activité. Les deux difficultés sont toujours les mêmes. La météo d'abord : il faut pouvoir prévenir tout un groupe la veille au soir, et décider si la séance est reportée ou rendue au carnet. Le lieu ensuite : un point de rendez-vous en extérieur se décrit précisément, sinon une élève fait le trajet pour rien. Dans IziSolo, chaque séance porte son propre lieu, et une annonce part au groupe concerné en deux clics."
      },
      {
        q: "Combien gagne un·e prof de yoga à Marseille ?",
        r: "Une prof confirmée avec 10-14 cours hebdo + 1-2 stages mensuels facture 2 800 à 4 800 € brut/mois. Net après charges : 2 100 à 3 700 €. À retrancher 300-700 €/mois de location de salle (loyers très accessibles à Marseille). Net réaliste : 1 800 à 3 000 €/mois. Possibilité d'augmenter significativement avec les retraites week-end dans le Luberon ou sur les îles."
      },
      {
        q: "Comment gérer la canicule pour les cours yoga à Marseille en juillet-août ?",
        r: "Trois stratégies qui marchent localement : (1) déplacer les cours à 7h30-9h le matin (les élèves s'adaptent vite) ; (2) basculer en plein air dans les calanques ou sur les plages (fraîcheur naturelle) ; (3) proposer un format spécial été 'yoga + plage + apéro' qui devient une expérience sociale. Beaucoup de profs marseillais·es coupent juste 2 semaines en août, pas plus."
      },
    ],
    villesProches: ['lyon', 'montpellier', 'nice'],  // Sud
  },

  toulouse: {
    quartiers: [
      { name: 'Carmes (1er)', ambiance: "Quartier historique avec studios indépendants installés. Clientèle CSP+ et seniors." },
      { name: 'Saint-Cyprien (rive gauche)', ambiance: "Cœur de la scène yoga alternative toulousaine. Studios coopératifs et ateliers créatifs." },
      { name: 'Capitole / Esquirol', ambiance: "Cours du midi pour actifs du centre-ville. Format 45 min sans douche très demandé." },
      { name: 'Compans-Caffarelli / Minimes', ambiance: "Familles et jeunes parents. Demande forte yoga prénatal, postnatal, enfants." },
      { name: 'Rangueil / Université', ambiance: "Forte demande étudiante. Cours collectifs à tarif accessible (12-14 €) très fréquentés." },
    ],
    marcheLocal: `Toulouse a l'un des marchés les plus accessibles des grandes métropoles, porté par un public universitaire nombreux, avec pour contrepartie des tarifs de cours plus bas qu'ailleurs. Le défi local est donc de tenir sa marge : les profs y répondent surtout par la fidélisation, avec des carnets plutôt que des séances à l'unité, et par un complément en retraites de week-end dans les Pyrénées ou le Tarn. L'Ashtanga et le Vinyasa y sont bien implantés, avec plusieurs profs formées à la pratique Mysore.`,
    faq: [
      {
        q: "Pourquoi les tarifs yoga sont-ils si bas à Toulouse ?",
        r: "Trois facteurs cumulés : (1) public étudiant nombreux (~110 000 étudiants sur la métropole) qui structure la grille tarifaire vers le bas ; (2) loyers de salle très accessibles (20-45 €/h) qui permettent aux profs de tenir avec des tarifs modérés ; (3) culture locale plus orientée vers l'accessibilité que vers le premium. Pour une prof, la rentabilité passe par le volume (12-16 cours hebdo) plutôt que par les marges unitaires."
      },
      {
        q: "Combien gagne un·e prof de yoga à Toulouse ?",
        r: "Une prof confirmée avec 14-18 cours hebdo (souvent plus qu'ailleurs car tarifs modérés) facture 2 500 à 4 500 € brut/mois. Net après charges : 1 900 à 3 400 €. À retrancher 350-700 €/mois de location de salle. Net réaliste : 1 550 à 2 700 €/mois. La rentabilité par cours est moins forte qu'à Paris ou Lyon, mais la stabilité du remplissage compense largement."
      },
      {
        q: "Le yoga Ashtanga est-il vraiment populaire à Toulouse ?",
        r: "Oui, plus qu'ailleurs en France. Plusieurs profs toulousaines se sont formées à Mysore (Inde) avec la lignée traditionnelle, et ont structuré une vraie communauté Ashtanga locale. La Mysore class (pratique guidée individuelle 6h30-9h30 du matin) marche très bien sur la ville, avec 2-3 studios qui en proposent régulièrement. C'est devenu un marqueur d'identité toulousaine dans le paysage yoga français."
      },
    ],
    villesProches: ['bordeaux', 'montpellier'],  // Sud-Ouest / Occitanie
  },

  bordeaux: {
    quartiers: [
      { name: 'Chartrons', ambiance: "Quartier bobo premium. Studios qualitatifs, clientèle CSP+, demande forte yoga & vin." },
      { name: 'Saint-Pierre / Saint-Michel', ambiance: "Cœur historique avec studios indé. Clientèle mixte et créative." },
      { name: 'La Bastide (rive droite)', ambiance: "Quartier émergent. Loyers accessibles, nouveaux studios alternatifs." },
      { name: 'Caudéran / Cauderan', ambiance: "Familles et seniors actifs. Demande forte yoga doux, prénatal, seniors." },
      { name: 'Bassins à Flot (nord)', ambiance: "Tertiaire récent. Cours d'entreprise et yoga lunch break très demandés." },
    ],
    marcheLocal: `Bordeaux est une ville où se lancer reste tenable : le marché grandit avec la population, les loyers de salle restent accessibles comparés à Paris, et le public accepte des tarifs intermédiaires. Une particularité locale s'y est développée, les ateliers qui associent le yoga et l'univers du vin, en lien avec les châteaux de la région. Les retraites de week-end sur le Bassin d'Arcachon ou dans les vignobles marchent bien.`,
    faq: [
      {
        q: "Yoga & vin à Bordeaux : est-ce vraiment une vraie offre ou un gadget marketing ?",
        r: "C'est une vraie offre locale qui prend de l'ampleur. Plusieurs profs bordelaises proposent des ateliers conjoints avec des œnologues : 1h de pratique douce suivie d'une dégustation commentée de 3-4 vins. Format payant 50-80 € par participant, capacité 8-12 personnes, partenariat avec un château ou un caviste. Bien fait, c'est un excellent générateur de bouche-à-oreille pour la pratique régulière en studio."
      },
      {
        q: "Combien gagne un·e prof de yoga à Bordeaux ?",
        r: "Une prof confirmée avec 8-12 cours hebdo + 2-3 ateliers spéciaux mensuels facture 2 400 à 4 200 € brut/mois. Net après charges : 1 800 à 3 200 €. À retrancher 350-700 €/mois de location. Net réaliste : 1 450 à 2 500 €/mois. Possibilité de monter avec les retraites Médoc / Arcachon (200-400 €/jour de stage hors hébergement)."
      },
      {
        q: "Pourquoi tant de profs parisien·ne·s se sont installé·e·s à Bordeaux ?",
        r: "L'arrivée de la LGV en 2017 a tout changé : Paris-Bordeaux en 2h05, possibilité de garder une clientèle parisienne pour des ateliers ponctuels, qualité de vie 3x meilleure, et loyers (habitation + salle) deux fois moins élevés. Beaucoup de profs ont fait le calcul et basculé, ce qui a structuré une scène yoga bordelaise particulièrement qualitative ces 5 dernières années."
      },
    ],
    villesProches: ['toulouse', 'nantes'],  // Sud-Ouest / Atlantique
  },

  nantes: {
    quartiers: [
      { name: 'Bouffay / Centre', ambiance: "Studios installés et clientèle fidèle. Mixte d'actifs et créatifs." },
      { name: 'Île de Nantes', ambiance: "Quartier créatif émergent. Studios alternatifs et formats hybrides (danse-yoga, soundyoga)." },
      { name: 'Hauts-Pavés / Saint-Felix', ambiance: "Bourgeoisie traditionnelle. Demande forte Hatha doux, prénatal, seniors." },
      { name: 'Doulon / Bottière', ambiance: "Quartier jeunes parents. Yoga enfants, postnatal, ateliers familiaux." },
      { name: 'Erdre / Versailles', ambiance: "Cours en plein air le long de l'Erdre aux beaux jours. Ambiance bucolique." },
    ],
    marcheLocal: `Nantes a une scène yoga particulièrement créative qui valorise l'hybridation (danse-yoga, acro, sound healing, yoga-écriture). La ville attire beaucoup de profs en reconversion (anciens·nes artistes, danseurs·ses, thérapeutes) qui apportent des angles originaux. Le défi local : trouver son créneau dans un paysage saturé d'offres alternatives — pas évident pour un·e prof "yoga classique" qui démarre. L'avantage : forte demande pour des retraites week-end sur la côte sud bretonne (Pornic, Pornichet, Noirmoutier, Guérande), souvent rentables à 200-400 € par participant·e.`,
    faq: [
      {
        q: "Pourquoi la scène yoga nantaise est-elle si 'créative' ?",
        r: "Trois raisons : (1) Nantes a un fort tissu d'écoles d'art (Beaux-Arts, École de Design) qui forme une population créative qui se réoriente parfois vers le bien-être ; (2) la culture associative et coopérative locale facilite les formats hybrides (yoga + théâtre, yoga + écriture, yoga + arts visuels) ; (3) l'Île de Nantes, quartier en pleine reconversion culturelle, attire les profs qui veulent expérimenter. Si tu es 'yoga classique', tu trouves ta place, mais tu auras intérêt à te démarquer rapidement."
      },
      {
        q: "Combien gagne un·e prof de yoga à Nantes ?",
        r: "Une prof confirmée avec 9-13 cours hebdo facture 2 200 à 3 800 € brut/mois. Net après charges : 1 700 à 2 900 €. À retrancher 350-650 €/mois de location de salle (loyers nantais modérés). Net réaliste : 1 350 à 2 250 €/mois. Possibilité forte de monter avec retraites week-end côte sud bretonne (Pornic, Pornichet, Noirmoutier) très demandées par la clientèle nantaise."
      },
      {
        q: "Où organiser une retraite yoga depuis Nantes ?",
        r: "Quatre destinations classiques : (1) Pornic et la côte de Jade (1h en voiture, gîtes et auberges) — idéal pour 1-2 jours ; (2) presqu'île de Guérande et marais salants — ambiance unique, partenariats avec saliculteurs ; (3) Noirmoutier (passage du Gois selon marées) — déconnexion totale ; (4) La Baule pour du plus premium. Tarif retraite type : 200-350 € par participant·e tout compris pour un week-end, capacité 10-14 personnes."
      },
    ],
    villesProches: ['rennes', 'bordeaux'],  // Atlantique
  },

  strasbourg: {
    quartiers: [
      { name: 'Krutenau (centre-est)', ambiance: "Quartier alternatif et étudiant. Studios indé créatifs et tarifs accessibles." },
      { name: 'Petite France (centre)', ambiance: "Studios touristiquement attractifs. Clientèle internationale et bilingue." },
      { name: 'Neudorf (sud)', ambiance: "Familles et fonctionnaires européens. Demande forte yoga prénatal et yoga enfants." },
      { name: 'Robertsau / Wacken', ambiance: "Quartier institutions européennes. Cours en anglais et yoga d'entreprise très demandés." },
      { name: 'Cronenbourg / Hautepierre', ambiance: "Quartiers populaires. Yoga associatif et ateliers municipaux importants." },
    ],
    marcheLocal: `Strasbourg a une scène atypique en France, marquée par la proximité allemande : des pratiques plus rigoureuses, une demande réelle pour des cours en anglais et en allemand, et un public habitué aux formats d'atelier. Le défi local est la taille du marché, plus petite que dans les autres métropoles, ce qui rend une niche trop étroite risquée. L'avantage est le transfrontalier, avec l'Allemagne à quelques minutes, et des retraites possibles dans les Vosges ou la Forêt-Noire.`,
    faq: [
      {
        q: "Cours de yoga en allemand ou bilingue à Strasbourg : vraie demande ?",
        r: "Oui, c'est une niche qui marche très bien à Strasbourg, portée par les fonctionnaires européens (Parlement, Conseil de l'Europe), les expatrié·e·s allemand·e·s installé·e·s, et les frontaliers travaillant à Kehl. Plusieurs profs proposent des cours bilingues français/allemand ou des cours en anglais à destination de cette clientèle internationale. Tarif souvent légèrement supérieur (16-22 € vs 14-18 € en classique français)."
      },
      {
        q: "Combien gagne un·e prof de yoga à Strasbourg ?",
        r: "Une prof confirmée avec 8-12 cours hebdo facture 2 200 à 3 700 € brut/mois. Net après charges : 1 700 à 2 800 €. À retrancher 350-650 €/mois de location de salle. Net réaliste : 1 350 à 2 150 €/mois. Possibilité de monter avec créneau bilingue ou yoga d'entreprise (institutions européennes payent 100-150 €/séance d'1h)."
      },
      {
        q: "Où organiser une retraite yoga depuis Strasbourg ?",
        r: "Trois zones classiques : (1) les Vosges (Munster, Gérardmer, Le Hohwald) — accès facile, gîtes nombreux, paysages variés ; (2) la Forêt-Noire allemande (Triberg, Baden-Baden) — décor magique, partenariats possibles avec spas allemands ; (3) la Route des Vins en Alsace — formats yoga & vin (Riesling), partenariats avec domaines viticoles. Tarif retraite type : 250-450 € par participant·e tout compris."
      },
    ],
    villesProches: ['lille'],  // Grand Est / Nord
  },

  lille: {
    quartiers: [
      { name: 'Vieux-Lille', ambiance: "Studios premium. Clientèle CSP+ et touristique. Tarifs en haut de fourchette." },
      { name: 'Wazemmes (sud-centre)', ambiance: "Quartier alternatif et étudiant. Tarifs accessibles, format hybride populaire." },
      { name: 'Saint-Maurice / Fives', ambiance: "Familles et jeunes parents. Yoga prénatal et enfants en forte demande." },
      { name: 'Vauban-Esquermes', ambiance: "Étudiants Sciences-Po, écoles d'ingé. Vinyasa rapide et créneaux soir/midi." },
      { name: 'Lambersart / Hellemmes', ambiance: "Banlieue bourgeoise. Hatha doux, seniors, yoga thérapeutique." },
    ],
    marcheLocal: `Lille a une scène yoga discrète mais structurée, marquée par la position transfrontalière (Belgique à 30 min, Tournai à 25 min). Forte demande pour yoga d'entreprise (Lille est un hub tertiaire majeur du Nord) et yoga doux/thérapeutique (population active vieillissante). Le défi local : un marché qui croît moins vite que Bordeaux ou Lyon, avec une saisonnalité forte (creux hivernal marqué). L'avantage : peu de concurrence en niche premium, possibilité de tarifs intermédiaires (15-19 €) sans difficulté.`,
    faq: [
      {
        q: "Pourquoi le yoga d'entreprise marche-t-il particulièrement bien à Lille ?",
        r: "Lille a un tissu tertiaire dense (banque, assurance, retail, logistique) avec beaucoup de sièges sociaux régionaux. Les DRH lillois·es ont intégré rapidement les pratiques bien-être en entreprise dans leurs plans QVCT. Pour un·e prof solo, une intervention type 'yoga lunch break' rapporte 80-130 €/h avec un trajet de 5-15 min sur site. Plusieurs profs lilloises génèrent 40-60 % de leur CA via le B2B entreprise."
      },
      {
        q: "Combien gagne un·e prof de yoga à Lille ?",
        r: "Une prof confirmée avec 9-13 cours hebdo (mix studio + entreprise) facture 2 400 à 4 000 € brut/mois. Net après charges : 1 850 à 3 050 €. À retrancher 350-650 €/mois de location. Net réaliste : 1 500 à 2 400 €/mois. Possibilité importante de monter avec contrats entreprise (plusieurs sièges sociaux régionaux paient 100-130 €/séance hebdo)."
      },
      {
        q: "Y a-t-il de la demande yoga depuis la Belgique pour des cours à Lille ?",
        r: "Oui, modérée mais réelle. Plusieurs élèves viennent de Tournai, Mouscron, et de la métropole de Mons par train ou voiture (25-45 min). Quelques profs lilloises ont aussi développé une clientèle bruxelloise pour des stages week-end à Lille (Bruxelles-Lille en 35 min en Eurostar). Pour structurer cette clientèle, certaines profs communiquent activement sur les groupes Facebook 'expats français en Belgique'."
      },
    ],
    villesProches: ['strasbourg'],  // Nord / Grand Est
  },

  montpellier: {
    quartiers: [
      { name: 'Comédie / Écusson', ambiance: "Centre historique avec studios installés. Cours du midi pour actifs du tertiaire." },
      { name: 'Antigone / Polygone', ambiance: "Quartier moderne et tertiaire. Yoga d'entreprise et formats lunch break demandés." },
      { name: 'Beaux-Arts / Boutonnet', ambiance: "Quartier étudiant et créatif. Studios indé et tarifs accessibles." },
      { name: 'Port Marianne (sud-est)', ambiance: "Quartier neuf CSP+. Demande premium, Yin et yoga thérapeutique." },
      { name: 'Aiguelongue / Pas du Loup (nord)', ambiance: "Familles et seniors actifs. Hatha doux et yoga prénatal/postnatal." },
    ],
    marcheLocal: `Montpellier est devenue ces 5 dernières années l'une des destinations préférées des profs en reconversion ou en relocalisation : qualité de vie méditerranéenne, climat, prix immobiliers (avant la flambée 2024), proximité mer + montagnes (Cévennes). La scène yoga y est en pleine expansion, avec une croissance estimée à +15-20 % de profs indé par an. Le défi : l'offre se densifie vite, ce qui pousse à se spécialiser tôt (niche, format premium, public spécifique). L'avantage : forte demande en cours de plein air (parc Charpak, plages de Carnon/Palavas 15 min) et retraites week-end dans les Cévennes ou sur la côte.`,
    faq: [
      {
        q: "Pourquoi tant de profs s'installent à Montpellier en 2026 ?",
        r: "Trois facteurs : (1) cadre de vie méditerranéen (300 jours de soleil/an, mer à 15 min, montagne à 1h) ; (2) tissu universitaire et tertiaire en croissance qui structure une clientèle à fort pouvoir d'achat ; (3) coûts immobiliers et de salle restés tenables jusqu'en 2024 (loyers salle 22-50 €/h). Beaucoup de profs ont fait l'arbitrage vs Paris ou Lyon. La concurrence augmente, mais le marché aussi."
      },
      {
        q: "Combien gagne un·e prof de yoga à Montpellier ?",
        r: "Une prof confirmée avec 10-14 cours hebdo facture 2 600 à 4 400 € brut/mois. Net après charges : 2 000 à 3 350 €. À retrancher 350-700 €/mois de location de salle. Net réaliste : 1 650 à 2 650 €/mois. Possibilité forte de monter avec retraites Cévennes ou côte (Carnon, Palavas, La Grande-Motte)."
      },
      {
        q: "Yoga en plein air à Montpellier : où et comment ?",
        r: "Trois spots principaux : (1) parc Charpak / domaine de Grammont — accessible toute l'année, accès facile ; (2) plages de Carnon et Palavas le matin (juin à septembre) — 20 min en voiture ou en tram ; (3) Cévennes pour stages week-end (Anduze, Ganges, vallée de la Vis) — 1h en voiture, plusieurs gîtes adaptés. Format cours plein air type : 18-22 € par participant, capacité 8-15 personnes."
      },
    ],
    villesProches: ['toulouse', 'lyon', 'marseille'],  // Sud / Occitanie
  },

  rennes: {
    quartiers: [
      { name: 'Centre / Cathédrale', ambiance: "Studios installés au cœur de la ville. Clientèle CSP+ et touristique." },
      { name: 'Sainte-Anne / République', ambiance: "Quartier étudiant. Formats accessibles et créatifs (acroyoga, danse-yoga)." },
      { name: "Thabor / Bourg-l'Évêque", ambiance: "Bourgeoisie rennaise. Hatha doux, yoga seniors, yoga thérapeutique." },
      { name: 'Beauregard / Villejean (nord)', ambiance: "Familles et jeunes parents. Forte demande prénatal et yoga enfants." },
      { name: 'Sud Gare / Cleunay', ambiance: "Quartiers en mutation. Studios alternatifs émergents et tarifs accessibles." },
    ],
    marcheLocal: `Rennes a une scène plus discrète que sa taille ne le laisserait supposer, avec une concurrence modérée et un marché qui reste ouvert. La demande porte beaucoup sur le yoga doux, le prénatal et les seniors, et le yoga en entreprise y trouve un terrain favorable dans un bassin très tertiaire. Le défi local tient aux tarifs, un peu plus bas qu'ailleurs, compensés par des coûts de salle et de vie eux aussi plus bas.`,
    faq: [
      {
        q: "Le marché yoga à Rennes est-il porteur en 2026 ?",
        r: "Oui mais lentement. Rennes est une métropole où la scène yoga reste discrète au regard de sa population, donc le marché a de la marge, mais la culture bretonne plus réservée sur les pratiques bien-être ralentit la croissance. Pour un·e prof qui démarre : focus fidélisation et bouche-à-oreille plutôt que stratégie de volume."
      },
      {
        q: "Combien gagne un·e prof de yoga à Rennes ?",
        r: "Une prof confirmée avec 9-13 cours hebdo facture 2 100 à 3 600 € brut/mois. Net après charges : 1 600 à 2 750 €. À retrancher 300-600 €/mois de location de salle (loyers rennais accessibles). Net réaliste : 1 300 à 2 150 €/mois. Possibilité de monter avec contrats yoga d'entreprise (Rennes Atalante, sièges sociaux tertiaires)."
      },
      {
        q: "Où organiser une retraite yoga depuis Rennes ?",
        r: "Trois destinations classiques : (1) la côte d'Émeraude (Saint-Malo, Cancale, Dinard) à 1h — paysages spectaculaires, beaucoup de gîtes ; (2) golfe du Morbihan (Vannes, presqu'île de Rhuys) à 1h30 — eau apaisante, microclimat ; (3) Brocéliande / forêt de Paimpont à 30 min — ambiance mystique. Tarif retraite type : 220-400 € par participant·e tout compris."
      },
    ],
    villesProches: ['nantes'],  // Bretagne / Pays de la Loire
  },

  nice: {
    quartiers: [
      { name: 'Vieux-Nice', ambiance: "Studios touristiquement attractifs. Clientèle internationale et cours bilingues." },
      { name: 'Carré d\'Or / Masséna', ambiance: "Premium et CSP+. Tarifs en haut de fourchette (18-25 €/cours)." },
      { name: 'Cimiez', ambiance: "Bourgeoisie traditionnelle. Hatha doux, yoga seniors, yoga thérapeutique." },
      { name: 'Riquier / Saint-Roch', ambiance: "Quartiers populaires et créatifs. Tarifs accessibles, studios coopératifs." },
      { name: 'Promenade / Bord de mer', ambiance: "Yoga en plein air sur la promenade des Anglais. Cours d'été matin/soir." },
    ],
    marcheLocal: `Nice a une scène yoga atypique : très internationale (Russes, Anglais·es, Italien·ne·s, Belges installé·e·s), avec une forte saisonnalité (creux décembre-février, explosion mai-octobre). Les profs niçoises qui réussissent maitrisent l'anglais (parfois l'italien), et savent jongler entre clientèle locale (CSP+) et touristique. Tarifs intermédiaires à premium (16-22 € en moyenne, jusqu'à 25 € en haut de gamme). Forte demande pour les cours de plein air sur la promenade des Anglais ou dans les jardins de Cimiez.`,
    faq: [
      {
        q: "Cours de yoga en anglais à Nice : vraie niche ?",
        r: "Oui, niche très porteuse à Nice. La clientèle expat (Anglais·es, Américain·e·s, Européen·ne·s du Nord installé·e·s sur la Côte d'Azur) cherche activement des cours en anglais et accepte des tarifs premium (20-25 €). Pour démarrer, vise les quartiers Carré d'Or, Cimiez et Vieux-Nice. Communique sur les groupes Facebook 'Expats in Nice' et 'British in Nice' qui rassemblent plusieurs milliers de personnes."
      },
      {
        q: "Combien gagne un·e prof de yoga à Nice ?",
        r: "Une prof confirmée avec 9-13 cours hebdo facture 2 700 à 4 500 € brut/mois (tarifs niçois supérieurs à la moyenne). Net après charges : 2 050 à 3 450 €. À retrancher 400-800 €/mois de location de salle (loyers niçois élevés). Net réaliste : 1 650 à 2 650 €/mois. Forte saisonnalité : 130 % de l'objectif en haute saison (mai-octobre), 70-80 % en basse saison."
      },
      {
        q: "Comment gérer la saisonnalité yoga à Nice ?",
        r: "Trois stratégies qui marchent localement : (1) basculer en formule \"drop-in payant\" plus chère pendant l'été (tarif 22-28 € au lieu du carnet régulier) pour capter la clientèle touristique ; (2) proposer des stages courts intensifs (3-5 jours) qui marchent bien en saison ; (3) garder un cœur de clientèle locale fidèle via carnets longs (20-30 cours) pour amortir la basse saison. Les meilleures profs niçoises font 50 % de leur CA annuel entre mai et octobre."
      },
    ],
    villesProches: ['marseille'],  // PACA
  },
};
