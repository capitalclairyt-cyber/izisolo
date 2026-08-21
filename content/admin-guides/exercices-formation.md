---
titre: "🎓 Exercices : 5 studios à créer de zéro"
description: "Cinq fausses profs pour s'entraîner à la mise en route complète : briefs à jouer, CSV fournis, pièges volontaires et checklists de validation."
maj: 2026-08-21
---

> **Comment s'en servir** : Colin joue la prospecte (il lit le brief, répond aux
> questions, ne souffle jamais la solution), Maude construit le studio en
> partageant son écran. Les cas montent en difficulté et couvrent chacun des
> pièges différents. Faire UN cas par session, puis debrief avec la checklist.
>
> **Sécurité d'entraînement** : toutes les adresses emails des exercices sont
> en `@example.com` : l'app REFUSE d'envoyer vers ce domaine de test, donc
> invitations et emails peuvent être cliqués sans rien envoyer à personne
> (l'écran peut afficher des échecs d'envoi : c'est normal et voulu). Les
> comptes en @example.com sont aussi EXCLUS des stats admin. Créer les comptes
> profs d'entraînement avec `formation-<prenom>@example.com`.
>
> **Après l'entraînement** : demander à Claude « purge les studios de
> formation » (script `scripts/purger-studios-formation.mjs`, il liste
> d'abord, ne supprime qu'avec `--force`).

## Cas 1 : Léa, la débutante sans rien (échauffement, ~20 min)

**Le brief joué** : « Je suis prof de yoga doux à Annecy, je débute, j'ai une
douzaine d'élèves que je gère de tête et par SMS. Deux cours par semaine dans
la même salle : mardi 18h30 et jeudi 10h, une heure. Je vends un carnet de
10 séances à 120 € et la séance seule à 15 €. Je continue mes cours pendant
les vacances scolaires, mes élèves sont des mamies adorables qui viennent
toute l'année. Pas de site, pas de SIRET, on me paie en espèces ou en chèque. »

**À construire** : compte `formation-lea@example.com` (autonomie guidée : elle
« crée » son compte) · 2 cours récurrents hebdo (❗ la case « créer aussi
pendant les vacances » : c'est LE piège du cas) · offre Carnet 10 à 120 € avec
prix unitaire de référence 15 € (la remise s'affiche) · 3 fiches élèves à la
main (prénom + email @example.com suffisent) · vendre un carnet à l'une
d'elles, réglé en espèces.

**Checklist de fin** : les séances existent pendant les vacances de la
Toussaint ✓ · la remise du carnet s'affiche sur l'offre ✓ · un encaissement
espèces apparaît dans Revenus ✓ · le portail public montre le planning ✓.

## Cas 2 : Sophie, la migrante avec sa liste propre (~30 min)

**Le brief joué** : « Je fais du pilates à Lyon, j'utilise un autre logiciel
depuis deux ans et je pars. J'ai exporté ma liste d'élèves ([CSV fourni](/exercices/exercice-2-sophie-pilates.csv),
35 lignes). J'ai deux salles : Croix-Rousse et Part-Dieu. Je vends un carnet
de 5 (75 €), un carnet de 10 (140 €) et un abonnement mensuel illimité à 89 €
limité à 2 séances par semaine. Mes règles sont strictes : annulation jusqu'à
24 h avant, après c'est décompté. Et je veux que mes élèves reçoivent leur
accès direct. »

**Pièges du CSV** : deux **Marie Lambert** différentes (deux vraies personnes,
emails différents : les DEUX doivent exister à la fin) et un **doublon exact**
de Camille Martin (l'import doit le dédupliquer, 34 fiches à l'arrivée, pas 35).

**À construire** : 2 lieux · cours sur les deux salles · 3 offres (❗ l'abo :
« Illimitées » + cadence 2/semaine, PAS « Nombre fixe ») · règles d'annulation
24 h avec décompte · import CSV (vérifier l'aperçu avant de valider) ·
invitation groupée à la fin (les envois vers @example.com échoueront : normal).

**Checklist de fin** : 34 fiches (pas 35) ✓ · les deux Marie Lambert existent ✓
· l'abo affiche cadence 2/sem et illimité ✓ · le délai 24 h apparaît côté
portail sur une annulation ✓.

## Cas 3 : Chantal, le cahier papier et l'Excel qui pique (~35 min)

**Le brief joué** : « Je fais du yoga bien-être dans la Creuse, surtout des
retraitées. Ma nièce m'a fait un fichier Excel avec mes 18 élèves
([CSV fourni](/exercices/exercice-3-chantal-yoga.csv) : exporté « comme Excel
sait le faire », accents partout). J'ai besoin du questionnaire santé signé et
de mon règlement intérieur à l'inscription. J'ai un SIRET, certaines élèves
veulent des factures pour leur mutuelle. L'essai est à 12 €, mais 15 € pour un
cours individuel. Et Maïté voudrait payer son trimestre de 96 € en trois fois :
deux chèques et le reste en espèces. »

**Pièges** : le CSV est en **windows-1252** (si les Éléonore, Noëlle et José
arrivent avec des � c'est perdu : l'import doit les lire proprement, vérifier
DANS L'APERÇU avant de valider) · les **documents d'inscription** (préparer
2 PDF quelconques à uploader) · le **tarif d'essai par type** (12 € collectif,
15 € individuel) · l'**échéancier multi-modes** (2 chèques + espèces, bouton
« Arrondir aux euros » sur 96 ÷ 3).

**Checklist de fin** : 18 fiches avec accents intacts ✓ · dates de naissance
converties ✓ · SIRET posé, une facture téléchargeable sur une vente ✓ · le
formulaire d'essai propose les PDF ✓ · l'échéancier de Maïté affiche 3
versements avec leurs modes ✓.

## Cas 4 : Inès, tout en ligne (~35 min)

**Le brief joué** : « Je suis coach en méditation et breathwork, tout se passe
en visio depuis chez moi, mes élèves sont partout en France. Un cours du soir
le lundi (ouvert à toutes) et un cercle avancé le mercredi réservé à mes
abonnées. Le lien Zoom ne doit être visible que par celles qui ont payé. Je
vends un abonnement annuel de septembre à juin à 360 €, une séance par
semaine, avec pro-rata pour celles qui arrivent en cours d'année (souscription
possible jusqu'à fin mars). Pas de liste : je démarre, j'ai 3 élèves motivées.
Je veux un QR code pour mon compte Insta. »

**Pièges** : cours **en ligne** avec lien visio **verrouillé** (vérifier côté
élève que le lien n'apparaît pas sans paiement) · la **visibilité « abonnés »**
sur le cercle du mercredi (invisible pour une anonyme sur le portail) · l'abo
avec **pro-rata actif + date limite** (l'aperçu du calcul doit se lire :
« reste N semaines sur T ») · le **QR code** (préréglage « flyer » vers
l'essai) · la grille tarifaire **affichée** sur le portail (« ce qui n'est pas
visible n'existe pas »).

**Checklist de fin** : le lundi est public, le mercredi invisible pour une
visiteuse anonyme ✓ · le lien Zoom absent de la page publique du cours ✓ ·
l'aperçu pro-rata affiche semaines totales ET restantes ✓ · le QR se
télécharge ✓ · la grille tarifaire est visible sur le portail ✓.

## Cas 5 : Valérie, l'examen final en mode concierge (chrono 45 min)

**Le brief joué** : « J'ai une école de danse : classique, contemporain et
éveil pour les petits. Deux studios (Centre et Gare). 58 élèves
([CSV fourni](/exercices/exercice-5-valerie-danse.csv) : il vient de mon
ancien outil, les colonnes sont dans un drôle d'ordre et il y a une colonne
Niveau dont je ne sais pas quoi faire). L'éveil est limité à 8 enfants, il y a
toujours une file d'attente. Je fais un stage ponctuel de contemporain à 25 €
la place, mais mes abonnées annuelles peuvent utiliser leur abonnement dessus.
Les no-shows me ruinent : je veux décompter automatiquement. Et je voudrais
sonder mes élèves entre deux créneaux pour un nouveau cours ados. »

**Format CONCIERGE intégral** : Maude crée le studio depuis
`/admin/studios/nouveau` (`formation-valerie@example.com`), paramètre TOUT via
le lien de connexion (autre navigateur !), et termine par « Envoyer le lien
d'appropriation ».

**Pièges** : le CSV est en **virgules, colonnes dans le désordre**, avec une
colonne inconnue (le mapping de l'aperçu doit être corrigé à la main, la
colonne Niveau part dans les notes ou s'ignore) · les **3 types de cours** à
déclarer et les offres restreintes par type · **capacité 8 + liste d'attente**
sur l'éveil · le **stage mixte** (tarif à l'unité 25 € + case « carnets
acceptés ») · la règle **no-show = décompter** · le **sondage planning** à 2
créneaux · et le chrono.

**Checklist de fin** : 58 fiches ✓ · l'éveil affiche 8 places et la liste
d'attente s'active ✓ · le stage affiche « 25 € ou abonnement » côté élève ✓ ·
la règle no-show est active ✓ · le sondage est en ligne ✓ · Valérie a « reçu »
son lien d'appropriation (échec d'envoi @example.com attendu : vérifier
simplement le geste) ✓ · le tout en 45 minutes ✓.

---

*Progression conseillée : cas 1 et 2 la première semaine, 3 et 4 la deuxième,
le 5 en conditions réelles (chrono, Colin qui pose des questions pièges du
guide Q/R pendant qu'elle configure). Quand le cas 5 passe en 45 min sans
notes, Maude est prête pour n'importe quelle vraie prospecte.*
