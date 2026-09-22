/**
 * PREUVE — la langue d'une élève mémorisée sur sa fiche, et les emails qui
 * partent sans son cookie (v122, 2026-09-22).
 *
 * Vrai navigateur contre le dev server (:3333, PROOF_BASE sinon), démo
 * Atelier Soleil, témoins jetables. Auto-adaptatif v122.
 *
 *   A. Élève connectée, cookie EN → une visite de son espace écrit
 *      `clients.langue = 'en'` EN BASE (v122) ; sans v122 rien ne casse.
 *   B. Cookie FR → la page du studio réécrit 'fr'. Sans cookie → rien ne bouge.
 *   C. Une réservation ANONYME avec le cookie EN crée une fiche dont la langue
 *      est 'en' (v122).
 *   D. La route de liste d'attente répond dans la langue du cookie.
 *   E. (v122) Une séance témoin annulée par la prof : l'inscrite dont la fiche
 *      est en anglais reçoit UN email RÉEL à bonjour@izisolo.fr, en anglais.
 *
 * Re-runnable, témoins purgés même en cas d'échec. ⚠️ Phase complète : 1 email
 * réel à bonjour@izisolo.fr (le « class cancelled »), à relire.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.PROOF_BASE || 'http://localhost:3333';
const EMAIL_A = 'temoin-langue-a@example.com';
const EMAIL_C = 'temoin-langue-c@example.com';
const EMAIL_REEL = 'bonjour@izisolo.fr';

const env = Object.fromEntries(
  readFileSync(join(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const PROJECT_REF = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

let ok = 0, ko = 0;
const c = (l, cond, d = '') => { if (cond) { ok++; console.log('  OK  ' + l + (d ? ' - ' + d : '')); } else { ko++; console.log('  KO  ' + l + (d ? ' - ' + d : '')); } };
const attendre = async (fn, ms = 30000) => { const fin = Date.now() + ms; let v; while (Date.now() < fin) { v = await fn().catch(() => null); if (v) return v; await new Promise(r => setTimeout(r, 400)); } return null; };

const { data: demo } = await svc.from('profiles').select('id, studio_slug, studio_nom').eq('studio_slug', 'atelier-soleil').single();
if (!demo) { console.error('Démo introuvable'); process.exit(1); }
const SLUG = demo.studio_slug;

let V122 = true;
{
  const { error } = await svc.from('clients').select('id, langue').eq('profile_id', demo.id).limit(1);
  if (error && (['42703', 'PGRST204', 'PGRST205'].includes(error.code) || /langue/.test(error.message || ''))) V122 = false;
}
console.log(`migration v122 : ${V122 ? 'APPLIQUEE (phase complète)' : 'ABSENTE (phase dégradée, relance après application)'}`);

const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
const { data: coursPublics } = await svc.from('cours').select('id, nom, date, heure, capacite_max').eq('profile_id', demo.id).eq('est_annule', false).eq('visibilite', 'public').gt('date', today).order('date').order('heure').limit(20);
if (!coursPublics?.length) { console.error('Le démo n\'a aucune séance publique à venir : refresh-demo-atelier-soleil d\'abord.'); process.exit(1); }

// Quota anti-abus des routes publiques : on libère la clé de l'appelant
// LOCAL seulement (patron proof-upsell-complet, jamais un like).
{
  const { createHash } = await import('node:crypto');
  const sel = env.IP_HASH_SALT || 'izisolo';
  for (const ip of ['null', '::1', '127.0.0.1']) {
    const empreinte = createHash('sha256').update(ip + sel).digest('hex').slice(0, 32);
    for (const scope of ['default', 'portail-login']) {
      await svc.from('rate_limits').delete().eq('cle', `${scope}:${empreinte}`).then(() => {}, () => {});
    }
  }
}

let userA = null, ficheA = null, ficheReel = null, coursTemoin = null;
const langueDe = async (id) => {
  if (!V122) return null;
  const { data } = await svc.from('clients').select('langue').eq('id', id).maybeSingle();
  return data?.langue ?? null;
};
async function purger() {
  for (const email of [EMAIL_A, EMAIL_C, EMAIL_REEL]) {
    const { data: fiches } = await svc.from('clients').select('id').eq('profile_id', demo.id).ilike('email', email);
    for (const f of fiches || []) {
      await svc.from('presences').delete().eq('client_id', f.id);
      await svc.from('notifications_eleves').delete().eq('client_id', f.id).then(() => {}, () => {});
      await svc.from('clients').delete().eq('id', f.id);
    }
  }
  if (coursTemoin) { await svc.from('cours').delete().eq('id', coursTemoin.id); coursTemoin = null; }
  await svc.from('cours').delete().eq('profile_id', demo.id).eq('nom', 'Séance témoin langue');
  if (userA) { await svc.auth.admin.deleteUser(userA).catch(() => {}); userA = null; }
  else {
    const { data: lst } = await svc.auth.admin.listUsers({ page: 1, perPage: 200 }).catch(() => ({ data: null }));
    const u = lst?.users?.find(x => x.email === EMAIL_A);
    if (u) await svc.auth.admin.deleteUser(u.id).catch(() => {});
  }
}
await purger();
{
  const { data: f, error } = await svc.from('clients').insert({ profile_id: demo.id, prenom: 'Témoin', nom: 'Langue', email: EMAIL_A, statut: 'actif' }).select('id').single();
  if (error) { console.error('fiche A KO:', error.message); process.exit(1); }
  ficheA = f;
  const { data: cree, error: eU } = await svc.auth.admin.createUser({ email: EMAIL_A, email_confirm: true, user_metadata: { role: 'eleve' } });
  if (eU) { console.error('compte A KO:', eU.message); await purger(); process.exit(1); }
  userA = cree.user.id;
}

const sessionCookies = async (email) => {
  const { data: linkData } = await svc.auth.admin.generateLink({ type: 'magiclink', email });
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: otp } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: linkData.properties.hashed_token });
  const value = 'base64-' + Buffer.from(JSON.stringify(otp.session)).toString('base64url');
  const nm = `sb-${PROJECT_REF}-auth-token`;
  const cookies = [];
  if (value.length <= 3180) cookies.push({ name: nm, value });
  else for (let i = 0; i * 3180 < value.length; i++) cookies.push({ name: `${nm}.${i}`, value: value.slice(i * 3180, (i + 1) * 3180) });
  return cookies;
};
const cookieLangue = (l) => ({ name: 'izi_lang', value: l, url: BASE, sameSite: 'Lax' });
// En dev, la PREMIÈRE compilation d'une page recharge celle en cours (Fast
// Refresh) et fait avorter la navigation (ERR_ABORTED) : on rejoue, patron des
// preuves du chantier Assos & Studios. Et on préchauffe les deux pages.
const aller = async (page, url) => {
  for (let i = 0; i < 4; i++) {
    try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 }); return; }
    catch (e) { if (!/ERR_ABORTED|interrupted/.test(String(e)) || i === 3) throw e; await new Promise(r => setTimeout(r, 1500)); }
  }
};
for (const u of [`${BASE}/p/${SLUG}`, `${BASE}/p/${SLUG}/espace`]) await fetch(u).catch(() => {});

let chromium; try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = await import('@playwright/test')); }
let browser; try { browser = await chromium.launch({ channel: 'msedge' }); } catch { browser = await chromium.launch(); }
const erreurs = [];

try {
  // ── A. Cookie EN + espace → fiche en anglais ──────────────────────────────
  console.log('\n— A. Élève connectée, cookie EN : son espace mémorise sa langue —');
  const ctx = await browser.newContext({ viewport: { width: 420, height: 1000 } });
  await ctx.addCookies((await sessionCookies(EMAIL_A)).map(cc => ({ ...cc, url: BASE, sameSite: 'Lax' })));
  await ctx.addCookies([cookieLangue('en')]);
  const p = await ctx.newPage();
  p.on('pageerror', e => erreurs.push('A: ' + String(e).slice(0, 160)));
  await aller(p, `${BASE}/p/${SLUG}/espace`);
  await p.waitForSelector('.portail-card', { timeout: 90000 });
  c('l\'espace se rend en anglais', (await p.innerText('.portail-header')).includes('My account'));
  if (V122) {
    c('EN BASE : clients.langue = en après la visite', (await attendre(() => langueDe(ficheA.id).then(v => (v === 'en' ? v : null)), 20000)) === 'en');
  } else {
    c('sans v122 : la visite passe, rien à écrire', true);
  }

  // ── B. Cookie FR → 'fr' ; sans cookie → inchangé ──────────────────────────
  console.log('\n— B. Cookie FR puis sans cookie —');
  await ctx.addCookies([cookieLangue('fr')]);
  await aller(p, `${BASE}/p/${SLUG}`);
  await p.waitForSelector('.portail-header', { timeout: 90000 });
  c('la page du studio se rend en français', (await p.innerText('.portail-header')).includes('Mon espace'));
  if (V122) c('EN BASE : clients.langue = fr après la page du studio', (await attendre(() => langueDe(ficheA.id).then(v => (v === 'fr' ? v : null)), 20000)) === 'fr');
  await ctx.clearCookies();
  await ctx.addCookies((await sessionCookies(EMAIL_A)).map(cc => ({ ...cc, url: BASE, sameSite: 'Lax' })));
  if (V122) await svc.from('clients').update({ langue: 'en' }).eq('id', ficheA.id);
  await aller(p, `${BASE}/p/${SLUG}/espace`);
  await p.waitForSelector('.portail-card', { timeout: 90000 });
  if (V122) {
    await new Promise(r => setTimeout(r, 1500));
    c('sans cookie, la fiche garde sa langue (en)', (await langueDe(ficheA.id)) === 'en');
    c('et l\'écran suit le studio (français), pas la fiche : le cookie seul décide de l\'écran', (await p.innerText('.portail-header')).includes('Mon espace'));
  }
  await ctx.close();

  // ── C. Réservation anonyme avec cookie EN ─────────────────────────────────
  console.log('\n— C. Une réservation anonyme avec le cookie EN crée une fiche en anglais —');
  const coursLibre = coursPublics.find(x => !x.capacite_max || x.capacite_max >= 20) || coursPublics[0];
  const resa = await fetch(`${BASE}/api/portail/${SLUG}/reserver`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: 'izi_lang=en' },
    body: JSON.stringify({ coursId: coursLibre.id, prenom: 'Témoin', nom: 'C', email: EMAIL_C, website: '' }),
  }).then(async r => ({ status: r.status, json: await r.json().catch(() => ({})) }));
  c('la réservation passe (200)', resa.status === 200, `${resa.status} ${resa.json.error || ''}`);
  const { data: ficheC } = await svc.from('clients').select('id').eq('profile_id', demo.id).ilike('email', EMAIL_C).maybeSingle();
  c('une fiche est créée', !!ficheC);
  if (V122 && ficheC) c('EN BASE : sa langue est en', (await langueDe(ficheC.id)) === 'en');

  // ── D. La liste d'attente répond dans la langue du cookie ─────────────────
  console.log('\n— D. La route de liste d\'attente parle la langue du cookie —');
  const la = (langue) => fetch(`${BASE}/api/portail/${SLUG}/liste-attente`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: `izi_lang=${langue}` },
    body: JSON.stringify({ coursId: coursLibre.id, nom: 'Témoin C', email: EMAIL_C }),
  }).then(async r => ({ status: r.status, json: await r.json().catch(() => ({})) }));
  const laFr = await la('fr');
  const laEn = await la('en');
  c('cours non complet : refus (400) en français', laFr.status === 400 && /complet|libre|places/i.test(laFr.json.error || ''), `${laFr.status} ${laFr.json.error}`);
  c('le même refus en anglais, dans une autre langue', laEn.status === 400 && laEn.json.error && laEn.json.error !== laFr.json.error && !/complet|places /i.test(laEn.json.error), `${laEn.status} ${laEn.json.error}`);

  // ── E. (v122) L'annulation par la prof : un email réel en anglais ─────────
  console.log('\n— E. La prof annule une séance témoin : l\'inscrite en anglais reçoit son email —');
  if (V122) {
    const { data: fr, error: eF } = await svc.from('clients').insert({ profile_id: demo.id, prenom: 'Colin', nom: 'Proof', email: EMAIL_REEL, statut: 'actif', langue: 'en' }).select('id').single();
    if (eF) { c('fiche réelle créée', false, eF.message); } else {
      ficheReel = fr;
      const dans7 = new Date(Date.now() + 7 * 86400000).toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
      const { data: ct, error: eC } = await svc.from('cours').insert({ profile_id: demo.id, nom: 'Séance témoin langue', date: dans7, heure: '18:30', duree_minutes: 60, capacite_max: 10, visibilite: 'public', est_annule: false }).select('id').single();
      if (eC) { c('séance témoin créée', false, eC.message); } else {
        coursTemoin = ct;
        const { error: eP } = await svc.from('presences').insert({ profile_id: demo.id, client_id: ficheReel.id, cours_id: coursTemoin.id, statut_pointage: 'inscrit' });
        c('inscription témoin posée', !eP, eP?.message || '');
        const ctxP = await browser.newContext();
        await ctxP.addCookies((await sessionCookies('camille@atelier-soleil.fr')).map(cc => ({ ...cc, url: BASE, sameSite: 'Lax' })));
        const rep = await ctxP.request.post(`${BASE}/api/cours/${coursTemoin.id}/annuler`, { data: { raison: 'Proof : email en anglais' } });
        const j = await rep.json().catch(() => ({}));
        c('annulation par la prof : 200', rep.status() === 200, `${rep.status()} ${JSON.stringify(j).slice(0, 120)}`);
        const { data: annule } = await svc.from('cours').select('est_annule').eq('id', coursTemoin.id).single();
        c('la séance est annulée EN BASE', annule?.est_annule === true);
        console.log('  ℹ️  1 email RÉEL est parti à bonjour@izisolo.fr : « class cancelled », à relire en anglais.');
        await ctxP.close();
      }
    }
  } else {
    console.log('  (sans v122 : E ignorée, rien n\'est envoyé)');
  }
  await p.close().catch(() => {});
} catch (e) {
  ko++;
  console.log('  KO  la preuve a cassé : ' + String(e).split('\n')[0]);
} finally {
  await browser.close();
  await purger();
}

c('aucune erreur de page', erreurs.length === 0, erreurs.join(' | '));
console.log(`\n${ok} OK · ${ko} KO`);
process.exit(ko ? 1 : 0);
