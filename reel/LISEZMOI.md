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
