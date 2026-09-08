# Le réel IziSolo (Remotion)

Une vidéo verticale 1080×1920, 30 i/s, ~38 s, tout mobile : intro (logo + « Moins de soucis.
Plus de tapis. »), huit écrans RÉELS du démo Atelier Soleil dans un téléphone, annotés par des
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

## Commandes (depuis `reel/`)

```bash
npm install
npm run studio          # aperçu interactif dans le navigateur
npm run render          # → ../../reseaux/reel/izisolo-reel.mp4 (hors repo, fichier marketing)
npm run still -- out/f307.png --frame=307   # une image précise, pour vérifier une scène
```

Repères de temps (image 30 i/s) : intro 0–78, navigation 64, cours 200, offre 336, page publique 472,
pointage 628, encaisser 714, revenus 850, messagerie 936, outro 1022. Les fondus durent 14 images.
