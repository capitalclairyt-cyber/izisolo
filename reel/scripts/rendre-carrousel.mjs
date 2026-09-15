/* eslint-disable no-console */
// Rend le carrousel Instagram « Avis Google » (src/CarrouselAvis.jsx) : huit
// JPEG 1080×1350 dans reseaux/reel/carrousels/avis-<palette>/, HORS du dépôt
// comme les réels. Les pages se publient dans l'ordre des fichiers (01 à 08).
//
// Usage, depuis reel/ : npm run carrousel [-- --palette=vert|rose|bleu]
//   (bleu par défaut ; rose en second choix ; le vert existe mais le feed en a déjà, décision Colin 2026-09-15).
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, statSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { NB_SLIDES, PALETTES, PALETTE_DEFAUT } from '../src/carrousel-palettes.js';

const ROOT = join(import.meta.dirname, '..');
const palette = (process.argv.find((a) => a.startsWith('--palette=')) || `--palette=${PALETTE_DEFAUT}`).slice('--palette='.length);
if (!PALETTES[palette]) { console.error(`💥 palette inconnue : ${palette} (vert, rose, bleu)`); process.exit(1); }
const OUT = join(ROOT, '..', '..', 'reseaux', 'reel', 'carrousels', `avis-${palette}`);
mkdirSync(OUT, { recursive: true });

const remotion = (args) => execFileSync('npx', ['remotion', ...args], { cwd: ROOT, stdio: 'inherit', shell: true });
const Ko = (o) => Math.round(o / 1024) + ' Ko';

for (let slide = 1; slide <= NB_SLIDES; slide++) {
  // Les props passent par un FICHIER : un JSON en ligne de commande se fait
  // manger ses guillemets par le shell Windows.
  const props = join(tmpdir(), `carrousel-avis-${slide}.json`);
  writeFileSync(props, JSON.stringify({ slide, palette }));
  const jpg = join(OUT, `${String(slide).padStart(2, '0')}.jpg`);
  remotion(['still', 'CarrouselAvis', jpg, `--props=${props}`, '--jpeg-quality', '92', '--log', 'error']);
  rmSync(props, { force: true });
  console.log(`🖼  ${String(slide).padStart(2, '0')}.jpg ${Ko(statSync(jpg).size)}`);
}
console.log(`→ ${OUT}`);
