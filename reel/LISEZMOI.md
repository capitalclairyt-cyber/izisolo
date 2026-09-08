# Le réel IziSolo (Remotion)

Une vidéo verticale 1080×1920, 30 i/s, ~26 s, tout mobile : intro (logo + « Moins de soucis.
Plus de tapis. »), cinq écrans RÉELS du démo Atelier Soleil dans un téléphone, annotés par des
flèches animées, puis l'appel à l'essai 30 jours.

1. **Navigation** : l'accueil, un doigt appuie sur le menu, il se déplie, le doigt choisit
   « Agenda », la page arrive. Deux points forts.
2. **Pointage** d'une séance passée.
3. **Page publique côté élève** : la vitrine (couverture, avatar, nom), puis la capture DÉFILE
   dans le téléphone jusqu'au planning et à « Places disponibles ».
4. **Revenus** sur trois mois, mobile.
5. **Messagerie**, le canal « Yoga Pleine Lune ».

## Ce qu'il faut savoir

- **Les captures sont dans `public/`**, prises par `node scripts/shoot-reel-visuels.mjs`
  (racine du repo) contre le démo en prod, avec `manifest.json` (dimensions + repères du doigt :
  où sont le burger et l'entrée « Agenda »). Prérequis : `node scripts/refresh-demo-atelier-soleil.mjs`
  (sinon le démo a vécu et les cibles se décalent, constaté le 2026-09-08) et, une fois pour
  toutes, `node scripts/habiller-demo-portail.mjs` (couverture, avatar, photos par type, tons,
  onglet À propos : le refresh préserve le profil).
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

Repères de temps (image 30 i/s) : intro 0–78, navigation 64, pointage 215, page publique 313,
revenus 479, messagerie 577, outro 675. Les fondus durent 14 images.
