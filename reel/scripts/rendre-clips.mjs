/* eslint-disable no-console */
// Rend les clips de la LANDING depuis les scènes du réel : un MP4 H.264 muet
// par scène retenue (écran seul, 720 × 1558, cf. src/Clip.jsx) plus son poster
// JPEG (l'image qu'on voit avant que la vidéo ne joue), dans public/videos/ du
// site. Les clips sont VERSIONNÉS (contrairement à intro/outro, tirés d'un
// rush hors repo) : la landing doit se construire après un clone sans ffmpeg.
//
// Budget : chaque clip sous 1,5 Mo, le lot sous 5 Mo — la page ne charge une
// vidéo que lorsqu'elle entre à l'écran, mais un visiteur qui lit tout la
// télécharge en entier. Le script REFUSE d'écrire un clip au-dessus du budget.
//
// Prérequis : les captures de reel/public/ (node scripts/shoot-reel-visuels.mjs
// à la racine, démo refreshé). Usage, depuis reel/ : npm run clips [id ...]
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { LARGEUR_CLIP, hauteurClip } from '../src/dimensions.js';

const ROOT = join(import.meta.dirname, '..');
const OUT = join(ROOT, '..', 'public', 'videos');
mkdirSync(OUT, { recursive: true });

// Les scènes qui deviennent des clips sur la landing (les autres restent dans le réel).
const CLIPS = process.argv.slice(2).length ? process.argv.slice(2) : ['navigation', 'portail', 'vente', 'messagerie'];
const BUDGET_CLIP = 1.5 * 1024 * 1024;
const BUDGET_LOT = 5 * 1024 * 1024;
const POSTER_FRAME = 14; // après le fondu d'entrée : le poster ressemble à ce qu'on verra

const remotion = (args) => execFileSync('npx', ['remotion', ...args], { cwd: ROOT, stdio: 'inherit', shell: true });
const Mo = (o) => (o / 1048576).toFixed(2) + ' Mo';

// Le manifest lu par le site (components/landing/ReelPhone.js) : les
// dimensions de chaque clip, fusionnées avec celles déjà écrites.
const CAPTURES = JSON.parse(readFileSync(join(ROOT, 'public', 'manifest.json'), 'utf8'));
const MANIFEST = join(OUT, 'manifest.json');
const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};
const captureDe = { navigation: 'dashboard', portail: 'portail', vente: 'vente-moyens', messagerie: 'messagerie', pointage: 'pointage', revenus: 'revenus', cours: 'cours', offre: 'offre' };

let total = 0;
for (const id of CLIPS) {
  const mp4 = join(OUT, `${id}.mp4`);
  const poster = join(OUT, `${id}-poster.jpg`);
  remotion(['render', `Clip-${id}`, mp4, '--codec', 'h264', '--crf', '28', '--muted', '--log', 'error']);
  remotion(['still', `Clip-${id}`, poster, '--frame', String(POSTER_FRAME), '--jpeg-quality', '72', '--log', 'error']);
  const taille = statSync(mp4).size;
  total += taille;
  manifest[id] = { w: LARGEUR_CLIP, h: hauteurClip(CAPTURES[captureDe[id]].h) };
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`🎬 ${id}.mp4 ${Mo(taille)} · poster ${Mo(statSync(poster).size)}`);
  if (taille > BUDGET_CLIP) { console.error(`💥 ${id}.mp4 dépasse le budget de ${Mo(BUDGET_CLIP)}`); process.exit(1); }
}
console.log(`Σ ${Mo(total)} pour ${CLIPS.length} clip(s)`);
if (total > BUDGET_LOT) { console.error(`💥 le lot dépasse ${Mo(BUDGET_LOT)}`); process.exit(1); }
