/* eslint-disable no-console */
// Rend les réels « POV » (src/pov.js) : un MP4 vertical 1080×1920 par variante,
// H.264, muet (la musique s'ajoute dans Instagram avec ses licences), dans
// reseaux/reel/pov/ HORS du dépôt, comme le réel principal. Écrit aussi la
// dernière image de chaque variante (JPEG) pour relire la mise en page sans
// ouvrir la vidéo.
//
// Usage, depuis reel/ : npm run pov [id ...]   (ids : soiree, cheques, tableur, remplacement, urssaf)
import { execFileSync } from 'node:child_process';
import { mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { DUREE_POV, VARIANTES } from '../src/pov-variantes.js';

const ROOT = join(import.meta.dirname, '..');
const OUT = join(ROOT, '..', '..', 'reseaux', 'reel', 'pov');
mkdirSync(OUT, { recursive: true });

const ids = process.argv.slice(2).length ? process.argv.slice(2) : VARIANTES.map((v) => v.id);
const inconnus = ids.filter((id) => !VARIANTES.some((v) => v.id === id));
if (inconnus.length) { console.error(`💥 variante(s) inconnue(s) : ${inconnus.join(', ')}`); process.exit(1); }

const remotion = (args) => execFileSync('npx', ['remotion', ...args], { cwd: ROOT, stdio: 'inherit', shell: true });
const Mo = (o) => (o / 1048576).toFixed(2) + ' Mo';

for (const id of ids) {
  const mp4 = join(OUT, `pov-${id}.mp4`);
  const fin = join(OUT, `pov-${id}-fin.jpg`);
  remotion(['render', `Pov-${id}`, mp4, '--codec', 'h264', '--crf', '18', '--muted', '--log', 'error']);
  remotion(['still', `Pov-${id}`, fin, '--frame', String(DUREE_POV - 1), '--jpeg-quality', '80', '--log', 'error']);
  console.log(`🎬 pov-${id}.mp4 ${Mo(statSync(mp4).size)} (${(DUREE_POV / 30).toFixed(1)} s)`);
}
console.log(`→ ${OUT}`);
