/**
 * Habille le portail public du démo « L'Atelier Soleil » (2026-09-08, réel tout
 * mobile) : une vraie photo de couverture, un vrai portrait en avatar, une photo
 * par type de cours (v99), des tons distincts par type, et l'onglet « À propos »
 * rempli (philosophie, formations). Avant : couverture « cartoon », avatar vide,
 * aucune vignette, Reformer / Barre au sol / Prénatal de la même couleur.
 *
 * Les photos passent par LE CHEMIN NORMAL de l'app (POST /api/profile/upload-photo
 * avec la session du démo → Vercel Blob, seul hôte accepté par lib/vignette-cours) :
 * le local n'a pas le jeton Blob, la prod l'a. Les colonnes jsonb sont ensuite
 * écrites en service_role, après les MÊMES sanitizers que l'écran Paramètres.
 *
 * Re-runnable : couverture et avatar remplacent l'ancien fichier (la route le
 * supprime), les vignettes passent `remplace=<ancienne url>`. Le refresh du démo
 * préserve le profil, donc l'habillage survit aux refresh.
 * Usage : node scripts/habiller-demo-portail.mjs
 */
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Miroir des règles de lib/vignette-cours (import Node impossible : le module
// importe './tones' sans extension) : tons de la liste, URL de NOS hôtes seulement.
const TONES = ['rose', 'sage', 'sand', 'lavender', 'ink'];
const HOSTS_OK = /^https:\/\/[^/]+\.(supabase\.co|public\.blob\.vercel-storage\.com)\//;
const sanitizeTonsParType = (o) => Object.fromEntries(Object.entries(o).filter(([, t]) => TONES.includes(t)));
const sanitizeVignettesParType = (o) => Object.fromEntries(Object.entries(o).filter(([, u]) => typeof u === 'string' && HOSTS_OK.test(u)));

const ROOT = process.cwd();
const env = Object.fromEntries(
  readFileSync(join(ROOT, '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const BASE = process.env.SHOOT_BASE || 'https://www.izisolo.fr';
const EMAIL = 'camille@atelier-soleil.fr';
const PROFILE_ID = '17a6194a-87e6-47e2-ac31-c6224cd78f44';
const PROJECT_REF = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const ICONS = join(ROOT, 'public', 'icons');

// ── Session démo (même mécanique que shoot-landing-visuels) ─────────────────
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data: linkData, error: eLink } = await admin.auth.admin.generateLink({ type: 'magiclink', email: EMAIL });
if (eLink) { console.error('generateLink:', eLink.message); process.exit(1); }
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: otpData, error: eOtp } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: linkData.properties.hashed_token });
if (eOtp || !otpData?.session) { console.error('verifyOtp:', eOtp?.message || 'pas de session'); process.exit(1); }
const cookieName = `sb-${PROJECT_REF}-auth-token`;
const value = 'base64-' + Buffer.from(JSON.stringify(otpData.session)).toString('base64url');
const cookies = [];
if (value.length <= 3180) cookies.push([cookieName, value]);
else for (let i = 0; i * 3180 < value.length; i++) cookies.push([`${cookieName}.${i}`, value.slice(i * 3180, (i + 1) * 3180)]);
const COOKIE = cookies.map(([n, v]) => `${n}=${v}`).join('; ');
console.log('🔑 session démo obtenue');

const { data: avant, error: eAvant } = await admin.from('profiles')
  .select('photo_url, photo_couverture, vignettes_par_type').eq('id', PROFILE_ID).single();
if (eAvant) { console.error('lecture profil :', eAvant.message); process.exit(1); }

// ── Les photos, préparées sous les 2 Mo de la route ─────────────────────────
const jpeg = (input, pipeline) => pipeline(sharp(join(ICONS, input))).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
const PHOTOS = {
  couverture: () => jpeg('persona-pilates.jpg', s => s.resize({ width: 1600 })),
  // Le visage du portrait du hero, en carré (l'image fait 1122×1402).
  profil: () => jpeg('hero-portrait.png', s => s.extract({ left: 230, top: 90, width: 560, height: 560 }).resize({ width: 600 })),
  Reformer: () => jpeg('persona-pilates.jpg', s => s.resize({ width: 900 })),
  Yoga: () => jpeg('persona-yoga.jpg', s => s.resize({ width: 900 })),
  'Barre au sol': () => jpeg('persona-danse.jpg', s => s.resize({ width: 900 })),
  Mat: () => jpeg('persona-meditation.jpg', s => s.resize({ width: 900 })),
};

async function televerser(kind, buffer, remplace) {
  const fd = new FormData();
  fd.append('file', new Blob([buffer], { type: 'image/jpeg' }), `${kind}.jpg`);
  const q = new URLSearchParams({ kind });
  if (remplace) q.set('remplace', remplace);
  const res = await fetch(`${BASE}/api/profile/upload-photo?${q}`, { method: 'POST', headers: { Cookie: COOKIE }, body: fd });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.url) throw new Error(`upload ${kind} → ${res.status} ${json.error || ''}`);
  console.log(`📤 ${kind} : ${Math.round(buffer.length / 1024)} Ko → ${json.url.slice(0, 70)}…`);
  return json.url;
}

await televerser('couverture', await PHOTOS.couverture());
await televerser('profil', await PHOTOS.profil());
const vignettes = {};
for (const type of ['Reformer', 'Yoga', 'Barre au sol', 'Mat']) {
  vignettes[type] = await televerser('vignette', await PHOTOS[type](), avant?.vignettes_par_type?.[type] || null);
}

// ── Tons distincts par type + l'onglet « À propos » ─────────────────────────
const tons = {
  Mat: 'sand', Reformer: 'sage', 'Barre au sol': 'rose', Prénatal: 'lavender',
  Senior: 'ink', Stretching: 'sand', Yoga: 'sage', 'Yoga enfants': 'rose',
};
const patch = {
  vignettes_par_type: sanitizeVignettesParType(vignettes),
  tons_par_type: sanitizeTonsParType(tons),
  photo_couverture_focal_y: 42,
  philosophie: 'Le Pilates et le yoga ne sont pas une performance. Ce sont des outils pour habiter son corps un peu mieux chaque semaine.\n\nJe travaille en petits groupes pour voir chaque personne, corriger sans brusquer, et adapter chaque séance à qui est là ce jour-là.',
  formations: 'Pilates Mat & Reformer · Yoga Vinyasa 200 h · Pilates prénatal',
};
const { error: eMaj } = await admin.from('profiles').update(patch).eq('id', PROFILE_ID);
if (eMaj) { console.error('mise à jour profil :', eMaj.message); process.exit(1); }
console.log(`🎨 tons + ${Object.keys(patch.vignettes_par_type).length} vignettes + À propos écrits`);

const { data: apres } = await admin.from('profiles')
  .select('photo_url, photo_couverture, vignettes_par_type, tons_par_type, philosophie').eq('id', PROFILE_ID).single();
const ok = apres?.photo_url !== avant?.photo_url && apres?.photo_couverture !== avant?.photo_couverture
  && Object.keys(apres?.vignettes_par_type || {}).length === 4 && !!apres?.philosophie;
console.log(ok ? `✅ portail habillé : ${BASE}/p/atelier-soleil` : '❌ relecture incohérente');
process.exit(ok ? 0 : 1);
