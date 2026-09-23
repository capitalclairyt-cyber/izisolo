/* eslint-disable no-console */
// Rend le réel « plan Studio » (src/Studio.jsx, src/studio-scenes.js) dans
// reseaux/reel/plan-studio/, HORS du dépôt comme les autres fichiers marketing :
//
//   plan-studio.mp4            9:16, 1080×1920 — Instagram et Facebook (réel / story),
//                              LinkedIn en vertical.
//   plan-studio-feed.mp4       4:5, 1080×1350 — le fil LinkedIn et Facebook sur ordinateur.
//   plan-studio-couverture.jpg l'image de couverture à choisir dans Instagram (le
//                              « 59 € » installé, avec « toutes tes profs comprises »).
//   plan-studio-fin.jpg        la dernière image, pour relire la carte d'appel.
//
// Prérequis : node scripts/shoot-reel-studio.mjs (depuis la racine) a pris les
// cinq captures « studio-*.jpg » et préparé les trois photos dans public/.
// Usage, depuis reel/ : npm run plan-studio [reel|feed]
import { execFileSync } from 'node:child_process';
import { mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { IMAGE_COUVERTURE } from '../src/studio-formats.js';

const ROOT = join(import.meta.dirname, '..');
const OUT = join(ROOT, '..', '..', 'reseaux', 'reel', 'plan-studio');
mkdirSync(OUT, { recursive: true });

const FORMATS = { reel: 'PlanStudio', feed: 'PlanStudio-Feed' };
const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(FORMATS);
const inconnus = ids.filter((id) => !FORMATS[id]);
if (inconnus.length) { console.error(`💥 format(s) inconnu(s) : ${inconnus.join(', ')} (attendu : reel, feed)`); process.exit(1); }

const remotion = (args) => execFileSync('npx', ['remotion', ...args], { cwd: ROOT, stdio: 'inherit', shell: true });
const Mo = (o) => (o / 1048576).toFixed(2) + ' Mo';

for (const id of ids) {
  const nom = id === 'reel' ? 'plan-studio' : `plan-studio-${id}`;
  const mp4 = join(OUT, `${nom}.mp4`);
  remotion(['render', FORMATS[id], mp4, '--codec', 'h264', '--crf', '18', '--muted', '--log', 'error']);
  console.log(`🎬 ${nom}.mp4 ${Mo(statSync(mp4).size)}`);
  if (id !== 'reel') continue;
  // ⚠️ `--frame=-1` en UN argument : séparé, « -1 » est pris pour un drapeau.
  remotion(['still', FORMATS[id], join(OUT, 'plan-studio-couverture.jpg'), `--frame=${IMAGE_COUVERTURE}`, '--jpeg-quality', '88', '--log', 'error']);
  remotion(['still', FORMATS[id], join(OUT, 'plan-studio-fin.jpg'), '--frame=-1', '--jpeg-quality', '88', '--log', 'error']);
  console.log('🖼  plan-studio-couverture.jpg · plan-studio-fin.jpg');
}
console.log(`→ ${OUT}`);
