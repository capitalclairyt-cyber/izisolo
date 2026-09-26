/* eslint-disable no-console */
// Rend les réels « conversation » (src/conversation-variantes.js, src/Conversation.jsx) :
// un MP4 vertical 1080×1920 H.264 muet par variante, dans reseaux/reel/conversation/
// HORS du dépôt (comme les POV), plus deux images JPEG par variante : la dernière
// bulle (la fin de la conversation, avant la carte) et la dernière image (la
// carte de fin), pour relire la mise en page sans ouvrir la vidéo.
//
// Usage, depuis reel/ : npm run conv [id ...]   (ids : dimanche, cheques, soiree, remplacante, urssaf)
import { execFileSync } from 'node:child_process';
import { mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { VARIANTES, chrono } from '../src/conversation-variantes.js';

const ROOT = join(import.meta.dirname, '..');
const OUT = join(ROOT, '..', '..', 'reseaux', 'reel', 'conversation');
mkdirSync(OUT, { recursive: true });

const ids = process.argv.slice(2).length ? process.argv.slice(2) : VARIANTES.map((v) => v.id);
const inconnus = ids.filter((id) => !VARIANTES.some((v) => v.id === id));
if (inconnus.length) { console.error(`💥 variante(s) inconnue(s) : ${inconnus.join(', ')}`); process.exit(1); }

const remotion = (args) => execFileSync('npx', ['remotion', ...args], { cwd: ROOT, stdio: 'inherit', shell: true });
const Mo = (o) => (o / 1048576).toFixed(2) + ' Mo';

for (const id of ids) {
  const v = VARIANTES.find((x) => x.id === id);
  const c = chrono(v);
  const mp4 = join(OUT, `conv-${id}.mp4`);
  remotion(['render', `Conv-${id}`, mp4, '--codec', 'h264', '--crf', '18', '--muted', '--log', 'error']);
  // ⚠️ `--frame=N` en UN argument (un « -1 » séparé est lu comme un drapeau).
  remotion(['still', `Conv-${id}`, join(OUT, `conv-${id}-bulles.jpg`), `--frame=${c.cta - 4}`, '--jpeg-quality', '80', '--log', 'error']);
  remotion(['still', `Conv-${id}`, join(OUT, `conv-${id}-fin.jpg`), `--frame=${c.duree - 1}`, '--jpeg-quality', '80', '--log', 'error']);
  console.log(`🎬 conv-${id}.mp4 ${Mo(statSync(mp4).size)} (${(c.duree / 30).toFixed(1)} s)`);
}
console.log(`→ ${OUT}`);
