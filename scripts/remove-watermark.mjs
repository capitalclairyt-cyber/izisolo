/**
 * scripts/remove-watermark.mjs
 * ────────────────────────────────────────────────────────────
 * Enlève le watermark Gemini ✦ en bas à droite des photos hero.
 * Stratégie : extraire un patch de la zone parquet/tatami à gauche
 * du watermark, le coller en overlay par-dessus le watermark.
 * Plus discret qu'un crop pur (préserve les dimensions).
 * ────────────────────────────────────────────────────────────
 */

import sharp from 'sharp';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

async function clean(filename) {
  const inPath = resolve(ROOT, 'public', 'icons', filename);
  const outPath = resolve(ROOT, 'public', 'icons', filename); // overwrite

  const meta = await sharp(inPath).metadata();
  const W = meta.width;
  const H = meta.height;
  console.log(`📐 ${filename} : ${W}×${H}`);

  // Le watermark Gemini ✦ occupe environ les 90×90 derniers pixels du
  // coin bas-droite. On extrait un patch de la zone juste à GAUCHE du
  // watermark (parquet/tatami sans détail), puis on le compose dessus.
  const PATCH_W = 110;
  const PATCH_H = 110;
  const PATCH_X = W - PATCH_W - 100;       // zone neutre à gauche du watermark
  const PATCH_Y = H - PATCH_H - 30;        // un peu au-dessus du watermark
  const TARGET_X = W - PATCH_W;            // bottom-right
  const TARGET_Y = H - PATCH_H;

  // Extraire le patch source
  const patch = await sharp(inPath)
    .extract({ left: PATCH_X, top: PATCH_Y, width: PATCH_W, height: PATCH_H })
    .blur(2)                                // léger blur pour cacher la jointure
    .toBuffer();

  // Composer le patch sur l'image originale, en bas à droite
  const cleaned = await sharp(inPath)
    .composite([{ input: patch, left: TARGET_X, top: TARGET_Y }])
    .png({ quality: 90, compressionLevel: 9 })
    .toBuffer();

  // Sauvegarder en écrasant l'original
  // (l'original est encore dans Downloads si besoin de revenir en arrière)
  await sharp(cleaned).toFile(outPath);
  console.log(`✅ ${filename} : watermark masqué → ${outPath}`);
}

(async () => {
  const targets = [
    'hero-studio.png',
    'hero-cocoon.png',
    'hero-portrait.png',
    'hero-closeup-mains.png',
    'hero-closeup-table.png',
  ];
  for (const f of targets) {
    try {
      await clean(f);
    } catch (e) {
      console.error(`⚠ ${f} : ${e.message}`);
    }
  }
})();
