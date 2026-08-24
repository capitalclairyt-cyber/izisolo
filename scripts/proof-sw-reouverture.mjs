// Preuve « réouverture » — le scénario exact de Maude, contre la PROD :
// profil PERSISTANT, visite 1 du dashboard (le nouveau SW s'installe, purge
// les caches toxiques), attente de l'activation, FERMETURE, RÉOUVERTURE →
// le dashboard doit vivre (pas d'error boundary), les navigations aussi,
// et les caches toxiques doivent avoir disparu.
// Attend d'abord que le déploiement du fix soit en ligne (hash worker).
import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const BASE = 'https://www.izisolo.fr';
const env = Object.fromEntries(
  readFileSync(join(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);

// ── 1. Attendre le déploiement : le worker (et workbox) doivent être servis
// SANS COOKIE — c'est le fix proxy (avant, un fetch anonyme recevait la page
// de login en HTML et l'installation du SW échouait pour les anonymes).
let workerServi = null;
for (let i = 0; i < 30; i++) {
  const sw = await (await fetch(`${BASE}/sw.js`, { cache: 'no-store' })).text();
  const nom = sw.match(/importScripts\("(worker-[^"]+)"\)/)?.[1];
  if (nom) {
    const w = await (await fetch(`${BASE}/${nom}`, { cache: 'no-store' })).text();
    if (!w.startsWith('<!DOCTYPE') && w.includes('start-url') && w.includes('activate')) { workerServi = nom; break; }
  }
  await new Promise(r => setTimeout(r, 20000));
}
if (!workerServi) { console.error('Le worker avec purge n\'est pas servi en anonyme après 10 min.'); process.exit(2); }
console.log('Déploiement en ligne — worker avec purge servi SANS cookie :', workerServi);
const swProd = await (await fetch(`${BASE}/sw.js`, { cache: 'no-store' })).text();
console.log('sw.js prod : règle "others" :', swProd.includes('"others"'), '· "apis" :', swProd.includes('"apis"'), '· start-url :', swProd.includes('start-url'));
const wb = swProd.match(/importScripts\(.*?"(workbox-[^"]+)"/)?.[1] || swProd.match(/"(workbox-[^"]+\.js)"/)?.[1];
if (wb) {
  const wbTxt = await (await fetch(`${BASE}/${wb}`, { cache: 'no-store' })).text();
  console.log(`workbox (${wb}) servi sans cookie :`, !wbTxt.startsWith('<!DOCTYPE') ? 'JS ✓' : 'HTML ✗');
}

// ── 2. Session Camille ─────────────────────────────────────────────────────
const PROJECT_REF = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data: linkData } = await svc.auth.admin.generateLink({ type: 'magiclink', email: 'camille@atelier-soleil.fr' });
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: otp } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: linkData.properties.hashed_token });
const value = 'base64-' + Buffer.from(JSON.stringify(otp.session)).toString('base64url');
const nm = `sb-${PROJECT_REF}-auth-token`;
const cookies = [];
if (value.length <= 3180) cookies.push({ name: nm, value });
else for (let i = 0; i * 3180 < value.length; i++) cookies.push({ name: `${nm}.${i}`, value: value.slice(i * 3180, (i + 1) * 3180) });

let chromium; try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = await import('@playwright/test')); }
const profil = mkdtempSync(join(tmpdir(), 'izi-sw-reouv-'));
let ctx; try { ctx = await chromium.launchPersistentContext(profil, { channel: 'msedge' }); }
catch { ctx = await chromium.launchPersistentContext(profil); }

let ok = 0, ko = 0;
const c = (l, cond, d = '') => { if (cond) { ok++; console.log('  OK  ' + l + (d ? ' - ' + d : '')); } else { ko++; console.log('  KO  ' + l + (d ? ' - ' + d : '')); } };
const attendre = async (fn, ms = 120000, pas = 1000) => {
  const fin = Date.now() + ms;
  for (;;) { const r = await fn(); if (r) return r; if (Date.now() > fin) return null; await new Promise(r2 => setTimeout(r2, pas)); }
};

try {
  await ctx.addCookies(cookies.map(cc => ({ ...cc, url: BASE, sameSite: 'Lax' })));

  // ── Visite 1 : le SW s'installe et s'active (précache + purge) ──────────
  console.log('\n— Visite 1 : installation du SW —');
  const p1 = ctx.pages()[0] || await ctx.newPage();
  await p1.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  const corps1 = await p1.innerText('body').catch(() => '');
  c('le dashboard vit à la première visite', !/erreur est survenue/i.test(corps1));
  const debutActivation = Date.now();
  const actif = await attendre(() => p1.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    return reg?.active ? true : null;
  }), 180000);
  c('le SW est ACTIF (précache terminé, purge exécutée)', !!actif, `en ~${Math.round((Date.now() - debutActivation) / 1000)} s`);
  await p1.close();

  // ── Réouverture : le SW CONTRÔLE la page — le scénario de Maude ─────────
  console.log('\n— Réouverture (le SW contrôle) —');
  const p2 = await ctx.newPage();
  const erreursConsole = [];
  p2.on('pageerror', e => erreursConsole.push(String(e).slice(0, 120)));
  await p2.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p2.waitForTimeout(4000);
  const controle = await p2.evaluate(() => !!navigator.serviceWorker.controller);
  c('la page est bien CONTRÔLÉE par le SW (le cas qui cassait)', controle);
  const corps2 = await p2.innerText('body').catch(() => '');
  c('le dashboard vit à la réouverture (pas d\'« une erreur est survenue »)', !/erreur est survenue/i.test(corps2));

  // Navigations client (flight RSC) : aller-retour agenda ↔ dashboard.
  await p2.click('a[href="/agenda"]').catch(() => {});
  await p2.waitForTimeout(3500);
  await p2.click('a[href="/dashboard"]').catch(() => {});
  await p2.waitForTimeout(3500);
  const corps3 = await p2.innerText('body').catch(() => '');
  c('les navigations aller-retour restent saines', !/erreur est survenue/i.test(corps3));
  c('zéro erreur page (flight/chunks)', erreursConsole.length === 0, erreursConsole.join(' · '));

  // ── Les caches : plus de toxiques, seulement la liste blanche ────────────
  const nomsCaches = await p2.evaluate(() => window.caches.keys());
  const toxiques = nomsCaches.filter(n => ['others', 'apis', 'start-url', 'next-data', 'static-js-assets', 'static-style-assets', 'cross-origin', 'static-data-assets'].includes(n));
  c('aucun cache toxique présent', toxiques.length === 0, `caches : ${nomsCaches.join(', ')}`);
} finally {
  await ctx.close().catch(() => {});
  try { rmSync(profil, { recursive: true, force: true }); } catch {}
}

console.log(`\nRésultat : ${ok} OK / ${ko} KO`);
process.exit(ko === 0 ? 0 : 1);
