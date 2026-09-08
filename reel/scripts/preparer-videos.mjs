/* eslint-disable no-console */
// Prépare les deux plans vidéo du réel à partir du rush déposé par Colin dans
// reseaux/ressources/ (hors repo) : le début (0 → 2,5 s) sous l'accroche et le
// titre, la suite (2,5 → 6,4 s, la fin est coupée) sous l'outro. HEVC → H.264,
// sans son (la musique s'ajoute dans Instagram), 1080×1920, 30 i/s. Les
// fichiers produits vivent dans public/ mais sont IGNORÉS par git (vidéo).
// Usage : node scripts/preparer-videos.mjs [chemin du rush]
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const RUSH = resolve(process.argv[2] || join(ROOT, '..', '..', 'reseaux', 'ressources', 'PXL_20260906_135607007.TS.mp4'));
if (!existsSync(RUSH)) { console.error('Rush introuvable :', RUSH); process.exit(1); }
mkdirSync(join(ROOT, 'public'), { recursive: true });

const ffmpeg = (args) => execFileSync('npx', ['remotion', 'ffmpeg', '-y', '-loglevel', 'error', ...args], { cwd: ROOT, stdio: 'inherit', shell: true });
const PLANS = [
  { nom: 'intro', debut: 0, duree: 2.5 },
  { nom: 'outro', debut: 2.5, duree: 3.9 },
];
for (const p of PLANS) {
  const sortie = join('public', `${p.nom}.mp4`);
  ffmpeg(['-ss', String(p.debut), '-t', String(p.duree), '-i', RUSH, '-an', '-vf', 'scale=1080:1920', '-r', '30',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', sortie]);
  // La dernière image, pour tenir le plan figé sous le texte une fois le clip fini.
  ffmpeg(['-ss', String(p.debut + p.duree - 0.05), '-i', RUSH, '-frames:v', '1', '-vf', 'scale=1080:1920', '-q:v', '2', join('public', `${p.nom}-fin.jpg`)]);
  console.log(`🎬 ${p.nom}.mp4 (${p.debut} → ${p.debut + p.duree} s) + ${p.nom}-fin.jpg`);
}
