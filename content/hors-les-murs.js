/**
 * « Hors les murs » : le catalogue des pistes d'événements de Maude (v118).
 *
 * Chaque fiche a été VÉRIFIÉE sur la page de l'exploitant à la date de sa
 * rédaction (nom, commune, gestionnaire, contact, ce qu'il accueille déjà, lien
 * source) : rien d'inventé, et ce qui n'a pas pu être vérifié est dit tel quel
 * dans la fiche. Les distances sont des estimations routières depuis Gillonnay.
 * Les prix sont les nôtres, calés sur ce qui se pratique dans la région.
 *
 * Le mini-projet et l'email de chaque piste sont écrits POUR Maude, qui envoie
 * depuis sa boîte (maude@maude-yoga.com). Les règles de l'email sont figées par
 * lib/hors-les-murs.js (validerEmailLieu) et le verrou CI hors-les-murs.spec.js :
 * vouvoiement, aucun crochet, aucun tiret quadratin, un seul lien vers
 * maude-yoga.com, signature sur trois lignes, jamais Bordeaux ni IziSolo.
 *
 * Ce que Maude en fait (statut, texte retouché, commentaire, réponse) vit en base
 * (hlm_suivi), jamais ici. Pour ajouter une piste : une entrée de plus, vérifiée,
 * et la CI dit si son email passe.
 *
 * Rédigé le 2026-09-14 (cueillette en sept recherches vérifiées page par page).
 */
export const LIEUX = [
  {
    "id": "sassenage",
    "cat": "nature",
    "nom": "Grotte les Cuves de Sassenage",
    "lieu": "Sassenage",
    "km": 55,
    "prio": 1,
    "gest": "Régie de la mairie de Sassenage, guide historique du site",
    "contact": "grotte@sassenage.fr · 04 76 27 55 37",
    "deja": "Visites guidées, ApéroGrotte en salle Saint-Bruno (5 à 20 pers., juillet et août à 18 h), Halloween, ouverte de juin à octobre, 12 °C",
    "format": "Le Yoga de Mélusine : Séance de 2 h, 6 à 15 personnes, forfait 150 € par créneau à la grotte",
    "prix": "50 €",
    "saison": "Juin à octobre ; deux pilotes en octobre 2026",
    "src": "https://grotte.sassenage.fr/",
    "now": "Dossier envoyé à Maude le 14 septembre. En cours.",
    "echeance": "2026-10-03",
    "destinataire": {
      "nom": "Grotte les Cuves de Sassenage, régie de la mairie de Sassenage",
      "email": "grotte@sassenage.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Le Yoga de Mélusine",
      "concept": "Une séance de yoga de deux heures dans la grotte des Cuves, à 12 degrés, pour des adultes de tous niveaux : pratique douce, respiration, méditation et un temps de chant à voix basse là où la voûte porte le son. La grotte accueille déjà des visites guidées, des ApéroGrotte en salle Saint-Bruno et une soirée d'Halloween : une séance de yoga prolonge cette ouverture du site à d'autres publics, hors visite classique.",
      "format": "Séance de 2 h, 6 à 15 personnes, dans une salle de la grotte qui accueille quinze tapis (la salle Saint-Bruno reçoit déjà 5 à 20 personnes pour l'ApéroGrotte). Bâches de sol, couvertures et tisane apportées par Maude, chacun vient avec son tapis et une tenue chaude. Saison de la grotte, juin à octobre ; deux séances pilotes en octobre 2026, puis un rythme mensuel à partir de juin 2027 si les pilotes conviennent.",
      "deroule": "Accueil et descente avec le guide, 15 min · Installation, respiration et échauffement doux, 30 min · Pratique au sol et postures lentes, 45 min · Chant à voix basse et méditation, 20 min · Tisane et remontée, 10 min",
      "prix": "50 € par personne, vendus en ligne par Maude, inscription payée d'avance et jauge fermée ; forfait de 150 € par créneau reversé à la grotte. À 10 participants, 500 € de recettes dont 150 € pour la grotte ; à 15, 750 € dont 150 €.",
      "gain_lieu": "Un forfait garanti par créneau, sans billetterie ni encadrement à assurer, et une nouvelle raison de venir à la grotte pour un public qui ne fait pas de visite guidée. Photos remises au site, événement inscrit aux agendas gratuits et relayé auprès de la presse locale.",
      "demande": "Un repérage sur place d'une demi-heure pour valider la salle qui accueille quinze tapis, arrêter la formule financière (forfait par créneau ou montant par personne) et fixer les deux dates pilotes d'octobre 2026 avant la fermeture de la saison.",
      "attention": "Le froid (12 degrés, deux heures au sol) impose couvertures, tenue chaude et une pratique qui garde le corps en mouvement ; l'accès dans la grotte (escaliers, sol humide) doit être vérifié au repérage et annoncé à l'inscription. Saison courte : les pilotes d'octobre tombent en toute fin d'ouverture."
    },
    "email": {
      "objet": "Le Yoga de Mélusine, la proposition jointe",
      "corps": "Bonjour,\n\nMerci pour votre accueil de dimanche à la grotte. Vous trouverez en pièce jointe la proposition dont nous avons parlé, Le Yoga de Mélusine : une séance de deux heures à 12 degrés, pour 6 à 15 personnes, pratique douce, respiration et un temps de chant à voix basse là où la voûte porte le son.\n\nLe principe : je vends les places en ligne, 50 € par personne, jauge fermée, et je vous reverse un forfait de 150 € par créneau. J'apporte bâches de sol, couvertures et tisane, chacun vient avec son tapis. Je suis assurée en responsabilité civile professionnelle hors salle, et je vous remets les photos prises avec l'accord des participants.\n\nTrois points à voir ensemble : la salle qui accueille quinze tapis, la salle Saint-Bruno ou une autre ; la formule financière, forfait par créneau ou montant par personne ; et les deux dates pilotes d'octobre, avant la fermeture de la saison.\n\nUn repérage sur place d'une demi-heure suffirait pour trancher. Je suis disponible en semaine après 13 h, ou un samedi matin. Quel créneau vous arrangerait ?\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "grandlemps",
    "cat": "nature",
    "nom": "Réserve naturelle de la Tourbière du Grand Lemps",
    "lieu": "Châbons / Le Grand-Lemps",
    "km": 12,
    "prio": 1,
    "gest": "CEN Isère (Conservatoire d'espaces naturels)",
    "contact": "grand-lemps@cen-isere.org · 09 84 36 01 52",
    "deja": "Sentier « Jardin de Tourbières » sur platelages, visites guidées gratuites le 2e dimanche du mois, sorties de groupe sur demande, balades méditatives citées par la réserve",
    "format": "« Yoga et sons du marais » : 1 h 30 sur la plateforme d'observation au lever du jour, 20 min de lecture du paysage par une animatrice de la réserve, 12 personnes (platelages)",
    "prix": "20 à 25 €",
    "saison": "Toute l'année, printemps et automne en tête",
    "src": "https://www.cen-isere.org/sites-amenages/reserve-naturelle-nationale-du-grand-lempschabons/",
    "destinataire": {
      "nom": "Réserve naturelle de la Tourbière du Grand Lemps, CEN Isère",
      "email": "grand-lemps@cen-isere.org",
      "canal": "email"
    },
    "projet": {
      "titre": "Yoga et sons du marais",
      "concept": "Une séance de yoga au lever du jour sur la plateforme d'observation de la tourbière, précédée d'une lecture du paysage par une animatrice de la réserve. Pour des adultes curieux de nature autant que de pratique douce. La réserve propose déjà des visites guidées, des sorties de groupe et des balades méditatives : le yoga s'inscrit dans cette ligne, sans rien ajouter d'ésotérique.",
      "format": "1 h 30 sur la plateforme d'observation, au lever du jour, 12 personnes au plus pour respecter les platelages du sentier Jardin de Tourbières. 20 minutes de lecture du paysage par une animatrice de la réserve, puis la pratique. Bâches de sol et couvertures apportées par Maude, chacun vient avec son tapis. Toute l'année, printemps et automne en tête ; une première date à l'automne 2026 puis un cycle de quatre matinées saisonnières.",
      "deroule": "Marche sur les platelages jusqu'à la plateforme, 10 min · Lecture du paysage par l'animatrice, 20 min · Respiration et pratique douce, 45 min · Temps de son à voix basse et écoute du marais, 15 min",
      "prix": "20 à 25 € par personne, vendus en ligne par Maude, jauge fermée ; un montant par participant reversé à la réserve pour le temps de l'animatrice, à convenir. À 10 participants, 200 à 250 € de recettes, dont la part convenue pour la réserve.",
      "gain_lieu": "Une nouvelle forme de sortie pour un public que la réserve touche déjà avec ses balades méditatives, sans billetterie à tenir, et une rémunération du temps d'animation. Photos remises à la réserve, date inscrite aux agendas gratuits et relayée auprès de la presse locale.",
      "demande": "Un appel de dix minutes pour caler une première date, à l'automne 2026 ou au printemps 2027, et vérifier la disponibilité d'une animatrice au lever du jour.",
      "attention": "Jauge bornée par les platelages (12 personnes), sol humide et frais le matin, pratique à adapter à la plateforme ; l'accord du gestionnaire sur l'usage d'un espace protégé est un préalable, et la météo peut annuler une date."
    },
    "email": {
      "objet": "Yoga et sons du marais, au lever du jour",
      "corps": "Bonjour,\n\nJe suis professeure de yoga à Gillonnay, à douze kilomètres de la tourbière. Votre réserve propose déjà des visites guidées le deuxième dimanche du mois, des sorties de groupe sur demande et des balades méditatives : c'est dans cet esprit que je vous écris.\n\nJe propose « Yoga et sons du marais » : 1 h 30 sur la plateforme d'observation au lever du jour, pour 12 personnes au plus pour respecter les platelages. Vingt minutes de lecture du paysage par une animatrice de la réserve, puis une pratique douce, de la respiration et un temps de son à voix basse. Chacun apporte son tapis, j'apporte les bâches de sol et les couvertures, et je suis assurée hors salle.\n\nJe vends les places en ligne, 20 à 25 € par personne, jauge fermée, et nous convenons d'un montant par participant reversé à la réserve pour le temps de l'animatrice. J'inscris la date aux agendas locaux.\n\nUn appel de dix minutes suffirait pour caler une première date, cet automne ou au printemps. Je suis joignable en semaine après 13 h.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "bressieux",
    "cat": "nature",
    "nom": "Château de Bressieux",
    "lieu": "Bressieux",
    "km": 10,
    "prio": 1,
    "gest": "Commune + association Les Amis de Bressieux (location d'événements via la mairie)",
    "contact": "04 74 20 15 45 · formulaire chateau-bressieux.com",
    "deja": "Ruines en brique rose en accès libre, musée de mai à octobre, visites 5 €, Fête médiévale en juillet, Journées du patrimoine, location pour événements privés",
    "format": "« Yoga au sommet de la Bièvre » : 1 h 30 dans l'enceinte au coucher du soleil, vue sur la plaine, hebdomadaire en juillet et août, visite courte par un bénévole en option. Chemin non accessible PMR, à dire à l'inscription",
    "prix": "20 €",
    "saison": "Mai à septembre",
    "src": "https://www.chateau-bressieux.com/infos-pratiques/",
    "destinataire": {
      "nom": "Mairie de Bressieux et association Les Amis de Bressieux",
      "email": null,
      "canal": "formulaire chateau-bressieux.com, ou téléphone 04 74 20 15 45"
    },
    "projet": {
      "titre": "Yoga au sommet de la Bièvre",
      "concept": "Une séance de yoga au coucher du soleil dans l'enceinte du château de Bressieux, avec la plaine en contrebas, pour des adultes de tous niveaux, habitants et visiteurs d'été. Le château accueille déjà la Fête médiévale, les Journées du patrimoine et des locations privées : une séance hebdomadaire d'été ouvre le site à un public qui ne vient pas pour le musée.",
      "format": "1 h 30 dans l'enceinte, au coucher du soleil, 12 à 15 personnes. Hebdomadaire en juillet et août, un soir fixe à convenir, avec une visite courte par un bénévole en option avant la séance. Bâches de sol, couvertures et tisane apportées par Maude, chacun vient avec son tapis. Chemin d'accès non accessible aux personnes à mobilité réduite, annoncé à l'inscription.",
      "deroule": "Montée et visite courte par un bénévole en option, 15 min · Installation et respiration face à la plaine, 15 min · Pratique douce, 50 min · Méditation au coucher du soleil et tisane, 25 min",
      "prix": "20 € par personne, vendus en ligne par Maude, jauge fermée ; forfait par créneau ou montant par personne reversé à la commune ou à l'association, à convenir. À 10 participants, 200 € par soirée ; sur un été de huit séances, 1 600 € de recettes dont la part convenue pour le château.",
      "gain_lieu": "Un rendez-vous d'été régulier dans un site déjà ouvert, une visite courte valorisée à chaque séance, un reversement par créneau sans rien à organiser. Photos remises au château, dates inscrites aux agendas gratuits et relayées auprès de la presse locale.",
      "demande": "Un repérage sur place de trente minutes pour choisir l'emplacement dans l'enceinte, puis un soir de semaine fixe pour juillet et août 2027, à valider avant la fin de l'hiver pour entrer dans la programmation d'été.",
      "attention": "Chemin non accessible PMR, à dire à l'inscription ; météo d'été (orage, chaleur) avec repli à prévoir ou annulation ; concurrence de la Fête médiévale en juillet, à éviter la semaine concernée."
    },
    "email": {
      "objet": "Yoga au coucher du soleil au château",
      "corps": "Bonjour,\n\nJe suis professeure de yoga à Gillonnay, à dix kilomètres de Bressieux. Le château accueille déjà la Fête médiévale, les Journées du patrimoine et des locations privées, et sa vue sur la plaine au coucher du soleil se prête à une pratique en plein air.\n\nJe propose « Yoga au sommet de la Bièvre » : 1 h 30 dans l'enceinte, le soir, un rendez-vous hebdomadaire en juillet et août, avec une visite courte par un bénévole en option. Douze à quinze personnes, chacun avec son tapis ; j'apporte les bâches de sol, les couvertures et la tisane. Je suis assurée hors salle, et je préviens à l'inscription que le chemin n'est pas accessible en fauteuil.\n\nJe vends les places en ligne, 20 € par personne, et je vous reverse un forfait par créneau ou un montant par participant. J'inscris chaque date aux agendas locaux et je vous remets les photos prises avec l'accord des participants.\n\nUn repérage sur place de trente minutes me permettrait de choisir l'emplacement. Je suis disponible en semaine après 13 h.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "pupetieres",
    "cat": "nature",
    "nom": "Château de Pupetières",
    "lieu": "Châbons",
    "km": 15,
    "prio": 2,
    "gest": "Privé (château néogothique de Viollet-le-Duc) ; réceptions, mariages, séminaires proposés",
    "contact": "contact@pupetieres.fr · 06 14 30 27 31",
    "deja": "Visites théâtralisées, Plantes en folie, visites gourmandes nocturnes, Halloween, Cluedo géant, déjeuner « sous le tilleul » sur demande ; saison du 5 avril au 28 octobre",
    "format": "Mini-stage d'une demi-journée « sous le tilleul » un dimanche matin avant l'ouverture : yoga 1 h 30, thé, marche méditative dans le parc, pique-nique du château",
    "prix": "40 à 45 €",
    "saison": "Avril à octobre",
    "src": "https://pupetieres.jimdofree.com/visites-animations/",
    "now": "Journées des plantes les 26 et 27 septembre 2026 (100 exposants, 7 €) : demander un créneau « yoga au jardin » le samedi matin ou un stand animé. À appeler cette semaine.",
    "echeance": "2026-09-26",
    "destinataire": {
      "nom": "Château de Pupetières",
      "email": "contact@pupetieres.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Yoga sous le tilleul",
      "concept": "Un mini-stage d'une demi-journée dans le parc du château, un dimanche matin avant l'ouverture au public : yoga, thé, marche méditative, puis le pique-nique du château. Pour des adultes qui veulent une matinée entière hors du quotidien. Le château vit déjà de visites théâtralisées, de visites gourmandes, de Plantes en folie et de son déjeuner « sous le tilleul » : la matinée s'appuie sur ce que le lieu sait faire.",
      "format": "Demi-journée le dimanche matin, avant l'ouverture, 12 à 15 personnes : 1 h 30 de yoga dans le parc, thé, marche méditative, puis le pique-nique du château. Bâches de sol, couvertures et tisane apportées par Maude, chacun vient avec son tapis. Saison du château, avril à octobre ; un dimanche par mois de mai à septembre 2027. En plus : une séance découverte de 45 minutes le samedi matin des Journées des plantes des 26 et 27 septembre 2026, ouverte aux visiteurs.",
      "deroule": "Accueil dans le parc et respiration, 15 min · Pratique douce, 1 h 15 · Thé, 15 min · Marche méditative dans le parc, 30 min · Pique-nique du château, 45 min",
      "prix": "40 à 45 € par personne pique-nique compris, vendus en ligne par Maude, jauge fermée ; le pique-nique réglé au château et un forfait par créneau ou un montant par personne reversé pour le parc, à convenir. À 10 participants, 400 à 450 € de recettes dont la part du château. La séance découverte des Journées des plantes est comprise dans le billet d'entrée, sans facturation.",
      "gain_lieu": "Une nouvelle raison de venir un dimanche matin, un pique-nique vendu à chaque participant et une animation gratuite pour les visiteurs des Journées des plantes. Photos remises au château, dates inscrites aux agendas gratuits et relayées auprès de la presse locale.",
      "demande": "Un appel de dix minutes cette semaine pour décider d'un créneau yoga au jardin le samedi 26 septembre 2026 au matin, puis les dimanches de la saison 2027.",
      "attention": "Le 26 septembre est dans douze jours, la réponse doit venir vite ; météo d'automne avec repli sous abri à prévoir ; le pique-nique dépend de la disponibilité du château, à confirmer à chaque date."
    },
    "email": {
      "objet": "Yoga au jardin pour les Journées des plantes",
      "corps": "Bonjour,\n\nJe suis professeure de yoga à Gillonnay. Vos Journées des plantes des 26 et 27 septembre réunissent un public qui aime prendre son temps au jardin, et votre déjeuner « sous le tilleul » m'a donné l'idée d'une matinée.\n\nPour les Journées, je propose une séance découverte de 45 minutes le samedi matin, ouverte aux visiteurs et comprise dans leur billet. Pour la saison prochaine, un mini-stage d'une demi-journée « sous le tilleul » un dimanche matin avant l'ouverture : 1 h 30 de yoga, thé, marche méditative dans le parc, puis le pique-nique du château, 40 à 45 € par personne.\n\nJe vends les places en ligne, jauge fermée, et je vous reverse un forfait par créneau ou un montant par personne, pique-nique réglé en plus. Chacun apporte son tapis, j'apporte bâches et couvertures, et je suis assurée hors salle.\n\nLe 26 est proche : un appel de dix minutes cette semaine suffirait pour décider du créneau. Je suis joignable dès demain après 13 h.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "parmenie",
    "cat": "nature",
    "nom": "Centre d'accueil Notre-Dame de Parménie",
    "lieu": "Beaucroissant (col de Parménie)",
    "km": 20,
    "prio": 2,
    "gest": "Famille lasallienne (La Salle France)",
    "contact": "parmenie@lasallefrance.fr · 04 76 91 00 28",
    "deja": "Groupes, séminaires, retraites, formations, d'une journée à plusieurs semaines, restauration et hébergement sur place, face à la Chartreuse",
    "format": "Stage d'une journée avec repas : pelouses du col pour la pratique, salle en repli, 10 à 20 personnes pile dans leur cible",
    "prix": "75 à 90 € la journée repas compris",
    "saison": "Toute l'année (à confirmer)",
    "src": "https://www.parmenie.fr/",
    "destinataire": {
      "nom": "Centre d'accueil Notre-Dame de Parménie",
      "email": "parmenie@lasallefrance.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Une journée de yoga au col",
      "concept": "Un stage d'une journée avec repas au col de Parménie, face à la Chartreuse : pratique douce sur les pelouses, salle en repli, respiration, méditation et un temps de chant à voix basse. Pour 10 à 20 adultes de tous niveaux. Le centre accueille déjà des groupes, des retraites et des formations avec restauration et hébergement sur place : un stage de yoga entre dans sa cible.",
      "format": "Journée de 9 h 30 à 17 h, 10 à 20 personnes, pratique sur les pelouses du col avec une salle en repli, repas de midi au centre. Bâches de sol, couvertures et tisane apportées par Maude, chacun vient avec son tapis. Toute l'année sous réserve des disponibilités du centre ; une première journée hors saison, puis un week-end en pension si la première journée convient.",
      "deroule": "Accueil et respiration face à la Chartreuse, 30 min · Pratique douce du matin, 1 h 30 · Marche silencieuse au col, 45 min · Repas au centre, 1 h 15 · Méditation et chant à voix basse, 1 h · Pratique lente de fin de journée et tisane, 1 h",
      "prix": "75 à 90 € la journée repas compris, vendus en ligne par Maude, jauge fermée ; restauration et salle réglées au centre sur devis. À 10 participants, 750 à 900 € de recettes dont le devis du centre ; à 20, le double.",
      "gain_lieu": "Un groupe de 10 à 20 personnes en journée, avec repas et salle facturés, sur des dates creuses choisies par le centre, et un premier pas vers un week-end en pension. Photos remises au centre, date inscrite aux agendas gratuits.",
      "demande": "Les disponibilités du centre hors saison, le tarif de groupe pour un repas et une salle, et la possibilité d'une pension pour un week-end ; une visite sur place un après-midi de semaine.",
      "attention": "La pratique sur les pelouses dépend de la météo au col, la salle de repli est indispensable ; le cadre d'accueil du centre (règles de la maison, horaires des repas) est à respecter ; la saison reste à confirmer avec eux."
    },
    "email": {
      "objet": "Une journée de yoga au col de Parménie",
      "corps": "Bonjour,\n\nJe suis professeure de yoga à Gillonnay, à vingt kilomètres du col. Votre centre accueille des groupes, des retraites et des formations, avec restauration et hébergement sur place, face à la Chartreuse : c'est le cadre que je cherche pour une journée de stage.\n\nJe propose une journée de yoga pour 10 à 20 personnes : pratique douce le matin sur les pelouses du col, une salle en repli en cas de pluie, repas de midi chez vous, puis respiration, méditation et un temps de chant à voix basse l'après-midi. Chacun apporte son tapis, j'apporte le reste, et je suis assurée en responsabilité civile professionnelle.\n\nJe vends les places en ligne, 75 à 90 € la journée repas compris, jauge fermée, et je vous règle la restauration et la salle sur devis.\n\nPourriez-vous m'indiquer vos disponibilités hors saison, votre tarif de groupe pour un repas et une salle, et si une pension pour un week-end est envisageable ? Je peux passer vous voir un après-midi de semaine.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "roybon",
    "cat": "nature",
    "nom": "Lac de Roybon, base de loisirs",
    "lieu": "Roybon",
    "km": 20,
    "prio": 2,
    "gest": "Mairie de Roybon (camping en saison, tentes et tiny houses)",
    "contact": "mairie@roybon.fr · 04 76 36 21 79",
    "deja": "Baignade, pêche, sentier de rive, buvette, camping de fin mai à fin septembre, accès gratuit",
    "format": "« Yoga au bord de l'eau » le samedi matin, 1 h 30 sur la berge est puis baignade libre ; proposer à la mairie une série de 4 dates pour les campeurs et les habitants",
    "prix": "15 à 20 €",
    "saison": "Juin à septembre",
    "src": "https://roybon.fr/cadre-de-vie/station-verte-et-tourisme/",
    "destinataire": {
      "nom": "Mairie de Roybon",
      "email": "mairie@roybon.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Yoga au bord de l'eau",
      "concept": "Une séance de yoga le samedi matin sur la berge est du lac de Roybon, puis baignade libre pour ceux qui le veulent, pour les campeurs et les habitants. Le lac accueille déjà baignade, pêche, buvette et camping de fin mai à fin septembre : une série de quatre matinées d'été donne au site une animation calme avant l'affluence.",
      "format": "1 h 30 le samedi matin sur la berge est, 12 à 15 personnes, puis baignade libre. Série de quatre dates dans l'été (deux en juillet, deux en août), à caler avec la mairie. Bâches de sol, couvertures et tisane apportées par Maude, chacun vient avec son tapis. Juin à septembre.",
      "deroule": "Accueil sur la berge et respiration, 15 min · Pratique douce, 50 min · Méditation face au lac, 15 min · Tisane, puis baignade libre pour qui le souhaite, 10 min",
      "prix": "Deux formules à la main de la mairie : une animation dans la programmation communale, facturée à la commune en prestation ; ou des places à 15 à 20 € vendues en ligne par Maude, jauge fermée, sans reversement demandé au-delà de l'emplacement. À 10 participants, 150 à 200 € par matinée ; la série de quatre dates, 600 à 800 €.",
      "gain_lieu": "Une animation régulière pour les campeurs et les habitants, sur un site déjà ouvert, sans billetterie à tenir. Photos remises à la commune, dates inscrites aux agendas gratuits et relayées auprès de la presse locale.",
      "demande": "Un appel de dix minutes pour choisir la formule (prestation ou places vendues) et poser quatre samedis de l'été 2027 ; un accord de principe avant le printemps pour entrer dans la communication d'été du camping.",
      "attention": "Météo d'été et affluence du samedi, d'où la séance tôt le matin ; la baignade est libre et hors responsabilité de la séance, à dire clairement ; le camping n'est ouvert que de fin mai à fin septembre."
    },
    "email": {
      "objet": "Yoga au bord du lac, quatre samedis d'été",
      "corps": "Bonjour,\n\nJe suis professeure de yoga à Gillonnay, à vingt kilomètres de Roybon. Le lac accueille déjà baigneurs, pêcheurs et campeurs de fin mai à fin septembre, et sa berge se prête à une pratique douce le matin, avant l'affluence.\n\nJe propose « Yoga au bord de l'eau » : 1 h 30 le samedi matin sur la berge est, puis baignade libre pour ceux qui le veulent, en série de quatre dates dans l'été. Douze à quinze personnes, chacun avec son tapis ; j'apporte les bâches de sol, les couvertures et la tisane, et je suis assurée hors salle.\n\nDeux façons de faire, à votre main : une animation dans votre programmation, que je facture à la commune, ou des places à 15 à 20 € que je vends en ligne, sans rien vous demander d'autre qu'un emplacement. J'inscris les dates aux agendas locaux et je préviens la presse.\n\nUn appel de dix minutes suffirait pour savoir quelle formule vous convient. Je suis joignable en semaine après 13 h.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "montjoux",
    "cat": "nature",
    "nom": "Étang de Montjoux, espace naturel sensible",
    "lieu": "Saint-Jean-de-Bournay",
    "km": 20,
    "prio": 3,
    "gest": "Département de l'Isère (programme « rendez-vous nature »)",
    "contact": "04 76 00 38 38 · isere.fr",
    "deja": "Sorties nature du Département, visites scolaires, digue et ponton accessibles PMR, libellules, hérons",
    "format": "1 h 30 « yoga et observation » sur la digue à l'aube, à proposer au service ENS pour entrer au programme des rendez-vous nature (gratuit pour le public, prof rémunérée par le Département)",
    "prix": "Prestation au Département",
    "saison": "Mai à septembre",
    "src": "https://www.isere.fr/ens/espace-naturel-sensible-letang-montjoux",
    "destinataire": {
      "nom": "Service des espaces naturels sensibles, Département de l'Isère",
      "email": null,
      "canal": "telephone 04 76 00 38 38 (standard du Département), puis le formulaire de contact d'isere.fr"
    },
    "projet": {
      "titre": "Yoga et observation à l'aube",
      "concept": "Une séance de yoga sur la digue de l'étang de Montjoux au lever du jour, suivie d'un temps d'observation silencieuse des libellules et des hérons. Pour le public des rendez-vous nature du Département, gratuit. La digue et le ponton sont accessibles PMR : la certification de Maude en yoga adapté permet d'y accueillir des personnes qui ne pratiquent pas au sol.",
      "format": "1 h 30 sur la digue, au lever du jour, 12 personnes, une à deux dates par saison entre mai et septembre, dans le programme des rendez-vous nature. Bâches de sol et couvertures apportées par Maude, chacun vient avec son tapis ; des chaises pour la pratique adaptée si le Département peut en fournir.",
      "deroule": "Accueil sur la digue et respiration, 15 min · Pratique douce, avec variante sur chaise, 45 min · Observation silencieuse de l'étang, 20 min · Échange et tisane, 10 min",
      "prix": "Prestation facturée au Département, sur devis par date, gratuite pour le public comme les autres rendez-vous nature. Pour un cycle de deux dates par saison, deux devis identiques.",
      "gain_lieu": "Une animation nouvelle et inclusive au programme des rendez-vous nature, qui met en valeur l'accessibilité de la digue, sans logistique pour le service au-delà de l'inscription. Photos remises au Département avec l'accord des participants.",
      "demande": "Un appel de dix minutes pour savoir si le programme des rendez-vous nature 2027 est encore ouvert et à qui adresser un devis.",
      "attention": "Cadre administratif du Département (devis, délais de programmation, éventuel marché) ; espace naturel sensible, tout se fait à leur main ; météo et heure très matinale, à assumer dans la communication."
    },
    "email": {
      "objet": "Yoga et observation à l'étang de Montjoux",
      "corps": "Bonjour,\n\nJe suis professeure de yoga à Gillonnay, à vingt kilomètres de l'étang. Vos rendez-vous nature y proposent déjà des sorties tout public et des visites scolaires, et la digue accessible en fauteuil se prête à une séance à l'aube.\n\nJe propose « Yoga et observation » : 1 h 30 sur la digue au lever du jour, entre mai et septembre, une pratique douce, de la respiration, puis un temps d'observation silencieuse. Douze personnes, chacun avec son tapis ; j'apporte les bâches de sol et les couvertures. Je suis certifiée en yoga adapté, sur chaise et à mobilité réduite, ce qui permet d'accueillir sur la digue des personnes qui ne pratiquent pas au sol.\n\nLa séance entrerait dans votre programme des rendez-vous nature, gratuite pour le public, et je vous adresse un devis de prestation pour chaque date. Je suis assurée hors salle.\n\nUn appel de dix minutes me permettrait de savoir si le programme 2027 est encore ouvert et à qui adresser le devis. Je suis joignable en semaine après 13 h.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "chirens",
    "cat": "nature",
    "nom": "Marais de Chirens, sentier des Libellules",
    "lieu": "Chirens",
    "km": 30,
    "prio": 3,
    "gest": "Département de l'Isère ; office de tourisme du Pays Voironnais",
    "contact": "tourisme@paysvoironnais.com · 04 76 93 17 60",
    "deja": "Boucle balisée de 10,8 km, prairies humides, orchidées ; le site est mis en avant au printemps par l'office",
    "format": "Demi-journée « marche et yoga » : 45 min de marche, 1 h de pratique dans une prairie sèche, retour ; à caler avec l'office au printemps",
    "prix": "35 €",
    "saison": "Avril à juin",
    "src": "https://www.isere.fr/ens-balades/les-marais-chirens",
    "destinataire": {
      "nom": "Office de tourisme du Pays Voironnais",
      "email": "tourisme@paysvoironnais.com",
      "canal": "email"
    },
    "projet": {
      "titre": "Marche et yoga au marais",
      "concept": "Une demi-journée qui alterne marche sur le sentier des Libellules et pratique de yoga dans une prairie sèche du marais de Chirens, au printemps, quand l'office met le site en avant et que les orchidées sortent. Pour des adultes marcheurs, sans niveau de yoga requis.",
      "format": "Demi-journée de 9 h à 12 h 30, 12 à 15 personnes : 45 min de marche sur la boucle balisée, 1 h de pratique douce dans une prairie sèche, retour. Bâches de sol, couvertures et tisane apportées par Maude, chacun vient avec son tapis. Avril à juin ; deux dates au printemps 2027, à caler avec l'office.",
      "deroule": "Départ et marche sur le sentier, 45 min · Respiration et pratique douce dans la prairie, 1 h · Méditation et tisane, 20 min · Retour à pied, 45 min",
      "prix": "Deux formules à la main de l'office : une animation dans son programme de printemps, facturée à l'office en prestation ; ou des places à 35 € vendues en ligne par Maude, jauge fermée, relayées par l'office. À 10 participants, 350 € de recettes par demi-journée.",
      "gain_lieu": "Une animation qui prolonge la mise en avant printanière du marais, un contenu à relayer, et des visiteurs qui restent une demi-journée sur le territoire. Photos remises à l'office, dates inscrites aux agendas gratuits et relayées auprès de la presse locale.",
      "demande": "Un appel de dix minutes pour caler une première date d'avril ou de mai 2027 et choisir la formule, prestation ou places vendues.",
      "attention": "Site géré par le Département de l'Isère : l'accord du gestionnaire de l'espace naturel est à obtenir en plus de celui de l'office ; prairies humides, chaussures de marche exigées ; saison courte de trois mois et météo de printemps."
    },
    "email": {
      "objet": "Marche et yoga au marais de Chirens",
      "corps": "Bonjour,\n\nJe suis professeure de yoga à Gillonnay. Vous mettez le marais de Chirens en avant au printemps, et sa boucle balisée se prête à une demi-journée qui alterne marche et pratique.\n\nJe propose « Marche et yoga » : 45 minutes de marche sur le sentier des Libellules, 1 h de pratique douce dans une prairie sèche, puis le retour, entre avril et juin. Douze à quinze personnes, chacun avec son tapis ; j'apporte les bâches de sol, les couvertures et la tisane, et je suis assurée en responsabilité civile professionnelle hors salle.\n\nDeux formules, à votre main : une animation dans votre programme de printemps, en prestation facturée à l'office, ou des places à 35 € que je vends en ligne et que vous relayez. Dans les deux cas j'inscris la date aux agendas locaux et je vous remets les photos prises avec l'accord des participants.\n\nUn appel de dix minutes suffirait pour caler une première date d'avril ou de mai. Je suis joignable en semaine après 13 h.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "paladru",
    "cat": "nature",
    "nom": "Lac de Paladru, plages de Charavines et de Paladru",
    "lieu": "Charavines / Villages du Lac de Paladru",
    "km": 35,
    "prio": 2,
    "gest": "Mairie de Charavines (plage gratuite) ; mairie de Villages du Lac de Paladru avec Plaisilac (plage payante)",
    "contact": "Charavines 04 76 06 60 09 · Paladru plaisilac@gmail.com, 04 76 65 60 83",
    "deja": "Baignade surveillée de juin à août, pelouses, restaurant-glacier ; groupe dès 10 personnes à 4,10 € à Paladru ; hors surveillance l'accès est gratuit",
    "format": "1 h 30 sur la pelouse avant l'ouverture de la baignade (8 h à 9 h 30) ou en septembre ; en série de 4 dimanches. Mini-stage « lac et forêt » possible avec les marais de Chirens à 10 min",
    "prix": "20 €",
    "saison": "Juin à septembre",
    "src": "https://www.villagesdulacdepaladru.fr/articles/la-plage/",
    "destinataire": {
      "nom": "Plaisilac, plage de Paladru (mairie de Villages du Lac de Paladru)",
      "email": "plaisilac@gmail.com",
      "canal": "email"
    },
    "projet": {
      "titre": "Yoga sur la pelouse du lac",
      "concept": "Une séance de yoga sur la pelouse de la plage de Paladru avant l'ouverture de la baignade, face au lac, en série de quatre dimanches d'été ou en septembre quand la plage est plus calme. Pour des adultes de tous niveaux, estivants et habitants. La plage accueille déjà des groupes dès dix personnes à tarif réduit.",
      "format": "1 h 30 de 8 h à 9 h 30 sur la pelouse, 12 à 15 personnes, série de quatre dimanches (juillet et août) ou deux dimanches de septembre. Bâches de sol, couvertures et tisane apportées par Maude, chacun vient avec son tapis. Juin à septembre. Un mini-stage « lac et forêt » couplé au marais de Chirens, à dix minutes, peut suivre.",
      "deroule": "Accueil sur la pelouse et respiration, 15 min · Pratique douce face au lac, 50 min · Méditation, 15 min · Tisane, puis baignade libre pour qui le souhaite, 10 min",
      "prix": "20 € par personne, vendus en ligne par Maude, jauge fermée ; l'entrée de chaque participant réglée à Plaisilac sur la base du tarif de groupe (4,10 € dès dix personnes), ou un forfait par créneau. À 10 participants, 200 € de recettes dont 41 € pour la plage au tarif de groupe ; la série de quatre dimanches, 800 €.",
      "gain_lieu": "Des entrées de groupe avant l'ouverture, sur un créneau où la plage est vide, et une animation à afficher pour les estivants. Photos remises à Plaisilac, dates inscrites aux agendas gratuits et relayées auprès de la presse locale.",
      "demande": "Un appel de dix minutes pour savoir si un créneau de 8 h à 9 h 30 avant l'ouverture est possible, et sous quelle forme (tarif de groupe ou forfait) ; quatre dimanches de l'été 2027 à poser avant le printemps.",
      "attention": "Créneau avant la surveillance : la baignade éventuelle est libre et hors séance, à dire ; météo et pelouse humide le matin ; la plage est payante en saison, les participants doivent être identifiés à l'entrée."
    },
    "email": {
      "objet": "Yoga sur la pelouse avant l'ouverture",
      "corps": "Bonjour,\n\nJe suis professeure de yoga à Gillonnay. Votre plage accueille la baignade surveillée de juin à août, avec ses pelouses et un tarif de groupe dès dix personnes, et le lac au petit matin, avant l'ouverture, se prête à une pratique douce.\n\nJe propose 1 h 30 de yoga sur la pelouse, de 8 h à 9 h 30, en série de quatre dimanches d'été, ou en septembre quand la plage est plus calme. Douze à quinze personnes, chacun avec son tapis ; j'apporte les bâches de sol, les couvertures et la tisane, et je suis assurée en responsabilité civile professionnelle hors salle.\n\nJe vends les places en ligne, 20 € par personne, jauge fermée, et je vous règle l'entrée de chaque participant sur la base de votre tarif de groupe, ou un forfait par créneau si vous préférez. Je vous remets les photos prises avec l'accord des participants.\n\nUn appel de dix minutes suffirait pour savoir si un créneau avant l'ouverture est possible. Je suis joignable en semaine après 13 h.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "boismarquis",
    "cat": "nature",
    "nom": "Le Jardin du Bois Marquis",
    "lieu": "Vernioz",
    "km": 35,
    "prio": 2,
    "gest": "Privé, Christian Peyron (Jardin remarquable)",
    "contact": "remarquable@lejardinduboismarquis.com",
    "deja": "Visite libre 7 j/7, soirées nature, siestes musicales, Fête des plantes",
    "format": "« Sieste yoga » d'automne de 1 h 30 dans les érables rouges, dans la lignée de leurs siestes musicales",
    "prix": "20 €",
    "saison": "Toute l'année, octobre pour les couleurs",
    "src": "https://www.lejardinduboismarquis.com/",
    "now": "Fête des plantes les 17 et 18 octobre 2026 : proposer un mini-stage matinal pendant que le public arrive.",
    "echeance": "2026-10-17",
    "destinataire": {
      "nom": "Christian Peyron, Le Jardin du Bois Marquis",
      "email": "remarquable@lejardinduboismarquis.com",
      "canal": "email"
    },
    "projet": {
      "titre": "Sieste yoga dans les érables",
      "concept": "Une séance lente et allongée sous les érables rouges du jardin, en octobre, dans la lignée des siestes musicales et des soirées nature que le jardin propose déjà. Pour des adultes de tous niveaux, y compris ceux qui n'ont jamais pratiqué : au sol, sous couverture, respiration et un temps de son à voix basse.",
      "format": "1 h 30 sous les érables, 12 à 15 personnes, un samedi ou un dimanche matin d'octobre. Bâches de sol, couvertures et tisane apportées par Maude, chacun vient avec son tapis. Toute l'année possible, octobre visé pour les couleurs ; une première séance pendant la Fête des plantes des 17 et 18 octobre 2026, le samedi matin pendant que le public arrive, puis une date par saison.",
      "deroule": "Accueil sous les érables et respiration, 15 min · Pratique douce au sol, 40 min · Son à voix basse et repos sous couverture, 25 min · Tisane et retour au jardin, 10 min",
      "prix": "20 € par personne, vendus en ligne par Maude, jauge fermée ; forfait par créneau ou montant par participant reversé au jardin, à convenir. À 10 participants, 200 € de recettes dont la part convenue pour le jardin.",
      "gain_lieu": "Une animation qui s'inscrit dans la ligne des siestes musicales, un public supplémentaire un matin d'automne et, pendant la Fête des plantes, une raison d'arriver tôt. Photos remises au jardin, date inscrite aux agendas gratuits et relayée auprès de la presse locale.",
      "demande": "Un appel de dix minutes cette semaine pour poser un créneau le samedi 17 octobre 2026 au matin, ou un dimanche d'octobre hors fête, et convenir du reversement.",
      "attention": "Météo d'octobre, sol humide et fraîcheur, d'où couvertures et bâches ; pendant la Fête des plantes, le bruit et le passage du public, d'où un coin à l'écart et une heure matinale ; jardin ouvert 7 j/7, l'espace n'est pas privatisé."
    },
    "email": {
      "objet": "Une sieste yoga dans les érables rouges",
      "corps": "Bonjour Christian,\n\nJe suis professeure de yoga à Gillonnay. Votre jardin propose déjà des soirées nature et des siestes musicales, et vos érables en octobre m'ont donné envie d'une séance dans la même veine, allongée et lente.\n\nJe propose une « Sieste yoga » d'automne : 1 h 30 sous les érables, une pratique douce au sol, puis un temps de son à voix basse et un moment de repos sous couverture. Douze à quinze personnes, chacun avec son tapis ; j'apporte les bâches de sol, les couvertures et la tisane, et je suis assurée en responsabilité civile professionnelle hors salle.\n\nJe vends les places en ligne, 20 € par personne, jauge fermée, et je vous reverse un forfait par créneau ou un montant par participant. Je vous remets les photos prises avec l'accord des participants.\n\nVos 17 et 18 octobre, avec la Fête des plantes, seraient une belle occasion pour une première séance le samedi matin ; un dimanche d'octobre hors fête convient aussi. Un appel de dix minutes cette semaine ? Je suis joignable après 13 h.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "lasone",
    "cat": "nature",
    "nom": "Jardin des Fontaines pétrifiantes",
    "lieu": "La Sône",
    "km": 35,
    "prio": 1,
    "gest": "Visites Nature Vercors (même société que Choranche et Thaïs)",
    "contact": "04 76 64 43 42 · formulaire visites-nature-vercors.com",
    "deja": "Visites libres et guidées, groupes adultes, comités d'entreprise, restaurant sur place ; du 1er mai au 30 septembre, entrée 12,50 €",
    "format": "1 h 30 « eau et pierre » au bord de la cascade de tuf à l'ouverture (10 h), puis la visite ; le site vend déjà des créneaux groupes, tarif combiné facile",
    "prix": "30 € visite comprise",
    "saison": "Mai à septembre",
    "src": "https://www.visites-nature-vercors.com/fr/jardin-des-fontaines-petrifiantes/preparez-votre-visite/horaires-et-tarifs/",
    "destinataire": {
      "nom": "Jardin des Fontaines pétrifiantes, Visites Nature Vercors",
      "email": null,
      "canal": "formulaire visites-nature-vercors.com, ou téléphone 04 76 64 43 42"
    },
    "projet": {
      "titre": "Eau et pierre au jardin",
      "concept": "Une séance de yoga au bord de la cascade de tuf, à l'ouverture du jardin, suivie de la visite. Pour des adultes de tous niveaux, y compris des groupes d'entreprise que le site reçoit déjà. Le jardin vend des créneaux de groupe et dispose d'un restaurant : un tarif combiné séance plus visite s'y greffe sans rien inventer.",
      "format": "1 h 30 au bord de la cascade dès 10 h, à l'ouverture, 12 à 15 personnes, puis la visite du jardin en autonomie ou guidée. Bâches de sol, couvertures et tisane apportées par Maude, chacun vient avec son tapis. Saison du jardin, mai à septembre ; une date par mois de mai à septembre 2027, en semaine ou le samedi selon le site.",
      "deroule": "Accueil au bord de la cascade et respiration, 15 min · Pratique douce, 50 min · Méditation au son de l'eau, 15 min · Tisane, 10 min · Visite du jardin, 1 h",
      "prix": "30 € par personne visite comprise, vendus en ligne par Maude, jauge fermée ; chaque entrée réglée au jardin à son tarif de groupe, comme un créneau de groupe classique. À 10 participants, 300 € de recettes, dont les 10 entrées de groupe réglées au jardin.",
      "gain_lieu": "Des entrées de groupe assurées à l'ouverture, un créneau calme, et un public qui reste pour la visite et le restaurant. Photos remises au jardin, dates inscrites aux agendas gratuits et relayées auprès de la presse locale.",
      "demande": "Un appel de dix minutes pour vérifier qu'un créneau à l'ouverture est possible, connaître le tarif de groupe applicable et fixer une première date en mai 2027 ; une même discussion peut couvrir Thaïs et Choranche.",
      "attention": "Sol humide et bruit de la cascade, un emplacement précis à repérer ; entrée à 12,50 € qui pèse dans les 30 €, la marge de Maude est courte, ne pas baisser le prix ; saison de cinq mois seulement."
    },
    "email": {
      "objet": "Yoga au bord de la cascade, puis la visite",
      "corps": "Bonjour,\n\nJe suis professeure de yoga à Gillonnay. Le Jardin des Fontaines pétrifiantes accueille déjà des groupes adultes et des comités d'entreprise, et le bord de la cascade de tuf à l'ouverture me semble un bel endroit pour une pratique douce.\n\nJe propose « Eau et pierre » : 1 h 30 de yoga au bord de la cascade dès 10 h, puis la visite du jardin, entre mai et septembre. Douze à quinze personnes, chacun avec son tapis ; j'apporte les bâches de sol, les couvertures et la tisane, et je suis assurée en responsabilité civile professionnelle hors salle.\n\nJe vends les places en ligne à 30 € visite comprise, jauge fermée, et je vous règle chaque entrée à votre tarif de groupe, comme pour un créneau de groupe classique. J'inscris la date aux agendas locaux et je vous remets les photos prises avec l'accord des participants.\n\nUn appel de dix minutes suffirait pour vérifier qu'un créneau à l'ouverture est possible et fixer une première date. Je suis joignable en semaine après 13 h.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "thais",
    "cat": "nature",
    "nom": "Grotte de Thaïs",
    "lieu": "Saint-Nazaire-en-Royans",
    "km": 45,
    "prio": 1,
    "gest": "Visites Nature Vercors",
    "contact": "04 76 64 43 42",
    "deja": "Visites guidées d'une heure, groupes, bateau à roue sur le même site ; réouverture le 11 avril 2026 après travaux, fermée l'hiver, entrée 11,10 €",
    "format": "« Yoga à 13 degrés » : la même Séance que Mélusine, en fin de journée après la dernière visite ; ou yoga sur le parvis au bord de la Bourne avant le bateau",
    "prix": "45 à 50 €",
    "saison": "Avril à septembre",
    "src": "https://www.visites-nature-vercors.com/fr/grotte-de-thais/preparer-votre-visite/horaires-et-tarifs/",
    "destinataire": {
      "nom": "Grotte de Thaïs, Visites Nature Vercors",
      "email": null,
      "canal": "telephone 04 76 64 43 42"
    },
    "projet": {
      "titre": "Yoga à 13 degrés",
      "concept": "La même séance que Le Yoga de Mélusine, transposée dans la grotte de Thaïs en fin de journée après la dernière visite : deux heures de pratique douce, respiration et chant à voix basse là où la roche porte le son. Pour des adultes de tous niveaux. Une variante sur le parvis, au bord de la Bourne avant le bateau à roue, pour les jours où la grotte n'est pas disponible.",
      "format": "Séance de 2 h dans la grotte, après la dernière visite, 6 à 15 personnes ; ou 1 h 30 sur le parvis au bord de la Bourne, avant le bateau. Bâches de sol, couvertures et tisane apportées par Maude, chacun vient avec son tapis et une tenue chaude. Saison du site, avril à septembre ; deux dates pilotes en mai et juin 2027, puis une date par mois.",
      "deroule": "Accueil et descente après la dernière visite, 15 min · Respiration et échauffement doux, 30 min · Pratique au sol, 45 min · Chant à voix basse et méditation, 20 min · Tisane et remontée, 10 min",
      "prix": "45 à 50 € par personne, vendus en ligne par Maude, jauge fermée ; forfait par créneau ou montant par participant reversé au site, à convenir. À 10 participants, 450 à 500 € de recettes dont la part convenue pour la grotte.",
      "gain_lieu": "Un usage de la grotte hors horaires de visite, sans billetterie ni encadrement à assurer, et une proposition nouvelle l'année de la réouverture. Photos remises au site, dates inscrites aux agendas gratuits et relayées auprès de la presse locale.",
      "demande": "Un repérage sur place d'une demi-heure, entre avril et septembre, pour voir la salle, le froid et l'accès, et convenir du reversement ; une même discussion peut couvrir Choranche et le Jardin des Fontaines pétrifiantes.",
      "attention": "13 degrés pendant deux heures, couvertures et tenue chaude obligatoires ; accès et sol de la grotte à vérifier ; fermée l'hiver, saison courte ; créneau après la dernière visite, donc horaire tardif à assumer."
    },
    "email": {
      "objet": "Yoga à 13 degrés dans la grotte de Thaïs",
      "corps": "Bonjour,\n\nJe suis professeure de yoga à Gillonnay, et je monte en ce moment des séances dans la grotte de Sassenage. La grotte de Thaïs, rouverte en avril après ses travaux, m'a donné envie d'une proposition semblable chez vous.\n\nJe propose « Yoga à 13 degrés » : une séance de 2 h dans la grotte en fin de journée, après la dernière visite, pour 6 à 15 personnes, avec une pratique douce, de la respiration et un temps de chant à voix basse. Une variante sur le parvis, au bord de la Bourne avant le bateau, est possible. J'apporte bâches de sol, couvertures et tisane, chacun vient avec son tapis, et je suis assurée en responsabilité civile professionnelle hors salle.\n\nJe vends les places en ligne, 45 à 50 € par personne, jauge fermée, et je vous reverse un forfait par créneau ou un montant par participant.\n\nUn repérage d'une demi-heure sur place me permettrait de voir la salle et le froid. Je suis disponible en semaine après 13 h.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "choranche",
    "cat": "nature",
    "nom": "Grotte de Choranche",
    "lieu": "Choranche",
    "km": 50,
    "prio": 2,
    "gest": "Visites Nature Vercors",
    "contact": "04 76 64 43 42",
    "deja": "Visites guidées d'une heure, groupes, 15 min de marche d'approche, ouverte toute l'année, entrée 14,20 €",
    "format": "1 h 30 devant le lac souterrain à 10 degrés, hors saison (novembre à mars, quand la fréquentation est basse), avec couvertures. Une seule négociation pour Thaïs, Choranche et La Sône",
    "prix": "50 €",
    "saison": "Novembre à mars",
    "src": "https://www.visites-nature-vercors.com/fr/grotte-de-choranche/preparer-votre-visite/horaires-et-tarifs/",
    "destinataire": {
      "nom": "Grotte de Choranche, Visites Nature Vercors",
      "email": null,
      "canal": "telephone 04 76 64 43 42"
    },
    "projet": {
      "titre": "Yoga devant le lac souterrain",
      "concept": "Une séance de yoga devant le lac souterrain de Choranche, à 10 degrés, hors saison, quand la fréquentation est basse et qu'un créneau ne gêne aucune visite. Pour des adultes de tous niveaux prêts au froid. La grotte est ouverte toute l'année : les mois de novembre à mars sont ceux où le lieu a de la place.",
      "format": "1 h 30 devant le lac souterrain, 6 à 15 personnes, avec couvertures pour chacun, une date par mois de novembre à mars. Bâches de sol, couvertures et tisane apportées par Maude, chacun vient avec son tapis et une tenue chaude ; 15 minutes de marche d'approche annoncées à l'inscription. Négociation commune avec Thaïs et le Jardin des Fontaines pétrifiantes, mêmes exploitants.",
      "deroule": "Marche d'approche et descente, 20 min · Respiration et échauffement doux sous couverture, 20 min · Pratique lente devant le lac, 40 min · Son à voix basse et méditation, 15 min · Tisane et remontée, 15 min",
      "prix": "50 € par personne, vendus en ligne par Maude, jauge fermée ; forfait par créneau ou montant par participant reversé au site, à convenir. À 10 participants, 500 € de recettes dont la part convenue pour la grotte ; un hiver de cinq dates, 2 500 €.",
      "gain_lieu": "Une activité et des entrées pendant les mois creux, sans billetterie ni encadrement à assurer, et une image nouvelle de la grotte hors visite. Photos remises au site, dates inscrites aux agendas gratuits et relayées auprès de la presse locale.",
      "demande": "Un appel de dix minutes pour savoir si un créneau d'hiver devant le lac est envisageable, puis un repérage ; une seule discussion pour Choranche, Thaïs et La Sône.",
      "attention": "10 degrés et 1 h 30 au sol, pratique gardée en mouvement, couvertures obligatoires, prévenir les personnes frileuses ; marche d'approche de 15 minutes, non accessible PMR ; hiver, routes et météo du Vercors à surveiller."
    },
    "email": {
      "objet": "Yoga devant le lac souterrain, hors saison",
      "corps": "Bonjour,\n\nJe suis professeure de yoga à Gillonnay, et je monte en ce moment des séances dans la grotte de Sassenage. Choranche est ouverte toute l'année, et vos mois de novembre à mars sont ceux où une séance devant le lac souterrain trouverait sa place sans gêner les visites.\n\nJe propose 1 h 30 de pratique douce devant le lac, à 10 degrés, avec de la respiration et un temps de son à voix basse. Six à quinze personnes, chacun avec son tapis ; j'apporte les bâches de sol, des couvertures pour chacun et la tisane, et je préviens à l'inscription des 15 minutes de marche d'approche. Je suis assurée en responsabilité civile professionnelle hors salle.\n\nJe vends les places en ligne, 50 € par personne, jauge fermée, et je vous reverse un forfait par créneau ou un montant par participant. Une même discussion peut couvrir Thaïs et le Jardin des Fontaines pétrifiantes.\n\nUn appel de dix minutes suffirait pour savoir si un créneau d'hiver est envisageable. Je suis joignable en semaine après 13 h.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "facteurcheval",
    "cat": "nature",
    "nom": "Palais idéal du Facteur Cheval",
    "lieu": "Hauterives (Drôme)",
    "km": 25,
    "prio": 2,
    "gest": "Site géré par la commune d'Hauterives (résultats de recherche) ; billetterie en ligne",
    "contact": "04 75 68 81 19 · formulaire facteurcheval.com",
    "deja": "Concerts à la bougie, soirées projection, expositions, groupes dès 15 à 7 €, ouvert toute l'année, entrée 10,50 €",
    "format": "Soirée « yoga au clair du Palais », 1 h 30 dans le jardin après la fermeture, dans l'esprit de leurs concerts à la bougie. Privatisation non affichée, à demander",
    "prix": "35 à 40 €",
    "saison": "Mai à septembre",
    "src": "https://www.facteurcheval.com/le-palais-ideal/infos-pratiques/",
    "destinataire": {
      "nom": "Palais idéal du Facteur Cheval, commune d'Hauterives",
      "email": null,
      "canal": "formulaire facteurcheval.com, ou téléphone 04 75 68 81 19"
    },
    "projet": {
      "titre": "Yoga au clair du Palais",
      "concept": "Une soirée de yoga dans le jardin du Palais idéal après la fermeture, dans l'esprit des concerts à la bougie et des soirées projection que le site programme déjà. Pour des adultes de tous niveaux, visiteurs et habitants. Le monument face aux tapis fait la séance ; la pratique reste douce et sans mise en scène.",
      "format": "1 h 30 dans le jardin, en soirée après la fermeture, 12 à 15 personnes, une date par mois de mai à septembre. Bâches de sol, couvertures et tisane apportées par Maude, chacun vient avec son tapis. Privatisation non affichée par le site, à demander.",
      "deroule": "Accueil dans le jardin et respiration, 15 min · Pratique douce face au Palais, 45 min · Chant à voix basse et méditation à la tombée du jour, 20 min · Tisane, 10 min",
      "prix": "Deux formules à la main du site : une soirée dans sa programmation, facturée au site en prestation ; ou des places à 35 à 40 € vendues en ligne par Maude, jauge fermée, avec un forfait par créneau ou un montant par personne reversé au Palais. À 10 participants, 350 à 400 € de recettes dont la part du Palais.",
      "gain_lieu": "Une soirée de plus dans une programmation qui ouvre déjà le site après la fermeture, un public nouveau, sans billetterie à tenir si Maude vend. Photos remises au site, dates inscrites aux agendas gratuits et relayées auprès de la presse locale.",
      "demande": "Un appel de dix minutes pour savoir si le jardin peut accueillir une séance après la fermeture et quelle formule convient, puis un repérage ; une première date en mai 2027.",
      "attention": "Site géré par une commune : cadre administratif et programmation arrêtée à l'avance ; monument classé, aucun matériel au sol qui abîme ; météo de soirée d'été ; ne pas empiéter sur les soirs de concert."
    },
    "email": {
      "objet": "Yoga au clair du Palais, après la fermeture",
      "corps": "Bonjour,\n\nJe suis professeure de yoga à Gillonnay, en Isère. Vos concerts à la bougie et vos soirées projection ouvrent déjà le Palais après la fermeture, et c'est dans cet esprit que je vous écris.\n\nJe propose « Yoga au clair du Palais » : 1 h 30 dans le jardin en soirée, une pratique douce, de la respiration et un temps de chant à voix basse face au monument. Douze à quinze personnes, chacun avec son tapis ; j'apporte les bâches de sol, les couvertures et la tisane, et je suis assurée en responsabilité civile professionnelle hors salle.\n\nDeux formules, à votre main : une soirée dans votre programmation, en prestation facturée au site, ou des places à 35 à 40 € que je vends en ligne, avec un forfait ou un montant par personne reversé au Palais. Je vous remets les photos prises avec l'accord des participants.\n\nUn appel de dix minutes suffirait pour savoir si le jardin peut accueillir une séance après la fermeture. Je suis joignable en semaine après 13 h.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "erikborja",
    "cat": "nature",
    "nom": "Jardin Zen d'Erik Borja",
    "lieu": "Beaumont-Monteux (Drôme)",
    "km": 55,
    "prio": 3,
    "gest": "Privé, Erik Borja",
    "contact": "contact@erikborja.fr · 04 75 07 32 27",
    "deja": "Jardin de méditation, jardin de thé, ateliers, concerts, groupes de 20 à 9 €, entrée 12 €",
    "format": "Le lieu le plus évident pour un yoga contemplatif : matinée dans le jardin de méditation, thé au jardin de thé. Saison à confirmer (fermé au moment de la consultation)",
    "prix": "40 €",
    "saison": "À confirmer",
    "src": "https://www.erikborja.fr/",
    "destinataire": {
      "nom": "Erik Borja, Jardin Zen d'Erik Borja",
      "email": "contact@erikborja.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Matinée au jardin de méditation",
      "concept": "Une matinée de yoga contemplatif dans le jardin de méditation, suivie d'un thé au jardin de thé. Pour des adultes de tous niveaux qui cherchent le silence plus que l'effort. Le jardin accueille déjà des ateliers, des concerts et des groupes : une pratique lente y trouve un cadre déjà pensé pour elle.",
      "format": "1 h 30 dans le jardin de méditation, avant l'ouverture au public si possible, 12 à 15 personnes, puis un thé au jardin de thé. Bâches de sol et couvertures apportées par Maude, chacun vient avec son tapis. Saison à confirmer avec le jardin, fermé au moment de la consultation ; une date par saison à partir de la réouverture.",
      "deroule": "Accueil et marche silencieuse jusqu'au jardin de méditation, 15 min · Respiration et pratique douce, 55 min · Méditation assise, 20 min · Thé au jardin de thé, 30 min",
      "prix": "40 € par personne thé compris, vendus en ligne par Maude, jauge fermée ; forfait par créneau ou montant par participant reversé au jardin, sur la base du tarif de groupe (9 € dès 20) ou à convenir. À 10 participants, 400 € de recettes dont la part convenue pour le jardin.",
      "gain_lieu": "Un usage du jardin conforme à sa vocation, un groupe à un créneau calme, le thé vendu à chaque participant. Photos remises au jardin, date inscrite aux agendas gratuits et relayée auprès de la presse locale.",
      "demande": "La date de réouverture du jardin et la possibilité d'un créneau avant l'ouverture au public ; une visite sur place un après-midi de semaine pour repérer l'emplacement.",
      "attention": "Jardin fermé au moment de la consultation, saison inconnue ; lieu fragile (mousses, graviers ratissés), aucun tapis hors des zones autorisées ; à 55 km, prévoir le trajet des participants et un tarif qui le justifie."
    },
    "email": {
      "objet": "Une matinée de yoga dans le jardin de méditation",
      "corps": "Bonjour Erik,\n\nJe suis professeure de yoga à Gillonnay, en Isère. Votre jardin de méditation, le jardin de thé, les ateliers et les concerts que vous accueillez en font le lieu le plus évident que je connaisse pour une pratique contemplative.\n\nJe propose une matinée de yoga : 1 h 30 de pratique douce dans le jardin de méditation, respiration, silence, puis un thé au jardin de thé. Douze à quinze personnes, chacun avec son tapis ; j'apporte les bâches de sol, les couvertures et ce qu'il faut pour ne rien abîmer, et je suis assurée en responsabilité civile professionnelle hors salle.\n\nJe vends les places en ligne, 40 € par personne thé compris, jauge fermée, et je vous reverse un forfait par créneau ou un montant par participant. Je vous remets les photos prises avec l'accord des participants.\n\nLe jardin étant fermé au moment où je vous écris, pourriez-vous me dire quand vous rouvrez et si un créneau avant l'ouverture au public est envisageable ? Je peux venir vous voir un après-midi de semaine.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "barbarin",
    "cat": "nature",
    "nom": "Château de Barbarin",
    "lieu": "Revel-Tourdan",
    "km": 25,
    "prio": 3,
    "gest": "Privé, habité",
    "contact": "contact@chateau-de-barbarin.fr · 06 50 07 50 96",
    "deja": "Visites de mai à septembre à 6,50 €, concerts baroques en juin, aire de pique-nique, 100 personnes max",
    "format": "Séance dans le parc un dimanche matin de juin, couplée à un concert baroque",
    "prix": "20 €",
    "saison": "Mai à septembre",
    "src": "https://tourisme.entre-bievreetrhone.fr/visites-vallee-rhone/je-visite-en-groupe/chateau-barbarin",
    "destinataire": {
      "nom": "Château de Barbarin",
      "email": "contact@chateau-de-barbarin.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Yoga au parc avant le concert",
      "concept": "Une séance de yoga dans le parc du château un dimanche matin de juin, couplée à l'un des concerts baroques que le château donne ce mois-là, avec le pique-nique entre les deux. Pour des adultes de tous niveaux, amateurs de musique autant que de plein air. Un dimanche qui commence par le corps et finit par la musique.",
      "format": "1 h 30 dans le parc, le dimanche matin, 12 à 15 personnes, puis l'aire de pique-nique et le concert baroque pour ceux qui restent. Bâches de sol, couvertures et tisane apportées par Maude, chacun vient avec son tapis. Un dimanche de juin 2027, couplé à un concert ; une seconde date en septembre si la première convient.",
      "deroule": "Accueil dans le parc et respiration, 15 min · Pratique douce, 50 min · Chant à voix basse et méditation, 15 min · Tisane, 10 min · Pique-nique puis concert, à l'horaire du château",
      "prix": "20 € par personne pour la séance, vendus en ligne par Maude, jauge fermée ; forfait par créneau ou montant par participant reversé au château, à convenir ; le billet du concert reste vendu par le château. À 10 participants, 200 € de recettes dont la part du château, plus dix billets de concert potentiels.",
      "gain_lieu": "Un public supplémentaire pour le concert et l'aire de pique-nique, une matinée qui remplit le site avant l'après-midi, sans billetterie à tenir pour la séance. Photos remises au château, date inscrite aux agendas gratuits et relayée auprès de la presse locale.",
      "demande": "Un appel de dix minutes pour savoir si un dimanche de concert de juin 2027 s'y prête et convenir du reversement, puis un repérage du parc au printemps.",
      "attention": "Château privé et habité : intimité des propriétaires à respecter, emplacement à repérer ensemble ; jauge de 100 personnes sur le site, la séance ne doit pas gêner l'installation du concert ; météo de juin."
    },
    "email": {
      "objet": "Yoga dans le parc avant un concert baroque",
      "corps": "Bonjour,\n\nJe suis professeure de yoga à Gillonnay, à vingt-cinq kilomètres de Revel-Tourdan. Vos concerts baroques de juin et le parc m'ont donné l'idée d'un dimanche qui commence par le corps et finit par la musique.\n\nJe propose une séance de 1 h 30 dans le parc, un dimanche matin de juin, couplée à l'un de vos concerts : pratique douce, respiration et un temps de chant à voix basse, puis le pique-nique et le concert pour ceux qui restent. Douze à quinze personnes, chacun avec son tapis ; j'apporte les bâches de sol, les couvertures et la tisane, et je suis assurée en responsabilité civile professionnelle hors salle.\n\nJe vends les places de la séance en ligne, 20 € par personne, jauge fermée, et je vous reverse un forfait par créneau ou un montant par participant ; le billet du concert reste le vôtre. J'inscris la date aux agendas locaux.\n\nUn appel de dix minutes suffirait pour savoir si un de vos dimanches de juin s'y prête. Je suis joignable en semaine après 13 h.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "virieu",
    "cat": "nature",
    "nom": "Château de Virieu",
    "lieu": "Val-de-Virieu",
    "km": 28,
    "prio": 3,
    "gest": "Privé ; groupes sur réservation par mail",
    "contact": "accueil.virieu@gmail.com · 04 74 88 27 32 (affichés par l'office de tourisme)",
    "deja": "Jardins à la française, ouvert du 4 avril au 1er novembre de 14 h à 18 h, 9 € adulte, groupes 7,50 € dès 14",
    "format": "Matinée « yoga dans les jardins à la française » avant l'ouverture de 14 h, puis visite guidée en groupe",
    "prix": "30 € visite comprise",
    "saison": "Avril à octobre",
    "src": "https://www.chateau-de-virieu.com/visites",
    "destinataire": {
      "nom": "Château de Virieu",
      "email": "accueil.virieu@gmail.com",
      "canal": "email"
    },
    "projet": {
      "titre": "Yoga aux jardins du château",
      "concept": "Une matinée de yoga dans les jardins à la française du château, avant l'ouverture au public à 14 h, suivie de la visite guidée du château en groupe. Pour des adultes de tous niveaux, amateurs de patrimoine. Le château reçoit déjà des groupes sur réservation : la matinée forme un groupe de 14 personnes pile à son tarif.",
      "format": "1 h 30 dans les jardins, le matin, 14 à 15 personnes pour atteindre le tarif de groupe, puis la visite guidée à 14 h. Bâches de sol, couvertures et tisane apportées par Maude, chacun vient avec son tapis. Saison du château, avril à octobre ; une date par trimestre de saison, mai, juillet et septembre 2027.",
      "deroule": "Accueil dans les jardins et respiration, 15 min · Pratique douce, 50 min · Méditation, 15 min · Tisane et temps libre, puis visite guidée à 14 h, 1 h",
      "prix": "30 € par personne visite comprise, vendus en ligne par Maude, jauge fermée ; chaque entrée réglée au château au tarif de groupe (7,50 € dès 14 personnes), plus un forfait pour l'ouverture matinale des jardins si le château le demande. À 14 participants, 420 € de recettes dont 105 € d'entrées de groupe pour le château.",
      "gain_lieu": "Un groupe complet à chaque date, un créneau matinal qui ne coûte rien en personnel de visite, et un public nouveau. Photos remises au château, dates inscrites aux agendas gratuits et relayées auprès de la presse locale.",
      "demande": "Un appel de dix minutes pour savoir si une ouverture matinale des jardins est envisageable et à quelles conditions ; une première date en mai 2027.",
      "attention": "Jardins à la française : aucun tapis sur les parterres, emplacement sur pelouse ou allée à repérer ; la jauge de 14 pour le tarif de groupe impose une séance pleine, sinon le prix de l'entrée grimpe ; ouverture du château à 14 h seulement, l'attente entre séance et visite est à occuper."
    },
    "email": {
      "objet": "Yoga au jardin, puis la visite du château",
      "corps": "Bonjour,\n\nJe suis professeure de yoga à Gillonnay, à une demi-heure de Val-de-Virieu. Vos jardins à la française, ouverts d'avril au 1er novembre à partir de 14 h, offrent une matinée libre avant l'arrivée du public, et vous accueillez déjà des groupes sur réservation.\n\nJe propose une matinée « yoga dans les jardins » : 1 h 30 de pratique douce avant l'ouverture, respiration, un temps de silence, puis la visite guidée du château en groupe à 14 h. Quatorze à quinze personnes, pour atteindre votre tarif de groupe ; chacun apporte son tapis, j'apporte les bâches de sol, les couvertures et la tisane, et je suis assurée en responsabilité civile professionnelle hors salle.\n\nJe vends les places en ligne, 30 € visite comprise, jauge fermée, et je vous règle chaque entrée au tarif de groupe, plus un forfait pour l'ouverture matinale si vous le souhaitez.\n\nUn appel de dix minutes suffirait pour savoir si une ouverture matinale des jardins est envisageable. Je suis joignable en semaine après 13 h.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "septeme",
    "cat": "nature",
    "nom": "Château de Septème",
    "lieu": "Septème",
    "km": 40,
    "prio": 3,
    "gest": "Privé",
    "contact": "chateaudesepteme@gmail.com · 06 58 15 01 01",
    "deja": "Parc aux paons dans les remparts, salon de thé, 11 € adulte, groupes dès 9 €",
    "format": "Séance dans les remparts puis salon de thé",
    "prix": "30 € thé compris",
    "saison": "Avril à octobre",
    "src": "https://www.chateau-septeme.com/dates-et-horaires",
    "destinataire": {
      "nom": "Château de Septème",
      "email": "chateaudesepteme@gmail.com",
      "canal": "email"
    },
    "projet": {
      "titre": "Yoga dans les remparts",
      "concept": "Une séance de yoga dans le parc aux paons, à l'intérieur des remparts du château, suivie d'un thé au salon de thé. Pour des adultes de tous niveaux. Le château a déjà un salon de thé et un tarif de groupe : la matinée s'appuie sur ce qu'il vend déjà.",
      "format": "1 h 30 dans les remparts, le matin avant ou pendant l'ouverture selon le château, 12 à 15 personnes, puis le salon de thé. Bâches de sol, couvertures et tisane apportées par Maude, chacun vient avec son tapis. Saison du château, avril à octobre ; une date par saison, mai et septembre 2027.",
      "deroule": "Accueil dans les remparts et respiration, 15 min · Pratique douce, 50 min · Méditation avec les paons pour voisins, 15 min · Thé au salon de thé, 30 min",
      "prix": "30 € par personne thé compris, vendus en ligne par Maude, jauge fermée ; chaque participant réglé au château sur la base du tarif de groupe (9 €) plus le thé, ou un forfait par créneau. À 10 participants, 300 € de recettes dont les entrées de groupe et les thés réglés au château.",
      "gain_lieu": "Un groupe assuré avec entrée et thé pour chacun, un créneau calme, un public nouveau. Photos remises au château, dates inscrites aux agendas gratuits et relayées auprès de la presse locale.",
      "demande": "Un appel de dix minutes pour savoir si un créneau avant ou pendant l'ouverture convient, et le prix du thé de groupe ; une première date en mai 2027.",
      "attention": "Les paons sont libres dans le parc, la séance doit composer avec eux ; château privé, emplacement à repérer ensemble ; à 40 km, un prix qui doit couvrir entrée, thé et trajet, ne pas le baisser."
    },
    "email": {
      "objet": "Yoga dans les remparts, puis le salon de thé",
      "corps": "Bonjour,\n\nJe suis professeure de yoga à Gillonnay, à quarante kilomètres de Septème. Votre parc aux paons dans les remparts et le salon de thé m'ont donné l'idée d'une matinée qui se termine à table.\n\nJe propose une séance de 1 h 30 dans les remparts, entre avril et octobre, une pratique douce, de la respiration et un temps de silence avec les paons pour voisins, puis un thé au salon. Douze à quinze personnes, chacun avec son tapis ; j'apporte les bâches de sol, les couvertures et ce qu'il faut pour laisser le parc intact, et je suis assurée en responsabilité civile professionnelle hors salle.\n\nJe vends les places en ligne, 30 € thé compris, jauge fermée, et je vous règle chaque participant sur la base de votre tarif de groupe, thé inclus, ou un forfait par créneau si vous préférez. J'inscris la date aux agendas locaux.\n\nUn appel de dix minutes suffirait pour savoir si un créneau avant ou pendant l'ouverture vous convient. Je suis joignable en semaine après 13 h.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "museeeau",
    "cat": "nature",
    "nom": "Musée de l'Eau",
    "lieu": "Pont-en-Royans",
    "km": 45,
    "prio": 3,
    "gest": "Non affiché ; privatisation et séminaires proposés",
    "contact": "04 76 36 15 53",
    "deja": "Bar à eaux, restaurant, hôtel, privatisation d'espaces, concerts « Vendredis du Parvis »",
    "format": "Soirée « yoga et bar à eaux » sur le parvis un vendredi d'été",
    "prix": "30 €",
    "saison": "Juin à septembre",
    "src": "https://musee-eau.fr/",
    "destinataire": {
      "nom": "Musée de l'Eau, Pont-en-Royans",
      "email": null,
      "canal": "telephone 04 76 36 15 53"
    },
    "projet": {
      "titre": "Yoga et bar à eaux",
      "concept": "Une soirée d'été sur le parvis du Musée de l'Eau, un vendredi : une séance de yoga puis une dégustation au bar à eaux. Pour des adultes de tous niveaux, visiteurs et habitants du Royans. Le musée programme déjà des concerts sur ce parvis et propose la privatisation d'espaces : la soirée s'ajoute à cette vie du lieu.",
      "format": "1 h 30 sur le parvis, un vendredi soir de juin à septembre, 12 à 15 personnes, puis une dégustation d'eaux au bar. Bâches de sol, couvertures et tisane apportées par Maude, chacun vient avec son tapis. Un vendredi par mois d'été 2027, hors soirs de concert.",
      "deroule": "Accueil sur le parvis et respiration, 15 min · Pratique douce, 45 min · Chant à voix basse et méditation, 20 min · Dégustation au bar à eaux, 30 min",
      "prix": "30 € par personne dégustation comprise, vendus en ligne par Maude, jauge fermée ; la dégustation de chaque participant réglée au musée, ou un forfait pour le parvis, à convenir. À 10 participants, 300 € de recettes dont les dégustations réglées au musée.",
      "gain_lieu": "Un vendredi de plus sur le parvis, une dégustation vendue à chaque participant, et des visiteurs qui peuvent rester au restaurant ou à l'hôtel. Photos remises au musée, dates inscrites aux agendas gratuits et relayées auprès de la presse locale.",
      "demande": "Un appel de dix minutes pour savoir si un vendredi hors concert est envisageable et à qui s'adresser, puis un repérage du parvis ; une première date en juin 2027.",
      "attention": "Gestionnaire non affiché, l'interlocuteur est à identifier au téléphone ; parvis public, bruit et passage en soirée d'été ; ne pas empiéter sur les Vendredis du Parvis ; météo d'été."
    },
    "email": {
      "objet": "Yoga et bar à eaux sur le parvis, un vendredi",
      "corps": "Bonjour,\n\nJe suis professeure de yoga à Gillonnay. Vos Vendredis du Parvis, le bar à eaux et la privatisation d'espaces m'ont donné l'idée d'une soirée d'été qui commence par une pratique et finit au bar.\n\nJe propose « Yoga et bar à eaux » : 1 h 30 sur le parvis un vendredi soir de juin à septembre, une pratique douce, de la respiration et un temps de chant à voix basse, puis une dégustation d'eaux au bar. Douze à quinze personnes, chacun avec son tapis ; j'apporte les bâches de sol, les couvertures et la tisane, et je suis assurée en responsabilité civile professionnelle hors salle.\n\nJe vends les places en ligne, 30 € par personne dégustation comprise, jauge fermée, et je vous règle la dégustation de chaque participant ou un forfait pour le parvis. J'inscris la date aux agendas locaux et je vous remets les photos prises avec l'accord des participants.\n\nUn appel de dix minutes suffirait pour savoir si un vendredi hors concert est envisageable. Je suis joignable en semaine après 13 h.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "bercail",
    "cat": "producteur",
    "nom": "Ferm'avenir du Bercail",
    "lieu": "Gillonnay",
    "km": 1,
    "prio": 2,
    "gest": "Romain Poureau ; ferme support du Bercail Paysan (accueil de personnes en situation de handicap mental)",
    "contact": "poureau.romain@hotmail.fr · 06 84 18 22 86",
    "deja": "Vente à la ferme 7 j/7, marchés, drive ; 200 brebis bio, poules, porcs ; accueil de jour",
    "format": "« Yoga et petit-déjeuner aux brebis » le samedi matin dans la prairie, puis œufs et pain des producteurs du Bercail ; une séance inclusive avec les résidents en prolongement",
    "prix": "30 €",
    "saison": "Avril à octobre",
    "src": "https://www.alpes-isere.com/en/sit/fermavenir-du-bercail-5667134/",
    "destinataire": {
      "nom": "Romain Poureau, Ferm'avenir du Bercail",
      "email": "poureau.romain@hotmail.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Yoga et petit-déjeuner aux brebis",
      "concept": "Une séance douce d'une heure dans la prairie, au milieu des brebis, puis un petit-déjeuner avec les œufs et le pain des producteurs du Bercail. Pour tous les corps, voisins de Gillonnay et curieux de la plaine. Le Bercail est à un kilomètre du cours de Maude, ouvert tous les jours à la vente, et son accueil de jour ouvre la porte à une séance inclusive avec les résidents.",
      "format": "Samedi matin, 9 h à 11 h ; 12 personnes au plus ; dans la prairie, près des brebis ; séance, bâches de sol, couvertures et tisane apportées par Maude, petit-déjeuner vendu par la ferme ; chacun apporte son tapis. Avril à octobre, une matinée par mois, avec une séance de yoga adapté avec les résidents en prolongement.",
      "deroule": "Accueil dans la prairie (10 min) · Séance douce, respiration et postures au sol (60 min) · Temps calme, un peu de chant à voix basse si le lieu s'y prête (10 min) · Petit-déjeuner œufs et pain, passage par la vente à la ferme (40 min)",
      "prix": "30 € par personne au total : la séance vendue par Maude en ligne, le petit-déjeuner vendu par la ferme sur place à son tarif. À 10 participants, dix clients qui découvrent la vente à la ferme un samedi matin et repartent avec leurs achats.",
      "gain_lieu": "Dix clients nouveaux à la vente à la ferme un samedi matin, une animation prête à relayer (photos remises, date inscrite aux agendas de la mairie et d'Isère Attractivité), et une séance inclusive pour les résidents du Bercail Paysan sans rien organiser.",
      "demande": "Un repérage de dix minutes sur place, mardi ou jeudi prochain en fin de matinée, pour choisir le coin de prairie et fixer un premier samedi d'octobre ou d'avril.",
      "attention": "Prairie et brebis : humidité du sol au petit matin (bâches et couvertures prévues), pas de repli couvert connu en cas de pluie. La séance avec les résidents relève de l'accueil de jour : à caler avec l'équipe encadrante, pas seulement avec l'exploitant."
    },
    "email": {
      "objet": "Yoga et petit-déjeuner aux brebis, un samedi",
      "corps": "Bonjour Romain,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à un kilomètre de chez vous. Le Bercail a ce qu'il faut pour une matinée dehors : une prairie, des brebis, une vente à la ferme ouverte tous les jours, un accueil de jour que j'aimerais associer.\n\nJe vous propose « Yoga et petit-déjeuner aux brebis » : une séance douce d'une heure dans la prairie, un samedi matin, ouverte à tous les corps, puis un petit-déjeuner avec les œufs et le pain des producteurs du Bercail. Douze personnes au plus, chacun avec son tapis. En prolongement, une séance de yoga adapté avec les résidents, pour laquelle je suis certifiée.\n\nChacun vend le sien : je vends la séance en ligne, d'avance et à jauge fermée ; vous vendez le petit-déjeuner sur place, à votre tarif. L'ensemble revient à 30 € par personne. Je vous remets les photos et j'inscris la date aux agendas de la mairie et d'Isère Attractivité.\n\nPourrions-nous nous voir dix minutes sur place pour repérer le coin de prairie ? Je suis libre mardi et jeudi en fin de matinée.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "paulo",
    "cat": "producteur",
    "nom": "Chez Paulo, chèvrerie",
    "lieu": "Gillonnay",
    "km": 1,
    "prio": 2,
    "gest": "Paulo (nom complet non affiché)",
    "contact": "chezpaulochevrerie@gmail.com · 06 74 64 61 67",
    "deja": "Accueil sur place toute l'année, vente sur les marchés, fromages de son propre lait",
    "format": "« Yoga au lever des chèvres » : séance douce au pré à l'heure de la sortie du troupeau, dégustation de chèvres frais et affinés",
    "prix": "25 à 30 €",
    "saison": "Mai à septembre",
    "src": "https://www.alpes-isere.com/en/sit/chez-paulo-5934900/",
    "destinataire": {
      "nom": "Paulo, Chez Paulo chèvrerie",
      "email": "chezpaulochevrerie@gmail.com",
      "canal": "email"
    },
    "projet": {
      "titre": "Yoga au lever des chèvres",
      "concept": "Une séance douce au pré à l'heure où le troupeau sort, puis une dégustation de chèvres frais et affinés faits avec le lait de la ferme. Pour tous les corps, familles et voisins de la plaine. La chèvrerie est à un kilomètre du cours de Maude et accueille déjà du public sur place toute l'année.",
      "format": "Matin, 8 h 30 à 10 h 30 ; 10 à 12 personnes ; au pré, au moment de la sortie du troupeau ; séance, bâches de sol et couvertures apportées par Maude, dégustation vendue par la chèvrerie ; chacun apporte son tapis. Mai à septembre, une matinée par mois.",
      "deroule": "Accueil au pré à la sortie des chèvres (10 min) · Séance douce, respiration et postures au sol (60 min) · Temps calme (10 min) · Dégustation de chèvres frais et affinés, passage par la vente (40 min)",
      "prix": "25 à 30 € par personne au total : la séance vendue par Maude en ligne, la dégustation vendue par la chèvrerie à son tarif. À 10 participants, dix clients qui goûtent les fromages sur place un matin de semaine ou de week-end et repartent avec.",
      "gain_lieu": "Dix personnes à la dégustation et à la vente un matin calme, une animation clé en main à relayer sur les marchés, photos remises et date inscrite aux agendas de la mairie et d'Isère Attractivité.",
      "demande": "Un repérage de dix minutes un matin, mardi ou jeudi, cet automne, pour choisir le pré et caler une première date en mai.",
      "attention": "Saison courte, mai à septembre : le repérage se fait maintenant, la première date au printemps. Animaux et humidité au petit matin : bâches prévues, tapis à protéger, pas de repli couvert connu en cas de pluie."
    },
    "email": {
      "objet": "Yoga au lever des chèvres, une matinée au pré",
      "corps": "Bonjour Paulo,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, tout près de la chèvrerie. Vous accueillez sur place toute l'année et vos fromages viennent de votre lait : c'est le lieu que je cherche pour une séance au pré.\n\nJe vous propose « Yoga au lever des chèvres » : une séance douce d'une heure dans le pré, à l'heure où le troupeau sort, ouverte à tous les corps, puis une dégustation de vos chèvres frais et affinés. Dix à douze personnes, chacun avec son tapis, j'apporte les bâches de sol et les couvertures.\n\nChacun vend le sien : je vends la séance en ligne, d'avance et à jauge fermée ; vous vendez la dégustation sur place, à votre tarif. L'ensemble revient entre 25 et 30 € par personne. Je vous remets les photos et j'annonce la date aux agendas de la mairie et d'Isère Attractivité.\n\nJe vise mai à septembre : je voudrais repérer le pré dès maintenant et caler une première date au printemps. Pourrions-nous nous voir dix minutes un matin ? Je suis libre les mardis et jeudis.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "fermeberlioz",
    "cat": "producteur",
    "nom": "La Ferme de Berlioz",
    "lieu": "La Côte-Saint-André, Le Chuzeau",
    "km": 3,
    "prio": 1,
    "gest": "Karine et Hervé",
    "contact": "lafermedeberlioz.fr · 06 77 86 58 94",
    "deja": "Chambres, location de salles (réunions, séminaires, mariages), stages à la ferme, petit-déjeuner aux produits locaux, cuisine maison végétarienne, expositions",
    "format": "Le plus « clé en main » de la liste : matinée « yoga et brunch fermier » mensuelle (salle chauffée ou dehors, petit-déjeuner déjà au catalogue), puis un week-end de stage en chambres",
    "prix": "35 € la matinée ; week-end 300 à 350 €",
    "saison": "Toute l'année",
    "src": "https://www.lafermedeberlioz.fr/contact-acces/",
    "destinataire": {
      "nom": "Karine et Hervé, La Ferme de Berlioz",
      "email": null,
      "canal": "formulaire (lafermedeberlioz.fr/contact-acces) ou téléphone 06 77 86 58 94"
    },
    "projet": {
      "titre": "Yoga et brunch fermier",
      "concept": "Une matinée mensuelle : séance douce dans une salle chauffée ou dehors selon la saison, puis le petit-déjeuner aux produits locaux déjà au catalogue de la ferme. Pour tous les corps, habitants de La Côte-Saint-André et alentours. Dans un second temps, un week-end de stage en chambres avec la cuisine maison végétarienne. La ferme loue déjà des salles et accueille des stages : tout est en place.",
      "format": "Matinée : 9 h 30 à 12 h, 12 personnes au plus, salle chauffée l'hiver ou dehors à la belle saison, séance et bâches de sol apportées par Maude, petit-déjeuner et salle fournis par la ferme ; chacun apporte son tapis ; toute l'année, une matinée par mois. Week-end de stage : du samedi 10 h au dimanche 16 h, 8 à 12 personnes, nuit en chambres, repas végétariens, quatre séances.",
      "deroule": "Accueil et installation (15 min) · Séance douce, respiration et postures (75 min) · Temps calme, un temps de son à voix basse (10 min) · Brunch fermier aux produits locaux (60 min)",
      "prix": "35 € la matinée par personne au total : la séance vendue par Maude en ligne, le petit-déjeuner vendu par la ferme à son tarif ; salle facturée par la ferme à Maude. Week-end 300 à 350 € par personne, pension à vos conditions. À 10 participants, dix brunchs par mois, douze fois par an, et un week-end de stage qui remplit les chambres hors saison.",
      "gain_lieu": "Un rendez-vous mensuel qui remplit une salle et dix brunchs sans nouvelle offre à créer, un week-end de stage en chambres hors saison, des photos remises et chaque date inscrite aux agendas de Terres de Berlioz et d'Isère Attractivité.",
      "demande": "Un appel de dix minutes cette semaine, en fin de matinée, pour caler une première matinée en octobre, le tarif de la salle et le tarif de groupe en pension pour un week-end hors saison.",
      "attention": "La salle est louée aussi pour réunions, séminaires et mariages : éviter les week-ends déjà pris. Pour le week-end de stage, fixer tôt le tarif de groupe en pension et le nombre de chambres, sinon le prix de 300 à 350 € ne tient pas."
    },
    "email": {
      "objet": "Une matinée yoga et brunch fermier chaque mois",
      "corps": "Bonjour Karine et Hervé,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à trois kilomètres du Chuzeau. Vous louez des salles, accueillez des stages à la ferme, et votre petit-déjeuner aux produits locaux est au catalogue : la matinée que je propose s'y glisse sans rien changer.\n\nUne matinée « yoga et brunch fermier » une fois par mois : une séance douce d'une heure et quart, dans une salle chauffée ou dehors selon la saison, ouverte à tous les corps, puis votre petit-déjeuner. Douze personnes au plus, chacun apporte son tapis. Ensuite, un week-end de stage en chambres, cuisine végétarienne et deux séances par jour.\n\nChacun vend le sien : je vends la séance en ligne, d'avance et à jauge fermée, vous vendez le petit-déjeuner à votre tarif ; l'ensemble à 35 € la matinée. Le week-end, 300 à 350 € par personne, pension à vos conditions. Je vous remets les photos et j'inscris chaque date aux agendas de Terres de Berlioz et d'Isère Attractivité.\n\nPourrions-nous en parler dix minutes au téléphone cette semaine ? Je suis joignable en fin de matinée.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "jouvenal",
    "cat": "producteur",
    "nom": "Maison Jouvenal, chocolaterie",
    "lieu": "La Côte-Saint-André",
    "km": 3,
    "prio": 2,
    "gest": "Franck et Anne-Laure Jouvenal (4e génération)",
    "contact": "isabelle@jouvenal.fr · 04 74 20 31 77",
    "deja": "Ateliers et stages de chocolat, visites des ateliers, dégustations, repas tout chocolat, boutique 7 j/7",
    "format": "« Yoga et dégustation de chocolat » en fin de journée : séance sensorielle (respiration, goût) puis dégustation guidée par le chocolatier ; cadeau de Noël et Saint-Valentin tout trouvés",
    "prix": "35 €",
    "saison": "Toute l'année, novembre à février en tête",
    "src": "https://chocolaterie-jouvenal.fr/",
    "destinataire": {
      "nom": "Maison Jouvenal, chocolaterie",
      "email": "isabelle@jouvenal.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Yoga et dégustation de chocolat",
      "concept": "Une séance sensorielle en fin de journée, respiration et attention au goût, puis une dégustation guidée par le chocolatier. Pour tous les corps, pour offrir à Noël ou à la Saint-Valentin, ou se l'offrir un soir de semaine. La Maison propose déjà ateliers, visites et dégustations : la séance ajoute la mise en condition qui manque avant de goûter.",
      "format": "Fin de journée, 18 h 30 à 20 h 30 ; 12 personnes au plus ; dans l'espace des ateliers ou de dégustation de la Maison ; séance et bâches de sol apportées par Maude, dégustation guidée vendue par la chocolaterie ; chacun apporte son tapis. Toute l'année, une soirée par mois, deux en décembre et une autour du 14 février.",
      "deroule": "Accueil (10 min) · Séance douce centrée sur la respiration et les sens, un carré de chocolat dégusté les yeux fermés en fin de séance (60 min) · Temps calme (10 min) · Dégustation guidée par le chocolatier, passage par la boutique (40 min)",
      "prix": "35 € par personne au total : la séance vendue par Maude en ligne, la dégustation vendue par la Maison à son tarif. À 10 participants, dix clients dans la boutique un soir de semaine, et un bon cadeau de Noël ou de Saint-Valentin à vendre en caisse.",
      "gain_lieu": "Une soirée nouvelle au calendrier des ateliers sans rien fabriquer, dix clients en boutique en fin de journée, un produit cadeau pour décembre et février, photos remises et chaque date inscrite aux agendas de la mairie, de Terres de Berlioz et d'Isère Attractivité.",
      "demande": "Une visite de l'espace disponible un après-midi de la semaine prochaine, pour fixer une première soirée fin novembre.",
      "attention": "Il faut un espace au sol dégagé et chauffé pour douze tapis : vérifier la surface réelle de l'atelier ou de la salle de dégustation. La saison forte de la chocolaterie est aussi la plus chargée pour l'équipe : proposer des soirs creux."
    },
    "email": {
      "objet": "Yoga et dégustation de chocolat, fin de journée",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay. Vous proposez déjà des ateliers de chocolat, des visites, des dégustations et même des repas tout chocolat : je vous écris pour ajouter une séance qui prépare le goût.\n\nJe vous propose « Yoga et dégustation de chocolat » en fin de journée : une séance douce d'une heure, centrée sur la respiration et les sens, ouverte à tous les corps, puis une dégustation guidée par le chocolatier. Douze personnes au plus, chacun avec son tapis, j'apporte les bâches de sol. Un cadeau tout trouvé pour Noël et la Saint-Valentin, et une raison de venir un soir de semaine.\n\nChacun vend le sien : je vends la séance en ligne, d'avance et à jauge fermée ; vous vendez la dégustation à votre tarif. L'ensemble revient à 35 € par personne. Je vous remets les photos et j'annonce chaque date aux agendas de la mairie, de Terres de Berlioz et d'Isère Attractivité.\n\nUne première soirée fin novembre vous conviendrait-elle ? Je peux passer voir l'espace disponible un après-midi de la semaine prochaine.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "frettoise",
    "cat": "producteur",
    "nom": "La Cueillette Frettoise",
    "lieu": "La Frette",
    "km": 6,
    "prio": 3,
    "gest": "Famille Chaboud",
    "contact": "cueillettefrettoise.com · 04 74 54 66 54",
    "deja": "Cueillette en libre-service de fruits et légumes selon la saison",
    "format": "« Yoga puis cueillette » à l'aube en saison des fraises ou des courges, chacune repart avec son panier",
    "prix": "20 € + le panier",
    "saison": "Mai à octobre",
    "src": "https://www.cueillettefrettoise.com/",
    "destinataire": {
      "nom": "Famille Chaboud, La Cueillette Frettoise",
      "email": null,
      "canal": "formulaire (cueillettefrettoise.com) ou téléphone 04 74 54 66 54"
    },
    "projet": {
      "titre": "Yoga puis cueillette",
      "concept": "Une séance douce au lever du jour au bord des rangs, puis chacun part cueillir et repart avec son panier. Pour tous les corps, familles et lève-tôt de la plaine. La cueillette en libre-service suit la saison, fraises ou courges : la séance suit le même calendrier.",
      "format": "Matin, 8 h à 10 h ; 10 à 12 personnes ; au bord des rangs, sur un espace enherbé à choisir avec la famille ; séance, bâches de sol et tisane apportées par Maude, panier vendu par la cueillette ; chacun apporte son tapis. Mai à octobre, une date à la saison des fraises et une à la saison des courges.",
      "deroule": "Accueil à l'entrée de la cueillette (10 min) · Séance douce, respiration et postures au sol (60 min) · Tisane et temps calme (10 min) · Cueillette libre, chacun compose son panier (40 min)",
      "prix": "20 € par personne pour la séance, vendue par Maude en ligne, plus le panier vendu par la cueillette à son tarif comme à tout cueilleur. À 10 participants, dix paniers de plus à l'ouverture un matin calme.",
      "gain_lieu": "Dix cueilleurs de plus dès l'ouverture, un matin de semaine ou de week-end, photos remises et date inscrite aux agendas de la mairie et d'Isère Attractivité.",
      "demande": "Un appel de dix minutes en fin de matinée pour caler une première date un samedi d'octobre, pendant les courges, l'heure et l'endroit.",
      "attention": "Tout dépend de la météo et de l'état des rangs : prévoir une date de repli. La séance ne doit pas gêner l'ouverture normale de la cueillette, ni piétiner les cultures : espace enherbé à choisir avec la famille."
    },
    "email": {
      "objet": "Yoga puis cueillette, un matin de saison",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à six kilomètres de La Frette. Votre cueillette en libre-service suit la saison, fraises ou courges selon le moment, et c'est ce rythme qui m'a donné l'idée.\n\nJe vous propose « Yoga puis cueillette » : une séance douce d'une heure au bord des rangs, au lever du jour, ouverte à tous les corps, puis chacun part cueillir et repart avec son panier. Dix à douze personnes, chacun avec son tapis, j'apporte les bâches de sol et une tisane.\n\nChacun vend le sien : je vends la séance en ligne à 20 €, d'avance et à jauge fermée ; vous vendez le panier comme à tout cueilleur. Vous gagnez dix clients de plus à l'ouverture, un matin calme, et je vous remets les photos prises avec l'accord des participants. J'annonce la date aux agendas de la mairie et d'Isère Attractivité.\n\nUne première date pendant les courges, un samedi d'octobre, serait-elle possible ? Un appel de dix minutes suffit pour caler l'heure et l'endroit ; je suis joignable en fin de matinée.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "gamme",
    "cat": "producteur",
    "nom": "La Gamme Paysanne, magasin de producteurs",
    "lieu": "La Frette",
    "km": 6,
    "prio": 3,
    "gest": "Collectif de 9 fermes",
    "contact": "contact@gammepaysanne.com · 04 74 54 65 25",
    "deja": "Vente directe 6 j/7, le vendeur est le producteur",
    "format": "Partenaire « panier » plutôt que lieu : petit-déjeuner composé au magasin pour les séances chez un des producteurs, communication croisée auprès de leur clientèle",
    "prix": "Partenariat",
    "saison": "Toute l'année",
    "src": "https://www.gammepaysanne.com/le-magasin",
    "destinataire": {
      "nom": "La Gamme Paysanne, magasin de producteurs",
      "email": "contact@gammepaysanne.com",
      "canal": "email"
    },
    "projet": {
      "titre": "Le petit-déjeuner des séances",
      "concept": "Un partenariat « panier » plutôt qu'un lieu : le magasin compose le petit-déjeuner des matinées « yoga puis petit-déjeuner » que Maude monte chez des producteurs de la plaine, et relaie les dates auprès de sa clientèle. Le vendeur est le producteur, six jours sur sept : le petit-déjeuner vient de neuf fermes et se dit comme tel.",
      "format": "Un petit-déjeuner pour 10 à 12 personnes, composé avec ce qui est en rayon le jour même, préparé pour une heure fixée ou pris au magasin le matin même par Maude ; pour chaque matinée à la ferme, d'avril à octobre, environ une par mois ; le nom du magasin sur chaque annonce.",
      "deroule": "Commande une semaine avant chaque date (5 min) · Retrait au magasin le matin même ou livraison chez le producteur hôte (20 min) · Petit-déjeuner servi après la séance (40 min) · Photos et mention du magasin dans l'annonce et le compte rendu (le jour même)",
      "prix": "Partenariat : le petit-déjeuner facturé par le magasin à Maude au prix de vente, la séance vendue par Maude ; en échange, un relais des dates par le magasin. Pour un cycle de six matinées à 10 participants, soixante petits-déjeuners de producteurs commandés au magasin.",
      "gain_lieu": "Soixante petits-déjeuners commandés par saison, des clients qui viennent de goûter les produits, le nom du magasin sur chaque annonce et sur les photos remises.",
      "demande": "Dix minutes au magasin un matin de la semaine prochaine, à l'heure qui arrange l'équipe, pour fixer le contenu type d'un petit-déjeuner, son prix et la façon de relayer les dates.",
      "attention": "Collectif de neuf fermes : la décision peut demander un passage devant plusieurs personnes, prévoir un délai. Les dates dépendent des producteurs hôtes, qui ne sont pas forcément membres du magasin : le dire clairement pour éviter une gêne."
    },
    "email": {
      "objet": "Un petit-déjeuner de producteurs pour mes séances",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay. À La Gamme Paysanne, le vendeur est le producteur, six jours sur sept : c'est le partenaire que je cherche pour le petit-déjeuner de mes séances à la ferme.\n\nJe monte des matinées « yoga puis petit-déjeuner » chez des producteurs de la plaine, d'avril à octobre, pour dix à douze personnes. Pour chacune, il me faut un petit-déjeuner simple, composé avec ce que vous avez en rayon ce jour-là. Je passe le prendre au magasin le matin même, ou vous le préparez pour une heure fixée.\n\nChacun vend le sien : je vends la séance en ligne, vous me vendez le petit-déjeuner à votre prix, sur facture, et le nom du magasin figure sur chaque annonce. En échange, je vous demande de relayer les dates auprès de votre clientèle, affichage en caisse ou ligne sur vos réseaux. Vos neuf fermes y gagnent des clients qui viennent de goûter leurs produits.\n\nPourrions-nous en parler dix minutes au magasin ? Je peux passer un matin de la semaine prochaine, à l'heure qui vous arrange.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "bierestemps",
    "cat": "producteur",
    "nom": "Les Bières du Temps, brasserie bio (SCOP)",
    "lieu": "Champier",
    "km": 7,
    "prio": 1,
    "gest": "Coopérative",
    "contact": "contact@lesbieresdutemps.com · 04 74 79 52 96",
    "deja": "Visites guidées selon calendrier, dégustation 5 €, groupes dès 10, boutique mercredi, vendredi, samedi ; salle de brassage, parking, sanitaires",
    "format": "« Yoga puis bière » un vendredi soir : flow détente puis dégustation commentée (bières et limonade bio) ; les groupes de 10 sont déjà leur format",
    "prix": "30 €",
    "saison": "Toute l'année",
    "src": "https://www.lesbieresdutemps.com/",
    "destinataire": {
      "nom": "Les Bières du Temps, brasserie bio (SCOP)",
      "email": "contact@lesbieresdutemps.com",
      "canal": "email"
    },
    "projet": {
      "titre": "Yoga puis bière à la brasserie",
      "concept": "Un vendredi soir : un enchaînement détente accessible à tous les corps, puis la dégustation commentée de bières et de limonade bio que la brasserie propose déjà. Pour les actifs de la plaine qui finissent leur semaine. La brasserie reçoit déjà des groupes dès dix personnes et dispose d'une salle de brassage, d'un parking et de sanitaires.",
      "format": "Vendredi, 18 h 30 à 20 h 30 ; 10 à 12 personnes ; dans la salle de brassage ou dehors à la belle saison ; séance et bâches de sol apportées par Maude, dégustation vendue par la brasserie ; chacun apporte son tapis. Toute l'année, un vendredi par mois.",
      "deroule": "Accueil (10 min) · Séance, enchaînement détente et respiration (60 min) · Temps calme (10 min) · Dégustation commentée, bières et limonade bio, passage par la boutique (40 min)",
      "prix": "30 € par personne au total : la séance vendue par Maude en ligne, la dégustation vendue par la brasserie à 5 € comme aujourd'hui, plus ce qui part à la boutique. À 10 participants, un groupe de dix par mois qui ne demande aucune prospection à la brasserie.",
      "gain_lieu": "Un groupe de dix par mois pour la dégustation et la boutique un vendredi soir, sur un format que la brasserie maîtrise déjà, photos remises et chaque date inscrite aux agendas d'Isère Attractivité et transmise à la presse locale.",
      "demande": "Un appel de dix minutes en fin de matinée pour caler un premier vendredi en octobre, l'heure et l'espace au sol.",
      "attention": "La salle de brassage est un lieu de production : sol, odeurs, matériel et sécurité à vérifier sur place avant de poser douze tapis. Coopérative : la décision se prend à plusieurs, prévoir un délai de réponse."
    },
    "email": {
      "objet": "Yoga puis bière, un vendredi soir à la brasserie",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à sept kilomètres de Champier. Vous recevez des groupes de dix pour visites et dégustations, avec salle de brassage, parking et sanitaires : la soirée tient dans vos murs sans rien ajouter.\n\nJe vous propose « Yoga puis bière » un vendredi soir : une séance d'une heure, détente et respiration, accessible à tous les corps, dans la salle de brassage ou dehors l'été, puis votre dégustation commentée de bières et de limonade bio. Dix à douze personnes, chacun avec son tapis, j'apporte les bâches de sol.\n\nChacun vend le sien : je vends la séance en ligne, d'avance et à jauge fermée ; vous vendez la dégustation à 5 € comme aujourd'hui, et la boutique fait le reste. L'ensemble revient à 30 € par personne. Je vous remets les photos et j'annonce chaque date aux agendas d'Isère Attractivité et à la presse locale.\n\nUn premier vendredi en octobre serait-il possible ? Un appel de dix minutes suffit pour caler l'heure et l'espace ; je suis joignable en fin de matinée.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "rival",
    "cat": "producteur",
    "nom": "La Ferme du Rival, porcs bio plein air",
    "lieu": "Sardieu",
    "km": 8,
    "prio": 3,
    "gest": "Arnaud Frechat",
    "contact": "frechat2000@yahoo.fr · 06 77 12 96 43",
    "deja": "Visites guidées gratuites, dégustation, vente à la ferme le vendredi matin",
    "format": "« Yoga et casse-croûte à la ferme » : séance au pré, planche de charcuterie bio, visite déjà rodée",
    "prix": "28 €",
    "saison": "Avril à octobre",
    "src": "https://www.alpes-isere.com/decouvrir-l-isere/ou-manger/produits-du-terroir/visites-de-fermes-et-producteurs/la-ferme-du-rival",
    "destinataire": {
      "nom": "Arnaud Frechat, La Ferme du Rival",
      "email": "frechat2000@yahoo.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Yoga et casse-croûte à la ferme",
      "concept": "Une séance douce dans un pré, puis la visite déjà rodée de la ferme et une planche de charcuterie bio. Pour tous les corps, voisins de Sardieu et de la plaine. La ferme ouvre déjà aux visites avec dégustation et vend le vendredi matin : la matinée s'y accroche.",
      "format": "Vendredi ou samedi matin, 9 h à 11 h 30 ; 10 à 12 personnes ; dans un pré à choisir avec Arnaud ; séance, bâches de sol et couvertures apportées par Maude, planche vendue par la ferme ; chacun apporte son tapis. Avril à octobre, une matinée par mois.",
      "deroule": "Accueil au pré (10 min) · Séance douce, respiration et postures au sol (60 min) · Temps calme (10 min) · Visite de la ferme (30 min) · Planche de charcuterie bio et passage par la vente à la ferme (40 min)",
      "prix": "28 € par personne au total : la séance vendue par Maude en ligne, la planche vendue par la ferme à son tarif. À 10 participants, dix visiteurs qui passent par la vente à la ferme un vendredi matin.",
      "gain_lieu": "Dix visiteurs de plus à la visite et à la vente à la ferme, sur un format que la ferme propose déjà, photos remises et date inscrite aux agendas de la mairie et d'Isère Attractivité.",
      "demande": "Un repérage de dix minutes un matin de la semaine prochaine pour choisir le pré et fixer une première date en octobre.",
      "attention": "Porcs en plein air : choisir un pré à l'écart des animaux, sol et odeurs à vérifier. Saison qui se termine en octobre : une seule date possible avant le printemps."
    },
    "email": {
      "objet": "Yoga et casse-croûte à la ferme, au pré",
      "corps": "Bonjour Arnaud,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à huit kilomètres de Sardieu. Vous ouvrez déjà la ferme aux visites, avec dégustation et vente le vendredi matin : je vous propose d'y ajouter une matinée qui commence au pré.\n\n« Yoga et casse-croûte à la ferme » : une séance douce d'une heure dans un pré, ouverte à tous les corps, puis votre visite et une planche de charcuterie bio. Dix à douze personnes, chacun avec son tapis, j'apporte les bâches de sol et les couvertures. Le vendredi matin, jour de vente, ou un samedi, selon ce qui vous arrange.\n\nChacun vend le sien : je vends la séance en ligne, d'avance et à jauge fermée ; vous vendez la planche à votre tarif, et la vente à la ferme fait le reste. L'ensemble revient à 28 € par personne. Je vous remets les photos et j'annonce la date aux agendas de la mairie et d'Isère Attractivité.\n\nUne première date en octobre, avant l'hiver, serait-elle possible ? Je peux passer repérer le pré un matin de la semaine prochaine.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "orlane",
    "cat": "producteur",
    "nom": "Les Élixirs d'Orlane, plantes médicinales",
    "lieu": "Brézins",
    "km": 7,
    "prio": 1,
    "gest": "Orlane Blain",
    "contact": "orlane.blain@laposte.net · 06 95 69 64 91",
    "deja": "Stages de phytothérapie, ateliers de jardinage, balades plantes sauvages, visites thématiques, vente sur rendez-vous",
    "format": "« Yoga et tisane du jardin » : séance au milieu des plantes, cueillette et infusion préparée avec Orlane ; deux intervenantes, un format à 35 € qui se justifie",
    "prix": "35 €",
    "saison": "Mai à septembre",
    "src": "https://www.alpes-isere.com/sit/les-elixirs-dorlane-5601925/",
    "destinataire": {
      "nom": "Orlane Blain, Les Élixirs d'Orlane",
      "email": "orlane.blain@laposte.net",
      "canal": "email"
    },
    "projet": {
      "titre": "Yoga et tisane du jardin",
      "concept": "Une séance douce au milieu des plantes, respiration et attention aux odeurs, puis une cueillette guidée par Orlane et une infusion préparée ensemble. Deux intervenantes, chacune avec son métier. Pour tous les corps, curieux des plantes et habitués des stages d'Orlane. Le jardin accueille déjà stages, ateliers et balades : le format s'y construit à deux.",
      "format": "Matin ou fin d'après-midi, 2 h 30 ; 10 à 12 personnes ; dans le jardin de plantes médicinales, à Brézins ; séance et bâches de sol apportées par Maude, cueillette et infusion assurées et vendues par Orlane ; chacun apporte son tapis. Mai à septembre, une date par mois.",
      "deroule": "Accueil au jardin (10 min) · Séance douce, respiration et attention aux odeurs (60 min) · Temps calme (10 min) · Cueillette guidée par Orlane (30 min) · Infusion préparée ensemble et dégustée (40 min)",
      "prix": "35 € par personne au total : la séance vendue par Maude en ligne, la cueillette et l'infusion vendues par Orlane à son tarif. À 10 participants, dix personnes qui découvrent le jardin et ses préparations, avec deux intervenantes rémunérées chacune pour sa part.",
      "gain_lieu": "Un nouveau format à deux voix dans le calendrier des ateliers, dix visiteurs qui repartent avec les préparations du jardin, photos remises et chaque date inscrite aux agendas de la mairie et d'Isère Attractivité.",
      "demande": "Une demi-heure sur place cet automne, un mardi ou un jeudi, pour repérer le jardin, accorder les deux parties de la séance et fixer une première date en mai.",
      "attention": "Deux intervenantes : accorder les rôles et le tarif de chacune avant d'annoncer, pour que 35 € reste juste. Saison courte, mai à septembre, et dépendance à la météo : prévoir un repli ou une date de rechange."
    },
    "email": {
      "objet": "Yoga et tisane du jardin, à deux voix",
      "corps": "Bonjour Orlane,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à sept kilomètres de Brézins. Vous animez déjà des stages de phytothérapie, des ateliers de jardinage et des balades plantes sauvages : ce que je propose se construit à deux, chacune avec son métier.\n\n« Yoga et tisane du jardin » : une séance douce d'une heure au milieu des plantes, respiration et attention aux odeurs, ouverte à tous les corps, puis une cueillette guidée par vous et une infusion préparée ensemble. Deux heures et demie en tout, dix à douze personnes, chacun avec son tapis, j'apporte les bâches de sol.\n\nChacun vend le sien : je vends la séance en ligne, d'avance et à jauge fermée ; vous vendez la cueillette et l'infusion à votre tarif. L'ensemble revient à 35 € par personne, justifié à deux intervenantes. Je vous remets les photos et j'annonce chaque date aux agendas de la mairie et d'Isère Attractivité.\n\nLe jardin est à repérer avant la belle saison : pourrions-nous nous voir une demi-heure cet automne ? Je suis libre les mardis et jeudis.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "binche",
    "cat": "producteur",
    "nom": "Brasserie de Chambaran, La Bi'nche",
    "lieu": "Saint-Étienne-de-Saint-Geoirs",
    "km": 10,
    "prio": 1,
    "gest": "Non affiché",
    "contact": "contactlabinche@gmail.com · 09 72 82 66 24",
    "deja": "Visite sur rendez-vous, expositions, concerts, soirées à thème, groupes de 10 à 20, ouvert du mardi au samedi (vendredi jusqu'à 21 h 30)",
    "format": "Soirée « yoga puis bière » dans leur calendrier d'événements, 18 h 30 le vendredi",
    "prix": "30 €",
    "saison": "Toute l'année",
    "src": "https://www.alpes-isere.com/en/sit/brasserie-de-chambaran-la-binche-815057/",
    "destinataire": {
      "nom": "Brasserie de Chambaran, La Bi'nche",
      "email": "contactlabinche@gmail.com",
      "canal": "email"
    },
    "projet": {
      "titre": "Soirée yoga puis bière",
      "concept": "Une soirée dans le calendrier d'événements de la brasserie : un enchaînement détente accessible à tous les corps, puis la dégustation et la soirée qui suit. Pour les actifs de Saint-Étienne-de-Saint-Geoirs qui finissent leur semaine. La Bi'nche programme déjà expositions, concerts et soirées à thème, reçoit des groupes de dix à vingt et ouvre le vendredi jusqu'à 21 h 30.",
      "format": "Vendredi, 18 h 30 à 20 h 30 ; 12 à 15 personnes ; dans l'espace de la brasserie qui accueille déjà les soirées, sol dégagé ; séance et bâches de sol apportées par Maude, dégustation vendue par la brasserie ; chacun apporte son tapis. Toute l'année, un vendredi par mois.",
      "deroule": "Accueil (10 min) · Séance, enchaînement détente et respiration (60 min) · Temps calme (10 min) · Dégustation et soirée à la brasserie (à partir de 19 h 50, jusqu'à la fermeture)",
      "prix": "30 € par personne au total : la séance vendue par Maude en ligne, la dégustation vendue par la brasserie à son tarif. À 10 participants, dix clients qui restent pour la soirée un vendredi par mois.",
      "gain_lieu": "Une soirée de plus au calendrier sans rien produire, dix à quinze clients présents dès 18 h 30 et qui restent, photos remises et chaque date inscrite aux agendas d'Isère Attractivité et transmise à la presse locale.",
      "demande": "Une visite de l'espace un après-midi de la semaine prochaine, dix minutes, pour fixer une première soirée en octobre ou novembre.",
      "attention": "Concurrence des concerts et soirées déjà programmés le vendredi : choisir un vendredi libre. Un espace de brasserie n'est pas une salle de yoga : vérifier le sol, le bruit et la place pour quinze tapis."
    },
    "email": {
      "objet": "Soirée yoga puis bière, un vendredi à 18 h 30",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à dix kilomètres de Saint-Étienne-de-Saint-Geoirs. La Bi'nche programme expositions, concerts et soirées à thème, reçoit des groupes de dix à vingt et ouvre le vendredi jusqu'à 21 h 30 : une soirée yoga s'inscrit dans ce calendrier.\n\nJe vous propose « Yoga puis bière » un vendredi à 18 h 30 : une séance d'une heure, un enchaînement détente accessible à tous les corps, puis votre dégustation et la soirée qui suit. Douze à quinze personnes, chacun avec son tapis, j'apporte les bâches de sol. Il me faut un sol dégagé le temps de la séance.\n\nChacun vend le sien : je vends la séance en ligne, d'avance et à jauge fermée ; vous vendez la dégustation et ce qui suit, à votre tarif. L'ensemble revient autour de 30 € par personne. Je vous remets les photos et j'annonce chaque date aux agendas d'Isère Attractivité et à la presse locale.\n\nUne première soirée en octobre ou novembre serait-elle possible ? Je peux passer voir l'espace un après-midi de la semaine prochaine.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "noixlea",
    "cat": "producteur",
    "nom": "L'Atelier de la Noix de Léa, noix AOP bio",
    "lieu": "Saint-Étienne-de-Saint-Geoirs, Mas Saint-Martin",
    "km": 10,
    "prio": 2,
    "gest": "Léa (gérante)",
    "contact": "atelierdelanoix38@free.fr · 04 76 65 53 31",
    "deja": "Visite possible, boutique (cerneaux, huile, liqueur de noix vertes)",
    "format": "« Yoga sous les noyers » à l'automne, dégustation d'huile et de cerneaux ; le mas donne le décor",
    "prix": "28 €",
    "saison": "Septembre à novembre",
    "src": "https://www.atelierdelanoix.fr/",
    "destinataire": {
      "nom": "Léa, L'Atelier de la Noix de Léa",
      "email": "atelierdelanoix38@free.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Yoga sous les noyers",
      "concept": "Une séance douce à l'automne au Mas Saint-Martin, puis la visite de l'atelier et une dégustation d'huile et de cerneaux. Pour tous les corps, à la saison où la noix se travaille. L'atelier ouvre déjà à la visite et tient boutique : le mas donne le décor.",
      "format": "Matin, 9 h 30 à 11 h 30 ; 10 à 12 personnes ; sous les noyers du mas, repli à voir avec Léa ; séance, bâches de sol et couvertures apportées par Maude, dégustation vendue par l'atelier ; chacun apporte son tapis. Septembre à novembre, deux dates dans la saison.",
      "deroule": "Accueil au mas (10 min) · Séance douce, respiration et postures au sol (60 min) · Temps calme (10 min) · Visite de l'atelier (20 min) · Dégustation d'huile et de cerneaux, passage par la boutique (30 min)",
      "prix": "28 € par personne au total : la séance vendue par Maude en ligne, la dégustation vendue par l'atelier à son tarif. À 10 participants, dix clients à la boutique un matin d'automne, cerneaux, huile et liqueur en tête.",
      "gain_lieu": "Dix clients à la boutique en pleine saison de la noix, une animation qui met le mas en avant, photos remises et date inscrite aux agendas de la mairie et d'Isère Attractivité.",
      "demande": "Un repérage un matin de la semaine prochaine, dix minutes, pour caler une première date fin septembre ou en octobre.",
      "attention": "Saison courte, septembre à novembre, et fraîcheur des matins d'octobre : couvertures prévues, horaire à décaler si besoin. La récolte occupe l'exploitation à cette période : choisir un créneau qui ne gêne pas le travail."
    },
    "email": {
      "objet": "Yoga sous les noyers, une matinée d'automne",
      "corps": "Bonjour Léa,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à dix kilomètres du Mas Saint-Martin. Vous ouvrez l'atelier à la visite et votre boutique propose cerneaux, huile et liqueur de noix vertes : j'aimerais y ajouter une matinée sous les noyers, à la saison où l'on y travaille.\n\nJe vous propose « Yoga sous les noyers » : une séance douce d'une heure au mas, ouverte à tous les corps, puis votre visite et une dégustation d'huile et de cerneaux. Dix à douze personnes, chacun avec son tapis, j'apporte bâches et couvertures, les matins d'octobre sont frais.\n\nChacun vend le sien : je vends la séance en ligne, d'avance et à jauge fermée ; vous vendez la dégustation à votre tarif, et la boutique fait le reste. L'ensemble revient à 28 € par personne. Je vous remets les photos et j'annonce la date aux agendas de la mairie et d'Isère Attractivité.\n\nLa saison est courte, septembre à novembre : une date fin septembre ou en octobre serait-elle possible ? Je peux passer repérer un matin de la semaine prochaine.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "safran",
    "cat": "producteur",
    "nom": "Safran du Dauphiné",
    "lieu": "Saint-Pierre-de-Bressieux",
    "km": 14,
    "prio": 1,
    "gest": "Coralie Chenavas",
    "contact": "coralie.chenavas@gmail.com · 07 86 26 90 47",
    "deja": "Visites sur réservation de 1 h 30 à 2 h jusqu'à 50 personnes (9 €, 7 € en groupe), programmes adaptés seniors et randonneurs, bâtiment couvert en brique et bois près des safranières, au pied du château de Bressieux",
    "format": "« Yoga et cueillette du safran » en octobre à la floraison : séance au lever du jour, cueillette, dégustation safranée ; la grange permet un repli. Le mini-stage d'automne",
    "prix": "40 à 45 €",
    "saison": "Octobre (floraison) ; visites toute l'année",
    "src": "https://www.bienvenue-a-la-ferme.com/auvergnerhonealpes/isere/st-pierre-de-bressieux/ferme/safran-du-dauphine/390677",
    "destinataire": {
      "nom": "Coralie Chenavas, Safran du Dauphiné",
      "email": "coralie.chenavas@gmail.com",
      "canal": "email"
    },
    "projet": {
      "titre": "Yoga et cueillette du safran",
      "concept": "Un mini-stage d'automne à la floraison : séance au lever du jour près des safranières, cueillette avec Coralie, dégustation safranée. Pour tous les corps, seniors et randonneurs compris, le public que la ferme reçoit déjà. Le bâtiment couvert en brique et bois permet un repli, le château de Bressieux donne le décor.",
      "format": "Matin, 8 h à 11 h ; 12 personnes au plus ; près des safranières, repli dans le bâtiment couvert ; séance, bâches de sol et couvertures apportées par Maude, visite, cueillette et dégustation vendues par la ferme ; chacun apporte son tapis. Octobre, à la floraison : une ou deux dates, et une version sans cueillette possible le reste de l'année.",
      "deroule": "Accueil au lever du jour (10 min) · Séance douce, respiration et postures au sol (60 min) · Temps calme (10 min) · Cueillette du safran avec Coralie (45 min) · Dégustation safranée (45 min)",
      "prix": "40 à 45 € par personne au total : la séance vendue par Maude en ligne, la visite et la dégustation vendues par la ferme à son tarif. À 10 participants, dix visiteurs pour une matinée complète en pleine floraison, le moment où la ferme a le plus à montrer.",
      "gain_lieu": "Une matinée à la floraison qui remplit la jauge sans démarchage, dix visiteurs qui repartent par la boutique, photos remises et date inscrite aux agendas de la mairie et d'Isère Attractivité.",
      "demande": "Un repérage cette semaine ou la suivante, un mardi ou un jeudi, pour fixer une date un matin d'octobre, à la floraison.",
      "attention": "La floraison ne se commande pas : la date se confirme au dernier moment, prévoir une liste d'attente et une date de rechange. Froid et rosée au lever du jour en octobre : couvertures prévues, repli couvert à valider."
    },
    "email": {
      "objet": "Yoga et cueillette du safran, à la floraison",
      "corps": "Bonjour Coralie,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay. Vous recevez des visites sur réservation, avec des programmes pour seniors et randonneurs, et un bâtiment couvert près des safranières : le lieu qu'il faut pour un mini-stage à la floraison.\n\nJe vous propose « Yoga et cueillette du safran » en octobre : une séance douce d'une heure au lever du jour près des safranières, ouverte à tous les corps, puis la cueillette avec vous et une dégustation safranée. Trois heures, douze personnes au plus, chacun avec son tapis, j'apporte bâches et couvertures ; le bâtiment couvert permet un repli.\n\nChacun vend le sien : je vends la séance en ligne, d'avance et à jauge fermée ; vous vendez la visite et la dégustation à votre tarif. L'ensemble revient entre 40 et 45 € par personne. Je vous remets les photos et j'annonce la date aux agendas de la mairie et d'Isère Attractivité.\n\nLa floraison est proche : une date un matin d'octobre serait-elle possible ? Je peux passer repérer cette semaine ou la suivante, un mardi ou un jeudi.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "pionvignon",
    "cat": "producteur",
    "nom": "Moulin Pion-Vignon, huile de noix",
    "lieu": "Saint-Siméon-de-Bressieux",
    "km": 12,
    "prio": 3,
    "gest": "Françoise et Patrick Vignon (5e génération)",
    "contact": "04 74 20 13 44",
    "deja": "Visites du moulin hydraulique de 1855 sur réservation, uniquement du 1er mai au 15 septembre le mardi après-midi, dégustation",
    "format": "« Yoga au moulin » un mardi de juin : séance au bord de l'eau, visite de la meule, dégustation d'huile",
    "prix": "25 €",
    "saison": "Mai à mi-septembre",
    "src": "https://moulin-pion-vignon.jimdofree.com/nos-visites/",
    "destinataire": {
      "nom": "Françoise et Patrick Vignon, Moulin Pion-Vignon",
      "email": null,
      "canal": "telephone 04 74 20 13 44"
    },
    "projet": {
      "titre": "Yoga au moulin",
      "concept": "Une séance douce au bord de l'eau, puis la visite de la meule du moulin hydraulique de 1855 et la dégustation d'huile de noix. Pour tous les corps, un mardi de juin. Le moulin ouvre à la visite le mardi après-midi du 1er mai au 15 septembre : la séance prolonge ce créneau plutôt que d'en créer un.",
      "format": "Un mardi de juin, 16 h 30 à 18 h 30 ; 10 à 12 personnes ; au bord de l'eau, sur un espace à choisir avec les propriétaires ; séance et bâches de sol apportées par Maude, visite et dégustation vendues par le moulin ; chacun apporte son tapis. Mai à mi-septembre, une date par saison.",
      "deroule": "Accueil au moulin (10 min) · Séance douce au bord de l'eau, respiration et postures au sol (60 min) · Temps calme, un temps de son à voix basse (10 min) · Visite de la meule (30 min) · Dégustation d'huile de noix (20 min)",
      "prix": "25 € par personne au total : la séance vendue par Maude en ligne, la visite et la dégustation vendues par le moulin à son tarif, comme aux autres visiteurs. À 10 participants, dix visiteurs de plus sur un mardi d'ouverture, sans ouvrir un jour de plus.",
      "gain_lieu": "Un groupe de dix sur un créneau de visite déjà ouvert, une animation qui met le moulin en avant en juin, photos remises et date inscrite aux agendas de la mairie et d'Isère Attractivité.",
      "demande": "Un appel de dix minutes cet automne, en fin de matinée, pour repérer un mardi de juin et l'endroit au bord de l'eau.",
      "attention": "Visites uniquement le mardi après-midi de mai à mi-septembre, et contact par téléphone seulement : une seule date possible par saison, à caler tôt. Bord de l'eau, moulin en fonctionnement : sécurité et bruit à vérifier sur place."
    },
    "email": {
      "objet": "Yoga au moulin, un mardi de juin",
      "corps": "Bonjour Françoise et Patrick,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à douze kilomètres de Saint-Siméon. Vous ouvrez le moulin hydraulique de 1855 à la visite du 1er mai au 15 septembre, le mardi après-midi, avec dégustation : c'est ce créneau que je voudrais prolonger.\n\nJe vous propose « Yoga au moulin » un mardi de juin : une séance douce d'une heure au bord de l'eau, ouverte à tous les corps, puis votre visite de la meule et la dégustation d'huile. Dix à douze personnes, chacun avec son tapis, j'apporte les bâches.\n\nChacun vend le sien : je vends la séance en ligne, d'avance et à jauge fermée ; vous vendez la visite et la dégustation à votre tarif. L'ensemble revient à 25 € par personne. Je vous remets les photos et j'annonce la date aux agendas de la mairie et d'Isère Attractivité.\n\nLa saison est finie pour cette année : pourrions-nous nous parler dix minutes au téléphone cet automne, pour choisir un mardi de juin et l'endroit au bord de l'eau ? Je suis joignable en fin de matinée.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "serines",
    "cat": "producteur",
    "nom": "Domaine Les Sérines d'Or, vignoble de Seyssuel",
    "lieu": "Seyssuel",
    "km": 40,
    "prio": 2,
    "gest": "Jérôme Ogier et Damien Robelet",
    "contact": "04 74 54 00 04 · jeromeogier@voila.fr",
    "deja": "Caveau, visite de cave, accueil de groupes sur réservation ; coteaux au-dessus du Rhône",
    "format": "« Yoga au domaine » face aux coteaux, dégustation syrah et viognier au caveau. Personne ne propose de yoga dans les vignes de façon lisible entre Lyon et Grenoble : la place est libre",
    "prix": "40 €",
    "saison": "Mai à juin, vendanges",
    "src": "https://www.vienne-seyssuel.com/27653-domaine-les-serines-dor.html",
    "destinataire": {
      "nom": "Jérôme Ogier et Damien Robelet, Domaine Les Sérines d'Or",
      "email": "jeromeogier@voila.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Yoga au domaine",
      "concept": "Une séance douce face aux coteaux au-dessus du Rhône, puis la visite de cave et une dégustation de syrah et de viognier au caveau. Pour tous les corps, amateurs de vin de Lyon, Vienne et Grenoble. Le domaine accueille déjà des groupes sur réservation, et personne ne propose de façon lisible de yoga dans les vignes entre Lyon et Grenoble.",
      "format": "Fin de matinée ou fin d'après-midi, 2 h 30 ; 12 personnes au plus ; sur un point de vue des coteaux à choisir avec les vignerons, repli au caveau ; séance et bâches de sol apportées par Maude, visite et dégustation vendues par le domaine ; chacun apporte son tapis. Deux temps : mai et juin, puis les vendanges ; une date à chaque fois.",
      "deroule": "Accueil au caveau et montée vers les coteaux (15 min) · Séance douce face aux vignes, respiration et postures (75 min) · Temps calme (10 min) · Visite de cave (20 min) · Dégustation syrah et viognier au caveau (40 min)",
      "prix": "40 € par personne au total : la séance vendue par Maude en ligne, la dégustation vendue par le domaine à son tarif. À 10 participants, dix clients au caveau à la fin d'une matinée, à deux moments forts de l'année.",
      "gain_lieu": "Un format inédit sur le secteur qui amène dix clients au caveau, une image qui se partage bien (photos remises), chaque date inscrite aux agendas locaux et transmise à la presse.",
      "demande": "Un appel de dix minutes, puis un repérage du domaine une matinée la semaine prochaine ou la suivante, pour fixer une date aux vendanges ou au printemps.",
      "attention": "À 40 km, c'est la piste la plus éloignée : le public vient de Vienne et Lyon plus que de la Bièvre, la communication doit suivre. Coteaux en pente, accès et sécurité à vérifier ; aux vendanges, l'équipe est prise, choisir le moment avec eux."
    },
    "email": {
      "objet": "Yoga au domaine, face aux coteaux de Seyssuel",
      "corps": "Bonjour Jérôme et Damien,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, en Bièvre. Vous accueillez des groupes sur réservation au caveau et en cave, sur les coteaux au-dessus du Rhône, et je n'ai trouvé personne entre Lyon et Grenoble qui propose de façon lisible du yoga dans les vignes.\n\nJe vous propose « Yoga au domaine » : une séance douce d'une heure et quart face aux coteaux, ouverte à tous les corps, puis votre visite de cave et une dégustation de syrah et de viognier au caveau. Douze personnes au plus, chacun avec son tapis, j'apporte les bâches de sol. Deux moments : mai et juin, puis les vendanges.\n\nChacun vend le sien : je vends la séance en ligne, d'avance et à jauge fermée ; vous vendez la dégustation à votre tarif. L'ensemble revient à 40 € par personne. Je vous remets les photos et j'annonce chaque date aux agendas locaux et à la presse.\n\nPourrions-nous en parler dix minutes au téléphone ? Je viens volontiers repérer le domaine une matinée, la semaine prochaine ou la suivante.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "michallet",
    "cat": "producteur",
    "nom": "Ferme Michallet, noix AOP bio",
    "lieu": "Cognin-les-Gorges",
    "km": 40,
    "prio": 3,
    "gest": "Famille Michallet",
    "contact": "fermemichallet@orange.fr · 06 76 54 19 99",
    "deja": "Balade dans la noyeraie, station de traitement, vin de noix, boutique toute l'année",
    "format": "Séance dans la noyeraie puis dégustation, en complément d'une date au Grand Séchoir tout proche",
    "prix": "28 €",
    "saison": "Septembre à novembre",
    "src": "https://www.alpes-isere.com/en/sit/ferme-michallet-108800/",
    "destinataire": {
      "nom": "Famille Michallet, Ferme Michallet",
      "email": "fermemichallet@orange.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Yoga dans la noyeraie",
      "concept": "Une séance douce dans la noyeraie à l'automne, puis la balade et la dégustation que la ferme propose déjà, vin de noix compris. Pour tous les corps, visiteurs de la vallée et du Grand Séchoir tout proche, avec lequel Maude cherche une date en écho.",
      "format": "Matin, 9 h 30 à 12 h ; 10 à 12 personnes ; dans la noyeraie, à Cognin-les-Gorges ; séance, bâches de sol et couvertures apportées par Maude, balade et dégustation vendues par la ferme ; chacun apporte son tapis. Septembre à novembre, une ou deux dates, à coordonner avec une date au Grand Séchoir.",
      "deroule": "Accueil à la ferme (10 min) · Séance douce dans la noyeraie, respiration et postures au sol (60 min) · Temps calme (10 min) · Balade dans la noyeraie et station de traitement (40 min) · Dégustation, vin de noix, passage par la boutique (30 min)",
      "prix": "28 € par personne au total : la séance vendue par Maude en ligne, la balade et la dégustation vendues par la ferme à son tarif. À 10 participants, dix clients à la boutique en pleine saison de la noix.",
      "gain_lieu": "Dix visiteurs de plus sur la balade et la boutique pendant la récolte, un lien avec une date au Grand Séchoir qui fait venir un public plus large, photos remises et date inscrite aux agendas d'Isère Attractivité et de Grenoble Alpes Tourisme.",
      "demande": "Un appel de dix minutes en fin de matinée pour caler une date en octobre ou en novembre, l'heure et l'endroit dans la noyeraie.",
      "attention": "À 40 km de Gillonnay, le public vient surtout de la vallée : la communication locale compte. Période de récolte et de traitement : choisir un créneau qui ne gêne pas le travail, vérifier le sol de la noyeraie après la pluie."
    },
    "email": {
      "objet": "Yoga dans la noyeraie, puis dégustation",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, en Bièvre. Vous proposez une balade dans la noyeraie, la station de traitement et une boutique ouverte toute l'année : j'aimerais y ajouter une matinée d'automne, quand les noix tombent.\n\nJe vous propose une séance douce d'une heure dans la noyeraie, ouverte à tous les corps, puis votre balade et une dégustation, vin de noix compris. Dix à douze personnes, chacun avec son tapis, j'apporte les bâches de sol et les couvertures. Je cherche aussi une date au Grand Séchoir, tout proche ; les deux peuvent se répondre.\n\nChacun vend le sien : je vends la séance en ligne, d'avance et à jauge fermée ; vous vendez la balade et la dégustation à votre tarif. L'ensemble revient à 28 € par personne. Je vous remets les photos et j'annonce la date aux agendas d'Isère Attractivité et de Grenoble Alpes Tourisme.\n\nUne date en octobre ou en novembre serait-elle possible ? Un appel de dix minutes suffit pour caler l'heure et l'endroit ; je suis joignable en fin de matinée.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "licorne",
    "cat": "producteur",
    "nom": "Ferme pédagogique La Licorne Bleue",
    "lieu": "Pisieu",
    "km": 20,
    "prio": 3,
    "gest": "Blandine",
    "contact": "lalicornebleue@orange.fr · 06 20 34 54 35",
    "deja": "Visites guidées dès 8 personnes (30 max), animations familles, ouverte toute l'année",
    "format": "« Yoga enfants à la ferme » : la certification yoga enfants de Maude + leur public familles",
    "prix": "15 € par enfant",
    "saison": "Vacances scolaires",
    "src": "https://tourisme.entre-bievreetrhone.fr/decouvrir/voir/je-visite-en-groupe/ferme-pedagogique-la-licorne-bleue",
    "destinataire": {
      "nom": "Blandine, Ferme pédagogique La Licorne Bleue",
      "email": "lalicornebleue@orange.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Yoga enfants à la ferme",
      "concept": "Pendant les vacances scolaires, une séance de yoga pour les enfants à la ferme, puis la visite guidée pour les enfants et les parents qui les accompagnent. Maude est certifiée yoga enfants ; la ferme reçoit déjà des familles et des groupes en visite toute l'année.",
      "format": "Un matin de vacances, 10 h à 12 h ; 8 à 12 enfants de 5 à 10 ans, parents en accompagnateurs ; sur un espace de la ferme à choisir avec Blandine, à l'abri si possible ; séance et bâches de sol apportées par Maude, visite vendue par la ferme ; chaque enfant apporte son tapis. Vacances scolaires, une ou deux dates par période, Toussaint pour commencer.",
      "deroule": "Accueil des familles (10 min) · Séance yoga enfants : jeux de respiration, postures d'animaux, temps calme (45 min) · Goûter apporté par les familles ou visite immédiate (15 min) · Visite guidée de la ferme pour les enfants et les parents (45 min)",
      "prix": "15 € par enfant pour la séance, vendue par Maude en ligne ; la visite vendue par la ferme aux familles à son tarif. À 10 enfants, dix familles à la visite un matin de vacances.",
      "gain_lieu": "Une animation de plus à proposer aux familles pendant les vacances, dix familles à la visite le même matin, photos remises avec l'accord des parents et chaque date inscrite aux agendas de la mairie et d'Isère Attractivité.",
      "demande": "Un appel de dix minutes en fin de matinée pour fixer une première date aux vacances de la Toussaint, l'heure et l'endroit.",
      "attention": "Public enfants : autorisation photo des parents, un adulte responsable par famille sur place, espace à l'écart des animaux pendant la séance. Météo aux vacances de la Toussaint : prévoir un abri."
    },
    "email": {
      "objet": "Yoga enfants à la ferme pendant les vacances",
      "corps": "Bonjour Blandine,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, certifiée yoga enfants. Vous recevez des familles et des groupes en visite guidée toute l'année : j'aimerais y ajouter, pendant les vacances, une séance de yoga pour les enfants.\n\nJe vous propose « Yoga enfants à la ferme » : quarante-cinq minutes pour les 5 à 10 ans, jeux de respiration, postures d'animaux, temps calme, puis votre visite pour les enfants et leurs parents. Huit à douze enfants, chacun avec son tapis, j'apporte les bâches de sol.\n\nChacun vend le sien : je vends la séance en ligne à 15 € par enfant, d'avance et à jauge fermée ; vous vendez la visite aux familles à votre tarif. Vous gagnez une raison de plus de venir aux vacances, et je vous remets les photos prises avec l'accord des parents. J'annonce chaque date aux agendas de la mairie et d'Isère Attractivité.\n\nUne première date aux vacances de la Toussaint serait-elle possible ? Un appel de dix minutes suffit pour caler l'heure et l'endroit ; je suis joignable en fin de matinée.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "charme",
    "cat": "producteur",
    "nom": "Domaine du Charme, chevaux miniatures",
    "lieu": "Montseveroux",
    "km": 25,
    "prio": 3,
    "gest": "Hélène Couturier",
    "contact": "domaine-du-charme@hotmail.com · 06 70 42 95 14",
    "deja": "Ferme de découverte, groupes jusqu'à 20, 20 ha de bois, prairies et rivière",
    "format": "Demi-journée « yoga et rivière » dans les prairies, avec les chevaux miniatures pour les enfants",
    "prix": "35 €",
    "saison": "Mai à septembre",
    "src": "https://www.bienvenue-a-la-ferme.com/auvergnerhonealpes/isere/montseveroux/ferme/domaine-du-charme/675174",
    "destinataire": {
      "nom": "Hélène Couturier, Domaine du Charme",
      "email": "domaine-du-charme@hotmail.com",
      "canal": "email"
    },
    "projet": {
      "titre": "Yoga et rivière au domaine",
      "concept": "Une demi-journée dans les prairies : séance douce, un temps de respiration au bord de la rivière, puis la découverte de la ferme et des chevaux miniatures pour les enfants qui accompagnent. Pour tous les corps, adultes avec ou sans enfants. Vingt hectares de bois, de prairies et une rivière, et des groupes jusqu'à vingt : le domaine a la place et l'habitude.",
      "format": "Demi-journée, 9 h 30 à 12 h 30 ; 12 à 15 adultes, enfants en accompagnateurs ; dans une prairie près de la rivière, à Montseveroux ; séance, bâches de sol et couvertures apportées par Maude, visite vendue par le domaine ; chacun apporte son tapis. Mai à septembre, une date par mois.",
      "deroule": "Accueil et marche jusqu'à la prairie (15 min) · Séance douce, respiration et postures au sol (60 min) · Respiration et temps calme au bord de la rivière (20 min) · Découverte de la ferme et des chevaux miniatures, avec les enfants (60 min) · Tisane et fin de matinée (20 min)",
      "prix": "35 € par adulte au total : la séance vendue par Maude en ligne, la visite vendue par le domaine à son tarif. À 10 adultes, dix visiteurs et leurs enfants à la découverte de la ferme une matinée de week-end.",
      "gain_lieu": "Un groupe de dix à quinze à la visite sur un format que le domaine accueille déjà, une animation à relayer aux familles, photos remises et chaque date inscrite aux agendas de la mairie et d'Isère Attractivité.",
      "demande": "Une demi-heure sur place cet automne, un mardi ou un jeudi, pour repérer la prairie et la rivière et fixer une première date en mai.",
      "attention": "Saison courte, mai à septembre : repérage à l'automne, première date au printemps. Rivière et enfants : surveillance des parents, distance aux chevaux pendant la séance ; 25 km et bois, prévoir l'accès et une solution en cas de pluie."
    },
    "email": {
      "objet": "Une demi-journée yoga et rivière au domaine",
      "corps": "Bonjour Hélène,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, en Bièvre. Vingt hectares de bois, de prairies et une rivière, des groupes jusqu'à vingt, des chevaux miniatures : le domaine a tout pour une demi-journée dehors, adultes et enfants compris.\n\nJe vous propose « Yoga et rivière » : une séance douce d'une heure dans une prairie, ouverte à tous les corps, une respiration au bord de l'eau, puis votre découverte de la ferme et des chevaux miniatures pour les enfants. Trois heures, douze à quinze personnes, chacun avec son tapis, j'apporte les bâches de sol et les couvertures.\n\nChacun vend le sien : je vends la séance en ligne, d'avance et à jauge fermée ; vous vendez la visite à votre tarif. L'ensemble revient à 35 € par adulte. Je vous remets les photos et j'annonce chaque date aux agendas de la mairie et d'Isère Attractivité.\n\nLa belle saison est passée : je voudrais repérer le domaine cet automne pour caler une première date en mai. Pourrions-nous nous voir une demi-heure ? Je suis libre les mardis et jeudis.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "berlioz",
    "cat": "culture",
    "nom": "Musée Hector-Berlioz",
    "lieu": "La Côte-Saint-André",
    "km": 3,
    "prio": 1,
    "gest": "Département de l'Isère",
    "contact": "musee-hector-berlioz@isere.fr · 04 74 20 24 88",
    "deja": "Entrée libre, jardin, concerts gratuits, ateliers ; « Sous le balcon d'Hector » pendant le festival (8 concerts gratuits en 2025), Nuit des musées",
    "format": "« Yoga au jardin d'Hector » un matin d'été avant l'ouverture ; et pendant le Festival Berlioz un « réveil yoga en musique » avant les concerts gratuits de midi",
    "prix": "20 € ; gratuit si porté par le musée",
    "saison": "Juin à septembre, août en tête",
    "src": "https://musees.isere.fr/musee/musee-hector-berlioz",
    "destinataire": {
      "nom": "Musée Hector-Berlioz (Département de l'Isère)",
      "email": "musee-hector-berlioz@isere.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Yoga au jardin d'Hector",
      "concept": "Une heure de yoga doux dans le jardin du musée, un matin d'été avant l'ouverture, pour les habitants et les visiteurs de passage. Pendant le Festival Berlioz, une version courte en « réveil yoga en musique » avant les concerts gratuits de midi. Le musée programme déjà un jardin en entrée libre, des concerts gratuits et des ateliers : la séance prolonge cette programmation en plein air.",
      "format": "1 h dans le jardin, 15 à 20 personnes, avant l'ouverture au public ; en août, 45 min de réveil yoga les matins de festival avant les concerts gratuits de midi. Chacun apporte son tapis ; bâches de sol, couvertures et tisane fournies. Juin à septembre, août en tête : une date test en juin, puis une série sur les matins de festival.",
      "deroule": "Accueil et installation dans le jardin (10 min) · Respiration et mouvements doux (35 min) · Temps de son ou de chant à voix basse si le lieu s'y prête (5 min) · Relaxation et tisane (10 min)",
      "prix": "20 € par personne si Maude vend les places ; gratuit pour le public si le musée porte la séance dans sa programmation et rémunère la prestation. À 10 participants payants, 200 € de recettes, dont un reversement au musée à convenir.",
      "gain_lieu": "Une animation matinale de plus dans une programmation déjà tournée vers le jardin et la gratuité, un public nouveau qui entre au musée par le corps, et des photos remises au musée pour sa communication.",
      "demande": "Un repérage du jardin avec la personne chargée de la programmation, un matin en semaine, et une réponse de principe avant fin janvier pour caler une date de juin et le rythme d'août.",
      "attention": "Pluie : repli ou report à convenir. Cadre administratif du Département (convention, rémunération d'un prestataire) à clarifier dès le premier échange ; ne pas empiéter sur les concerts de midi."
    },
    "email": {
      "objet": "Yoga au jardin d'Hector, un matin d'été",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à trois kilomètres du musée. Votre jardin en entrée libre, vos concerts gratuits et vos ateliers font déjà du musée un lieu ouvert sur l'extérieur, et c'est là que je voudrais proposer une séance.\n\nL'idée : « Yoga au jardin d'Hector », une heure de yoga doux un matin d'été avant l'ouverture, pour 15 à 20 personnes. Respiration, mouvements accessibles à tous les corps, puis une tisane. Chacun apporte son tapis, j'apporte bâches de sol et couvertures. Pendant le Festival, une version de 45 minutes en réveil yoga avant les concerts gratuits de midi.\n\nDeux façons de l'organiser, à votre main : le musée porte la séance dans sa programmation et me rémunère comme prestataire, gratuit pour le public ; ou je vends les places à 20 € en ligne, jauge fermée, et je reverse au musée un montant à convenir. Je suis assurée en responsabilité civile professionnelle hors salle.\n\nPourriez-vous m'accorder un repérage du jardin, un matin de votre choix ? Je suis disponible en semaine avant 10 h.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "louisxi",
    "cat": "culture",
    "nom": "Château Louis XI (cour) et Halle médiévale",
    "lieu": "La Côte-Saint-André",
    "km": 3,
    "prio": 2,
    "gest": "Commune de La Côte-Saint-André",
    "contact": "contact@lacotesaintandre.fr · 04 74 20 53 99 · salles : animations@lacotesaintandre.fr",
    "deja": "Cour = scène du Festival Berlioz, spectacles municipaux ; la Halle accueille les rendez-vous gratuits du festival et le forum des associations ; salles louables (demande écrite 15 jours avant)",
    "format": "Séance sous la Halle un dimanche matin de marché, ou dans la cour du château le matin d'un jour de festival",
    "prix": "15 à 20 €",
    "saison": "Mai à septembre",
    "src": "https://www.lacotesaintandre.fr/demarches-administratives/occupation-domaine-public-location-de-salle-et-debit-de-boisson/",
    "destinataire": {
      "nom": "Mairie de La Côte-Saint-André, service animations et salles",
      "email": "animations@lacotesaintandre.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Yoga sous la Halle, dimanche de marché",
      "concept": "Une séance de yoga doux sous la Halle médiévale un dimanche matin de marché, ouverte aux habitants et aux visiteurs, ou dans la cour du château Louis XI le matin d'un jour de festival. La Halle accueille déjà les rendez-vous gratuits du festival et le forum des associations, la cour sert de scène : deux lieux couverts ou centraux que les Côtois connaissent.",
      "format": "1 h, 20 personnes, sous la Halle (abritée de la pluie) le dimanche matin de marché, ou dans la cour du château un matin de festival. Chacun apporte son tapis ; bâches de sol, couvertures et tisane fournies. Mai à septembre : une date test, puis un dimanche par mois.",
      "deroule": "Installation (10 min) · Respiration et mouvements doux (35 min) · Relaxation guidée (10 min) · Tisane et échanges (5 min)",
      "prix": "15 à 20 € par personne, vendus en ligne par Maude, jauge fermée ; à 10 participants, 150 à 200 € de recettes, dont la redevance d'occupation du domaine public ou un forfait par créneau versé à la commune, à convenir.",
      "gain_lieu": "Une animation régulière et sans frais pour la commune, sous une halle déjà identifiée comme lieu de rendez-vous, une raison de plus de venir au marché le dimanche, et des images remises à la mairie.",
      "demande": "La marche à suivre et le tarif pour occuper la Halle un dimanche matin (demande écrite quinze jours avant), et un premier créneau test en mai ou juin.",
      "attention": "Occupation du domaine public : demande écrite quinze jours avant, redevance éventuelle. Ne pas gêner le marché ni les installations du festival dans la cour ; bruit du marché pendant la relaxation."
    },
    "email": {
      "objet": "Une séance de yoga sous la Halle, le dimanche",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay. La Halle médiévale accueille déjà les rendez-vous gratuits du festival et le forum des associations, et la cour du château sert de scène : deux lieux que les Côtois connaissent, où j'aimerais installer une séance de yoga.\n\nJe propose une heure de yoga doux sous la Halle, un dimanche matin de marché, pour 20 personnes, ou dans la cour du château un matin de festival. Respiration, mouvements accessibles à tous les corps, relaxation, tisane. Chacun apporte son tapis, j'apporte bâches de sol et couvertures, et je suis assurée en responsabilité civile professionnelle hors salle.\n\nJe vends les places en ligne, 15 à 20 € par personne, jauge fermée, et je verse à la commune la redevance d'occupation ou un forfait par créneau. J'inscris la séance aux agendas gratuits. La commune y gagne une animation régulière et sans frais, une raison de plus de venir au marché.\n\nPourriez-vous m'indiquer la marche à suivre pour occuper la Halle un dimanche matin, et un premier créneau possible en mai ou juin ? Je suis joignable en semaine.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "stantoine",
    "cat": "culture",
    "nom": "Musée de Saint-Antoine-l'Abbaye, jardin médiéval",
    "lieu": "Saint-Antoine-l'Abbaye",
    "km": 30,
    "prio": 2,
    "gest": "Département de l'Isère",
    "contact": "musee-saint-antoine@isere.fr · 04 76 36 40 68",
    "deja": "Entrée libre, quatre jardins (Paradis, Parfumeur, Simples, Céleste), Rendez-vous aux jardins, rendez-vous de l'été, ateliers tisanes, parcours « du soin au bien-être »",
    "format": "« Yoga des simples » : 1 h 30 dans le jardin des Simples pendant les Rendez-vous aux jardins (juin) ou les rendez-vous de l'été ; le musée programme déjà dehors",
    "prix": "20 € ; gratuit si porté par le musée",
    "saison": "Juin à septembre",
    "src": "https://musees.isere.fr/page/musee-de-saint-antoine-labbaye-le-jardin-medieval",
    "destinataire": {
      "nom": "Musée de Saint-Antoine-l'Abbaye (Département de l'Isère)",
      "email": "musee-saint-antoine@isere.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Yoga des simples au jardin médiéval",
      "concept": "Une séance de 1 h 30 dans le jardin des Simples, autour de la respiration et des plantes, pendant les Rendez-vous aux jardins de juin ou les rendez-vous de l'été. Le musée programme déjà des ateliers tisanes, un parcours « du soin au bien-être » et des animations dehors : le yoga y trouve sa place sans forcer.",
      "format": "1 h 30, 15 personnes, jardin des Simples, sur les allées ou une zone enherbée désignée par le musée. Chacun apporte son tapis ; bâches de sol, couvertures et tisane fournies. Juin (Rendez-vous aux jardins) puis une séance par mois pendant les rendez-vous de l'été, jusqu'en septembre.",
      "deroule": "Accueil au jardin et présentation des simples (10 min) · Respiration (20 min) · Postures douces au sol et debout (40 min) · Relaxation allongée (15 min) · Tisane (5 min)",
      "prix": "20 € par personne si Maude vend les places ; gratuit pour le public si le musée porte la séance et rémunère la prestation. À 10 participants payants, 200 € de recettes, reversement au musée à convenir.",
      "gain_lieu": "Une animation qui prolonge le parcours « du soin au bien-être » et les ateliers tisanes, en plein air, avec un public qui vient pour le corps et repart avec le jardin ; images remises au musée.",
      "demande": "Une place dans la programmation des Rendez-vous aux jardins 2027 ou des rendez-vous de l'été, et un repérage du jardin des Simples au printemps.",
      "attention": "Piétinement du jardin : rester sur les allées ou une zone enherbée à définir. Pluie : repli ou report. Cadre du Département pour la rémunération d'un prestataire ; 30 km de Gillonnay."
    },
    "email": {
      "objet": "Yoga des simples au jardin médiéval",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay. Vos quatre jardins, vos ateliers tisanes et votre parcours « du soin au bien-être » m'ont donné envie de vous écrire : le jardin des Simples est un lieu où une séance de yoga a du sens.\n\nJe propose « Yoga des simples » : une heure et demie dans le jardin des Simples, pour 15 personnes, pendant les Rendez-vous aux jardins de juin ou lors de vos rendez-vous de l'été. Respiration, postures douces accessibles à tous les corps, relaxation allongée. On reste sur les allées ou sur une zone enherbée que vous désignez. Chacun apporte son tapis, j'apporte bâches de sol et couvertures.\n\nÀ votre main : le musée porte la séance dans sa programmation et me rémunère comme prestataire, gratuit pour le public ; ou je vends les places à 20 € en ligne, jauge fermée, avec un reversement au musée à convenir. Je suis assurée en responsabilité civile professionnelle hors salle.\n\nAuriez-vous un moment au printemps pour un repérage du jardin des Simples ? Je suis disponible en semaine.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "vizille",
    "cat": "culture",
    "nom": "Domaine de Vizille, parc",
    "lieu": "Vizille",
    "km": 65,
    "prio": 3,
    "gest": "Département de l'Isère",
    "contact": "musee-revolution@isere.fr · 04 76 68 07 35",
    "deja": "Parc de 100 ha gratuit ; une « journée nature et bien-être » du Domaine a déjà accueilli du yoga dans le parc (édition 2023)",
    "format": "Candidater à la prochaine journée nature et bien-être (séances de 30 min sur réservation, prof rémunérée par le Domaine)",
    "prix": "Prestation au Département",
    "saison": "Juin",
    "src": "https://musees.isere.fr/musee-revolution/informations-pratiques",
    "destinataire": {
      "nom": "Domaine de Vizille, musée de la Révolution française (Département de l'Isère)",
      "email": "musee-revolution@isere.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Yoga au parc, journée nature et bien-être",
      "concept": "Des séances courtes de yoga doux dans le parc du Domaine, lors de la prochaine journée nature et bien-être, pour les visiteurs de tous âges et de tous corps. Le Domaine a déjà accueilli du yoga dans le parc à l'édition 2023 : Maude candidate comme intervenante rémunérée.",
      "format": "Séances de 30 min sur réservation, enchaînées sur la journée (quatre à six créneaux), 15 personnes par créneau, sur une pelouse du parc ; version sur chaise possible pour les personnes à mobilité réduite. Chacun apporte son tapis ; bâches de sol et couvertures fournies. Juin.",
      "deroule": "Accueil et respiration (5 min) · Mouvements doux debout et au sol (18 min) · Relaxation courte (5 min) · Transition vers le créneau suivant (2 min)",
      "prix": "Prestation facturée au Département sur devis, séances gratuites pour le public dans le programme de la journée ; pour une journée de quatre à six créneaux, un forfait journée à convenir.",
      "gain_lieu": "Une intervenante iséroise, certifiée yoga adapté et yoga enfants, pour une journée que le Domaine a déjà organisée, avec des séances accessibles aux personnes à mobilité réduite.",
      "demande": "Savoir si une journée nature et bien-être est prévue en 2027, et à qui adresser une candidature d'intervenante avec devis, avant le printemps.",
      "attention": "65 km de Gillonnay : une journée complète justifie le déplacement, pas une séance isolée. Météo de juin ; calendrier du Département fixé tôt dans l'année."
    },
    "email": {
      "objet": "Candidature yoga, journée nature et bien-être",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, diplômée YTT 500 h, certifiée yoga adapté et yoga enfants. J'ai vu que la journée nature et bien-être du Domaine avait accueilli du yoga dans le parc lors de l'édition 2023, et je souhaite vous proposer ma candidature pour la prochaine.\n\nCe que je sais faire sur une journée comme celle-là : des séances de 30 minutes sur réservation, enchaînées du matin à la fin d'après-midi, 15 personnes par créneau, sur une pelouse du parc. Respiration, mouvements doux accessibles à tous les corps, relaxation courte. Une version sur chaise est possible pour les personnes à mobilité réduite. Chacun apporte son tapis, j'apporte bâches de sol et couvertures, et je suis assurée en responsabilité civile professionnelle hors salle.\n\nJe travaille en prestation rémunérée par le Domaine, sur devis, avec un forfait pour la journée ; les séances restent gratuites pour vos visiteurs.\n\nUne journée nature et bien-être est-elle prévue en 2027, et à qui puis-je adresser une candidature avec devis ? Un appel de dix minutes me suffirait, je suis joignable en semaine.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "chartreuse",
    "cat": "culture",
    "nom": "Caves de la Chartreuse",
    "lieu": "Voiron",
    "km": 35,
    "prio": 2,
    "gest": "Chartreuse Diffusion (privé)",
    "contact": "04 76 05 81 77",
    "deja": "Espace plantes (goûter, toucher, sentir), ateliers confection de tisanes, ateliers cocktails, dégustations ; ouvert toute l'année, 13 €",
    "format": "Atelier « respiration et plantes » : pranayama puis confection de tisane dans l'espace plantes, dans la lignée de leurs ateliers payants",
    "prix": "40 €",
    "saison": "Toute l'année",
    "src": "https://tourisme.paysvoironnais.com/patrimoine-culturel/caves-de-la-chartreuse/",
    "destinataire": {
      "nom": "Caves de la Chartreuse (Chartreuse Diffusion)",
      "email": null,
      "canal": "telephone · 04 76 05 81 77 (aucune adresse publique : appeler pour obtenir le contact des ateliers, puis envoyer l'email)"
    },
    "projet": {
      "titre": "Respiration et plantes aux Caves",
      "concept": "Un atelier en deux temps dans l'espace plantes : une demi-heure de respiration guidée et de détente, puis la confection d'une tisane avec l'équipe des Caves et une dégustation. Pour les visiteurs qui viennent déjà goûter, toucher et sentir : ici ils respirent avant de composer. Dans la lignée des ateliers payants existants (tisanes, cocktails, dégustations).",
      "format": "1 h 30, 12 personnes, espace plantes ; assis sur chaise ou sur tapis selon la place au sol (chacun apporte son tapis si l'on va au sol). Pas de liqueur pendant la partie yoga. Toute l'année : un samedi par mois, ou pendant les vacances scolaires.",
      "deroule": "Accueil dans l'espace plantes (10 min) · Respiration guidée et détente (30 min) · Confection de tisane avec l'équipe des Caves (35 min) · Dégustation et échanges (15 min)",
      "prix": "40 € par personne : billet unique vendu par les Caves, tisane comprise, avec une part convenue pour la séance ; ou places vendues en ligne par Maude avec un reversement pour la partie tisane. À 12 participants, 480 € par atelier à partager selon une clé à convenir.",
      "gain_lieu": "Un atelier nouveau dans un catalogue déjà fourni, qui attire un public bien-être toute l'année et remplit des créneaux calmes ; communication croisée et photos remises.",
      "demande": "Un appel de dix minutes avec la personne chargée des ateliers, puis un repérage de l'espace plantes.",
      "attention": "Jauge dépendante de la place au sol dans l'espace plantes ; alcool : la partie yoga reste sur les plantes et la tisane ; pas d'adresse email publique, premier contact par téléphone."
    },
    "email": {
      "objet": "Un atelier respiration et plantes aux Caves",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay. Votre espace plantes, où l'on goûte, touche et sent, et vos ateliers de confection de tisanes m'ont donné une idée d'atelier qui s'inscrit dans ce que vous proposez déjà.\n\n« Respiration et plantes » : une heure et demie pour 12 personnes, dans l'espace plantes. Une demi-heure de respiration guidée et de détente, assis sur chaise ou sur tapis selon la place, puis la confection d'une tisane avec votre équipe et une dégustation. Je suis assurée en responsabilité civile professionnelle hors salle.\n\nCôté organisation, à votre main : un billet unique à 40 € vendu par les Caves, tisane comprise, avec une part convenue pour la séance ; ou des places vendues en ligne par moi, jauge fermée, avec un reversement pour la partie tisane, et une communication croisée. Un atelier de plus dans votre catalogue, pour un public bien-être toute l'année.\n\nAuriez-vous dix minutes au téléphone avec la personne chargée des ateliers, puis un repérage de l'espace plantes ? Je suis joignable en semaine.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "sechoir",
    "cat": "culture",
    "nom": "Le Grand Séchoir, Maison du pays de la noix",
    "lieu": "Vinay",
    "km": 35,
    "prio": 2,
    "gest": "Saint-Marcellin Vercors Isère Communauté",
    "contact": "04 76 36 36 10",
    "deja": "Parc paysager de noyers, visites gourmandes mensuelles, ateliers, concerts ; du 31 mars au 30 octobre, 5 €",
    "format": "« Yoga sous les noyers » à l'ouverture de la saison ou le matin du marché de terroir, puis visite gourmande",
    "prix": "25 € visite comprise",
    "saison": "Avril à octobre",
    "src": "https://www.legrandsechoir.fr/agenda",
    "now": "Marché de terroir le 18 octobre 2026 et « Forestivités » le 25 octobre : proposer une séance du matin.",
    "echeance": "2026-10-18",
    "destinataire": {
      "nom": "Le Grand Séchoir, Maison du pays de la noix (Saint-Marcellin Vercors Isère Communauté)",
      "email": null,
      "canal": "telephone · 04 76 36 36 10 (aucune adresse publique : appeler pour obtenir le contact, puis envoyer l'email)"
    },
    "projet": {
      "titre": "Yoga sous les noyers",
      "concept": "Une heure de yoga doux dans le parc paysager de noyers, le matin du marché de terroir ou à l'ouverture de la saison, suivie de la visite gourmande. Pour les visiteurs du Séchoir et les habitants du pays de la noix. Le parc et les visites gourmandes existent déjà : la séance ouvre la matinée.",
      "format": "1 h dans le parc (9 h 30 à 10 h 30), 20 personnes, puis visite gourmande avec l'équipe du Séchoir. Chacun apporte son tapis ; bâches de sol, couvertures et tisane fournies. D'abord le 18 octobre 2026 (marché de terroir) ou le 25 octobre (Forestivités), puis à l'ouverture de la saison 2027 et un matin de visite gourmande par mois, d'avril à octobre.",
      "deroule": "Accueil sous les noyers (10 min) · Respiration et mouvements doux (40 min) · Relaxation (10 min) · Visite gourmande avec l'équipe du Séchoir (45 min à 1 h)",
      "prix": "25 € par personne, visite gourmande comprise, vendus en ligne par Maude ; à 10 participants, 250 €, dont l'entrée et la visite reversées au Séchoir à leur tarif, le reste pour la séance. Ou prestation facturée à la communauté de communes si le Séchoir porte l'animation.",
      "gain_lieu": "Vingt entrées et visites de plus un matin de marché, un public qui reste sur place, une animation dans l'agenda du Séchoir ; photos remises.",
      "demande": "Un créneau le matin du 18 octobre ou du 25 octobre 2026, et un repérage du parc la semaine précédente.",
      "attention": "Délai court pour octobre : communiquer vite. Fraîcheur du matin et sol humide en automne (bâches, couvertures) ; noix au sol pendant la récolte ; saison fermée de novembre à fin mars."
    },
    "email": {
      "objet": "Yoga sous les noyers le matin du marché",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay. Votre parc de noyers, vos visites gourmandes et votre marché de terroir du 18 octobre m'ont donné envie de vous proposer une séance de yoga pour ouvrir la matinée.\n\n« Yoga sous les noyers » : une heure de yoga doux dans le parc, de 9 h 30 à 10 h 30, pour 20 personnes, suivie de la visite gourmande avec votre équipe. Respiration, mouvements accessibles à tous les corps, relaxation. Chacun apporte son tapis, j'apporte bâches de sol, couvertures et tisane, et je suis assurée en responsabilité civile professionnelle hors salle.\n\nJe vends les places en ligne à 25 € par personne, visite gourmande comprise, jauge fermée, et je vous reverse l'entrée et la visite à votre tarif pour chaque participant. Vous y gagnez vingt entrées et visites de plus un matin de marché, un public qui reste sur place.\n\nUn créneau serait-il possible le matin du 18 octobre, ou du 25 octobre pour les Forestivités ? Un repérage du parc la semaine précédente me suffirait, je suis disponible en semaine.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "mediatheques",
    "cat": "culture",
    "nom": "Médiathèques Bièvre Isère",
    "lieu": "La Côte-Saint-André et 3 autres",
    "km": 3,
    "prio": 2,
    "gest": "Bièvre Isère Communauté",
    "contact": "contact@bievre-isere.com · 04 76 93 51 46",
    "deja": "Ateliers, expositions, spectacles, conférences ; une « semaine du bien-être » (mandalas, art-thérapie, aromathérapie) apparaît en recherche, année non vérifiée",
    "format": "Atelier yoga ou relaxation gratuit à la prochaine semaine bien-être : le canal local qui touche les familles de Gillonnay, payé par la collectivité",
    "prix": "Prestation à la collectivité",
    "saison": "Automne",
    "src": "https://www.bievre-isere.com/les-services/culture/les-mediatheques/",
    "destinataire": {
      "nom": "Médiathèques Bièvre Isère (Bièvre Isère Communauté, service culture)",
      "email": "contact@bievre-isere.com",
      "canal": "email"
    },
    "projet": {
      "titre": "Atelier yoga à la semaine bien-être",
      "concept": "Un atelier de yoga doux et de relaxation dans une médiathèque de Bièvre Isère, gratuit pour le public, pour les familles et les adultes du territoire. Les médiathèques programment déjà ateliers, expositions et conférences, et une semaine du bien-être avec mandalas, art-thérapie et aromathérapie : le yoga y a sa place, à La Côte-Saint-André comme dans les autres communes.",
      "format": "1 h, 15 personnes, dans la salle d'animation d'une médiathèque, assis sur chaise ou au sol selon la place (version adaptée possible). Chacun apporte son tapis ou reste sur chaise. Automne : un atelier par médiathèque (quatre au plus) pendant la semaine du bien-être, ou un cycle de trois séances dans une seule.",
      "deroule": "Accueil (5 min) · Respiration et mouvements doux, assis ou debout (35 min) · Relaxation guidée (15 min) · Échanges (5 min)",
      "prix": "Prestation facturée à Bièvre Isère Communauté, atelier gratuit pour le public ; pour un cycle de quatre ateliers (un par médiathèque), un forfait sur devis.",
      "gain_lieu": "Une animation corporelle qui complète la semaine du bien-être, touche les familles et fait venir un public qui ne fréquente pas forcément la médiathèque ; intervenante du territoire, certifiée yoga enfants et yoga adapté.",
      "demande": "Savoir si une semaine du bien-être est prévue cet automne ou en 2027, et à qui envoyer un devis pour un ou quatre ateliers.",
      "attention": "Place au sol limitée en médiathèque : privilégier la version sur chaise. Programmation culturelle arrêtée plusieurs mois à l'avance ; l'année de la semaine du bien-être n'est pas vérifiée."
    },
    "email": {
      "objet": "Un atelier yoga pour la semaine du bien-être",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, diplômée YTT 500 h, certifiée yoga enfants et yoga adapté. Vos médiathèques programment des ateliers, des expositions et des conférences, et j'ai vu passer une semaine du bien-être avec mandalas, art-thérapie et aromathérapie. Le yoga y aurait sa place.\n\nCe que je propose : un atelier d'une heure de yoga doux et de relaxation, pour 15 personnes, dans la salle d'animation d'une médiathèque, assis sur chaise ou au sol selon la place. Respiration, mouvements accessibles à tous les corps, relaxation guidée. Un atelier par médiathèque pendant la semaine du bien-être, ou un cycle de trois séances dans une seule.\n\nJe travaille en prestation facturée à la communauté de communes, sur devis, et l'atelier reste gratuit pour le public. Je suis assurée en responsabilité civile professionnelle, j'inscris l'atelier aux agendas gratuits. C'est le canal qui touche les familles de Gillonnay et des communes voisines.\n\nUne semaine du bien-être est-elle prévue cet automne ou en 2027 ? Un appel de dix minutes avec la personne chargée de l'action culturelle me suffirait, je suis joignable en semaine.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "grandangle",
    "cat": "culture",
    "nom": "Le Grand Angle",
    "lieu": "Voiron",
    "km": 35,
    "prio": 3,
    "gest": "Pays Voironnais",
    "contact": "billetterie.grandangle@paysvoironnais.com · 04 76 65 64 64",
    "deja": "Une cinquantaine de spectacles par an, ateliers gratuits de danse, cirque, chant adossés aux spectacles",
    "format": "Atelier « yoga et danse » gratuit adossé à un spectacle de danse de la saison, payé par le théâtre",
    "prix": "Prestation au théâtre",
    "saison": "Octobre à mai",
    "src": "https://www.le-grand-angle.fr/",
    "destinataire": {
      "nom": "Le Grand Angle (Pays Voironnais), via la billetterie pour transmission à l'action culturelle",
      "email": "billetterie.grandangle@paysvoironnais.com",
      "canal": "email"
    },
    "projet": {
      "titre": "Yoga et danse, atelier de saison",
      "concept": "Un atelier gratuit de yoga adossé à un spectacle de danse de la saison, pour les spectateurs qui veulent passer du fauteuil au plateau : respiration, ancrage, mouvement lent. Le Grand Angle propose déjà des ateliers gratuits de danse, de cirque et de chant liés aux spectacles ; le yoga s'y glisse comme une préparation du corps et du regard.",
      "format": "1 h 15, 20 personnes, sur le plateau ou dans une salle de répétition, le week-end d'un spectacle de danse ; accessible sans pratique préalable. Chacun apporte son tapis. Octobre à mai, un ou deux ateliers par saison.",
      "deroule": "Accueil et respiration (10 min) · Ancrage et mouvements lents inspirés du spectacle (40 min) · Temps de son ou de chant à voix basse (10 min) · Relaxation (15 min)",
      "prix": "Prestation facturée au théâtre, atelier gratuit pour le public ; pour un atelier de 1 h 15 avec 20 participants, un forfait sur devis.",
      "gain_lieu": "Une entrée par le corps vers un spectacle de danse, un atelier de plus dans un dispositif déjà en place, un public bien-être qui découvre la salle ; photos remises.",
      "demande": "Un échange de dix minutes avec la personne chargée de l'action culturelle pour repérer un spectacle de danse de la saison en cours ou de la suivante auquel adosser l'atelier.",
      "attention": "35 km : un atelier isolé doit être bien calé. Saison programmée longtemps à l'avance ; sol du plateau (bâches ou tapis de danse) ; ne pas empiéter sur les ateliers de danse existants. Seule l'adresse de la billetterie est publique."
    },
    "email": {
      "objet": "Un atelier yoga adossé à un spectacle de danse",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay. Vos ateliers gratuits de danse, de cirque et de chant adossés aux spectacles m'ont donné envie de vous écrire : le yoga peut s'y glisser comme une préparation du corps et du regard avant un spectacle de danse.\n\nCe que je propose : un atelier « yoga et danse » d'une heure et quart, pour 20 personnes, sur le plateau ou dans une salle de répétition, le week-end d'un spectacle de danse de la saison. Respiration, ancrage, mouvements lents inspirés de la pièce, relaxation. Accessible sans pratique préalable. Chacun apporte son tapis.\n\nJe travaille en prestation facturée au théâtre, sur devis, et l'atelier reste gratuit pour le public. Je suis assurée en responsabilité civile professionnelle. Le théâtre y gagne une entrée par le corps vers la danse et un public bien-être qui découvre la salle.\n\nJe vous écris à l'adresse de la billetterie : pourriez-vous transmettre à la personne chargée de l'action culturelle ? Dix minutes au téléphone pour repérer un spectacle de la saison me suffiraient, je suis joignable en semaine.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "festivalberlioz",
    "cat": "evenement",
    "nom": "Festival Berlioz",
    "lieu": "La Côte-Saint-André",
    "km": 3,
    "prio": 1,
    "gest": "AIDA (EPCC Arts en Isère Dauphiné Alpes)",
    "contact": "contact@aida38.fr · 04 74 20 31 37",
    "deja": "28 023 spectateurs en 2025, 44 événements dont 25 en entrée libre ; rendez-vous gratuits sous la Halle ; édition 2026 du 19 au 30 août (passée), 2027 non publié",
    "format": "Proposer dès l'hiver à AIDA et au musée un « réveil yoga en musique » dans le jardin du musée avant les concerts gratuits, chaque matin de festival",
    "prix": "Gratuit pour le public, prestation à AIDA ; ou 15 €",
    "saison": "Fin août 2027",
    "src": "https://www.festivalberlioz.com/retour-sur-ledition-2025-a-la-vie-a-la-mort/",
    "destinataire": {
      "nom": "Festival Berlioz, AIDA (EPCC Arts en Isère Dauphiné Alpes)",
      "email": "contact@aida38.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Réveil yoga en musique au Festival",
      "concept": "Chaque matin de festival, 45 minutes de yoga doux dans le jardin du musée Hector-Berlioz, avant les concerts gratuits de midi, pour les festivaliers et les habitants. Le festival compte déjà 25 événements en entrée libre sur 44 et des rendez-vous gratuits sous la Halle : le réveil yoga s'ajoute aux rendez-vous gratuits, avec le musée sollicité en parallèle pour le jardin.",
      "format": "45 min, 20 personnes, jardin du musée, chaque matin de festival à 10 h. Chacun apporte son tapis ; bâches de sol, couvertures et tisane fournies. Fin août 2027, proposition faite dès l'hiver.",
      "deroule": "Accueil (5 min) · Respiration (10 min) · Mouvements doux (20 min) · Relaxation, en silence ou sur une musique enregistrée (10 min)",
      "prix": "Gratuit pour le public et prestation facturée à AIDA (forfait par matinée, sur devis) ; ou places à 15 € vendues en ligne par Maude, soit 150 € à 10 participants par matin, avec un reversement à convenir.",
      "gain_lieu": "Un rendez-vous gratuit de plus, chaque matin, dans une programmation qui en compte déjà beaucoup ; un public qui arrive tôt sur le site et reste pour le concert de midi ; photos remises pour la communication du festival.",
      "demande": "Une réponse de principe avant fin février 2027, puis un rendez-vous à trois avec le musée pour caler le jardin et les horaires.",
      "attention": "Programmation 2027 non publiée ; coordination entre le musée (Département) et AIDA (EPCC) ; pluie, bruit des balances ; ne pas retarder les concerts de midi."
    },
    "email": {
      "objet": "Réveil yoga en musique au Festival 2027",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay. Le Festival Berlioz compte 25 événements en entrée libre sur 44, et des rendez-vous gratuits sous la Halle : je voudrais y ajouter un rendez-vous du matin.\n\n« Réveil yoga en musique » : chaque matin de festival, 45 minutes de yoga doux dans le jardin du musée Hector-Berlioz, à 10 h, avant les concerts gratuits de midi, pour 20 personnes. Respiration, mouvements accessibles à tous les corps, relaxation. Chacun apporte son tapis, j'apporte bâches de sol, couvertures et tisane, et je suis assurée en responsabilité civile professionnelle hors salle.\n\nDeux formules, à votre main : gratuit pour le public, en prestation facturée à AIDA avec un forfait par matinée ; ou des places à 15 € vendues en ligne par moi, avec un reversement à convenir. Le festival y gagne un public qui arrive tôt et reste pour le concert de midi.\n\nPourrions-nous en parler avant fin février, le temps de caler le jardin et les horaires à trois avec le musée ? Je suis joignable en semaine.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "beaucroissant",
    "cat": "evenement",
    "nom": "Foire de Beaucroissant",
    "lieu": "Beaucroissant",
    "km": 20,
    "prio": 2,
    "gest": "Service Foire, mairie de Beaucroissant",
    "contact": "foire@beaucroissant.fr · 04 76 65 34 97",
    "deja": "Environ 1 000 exposants, « 100 000 visiteurs par jour attendus » ; foire d'automne 11 au 13 septembre 2026 (passée), foire de printemps 25 et 26 avril 2026 (passée) ; pré-inscription exposant en ligne",
    "format": "Stand + mini-séances debout « yoga du fermier » (dos, épaules) à la foire de printemps 2027 ; QR vers la page de Maude",
    "prix": "Stand (tarif exposant à demander)",
    "saison": "Avril et septembre 2027",
    "src": "https://www.foirebeaucroissant.fr/2-foire-septembre.html",
    "destinataire": {
      "nom": "Service Foire, mairie de Beaucroissant",
      "email": "foire@beaucroissant.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Yoga du fermier à la Foire",
      "concept": "Un stand à la foire de printemps 2027 avec des mini-séances debout de cinq à dix minutes pour le dos et les épaules, ouvertes à qui passe, en bottes ou en baskets. Pour les visiteurs et les exposants qui piétinent toute la journée. Avec un millier d'exposants, la foire est le lieu où l'on croise le plus de monde en deux jours.",
      "format": "Stand exposant (surface minimale), mini-séances debout de 5 à 10 min toutes les demi-heures, sans tapis ni tenue particulière, 10 personnes à la fois ; un QR vers la page de Maude et une feuille pour laisser son email. Foire de printemps 2027 (dates à confirmer par le service), puis foire d'automne si concluant.",
      "deroule": "Accroche au stand (2 min) · Mini-séance debout dos et épaules (8 min) · Respiration en trois temps (2 min) · Prise de contact et QR (2 min), répété toute la journée",
      "prix": "Stand au tarif exposant de la foire (à demander au service) ; mini-séances gratuites pour le public, recrutement pour les cours de Gillonnay. Pour deux jours, le coût du stand est l'investissement, sans recette sur place.",
      "gain_lieu": "Une animation gratuite et inhabituelle dans les allées, qui fait du bien aux visiteurs comme aux exposants voisins, sans concurrence avec les autres stands.",
      "demande": "Le tarif exposant, la marche à suivre pour la pré-inscription en ligne à la foire de printemps 2027, et l'existence d'un emplacement pensé pour les animations.",
      "attention": "Coût du stand à mesurer avant de s'engager ; deux jours debout ; bruit et foule ; aucune recette directe, tout se joue sur les contacts pris."
    },
    "email": {
      "objet": "Un stand yoga du fermier à la foire de printemps",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à vingt kilomètres de Beaucroissant. Avec un millier d'exposants et des visiteurs qui marchent toute la journée dans les allées, la foire est l'endroit où l'on croise le plus de monde en deux jours.\n\nCe que je propose pour la foire de printemps 2027 : un petit stand d'exposant avec, toutes les demi-heures, une mini-séance debout de cinq à dix minutes, « yoga du fermier », pour le dos et les épaules. Sans tapis ni tenue particulière, en bottes ou en baskets, dix personnes à la fois. Je suis assurée en responsabilité civile professionnelle hors salle.\n\nLes mini-séances sont gratuites pour le public ; je paie le stand au tarif exposant, sans rien vendre sur place, et je laisse un QR vers ma page. La foire y gagne une animation inhabituelle dans les allées, sans concurrence avec les autres stands.\n\nPourriez-vous m'indiquer le tarif exposant, la marche à suivre pour la pré-inscription en ligne, et s'il existe un emplacement pensé pour les animations ? Je suis joignable en semaine.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "forumcsa",
    "cat": "evenement",
    "nom": "Forum des associations",
    "lieu": "La Côte-Saint-André (Halle médiévale)",
    "km": 3,
    "prio": 2,
    "gest": "Mairie ; inscriptions via le centre social Les Sources",
    "contact": "animations@lacotesaintandre.fr · 04 74 20 57 10",
    "deja": "Édition 2026 le 6 septembre (passée) ; un stand demande en général une association",
    "format": "Séance découverte sous la Halle le matin du forum 2027, là où les annuels se signent",
    "prix": "Gratuit (recrutement)",
    "saison": "Septembre 2027",
    "src": "https://www.lacotesaintandre.fr/agenda-format-liste/forum-des-associations-2/",
    "destinataire": {
      "nom": "Mairie de La Côte-Saint-André, service animations (inscriptions via le centre social Les Sources)",
      "email": "animations@lacotesaintandre.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Séance découverte au Forum",
      "concept": "Une séance découverte de yoga doux sous la Halle, le matin du forum des associations 2027, au moment où les Côtois choisissent leurs activités de l'année. Maude n'est pas une association mais une professionnelle installée à Gillonnay : elle propose une démonstration ouverte plutôt qu'un stand.",
      "format": "30 min, 20 personnes, sous la Halle, en tenue de ville, debout ou sur tapis ; une ou deux séances dans la matinée. Septembre 2027.",
      "deroule": "Accueil (3 min) · Respiration et mouvements doux debout (15 min) · Relaxation courte (7 min) · Questions et carte des cours (5 min)",
      "prix": "Gratuit pour le public et pour la mairie ; recrutement pour les cours de la saison. Aucune recette le jour même.",
      "gain_lieu": "Une animation vivante qui fait bouger le public du forum entre deux stands et montre une activité bien-être de proximité ; aucun coût pour la commune.",
      "demande": "Savoir si une professionnelle non associative peut proposer une démonstration au forum 2027, et à qui s'adresser (mairie ou centre social Les Sources), avant juin 2027.",
      "attention": "Le forum est d'abord réservé aux associations : la demande peut être refusée. Si une association de yoga expose déjà, proposer la démonstration en complément, jamais en concurrence ; bruit sous la Halle."
    },
    "email": {
      "objet": "Une démonstration de yoga au forum 2027",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, diplômée YTT 500 h, certifiée yoga adapté et yoga enfants. Le forum des associations sous la Halle est le moment où les Côtois choisissent leurs activités de l'année, et je voudrais y proposer une séance découverte.\n\nJe sais qu'un stand demande en général une association. Je suis une professionnelle installée en entreprise individuelle, et je vous propose autre chose qu'un stand : une démonstration ouverte de 30 minutes sous la Halle, une ou deux fois dans la matinée, pour 20 personnes en tenue de ville, debout ou sur tapis. Respiration, mouvements doux accessibles à tous les corps, relaxation courte. Je suis assurée en responsabilité civile professionnelle.\n\nC'est gratuit pour le public et sans coût pour la commune. Le forum y gagne une animation qui fait bouger les visiteurs entre deux stands.\n\nUne professionnelle non associative peut-elle proposer une démonstration au forum 2027, et à qui dois-je m'adresser, à la mairie ou au centre social Les Sources ? Un appel de dix minutes me suffirait, je suis joignable en semaine.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "forumbourgoin",
    "cat": "evenement",
    "nom": "Forum des associations de Bourgoin-Jallieu",
    "lieu": "Bourgoin-Jallieu (parc des Lilattes)",
    "km": 30,
    "prio": 3,
    "gest": "Ville, service Vie associative",
    "contact": "04 74 28 29 30",
    "deja": "135 associations, démonstrations gratuites programmées ; « on se retrouve en 2027 »",
    "format": "Créneau de démonstration plutôt qu'un stand",
    "prix": "Gratuit (recrutement)",
    "saison": "Septembre 2027",
    "src": "https://www.bourgoinjallieu.fr/loisirs/les-incontournables/forum-des-associations",
    "destinataire": {
      "nom": "Ville de Bourgoin-Jallieu, service Vie associative",
      "email": null,
      "canal": "telephone · 04 74 28 29 30 (aucune adresse publique : appeler pour obtenir le contact du service, puis envoyer l'email)"
    },
    "projet": {
      "titre": "Démonstration yoga au parc des Lilattes",
      "concept": "Un créneau de démonstration de yoga doux au forum des associations de Bourgoin-Jallieu 2027, dans le programme de démonstrations gratuites déjà prévu, plutôt qu'un stand. Pour les habitants qui cherchent une activité de rentrée, y compris ceux qui pensent que le yoga n'est pas pour eux.",
      "format": "20 à 30 min sur l'espace démonstration du parc des Lilattes, 20 à 30 personnes, en tenue de ville, debout ou sur tapis. Septembre 2027.",
      "deroule": "Présentation (3 min) · Respiration et mouvements doux debout (15 min) · Relaxation courte (5 min) · Questions (5 min)",
      "prix": "Gratuit (visibilité) ; aucun coût pour la ville ; recrutement pour les cours individuels et les interventions en entreprise autour de Bourgoin.",
      "gain_lieu": "Une démonstration accessible à tous les corps dans un programme qui en compte déjà, sans stand à installer ni coût pour la ville.",
      "demande": "Savoir si un créneau de démonstration est ouvert à une professionnelle non associative en 2027, et la date limite d'inscription.",
      "attention": "Forum pensé pour 135 associations : une professionnelle peut être refusée. 30 km de Gillonnay ; contact uniquement par téléphone, pas d'email public."
    },
    "email": {
      "objet": "Un créneau de démonstration yoga au forum 2027",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, diplômée YTT 500 h, certifiée yoga adapté et yoga enfants. Votre forum des associations réunit 135 associations au parc des Lilattes avec des démonstrations gratuites au programme, et c'est dans ce programme que je souhaite proposer un créneau.\n\nJe ne demande pas de stand : une démonstration de 20 à 30 minutes sur l'espace prévu, pour 20 à 30 personnes en tenue de ville, debout ou sur tapis. Respiration, mouvements doux accessibles à tous les corps, relaxation courte. Je suis assurée en responsabilité civile professionnelle hors salle.\n\nC'est gratuit pour le public et sans coût pour la ville. Le forum y gagne une démonstration accessible à tous, y compris aux personnes qui pensent que le yoga n'est pas pour elles. Je suis une professionnelle en entreprise individuelle, pas une association, je le dis d'emblée.\n\nUn créneau de démonstration est-il ouvert à une professionnelle pour l'édition 2027, et quelle est la date limite d'inscription ? Un appel de dix minutes me suffirait, je suis joignable en semaine.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "fetenoix",
    "cat": "evenement",
    "nom": "Fête du Saint-Marcellin et de la Noix de Grenoble",
    "lieu": "Saint-Marcellin / Vinay (alternance)",
    "km": 35,
    "prio": 3,
    "gest": "Saint-Marcellin Vercors Isère Communauté",
    "contact": "contact@saintmarcellinvercorsisere.com · 04 76 38 45 48",
    "deja": "Marché de producteurs, mini-ferme, parcours sensoriel ; 14 juin 2026 (passée), gratuit",
    "format": "« Pause yoga » sur la pelouse ou stand dans le village en juin 2027",
    "prix": "Gratuit (visibilité)",
    "saison": "Juin 2027",
    "src": "https://tourism.saintmarcellin-vercors-isere.com/nos-inspirations/fete-saint-marcellin-noix-grenoble/",
    "destinataire": {
      "nom": "Saint-Marcellin Vercors Isère Communauté, organisation de la Fête du Saint-Marcellin et de la Noix de Grenoble",
      "email": "contact@saintmarcellinvercorsisere.com",
      "canal": "email"
    },
    "projet": {
      "titre": "Pause yoga à la fête de la noix",
      "concept": "Une pause yoga de 30 minutes sur la pelouse, deux ou trois fois dans la journée, à la Fête du Saint-Marcellin et de la Noix de Grenoble 2027, entre le marché de producteurs, la mini-ferme et le parcours sensoriel. Pour les familles qui passent la journée sur place et ont besoin de souffler.",
      "format": "30 min, 20 personnes, sur une pelouse du site, parents et enfants ensemble (certification yoga enfants), sur tapis apporté ou dans l'herbe ; deux ou trois créneaux gratuits dans la journée. Juin 2027.",
      "deroule": "Accueil sur la pelouse (5 min) · Respiration en famille (5 min) · Mouvements doux et jeux de postures pour les enfants (15 min) · Relaxation courte (5 min)",
      "prix": "Gratuit pour le public, prestation non facturée (visibilité) ; ou, si la communauté préfère porter l'animation, un forfait journée sur devis. Aucune recette sur place.",
      "gain_lieu": "Une animation corporelle et familiale qui complète le parcours sensoriel et la mini-ferme, sans coût, avec une intervenante certifiée yoga enfants ; photos remises.",
      "demande": "Un créneau ou un coin de pelouse dans le programme 2027, et le nom de la personne qui coordonne les animations.",
      "attention": "Site en alternance Saint-Marcellin / Vinay : repérage à faire une fois le lieu 2027 connu. Chaleur de juin, ombre à prévoir ; bruit de la fête pendant la relaxation."
    },
    "email": {
      "objet": "Une pause yoga en famille à la fête de la noix",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, certifiée yoga enfants. Votre fête réunit un marché de producteurs, une mini-ferme et un parcours sensoriel, pour des familles qui passent la journée sur place : je voudrais leur proposer un moment pour souffler.\n\n« Pause yoga » : 30 minutes sur une pelouse du site, deux ou trois fois dans la journée, pour 20 personnes, parents et enfants ensemble. Respiration en famille, mouvements doux, jeux de postures pour les plus jeunes, relaxation courte. Tapis apporté ou herbe, j'apporte bâches de sol et couvertures, et je suis assurée en responsabilité civile professionnelle hors salle.\n\nC'est gratuit pour le public et je ne facture rien pour l'édition 2027, l'animation me sert de vitrine ; si vous préférez la porter, je peux vous adresser un devis pour la journée. La fête y gagne une animation corporelle et familiale qui complète le parcours sensoriel.\n\nAuriez-vous un créneau ou un coin de pelouse dans le programme 2027, et le nom de la personne qui coordonne les animations ? Je suis joignable en semaine.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "medievale",
    "cat": "evenement",
    "nom": "La Médiévale de Saint-Antoine-l'Abbaye",
    "lieu": "Saint-Antoine-l'Abbaye",
    "km": 30,
    "prio": 3,
    "gest": "Professionnels avec le musée et les Amis des Antonins",
    "contact": "tourism@saintmarcellin-vercors-isere.fr · 04 76 385 385",
    "deja": "1er et 2 août 2026 (passée), midi à minuit, 18 € adulte, quatre parcours thématiques dont « patrimoine et immersion »",
    "format": "Séance « corps et souffle au jardin médiéval » dans le parcours immersion 2027",
    "prix": "Prestation aux organisateurs",
    "saison": "Août 2027",
    "src": "https://tourism.saintmarcellin-vercors-isere.com/nos-inspirations/fete-medievale-saint-antoine-labbaye/",
    "destinataire": {
      "nom": "La Médiévale de Saint-Antoine-l'Abbaye, via l'office de tourisme Saint-Marcellin Vercors Isère",
      "email": "tourism@saintmarcellin-vercors-isere.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Corps et souffle au jardin médiéval",
      "concept": "Une séance « corps et souffle » dans le jardin médiéval, intégrée au parcours « patrimoine et immersion » de la Médiévale 2027, pour les visiteurs qui passent la journée dans l'abbaye. Un temps lent au milieu d'une fête qui va de midi à minuit.",
      "format": "45 min, 15 personnes par créneau, deux ou trois créneaux par jour sur les deux jours, dans le jardin médiéval, en tenue de fête ou de ville, sur tapis apporté ou couvertures fournies ; on reste sur les allées et les zones désignées. Août 2027.",
      "deroule": "Accueil et marche lente dans le jardin (10 min) · Respiration (10 min) · Mouvements doux debout et au sol (20 min) · Relaxation (5 min)",
      "prix": "Prestation facturée aux organisateurs (forfait par journée, sur devis), séance comprise dans le billet de la Médiévale ; pas de vente séparée.",
      "gain_lieu": "Un contenu de plus dans le parcours immersion, calme et accessible, qui donne une raison de s'arrêter au jardin ; une intervenante à 30 km, assurée hors salle ; photos remises.",
      "demande": "Un échange avec la personne qui coordonne les parcours de la Médiévale 2027, et un repérage du jardin au printemps.",
      "attention": "Organisation à plusieurs têtes (professionnels, musée, Amis des Antonins) : identifier le bon interlocuteur. Chaleur d'août ; jardin partagé avec la fête ; jauge et respect des plantations."
    },
    "email": {
      "objet": "Corps et souffle au jardin, Médiévale 2027",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay. La Médiévale propose quatre parcours thématiques, dont « patrimoine et immersion », de midi à minuit : je voudrais y ajouter un temps lent, au jardin médiéval.\n\n« Corps et souffle au jardin médiéval » : une séance de 45 minutes pour 15 personnes, deux ou trois créneaux par jour sur les deux jours, dans le jardin. Marche lente, respiration, mouvements doux accessibles à tous les corps, en tenue de fête ou de ville, sur tapis apporté ou sur les couvertures que je fournis. On reste sur les allées et les zones que vous désignez. Je suis assurée en responsabilité civile professionnelle hors salle.\n\nJe travaille en prestation facturée aux organisateurs, avec un forfait par journée sur devis, et la séance est comprise dans le billet de la Médiévale. Le parcours immersion y gagne une raison de s'arrêter au jardin.\n\nPourriez-vous me mettre en lien avec la personne qui coordonne les parcours de l'édition 2027 ? Un repérage du jardin au printemps me suffirait, je suis disponible en semaine.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "rdvjardins",
    "cat": "evenement",
    "nom": "Rendez-vous aux jardins et Journée internationale du yoga",
    "lieu": "Saint-Antoine-l'Abbaye, Vizille, Isère",
    "km": 30,
    "prio": 2,
    "gest": "Ministère de la Culture (national) ; Union des Enseignants de Yoga de l'Isère pour le 21 juin",
    "contact": "yoga.isere@gmail.com",
    "deja": "Rendez-vous aux jardins du 5 au 7 juin 2026 ; le jardin médiéval de Saint-Antoine y participe ; l'UEYI fédère les animations du 21 juin",
    "format": "Candidater à Saint-Antoine pour les Rendez-vous aux jardins 2027 ; adhérer à l'UEYI pour le 21 juin ; et organiser sa propre séance gratuite du 21 juin à Gillonnay avec la mairie",
    "prix": "Gratuit (visibilité)",
    "saison": "Juin 2027",
    "src": "https://www.yoga-isere.com/",
    "destinataire": {
      "nom": "Union des Enseignants de Yoga de l'Isère (UEYI)",
      "email": "yoga.isere@gmail.com",
      "canal": "email"
    },
    "projet": {
      "titre": "Yoga du 21 juin à Gillonnay",
      "concept": "Une séance gratuite de yoga doux à Gillonnay pour la Journée internationale du yoga 2027, inscrite dans les animations que l'Union des Enseignants de Yoga de l'Isère fédère, et en parallèle une candidature au jardin médiéval de Saint-Antoine-l'Abbaye pour les Rendez-vous aux jardins. Pour les habitants de la plaine de la Bièvre, curieux ou pratiquants.",
      "format": "1 h, jauge ouverte en plein air (parc ou espace communal, avec la mairie de Gillonnay), gratuit, chacun apporte son tapis ; bâches et couvertures fournies. Le 21 juin 2027 ou le week-end le plus proche. Adhésion à l'UEYI pour figurer dans le programme départemental.",
      "deroule": "Accueil (10 min) · Respiration (10 min) · Mouvements doux pour tous les corps (30 min) · Relaxation (10 min)",
      "prix": "Gratuit pour le public (visibilité) ; cotisation d'adhésion à l'UEYI à leur tarif ; aucune recette le jour même.",
      "gain_lieu": "Pour l'UEYI, une animation de plus dans un secteur de l'Isère (la plaine de la Bièvre) et une enseignante certifiée qui rejoint le réseau ; pour la mairie, une animation gratuite le jour de la Journée internationale du yoga.",
      "demande": "Les conditions d'adhésion à l'UEYI et la marche à suivre pour inscrire une séance dans le programme du 21 juin 2027 ; en parallèle, une demande de lieu à la mairie de Gillonnay.",
      "attention": "Deux démarches distinctes (UEYI et mairie). Météo de juin. Le 21 juin 2027 tombe un lundi : prévoir la date la plus proche en accord avec le programme de l'UEYI."
    },
    "email": {
      "objet": "Adhésion à l'UEYI et séance du 21 juin 2027",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, dans la plaine de la Bièvre, où j'enseigne pour la troisième saison à l'Espace Montgontier. Je suis diplômée YTT 500 h, certifiée yoga adapté et yoga enfants. L'Union fédère les animations du 21 juin en Isère, et je souhaite rejoindre le réseau.\n\nPour la Journée internationale du yoga 2027, je prépare une séance gratuite d'une heure en plein air à Gillonnay, avec la mairie : respiration, mouvements doux accessibles à tous les corps, relaxation. Chacun apporte son tapis, j'apporte bâches et couvertures, et je suis assurée en responsabilité civile professionnelle hors salle. En parallèle, je candidate au jardin médiéval de Saint-Antoine-l'Abbaye pour les Rendez-vous aux jardins.\n\nJ'aimerais que cette séance figure dans le programme départemental du 21 juin, aux côtés des autres animations, et compter parmi vos adhérentes.\n\nPourriez-vous m'indiquer les conditions d'adhésion et la marche à suivre pour inscrire une animation ? Je suis joignable en semaine, un appel de dix minutes suffit.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "patrimoine",
    "cat": "evenement",
    "nom": "Journées européennes du patrimoine",
    "lieu": "Bressieux, Pupetières, Grand Séchoir, Chartreuse",
    "km": 10,
    "prio": 3,
    "gest": "Chaque lieu",
    "contact": "Voir les fiches des lieux",
    "deja": "19 et 20 septembre 2026 (ce week-end) ; tous les lieux de cette page y participent",
    "format": "Pour 2027, proposer dès le printemps à un des lieux une séance « patrimoine en mouvement »",
    "prix": "Gratuit (visibilité)",
    "saison": "Septembre 2027",
    "src": "https://www.chateau-bressieux.com/ev%C3%A8nements/",
    "destinataire": {
      "nom": "Château de Bressieux",
      "email": null,
      "canal": "formulaire · site chateau-bressieux.com (aucune adresse publique dans la fiche)"
    },
    "projet": {
      "titre": "Patrimoine en mouvement à Bressieux",
      "concept": "Une séance de yoga doux dans l'enceinte du château pendant les Journées européennes du patrimoine 2027 : marcher, respirer et se poser dans les pierres, pour les visiteurs des Journées, tous âges et tous corps. Le château participe déjà aux Journées ; la séance donne une autre façon de le visiter, par le corps.",
      "format": "45 min, 20 personnes, dans la cour ou sur une zone plane du site à repérer ensemble, un ou deux créneaux le samedi ou le dimanche des Journées, gratuit. Chacun apporte son tapis ; bâches de sol et couvertures fournies. Septembre 2027, proposé dès le printemps.",
      "deroule": "Accueil et marche lente dans le site (10 min) · Respiration face au paysage (10 min) · Mouvements doux debout et au sol (20 min) · Relaxation et silence (5 min)",
      "prix": "Gratuit pour le public et pour le château (visibilité) pendant les Journées ; si l'expérience plaît, un créneau payant hors Journées, places vendues par Maude avec un forfait reversé au château, à discuter.",
      "gain_lieu": "Une animation nouvelle pour les Journées, qui fait rester les visiteurs plus longtemps et touche un public bien-être ; photos remises au château pour sa communication.",
      "demande": "Un repérage du site au printemps 2027 et une réponse de principe avant juin, pour inscrire la séance au programme des Journées et aux agendas gratuits.",
      "attention": "Sol irrégulier et pierres : zone plane à choisir. Météo de septembre. Contact par le formulaire du site, sans email public ; ne pas gêner les visites des Journées."
    },
    "email": {
      "objet": "Patrimoine en mouvement, Journées 2027",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay. Le château ouvre pour les Journées européennes du patrimoine, et je voudrais vous proposer, pour l'édition 2027, une autre façon de le visiter : par le corps.\n\n« Patrimoine en mouvement » : une séance de 45 minutes pour 20 personnes, dans la cour ou sur une zone plane du site, un ou deux créneaux le samedi ou le dimanche des Journées. Respiration face au paysage, mouvements doux accessibles à tous les corps, relaxation. Chacun apporte son tapis, j'apporte bâches de sol et couvertures, et je suis assurée en responsabilité civile professionnelle hors salle.\n\nPendant les Journées, la séance est gratuite pour le public et je ne vous facture rien. Vous y gagnez une animation nouvelle et des visiteurs qui restent plus longtemps. Si l'expérience plaît, nous pourrons parler d'un créneau hors Journées, avec des places que je vends et un forfait reversé au château. Je monte en ce moment des séances dans la grotte de Sassenage.\n\nAuriez-vous un moment au printemps 2027 pour un repérage du site ? Je suis disponible en semaine.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "bievreisere",
    "cat": "pro",
    "nom": "Bièvre Isère Communauté",
    "lieu": "Saint-Étienne-de-Saint-Geoirs",
    "km": 10,
    "prio": 1,
    "gest": "Collectivité, 50 communes, 250 à 499 agents",
    "contact": "contact@bievre-isere.com · 04 76 93 51 46 · Sport Santé 06 33 31 14 32",
    "deja": "Service Sport Santé sur prescription médicale (adultes, seniors, ALD, éducateurs diplômés), accueils de loisirs, médiathèques, piscine Aqualib'",
    "format": "Deux portes : (1) atelier QVT pour les agents (pro.maude-yoga.com) ; (2) yoga adapté dans le programme Sport Santé, payé par la collectivité",
    "prix": "Séance découverte 180 € ; Sport Santé sur devis",
    "saison": "Toute l'année",
    "src": "https://www.bievre-isere.com/les-services/sport-loisirs/sport-sante/",
    "destinataire": {
      "nom": "Bièvre Isère Communauté, service Sport Santé",
      "email": "contact@bievre-isere.com",
      "canal": "email"
    },
    "projet": {
      "titre": "Yoga adapté et atelier dos",
      "concept": "Deux portes chez la collectivité : un cycle de yoga adapté (sur chaise, mobilité réduite) proposé au service Sport Santé sur prescription, en complément du travail de ses éducateurs, et un atelier « dos et souffle » pour les agents. Pourquoi eux : ils accompagnent déjà adultes, seniors et personnes en ALD, et ils emploient 250 à 499 agents.",
      "format": "Séances de 45 min à 1 h, 12 personnes au plus, dans une salle de la communauté ou de la piscine Aqualib'. Sport Santé : cycle de 8 à 10 séances hebdomadaires. Agents : atelier sur la pause déjeuner ou en fin de journée, en cycle de 6 ou ponctuel. Toute l'année.",
      "deroule": "Accueil et respiration assise (10 min) · mobilisation douce des épaules, du dos et des hanches (20 min) · équilibre assis ou debout en appui (10 min) · temps calme allongé ou assis (10 min)",
      "prix": "Séance découverte 180 € (grille de pro.maude-yoga.com), programme de 4 séances sur 2 mois de 1 400 à 1 600 € ; en Sport Santé, prestation à la collectivité sur devis.",
      "gain_lieu": "Une offre de yoga adapté dans un programme Sport Santé qui n'en a pas, avec une intervenante certifiée pour ce public, et un geste de qualité de vie au travail pour les agents sans rien à organiser.",
      "demande": "Dix minutes au téléphone avec le service Sport Santé (06 33 31 14 32) pour savoir si le yoga adapté peut entrer dans le programme et à qui adresser l'atelier agents.",
      "attention": "Le service Sport Santé fonctionne sur prescription médicale avec des éducateurs diplômés : Maude se présente en complément, à leur main, sans se substituer. Cadre administratif d'une collectivité de 50 communes (devis, bon de commande, délais)."
    },
    "email": {
      "objet": "Yoga adapté et atelier dos pour vos agents",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay depuis trois saisons. Votre service Sport Santé sur prescription médicale, avec ses éducateurs diplômés, m'a donné envie de vous écrire : je suis certifiée en yoga adapté, sur chaise et pour la mobilité réduite, et c'est exactement le public que vous accompagnez.\n\nJe vous propose deux choses, à votre main. Un cycle de yoga adapté dans le programme Sport Santé, en complément du travail de vos éducateurs : séances de 45 minutes à une heure, douze personnes au plus, chacun sur sa chaise ou son tapis. Et un atelier « dos et souffle » de 45 minutes pour vos agents, sur la pause déjeuner ou en fin de journée, dans une salle de la communauté.\n\nDans les deux cas, la collectivité paie la prestation : 180 € la séance découverte. Je suis assurée en responsabilité civile professionnelle et j'apporte le matériel de sol.\n\nEst-ce que dix minutes au téléphone avec le service Sport Santé vous conviendraient ? Je suis joignable les matins de semaine.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · pro.maude-yoga.com"
    }
  },
  {
    "id": "ehpadcsa",
    "cat": "pro",
    "nom": "EHPAD de La Côte-Saint-André (L'Eden et Le Grand Cèdre)",
    "lieu": "La Côte-Saint-André",
    "km": 3,
    "prio": 1,
    "gest": "Établissement public autonome, 180 résidents, 100 à 199 salariés",
    "contact": "rqualite@ehpadlabarre.fr · 04 74 20 55 11",
    "deja": "Animations quotidiennes annoncées, unité protégée",
    "format": "Cycle de yoga adapté sur chaise pour les résidents (10 séances de 45 min), et une séance pour le personnel : Maude est certifiée yoga adapté, presque personne ne l'est dans le secteur",
    "prix": "70 à 90 € la séance",
    "saison": "Toute l'année",
    "src": "https://www.ehpad-cotesaintandre.fr/contact",
    "destinataire": {
      "nom": "EHPAD de La Côte-Saint-André (L'Eden et Le Grand Cèdre), service qualité",
      "email": "rqualite@ehpadlabarre.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Yoga sur chaise à La Côte",
      "concept": "Un cycle de yoga adapté sur chaise pour les résidents, en petit groupe, dans la salle d'animation, plus une séance pour le personnel. Pourquoi eux : 180 résidents, des animations quotidiennes déjà annoncées, une unité protégée, et l'établissement est à 3 km de Gillonnay.",
      "format": "Cycle de 10 séances de 45 min, une par semaine, 8 à 10 résidents par groupe, un membre de l'équipe présent. Chacun reste sur sa chaise. Séance découverte offerte pour commencer. Une séance de 45 min pour le personnel possible sur le même principe. Toute l'année.",
      "deroule": "Accueil et respiration (5 min) · mobilisation des épaules, des mains et des hanches (15 min) · équilibre assis et appuis (10 min) · respiration lente et temps calme, parfois un son à voix basse (10 min) · échange avec l'équipe (5 min)",
      "prix": "Première séance offerte, puis 70 à 90 € la séance facturée à l'établissement selon la durée et le nombre de groupes, soit 700 à 900 € le cycle de 10.",
      "gain_lieu": "Une animation corporelle régulière conduite par une intervenante certifiée en yoga adapté, rare dans le secteur, qui s'inscrit dans le planning d'animations existant sans matériel à acheter.",
      "demande": "Trente minutes sur place avec la personne qui coordonne les animations, pour voir la salle et fixer la date de la séance offerte ; une réponse avant fin octobre pour démarrer en novembre.",
      "attention": "L'unité protégée demande l'accord et la présence de l'équipe soignante ; le cycle se cale sur le planning d'animations existant pour ne pas doubler une activité. Facturation à un établissement public (devis, délai de paiement)."
    },
    "email": {
      "objet": "Yoga sur chaise pour vos résidents, séance offerte",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à trois kilomètres de chez vous. Je suis certifiée en yoga adapté, sur chaise et pour la mobilité réduite, et vous annoncez des animations quotidiennes pour vos résidents : c'est pour cela que je vous écris.\n\nJe vous propose un cycle de dix séances de 45 minutes de yoga sur chaise, pour un groupe de huit à dix résidents, avec un membre de votre équipe présent. Respiration, mobilité des épaules et des hanches, équilibre assis, un temps calme pour finir. Rien d'ésotérique, chacun fait ce qu'il peut ce jour-là. Une séance pour le personnel est possible sur le même principe.\n\nLa première séance est offerte. Ensuite, la séance est facturée 70 à 90 € à l'établissement selon la durée, soit 700 à 900 € le cycle. Je suis assurée en responsabilité civile professionnelle.\n\nPuis-je passer trente minutes sur place, avec la personne qui coordonne les animations, pour voir la salle et fixer la date de la séance offerte ? Je suis disponible en semaine, en fin de matinée.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "caravelle",
    "cat": "pro",
    "nom": "Résidence La Caravelle (Fondation Partage et Vie)",
    "lieu": "Saint-Étienne-de-Saint-Geoirs",
    "km": 10,
    "prio": 2,
    "gest": "Fondation Partage et Vie ; ouverte en 2022, unité Alzheimer, PASA",
    "contact": "direction.residence-lacaravelle@fondationpartageetvie.org · 04 76 65 40 50",
    "deja": "Pôle d'activités et de soins adaptés",
    "format": "Yoga adapté en PASA, cycle de 8 à 10 séances",
    "prix": "70 à 90 € la séance",
    "saison": "Toute l'année",
    "src": "https://www.fondationpartageetvie.org/fpv/la-caravelle-fpv_7629",
    "destinataire": {
      "nom": "Résidence La Caravelle (Fondation Partage et Vie), direction",
      "email": "direction.residence-lacaravelle@fondationpartageetvie.org",
      "canal": "email"
    },
    "projet": {
      "titre": "Yoga sur chaise au PASA",
      "concept": "Un cycle de yoga adapté sur chaise pour un petit groupe de résidents du pôle d'activités et de soins adaptés, en présence d'un membre de l'équipe. Pourquoi eux : la résidence est ouverte depuis 2022 avec un PASA et une unité Alzheimer, et le PASA est précisément le cadre où le yoga sur chaise a sa place.",
      "format": "Cycle de 8 à 10 séances de 45 min, une par semaine, 6 à 8 résidents du PASA, dans l'espace du pôle. Chacun reste sur sa chaise, même déroulé d'une semaine sur l'autre. Séance découverte offerte. Toute l'année.",
      "deroule": "Accueil et respiration (5 min) · mobilisation douce des articulations (15 min) · équilibre assis (10 min) · temps calme, parfois un son chanté à voix basse (10 min) · retour avec l'équipe (5 min)",
      "prix": "Première séance offerte, puis 70 à 90 € la séance facturée à la résidence selon la durée, soit 560 à 900 € pour un cycle de 8 à 10.",
      "gain_lieu": "Une activité corporelle régulière et cadrée pour le PASA, conduite par une intervenante certifiée en yoga adapté, qui vient compléter le programme du pôle sans rien à acheter.",
      "demande": "Une mise en relation avec la personne qui anime le PASA, dix minutes d'échange et une visite du lieu ; une réponse avant fin octobre.",
      "attention": "Public fragile : présence obligatoire d'un membre de l'équipe et validation du cycle par la direction ; certains résidents ne suivront qu'une partie de la séance, c'est normal et prévu. Facturation à une fondation (devis, circuit de validation)."
    },
    "email": {
      "objet": "Yoga sur chaise pour le PASA, séance offerte",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, certifiée en yoga adapté, sur chaise et pour la mobilité réduite. Votre résidence est ouverte depuis 2022 avec un pôle d'activités et de soins adaptés, et c'est précisément dans un PASA que le yoga sur chaise trouve sa place.\n\nJe vous propose un cycle de huit à dix séances de 45 minutes, pour un petit groupe de résidents du PASA, en présence d'un membre de votre équipe. Respiration, mobilisation douce des articulations, équilibre assis, un temps calme pour finir, parfois un son chanté à voix basse. Chacun reste sur sa chaise et je m'adapte à ce que le groupe peut faire ce jour-là.\n\nLa première séance est offerte. Ensuite, chaque séance est facturée 70 à 90 € à la résidence selon la durée, soit 560 à 900 € pour le cycle. Je suis assurée en responsabilité civile professionnelle.\n\nPourriez-vous me mettre en relation avec la personne qui anime le PASA, pour un échange de dix minutes et une visite du lieu ? Je suis disponible en semaine, le matin.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "chrives",
    "cat": "pro",
    "nom": "Centre hospitalier de Rives et EHPAD du Grand-Lemps",
    "lieu": "Rives / Le Grand-Lemps",
    "km": 15,
    "prio": 2,
    "gest": "Hôpital public gérant 3 EHPAD, 100 à 199 salariés",
    "contact": "DirectionRives@ch-rives.fr · 04 76 35 71 71",
    "deja": "EHPAD du Grand-Lemps : plus de 100 places, unité Alzheimer, PASA",
    "format": "Yoga adapté pour les résidents et atelier « souffle et dos » pour les soignants",
    "prix": "70 à 90 € la séance",
    "saison": "Toute l'année",
    "src": "https://chrives.fr/",
    "destinataire": {
      "nom": "Centre hospitalier de Rives, direction (EHPAD du Grand-Lemps)",
      "email": "DirectionRives@ch-rives.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Yoga adapté et souffle des soignants",
      "concept": "Deux volets pour l'EHPAD du Grand-Lemps : un cycle de yoga sur chaise pour les résidents et un atelier « souffle et dos » pour les soignants. Pourquoi eux : plus de 100 places, une unité Alzheimer, un PASA, et des équipes qui portent au quotidien.",
      "format": "Résidents : cycle de 10 séances de 45 min, une par semaine, 8 à 10 résidents, un soignant présent, séance découverte offerte. Soignants : atelier de 45 min sur une pause ou entre deux postes, 8 à 12 personnes, en cycle de 6 ou ponctuel. Toute l'année.",
      "deroule": "Résidents : respiration assise (5 min) · mobilisation douce (15 min) · équilibre assis (10 min) · temps calme (10 min) · retour équipe (5 min). Soignants : respiration (10 min) · étirements du dos et des épaules (25 min) · récupération allongée (10 min)",
      "prix": "Première séance résidents offerte, puis 70 à 90 € la séance facturée à l'établissement selon la durée, pour les résidents comme pour le personnel ; un cycle de 10 séances résidents revient à 700 à 900 €.",
      "gain_lieu": "Une animation corporelle régulière pour les résidents par une intervenante certifiée, et un geste concret de prévention pour des soignants dont le dos est le premier outil de travail.",
      "demande": "Dix minutes au téléphone pour savoir à qui adresser la proposition (direction des soins ou animation) et une date pour la séance offerte ; réponse souhaitée avant fin octobre.",
      "attention": "Circuit de décision hospitalier (direction, cadre de santé, animation) qui peut être long ; le PASA et l'unité Alzheimer exigent la présence d'un soignant ; les horaires postés des équipes imposent de caler l'atelier sur un changement de poste."
    },
    "email": {
      "objet": "Yoga sur chaise et souffle pour vos équipes",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à un quart d'heure de Rives. L'EHPAD du Grand-Lemps, avec ses plus de cent places, son unité Alzheimer et son PASA, accueille des résidents pour qui un yoga adapté, sur chaise, a du sens, et je suis certifiée pour cela.\n\nDeux propositions, que vous pouvez prendre séparément. Pour les résidents, un cycle de dix séances de 45 minutes de yoga sur chaise, en petit groupe, avec un soignant présent. Pour vos équipes, un atelier « souffle et dos » de 45 minutes, sur une pause ou entre deux postes : respiration, étirements du dos et des épaules, un vrai temps de récupération pour des métiers qui portent.\n\nLa première séance résidents est offerte. Ensuite, la séance est facturée 70 à 90 € à l'établissement selon la durée, pour les résidents comme pour le personnel. Je suis assurée en responsabilité civile professionnelle.\n\nAuriez-vous dix minutes au téléphone pour me dire à qui adresser cela, direction des soins ou animation ? Je suis joignable en semaine, le matin.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "roybonehpad",
    "cat": "pro",
    "nom": "EHPAD René Marion",
    "lieu": "Roybon",
    "km": 20,
    "prio": 3,
    "gest": "Public autonome, 132 chambres, salles de kiné et psychomotricité",
    "contact": "clientele@ehpad-royon.fr · 04 76 36 31 00",
    "deja": "Unité Alzheimer, salles dédiées",
    "format": "Yoga adapté en salle de psychomotricité",
    "prix": "70 à 90 € la séance",
    "saison": "Toute l'année",
    "src": "https://www.pour-les-personnes-agees.gouv.fr/annuaire-ehpad-et-maisons-de-retraite/ehpad/isere-38/roybon-38940/ehpad-rene-marion/380794610",
    "destinataire": {
      "nom": "EHPAD René Marion, Roybon",
      "email": "clientele@ehpad-royon.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Yoga sur chaise en psychomotricité",
      "concept": "Un cycle de yoga adapté sur chaise pour les résidents, dans la salle de psychomotricité. Pourquoi eux : 132 chambres, des salles de kinésithérapie et de psychomotricité dédiées, une unité Alzheimer, et une salle équipée est le meilleur endroit pour ce travail.",
      "format": "Cycle de 10 séances de 45 min, une par semaine, 8 à 10 résidents, en salle de psychomotricité, un membre de l'équipe présent. Séance découverte offerte. Toute l'année.",
      "deroule": "Accueil et respiration (5 min) · mobilité des épaules et des hanches (15 min) · équilibre assis, appuis sur la chaise (10 min) · temps calme (10 min) · échange avec l'équipe (5 min)",
      "prix": "Première séance offerte, puis 70 à 90 € la séance facturée à l'établissement selon la durée, soit 700 à 900 € le cycle de 10.",
      "gain_lieu": "Une utilisation supplémentaire des salles dédiées, une activité corporelle régulière pour les résidents, conduite par une intervenante certifiée en yoga adapté.",
      "demande": "Une demi-heure sur place avec la personne qui coordonne les animations, pour voir la salle de psychomotricité et fixer la date de la séance offerte ; réponse souhaitée avant fin octobre.",
      "attention": "Roybon est à 20 km : grouper les séances sur une demi-journée si un second groupe existe. La salle de psychomotricité est partagée avec les rééducateurs, le créneau se négocie avec eux. Établissement public : devis et bon de commande."
    },
    "email": {
      "objet": "Yoga sur chaise pour vos résidents, séance offerte",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay. Votre établissement dispose de salles de kinésithérapie et de psychomotricité, et c'est dans une salle comme celles-là que le yoga sur chaise se déroule le mieux. Je suis certifiée en yoga adapté, sur chaise et pour la mobilité réduite.\n\nJe vous propose un cycle de dix séances de 45 minutes, en salle de psychomotricité, pour un groupe de huit à dix résidents, avec un membre de votre équipe présent. Respiration, mobilité des épaules et des hanches, équilibre assis, un temps calme pour finir. Rien d'ésotérique, chacun fait ce qu'il peut ce jour-là.\n\nLa première séance est offerte. Ensuite, elle est facturée 70 à 90 € à l'établissement selon la durée, soit 700 à 900 € pour le cycle. Je suis assurée en responsabilité civile professionnelle et je viens avec bâches de sol et couvertures.\n\nPuis-je venir une demi-heure, avec la personne qui coordonne les animations, pour voir la salle et fixer la date de la séance offerte ? Je suis disponible en semaine, en fin de matinée.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "beaurepaire",
    "cat": "pro",
    "nom": "EHPAD Le Dauphin Bleu l'Escale",
    "lieu": "Beaurepaire",
    "km": 20,
    "prio": 3,
    "gest": "Centre hospitalier intercommunal Luzy-Dufeillant, 95 chambres, accueil de jour",
    "contact": "direction@ch-beaurepaire.fr · 04 74 79 11 11",
    "deja": "Accueil de jour, unité Alzheimer",
    "format": "Yoga adapté à l'accueil de jour",
    "prix": "70 à 90 € la séance",
    "saison": "Toute l'année",
    "src": "https://www.pour-les-personnes-agees.gouv.fr/annuaire-ehpad-et-maisons-de-retraite/ehpad/isere-38/beaurepaire-38270/ehpad-le-dauphin-bleu-lescale/380804005",
    "destinataire": {
      "nom": "EHPAD Le Dauphin Bleu l'Escale, direction",
      "email": "direction@ch-beaurepaire.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Yoga doux à l'accueil de jour",
      "concept": "Un cycle de yoga adapté sur chaise pour les personnes de l'accueil de jour, avec une professionnelle de l'équipe présente. Pourquoi eux : un accueil de jour, une unité Alzheimer, 95 chambres ; les personnes accueillies en journée ont besoin d'un temps calme et corporel dans leur programme.",
      "format": "Cycle de 10 séances de 45 min, une par semaine, le jour de plus forte fréquentation de l'accueil de jour, 6 à 10 personnes, sur chaise, même déroulé chaque semaine. Séance découverte offerte. Toute l'année.",
      "deroule": "Accueil et respiration (5 min) · mobilisation douce des bras, du dos et des jambes (15 min) · équilibre assis (10 min) · temps calme avec un son à voix basse (10 min) · retour avec l'équipe (5 min)",
      "prix": "Première séance offerte, puis 70 à 90 € la séance facturée à l'établissement selon la durée, soit 700 à 900 € le cycle de 10.",
      "gain_lieu": "Une activité structurée et répétée pour l'accueil de jour, rassurante par sa régularité, conduite par une intervenante certifiée en yoga adapté.",
      "demande": "Dix minutes au téléphone pour savoir qui coordonne l'accueil de jour et quel jour de la semaine convient, puis une date pour la séance offerte ; réponse souhaitée avant fin octobre.",
      "attention": "Public avec troubles cognitifs : présence d'une professionnelle indispensable, séances courtes et identiques d'une semaine sur l'autre. Beaurepaire est à 20 km. Établissement rattaché à un centre hospitalier : circuit de validation."
    },
    "email": {
      "objet": "Yoga sur chaise pour votre accueil de jour",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, certifiée en yoga adapté, sur chaise et pour la mobilité réduite. Votre accueil de jour reçoit des personnes qui rentrent chez elles le soir, et c'est un temps de yoga doux dans leur journée que je vous propose.\n\nUn cycle de dix séances de 45 minutes, sur chaise, pour le groupe de l'accueil de jour, avec une professionnelle de votre équipe présente. Respiration, mobilisation douce, équilibre assis, un temps calme pour finir, et le même déroulé d'une semaine sur l'autre, parce que la répétition rassure.\n\nLa première séance est offerte, pour que votre équipe et les personnes accueillies se fassent leur avis. Ensuite, chaque séance est facturée 70 à 90 € à l'établissement selon la durée, soit 700 à 900 € pour le cycle. Je suis assurée en responsabilité civile professionnelle.\n\nAuriez-vous dix minutes au téléphone pour me dire qui coordonne l'accueil de jour et quel jour de la semaine conviendrait ? Je suis joignable en semaine, le matin.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "pierreblanche",
    "cat": "pro",
    "nom": "Résidence autonomie Pierre Blanche (CCAS de Voiron)",
    "lieu": "Voiron",
    "km": 35,
    "prio": 3,
    "gest": "CCAS de Voiron, plus de 100 places",
    "contact": "l.martinasso@ville-voiron.fr · 04 76 67 27 60",
    "deja": "Activités collectives mentionnées",
    "format": "Yoga adapté hebdomadaire, résidents autonomes",
    "prix": "70 à 90 € la séance",
    "saison": "Toute l'année",
    "src": "https://www.pour-les-personnes-agees.gouv.fr/annuaire-ehpad-et-maisons-de-retraite/residence-autonomie/isere-38/voiron-38500/residence-autonomie-pierre-blanche/380786699",
    "destinataire": {
      "nom": "Résidence autonomie Pierre Blanche (CCAS de Voiron)",
      "email": "l.martinasso@ville-voiron.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Yoga sur chaise à Pierre Blanche",
      "concept": "Une séance hebdomadaire de yoga adapté pour des résidents autonomes, dans la salle commune. Pourquoi eux : une résidence autonomie de plus de 100 places qui propose déjà des activités collectives, avec un public debout et mobile pour qui la chaise est un appui, pas une limite.",
      "format": "Séance de 45 min, le même jour à la même heure chaque semaine, 10 à 12 résidents, salle commune. Chacun sur sa chaise, avec des passages debout en appui. Séance découverte offerte, puis cycles de 10 renouvelables. Toute l'année.",
      "deroule": "Accueil et respiration (5 min) · mobilité des épaules et des hanches (15 min) · équilibre debout en appui sur la chaise (10 min) · étirements doux (5 min) · temps calme (10 min)",
      "prix": "Première séance offerte, puis 70 à 90 € la séance facturée au CCAS selon la durée, par cycle de 10 (700 à 900 €), renouvelable.",
      "gain_lieu": "Un rendez-vous hebdomadaire fixe qui vient enrichir les activités collectives, avec une intervenante certifiée en yoga adapté, sans matériel à acheter.",
      "demande": "Une demi-heure sur place pour voir la salle et fixer le créneau de la séance offerte ; réponse souhaitée avant fin octobre.",
      "attention": "Voiron est à 35 km : un créneau hebdomadaire n'a de sens que s'il tient sur la saison, ou groupé avec une autre intervention à Voiron. CCAS : devis, délibération possible, délai de paiement."
    },
    "email": {
      "objet": "Yoga sur chaise chaque semaine, séance offerte",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, certifiée en yoga adapté, sur chaise et pour la mobilité réduite. Votre résidence autonomie propose des activités collectives à des résidents qui restent autonomes, et c'est exactement le public pour lequel j'ai construit mon cours de yoga sur chaise.\n\nJe vous propose une séance hebdomadaire de 45 minutes, le même jour à la même heure, pour un groupe de dix à douze résidents, dans votre salle commune. Respiration, mobilité des épaules et des hanches, équilibre assis puis debout en appui sur la chaise, un temps calme pour finir. Chacun vient comme il est.\n\nLa première séance est offerte. Ensuite, la séance est facturée 70 à 90 € au CCAS selon la durée, par cycle de dix, soit 700 à 900 €, renouvelable. Je suis assurée en responsabilité civile professionnelle.\n\nPuis-je passer une demi-heure sur place pour voir la salle et fixer le créneau de la séance offerte ? Je suis disponible en semaine, le matin, et je viens volontiers jusqu'à Voiron.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "elydan",
    "cat": "pro",
    "nom": "Elydan (Grenoble Air Parc)",
    "lieu": "Saint-Étienne-de-Saint-Geoirs",
    "km": 10,
    "prio": 2,
    "gest": "Plasturgie, 100 à 199 salariés",
    "contact": "04 76 93 43 43 · formulaire elydan.eu",
    "deja": "Site industriel de l'Air Parc (50 entreprises, 800 emplois sur la zone)",
    "format": "Atelier « dos et souffle » de 45 min sur la pause déjeuner, en cycle de 6 ; premier employeur privé à 10 km",
    "prix": "Séance découverte 180 € ; programme 4 séances 1 400 à 1 600 €",
    "saison": "Toute l'année",
    "src": "https://elydan.eu/",
    "destinataire": {
      "nom": "Elydan, service RH",
      "email": null,
      "canal": "formulaire https://elydan.eu/formulaire-de-contact (téléphone 04 76 93 43 43)"
    },
    "projet": {
      "titre": "Dos et souffle à la pause",
      "concept": "Un atelier « dos et souffle » de 45 min sur la pause déjeuner, en cycle de six, pour les salariés d'Elydan. Pourquoi eux : un site de plasturgie de 100 à 199 salariés sur l'Air Parc, le premier employeur privé à 10 km de Gillonnay, dans une zone de 50 entreprises.",
      "format": "45 min, 10 à 15 salariés, dans une salle de réunion, sur la pause déjeuner. Cycle de 6 séances, une par semaine ; séance ponctuelle possible pour tester. Chacun en tenue souple, bâches de sol et couvertures fournies. Toute l'année.",
      "deroule": "Respiration pour redescendre (8 min) · étirements du dos et des épaules (20 min) · gestes à refaire au poste (7 min) · temps calme (10 min)",
      "prix": "Séance découverte 180 € facturée à l'entreprise (grille de pro.maude-yoga.com) ; programme de 4 séances sur 2 mois de 1 400 à 1 600 € ; interventions de 2 h à une journée de 350 à 2 200 €.",
      "gain_lieu": "Un geste de qualité de vie au travail concret et court, sur un sujet qui touche tout le monde, le dos, sans rien à organiser ; une intervenante locale, à dix minutes du site.",
      "demande": "Dix minutes au téléphone pour savoir à qui adresser la proposition (ressources humaines ou CSE) et fixer une séance test.",
      "attention": "Pas d'adresse email publique : passer par le formulaire du site ou l'accueil téléphonique, la proposition peut se perdre. Horaires de production à respecter, la pause déjeuner est courte."
    },
    "email": {
      "objet": "Yoga sur site à dix kilomètres de chez vous",
      "corps": "Bonjour,\n\nProfesseure de yoga à Gillonnay, à dix kilomètres de l'Air Parc, j'interviens sur le lieu de travail avec du yoga et de la respiration. Je vous écris parce qu'Elydan fait tourner des lignes d'extrusion en équipes, avec des bureaux à côté.\n\nJe propose une séance découverte sur site, de 45 minutes à 1 heure, en fin de poste ou à la pause déjeuner, pour 6 à 20 personnes, à 180 euros, adaptée aux deux publics : dos et récupération pour les lignes, écrans et pression pour les bureaux. Si l'équipe accroche, un programme de 4 séances sur 2 mois prend le relais. Un réfectoire suffit, j'apporte le matériel.\n\nVos salariés repartent avec des gestes simples à refaire à leur poste.\n\nSi ce n'est pas vous, merci de transmettre à la personne en charge de la QVT ou du CSE. Quinze minutes au téléphone, en semaine après 13 h, suffisent pour caler une date.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · pro.maude-yoga.com"
    }
  },
  {
    "id": "allimand",
    "cat": "pro",
    "nom": "Allimand",
    "lieu": "Rives",
    "km": 18,
    "prio": 3,
    "gest": "Machines à papier, fondée en 1850, 100 à 199 salariés",
    "contact": "contact@allimand.com · 04 76 91 25 00",
    "deja": "Industrie",
    "format": "Atelier gestion du stress pour les équipes, via le CSE",
    "prix": "Séance découverte 180 € ; programme 4 séances 1 400 à 1 600 €",
    "saison": "Toute l'année",
    "src": "https://www.allimand.com/",
    "destinataire": {
      "nom": "Allimand, service RH ou direction",
      "email": "contact@allimand.com",
      "canal": "email"
    },
    "projet": {
      "titre": "Gestion du stress avec le CSE",
      "concept": "Un atelier de gestion du stress pour les équipes, porté par le CSE. Pourquoi eux : un fabricant de machines à papier fondé en 1850 à Rives, 100 à 199 salariés, des postes exigeants où le dos et la pression comptent.",
      "format": "45 min à 1 h, 10 à 15 personnes, salle de réunion, sur la pause déjeuner ou en fin de journée. Cycle de 6 séances ou rendez-vous ponctuel, au choix du CSE. Tenue souple, bâches de sol et couvertures fournies. Toute l'année.",
      "deroule": "Respiration lente (10 min) · étirements du dos et de la nuque (20 min) · outils courts à réutiliser au poste (10 min) · temps calme (10 min)",
      "prix": "Séance découverte 180 € facturée à l'entreprise (grille de pro.maude-yoga.com) ; programme de 4 séances sur 2 mois de 1 400 à 1 600 € ; interventions de 2 h à une journée de 350 à 2 200 €.",
      "gain_lieu": "Une action de prévention simple pour le CSE, locale, sans matériel, sur un sujet que les salariés demandent : le stress et le dos.",
      "demande": "Que le message soit transmis au CSE, puis dix minutes au téléphone avec la personne qui y porte les actions bien-être.",
      "attention": "L'adresse est générique : le message doit franchir l'accueil pour atteindre le CSE. Horaires d'atelier industriel à respecter ; Rives est à 18 km."
    },
    "email": {
      "objet": "Yoga sur site pour les équipes d'Allimand",
      "corps": "Bonjour,\n\nProfesseure de yoga à Gillonnay, à moins de trente minutes de Rives, j'interviens sur le lieu de travail avec du yoga et de la respiration. Je vous écris parce qu'Allimand réunit des ateliers de montage et des bureaux d'études sous le même toit.\n\nJe propose une séance découverte sur site, de 45 minutes à 1 heure, à la pause déjeuner ou en fin de poste, pour 6 à 20 personnes, à 180 euros, adaptée aux deux publics : dos et récupération pour le montage, écrans et pression pour les bureaux d'études. Si l'équipe accroche, un programme de 4 séances sur 2 mois prend le relais.\n\nVos salariés repartent avec des gestes simples à refaire à leur poste.\n\nSi ce n'est pas vous, merci de transmettre à la personne en charge de la QVT ou du CSE. Quinze minutes au téléphone, en semaine après 13 h, suffisent pour caler une date.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · pro.maude-yoga.com"
    }
  },
  {
    "id": "alr",
    "cat": "pro",
    "nom": "Aciéries et Laminoirs de Rives",
    "lieu": "Rives",
    "km": 18,
    "prio": 3,
    "gest": "Sidérurgie, groupe Experton-Revollier, 100 à 199 salariés",
    "contact": "04 76 91 42 44 · alr.fr",
    "deja": "Industrie",
    "format": "Atelier « souffle et récupération » pour les équipes postées",
    "prix": "Séance découverte 180 € ; programme 4 séances 1 400 à 1 600 €",
    "saison": "Toute l'année",
    "src": "https://industrie.usinenouvelle.com/fiche/etablissement/acieries-et-laminoirs-de-rives-46033984",
    "destinataire": {
      "nom": "Aciéries et Laminoirs de Rives, direction de site ou CSE",
      "email": null,
      "canal": "telephone 04 76 91 42 44"
    },
    "projet": {
      "titre": "Souffle et récupération en fin de poste",
      "concept": "Un atelier « souffle et récupération » pour les équipes postées, calé sur une fin de poste. Pourquoi eux : une aciérie de 100 à 199 salariés du groupe Experton-Revollier, où le corps est sollicité et où les horaires décalés compliquent la récupération.",
      "format": "45 min, 10 à 15 personnes, salle de réunion, en fin de poste ou sur une pause, aux heures des équipes. Cycle de 6 ou séance ponctuelle. Tenue de travail souple, bâches de sol et couvertures fournies. Toute l'année.",
      "deroule": "Respiration lente pour redescendre (10 min) · étirements du dos, des épaules et des jambes (20 min) · temps allongé de récupération (15 min)",
      "prix": "Séance découverte 180 € facturée à l'entreprise (grille de pro.maude-yoga.com) ; programme de 4 séances sur 2 mois de 1 400 à 1 600 € ; interventions de 2 h à une journée de 350 à 2 200 €.",
      "gain_lieu": "Une action de prévention ciblée sur la récupération des équipes postées, courte, sans matériel, par une intervenante à vingt minutes du site.",
      "demande": "Dix minutes au téléphone pour savoir qui, des ressources humaines ou du CSE, porte ce sujet, et sur quel créneau de poste caler une séance test.",
      "attention": "Pas d'email public : premier contact par téléphone, l'email suit. Le créneau doit coller au roulement des postes (matin, après-midi, nuit) ; environnement industriel, la salle doit être au calme."
    },
    "email": {
      "objet": "Yoga de récupération pour vos équipes postées",
      "corps": "Bonjour,\n\nProfesseure de yoga à Gillonnay, j'interviens sur le lieu de travail avec du yoga et de la respiration, notamment auprès d'une PME industrielle de la région grenobloise. Je vous écris parce qu'un laminoir, c'est la chaleur, le bruit et des équipes postées : la récupération et le souffle y comptent plus qu'ailleurs.\n\nJe propose une séance découverte sur site, de 45 minutes à 1 heure, en fin de poste ou à la pause déjeuner, pour 6 à 20 personnes, à 180 euros, centrée sur le dos, la récupération et une respiration qui aide à redescendre après le poste. Si l'équipe accroche, un programme de 4 séances sur 2 mois prend le relais.\n\nVos opérateurs repartent avec quelques gestes simples, à refaire au poste ou chez eux.\n\nQuinze minutes au téléphone, avec la direction ou le CSE, en semaine après 13 h, suffisent pour caler une date.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · pro.maude-yoga.com"
    }
  },
  {
    "id": "aeroport",
    "cat": "pro",
    "nom": "Aéroport Grenoble Alpes Isère",
    "lieu": "Saint-Étienne-de-Saint-Geoirs",
    "km": 10,
    "prio": 2,
    "gest": "Édeis depuis le 1er juillet 2026 (fin de VINCI Airports)",
    "contact": "04 76 65 48 48 · grenoble.aeroport.fr/fr/corporate",
    "deja": "Espaces modulables de 15 à 1 200 m² proposés aux entreprises",
    "format": "Un nouveau gestionnaire cherche à s'ancrer localement : atelier bien-être pour le personnel de l'hiver (saison charter), et une salle possible pour un atelier ouvert",
    "prix": "Séance découverte 180 € ; programme 4 séances 1 400 à 1 600 €",
    "saison": "Hiver",
    "src": "https://grenoble.aeroport.fr/fr/corporate",
    "destinataire": {
      "nom": "Aéroport Grenoble Alpes Isère, direction Édeis de l'aéroport",
      "email": null,
      "canal": "telephone 04 76 65 48 48 (grenoble.aeroport.fr/fr/corporate)"
    },
    "projet": {
      "titre": "Dos et souffle pour la saison d'hiver",
      "concept": "Un atelier « dos et souffle » pour le personnel de l'aéroport pendant la saison charter d'hiver, et, si une salle s'y prête, un atelier ouvert aux habitants et aux entreprises de la zone. Pourquoi eux : Édeis gère le site depuis le 1er juillet 2026 et a intérêt à s'ancrer localement ; des espaces modulables de 15 à 1 200 m² existent déjà.",
      "format": "Personnel : 45 min, 10 à 15 personnes, dans un espace modulable, cycle de 6 sur la saison d'hiver ou séance ponctuelle. Atelier ouvert : 1 h, 15 personnes, places vendues par Maude, le lieu accueille. Saison : hiver.",
      "deroule": "Respiration pour redescendre (8 min) · étirements du dos et des épaules (20 min) · gestes à refaire au poste (7 min) · temps calme (10 min)",
      "prix": "Séance découverte 180 € facturée à l'entreprise (grille de pro.maude-yoga.com) ; programme de 4 séances sur 2 mois de 1 400 à 1 600 € ; interventions de 2 h à une journée de 350 à 2 200 €.",
      "gain_lieu": "Un geste de qualité de vie au travail pour les équipes au moment où la charge est la plus forte, et une façon simple pour le nouveau gestionnaire de s'inscrire dans la vie locale.",
      "demande": "Dix minutes au téléphone avant le début de la saison d'hiver, pour savoir qui porte la qualité de vie au travail chez Édeis et si un espace peut accueillir un atelier ouvert.",
      "attention": "Reprise récente du site : l'organigramme peut bouger, le bon interlocuteur n'est pas connu. Contraintes d'accès et de sûreté d'une zone aéroportuaire pour un atelier ouvert au public. Saison courte."
    },
    "email": {
      "objet": "Yoga sur site pour l'équipe de l'aéroport",
      "corps": "Bonjour,\n\nProfesseure de yoga à Gillonnay, à dix kilomètres de l'aéroport, j'interviens sur le lieu de travail avec du yoga et de la respiration. Je m'adresse à la nouvelle direction Édeis, en place depuis le 1er juillet, parce que la saison d'hiver et ses charters vont demander beaucoup à votre personnel.\n\nJe propose une séance découverte sur site, de 45 minutes à 1 heure, à la pause déjeuner ou en fin de service, pour 6 à 20 personnes, à 180 euros, dans l'un de vos espaces modulables : une respiration qui fait redescendre la pression en pleine journée, et le dos après des heures debout ou sur écran. Si l'équipe accroche, un programme de 4 séances sur 2 mois prend le relais.\n\nVotre personnel aborde l'hiver avec quelques gestes simples, à refaire entre deux vols.\n\nQuinze minutes au téléphone, en semaine après 13 h, suffisent pour caler une date.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · pro.maude-yoga.com"
    }
  },
  {
    "id": "mjc",
    "cat": "pro",
    "nom": "MJC de La Côte-Saint-André",
    "lieu": "La Côte-Saint-André",
    "km": 3,
    "prio": 2,
    "gest": "Association (Espace des Alpes)",
    "contact": "contact@mjclacote.fr · 04 51 13 98 95",
    "deja": "Pilates, escalade, cirque, danse ; pas de yoga listé",
    "format": "Un créneau yoga hebdomadaire à la MJC : un public d'adhérents qui existe déjà, un créneau vide",
    "prix": "Rémunération d'intervenante",
    "saison": "Septembre à juin",
    "src": "https://www.mjclacote.fr/trouver-la-mjc/",
    "destinataire": {
      "nom": "MJC de La Côte-Saint-André",
      "email": "contact@mjclacote.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Un créneau yoga à la MJC",
      "concept": "Un cours de yoga hebdomadaire ouvert aux adhérents de la MJC, tous niveaux. Pourquoi eux : la MJC propose pilates, escalade, cirque et danse, mais aucun yoga, et elle a déjà un public d'adhérents et des salles.",
      "format": "1 h par semaine, en soirée ou le samedi matin selon les salles, 12 à 15 personnes, de septembre à juin. Chacun apporte son tapis, bâches de sol et couvertures fournies. Ouverture possible en cours d'année ou préparation pour la rentrée suivante.",
      "deroule": "Arrivée et respiration (10 min) · postures douces et enchaînements accessibles (35 min) · relaxation guidée, parfois un son à voix basse (15 min)",
      "prix": "Rémunération d'intervenante selon la grille de la MJC, de septembre à juin ; la MJC inscrit les adhérents et encaisse la cotisation.",
      "gain_lieu": "Une discipline demandée qui manque à la grille, une intervenante diplômée YTT 500 h à 3 km, un créneau vide qui se remplit avec des adhérents déjà là.",
      "demande": "Dix minutes au téléphone pour savoir si un créneau peut s'ouvrir en cours d'année ou se préparer pour septembre, et à quelle grille l'intervenante est rémunérée.",
      "attention": "La saison 2026-2027 est déjà lancée, un créneau peut ne s'ouvrir qu'en janvier ou à la rentrée suivante. Rémunération d'intervenante associative, souvent modeste ; vérifier le statut (facture ou salariat)."
    },
    "email": {
      "objet": "Ouvrir un créneau yoga à la MJC",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à trois kilomètres. Vous proposez pilates, escalade, cirque et danse, mais aucun créneau de yoga, et c'est celui-là que je vous propose d'ouvrir.\n\nUn cours hebdomadaire d'une heure, en soirée ou le samedi matin selon vos salles, ouvert à vos adhérents de tous niveaux. Ma ligne : venez comme vous êtes, un yoga accessible à tous les corps, jamais ésotérique. Postures douces, respiration, un temps calme pour finir. Chacun apporte son tapis, je viens avec bâches de sol et couvertures. Douze à quinze personnes par cours, c'est le bon format.\n\nVous inscrivez les adhérents et encaissez la cotisation, je suis rémunérée comme intervenante selon votre grille, de septembre à juin. Je suis diplômée YTT 500 heures, assurée en responsabilité civile professionnelle, avec trois saisons de cours collectifs à Gillonnay.\n\nLa saison est lancée, mais un créneau peut s'ouvrir en cours d'année ou se préparer pour septembre. Auriez-vous dix minutes au téléphone pour en parler ? Je suis joignable en semaine, le matin.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "lessources",
    "cat": "pro",
    "nom": "Centre social Les Sources",
    "lieu": "La Côte-Saint-André",
    "km": 3,
    "prio": 3,
    "gest": "Municipal",
    "contact": "centresocial.mairiecsa@wanadoo.fr · 04 74 20 57 10",
    "deja": "Programmes familles et seniors (non détaillés)",
    "format": "Cycle « bien vieillir » de yoga adapté pour les seniors du centre social",
    "prix": "Prestation à la collectivité",
    "saison": "Toute l'année",
    "src": "https://www.cestpossible.me/structure/centre-social-les-sources/",
    "destinataire": {
      "nom": "Centre social Les Sources, La Côte-Saint-André",
      "email": "centresocial.mairiecsa@wanadoo.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Bien vieillir avec le yoga sur chaise",
      "concept": "Un cycle « bien vieillir » de yoga adapté sur chaise pour les seniors du centre social. Pourquoi eux : un centre social municipal à 3 km, avec des programmes familles et seniors, et un public senior pour qui la chaise rend le yoga possible.",
      "format": "Cycle de 8 séances de 45 min, une par semaine, 10 à 12 personnes, dans une salle du centre social. Séance découverte offerte. Toute l'année, hors vacances scolaires si le centre ferme.",
      "deroule": "Accueil et respiration (5 min) · mobilité des épaules et des hanches (15 min) · équilibre assis puis debout en appui sur la chaise (10 min) · étirements doux (5 min) · temps calme (10 min)",
      "prix": "Première séance offerte, puis prestation facturée à la commune sur devis, selon la durée des séances et le nombre de participants ; pas de tarif public, le centre social décide de la participation demandée.",
      "gain_lieu": "Une action « bien vieillir » clé en main dans le programme seniors, par une intervenante certifiée en yoga adapté, sans matériel à acheter.",
      "demande": "Une demi-heure au centre social pour voir la salle et fixer la date de la séance offerte ; réponse souhaitée avant fin octobre.",
      "attention": "Structure municipale : devis, validation par la mairie, calendrier du programme seniors déjà arrêté pour l'année. Adresse email ancienne (wanadoo), vérifier qu'elle est relevée."
    },
    "email": {
      "objet": "Cycle bien vieillir en yoga sur chaise",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à trois kilomètres, certifiée en yoga adapté, sur chaise et pour la mobilité réduite. Vous menez des programmes pour les familles et les seniors, et c'est aux seniors que je pense.\n\nJe propose un cycle « bien vieillir » de huit séances de 45 minutes de yoga sur chaise, une par semaine, pour un groupe de dix à douze personnes dans une salle du centre social. Respiration, mobilité des épaules et des hanches, équilibre assis puis debout en appui sur la chaise, un temps calme pour finir. Aucune souplesse requise, chacun vient comme il est.\n\nLa première séance est offerte. Ensuite, le cycle est facturé à la commune sur devis, selon la durée des séances et le nombre de participants. Je suis assurée en responsabilité civile professionnelle et j'apporte bâches de sol et couvertures.\n\nPuis-je passer une demi-heure au centre social pour voir la salle et fixer la date de la séance offerte ? Je suis disponible en semaine, le matin.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "mairiegillonnay",
    "cat": "pro",
    "nom": "Mairie de Gillonnay",
    "lieu": "Gillonnay",
    "km": 0,
    "prio": 2,
    "gest": "Commune",
    "contact": "mairie@gillonnay.fr · 04 74 20 53 44",
    "deja": "Salle communale (à demander), agenda du village",
    "format": "La séance gratuite du 21 juin (Journée du yoga) et le « Yoga et soupe » de novembre : le village relaie, ça coûte zéro",
    "prix": "Gratuit le 21 juin ; 25 € l'atelier",
    "saison": "Novembre, juin",
    "src": "https://gillonnay.fr/fr/ct/1138464/contact-horaires",
    "destinataire": {
      "nom": "Mairie de Gillonnay",
      "email": "mairie@gillonnay.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Yoga et soupe au village",
      "concept": "Deux rendez-vous ouverts à tous les habitants de Gillonnay : un atelier « Yoga et soupe » un samedi de novembre dans la salle communale, et une séance gratuite en plein air le 21 juin pour la Journée du yoga. Pourquoi eux : c'est le village de Maude, la commune a une salle et un agenda, et cela ne lui coûte rien.",
      "format": "Novembre : 1 h de yoga doux puis une soupe partagée, fin de journée, 15 personnes, salle communale, chacun avec son tapis. 21 juin : 1 h en plein air sur un espace vert de la commune, tous âges, gratuit, sans inscription.",
      "deroule": "Novembre : accueil (10 min) · yoga doux pour tous les corps (60 min) · soupe chaude partagée (30 min). 21 juin : respiration et postures simples (45 min) · temps calme et son à voix basse (15 min)",
      "prix": "Atelier de novembre à 25 € par personne, vendu et encaissé par Maude, soit 250 € pour 10 participants ; salle prêtée par la commune. 21 juin gratuit.",
      "gain_lieu": "Deux animations pour les habitants sans dépense ni organisation pour la commune, relayées sur les agendas du territoire et dans la presse locale, photos remises à la mairie.",
      "demande": "Un samedi de novembre où la salle communale est libre, et le relais des deux rendez-vous dans l'agenda du village.",
      "attention": "Prêt de salle communale : convention et assurance à fournir, chauffage en novembre. Le 21 juin dépend de la météo, prévoir la salle en repli. Vérifier qu'aucune autre animation n'occupe le samedi choisi."
    },
    "email": {
      "objet": "Yoga et soupe en novembre à la salle communale",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga ici, à Gillonnay, à l'Espace Montgontier depuis trois saisons. Je vous écris pour deux rendez-vous ouverts à tous les habitants, qui ne coûtent rien à la commune.\n\nD'abord un atelier « Yoga et soupe » un samedi de novembre, en fin de journée : une heure de yoga doux, pour tous les corps, puis une soupe chaude partagée que j'apporte. Une quinzaine de personnes, chacun avec son tapis. La place est à 25 €, je vends les inscriptions en ligne et j'encaisse ; la commune prête la salle communale et relaie l'atelier dans l'agenda du village. Ensuite, le 21 juin, pour la Journée du yoga, une séance gratuite d'une heure en plein air, tous âges.\n\nJe suis assurée en responsabilité civile professionnelle, y compris en extérieur. J'inscris chaque rendez-vous aux agendas d'Isère Attractivité et de Terres de Berlioz, je préviens la presse locale et je remets les photos à la mairie.\n\nPourriez-vous me dire quel samedi de novembre la salle communale est libre ? Je passe en mairie quand cela vous arrange.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "terresberlioz",
    "cat": "pro",
    "nom": "Office de tourisme Terres de Berlioz",
    "lieu": "La Côte-Saint-André",
    "km": 3,
    "prio": 1,
    "gest": "Office intercommunal, service séminaires et événements",
    "contact": "04 74 20 61 43 · terres-de-berlioz.com",
    "deja": "Agenda du territoire, organisation de séminaires ; dans le Rhône voisin, l'office porte déjà des séances de yoga en extérieur à 8 €",
    "format": "Le relais de TOUS les événements de cette page. Et proposer une série « yoga en extérieur » portée par l'office (remplissage et communication par eux, prof payée par l'office)",
    "prix": "Prestation à l'office",
    "saison": "Toute l'année",
    "src": "https://terres-de-berlioz.com/",
    "destinataire": {
      "nom": "Office de tourisme Terres de Berlioz",
      "email": null,
      "canal": "telephone 04 74 20 61 43"
    },
    "projet": {
      "titre": "Yoga en extérieur avec l'office",
      "concept": "Deux volets : le relais systématique des événements de Maude dans l'agenda du territoire, et une série « yoga en extérieur » portée par l'office (lieux, tarif public, inscriptions et communication par eux, prof payée en prestation). Pourquoi eux : ils tiennent l'agenda du territoire et organisent des séminaires, et des offices voisins dans le Rhône portent déjà des séances de yoga en extérieur à 8 €.",
      "format": "Série de 4 à 6 séances d'1 h, de mai à septembre, dans des sites choisis par l'office, 20 personnes au plus, chacun avec son tapis, bâches et couvertures fournies. Relais des événements : toute l'année.",
      "deroule": "Accueil sur le site (10 min) · respiration et postures douces face au paysage (40 min) · temps calme et son à voix basse (10 min) · photos avec l'accord des participants (5 min)",
      "prix": "Prestation à l'office, sur devis selon le nombre de séances ; le tarif public de la série est fixé par l'office (les offices voisins pratiquent 8 €). Le relais des événements est gratuit.",
      "gain_lieu": "Une animation récurrente et photogénique dans la programmation estivale, qui fait vivre des sites du territoire, avec une intervenante locale qui apporte déjà ses propres événements à l'agenda.",
      "demande": "Dix minutes au téléphone ou un rendez-vous à l'office avant le bouclage de la programmation de printemps, pour valider le principe de la série et le circuit de relais des événements.",
      "attention": "Programmation arrêtée tôt (hiver pour l'été suivant). Sites extérieurs : météo, repli, autorisation d'occupation. Décision qui passe par l'intercommunalité."
    },
    "email": {
      "objet": "Une série yoga en extérieur portée par l'office",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay depuis trois saisons. Vous tenez l'agenda du territoire ; je monte en ce moment des séances de yoga hors les murs, dont une dans la grotte de Sassenage, et j'aimerais que la Bièvre en ait aussi.\n\nDeux propositions. La première ne vous coûte rien : je vous envoie chaque événement que j'organise sur le territoire, pour votre agenda et vos réseaux. La seconde est une série « yoga en extérieur » portée par l'office, comme cela se fait déjà dans le Rhône voisin : quatre à six séances d'une heure, de mai à septembre, dans des lieux que vous choisissez, tarif public fixé par vous, inscriptions et communication par vos soins.\n\nSur cette série, je suis payée par l'office en prestation, sur devis selon le nombre de séances. Je suis assurée en responsabilité civile professionnelle hors salle, j'apporte le matériel de sol et je vous remets les photos.\n\nAuriez-vous dix minutes au téléphone, ou un rendez-vous à l'office, avant de boucler la programmation du printemps ? Je suis disponible en semaine, le matin.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "chateaurocher",
    "cat": "hebergeur",
    "nom": "Château Rocher",
    "lieu": "Roybon (forêt de Chambaran)",
    "km": 20,
    "prio": 1,
    "gest": "Gîtes de groupe, contact Caroline",
    "contact": "info@gite-isere.com · 04 76 36 20 98",
    "deja": "37 lits en 4 gîtes + 24 en roulottes, salle de 180 m², salle de 80 m², jusqu'à 200 personnes ; séminaires, retraites, stages",
    "format": "Le week-end de yoga de Maude : 2 nuits, 10 à 12 personnes, pension, salle de 80 m², forêt pour la marche",
    "prix": "345 à 395 € (hébergement et pension 150 à 230 € + enseignement 165 €)",
    "saison": "Toute l'année",
    "src": "https://www.gite-isere.com/chateau-rocher",
    "destinataire": {
      "nom": "Château Rocher, Caroline",
      "email": "info@gite-isere.com",
      "canal": "email"
    },
    "projet": {
      "titre": "Week-end de yoga en Chambaran",
      "concept": "Le premier week-end de yoga de Maude : deux nuits en pension dans un gîte du domaine, deux pratiques par jour dans la salle de 80 m², une marche en forêt. Pourquoi eux : 37 lits en gîtes, des retraites et des stages déjà accueillis, une salle adaptée, et la forêt de Chambaran à la porte, à 20 min de Gillonnay.",
      "format": "Du vendredi soir au dimanche après-midi, 10 à 12 personnes, pension, un gîte réservé pour le groupe, salle de 80 m². Hors saison de préférence (novembre à mars). Chacun avec son tapis, bâches et couvertures fournies.",
      "deroule": "Vendredi : arrivée et pratique douce (1 h 15) · Samedi : pratique du matin (1 h 30), marche en forêt (2 h), pratique du soir et méditation (1 h 15) · Dimanche : pratique du matin (1 h 30), temps de chant à voix basse et clôture (45 min)",
      "prix": "345 à 395 € par personne, dont 165 € d'enseignement et 150 à 230 € d'hébergement et de pension reversés au gîte ; à 10 participants, 1 500 à 2 300 € pour le gîte et 1 650 € pour Maude.",
      "gain_lieu": "Un groupe de 10 à 12 personnes en pension sur un week-end hors saison, un séjour rempli et vendu par Maude, des photos remises au domaine.",
      "demande": "Les disponibilités hors saison (novembre à mars), le tarif de groupe en pension pour deux nuits et douze personnes, et les conditions de réservation de la salle de 80 m² ; un repérage sur place en semaine.",
      "attention": "Le gîte réservé doit correspondre à la taille du groupe (37 lits répartis en 4 gîtes). Chauffage de la salle en hiver, accès en forêt par temps de neige. Acompte demandé par le gîte alors que les places se vendent progressivement."
    },
    "email": {
      "objet": "Un week-end de yoga à Château Rocher",
      "corps": "Bonjour Caroline,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à vingt minutes de Roybon. Vous accueillez déjà des retraites et des stages, avec une salle de 80 m² et la forêt de Chambaran au pas de la porte : c'est le cadre que je cherche pour mon premier week-end de yoga.\n\nDu vendredi soir au dimanche après-midi, dix à douze personnes en pension. Deux pratiques par jour dans la salle de 80 m², une marche en forêt le samedi. Chacun vient avec son tapis, j'apporte le reste.\n\nJe vends les places en ligne, payées d'avance, jauge fermée, et je vous règle l'hébergement et la pension au tarif de groupe convenu. Le week-end est proposé entre 345 et 395 € par personne, dont 165 € d'enseignement ; le reste vous revient. Je suis assurée en responsabilité civile professionnelle et je vous remets les photos du séjour.\n\nPourriez-vous m'indiquer vos disponibilités hors saison, de novembre à mars, votre tarif de groupe en pension pour deux nuits et douze personnes, et les conditions d'usage de la salle ? Je viens volontiers repérer sur place, en semaine.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "collieres",
    "cat": "hebergeur",
    "nom": "Le Clos des Collières",
    "lieu": "Marcollin (pied des Chambaran)",
    "km": 15,
    "prio": 1,
    "gest": "Gîte de groupe 400 m², 15 couchages, parc 6 000 m², piscine",
    "contact": "formulaire leclosdescollieres.fr",
    "deja": "Annonce accueillir « séminaires, stages de méditation, yoga, arts martiaux, chant, danse »",
    "format": "Week-end de 12 personnes en autonomie (cuisine partagée), le format le moins cher à monter",
    "prix": "300 à 345 €",
    "saison": "Avril à octobre",
    "src": "https://leclosdescollieres.fr/notre-gite-de-groupe/",
    "destinataire": {
      "nom": "Le Clos des Collières",
      "email": null,
      "canal": "formulaire leclosdescollieres.fr"
    },
    "projet": {
      "titre": "Week-end de yoga en autonomie",
      "concept": "Un week-end de yoga de deux nuits, douze personnes en autonomie, cuisine partagée, dans le gîte de groupe. Pourquoi eux : ils annoncent accueillir stages de yoga, de méditation et de chant, avec 15 couchages, 400 m², un parc et une piscine, à 15 min de Gillonnay ; c'est le format le moins cher à monter.",
      "format": "Du vendredi soir au dimanche après-midi, 12 personnes, gîte entier, repas préparés ensemble, deux pratiques par jour dans la plus grande pièce, une marche au pied des Chambaran. Avril à octobre. Chacun avec son tapis, bâches et couvertures fournies.",
      "deroule": "Vendredi : arrivée, repas partagé, pratique douce (1 h) · Samedi : pratique du matin (1 h 30), marche (2 h), pratique du soir et méditation (1 h 15) · Dimanche : pratique du matin (1 h 30), chant à voix basse et clôture (45 min)",
      "prix": "300 à 345 € par personne, places vendues par Maude, location du gîte réglée au propriétaire pour le groupe ; à 12 participants, 3 600 à 4 140 € encaissés, dont la location.",
      "gain_lieu": "Le gîte entier loué un week-end complet à un groupe cadré, rempli et vendu par Maude, avec des photos remises pour le site.",
      "demande": "Un week-end libre en avril, mai, septembre ou octobre, le tarif du gîte pour deux nuits à douze, et la pièce qui permet de dérouler douze tapis ; une visite en semaine.",
      "attention": "Contact par formulaire seulement : relancer par téléphone si pas de réponse. Saison d'ouverture limitée à avril-octobre. Autonomie : la cuisine et le ménage reposent sur le groupe, à cadrer dans les inscriptions."
    },
    "email": {
      "objet": "Un week-end de yoga au Clos des Collières",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à un quart d'heure de Marcollin. Vous annoncez accueillir des stages de yoga, de méditation et de chant, avec quinze couchages, un parc et une piscine : c'est le format que je cherche pour un week-end de yoga en autonomie.\n\nDouze personnes, deux nuits, du vendredi soir au dimanche après-midi. Deux pratiques par jour dans la pièce la plus grande, une marche au pied des Chambaran le samedi, la cuisine partagée pour les repas. Chacun vient avec son tapis, j'apporte bâches de sol et couvertures.\n\nJe vends les places en ligne, payées d'avance, jauge fermée, et je vous règle la location du gîte pour le groupe. Le week-end est proposé entre 300 et 345 € par personne. Je suis assurée en responsabilité civile professionnelle et je vous remets les photos prises sur place, pour votre site.\n\nPourriez-vous m'indiquer un week-end libre en avril, mai, septembre ou octobre, votre tarif pour deux nuits à douze, et quelle pièce permet de dérouler douze tapis ? Je passe volontiers voir le gîte, en semaine.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "hautlieu",
    "cat": "hebergeur",
    "nom": "Le Haut-Lieu",
    "lieu": "Brion",
    "km": 15,
    "prio": 2,
    "gest": "Centre de ressourcement, 8 personnes max, serre de méditation, piscine, spa",
    "contact": "06 85 16 96 54 · lehautlieu.com",
    "deja": "Yoga, sophrologie, biodanza intégrés aux séjours ; « journées déconnectées » à 85 €",
    "format": "Intervenante yoga de leurs séjours, ou une « journée déconnectée » co-signée",
    "prix": "Prestation, ou 85 € la journée",
    "saison": "Toute l'année",
    "src": "https://www.lehautlieu.com/",
    "destinataire": {
      "nom": "Le Haut-Lieu, Brion",
      "email": null,
      "canal": "telephone 06 85 16 96 54"
    },
    "projet": {
      "titre": "Intervenante yoga au Haut-Lieu",
      "concept": "Rejoindre les intervenants des séjours du centre de ressourcement, ou co-signer une « journée déconnectée » où Maude assure les pratiques et la méditation. Pourquoi eux : yoga, sophrologie et biodanza sont déjà intégrés aux séjours, huit personnes au plus, une serre de méditation qui se prête au son à voix basse, à 15 min de Gillonnay.",
      "format": "Intervenante : séances d'1 h à 1 h 30 dans leurs séjours, sur demande, toute l'année. Journée déconnectée co-signée : 1 journée, 8 personnes, deux pratiques, une méditation dans la serre, un temps de son, au tarif de leurs journées.",
      "deroule": "Journée : accueil et respiration (30 min) · pratique du matin (1 h 30) · repas et temps libre, piscine ou spa (2 h) · méditation dans la serre avec son à voix basse (45 min) · pratique douce du soir (1 h)",
      "prix": "Prestation sur devis à la séance ou à la journée ; ou journée déconnectée à 85 € par personne, vendue par le lieu, Maude rémunérée en prestation ; à 8 participants, 680 € encaissés par le lieu.",
      "gain_lieu": "Une intervenante yoga locale, diplômée YTT 500 h et certifiée yoga adapté, disponible en semaine, et une journée de plus dans leur catalogue sans changer le format.",
      "demande": "Dix minutes au téléphone pour présenter la pratique et savoir ce qui manque aux séjours, puis une visite du lieu.",
      "attention": "Le lieu a déjà ses intervenants : entrer en complément, pas en remplacement. Jauge de 8 : une journée co-signée rapporte peu, c'est le lien qui compte. Pas d'email public, premier contact par téléphone."
    },
    "email": {
      "objet": "Rejoindre vos intervenants yoga au Haut-Lieu",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à un quart d'heure de Brion. Vous intégrez déjà yoga, sophrologie et biodanza à vos séjours, avec une serre de méditation et huit personnes au plus, et je vous écris pour rejoindre vos intervenants.\n\nMa pratique est douce et accessible à tous les corps : postures simples, respiration, méditation, un temps de chant ou de son à voix basse quand le lieu s'y prête, et votre serre s'y prête. Je suis diplômée YTT 500 heures et certifiée en yoga adapté.\n\nDeux façons de travailler ensemble. Comme intervenante de vos séjours, en prestation sur devis, à la séance ou à la journée. Ou une « journée déconnectée » co-signée, au tarif de vos journées, 85 € par personne, où j'assure les pratiques et la méditation ; vous vendez les places, je suis rémunérée en prestation. Je suis assurée en responsabilité civile professionnelle.\n\nAuriez-vous dix minutes au téléphone pour que je vous raconte ma pratique et que vous me disiez ce qui manque à vos séjours ? Je suis disponible en semaine, le matin.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "celeste",
    "cat": "hebergeur",
    "nom": "Céleste Maison d'Hôtes",
    "lieu": "Chasselay",
    "km": 30,
    "prio": 2,
    "gest": "Gino Ronco ; salles de 64 et 100 m²",
    "contact": "contact@labellecordiere.com · 06 38 30 05 88",
    "deja": "Retraites, stages, séminaires en pension complète ; yoga et méditation explicitement ciblés",
    "format": "Week-end en pension complète avec salle de 100 m²",
    "prix": "380 à 420 €",
    "saison": "Toute l'année",
    "src": "https://www.yogmee.fr/salles/celeste-maison-dhotes-retraites-et-seminaires-en-isere",
    "destinataire": {
      "nom": "Céleste Maison d'Hôtes, Gino Ronco",
      "email": "contact@labellecordiere.com",
      "canal": "email"
    },
    "projet": {
      "titre": "Week-end de yoga chez Céleste",
      "concept": "Un week-end de yoga en pension complète, deux nuits, dans la salle de 100 m². Pourquoi eux : la maison reçoit retraites, stages et séminaires en pension complète, cible explicitement le yoga et la méditation, et dispose de salles de 64 et 100 m².",
      "format": "Du vendredi soir au dimanche après-midi, 10 à 12 personnes, pension complète, salle de 100 m². Hors saison de préférence. Chacun avec son tapis, bâches et couvertures fournies.",
      "deroule": "Vendredi : arrivée et pratique douce (1 h 15) · Samedi : pratique du matin (1 h 30), marche (2 h), pratique du soir et méditation (1 h 15) · Dimanche : pratique du matin (1 h 30), chant à voix basse et clôture (45 min)",
      "prix": "380 à 420 € par personne, places vendues par Maude, hébergement et pension complète réglés à la maison au tarif de groupe convenu ; à 10 participants, 3 800 à 4 200 € encaissés, dont la pension.",
      "gain_lieu": "Un groupe de 10 à 12 en pension complète sur un week-end hors saison, vendu et rempli par Maude, des photos remises pour la maison.",
      "demande": "Les disponibilités hors saison, le tarif de groupe en pension complète pour deux nuits et douze personnes, et les conditions d'usage de la salle de 100 m² ; un repérage sur place en semaine.",
      "attention": "Chasselay est à 30 km, prévoir une seule visite de repérage. Pension complète : le tarif de groupe conditionne le prix final, à valider avant de vendre. Acompte demandé alors que les places se vendent progressivement."
    },
    "email": {
      "objet": "Un week-end de yoga en pension complète",
      "corps": "Bonjour Gino,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay. Vous recevez retraites et stages en pension complète, avec une salle de 100 m², et vous ciblez le yoga et la méditation : c'est le lieu que je cherche pour un week-end de yoga.\n\nDu vendredi soir au dimanche après-midi, dix à douze personnes en pension complète. Deux pratiques par jour dans la salle de 100 m², une marche le samedi, un temps de chant à voix basse si la salle s'y prête. Chacun vient avec son tapis, j'apporte bâches de sol et couvertures.\n\nJe vends les places en ligne, payées d'avance, jauge fermée, et je vous règle l'hébergement et la pension complète au tarif de groupe convenu. Le week-end est proposé entre 380 et 420 € par personne. Je suis assurée en responsabilité civile professionnelle et je vous remets les photos du séjour.\n\nPourriez-vous m'indiquer vos disponibilités hors saison, votre tarif de groupe en pension complète pour deux nuits et douze personnes, et les conditions d'usage de la salle ? Je viens volontiers repérer sur place, en semaine.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "clapotis",
    "cat": "hebergeur",
    "nom": "Camping Détente et Clapotis",
    "lieu": "Montferrat (lac de Paladru)",
    "km": 35,
    "prio": 2,
    "gest": "4 étoiles, Écolabel, chalets toute l'année, piscine intérieure, sauna",
    "contact": "04 76 55 33 94 · detente-et-clapotis.fr",
    "deja": "Séjours thématiques bien-être, seniors, séminaires, groupes sportifs",
    "format": "Séance hebdomadaire d'été pour les campeurs (payée par le camping) et un week-end « lac et bien-être » hors saison",
    "prix": "Prestation, ou week-end 345 €",
    "saison": "Toute l'année",
    "src": "https://www.detente-et-clapotis.fr/",
    "destinataire": {
      "nom": "Camping Détente et Clapotis, Montferrat",
      "email": null,
      "canal": "telephone 04 76 55 33 94"
    },
    "projet": {
      "titre": "Yoga au lac, été et hors saison",
      "concept": "Deux volets : une séance de yoga hebdomadaire d'été pour les campeurs, payée par le camping, et un week-end « lac et bien-être » hors saison en chalets. Pourquoi eux : un 4 étoiles Écolabel avec des chalets ouverts toute l'année, une piscine intérieure et un sauna, qui propose déjà des séjours bien-être et seniors, près du lac de Paladru.",
      "format": "Été : 1 h le matin, une fois par semaine en juillet et août, 20 personnes au plus, sur l'herbe ou sous abri. Hors saison : deux nuits en chalets, 10 à 12 personnes, deux pratiques par jour, marche vers le lac, piscine et sauna. Chacun avec son tapis, bâches et couvertures fournies.",
      "deroule": "Été : respiration (10 min) · postures douces (40 min) · temps calme (10 min). Week-end : arrivée et pratique douce (1 h) · pratique du matin (1 h 30) · marche (2 h) · pratique du soir (1 h 15) · pratique de clôture (1 h 30)",
      "prix": "Séances d'été en prestation, sur devis. Week-end à 345 € par personne, places vendues par Maude, hébergement réglé au camping au tarif de groupe ; à 10 participants, 3 450 € encaissés, dont l'hébergement.",
      "gain_lieu": "Une animation bien-être régulière dans la saison, cohérente avec les séjours thématiques existants, et des chalets remplis un week-end hors saison par un groupe vendu par Maude.",
      "demande": "Dix minutes au téléphone pour choisir l'un des deux volets, et les disponibilités hors saison en chalets avec le tarif de groupe.",
      "attention": "Montferrat est à 35 km : la séance hebdomadaire d'été doit être payée à un niveau qui couvre le déplacement. Météo pour la séance en extérieur, repli à prévoir. Le camping a déjà des animations, éviter le doublon."
    },
    "email": {
      "objet": "Yoga pour vos campeurs et un week-end au lac",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay. Vous proposez déjà des séjours bien-être et seniors, avec des chalets ouverts toute l'année, une piscine intérieure et un sauna, près du lac de Paladru, et j'ai deux idées pour vous.\n\nL'été, une séance de yoga hebdomadaire pour vos campeurs, une heure le matin, ouverte à tous les corps, chacun avec son tapis. Le camping paie la prestation et l'offre à ses clients. Hors saison, un week-end « lac et bien-être » de deux nuits en chalets, dix à douze personnes, deux pratiques par jour, une marche vers le lac, piscine et sauna.\n\nSur le week-end, je vends les places en ligne, payées d'avance, à 345 € par personne, et je vous règle l'hébergement au tarif de groupe convenu. Sur les séances d'été, une prestation sur devis. Je suis assurée en responsabilité civile professionnelle, y compris en extérieur, et je vous remets les photos.\n\nAuriez-vous dix minutes au téléphone pour me dire ce qui vous parle, et vos disponibilités hors saison en chalets ? Je suis joignable en semaine, le matin.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "eydoches",
    "cat": "hebergeur",
    "nom": "Camping des Eydoches",
    "lieu": "Faramans",
    "km": 5,
    "prio": 2,
    "gest": "3 étoiles, 60 emplacements, piscine, du 15 avril au 15 octobre",
    "contact": "campingdeseydoches@gmail.com · 04 74 54 21 78",
    "deja": "Mobil-homes, piscine",
    "format": "Séance du samedi matin pour les campeurs en juillet et août, à 5 km de chez Maude",
    "prix": "15 € ou payée par le camping",
    "saison": "Juillet et août",
    "src": "https://www.camping-bievre-isere.com/",
    "destinataire": {
      "nom": "Camping des Eydoches, Faramans",
      "email": "campingdeseydoches@gmail.com",
      "canal": "email"
    },
    "projet": {
      "titre": "Yoga du samedi aux Eydoches",
      "concept": "Une séance de yoga le samedi matin pour les campeurs, en juillet et août, près de la piscine. Pourquoi eux : un camping 3 étoiles de 60 emplacements avec mobil-homes et piscine, ouvert du 15 avril au 15 octobre, à 5 km de chez Maude.",
      "format": "1 h chaque samedi de juillet et d'août, à 9 h, sur un coin d'herbe près de la piscine ou sous abri s'il pleut, 20 personnes au plus, tous âges. Chacun avec son tapis ou une serviette, bâches de sol et couvertures fournies. Été 2027.",
      "deroule": "Accueil et respiration (10 min) · postures douces pour tous les âges (40 min) · temps calme (10 min)",
      "prix": "Au choix du camping : séance payée par le camping en prestation et offerte aux clients, ou place à 15 € vendue et encaissée par Maude (150 € à 10 participants), le camping prêtant l'espace.",
      "gain_lieu": "Une animation du samedi matin pour les vacanciers, sans dépense si les places sont vendues par Maude, à afficher à l'accueil et sur le site, photos remises.",
      "demande": "Un passage un matin avant la fermeture du 15 octobre pour repérer l'endroit et caler le principe pour l'été 2027.",
      "attention": "La saison 2026 se termine : la décision se prend pour 2027, ne pas laisser retomber sur l'hiver. Séance en extérieur : météo et bruit de la piscine, choisir l'heure avant l'ouverture des bassins. Petit camping, jauge réelle incertaine."
    },
    "email": {
      "objet": "Yoga du samedi matin pour vos campeurs en 2027",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à cinq kilomètres de Faramans. Vous accueillez campeurs et mobil-homes du 15 avril au 15 octobre, avec une piscine, et je vous propose du yoga le samedi matin, l'été prochain.\n\nUne séance d'une heure, chaque samedi de juillet et d'août, à 9 h, sur un coin d'herbe près de la piscine ou sous abri s'il pleut. Un yoga doux, pour tous les corps et tous les âges, en vacances : chacun vient avec son tapis ou une serviette, j'apporte bâches de sol et couvertures.\n\nDeux façons de faire, à votre choix. Soit le camping paie la séance en prestation et l'offre à ses clients comme animation. Soit la place est à 15 €, je vends et j'encaisse en ligne, et le camping prête l'espace et affiche la séance à l'accueil. Je suis assurée en responsabilité civile professionnelle, y compris en extérieur.\n\nPuis-je passer un matin avant votre fermeture du 15 octobre, pour repérer l'endroit et caler le principe pour l'été 2027 ? Je suis à cinq minutes, quand cela vous arrange.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "palladior",
    "cat": "hebergeur",
    "nom": "Hôtel Le Palladior",
    "lieu": "Voiron",
    "km": 35,
    "prio": 3,
    "gest": "3 étoiles, 174 chambres, 7 salles, espace fitness",
    "contact": "04 76 06 47 47 · hotel-voiron.fr",
    "deja": "Séminaires",
    "format": "Yoga du matin pour les séminaires d'entreprise hébergés, proposé à l'hôtel comme option de leur offre",
    "prix": "120 à 160 € la séance",
    "saison": "Toute l'année",
    "src": "https://protourisme.paysvoironnais.com/hotel/hotel-le-palladior/",
    "destinataire": {
      "nom": "Hôtel Le Palladior, Voiron",
      "email": null,
      "canal": "telephone 04 76 06 47 47"
    },
    "projet": {
      "titre": "Yoga du matin pour vos séminaires",
      "concept": "Une séance de yoga du matin proposée par l'hôtel comme option de son offre séminaires, avant le petit-déjeuner. Pourquoi eux : un 3 étoiles de 174 chambres avec 7 salles et un espace fitness, qui accueille des séminaires d'entreprise.",
      "format": "45 min à 1 h, avant le petit-déjeuner, dans une salle ou l'espace fitness, 10 à 20 participants. À la demande, toute l'année, en semaine. Tenue souple, chacun avec son tapis, bâches de sol et couvertures fournies.",
      "deroule": "Réveil du dos et des articulations (15 min) · respiration et postures debout simples (25 min) · temps calme avant la journée de travail (10 min)",
      "prix": "120 à 160 € la séance selon la durée, facturée à l'hôtel ou directement à l'entreprise cliente ; l'hôtel fixe le prix de l'option à ses clients. Un séminaire de deux matins revient à 240 à 320 €.",
      "gain_lieu": "Une option bien-être à ajouter aux propositions séminaires sans rien organiser, avec une intervenante disponible tôt le matin en semaine.",
      "demande": "Dix minutes au téléphone avec la personne qui vend les séminaires, pour inscrire l'option dans les propositions.",
      "attention": "Voiron est à 35 km et l'horaire est très matinal : la séance doit être confirmée à l'avance. L'hôtel a peut-être déjà un prestataire bien-être. Pas d'email public, premier contact par téléphone."
    },
    "email": {
      "objet": "Un yoga du matin dans votre offre séminaires",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay. Vous accueillez des séminaires d'entreprise, avec sept salles et 174 chambres, et je vous propose d'ajouter un yoga du matin à votre offre séminaires.\n\nUne séance de 45 minutes à une heure, avant le petit-déjeuner, dans l'une de vos salles ou dans l'espace fitness, pour dix à vingt participants. Réveil du dos, respiration, un temps calme pour bien commencer la journée de travail. Aucune souplesse requise, chacun vient en tenue souple avec son tapis, j'apporte bâches de sol et couvertures pour ceux qui n'en ont pas.\n\nVous proposez l'option à vos clients séminaires, au tarif que vous choisissez ; la séance m'est réglée 120 à 160 € selon la durée, facturée à l'hôtel ou directement à l'entreprise cliente, comme vous préférez. Je suis assurée en responsabilité civile professionnelle et je peux intervenir en semaine, tôt le matin.\n\nAuriez-vous dix minutes au téléphone avec la personne qui vend vos séminaires, pour voir comment l'ajouter à vos propositions ? Je suis joignable en semaine, le matin.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "castelanne",
    "cat": "hebergeur",
    "nom": "Le Castel'Anne",
    "lieu": "Voiron",
    "km": 35,
    "prio": 3,
    "gest": "Salles modulables, parc 2 000 m², séminaires et team building",
    "contact": "06 65 05 74 47",
    "deja": "Séminaires, team building",
    "format": "Atelier yoga dans leur catalogue de team building",
    "prix": "300 € la demi-journée",
    "saison": "Toute l'année",
    "src": "https://www.castelannereception.fr/location-salle-seminaire-entreprise-voiron-grenoble-38.php",
    "destinataire": {
      "nom": "Le Castel'Anne, Voiron",
      "email": null,
      "canal": "telephone 06 65 05 74 47"
    },
    "projet": {
      "titre": "Atelier yoga en team building",
      "concept": "Une demi-journée de yoga à inscrire au catalogue de team building du lieu, en salle ou dans le parc. Pourquoi eux : des salles modulables, un parc de 2 000 m², une activité de séminaires et de team building déjà en place.",
      "format": "Demi-journée, 10 à 20 personnes, salle modulable ou parc par beau temps, toute l'année. Tenue souple, chacun avec son tapis, bâches de sol et couvertures fournies.",
      "deroule": "Accueil et respiration (20 min) · pratique douce pour tous les corps (1 h) · respiration à deux et exercices de groupe (45 min) · temps de calme et son à voix basse (30 min) · échange de clôture (15 min)",
      "prix": "300 € la demi-journée, facturée au Castel'Anne ou à l'entreprise cliente ; le lieu fixe le prix de l'atelier dans son catalogue.",
      "gain_lieu": "Un atelier de plus dans le catalogue de team building, sans matériel ni organisation, avec une intervenante assurée pour l'extérieur.",
      "demande": "Dix minutes au téléphone pour inscrire l'atelier au catalogue, puis une visite des salles et du parc.",
      "attention": "Voiron est à 35 km : prévoir le déplacement dans la demi-journée. Concurrence probable d'autres prestataires bien-être au catalogue. Pas d'email public, premier contact par téléphone."
    },
    "email": {
      "objet": "Un atelier yoga dans votre catalogue team building",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay. Vous recevez séminaires et team building dans vos salles modulables et votre parc, et je vous propose un atelier yoga à ajouter à votre catalogue.\n\nUne demi-journée pour un groupe de dix à vingt personnes, dans une salle ou dans le parc quand il fait beau : une pratique douce pour tous les corps, un travail sur la respiration à deux, un temps de calme et un temps de son à voix basse pour souder le groupe. Aucune souplesse requise, chacun vient en tenue souple avec son tapis, j'apporte bâches de sol et couvertures.\n\nVous vendez l'atelier à vos clients au tarif que vous choisissez ; la demi-journée m'est réglée 300 €, facturée au Castel'Anne ou à l'entreprise cliente. Je suis assurée en responsabilité civile professionnelle, y compris en extérieur, et je monte en ce moment des séances hors les murs, dont une dans la grotte de Sassenage.\n\nAuriez-vous dix minutes au téléphone pour voir comment l'inscrire dans votre catalogue ? Je suis joignable en semaine, le matin.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "faramans",
    "cat": "nature",
    "nom": "Base de loisirs de Faramans (Le Marais)",
    "lieu": "Faramans",
    "km": 8,
    "prio": 1,
    "gest": "Bièvre Isère Communauté",
    "contact": "04 74 54 32 70 · office de tourisme Terres de Berlioz 04 74 20 61 43",
    "deja": "Étang de pêche de 2,5 ha, sentiers, aires de pique-nique ombragées, jeux, pumptrack, tennis et padel, et un circuit bien-être de 24 panneaux avec des stations respiration et méditation (« parcours zen ») ; accès libre et gratuit toute l'année",
    "format": "Séance matinale au bord de l'étang enchaînée sur le parcours zen déjà balisé, 1 h 30, en série de 4 samedis d'été ; à proposer à la communauté de communes comme animation estivale",
    "prix": "Gratuit pour le public si la collectivité la porte (prestation), sinon 15 €",
    "saison": "Mai à septembre",
    "src": "https://www.bievre-isere.com/les-services/sport-loisirs/base-de-loisirs/",
    "destinataire": {
      "nom": "Bièvre Isère Communauté, base de loisirs de Faramans",
      "email": null,
      "canal": "telephone (04 74 54 32 70)"
    },
    "projet": {
      "titre": "Matin zen au bord du Marais",
      "concept": "Une séance de yoga doux au bord de l'étang, prolongée par une marche guidée sur le circuit bien-être déjà balisé, avec ses stations respiration et méditation. Pour les habitants et les visiteurs d'été, tous niveaux. Le parcours zen existe, il manque quelqu'un pour le faire vivre.",
      "format": "1 h 30 le samedi matin à 9 h : pratique sur l'herbe au bord de l'étang puis marche sur le parcours zen. Série de 4 samedis entre mai et septembre, 15 personnes par séance, chacun apporte son tapis, bâches et couvertures fournies.",
      "deroule": "Accueil et respiration au bord de l'eau (10 min) · pratique douce (45 min) · marche guidée sur le parcours zen avec arrêts aux stations (30 min) · retour et tisane (5 min)",
      "prix": "Portée par la communauté de communes : gratuite pour le public, prestation facturée sur devis pour la série de 4. Sinon 15 € par personne vendus par Maude, soit 150 € pour 10 participants par séance.",
      "gain_lieu": "Une animation estivale prête à programmer, qui donne un usage guidé au circuit bien-être et une raison de venir un samedi matin. Communication faite par Maude sur les agendas gratuits et auprès de la presse locale.",
      "demande": "Un appel de dix minutes pour savoir si la base programme des animations l'été et qui les décide, puis un repérage sur place. Réponse souhaitée avant fin mars pour caler les quatre dates.",
      "attention": "Site en accès libre : pas de privatisation possible, la séance se fait au milieu des promeneurs. Météo : pas de repli couvert sur place, prévoir une date de report par samedi. Décision qui remonte à la communauté de communes, délai administratif à anticiper."
    },
    "email": {
      "objet": "Yoga au bord de l'étang sur le parcours zen",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à huit kilomètres de la base de loisirs de Faramans. Le circuit bien-être du Marais, avec ses stations respiration et méditation, appelle une pratique guidée. C'est ce que je vous propose pour l'été.\n\nLe format : une séance d'une heure trente le samedi matin au bord de l'étang, qui s'achève par une marche guidée sur le parcours zen. Une série de quatre samedis entre mai et septembre, quinze personnes par séance, tous niveaux, chacun apporte son tapis. J'apporte les bâches de sol et les couvertures, et je suis assurée en responsabilité civile professionnelle, y compris en extérieur.\n\nDeux façons de la porter. En animation de la communauté de communes, gratuite pour le public et facturée en prestation sur devis. Ou en séance à 15 € par personne, que je vends en ligne et que je publie sur les agendas de Terres de Berlioz et d'Isère Attractivité.\n\nPouvons-nous en parler dix minutes par téléphone ? Je suis joignable en semaine entre 12 h et 14 h, et je peux passer repérer les lieux le matin qui vous convient.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "saintdidier",
    "cat": "hebergeur",
    "nom": "Domaine Saint-Didier, Rêves de pêche",
    "lieu": "Saint-Didier-de-Bizonnes",
    "km": 15,
    "prio": 2,
    "gest": "Association Domaine Saint-Didier, Rêves de pêche",
    "contact": "domainesaintdidier@gmail.com · 04 74 97 68 96",
    "deja": "Trois étangs privés sur 12 ha (no-kill, 24 postes), une salle chauffée et équipée, deux gîtes (220 à 500 € le week-end), toilettes, parking ; ouvert toute l'année de 6 h à 21 h",
    "format": "Week-end « retraite au bord des étangs » : les deux gîtes, la salle chauffée pour la pratique par mauvais temps, 10 à 12 personnes",
    "prix": "300 à 345 € le week-end",
    "saison": "Toute l'année, avril à juin et septembre à octobre en tête",
    "src": "https://www.alpes-isere.com/en/sit/domaine-saint-didier-5246644/",
    "destinataire": {
      "nom": "Association Domaine Saint-Didier, Rêves de pêche",
      "email": "domainesaintdidier@gmail.com",
      "canal": "email"
    },
    "projet": {
      "titre": "Retraite au bord des étangs",
      "concept": "Un week-end de yoga doux pour dix à douze personnes, logées dans les deux gîtes du domaine, avec la pratique au bord des trois étangs et la salle chauffée en repli. Pour des adultes qui veulent deux jours de calme à moins d'une heure de Lyon et de Grenoble, sans ésotérisme.",
      "format": "Du vendredi soir au dimanche après-midi, 10 à 12 personnes, les deux gîtes, quatre temps de pratique (au bord de l'eau ou dans la salle chauffée), respiration, méditation, marches sur les 12 ha. Chacun apporte son tapis. Deux à trois week-ends par an, avril à juin et septembre à octobre en priorité.",
      "deroule": "Vendredi 18 h arrivée et séance d'ouverture (1 h) · samedi matin pratique au bord des étangs (1 h 30) · samedi après-midi marche et respiration (1 h) · dimanche matin pratique et méditation (1 h 30) · dimanche 14 h cercle de clôture (30 min)",
      "prix": "300 à 345 € par personne le week-end, hébergement et enseignement compris, le niveau exact dépendant du tarif de groupe des deux gîtes. Pour 10 participants : 3 000 à 3 450 € de ventes, dont l'hébergement et la salle réglés au domaine.",
      "gain_lieu": "Les deux gîtes loués ensemble sur un week-end hors saison de pêche, la salle utilisée, et une clientèle nouvelle qui découvre le domaine par le yoga et non par la pêche.",
      "demande": "Les disponibilités d'avril à juin et de septembre à octobre, le tarif de groupe pour les deux gîtes sur deux nuits, les conditions d'usage de la salle chauffée, et un repérage sur place.",
      "attention": "Le domaine reste ouvert aux pêcheurs de 6 h à 21 h : la pratique au bord de l'eau se fait à côté des postes, à caler avec eux. Les gîtes sont annoncés de 220 à 500 € le week-end : le tarif de groupe conditionne le prix final. Repas non fournis, à organiser en autonomie dans les gîtes."
    },
    "email": {
      "objet": "Un week-end de yoga dans vos deux gîtes",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, troisième saison à l'Espace Montgontier. Vos trois étangs, la salle chauffée et vos deux gîtes réunissent ce qu'il faut pour un week-end de retraite : dormir sur place, pratiquer au bord de l'eau, se replier s'il pleut.\n\nCe que je propose : un week-end du vendredi soir au dimanche après-midi pour dix à douze personnes, dans les deux gîtes. Quatre temps de pratique douce, respiration et méditation, au bord des étangs ou dans la salle. Chacun apporte son tapis, je viens avec le matériel de sol. Je suis assurée en responsabilité civile professionnelle.\n\nJe vends les places en ligne, payées d'avance, entre 300 et 345 € par personne selon votre tarif, et je vous règle l'hébergement et la salle. Je publie le week-end sur les agendas de l'Isère et je vous remets les photos du groupe.\n\nPourriez-vous m'indiquer vos disponibilités d'avril à juin et de septembre à octobre, votre tarif de groupe pour les deux gîtes sur deux nuits et les conditions d'usage de la salle ? Je peux venir repérer les lieux un matin.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "epona",
    "cat": "producteur",
    "nom": "Ferme Epona, ferme maraîchère et pédagogique",
    "lieu": "Châtonnay",
    "km": 17,
    "prio": 3,
    "gest": "Alexandra Page",
    "contact": "06 71 87 08 78 · facebook.com/ferme.epona (pas d'email affiché)",
    "deja": "Ateliers enfants dès 2 ans, stages, pony party, anniversaires, groupes et classes, accueil handicap, salle intérieure pour le mauvais temps ; 6 poneys, chèvres naines, poules ; sur réservation",
    "format": "« Yoga et poneys » parent-enfant le mercredi ou pendant les vacances, 1 h, dans la salle ou au pré ; la certification yoga enfants de Maude et le public familles de la ferme",
    "prix": "15 € par enfant, 20 € le duo parent-enfant",
    "saison": "Vacances scolaires, mercredis",
    "src": "https://www.minizou.fr/nature/avec-les-animaux/505-chatonnay-epona-ferme-equestre-pedagogique",
    "destinataire": {
      "nom": "Alexandra Page, Ferme Epona",
      "email": null,
      "canal": "telephone (06 71 87 08 78)"
    },
    "projet": {
      "titre": "Yoga et poneys en famille",
      "concept": "Une séance de yoga parent-enfant d'une heure à la ferme, dans la salle intérieure ou au pré selon le temps, avec les poneys et les chèvres naines comme décor. Pour les familles qui viennent déjà aux ateliers et aux anniversaires de la ferme, dès 4 ans. Maude est certifiée yoga enfants.",
      "format": "1 h le mercredi après-midi ou pendant les vacances scolaires, 8 duos parent-enfant au plus, salle intérieure de la ferme ou pré, chacun apporte son tapis, bâches fournies. Un mercredi par mois, et une date par période de vacances.",
      "deroule": "Accueil et jeu de respiration (10 min) · postures d'animaux à deux (30 min) · relaxation guidée (10 min) · passage calme au pré pour saluer les poneys (10 min)",
      "prix": "15 € par enfant, 20 € le duo parent-enfant, vendus par Maude en ligne. Un mercredi complet à 8 duos : 160 €. La rencontre avec les animaux et les prestations de la ferme restent au tarif de la ferme.",
      "gain_lieu": "Une nouvelle activité au calendrier des mercredis et des vacances, sans rien organiser, et des familles qui restent sur place après la séance pour ce que la ferme propose déjà.",
      "demande": "Un appel de dix minutes, puis un repérage de la salle et du pré. Une première date pendant les vacances de printemps.",
      "attention": "Les enfants sont sur réservation à la ferme : caler la séance hors des créneaux d'ateliers et de pony party pour ne pas doubler une animation existante. Animaux à proximité : pratique au pré seulement dans un espace clos, sans poney en liberté. Météo : la salle intérieure sert de repli."
    },
    "email": {
      "objet": "Une séance yoga parent-enfant à la ferme",
      "corps": "Bonjour Alexandra,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, certifiée yoga enfants. Votre ferme accueille déjà des ateliers dès 2 ans, des anniversaires et des classes, avec une salle intérieure pour le mauvais temps. C'est le cadre d'une séance parent-enfant.\n\nJe propose « Yoga et poneys », une heure le mercredi après-midi ou pendant les vacances, pour huit duos parent-enfant au plus, dans votre salle ou au pré. Des postures d'animaux à deux, un jeu de respiration, une relaxation, puis un passage calme auprès des poneys. Chacun apporte son tapis, j'apporte les bâches. Je suis assurée en responsabilité civile professionnelle.\n\nJe vends les places en ligne, payées d'avance : 15 € par enfant, 20 € le duo. Ce que la ferme propose autour reste à votre main et à votre tarif. Je publie la date sur les agendas de l'Isère et je vous remets les photos prises avec l'accord des familles.\n\nAuriez-vous dix minutes au téléphone pour en parler ? Je suis joignable en semaine entre 12 h et 14 h, et je peux venir voir la salle et le pré.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "cardelles",
    "cat": "producteur",
    "nom": "Chèvrerie des Cardelles",
    "lieu": "Val-de-Virieu",
    "km": 27,
    "prio": 3,
    "gest": "Julie Guttin (Bienvenue à la ferme)",
    "contact": "c.guillaudsaumur@orange.fr · 06 30 70 83 56",
    "deja": "Hébergement en yourte pour 4 personnes avec terrasse, participation à la traite du matin, plateaux apéritifs fromages et charcuterie sur réservation, accès aux sentiers",
    "format": "Mini-retraite « yourte, traite et yoga » sur 24 h pour 4 personnes : yoga au pré le soir et au matin, traite, apéro fermier",
    "prix": "120 € par personne, yourte et apéro compris (à caler avec elle)",
    "saison": "Mai à septembre",
    "src": "https://www.bienvenue-a-la-ferme.com/auvergnerhonealpes/isere/virieu/ferme/chevrerie-des-cardelles/664180",
    "destinataire": {
      "nom": "Julie Guttin, Chèvrerie des Cardelles",
      "email": "c.guillaudsaumur@orange.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Yourte, traite et yoga",
      "concept": "Une mini-retraite de 24 heures pour quatre personnes : yoga au pré le soir et au matin, nuit dans la yourte, traite des chèvres au réveil, plateau fermier à l'apéritif. Pour des adultes qui veulent une parenthèse courte, à taille humaine, avec les animaux et les sentiers.",
      "format": "Du samedi 17 h au dimanche 11 h, 4 personnes (la capacité de la yourte), séance au pré le soir (1 h) et au matin après la traite (1 h), plateau apéritif fromages et charcuterie le soir, accès aux sentiers. Chacun apporte son tapis. Un week-end par mois de mai à septembre.",
      "deroule": "Samedi 17 h accueil et installation dans la yourte (30 min) · pratique douce au pré (1 h) · plateau apéritif fermier sur la terrasse (1 h) · dimanche matin traite avec vous (45 min) · pratique et méditation au pré (1 h) · départ à 11 h",
      "prix": "120 € par personne, yourte et plateau apéritif compris, à caler avec la chèvrerie. Pour 4 participants : 480 €, dont la yourte et le plateau réglés à la ferme à son tarif.",
      "gain_lieu": "La yourte louée un week-end de plus par mois, un plateau vendu pour quatre, et une visibilité auprès d'un public qui ne serait pas venu pour la seule nuit à la ferme.",
      "demande": "Un appel pour caler le partage du prix (Maude vend la place et règle la yourte et le plateau, ou chacun encaisse le sien) et un repérage du pré. Un premier week-end en mai.",
      "attention": "Quatre places seulement : marge réduite, à voir si le format tient économiquement pour les deux parties. Météo : pas de repli couvert cité en dehors de la yourte. La traite du matin impose l'horaire, la séance s'y adapte."
    },
    "email": {
      "objet": "Yoga, traite et nuit en yourte aux Cardelles",
      "corps": "Bonjour Julie,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay. Votre yourte pour quatre, la traite du matin ouverte aux visiteurs et vos plateaux fermiers composent déjà un petit séjour. J'aimerais y ajouter le yoga.\n\nL'idée : une mini-retraite de 24 heures pour quatre personnes, du samedi 17 h au dimanche 11 h. Une séance douce au pré le soir, votre plateau apéritif sur la terrasse, la nuit dans la yourte, la traite avec vous au réveil, puis une seconde séance au matin. Chacun apporte son tapis, je viens avec les bâches de sol. Je suis assurée en responsabilité civile professionnelle, y compris en extérieur.\n\nCôté organisation, deux options : je vends la place à 120 € tout compris et je vous règle la yourte et le plateau à votre tarif, ou chacun encaisse le sien. Je publie la date sur les agendas de l'Isère et je vous remets les photos prises avec l'accord du groupe.\n\nUn appel de dix minutes vous conviendrait-il pour en parler ? Je suis joignable en semaine entre 12 h et 14 h, et je peux passer voir le pré un matin.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "cayonniere",
    "cat": "producteur",
    "nom": "Chèvrerie de la Cayonnière",
    "lieu": "Chassignieu",
    "km": 30,
    "prio": 3,
    "gest": "Marion Clavel (EARL)",
    "contact": "marionclavel24@outlook.fr · 06 84 08 38 43",
    "deja": "Visite libre et gratuite du troupeau (100 chèvres alpines), vente à la ferme mardi, jeudi, samedi et dimanche matin, marché de Virieu le vendredi",
    "format": "« Yoga puis chèvrerie » un samedi matin : pratique dans le pré, visite, fromages",
    "prix": "25 €",
    "saison": "Mai à septembre",
    "src": "https://www.alpes-isere.com/degustation/earl-la-chevrerie-de-la-cayonniere",
    "destinataire": {
      "nom": "Marion Clavel, Chèvrerie de la Cayonnière",
      "email": "marionclavel24@outlook.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Yoga puis chèvrerie",
      "concept": "Un samedi matin en deux temps : une séance de yoga doux dans le pré face au troupeau, puis la visite de la chèvrerie et les fromages à la boutique. Pour des adultes de la région qui aiment la campagne et veulent une matinée complète, pratique et achats compris.",
      "format": "Samedi 9 h 30 à 11 h 30, 15 personnes, pratique dans le pré (1 h), visite libre du troupeau accompagnée par l'exploitante (30 min), passage à la vente à la ferme. Chacun apporte son tapis, bâches fournies. Un samedi par mois de mai à septembre.",
      "deroule": "Accueil et respiration face aux chèvres (10 min) · pratique douce dans le pré (50 min) · visite du troupeau (30 min) · fromages et achats à la boutique (30 min)",
      "prix": "25 € par personne pour la séance, vendus par Maude en ligne. Les fromages se vendent à la boutique, au tarif de la ferme. Pour 10 participants : 250 € de séance, et 10 clients à la boutique à 11 h.",
      "gain_lieu": "Quinze clients réunis à la boutique un samedi matin, une animation à annoncer sur le marché de Virieu, et des photos de la ferme remises par Maude.",
      "demande": "Un accord de principe, un repérage du pré pour choisir l'emplacement, et un premier samedi en mai. Communication croisée : la ferme annonce la date à ses clients, Maude la publie sur les agendas.",
      "attention": "La visite est déjà libre et gratuite : la valeur ajoutée pour la ferme est la vente, pas la visite. Pré : sol et clôture à vérifier, chèvres à distance pendant la pratique. Samedi matin = jour de vente à la ferme, ne pas gêner la boutique."
    },
    "email": {
      "objet": "Yoga dans le pré, puis vos fromages",
      "corps": "Bonjour Marion,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay. Votre troupeau se visite librement et la vente à la ferme est ouverte le samedi matin. Je vous propose de faire venir un groupe en deux temps ce jour-là.\n\nLe format : une séance de yoga doux d'une heure dans le pré, face aux chèvres, un samedi à 9 h 30, pour quinze personnes. Puis la visite du troupeau et le passage à votre boutique pour les fromages. Chacun apporte son tapis, j'apporte les bâches de sol et les couvertures. Je suis assurée en responsabilité civile professionnelle, y compris en extérieur.\n\nChacun vend le sien : je vends la séance en ligne à 25 € par personne, payée d'avance, et les fromages restent à votre tarif à la boutique. Vous annoncez la date à vos clients et sur le marché de Virieu, je la publie sur les agendas gratuits de l'Isère et je vous remets les photos prises avec l'accord du groupe.\n\nPourrais-je passer un matin de vente pour repérer le pré avec vous ? Un premier samedi en mai me conviendrait bien.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "longpra",
    "cat": "nature",
    "nom": "Château de Longpra",
    "lieu": "Saint-Geoire-en-Valdaine",
    "km": 35,
    "prio": 3,
    "gest": "Propriété privée (famille Pasquier de Franclieu), monument historique",
    "contact": "04 76 07 63 48 (fiches tourisme, à vérifier avant tout envoi : le site du château ne répond plus) · pas d'email affiché",
    "deja": "Visite guidée, parc et jardins, musée de l'outil à bois, expositions, ateliers enfants, concerts ; ouvert d'avril à décembre, 8,50 € adulte, groupes sur réservation toute l'année",
    "format": "Matinée « yoga dans le parc » puis visite, en s'insérant dans leur programmation d'ateliers et de concerts",
    "prix": "30 € visite comprise",
    "saison": "Mai à octobre",
    "src": "https://www.saint-geoire-en-valdaine.com/chateau-de-longpra-2/",
    "destinataire": {
      "nom": "Château de Longpra",
      "email": null,
      "canal": "telephone à vérifier (04 76 07 63 48)"
    },
    "projet": {
      "titre": "Yoga dans le parc de Longpra",
      "concept": "Une matinée en deux temps au château : une séance de yoga doux dans le parc et les jardins, puis la visite guidée. Pour des visiteurs adultes qui viennent pour le lieu et repartent avec une matinée complète. Le château programme déjà des ateliers et des concerts, la séance s'y insère.",
      "format": "Un dimanche matin, 9 h 30 à 12 h, 15 personnes, pratique dans le parc (1 h 15) avant l'ouverture au public ou à l'écart des visiteurs, puis visite guidée (1 h). Chacun apporte son tapis, bâches fournies. Une date par mois de mai à octobre.",
      "deroule": "Accueil dans le parc (10 min) · pratique douce et respiration (1 h) · pause tisane (15 min) · visite guidée du château et du musée de l'outil (1 h)",
      "prix": "30 € par personne, visite comprise, vendus par Maude en ligne. Pour 10 participants : 300 €, dont la visite reversée au château (8,50 € par adulte au tarif affiché) ou un forfait par créneau à convenir.",
      "gain_lieu": "Un groupe de quinze en visite guidée par date, en dehors des pics de fréquentation, et une animation de plus à la programmation sans frais pour le château. Photos remises par Maude.",
      "demande": "Vérifier d'abord le bon contact (le site du château ne répond plus). Puis un créneau hors ouverture ou en début de matinée, un repérage du parc, et le montant reversé par personne ou par créneau.",
      "attention": "Contact incertain : la fiche tourisme donne un téléphone, aucun email, le site est hors service. Monument historique privé : cadre à respecter, pas de matériel qui abîme les pelouses. Météo : le repli intérieur est à demander, rien n'est prévu."
    },
    "email": {
      "objet": "Une matinée yoga et visite à Longpra",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay. Le château de Longpra programme déjà des ateliers et des concerts, et ouvre son parc et ses jardins aux visiteurs d'avril à décembre. Je vous propose d'y ajouter une matinée de yoga suivie de la visite.\n\nLe format : une séance douce d'une heure quinze dans le parc, un dimanche matin avant l'affluence ou à l'écart des visiteurs, pour quinze personnes, puis la visite guidée du château et du musée de l'outil à bois. Chacun apporte son tapis, j'apporte les bâches de sol, rien qui abîme les pelouses. Je suis assurée en responsabilité civile professionnelle, y compris en extérieur.\n\nJe vends les places en ligne, payées d'avance, 30 € par personne visite comprise, et je vous reverse la visite pour chaque participant ou un forfait par créneau, comme vous préférez. Je publie la date sur les agendas de l'Isère et je vous remets les photos prises avec l'accord du groupe.\n\nPourriez-vous m'indiquer la personne qui gère les groupes et un créneau possible ? Je peux venir repérer le parc un jour d'ouverture.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "valdainan",
    "cat": "producteur",
    "nom": "Brasserie artisanale du Val d'Ainan, La Dauphine",
    "lieu": "Saint-Geoire-en-Valdaine",
    "km": 35,
    "prio": 2,
    "gest": "Catherine Dereume (gérante)",
    "contact": "brasserie.ainan@gmail.com · 04 76 06 33 45",
    "deja": "Visites guidées gratuites pour les groupes de 15 sur réservation, dégustation, boutique et bar, aire de pique-nique et aire de jeux, parking cars ; ouvert du mardi au samedi, entrée 2,70 €",
    "format": "« Yoga et bière » en fin d'après-midi sur l'aire de pique-nique, puis visite et dégustation pour un groupe de 15",
    "prix": "30 €",
    "saison": "Mai à septembre",
    "src": "https://www.alpes-isere.com/en/sit/val-dainan-traditional-brewery-163436/",
    "destinataire": {
      "nom": "Catherine Dereume, Brasserie du Val d'Ainan",
      "email": "brasserie.ainan@gmail.com",
      "canal": "email"
    },
    "projet": {
      "titre": "Yoga et bière au Val d'Ainan",
      "concept": "Une fin d'après-midi en trois temps sur l'aire de pique-nique de la brasserie : une séance de yoga doux, la visite guidée, la dégustation au bar. Pour des adultes de la région qui veulent une sortie complète et conviviale, avec un yoga qui ne se prend pas au sérieux.",
      "format": "Un samedi de 17 h à 19 h 30, groupe de 15 (la jauge des visites guidées), pratique sur l'aire de pique-nique (1 h), visite guidée (45 min), dégustation et boutique (45 min). Chacun apporte son tapis, bâches fournies. Une date par mois de mai à septembre.",
      "deroule": "Accueil sur l'aire de pique-nique (10 min) · pratique douce et respiration (50 min) · visite guidée de la brasserie (45 min) · dégustation au bar et boutique (45 min)",
      "prix": "30 € par personne, séance et dégustation comprises, vendus par Maude en ligne ; la dégustation et l'entrée sont réglées à la brasserie à son tarif. Pour 10 participants : 300 € de ventes, dont la part brasserie.",
      "gain_lieu": "Un groupe de quinze à la visite, au bar et à la boutique un samedi soir, et une animation nouvelle à annoncer sur place. Photos remises par Maude.",
      "demande": "Un accord de principe, le montant de la part brasserie par personne (entrée, dégustation), un repérage de l'aire de pique-nique, et un premier samedi en mai ou juin.",
      "attention": "L'aire de jeux et l'aire de pique-nique restent ouvertes aux autres visiteurs : demander un coin réservé. Alcool après la pratique, jamais avant, à écrire dans l'annonce. Météo : demander un repli sous couvert."
    },
    "email": {
      "objet": "Yoga sur l'aire de pique-nique, puis dégustation",
      "corps": "Bonjour Catherine,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay. Vous recevez déjà des groupes de quinze en visite guidée, avec une aire de pique-nique, un bar et une boutique. Je vous propose de faire venir un groupe complet en fin d'après-midi, pour une soirée en trois temps.\n\nLe format : une séance de yoga doux d'une heure sur l'aire de pique-nique, un samedi à 17 h, pour quinze personnes, puis votre visite guidée et la dégustation au bar. La pratique est accessible à tous, la bière vient après, jamais avant. Chacun apporte son tapis, j'apporte les bâches de sol. Je suis assurée en responsabilité civile professionnelle, y compris en extérieur.\n\nJe vends les places en ligne, payées d'avance, 30 € par personne séance et dégustation comprises, et je vous règle l'entrée et la dégustation à votre tarif. Je publie la date sur les agendas de l'Isère et je vous remets les photos prises avec l'accord du groupe.\n\nPourrions-nous en parler dix minutes au téléphone ? Je suis joignable en semaine entre 12 h et 14 h, et je peux venir repérer l'aire un samedi matin.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "galerne",
    "cat": "producteur",
    "nom": "La Ferme de Galerne",
    "lieu": "Tullins",
    "km": 24,
    "prio": 2,
    "gest": "Exploitants non nommés sur la fiche",
    "contact": "lafermedegalerne@gmail.com · 06 74 19 22 98",
    "deja": "70 chèvres alpines, visite libre par panneaux, marché fermier chaque deuxième dimanche du mois de 9 h à 12 h avec des producteurs des environs, vente mercredi, vendredi, samedi ; ouvert toute l'année",
    "format": "Séance en plein air à 9 h le dimanche du marché fermier, avant que le public arrive, puis chacun fait ses courses : visibilité auprès d'un public local déjà réuni",
    "prix": "20 €",
    "saison": "Toute l'année, un dimanche par mois",
    "src": "https://www.alpes-isere.com/en/sit/goats-cheese-and-walnut-sales-at-galerne-farm-117755/",
    "destinataire": {
      "nom": "La Ferme de Galerne",
      "email": "lafermedegalerne@gmail.com",
      "canal": "email"
    },
    "projet": {
      "titre": "Yoga du marché fermier",
      "concept": "Une séance de yoga en plein air à 9 h, le deuxième dimanche du mois, à l'heure où le marché fermier de Galerne s'installe, puis chacun fait ses courses chez les producteurs. Pour un public local déjà réuni par le marché, qui repart avec ses fromages et son panier.",
      "format": "Le deuxième dimanche du mois, 9 h à 10 h, 15 personnes, pratique en plein air sur un espace de la ferme à convenir, puis le marché de 9 h à 12 h. Chacun apporte son tapis, bâches et couvertures fournies. Toute l'année, la séance suit le rythme du marché ; en hiver, un espace couvert à trouver.",
      "deroule": "Accueil (10 min) · pratique douce et respiration (45 min) · tisane (5 min) · courses au marché fermier (jusqu'à 12 h)",
      "prix": "20 € par personne pour la séance, vendus par Maude en ligne. Les produits se vendent au marché, au tarif des producteurs. Pour 10 participants : 200 € de séance, et 10 clients de plus au marché à 10 h.",
      "gain_lieu": "Une raison supplémentaire de venir au marché du dimanche, quinze clients qui arrivent tôt, et une animation régulière à annoncer aux producteurs présents. Photos du marché remises par Maude.",
      "demande": "Un accord de principe, le choix de l'emplacement (pré, cour, espace couvert pour l'hiver), et un premier dimanche de marché au printemps. Communication croisée avec les producteurs du marché.",
      "attention": "Marché de 9 h à 12 h : la séance se déroule pendant l'installation, éviter la zone des stands et du stationnement. Les exploitants ne sont pas nommés sur la fiche : écrire à la ferme sans prénom. Hiver : sans espace couvert, la séance s'arrête d'octobre à mars."
    },
    "email": {
      "objet": "Une séance de yoga le dimanche du marché fermier",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay. Votre marché fermier du deuxième dimanche du mois réunit déjà des producteurs des environs et un public local. Je vous propose d'y ajouter une séance de yoga, juste avant les courses.\n\nLe format : une heure de pratique douce en plein air à 9 h, dans un coin de la ferme à convenir, pour quinze personnes, puis chacun fait son marché. Un yoga accessible à tous, sans rien d'ésotérique. Chacun apporte son tapis, j'apporte les bâches de sol et les couvertures. Je suis assurée en responsabilité civile professionnelle, y compris en extérieur.\n\nChacun vend le sien : je vends la séance en ligne à 20 € par personne, payée d'avance, et les produits se vendent au marché comme d'habitude. Vous annoncez la date à vos clients et aux producteurs présents, je la publie sur les agendas gratuits de l'Isère et je vous remets les photos prises avec l'accord du groupe.\n\nPourrais-je passer un jour de vente pour choisir l'emplacement avec vous ? Un premier dimanche de marché au printemps me conviendrait bien.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "reygiraud",
    "cat": "producteur",
    "nom": "Ferme Rey-Giraud",
    "lieu": "Tullins",
    "km": 24,
    "prio": 3,
    "gest": "Florian Rey-Giraud",
    "contact": "florianrey-giraud@orange.fr · 06 87 28 02 51",
    "deja": "Visites à la ferme sur réservation, vente directe (bœuf, noix de Grenoble AOP d'octobre à mars, huile de noix)",
    "format": "Balade et pratique dans la noyeraie à la saison du ramassage (octobre), goûter aux noix",
    "prix": "25 €",
    "saison": "Octobre à novembre",
    "src": "https://www.ferme-rey-giraud.fr/",
    "destinataire": {
      "nom": "Florian Rey-Giraud, Ferme Rey-Giraud",
      "email": "florianrey-giraud@orange.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Yoga dans la noyeraie",
      "concept": "Une balade et une séance de yoga doux sous les noyers à la saison du ramassage, puis un goûter aux noix de Grenoble et à l'huile de la ferme. Pour des adultes de la région, en octobre, quand la noyeraie est la plus belle et que la ferme vend ses noix fraîches.",
      "format": "Un samedi après-midi d'octobre ou de novembre, 14 h à 16 h 30, 15 personnes : marche dans la noyeraie (30 min), pratique douce sous les arbres (1 h), goûter aux noix et à l'huile (30 min), passage à la vente directe. Chacun apporte son tapis, bâches et couvertures fournies. Une ou deux dates par automne.",
      "deroule": "Accueil et marche dans la noyeraie (30 min) · pratique douce et respiration sous les noyers (1 h) · goûter aux noix et à l'huile (30 min) · vente directe (30 min)",
      "prix": "25 € par personne, goûter compris, vendus par Maude en ligne ; les noix et l'huile du goûter sont réglées à la ferme à son tarif. Pour 10 participants : 250 € de ventes, dont le goûter, et 10 clients à la vente directe.",
      "gain_lieu": "Quinze clients à la vente directe au moment où les noix fraîches arrivent, une visite de la ferme sous une autre forme, et des photos de la noyeraie remises par Maude.",
      "demande": "Un accord de principe, le montant du goûter par personne, un repérage de la noyeraie en septembre pour choisir la parcelle, et un premier samedi en octobre.",
      "attention": "Octobre = ramassage : ne pas gêner la récolte, choisir une parcelle déjà ramassée ou hors passage des machines. Sol humide et frais en automne : bâches épaisses et couvertures indispensables. Saison courte, deux dates au plus."
    },
    "email": {
      "objet": "Yoga sous les noyers à la saison des noix",
      "corps": "Bonjour Florian,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay. Vous ouvrez la ferme aux visites sur réservation et vous vendez vos noix de Grenoble d'octobre à mars. Je vous propose une visite un peu différente, à la saison du ramassage.\n\nLe format : un samedi après-midi d'octobre, une marche dans la noyeraie, une séance de yoga doux d'une heure sous les arbres, puis un goûter aux noix et à l'huile de la ferme, avant le passage à la vente directe. Quinze personnes, tous niveaux. Chacun apporte son tapis, j'apporte les bâches de sol et les couvertures, utiles sur un sol d'automne. Je suis assurée en responsabilité civile professionnelle, y compris en extérieur.\n\nJe vends les places en ligne, payées d'avance, 25 € par personne goûter compris, et je vous règle les noix et l'huile du goûter à votre tarif. Je publie la date sur les agendas de l'Isère et je vous remets les photos prises avec l'accord du groupe.\n\nPourrais-je venir repérer la noyeraie avec vous en septembre, hors des jours de ramassage ? Un appel de dix minutes suffit pour caler cela.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "gaecrocher",
    "cat": "producteur",
    "nom": "GAEC du Rocher",
    "lieu": "Saint-Geoirs",
    "km": 9,
    "prio": 2,
    "gest": "Christophe et Guillaume Jay (quatre générations)",
    "contact": "contact@fermegaecdurocher.com · 06 12 04 33 57",
    "deja": "Vente directe 7 j/7 en accès libre, boutique en ligne, noix de Grenoble AOP, huile médaillée, lait Saint-Marcellin IGP, ferme HVE",
    "format": "Séance sous les noyers un samedi matin d'automne, puis boutique ; et un partenariat « panier bien-être » (huile de noix + carte de séances) pour les fêtes",
    "prix": "25 €",
    "saison": "Septembre à novembre",
    "src": "https://www.alpes-isere.com/en/sit/gaec-du-rocher-5667143/",
    "destinataire": {
      "nom": "Christophe et Guillaume Jay, GAEC du Rocher",
      "email": "contact@fermegaecdurocher.com",
      "canal": "email"
    },
    "projet": {
      "titre": "Yoga sous les noyers du Rocher",
      "concept": "Une séance de yoga doux sous les noyers un samedi matin d'automne, puis le passage à la boutique de la ferme, à neuf kilomètres de Gillonnay. Et pour les fêtes, un panier « bien-être » qui associe l'huile de noix médaillée de la ferme à une carte de séances de Maude. Pour la clientèle locale de la vente directe.",
      "format": "Un samedi de septembre à novembre, 9 h 30 à 11 h, 15 personnes, pratique sous les noyers (1 h), tisane, boutique. Chacun apporte son tapis, bâches et couvertures fournies. Une à deux dates par automne. Panier de fêtes : huile de noix + carte de séances, vendu à la boutique et en ligne de mi-novembre à Noël.",
      "deroule": "Accueil sous les noyers (10 min) · pratique douce et respiration (50 min) · tisane (10 min) · boutique de la ferme (30 min)",
      "prix": "25 € par personne pour la séance, vendus par Maude en ligne. Pour 10 participants : 250 €, et 10 clients à la boutique. Panier : chacun vend le sien, la ferme son huile et Maude sa carte, prix du panier à composer ensemble.",
      "gain_lieu": "Quinze clients réunis à la boutique un samedi d'automne, un produit de fêtes nouveau pour la vente directe et la boutique en ligne, et des photos de la ferme remises par Maude.",
      "demande": "Un appel pour l'accord de principe et le panier, un repérage des noyers en septembre, un premier samedi en octobre.",
      "attention": "Vente en accès libre 7 j/7 : la boutique n'a pas besoin d'être ouverte spécialement, mais un accueil à la caisse aide à vendre. Automne : sol humide, couvertures. Panier : la carte de séances vendue dans un panier doit être valable au moins six mois, à Gillonnay."
    },
    "email": {
      "objet": "Yoga sous vos noyers, et un panier pour les fêtes",
      "corps": "Bonjour Christophe, bonjour Guillaume,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à neuf kilomètres de votre ferme. Votre vente directe en accès libre, votre boutique en ligne et votre huile de noix médaillée me donnent deux idées pour l'automne.\n\nLa première : une séance de yoga doux d'une heure sous les noyers, un samedi matin d'octobre, pour quinze personnes, puis le passage à la boutique. Chacun apporte son tapis, j'apporte les bâches de sol et les couvertures. Je suis assurée en responsabilité civile professionnelle, y compris en extérieur. Je vends les places en ligne à 25 € par personne, payées d'avance, et la boutique reste à votre main.\n\nLa seconde : un panier de fêtes « bien-être » qui réunit une bouteille de votre huile de noix et une carte de séances chez moi, vendu à la ferme et sur votre boutique en ligne de mi-novembre à Noël. Chacun vend le sien, nous composons le prix ensemble.\n\nAuriez-vous dix minutes au téléphone pour en parler ? Je suis joignable en semaine entre 12 h et 14 h, et je peux venir repérer les noyers en septembre.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "ptitbarru",
    "cat": "producteur",
    "nom": "Le P'tit Barru",
    "lieu": "La Forteresse",
    "km": 12,
    "prio": 2,
    "gest": "Emilien Robin",
    "contact": "leptitbarru@gmail.com · 06 26 37 34 65",
    "deja": "Visite libre et gratuite de la ferme (56 chèvres), magasin fermier de 18 h à 19 h mercredi, vendredi et samedi avec des produits d'autres producteurs, marché de Saint-Étienne-de-Saint-Geoirs le lundi matin",
    "format": "« Yoga du soir puis magasin » à 17 h un vendredi, dans le vallon de la ferme ; les clientes du magasin sont déjà là à 18 h",
    "prix": "20 €",
    "saison": "Mai à septembre",
    "src": "https://www.alpes-isere.com/en/sit/le-ptit-barru-115158/",
    "destinataire": {
      "nom": "Emilien Robin, Le P'tit Barru",
      "email": "leptitbarru@gmail.com",
      "canal": "email"
    },
    "projet": {
      "titre": "Yoga du soir au P'tit Barru",
      "concept": "Une séance de yoga doux à 17 h un vendredi, dans le vallon de la ferme, qui s'achève à l'ouverture du magasin fermier de 18 h. Pour les clientes et clients du magasin, déjà là le vendredi soir, et pour les habitants de La Forteresse et des environs, à douze kilomètres de Gillonnay.",
      "format": "Un vendredi de 17 h à 18 h, 15 personnes, pratique dans le vallon de la ferme, puis magasin de 18 h à 19 h. Chacun apporte son tapis, bâches et couvertures fournies. Un vendredi par mois de mai à septembre.",
      "deroule": "Accueil dans le vallon (10 min) · pratique douce et respiration (45 min) · tisane (5 min) · magasin fermier avec les produits des autres producteurs (18 h à 19 h)",
      "prix": "20 € par personne pour la séance, vendus par Maude en ligne. Les produits se vendent au magasin, au tarif de la ferme. Pour 10 participants : 200 € de séance, et 10 clients au magasin dès 18 h.",
      "gain_lieu": "Quinze clients qui arrivent à l'ouverture du magasin un vendredi soir, une animation régulière à annoncer au marché du lundi, et des photos de la ferme remises par Maude.",
      "demande": "Un accord de principe, un repérage du vallon pour choisir l'emplacement, et un premier vendredi en mai. Communication croisée : la ferme l'annonce au magasin et au marché, Maude sur les agendas.",
      "attention": "Le magasin n'ouvre qu'une heure : la séance doit finir à 18 h précises. Vallon : pente, sol, ombre en été à vérifier. Chèvres en visite libre, à distance pendant la pratique."
    },
    "email": {
      "objet": "Une séance de yoga avant l'ouverture du magasin",
      "corps": "Bonjour Emilien,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à douze kilomètres de votre ferme. Votre magasin fermier ouvre de 18 h à 19 h le vendredi, et vos clients sont là à cette heure. Je vous propose de leur offrir une heure de plus, juste avant.\n\nLe format : une séance de yoga doux d'une heure à 17 h, un vendredi, dans le vallon de la ferme, pour quinze personnes, qui se termine à l'ouverture du magasin. Un yoga accessible à tous, sans rien d'ésotérique. Chacun apporte son tapis, j'apporte les bâches de sol. Je suis assurée en responsabilité civile professionnelle, y compris en extérieur.\n\nChacun vend le sien : je vends la séance en ligne à 20 € par personne, payée d'avance, et le magasin reste à votre main. Vous annoncez la date au magasin et au marché du lundi, je la publie sur les agendas gratuits de l'Isère et je vous remets les photos prises avec l'accord du groupe.\n\nPourrais-je passer un soir d'ouverture du magasin pour repérer le vallon avec vous ? Un premier vendredi en mai me conviendrait bien.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "tarmarin",
    "cat": "producteur",
    "nom": "Tarmarin terres d'arômes",
    "lieu": "Saint-Geoirs",
    "km": 9,
    "prio": 1,
    "gest": "Cat Kessler",
    "contact": "cat.kessler@outlook.fr · 06 73 17 08 66",
    "deja": "Plantes aromatiques et médicinales séchées, tisanes, sirops l'été, paniers et balais artisanaux, sans engrais chimique ; vente sur place sur rendez-vous et sur les marchés, entrée libre",
    "format": "Atelier « yoga et tisanes » de 2 h : pratique dans le champ de plantes, cueillette et dégustation guidée par Cat ; deux intervenantes, un format à 35 €",
    "prix": "35 €",
    "saison": "Juin à septembre",
    "src": "https://www.alpes-isere.com/en/sit/tarmarin-terres-daromes-6360223/",
    "destinataire": {
      "nom": "Cat Kessler, Tarmarin terres d'arômes",
      "email": "cat.kessler@outlook.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Yoga et tisanes chez Tarmarin",
      "concept": "Un atelier de deux heures à deux voix dans le champ de plantes aromatiques et médicinales : une séance de yoga doux guidée par Maude, puis une cueillette et une dégustation de tisanes guidées par Cat. Pour des adultes curieux des plantes et du souffle, à neuf kilomètres de Gillonnay.",
      "format": "Un samedi de 9 h 30 à 11 h 30, 12 personnes, pratique dans le champ (1 h), cueillette avec Cat (30 min), dégustation de tisanes et sirops (30 min), boutique sur place. Chacun apporte son tapis, bâches fournies. Un samedi par mois de juin à septembre.",
      "deroule": "Accueil au champ (10 min) · pratique douce et respiration parmi les plantes (50 min) · cueillette guidée par Cat (30 min) · dégustation de tisanes et sirops, boutique (30 min)",
      "prix": "35 € par personne, atelier à deux intervenantes, vendus par Maude en ligne et partagés avec Cat pour sa part (cueillette, dégustation, plantes), à convenir. Pour 10 participants : 350 € à partager.",
      "gain_lieu": "Une rémunération pour la partie plantes, douze clients à la boutique par date, et un format que Cat peut annoncer sur ses marchés. Photos du champ remises par Maude.",
      "demande": "Un appel pour le partage du prix et le contenu de la partie plantes, un repérage du champ en mai, et un premier samedi en juin.",
      "attention": "Deux intervenantes sur 35 € : marge à partager, vérifier que le format tient pour chacune. Entrée libre mais vente sur rendez-vous : caler la boutique. Champ : pas d'ombre citée, matinée obligatoire en été."
    },
    "email": {
      "objet": "Un atelier yoga et tisanes dans votre champ",
      "corps": "Bonjour Cat,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à neuf kilomètres de chez vous. Vos plantes aromatiques et médicinales, vos tisanes et vos sirops d'été me donnent envie d'un atelier à deux voix, la vôtre et la mienne.\n\nLe format : deux heures un samedi matin de juin à septembre, pour douze personnes. Une séance de yoga doux d'une heure dans le champ, au milieu des plantes, puis une cueillette et une dégustation de tisanes que vous guidez. La tisane fait déjà partie de mes séances. Chacun apporte son tapis, j'apporte les bâches de sol. Je suis assurée en responsabilité civile professionnelle, y compris en extérieur.\n\nJe vends les places en ligne, payées d'avance, 35 € par personne, et nous partageons selon la part de chacune, à convenir ensemble. Je publie la date sur les agendas de l'Isère, vous l'annoncez sur vos marchés, et je vous remets les photos prises avec l'accord du groupe.\n\nAuriez-vous dix minutes au téléphone pour en parler ? Je suis joignable en semaine entre 12 h et 14 h, et je peux venir voir le champ un matin de mai.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "sauvagere",
    "cat": "hebergeur",
    "nom": "Gîte de la Sauvagère",
    "lieu": "Chélieu",
    "km": 30,
    "prio": 3,
    "gest": "Gîte rural 3 étoiles (Gîtes de France n° 38G98100), 12 personnes",
    "contact": "Formulaire sur gitelasauvagere.fr (pas de téléphone ni d'email affiché)",
    "deja": "Salon de 47 m², cuisine équipée, 5 chambres, jardin sous un platane de 75 ans, vue sur la Bourbre et la Chartreuse ; tarifs sur demande",
    "format": "Retraite de week-end pour 10 à 12 personnes en autonomie, pratique dans le salon de 47 m² ou sous le platane",
    "prix": "300 à 345 € le week-end",
    "saison": "Avril à octobre",
    "src": "https://gitelasauvagere.fr/",
    "destinataire": {
      "nom": "Gîte de la Sauvagère",
      "email": null,
      "canal": "formulaire (gitelasauvagere.fr)"
    },
    "projet": {
      "titre": "Retraite sous le platane",
      "concept": "Un week-end de yoga doux pour dix à douze personnes, en autonomie dans le gîte, avec la pratique dans le salon de 47 m² ou sous le platane du jardin, face à la Bourbre et à la Chartreuse. Pour des adultes qui veulent deux jours de calme dans un gîte de caractère, sans ésotérisme.",
      "format": "Du vendredi soir au dimanche après-midi, 10 à 12 personnes dans les 5 chambres, quatre temps de pratique (salon de 47 m² ou jardin), repas préparés ensemble dans la cuisine équipée. Chacun apporte son tapis. Deux à trois week-ends par an d'avril à octobre, hors haute saison en priorité.",
      "deroule": "Vendredi 18 h arrivée et séance d'ouverture au salon (1 h) · samedi matin pratique sous le platane (1 h 30) · samedi après-midi marche et respiration (1 h) · dimanche matin pratique et méditation (1 h 30) · dimanche 14 h clôture (30 min)",
      "prix": "300 à 345 € par personne le week-end, hébergement et enseignement compris, le niveau exact dépendant du tarif du gîte sur deux nuits. Pour 10 participants : 3 000 à 3 450 € de ventes, dont la location réglée au gîte.",
      "gain_lieu": "Le gîte loué complet sur un week-end hors saison, par un groupe qui revient si le lieu plaît, et une visibilité nouvelle par les agendas et les photos remises par Maude.",
      "demande": "Les disponibilités hors saison (avril-mai, septembre-octobre), le tarif pour 12 personnes sur deux nuits, et si le salon se libère de son mobilier pour dix tapis. Un repérage sur place.",
      "attention": "Pas de téléphone ni d'email affiché : premier contact par le formulaire du site, relance possible seulement s'ils répondent. Salon de 47 m² : dix à douze tapis tiennent si le mobilier se déplace, à vérifier. Tarifs sur demande : le prix final dépend de leur réponse."
    },
    "email": {
      "objet": "Un week-end de yoga dans votre gîte",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, troisième saison à l'Espace Montgontier. Votre gîte de douze personnes, son salon de 47 m² et son jardin sous le platane, face à la Bourbre et à la Chartreuse, m'ont donné l'idée de vous écrire.\n\nCe que je propose : un week-end de retraite du vendredi soir au dimanche après-midi pour dix à douze personnes, en autonomie dans le gîte. Quatre temps de pratique douce, respiration et méditation, dans le salon ou sous le platane, des repas préparés ensemble. Chacun apporte son tapis, je viens avec le matériel de sol. Je suis assurée en responsabilité civile professionnelle, y compris hors salle.\n\nJe vends les places en ligne, payées d'avance, entre 300 et 345 € par personne selon votre tarif, et je vous règle la location. Je publie le week-end sur les agendas de l'Isère et je vous remets les photos du groupe.\n\nPourriez-vous m'indiquer vos disponibilités hors saison, votre tarif pour douze personnes sur deux nuits, et si le salon se libère de son mobilier pour dix tapis ? Je peux venir repérer les lieux un matin.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "alpins",
    "cat": "producteur",
    "nom": "Domaine Les Alpins",
    "lieu": "La Buisse (vignes à Saint-Cassien et Saint-Jean-de-Moirans)",
    "km": 33,
    "prio": 2,
    "gest": "Sébastien Bénard",
    "contact": "06 52 71 53 99 · 1052 route de Champ Chabert (pas d'email affiché)",
    "deja": "Vignoble bio en cépages anciens (Verdesse, Persan), caveau le mercredi soir et le samedi matin, dégustations et apéros fermiers ; le seul vigneron trouvé dans le Voironnais",
    "format": "« Yoga dans les vignes » un samedi matin de juin ou aux vendanges, puis dégustation au caveau. Personne ne le propose entre Lyon et Grenoble",
    "prix": "35 €",
    "saison": "Juin, septembre",
    "src": "https://tourisme.paysvoironnais.com/producteur/vente-de-vin-au-domaine-les-alpins/",
    "destinataire": {
      "nom": "Sébastien Bénard, Domaine Les Alpins",
      "email": null,
      "canal": "telephone (06 52 71 53 99)"
    },
    "projet": {
      "titre": "Yoga dans les vignes des Alpins",
      "concept": "Une séance de yoga doux entre les rangs de vigne un samedi matin, en juin quand la vigne est verte ou en septembre aux vendanges, puis la dégustation au caveau. Pour des adultes de la région qui aiment le vin et la nature, avec un vignoble bio en cépages anciens comme décor.",
      "format": "Un samedi de 9 h 30 à 11 h 30, 15 personnes, pratique dans les vignes de Saint-Cassien ou Saint-Jean-de-Moirans (1 h), puis dégustation au caveau de La Buisse (45 min). Chacun apporte son tapis, bâches fournies. Une date en juin, une en septembre.",
      "deroule": "Accueil dans les vignes (10 min) · pratique douce et respiration entre les rangs (50 min) · tisane (10 min) · dégustation et caveau (45 min)",
      "prix": "35 € par personne, dégustation comprise, vendus par Maude en ligne ; la dégustation est réglée au domaine à son tarif. Pour 10 participants : 350 € de ventes, dont la part dégustation, et 10 clients au caveau.",
      "gain_lieu": "Quinze clients au caveau un samedi matin, une animation que le domaine peut annoncer à ses apéros fermiers, et des photos des vignes remises par Maude.",
      "demande": "Un appel pour l'accord de principe et le montant de la dégustation par personne, un repérage des vignes au printemps, et une première date en juin.",
      "attention": "Les vignes et le caveau ne sont pas au même endroit (La Buisse, Saint-Cassien, Saint-Jean-de-Moirans) : prévoir le déplacement entre les deux. Septembre = vendanges, ne pas gêner le travail. Pas d'email : premier contact par téléphone, l'email sert de support à remettre."
    },
    "email": {
      "objet": "Yoga dans vos vignes, puis dégustation au caveau",
      "corps": "Bonjour Sébastien,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay. Vous êtes le seul vigneron que j'aie trouvé dans le Voironnais, avec un vignoble bio en cépages anciens, un caveau et des apéros fermiers. Je vous propose une matinée dans vos vignes.\n\nLe format : une séance de yoga doux d'une heure entre les rangs, un samedi matin de juin ou de septembre, pour quinze personnes, puis la dégustation au caveau. Un yoga accessible à tous, le vin vient après. Chacun apporte son tapis, j'apporte les bâches de sol. Je suis assurée en responsabilité civile professionnelle, y compris en extérieur.\n\nJe vends les places en ligne, payées d'avance, 35 € par personne dégustation comprise, et je vous règle la dégustation à votre tarif. Je publie la date sur les agendas de l'Isère, vous l'annoncez à vos clients du caveau, et je vous remets les photos prises avec l'accord du groupe.\n\nPourrions-nous en parler dix minutes au téléphone ? Je suis joignable en semaine entre 12 h et 14 h, et je peux venir repérer les vignes un samedi matin au printemps.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "attractyves",
    "cat": "producteur",
    "nom": "Microbrasserie L'Attract'Yves",
    "lieu": "Coublevie",
    "km": 32,
    "prio": 3,
    "gest": "Yves Dyon",
    "contact": "attract.yves@gmail.com · 06 32 06 13 68",
    "deja": "Visites guidées gratuites sur rendez-vous, groupes jusqu'à 25, ouvert du mardi au samedi en fin d'après-midi",
    "format": "Soirée « yoga puis bière » pour un groupe de 15 à 20, visite comprise",
    "prix": "30 €",
    "saison": "Toute l'année",
    "src": "https://www.chartreuse-tourisme.com/en/offers/lattractyves-microbrewery-coublevie-en-2716846/",
    "destinataire": {
      "nom": "Yves Dyon, Microbrasserie L'Attract'Yves",
      "email": "attract.yves@gmail.com",
      "canal": "email"
    },
    "projet": {
      "titre": "Soirée yoga puis bière",
      "concept": "Une soirée en deux temps à la microbrasserie : une séance de yoga doux, puis la visite guidée et la dégustation. Pour un groupe de 15 à 20 adultes de Coublevie et du Voironnais, un format convivial qui se fait toute l'année puisque la brasserie reçoit des groupes jusqu'à 25.",
      "format": "Un vendredi ou samedi de 17 h 30 à 20 h, 15 à 20 personnes, pratique sur place (1 h, dans un espace de la brasserie ou dehors selon la place, à voir au repérage), visite guidée (45 min), dégustation (45 min). Chacun apporte son tapis, bâches fournies. Une date par trimestre, toute l'année.",
      "deroule": "Accueil (10 min) · pratique douce et respiration (50 min) · visite guidée de la brasserie (45 min) · dégustation (45 min)",
      "prix": "30 € par personne, visite et dégustation comprises, vendus par Maude en ligne ; la dégustation est réglée à la brasserie à son tarif. Pour 10 participants : 300 € de ventes, dont la part brasserie. À 20 personnes : 600 €.",
      "gain_lieu": "Un groupe de quinze à vingt à la dégustation un soir de semaine ou de week-end, une animation nouvelle à annoncer, et des photos remises par Maude.",
      "demande": "Un accord de principe, le montant de la part brasserie par personne, un repérage de l'espace disponible pour vingt tapis, et une première date.",
      "attention": "L'espace de pratique n'est pas connu : vingt tapis demandent au moins 60 m² ou un extérieur. Alcool après la pratique, jamais avant, à écrire dans l'annonce. Ouverture en fin d'après-midi seulement : l'horaire doit coller à leurs heures."
    },
    "email": {
      "objet": "Une soirée yoga puis dégustation à la brasserie",
      "corps": "Bonjour Yves,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay. Vous recevez des groupes jusqu'à vingt-cinq en visite guidée, en fin d'après-midi du mardi au samedi. Je vous propose de faire venir un groupe complet pour une soirée en deux temps.\n\nLe format : une séance de yoga doux d'une heure sur place, un vendredi ou un samedi vers 17 h 30, pour quinze à vingt personnes, puis votre visite guidée et la dégustation. Un yoga accessible à tous, la bière vient après, jamais avant. Chacun apporte son tapis, j'apporte les bâches de sol si nous pratiquons dehors. Je suis assurée en responsabilité civile professionnelle, y compris hors salle.\n\nJe vends les places en ligne, payées d'avance, 30 € par personne visite et dégustation comprises, et je vous règle la dégustation à votre tarif. Je publie la date sur les agendas de l'Isère et je vous remets les photos prises avec l'accord du groupe.\n\nPourrais-je passer un après-midi d'ouverture pour voir l'espace disponible pour vingt tapis ? Un appel de dix minutes suffit pour caler cela, je suis joignable en semaine entre 12 h et 14 h.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "coindeterroir",
    "cat": "producteur",
    "nom": "Un Coin de Terroir, magasin de producteurs",
    "lieu": "Saint-Jean-de-Bournay",
    "km": 20,
    "prio": 3,
    "gest": "Magasin de 80 producteurs",
    "contact": "uncoindeterroir@yahoo.fr · 06 65 52 28 94 (guide des producteurs Bièvre Isère)",
    "deja": "Ouvert du mardi au samedi, 108 chemin du Reposu",
    "format": "Partenaire « panier » et affichage : petit-déjeuner ou collation composés au magasin pour les séances des fermes voisines, flyers en caisse",
    "prix": "Partenariat",
    "saison": "Toute l'année",
    "src": "https://www.marchedeshalles.fr/marches-alimentaires/38399-saint-jean-de-bournay/fheaajghgbhiddjjejg.htm",
    "destinataire": {
      "nom": "Un Coin de Terroir, magasin de producteurs",
      "email": "uncoindeterroir@yahoo.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Le panier des séances",
      "concept": "Un partenariat simple avec le magasin de producteurs de Saint-Jean-de-Bournay : le petit-déjeuner ou la collation des séances de yoga que Maude monte dans les fermes voisines est composé au magasin, et les flyers des séances sont en caisse. Pour les clients du magasin, qui découvrent les séances, et pour les participants, qui découvrent le magasin.",
      "format": "Une commande de collation par séance (10 à 15 personnes), passée une semaine à l'avance, retirée au magasin le matin de la séance. Flyers en caisse à chaque nouvelle date. Toute l'année, au rythme des séances.",
      "deroule": "Commande une semaine avant (5 min) · retrait au magasin le matin de la séance (15 min) · collation servie après la pratique (30 min) · flyers de la date suivante déposés en caisse",
      "prix": "Partenariat, pas de séance vendue au magasin : Maude règle la collation au tarif du magasin, le magasin affiche les séances. Pour 10 participants : une commande de collation pour 10 par date.",
      "gain_lieu": "Des commandes groupées régulières, des participants qui découvrent le magasin par la collation, et un affichage réciproque : le magasin est cité sur les annonces des séances.",
      "demande": "Un accord pour composer une collation pour 10 à 15 personnes à la commande, et l'autorisation de déposer des flyers en caisse. Un appel ou un passage au magasin.",
      "attention": "Pas de séance au magasin lui-même : ne rien promettre d'autre que la collation et l'affichage. Produits frais : la commande doit préciser ce qui se garde une matinée dehors. Le magasin réunit 80 producteurs, la composition dépend de la saison."
    },
    "email": {
      "objet": "Vos produits pour les collations de mes séances",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay. Je monte des séances de yoga en plein air dans des fermes et des lieux de la Bièvre et des environs, et chaque séance finit par une tisane et une collation. Votre magasin, ouvert du mardi au samedi avec les produits de quatre-vingts producteurs, serait l'endroit pour la composer.\n\nCe que je vous propose est simple. Pour chaque séance, une commande de collation pour dix à quinze personnes, passée une semaine à l'avance et retirée au magasin le matin même, réglée à votre tarif. En retour, vos produits sont servis et nommés devant les participants, et le magasin est cité sur mes annonces.\n\nEt un affichage réciproque : quelques flyers de mes séances en caisse, renouvelés à chaque date, pour que vos clients les découvrent.\n\nAuriez-vous dix minutes pour en parler, au téléphone ou au magasin ? Je peux passer un matin en semaine, quand cela vous arrange.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "marsias",
    "cat": "producteur",
    "nom": "Ferme de Marsias, À chacun son panier",
    "lieu": "Ornacieux-Balbins",
    "km": 4,
    "prio": 3,
    "gest": "Ferme fruitière bio avec boutique de produits d'autres producteurs",
    "contact": "06 81 50 55 94 · 637 route de Beaurepaire (pas d'email affiché)",
    "deja": "Fruits bio, boutique, retrait des paniers le mercredi et le vendredi",
    "format": "La plus proche de Gillonnay : dépôt de flyers pour les événements, et une séance « yoga au verger » à la saison des fruits",
    "prix": "20 €",
    "saison": "Juin à septembre",
    "src": "https://terres-de-berlioz.com/fiche-sit/F67988_ferme-de-marsias-a-chacun-son-panier-ornacieux-balbins/",
    "destinataire": {
      "nom": "Ferme de Marsias, À chacun son panier",
      "email": null,
      "canal": "telephone (06 81 50 55 94)"
    },
    "projet": {
      "titre": "Yoga au verger de Marsias",
      "concept": "La ferme la plus proche de Gillonnay, à quatre kilomètres : d'abord un dépôt de flyers des séances de Maude à la boutique, puis une séance de yoga doux au verger à la saison des fruits, un soir de retrait des paniers. Pour les clients des paniers et les habitants d'Ornacieux-Balbins.",
      "format": "Un mercredi ou un vendredi de juin à septembre, 18 h à 19 h, 15 personnes, pratique au verger (1 h), puis boutique et retrait des paniers. Chacun apporte son tapis, bâches fournies. Une date par mois en saison ; flyers à la boutique toute l'année.",
      "deroule": "Accueil au verger (10 min) · pratique douce et respiration entre les arbres (45 min) · tisane (5 min) · boutique et paniers",
      "prix": "20 € par personne pour la séance, vendus par Maude en ligne. Les fruits et les paniers se vendent à la boutique, au tarif de la ferme. Pour 10 participants : 200 € de séance, et 10 clients à la boutique. L'affichage ne coûte rien.",
      "gain_lieu": "Une animation de saison à quatre kilomètres, des clients de paniers qui restent une heure de plus, et des flyers d'une voisine plutôt que d'une inconnue. Photos du verger remises par Maude.",
      "demande": "Un passage à la boutique un jour de retrait pour déposer des flyers et se présenter, puis une date au verger en juin.",
      "attention": "Verger bio : pratiquer sur l'herbe, sans rien laisser, hors traitement et hors récolte. Jours de retrait des paniers : la boutique est occupée, la séance doit finir avant l'affluence. Pas d'email : premier contact par téléphone ou sur place."
    },
    "email": {
      "objet": "Des flyers à la boutique, et une séance au verger",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à quatre kilomètres de votre ferme, la plus proche de mon studio, avec sa boutique et le retrait des paniers le mercredi et le vendredi. Je vous écris pour deux choses.\n\nLa première : déposer quelques flyers de mes séances à la boutique, pour vos clients des paniers, et citer votre ferme sur mes annonces en retour. La seconde : une séance de yoga doux d'une heure au verger, à la saison des fruits, un soir de retrait des paniers à 18 h, pour quinze personnes qui font ensuite leurs courses chez vous. Chacun apporte son tapis, j'apporte les bâches. Je suis assurée en responsabilité civile professionnelle, y compris en extérieur.\n\nJe vends la séance en ligne à 20 € par personne, payée d'avance, la boutique et les paniers restent à votre main. Je publie la date sur les agendas de l'Isère et je vous remets les photos prises avec l'accord du groupe.\n\nPuis-je passer à la boutique un jour de retrait pour me présenter et vous montrer les flyers ? Un mercredi en fin d'après-midi me convient.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "chapel",
    "cat": "pro",
    "nom": "Chapel Hydraulique",
    "lieu": "Apprieu (parc Bièvre Dauphine)",
    "km": 14,
    "prio": 2,
    "gest": "Vérins et composants hydrauliques, groupe Estève, 200 à 249 salariés",
    "contact": "04 76 07 20 46 · 1225 rue Alphonse Gourju (pas d'email affiché)",
    "deja": "Site industriel, le plus gros employeur privé du parc Bièvre Dauphine",
    "format": "Atelier « dos et souffle » de 45 min sur la pause déjeuner, en cycle de 6, pour des équipes d'atelier et de bureau",
    "prix": "Séance découverte 180 € ; programme 4 séances 1 400 à 1 600 €",
    "saison": "Toute l'année",
    "src": "https://www.chapel-hydraulique.com/",
    "destinataire": {
      "nom": "Chapel Hydraulique, service RH",
      "email": null,
      "canal": "telephone 04 76 07 20 46 (pas d'email affiché)"
    },
    "projet": {
      "titre": "Dos et souffle à l'atelier",
      "concept": "Un atelier de yoga « dos et souffle » sur la pause déjeuner pour les salariés de Chapel Hydraulique, équipes d'atelier et de bureau. Le plus gros employeur privé du parc Bièvre Dauphine, à quatorze kilomètres de Gillonnay : des postes physiques d'un côté, des postes assis de l'autre, et le même dos qui fatigue.",
      "format": "45 minutes sur la pause déjeuner, groupe de 8 à 15 personnes, dans une salle de réunion ou un espace dégagé du site. Cycle de 6 séances, toute l'année. Bâches de sol apportées, chacun vient comme il est, sans se changer.",
      "deroule": "Accueil et prise de posture assise, 5 min · Mobilisation douce du dos et des épaules, 20 min · Respiration guidée, 10 min · Retour au calme, 7 min · Mot de fin et reprise, 3 min",
      "prix": "Séance découverte 180 € facturée à l'entreprise (grille de pro.maude-yoga.com) ; programme de 4 séances sur 2 mois de 1 400 à 1 600 € ; interventions de 2 h à une journée de 350 à 2 200 €.",
      "gain_lieu": "Une action de qualité de vie au travail visible et simple à mettre en place, un geste pour les dos des équipes d'atelier et des bureaux, sans déplacement ni matériel.",
      "demande": "Un appel de dix minutes pour identifier l'interlocuteur (direction, ressources humaines ou CSE), puis un midi de repérage sur site avant fin octobre.",
      "attention": "Pas d'adresse email affichée : le premier contact passe par le standard, il faut trouver la bonne personne. Les horaires de pause d'un site industriel sont fixes, le créneau doit coller au planning des équipes."
    },
    "email": {
      "objet": "Yoga sur site pour Chapel Hydraulique",
      "corps": "Bonjour,\n\nProfesseure de yoga à Gillonnay, à quatorze kilomètres d'Apprieu, j'interviens sur le lieu de travail avec du yoga et de la respiration. Je vous écris parce que Chapel Hydraulique réunit usinage, montage et bureaux d'études sur le parc Bièvre Dauphine.\n\nJe propose une séance découverte sur site, de 45 minutes à 1 heure, à la pause déjeuner ou en fin de poste, pour 6 à 20 personnes, à 180 euros, adaptée aux deux publics : dos et récupération pour l'atelier, écrans et pression pour les bureaux d'études. Si l'équipe accroche, un programme de 4 séances sur 2 mois prend le relais.\n\nVos salariés repartent avec des gestes simples à refaire à leur poste.\n\nSi ce n'est pas vous, merci de transmettre à la personne en charge de la QVT ou du CSE. Quinze minutes au téléphone, en semaine après 13 h, suffisent pour caler une date.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · pro.maude-yoga.com"
    }
  },
  {
    "id": "centralp",
    "cat": "pro",
    "nom": "Association des entreprises de Centr'Alp",
    "lieu": "Moirans",
    "km": 30,
    "prio": 1,
    "gest": "Association de 200 entreprises adhérentes (Schneider Electric, Thales, Trixell, Poma, Radiall, Rio Tinto…), qui propose des activités aux salariés ; directrice Audrey Savignon, communication et événements Marion Soriteau",
    "contact": "audrey.savignon@association-centralp.com · marion.soriteau@association-centralp.com · 06 18 20 76 73",
    "deja": "Activités culturelles et sportives proposées aux salariés de la zone, annuaire des entreprises, événements",
    "format": "Un cycle « yoga du midi » ouvert aux salariés de la zone (une salle prêtée par l'association ou une entreprise), 45 min hebdomadaires, 12 à 15 personnes ; la porte d'entrée vers cinq entreprises de 250 à 499 salariés",
    "prix": "Séance découverte 180 € ; programme 4 séances 1 400 à 1 600 €",
    "saison": "Septembre à juin",
    "src": "https://associationcentralp.fr/contactez-nous/",
    "destinataire": {
      "nom": "Association des entreprises de Centr'Alp, Marion Soriteau, communication et événements ; Audrey Savignon, directrice",
      "email": "marion.soriteau@association-centralp.com",
      "canal": "email"
    },
    "projet": {
      "titre": "Le yoga du midi de Centr'Alp",
      "concept": "Un cycle hebdomadaire de yoga sur la pause déjeuner, ouvert aux salariés de toutes les entreprises adhérentes de l'association. L'association propose déjà des activités culturelles et sportives aux salariés de la zone : le yoga du midi s'y ajoute sans que chaque entreprise ait à l'organiser seule.",
      "format": "45 minutes une fois par semaine, 12 à 15 personnes, dans une salle prêtée par l'association ou par l'une des entreprises de la zone. De septembre à juin, par trimestres de dix séances. Chacun apporte son tapis, bâches de sol fournies, sans tenue particulière.",
      "deroule": "Accueil et installation, 5 min · Mobilisation du dos et des épaules, 15 min · Postures debout et équilibre, 10 min · Respiration, 10 min · Retour au calme, 5 min",
      "prix": "Séance découverte 180 € facturée à l'entreprise (grille de pro.maude-yoga.com) ; programme de 4 séances sur 2 mois de 1 400 à 1 600 € ; interventions de 2 h à une journée de 350 à 2 200 €.",
      "gain_lieu": "Une activité de plus au catalogue proposé aux salariés, mutualisée entre les entreprises adhérentes, et une porte d'entrée pour des ateliers en entreprise chez les plus grosses structures de la zone.",
      "demande": "Un appel de dix minutes avec la directrice ou la chargée d'événements, puis un repérage de la salle, pour ouvrir un premier trimestre avant la Toussaint.",
      "attention": "Il faut une salle disponible chaque semaine au même créneau, prêtée par l'association ou une entreprise. Le mode de facturation (association ou par salarié) doit être fixé avant l'ouverture des inscriptions."
    },
    "email": {
      "objet": "Un cycle de yoga du midi pour Centr'Alp",
      "corps": "Bonjour,\n\nProfesseure de yoga à Gillonnay, j'interviens sur le lieu de travail avec du yoga et de la respiration. Je vous écris parce que vous portez la communication et les événements de l'association, qui propose déjà des activités culturelles et sportives aux salariés de Centr'Alp : un cycle de yoga du midi ouvert à plusieurs entreprises adhérentes y entre naturellement.\n\nJe propose une séance découverte de 45 minutes à 1 heure, à la pause déjeuner, dans une salle de l'association ou d'une entreprise adhérente, pour 6 à 20 personnes, à 180 euros : respiration et dos après des heures sur écran ou en atelier. Ensuite, un cycle de 4 séances sur 2 mois, ouvert à plusieurs entreprises à la fois.\n\nVos adhérents y gagnent une activité de plus pour leurs salariés, sans rien organiser.\n\nQuinze minutes au téléphone, en semaine après 13 h, suffisent pour caler une date.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · pro.maude-yoga.com"
    }
  },
  {
    "id": "smoc",
    "cat": "pro",
    "nom": "SMOC Industries",
    "lieu": "Tullins",
    "km": 25,
    "prio": 3,
    "gest": "Broches et outillage, environ 92 collaborateurs",
    "contact": "04 76 07 01 47 · smoc-industries.fr",
    "deja": "Industrie de précision (aéronautique, automobile, énergie)",
    "format": "Atelier « dos et souffle » de 45 min, cycle de 6",
    "prix": "Séance découverte 180 € ; programme 4 séances 1 400 à 1 600 €",
    "saison": "Toute l'année",
    "src": "https://www.lindustrie-recrute.fr/entreprise/5108/",
    "destinataire": {
      "nom": "SMOC Industries, direction",
      "email": null,
      "canal": "telephone 04 76 07 01 47 (smoc-industries.fr)"
    },
    "projet": {
      "titre": "Dos et souffle chez SMOC",
      "concept": "Un atelier de yoga « dos et souffle » pour les collaborateurs de SMOC Industries, industrie de précision pour l'aéronautique, l'automobile et l'énergie. Un travail d'attention et de postures tenues, qui pèse sur le dos et les épaules : l'atelier vise exactement ça.",
      "format": "45 minutes sur la pause déjeuner ou en fin de poste, groupe de 8 à 15 volontaires, dans une salle de réunion ou un espace dégagé du site. Cycle de 6 séances, toute l'année. Bâches de sol apportées, sans se changer.",
      "deroule": "Accueil et prise de posture, 5 min · Mobilisation douce du dos et des épaules, 20 min · Respiration guidée, 10 min · Retour au calme, 7 min · Mot de fin, 3 min",
      "prix": "Séance découverte 180 € facturée à l'entreprise (grille de pro.maude-yoga.com) ; programme de 4 séances sur 2 mois de 1 400 à 1 600 € ; interventions de 2 h à une journée de 350 à 2 200 €.",
      "gain_lieu": "Une action concrète pour la santé du dos dans une entreprise d'une petite centaine de personnes, simple à annoncer en interne, sans déplacement ni matériel à prévoir.",
      "demande": "Un appel de dix minutes pour identifier l'interlocuteur, puis un repérage sur site et une première date avant fin novembre.",
      "attention": "Pas d'adresse email affichée, le premier contact passe par le standard. Les horaires de pause d'un site de production laissent peu de marge : le créneau doit être calé sur le planning des équipes."
    },
    "email": {
      "objet": "Yoga du dos pour vos ateliers de précision",
      "corps": "Bonjour,\n\nProfesseure de yoga à Gillonnay, j'interviens sur le lieu de travail avec du yoga et de la respiration, notamment auprès d'une PME industrielle de la région grenobloise. Je vous écris parce que la mécanique de précision, ce sont des journées debout où la concentration ne doit pas lâcher, et que Tullins est à moins de trente minutes de chez moi.\n\nJe propose une séance découverte sur site, de 45 minutes à 1 heure, en fin de poste ou à la pause déjeuner, pour 6 à 20 personnes, à 180 euros : dos, épaules et récupération, et une respiration qui aide à retrouver l'attention. Si l'équipe accroche, un programme de 4 séances sur 2 mois prend le relais.\n\nVos collaborateurs repartent avec quelques gestes simples, à refaire au poste ou chez eux.\n\nQuinze minutes au téléphone, en semaine après 13 h, suffisent pour caler une date.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · pro.maude-yoga.com"
    }
  },
  {
    "id": "poma",
    "cat": "pro",
    "nom": "POMA, siège",
    "lieu": "Voreppe",
    "km": 35,
    "prio": 3,
    "gest": "Remontées mécaniques, 250 à 499 salariés au siège",
    "contact": "04 76 28 70 00 · formulaire poma.net",
    "deja": "Siège social, bureaux d'études",
    "format": "Atelier QVT « bureaux et écrans » de 45 min, cycle de 6, via le CSE",
    "prix": "Séance découverte 180 € ; programme 4 séances 1 400 à 1 600 €",
    "saison": "Toute l'année",
    "src": "https://www.poma.net/contact/",
    "destinataire": {
      "nom": "POMA, siège, service RH ou CSE",
      "email": null,
      "canal": "formulaire poma.net (téléphone 04 76 28 70 00)"
    },
    "projet": {
      "titre": "Bureaux et écrans au siège POMA",
      "concept": "Un atelier de yoga « bureaux et écrans » pour les salariés du siège de POMA à Voreppe, bureaux d'études et fonctions support. Plusieurs centaines de personnes assises devant un écran toute la journée : nuque, épaules et dos sont les premiers à le sentir.",
      "format": "45 minutes sur la pause déjeuner, groupe de 10 à 15 personnes, dans une salle de réunion du siège. Cycle de 6 séances, toute l'année, porté par le CSE au titre de la qualité de vie au travail. Bâches de sol apportées, sans se changer.",
      "deroule": "Accueil et posture assise, 5 min · Nuque et épaules, 12 min · Dos et hanches, 13 min · Respiration, 10 min · Retour au calme, 5 min",
      "prix": "Séance découverte 180 € facturée à l'entreprise (grille de pro.maude-yoga.com) ; programme de 4 séances sur 2 mois de 1 400 à 1 600 € ; interventions de 2 h à une journée de 350 à 2 200 €.",
      "gain_lieu": "Une action QVT prête à annoncer aux salariés du siège, sans logistique de leur côté, et un cycle court qui se renouvelle si le groupe suit.",
      "demande": "Que le message soit transmis à la personne qui suit la qualité de vie au travail (CSE ou ressources humaines), puis un appel de dix minutes et un repérage de la salle.",
      "attention": "Le contact passe par un formulaire générique : le message doit trouver le CSE ou les RH, sinon il se perd. Un siège de cette taille peut avoir un prestataire bien-être déjà en place, à vérifier au premier appel."
    },
    "email": {
      "objet": "Yoga du midi pour le siège de POMA",
      "corps": "Bonjour,\n\nProfesseure de yoga à Gillonnay, j'interviens sur le lieu de travail avec du yoga et de la respiration, notamment auprès d'une scale-up tech grenobloise. Je vous écris parce que le siège de POMA réunit à Voreppe plusieurs centaines de personnes sur écran, avec un CSE.\n\nJe propose une séance découverte sur site, de 45 minutes à 1 heure, à la pause déjeuner ou en fin de journée, pour 6 à 20 personnes, à 180 euros, pensée pour les journées sur écran : nuque, épaules, dos, et une respiration qui fait redescendre la pression. Si l'équipe accroche, un programme de 4 séances sur 2 mois prend le relais.\n\nVos collaborateurs repartent avec des gestes simples à refaire à leur poste.\n\nSi ce n'est pas vous, merci de transmettre à la personne en charge de la QVT ou du CSE. Quinze minutes au téléphone, en semaine après 13 h, suffisent pour caler une date.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · pro.maude-yoga.com"
    }
  },
  {
    "id": "terrassessure",
    "cat": "pro",
    "nom": "EHPAD Les Terrasses de la Sure",
    "lieu": "Moirans",
    "km": 30,
    "prio": 2,
    "gest": "Public, direction commune avec le centre hospitalier de Tullins, 102 chambres, unité Alzheimer, accueil de jour",
    "contact": "accueil@ehpadmoirans.fr · 04 76 35 46 44",
    "deja": "Accueil de jour, unité Alzheimer",
    "format": "Cycle de yoga adapté sur chaise (10 séances de 45 min) pour les résidents et l'accueil de jour, séance découverte offerte",
    "prix": "70 à 90 € la séance",
    "saison": "Toute l'année",
    "src": "https://www.pour-les-personnes-agees.gouv.fr/annuaire-ehpad-et-maisons-de-retraite/ehpad/isere-38/moirans-38430/ehpad-les-terrasses-de-la-sure/380781674",
    "destinataire": {
      "nom": "EHPAD Les Terrasses de la Sure (direction ou animation)",
      "email": "accueil@ehpadmoirans.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Yoga sur chaise aux Terrasses",
      "concept": "Un cycle de yoga adapté sur chaise pour les résidents et pour l'accueil de jour des Terrasses de la Sure, avec une attention particulière aux personnes de l'unité Alzheimer. Tout se fait assis, à un rythme lent, avec des consignes simples.",
      "format": "10 séances de 45 minutes, un groupe de 6 à 10 personnes, dans une salle d'animation de l'établissement. Un groupe résidents et, si l'équipe le souhaite, un groupe accueil de jour. Toute l'année. Première séance offerte.",
      "deroule": "Accueil et respiration assise, 5 min · Mobilisation des bras, des mains et des épaules, 12 min · Jambes, pieds et dos, 13 min · Temps de calme ou chant à voix basse, 10 min · Mot de fin, 5 min",
      "prix": "Séance découverte offerte, puis 70 à 90 € la séance selon la taille du groupe, facturés à l'établissement sur devis. Un cycle de 10 séances revient à 700 à 900 € pour un groupe de dix résidents.",
      "gain_lieu": "Une animation régulière et douce pour l'unité Alzheimer et l'accueil de jour, portée par une intervenante certifiée, sans matériel ni installation à prévoir.",
      "demande": "Une date pour la séance découverte offerte, ou un échange de dix minutes avec la personne chargée de l'animation, avant fin octobre.",
      "attention": "Les résidents de l'unité Alzheimer demandent des groupes très réduits et la présence d'un membre de l'équipe pendant la séance. Établissement public : la prestation passe par un devis et un bon de commande."
    },
    "email": {
      "objet": "Yoga adapté sur chaise pour vos résidents",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, certifiée en yoga adapté (sur chaise, mobilité réduite). Les Terrasses de la Sure accueillent une unité Alzheimer et un accueil de jour, et c'est pour ces publics que le yoga sur chaise a été pensé : rien ne demande de se lever, tout se fait assis.\n\nJe propose un cycle de 10 séances de 45 minutes, pour un groupe de résidents et pour l'accueil de jour, dans une salle d'animation. Mobilisation douce des bras, des jambes et du dos, respiration, un temps de calme, et un temps de chant à voix basse quand le groupe s'y prête. Je m'appuie sur votre équipe pour composer le groupe.\n\nLa première séance est offerte, pour que vous jugiez sur pièces. Ensuite, chaque séance est facturée entre 70 et 90 € selon la taille du groupe, sur devis. Je suis assurée en responsabilité civile professionnelle.\n\nPourrions-nous fixer cette séance découverte, ou un échange de dix minutes avec la personne chargée de l'animation ? Je suis disponible les mardis et jeudis après-midi.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "brassens",
    "cat": "pro",
    "nom": "Résidence autonomie Georges Brassens",
    "lieu": "Moirans",
    "km": 30,
    "prio": 1,
    "gest": "CCAS de Moirans, 39 appartements, 45 places",
    "contact": "residenceautonomie@ville-moirans.fr · 04 76 35 77 31",
    "deja": "Salle polyvalente de 100 m², animations collectives plusieurs fois par semaine",
    "format": "Yoga adapté hebdomadaire pour des résidents autonomes dans la salle de 100 m², cycle de 10, séance découverte offerte",
    "prix": "70 à 90 € la séance",
    "saison": "Toute l'année",
    "src": "https://www.ville-moirans.fr/ville-solidaire/seniors/la-residence-autonomie-georges-brassens/",
    "destinataire": {
      "nom": "Résidence autonomie Georges Brassens, CCAS de Moirans",
      "email": "residenceautonomie@ville-moirans.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Yoga adapté salle Brassens",
      "concept": "Une séance hebdomadaire de yoga adapté pour les résidents autonomes de la résidence Georges Brassens, dans sa salle polyvalente de 100 m². La résidence y propose déjà des animations collectives plusieurs fois par semaine : le yoga s'ajoute au programme existant.",
      "format": "45 minutes une fois par semaine, 8 à 15 résidents, assis sur chaise ou debout avec appui selon chacun, dans la salle polyvalente. Cycle de 10 séances, toute l'année. Première séance offerte. Aucune tenue particulière, personne ne se met au sol.",
      "deroule": "Accueil et respiration assise, 5 min · Épaules, nuque et dos, 12 min · Hanches, jambes et équilibre avec appui, 13 min · Respiration et temps de calme, 10 min · Mot de fin, 5 min",
      "prix": "Séance découverte offerte, puis 70 à 90 € la séance selon la taille du groupe, facturés au CCAS sur devis. Un cycle de 10 séances revient à 700 à 900 € pour un groupe de dix résidents.",
      "gain_lieu": "Une animation hebdomadaire de plus dans une salle déjà équipée, centrée sur l'équilibre et la souplesse des résidents, portée par une intervenante certifiée.",
      "demande": "Une date pour la séance découverte offerte, sur un créneau libre de la salle polyvalente, avant fin octobre.",
      "attention": "La salle est déjà occupée plusieurs fois par semaine : trouver un créneau régulier qui ne chasse pas une animation existante. Prestation au CCAS : devis et bon de commande."
    },
    "email": {
      "objet": "Un yoga adapté chaque semaine à la résidence",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, certifiée en yoga adapté. La résidence Georges Brassens propose déjà des animations collectives plusieurs fois par semaine dans sa salle polyvalente de 100 m², et c'est exactement l'espace qu'il faut pour un yoga adapté aux seniors autonomes.\n\nJe propose une séance hebdomadaire de 45 minutes, en cycle de 10, assise sur chaise ou debout avec appui selon chacun. Mobilité des épaules, des hanches et du dos, équilibre, respiration, un temps de calme pour finir. Personne n'a besoin de tenue de sport ni de se mettre au sol.\n\nLa première séance est offerte, pour que les résidents et vous jugiez sur pièces. Ensuite, chaque séance est facturée entre 70 et 90 € au CCAS, sur devis, soit 700 à 900 € pour le cycle. Je suis assurée en responsabilité civile professionnelle.\n\nPourrions-nous fixer cette séance découverte à un créneau libre de la salle ? Je suis disponible les mardis et jeudis après-midi, et je peux passer voir la salle avant.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "cazeneuve",
    "cat": "pro",
    "nom": "Résidence autonomie Jules Cazeneuve",
    "lieu": "Tullins",
    "km": 25,
    "prio": 2,
    "gest": "Fondation Partage et Vie, plus de 100 places",
    "contact": "julescazeneuve@fondationpartageetvie.org · 04 76 07 05 13",
    "deja": "Résidence autonomie (seniors autonomes)",
    "format": "Yoga adapté hebdomadaire, cycle de 10, séance découverte offerte",
    "prix": "70 à 90 € la séance",
    "saison": "Toute l'année",
    "src": "https://www.pour-les-personnes-agees.gouv.fr/annuaire-ehpad-et-maisons-de-retraite/residence-autonomie/isere-38/tullins-38210/residence-autonomie-jules-cazeneuve/380786665",
    "destinataire": {
      "nom": "Résidence autonomie Jules Cazeneuve, Fondation Partage et Vie",
      "email": "julescazeneuve@fondationpartageetvie.org",
      "canal": "email"
    },
    "projet": {
      "titre": "Yoga adapté à Cazeneuve",
      "concept": "Une séance hebdomadaire de yoga adapté pour les seniors autonomes de la résidence Jules Cazeneuve, plus de cent places à Tullins. Des personnes qui bougent encore et veulent garder souplesse, équilibre et souffle.",
      "format": "45 minutes une fois par semaine, 8 à 15 résidents, assis sur chaise ou debout avec appui selon chacun, dans une salle de la résidence. Cycle de 10 séances, toute l'année. Première séance offerte. Aucune tenue particulière, personne ne se met au sol.",
      "deroule": "Accueil et respiration assise, 5 min · Épaules, nuque et dos, 12 min · Hanches, jambes et équilibre avec appui, 13 min · Respiration et temps de calme, 10 min · Mot de fin, 5 min",
      "prix": "Séance découverte offerte, puis 70 à 90 € la séance selon la taille du groupe, facturés à la résidence sur devis. Un cycle de 10 séances revient à 700 à 900 € pour un groupe de dix résidents.",
      "gain_lieu": "Une animation hebdomadaire centrée sur l'équilibre et la souplesse, portée par une intervenante certifiée, sans matériel à prévoir pour la résidence.",
      "demande": "Une date pour la séance découverte offerte et un repérage de la salle, avant fin octobre.",
      "attention": "La fiche ne dit pas quelle salle est disponible ni quel est le programme d'animation existant : à voir au repérage. Structure de fondation : le devis peut devoir remonter au siège."
    },
    "email": {
      "objet": "Un yoga adapté hebdomadaire pour vos résidents",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, certifiée en yoga adapté (sur chaise, mobilité réduite). La résidence Jules Cazeneuve accueille plus de cent seniors autonomes, et le yoga adapté s'adresse justement à des personnes qui bougent encore mais veulent garder souplesse, équilibre et souffle.\n\nJe propose une séance hebdomadaire de 45 minutes, en cycle de 10, dans une salle de la résidence. Assis sur chaise ou debout avec appui selon chacun : épaules, hanches, dos, équilibre, respiration, un temps de calme pour finir. Aucune tenue particulière, personne ne se met au sol.\n\nLa première séance est offerte, pour que les résidents et vous jugiez sur pièces. Ensuite, chaque séance est facturée entre 70 et 90 € selon la taille du groupe, sur devis, soit 700 à 900 € pour le cycle. Je suis assurée en responsabilité civile professionnelle.\n\nPourrions-nous fixer cette séance découverte ? Je suis disponible les mardis et jeudis après-midi, et je peux venir voir la salle avant d'arrêter une date.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "charminelle",
    "cat": "pro",
    "nom": "Résidence autonomie Charminelle",
    "lieu": "Voreppe",
    "km": 35,
    "prio": 1,
    "gest": "CCAS de Voreppe, 58 logements",
    "contact": "04 76 50 21 65 · 64 avenue Honoré de Balzac (pas d'email affiché)",
    "deja": "Ateliers hebdomadaires (chorale, mémoire, aquarelle), et la résidence est ouverte aux seniors extérieurs pour les repas et certaines activités",
    "format": "Yoga adapté hebdomadaire ouvert aux seniors de la ville, dans la lignée de leurs ateliers ; cycle de 10, séance découverte offerte",
    "prix": "70 à 90 € la séance",
    "saison": "Toute l'année",
    "src": "https://www.voreppe.fr/les-equipements/residence-autonomie-charminelle",
    "destinataire": {
      "nom": "Résidence autonomie Charminelle, CCAS de Voreppe",
      "email": null,
      "canal": "telephone 04 76 50 21 65"
    },
    "projet": {
      "titre": "Yoga adapté à la Charminelle",
      "concept": "Un atelier hebdomadaire de yoga adapté à la résidence Charminelle, dans la lignée de ses ateliers chorale, mémoire et aquarelle, ouvert aux résidents et aux seniors de Voreppe que la résidence accueille déjà pour les repas et certaines activités.",
      "format": "45 minutes une fois par semaine, 8 à 15 personnes, résidents et seniors extérieurs, assis sur chaise ou debout avec appui selon chacun, dans une salle de la résidence. Cycle de 10 séances, toute l'année. Première séance offerte. Aucune tenue particulière.",
      "deroule": "Accueil et respiration assise, 5 min · Épaules, nuque et dos, 12 min · Hanches, jambes et équilibre avec appui, 13 min · Respiration et temps de calme, 10 min · Mot de fin, 5 min",
      "prix": "Séance découverte offerte, puis 70 à 90 € la séance selon la taille du groupe, facturés au CCAS sur devis. Un cycle de 10 séances revient à 700 à 900 € pour un groupe de dix personnes.",
      "gain_lieu": "Un atelier de plus dans une grille hebdomadaire déjà installée, qui renforce l'ouverture de la résidence aux seniors de la ville, sans matériel à prévoir.",
      "demande": "Une date pour la séance découverte offerte, sur un créneau libre de la semaine d'ateliers, avant fin octobre.",
      "attention": "Pas d'adresse email affichée : premier contact par téléphone. La grille d'ateliers est déjà remplie plusieurs jours par semaine, le créneau doit s'y glisser sans chasser un atelier existant. Prestation au CCAS : devis et bon de commande."
    },
    "email": {
      "objet": "Un atelier yoga adapté à la résidence Charminelle",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, certifiée en yoga adapté (sur chaise, mobilité réduite). La résidence Charminelle propose déjà des ateliers hebdomadaires, chorale, mémoire, aquarelle, et les ouvre aux seniors de Voreppe : un atelier de yoga adapté s'y inscrit dans la même lignée, pour les résidents comme pour les personnes de l'extérieur.\n\nJe propose une séance hebdomadaire de 45 minutes, en cycle de 10, assise sur chaise ou debout avec appui selon chacun. Épaules, hanches, dos, équilibre, respiration, un temps de calme pour finir. Aucune tenue particulière, personne ne se met au sol.\n\nLa première séance est offerte, pour que vous et les participants jugiez sur pièces. Ensuite, chaque séance est facturée entre 70 et 90 € au CCAS, sur devis, soit 700 à 900 € pour le cycle. Je suis assurée en responsabilité civile professionnelle.\n\nPourrions-nous fixer cette séance découverte à un créneau libre de votre semaine d'ateliers ? Je suis disponible les mardis et jeudis après-midi.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "tournelles",
    "cat": "pro",
    "nom": "EHPAD Les Tournelles",
    "lieu": "Val-de-Virieu",
    "km": 22,
    "prio": 2,
    "gest": "Public, 71 chambres, PASA, accueil de jour",
    "contact": "secretariat@ehpadlestournelles.fr · 04 74 33 56 00",
    "deja": "Pôle d'activités et de soins adaptés, accueil de jour",
    "format": "Yoga adapté en PASA et à l'accueil de jour, cycle de 8 à 10, séance découverte offerte",
    "prix": "70 à 90 € la séance",
    "saison": "Toute l'année",
    "src": "https://www.pour-les-personnes-agees.gouv.fr/annuaire-ehpad-et-maisons-de-retraite/ehpad/isere-38/val-de-virieu-38730/ehpad-les-tournelles/380781641",
    "destinataire": {
      "nom": "EHPAD Les Tournelles (direction, PASA ou accueil de jour)",
      "email": "secretariat@ehpadlestournelles.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Yoga sur chaise aux Tournelles",
      "concept": "Un cycle de yoga adapté sur chaise au PASA et à l'accueil de jour des Tournelles. Deux cadres où le petit groupe, le rythme lent et les consignes simples du yoga sur chaise trouvent le mieux leur place.",
      "format": "8 à 10 séances de 45 minutes, groupe de 6 à 10 personnes, au PASA ou à l'accueil de jour, en lien avec l'équipe pour composer le groupe. Toute l'année. Première séance offerte. Tout se fait assis.",
      "deroule": "Accueil et respiration assise, 5 min · Bras, mains et épaules, 12 min · Jambes, pieds et dos, 13 min · Temps de calme ou chant à voix basse, 10 min · Mot de fin, 5 min",
      "prix": "Séance découverte offerte, puis 70 à 90 € la séance selon la taille du groupe, facturés à l'établissement sur devis. Un cycle de 10 séances revient à 700 à 900 € pour un groupe de dix personnes.",
      "gain_lieu": "Une activité régulière et douce qui s'inscrit dans le projet du PASA et de l'accueil de jour, portée par une intervenante certifiée, sans matériel à prévoir.",
      "demande": "Une date pour la séance découverte offerte, ou un échange de dix minutes avec la personne qui coordonne le PASA, avant fin octobre.",
      "attention": "Les groupes en PASA sont très réduits et demandent la présence d'un membre de l'équipe. Établissement public : devis et bon de commande."
    },
    "email": {
      "objet": "Yoga sur chaise au PASA et à l'accueil de jour",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, certifiée en yoga adapté (sur chaise, mobilité réduite). Les Tournelles ont un PASA et un accueil de jour, et c'est dans ces deux cadres que le yoga sur chaise trouve le mieux sa place : un petit groupe, un rythme lent, tout se fait assis.\n\nJe propose un cycle de 8 à 10 séances de 45 minutes, au PASA ou à l'accueil de jour, en lien avec votre équipe pour composer le groupe. Mobilisation douce des bras, des jambes et du dos, respiration guidée, un temps de calme, et un temps de chant à voix basse quand le groupe s'y prête.\n\nLa première séance est offerte, pour que vous jugiez sur pièces. Ensuite, chaque séance est facturée entre 70 et 90 € selon la taille du groupe, sur devis. Je suis assurée en responsabilité civile professionnelle.\n\nPourrions-nous fixer cette séance découverte, ou un échange de dix minutes avec la personne qui coordonne le PASA ? Je suis disponible les mardis et jeudis après-midi.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "labarre",
    "cat": "pro",
    "nom": "EHPAD de la Barre",
    "lieu": "Saint-Jean-de-Bournay",
    "km": 18,
    "prio": 2,
    "gest": "Public autonome, 133 résidents dont un CANTOU de 30 ; directrice Charlotte Antonini",
    "contact": "04 74 59 97 51 · ehpad-delabarre.fr (pas d'email affiché)",
    "deja": "Établissement public autonome de 133 résidents",
    "format": "Cycle de yoga adapté sur chaise pour les résidents (10 séances de 45 min), séance découverte offerte, et une séance pour les soignants",
    "prix": "70 à 90 € la séance",
    "saison": "Toute l'année",
    "src": "https://www.ehpad-delabarre.fr/",
    "destinataire": {
      "nom": "Charlotte Antonini, directrice de l'EHPAD de la Barre",
      "email": null,
      "canal": "telephone 04 74 59 97 51"
    },
    "projet": {
      "titre": "Yoga sur chaise à la Barre",
      "concept": "Un cycle de yoga adapté sur chaise pour les résidents de l'EHPAD de la Barre, 133 résidents dont un CANTOU de 30, et une séance à part pour les soignants. Deux publics, deux rythmes, et un même geste : le dos et le souffle.",
      "format": "10 séances de 45 minutes pour un groupe de 6 à 10 résidents, dans une salle d'animation, tout se faisant assis ; plus une séance de 45 minutes pour les soignants, debout ou assis. Toute l'année. Première séance offerte.",
      "deroule": "Accueil et respiration assise, 5 min · Bras, mains et épaules, 12 min · Jambes, pieds et dos, 13 min · Temps de calme ou chant à voix basse, 10 min · Mot de fin, 5 min",
      "prix": "Séance découverte offerte, puis 70 à 90 € la séance selon la taille du groupe, facturés à l'établissement sur devis. Un cycle de 10 séances plus la séance soignants revient à 770 à 990 €.",
      "gain_lieu": "Une animation régulière pour les résidents et un temps offert aux équipes, dans un établissement de 133 résidents où les soignants portent beaucoup.",
      "demande": "Une date pour la séance découverte offerte, ou un échange de dix minutes avec la directrice, avant fin octobre.",
      "attention": "Pas d'adresse email affichée : premier contact par téléphone, ou par le site. Le CANTOU demande des groupes très réduits et un accompagnement de l'équipe. Établissement public autonome : devis et bon de commande."
    },
    "email": {
      "objet": "Yoga sur chaise pour vos résidents et soignants",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à dix-huit kilomètres de Saint-Jean-de-Bournay, certifiée en yoga adapté (sur chaise, mobilité réduite). L'EHPAD de la Barre accueille 133 résidents, dont un CANTOU de 30 : deux publics, deux rythmes, et le yoga sur chaise s'adapte à l'un comme à l'autre.\n\nJe propose un cycle de 10 séances de 45 minutes pour un groupe de résidents, dans une salle d'animation, tout se faisant assis. Mobilisation douce, respiration, un temps de calme, et un temps de chant à voix basse quand le groupe s'y prête. J'y ajoute une séance pour les soignants, debout ou assis, autour du dos et du souffle.\n\nLa première séance est offerte, pour que vous jugiez sur pièces. Ensuite, chaque séance est facturée entre 70 et 90 € selon la taille du groupe, sur devis. Je suis assurée en responsabilité civile professionnelle.\n\nPourrions-nous fixer cette séance découverte, ou un échange de dix minutes ? Je suis disponible les mardis et jeudis après-midi.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "couvent",
    "cat": "pro",
    "nom": "EHPAD Le Couvent (La Chêneraie)",
    "lieu": "Saint-Jean-de-Bournay",
    "km": 18,
    "prio": 3,
    "gest": "Association La Chêneraie, 51 lits et 6 places de jour",
    "contact": "04 74 58 12 12 · lacheneraie38.fr",
    "deja": "Petit établissement associatif avec accueil de jour",
    "format": "Yoga adapté à l'accueil de jour, cycle de 8",
    "prix": "70 à 90 € la séance",
    "saison": "Toute l'année",
    "src": "https://www.lacheneraie38.fr/",
    "destinataire": {
      "nom": "EHPAD Le Couvent, association La Chêneraie",
      "email": null,
      "canal": "telephone 04 74 58 12 12"
    },
    "projet": {
      "titre": "Yoga sur chaise au Couvent",
      "concept": "Un cycle de yoga adapté sur chaise à l'accueil de jour du Couvent, petit établissement associatif de 51 lits et 6 places de jour. Un groupe réduit, un rythme lent, tout se fait assis.",
      "format": "8 séances de 45 minutes, groupe de 4 à 8 personnes, à l'accueil de jour, en lien avec l'équipe pour composer le groupe. Toute l'année. Première séance offerte.",
      "deroule": "Accueil et respiration assise, 5 min · Bras, mains et épaules, 12 min · Jambes, pieds et dos, 13 min · Temps de calme ou chant à voix basse, 10 min · Mot de fin, 5 min",
      "prix": "Séance découverte offerte, puis 70 à 90 € la séance selon la taille du groupe, facturés à l'association sur devis. Un cycle de 8 séances revient à 560 à 720 €.",
      "gain_lieu": "Une activité douce et régulière pour les six places de l'accueil de jour, portée par une intervenante certifiée, sans matériel à prévoir.",
      "demande": "Une date pour la séance découverte offerte, ou un échange de dix minutes, avant fin novembre.",
      "attention": "Pas d'adresse email affichée : premier contact par téléphone. L'accueil de jour ne compte que six places, le groupe sera petit et le tarif au bas de la fourchette. Petit établissement associatif : budget d'animation à vérifier."
    },
    "email": {
      "objet": "Yoga sur chaise à l'accueil de jour du Couvent",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à dix-huit kilomètres de Saint-Jean-de-Bournay, certifiée en yoga adapté (sur chaise, mobilité réduite). Le Couvent est un petit établissement associatif avec un accueil de jour, et c'est un cadre qui convient bien au yoga sur chaise : un groupe réduit, un rythme lent, tout se fait assis.\n\nJe propose un cycle de 8 séances de 45 minutes à l'accueil de jour, en lien avec votre équipe pour composer le groupe. Mobilisation douce des bras, des jambes et du dos, respiration guidée, un temps de calme, et un temps de chant à voix basse quand le groupe s'y prête.\n\nLa première séance est offerte, pour que vous jugiez sur pièces. Ensuite, chaque séance est facturée entre 70 et 90 € selon la taille du groupe, sur devis, soit 560 à 720 € pour le cycle. Je suis assurée en responsabilité civile professionnelle.\n\nPourrions-nous fixer cette séance découverte, ou un échange de dix minutes ? Je suis disponible les mardis et jeudis après-midi.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "hlsgv",
    "cat": "pro",
    "nom": "EHPAD du centre hospitalier gériatrique",
    "lieu": "Saint-Geoire-en-Valdaine",
    "km": 28,
    "prio": 3,
    "gest": "Public, unité Alzheimer et PASA",
    "contact": "direction@hlsgv.fr · 04 76 32 75 00",
    "deja": "Pôle d'activités et de soins adaptés",
    "format": "Yoga adapté en PASA, cycle de 8 à 10",
    "prix": "70 à 90 € la séance",
    "saison": "Toute l'année",
    "src": "https://www.pour-les-personnes-agees.gouv.fr/annuaire-ehpad-et-maisons-de-retraite/ehpad/isere-38/saint-geoire-en-valdaine-38620/ehpad-du-centre-hospitalier-geriatrique/380794685",
    "destinataire": {
      "nom": "EHPAD du centre hospitalier gériatrique de Saint-Geoire-en-Valdaine (direction)",
      "email": "direction@hlsgv.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Yoga sur chaise au PASA",
      "concept": "Un cycle de yoga adapté sur chaise au PASA de l'EHPAD du centre hospitalier gériatrique, qui compte aussi une unité Alzheimer. Un petit groupe, des consignes simples, un rythme lent, tout se fait assis.",
      "format": "8 à 10 séances de 45 minutes, groupe de 6 à 10 personnes, au PASA, en lien avec l'équipe pour composer le groupe. Toute l'année. Première séance offerte.",
      "deroule": "Accueil et respiration assise, 5 min · Bras, mains et épaules, 12 min · Jambes, pieds et dos, 13 min · Temps de calme ou chant à voix basse, 10 min · Mot de fin, 5 min",
      "prix": "Séance découverte offerte, puis 70 à 90 € la séance selon la taille du groupe, facturés à l'établissement sur devis. Un cycle de 10 séances revient à 700 à 900 €.",
      "gain_lieu": "Une activité qui s'inscrit dans le projet du PASA, régulière et douce, portée par une intervenante certifiée, sans matériel à prévoir.",
      "demande": "Une date pour la séance découverte offerte, ou un échange de dix minutes avec la personne qui coordonne le PASA, avant fin novembre.",
      "attention": "Établissement hospitalier public : circuit de validation et devis plus longs qu'ailleurs. Les groupes en PASA sont très réduits et demandent la présence d'un membre de l'équipe."
    },
    "email": {
      "objet": "Yoga sur chaise pour votre PASA",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, certifiée en yoga adapté (sur chaise, mobilité réduite). Votre EHPAD dispose d'un PASA et d'une unité Alzheimer, et c'est au PASA que le yoga sur chaise donne le plus : un petit groupe, des consignes simples, un rythme lent, tout se fait assis.\n\nJe propose un cycle de 8 à 10 séances de 45 minutes au PASA, en lien avec l'équipe pour composer le groupe. Mobilisation douce des bras, des jambes et du dos, respiration guidée, un temps de calme, et un temps de chant à voix basse quand le groupe s'y prête.\n\nLa première séance est offerte, pour que vous et l'équipe jugiez sur pièces. Ensuite, chaque séance est facturée entre 70 et 90 € selon la taille du groupe, sur devis. Je suis assurée en responsabilité civile professionnelle.\n\nPourrions-nous fixer cette séance découverte, ou un échange de dix minutes avec la personne qui coordonne le PASA ? Je suis disponible les mardis et jeudis après-midi.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "prescribouge",
    "cat": "pro",
    "nom": "Prescri'Bouge, CIAS du Pays Voironnais",
    "lieu": "Voiron",
    "km": 22,
    "prio": 1,
    "gest": "Sport santé sur ordonnance, co-géré avec le CDOS Isère, priorité aux plus de 60 ans",
    "contact": "04 76 93 17 71 · équipe Prescri'Bouge 06 46 00 65 29 · 40 rue Mainssieux",
    "deja": "Un catalogue d'activités physiques adaptées prescrites par les médecins du Voironnais",
    "format": "Entrer au catalogue avec un cycle de yoga adapté (12 séances de 45 min) pour les personnes orientées par leur médecin ; payé par le dispositif",
    "prix": "Prestation au CIAS",
    "saison": "Septembre à juin",
    "src": "https://www.paysvoironnais.com/les-services/sante/prescribouge/",
    "destinataire": {
      "nom": "Équipe Prescri'Bouge, CIAS du Pays Voironnais",
      "email": null,
      "canal": "telephone 04 76 93 17 71 (équipe Prescri'Bouge 06 46 00 65 29)"
    },
    "projet": {
      "titre": "Yoga adapté sur ordonnance",
      "concept": "Entrer au catalogue Prescri'Bouge avec un cycle de yoga adapté pour les personnes orientées par leur médecin, en priorité les plus de 60 ans. Un yoga accessible à tous les corps, assis ou debout avec appui, pour des personnes qui reprennent une activité doucement.",
      "format": "12 séances de 45 minutes, une par semaine, groupe de 8 à 12 personnes, dans une salle du Pays Voironnais indiquée par le dispositif. De septembre à juin. Assis sur chaise ou debout avec appui selon chacun, aucune tenue particulière.",
      "deroule": "Accueil et respiration assise, 5 min · Épaules, nuque et dos, 12 min · Hanches, jambes et équilibre avec appui, 13 min · Respiration et temps de calme, 10 min · Mot de fin, 5 min",
      "prix": "Prestation facturée au CIAS selon les conditions du dispositif, sur devis, sans frais pour les participants. Pour un cycle de 12 séances, une facture unique au dispositif.",
      "gain_lieu": "Une activité douce de plus au catalogue prescrit par les médecins du Voironnais, adaptée aux plus de 60 ans, portée par une intervenante certifiée en yoga adapté.",
      "demande": "Un appel de dix minutes pour connaître les conditions d'entrée au catalogue (qualifications demandées, convention, calendrier) et proposer un premier cycle sur la saison en cours.",
      "attention": "Le sport santé sur ordonnance a un cadre administratif précis (qualifications reconnues, convention avec le CIAS et le CDOS) : à vérifier avant tout engagement. Pas d'adresse email affichée, premier contact par téléphone. Le tarif dépend du barème du dispositif, non connu."
    },
    "email": {
      "objet": "Yoga adapté au catalogue Prescri'Bouge",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, certifiée en yoga adapté (sur chaise, mobilité réduite). Prescri'Bouge propose aux personnes orientées par leur médecin un catalogue d'activités physiques adaptées, en priorité aux plus de 60 ans, et le yoga adapté y a sa place à côté des activités déjà proposées.\n\nJe propose d'entrer à votre catalogue avec un cycle de 12 séances de 45 minutes : assis sur chaise ou debout avec appui selon chacun, mobilité des épaules, des hanches et du dos, équilibre, respiration, un temps de calme pour finir. Un yoga accessible à tous les corps, jamais ésotérique, pour des personnes qui reprennent une activité doucement.\n\nLa prestation serait facturée au CIAS selon les conditions du dispositif, sur devis, sans frais pour les participants. Je suis assurée en responsabilité civile professionnelle et je peux intervenir dans la salle que vous m'indiquerez.\n\nPourrions-nous en parler dix minutes au téléphone, pour voir les conditions d'entrée au catalogue et le calendrier ? Je suis joignable en fin de matinée du lundi au jeudi.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "lucieaubrac",
    "cat": "pro",
    "nom": "Centre socioculturel Lucie Aubrac (Bièvre Est)",
    "lieu": "Le Grand-Lemps",
    "km": 10,
    "prio": 2,
    "gest": "Bièvre Est, agréé CAF ; responsable Jérémy Eymonnet",
    "contact": "lucieaubrac@cc-bievre-est.fr · 04 85 36 01 03",
    "deja": "Ateliers intergénérationnels ; des cours de yoga d'une association locale y ont déjà lieu trois fois par semaine (à ne pas concurrencer : proposer autre chose)",
    "format": "Un atelier parents-enfants ou un cycle « bien vieillir » sur chaise, ce que le centre n'a pas ; ou une séance à la fête du centre",
    "prix": "Prestation à la collectivité",
    "saison": "Septembre à juin",
    "src": "https://www.bievre-est.fr/quotidien/enfance-jeunesse-famille/",
    "destinataire": {
      "nom": "Jérémy Eymonnet, responsable du centre socioculturel Lucie Aubrac",
      "email": "lucieaubrac@cc-bievre-est.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Yoga parents-enfants à Lucie Aubrac",
      "concept": "Un format que le centre n'a pas encore, à côté des cours de yoga déjà donnés trois fois par semaine par une association locale, que l'on ne concurrence pas : un atelier parents-enfants dans la lignée des ateliers intergénérationnels du centre, ou un cycle « bien vieillir » sur chaise. En option, une séance découverte ouverte à tous à la fête du centre.",
      "format": "Atelier parents-enfants d'une heure, 6 à 8 duos, en cycle de 4 ou en rendez-vous ponctuel ; ou cycle « bien vieillir » sur chaise de 45 minutes hebdomadaires, 8 à 12 personnes, 10 séances. De septembre à juin, dans une salle du centre. Chacun apporte son tapis, bâches de sol fournies.",
      "deroule": "Accueil et jeu de respiration, 10 min · Postures à deux, 25 min · Équilibre et attention, 10 min · Retour au calme et histoire, 10 min · Mot de fin, 5 min",
      "prix": "Prestation facturée à la collectivité (Bièvre Est), sur devis, selon le format et le nombre de séances retenus. Le centre décide de ce qu'il demande aux familles ou aux participants.",
      "gain_lieu": "Un atelier intergénérationnel de plus, qui touche les familles et les seniors sans doublonner l'association déjà en place, et une animation clé en main pour la fête du centre.",
      "demande": "Un échange de dix minutes avec le responsable, ou un passage au centre, pour choisir le format et un créneau sur la saison, avant fin octobre.",
      "attention": "Une association locale donne déjà du yoga trois fois par semaine : ne rien proposer qui ressemble à un cours adulte classique, et le dire dès le premier message. Centre agréé CAF : les ateliers familles ont leur propre calendrier et leur propre budget."
    },
    "email": {
      "objet": "Un atelier parents-enfants ou sur chaise au centre",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à dix kilomètres du Grand-Lemps, certifiée en yoga adapté et en yoga enfants. Le centre Lucie Aubrac accueille déjà des cours de yoga d'une association locale trois fois par semaine, et je ne viens pas proposer un cours de plus : je vous propose ce que ces cours ne couvrent pas.\n\nDeux pistes, à votre main. Un atelier parents-enfants d'une heure, où l'on pratique à deux, dans la lignée de vos ateliers intergénérationnels. Ou un cycle « bien vieillir » sur chaise, 45 minutes par semaine, pour des personnes qui ne se mettent pas au sol. Et si le centre organise une fête dans l'année, une séance découverte ouverte à tous peut s'y glisser.\n\nJe travaille en prestation pour la collectivité, sur devis, selon le format retenu. Je suis assurée en responsabilité civile professionnelle. Chacun apporte son tapis, j'apporte le reste.\n\nPourrions-nous en parler dix minutes au téléphone, ou lors d'un passage au centre ? Je suis joignable en fin de matinée du lundi au jeudi.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "croizat",
    "cat": "pro",
    "nom": "Centre socioculturel Ambroise Croizat (Bièvre Est)",
    "lieu": "Renage",
    "km": 15,
    "prio": 3,
    "gest": "Bièvre Est ; responsable Sophie Vidal",
    "contact": "ambroisecroizat@cc-bievre-est.fr · 04 76 91 11 25",
    "deja": "Centre socioculturel intercommunal",
    "format": "Cycle « bien vieillir » sur chaise ou atelier parents-enfants",
    "prix": "Prestation à la collectivité",
    "saison": "Septembre à juin",
    "src": "https://www.bievre-est.fr/quotidien/enfance-jeunesse-famille/",
    "destinataire": {
      "nom": "Sophie Vidal, responsable du centre socioculturel Ambroise Croizat",
      "email": "ambroisecroizat@cc-bievre-est.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Bien vieillir sur chaise à Renage",
      "concept": "Un cycle « bien vieillir » de yoga sur chaise, ou un atelier parents-enfants, au centre socioculturel Ambroise Croizat. Deux formats pensés pour un centre socioculturel intercommunal, qui touchent des publics souvent éloignés des cours de yoga classiques.",
      "format": "Cycle « bien vieillir » sur chaise de 45 minutes hebdomadaires, 8 à 12 personnes, 10 séances ; ou atelier parents-enfants d'une heure, 6 à 8 duos, en cycle de 4 ou en rendez-vous ponctuel. De septembre à juin, dans une salle du centre. Chacun apporte son tapis, bâches de sol fournies.",
      "deroule": "Accueil et respiration assise, 5 min · Épaules, nuque et dos, 12 min · Hanches, jambes et équilibre avec appui, 13 min · Respiration et temps de calme, 10 min · Mot de fin, 5 min",
      "prix": "Prestation facturée à la collectivité (Bièvre Est), sur devis, selon le format et le nombre de séances retenus. Le centre décide de ce qu'il demande aux participants.",
      "gain_lieu": "Une activité douce pour les seniors du bassin de Renage ou un temps pour les familles, dans la programmation du centre, sans matériel à prévoir.",
      "demande": "Un échange de dix minutes avec la responsable, ou un passage au centre, pour choisir le format et un créneau sur la saison, avant fin octobre.",
      "attention": "La fiche ne dit rien de la programmation existante ni des salles : à demander au premier échange, pour ne pas doublonner une activité en place. Prestation à la collectivité : devis et validation par Bièvre Est."
    },
    "email": {
      "objet": "Un cycle bien vieillir sur chaise au centre",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à quinze kilomètres de Renage, certifiée en yoga adapté et en yoga enfants. Le centre Ambroise Croizat est un centre socioculturel intercommunal, et c'est pour ce type de lieu que j'ai construit deux formats qui touchent des publics souvent éloignés des cours de yoga classiques.\n\nLe premier : un cycle « bien vieillir » sur chaise, 45 minutes par semaine, pour des personnes qui ne se mettent pas au sol. Le second : un atelier parents-enfants d'une heure, où l'on pratique à deux. Dans les deux cas, une pratique douce, accessible à tous les corps, sans tenue particulière. Chacun apporte son tapis, j'apporte le reste.\n\nJe travaille en prestation pour la collectivité, sur devis, selon le format et le nombre de séances retenus, de septembre à juin. Je suis assurée en responsabilité civile professionnelle.\n\nPourrions-nous en parler dix minutes au téléphone, ou lors d'un passage au centre ? Je suis joignable en fin de matinée du lundi au jeudi.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "feeverte",
    "cat": "culture",
    "nom": "Médiathèque intercommunale La Fée Verte",
    "lieu": "Le Grand-Lemps",
    "km": 10,
    "prio": 3,
    "gest": "Bièvre Est",
    "contact": "lafeeverte@cc-bievre-est.fr · 04 85 36 01 01",
    "deja": "Ateliers d'initiation, conférences, expositions",
    "format": "Un atelier « lire et respirer » (yoga et lecture) ou une séance dans leur programmation d'automne, payé par la médiathèque",
    "prix": "Prestation à la collectivité",
    "saison": "Automne, hiver",
    "src": "https://www.la-fee-verte.fr/accueil/la-fee-verte/",
    "destinataire": {
      "nom": "Médiathèque intercommunale La Fée Verte, Bièvre Est",
      "email": "lafeeverte@cc-bievre-est.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Lire et respirer",
      "concept": "Un atelier d'une heure quinze à la médiathèque qui associe une pratique de yoga doux, assise sur chaise ou au sol, et la lecture à voix basse de textes choisis avec l'équipe. Pour le public adulte des ateliers et des conférences de la médiathèque, dans leur programmation d'automne ou d'hiver. Maude est certifiée yoga adapté sur chaise, ce qui ouvre l'atelier à tous.",
      "format": "Un samedi matin ou un soir de semaine, 1 h 15, 12 à 15 personnes, dans l'espace où la médiathèque tient ses ateliers, sur chaise ou sur tapis. Chacun apporte son tapis s'il pratique au sol, chaises de la médiathèque sinon. Une séance ou un cycle de 3 dans la programmation d'automne-hiver. Version enfants possible (certification yoga enfants).",
      "deroule": "Accueil et respiration assise (10 min) · pratique douce sur chaise ou au sol (40 min) · lecture à voix basse et écoute (15 min) · échange autour des textes (10 min)",
      "prix": "Prestation facturée à la médiathèque, devis établi sur la durée et la jauge, gratuite pour le public si la collectivité le souhaite. Un cycle de 3 ateliers fait l'objet d'un devis global.",
      "gain_lieu": "Une animation nouvelle et accessible dans la programmation, qui fait venir un public qui ne se croit pas capable de yoga, et un lien entre les collections et le corps. Communication faite par la médiathèque, relayée par Maude.",
      "demande": "Un rendez-vous de vingt minutes avec la personne qui construit la programmation d'automne, pour voir si l'atelier y trouve sa place et sous quelle forme (une date ou un cycle). Réponse souhaitée avant la clôture de leur programme.",
      "attention": "Calendrier de collectivité : la programmation d'automne se ferme tôt, écrire avant l'été. Prestation à une collectivité : devis, bon de commande, paiement à réception, délais à prévoir. L'espace d'ateliers n'est pas décrit sur la fiche : vérifier la place au sol au repérage."
    },
    "email": {
      "objet": "Un atelier « lire et respirer » à la médiathèque",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à dix kilomètres du Grand-Lemps. La Fée Verte programme déjà des ateliers d'initiation, des conférences et des expositions. Je vous propose un atelier qui relie le corps aux livres, pour votre saison d'automne ou d'hiver.\n\n« Lire et respirer » dure une heure quinze pour douze à quinze personnes : une pratique de yoga doux, assise sur chaise ou au sol selon chacun, une respiration guidée, puis une lecture à voix basse de textes choisis avec vous. Je suis certifiée yoga adapté sur chaise et yoga enfants, ce qui ouvre l'atelier à tous les âges et à tous les corps. Une date, ou un cycle de trois.\n\nL'atelier se fait en prestation facturée à la médiathèque, sur devis selon la durée et la jauge, gratuit pour le public si vous le souhaitez. Je suis assurée en responsabilité civile professionnelle.\n\nAuriez-vous vingt minutes pour en parler avec la personne qui construit la programmation ? Je peux venir à la médiathèque un matin en semaine, ou par téléphone entre 12 h et 14 h.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "chougnes",
    "cat": "hebergeur",
    "nom": "Domaine de Chougnes",
    "lieu": "Tullins",
    "km": 25,
    "prio": 1,
    "gest": "Ancien domaine de Chartreux, gîte de 14 personnes, spa et nage à contre-courant ; « lieu idéal pour votre stage ou séminaire »",
    "contact": "domaine.chougnes@gmail.com · 07 61 45 67 33",
    "deja": "Gîte de 14, spa ; une salle de 70 m² est citée par les annuaires (à confirmer avec eux)",
    "format": "Le week-end de yoga de Maude : 2 nuits, 10 à 12 personnes, la salle pour la pratique, le spa en fin de journée",
    "prix": "380 à 420 € le week-end",
    "saison": "Toute l'année, hors saison en tête",
    "src": "https://www.domaine-chougnes.fr/",
    "destinataire": {
      "nom": "Domaine de Chougnes",
      "email": "domaine.chougnes@gmail.com",
      "canal": "email"
    },
    "projet": {
      "titre": "Le week-end de yoga de Chougnes",
      "concept": "Un week-end de yoga doux de deux nuits pour dix à douze personnes dans l'ancien domaine de Chartreux, avec la pratique dans la salle et le spa en fin de journée. Pour des adultes qui veulent une vraie retraite, calme et confortable, dans un lieu qui se présente lui-même comme fait pour les stages.",
      "format": "Du vendredi soir au dimanche après-midi, 2 nuits, 10 à 12 personnes dans le gîte de 14, quatre temps de pratique dans la salle (70 m² citée par les annuaires, à confirmer) ou dans le parc, spa et nage à contre-courant en fin de journée. Chacun apporte son tapis. Deux à trois week-ends par an, hors saison en priorité.",
      "deroule": "Vendredi 18 h arrivée et séance d'ouverture (1 h) · samedi matin pratique (1 h 30) · samedi après-midi marche, respiration, spa (2 h) · dimanche matin pratique et méditation (1 h 30) · dimanche 14 h clôture (30 min)",
      "prix": "380 à 420 € par personne le week-end, deux nuits, hébergement et enseignement compris, le niveau exact dépendant du tarif de groupe du domaine. Pour 10 participants : 3 800 à 4 200 € de ventes, dont l'hébergement réglé au domaine.",
      "gain_lieu": "Le gîte loué complet sur un week-end hors saison, la salle et le spa utilisés, et un groupe qui revient si le lieu plaît. Photos remises par Maude, agendas de l'Isère.",
      "demande": "Les disponibilités hors saison, le tarif de groupe pour deux nuits à 12 personnes, la confirmation de la salle (surface, sol, chauffage) et de l'accès au spa. Un repérage sur place.",
      "attention": "La salle de 70 m² n'est citée que par les annuaires : à confirmer avant toute annonce. Prix haut de la série (380 à 420 €) : le spa et le standing doivent être au rendez-vous. Repas : à préciser, rien n'est dit sur la restauration."
    },
    "email": {
      "objet": "Un week-end de yoga de deux nuits au domaine",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, troisième saison à l'Espace Montgontier. Votre domaine se présente comme un lieu pour les stages, avec un gîte de quatorze, un spa et une nage à contre-courant. C'est ce que je cherche pour mon week-end de yoga.\n\nCe que je propose : deux nuits, du vendredi soir au dimanche après-midi, pour dix à douze personnes. Quatre temps de pratique douce, respiration et méditation, dans votre salle ou dans le parc, et le spa en fin de journée. Chacun apporte son tapis, je viens avec le matériel de sol. Je suis assurée en responsabilité civile professionnelle, y compris hors salle.\n\nJe vends les places en ligne, payées d'avance, entre 380 et 420 € par personne selon votre tarif, et je vous règle l'hébergement. Je publie le week-end sur les agendas de l'Isère et je vous remets les photos du groupe.\n\nPourriez-vous m'indiquer vos disponibilités hors saison, votre tarif de groupe pour deux nuits à douze personnes, et me confirmer la salle où pratiquer (surface, sol, chauffage) ? Je peux venir repérer les lieux un matin en semaine.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "chepy",
    "cat": "hebergeur",
    "nom": "Domaine Saint-Jean de Chépy",
    "lieu": "Tullins",
    "km": 25,
    "prio": 2,
    "gest": "Château du XIIIe, parc de 10 ha, une centaine de séminaires d'entreprise par an, château et lodges, restauration",
    "contact": "contact@chepy.net · 04 76 07 22 10",
    "deja": "Séminaires d'entreprise, hébergement, restauration",
    "format": "Le « réveil yoga » proposé aux séminaires qu'ils hébergent (45 min le matin, dans le parc), inscrit à leur catalogue d'options",
    "prix": "150 € la séance facturée au domaine ou à l'entreprise",
    "saison": "Toute l'année",
    "src": "https://seminaire.chepy.net/accueil",
    "destinataire": {
      "nom": "Domaine Saint-Jean de Chépy",
      "email": "contact@chepy.net",
      "canal": "email"
    },
    "projet": {
      "titre": "Réveil yoga des séminaires",
      "concept": "Une séance de 45 minutes de yoga doux le matin, dans le parc de 10 ha du château, proposée aux entreprises en séminaire au domaine. Le dos, le souffle et le stress comme entrée, sans ésotérisme, pour des salariés qui n'ont jamais fait de yoga. Le domaine héberge une centaine de séminaires par an : l'option s'inscrit à son catalogue.",
      "format": "45 min à 7 h 30 ou 8 h, avant le petit-déjeuner, 10 à 25 personnes, dans le parc ou dans une salle du château par mauvais temps. Tapis fournis par Maude pour les séminaires (les participants n'en ont pas), bâches de sol. Toute l'année, à la demande, inscrit au catalogue d'options du domaine.",
      "deroule": "Accueil dans le parc (5 min) · réveil du corps et du dos (20 min) · respiration et posture assise (15 min) · retour au calme (5 min)",
      "prix": "150 € la séance, facturée au domaine ou directement à l'entreprise, sur devis pour un séminaire de plusieurs jours. Pour un séminaire de 3 matins : 450 €.",
      "gain_lieu": "Une option de plus au catalogue des séminaires, sans coût fixe pour le domaine, à revendre à sa marge ou à proposer au prix de Maude. Une prestation bien-être à mettre en avant face aux autres lieux de séminaire.",
      "demande": "Un rendez-vous de vingt minutes avec la personne qui compose les offres séminaires, et une séance de démonstration pour l'équipe du domaine.",
      "attention": "Le domaine peut déjà avoir un prestataire bien-être : demander. Horaire très matinal, trajet de 25 km depuis Gillonnay. Facturation en B2B : devis, conditions de paiement du domaine, délais."
    },
    "email": {
      "objet": "Un réveil yoga au catalogue de vos séminaires",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à vingt-cinq kilomètres de Tullins. Vous accueillez une centaine de séminaires d'entreprise par an dans le château, les lodges et le parc de dix hectares. Je vous propose une option à inscrire à votre catalogue : un réveil yoga.\n\nLe format : 45 minutes le matin, avant le petit-déjeuner, dans le parc ou dans une salle par mauvais temps, pour dix à vingt-cinq personnes. Le dos, le souffle et le stress comme entrée, rien d'ésotérique, pour des salariés qui n'ont jamais déroulé un tapis. Je fournis les tapis et le matériel de sol. J'interviens déjà en entreprise et je suis assurée en responsabilité civile professionnelle, y compris hors salle.\n\nLa séance est facturée 150 € au domaine ou directement à l'entreprise, sur devis pour un séminaire de plusieurs jours. Vous la revendez à votre marge ou vous la proposez à mon prix, à votre choix.\n\nAuriez-vous vingt minutes avec la personne qui compose vos offres séminaires ? Je peux venir au domaine un matin en semaine et faire une séance de démonstration pour votre équipe.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "buissonniere",
    "cat": "hebergeur",
    "nom": "La Ferme Buissonnière",
    "lieu": "Biol",
    "km": 20,
    "prio": 1,
    "gest": "Maison d'hôtes de 4 chambres (12 personnes), salle de 28 m² réservée aux stages, pension complète 53 € par jour et par personne ; formations, masterclass, résidences d'artistes",
    "contact": "Formulaire sur lafermebuissonniere-biol.fr (pas de téléphone ni d'email affiché)",
    "deja": "Stages et résidences déjà accueillis, pension complète",
    "format": "Week-end de stage de 10 à 12 personnes, salle de 28 m² pour la pratique douce et le jardin pour le reste",
    "prix": "345 € le week-end (pension 106 € + enseignement)",
    "saison": "Toute l'année",
    "src": "https://www.lafermebuissonniere-biol.fr/r%C3%A9sidence-stages/",
    "destinataire": {
      "nom": "La Ferme Buissonnière",
      "email": null,
      "canal": "formulaire (lafermebuissonniere-biol.fr)"
    },
    "projet": {
      "titre": "Stage de yoga à la Ferme Buissonnière",
      "concept": "Un week-end de stage de yoga doux pour dix à douze personnes dans la maison d'hôtes, en pension complète, avec la salle de 28 m² réservée aux stages et le jardin. Pour des adultes qui veulent une retraite courte et soignée, à vingt kilomètres de Gillonnay, dans un lieu qui reçoit déjà des stages et des résidences.",
      "format": "Du vendredi soir au dimanche après-midi, 10 à 12 personnes dans les 4 chambres, pension complète du lieu (53 € par jour et par personne), quatre temps de pratique douce dans la salle de 28 m² ou au jardin. Chacun apporte son tapis. Deux à trois week-ends par an, toute l'année.",
      "deroule": "Vendredi 18 h arrivée et séance d'ouverture (1 h) · samedi matin pratique au jardin (1 h 30) · samedi après-midi respiration et méditation dans la salle (1 h) · dimanche matin pratique (1 h 30) · dimanche 14 h clôture (30 min)",
      "prix": "345 € par personne le week-end : 106 € de pension complète (deux jours à 53 €) et l'enseignement. Pour 10 participants : 3 450 € de ventes, dont 1 060 € de pension réglés à la maison d'hôtes.",
      "gain_lieu": "La maison d'hôtes remplie sur un week-end, la pension complète pour douze, la salle de stage utilisée, et un groupe qui revient si le lieu plaît. Photos remises par Maude.",
      "demande": "Les disponibilités hors saison, la confirmation du tarif de pension complète pour un groupe de 12, la surface réelle de la salle et sa capacité en tapis, et un repérage sur place.",
      "attention": "Salle de 28 m² pour dix à douze tapis : serré, pratique douce et chaise possibles, le jardin en priorité par beau temps. Pas de téléphone ni d'email affiché : premier contact par formulaire. Quatre chambres pour douze : chambres partagées, à dire aux participants."
    },
    "email": {
      "objet": "Un week-end de stage de yoga en pension complète",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, troisième saison à l'Espace Montgontier. Vous accueillez déjà des stages, des masterclass et des résidences, avec une salle réservée aux stages et une pension complète. C'est le cadre que je cherche.\n\nCe que je propose : un week-end du vendredi soir au dimanche après-midi pour dix à douze personnes, en pension complète chez vous. Quatre temps de pratique douce, respiration et méditation, dans votre salle de 28 m² ou au jardin. Chacun apporte son tapis, je viens avec le matériel de sol. Je suis assurée en responsabilité civile professionnelle, y compris hors salle.\n\nJe vends les places en ligne, payées d'avance, 345 € par personne, pension comprise sur la base de vos 53 € par jour, et je vous règle la pension. Je publie le week-end sur les agendas de l'Isère et je vous remets les photos du groupe.\n\nPourriez-vous m'indiquer vos disponibilités hors saison, me confirmer le tarif de pension pour un groupe de douze, et me dire combien de tapis tiennent dans la salle ? Je peux venir repérer les lieux un matin en semaine.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "bonnevaux",
    "cat": "hebergeur",
    "nom": "Gîte du Château de Bonnevaux",
    "lieu": "Villeneuve-de-Marc",
    "km": 20,
    "prio": 3,
    "gest": "Gîte de séjour de 12 personnes (Gîtes de France), parc de 15 ha, restauration et petit-déjeuner sur place, accessible PMR",
    "contact": "04 74 59 38 89 · 06 44 00 05 21",
    "deja": "Gîte de groupe avec restauration",
    "format": "Week-end de 10 à 12 personnes dans le parc",
    "prix": "345 € le week-end",
    "saison": "Avril à octobre",
    "src": "https://www.gites-de-france-isere.com/location-vacances-Gite-de-sejour-Du-Chateau-De-Bonnevaux-a-Villeneuve-de-marc-38G555025.html",
    "destinataire": {
      "nom": "Gîte du Château de Bonnevaux",
      "email": null,
      "canal": "telephone (04 74 59 38 89)"
    },
    "projet": {
      "titre": "Week-end de yoga à Bonnevaux",
      "concept": "Un week-end de yoga doux pour dix à douze personnes dans le gîte de séjour du château, avec la pratique dans le parc de 15 ha et les repas pris sur place. Le gîte est accessible aux personnes à mobilité réduite : Maude, certifiée yoga adapté, peut ouvrir le week-end à des participants qui pratiquent sur chaise.",
      "format": "Du vendredi soir au dimanche après-midi, 10 à 12 personnes dans le gîte de 12, restauration et petit-déjeuner du gîte, quatre temps de pratique dans le parc ou dans une pièce du gîte par mauvais temps (à confirmer). Chacun apporte son tapis. Deux week-ends par an, avril à octobre.",
      "deroule": "Vendredi 18 h arrivée et séance d'ouverture (1 h) · samedi matin pratique dans le parc (1 h 30) · samedi après-midi marche et respiration (1 h) · dimanche matin pratique et méditation (1 h 30) · dimanche 14 h clôture (30 min)",
      "prix": "345 € par personne le week-end, hébergement, repas et enseignement compris, sous réserve du tarif de groupe du gîte. Pour 10 participants : 3 450 € de ventes, dont l'hébergement et les repas réglés au gîte.",
      "gain_lieu": "Le gîte de séjour rempli sur un week-end de printemps ou d'automne, la restauration pour douze, et un public nouveau, dont des personnes à mobilité réduite que peu de retraites accueillent.",
      "demande": "Les disponibilités d'avril à octobre, le tarif de groupe pour deux nuits en pension, et s'il existe une pièce pour pratiquer par mauvais temps. Un repérage sur place.",
      "attention": "Aucune salle citée sur la fiche : sans pièce de repli, le week-end dépend de la météo. Deux numéros de téléphone, pas d'email : premier contact par téléphone, l'email sert de support. Tarif de groupe inconnu : le prix de 345 € est conditionné à leur réponse."
    },
    "email": {
      "objet": "Un week-end de yoga dans votre gîte de séjour",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, troisième saison à l'Espace Montgontier. Votre gîte de séjour de douze personnes, son parc de quinze hectares et la restauration sur place réunissent ce qu'il faut pour un week-end de yoga. Et comme le gîte est accessible aux personnes à mobilité réduite, je pourrais y accueillir des participants sur chaise : je suis certifiée yoga adapté.\n\nCe que je propose : un week-end du vendredi soir au dimanche après-midi pour dix à douze personnes, en pension chez vous. Quatre temps de pratique douce, respiration et méditation, dans le parc ou à l'intérieur. Chacun apporte son tapis, je viens avec le matériel de sol. Je suis assurée en responsabilité civile professionnelle.\n\nJe vends les places en ligne, payées d'avance, 345 € par personne, et je vous règle l'hébergement et les repas. Je publie le week-end sur les agendas de l'Isère et vous remets les photos du groupe.\n\nPourriez-vous m'indiquer vos disponibilités d'avril à octobre, votre tarif de groupe pour deux nuits en pension, et s'il existe une pièce pour pratiquer s'il pleut ? Je peux venir repérer les lieux.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "chatonnay",
    "cat": "hebergeur",
    "nom": "Domaine de Chatonnay",
    "lieu": "Châtonnay",
    "km": 14,
    "prio": 2,
    "gest": "Salle de l'Orée des Bois (150 personnes), salle du Moulin (35), 31 couchages",
    "contact": "07 72 30 12 10 · 155 impasse des Terreaux (pas d'email affiché)",
    "deja": "Mariages et séminaires",
    "format": "Journée ou week-end de stage : la salle du Moulin (35) pour la pratique, les 31 couchages pour dormir",
    "prix": "Journée 75 € repas compris ; week-end 345 €",
    "saison": "Toute l'année",
    "src": "https://terres-de-berlioz.com/fiche-sit/F5265356_domaine-de-chatonnay-chatonnay/",
    "destinataire": {
      "nom": "Domaine de Chatonnay",
      "email": null,
      "canal": "telephone (07 72 30 12 10)"
    },
    "projet": {
      "titre": "Journée ou week-end de yoga à Chatonnay",
      "concept": "Une journée ou un week-end de stage de yoga doux dans la salle du Moulin, avec les couchages du domaine pour dormir sur place. Pour des adultes de la Bièvre et des environs, à quatorze kilomètres de Gillonnay, dans un domaine qui reçoit déjà des mariages et des séminaires et dont les salles se libèrent en semaine et hors saison.",
      "format": "Journée : 9 h 30 à 17 h, 15 personnes, salle du Moulin (35 places), repas de midi compris. Week-end : du vendredi soir au dimanche après-midi, 10 à 12 personnes, salle du Moulin et couchages du domaine. Chacun apporte son tapis. Journées en semaine ou le dimanche, week-ends hors saison des mariages.",
      "deroule": "Journée : accueil et pratique du matin (2 h) · repas (1 h 15) · marche et respiration (1 h) · pratique de l'après-midi et méditation (1 h 30) · clôture (30 min)",
      "prix": "Journée 75 € par personne, repas compris ; week-end 345 € par personne, hébergement et enseignement compris, sous réserve des tarifs du domaine. Pour 10 participants : 750 € pour une journée, 3 450 € pour un week-end, dont la salle, les repas et les couchages réglés au domaine.",
      "gain_lieu": "La salle du Moulin et les couchages loués en semaine ou hors saison, quand les mariages ne les occupent pas, et une clientèle locale qui découvre le domaine autrement que par un mariage.",
      "demande": "Les disponibilités de la salle du Moulin en semaine et hors saison, le tarif de la salle à la journée, le tarif des couchages et des repas pour un groupe de 12, et un repérage sur place.",
      "attention": "Les week-ends sont la saison des mariages : viser les journées en semaine et les week-ends d'hiver. Pas d'email : premier contact par téléphone. La salle du Moulin (35 places) est dimensionnée pour un repas : vérifier qu'elle se vide pour quinze tapis."
    },
    "email": {
      "objet": "Une journée ou un week-end de yoga au domaine",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à quatorze kilomètres de Châtonnay. Vous recevez des mariages et des séminaires, avec la salle du Moulin et trente et un couchages. Je vous propose de les remplir aussi en semaine et hors saison, avec des stages de yoga.\n\nDeux formats. Une journée de 9 h 30 à 17 h pour quinze personnes dans la salle du Moulin, repas de midi compris, avec deux temps de pratique douce, une marche et une méditation. Ou un week-end du vendredi soir au dimanche après-midi pour dix à douze personnes, avec vos couchages. Chacun apporte son tapis. Je suis assurée en responsabilité civile professionnelle.\n\nJe vends les places en ligne, payées d'avance, 75 € la journée repas compris et 345 € le week-end, et je vous règle la salle, les repas et les couchages. Je publie les dates sur les agendas de l'Isère et je vous remets les photos du groupe.\n\nPourriez-vous m'indiquer vos disponibilités en semaine et hors saison, et vos tarifs de salle, de repas et de couchage pour douze ? Je peux venir repérer la salle un matin.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "feemerlantine",
    "cat": "hebergeur",
    "nom": "La Fée Merlantine",
    "lieu": "Merlas",
    "km": 33,
    "prio": 3,
    "gest": "Gîte de groupe de 20 personnes, salon fermé de 25 m² avec vidéoprojecteur",
    "contact": "Formulaire sur lafeemerlantine.fr (pas de téléphone ni d'email affiché)",
    "deja": "Vacances, week-ends, séminaires",
    "format": "Week-end de stage jusqu'à 14 personnes, pratique au salon ou dehors",
    "prix": "300 à 345 € le week-end",
    "saison": "Avril à octobre",
    "src": "https://lafeemerlantine.fr/",
    "destinataire": {
      "nom": "La Fée Merlantine",
      "email": null,
      "canal": "formulaire (lafeemerlantine.fr)"
    },
    "projet": {
      "titre": "Week-end de yoga à Merlas",
      "concept": "Un week-end de yoga doux pour dix à quatorze personnes dans le gîte de groupe de Merlas, avec la pratique dehors en priorité et le salon fermé de 25 m² pour la méditation et les temps calmes. Pour des adultes qui veulent une retraite simple et abordable, dans un gîte qui reçoit déjà des week-ends et des séminaires.",
      "format": "Du vendredi soir au dimanche après-midi, 10 à 14 personnes dans le gîte de 20, quatre temps de pratique : dehors par beau temps, dans le salon de 25 m² pour la respiration, la méditation et les temps assis. Repas préparés ensemble. Chacun apporte son tapis. Deux week-ends par an, avril à octobre.",
      "deroule": "Vendredi 18 h arrivée et séance d'ouverture au salon (1 h) · samedi matin pratique dehors (1 h 30) · samedi après-midi respiration et méditation au salon (1 h) · dimanche matin pratique (1 h 30) · dimanche 14 h clôture (30 min)",
      "prix": "300 à 345 € par personne le week-end, hébergement et enseignement compris, le niveau exact dépendant du tarif du gîte sur deux nuits. Pour 10 participants : 3 000 à 3 450 € de ventes, dont la location réglée au gîte.",
      "gain_lieu": "Le gîte loué sur un week-end hors des vacances, par un groupe calme, et une visibilité nouvelle par les agendas et les photos remises par Maude.",
      "demande": "Les disponibilités d'avril à octobre hors vacances scolaires, le tarif pour 14 personnes sur deux nuits, l'espace extérieur utilisable pour la pratique, et si le salon se libère pour les temps assis. Un repérage sur place.",
      "attention": "Salon de 25 m² : trop petit pour quatorze tapis en mouvement, la pratique dépend de l'extérieur et donc de la météo. Pas de téléphone ni d'email : premier contact par formulaire. Merlas est à 33 km : le plus loin de la série pour un week-end."
    },
    "email": {
      "objet": "Un week-end de yoga dans votre gîte de groupe",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, troisième saison à l'Espace Montgontier. Votre gîte de groupe reçoit déjà des week-ends et des séminaires, avec un salon fermé de 25 m². Je vous écris pour un week-end de retraite de yoga.\n\nCe que je propose : un week-end du vendredi soir au dimanche après-midi pour dix à quatorze personnes. Quatre temps de pratique douce, dehors par beau temps, et dans le salon pour la respiration, la méditation et les temps assis. Des repas préparés ensemble. Chacun apporte son tapis, je viens avec le matériel de sol. Je suis assurée en responsabilité civile professionnelle, y compris hors salle.\n\nJe vends les places en ligne, payées d'avance, entre 300 et 345 € par personne selon votre tarif, et je vous règle la location. Je publie le week-end sur les agendas de l'Isère et je vous remets les photos du groupe.\n\nPourriez-vous m'indiquer vos disponibilités d'avril à octobre hors vacances scolaires, votre tarif pour quatorze personnes sur deux nuits, et l'espace extérieur où nous pourrions pratiquer ? Je peux venir repérer les lieux un matin.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · maude-yoga.com"
    }
  },
  {
    "id": "fresenius",
    "cat": "pro",
    "nom": "Fresenius Vial (Fresenius Kabi)",
    "lieu": "Brézins",
    "km": 6,
    "prio": 2,
    "gest": "Dispositifs médicaux : R&D et production de pompes à perfusion et de nutrition · plus de 450 collaborateurs (site)",
    "contact": "telephone 04 76 67 10 10 (pas d'email générique publié ; candidatures par le portail carrières)",
    "deja": "ISO 45001, enquête « Voice of Employee », ateliers compétences, index égalité 89/100, bornes véhicules électriques et covoiturage : une démarche QVT visible. Production et R&D, donc postes debout et postes sur écran.",
    "format": "Séance découverte de 45 min à 1 h sur site, puis programme de 4 séances sur 2 mois",
    "prix": "Séance découverte 180 € ; programme 4 séances 1 400 à 1 600 €",
    "saison": "Toute l'année",
    "src": "https://www.fresenius-kabi.com/fr/nos-sites-en-france/brezins",
    "destinataire": {
      "nom": "Fresenius Vial (Fresenius Kabi), Natacha Goszka, responsable RH ; Guillaume Thomas, directeur de site",
      "email": null,
      "canal": "telephone 04 76 67 10 10 (pas d'email générique publié ; candidatures par le portail carrières)"
    },
    "projet": {
      "titre": "Séance découverte sur site",
      "concept": "Une démarche QVT visible (ISO 45001, enquête Voice of Employee, ateliers compétences) sur un site qui mêle production debout et R&D sur écran, à 6 km de Gillonnay. Une séance découverte de 45 min à 1 h sur le lieu de travail, adaptée au métier, puis un programme de 4 séances sur 2 mois si l'équipe y trouve son compte.",
      "format": "45 min à 1 h sur site, 6 à 20 personnes, à la pause déjeuner ou en fin de poste ; salle de réunion ou réfectoire, matériel apporté par Maude. Interlocuteur : Natacha Goszka, responsable RH ; Guillaume Thomas, directeur de site.",
      "deroule": "Accueil et consignes, 5 min · respiration, 10 min · postures debout ou sur chaise adaptées au poste, 25 min · récupération et retour au calme, 10 min",
      "prix": "Séance découverte 180 € facturée à l'entreprise (grille de pro.maude-yoga.com) ; programme de 4 séances sur 2 mois de 1 400 à 1 600 € ; interventions de 2 h à une journée de 350 à 2 200 €.",
      "gain_lieu": "Une action QVT concrète et peu coûteuse, à 30 minutes de route au plus, portée par une intervenante du territoire ; des équipes qui repartent avec des gestes réutilisables au poste.",
      "demande": "Quinze minutes de téléphone, ou une date pour la séance découverte ; disponibilité en semaine après 13 h.",
      "attention": "Pas d'adresse email publique : telephone 04 76 67 10 10 (pas d'email générique publié ; candidatures par le portail carrières). Le texte se colle dans le formulaire ou sert de trame au téléphone. Source vérifiée : https://www.fresenius-kabi.com/fr/nos-sites-en-france/brezins"
    },
    "email": {
      "objet": "Séance découverte yoga sur site à Brézins",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à 6 km de votre site de Brézins. Votre démarche, ISO 45001, enquête Voice of Employee, ateliers compétences, montre que la qualité de vie au travail compte chez vous, et j'aimerais y contribuer sur le terrain.\n\nJe vous propose une séance découverte de 45 minutes à une heure, sur site, à la pause déjeuner ou en fin de poste, pour 6 à 20 personnes, à 180 euros, adaptée au métier : dos, posture debout et récupération pour la production, écrans et respiration pour la R&D. Ensuite, si l'équipe y trouve son compte, un programme de 4 séances sur 2 mois.\n\nVos collaborateurs repartent avec des gestes simples, réutilisables au poste, et un moment partagé entre services.\n\nAuriez-vous quinze minutes au téléphone, ou une date pour la découverte ? Je suis joignable en semaine après 13 h.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · pro.maude-yoga.com"
    }
  },
  {
    "id": "auteuil-jmv",
    "cat": "pro",
    "nom": "Apprentis d'Auteuil, lycée professionnel Jean-Marie Vianney",
    "lieu": "La Côte-Saint-André",
    "km": 3,
    "prio": 1,
    "gest": "Enseignement professionnel privé (mécanique moto, bâtiment, restauration) et école de production · 100 à 199",
    "contact": "accueil-sitejmv@apprentis-auteuil.org · email",
    "deja": "La fondation a signé un accord QVCT le 15 septembre 2025 pour quatre ans. Des éducateurs et des enseignants face à des jeunes en difficulté, à 3 km de chez Maude.",
    "format": "Séance découverte de 45 min à 1 h sur site, puis programme de 4 séances sur 2 mois",
    "prix": "Séance découverte 180 € ; programme 4 séances 1 400 à 1 600 €",
    "saison": "Toute l'année",
    "src": "https://jeanmarievianney.apprentis-auteuil.org/infos-pratiques/contact-1",
    "destinataire": {
      "nom": "Apprentis d'Auteuil, lycée professionnel Jean-Marie Vianney, service RH ou direction",
      "email": "accueil-sitejmv@apprentis-auteuil.org",
      "canal": "email"
    },
    "projet": {
      "titre": "Séance découverte sur site",
      "concept": "La fondation a signé un accord QVCT le 15 septembre 2025 pour quatre ans, et des éducateurs et enseignants travaillent avec des jeunes en difficulté à 3 km de Gillonnay. Une séance découverte de 45 min à 1 h sur le lieu de travail, adaptée au métier, puis un programme de 4 séances sur 2 mois si l'équipe y trouve son compte.",
      "format": "45 min à 1 h sur site, 6 à 20 personnes, à la pause déjeuner ou en fin de poste ; salle de réunion ou réfectoire, matériel apporté par Maude. Interlocuteur : service RH ou direction.",
      "deroule": "Accueil et consignes, 5 min · respiration, 10 min · postures debout ou sur chaise adaptées au poste, 25 min · récupération et retour au calme, 10 min",
      "prix": "Séance découverte 180 € facturée à l'entreprise (grille de pro.maude-yoga.com) ; programme de 4 séances sur 2 mois de 1 400 à 1 600 € ; interventions de 2 h à une journée de 350 à 2 200 €.",
      "gain_lieu": "Une action QVT concrète et peu coûteuse, à 30 minutes de route au plus, portée par une intervenante du territoire ; des équipes qui repartent avec des gestes réutilisables au poste.",
      "demande": "Quinze minutes de téléphone, ou une date pour la séance découverte ; disponibilité en semaine après 13 h.",
      "attention": "Adresse générique : demander la transmission à la QVT, au CSE ou aux RH. Source vérifiée : https://jeanmarievianney.apprentis-auteuil.org/infos-pratiques/contact-1"
    },
    "email": {
      "objet": "Respiration et stress, équipe éducative",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à 3 km de votre lycée, et j'interviens déjà en collège et en lycée sur la gestion du stress. L'accord QVCT signé par la fondation en septembre 2025 me fait vous écrire : vos éducateurs et vos enseignants tiennent face à des jeunes qui demandent beaucoup.\n\nJe vous propose une séance découverte de 45 minutes à une heure, sur place, à la pause déjeuner ou en fin de journée, pour 6 à 20 personnes, à 180 euros : respiration, retour au calme après une situation tendue, posture pour tenir en classe ou à l'atelier. Ensuite, si l'équipe y trouve son compte, un programme de 4 séances sur 2 mois.\n\nVous y gagnez des adultes plus posés devant les jeunes.\n\nPourriez-vous transmettre à la personne qui suit la QVT ou les RH ? Quinze minutes au téléphone suffisent, en semaine après 13 h.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · pro.maude-yoga.com"
    }
  },
  {
    "id": "eurobeton",
    "cat": "pro",
    "nom": "Eurobéton France (groupe PBM)",
    "lieu": "Saint-Siméon-de-Bressieux",
    "km": 12,
    "prio": 1,
    "gest": "Fabrication d'éléments en béton pour la construction · 100 à 199",
    "contact": "contact@eurobeton.fr · email",
    "deja": "Index égalité publié, engagement diversité et handicap. Un site de production où l'on porte et l'on manutentionne : le dos.",
    "format": "Séance découverte de 45 min à 1 h sur site, puis programme de 4 séances sur 2 mois",
    "prix": "Séance découverte 180 € ; programme 4 séances 1 400 à 1 600 €",
    "saison": "Toute l'année",
    "src": "https://www.eurobeton.fr/contact/",
    "destinataire": {
      "nom": "Eurobéton France (groupe PBM), Christelle Mouchon, DRH du groupe PBM (Saint-Priest)",
      "email": "contact@eurobeton.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Séance découverte sur site",
      "concept": "Un site de production où l'on porte et manutentionne des éléments en béton, avec un index égalité publié et un engagement diversité et handicap affiché. Une séance découverte de 45 min à 1 h sur le lieu de travail, adaptée au métier, puis un programme de 4 séances sur 2 mois si l'équipe y trouve son compte.",
      "format": "45 min à 1 h sur site, 6 à 20 personnes, à la pause déjeuner ou en fin de poste ; salle de réunion ou réfectoire, matériel apporté par Maude. Interlocuteur : Christelle Mouchon, DRH du groupe PBM (Saint-Priest).",
      "deroule": "Accueil et consignes, 5 min · respiration, 10 min · postures debout ou sur chaise adaptées au poste, 25 min · récupération et retour au calme, 10 min",
      "prix": "Séance découverte 180 € facturée à l'entreprise (grille de pro.maude-yoga.com) ; programme de 4 séances sur 2 mois de 1 400 à 1 600 € ; interventions de 2 h à une journée de 350 à 2 200 €.",
      "gain_lieu": "Une action QVT concrète et peu coûteuse, à 30 minutes de route au plus, portée par une intervenante du territoire ; des équipes qui repartent avec des gestes réutilisables au poste.",
      "demande": "Quinze minutes de téléphone, ou une date pour la séance découverte ; disponibilité en semaine après 13 h.",
      "attention": "Adresse générique : demander la transmission à la QVT, au CSE ou aux RH. Source vérifiée : https://www.eurobeton.fr/contact/"
    },
    "email": {
      "objet": "Le dos de vos équipes de production",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à 12 km de Saint-Siméon-de-Bressieux, et j'anime des ateliers de posture et de récupération en entreprise. Fabriquer des éléments en béton, c'est porter et manutentionner toute la journée, et votre engagement affiché sur l'égalité, la diversité et le handicap me laisse penser que la santé des équipes vous parle.\n\nJe vous propose une séance découverte de 45 minutes à une heure, sur site, à la pause déjeuner ou en fin de poste, pour 6 à 20 personnes, à 180 euros : le dos, les épaules et la récupération. Ensuite, si l'équipe y trouve son compte, un programme de 4 séances sur 2 mois.\n\nVos équipes repartent avec quelques réflexes pour se protéger le dos au poste.\n\nPourriez-vous transmettre à la personne qui suit la QVT, le CSE ou les RH ? Quinze minutes au téléphone suffisent, en semaine après 13 h.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · pro.maude-yoga.com"
    }
  },
  {
    "id": "schneider-sea",
    "cat": "pro",
    "nom": "Schneider Electric France, site SEA",
    "lieu": "Saint-Étienne-de-Saint-Geoirs",
    "km": 10,
    "prio": 2,
    "gest": "Moulage époxy pour appareillage moyenne tension · 50 à 99",
    "contact": "telephone 04 76 37 06 49 (aucun email local publié)",
    "deja": "CSE actif, investissements presses et moules annoncés en avril 2024. Ateliers de moulage : postes physiques, équipes en horaires.",
    "format": "Séance découverte de 45 min à 1 h sur site, puis programme de 4 séances sur 2 mois",
    "prix": "Séance découverte 180 € ; programme 4 séances 1 400 à 1 600 €",
    "saison": "Toute l'année",
    "src": "https://industrie.usinenouvelle.com/fiche/etablissement/schneider-electric-france-55180664",
    "destinataire": {
      "nom": "Schneider Electric France, site SEA, direction de site ou CSE",
      "email": null,
      "canal": "telephone 04 76 37 06 49 (aucun email local publié)"
    },
    "projet": {
      "titre": "Séance découverte sur site",
      "concept": "Des ateliers de moulage aux postes physiques et en horaires, un CSE actif et des investissements presses et moules annoncés en avril 2024. Une séance découverte de 45 min à 1 h sur le lieu de travail, adaptée au métier, puis un programme de 4 séances sur 2 mois si l'équipe y trouve son compte.",
      "format": "45 min à 1 h sur site, 6 à 20 personnes, à la pause déjeuner ou en fin de poste ; salle de réunion ou réfectoire, matériel apporté par Maude. Interlocuteur : direction de site ou CSE.",
      "deroule": "Accueil et consignes, 5 min · respiration, 10 min · postures debout ou sur chaise adaptées au poste, 25 min · récupération et retour au calme, 10 min",
      "prix": "Séance découverte 180 € facturée à l'entreprise (grille de pro.maude-yoga.com) ; programme de 4 séances sur 2 mois de 1 400 à 1 600 € ; interventions de 2 h à une journée de 350 à 2 200 €.",
      "gain_lieu": "Une action QVT concrète et peu coûteuse, à 30 minutes de route au plus, portée par une intervenante du territoire ; des équipes qui repartent avec des gestes réutilisables au poste.",
      "demande": "Quinze minutes de téléphone, ou une date pour la séance découverte ; disponibilité en semaine après 13 h.",
      "attention": "Pas d'adresse email publique : telephone 04 76 37 06 49 (aucun email local publié). Le texte se colle dans le formulaire ou sert de trame au téléphone. Source vérifiée : https://industrie.usinenouvelle.com/fiche/etablissement/schneider-electric-france-55180664"
    },
    "email": {
      "objet": "Dos et récupération, atelier de moulage",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à 10 km de votre site de Saint-Étienne-de-Saint-Geoirs, et j'interviens déjà auprès d'une PME industrielle de la région grenobloise. Le moulage époxy, ce sont des postes physiques et des équipes en horaires, et votre CSE m'a semblé le bon endroit pour en parler.\n\nJe vous propose une séance découverte de 45 minutes à une heure, sur site, à la pause déjeuner ou en fin de poste, pour 6 à 20 personnes, à 180 euros : le dos, les épaules et la récupération après le poste, avec des gestes qui tiennent dans un réfectoire. Ensuite, si l'équipe y trouve son compte, un programme de 4 séances sur 2 mois.\n\nVos opérateurs repartent avec des réflexes simples pour se ménager au poste.\n\nAuriez-vous quinze minutes au téléphone, ou une date pour la découverte ? Je suis joignable en semaine après 13 h.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · pro.maude-yoga.com"
    }
  },
  {
    "id": "mairie-csa",
    "cat": "pro",
    "nom": "Commune de La Côte-Saint-André",
    "lieu": "La Côte-Saint-André",
    "km": 3,
    "prio": 1,
    "gest": "Collectivité territoriale (services techniques, périscolaire, administration) · 50 à 99 agents",
    "contact": "contact@lacotesaintandre.fr · email",
    "deja": "La commune de Maude au quotidien (le festival Berlioz, la Halle), des agents techniques et administratifs.",
    "format": "Séance découverte de 45 min à 1 h sur site, puis programme de 4 séances sur 2 mois",
    "prix": "Séance découverte 180 € ; programme 4 séances 1 400 à 1 600 €",
    "saison": "Toute l'année",
    "src": "https://www.lacotesaintandre.fr/contact/",
    "destinataire": {
      "nom": "Commune de La Côte-Saint-André, direction générale des services ou service RH",
      "email": "contact@lacotesaintandre.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Séance découverte sur site",
      "concept": "La commune de Maude au quotidien, avec des agents techniques, périscolaires et administratifs à 3 km de chez elle. Une séance découverte de 45 min à 1 h sur le lieu de travail, adaptée au métier, puis un programme de 4 séances sur 2 mois si l'équipe y trouve son compte.",
      "format": "45 min à 1 h sur site, 6 à 20 personnes, à la pause déjeuner ou en fin de poste ; salle de réunion ou réfectoire, matériel apporté par Maude. Interlocuteur : direction générale des services ou service RH.",
      "deroule": "Accueil et consignes, 5 min · respiration, 10 min · postures debout ou sur chaise adaptées au poste, 25 min · récupération et retour au calme, 10 min",
      "prix": "Séance découverte 180 € facturée à l'entreprise (grille de pro.maude-yoga.com) ; programme de 4 séances sur 2 mois de 1 400 à 1 600 € ; interventions de 2 h à une journée de 350 à 2 200 €.",
      "gain_lieu": "Une action QVT concrète et peu coûteuse, à 30 minutes de route au plus, portée par une intervenante du territoire ; des équipes qui repartent avec des gestes réutilisables au poste.",
      "demande": "Quinze minutes de téléphone, ou une date pour la séance découverte ; disponibilité en semaine après 13 h.",
      "attention": "Adresse générique : demander la transmission à la QVT, au CSE ou aux RH. Source vérifiée : https://www.lacotesaintandre.fr/contact/"
    },
    "email": {
      "objet": "Séance découverte pour les agents",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, et La Côte-Saint-André est la commune de mon quotidien, à 3 km de chez moi. Vos agents des services techniques, du périscolaire et de l'administration n'ont pas les mêmes journées, mais tous tiennent un rythme soutenu au service des habitants.\n\nJe vous propose une séance découverte de 45 minutes à une heure, sur place, à la pause déjeuner ou en fin de service, pour 6 à 20 agents, à 180 euros : dos et récupération pour les équipes techniques, respiration et relâchement des tensions pour les bureaux et le périscolaire. Ensuite, si l'équipe y trouve son compte, un programme de 4 séances sur 2 mois.\n\nVos agents repartent avec des gestes simples à refaire seuls, et un moment partagé entre services.\n\nPourriez-vous transmettre à la direction générale des services ou aux RH ? Quinze minutes au téléphone suffisent, en semaine après 13 h.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · pro.maude-yoga.com"
    }
  },
  {
    "id": "lycee-agricole",
    "cat": "pro",
    "nom": "Lycée agricole de La Côte-Saint-André (EPLEFPA, École de la nature et du vivant)",
    "lieu": "La Côte-Saint-André",
    "km": 3,
    "prio": 1,
    "gest": "Lycée agricole public, CFA, CFPPA, exploitation · 50 à 99",
    "contact": "epl.cote-st-andre@educagri.fr · email",
    "deja": "Enseignants, formateurs et personnels d'exploitation ; un internat, des journées longues.",
    "format": "Séance découverte de 45 min à 1 h sur site, puis programme de 4 séances sur 2 mois",
    "prix": "Séance découverte 180 € ; programme 4 séances 1 400 à 1 600 €",
    "saison": "Toute l'année",
    "src": "https://www.formagri38.fr/contact/",
    "destinataire": {
      "nom": "Lycée agricole de La Côte-Saint-André (EPLEFPA, École de la nature et du vivant), direction ou secrétariat général",
      "email": "epl.cote-st-andre@educagri.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Séance découverte sur site",
      "concept": "Des enseignants, des formateurs et des personnels d'exploitation, un internat et des journées longues, à 3 km de Gillonnay. Une séance découverte de 45 min à 1 h sur le lieu de travail, adaptée au métier, puis un programme de 4 séances sur 2 mois si l'équipe y trouve son compte.",
      "format": "45 min à 1 h sur site, 6 à 20 personnes, à la pause déjeuner ou en fin de poste ; salle de réunion ou réfectoire, matériel apporté par Maude. Interlocuteur : direction ou secrétariat général.",
      "deroule": "Accueil et consignes, 5 min · respiration, 10 min · postures debout ou sur chaise adaptées au poste, 25 min · récupération et retour au calme, 10 min",
      "prix": "Séance découverte 180 € facturée à l'entreprise (grille de pro.maude-yoga.com) ; programme de 4 séances sur 2 mois de 1 400 à 1 600 € ; interventions de 2 h à une journée de 350 à 2 200 €.",
      "gain_lieu": "Une action QVT concrète et peu coûteuse, à 30 minutes de route au plus, portée par une intervenante du territoire ; des équipes qui repartent avec des gestes réutilisables au poste.",
      "demande": "Quinze minutes de téléphone, ou une date pour la séance découverte ; disponibilité en semaine après 13 h.",
      "attention": "Adresse générique : demander la transmission à la QVT, au CSE ou aux RH. Source vérifiée : https://www.formagri38.fr/contact/"
    },
    "email": {
      "objet": "Gestion du stress pour l'équipe du lycée",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à 3 km de votre établissement, et j'interviens déjà en collège et en lycée sur la gestion du stress. Chez vous, les journées sont longues : des enseignants et des formateurs devant des classes, un internat, et des personnels d'exploitation dont le métier est physique.\n\nJe vous propose une séance découverte de 45 minutes à une heure, sur place, à la pause déjeuner ou en fin de journée, pour 6 à 20 personnes, à 180 euros : respiration et retour au calme pour les équipes pédagogiques, dos et récupération pour l'exploitation. Ensuite, si l'équipe y trouve son compte, un programme de 4 séances sur 2 mois.\n\nVous y gagnez des adultes plus posés devant les élèves, avec des outils qu'ils gardent.\n\nPourriez-vous transmettre à la direction ou au secrétariat général ? Quinze minutes au téléphone suffisent, en semaine après 13 h.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · pro.maude-yoga.com"
    }
  },
  {
    "id": "france-alu-color",
    "cat": "pro",
    "nom": "France Alu Color",
    "lieu": "Marcilloles",
    "km": 12,
    "prio": 1,
    "gest": "Thermolaquage de profilés aluminium · 50 à 99",
    "contact": "contact@france-alu-color.com · email",
    "deja": "Page « Nos engagements RSE », certifications qualité affichées. Atelier de thermolaquage : gestes répétés, manutention.",
    "format": "Séance découverte de 45 min à 1 h sur site, puis programme de 4 séances sur 2 mois",
    "prix": "Séance découverte 180 € ; programme 4 séances 1 400 à 1 600 €",
    "saison": "Toute l'année",
    "src": "https://www.france-alu-color.com/notre-entreprise/",
    "destinataire": {
      "nom": "France Alu Color, direction ou service RH",
      "email": "contact@france-alu-color.com",
      "canal": "email"
    },
    "projet": {
      "titre": "Séance découverte sur site",
      "concept": "Un atelier de thermolaquage aux gestes répétés et à la manutention, avec une page « Nos engagements RSE » et des certifications qualité affichées. Une séance découverte de 45 min à 1 h sur le lieu de travail, adaptée au métier, puis un programme de 4 séances sur 2 mois si l'équipe y trouve son compte.",
      "format": "45 min à 1 h sur site, 6 à 20 personnes, à la pause déjeuner ou en fin de poste ; salle de réunion ou réfectoire, matériel apporté par Maude. Interlocuteur : direction ou service RH.",
      "deroule": "Accueil et consignes, 5 min · respiration, 10 min · postures debout ou sur chaise adaptées au poste, 25 min · récupération et retour au calme, 10 min",
      "prix": "Séance découverte 180 € facturée à l'entreprise (grille de pro.maude-yoga.com) ; programme de 4 séances sur 2 mois de 1 400 à 1 600 € ; interventions de 2 h à une journée de 350 à 2 200 €.",
      "gain_lieu": "Une action QVT concrète et peu coûteuse, à 30 minutes de route au plus, portée par une intervenante du territoire ; des équipes qui repartent avec des gestes réutilisables au poste.",
      "demande": "Quinze minutes de téléphone, ou une date pour la séance découverte ; disponibilité en semaine après 13 h.",
      "attention": "Adresse générique : demander la transmission à la QVT, au CSE ou aux RH. Source vérifiée : https://www.france-alu-color.com/notre-entreprise/"
    },
    "email": {
      "objet": "Le dos de vos équipes de thermolaquage",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à 12 km de Marcilloles, et j'interviens déjà auprès d'une PME industrielle de la région grenobloise. Le thermolaquage de profilés, ce sont des gestes répétés et de la manutention toute la journée, et vos engagements RSE affichés me laissent penser que la santé des équipes vous parle.\n\nJe vous propose une séance découverte de 45 minutes à une heure, sur site, à la pause déjeuner ou en fin de poste, pour 6 à 20 personnes, à 180 euros : le dos, les épaules et la récupération, avec des gestes qui tiennent dans un réfectoire. Ensuite, si l'équipe y trouve son compte, un programme de 4 séances sur 2 mois.\n\nVos opérateurs repartent avec des réflexes simples pour se ménager au poste.\n\nPourriez-vous transmettre à la personne qui suit la QVT, le CSE ou les RH ? Quinze minutes au téléphone suffisent, en semaine après 13 h.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · pro.maude-yoga.com"
    }
  },
  {
    "id": "alutec",
    "cat": "pro",
    "nom": "Alutec (groupe Aluthea)",
    "lieu": "Porte-des-Bonnevaux (Semons)",
    "km": 10,
    "prio": 2,
    "gest": "Fonderie aluminium, pièces techniques · 50 à 99 (groupe de plus de 300)",
    "contact": "formulaire https://www.aluthea.com/contact/ (téléphone 04 74 54 41 65)",
    "deja": "Fonderie : chaleur, postes physiques, équipes postées.",
    "format": "Séance découverte de 45 min à 1 h sur site, puis programme de 4 séances sur 2 mois",
    "prix": "Séance découverte 180 € ; programme 4 séances 1 400 à 1 600 €",
    "saison": "Toute l'année",
    "src": "https://www.aluthea.com/",
    "destinataire": {
      "nom": "Alutec (groupe Aluthea), direction de site",
      "email": null,
      "canal": "formulaire https://www.aluthea.com/contact/ (téléphone 04 74 54 41 65)"
    },
    "projet": {
      "titre": "Séance découverte sur site",
      "concept": "Une fonderie aluminium : chaleur, postes physiques et équipes postées, à 10 km de Gillonnay. Une séance découverte de 45 min à 1 h sur le lieu de travail, adaptée au métier, puis un programme de 4 séances sur 2 mois si l'équipe y trouve son compte.",
      "format": "45 min à 1 h sur site, 6 à 20 personnes, à la pause déjeuner ou en fin de poste ; salle de réunion ou réfectoire, matériel apporté par Maude. Interlocuteur : direction de site.",
      "deroule": "Accueil et consignes, 5 min · respiration, 10 min · postures debout ou sur chaise adaptées au poste, 25 min · récupération et retour au calme, 10 min",
      "prix": "Séance découverte 180 € facturée à l'entreprise (grille de pro.maude-yoga.com) ; programme de 4 séances sur 2 mois de 1 400 à 1 600 € ; interventions de 2 h à une journée de 350 à 2 200 €.",
      "gain_lieu": "Une action QVT concrète et peu coûteuse, à 30 minutes de route au plus, portée par une intervenante du territoire ; des équipes qui repartent avec des gestes réutilisables au poste.",
      "demande": "Quinze minutes de téléphone, ou une date pour la séance découverte ; disponibilité en semaine après 13 h.",
      "attention": "Pas d'adresse email publique : formulaire https://www.aluthea.com/contact/ (téléphone 04 74 54 41 65). Le texte se colle dans le formulaire ou sert de trame au téléphone. Source vérifiée : https://www.aluthea.com/"
    },
    "email": {
      "objet": "Récupération pour vos équipes de fonderie",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à 10 km de votre fonderie de Semons, et j'interviens déjà auprès d'une PME industrielle de la région grenobloise. Une fonderie, c'est la chaleur, des postes physiques et des équipes postées : un métier qui use le corps si on ne lui laisse pas le temps de récupérer.\n\nJe vous propose une séance découverte de 45 minutes à une heure, sur site, à la pause déjeuner ou en fin de poste, pour 6 à 20 personnes, à 180 euros : le dos, les épaules, la récupération après le poste et la respiration pour redescendre après la chaleur. Ensuite, si l'équipe y trouve son compte, un programme de 4 séances sur 2 mois.\n\nVos opérateurs repartent avec des réflexes simples pour se ménager au poste.\n\nAuriez-vous quinze minutes au téléphone, ou une date pour la découverte ? Je suis joignable en semaine après 13 h.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · pro.maude-yoga.com"
    }
  },
  {
    "id": "oxance-grand-chene",
    "cat": "pro",
    "nom": "Oxance, foyer de vie Le Grand Chêne",
    "lieu": "Izeaux",
    "km": 10,
    "prio": 2,
    "gest": "Accueil d'adultes en situation de handicap moteur (hébergement et accueil de jour) · 50 à 99",
    "contact": "formulaire https://oxance.fr/contactez-oxance/ (téléphone 04 76 93 89 89)",
    "deja": "Des équipes d'accompagnement qui portent, soulèvent, veillent. Maude est certifiée yoga adapté : une séance pour le personnel et une piste pour les résidents.",
    "format": "Séance découverte de 45 min à 1 h sur site, puis programme de 4 séances sur 2 mois",
    "prix": "Séance découverte 180 € ; programme 4 séances 1 400 à 1 600 €",
    "saison": "Toute l'année",
    "src": "https://oxance.fr/centres/foyer-de-vie-%C2%96-le-grand-chene/",
    "destinataire": {
      "nom": "Oxance, foyer de vie Le Grand Chêne, direction du foyer",
      "email": null,
      "canal": "formulaire https://oxance.fr/contactez-oxance/ (téléphone 04 76 93 89 89)"
    },
    "projet": {
      "titre": "Séance découverte sur site",
      "concept": "Des équipes qui portent, soulèvent et veillent auprès d'adultes en situation de handicap moteur ; Maude est certifiée yoga adapté, sur chaise. Une séance découverte de 45 min à 1 h sur le lieu de travail, adaptée au métier, puis un programme de 4 séances sur 2 mois si l'équipe y trouve son compte.",
      "format": "45 min à 1 h sur site, 6 à 20 personnes, à la pause déjeuner ou en fin de poste ; salle de réunion ou réfectoire, matériel apporté par Maude. Interlocuteur : direction du foyer.",
      "deroule": "Accueil et consignes, 5 min · respiration, 10 min · postures debout ou sur chaise adaptées au poste, 25 min · récupération et retour au calme, 10 min",
      "prix": "Séance découverte 180 € facturée à l'entreprise (grille de pro.maude-yoga.com) ; programme de 4 séances sur 2 mois de 1 400 à 1 600 € ; interventions de 2 h à une journée de 350 à 2 200 €.",
      "gain_lieu": "Une action QVT concrète et peu coûteuse, à 30 minutes de route au plus, portée par une intervenante du territoire ; des équipes qui repartent avec des gestes réutilisables au poste.",
      "demande": "Quinze minutes de téléphone, ou une date pour la séance découverte ; disponibilité en semaine après 13 h.",
      "attention": "Pas d'adresse email publique : formulaire https://oxance.fr/contactez-oxance/ (téléphone 04 76 93 89 89). Le texte se colle dans le formulaire ou sert de trame au téléphone. Source vérifiée : https://oxance.fr/centres/foyer-de-vie-%C2%96-le-grand-chene/"
    },
    "email": {
      "objet": "Yoga sur chaise pour l'équipe du Grand Chêne",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à 10 km d'Izeaux, certifiée yoga adapté, celui qui se pratique sur une chaise. Vos équipes portent, soulèvent et veillent auprès d'adultes en situation de handicap moteur : le dos et la fatigue nerveuse sont au premier plan.\n\nJe vous propose une séance découverte de 45 minutes à une heure, sur place, à la pause déjeuner ou en fin de service, pour 6 à 20 personnes, à 180 euros, pensée d'abord pour le personnel : le dos, les épaules, la respiration pour souffler entre deux transferts. Ensuite, si l'équipe y trouve son compte, un programme de 4 séances sur 2 mois, et le yoga sur chaise ouvre une piste pour les résidents.\n\nVos professionnels repartent avec des gestes simples pour se protéger.\n\nAuriez-vous quinze minutes au téléphone, ou une date pour la découverte ? Je suis joignable en semaine après 13 h.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · pro.maude-yoga.com"
    }
  },
  {
    "id": "arc-en-ciel",
    "cat": "pro",
    "nom": "Arc en Ciel Recyclage",
    "lieu": "Izeaux",
    "km": 10,
    "prio": 1,
    "gest": "Recyclage et valorisation de déchets, entreprise familiale depuis 1936 · 50 à 99",
    "contact": "contact@arcencielrecyclage.fr · email",
    "deja": "Tri, manutention, conduite d'engins : le dos et les épaules.",
    "format": "Séance découverte de 45 min à 1 h sur site, puis programme de 4 séances sur 2 mois",
    "prix": "Séance découverte 180 € ; programme 4 séances 1 400 à 1 600 €",
    "saison": "Toute l'année",
    "src": "https://arcencielrecyclage.fr/contact/",
    "destinataire": {
      "nom": "Arc en Ciel Recyclage, service RH (l'adresse contact sert aussi aux RH)",
      "email": "contact@arcencielrecyclage.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Séance découverte sur site",
      "concept": "Tri, manutention et conduite d'engins dans une entreprise familiale depuis 1936 : le dos et les épaules, à 10 km de Gillonnay. Une séance découverte de 45 min à 1 h sur le lieu de travail, adaptée au métier, puis un programme de 4 séances sur 2 mois si l'équipe y trouve son compte.",
      "format": "45 min à 1 h sur site, 6 à 20 personnes, à la pause déjeuner ou en fin de poste ; salle de réunion ou réfectoire, matériel apporté par Maude. Interlocuteur : service RH (l'adresse contact sert aussi aux RH).",
      "deroule": "Accueil et consignes, 5 min · respiration, 10 min · postures debout ou sur chaise adaptées au poste, 25 min · récupération et retour au calme, 10 min",
      "prix": "Séance découverte 180 € facturée à l'entreprise (grille de pro.maude-yoga.com) ; programme de 4 séances sur 2 mois de 1 400 à 1 600 € ; interventions de 2 h à une journée de 350 à 2 200 €.",
      "gain_lieu": "Une action QVT concrète et peu coûteuse, à 30 minutes de route au plus, portée par une intervenante du territoire ; des équipes qui repartent avec des gestes réutilisables au poste.",
      "demande": "Quinze minutes de téléphone, ou une date pour la séance découverte ; disponibilité en semaine après 13 h.",
      "attention": "Adresse générique : demander la transmission à la QVT, au CSE ou aux RH. Source vérifiée : https://arcencielrecyclage.fr/contact/"
    },
    "email": {
      "objet": "Le dos et les épaules de vos équipes de tri",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à 10 km d'Izeaux, et j'interviens déjà auprès d'une PME industrielle de la région grenobloise. Dans une entreprise familiale de recyclage comme la vôtre, le tri, la manutention et la conduite d'engins sollicitent le dos et les épaules toute la journée.\n\nJe vous propose une séance découverte de 45 minutes à une heure, sur site, à la pause déjeuner ou en fin de poste, pour 6 à 20 personnes, à 180 euros : le dos, les épaules, la récupération après le poste et des gestes de compensation pour les heures en cabine. Ensuite, si l'équipe y trouve son compte, un programme de 4 séances sur 2 mois.\n\nVos salariés repartent avec des réflexes simples pour se ménager au poste.\n\nAuriez-vous quinze minutes au téléphone, ou une date pour la découverte ? Je suis joignable en semaine après 13 h.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · pro.maude-yoga.com"
    }
  },
  {
    "id": "saint-francois",
    "cat": "pro",
    "nom": "Institution Saint-François Sainte-Cécile (OGEC)",
    "lieu": "La Côte-Saint-André",
    "km": 3,
    "prio": 1,
    "gest": "Ensemble scolaire privé, de la maternelle au lycée · 40 salariés de l'OGEC",
    "contact": "contact@institution-saint-francois.fr · email",
    "deja": "Enseignants et personnels d'un ensemble scolaire, à 3 km de chez Maude, qui intervient déjà en milieu scolaire.",
    "format": "Séance découverte de 45 min à 1 h sur site, puis programme de 4 séances sur 2 mois",
    "prix": "Séance découverte 180 € ; programme 4 séances 1 400 à 1 600 €",
    "saison": "Toute l'année",
    "src": "https://www.institution-saint-francois.fr/index.php/institution/l-ogec",
    "destinataire": {
      "nom": "Institution Saint-François Sainte-Cécile (OGEC), Patrick Gilibert, président de l'OGEC ; direction",
      "email": "contact@institution-saint-francois.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Séance découverte sur site",
      "concept": "Un ensemble scolaire de la maternelle au lycée à 3 km de Gillonnay, où Maude intervient déjà en milieu scolaire sur la gestion du stress. Une séance découverte de 45 min à 1 h sur le lieu de travail, adaptée au métier, puis un programme de 4 séances sur 2 mois si l'équipe y trouve son compte.",
      "format": "45 min à 1 h sur site, 6 à 20 personnes, à la pause déjeuner ou en fin de poste ; salle de réunion ou réfectoire, matériel apporté par Maude. Interlocuteur : Patrick Gilibert, président de l'OGEC ; direction.",
      "deroule": "Accueil et consignes, 5 min · respiration, 10 min · postures debout ou sur chaise adaptées au poste, 25 min · récupération et retour au calme, 10 min",
      "prix": "Séance découverte 180 € facturée à l'entreprise (grille de pro.maude-yoga.com) ; programme de 4 séances sur 2 mois de 1 400 à 1 600 € ; interventions de 2 h à une journée de 350 à 2 200 €.",
      "gain_lieu": "Une action QVT concrète et peu coûteuse, à 30 minutes de route au plus, portée par une intervenante du territoire ; des équipes qui repartent avec des gestes réutilisables au poste.",
      "demande": "Quinze minutes de téléphone, ou une date pour la séance découverte ; disponibilité en semaine après 13 h.",
      "attention": "Adresse générique : demander la transmission à la QVT, au CSE ou aux RH. Source vérifiée : https://www.institution-saint-francois.fr/index.php/institution/l-ogec"
    },
    "email": {
      "objet": "Gestion du stress, équipe de Saint-François",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à 3 km de votre institution, et j'interviens déjà en collège et en lycée sur la gestion du stress. De la maternelle au lycée, vos enseignants et vos personnels tiennent devant des enfants et des adolescents du matin au soir, et cela demande une réserve de calme à entretenir.\n\nJe vous propose une séance découverte de 45 minutes à une heure, sur place, à la pause déjeuner ou en fin de journée, pour 6 à 20 personnes, à 180 euros : respiration, retour au calme après une situation tendue, posture pour tenir debout ou en classe. Ensuite, si l'équipe y trouve son compte, un programme de 4 séances sur 2 mois.\n\nVous y gagnez des adultes plus posés devant les élèves.\n\nPourriez-vous transmettre à la direction ou à l'OGEC ? Quinze minutes au téléphone suffisent, en semaine après 13 h.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · pro.maude-yoga.com"
    }
  },
  {
    "id": "mecelec",
    "cat": "pro",
    "nom": "Mecelec Composites, site de Saint-Étienne-de-Saint-Geoirs",
    "lieu": "Saint-Étienne-de-Saint-Geoirs (Air Parc)",
    "km": 10,
    "prio": 1,
    "gest": "Transformation de matériaux composites · 20 à 49 sur site, 100 à 199 dans l'entreprise",
    "contact": "contact@mecelec.fr · email",
    "deja": "Classée parmi les meilleures PME françaises par Gaïa Rating (RSE), plusieurs recrutements en cours.",
    "format": "Séance découverte de 45 min à 1 h sur site, puis programme de 4 séances sur 2 mois",
    "prix": "Séance découverte 180 € ; programme 4 séances 1 400 à 1 600 €",
    "saison": "Toute l'année",
    "src": "https://www.mecelec.fr/contact/",
    "destinataire": {
      "nom": "Mecelec Composites, site de Saint-Étienne-de-Saint-Geoirs, direction de site",
      "email": "contact@mecelec.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Séance découverte sur site",
      "concept": "Une PME classée parmi les meilleures françaises par Gaïa Rating sur la RSE, avec plusieurs recrutements en cours sur le site de l'Air Parc. Une séance découverte de 45 min à 1 h sur le lieu de travail, adaptée au métier, puis un programme de 4 séances sur 2 mois si l'équipe y trouve son compte.",
      "format": "45 min à 1 h sur site, 6 à 20 personnes, à la pause déjeuner ou en fin de poste ; salle de réunion ou réfectoire, matériel apporté par Maude. Interlocuteur : direction de site.",
      "deroule": "Accueil et consignes, 5 min · respiration, 10 min · postures debout ou sur chaise adaptées au poste, 25 min · récupération et retour au calme, 10 min",
      "prix": "Séance découverte 180 € facturée à l'entreprise (grille de pro.maude-yoga.com) ; programme de 4 séances sur 2 mois de 1 400 à 1 600 € ; interventions de 2 h à une journée de 350 à 2 200 €.",
      "gain_lieu": "Une action QVT concrète et peu coûteuse, à 30 minutes de route au plus, portée par une intervenante du territoire ; des équipes qui repartent avec des gestes réutilisables au poste.",
      "demande": "Quinze minutes de téléphone, ou une date pour la séance découverte ; disponibilité en semaine après 13 h.",
      "attention": "Adresse générique : demander la transmission à la QVT, au CSE ou aux RH. Source vérifiée : https://www.mecelec.fr/contact/"
    },
    "email": {
      "objet": "Séance découverte pour le site de l'Air Parc",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à 10 km de votre site de l'Air Parc, et j'interviens déjà auprès d'une PME industrielle de la région grenobloise. Votre classement par Gaïa Rating parmi les meilleures PME françaises sur la RSE, et vos recrutements en cours, me font vous proposer quelque chose de concret.\n\nJe vous propose une séance découverte de 45 minutes à une heure, sur site, à la pause déjeuner ou en fin de poste, pour 6 à 20 personnes, à 180 euros : le dos, les épaules et la récupération après le poste. Ensuite, si l'équipe y trouve son compte, un programme de 4 séances sur 2 mois.\n\nVos équipes repartent avec des réflexes simples pour se ménager au poste.\n\nPourriez-vous transmettre à la personne qui suit la QVT, le CSE ou les RH ? Quinze minutes au téléphone suffisent, en semaine après 13 h.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · pro.maude-yoga.com"
    }
  },
  {
    "id": "quarante-trente",
    "cat": "pro",
    "nom": "40-30, site de Saint-Étienne-de-Saint-Geoirs",
    "lieu": "Saint-Étienne-de-Saint-Geoirs (Air Parc)",
    "km": 10,
    "prio": 1,
    "gest": "Maintenance d'équipements industriels et scientifiques (vide, froid) · 20 à 49 sur site, 100 à 199 dans l'entreprise",
    "contact": "40-30@40-30.fr · email",
    "deja": "Techniciens de maintenance, déplacements et interventions.",
    "format": "Séance découverte de 45 min à 1 h sur site, puis programme de 4 séances sur 2 mois",
    "prix": "Séance découverte 180 € ; programme 4 séances 1 400 à 1 600 €",
    "saison": "Toute l'année",
    "src": "https://www.40-30.com/fr/contact/",
    "destinataire": {
      "nom": "40-30, site de Saint-Étienne-de-Saint-Geoirs, direction de site",
      "email": "40-30@40-30.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Séance découverte sur site",
      "concept": "Des techniciens de maintenance en déplacement et en intervention, sur un site de l'Air Parc à 10 km de Gillonnay. Une séance découverte de 45 min à 1 h sur le lieu de travail, adaptée au métier, puis un programme de 4 séances sur 2 mois si l'équipe y trouve son compte.",
      "format": "45 min à 1 h sur site, 6 à 20 personnes, à la pause déjeuner ou en fin de poste ; salle de réunion ou réfectoire, matériel apporté par Maude. Interlocuteur : direction de site.",
      "deroule": "Accueil et consignes, 5 min · respiration, 10 min · postures debout ou sur chaise adaptées au poste, 25 min · récupération et retour au calme, 10 min",
      "prix": "Séance découverte 180 € facturée à l'entreprise (grille de pro.maude-yoga.com) ; programme de 4 séances sur 2 mois de 1 400 à 1 600 € ; interventions de 2 h à une journée de 350 à 2 200 €.",
      "gain_lieu": "Une action QVT concrète et peu coûteuse, à 30 minutes de route au plus, portée par une intervenante du territoire ; des équipes qui repartent avec des gestes réutilisables au poste.",
      "demande": "Quinze minutes de téléphone, ou une date pour la séance découverte ; disponibilité en semaine après 13 h.",
      "attention": "Adresse générique : demander la transmission à la QVT, au CSE ou aux RH. Source vérifiée : https://www.40-30.com/fr/contact/"
    },
    "email": {
      "objet": "Récupération pour vos techniciens",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à 10 km de votre site de l'Air Parc, et j'interviens déjà auprès d'une PME industrielle de la région grenobloise. La maintenance d'équipements de vide et de froid, ce sont des techniciens qui se déplacent, interviennent dans des positions inconfortables et enchaînent les journées.\n\nJe vous propose une séance découverte de 45 minutes à une heure, sur site, à la pause déjeuner ou en fin de journée, pour 6 à 20 personnes, à 180 euros : le dos, les épaules, la récupération après l'intervention et une respiration qui s'emporte en déplacement. Ensuite, si l'équipe y trouve son compte, un programme de 4 séances sur 2 mois.\n\nVos techniciens repartent avec des gestes simples qu'ils refont seuls, entre deux chantiers.\n\nPourriez-vous transmettre à la personne qui suit la QVT, le CSE ou les RH ? Quinze minutes au téléphone suffisent, en semaine après 13 h.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · pro.maude-yoga.com"
    }
  },
  {
    "id": "cerfrance",
    "cat": "pro",
    "nom": "Cerfrance Dauphiné Provence, agence de l'Air Parc",
    "lieu": "Saint-Étienne-de-Saint-Geoirs",
    "km": 10,
    "prio": 1,
    "gest": "Expertise comptable et conseil · non publié (agence)",
    "contact": "contact@dp.cerfrance.fr · email",
    "deja": "Des comptables sur écran toute la journée, avec des périodes de clôture chargées.",
    "format": "Séance découverte de 45 min à 1 h sur site, puis programme de 4 séances sur 2 mois",
    "prix": "Séance découverte 180 € ; programme 4 séances 1 400 à 1 600 €",
    "saison": "Toute l'année",
    "src": "https://dp.cerfrance.fr/nos-agences/agence-saint-etienne-de-saint-geoirs",
    "destinataire": {
      "nom": "Cerfrance Dauphiné Provence, agence de l'Air Parc, Tiffanie Rocheton, responsable d'agence",
      "email": "contact@dp.cerfrance.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Séance découverte sur site",
      "concept": "Des comptables sur écran toute la journée, avec des périodes de clôture chargées, dans une agence à 10 km de Gillonnay. Une séance découverte de 45 min à 1 h sur le lieu de travail, adaptée au métier, puis un programme de 4 séances sur 2 mois si l'équipe y trouve son compte.",
      "format": "45 min à 1 h sur site, 6 à 20 personnes, à la pause déjeuner ou en fin de poste ; salle de réunion ou réfectoire, matériel apporté par Maude. Interlocuteur : Tiffanie Rocheton, responsable d'agence.",
      "deroule": "Accueil et consignes, 5 min · respiration, 10 min · postures debout ou sur chaise adaptées au poste, 25 min · récupération et retour au calme, 10 min",
      "prix": "Séance découverte 180 € facturée à l'entreprise (grille de pro.maude-yoga.com) ; programme de 4 séances sur 2 mois de 1 400 à 1 600 € ; interventions de 2 h à une journée de 350 à 2 200 €.",
      "gain_lieu": "Une action QVT concrète et peu coûteuse, à 30 minutes de route au plus, portée par une intervenante du territoire ; des équipes qui repartent avec des gestes réutilisables au poste.",
      "demande": "Quinze minutes de téléphone, ou une date pour la séance découverte ; disponibilité en semaine après 13 h.",
      "attention": "Adresse générique : demander la transmission à la QVT, au CSE ou aux RH. Source vérifiée : https://dp.cerfrance.fr/nos-agences/agence-saint-etienne-de-saint-geoirs"
    },
    "email": {
      "objet": "Écrans et clôtures : une pause pour l'agence",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à 10 km de votre agence de l'Air Parc, et j'interviens déjà auprès d'un cabinet de conseil lyonnais. L'expertise comptable, ce sont des journées entières sur écran et des périodes de clôture où tout s'accumule : la nuque, les épaules et le souffle court en font les frais.\n\nJe vous propose une séance découverte de 45 minutes à une heure, dans vos locaux, à la pause déjeuner ou en fin de journée, pour 6 à 20 personnes, à 180 euros : relâchement de la nuque et des épaules, posture devant l'écran, respiration à refaire en trois minutes entre deux dossiers. Ensuite, si l'équipe y trouve son compte, un programme de 4 séances sur 2 mois.\n\nVos collaborateurs repartent avec des gestes courts, refaisables au bureau.\n\nPourriez-vous transmettre à la responsable d'agence ou aux RH ? Quinze minutes au téléphone suffisent, en semaine après 13 h.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · pro.maude-yoga.com"
    }
  },
  {
    "id": "siegl",
    "cat": "pro",
    "nom": "SIEGL, Société d'Impression sur Étoffes du Grand-Lemps (groupe Hermès)",
    "lieu": "Le Grand-Lemps",
    "km": 10,
    "prio": 1,
    "gest": "Impression textile haut de gamme pour la filière Hermès · 100 à 199",
    "contact": "commercial@siegl.com · email (adresse commerciale, demander de transmettre)",
    "deja": "Ateliers d'impression : gestes de précision, stations debout.",
    "format": "Séance découverte de 45 min à 1 h sur site, puis programme de 4 séances sur 2 mois",
    "prix": "Séance découverte 180 € ; programme 4 séances 1 400 à 1 600 €",
    "saison": "Toute l'année",
    "src": "https://www.holding-textile-hermes.com/fr/notre-filiere-textile/siegl",
    "destinataire": {
      "nom": "SIEGL, Société d'Impression sur Étoffes du Grand-Lemps (groupe Hermès), Ségolène Bruno (contact commercial affiché) ; service RH",
      "email": "commercial@siegl.com",
      "canal": "email"
    },
    "projet": {
      "titre": "Séance découverte sur site",
      "concept": "Des ateliers d'impression textile aux gestes de précision et aux stations debout, à 10 km de Gillonnay. Une séance découverte de 45 min à 1 h sur le lieu de travail, adaptée au métier, puis un programme de 4 séances sur 2 mois si l'équipe y trouve son compte.",
      "format": "45 min à 1 h sur site, 6 à 20 personnes, à la pause déjeuner ou en fin de poste ; salle de réunion ou réfectoire, matériel apporté par Maude. Interlocuteur : Ségolène Bruno (contact commercial affiché) ; service RH.",
      "deroule": "Accueil et consignes, 5 min · respiration, 10 min · postures debout ou sur chaise adaptées au poste, 25 min · récupération et retour au calme, 10 min",
      "prix": "Séance découverte 180 € facturée à l'entreprise (grille de pro.maude-yoga.com) ; programme de 4 séances sur 2 mois de 1 400 à 1 600 € ; interventions de 2 h à une journée de 350 à 2 200 €.",
      "gain_lieu": "Une action QVT concrète et peu coûteuse, à 30 minutes de route au plus, portée par une intervenante du territoire ; des équipes qui repartent avec des gestes réutilisables au poste.",
      "demande": "Quinze minutes de téléphone, ou une date pour la séance découverte ; disponibilité en semaine après 13 h.",
      "attention": "Adresse commerciale ou d'accueil : demander la transmission à la QVT, au CSE ou aux RH. Source vérifiée : https://www.holding-textile-hermes.com/fr/notre-filiere-textile/siegl"
    },
    "email": {
      "objet": "Posture et récupération pour vos ateliers",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à 10 km du Grand-Lemps, et j'interviens déjà auprès d'une PME industrielle de la région grenobloise. L'impression textile de précision, ce sont des stations debout prolongées et des gestes fins répétés, et le corps le rend le soir.\n\nJe vous propose une séance découverte de 45 minutes à une heure, sur site, à la pause déjeuner ou en fin de poste, pour 6 à 20 personnes, à 180 euros : le dos, les épaules, le relâchement des mains et des avant-bras, la récupération après le poste. Ensuite, si l'équipe y trouve son compte, un programme de 4 séances sur 2 mois.\n\nVos équipes repartent avec des réflexes simples pour se ménager au poste.\n\nJ'écris à l'adresse commerciale faute d'une autre : pourriez-vous transmettre à la personne qui suit la QVT, le CSE ou les RH ? Quinze minutes au téléphone suffisent, en semaine après 13 h.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · pro.maude-yoga.com"
    }
  },
  {
    "id": "socamel",
    "cat": "pro",
    "nom": "Socamel Technologies (groupe Guillin)",
    "lieu": "Renage",
    "km": 15,
    "prio": 2,
    "gest": "Chariots et matériel de distribution de repas en collectivités · 150 collaborateurs",
    "contact": "formulaire https://www.socamel.fr/contact/ (téléphone 04 76 91 21 21)",
    "deja": "La page Carrières parle d'un « management bienveillant » et du « bien-être de nos collaborateurs ». Ateliers de montage et bureaux.",
    "format": "Séance découverte de 45 min à 1 h sur site, puis programme de 4 séances sur 2 mois",
    "prix": "Séance découverte 180 € ; programme 4 séances 1 400 à 1 600 €",
    "saison": "Toute l'année",
    "src": "https://www.socamel.fr/carrieres/",
    "destinataire": {
      "nom": "Socamel Technologies (groupe Guillin), Carine Latil, responsable RH",
      "email": null,
      "canal": "formulaire https://www.socamel.fr/contact/ (téléphone 04 76 91 21 21)"
    },
    "projet": {
      "titre": "Séance découverte sur site",
      "concept": "Une page Carrières qui parle de « management bienveillant » et du « bien-être de nos collaborateurs », pour 150 personnes entre ateliers de montage et bureaux. Une séance découverte de 45 min à 1 h sur le lieu de travail, adaptée au métier, puis un programme de 4 séances sur 2 mois si l'équipe y trouve son compte.",
      "format": "45 min à 1 h sur site, 6 à 20 personnes, à la pause déjeuner ou en fin de poste ; salle de réunion ou réfectoire, matériel apporté par Maude. Interlocuteur : Carine Latil, responsable RH.",
      "deroule": "Accueil et consignes, 5 min · respiration, 10 min · postures debout ou sur chaise adaptées au poste, 25 min · récupération et retour au calme, 10 min",
      "prix": "Séance découverte 180 € facturée à l'entreprise (grille de pro.maude-yoga.com) ; programme de 4 séances sur 2 mois de 1 400 à 1 600 € ; interventions de 2 h à une journée de 350 à 2 200 €.",
      "gain_lieu": "Une action QVT concrète et peu coûteuse, à 30 minutes de route au plus, portée par une intervenante du territoire ; des équipes qui repartent avec des gestes réutilisables au poste.",
      "demande": "Quinze minutes de téléphone, ou une date pour la séance découverte ; disponibilité en semaine après 13 h.",
      "attention": "Pas d'adresse email publique : formulaire https://www.socamel.fr/contact/ (téléphone 04 76 91 21 21). Le texte se colle dans le formulaire ou sert de trame au téléphone. Source vérifiée : https://www.socamel.fr/carrieres/"
    },
    "email": {
      "objet": "Séance découverte pour vos collaborateurs",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à 15 km de Renage, et j'interviens déjà auprès d'une PME industrielle de la région grenobloise. Votre page Carrières parle de management bienveillant et du bien-être de vos collaborateurs ; je vous propose d'en faire un moment concret, pour vos ateliers de montage comme pour vos bureaux.\n\nLa séance découverte dure 45 minutes à une heure, sur site, à la pause déjeuner ou en fin de poste, pour 6 à 20 personnes, à 180 euros : dos, épaules et récupération pour le montage, nuque, posture devant l'écran et respiration pour les bureaux. Ensuite, si l'équipe y trouve son compte, un programme de 4 séances sur 2 mois.\n\nVos collaborateurs repartent avec des gestes simples à refaire au poste, et un moment partagé entre l'atelier et les bureaux.\n\nAuriez-vous quinze minutes au téléphone, ou une date pour la découverte ? Je suis joignable en semaine après 13 h.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · pro.maude-yoga.com"
    }
  },
  {
    "id": "bievre-est",
    "cat": "pro",
    "nom": "Communauté de communes Bièvre Est",
    "lieu": "Colombe",
    "km": 12,
    "prio": 1,
    "gest": "Collectivité (petite enfance, jeunesse, déchets, eau et assainissement, 14 communes) · 125 agents",
    "contact": "correspondances@cc-bievre-est.fr · email",
    "deja": "Des agents de terrain (déchets, eau, petite enfance) et des bureaux, répartis sur plusieurs sites.",
    "format": "Séance découverte de 45 min à 1 h sur site, puis programme de 4 séances sur 2 mois",
    "prix": "Séance découverte 180 € ; programme 4 séances 1 400 à 1 600 €",
    "saison": "Toute l'année",
    "src": "https://www.bievre-est.fr/la-collectivite/travailler-a-bievre-est/",
    "destinataire": {
      "nom": "Communauté de communes Bièvre Est, direction générale ou service RH (page « Travailler à Bièvre Est »)",
      "email": "correspondances@cc-bievre-est.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Séance découverte sur site",
      "concept": "125 agents répartis sur plusieurs sites, entre terrain (déchets, eau, petite enfance) et bureaux, avec une page « Travailler à Bièvre Est ». Une séance découverte de 45 min à 1 h sur le lieu de travail, adaptée au métier, puis un programme de 4 séances sur 2 mois si l'équipe y trouve son compte.",
      "format": "45 min à 1 h sur site, 6 à 20 personnes, à la pause déjeuner ou en fin de poste ; salle de réunion ou réfectoire, matériel apporté par Maude. Interlocuteur : direction générale ou service RH (page « Travailler à Bièvre Est »).",
      "deroule": "Accueil et consignes, 5 min · respiration, 10 min · postures debout ou sur chaise adaptées au poste, 25 min · récupération et retour au calme, 10 min",
      "prix": "Séance découverte 180 € facturée à l'entreprise (grille de pro.maude-yoga.com) ; programme de 4 séances sur 2 mois de 1 400 à 1 600 € ; interventions de 2 h à une journée de 350 à 2 200 €.",
      "gain_lieu": "Une action QVT concrète et peu coûteuse, à 30 minutes de route au plus, portée par une intervenante du territoire ; des équipes qui repartent avec des gestes réutilisables au poste.",
      "demande": "Quinze minutes de téléphone, ou une date pour la séance découverte ; disponibilité en semaine après 13 h.",
      "attention": "Adresse générique : demander la transmission à la QVT, au CSE ou aux RH. Source vérifiée : https://www.bievre-est.fr/la-collectivite/travailler-a-bievre-est/"
    },
    "email": {
      "objet": "Séance découverte pour les agents",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à 12 km de Colombe. Vos 125 agents ne vivent pas la même journée selon qu'ils collectent les déchets, entretiennent les réseaux d'eau, accueillent les tout-petits ou travaillent au siège, mais tous tiennent un rythme au service des 14 communes.\n\nJe vous propose une séance découverte de 45 minutes à une heure, sur l'un de vos sites, à la pause déjeuner ou en fin de service, pour 6 à 20 agents, à 180 euros : dos et récupération pour les équipes de terrain, respiration et relâchement des tensions pour la petite enfance et les bureaux. Ensuite, si l'équipe y trouve son compte, un programme de 4 séances sur 2 mois.\n\nVos agents repartent avec des gestes simples à refaire seuls, et un moment partagé entre services.\n\nPourriez-vous transmettre à la direction générale ou aux RH ? Quinze minutes au téléphone suffisent, en semaine après 13 h.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · pro.maude-yoga.com"
    }
  },
  {
    "id": "alpes-frais",
    "cat": "pro",
    "nom": "Alpes Frais Production (groupe VT)",
    "lieu": "Rives",
    "km": 15,
    "prio": 2,
    "gest": "Plats préparés, pizzas, quiches et tartes pour la restauration collective (unité neuve de 2020) · 50 à 99",
    "contact": "formulaire https://www.groupe-vt.com/contact.html",
    "deja": "Ligne de production agroalimentaire : froid, gestes répétés, cadences.",
    "format": "Séance découverte de 45 min à 1 h sur site, puis programme de 4 séances sur 2 mois",
    "prix": "Séance découverte 180 € ; programme 4 séances 1 400 à 1 600 €",
    "saison": "Toute l'année",
    "src": "https://www.groupe-vt.com/contact.html",
    "destinataire": {
      "nom": "Alpes Frais Production (groupe VT), direction de site",
      "email": null,
      "canal": "formulaire https://www.groupe-vt.com/contact.html"
    },
    "projet": {
      "titre": "Séance découverte sur site",
      "concept": "Une ligne de production agroalimentaire dans une unité neuve de 2020 : froid, gestes répétés et cadences, à 15 km de Gillonnay. Une séance découverte de 45 min à 1 h sur le lieu de travail, adaptée au métier, puis un programme de 4 séances sur 2 mois si l'équipe y trouve son compte.",
      "format": "45 min à 1 h sur site, 6 à 20 personnes, à la pause déjeuner ou en fin de poste ; salle de réunion ou réfectoire, matériel apporté par Maude. Interlocuteur : direction de site.",
      "deroule": "Accueil et consignes, 5 min · respiration, 10 min · postures debout ou sur chaise adaptées au poste, 25 min · récupération et retour au calme, 10 min",
      "prix": "Séance découverte 180 € facturée à l'entreprise (grille de pro.maude-yoga.com) ; programme de 4 séances sur 2 mois de 1 400 à 1 600 € ; interventions de 2 h à une journée de 350 à 2 200 €.",
      "gain_lieu": "Une action QVT concrète et peu coûteuse, à 30 minutes de route au plus, portée par une intervenante du territoire ; des équipes qui repartent avec des gestes réutilisables au poste.",
      "demande": "Quinze minutes de téléphone, ou une date pour la séance découverte ; disponibilité en semaine après 13 h.",
      "attention": "Pas d'adresse email publique : formulaire https://www.groupe-vt.com/contact.html. Le texte se colle dans le formulaire ou sert de trame au téléphone. Source vérifiée : https://www.groupe-vt.com/contact.html"
    },
    "email": {
      "objet": "Le dos de vos équipes de production",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à 15 km de Rives, et j'interviens déjà auprès d'une PME industrielle de la région grenobloise. Une ligne de plats préparés, c'est le froid, des gestes répétés et une cadence à tenir : les épaules, les mains et le bas du dos le rendent en fin de poste.\n\nJe vous propose une séance découverte de 45 minutes à une heure, sur site, à la pause déjeuner ou en fin de poste, pour 6 à 20 personnes, à 180 euros : le dos, les épaules, le relâchement des mains et la récupération après le froid. Ensuite, si l'équipe y trouve son compte, un programme de 4 séances sur 2 mois.\n\nVos opérateurs repartent avec des réflexes simples pour se ménager au poste.\n\nAuriez-vous quinze minutes au téléphone, ou une date pour la découverte ? Je suis joignable en semaine après 13 h.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · pro.maude-yoga.com"
    }
  },
  {
    "id": "tissages-perrin",
    "cat": "pro",
    "nom": "Les Tissages Perrin et Alpasoie",
    "lieu": "Le Grand-Lemps et Apprieu",
    "km": 10,
    "prio": 1,
    "gest": "Tissage de soie et confection d'accessoires textiles haut de gamme (deux sites) · 50 à 99 sur chaque site",
    "contact": "commercial@tissages-perrin.com · email (adresse commerciale, demander de transmettre)",
    "deja": "Deux ateliers à 5 km l'un de l'autre, des gestes de précision sur métiers et en confection.",
    "format": "Séance découverte de 45 min à 1 h sur site, puis programme de 4 séances sur 2 mois",
    "prix": "Séance découverte 180 € ; programme 4 séances 1 400 à 1 600 €",
    "saison": "Toute l'année",
    "src": "https://www.tissages-perrin.com/fr/contact.html",
    "destinataire": {
      "nom": "Les Tissages Perrin et Alpasoie, direction ; service RH",
      "email": "commercial@tissages-perrin.com",
      "canal": "email"
    },
    "projet": {
      "titre": "Séance découverte sur site",
      "concept": "Deux ateliers à 5 km l'un de l'autre, des gestes de précision sur métiers à tisser et en confection, à 10 km de Gillonnay. Une séance découverte de 45 min à 1 h sur le lieu de travail, adaptée au métier, puis un programme de 4 séances sur 2 mois si l'équipe y trouve son compte.",
      "format": "45 min à 1 h sur site, 6 à 20 personnes, à la pause déjeuner ou en fin de poste ; salle de réunion ou réfectoire, matériel apporté par Maude. Interlocuteur : direction ; service RH.",
      "deroule": "Accueil et consignes, 5 min · respiration, 10 min · postures debout ou sur chaise adaptées au poste, 25 min · récupération et retour au calme, 10 min",
      "prix": "Séance découverte 180 € facturée à l'entreprise (grille de pro.maude-yoga.com) ; programme de 4 séances sur 2 mois de 1 400 à 1 600 € ; interventions de 2 h à une journée de 350 à 2 200 €.",
      "gain_lieu": "Une action QVT concrète et peu coûteuse, à 30 minutes de route au plus, portée par une intervenante du territoire ; des équipes qui repartent avec des gestes réutilisables au poste.",
      "demande": "Quinze minutes de téléphone, ou une date pour la séance découverte ; disponibilité en semaine après 13 h.",
      "attention": "Adresse commerciale ou d'accueil : demander la transmission à la QVT, au CSE ou aux RH. Source vérifiée : https://www.tissages-perrin.com/fr/contact.html"
    },
    "email": {
      "objet": "Posture et récupération, vos deux ateliers",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à 10 km du Grand-Lemps et d'Apprieu, et j'interviens déjà auprès d'une PME industrielle de la région grenobloise. Le tissage de soie et la confection, ce sont des gestes de précision répétés et une posture tenue des heures durant.\n\nJe vous propose une séance découverte de 45 minutes à une heure, sur l'un de vos deux sites, à la pause déjeuner ou en fin de poste, pour 6 à 20 personnes, à 180 euros : le dos, les épaules, les mains et les avant-bras, la récupération. Ensuite, si l'équipe y trouve son compte, un programme de 4 séances sur 2 mois.\n\nVos équipes repartent avec des réflexes simples pour se ménager au poste.\n\nJ'écris à l'adresse commerciale faute d'une autre : pourriez-vous transmettre à la personne qui suit la QVT, le CSE ou les RH ? Quinze minutes au téléphone suffisent, en semaine après 13 h.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · pro.maude-yoga.com"
    }
  },
  {
    "id": "rescaset",
    "cat": "pro",
    "nom": "Rescaset Concept (groupe Guillin)",
    "lieu": "Colombe",
    "km": 12,
    "prio": 1,
    "gest": "Emballages alimentaires et machines de scellage pour la restauration collective · 50 à 99",
    "contact": "info@rescaset.com · email",
    "deja": "Même groupe que Socamel à Renage : un atelier et des bureaux sur le parc Bièvre Dauphine.",
    "format": "Séance découverte de 45 min à 1 h sur site, puis programme de 4 séances sur 2 mois",
    "prix": "Séance découverte 180 € ; programme 4 séances 1 400 à 1 600 €",
    "saison": "Toute l'année",
    "src": "https://rescaset.com/en/contact/",
    "destinataire": {
      "nom": "Rescaset Concept (groupe Guillin), direction de site",
      "email": "info@rescaset.com",
      "canal": "email"
    },
    "projet": {
      "titre": "Séance découverte sur site",
      "concept": "Un atelier et des bureaux sur le parc Bièvre Dauphine, dans le même groupe que Socamel à Renage, à 12 km de Gillonnay. Une séance découverte de 45 min à 1 h sur le lieu de travail, adaptée au métier, puis un programme de 4 séances sur 2 mois si l'équipe y trouve son compte.",
      "format": "45 min à 1 h sur site, 6 à 20 personnes, à la pause déjeuner ou en fin de poste ; salle de réunion ou réfectoire, matériel apporté par Maude. Interlocuteur : direction de site.",
      "deroule": "Accueil et consignes, 5 min · respiration, 10 min · postures debout ou sur chaise adaptées au poste, 25 min · récupération et retour au calme, 10 min",
      "prix": "Séance découverte 180 € facturée à l'entreprise (grille de pro.maude-yoga.com) ; programme de 4 séances sur 2 mois de 1 400 à 1 600 € ; interventions de 2 h à une journée de 350 à 2 200 €.",
      "gain_lieu": "Une action QVT concrète et peu coûteuse, à 30 minutes de route au plus, portée par une intervenante du territoire ; des équipes qui repartent avec des gestes réutilisables au poste.",
      "demande": "Quinze minutes de téléphone, ou une date pour la séance découverte ; disponibilité en semaine après 13 h.",
      "attention": "Adresse générique : demander la transmission à la QVT, au CSE ou aux RH. Source vérifiée : https://rescaset.com/en/contact/"
    },
    "email": {
      "objet": "Une pause pour l'atelier et les bureaux",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à 12 km de votre site du parc Bièvre Dauphine, et j'interviens déjà auprès d'une PME industrielle de la région grenobloise. Chez vous, un atelier et des bureaux cohabitent sur le même site.\n\nJe vous propose une séance découverte de 45 minutes à une heure, sur site, à la pause déjeuner ou en fin de poste, pour 6 à 20 personnes, à 180 euros : dos, épaules et récupération pour l'atelier, nuque, posture devant l'écran et respiration pour les bureaux. Ensuite, si l'équipe y trouve son compte, un programme de 4 séances sur 2 mois.\n\nVos collaborateurs repartent avec des gestes simples à refaire au poste, et un moment partagé entre l'atelier et les bureaux.\n\nPourriez-vous transmettre à la personne qui suit la QVT, le CSE ou les RH ? Quinze minutes au téléphone suffisent, en semaine après 13 h.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · pro.maude-yoga.com"
    }
  },
  {
    "id": "sda",
    "cat": "pro",
    "nom": "SDA, Service Distribution Automatique",
    "lieu": "Apprieu",
    "km": 12,
    "prio": 1,
    "gest": "Distribution automatique (boissons, snacking) en entreprises et collectivités · 50 à 99",
    "contact": "contact@sda-france.fr · email",
    "deja": "Des tournées et de la manutention pour les techniciens, des bureaux à Apprieu ; leurs clients sont les entreprises de la zone.",
    "format": "Séance découverte de 45 min à 1 h sur site, puis programme de 4 séances sur 2 mois",
    "prix": "Séance découverte 180 € ; programme 4 séances 1 400 à 1 600 €",
    "saison": "Toute l'année",
    "src": "https://sda-france.fr/contact/",
    "destinataire": {
      "nom": "SDA, Service Distribution Automatique, Francis Sarra, gérant",
      "email": "contact@sda-france.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Séance découverte sur site",
      "concept": "Des techniciens en tournée avec de la manutention, et des bureaux à Apprieu, à 12 km de Gillonnay. Une séance découverte de 45 min à 1 h sur le lieu de travail, adaptée au métier, puis un programme de 4 séances sur 2 mois si l'équipe y trouve son compte.",
      "format": "45 min à 1 h sur site, 6 à 20 personnes, à la pause déjeuner ou en fin de poste ; salle de réunion ou réfectoire, matériel apporté par Maude. Interlocuteur : Francis Sarra, gérant.",
      "deroule": "Accueil et consignes, 5 min · respiration, 10 min · postures debout ou sur chaise adaptées au poste, 25 min · récupération et retour au calme, 10 min",
      "prix": "Séance découverte 180 € facturée à l'entreprise (grille de pro.maude-yoga.com) ; programme de 4 séances sur 2 mois de 1 400 à 1 600 € ; interventions de 2 h à une journée de 350 à 2 200 €.",
      "gain_lieu": "Une action QVT concrète et peu coûteuse, à 30 minutes de route au plus, portée par une intervenante du territoire ; des équipes qui repartent avec des gestes réutilisables au poste.",
      "demande": "Quinze minutes de téléphone, ou une date pour la séance découverte ; disponibilité en semaine après 13 h.",
      "attention": "Adresse générique : demander la transmission à la QVT, au CSE ou aux RH. Source vérifiée : https://sda-france.fr/contact/"
    },
    "email": {
      "objet": "Récupération pour vos techniciens en tournée",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à 12 km d'Apprieu, et j'anime des ateliers de posture, de respiration et de récupération en entreprise. La distribution automatique, ce sont des techniciens en tournée qui chargent, déchargent et remplissent des machines toute la journée, et des équipes de bureau derrière un écran.\n\nJe vous propose une séance découverte de 45 minutes à une heure, dans vos locaux, à la pause déjeuner ou au retour de tournée, pour 6 à 20 personnes, à 180 euros : dos, épaules et récupération pour les techniciens, nuque, posture devant l'écran et respiration pour les bureaux. Ensuite, si l'équipe y trouve son compte, un programme de 4 séances sur 2 mois.\n\nVos salariés repartent avec des gestes simples qu'ils refont seuls, dans le camion comme au bureau.\n\nAuriez-vous quinze minutes au téléphone, ou une date pour la découverte ? Je suis joignable en semaine après 13 h.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · pro.maude-yoga.com"
    }
  },
  {
    "id": "biotem",
    "cat": "pro",
    "nom": "Biotem",
    "lieu": "Apprieu et Colombe",
    "km": 12,
    "prio": 1,
    "gest": "Biotechnologies : anticorps et immunoessais, laboratoires et production · 50 à 99",
    "contact": "recrutement@biotem.fr · email",
    "deja": "Du travail de paillasse et de bureau, deux sites à 5 km.",
    "format": "Séance découverte de 45 min à 1 h sur site, puis programme de 4 séances sur 2 mois",
    "prix": "Séance découverte 180 € ; programme 4 séances 1 400 à 1 600 €",
    "saison": "Toute l'année",
    "src": "https://www.biotem.fr/contact/",
    "destinataire": {
      "nom": "Biotem, service RH",
      "email": "recrutement@biotem.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Séance découverte sur site",
      "concept": "Du travail de paillasse et de bureau sur deux sites à 5 km l'un de l'autre, à 12 km de Gillonnay. Une séance découverte de 45 min à 1 h sur le lieu de travail, adaptée au métier, puis un programme de 4 séances sur 2 mois si l'équipe y trouve son compte.",
      "format": "45 min à 1 h sur site, 6 à 20 personnes, à la pause déjeuner ou en fin de poste ; salle de réunion ou réfectoire, matériel apporté par Maude. Interlocuteur : service RH.",
      "deroule": "Accueil et consignes, 5 min · respiration, 10 min · postures debout ou sur chaise adaptées au poste, 25 min · récupération et retour au calme, 10 min",
      "prix": "Séance découverte 180 € facturée à l'entreprise (grille de pro.maude-yoga.com) ; programme de 4 séances sur 2 mois de 1 400 à 1 600 € ; interventions de 2 h à une journée de 350 à 2 200 €.",
      "gain_lieu": "Une action QVT concrète et peu coûteuse, à 30 minutes de route au plus, portée par une intervenante du territoire ; des équipes qui repartent avec des gestes réutilisables au poste.",
      "demande": "Quinze minutes de téléphone, ou une date pour la séance découverte ; disponibilité en semaine après 13 h.",
      "attention": "Adresse générique : demander la transmission à la QVT, au CSE ou aux RH. Source vérifiée : https://www.biotem.fr/contact/"
    },
    "email": {
      "objet": "Paillasse et écran, une pause pour l'équipe",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à 12 km d'Apprieu et de Colombe, et j'interviens déjà auprès d'une scale-up tech grenobloise. En biotechnologies, la journée se partage entre la paillasse, penchée et précise, et le bureau, sur écran : la nuque et les épaules le savent.\n\nJe vous propose une séance découverte de 45 minutes à une heure, sur l'un de vos deux sites, à la pause déjeuner ou en fin de journée, pour 6 à 20 personnes, à 180 euros : relâchement de la nuque et des épaules, posture au poste, respiration à refaire en trois minutes entre deux manipulations. Ensuite, si l'équipe y trouve son compte, un programme de 4 séances sur 2 mois.\n\nVos collaborateurs repartent avec des gestes courts, refaisables au labo comme au bureau.\n\nAuriez-vous quinze minutes au téléphone, ou une date pour la découverte ? Je suis joignable en semaine après 13 h.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · pro.maude-yoga.com"
    }
  },
  {
    "id": "college-liers-lemps",
    "cat": "pro",
    "nom": "Collège Liers et Lemps",
    "lieu": "Le Grand-Lemps",
    "km": 10,
    "prio": 1,
    "gest": "Collège public · 50 à 99",
    "contact": "ce.0380026X@ac-grenoble.fr · email",
    "deja": "Une équipe enseignante et de vie scolaire ; Maude intervient déjà en collège et en lycée sur la gestion du stress.",
    "format": "Séance découverte de 45 min à 1 h sur site, puis programme de 4 séances sur 2 mois",
    "prix": "Séance découverte 180 € ; programme 4 séances 1 400 à 1 600 €",
    "saison": "Toute l'année",
    "src": "https://bv.ac-grenoble.fr/carteforpub/uai/0380026X",
    "destinataire": {
      "nom": "Collège Liers et Lemps, Mme Christine Guttin, principale",
      "email": "ce.0380026X@ac-grenoble.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Séance découverte sur site",
      "concept": "Une équipe enseignante et de vie scolaire à 10 km de Gillonnay ; Maude intervient déjà en collège et en lycée sur la gestion du stress. Une séance découverte de 45 min à 1 h sur le lieu de travail, adaptée au métier, puis un programme de 4 séances sur 2 mois si l'équipe y trouve son compte.",
      "format": "45 min à 1 h sur site, 6 à 20 personnes, à la pause déjeuner ou en fin de poste ; salle de réunion ou réfectoire, matériel apporté par Maude. Interlocuteur : Mme Christine Guttin, principale.",
      "deroule": "Accueil et consignes, 5 min · respiration, 10 min · postures debout ou sur chaise adaptées au poste, 25 min · récupération et retour au calme, 10 min",
      "prix": "Séance découverte 180 € facturée à l'entreprise (grille de pro.maude-yoga.com) ; programme de 4 séances sur 2 mois de 1 400 à 1 600 € ; interventions de 2 h à une journée de 350 à 2 200 €.",
      "gain_lieu": "Une action QVT concrète et peu coûteuse, à 30 minutes de route au plus, portée par une intervenante du territoire ; des équipes qui repartent avec des gestes réutilisables au poste.",
      "demande": "Quinze minutes de téléphone, ou une date pour la séance découverte ; disponibilité en semaine après 13 h.",
      "attention": "Adresse générique : demander la transmission à la QVT, au CSE ou aux RH. Source vérifiée : https://bv.ac-grenoble.fr/carteforpub/uai/0380026X"
    },
    "email": {
      "objet": "Gestion du stress pour l'équipe du collège",
      "corps": "Bonjour Madame Guttin,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à 10 km du Grand-Lemps, et j'interviens déjà en collège et en lycée sur la gestion du stress. Une équipe enseignante et de vie scolaire tient toute la journée devant des adolescents, et cela demande une réserve de calme qu'il faut pouvoir reconstituer.\n\nJe vous propose une séance découverte de 45 minutes à une heure, dans l'établissement, à la pause méridienne ou en fin de journée, pour 6 à 20 personnes, à 180 euros : respiration, retour au calme après une situation tendue, posture pour tenir debout ou en classe. Ensuite, si l'équipe y trouve son compte, un programme de 4 séances sur 2 mois.\n\nVous y gagnez des adultes plus posés devant les élèves, avec des outils qu'ils gardent.\n\nAuriez-vous quinze minutes au téléphone, ou une date pour la découverte ? Je suis joignable en semaine après 13 h.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · pro.maude-yoga.com"
    }
  },
  {
    "id": "college-desnos",
    "cat": "pro",
    "nom": "Collège Robert Desnos",
    "lieu": "Rives",
    "km": 15,
    "prio": 1,
    "gest": "Collège public avec SEGPA · 50 à 99",
    "contact": "ce.0382266G@ac-grenoble.fr · email",
    "deja": "Une équipe enseignante et de vie scolaire, avec une SEGPA ; Maude intervient déjà en collège et en lycée sur la gestion du stress.",
    "format": "Séance découverte de 45 min à 1 h sur site, puis programme de 4 séances sur 2 mois",
    "prix": "Séance découverte 180 € ; programme 4 séances 1 400 à 1 600 €",
    "saison": "Toute l'année",
    "src": "https://bv.ac-grenoble.fr/carteforpub/uai/0382266G",
    "destinataire": {
      "nom": "Collège Robert Desnos, M. Alain Dufour, principal",
      "email": "ce.0382266G@ac-grenoble.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Séance découverte sur site",
      "concept": "Une équipe enseignante et de vie scolaire avec une SEGPA, à 15 km de Gillonnay ; Maude intervient déjà en collège et en lycée sur la gestion du stress. Une séance découverte de 45 min à 1 h sur le lieu de travail, adaptée au métier, puis un programme de 4 séances sur 2 mois si l'équipe y trouve son compte.",
      "format": "45 min à 1 h sur site, 6 à 20 personnes, à la pause déjeuner ou en fin de poste ; salle de réunion ou réfectoire, matériel apporté par Maude. Interlocuteur : M. Alain Dufour, principal.",
      "deroule": "Accueil et consignes, 5 min · respiration, 10 min · postures debout ou sur chaise adaptées au poste, 25 min · récupération et retour au calme, 10 min",
      "prix": "Séance découverte 180 € facturée à l'entreprise (grille de pro.maude-yoga.com) ; programme de 4 séances sur 2 mois de 1 400 à 1 600 € ; interventions de 2 h à une journée de 350 à 2 200 €.",
      "gain_lieu": "Une action QVT concrète et peu coûteuse, à 30 minutes de route au plus, portée par une intervenante du territoire ; des équipes qui repartent avec des gestes réutilisables au poste.",
      "demande": "Quinze minutes de téléphone, ou une date pour la séance découverte ; disponibilité en semaine après 13 h.",
      "attention": "Adresse générique : demander la transmission à la QVT, au CSE ou aux RH. Source vérifiée : https://bv.ac-grenoble.fr/carteforpub/uai/0382266G"
    },
    "email": {
      "objet": "Gestion du stress pour l'équipe du collège",
      "corps": "Bonjour Monsieur Dufour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à 15 km de Rives, et j'interviens déjà en collège et en lycée sur la gestion du stress. Une équipe enseignante et de vie scolaire, avec une SEGPA, tient toute la journée devant des adolescents qui demandent beaucoup, et cela suppose une réserve de calme à reconstituer.\n\nJe vous propose une séance découverte de 45 minutes à une heure, dans l'établissement, à la pause méridienne ou en fin de journée, pour 6 à 20 personnes, à 180 euros : respiration, retour au calme après une situation tendue, posture pour tenir debout ou en classe. Ensuite, si l'équipe y trouve son compte, un programme de 4 séances sur 2 mois.\n\nVous y gagnez des adultes plus posés devant les élèves, avec des outils qu'ils gardent.\n\nAuriez-vous quinze minutes au téléphone, ou une date pour la découverte ? Je suis joignable en semaine après 13 h.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · pro.maude-yoga.com"
    }
  },
  {
    "id": "mairie-renage",
    "cat": "pro",
    "nom": "Commune de Renage",
    "lieu": "Renage",
    "km": 15,
    "prio": 1,
    "gest": "Collectivité territoriale · 50 à 99 agents",
    "contact": "contact@ville-renage.fr · email",
    "deja": "Agents techniques, périscolaire et administration.",
    "format": "Séance découverte de 45 min à 1 h sur site, puis programme de 4 séances sur 2 mois",
    "prix": "Séance découverte 180 € ; programme 4 séances 1 400 à 1 600 €",
    "saison": "Toute l'année",
    "src": "https://www.maires-isere.fr/communes/renage/",
    "destinataire": {
      "nom": "Commune de Renage, direction générale des services",
      "email": "contact@ville-renage.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Séance découverte sur site",
      "concept": "Des agents techniques, périscolaires et administratifs, à 15 km de Gillonnay. Une séance découverte de 45 min à 1 h sur le lieu de travail, adaptée au métier, puis un programme de 4 séances sur 2 mois si l'équipe y trouve son compte.",
      "format": "45 min à 1 h sur site, 6 à 20 personnes, à la pause déjeuner ou en fin de poste ; salle de réunion ou réfectoire, matériel apporté par Maude. Interlocuteur : direction générale des services.",
      "deroule": "Accueil et consignes, 5 min · respiration, 10 min · postures debout ou sur chaise adaptées au poste, 25 min · récupération et retour au calme, 10 min",
      "prix": "Séance découverte 180 € facturée à l'entreprise (grille de pro.maude-yoga.com) ; programme de 4 séances sur 2 mois de 1 400 à 1 600 € ; interventions de 2 h à une journée de 350 à 2 200 €.",
      "gain_lieu": "Une action QVT concrète et peu coûteuse, à 30 minutes de route au plus, portée par une intervenante du territoire ; des équipes qui repartent avec des gestes réutilisables au poste.",
      "demande": "Quinze minutes de téléphone, ou une date pour la séance découverte ; disponibilité en semaine après 13 h.",
      "attention": "Adresse générique : demander la transmission à la QVT, au CSE ou aux RH. Source vérifiée : https://www.maires-isere.fr/communes/renage/"
    },
    "email": {
      "objet": "Séance découverte pour les agents de Renage",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à 15 km de Renage, et j'anime des ateliers de respiration, de posture et de récupération en entreprise et en collectivité. Vos agents des services techniques, du périscolaire et de l'administration n'ont pas les mêmes journées, mais tous tiennent un rythme soutenu au service des habitants.\n\nJe vous propose une séance découverte de 45 minutes à une heure, sur place, à la pause déjeuner ou en fin de service, pour 6 à 20 agents, à 180 euros : dos et récupération pour les équipes techniques, respiration et relâchement des tensions pour le périscolaire et les bureaux. Ensuite, si l'équipe y trouve son compte, un programme de 4 séances sur 2 mois.\n\nVos agents repartent avec des gestes simples à refaire seuls.\n\nPourriez-vous transmettre à la direction générale des services ou aux RH ? Quinze minutes au téléphone suffisent, en semaine après 13 h.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · pro.maude-yoga.com"
    }
  },
  {
    "id": "mairie-apprieu",
    "cat": "pro",
    "nom": "Commune d'Apprieu",
    "lieu": "Apprieu",
    "km": 12,
    "prio": 1,
    "gest": "Collectivité territoriale · 50 à 99 agents",
    "contact": "accueil@apprieu.fr · email",
    "deja": "Agents techniques, périscolaire et administration, au bout de la plaine.",
    "format": "Séance découverte de 45 min à 1 h sur site, puis programme de 4 séances sur 2 mois",
    "prix": "Séance découverte 180 € ; programme 4 séances 1 400 à 1 600 €",
    "saison": "Toute l'année",
    "src": "https://www.apprieu.fr/",
    "destinataire": {
      "nom": "Commune d'Apprieu, direction générale des services",
      "email": "accueil@apprieu.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Séance découverte sur site",
      "concept": "Des agents techniques, périscolaires et administratifs, au bout de la plaine, à 12 km de Gillonnay. Une séance découverte de 45 min à 1 h sur le lieu de travail, adaptée au métier, puis un programme de 4 séances sur 2 mois si l'équipe y trouve son compte.",
      "format": "45 min à 1 h sur site, 6 à 20 personnes, à la pause déjeuner ou en fin de poste ; salle de réunion ou réfectoire, matériel apporté par Maude. Interlocuteur : direction générale des services.",
      "deroule": "Accueil et consignes, 5 min · respiration, 10 min · postures debout ou sur chaise adaptées au poste, 25 min · récupération et retour au calme, 10 min",
      "prix": "Séance découverte 180 € facturée à l'entreprise (grille de pro.maude-yoga.com) ; programme de 4 séances sur 2 mois de 1 400 à 1 600 € ; interventions de 2 h à une journée de 350 à 2 200 €.",
      "gain_lieu": "Une action QVT concrète et peu coûteuse, à 30 minutes de route au plus, portée par une intervenante du territoire ; des équipes qui repartent avec des gestes réutilisables au poste.",
      "demande": "Quinze minutes de téléphone, ou une date pour la séance découverte ; disponibilité en semaine après 13 h.",
      "attention": "Adresse générique : demander la transmission à la QVT, au CSE ou aux RH. Source vérifiée : https://www.apprieu.fr/"
    },
    "email": {
      "objet": "Séance découverte pour les agents d'Apprieu",
      "corps": "Bonjour,\n\nJe suis Maude Pontet, professeure de yoga à Gillonnay, à 12 km d'Apprieu, à l'autre bout de la plaine, et j'anime des ateliers de respiration, de posture et de récupération en collectivité. Vos agents des services techniques, du périscolaire et de l'administration n'ont pas les mêmes journées, mais tous tiennent un rythme au service des habitants.\n\nJe vous propose une séance découverte de 45 minutes à une heure, sur place, à la pause déjeuner ou en fin de service, pour 6 à 20 agents, à 180 euros : dos et récupération pour les équipes techniques, respiration et relâchement des tensions pour le périscolaire et les bureaux. Ensuite, si l'équipe y trouve son compte, un programme de 4 séances sur 2 mois.\n\nVos agents repartent avec des gestes simples à refaire seuls.\n\nPourriez-vous transmettre à la direction générale des services ou aux RH ? Quinze minutes au téléphone suffisent, en semaine après 13 h.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · pro.maude-yoga.com"
    }
  },
  {
    "id": "constellium-ctec",
    "cat": "pro",
    "nom": "C-TEC, Constellium Technology Center",
    "lieu": "Voreppe (Centr'Alp)",
    "km": 35,
    "prio": 2,
    "gest": "Centre de recherche et développement aluminium · environ 250 à Voreppe",
    "contact": "formulaire https://www.constellium.com/contact-us (téléphone 04 76 57 80 00)",
    "deja": "Chercheurs et techniciens, laboratoires et bureaux ; index d'égalité professionnelle publié.",
    "format": "Séance découverte de 45 min à 1 h sur site, puis programme de 4 séances sur 2 mois",
    "prix": "Séance découverte 180 € ; programme 4 séances 1 400 à 1 600 €",
    "saison": "Toute l'année",
    "src": "https://www.constellium.com/fr/sites-de-production/c-tec",
    "destinataire": {
      "nom": "C-TEC, Constellium Technology Center, direction du site ou service RH",
      "email": null,
      "canal": "formulaire https://www.constellium.com/contact-us (téléphone 04 76 57 80 00)"
    },
    "projet": {
      "titre": "Séance découverte sur site",
      "concept": "Environ 250 chercheurs et techniciens entre laboratoires et bureaux à Voreppe, à moins de trente minutes de Gillonnay. Une séance découverte de 45 min à 1 h sur le lieu de travail, adaptée au métier, puis un programme de 4 séances sur 2 mois si l'équipe y trouve son compte.",
      "format": "45 min à 1 h sur site, 6 à 20 personnes, à la pause déjeuner ou en fin de poste ; salle de réunion ou réfectoire, matériel apporté par Maude. Interlocuteur : direction du site ou service RH.",
      "deroule": "Accueil et consignes, 5 min · respiration, 10 min · postures debout ou sur chaise adaptées au poste, 25 min · récupération et retour au calme, 10 min",
      "prix": "Séance découverte 180 € facturée à l'entreprise (grille de pro.maude-yoga.com) ; programme de 4 séances sur 2 mois de 1 400 à 1 600 € ; interventions de 2 h à une journée de 350 à 2 200 €.",
      "gain_lieu": "Une action QVT concrète et peu coûteuse, à 30 minutes de route au plus, portée par une intervenante du territoire ; des équipes qui repartent avec des gestes réutilisables au poste.",
      "demande": "Quinze minutes de téléphone, ou une date pour la séance découverte ; disponibilité en semaine après 13 h.",
      "attention": "Pas d'adresse email publique : formulaire https://www.constellium.com/contact-us (téléphone 04 76 57 80 00). Le texte se colle dans le formulaire ou sert de trame au téléphone. Source vérifiée : https://www.constellium.com/fr/sites-de-production/c-tec"
    },
    "email": {
      "objet": "Yoga et respiration sur site pour C-TEC",
      "corps": "Bonjour,\n\nProfesseure de yoga à Gillonnay, j'interviens sur le lieu de travail avec du yoga et de la respiration. Je vous écris parce que C-TEC réunit à Voreppe environ 250 chercheurs et techniciens, entre laboratoires et bureaux, tout près de chez moi.\n\nJe propose une séance découverte sur site, de 45 minutes à 1 heure, à la pause déjeuner ou en fin de journée, pour 6 à 20 personnes, à 180 euros, pensée pour les journées sur écran ou sur paillasse : nuque, épaules, dos, et une respiration qui fait redescendre la pression. Si l'équipe accroche, un programme de 4 séances sur 2 mois prend le relais.\n\nVos collaborateurs repartent avec quelques gestes simples, réutilisables à leur poste.\n\nSi ce n'est pas vous, merci de transmettre à la personne en charge de la QVT ou du CSE. Quinze minutes au téléphone, en semaine après 13 h, suffisent pour caler une date.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · pro.maude-yoga.com"
    }
  },
  {
    "id": "telenco",
    "cat": "pro",
    "nom": "Telenco",
    "lieu": "Moirans",
    "km": 30,
    "prio": 1,
    "gest": "Équipements télécoms fibre, siège et unité de production · 100 à 199 à Moirans, plus de 650 dans le groupe",
    "contact": "contact@telenco.com · email",
    "deja": "Partenariat « Passe Décisive » avec Sport dans la Ville, note CDP B 2025 : une entreprise qui affiche le sport et l'engagement. Production et bureaux sur le même site.",
    "format": "Séance découverte de 45 min à 1 h sur site, puis programme de 4 séances sur 2 mois",
    "prix": "Séance découverte 180 € ; programme 4 séances 1 400 à 1 600 €",
    "saison": "Toute l'année",
    "src": "https://www.telenco.com/",
    "destinataire": {
      "nom": "Telenco, service RH",
      "email": "contact@telenco.com",
      "canal": "email"
    },
    "projet": {
      "titre": "Séance découverte sur site",
      "concept": "Une entreprise qui affiche le sport (Passe Décisive avec Sport dans la Ville) et réunit production et bureaux sur le même site. Une séance découverte de 45 min à 1 h sur le lieu de travail, adaptée au métier, puis un programme de 4 séances sur 2 mois si l'équipe y trouve son compte.",
      "format": "45 min à 1 h sur site, 6 à 20 personnes, à la pause déjeuner ou en fin de poste ; salle de réunion ou réfectoire, matériel apporté par Maude. Interlocuteur : service RH.",
      "deroule": "Accueil et consignes, 5 min · respiration, 10 min · postures debout ou sur chaise adaptées au poste, 25 min · récupération et retour au calme, 10 min",
      "prix": "Séance découverte 180 € facturée à l'entreprise (grille de pro.maude-yoga.com) ; programme de 4 séances sur 2 mois de 1 400 à 1 600 € ; interventions de 2 h à une journée de 350 à 2 200 €.",
      "gain_lieu": "Une action QVT concrète et peu coûteuse, à 30 minutes de route au plus, portée par une intervenante du territoire ; des équipes qui repartent avec des gestes réutilisables au poste.",
      "demande": "Quinze minutes de téléphone, ou une date pour la séance découverte ; disponibilité en semaine après 13 h.",
      "attention": "Adresse générique : demander la transmission à la QVT, au CSE ou aux RH. Source vérifiée : https://www.telenco.com/"
    },
    "email": {
      "objet": "Une séance de yoga sur votre site de Moirans",
      "corps": "Bonjour,\n\nProfesseure de yoga à Gillonnay, j'interviens sur le lieu de travail avec du yoga et de la respiration. Telenco m'a donné envie d'écrire : une entreprise qui soutient Sport dans la Ville avec Passe Décisive, et qui réunit production et bureaux sur son site de Moirans.\n\nJe propose une séance découverte sur site, de 45 minutes à 1 heure, à la pause déjeuner ou en fin de poste, pour 6 à 20 personnes, à 180 euros, adaptée aux deux publics : dos et récupération pour l'atelier, écrans et pression pour les bureaux. Si l'équipe accroche, un programme de 4 séances sur 2 mois prend le relais.\n\nVos salariés repartent avec des gestes simples à refaire à leur poste.\n\nSi ce n'est pas vous, merci de transmettre à la personne en charge de la QVT ou du CSE. Quinze minutes au téléphone, en semaine après 13 h, suffisent pour caler une date.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · pro.maude-yoga.com"
    }
  },
  {
    "id": "hutchinson-moirans",
    "cat": "pro",
    "nom": "Hutchinson, site de Moirans (Building Sealing)",
    "lieu": "Moirans",
    "km": 30,
    "prio": 2,
    "gest": "Profilés d'étanchéité caoutchouc et thermoplastique · 100 à 199",
    "contact": "formulaire https://buildingsealing.hutchinson.com/demande-de-devis (téléphone 04 76 35 79 00)",
    "deja": "Extrusion et ateliers en équipes : postes physiques.",
    "format": "Séance découverte de 45 min à 1 h sur site, puis programme de 4 séances sur 2 mois",
    "prix": "Séance découverte 180 € ; programme 4 séances 1 400 à 1 600 €",
    "saison": "Toute l'année",
    "src": "https://buildingsealing.hutchinson.com/contact",
    "destinataire": {
      "nom": "Hutchinson, site de Moirans (Building Sealing), direction de site",
      "email": null,
      "canal": "formulaire https://buildingsealing.hutchinson.com/demande-de-devis (téléphone 04 76 35 79 00)"
    },
    "projet": {
      "titre": "Séance découverte sur site",
      "concept": "Extrusion et ateliers en équipes : des postes physiques, le dos et la récupération en fin de poste. Une séance découverte de 45 min à 1 h sur le lieu de travail, adaptée au métier, puis un programme de 4 séances sur 2 mois si l'équipe y trouve son compte.",
      "format": "45 min à 1 h sur site, 6 à 20 personnes, à la pause déjeuner ou en fin de poste ; salle de réunion ou réfectoire, matériel apporté par Maude. Interlocuteur : direction de site.",
      "deroule": "Accueil et consignes, 5 min · respiration, 10 min · postures debout ou sur chaise adaptées au poste, 25 min · récupération et retour au calme, 10 min",
      "prix": "Séance découverte 180 € facturée à l'entreprise (grille de pro.maude-yoga.com) ; programme de 4 séances sur 2 mois de 1 400 à 1 600 € ; interventions de 2 h à une journée de 350 à 2 200 €.",
      "gain_lieu": "Une action QVT concrète et peu coûteuse, à 30 minutes de route au plus, portée par une intervenante du territoire ; des équipes qui repartent avec des gestes réutilisables au poste.",
      "demande": "Quinze minutes de téléphone, ou une date pour la séance découverte ; disponibilité en semaine après 13 h.",
      "attention": "Pas d'adresse email publique : formulaire https://buildingsealing.hutchinson.com/demande-de-devis (téléphone 04 76 35 79 00). Le texte se colle dans le formulaire ou sert de trame au téléphone. Source vérifiée : https://buildingsealing.hutchinson.com/contact"
    },
    "email": {
      "objet": "Yoga du dos pour vos équipes de Moirans",
      "corps": "Bonjour,\n\nProfesseure de yoga à Gillonnay, j'interviens sur le lieu de travail avec du yoga et de la respiration, notamment auprès d'une PME industrielle de la région grenobloise. Je vous écris parce que votre site de Moirans fait tourner des lignes d'extrusion en équipes, avec des postes physiques.\n\nJe propose une séance découverte sur site, de 45 minutes à 1 heure, en fin de poste ou à la pause déjeuner, pour 6 à 20 personnes, à 180 euros, centrée sur le dos, les épaules et la récupération après une journée debout. Si l'équipe accroche, un programme de 4 séances sur 2 mois prend le relais. Un réfectoire suffit, j'apporte le matériel.\n\nVos opérateurs repartent avec quelques gestes simples pour soulager le dos, à refaire au poste ou chez eux.\n\nQuinze minutes au téléphone suffisent pour voir si cela vous parle et caler une date ; je suis joignable en semaine après 13 h.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · pro.maude-yoga.com"
    }
  },
  {
    "id": "automatique-industrie",
    "cat": "pro",
    "nom": "Automatique & Industrie (AI)",
    "lieu": "Saint-Jean-de-Moirans (Centr'Alp)",
    "km": 30,
    "prio": 2,
    "gest": "Ingénierie en automatisme et informatique industrielle · 100 à 199",
    "contact": "formulaire https://automatique-industrie.com/contact/",
    "deja": "Page carrière très fournie : CSE, télétravail deux jours par semaine, médaille d'or RSE Ecovadis 2021 et 2023, prix des leaders du capital humain 2019, « l'ambiance et l'esprit d'équipe ». Ingénieurs sur écran et en déplacement chez les clients.",
    "format": "Séance découverte de 45 min à 1 h sur site, puis programme de 4 séances sur 2 mois",
    "prix": "Séance découverte 180 € ; programme 4 séances 1 400 à 1 600 €",
    "saison": "Toute l'année",
    "src": "https://automatique-industrie.com/carriere/",
    "destinataire": {
      "nom": "Automatique & Industrie (AI), service RH",
      "email": null,
      "canal": "formulaire https://automatique-industrie.com/contact/"
    },
    "projet": {
      "titre": "Séance découverte sur site",
      "concept": "Page carrière très fournie (Ecovadis or, prix du capital humain, CSE, télétravail) : des ingénieurs sur écran et en déplacement, dans une entreprise qui soigne son esprit d'équipe. Une séance découverte de 45 min à 1 h sur le lieu de travail, adaptée au métier, puis un programme de 4 séances sur 2 mois si l'équipe y trouve son compte.",
      "format": "45 min à 1 h sur site, 6 à 20 personnes, à la pause déjeuner ou en fin de poste ; salle de réunion ou réfectoire, matériel apporté par Maude. Interlocuteur : service RH.",
      "deroule": "Accueil et consignes, 5 min · respiration, 10 min · postures debout ou sur chaise adaptées au poste, 25 min · récupération et retour au calme, 10 min",
      "prix": "Séance découverte 180 € facturée à l'entreprise (grille de pro.maude-yoga.com) ; programme de 4 séances sur 2 mois de 1 400 à 1 600 € ; interventions de 2 h à une journée de 350 à 2 200 €.",
      "gain_lieu": "Une action QVT concrète et peu coûteuse, à 30 minutes de route au plus, portée par une intervenante du territoire ; des équipes qui repartent avec des gestes réutilisables au poste.",
      "demande": "Quinze minutes de téléphone, ou une date pour la séance découverte ; disponibilité en semaine après 13 h.",
      "attention": "Pas d'adresse email publique : formulaire https://automatique-industrie.com/contact/. Le texte se colle dans le formulaire ou sert de trame au téléphone. Source vérifiée : https://automatique-industrie.com/carriere/"
    },
    "email": {
      "objet": "Yoga du midi pour vos ingénieurs à Centr'Alp",
      "corps": "Bonjour,\n\nProfesseure de yoga à Gillonnay, j'interviens sur le lieu de travail avec du yoga et de la respiration. Votre page carrière m'a donné envie d'écrire : deux médailles d'or Ecovadis, un prix du capital humain, et l'esprit d'équipe mis en avant.\n\nJe propose une séance découverte sur site, de 45 minutes à 1 heure, à la pause déjeuner ou en fin de journée, pour 6 à 20 personnes, à 180 euros, pensée pour des ingénieurs sur écran et en déplacement : nuque, épaules, et une respiration qui fait redescendre la pression. Si l'équipe accroche, un programme de 4 séances sur 2 mois prend le relais.\n\nVos ingénieurs repartent avec des gestes simples, à refaire au bureau comme en télétravail.\n\nSi ce n'est pas vous, merci de transmettre à la personne en charge de la QVT ou du CSE. Quinze minutes au téléphone, en semaine après 13 h, suffisent pour caler une date.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · pro.maude-yoga.com"
    }
  },
  {
    "id": "cetup",
    "cat": "pro",
    "nom": "CETUP",
    "lieu": "Saint-Jean-de-Moirans (Centr'Alp)",
    "km": 30,
    "prio": 1,
    "gest": "Transport léger dédié, coursiers ; siège et centre opérationnel · plus de 200 salariés, tous en CDI",
    "contact": "communication@cetup.com · email",
    "deja": "« Le bien-être au travail favorise l'excellence » sur leur page recrutement, signataire de la Charte de la Diversité. Des chauffeurs assis toute la journée et un centre opérationnel.",
    "format": "Séance découverte de 45 min à 1 h sur site, puis programme de 4 séances sur 2 mois",
    "prix": "Séance découverte 180 € ; programme 4 séances 1 400 à 1 600 €",
    "saison": "Toute l'année",
    "src": "https://www.cetup.com/nous-rejoindre/",
    "destinataire": {
      "nom": "CETUP, service communication ou RH",
      "email": "communication@cetup.com",
      "canal": "email"
    },
    "projet": {
      "titre": "Séance découverte sur site",
      "concept": "Des chauffeurs assis toute la journée et une page recrutement qui dit que le bien-être au travail favorise l'excellence. Une séance découverte de 45 min à 1 h sur le lieu de travail, adaptée au métier, puis un programme de 4 séances sur 2 mois si l'équipe y trouve son compte.",
      "format": "45 min à 1 h sur site, 6 à 20 personnes, à la pause déjeuner ou en fin de poste ; salle de réunion ou réfectoire, matériel apporté par Maude. Interlocuteur : service communication ou RH.",
      "deroule": "Accueil et consignes, 5 min · respiration, 10 min · postures debout ou sur chaise adaptées au poste, 25 min · récupération et retour au calme, 10 min",
      "prix": "Séance découverte 180 € facturée à l'entreprise (grille de pro.maude-yoga.com) ; programme de 4 séances sur 2 mois de 1 400 à 1 600 € ; interventions de 2 h à une journée de 350 à 2 200 €.",
      "gain_lieu": "Une action QVT concrète et peu coûteuse, à 30 minutes de route au plus, portée par une intervenante du territoire ; des équipes qui repartent avec des gestes réutilisables au poste.",
      "demande": "Quinze minutes de téléphone, ou une date pour la séance découverte ; disponibilité en semaine après 13 h.",
      "attention": "Adresse générique : demander la transmission à la QVT, au CSE ou aux RH. Source vérifiée : https://www.cetup.com/nous-rejoindre/"
    },
    "email": {
      "objet": "Respiration au volant pour vos chauffeurs",
      "corps": "Bonjour,\n\nProfesseure de yoga à Gillonnay, j'interviens sur le lieu de travail avec du yoga et de la respiration. Votre page recrutement dit que le bien-être au travail favorise l'excellence, et vos chauffeurs passent leurs journées assis au volant, là où la respiration compte le plus.\n\nJe propose une séance découverte sur site, de 45 minutes à 1 heure, à la pause déjeuner ou en fin de tournée, pour 6 à 20 personnes, à 180 euros : respiration pour rester disponible au volant, dos et hanches après des heures assis. Si l'équipe accroche, un programme de 4 séances sur 2 mois prend le relais.\n\nVos chauffeurs repartent avec des gestes qui tiennent dans une cabine, à refaire entre deux courses.\n\nSi ce n'est pas vous, merci de transmettre à la personne en charge de la QVT ou du CSE. Quinze minutes au téléphone, en semaine après 13 h, suffisent pour caler une date.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · pro.maude-yoga.com"
    }
  },
  {
    "id": "chambre-agriculture",
    "cat": "pro",
    "nom": "Chambre d'agriculture de l'Isère",
    "lieu": "Moirans (Centr'Alp)",
    "km": 30,
    "prio": 1,
    "gest": "Établissement public consulaire agricole, siège · 100 à 199",
    "contact": "accueil@isere.chambagri.fr · email",
    "deja": "Conseillers et administratifs, beaucoup de route et de bureau ; Maude est prof de yoga en zone rurale, et le monde agricole est le sien au quotidien.",
    "format": "Séance découverte de 45 min à 1 h sur site, puis programme de 4 séances sur 2 mois",
    "prix": "Séance découverte 180 € ; programme 4 séances 1 400 à 1 600 €",
    "saison": "Toute l'année",
    "src": "https://isere.chambres-agriculture.fr/contact",
    "destinataire": {
      "nom": "Chambre d'agriculture de l'Isère, service ressources humaines (rubrique « Notre politique RH »)",
      "email": "accueil@isere.chambagri.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Séance découverte sur site",
      "concept": "Conseillers et administratifs entre la route et le bureau ; Maude enseigne en zone rurale, au contact du monde agricole. Une séance découverte de 45 min à 1 h sur le lieu de travail, adaptée au métier, puis un programme de 4 séances sur 2 mois si l'équipe y trouve son compte.",
      "format": "45 min à 1 h sur site, 6 à 20 personnes, à la pause déjeuner ou en fin de poste ; salle de réunion ou réfectoire, matériel apporté par Maude. Interlocuteur : service ressources humaines (rubrique « Notre politique RH »).",
      "deroule": "Accueil et consignes, 5 min · respiration, 10 min · postures debout ou sur chaise adaptées au poste, 25 min · récupération et retour au calme, 10 min",
      "prix": "Séance découverte 180 € facturée à l'entreprise (grille de pro.maude-yoga.com) ; programme de 4 séances sur 2 mois de 1 400 à 1 600 € ; interventions de 2 h à une journée de 350 à 2 200 €.",
      "gain_lieu": "Une action QVT concrète et peu coûteuse, à 30 minutes de route au plus, portée par une intervenante du territoire ; des équipes qui repartent avec des gestes réutilisables au poste.",
      "demande": "Quinze minutes de téléphone, ou une date pour la séance découverte ; disponibilité en semaine après 13 h.",
      "attention": "Adresse générique : demander la transmission à la QVT, au CSE ou aux RH. Source vérifiée : https://isere.chambres-agriculture.fr/contact"
    },
    "email": {
      "objet": "Yoga sur site pour vos conseillers et agents",
      "corps": "Bonjour,\n\nProfesseure de yoga à Gillonnay, je vis et j'enseigne en zone rurale, au contact du monde agricole. J'interviens aussi en entreprise, avec du yoga et de la respiration, et je vous écris parce que vos conseillers et vos administratifs partagent leurs journées entre la route et le bureau.\n\nJe propose une séance découverte sur site, de 45 minutes à 1 heure, à la pause déjeuner ou en fin de journée, pour 6 à 20 personnes, à 180 euros : dos après la voiture, nuque et épaules après l'écran, et une respiration qui fait redescendre la pression. Si l'équipe accroche, un programme de 4 séances sur 2 mois prend le relais.\n\nVos agents repartent avec quelques gestes simples, à refaire au bureau ou en voiture.\n\nSi ce n'est pas vous, merci de transmettre au service ressources humaines. Quinze minutes au téléphone, en semaine après 13 h, suffisent pour caler une date.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · pro.maude-yoga.com"
    }
  },
  {
    "id": "rector-voreppe",
    "cat": "pro",
    "nom": "Rector, usine de Voreppe",
    "lieu": "Voreppe",
    "km": 35,
    "prio": 2,
    "gest": "Préfabrication béton (planchers, poutrelles) · 100 à 199 sur le site",
    "contact": "formulaire https://www.rector.fr/contact",
    "deja": "Préfabrication béton : postes physiques, manutention.",
    "format": "Séance découverte de 45 min à 1 h sur site, puis programme de 4 séances sur 2 mois",
    "prix": "Séance découverte 180 € ; programme 4 séances 1 400 à 1 600 €",
    "saison": "Toute l'année",
    "src": "https://www.rector.fr/contact",
    "destinataire": {
      "nom": "Rector, usine de Voreppe, direction de site ou RH",
      "email": null,
      "canal": "formulaire https://www.rector.fr/contact"
    },
    "projet": {
      "titre": "Séance découverte sur site",
      "concept": "Préfabrication béton : manutention et postes physiques toute la journée. Une séance découverte de 45 min à 1 h sur le lieu de travail, adaptée au métier, puis un programme de 4 séances sur 2 mois si l'équipe y trouve son compte.",
      "format": "45 min à 1 h sur site, 6 à 20 personnes, à la pause déjeuner ou en fin de poste ; salle de réunion ou réfectoire, matériel apporté par Maude. Interlocuteur : direction de site ou RH.",
      "deroule": "Accueil et consignes, 5 min · respiration, 10 min · postures debout ou sur chaise adaptées au poste, 25 min · récupération et retour au calme, 10 min",
      "prix": "Séance découverte 180 € facturée à l'entreprise (grille de pro.maude-yoga.com) ; programme de 4 séances sur 2 mois de 1 400 à 1 600 € ; interventions de 2 h à une journée de 350 à 2 200 €.",
      "gain_lieu": "Une action QVT concrète et peu coûteuse, à 30 minutes de route au plus, portée par une intervenante du territoire ; des équipes qui repartent avec des gestes réutilisables au poste.",
      "demande": "Quinze minutes de téléphone, ou une date pour la séance découverte ; disponibilité en semaine après 13 h.",
      "attention": "Pas d'adresse email publique : formulaire https://www.rector.fr/contact. Le texte se colle dans le formulaire ou sert de trame au téléphone. Source vérifiée : https://www.rector.fr/contact"
    },
    "email": {
      "objet": "Yoga du dos pour votre usine de Voreppe",
      "corps": "Bonjour,\n\nProfesseure de yoga à Gillonnay, j'interviens sur le lieu de travail avec du yoga et de la respiration, notamment auprès d'une PME industrielle de la région grenobloise. Je vous écris parce que la préfabrication béton, c'est de la manutention et des postes physiques toute la journée.\n\nJe propose une séance découverte sur site, de 45 minutes à 1 heure, en fin de poste ou à la pause déjeuner, pour 6 à 20 personnes, à 180 euros, centrée sur le dos, les épaules et la récupération. Si l'équipe accroche, un programme de 4 séances sur 2 mois prend le relais.\n\nVos opérateurs repartent avec quelques gestes simples pour soulager le dos, à refaire au poste ou chez eux.\n\nSi ce n'est pas vous, merci de transmettre à la personne en charge de la QVT ou du CSE. Quinze minutes au téléphone, en semaine après 13 h, suffisent pour caler une date.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · pro.maude-yoga.com"
    }
  },
  {
    "id": "mairie-tullins",
    "cat": "pro",
    "nom": "Commune de Tullins",
    "lieu": "Tullins",
    "km": 25,
    "prio": 1,
    "gest": "Collectivité territoriale · 100 à 199 agents",
    "contact": "contact@ville-tullins.fr · email",
    "deja": "Une centaine d'agents, techniques, périscolaires et administratifs.",
    "format": "Séance découverte de 45 min à 1 h sur site, puis programme de 4 séances sur 2 mois",
    "prix": "Séance découverte 180 € ; programme 4 séances 1 400 à 1 600 €",
    "saison": "Toute l'année",
    "src": "https://www.ville-tullins.fr/nous-contacter",
    "destinataire": {
      "nom": "Commune de Tullins, direction générale des services",
      "email": "contact@ville-tullins.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Séance découverte sur site",
      "concept": "Une centaine d'agents aux métiers très différents, techniques, périscolaires et administratifs, à 25 km de Gillonnay. Une séance découverte de 45 min à 1 h sur le lieu de travail, adaptée au métier, puis un programme de 4 séances sur 2 mois si l'équipe y trouve son compte.",
      "format": "45 min à 1 h sur site, 6 à 20 personnes, à la pause déjeuner ou en fin de poste ; salle de réunion ou réfectoire, matériel apporté par Maude. Interlocuteur : direction générale des services.",
      "deroule": "Accueil et consignes, 5 min · respiration, 10 min · postures debout ou sur chaise adaptées au poste, 25 min · récupération et retour au calme, 10 min",
      "prix": "Séance découverte 180 € facturée à l'entreprise (grille de pro.maude-yoga.com) ; programme de 4 séances sur 2 mois de 1 400 à 1 600 € ; interventions de 2 h à une journée de 350 à 2 200 €.",
      "gain_lieu": "Une action QVT concrète et peu coûteuse, à 30 minutes de route au plus, portée par une intervenante du territoire ; des équipes qui repartent avec des gestes réutilisables au poste.",
      "demande": "Quinze minutes de téléphone, ou une date pour la séance découverte ; disponibilité en semaine après 13 h.",
      "attention": "Adresse générique : demander la transmission à la QVT, au CSE ou aux RH. Source vérifiée : https://www.ville-tullins.fr/nous-contacter"
    },
    "email": {
      "objet": "Yoga sur site pour les agents de Tullins",
      "corps": "Bonjour,\n\nProfesseure de yoga à Gillonnay, à vingt-cinq kilomètres de Tullins, j'interviens sur le lieu de travail avec du yoga et de la respiration. Je vous écris parce que vos agents ont des métiers très différents, techniques, périscolaires et administratifs, et que chacun y trouve son usage.\n\nJe propose une séance découverte sur site, de 45 minutes à 1 heure, à la pause déjeuner ou en fin de journée, pour 6 à 20 agents, à 180 euros : dos et récupération pour les services techniques, écrans et pression pour les bureaux, respiration pour le périscolaire. Si l'équipe accroche, un programme de 4 séances sur 2 mois prend le relais.\n\nVos agents repartent avec des gestes simples à refaire à leur poste.\n\nSi ce n'est pas vous, merci de transmettre à la personne en charge de la QVT ou du CSE. Quinze minutes au téléphone, en semaine après 13 h, suffisent pour caler une date.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · pro.maude-yoga.com"
    }
  },
  {
    "id": "mairie-moirans",
    "cat": "pro",
    "nom": "Commune de Moirans",
    "lieu": "Moirans",
    "km": 30,
    "prio": 2,
    "gest": "Collectivité territoriale · 100 à 199 agents",
    "contact": "formulaire https://www.ville-moirans.fr/nous-contacter-3/ (téléphone 04 76 35 44 55)",
    "deja": "Une centaine d'agents ; la ville gère aussi la résidence autonomie Georges Brassens, déjà dans nos pistes.",
    "format": "Séance découverte de 45 min à 1 h sur site, puis programme de 4 séances sur 2 mois",
    "prix": "Séance découverte 180 € ; programme 4 séances 1 400 à 1 600 €",
    "saison": "Toute l'année",
    "src": "https://www.ville-moirans.fr/nous-contacter-3/",
    "destinataire": {
      "nom": "Commune de Moirans, direction générale des services",
      "email": null,
      "canal": "formulaire https://www.ville-moirans.fr/nous-contacter-3/ (téléphone 04 76 35 44 55)"
    },
    "projet": {
      "titre": "Séance découverte sur site",
      "concept": "Une centaine d'agents aux métiers variés, jusqu'au personnel de la résidence autonomie Georges Brassens que la ville gère. Une séance découverte de 45 min à 1 h sur le lieu de travail, adaptée au métier, puis un programme de 4 séances sur 2 mois si l'équipe y trouve son compte.",
      "format": "45 min à 1 h sur site, 6 à 20 personnes, à la pause déjeuner ou en fin de poste ; salle de réunion ou réfectoire, matériel apporté par Maude. Interlocuteur : direction générale des services.",
      "deroule": "Accueil et consignes, 5 min · respiration, 10 min · postures debout ou sur chaise adaptées au poste, 25 min · récupération et retour au calme, 10 min",
      "prix": "Séance découverte 180 € facturée à l'entreprise (grille de pro.maude-yoga.com) ; programme de 4 séances sur 2 mois de 1 400 à 1 600 € ; interventions de 2 h à une journée de 350 à 2 200 €.",
      "gain_lieu": "Une action QVT concrète et peu coûteuse, à 30 minutes de route au plus, portée par une intervenante du territoire ; des équipes qui repartent avec des gestes réutilisables au poste.",
      "demande": "Quinze minutes de téléphone, ou une date pour la séance découverte ; disponibilité en semaine après 13 h.",
      "attention": "Pas d'adresse email publique : formulaire https://www.ville-moirans.fr/nous-contacter-3/ (téléphone 04 76 35 44 55). Le texte se colle dans le formulaire ou sert de trame au téléphone. Source vérifiée : https://www.ville-moirans.fr/nous-contacter-3/"
    },
    "email": {
      "objet": "Yoga sur site pour les agents de Moirans",
      "corps": "Bonjour,\n\nProfesseure de yoga à Gillonnay, j'interviens sur le lieu de travail avec du yoga et de la respiration. Je vous écris parce que la commune de Moirans emploie une centaine d'agents, jusqu'à la résidence autonomie Georges Brassens qu'elle gère.\n\nJe propose une séance découverte sur site, de 45 minutes à 1 heure, à la pause déjeuner ou en fin de journée, pour 6 à 20 agents, à 180 euros : dos et récupération pour les équipes de terrain, écrans et pression pour les bureaux, yoga sur chaise pour le personnel de la résidence. Si l'équipe accroche, un programme de 4 séances sur 2 mois prend le relais.\n\nVos agents repartent avec des gestes simples à refaire à leur poste.\n\nSi ce n'est pas vous, merci de transmettre à la personne en charge de la QVT ou du CSE. Quinze minutes au téléphone, en semaine après 13 h, suffisent pour caler une date.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · pro.maude-yoga.com"
    }
  },
  {
    "id": "mgf-grimaldi",
    "cat": "pro",
    "nom": "MGF Grimaldi",
    "lieu": "Saint-Jean-de-Moirans (Centr'Alp 2)",
    "km": 30,
    "prio": 1,
    "gest": "Mécanique de précision, usinage, machines spéciales · une centaine de personnes",
    "contact": "emploi@mgf-grimaldi.com · email (adresse recrutement, demander de transmettre)",
    "deja": "Usinage et montage : postes debout, précision, bruit.",
    "format": "Séance découverte de 45 min à 1 h sur site, puis programme de 4 séances sur 2 mois",
    "prix": "Séance découverte 180 € ; programme 4 séances 1 400 à 1 600 €",
    "saison": "Toute l'année",
    "src": "https://www.mgf-grimaldi.com/recrutement-emploi-stage-usinage-tournage.php",
    "destinataire": {
      "nom": "MGF Grimaldi, service RH",
      "email": "emploi@mgf-grimaldi.com",
      "canal": "email"
    },
    "projet": {
      "titre": "Séance découverte sur site",
      "concept": "Usinage et montage : postes debout, bruit, précision qui demande de la concentration. Une séance découverte de 45 min à 1 h sur le lieu de travail, adaptée au métier, puis un programme de 4 séances sur 2 mois si l'équipe y trouve son compte.",
      "format": "45 min à 1 h sur site, 6 à 20 personnes, à la pause déjeuner ou en fin de poste ; salle de réunion ou réfectoire, matériel apporté par Maude. Interlocuteur : service RH.",
      "deroule": "Accueil et consignes, 5 min · respiration, 10 min · postures debout ou sur chaise adaptées au poste, 25 min · récupération et retour au calme, 10 min",
      "prix": "Séance découverte 180 € facturée à l'entreprise (grille de pro.maude-yoga.com) ; programme de 4 séances sur 2 mois de 1 400 à 1 600 € ; interventions de 2 h à une journée de 350 à 2 200 €.",
      "gain_lieu": "Une action QVT concrète et peu coûteuse, à 30 minutes de route au plus, portée par une intervenante du territoire ; des équipes qui repartent avec des gestes réutilisables au poste.",
      "demande": "Quinze minutes de téléphone, ou une date pour la séance découverte ; disponibilité en semaine après 13 h.",
      "attention": "Adresse commerciale ou d'accueil : demander la transmission à la QVT, au CSE ou aux RH. Source vérifiée : https://www.mgf-grimaldi.com/recrutement-emploi-stage-usinage-tournage.php"
    },
    "email": {
      "objet": "Yoga du dos pour vos ateliers d'usinage",
      "corps": "Bonjour,\n\nProfesseure de yoga à Gillonnay, j'interviens sur le lieu de travail avec du yoga et de la respiration. Je vous écris parce que l'usinage et le montage, c'est une journée debout, dans le bruit, avec une précision qui demande de la concentration.\n\nJe propose une séance découverte sur site, de 45 minutes à 1 heure, en fin de poste ou à la pause déjeuner, pour 6 à 20 personnes, à 180 euros : dos, épaules et récupération, et une respiration qui aide à retrouver l'attention. Si l'équipe accroche, un programme de 4 séances sur 2 mois prend le relais.\n\nVos opérateurs repartent avec quelques gestes simples, à refaire au poste ou chez eux.\n\nVotre adresse est celle du recrutement : merci de transmettre à la personne en charge de la QVT, du CSE ou des RH. Quinze minutes au téléphone, en semaine après 13 h, suffisent pour caler une date.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · pro.maude-yoga.com"
    }
  },
  {
    "id": "pyxalis",
    "cat": "pro",
    "nom": "Pyxalis",
    "lieu": "Moirans (Centr'Alp)",
    "km": 30,
    "prio": 1,
    "gest": "Conception de capteurs d'image CMOS · 50 à 99",
    "contact": "contact@pyxalis.com · email",
    "deja": "Ils publient « Pyxalis or the well-being on a human scale », une fête de fin d'année avec les familles, Octobre rose : le bien-être à taille humaine est déjà leur mot. Ingénieurs sur écran.",
    "format": "Séance découverte de 45 min à 1 h sur site, puis programme de 4 séances sur 2 mois",
    "prix": "Séance découverte 180 € ; programme 4 séances 1 400 à 1 600 €",
    "saison": "Toute l'année",
    "src": "https://www.pyxalis.com/",
    "destinataire": {
      "nom": "Pyxalis, service RH ou direction",
      "email": "contact@pyxalis.com",
      "canal": "email"
    },
    "projet": {
      "titre": "Séance découverte sur site",
      "concept": "Le bien-être à taille humaine est déjà leur mot (fête avec les familles, Octobre rose) ; des ingénieurs sur écran. Une séance découverte de 45 min à 1 h sur le lieu de travail, adaptée au métier, puis un programme de 4 séances sur 2 mois si l'équipe y trouve son compte.",
      "format": "45 min à 1 h sur site, 6 à 20 personnes, à la pause déjeuner ou en fin de poste ; salle de réunion ou réfectoire, matériel apporté par Maude. Interlocuteur : service RH ou direction.",
      "deroule": "Accueil et consignes, 5 min · respiration, 10 min · postures debout ou sur chaise adaptées au poste, 25 min · récupération et retour au calme, 10 min",
      "prix": "Séance découverte 180 € facturée à l'entreprise (grille de pro.maude-yoga.com) ; programme de 4 séances sur 2 mois de 1 400 à 1 600 € ; interventions de 2 h à une journée de 350 à 2 200 €.",
      "gain_lieu": "Une action QVT concrète et peu coûteuse, à 30 minutes de route au plus, portée par une intervenante du territoire ; des équipes qui repartent avec des gestes réutilisables au poste.",
      "demande": "Quinze minutes de téléphone, ou une date pour la séance découverte ; disponibilité en semaine après 13 h.",
      "attention": "Adresse générique : demander la transmission à la QVT, au CSE ou aux RH. Source vérifiée : https://www.pyxalis.com/"
    },
    "email": {
      "objet": "Yoga du midi à taille humaine chez Pyxalis",
      "corps": "Bonjour,\n\nProfesseure de yoga à Gillonnay, j'interviens sur le lieu de travail avec du yoga et de la respiration. Votre site parle de bien-être à taille humaine, d'une fête avec les familles, d'Octobre rose : des mots rares chez une entreprise de capteurs d'image.\n\nJe propose une séance découverte sur site, de 45 minutes à 1 heure, à la pause déjeuner ou en fin de journée, pour 6 à 20 personnes, à 180 euros, pensée pour des ingénieurs sur écran : nuque, épaules, dos, et une respiration qui fait redescendre la pression. Si l'équipe accroche, un programme de 4 séances sur 2 mois prend le relais.\n\nVos ingénieurs repartent avec des gestes simples, à refaire à leur poste.\n\nSi ce n'est pas vous, merci de transmettre à la personne en charge de la QVT ou du CSE. Quinze minutes au téléphone, en semaine après 13 h, suffisent pour caler une date.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · pro.maude-yoga.com"
    }
  },
  {
    "id": "ap-technology",
    "cat": "pro",
    "nom": "AP Technology (Rio Tinto Aluminium Pechiney)",
    "lieu": "Voreppe (Centr'Alp)",
    "km": 35,
    "prio": 1,
    "gest": "R&D et ingénierie pour la production d'aluminium · 50 à 99",
    "contact": "riotinto-aluminiumpechiney@riotinto.com · email",
    "deja": "Ingénieurs et techniciens, bureaux d'études et laboratoires.",
    "format": "Séance découverte de 45 min à 1 h sur site, puis programme de 4 séances sur 2 mois",
    "prix": "Séance découverte 180 € ; programme 4 séances 1 400 à 1 600 €",
    "saison": "Toute l'année",
    "src": "https://www.ap-technology.com/smelter-technology-ap-technology/",
    "destinataire": {
      "nom": "AP Technology (Rio Tinto Aluminium Pechiney), service RH ou direction",
      "email": "riotinto-aluminiumpechiney@riotinto.com",
      "canal": "email"
    },
    "projet": {
      "titre": "Séance découverte sur site",
      "concept": "Ingénieurs et techniciens entre bureaux d'études et laboratoires à Voreppe. Une séance découverte de 45 min à 1 h sur le lieu de travail, adaptée au métier, puis un programme de 4 séances sur 2 mois si l'équipe y trouve son compte.",
      "format": "45 min à 1 h sur site, 6 à 20 personnes, à la pause déjeuner ou en fin de poste ; salle de réunion ou réfectoire, matériel apporté par Maude. Interlocuteur : service RH ou direction.",
      "deroule": "Accueil et consignes, 5 min · respiration, 10 min · postures debout ou sur chaise adaptées au poste, 25 min · récupération et retour au calme, 10 min",
      "prix": "Séance découverte 180 € facturée à l'entreprise (grille de pro.maude-yoga.com) ; programme de 4 séances sur 2 mois de 1 400 à 1 600 € ; interventions de 2 h à une journée de 350 à 2 200 €.",
      "gain_lieu": "Une action QVT concrète et peu coûteuse, à 30 minutes de route au plus, portée par une intervenante du territoire ; des équipes qui repartent avec des gestes réutilisables au poste.",
      "demande": "Quinze minutes de téléphone, ou une date pour la séance découverte ; disponibilité en semaine après 13 h.",
      "attention": "Adresse générique : demander la transmission à la QVT, au CSE ou aux RH. Source vérifiée : https://www.ap-technology.com/smelter-technology-ap-technology/"
    },
    "email": {
      "objet": "Yoga sur site pour AP Technology à Voreppe",
      "corps": "Bonjour,\n\nProfesseure de yoga à Gillonnay, j'interviens sur le lieu de travail avec du yoga et de la respiration, notamment auprès d'une scale-up tech grenobloise. Je vous écris parce qu'AP Technology réunit à Voreppe des ingénieurs et des techniciens entre bureaux d'études et laboratoires.\n\nJe propose une séance découverte sur site, de 45 minutes à 1 heure, à la pause déjeuner ou en fin de journée, pour 6 à 20 personnes, à 180 euros, pensée pour des journées sur écran et en laboratoire : nuque, épaules, dos, et une respiration qui fait redescendre la pression. Si l'équipe accroche, un programme de 4 séances sur 2 mois prend le relais.\n\nVos équipes repartent avec des gestes simples, à refaire à leur poste.\n\nSi ce n'est pas vous, merci de transmettre à la personne en charge de la QVT ou du CSE. Quinze minutes au téléphone, en semaine après 13 h, suffisent pour caler une date.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · pro.maude-yoga.com"
    }
  },
  {
    "id": "apf-chevalon",
    "cat": "pro",
    "nom": "APF France handicap, IEM Le Chevalon",
    "lieu": "Voreppe",
    "km": 35,
    "prio": 1,
    "gest": "Institut d'éducation motrice (médico-social) · 200 à 249",
    "contact": "iem.voreppe@apf.asso.fr · email",
    "deja": "Des équipes éducatives et soignantes qui portent et accompagnent des jeunes en situation de handicap moteur. Maude est certifiée yoga adapté : personnel et jeunes.",
    "format": "Séance découverte de 45 min à 1 h sur site, puis programme de 4 séances sur 2 mois",
    "prix": "Séance découverte 180 € ; programme 4 séances 1 400 à 1 600 €",
    "saison": "Toute l'année",
    "src": "https://taxe-apprentissage.apf-francehandicap.org/structure/iem-fp-chevalon-voreppe/",
    "destinataire": {
      "nom": "APF France handicap, IEM Le Chevalon, direction de l'établissement",
      "email": "iem.voreppe@apf.asso.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Séance découverte sur site",
      "concept": "Des équipes éducatives et soignantes qui portent et accompagnent des jeunes en situation de handicap moteur ; Maude est certifiée yoga adapté, sur chaise. Une séance découverte de 45 min à 1 h sur le lieu de travail, adaptée au métier, puis un programme de 4 séances sur 2 mois si l'équipe y trouve son compte.",
      "format": "45 min à 1 h sur site, 6 à 20 personnes, à la pause déjeuner ou en fin de poste ; salle de réunion ou réfectoire, matériel apporté par Maude. Interlocuteur : direction de l'établissement.",
      "deroule": "Accueil et consignes, 5 min · respiration, 10 min · postures debout ou sur chaise adaptées au poste, 25 min · récupération et retour au calme, 10 min",
      "prix": "Séance découverte 180 € facturée à l'entreprise (grille de pro.maude-yoga.com) ; programme de 4 séances sur 2 mois de 1 400 à 1 600 € ; interventions de 2 h à une journée de 350 à 2 200 €.",
      "gain_lieu": "Une action QVT concrète et peu coûteuse, à 30 minutes de route au plus, portée par une intervenante du territoire ; des équipes qui repartent avec des gestes réutilisables au poste.",
      "demande": "Quinze minutes de téléphone, ou une date pour la séance découverte ; disponibilité en semaine après 13 h.",
      "attention": "Adresse générique : demander la transmission à la QVT, au CSE ou aux RH. Source vérifiée : https://taxe-apprentissage.apf-francehandicap.org/structure/iem-fp-chevalon-voreppe/"
    },
    "email": {
      "objet": "Yoga sur chaise pour les équipes du Chevalon",
      "corps": "Bonjour,\n\nProfesseure de yoga à Gillonnay, certifiée en yoga adapté, j'interviens sur le lieu de travail avec du yoga et de la respiration. Je vous écris parce que vos équipes éducatives et soignantes portent et accompagnent des jeunes en situation de handicap moteur, et que leur dos et leur souffle comptent.\n\nJe propose d'abord au personnel une séance découverte sur site, de 45 minutes à 1 heure, à la pause déjeuner ou en fin de journée, pour 6 à 20 personnes, à 180 euros : du yoga sur chaise, centré sur le dos, les épaules et la récupération. Si l'équipe accroche, un programme de 4 séances sur 2 mois prend le relais, et nous pourrons ensuite parler d'une piste pour les jeunes.\n\nVos professionnels repartent avec des gestes simples, à refaire entre deux transferts.\n\nQuinze minutes au téléphone, en semaine après 13 h, suffisent pour caler une date.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · pro.maude-yoga.com"
    }
  },
  {
    "id": "lycee-beghin",
    "cat": "pro",
    "nom": "Lycée Pierre Béghin",
    "lieu": "Moirans",
    "km": 30,
    "prio": 1,
    "gest": "Lycée public · 50 à 99",
    "contact": "ce.0383119j@ac-grenoble.fr · email",
    "deja": "Une équipe enseignante et de vie scolaire ; Maude intervient déjà en collège et en lycée sur la gestion du stress.",
    "format": "Séance découverte de 45 min à 1 h sur site, puis programme de 4 séances sur 2 mois",
    "prix": "Séance découverte 180 € ; programme 4 séances 1 400 à 1 600 €",
    "saison": "Toute l'année",
    "src": "https://pierre-beghin.ent.auvergnerhonealpes.fr/contacts-12.htm",
    "destinataire": {
      "nom": "Lycée Pierre Béghin, proviseur",
      "email": "ce.0383119j@ac-grenoble.fr",
      "canal": "email"
    },
    "projet": {
      "titre": "Séance découverte sur site",
      "concept": "Une équipe enseignante et de vie scolaire ; Maude intervient déjà en collège et en lycée sur la gestion du stress. Une séance découverte de 45 min à 1 h sur le lieu de travail, adaptée au métier, puis un programme de 4 séances sur 2 mois si l'équipe y trouve son compte.",
      "format": "45 min à 1 h sur site, 6 à 20 personnes, à la pause déjeuner ou en fin de poste ; salle de réunion ou réfectoire, matériel apporté par Maude. Interlocuteur : proviseur.",
      "deroule": "Accueil et consignes, 5 min · respiration, 10 min · postures debout ou sur chaise adaptées au poste, 25 min · récupération et retour au calme, 10 min",
      "prix": "Séance découverte 180 € facturée à l'entreprise (grille de pro.maude-yoga.com) ; programme de 4 séances sur 2 mois de 1 400 à 1 600 € ; interventions de 2 h à une journée de 350 à 2 200 €.",
      "gain_lieu": "Une action QVT concrète et peu coûteuse, à 30 minutes de route au plus, portée par une intervenante du territoire ; des équipes qui repartent avec des gestes réutilisables au poste.",
      "demande": "Quinze minutes de téléphone, ou une date pour la séance découverte ; disponibilité en semaine après 13 h.",
      "attention": "Adresse générique : demander la transmission à la QVT, au CSE ou aux RH. Source vérifiée : https://pierre-beghin.ent.auvergnerhonealpes.fr/contacts-12.htm"
    },
    "email": {
      "objet": "Gestion du stress pour l'équipe du lycée",
      "corps": "Bonjour,\n\nProfesseure de yoga à Gillonnay, j'interviens déjà en collège et en lycée sur la gestion du stress, et en entreprise avec du yoga et de la respiration. Je vous écris pour votre équipe enseignante et de vie scolaire, qui tient une année face aux classes.\n\nJe propose une séance découverte au lycée, de 45 minutes à 1 heure, à la pause déjeuner ou en fin de journée, pour 6 à 20 personnes, à 180 euros, centrée sur la gestion du stress : une respiration qui fait redescendre la pression avant un cours, et le dos après des heures debout. Si l'équipe accroche, un programme de 4 séances sur 2 mois prend le relais.\n\nVos enseignants repartent avec des gestes simples, à refaire juste avant d'entrer en classe.\n\nSi besoin, merci de transmettre à l'équipe de direction. Quinze minutes au téléphone, en semaine après 13 h, suffisent pour caler une date.\n\nMaude Pontet\nMaude Yoga, Gillonnay\n06 42 63 52 38 · pro.maude-yoga.com"
    }
  }
];
