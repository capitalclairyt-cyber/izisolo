# Le réel IziSolo (Remotion)

Une vidéo verticale 1080×1920, 30 i/s, ~22 s : intro (logo + « Moins de soucis. Plus de tapis. »),
cinq écrans RÉELS du démo Atelier Soleil annotés par deux flèches animées chacun (agenda, pointage,
réservation, revenus, messagerie), puis l'appel à l'essai 30 jours.

## Ce qu'il faut savoir

- **Les captures ne vivent pas ici.** Elles sont lues dans `../public/icons/landing/` (réglage
  `setPublicDir` de `remotion.config.js`), avec leurs dimensions dans `manifest.json`. Quand un écran
  change, on relance `node scripts/shoot-landing-visuels.mjs` puis on re-rend le réel : une seule
  source de vérité pour la landing et la vidéo.
- **Les flèches visent des pixels de la capture** (`src/scenes.js`, champ `cible`). Si une capture est
  refaite et que l'écran a bougé, ce sont ces coordonnées qu'il faut revoir, rien d'autre.
- **Charte** : palette sable, cuivre `#b9794d`, Fraunces + Inter (Google Fonts, réseau requis au rendu),
  la goutte de `components/landing/Brand.js`. Mêmes hex que `scripts/shoot-facebook-visuels.mjs`.
- **Zones sûres Instagram** : rien d'essentiel au-dessus de 200 px ni en dessous de 1650 px ; les cartes
  s'arrêtent à 1020 px à droite pour ne pas passer sous les icônes.
- **Licence** : Remotion est gratuit pour les particuliers et les structures de 3 personnes ou moins.
- Le paquet est INDÉPENDANT du site (son propre `package.json`, `reel/` est exclu des builds Vercel).

## Commandes (depuis `reel/`)

```bash
npm install
npm run studio          # aperçu interactif dans le navigateur
npm run render          # → ../../reseaux/reel/izisolo-reel.mp4 (hors repo, fichier marketing)
npm run still -- out/f254.png --frame=254   # une image précise, pour vérifier une scène
```

Repères de temps (image 30 i/s) : intro 0–78, agenda 64, pointage 162, réservation 260, revenus 358,
messagerie 456, outro 554. Les fondus durent 14 images.
