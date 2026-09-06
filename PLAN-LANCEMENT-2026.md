# IziSolo, plan de lancement rentrée 2026

> Document de pilotage marketing, 90 jours du 5 septembre au 5 décembre 2026.
> Écrit le 2026-09-05 à partir des réponses de Colin et de l'état réel des comptes.
> Se lit avec `BIBLE-RESEAUX-2026.md` (la voix de Maude), `BRIEF-DM-INSTA-2026.md`
> (les scripts de DM) et `DEMO-PROGRAMME-2026.md` (le déroulé de démo).
> Le suivi hebdo se coche en §8.

---

## 1. Le diagnostic, sans fard

Ce que l'admin montre le 5 septembre 2026 :

| Studio | État réel |
|---|---|
| Maude Yoga | Fondatrice, 55 élèves, active tous les jours |
| Soleya (Manon) | 38 élèves, 144 cours, 11 encaissements sur 30 jours. **La seule cliente qui utilise tout** |
| Atout Gym Gillonnay | Association, plan multi bêta, 35 cours, active |
| Move Om (Ariana) | Revient tester la visio |
| Yoga Bien-être (Patricia) | 90 élèves importées, 310 cours, silencieuse depuis 18 jours |
| Melyflow | 5 cours, silencieuse depuis 7 jours |
| Maï Yoga (Kim) | Partie sur Momoyoga |
| Bon tempo yoga (Marine) | Vue le 5 juillet, jamais revenue |
| Jen, Yosio, Test | Essai fini ou en cours avec **0 élève, 0 cours** |

Trois constats qui commandent tout le reste :

1. **Un essai qui commence seul finit vide.** Quatre comptes sur onze n'ont jamais créé un cours. Ce n'est pas un problème de produit, c'est le premier quart d'heure : une prof arrive un soir, voit un tableau de bord vide, et repart. La création concierge existe depuis le 23 août et règle exactement ça. Elle est aujourd'hui une option cachée sous le bouton du hero ; elle doit devenir le chemin par défaut.
2. **Il n'existe aucun canal d'acquisition.** Zéro cold email envoyé sur 4000 adresses, des DM Instagram non lancés, une pub qui a acheté des abonnés et pas un essai. Tout ce qui a amené une prof jusqu'ici est venu du réseau personnel de Maude.
3. **La preuve existe et personne ne la voit.** Manon est un cas d'école : gros volume, encaissements, pointage, tout le produit. Un témoignage d'elle, avec son nom et ses chiffres, vaut plus que toute la section « Pour qui » de la landing.

Et une contrainte structurante : la caisse Stripe SaaS est branchée cette semaine. Tout ce qui est lancé avant le branchement produit des essais qui ne peuvent pas payer. Le calendrier tient compte de ça.

---

## 2. Le pari

**On ne vend pas un logiciel, on vend une rentrée déjà montée.**

Message unique de la campagne, décliné partout :

> « Envoie-nous ton planning et ta liste d'élèves. Demain ton studio tourne sur IziSolo. C'est gratuit, c'est Maude qui le fait, et elle est prof de yoga. »

Pourquoi ce pari plutôt qu'un autre :

- Il attaque le vrai trou (l'activation) et le vrai canal (la confiance entre profs) en même temps.
- Aucun concurrent ne peut le copier à l'identique : Momoyoga et Zenamu n'ont pas de prof au bout du fil ; StudioPlan promet une migration en 48 h mais par un service, pas par une paire.
- Il coûte du temps de Maude, pas d'argent. C'est la ressource qu'on a.
- Il transforme chaque prospecte en conversation, et une conversation avec une prof qui a monté ton studio ne se quitte pas pour un logiciel à 29 € de moins.

Ce qu'on garde en second plan, sans le mettre en avant : « l'alternative française à Momoyoga » (les comparatifs blog travaillent pour le SEO) et le multi-prof (on le vend aux associations qui viennent à nous, on ne le prospecte pas encore).

Discipline : yoga et pilates ensemble, France entière, plus la Belgique francophone qui est ouverte depuis v105.

---

## 3. L'offre de lancement

Colin veut gagner peu au début et convertir sur le long terme, mais avec un minimum de revenus. Donc : **on ne donne pas de mois gratuits, on donne du service.** Un mois offert se dévalue, une rentrée montée par une prof se raconte.

**Offre Rentrée 2026, jusqu'au 30 novembre :**

1. **On monte ton studio à ta place** (planning, élèves, offres, portail) sous 48 h, gratuit, tous plans.
2. **Migration depuis Momoyoga, Bsport, Google Sheets ou un cahier** : on importe, tu vérifies.
3. **LANCEMENT50** : moitié prix pendant 3 mois (Essentiel 7,50 €, Complet 14,50 €). Le code existe, il suffit qu'il soit créé par le script Stripe.
4. **Parrainage** : un mois offert à la marraine et un mois offert à la filleule, dès que la filleule paie son premier mois.

Ce qu'on refuse, et pourquoi :
- Pas de « 3 mois gratuits » : ça attire des essais qui ne testent rien, et ça repousse le moment où on apprend si elles paient.
- Pas de plan gratuit à vie : Web Sport l'a fait, ils vivent sur 4 % de commission, ce n'est pas notre modèle.
- Pas de baisse de prix : à 15 et 29 € on est déjà sous Momoyoga et au niveau de Zenamu.

**Parrainage, version 0 sans code** (à construire proprement plus tard) :
- Chaque payante reçoit par email un lien `izisolo.fr/inscription?parrain=<slug>` et une phrase à envoyer.
- L'onboarding enregistre le slug dans une colonne `parrain_slug` (une migration de deux lignes).
- Au premier paiement de la filleule, Colin pose un crédit d'un mois sur les deux comptes depuis le Customer Portal ou un coupon Stripe `PARRAINAGE` à 100 % pour un mois. Une routine hebdo dans `/admin/routines` le rappelle.
- Le jour où il y a dix parrainages par mois, on automatise. Pas avant.

---

## 4. Les trois moteurs

### Moteur 1 : la conversation directe (le gros du volume)

**a) Cold email sur les 4000 adresses.** C'est le seul actif à fort volume qu'on possède et il dort depuis des mois.

- Domaine `izisolo.com`, adresse `maude@izisolo.com` (une personne, jamais « contact@ »). Le `.fr` reste propre.
- Outillage : Bouncer pour valider les 4000 (environ 20 €), Smartlead ou Instantly pour l'envoi (environ 37 €/mois). Warmup **14 jours minimum** avant le premier envoi réel : ça place le lancement au **22 septembre**.
- Cadence : 80 à 100 par jour, 3 messages espacés de 4 jours, tout en texte brut, signé Maude, une seule question à la fin.
- RGPD : prospection B2B vers des adresses professionnelles en lien avec le métier, licite avec une désinscription en un clic et la source indiquée (« ton adresse vient de l'annuaire X »). Le lien de désinscription existant sert.
- Hypothèse réaliste : 40 % d'ouverture, 3 % de réponses, 1 % d'essais. **4000 adresses = environ 40 essais sur six semaines.** Avec le concierge derrière, 30 % deviennent payantes : **12 studios**. C'est modeste et c'est réel.

Séquence type (à réécrire dans la voix de Maude, sans une seule tournure d'IA) :

> **Email 1.** Objet : ta rentrée. « Je suis prof de yoga à Bordeaux et j'ai passé trois ans à gérer mes élèves sur un tableur. J'ai fini par faire construire l'outil que je voulais. Si tu m'envoies ton planning et ta liste, je te monte ton espace demain, gratuitement, et tu regardes si ça te sert. Ça te dit ? »
> **Email 2 (J+4).** Un chiffre de Manon (« Manon gère 38 élèves et 144 séances dessus depuis juillet ») et la même question.
> **Email 3 (J+8).** « Je ne t'écrirai plus après ça. Si un jour le tableur déborde, je suis là. » Et le lien de désinscription bien visible.

**b) DM Instagram par Maude, 10 par jour.** Les scripts existent dans `BRIEF-DM-INSTA-2026.md`. Cibles : profs qui postent leur planning en story ou en carrousel (le signal d'une gestion manuelle). Zéro lien dans le premier message, une question d'abord.

**c) Réactivation des dormantes, cette semaine.** Patricia (90 élèves importées, donc un vrai intérêt), Mélissa, Marine, Jenna, Yozi : un email personnel de Maude, pas une séquence. « Je vois que tu avais commencé. Tu veux que je finisse de te le monter ? Donne-moi ton planning. » Cinq emails, une heure, potentiellement trois clientes.

### Moteur 2 : la preuve (ce qui rend le moteur 1 crédible)

**a) La vidéo de Maude.** C'est le premier actif à produire, avant tout le reste. Une prise, 60 à 90 secondes, dans son studio, téléphone vertical : « Je suis Maude, je suis prof de yoga, voilà comment je pointe mon cours en 10 secondes. » Elle montre l'app sur son téléphone, pas un écran.

Une vidéo, six usages : réel Instagram, post LinkedIn, hero de la landing (à la place de la photo Pexels, qui doit disparaître cette semaine), signature des cold emails (lien vers le réel), page `/creer-mon-studio`, et créative de la pub si on en fait.

**b) Le témoignage de Manon.** Lui demander cette semaine, avec une proposition précise pour qu'elle n'ait rien à inventer : une visio de 15 minutes enregistrée, ou trois phrases écrites et une photo de son studio. Ce qu'on veut : son nom, son studio, ses chiffres, et la phrase qu'elle a dite en arrivant (« je décomptais les carnets à la main »). En échange : un mois offert et le lien vers Soleya sur la landing.

Usages : section Fondatrice de la landing (Manon à côté de Maude), email 2 de la séquence, un article de blog « Comment Soleya gère 38 élèves sans tableur », un carrousel Instagram.

**c) L'Édition Rentrée 2026.** La leçon Momoyoga : nommer ses sorties. Tout ce qui est sorti depuis juillet tient dans un seul post : visio, pointage confié, virement avec QR, factures, déclaration URSSAF mâchée, multi-prof, Belgique. Un post LinkedIn de Maude, un carrousel Instagram, un email à tous les comptes existants (c'est aussi la réactivation). Et on annonce déjà « Édition Hiver » pour janvier : ça dit qu'on est vivants.

### Moteur 3 : les canaux permanents (ce qui rapporte dans six mois)

**a) Écoles de formation.** Aucun contact aujourd'hui, donc on en crée. Dix écoles de yoga et pilates qui forment des profs (formations 200 h, écoles Pilates), un email par école : « vos diplômées sortent avec un métier et un tableur. Offrez-leur IziSolo gratuit six mois, on forme la promo en visio. » Une école qui recommande IziSolo à chaque promotion est un canal qui ne s'éteint plus. Objectif : deux partenariats signés avant décembre.

**b) Groupes Facebook de profs.** C'est là que Web Sport fait de l'astroturfing ; on y va en vrai, avec le nom de Maude, sans jamais nommer un concurrent. Un post utile par semaine (un modèle de règlement d'annulation, une checklist de rentrée, la déclaration URSSAF expliquée), le produit en commentaire seulement quand on nous le demande.

**c) SEO.** Les six comparatifs et les pages villes existent. Ce qu'il faut : le vrai 404 (chantier §8 de la bible, il coûte des positions), et un lien depuis chaque comparatif vers `/creer-mon-studio`. Lire Search Console une fois par semaine, pas plus.

**d) Pub, à une condition.** Pas avant d'avoir la vidéo et le témoignage. Puis un seul test : 5 € par jour pendant 30 jours sur Meta, la vidéo de Maude, audience profs de yoga et pilates France, page d'atterrissage `/creer-mon-studio`. **150 € au total.** On mesure une seule chose : le coût par essai créé. Sous 15 €, on remet 150 €. Au-dessus, on arrête sans état d'âme. Les 50 € précédents ont mesuré des abonnés : c'était la mauvaise unité.

---

## 5. Le calendrier, 90 jours

### Semaines 1 et 2 (5 au 18 septembre) : armer

Colin :
- [ ] Brancher la caisse Stripe (script `setup-stripe-saas.mjs` avec les trois prix, LANCEMENT50, webhook, portail) et tester un vrai checkout de bout en bout.
- [x] Remplacer la photo Pexels de Maude sur la landing par une vraie photo (fait le 6 septembre : mains jointes dans son studio, avatar à lunettes dans la bande de confiance).
- [x] Faire de `/creer-mon-studio` le CTA principal du hero pour la durée de l'offre (le bouton « Essai gratuit » passe en second) : landing v3 du 6 septembre..
- [ ] Bandeau « Offre Rentrée 2026 » sur la landing avec les quatre points de §3. En attente : la migration en 48 h et le parrainage ne sont pas construits, on n'affiche pas une offre qu'on ne tient pas encore. L'essai est passé à 30 jours le 6 septembre.
- [ ] Domaine `izisolo.com` : DNS (SPF, DKIM, DMARC), boîte `maude@`, inscription Smartlead, warmup lancé le 8 septembre au plus tard.
- [ ] Valider les 4000 adresses avec Bouncer, dédoublonner contre les comptes existants.
- [ ] Parrainage v0 : colonne `parrain_slug`, lien dans l'email de bienvenue payant, routine admin.
- [ ] Définir dans `/admin/stats` la métrique « essai activé » (au moins un cours ET une élève à J+3) et l'afficher.

Maude :
- [ ] Tourner la vidéo studio (une prise suffit, on ne cherche pas la perfection).
- [ ] Demander le témoignage à Manon.
- [ ] Cinq emails personnels aux dormantes.
- [ ] Publier le premier réel avec son visage.

### Semaines 3 à 6 (19 septembre au 16 octobre) : tirer

- [ ] 22 septembre : premier envoi cold email, 80 par jour, montée à 100 la deuxième semaine.
- [ ] Maude : 10 DM Instagram par jour, du lundi au vendredi. Elle tient un compte simple : envoyés, réponses, essais.
- [ ] Chaque essai créé reçoit sous 24 h un message de Maude (pas un automate) : « tu veux que je te le monte ? ». L'email J+1 existant garde son rôle de filet.
- [ ] Post « Édition Rentrée 2026 » sur LinkedIn et Instagram + email à tous les comptes.
- [ ] Témoignage de Manon publié : landing, article, carrousel.
- [ ] Dix écoles de formation contactées.
- [ ] Deux posts Instagram par semaine, un post LinkedIn par semaine, tous dans la voix de Maude.
- [ ] Un post utile par semaine dans deux groupes Facebook.

### Semaines 7 à 13 (17 octobre au 5 décembre) : itérer

- [ ] Lire les chiffres du moteur 1 : quel email, quel DM a converti. Réécrire les autres.
- [ ] Deuxième vague cold email : relance des non-ouvertes avec un objet différent.
- [ ] Test pub 150 € sur la vidéo, si et seulement si la vidéo et le témoignage sont en ligne.
- [ ] Parrainage poussé à chaque payante par email personnel.
- [ ] Deuxième témoignage (Atout Gym pour le multi-prof, ou une nouvelle cliente de septembre).
- [ ] Préparer l'Édition Hiver et la vague de janvier (deuxième fenêtre de décision des profs après la rentrée).

---

## 6. Les chiffres qu'on vise et ceux qu'on regarde

Cibles au 5 décembre 2026 (hypothèse à corriger par Colin) :

| Indicateur | Cible |
|---|---|
| Essais créés | 80 |
| Essais activés (un cours et une élève à J+3) | 50 |
| Studios payants | 25 |
| MRR | 400 € (avec LANCEMENT50 en cours sur la plupart) |
| Témoignages nommés en ligne | 2 |
| Partenariats école | 2 |

Le tableau hebdo, cinq lignes, rien d'autre : visites de la landing, essais créés, essais activés, payants, résiliations. Si « activés » stagne alors que « créés » monte, on arrête d'acquérir et on répare l'accueil.

Budget total sur 90 jours : Smartlead 3 mois (environ 110 €), Bouncer (environ 20 €), test pub (150 €). **Moins de 300 €.**

---

## 7. Qui fait quoi

**Maude** est la voix et la main : vidéo, DM, LinkedIn, groupes, création concierge des studios, témoignages, démos. Rien ne sort en public sans passer par elle.

**Colin** est la machine : caisse, landing, parrainage, outillage email, tracking, réactivation technique, et l'écriture des séquences que Maude relit et corrige dans sa voix.

Règles déjà gravées qui s'appliquent : tutoiement, zéro tiret quadratin, zéro tournure d'IA dans tout texte lu par une humaine, zéro nom de concurrent sur les réseaux, zéro faux témoignage, zéro chiffre non sourcé.

---

## 8. Suivi hebdomadaire

| Semaine | Essais créés | Activés | Payants | Fait / décidé |
|---|---|---|---|---|
| S1 (5 au 11 sept) | | | | |
| S2 (12 au 18 sept) | | | | |
| S3 (19 au 25 sept) | | | | |
| S4 (26 sept au 2 oct) | | | | |
| S5 (3 au 9 oct) | | | | |
| S6 (10 au 16 oct) | | | | |
| S7 (17 au 23 oct) | | | | |
| S8 (24 au 30 oct) | | | | |
| S9 (31 oct au 6 nov) | | | | |
| S10 (7 au 13 nov) | | | | |
| S11 (14 au 20 nov) | | | | |
| S12 (21 au 27 nov) | | | | |
| S13 (28 nov au 5 déc) | | | | |
