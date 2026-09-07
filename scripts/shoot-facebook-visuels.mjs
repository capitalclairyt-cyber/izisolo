/**
 * Visuels de la Page Facebook IziSolo (2026-09-07) — re-runnable.
 *
 * Fabrique, aux dimensions Facebook, des images dans la charte de la landing
 * v3 (palette sable, Fraunces + Inter, le souligné cuivre de « Plus de tapis. »)
 * plutôt que de recycler l'icône PWA « IZ » rose, héritée d'une palette
 * abandonnée :
 *   • photo de profil 1024×1024 (affichée en rond) — deux variantes : la
 *     goutte seule, ou la goutte + « IziSolo » ;
 *   • couverture 1640×624 (bureau 820×312, mobile recadré en 640×360 :
 *     tout l'essentiel vit dans la bande centrale de ~1100 px) — deux
 *     variantes : avec le téléphone du hero (capture réelle du démo), ou
 *     texte seul.
 *
 * Usage : node scripts/shoot-facebook-visuels.mjs [dossier de sortie]
 * Défaut : ../reseaux/facebook (hors repo : ce sont des fichiers marketing).
 * Les polices viennent de Google Fonts (réseau requis).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const OUT = resolve(process.argv[2] || join(process.cwd(), '..', 'reseaux', 'facebook'));
mkdirSync(OUT, { recursive: true });

const P = { bgFrom: '#faf4ec', bgTo: '#f3eadd', ink: '#2c2118', inkSoft: '#7a6b5c', accent: '#b9794d', accentDeep: '#8f5a37' };
const phone = 'data:image/jpeg;base64,' + readFileSync(join(process.cwd(), 'public/icons/landing/hero-pointage.jpg')).toString('base64');

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT@9..144,300..700,0..100&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">`;

// La goutte de la nav (Brand.js, variant « drop »), en cuivre.
const goutte = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 32 32" fill="none" aria-hidden="true">
  <path d="M16 3 C9 11, 5 17, 8 23 C10 27, 14 28, 16 28 C18 28, 22 27, 24 23 C27 17, 23 11, 16 3 Z" fill="${P.accent}"/>
  <path d="M16 8 C16 14, 16 22, 16 27" stroke="#fff" stroke-opacity="0.45" stroke-width="1.4" stroke-linecap="round"/>
  <circle cx="16" cy="18" r="1.6" fill="#fff" opacity="0.7"/>
</svg>`;
// Le souligné cuivre, main levée, sous « Plus de tapis. »
const souligne = (w) => `<svg width="${w}" height="14" viewBox="0 0 ${w} 14" fill="none" aria-hidden="true" style="position:absolute;left:0;bottom:-6px">
  <path d="M2 9 Q ${w * 0.25} 2, ${w * 0.5} 8 T ${w - 2} 6" stroke="${P.accent}" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.9"/>
</svg>`;

const base = (w, h, corps) => `<!doctype html><html lang="fr"><head><meta charset="utf-8">${FONTS}
<style>
  html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden}
  body{font-family:Inter,system-ui,sans-serif;color:${P.ink};background:linear-gradient(135deg,${P.bgFrom} 0%,${P.bgTo} 100%)}
  .serif{font-family:Fraunces,Georgia,serif;font-variation-settings:"opsz" 120,"SOFT" 30;font-weight:500;letter-spacing:-0.02em}
  .accent{color:${P.accent};position:relative;display:inline-block}
</style></head><body>${corps}</body></html>`;

const VISUELS = {
  'profil-goutte': { w: 1024, h: 1024, html: base(1024, 1024, `
    <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">
      <div style="width:820px;height:820px;border-radius:50%;background:rgba(255,255,255,0.45);display:flex;align-items:center;justify-content:center">${goutte(520)}</div>
    </div>`) },
  'profil-goutte-nom': { w: 1024, h: 1024, html: base(1024, 1024, `
    <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0">
      ${goutte(400)}
      <div class="serif" style="font-size:150px;line-height:1;margin-top:-18px">IziSolo</div>
    </div>`) },
  'couverture-telephone': { w: 1640, h: 624, html: base(1640, 624, `
    <div style="position:absolute;left:300px;top:0;height:624px;width:640px;display:flex;flex-direction:column;justify-content:center">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:26px">${goutte(34)}<span class="serif" style="font-size:30px">IziSolo</span></div>
      <div class="serif" style="font-size:78px;line-height:1.02">Moins de soucis.<br><span class="accent">Plus de tapis.${souligne(470)}</span></div>
      <div style="font-size:24px;line-height:1.4;color:${P.inkSoft};margin-top:30px;max-width:560px">L’appli calme des profs de yoga, pilates et danse indépendant·es. Agenda, élèves, carnets, paiements.</div>
      <div style="font-size:19px;font-weight:600;color:${P.accentDeep};margin-top:22px;letter-spacing:0.01em">izisolo.fr · 30 jours d’essai, sans carte, sans engagement</div>
    </div>
    <div style="position:absolute;left:1010px;top:52px;width:330px;height:660px;border-radius:44px;background:#1a1512;padding:12px;box-shadow:0 30px 60px rgba(44,33,24,0.22)">
      <div style="width:100%;height:100%;border-radius:34px;overflow:hidden;background:#fff"><img src="${phone}" style="width:100%;display:block" alt=""></div>
    </div>`) },
  'couverture-texte': { w: 1640, h: 624, html: base(1640, 624, `
    <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:28px">${goutte(36)}<span class="serif" style="font-size:32px">IziSolo</span></div>
      <div class="serif" style="font-size:96px;line-height:1.02">Moins de soucis. <span class="accent">Plus de tapis.${souligne(560)}</span></div>
      <div style="font-size:26px;line-height:1.4;color:${P.inkSoft};margin-top:34px;max-width:900px">L’appli calme des profs de yoga, pilates et danse indépendant·es.</div>
      <div style="font-size:20px;font-weight:600;color:${P.accentDeep};margin-top:20px">izisolo.fr · 30 jours d’essai, sans carte, sans engagement</div>
    </div>`) },
};

let chromium; try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = await import('@playwright/test')); }
let browser; try { browser = await chromium.launch({ channel: 'msedge' }); } catch { browser = await chromium.launch(); }
try {
  for (const [nom, v] of Object.entries(VISUELS)) {
    const page = await browser.newPage({ viewport: { width: v.w, height: v.h }, deviceScaleFactor: 1 });
    await page.setContent(v.html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(600);
    const fichier = join(OUT, `${nom}.png`);
    await page.screenshot({ path: fichier, type: 'png' });
    await page.close();
    console.log(`✓ ${nom}.png (${v.w}×${v.h})`);
  }
  writeFileSync(join(OUT, 'LISEZMOI.txt'), [
    'Visuels Page Facebook IziSolo — générés par scripts/shoot-facebook-visuels.mjs',
    '',
    'Photo de profil (1024×1024, affichée en rond) : profil-goutte.png ou profil-goutte-nom.png',
    'Couverture (1640×624 ; bureau 820×312 ; mobile recadré 640×360 sur la bande centrale) :',
    '  couverture-telephone.png (avec la capture du pointage du démo) ou couverture-texte.png',
    '',
    'Palette sable de la landing v3, Fraunces + Inter. À refaire si l’accroche du hero change.',
  ].join('\n'));
} finally {
  await browser.close();
}
console.log(`\nDossier : ${OUT}`);
