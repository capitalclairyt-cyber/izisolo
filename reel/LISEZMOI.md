# Le réel IziSolo (Remotion)

Une vidéo verticale 1080×1920, 30 i/s, ~41 s, tout mobile : intro (le rush de Maude au studio,
l'accroche « Prof de yoga, pilates ou danse ? », puis le logo et « Moins de soucis. Plus de tapis. »), huit écrans RÉELS du démo Atelier Soleil dans un téléphone, annotés par des
flèches animées et des cartes de couleur vive (terracotta, sauge), puis l'appel à l'essai 30 jours.
L'ordre suit la journée d'une prof :

1. **Navigation** : l'accueil, un doigt appuie sur le menu, il se déplie, un second doigt choisit
   « Agenda », la page arrive.
2. **Créer un cours** : le formulaire rempli en série hebdomadaire, qui défile jusqu'à l'aperçu
   « 12 cours seront créés ».
3. **Créer une offre** : le formulaire rempli (carnet de 10, 6 mois, Mat + Reformer, 140 €).
4. **Page publique côté élève** : la vitrine (couverture, avatar, nom), puis la capture DÉFILE
   jusqu'au planning et à « Places disponibles ».
5. **Pointage** d'une séance passée.
6. **Encaisser** : « Plusieurs moyens » (70 € espèces + 70 € CB), puis le doigt bascule sur
   « En plusieurs fois » (3 versements arrondis, le premier réglé).
7. **Revenus** sur trois mois.
8. **Messagerie**, le canal « Yoga Pleine Lune ».

## Ce qu'il faut savoir

- **Les captures sont dans `public/`**, prises par `node scripts/shoot-reel-visuels.mjs`
  (racine du repo) contre le démo en prod, avec `manifest.json` (dimensions + repères du doigt :
  où sont le burger et l'entrée « Agenda »). Prérequis : `node scripts/refresh-demo-atelier-soleil.mjs`
  (sinon le démo a vécu et les cibles se décalent, constaté le 2026-09-08) et, une fois pour
  toutes, `node scripts/habiller-demo-portail.mjs` (couverture, avatar, photos par type, tons,
  onglet À propos : le refresh préserve le profil).
- **Le rush de Colin (Maude au studio) ouvre et ferme le réel** : `npm run videos` le prépare depuis
  `reseaux/ressources/` (hors repo) en deux plans H.264 sans son, 0 → 2,5 s sous l'accroche « Prof de yoga,
  pilates ou danse ? » et le titre, 2,5 → 6,4 s sous l'outro (la fin est coupée). Les fichiers produits
  (`public/intro.mp4`, `public/outro.mp4` et leurs dernières images) sont ignorés par git : à refaire
  après un clone, avant le rendu.
- **Le tunnel de vente et les deux formulaires sont REMPLIS mais jamais validés** par le script de
  capture : rien n'est écrit dans le démo (ni vente, ni offre, ni cours).
- **Les flèches visent des pixels de la capture** (`src/scenes.js`, champ `cible`, en px de
  l'image de 720 de large). Si une capture est refaite et que l'écran a bougé, ce sont ces
  coordonnées qu'il faut revoir, rien d'autre.
- **Charte** : palette sable, cuivre `#b9794d`, Fraunces + Inter (Google Fonts, réseau requis au
  rendu), la goutte de `components/landing/Brand.js`. Mêmes hex que `scripts/shoot-facebook-visuels.mjs`.
- **Zones sûres Instagram** : rien d'essentiel au-dessus de 200 px ni en dessous de 1650 px ; les
  cartes s'arrêtent à 1020 px à droite pour ne pas passer sous les icônes.
- **Licence** : Remotion est gratuit pour les particuliers et les structures de 3 personnes ou moins.
- Le paquet est INDÉPENDANT du site (son propre `package.json`, `reel/` est exclu des builds Vercel).

## Les clips de la landing (2026-09-09)

La landing v4 réutilise les scènes du réel sous forme de **clips « écran seul »** :
`src/Clip.jsx` rend une scène sans cadre, sans titre ni carte (la page fournit les
siens), mais avec le doigt, les écrans qui s'enchaînent, le défilement et un
**anneau qui pulse** là où le réel fléchait. Chaque scène a sa composition
`Clip-<id>` (720 de large, 1558 de haut ou la hauteur de la capture si elle est
plus courte, cf. `src/dimensions.js`), avec un fondu vers le sable au début et à
la fin pour que la boucle ne claque pas.

`npm run clips` (`scripts/rendre-clips.mjs`) rend les quatre clips retenus
(navigation, portail, vente, messagerie) en H.264 muet CRF 28 dans
`../public/videos/` du site, avec un poster JPEG (image 14, après le fondu) et un
`manifest.json` de dimensions lu par `components/landing/ReelPhone.js`. Budget
tenu par le script : 1,5 Mo par clip, 5 Mo le lot (mesuré : 1,4 Mo pour les
quatre). Ces fichiers sont VERSIONNÉS, contrairement à intro/outro. Ils se
refont avec les captures, donc quand l'UI d'un écran montré change.

## Commandes (depuis `reel/`)

```bash
npm install
npm run studio          # aperçu interactif dans le navigateur
npm run videos          # prépare intro.mp4 / outro.mp4 depuis le rush (une fois, hors repo)
npm run render          # → ../../reseaux/reel/izisolo-reel.mp4 (hors repo, fichier marketing)
npm run clips           # → ../public/videos/<id>.mp4 + poster + manifest (les clips de la landing, versionnés)
npm run still -- out/f307.png --frame=307   # une image précise, pour vérifier une scène
```

Repères de temps (image 30 i/s) : intro 0–159 (titre à 75), navigation 145, cours 281, offre 417, page
publique 553, pointage 709, encaisser 795, revenus 931, messagerie 1017, outro 1103. Fondus de 14 images.

## Les réels « POV » en texte pur (2026-09-10)

Cinq réels de 13 secondes sans aucune capture : une situation (« Il est 23 h. »),
trois messages ou notes qu'une prof reconnaît, une question en terracotta, et UN seul
geste demandé, **« Commente STUDIO »** (le commentaire ouvre un DM, que Maude honore à
la main avec le message concierge). Ils répondent au constat du 10 septembre : deux
réels de démo sponsorisés (130 €, 18 000 vues) ont fait 14 j'aime et zéro message,
parce que des écrans d'appli n'arrêtent pas le pouce d'une inconnue.

- Textes et chronologie dans `src/pov-variantes.js` (⚠️ le fichier ne s'appelle pas
  `pov.js` : sur un disque insensible à la casse, `./pov` et `./Pov` se confondent et
  le composant arrive `undefined`) ; le composant dans `src/Pov.jsx` ; une composition
  `Pov-<id>` par variante (soiree, cheques, tableur, remplacement, urssaf).
- `npm run pov [id ...]` (`scripts/rendre-pov.mjs`) rend les MP4 (H.264, CRF 18, muets)
  et la dernière image de chacun dans `../../reseaux/reel/pov/`, HORS repo comme le réel.
- Règles d'écriture : tutoiement, aucun chiffre non mesuré, aucun concurrent, des
  prénoms d'exemple seulement, et rien que le produit ne fasse pas. Espace fine
  insécable avant « ? » (`fr()` dans Pov.jsx) : un signe ne commence jamais une ligne.
- Zones sûres : le texte vit entre 300 et 1260 px, l’appel entre 1340 et 1660 ; le logo
  en bas est décoratif. Rien d'essentiel sous la barre de légende d'Instagram.

## Les formats « déclencheurs » (2026-09-10, suite des POV)

Quatre formats de plus, tous terminés par la même carte de fin « Commente STUDIO »
(`src/composants/AppelStudio.jsx`, partagée) et le même anneau qui pulse sur le point
visé (`src/composants/Repere.jsx`, en coordonnées de composition). Réglages dans
`src/formats.js` ; `npm run formats [id ...]` (`scripts/rendre-formats.mjs`) rend les MP4
et la dernière image de chacun dans `../../reseaux/reel/formats/`, hors repo.

- **Split** (`src/Split.jsx`, 16,7 s) : en haut la messagerie de 23 h, trois messages qui
  arrivent ; en bas le téléphone qui y répond, écran après écran (places restantes,
  échéancier, annonce), une carte par réponse. Le troisième message parle de la pleine
  lune parce que la capture de messagerie du démo montre exactement cette annonce.
- **ReponseDM** (`src/ReponseDM.jsx`, 21,3 s) : la vraie question d'une prof reçue en DM le
  9 septembre, anonymisée (« Ok, c'est quoi les fonctions ? Tu attises ma curiosité 🤣 »),
  puis huit écrans, un mot chacun, deux secondes chacun, avec un compteur à points.
- **Rentree** (`src/Rentree.jsx`, 17,7 s) : l'agenda de la semaine se remplit séance par
  séance (chaque pastille est un morceau de la VRAIE capture, masqué puis révélé, zones
  relevées sur `public/agenda.jpg`), puis les revenus et le bloc URSSAF. Rien n'est
  dessiné à la main.
- **Fonction-<scène>** (`src/Fonction.jsx`, 7 à 9 s) : une scène du réel principal, seule,
  avec ses flèches et ses cartes, puis la carte de fin. Huit réels à partir de ce qui existe
  (navigation, cours, offre, portail, pointage, vente, revenus, messagerie) : à cette taille
  de compte, la cadence compte plus que le montage.

⚠️ Les repères visent des pixels de capture, comme dans `scenes.js` : si une capture est
refaite, revoir les `cible` de `src/formats.js`. Trois ont été recalées sur les images
fixes avant le rendu (l'annonce de la messagerie, la ligne « CB » du tunnel, le montant
des revenus) : la première position d'un anneau se vérifie toujours sur une image, jamais
dans le code.


## Le réel « Freemium » (2026-09-14)

`src/Freemium.jsx` + le bloc `FREEMIUM` de `src/formats.js` (1080×1920, 26,3 s,
composition **Freemium**, `npm run formats freemium` → `../../reseaux/reel/formats/freemium.mp4`).
Demande Colin : « une jolie vidéo pour attirer pour le freemium ». Quatre actes, dans
l'écriture des POV : (1) « POV : c'est dimanche soir. Ton cahier. Ton Excel. », deux notes
griffonnées (Julie, Marc, prénoms d'exemple), puis « Ils peuvent prendre leur retraite. » ;
(2) tout s'efface, un **« 0 € »** sauge plein écran, « IziSolo est gratuit. Pour toujours. »,
« Sans carte. Sans date de fin. Sans limite d'élèves. » ; le chiffre file vers le haut et
devient la pastille accrochée au téléphone ; (3) **six écrans RÉELS** du démo, un mot chacun
(élèves, agenda, pointage, carnets, encaissements, URSSAF), 1,4 s chacun, l'anneau sur le
point visé, la pastille « 0 € » qui ne quitte pas le téléphone ; (4) la frontière dite sans
détour, « Le seul truc payant ? Quand tes élèves réservent et paient elles-mêmes en ligne.
30 jours de Complet pour voir, puis tu choisis. Rien ne se bloque. », avec le portail public
et ses « Places disponibles » ; puis la carte de fin commune, titrée « Gratuit, sans carte,
pour toujours. ». La deuxième ligne de la carte de fin (et des POV) passe de « 30 jours
gratuits, sans carte » à « Gratuit, sans carte, pour toujours » : l'ancienne sous-vendait,
et refabriquait la surprise de la fin d'essai. ⚠️ Attrapé sur les images fixes, pas dans le
code : le « 0 € » qui part laissait un fantôme à 0,2 % d'opacité au-dessus du téléphone ;
un acte qui a fini de sortir ne rend plus rien. Légendes et ordre de publication : guide
admin `freemium-lancement-2026-09.md`.

## Le réel « Avis Google » (2026-09-14)

`src/Avis.jsx` + le bloc `AVIS` de `src/formats.js` (1080×1920, 29 s, composition **Avis**,
`npm run formats avis` → `../../reseaux/reel/formats/avis.mp4`, plus `avis-fin.jpg` et
la **couverture** `avis-couverture.jpg`, l'image 120, rendue à part pour Instagram).
Demande Colin : « un joli réel animé qui montre la nouvelle feature d'avis Google, avec une
belle couverture accrocheuse ». Quatre actes : (1) la couverture, **cinq étoiles or qui
tombent une à une** avec un rebond et une onde, puis « Tes élèves t'adorent. » et, en
terracotta, « Google ne le sait pas. », pastille « Nouveau dans IziSolo » ; (2) « Un seul
réglage » : la carte **Mes avis Google** du démo dans le téléphone, l'anneau sur le champ
du lien puis sur l'interrupteur, une carte de couleur par repère ; (3) « Ensuite, tout se
fait tout seul » : trois portes de 2,8 s (le bouton **« Laisser un avis Google »** dans
l'espace élève, l'**email** rendu comme une carte de messagerie avec le VRAI texte de
`lib/avis-google.js`, et l'**affichette A4** « Un mot sur ton cours ? » posée de travers) ;
(4) « Comme Google le demande » : trois cartes (une seule fois par élève, jamais plus de
5 par jour, jamais rien en échange) ; puis la carte de fin commune, titrée « Tes avis
Google, sans y penser. ».

Captures dédiées (`avis-carte.jpg`, `avis-espace.jpg`, `avis-affiche.jpg` + repères
`avisLien`, `avisAuto`, `avisBouton` dans `manifest.json`) :
`node scripts/shoot-reel-visuels.mjs --seulement=avis-carte,avis-espace,avis-affiche`.
⚠️ Prérequis : un lien d'avis posé sur le profil du démo (`profiles.avis_google`, posé le
14/09 : `https://g.page/r/atelier-soleil/review`, le refresh préserve le profil), et l'aperçu
« comme une élève » (`/espace?demo=1`) qui porte le bloc d'avis (commit du même jour).
Deux pièges attrapés sur les images fixes : l'anneau visait le MILIEU du bouton (donc le
mot « email », le libellé d'un interrupteur fait partie du bouton) → on vise l'icône ; et le
téléphone posé à 720 comme dans Freemium laissait 250 px de vide sous un titre de deux
lignes → 560. `SHOOT_BASE=http://localhost:3334` permet de capturer sur un serveur local
quand la prod n'a pas encore l'écran (le badge « N Issues » du dev est masqué).

## Le carrousel Instagram « Avis Google » (2026-09-15)

`src/CarrouselAvis.jsx` + `src/carrousel-palettes.js` (dimensions, palettes, en .js PUR
parce que le script de rendu Node les lit aussi), composition **CarrouselAvis** (1080×1350,
une image, `--props={ slide, palette }`), `npm run carrousel [-- --palette=bleu|rose|vert]`
→ `../../reseaux/reel/carrousels/avis-<palette>/01..08.jpg` (hors repo). Demande Colin :
« un joli carrousel Instagram pour les avis Google, on sort de la couleur sable », puis
« pas vert, il y en a déjà sur le feed » : **bleu nuit par défaut**, rose en second choix,
le vert reste rendable mais écarté. Les cartes gardent le crème du sable et les étoiles sont
or, pour que la marque reste reconnaissable sur un fond qui tranche.

Huit pages, dans l'ordre du réel : (1) couverture, cinq étoiles or, « Tes élèves
t'adorent. » puis « Google ne le sait pas. » en or, pastille « Nouveau dans IziSolo »,
« Fais défiler → » ; (2) le constat en trois lignes ; (3) « Un seul réglage » : la carte
Mes avis Google du démo (`avis-carte.jpg`) dans un téléphone, un **cadre or** autour du champ
du lien ; (4) le bouton « Laisser un avis Google » dans l'espace élève (`avis-espace.jpg`,
défilée jusqu'au repère `avisBouton`), cadre or autour du bouton ; (5) l'email avec le VRAI
texte de `lib/avis-google.js` (via `AVIS.portes` de `formats.js`) rendu comme une carte
de messagerie ; (6) l'affichette A4 (`avis-affiche.jpg`) posée de travers, entière ;
(7) les trois règles de Google (`AVIS.regles`) en lignes cochées ; (8) la carte de fin,
« Tes avis Google, sans y penser. », pastille « Commente STUDIO », et la frontière dite
en une phrase (la demande d'avis est dans Complet, le reste est gratuit pour toujours).
Pied de chaque page : la goutte IziSolo et « n / 8 ».

Trois défauts attrapés sur les JPEG, pas dans le code : l'anneau du réel, posé sur une image
fixe, **cachait le texte** qu'il désignait (le champ du lien, le libellé du bouton) → un
`cadre` rectangulaire (`[x1, y1, x2, y2]` en pixels de capture, tracé en or autour de
l'élément, jamais dessus) ; le téléphone à 720 px de haut mordait sur le pied → 640 ;
l'affichette recadrée par `objectFit` coupait « Avis Google » et « propulsé par
izisolo.fr » → image entière à 520 de large. ⚠️ Deux pièges de script : Node ne peut pas
importer un `.jsx` (`ERR_UNKNOWN_FILE_EXTENSION`), donc tout ce que le script partage avec le
composant vit dans un `.js` pur ; et un `export { X } from` ne LIE pas `X` dans le module qui
le réexporte (`LARGEUR_CARROUSEL is not defined` sur la page 6), il faut aussi l'importer.
Légende et ordre de publication : guide admin `legendes-avis-google.md`, bloc 2.

## Le réel et le clip « Changer d'outil » (2026-09-10)

`src/Migration.jsx` porte DEUX compositions sur la même scène : **Migration** (1080×1920,
~17 s, titre « On reprend ce qui se reprend. », trois cartes, carte de fin « Commente
STUDIO ») pour Instagram, et **Clip-migration** (720×1558, écran seul, boucle avec fondu)
pour le hero de `/changer-d-outil` via `ReelPhone clip="migration"`. La scène ne montre que
ce que le produit reprend aujourd'hui : un fichier `mes-eleves.csv` dont les lignes tombent
dans la liste Élèves (anneau sur « Importer »), la fiche de Léa Marchand avec son carnet
« 4/10 séances » (anneau dessus : les séances restantes), puis l'agenda de la semaine qui se
remplit (les pastilles de `RENTREE`). Aucun paiement ni présence de l'ancien outil, parce
qu'on ne les reprend pas.

Captures dédiées : `public/eleves.jpg` (liste, avec `manifest.lignesEleves`, les rectangles
des trois premières lignes) et `public/fiche.jpg` (fiche pleine page, `manifest.reperes.carnet`
= le centre du texte « N/10 séances »), prises par
`node scripts/shoot-reel-visuels.mjs --seulement=eleves,fiche` depuis le repo. Rendu :
`npm run clips migration` (→ `public/videos/migration.mp4` du site, budget 1,5 Mo, mesuré
0,47 Mo) et `npm run formats migration` (→ `reseaux/reel/formats/migration.mp4`).

⚠️ Le cache blanc d'une pastille tient jusqu'à 85 % du ressort (`Rentree.jsx` aussi) : avant,
il s'effaçait pendant que la copie grandissait encore et la séance se voyait en double.

## Le réel « 0 € » (2026-09-16)

Demande Colin : « un réel pour promouvoir le plan à 0 €, des belles couleurs (lavande,
sauge, rose), avec les mockups, pour ramener le plus d'utilisatrices possibles, à partager
sur Instagram, Facebook et LinkedIn ». C'est le deuxième réel freemium (après `Freemium`,
14/09) et il ne raconte pas la même chose : celui-là partait du cahier et du tableur du
dimanche soir, celui-ci part du **geste qu'on a fait** (on a enlevé le prix) et le dit dans
les couleurs de la palette lavande, hors du sable dont le feed est plein.

Cinq actes, 830 images (27,7 s, sous la barre des 30 s où Instagram relance le réel) :

1. **L'onglet refermé** (0 → 5,6 s) : « Tu as cherché un outil pour ton studio. / Tu as vu
   le prix. / Tu as refermé l'onglet. », puis le pivot en rose « Alors on a enlevé le prix. »
   C'est le constat qui a décidé du freemium, raconté de son point de vue à elle, sans jamais
   nommer ni viser un concurrent.
2. **Le chiffre** (5,6 → 10 s) : « LE PLAN ESSENTIEL », « 0 € » plein écran en sauge, puis
   « IziSolo est gratuit. Pour toujours. » et les trois « sans ». Le plan est NOMMÉ au-dessus
   du chiffre : une couverture se regarde sans le son et sans la suite.
3. **Six écrans réels** (10 → 19 s) : élèves, agenda, pointage, carnets, encaissements,
   URSSAF, 1,5 s chacun, un mot et un anneau par écran, et la pastille « 0 € » qui reste
   accrochée au téléphone (c'est le chiffre de l'acte 2 qui a volé jusque-là).
4. **La frontière** (19,3 → 24 s) : « Et le payant, alors ? / Quand tes élèves réservent et
   paient elles-mêmes, en ligne. », avec le portail à l'écran. Jamais « gratuit » sans dire
   où le gratuit s'arrête.
5. **L'appel** (24 → 27,7 s) : « Ouvre ton studio. C'est gratuit. », l'adresse `izisolo.fr`
   dans une pastille crème, et « ou commente STUDIO, je t'envoie le lien » : deux portes,
   parce que le réel part sur trois réseaux et que LinkedIn clique, quand Instagram commente.

- **Deux formats, une seule composition** : `Gratuit` (1080×1920) et `Gratuit-Feed`
  (1080×1350, le fil LinkedIn et Facebook sur ordinateur). Le `profil` passé en
  `defaultProps` choisit la mise en page ; les deux profils écrivent leurs positions **en
  toutes lettres** dans `src/gratuit-formats.js`, jamais un facteur d'échelle deviné.
- **Rendu** : `npm run gratuit [reel|feed]` → `reseaux/reel/gratuit/gratuit.mp4` (4,3 Mo),
  `gratuit-feed.mp4` (3,6 Mo), `gratuit-couverture.jpg` (l'image 268, à choisir comme
  couverture dans Instagram) et `gratuit-fin.jpg`. Hors dépôt, comme tous les fichiers
  marketing. Légendes prêtes à coller : guide admin `legendes-plan-gratuit.md`.
- **La palette** vit dans `src/gratuit-formats.js` (lavande nuit `#3b2a5c` → `#5b4184`, crème
  `#f7f2ea`, sauge `#8fd7ae`, rose `#f6a8bf`). Fond sombre parce qu'un écran d'appli est
  clair : les mockups s'y détachent au lieu de s'y fondre.
- **L'anneau** (`composants/Repere.jsx`) accepte désormais un rayon `r` : il ENTOURE le badge
  visé (le « 32 » des élèves, le « 4/10 séances » d'un carnet) au lieu de s'asseoir dessus.
  Le défaut 15 donne exactement l'animation d'avant, les autres réels ne bougent pas.

⚠️ **Trois pièges consignés.** (1) `ZERO.sous` portait l'image d'arrivée ET le texte : la
seconde clé écrasait la première en silence et `spring({ frame: NaN })` sortait « Frame NaN
is not finite ». Un objet de réglages ne porte jamais deux fois le même nom (`sousTexte`).
(2) Le script de rendu ne peut PAS importer `gratuit-scenes.js` : il lit
`public/manifest.json`, et un import de JSON exige une attribute en Node pur
(`ERR_IMPORT_ATTRIBUTE_MISSING`) alors que webpack l'accepte. D'où `gratuit-formats.js`,
pur, que les deux lisent (même découpage que `carrousel-palettes.js`). (3) En 4:5, le
téléphone passait SOUS les puces de progression et les avalait : le profil `feed` arrête le
téléphone au-dessus d'elles, mesuré sur la planche de contact, pas deviné.

⚠️ **Trouvé en écrivant ce réel** : `reperes.carnet` avait disparu de
`public/manifest.json` le 14/09, effacé par le tir partiel des captures « avis »
(`--seulement=avis-*` rejoue la section 1, qui REMPLAÇAIT `manifest.reperes` au lieu de le
fusionner). Conséquence : le réel **Freemium ne se rendait plus du tout** depuis ce jour-là
(`TypeError: undefined is not iterable` sur l'écran « Les carnets »). Le repère est restauré
et le script fusionne désormais.


## Le réel « plan Studio » (2026-09-23)

Demande Colin, le jour où la caisse Stripe des structures a été branchée et prouvée par
un vrai paiement (52/52) : « on attaque les studios avec une belle offre de lancement »,
« on met en avant le fait que notre plan Studio n'est pas une usine à gaz, avec uniquement
des fonctions essentielles et pensées par des profs », « des photos de notre banque dans
nos réels », et « un like et un DM pour obtenir le code promo ». Le réel boosté « 0 € »
avait ramené Romain (un studio de danse) et Aurore : c'est le message chiffré qui
convertit, pas le format, et les patrons de studio sont bien sur Instagram.

Cinq actes, 850 images (28,3 s), palette **charbon chaud** (`src/studio-formats.js` :
`#241d1b` → `#3d2f2a`, crème, cuivre `#e2a76f`, sauge `#9fd3b4`), hors du sable, hors de la
lavande du « 0 € » et du bleu nuit du carrousel :

1. **Le scroll-stop** (0 → 6 s), sur la **photo du studio Reformer aux miroirs en arche**
   (Paulina Vargas, Pexels ; `public/icons/studio-reformer-arches.jpg`, redimensionnée dans
   `public/photo-studio-reformer.jpg`) sous un voile : UNE phrase à la fois, en très gros (118 px, `tailles.hook`), visible dès
   la PREMIÈRE image, un mot en cuivre : « Tu recomptes encore les séances de tes profs ? »,
   « Tu devines quel cours te fait vivre ? », puis la réponse « Il existe un outil qui fait
   ça. Sans le reste. » Retour Colin sur la première planche : « le texte est trop petit et
   ne ressort pas assez, il faudrait un scroll stop de tueur ». Deux règles en sont sorties :
   une photo qui ouvre un réel n'a PAS de fondu depuis le noir (l'image 0 est la vignette et
   le premier défilement, elle était vide), et la première phrase est déjà posée à l'image 0
   (son ressort est pris avec dix images d'avance).
2. **Le chiffre** (6 → 10 s) : « LE PLAN STUDIO », « 59 € » plein écran, « par mois. Toutes
   tes profs comprises. », « Pas de prix par intervenante. Pas d'engagement. Pas d'usine à
   gaz. » Le « 59 € » file ensuite dans la pastille accrochée au téléphone.
3. **Cinq écrans réels** (10 → 19 s), 1,7 s chacun : l'équipe et sa rémunération convenue,
   les salles sous leur lieu, **le toast qui refuse une seconde séance dans la même salle**,
   le relevé du mois d'une prof (« Montant dû 240 € »), l'analyse (« Résultat 493 € »).
4. **Pas une usine à gaz** (19 → 23 s), sur la **photo de la salle de danse aux barres et
   miroirs** (cottonbro studio, Pexels ; `studio-danse-barres.jpg`) : « L'essentiel d'un studio. Pensé avec des profs. », ce que le
   plan fait, et ce qu'il ne fait pas (« Pas de paie, pas de partie double : ton comptable
   garde son métier. »).
5. **L'appel** (23,5 → 28 s), sur la **salle de yoga aux tapis déroulés** (Zulema Laborde,
   Pexels ; `studio-yoga-tapis.jpg`) sous un voile dense : le **portrait de Maude**
   (`maude-studio.jpg`) en médaillon,
   « Offre de lancement · Studio à moitié prix pendant trois mois. », la pastille crème
   « Envoie STUDIO en message », « 29,50 € par mois pour démarrer, puis 59 €. Jusqu'au
   31 décembre. Je t'envoie le code, et j'installe ton studio avec toi, gratuitement. »
   Le like se demande dans la légende, en une ligne, jamais comme condition : Meta déclasse
   les publications qui réclament un like.

- **Les trois photos de studio sont entrées dans la banque le 2026-09-23** (choix Colin
  sur dix candidates Pexels cherchées par un agent, aperçus seulement puis originaux
  téléchargés après son accord) : sources, auteurs et licence dans
  `public/icons/CREDITS-PHOTOS.md`. Les deux photos persona d'avant (Reformer sur mur vert,
  scène de danse) ne servent plus au réel. Aucun visage dans les trois : le lieu, pas une
  inconnue. Elles ne vont pas sur la landing (règle « zéro faux »).
- **Les captures viennent d'un studio JETABLE** : le démo Atelier Soleil est une prof
  seule, sans équipe rémunérée, sans salles, sans Compta. `node scripts/shoot-reel-studio.mjs`
  (depuis la racine, contre la prod) crée « Studio Ondine » (deux profs rémunérées, deux
  salles, douze élèves, un mois de séances pointées, trois dépenses réglées), se connecte
  avec sa session, prend les cinq captures mobile (`public/studio-*.jpg` + repères
  `studio*` fusionnés dans `manifest.json`), et PURGE tout, même en échec. Aucun email ne
  part (tout en @example.com). Le toast du refus est provoqué pour de vrai (une seconde
  séance dans la Salle Reformer à 18:00) et le script vérifie qu'il n'a rien écrit.
- **Deux formats, une composition** : `PlanStudio` (1080×1920) et `PlanStudio-Feed`
  (1080×1350). Le défilement d'un écran est écrit pour le 9:16 ; en 4:5, `defilementPour`
  remonte l'écran quand la cible sort de la fenêtre visible (le toast était coupé sur la
  planche du feed, attrapé sur l'image, pas dans le code).
- **Rendu** : `npm run plan-studio [reel|feed]` → `reseaux/reel/plan-studio/plan-studio.mp4`
  (9,4 Mo), `plan-studio-feed.mp4` (7,9 Mo), `plan-studio-couverture.jpg` (image 272),
  `plan-studio-fin.jpg`. Légendes prêtes à coller : guide admin `legendes-plan-studio.md`
  (Instagram, Facebook, LinkedIn, story, le DM qui donne le code, les objections des gérants
  dont ClassPass et Wellpass, et ce qu'on ne dit jamais).
