/**
 * content/cities-extra-pilates.js — surcharges Pilates des pages villes.
 *
 * POURQUOI (mesuré le 2026-08-28, pas supposé) : les 11 pages /prof-pilates-*
 * servaient le contenu YOGA. Constaté en production sur /prof-pilates-paris,
 * qui affichait la FAQ « Combien gagne réellement un·e prof de yoga à Paris ? »,
 * « Où louer une salle de yoga pas chère à Paris ? », et des quartiers décrits
 * en termes de Vinyasa. Ce n'était pas qu'un problème d'indexation : une prof
 * de Pilates arrivait sur une page qui ne parlait pas de son métier.
 *
 * La cause était structurelle. `cities.js` portait déjà, pour chaque ville, une
 * description, des lieux, des stats et une citation Pilates, et LocalLanding
 * savait les fusionner. Mais `cities-extra.js` (quartiers, marché local, FAQ)
 * n'avait aucun niveau « discipline » : ces trois blocs restaient bloqués sur
 * le yoga, quelle que soit la page.
 *
 * Côté Search Console, ça se voyait aussi : 77 % du texte d'une page ville est
 * partagé avec ses 21 soeurs, la paire yoga/pilates d'une même ville était à
 * 75 % de mots communs, et sur 3 mois AUCUNE page ville n'a récolté la moindre
 * impression dans le rapport « fonctionnalités génératives ».
 *
 * ⚠️ RÈGLE D'ÉCRITURE, non négociable : tout chiffre ci-dessous vient DÉJÀ du
 * bloc `pilates` de la même ville dans `cities.js`, donc il est déjà publié sur
 * la même page. On ne fabrique aucune statistique pour remplir du volume. Si un
 * chiffre bouge dans cities.js, il doit bouger ici : c'est la même source.
 *
 * Fichier séparé de cities-extra.js à dessein : le yoga y garde son contenu
 * d'origine intact, et une future discipline s'ajoute sans toucher aux deux.
 */
export const CITIES_EXTRA_PILATES = {
  paris: {
    quartiers: [
      { name: 'Le Marais (3e-4e)', ambiance: "Studios Reformer premium et clientèle CSP+. C'est ici que le haut de la fourchette passe sans discussion, à condition d'assumer un vrai niveau technique." },
      { name: 'Bastille / 11e', ambiance: "Le terrain du Mat en salle louée à la séance. Idéal pour démarrer sans immobiliser 10 à 15 k€ dans des appareils." },
      { name: 'Trocadéro / 16e / 7e', ambiance: "Clientèle historique du Pilates, très demandeuse de 1-à-1 Reformer et de suivi postural sur plusieurs mois. Peu de volume, panier moyen élevé." },
      { name: 'Sud-Est (12e-13e)', ambiance: "Studios coopératifs et créneaux partagés. Loyers plus tenables pour un planning Mat dense." },
    ],
    marcheLocal: `Paris est le marché Pilates le plus dense et le plus segmenté de France, et ces segments ne se gèrent pas pareil. Le Mat traditionnel se lance en salle louée (50-90 €/h) avec un tarif collectif de 22 à 30 €. Le Reformer demande soit 10 à 15 k€ de matériel, soit la location d'un studio déjà équipé (70-130 €/h), et se facture 35 à 55 € en collectif, 80 à 150 € en 1-à-1. Le Pilates Clinical, lui, vit surtout des prescriptions et du bouche-à-oreille kiné. Le calcul parisien reste le même dans les trois cas : sur du Reformer à 5 ou 6 personnes maximum, chaque place vide se voit immédiatement dans le résultat du mois.`,
    faq: [
      {
        q: "Faut-il acheter des Reformer pour enseigner le Pilates à Paris ?",
        r: "Pas pour démarrer. Équiper un studio Reformer représente 10 à 15 k€ de matériel, alors que louer un studio déjà équipé se négocie 70 à 130 €/h à Paris, contre 50 à 90 €/h pour une salle nue en Mat. La bascule vers l'achat se calcule simplement : tant que tu ne remplis pas assez de créneaux Reformer pour couvrir un loyer fixe, la location à l'heure reste plus prudente. Beaucoup de profs parisiennes démarrent en Mat, constituent leur base d'élèves, puis ajoutent du Reformer une fois le planning stable."
      },
      {
        q: "Combien facturer un cours de Pilates à Paris ?",
        r: "Les fourchettes constatées à Paris : 22 à 30 € pour un collectif Mat, 35 à 55 € pour un collectif Reformer, 80 à 150 € pour du 1-à-1 Reformer. L'écart entre Mat et Reformer n'est pas qu'une question de matériel : la jauge tombe à 5 ou 6 personnes sur appareils, donc le prix par place doit absorber une salle deux fois moins remplie. Sur du 1-à-1, la régularité compte plus que le tarif affiché : un carnet de 10 séances payé d'avance vaut mieux qu'un prix plus élevé réglé au coup par coup."
      },
      {
        q: "Mat ou Reformer : par quoi commencer à Paris ?",
        r: "Le Mat si tu veux tester ton créneau et ton quartier sans engagement, le Reformer si tu vises la clientèle du Marais, du 16ᵉ ou du 7ᵉ et que tu as déjà des élèves qui te suivent. Un troisième chemin existe à Paris et il est souvent sous-estimé : le Pilates Clinical, en lien avec des kinés, qui apporte un flux régulier de personnes en rééducation et beaucoup moins de saisonnalité qu'un planning de cours collectifs."
      },
    ],
  },

  lyon: {
    quartiers: [
      { name: '6e arrondissement', ambiance: "Le coeur du Reformer lyonnais. Clientèle qui accepte le haut de la fourchette si le suivi est sérieux et le groupe petit." },
      { name: 'Croix-Rousse (4e)', ambiance: "Studios spécialisés et profs qui combinent Pilates avec le yoga ou la danse. Public fidèle, sensible au rapport qualité-prix." },
      { name: "Presqu'île (2e)", ambiance: "Créneaux du midi et de fin de journée pour une clientèle active. Le Mat y remplit mieux que le Reformer." },
      { name: '7e (Guillotière, Jean-Macé)', ambiance: "Loyers de salle plus doux, clientèle jeune et mixte. Bon terrain pour un planning Mat dense à tarif accessible." },
    ],
    marcheLocal: `Le Pilates lyonnais est encore majoritairement du Mat (environ 75 % de l'offre), mais le Reformer gagne du terrain dans le 6ᵉ et à la Croix-Rousse. La différence avec Paris est nette et il faut la prendre au sérieux : la clientèle lyonnaise regarde le rapport qualité-prix. Les studios qui tiennent sont ceux qui proposent du Reformer entre 35 et 50 € le collectif, pas du premium à la parisienne. Avec des salles à 30-70 €/h et un collectif Mat entre 16 et 25 €, l'équation lyonnaise autorise des groupes plus petits qu'à Paris. Beaucoup de profs d'ici combinent le Pilates avec une autre discipline pour lisser leur planning et leurs revenus sur l'année.`,
    faq: [
      {
        q: "Le Reformer est-il rentable à Lyon ?",
        r: "Oui, mais pas au tarif parisien. Le marché lyonnais se situe entre 35 et 50 € le cours collectif Reformer, pour des salles à 30-70 €/h selon qu'elles sont nues ou équipées. Le piège serait de calquer un positionnement premium sur une clientèle qui compare : à Lyon, un remplissage régulier à tarif juste rapporte davantage qu'un tarif élevé sur des créneaux à moitié vides."
      },
      {
        q: "Combien facturer un cours de Pilates Mat à Lyon ?",
        r: "Entre 16 et 25 € le collectif, selon le quartier et la taille du groupe. Sur la Croix-Rousse et dans le 7ᵉ, la fourchette basse remplit mieux ; dans le 6ᵉ, la fourchette haute passe si le groupe reste petit. La vraie variable de revenu à Lyon n'est pas le prix à la séance mais le carnet : dix séances payées d'avance sécurisent ton mois bien mieux qu'un tarif unitaire de deux euros plus élevé."
      },
      {
        q: "Peut-on combiner Pilates et yoga sur un même planning à Lyon ?",
        r: "C'est même le schéma le plus courant ici : beaucoup de profs lyonnaises viennent du yoga ou de la danse classique et gardent les deux disciplines. Attention à un détail très concret quand tu t'organises : un carnet vendu pour du yoga ne devrait pas forcément servir sur un cours Reformer dont la jauge est deux fois plus petite. Dans IziSolo, chaque offre précise les types de cours qu'elle couvre, ce qui évite qu'un carnet à 16 € la séance vienne payer une place à 45 €."
      },
    ],
  },

  bordeaux: {
    quartiers: [
      { name: 'Chartrons', ambiance: "Zone premium du Pilates bordelais. Studios Reformer, parfois adossés à une offre spa, clientèle qui vient chercher du haut de gamme." },
      { name: 'Saint-Pierre / centre', ambiance: "Créneaux du midi et du soir, clientèle active. Le Mat y tourne bien, le Reformer commence à s'y installer." },
      { name: 'Rive droite (Bastide)', ambiance: "Quartier émergent, loyers plus accessibles. Bon terrain pour se lancer avant que les tarifs de salle ne suivent le centre." },
    ],
    marcheLocal: `Bordeaux est probablement la 3ᵉ ville française pour le Pilates Reformer après Paris et Lyon, structurée par l'arrivée post-LGV de profs parisiennes déjà expertes sur appareils. Concrètement, le niveau technique attendu y est plus élevé qu'ailleurs en province, et la clientèle des Chartrons compare avec ce qu'elle connaissait à Paris. Les tarifs se situent entre les deux marchés : 16 à 22 € le collectif Mat, 35 à 55 € le Reformer, pour des salles à 28-65 €/h. Une particularité locale à connaître avant de fixer ton positionnement : plusieurs studios combinent le Reformer avec des prestations spa, ce qui tire le haut du marché vers une offre bien-être globale plutôt que vers le cours seul.`,
    faq: [
      {
        q: "Quel tarif pour un cours de Pilates à Bordeaux ?",
        r: "Compte 16 à 22 € pour un collectif Mat et 35 à 55 € pour un collectif Reformer. La fourchette haute du Reformer se pratique surtout aux Chartrons, où l'offre est adossée à un positionnement premium. Sur la rive droite, viser le haut de la fourchette dès le lancement est risqué : mieux vaut remplir à 35-40 € et augmenter une fois la liste d'attente installée."
      },
      {
        q: "Où louer une salle pour enseigner le Pilates à Bordeaux ?",
        r: "Les salles se négocient 28 à 65 €/h selon qu'elles sont nues ou équipées en Reformer. Trois pistes concrètes : les salles associatives et municipales, à instruire auprès de la mairie de quartier ; les studios déjà équipés qui sous-louent leurs créneaux creux, souvent en début d'après-midi ; et le partage de studio entre deux ou trois profs, très courant à Bordeaux, qui divise le fixe mais impose un planning partagé rigoureux."
      },
      {
        q: "Faut-il proposer du Reformer pour exister à Bordeaux ?",
        r: "Non, mais il faut savoir pourquoi tu n'en proposes pas. Le marché bordelais s'est structuré autour du Reformer, donc un positionnement Mat doit être assumé et expliqué : travail au sol exigeant, groupes plus grands, tarif plus accessible, progression sur la durée. Ce qui ne marche pas, c'est le Mat vendu comme un Reformer au rabais."
      },
    ],
  },

  marseille: {
    quartiers: [
      { name: '8e (Pointe-Rouge, Bonneveine)', ambiance: "Le Reformer s'y implante doucement. Clientèle résidentielle, forte saisonnalité liée à la belle saison." },
      { name: 'Vauban / Notre-Dame du Mont', ambiance: "Public jeune et familial, très demandeur de Pilates post-natal. Le Mat y remplit toute l'année." },
      { name: 'Centre (1er-6e)', ambiance: "Créneaux du midi pour les actifs, salles partagées et loyers contenus. Terrain naturel pour démarrer." },
    ],
    marcheLocal: `Le Pilates marseillais est très majoritairement du Mat, avec un Reformer qui progresse plus lentement qu'à Bordeaux ou Lyon. Les tarifs sont parmi les plus compétitifs de France (14 à 19 € le collectif Mat, 30 à 45 € le Reformer là où il existe) pour des salles à 25-65 €/h. La spécificité à exploiter est démographique : la demande de Pilates post-natal est forte, portée par une population jeune. C'est une clientèle qui vient pour une raison précise, reste plusieurs mois et se recommande beaucoup. L'autre réalité marseillaise est saisonnière : les formats en extérieur de la belle saison créent un pic d'été et un creux de rentrée qu'il faut anticiper dans la trésorerie.`,
    faq: [
      {
        q: "Le Pilates post-natal est-il un bon créneau à Marseille ?",
        r: "C'est la demande la plus soutenue localement, en lien avec une population jeune. Deux choses à cadrer avant de te lancer : la formation spécifique, qui n'est pas optionnelle sur ce public, et l'organisation des séances. Une élève en post-natal s'inscrit rarement pour un cours isolé : elle achète un accompagnement de plusieurs semaines, souvent avec des absences imprévues. Un carnet à validité longue et une règle d'annulation claire valent mieux qu'un tarif à la séance."
      },
      {
        q: "Quel tarif pour un cours de Pilates à Marseille ?",
        r: "14 à 19 € le collectif Mat, 30 à 45 € le Reformer quand il existe : ce sont des fourchettes parmi les plus basses de France. À ces prix, le revenu se joue entièrement sur le remplissage et la régularité des carnets, pas sur le tarif affiché. Une salle se loue 25 à 65 €/h : sous 6 ou 7 élèves par cours collectif Mat, l'équation devient tendue."
      },
      {
        q: "Comment gérer le creux de septembre à Marseille ?",
        r: "Les formats de plein air fonctionnent très bien de mai à septembre puis s'arrêtent net, et beaucoup de profs marseillaises encaissent le choc à la rentrée. Deux leviers concrets : vendre les carnets d'été avec une validité qui déborde sur l'automne, ce qui ramène naturellement les élèves en septembre, et ouvrir les inscriptions de rentrée avant la coupure d'été plutôt qu'après."
      },
    ],
  },

  toulouse: {
    quartiers: [
      { name: 'Carmes', ambiance: "Clientèle installée, cours en petit groupe, forte attente de technique. Le haut de la fourchette locale passe ici." },
      { name: 'Saint-Cyprien (rive gauche)', ambiance: "Loyers plus doux et public mixte. Bon terrain pour un planning Mat dense à tarif accessible." },
      { name: 'Capitole / centre', ambiance: "Créneaux du midi pour les actifs, forte concurrence sur 12h-14h. Le soir remplit mieux." },
      { name: 'Compans-Caffarelli', ambiance: "Proximité des structures de santé et du public étudiant. Terrain naturel du Pilates orienté rééducation." },
    ],
    marcheLocal: `Toulouse suit son pattern habituel : universitaire, accessible, qualitatif. Les tarifs sont parmi les plus bas de France, 13 à 17 € le collectif Mat et 28 à 40 € le Reformer quand il existe, pour des salles à 22-55 €/h. Les studios Reformer restent rares sur toute la métropole, ce qui laisse un espace réel mais demande d'assumer un investissement là où la clientèle est habituée à des prix bas. La vraie spécificité toulousaine est ailleurs : la montée du Pilates Clinical, portée par la présence des filières kiné de la fac de médecine. C'est un flux d'élèves différent, adressé par prescription, plus régulier et beaucoup moins sensible à la saisonnalité qu'un planning de cours collectifs.`,
    faq: [
      {
        q: "Peut-on vivre du Pilates à Toulouse avec des tarifs aussi bas ?",
        r: "Oui, à condition de raisonner en volume et en récurrence plutôt qu'en prix à la séance. Avec un collectif Mat entre 13 et 17 € et une salle à 22-55 €/h, le seuil de rentabilité se joue au nombre d'élèves par cours et à la part de carnets payés d'avance. Le complément qui change tout à Toulouse, ce sont les séances individuelles et le Pilates orienté rééducation, dont le tarif horaire n'a rien à voir avec celui du collectif."
      },
      {
        q: "Le Pilates Clinical, c'est quoi concrètement à Toulouse ?",
        r: "C'est du Pilates adapté à la rééducation, travaillé en lien avec des kinésithérapeutes, et c'est une vraie spécificité locale liée aux filières de la fac de médecine. Pour une prof, ça change trois choses : le public arrive par prescription plutôt que par les réseaux, les séances sont souvent individuelles ou en très petit groupe, et le suivi s'étale sur des mois. Attention au cadre : accompagner une personne en rééducation suppose une formation adaptée et une articulation claire avec le praticien qui la suit."
      },
      {
        q: "Où trouver une salle abordable pour du Pilates à Toulouse ?",
        r: "Entre 22 et 55 €/h selon l'équipement. Les pistes les moins chères sont les salles municipales et associatives, dossier à monter auprès de la mairie de quartier, et les créneaux creux sous-loués par des studios déjà équipés. Sur les quartiers étudiants, les créneaux de fin d'après-midi partent vite : réserve tes horaires plusieurs mois à l'avance si tu vises Saint-Cyprien ou le Capitole."
      },
    ],
  },

  nantes: {
    quartiers: [
      { name: 'Centre-ville / Graslin', ambiance: "Créneaux du midi et du soir pour une clientèle active. Le Mat y remplit bien, le Reformer s'installe progressivement." },
      { name: 'Île de Nantes', ambiance: "Quartier en développement, studios récents et formats hybrides. Terrain favorable aux propositions un peu différentes." },
      { name: 'Hauts-Pavés / Saint-Félix', ambiance: "Population de jeunes parents, forte demande de Pilates post-natal et de créneaux en journée." },
    ],
    marcheLocal: `La scène Pilates nantaise ressemble à la ville : créative et hybride. On y trouve beaucoup de formats mêlant Pilates et danse ou travail corporel, et le Mat représente environ 80 % de l'offre. Les tarifs sont modérés, 14 à 19 € le collectif Mat et 30 à 45 € le Reformer, pour des salles à 22-50 €/h. Deux gisements se dégagent nettement : le post-natal, porté par une population de jeunes parents, et les retraites sur la côte sud bretonne, à Pornic, Pornichet ou Noirmoutier, qui combinent Pilates et marche en bord de mer. Une retraite change la structure de revenus d'une année entière : quelques week-ends peuvent peser autant que plusieurs mois de cours collectifs.`,
    faq: [
      {
        q: "Organiser une retraite Pilates depuis Nantes, ça se prépare comment ?",
        r: "La côte sud bretonne est à portée de week-end, ce qui explique que tant de profs nantaises s'y mettent. Le contenu coince rarement ; l'organisation, si : encaisser des acomptes, gérer les désistements tardifs, savoir en temps réel qui a payé quoi. Écris ta règle d'annulation avant d'ouvrir les inscriptions, et fixe une date à partir de laquelle l'acompte reste acquis."
      },
      {
        q: "Quel tarif pour un cours de Pilates à Nantes ?",
        r: "14 à 19 € le collectif Mat, 30 à 45 € le Reformer, pour des salles à 22-50 €/h. Sur un planning majoritairement Mat, le revenu vient du nombre de créneaux et de la fidélité, pas du prix unitaire : c'est le carnet, et sa durée de validité, qui font la différence entre un mois correct et un mois inquiétant."
      },
      {
        q: "Les formats hybrides Pilates et danse fonctionnent-ils à Nantes ?",
        r: "C'est une marque de fabrique locale et ça remplit, à une condition : que l'élève comprenne ce qu'elle achète. Un cours annoncé comme du Pilates classique qui vire au mouvement créatif déçoit ; le même cours annoncé pour ce qu'il est trouve son public. Nomme précisément tes types de cours, ils servent aussi à cadrer ce que couvrent tes carnets."
      },
    ],
  },

  strasbourg: {
    quartiers: [
      { name: 'Krutenau', ambiance: "Public jeune et étudiant, sensible au tarif. Le Mat en petit groupe y fonctionne toute l'année." },
      { name: 'Neustadt', ambiance: "Clientèle installée et institutions européennes. Terrain des cours bilingues et du suivi régulier." },
      { name: 'Petite France / centre', ambiance: "Créneaux du midi pour les actifs, forte fréquentation touristique l'été. Le soir reste le vrai volume." },
    ],
    marcheLocal: `Le Pilates strasbourgeois est discret mais techniquement exigeant, marqué par l'influence allemande : beaucoup de profs se sont formées à la méthode Stott ou directement outre-Rhin. Le Mat domine (environ 75 % de l'offre), le Reformer progresse. Les tarifs restent modérés, 14 à 18 € le collectif Mat et 30 à 45 € le Reformer, pour des salles à 22-50 €/h. Deux leviers sont propres à la ville : les cours bilingues français-allemand, qui ouvrent la clientèle des fonctionnaires européens et des frontaliers, et les retraites dans les Vosges ou en Forêt-Noire montées avec des hôtels-spa. Les deux supposent une organisation carrée, notamment pour la facturation quand une partie de la clientèle est employée par une institution.`,
    faq: [
      {
        q: "Faut-il enseigner en allemand pour percer à Strasbourg ?",
        r: "Ce n'est pas obligatoire, mais c'est le différenciant local le plus efficace. La clientèle frontalière et celle des institutions européennes cherche des cours bilingues et les trouve rarement. Si tu t'y mets, sois précise dans l'annonce du créneau : un cours réellement bilingue, où chaque consigne est donnée deux fois, ne se déroule pas au même rythme qu'un cours en français avec quelques mots d'allemand."
      },
      {
        q: "Quel tarif pour un cours de Pilates à Strasbourg ?",
        r: "14 à 18 € le collectif Mat, 30 à 45 € le Reformer, pour des salles à 22-50 €/h. Le niveau d'exigence technique local, hérité de la formation à l'allemande, justifie de te situer dans le haut de la fourchette si ta formation le soutient : ici, la qualité de la correction posturale se remarque et se recommande."
      },
      {
        q: "Comment gérer les élèves envoyées par une institution ou une entreprise ?",
        r: "Le cas est fréquent à Strasbourg et il achoppe presque toujours sur le même point : le payeur n'est pas l'élève. Il te faut une facture au nom de la structure, avec ton numéro d'entreprise et un numéro de pièce séquentiel. IziSolo émet ces factures dès que ton numéro d'identification est renseigné dans tes paramètres, et sait regrouper plusieurs séances sur un seul document mensuel."
      },
    ],
  },

  lille: {
    quartiers: [
      { name: 'Wazemmes', ambiance: "Culture associative forte, public jeune et mixte. Terrain naturel du Mat à tarif accessible." },
      { name: 'Vieux-Lille', ambiance: "Clientèle installée, petits groupes, attente de qualité. Le haut de la fourchette locale passe ici." },
      { name: 'Vauban', ambiance: "Proximité des écoles et du milieu de la danse. Beaucoup de demandes de travail postural et de barre au sol." },
    ],
    marcheLocal: `Lille est la capitale française de la danse contemporaine, et ça déteint directement sur son Pilates : formats mêlant barre au sol, travail postural pour danseurs et ateliers de mouvement. Le Mat domine très largement, le Reformer reste émergent. Les tarifs sont accessibles, 13 à 17 € le collectif Mat et 28 à 42 € le Reformer là où il existe, pour des salles à 20-45 €/h, les plus abordables de notre panel de villes. La proximité de la Belgique amène une clientèle binationale, ce qui a une conséquence pratique souvent découverte trop tard : une élève belge qui te demande une facture n'attend pas les mêmes mentions qu'une élève française.`,
    faq: [
      {
        q: "Le public danseur, ça change quoi pour un cours de Pilates à Lille ?",
        r: "Le niveau d'attente technique monte d'un cran et le vocabulaire change : ces élèves connaissent leur corps, repèrent une consigne approximative, et viennent chercher un travail précis en complément d'une pratique intensive. En contrepartie, elles sont assidues et se recommandent entre elles. C'est un public à petits groupes, pas à cours de vingt personnes."
      },
      {
        q: "Quel tarif pour un cours de Pilates à Lille ?",
        r: "13 à 17 € le collectif Mat et 28 à 42 € le Reformer, avec des salles entre 20 et 45 €/h, soit les loyers les plus doux de notre panel. Cette structure de coûts autorise des groupes plus petits qu'ailleurs à rentabilité égale, ce qui est un vrai atout quand tu vises un public exigeant sur la correction individuelle."
      },
      {
        q: "J'ai des élèves belges : que dois-je prévoir ?",
        r: "Une facture belge ne porte pas les mêmes mentions qu'une facture française, à commencer par l'intitulé du numéro d'entreprise. Si tu exerces en France, tes factures restent françaises quelle que soit la nationalité de l'élève. Si tu exerces en Belgique, IziSolo gère le pays d'exercice dans tes paramètres et adapte l'intitulé du numéro et les mentions imprimées. Dans les deux cas, la mention fiscale exacte se valide avec ton comptable : on ne la devine jamais à ta place."
      },
    ],
  },

  montpellier: {
    quartiers: [
      { name: 'Écusson', ambiance: "Coeur historique et studios Reformer récents. Clientèle qui accepte le haut de la fourchette pour du petit groupe." },
      { name: 'Beaux-Arts', ambiance: "Public jeune et créatif, très réceptif aux nouveaux formats. Bon terrain pour tester un créneau." },
      { name: 'Antigone / Comédie', ambiance: "Créneaux du midi pour les actifs et flux de passage important. Le Mat y remplit vite." },
    ],
    marcheLocal: `Montpellier voit son Pilates se structurer vite, dans le sillage du boom yoga local et de l'arrivée post-2020 de nouveaux habitants exigeants. Plusieurs studios Reformer ont ouvert ces trois dernières années dans l'Écusson et aux Beaux-Arts. Les tarifs montent régulièrement, 15 à 20 € le collectif Mat et 33 à 48 € le Reformer, pour des salles à 25-55 €/h. La spécificité locale à exploiter est sportive : la demande de Pilates post-effort venant des coureuses, traileuses et cyclistes, qui cherchent un travail postural précis en complément de leur entraînement. C'est un public qui raisonne en cycle de préparation, donc réceptif à un engagement de plusieurs semaines plutôt qu'à une séance d'essai isolée.`,
    faq: [
      {
        q: "Le Pilates pour sportifs, ça marche vraiment à Montpellier ?",
        r: "C'est le créneau qui monte le plus vite localement. Coureuses, traileuses et cyclistes viennent chercher du gainage profond, de la mobilité de hanches et un travail postural qu'elles ne trouvent pas dans leur club. Deux conseils concrets : cale ton discours sur leur objectif de saison plutôt que sur le vocabulaire Pilates, et propose un format sur plusieurs semaines. Ce public achète volontiers un cycle de préparation, beaucoup moins un cours isolé."
      },
      {
        q: "Quel tarif pour un cours de Pilates à Montpellier ?",
        r: "15 à 20 € le collectif Mat, 33 à 48 € le Reformer, pour des salles à 25-55 €/h. Les tarifs progressent régulièrement avec la structuration du marché : si tu te lances aujourd'hui, cale-toi sur le milieu de fourchette plutôt que sur les prix pratiqués il y a trois ans, sous peine de devoir augmenter tes élèves historiques plus tard, ce qui est toujours plus difficile."
      },
      {
        q: "Où ouvrir un créneau Pilates à Montpellier quand on démarre ?",
        r: "Les Beaux-Arts sont le meilleur terrain de test : public jeune, curieux, et loyers plus doux que dans l'Écusson. L'Écusson et Antigone remplissent plus vite mais avec une concurrence directe des studios Reformer installés. Une approche prudente consiste à démarrer par un ou deux créneaux hebdomadaires en salle louée à l'heure, mesurer le remplissage sur deux mois, et n'engager un loyer fixe qu'ensuite."
      },
    ],
  },

  rennes: {
    quartiers: [
      { name: 'Centre / Sainte-Anne', ambiance: "Créneaux du soir pour une clientèle active et étudiante. Le Mat y remplit toute l'année." },
      { name: "Thabor / Jeanne d'Arc", ambiance: "Clientèle installée et plus âgée. Terrain naturel du Pilates seniors et du travail en douceur." },
      { name: 'Villejean / Beaulieu', ambiance: "Public étudiant, tarifs serrés, forte saisonnalité universitaire. Volume possible sur des formats courts." },
    ],
    marcheLocal: `Le Pilates rennais est plus doux et plus structuré que chez ses voisines, en cohérence avec la sensibilité bien-être bretonne. Le Mat domine très largement et le Reformer reste rare, avec trois ou quatre studios sur la métropole. Les tarifs sont modérés, 13 à 17 € le collectif Mat et 28 à 42 € le Reformer, pour des salles à 22-45 €/h. Deux publics portent le marché : le prénatal et le postnatal d'un côté, les seniors de l'autre, ce qui donne une activité étalée sur la journée et beaucoup moins concentrée sur le créneau 18h-20h qu'ailleurs. Le troisième pilier local est la retraite sur la côte sud, à Quiberon, Belle-Île ou dans la presqu'île de Rhuys.`,
    faq: [
      {
        q: "Le Pilates seniors, comment on s'y prend à Rennes ?",
        r: "C'est une demande forte localement et elle se travaille en journée, pas en soirée, ce qui remplit des créneaux que personne ne veut. Trois points pratiques : des groupes plus petits pour pouvoir corriger, une progression très lente assumée dès l'annonce du cours, et de la souplesse sur les absences. Ce public annule pour raisons de santé plus souvent que la moyenne : une règle d'annulation trop rigide te coûtera des élèves fidèles."
      },
      {
        q: "Quel tarif pour un cours de Pilates à Rennes ?",
        r: "13 à 17 € le collectif Mat et 28 à 42 € le Reformer, pour des salles à 22-45 €/h. Le Reformer étant rare sur la métropole, il y a de la place, mais la clientèle rennaise n'a pas d'habitude de prix sur ce format : il faut expliquer la différence de jauge et de suivi avant d'annoncer un tarif deux fois supérieur au Mat."
      },
      {
        q: "Une retraite Pilates sur la côte bretonne, ça s'organise comment ?",
        r: "Quiberon, Belle-Île et la presqu'île de Rhuys sont les destinations habituelles des profs rennaises, en week-end ou sur trois jours. Le contenu est rarement le problème, l'organisation l'est. Ouvre les inscriptions avec un acompte, écris noir sur blanc jusqu'à quand il est remboursable, et garde une trace de qui a payé combien. Un désistement à huit jours sur un groupe de douze suffit à effacer la marge du week-end."
      },
    ],
  },

  nice: {
    quartiers: [
      { name: "Carré d'Or", ambiance: "Le haut du marché niçois. Studios Reformer premium, clientèle internationale, tarifs les plus élevés de province." },
      { name: 'Vieux Nice', ambiance: "Mélange de résidents et de séjours longs. Formats souples et cours à l'unité qui se vendent bien." },
      { name: 'Cimiez', ambiance: "Clientèle résidentielle installée, demande de 1-à-1 et de suivi régulier en journée." },
      { name: 'Riquier', ambiance: "Quartier plus abordable, public local et fidèle. Bon terrain pour un planning Mat à tarif intermédiaire." },
    ],
    marcheLocal: `Nice est la scène Pilates la plus structurée de France après Paris, et la seule où le Mat et le Reformer cohabitent à parts égales. Les tarifs sont les plus élevés de province, 18 à 28 € le collectif Mat et 38 à 65 € le Reformer, pour des salles à 32-70 €/h. La clientèle est mixte, entre locaux fidèles, résidents internationaux et séjours longs à fort pouvoir d'achat, ce qui a une conséquence directe sur l'organisation : une partie de tes élèves n'est là que quelques semaines. Un planning niçois se construit donc sur deux jambes, un noyau d'abonnées à l'année et un flux de passage qui achète à l'unité ou en petits carnets, et les deux ne se gèrent pas avec la même offre.`,
    faq: [
      {
        q: "Comment gérer une clientèle de passage à Nice ?",
        r: "En arrêtant de vouloir la faire entrer dans un carnet de dix séances. Une résidente qui reste six semaines n'achètera pas un abonnement à l'année, mais prendra volontiers un petit carnet ou des séances à l'unité à tarif plein. La bonne pratique locale est d'avoir les deux au catalogue et d'afficher clairement le prix à l'unité : c'est ce que cherche un visiteur, et c'est aussi le tarif le plus rentable à l'heure."
      },
      {
        q: "Quel tarif pour un cours de Pilates à Nice ?",
        r: "18 à 28 € le collectif Mat et 38 à 65 € le Reformer : ce sont les tarifs les plus élevés du marché national en province. Une salle se loue 32 à 70 €/h. Ce niveau de prix suppose une prestation qui suit, en particulier sur le Reformer où la clientèle internationale compare avec ce qu'elle connaît ailleurs : petits groupes, appareils en bon état, et un vrai suivi individuel."
      },
      {
        q: "Faut-il parler anglais pour enseigner le Pilates à Nice ?",
        r: "Ça élargit sérieusement ta clientèle, entre résidents internationaux et séjours longs. Pas besoin d'être bilingue : le vocabulaire du Pilates est technique mais restreint, et une centaine de consignes bien maîtrisées couvrent l'essentiel d'un cours. En revanche, pense à ta page publique et à tes emails de confirmation : c'est souvent là que la réservation se perd, pas pendant le cours."
      },
    ],
  },
};
