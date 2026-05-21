/**
 * scripts/optimize-blog-images.mjs
 *
 * Optimise les hero/figure du blog : resize 1200px max + JPG qualité 78.
 * À lancer après avoir déposé une nouvelle photo dans /public/blog/.
 *
 * Usage : node scripts/optimize-blog-images.mjs [filename1.jpg filename2.jpg ...]
 * Sans argument : optimise tous les fichiers du dossier qui font > 500 KB.
 */
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

const BLOG_DIR = path.join(process.cwd(), 'public', 'blog');
const MAX_WIDTH = 1200;
const JPG_QUALITY = 78;
const SIZE_THRESHOLD = 500 * 1024; // 500 KB

async function optimizeOne(file) {
  const full = path.join(BLOG_DIR, file);
  const stat = await fs.stat(full);
  const sizeBefore = stat.size;

  const tmpOut = full + '.tmp';
  await sharp(full)
    .rotate() // honor EXIF orientation
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: JPG_QUALITY, progressive: true, mozjpeg: true })
    .toFile(tmpOut);

  const tmpStat = await fs.stat(tmpOut);
  await fs.rename(tmpOut, full);

  const kb = (n) => (n / 1024).toFixed(0);
  console.log(`  ${file}  ${kb(sizeBefore)} KB → ${kb(tmpStat.size)} KB  (${Math.round((1 - tmpStat.size / sizeBefore) * 100)}% gain)`);
}

async function main() {
  const argv = process.argv.slice(2);
  let files;
  if (argv.length > 0) {
    files = argv;
  } else {
    const all = await fs.readdir(BLOG_DIR);
    files = [];
    for (const f of all) {
      if (!/\.(jpe?g|png)$/i.test(f)) continue;
      const st = await fs.stat(path.join(BLOG_DIR, f));
      if (st.size > SIZE_THRESHOLD) files.push(f);
    }
  }

  console.log(`Optimizing ${files.length} image(s) in /public/blog/...`);
  for (const f of files) {
    try {
      await optimizeOne(f);
    } catch (e) {
      console.error(`  ${f}  FAILED:`, e.message);
    }
  }
  console.log('Done.');
}

main().catch(e => { console.error(e); process.exit(1); });
