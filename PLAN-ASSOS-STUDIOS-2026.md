# Associations & Studios : deux plans, une seule fondation

> Document de brainstorm et de pilotage, ouvert le 2026-09-13 sur la demande de
> Colin : « mettre le paquet sur les associations et les studios », deux plans
> en plus d'Essentiel et Complet, 39 € pour les assos et 59 € pour les studios,
> à calculer et discuter. Ce document propose, Colin tranche (§8), puis on
> avance lot par lot avec une preuve par lot (§7).

---

## 1. D'où l'on part (mesuré le 2026-09-13)

**Ce qui existe déjà et qu'on ne recode pas.** Le chantier multi-prof d'août
a posé la fondation : `studio_membres` (v101, appliquée), rôles
`proprietaire / admin / prof`, neuf permissions dont trois tenues par la RLS
(`argent_voir`, `messagerie`, `parametres`), écran `/equipe`, invitation par
email, sélecteur de studio, `cours.intervenant_id` et portée de pointage
(v103, **écrite mais pas appliquée**), lien de pointage confié pour UNE séance
(v100). Le plan `multi` à 49 € est public, son Price Stripe est live.

**Ce qui n'a jamais servi.** En prod : 27 profils, 15 Essentiel, 1 Complet,
10 internes, **1 seul Multi** (Atout Gym, bêta offerte, 1 membre, 0 élève,
jamais utilisé). Aucune invitation d'équipe réelle n'a été envoyée par une
prof. Tout ce qu'on va construire au-dessus repose donc sur une fondation
prouvée en navigateur (35/35, 33/33) mais jamais éprouvée par une vraie équipe.
Conséquence directe pour l'ordre des lots : **la première association réelle
(celle où Maude enseigne) doit entrer AVANT qu'on construise les features
spécifiques aux assos**, sinon on dessine des rôles de bureau pour des gens
qu'on n'a jamais vus utiliser l'écran Équipe.

**Ce que l'app suppose encore.** Le studio est une personne : `profiles`
porte le prénom, l'avatar, la bio et le SIRET de la prof, et le portail
public raconte UNE prof. Il n'existe aucune notion de « type de structure »,
ni de dépense (IziSolo ne connaît que des recettes), ni d'adhésion, ni de
rémunération d'une intervenante.

---

## 2. La grille proposée

| Plan | Clé DB | Prix | Pour qui | La frontière |
|------|--------|------|----------|--------------|
| Essentiel | `solo` | 15 € | La prof seule, son cahier en mieux | inchangé |
| Complet | `pro` | 29 € | La prof seule, ses élèves dans la boucle | inchangé |
| **Association** | `asso` | **39 €** | Une asso loi 1901 avec un bureau et des profs | Complet + équipe + la vie de l'asso |
| **Studio** | `studio` | **59 €** | Un studio commercial avec des intervenantes | Complet + équipe + la gestion du studio |

**Que devient Multi.** Recommandation : **Multi disparaît comme plan public**.
Trois plans « à plusieurs » (39, 49, 59) sont illisibles, et Multi n'a jamais
été vendu. La clé `multi` reste en base comme legacy mappée vers `studio` par
`effectivePlan()`, exactement le traitement de `premium` → `pro`. `multi_free`
(Atout Gym) est mappé vers `studio` aussi. Le Price Stripe à 49 € est archivé
(jamais supprimé : un Price archivé garde son historique).

**Pourquoi l'asso paie moins que le studio, et pourquoi c'est tenable.** Une
asso a un budget voté, des bénévoles, des subventions ; un studio a un chiffre
d'affaires. Le risque évident : un studio qui se déclare asso pour payer 20 €
de moins. Trois garde-fous, tous déjà dans l'esprit de l'app (SIRET Luhn,
IBAN mod-97, numéro BCE belge) :
1. **Le numéro RNA** (`W` + 9 chiffres) est demandé à l'onboarding Association
   et validé par son format, comme le SIRET l'est pour la facturation. Pas de
   RNA, pas de plan Association.
2. Les deux plans ne contiennent **pas les mêmes choses** : un studio n'a que
   faire des PV d'AG, une asso n'a pas de marge par salle. Chacun a une raison
   d'être dans le bon plan.
3. Le portail public affiche « Association loi 1901 » sur le plan Association :
   un studio commercial ne voudra pas de cette mention.

**Le calcul, en ordre de grandeur.**
- Studio à 59 € : un studio de 4 intervenantes paierait 4 × 29 = 116 € s'il
  prenait quatre comptes Complet ; 59 € forfait plat, intervenantes
  illimitées, plus 1 % sur le paiement en ligne. Un studio à 4 000 € de CA
  mensuel encaissé en ligne paie donc ~99 €/mois tout compris. Les références
  du marché studio (bsport, Eversports, Fitogram) démarrent entre 100 et
  300 €/mois ou prennent 3 à 5 % du CA. 59 € est en bas de la fourchette, ce
  qui est cohérent avec le positionnement « alternative simple et française »
  et avec une équipe de deux personnes en support.
- Association à 39 € : une asso de 80 adhérents à 200 €/an gère 16 000 €/an ;
  468 €/an représente 2,9 % de son budget. Les références (AssoConnect
  30 à 70 €/mois, HelloAsso gratuit mais sans planning ni pointage) placent
  39 € dans la zone acceptable, à condition de proposer **l'annuel** : une
  asso engage sur un mandat et paie par virement après vote, elle ne « teste »
  pas en mensuel. Proposition : **390 €/an** (deux mois offerts) activé pour
  les deux nouveaux plans seulement, `prixAnnuel` dormant depuis juillet.
- LANCEMENT50 : à décider s'il s'applique aux deux nouveaux plans. Reco : oui
  sur le mensuel, non sur l'annuel (l'annuel a déjà sa remise).

**L'essai.** Aujourd'hui l'essai 30 jours donne Complet. Proposition : l'essai
donne **le plan choisi à l'onboarding** (une asso qui s'inscrit teste
Association, pas Complet) ; le concierge pose le plan à la main comme
aujourd'hui pour Multi.

---

## 3. Ce que les deux plans partagent : les intervenantes

C'est le cœur commun, et c'est ce qu'il faut construire en premier parce que
les deux plans en dépendent et que la fondation est déjà là.

### 3.1 Une intervenante peut ne jamais avoir de compte
Aujourd'hui, une membre est un compte Supabase invité par email. Dans une asso
comme dans un studio, la moitié des profs ne créeront jamais de compte : elles
donnent leur cours et repartent. Colin demande « la génération de liens pour
les différents intervenants profs » : c'est la généralisation de v100.

- Une **invitation** crée une ligne `studio_membres` dès l'envoi (c'est déjà
  le cas, statut `invite`). On y ajoute un **accès par lien permanent** :
  jeton 256 bits, sha256 seul en base (le patron de v100), révocable, qui
  ouvre `/intervenante/<jeton>` sans session Supabase : SES séances à venir,
  le pointage de chacune (même chemin que v100, même minimisation : prénom et
  nom, jamais un email, un carnet ni un montant), et son relevé de séances
  (§3.3). Rien d'autre.
- Elle peut à tout moment « créer mon compte » depuis cette page : l'email est
  celui de l'invitation, le compte se rattache à la ligne existante
  (`activerInvitationsEnAttente` fait déjà ce rattachement par email).
- Une intervenante sans compte n'a **aucune permission** au sens de la RLS :
  elle n'existe que par les routes service_role de son lien, qui re-vérifient
  `lien.membre_id` à chaque appel. C'est exactement la frontière de v100.

### 3.2 Chaque séance a une intervenante, et ça se voit
- v103 s'applique (elle est écrite). Le formulaire de cours et de série gagne
  « Qui donne cette séance ? » (la carte existe sur la fiche, à remonter à la
  création et sur les séries : `recurrences.intervenant_id` recopié sur chaque
  séance, comme `capacite_max` v109/09).
- **Le portail public nomme la prof** sur chaque carte de séance (« avec
  Léa »), propose un **filtre par intervenante**, et une **page « L'équipe »**
  (photo, bio par membre : `studio_membres.bio`, `photo_url`, nouvelles
  colonnes) ; la bio du profil devient celle de la STRUCTURE. C'est le
  « portail public revu » de la demande, et il vaut pour les deux plans.
- L'agenda prof gagne une vue « par intervenante » (colonne ou couleur), et un
  filtre « mes séances » pour une membre en portée `miens`.

### 3.3 Le suivi financier par intervenante
Un studio paie ses profs, une asso aussi (souvent des auto-entrepreneures qui
facturent l'asso à la séance). Ce que l'app peut dire sans rien inventer :
- **Le relevé de séances** : par intervenante et par mois, les séances
  données (pointées), leur durée, le nombre de présentes, le CA rattaché
  (présences décomptées de carnets ou payées à la séance, au prorata de la
  valeur de la séance). Tout est déjà en base via `cours.intervenant_id` +
  `presences` + `paiements`.
- **La rémunération convenue** (`studio_membres.remuneration`, jsonb :
  `par_seance | horaire | pourcentage_ca | forfait_mensuel`, montant) → le
  relevé calcule ce qui est dû, la prof le télécharge en PDF pour facturer la
  structure, la trésorière ou la gérante le marque « réglé » (une **dépense**,
  §5.1). On n'émet pas la facture À LA PLACE de la prof (c'est SA facture),
  on lui donne le relevé qui la rend triviale.
- Ce lot est commun aux deux plans ; la profondeur (marge par cours, par
  salle) est Studio.

---

## 4. Le plan Association : la vie de l'asso

Périmètre volontairement borné : IziSolo reste l'outil des cours, des
adhérents et de l'argent des cours. On ne devient pas AssoConnect (compta
analytique, subventions, budget prévisionnel) ; on donne au bureau ce qu'il
lui manque pour que l'asso tourne avec ses profs.

### 4.1 Le bureau : fonctions, pas un troisième système de rôles
Colin demande « président, secrétaire, trésorier ». Il ne faut PAS ajouter
ces rôles à `ROLES` : les permissions sont tenues par la RLS et les rôles y
sont déjà câblés. Proposition : une **fonction** (`studio_membres.fonction`
: `presidente | secretaire | tresoriere | membre_bureau | prof | benevole`)
qui est une étiquette, affichée sur l'équipe, les PV et les convocations, et
qui **propose un préréglage** de permissions à l'invitation :
- Présidente = tout (rôle `admin`).
- Trésorière = `argent_voir` + `argent_gerer` + `eleves_voir`.
- Secrétaire = `eleves_gerer` + `messagerie` + documents de l'asso.
- Prof = le préréglage `prof` existant.
La propriétaire du compte reste la personne qui l'a créé (souvent Maude, qui
l'installe) ; **le transfert de propriété** devient nécessaire (une asso
change de bureau tous les deux ans) : geste sur /equipe, confirmé par email
des deux côtés. Il manque aujourd'hui, et il manque aussi pour un studio.

### 4.2 L'adhésion
Une asso vend d'abord une **adhésion annuelle** (cotisation, assurance,
certificat ou QS-Sport), puis des cours. Aujourd'hui une offre est un carnet,
un abonnement ou une unité. Proposition :
- Un type d'offre **`adhesion`** : de saison (dates fixes, le glissant existe
  déjà si besoin), sans séance, avec plusieurs tarifs possibles (plein,
  réduit, famille : trois offres d'adhésion, pas une offre à variantes).
- Une règle de studio « **adhésion requise pour réserver** » (dans
  `regles_metier`, à côté de « carnet requis »), appliquée à la réservation
  portail et au pointage (bandeau « pas à jour d'adhésion », jamais un refus
  de pointer).
- Le **reçu de cotisation** = la facture v84 (elle existe, elle porte le nom
  de la structure), avec la mention « reçu de cotisation » à la place de
  « facture » quand l'offre est une adhésion. Attestation pour un CE ou une
  mutuelle : même document.
- La **liste des adhérents à jour** est une vue de /clients (filtre) et
  c'est elle qui compte le quorum (§4.4).
- Les documents d'inscription (v85) couvrent déjà le bulletin, le QS-Sport et
  le règlement intérieur.

### 4.3 Les documents de l'asso
Colin demande « l'enregistrement des statuts à jour, des comptes rendus d'AG,
etc. ». Une table `documents_structure` (Blob, même chemin que v85 :
`type` = statuts, récépissé de préfecture, règlement intérieur, assurance,
agrément, PV d'AG, autre ; `date`, `titre`, `version`), lisible par le
bureau, avec **une version courante** par type et l'historique en dessous
(des statuts modifiés en AG remplacent les précédents sans les effacer). Pas
de signature électronique (hors périmètre, comme v85).

### 4.4 L'assemblée générale
Le minimum qui rend service sans fabriquer un outil de vote :
- Une **AG** = date, lieu, ordre du jour, type (ordinaire / extraordinaire).
- La **convocation** part par le mailing existant aux adhérents à jour (délai
  légal rappelé par l'écran, souvent 15 jours selon les statuts, on ne
  l'impose pas).
- La **feuille d'émargement** imprimable (adhérents à jour, colonne
  signature, pouvoirs) et le **quorum** calculé au jour de l'AG.
- Le **PV** déposé ensuite comme document (§4.3), rattaché à l'AG.
- Le vote électronique n'entre pas dans le premier lot (conditions légales
  dans les statuts, identification, secret) ; on note le besoin.

### 4.5 L'argent de l'asso
- Recettes : ce qui existe (adhésions + cours + événements).
- **Dépenses simples** (§5.1) : rémunérations des profs, location de salle,
  assurance, matériel ; catégorie, date, montant, justificatif Blob.
- **L'export du trésorier** : recettes et dépenses de la saison (sept → juin,
  exercice de l'asso réglable) en CSV + un récapitulatif par catégorie pour le
  rapport financier de l'AG. Pas de compta en partie double.
- L'URSSAF s'éteint sur ce plan (une asso n'est pas une micro-entreprise), le
  reçu de cotisation remplace la facture acquittée, le livre des recettes
  reste utile.

---

## 5. Le plan Studio : la gestion du studio

### 5.1 Les dépenses et la marge
IziSolo ne connaît que les recettes. Une table `depenses` (date, catégorie,
montant HT/TTC, TVA éventuelle, fournisseur, justificatif, rattachement
facultatif à une intervenante, une salle ou un cours) donne :
- une page **Compta** : recettes, dépenses, résultat par mois, par salle, par
  intervenante, par type de cours ;
- la **marge par cours** : CA de la séance (présences valorisées) moins la
  rémunération de l'intervenante et le coût de la salle ;
- un **export comptable** complet pour l'expert-comptable (le CSV actuel ne
  porte que les encaissements).
Les dépenses simples (sans marge ni TVA) servent aussi l'asso ; la profondeur
analytique est Studio.

### 5.2 Les intervenantes, côté gestion
- Liste des intervenantes avec leur **suivi financier** (§3.3) : séances du
  mois, heures, CA généré, rémunération due, réglé / à régler, historique.
- **Contrat de prestation** : dates, taux, périmètre (types de cours), stocké
  comme document.
- Le relevé mensuel en PDF envoyé automatiquement à chaque intervenante le
  1er du mois (opt-in), même mécanique que la facture automatique v106.

### 5.3 Le planning par salle
Les lieux existent (illimités depuis v66) mais une séance a un lieu, pas une
salle. Un studio a deux ou trois salles au même lieu et veut voir les
conflits. `lieux` gagne des **salles** (nom, capacité) ; une séance porte sa
salle ; l'agenda détecte le **chevauchement** (même salle, même créneau) à la
création et sur les séries. Le remplissage par salle vient avec.

### 5.4 Le portail du studio
Le tronc commun (§3.2 : équipe, filtre, nom de la prof) plus : **une page par
intervenante** (`/p/<slug>/equipe/<membre>` : bio, ses cours de la semaine,
son lien de réservation), et la possibilité pour la gérante d'écrire la page
d'accueil au nom du studio (elle l'est déjà, mais les champs parlent « ta
bio », « ta photo »). Les sous-domaines (`mon-studio.izisolo.fr`, code livré,
DNS à brancher) prennent tout leur sens ici.

### 5.5 Les stats
Remplissage par cours, par intervenante, par salle, par créneau ; taux de
no-show par cours ; évolution du nombre d'élèves actives ; panier moyen.
Tout est calculable depuis `presences` + `paiements`, aucune donnée nouvelle.
On les garde pour un lot tardif : un studio achète d'abord la compta et les
intervenantes, les stats sont ce qui le retient.

---

## 6. Les transformations de l'app que ça impose

Ce sont les changements structurels, à faire une fois et proprement, avant
les features. Chacun casse quelque chose s'il est fait à moitié.

1. **`profiles.type_structure`** (`solo | association | studio`, défaut
   `solo`) choisi à l'onboarding (troisième écran, après le pays), modifiable
   dans Paramètres → Studio & lieux. Il pilote : les libellés (« ton studio »
   / « ton association »), la présence des rubriques (Bureau, AG, Documents,
   Compta), le portail (« Association loi 1901 »), l'onboarding (RNA demandé),
   et l'essai (plan d'essai = plan de la structure).
2. **Le gating devient non linéaire.** `RANG = {solo:1, pro:2, multi:3}`
   suppose une échelle. Association et Studio sont des frères, pas des
   marches : `CAPACITES` accepte une liste (`equipe: ['asso','studio']`,
   `bureau_asso: ['asso']`, `compta_studio: ['studio']`), `can()` et
   `requireCapacite` testent l'appartenance, `PlanRequis` nomme LE plan qui
   ouvre la capacité (jamais « passe en Complet » pour une feature Studio).
   Verrou `plan-guard.spec.js` étendu. C'est le changement le plus sensible :
   il touche `lib/plan-guard.js`, `lib/trial.js` (`effectivePlan`,
   `getAccountStatus` qui liste les plans payants posés à la main), le CHECK
   `profiles_plan_check` (v102 → nouvelle migration), `plan_effectif()` SQL,
   `tablePlansParPrice`, `PUBLIC_PLANS`, l'admin (statuts, MRR).
3. **La structure n'est pas une personne.** Séparer ce qui est à la STRUCTURE
   (nom, logo, bio, adresse, SIRET ou RNA, RIB, portail) de ce qui est à la
   PERSONNE connectée (prénom, avatar, notifications). `useMoi()` /
   `useStudioId()` ont déjà fait ce partage côté navigateur ; il reste les
   écrans Paramètres → Profil (qui mélange les deux) et le portail (qui montre
   l'avatar de la propriétaire comme « la prof »).
4. **Une membre sans compte** (§3.1) : `studio_membres.auth_user_id` devient
   nullable jusqu'à l'activation, plus `lien_hash`, `lien_expire_at`,
   `fonction`, `bio`, `photo_url`, `remuneration`. Une migration.
5. **Le transfert de propriété** (§4.1) et **la restriction de lecture du
   profil** pour une membre (elle lit aujourd'hui la ligne `profiles` entière,
   champs Stripe compris, reste noté depuis le lot 2) : deux dettes du
   chantier d'août qui deviennent bloquantes avec de vrais bureaux.
6. **Les dépenses** (§5.1) : première table de dépenses de l'app, RLS
   `argent_voir` / `argent_gerer`, lecture par le même helper que les
   paiements.
7. **Stripe** : deux Prices mensuels (39, 59) + deux annuels (390, 590 à
   confirmer), `setup-stripe-saas.mjs` étendu, Multi archivé, checkout et
   webhook qui reconnaissent quatre plans, Customer Portal qui autorise le
   changement entre plans de même famille seulement (une asso ne « monte »
   pas en Studio par erreur).
8. **Le downgrade avec des membres actifs** (question ouverte depuis août) :
   reco inchangée, lecture seule pour les membres + message à la propriétaire,
   jamais de révocation silencieuse. À trancher avant le lot 1.
9. **La landing** : elle reste à deux plans pour les profs seules (décision du
   6/09). Une section « Vous êtes une association ou un studio ? » avec deux
   cartes → deux pages dédiées `/associations` et `/studios` (persona
   landing, même gabarit que `/prof-yoga-*`), chacune avec son propre CTA
   concierge (« on installe ton asso »). La promesse « mode équipe » retirée
   le 23/07 revient sur ces deux pages, et seulement là, le jour où le lot 1
   est livré.
10. **Le centre d'aide** : deux nouveaux tutos (`#association`, `#studio`),
    FAQ en fin de liste, et le « ? » sur chaque nouvel écran, dans le même
    lot que chaque livraison (règle du 23/08).

---

## 7. Les lots, dans l'ordre où ils rendent service

Chaque lot = migration re-runnable qui dégrade proprement, preuve en vrai
navigateur, centre d'aide, commit, push. Les durées sont en journées de
session.

| Lot | Contenu | Plans | Ce qui le prouve |
|-----|---------|-------|------------------|
| **0. Le socle** (2 j) | `type_structure`, gating non linéaire, clés `asso` / `studio`, Multi legacy, Stripe, onboarding à trois branches, admin | tous | plan-guard spec, checkout des deux plans en test, un studio jetable par type |
| **1. Les intervenantes** (3 j) | v103 appliquée, intervenante à la création et sur les séries, membre sans compte + lien permanent, transfert de propriété, downgrade tranché, portail : nom de la prof + filtre + page Équipe | asso + studio | proof-equipe étendu, lien sans session, RLS refusée avec le jeton de l'invitée, portail anonyme |
| **2. Le relevé et les dépenses** (2 j) | rémunération par membre, relevé mensuel PDF, dépenses simples, export saison / exercice | asso + studio | relevé recalculé à la main sur un mois du démo, PDF rendu, CSV relu |
| **3. La vie de l'asso** (3 j) | fonctions du bureau et préréglages, adhésion (offre + règle + reçu), documents de la structure, AG (convocation, émargement, quorum, PV) | asso | l'asso de Maude en vrai, une AG blanche |
| **4. La gestion du studio** (3 j) | compta (marge, TVA, par salle / intervenante / cours), salles et chevauchements, contrat de prestation, relevé automatique | studio | Atout Gym ou un studio jetable, chevauchement refusé, marge recalculée |
| **5. Les vitrines** (1 j) | `/associations`, `/studios`, section landing, tutos, FAQ, page par intervenante sur le portail | tous | proof-landing étendu, Safari, mobile 390 |
| 6. Les stats (plus tard) | remplissage, no-show, panier moyen | studio | après un vrai mois d'usage |

**Le lot 1 se livre avec l'association de Maude comme première équipe réelle**
(plan `asso` posé à la main, avant même que la caisse Stripe sache l'encaisser)
: c'est là qu'on apprend si les rôles, le lien d'intervenante et le portail
multi-profs tiennent devant de vraies personnes. Le lot 3 se dessine APRÈS ce
retour, pas avant.

---

## 8. Ce que Colin tranche

1. **Multi disparaît** au profit d'Association 39 € et Studio 59 € (legacy
   mappé vers Studio, Price 49 € archivé) : oui / non.
2. **Les prix** : 39 € et 59 € mensuels confirmés ? **L'annuel** activé pour
   ces deux plans seulement (390 € et 590 €, deux mois offerts) ? LANCEMENT50
   sur le mensuel des deux ?
3. **Le RNA obligatoire** pour le plan Association (le garde-fou contre le
   studio qui se déclare asso) : oui / non.
4. **L'essai** donne le plan de la structure choisie à l'onboarding (au lieu
   de Complet pour tout le monde) : oui / non.
5. **Le bureau = des fonctions** (étiquettes + préréglages) sur les rôles
   existants, jamais un nouveau système de droits : ok ?
6. **La membre sans compte** avec lien permanent (généralisation de v100) :
   ok ? Et quelle durée par défaut du lien : la saison, révocable ?
7. **Le relevé d'intervenante** ne remplace pas la facture de la prof (on
   donne le relevé, elle facture) : ok ?
8. **Le downgrade** avec membres actifs : lecture seule + message, jamais de
   révocation silencieuse : ok ?
9. **L'ordre des lots** et le principe « l'asso de Maude entre au lot 1,
   avant les features asso » : ok ?
10. **Le vote électronique en AG** : hors périmètre au premier tour : ok ?

---

## 9. Suivi

- [ ] Décisions §8 prises (date, réponses)
- [ ] Lot 0 · socle
- [ ] Lot 1 · intervenantes (+ l'asso de Maude en vrai)
- [ ] Lot 2 · relevé et dépenses
- [ ] Lot 3 · vie de l'asso
- [ ] Lot 4 · gestion du studio
- [ ] Lot 5 · vitrines et centre d'aide
