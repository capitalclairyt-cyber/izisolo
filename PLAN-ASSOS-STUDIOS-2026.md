# Associations, Studios et l'écosystème : une personne, plusieurs structures

> Document de brainstorm et de pilotage, ouvert le 2026-09-13 sur la demande de
> Colin : « mettre le paquet sur les associations et les studios », deux plans
> en plus d'Essentiel et Complet. Révisé le même jour après ses décisions :
> **Essentiel passe à 0 €** (freemium sans carte), Multi disparaît, l'annuel
> s'active pour Association et Studio, le RNA est obligatoire, et l'app doit
> devenir un **écosystème** où une prof qui a son IziSolo est aussi
> intervenante dans l'IziSolo d'une asso et d'un studio. Ce document propose,
> Colin tranche (§9), puis on avance lot par lot avec une preuve par lot (§8).

---

## 1. D'où l'on part (mesuré le 2026-09-13)

**Ce qui existe déjà et qu'on ne recode pas.** Le chantier multi-prof d'août
a posé la fondation : `studio_membres` (v101, appliquée), rôles
`proprietaire / admin / prof`, neuf permissions dont trois tenues par la RLS
(`argent_voir`, `messagerie`, `parametres`), écran `/equipe`, invitation par
email, **sélecteur de studio** (une personne qui possède son studio ET
travaille ailleurs bascule de l'un à l'autre, lot 3b), `cours.intervenant_id`
et portée de pointage (v103, **écrite mais pas appliquée**), lien de pointage
confié pour UNE séance (v100). Le plan `multi` à 49 € est public, son Price
Stripe est live.

**Ce qui n'a jamais servi.** En prod : 27 profils, 15 Essentiel, 1 Complet,
10 internes, **1 seul Multi** (Atout Gym, bêta offerte, 1 membre, 0 élève,
jamais utilisé). Aucune invitation d'équipe réelle n'a été envoyée par une
prof. **Aucune prof ne paie aujourd'hui** (la caisse Stripe est live depuis le
7/09, son seul paiement est celui de la preuve) : passer Essentiel à 0 € ne
retire aucun revenu existant.

**La contrainte structurelle, vérifiée dans le schéma.** Une structure EST un
compte de connexion : `profiles.id` est l'id du compte auth, posé par le
trigger `handle_new_user`, avec suppression en cascade. La branche (a) de
`mes_studios_staff()` (« mon studio = le profil dont l'id est le mien ») et
tout l'onboarding reposent dessus. Conséquence : **un email = au plus une
structure possédée**. Ce n'est pas un défaut à corriger, c'est la forme que
prendra l'écosystème (§6.1).

**Ce que l'app suppose encore.** Le studio est une personne : `profiles`
porte le prénom, l'avatar, la bio et le SIRET de la prof, et le portail
public raconte UNE prof. Il n'existe aucune notion de « type de structure »,
ni de dépense (IziSolo ne connaît que des recettes), ni d'adhésion, ni de
rémunération d'une intervenante, ni de vue « toutes mes structures ».

---

## 2. La grille (décisions Colin du 2026-09-13 intégrées)

| Plan | Clé DB | Prix | Pour qui | La frontière |
|------|--------|------|----------|--------------|
| **Essentiel** | `solo` | **0 €, sans carte, pour toujours** | La prof seule, son cahier en mieux | inchangée : tout ce qu'elle fait seule |
| Complet | `pro` | 29 € | La prof seule, ses élèves dans la boucle | inchangée : tout ce qui fait agir l'élève |
| **Association** | `asso` | **39 €** ou **390 €/an** | Une asso loi 1901 avec un bureau et des profs | Complet + équipe + la vie de l'asso |
| **Studio** | `studio` | **59 €** ou **590 €/an** | Un studio commercial avec des intervenantes | Complet + équipe + la gestion du studio |

**Multi disparaît** (décidé). La clé `multi` reste en base comme legacy
mappée vers `studio` par `effectivePlan()`, le traitement de `premium` → `pro`.
`multi_free` (Atout Gym) est mappé vers `studio` aussi. Le Price Stripe 49 €
est archivé, jamais supprimé.

**L'annuel** (décidé) : activé pour Association et Studio seulement, deux mois
offerts (390 et 590 €, à confirmer). Une asso vote un budget et paie par
virement après décision du bureau ; l'annuel est son mode naturel. Reco :
LANCEMENT50 s'applique au mensuel des trois plans payants, pas à l'annuel.

**Le RNA obligatoire** (décidé) : `W` + 9 chiffres, validé par format à
l'onboarding Association, comme le SIRET l'est pour la facturation. C'est le
garde-fou contre le studio qui se déclare asso pour payer 20 € de moins, avec
les deux autres : les plans ne contiennent pas les mêmes choses, et le portail
d'une asso affiche « Association loi 1901 ».

**L'essai** : 30 jours de Complet offerts à toute prof seule, puis Essentiel
gratuit sans rien faire, ou Complet à 29 €. Une structure (asso, studio)
essaie **son** plan 30 jours, puis retombe sur Essentiel gratuit (l'équipe
passe en lecture seule, §6.7) ou paie. Plus jamais de compte gelé à la fin
d'un essai (§3).

### 2.1 Ce que le freemium veut dire, et ce qu'il coûte
- **La thèse de Colin** : le prix rebute des visiteuses avant qu'elles aient
  vu l'app. Un Essentiel gratuit fait entrer, la boucle élève fait payer. Les
  faits qu'on a : quatre essais sur onze mouraient à zéro cours (§5 landing
  v3), donc le frein est autant l'activation que le prix ; le freemium
  n'exonère pas du concierge, il le rend plus rentable (une prof gratuite qui
  a ses élèves dedans est une prof qui reste).
- **Ce qui est gratuit est généreux** : factures acquittées, déclaration
  URSSAF, livre des recettes, export comptable, carnets manuels, lieux
  illimités, zéro quota. C'est le « cahier » et il doit rester complet, sinon
  le gratuit ne vaut rien. Le levier vers Complet est UNIQUEMENT la boucle
  élève (réservation, espace, rappels, paiement en ligne, messagerie,
  demande d'offre). On mesure la conversion à 60 jours avant de bouger la
  frontière ; deux candidats si elle est trop faible : la déclaration URSSAF
  automatisée et les factures automatiques (déjà Complet).
- **Le coût réel d'une prof gratuite** est le support, pas la base (aucun
  email élève en Essentiel, des lignes Postgres négligeables). D'où l'ordre :
  le guide et la FAQ avant tout chatbot (règle du 18/08), et le widget
  feedback qui reste.
- **Le freemium fait tourner l'écosystème** (§6) : chaque intervenante
  invitée par une asso ou un studio peut ouvrir SON IziSolo gratuit en un
  clic, et chaque prof gratuite peut faire entrer son asso et son studio. Les
  deux boucles se nourrissent, et c'est là que 0 € rapporte.

---

## 3. Ce que le freemium change dans la mécanique de compte

Aujourd'hui `getAccountStatus()` rend `trial_expired` à J+30 sans
souscription, et `trial_expired` = **compte gelé** (402 sur toute écriture,
triggers SQL `compte_gele()` v81, bandeaux). Le freemium retire le gel de la
fin d'essai. Ce qui bouge, dans `lib/trial.js` et ses miroirs :
1. `trial_expired` disparaît comme état terminal : après l'essai, `effectivePlan`
   rend `solo` et le statut devient `free` (« sur Essentiel gratuit »). Aucune
   écriture n'est refusée. Le bandeau de fin d'essai devient un bandeau
   d'invitation (« ton essai Complet est fini, tes élèves n'ont plus leur
   espace : le rouvrir coûte 29 € »), fermable.
2. **Le gel ne reste que pour l'impayé** : `past_due` après les relances
   Stripe. `isAccountFrozen()` et `compte_gele()` (SQL, v81) se réécrivent
   ensemble, même règle des deux côtés, avec une migration.
3. `canceled` (résiliation par le Customer Portal) → plan `solo`, statut
   `free`, rien de gelé ; le webhook `customer.subscription.deleted` pose le
   plan. L'élève perd son espace à la fin de la période payée, pas avant.
4. Stripe : plus de Price pour `solo`, le checkout n'accepte que `pro`, `asso`,
   `studio` ; le Customer Portal n'autorise le changement qu'entre plans de
   même famille (pro ↔ rien, asso ↔ studio jamais).
5. Les emails de relance J-3 / J-1 (cron `expirations`) se réécrivent : ils
   annonçaient un gel, ils annoncent une perte de la boucle élève.
6. L'admin : nouveau statut `gratuit` (distinct d'`essai`, `abonné`,
   `offert`, `impayé`), le funnel et le MRR ne changent pas.
7. La landing et la carte Paramètres → Abonnement : « Essentiel 0 €, sans
   carte, pour toujours ». Les preuves qui citent « 30 jours d'essai » et
   « sans carte » se relisent.
8. `plan-guard`, `PlanRequis`, `requireCapacite` : inchangés dans leur
   logique, mais `PlanRequis` doit dire « passe en Complet » à une prof
   gratuite ET à une prof en fin d'essai avec les mêmes mots.

---

## 4. Ce que les deux plans partagent : les intervenantes

C'est le cœur commun, à construire en premier parce que les deux plans et
l'écosystème en dépendent, et que la fondation est déjà là.

### 4.1 Une intervenante peut ne jamais avoir de compte
Dans une asso comme dans un studio, la moitié des profs ne créeront jamais de
compte : elles donnent leur cours et repartent. Colin demande « la génération
de liens pour les différents intervenants profs » : c'est la généralisation de
v100.
- Une **invitation** crée une ligne `studio_membres` dès l'envoi (déjà le cas,
  statut `invite`). On y ajoute un **accès par lien permanent** : jeton 256
  bits, sha256 seul en base (patron v100), révocable, valable la saison, qui
  ouvre `/intervenante/<jeton>` sans session Supabase : SES séances à venir,
  le pointage de chacune (même chemin que v100, même minimisation : prénom et
  nom, jamais un email, un carnet ni un montant), son relevé de séances (§4.3).
- Cette page propose **« Ouvrir mon IziSolo gratuit »** (§6.2) : l'email est
  celui de l'invitation, le compte se rattache à la ligne existante
  (`activerInvitationsEnAttente` fait déjà ce rattachement par email).
- Une intervenante sans compte n'a **aucune permission** au sens de la RLS :
  elle n'existe que par les routes service_role de son lien, qui re-vérifient
  `lien.membre_id` à chaque appel. C'est exactement la frontière de v100.

### 4.2 Chaque séance a une intervenante, et ça se voit
- v103 s'applique. « Qui donne cette séance ? » remonte à la création d'un
  cours et sur les séries (`recurrences.intervenant_id` recopié sur chaque
  séance, comme `capacite_max`), avec un défaut = la personne connectée.
- **Le portail public nomme la prof** sur chaque carte (« avec Léa »), propose
  un **filtre par intervenante** et une **page « L'équipe »** (photo, bio par
  membre : `studio_membres.bio`, `photo_url`) ; la bio du profil devient
  celle de la STRUCTURE.
- L'agenda gagne une vue « par intervenante » et un filtre « mes séances ».

### 4.3 Le suivi financier par intervenante
Un studio paie ses profs, une asso aussi (souvent des auto-entrepreneures qui
facturent l'asso à la séance). Ce que l'app peut dire sans rien inventer :
- **Le relevé de séances** : par intervenante et par mois, les séances
  données (pointées), leur durée, les présentes, le CA rattaché (présences
  décomptées de carnets ou payées à la séance, au prorata). Tout est en base
  via `cours.intervenant_id` + `presences` + `paiements`.
- **La rémunération convenue** (`studio_membres.remuneration`, jsonb :
  `par_seance | horaire | pourcentage_ca | forfait_mensuel`, montant) → le
  relevé calcule ce qui est dû. La suite (la facture de la prof, la dépense de
  la structure) est la boucle d'argent de l'écosystème, §6.5.

---

## 5. Les deux plans, chacun son périmètre

### 5.1 Association : la vie de l'asso
Périmètre borné : IziSolo reste l'outil des cours, des adhérents et de
l'argent des cours. On ne devient pas AssoConnect.
- **Le bureau = des fonctions, pas un troisième système de rôles.**
  `studio_membres.fonction` (`presidente | secretaire | tresoriere |
  membre_bureau | prof | benevole`) est une étiquette (équipe, PV,
  convocations) qui **propose un préréglage** de permissions à l'invitation :
  présidente = tout (rôle admin), trésorière = `argent_voir` +
  `argent_gerer` + `eleves_voir`, secrétaire = `eleves_gerer` + `messagerie`
  + documents, prof = le préréglage existant. Les permissions restent ce que
  la RLS applique.
- **L'adhésion** : type d'offre `adhesion` (de saison, sans séance, un tarif
  par offre : plein, réduit, famille = trois offres), règle de studio
  « adhésion requise pour réserver » à côté de « carnet requis » (réservation
  et bandeau au pointage, jamais un refus de pointer), **reçu de cotisation** =
  la facture v84 intitulée « reçu de cotisation », liste des adhérents à jour
  = un filtre de /clients qui sert le quorum.
- **Les documents de l'asso** : table `documents_structure` (Blob, chemin de
  v85 : statuts, récépissé, règlement intérieur, assurance, agrément, PV
  d'AG, autre ; date, titre, version), une version courante par type,
  l'historique dessous. Pas de signature électronique.
- **L'AG** : date, lieu, ordre du jour, type ; convocation par le mailing
  existant aux adhérents à jour (délai rappelé, pas imposé) ; feuille
  d'émargement imprimable avec pouvoirs ; quorum au jour de l'AG ; PV déposé
  comme document rattaché. **Pas de vote électronique** au premier tour.
- **L'argent de l'asso** : recettes existantes + dépenses simples (§5.2) +
  export du trésorier par saison (exercice réglable, sept → juin) avec
  récapitulatif par catégorie pour le rapport financier. L'URSSAF s'éteint
  sur ce plan.

### 5.2 Studio : la gestion du studio
- **Les dépenses et la marge** : première table `depenses` de l'app (date,
  catégorie, HT/TTC, TVA, fournisseur, justificatif, rattachement facultatif
  à une intervenante, une salle, un cours), page Compta (recettes, dépenses,
  résultat par mois, salle, intervenante, type), marge par cours (CA de la
  séance moins rémunération et salle), export complet pour l'expert-comptable.
  Les dépenses simples servent aussi l'asso ; la profondeur analytique est
  Studio.
- **Les intervenantes côté gestion** : liste avec suivi financier (§4.3),
  contrat de prestation stocké comme document, relevé mensuel PDF envoyé le
  1er du mois (opt-in, mécanique v106).
- **Les salles** : `lieux` gagne des salles (nom, capacité), une séance porte
  sa salle, l'agenda refuse le chevauchement à la création et sur les séries.
- **Le portail du studio** : le tronc commun (§4.2) + une page par
  intervenante (`/p/<slug>/equipe/<membre>`), les champs Paramètres qui
  parlent « votre studio » et non « ta bio ». Les sous-domaines (code livré,
  DNS à brancher) prennent leur sens ici.
- **Les stats** (plus tard) : remplissage par cours, intervenante, salle,
  créneau ; no-show ; élèves actives ; panier moyen. Rien à stocker.

---

## 6. L'écosystème : une personne, plusieurs structures

C'est la demande du 13/09 : « une prof qui a son propre IziSolo puisse aussi
être intervenante dans l'IziSolo d'une asso et d'un studio, et que tout puisse
interagir ». Ce qui suit est une proposition en six ponts, sur un modèle en
trois mots qui est DÉJÀ celui de la base.

### 6.1 Le modèle : Personne, Structure, Appartenance
- **Une personne** = un compte de connexion (un email). Prof, trésorière,
  gérante, élève : la même personne peut être tout cela, dans des structures
  différentes.
- **Une structure** = une ligne `profiles`, avec SON plan, SON portail, SES
  élèves, SON argent. Elle est de type `solo`, `association` ou `studio`
  (nouvelle colonne `type_structure`). **La prof seule est une structure de
  type solo dont elle est propriétaire** : son IziSolo est déjà une structure.
- **Une appartenance** = une ligne `studio_membres` : personne × structure ×
  rôle, permissions, fonction, portée de pointage, rémunération, lien
  d'accès.

**La règle qui découle de la contrainte du §1 : une structure a son propre
compte de connexion.** Une asso se crée avec l'adresse de l'asso
(`contact@asso.fr`), un studio avec la sienne ; les humains y sont des
appartenances. Trois conséquences, toutes bonnes :
- une prof qui a son IziSolo (son email) peut créer celui de son asso (l'email
  de l'asso) et y être admin ET intervenante, sans toucher au schéma ;
- le compte de la structure **survit au bureau** : quand la présidente change,
  on change des fonctions et des rôles, jamais le compte ; le « transfert de
  propriété » se réduit à « qui connaît le mot de passe de la structure »
  plus un geste de réinitialisation depuis /equipe pour une admin ;
- une prof seule qui grandit (elle embauche) change le TYPE de sa structure
  et son plan, pas de compte : son IziSolo devient un studio.
Le découplage `profiles.id ≠ auth.uid` (une personne propriétaire de plusieurs
structures avec un seul login) reste possible plus tard, mais il touche le
trigger, le helper RLS, l'onboarding, l'admin et la suppression en cascade ; on
ne l'ouvre que si la règle « un email par structure » bloque quelqu'un en vrai.

### 6.2 Pont 1 : l'invitation dans les deux sens (= le parrainage)
- **Structure → prof** existe (/equipe). Chaque email d'invitation gagne une
  ligne : « Tu n'as pas encore ton IziSolo ? Il est gratuit » avec le lien
  d'inscription pré-rempli ; à la création, le compte se rattache à
  l'invitation par email.
- **Prof → structure** est à construire : depuis son IziSolo (dashboard,
  Paramètres → Équipe → « Ailleurs »), la prof saisit le nom de son asso ou
  studio et **l'adresse de la structure** (l'écran dit « pas la tienne »).
  Email à la structure : « Maude te propose d'ouvrir l'espace IziSolo de
  [asso] ; elle y est déjà inscrite comme intervenante ». Le lien ouvre
  l'onboarding pré-typé (association → RNA demandé), et à la création de la
  structure, la prof est **automatiquement membre** (rôle prof, intervenante)
  et la structure entre en essai de son plan.
- **C'est la mécanique de parrainage** annoncée depuis juillet et jamais
  construite. Reco : un mois de Complet offert à la prof quand la structure
  qu'elle a fait entrer devient payante, un mois offert à la structure sur
  son premier abonnement. Rien n'est promis à l'écran tant que ce n'est pas
  câblé (règle du 27/07).
- Le concierge (« on installe ton asso », Maude en visio) reste la voie
  humaine, avec le même rattachement automatique de la prof qui a amené la
  structure (`demandes_studio` gagne `parrainee_par`).

### 6.3 Pont 2 : l'agenda de la personne
Aujourd'hui la prof bascule de studio (rechargement complet) et chaque
dashboard ne montre que sa structure. Proposition : **son propre IziSolo est
sa maison**, et il montre ses séances PARTOUT.
- Dans « Aujourd'hui » et dans l'agenda de sa structure solo, les séances
  qu'elle donne ailleurs apparaissent comme des cartes taguées « à l'Asso X »,
  en lecture, avec un clic qui bascule sur la structure et ouvre la séance ou
  le pointage. Une seule requête avec son propre jeton : v101 lui donne la
  LECTURE du studio entier là où elle est membre, et `intervenant_id` dit
  lesquelles sont à elle.
- Une prof en Essentiel gratuit y a droit : être intervenante ailleurs
  n'exige aucun plan de SON côté (le plan est payé par la structure).
- La messagerie et la cloche restent par structure au premier lot ; une
  cloche agrégée (« 2 notifications à l'Asso X ») vient au lot 2 si le retour
  le demande.

### 6.4 Pont 3 : ce qui ne se croise JAMAIS
Les élèves, l'argent et les réglages d'une structure ne sortent pas de la
structure. Une prof voit les élèves de l'asso uniquement dans l'IziSolo de
l'asso, avec `eleves_voir`. Une élève qui suit Maude à l'asso ET chez Maude a
deux fiches et deux carnets, et on ne les fusionne pas : chaque carnet est
l'argent de sa structure. Aucune policy RLS ne change pour ça ; c'est
`mes_studios_staff()` qui tient la frontière, et le ratchet `studio-scope`
qui l'empêche de bouger.

### 6.5 Pont 4 : l'argent, un document et deux vues
C'est la boucle qui rend l'écosystème utile tous les mois.
- La structure produit le **relevé** de l'intervenante (§4.3).
- Côté prof, dans SON IziSolo, une section **« Mes prestations »** (Revenus)
  liste les relevés reçus de chaque structure. « Facturer » émet une
  **facture non acquittée** dans SA séquence (`FAC-2026-00xx`), adressée à
  la structure, PDF envoyé ; c'est la v2 des factures notée depuis v84
  (statut `emise` → `payee`), qui règle aussi le cas du CE payeur direct.
- Côté structure, la même prestation est une **dépense « à régler »**
  (§5.2), rattachée à l'intervenante et à sa facture. « Réglée » (date,
  virement) la solde.
- Côté prof, ce règlement devient un **paiement encaissé** (mode virement,
  date d'encaissement) dans ses Revenus, donc dans son assiette URSSAF v93.
- Une table `prestations` (structure, membre, période, montant, statut,
  facture de la prof, dépense de la structure) porte l'enregistrement
  unique ; chaque côté n'en voit que sa vue, par RLS. Une intervenante sans
  compte a son relevé en PDF sur son lien, et rien d'autre.

### 6.6 Pont 5 : les portails qui se citent
Visibilité dans les deux sens, opt-in des deux côtés :
- sur le portail d'une prof : « Je donne aussi des cours à [Asso X] » avec le
  lien ;
- sur le portail d'une structure : « Nos intervenantes » avec, pour chacune
  qui a son IziSolo et l'a accepté, le lien vers SA page.
Ce sont des liens internes izisolo.fr ↔ izisolo.fr : ils portent aussi le
référencement (un maillage que les pages villes n'ont pas).

### 6.7 Pont 6 : l'élève, un compte, tous ses studios
Le compte élève est déjà global (email, `auth_user_id` v83, `mes_studio_ids()`
v91) mais l'espace est par studio. Un **hub `/mes-studios`** : ses studios, ses
prochains cours toutes structures confondues, une entrée vers chaque espace.
C'est le « hub multi-studios élève » du brainstorm de juillet, qui devient
nécessaire dès qu'une prof et son asso sont toutes deux sur IziSolo.

### 6.8 Le downgrade d'une structure
Une structure qui cesse de payer retombe sur Essentiel gratuit. Ses membres
passent en **lecture seule** (le sélecteur de studio les y mène encore,
l'écran dit pourquoi), rien n'est révoqué, la propriétaire reçoit un message ;
re-souscrire rend tout. C'est la règle recommandée depuis août, elle devient
la seule possible avec le freemium (il n'y a plus de gel où tomber).

### 6.9 Où ça se voit dans l'app (la « visibilité »)
- Dashboard de la prof : une tuile « Tu donnes aussi des cours ailleurs ?
  Fais entrer ton asso ou ton studio » (étape de checklist, fermable).
- Paramètres → Équipe : deux volets, « Mon équipe » (existant) et
  « Ailleurs » (mes appartenances, mes relevés, inviter une structure).
- L'email d'invitation d'une structure : la ligne « ton IziSolo gratuit ».
- La page d'une intervenante sans compte : « Ouvrir mon IziSolo gratuit ».
- Les portails croisés (§6.6) et les pages `/associations`, `/studios`.

---

## 7. Les transformations de l'app que ça impose

1. **`profiles.type_structure`** (`solo | association | studio`, défaut
   `solo`), choisi à l'onboarding (après le pays), modifiable dans Paramètres
   → Studio & lieux. Pilote les libellés, la présence des rubriques (Bureau,
   AG, Documents, Compta), le portail, le RNA à l'onboarding, le plan d'essai.
2. **Le gating devient non linéaire.** `RANG = {solo:1, pro:2, multi:3}`
   suppose une échelle ; Association et Studio sont frères. `CAPACITES`
   accepte une liste (`equipe: ['asso','studio']`, `bureau_asso: ['asso']`,
   `compta_studio: ['studio']`), `can()` et `requireCapacite` testent
   l'appartenance, `PlanRequis` nomme LE plan qui ouvre la capacité. Touche
   `plan-guard.js`, `trial.js` (`effectivePlan`, `getAccountStatus`), le CHECK
   `profiles_plan_check` (v102 → nouvelle migration), `plan_effectif()` SQL,
   `tablePlansParPrice`, `PUBLIC_PLANS`, l'admin.
3. **Le freemium** (§3) : fin du gel de fin d'essai, gel réservé à l'impayé,
   `compte_gele()` SQL alignée, webhook `deleted` → `solo`, plus de Price
   solo, relances J-3/J-1 réécrites, statut admin `gratuit`.
4. **La structure n'est pas une personne** : séparer ce qui est à la
   STRUCTURE (nom, logo, bio, adresse, SIRET ou RNA, RIB, portail) de ce qui
   est à la PERSONNE connectée (prénom, avatar, notifications). Reste les
   écrans Paramètres → Profil et le portail.
5. **La membre sans compte** : `studio_membres.auth_user_id` nullable
   jusqu'à l'activation, plus `lien_hash`, `lien_expire_at`, `fonction`,
   `bio`, `photo_url`, `remuneration`. Une migration.
6. **La restriction de lecture du profil** pour une membre (elle lit
   aujourd'hui la ligne `profiles` entière, Stripe compris) : dette d'août
   qui devient bloquante avec de vrais bureaux.
7. **Les dépenses** et **les prestations** : deux tables neuves, RLS
   `argent_voir` / `argent_gerer` côté structure, et côté prof une lecture
   de SES prestations par `auth_user_id`.
8. **Les factures v2** (non acquittée, `emise` → `payee`) : même RPC de
   numérotation, statut en plus, snapshot figé à l'émission.
9. **Stripe** : Prices `asso` / `studio` mensuels et annuels,
   `setup-stripe-saas.mjs` étendu, Multi archivé, Customer Portal borné par
   famille.
10. **La landing** reste à deux plans pour les profs seules (Essentiel 0 €,
    Complet 29 €) + une section « Association ou studio ? » vers
    `/associations` et `/studios` (gabarit persona), chacune avec son CTA
    concierge. La promesse « mode équipe » retirée le 23/07 revient sur ces
    deux pages seulement, le jour où le lot 1 est livré.
11. **Le centre d'aide** : tutos `#association`, `#studio`, `#ailleurs`
    (l'écosystème côté prof), FAQ en fin de liste, mini-aide élève pour le
    hub, « ? » sur chaque nouvel écran, dans le lot de chaque livraison.

---

## 8. Les lots, dans l'ordre où ils rendent service

Chaque lot = migration re-runnable qui dégrade proprement, preuve en vrai
navigateur, centre d'aide, commit, push.

| Lot | Contenu | Ce qui le prouve |
|-----|---------|------------------|
| **0. Le socle** (3 j) | freemium (§3), `type_structure`, gating non linéaire, clés `asso` / `studio`, Multi legacy, Stripe (4 Prices), onboarding à trois branches avec RNA, admin, landing pricing | plan-guard spec, un studio jetable par type, fin d'essai qui ne gèle plus (écriture acceptée à J+31), checkout des deux plans en test, résiliation → Essentiel |
| **1. Les intervenantes et les ponts 1 à 3** (4 j) | v103 appliquée, intervenante à la création et sur les séries, membre sans compte + lien permanent, invitation prof → structure avec rattachement automatique, agenda de la personne, portail : nom de la prof + filtre + page Équipe, downgrade lecture seule | proof-equipe étendu, lien sans session et RLS refusée avec le jeton de l'invitée, une prof jetable qui fait entrer une asso jetable et se retrouve intervenante dedans, ses séances vues depuis SON dashboard |
| **2. L'argent** (3 j) | rémunération par membre, relevé mensuel PDF, dépenses simples, prestations, factures v2, « Mes prestations », export saison / exercice | un mois du démo : relevé recalculé à la main, facture émise côté prof, dépense réglée côté structure, paiement apparu côté prof dans l'assiette URSSAF |
| **3. La vie de l'asso** (3 j) | fonctions du bureau et préréglages, adhésion (offre + règle + reçu), documents de la structure, AG | l'association de Maude en vrai, une AG blanche |
| **4. La gestion du studio** (3 j) | compta (marge, TVA, par salle / intervenante / cours), salles et chevauchements, contrat, relevé automatique | studio jetable, chevauchement refusé, marge recalculée |
| **5. Les vitrines et le hub** (2 j) | `/associations`, `/studios`, section landing, portails croisés, hub élève `/mes-studios`, page par intervenante, tutos, FAQ | proof-landing étendu, Safari, mobile 390, une élève jetable inscrite dans deux studios |
| 6. Les stats (plus tard) | remplissage, no-show, panier moyen | après un vrai mois d'usage |

**Le lot 1 est livré (2026-09-13). Il se COMPLÈTE avec l'association de Maude comme première équipe réelle**
(plan `asso` posé à la main avant même que la caisse sache l'encaisser) : c'est
là qu'on apprend si les rôles, le lien d'intervenante, l'invitation sortante
et l'agenda de la personne tiennent devant de vraies personnes. Le lot 3 se
dessine après ce retour.

---

## 9. Décisions

### Prises le 2026-09-13 (Colin)
- Essentiel passe à **0 €**, sans carte, freemium.
- **Multi disparaît** au profit d'Association 39 € et Studio 59 €.
- **L'annuel** est activé pour Association et Studio.
- **Le RNA** est obligatoire pour le plan Association.
- L'app devient un **écosystème** : une prof avec son IziSolo est aussi
  intervenante dans l'IziSolo d'une asso et d'un studio, et tout interagit.

### À trancher
1. **Une structure = son propre compte de connexion** (l'email de l'asso ou
   du studio), les humains = des appartenances ; le découplage
   `profiles.id ≠ auth.uid` attend un vrai blocage : ok ?
2. **L'essai reste 30 jours de Complet** pour une prof seule, puis Essentiel
   gratuit ; une structure essaie SON plan 30 jours : ok ?
3. **Le gel ne reste que pour l'impayé** ; résiliation et fin d'essai
   retombent sur Essentiel : ok ?
4. **Les prix annuels** 390 € et 590 € (deux mois offerts) ; LANCEMENT50 sur
   le mensuel des trois plans payants, pas sur l'annuel : ok ?
5. **Le parrainage** = un mois de Complet offert à la prof qui fait entrer une
   structure devenue payante, un mois offert à la structure : ok, ou autre
   montant ?
6. **Le bureau = des fonctions** (étiquettes + préréglages) sur les rôles
   existants, jamais un nouveau système de droits : ok ?
7. **La membre sans compte** avec lien permanent valable la saison,
   révocable : ok ?
8. **La boucle d'argent** du §6.5 (relevé → facture v2 de la prof → dépense
   de la structure → paiement chez la prof), dans le lot 2 : ok ?
9. **Le hub élève** `/mes-studios` au lot 5 : ok ?
10. **L'ordre des lots** et « l'asso de Maude entre au lot 1 » : ok ?
11. **Le vote électronique en AG** : hors périmètre au premier tour : ok ?

---

## 10. Suivi

- [x] Décisions §9 « à trancher » prises : « ok, go » de Colin le 2026-09-13 sur les onze.
- [x] Lot 0 · socle + freemium : LIVRÉ le 2026-09-13 (commit du jour), prouvé 33/33 en phase dégradée. Restes côté Colin : appliquer v110, relancer `setup-stripe-saas.mjs` en live, poser les env vars, redéployer (bible §8).
- [x] Lot 1 · intervenantes + ponts 1 à 3 : LIVRÉ le 2026-09-13 (commit du jour), prouvé 15/15 en phase dégradée (v111 absente ; v103 et v110 appliquées le jour même) en vrai navigateur. Restes côté Colin : appliquer v103 puis v111, faire entrer l'association de Maude (le retour qui dessine le lot 3). Choix consigné : la lecture seule au downgrade est une garde d'application (routes + écrans), pas de la base (la RLS v101 gate sur l'appartenance) ; scinder ~20 policies « for all » pour l'ancrer en SQL est un chantier à part, à ouvrir si une structure en lecture seule pose problème en vrai.
- [ ] Lot 2 · l'argent (relevé, dépenses, prestations, factures v2)
- [ ] Lot 3 · vie de l'asso
- [ ] Lot 4 · gestion du studio
- [ ] Lot 5 · vitrines, portails croisés, hub élève, centre d'aide
