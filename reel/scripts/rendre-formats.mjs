/* eslint-disable no-console */
// Rend les formats « déclencheurs » du 2026-09-10 (src/formats.js, src/Fonction.jsx) :
// un MP4 vertical 1080×1920 H.264 muet par composition, dans reseaux/reel/formats/
// HORS du dépôt, plus la dernière image de chacun (JPEG) pour relire la mise en
// page sans ouvrir la vidéo.
//
// Usage, depuis reel/ : npm run formats [id ...]
//   ids : split, reponse-dm, rentree, fonction-<scène> (navigation, cours, offre,
//   portail, pointage, vente, revenus, messagerie). Sans argument : tout.
import { execFileSync } from 'node:child_process';
import { mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const OUT = join(ROOT, '..', '..', 'reseaux', 'reel', 'formats');
mkdirSync(OUT, { recursive: true });

const SCENES = ['navigation', 'cours', 'offre', 'portail', 'pointage', 'vente', 'revenus', 'messagerie'];
const COMPOSITIONS = { split: 'Split', 'reponse-dm': 'ReponseDM', rentree: 'Rentree', ...Object.fromEntries(SCENES.map((s) => [`fonction-${s}`, `Fonction-${s}`])) };

const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(COMPOSITIONS);
const inconnus = ids.filter((id) => !COMPOSITIONS[id]);
if (inconnus.length) { console.error(`💥 format(s) inconnu(s) : ${inconnus.join(', ')}`); process.exit(1); }

const remotion = (args) => execFileSync('npx', ['remotion', ...args], { cwd: ROOT, stdio: 'inherit', shell: true });
const Mo = (o) => (o / 1048576).toFixed(2) + ' Mo';

for (const id of ids) {
  const mp4 = join(OUT, `${id}.mp4`);
  const fin = join(OUT, `${id}-fin.jpg`);
  remotion(['render', COMPOSITIONS[id], mp4, '--codec', 'h264', '--crf', '18', '--muted', '--log', 'error']);
  // La dernière image porte la carte de fin ; l'avant-dernière seconde, le contenu : on garde les deux.
  remotion(['still', COMPOSITIONS[id], fin, '--frame', '-1', '--jpeg-quality', '80', '--log', 'error']);
  console.log(`🎬 ${id}.mp4 ${Mo(statSync(mp4).size)}`);
}
console.log(`→ ${OUT}`);
