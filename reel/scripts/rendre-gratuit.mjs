/* eslint-disable no-console */
// Rend le réel « 0 € » (src/Gratuit.jsx, src/gratuit-scenes.js) dans
// reseaux/reel/gratuit/, HORS du dépôt comme les autres fichiers marketing :
//
//   gratuit.mp4            9:16, 1080×1920 — Instagram et Facebook (réel / story),
//                          LinkedIn en vertical.
//   gratuit-feed.mp4       4:5, 1080×1350 — le fil LinkedIn et Facebook sur ordinateur.
//   gratuit-couverture.jpg l'image de couverture à choisir dans Instagram (le
//                          « 0 € » installé, avec ses trois lignes).
//   gratuit-fin.jpg        la dernière image, pour relire la carte d'appel sans
//                          ouvrir la vidéo.
//
// Usage, depuis reel/ : npm run gratuit [reel|feed]
import { execFileSync } from 'node:child_process';
import { mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
// Les réglages PURS seulement : gratuit-scenes.js lit un JSON, que Node
// refuse d'importer sans attribute (ERR_IMPORT_ATTRIBUTE_MISSING).
import { IMAGE_COUVERTURE } from '../src/gratuit-formats.js';

const ROOT = join(import.meta.dirname, '..');
const OUT = join(ROOT, '..', '..', 'reseaux', 'reel', 'gratuit');
mkdirSync(OUT, { recursive: true });

const FORMATS = { reel: 'Gratuit', feed: 'Gratuit-Feed' };
const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(FORMATS);
const inconnus = ids.filter((id) => !FORMATS[id]);
if (inconnus.length) { console.error(`💥 format(s) inconnu(s) : ${inconnus.join(', ')} (attendu : reel, feed)`); process.exit(1); }

const remotion = (args) => execFileSync('npx', ['remotion', ...args], { cwd: ROOT, stdio: 'inherit', shell: true });
const Mo = (o) => (o / 1048576).toFixed(2) + ' Mo';

for (const id of ids) {
  const nom = id === 'reel' ? 'gratuit' : `gratuit-${id}`;
  const mp4 = join(OUT, `${nom}.mp4`);
  remotion(['render', FORMATS[id], mp4, '--codec', 'h264', '--crf', '18', '--muted', '--log', 'error']);
  console.log(`🎬 ${nom}.mp4 ${Mo(statSync(mp4).size)}`);
  if (id !== 'reel') continue;
  // ⚠️ `--frame=-1` en UN argument : séparé, « -1 » est pris pour un drapeau et
  // c'est la PREMIÈRE image qui sort (vu sur les -fin.jpg du 10/09 au matin).
  remotion(['still', FORMATS[id], join(OUT, 'gratuit-couverture.jpg'), `--frame=${IMAGE_COUVERTURE}`, '--jpeg-quality', '88', '--log', 'error']);
  remotion(['still', FORMATS[id], join(OUT, 'gratuit-fin.jpg'), '--frame=-1', '--jpeg-quality', '88', '--log', 'error']);
  console.log('🖼  gratuit-couverture.jpg · gratuit-fin.jpg');
}
console.log(`→ ${OUT}`);
