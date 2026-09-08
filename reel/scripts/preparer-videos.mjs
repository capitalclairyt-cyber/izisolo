/* eslint-disable no-console */
// Prépare les deux plans vidéo du réel à partir des rushs déposés par Colin dans
// reseaux/ressources/ (hors repo), HEVC → H.264, sans son (la musique s'ajoute
// dans Instagram), 1080×1920, 30 i/s. Les fichiers produits vivent dans public/
// mais sont IGNORÉS par git (vidéo).
//   intro : rush 2 (Maude parle à la caméra), 19,8 → 22,3 s : elle finit sa phrase
//           et SOURIT, main posée sur le tapis : c'est ce sourire qui se fige sous le titre ;
//   outro : rush 1, 4,6 → 6,4 s : elle regarde la caméra puis se tourne vers le chien.
// ⚠️ Les 3 premières secondes du rush 1 ne servent PAS : Maude y caresse le chien
// et redoutait les commentaires (retour du 2026-09-08).
// Usage : node scripts/preparer-videos.mjs
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const RESSOURCES = join(ROOT, '..', '..', 'reseaux', 'ressources');
const RUSHS = {
  1: join(RESSOURCES, 'PXL_20260906_135607007.TS.mp4'),
  2: join(RESSOURCES, 'PXL_20260906_135653366.TS.mp4'),
};
for (const r of Object.values(RUSHS)) if (!existsSync(r)) { console.error('Rush introuvable :', r); process.exit(1); }
mkdirSync(join(ROOT, 'public'), { recursive: true });

const ffmpeg = (args) => execFileSync('npx', ['remotion', 'ffmpeg', '-y', '-loglevel', 'error', ...args], { cwd: ROOT, stdio: 'inherit', shell: true });
const PLANS = [
  { nom: 'intro', rush: 2, debut: 19.8, duree: 2.5 },
  { nom: 'outro', rush: 1, debut: 4.6, duree: 1.8 },
];
for (const p of PLANS) {
  const sortie = join('public', `${p.nom}.mp4`);
  ffmpeg(['-ss', String(p.debut), '-t', String(p.duree), '-i', RUSHS[p.rush], '-an', '-vf', 'scale=1080:1920', '-r', '30',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', sortie]);
  // La dernière image, pour tenir le plan figé sous le texte une fois le clip fini.
  ffmpeg(['-ss', String(p.debut + p.duree - 0.05), '-i', RUSHS[p.rush], '-frames:v', '1', '-vf', 'scale=1080:1920', '-q:v', '2', join('public', `${p.nom}-fin.jpg`)]);
  console.log(`🎬 ${p.nom}.mp4 (${p.debut} → ${p.debut + p.duree} s) + ${p.nom}-fin.jpg`);
}
