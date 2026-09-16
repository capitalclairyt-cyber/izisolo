/**
 * PREUVE — pousser vers Complet en montrant ce qui manque (v119, 2026-09-16).
 *
 * Décision Colin du jour : on ne retire RIEN d'Essentiel (ni le QR, ni le
 * planning intégrable), on rend le manque visible. Deux mécaniques, prouvées
 * ici par le chemin réel :
 *
 *   1. Le compteur de vues du portail. Une prof Essentiel ne voit jamais les
 *      gens qui ouvrent sa page et repartent faute de pouvoir réserver.
 *      On compte les ouvertures (jamais les personnes), on ne compte ni les
 *      robots ni la prof elle-même, et sous trois vues on se tait.
 *   2. Le bilan chiffré de fin d'essai. L'email J-3 et le tableau de bord
 *      disaient « tu vas perdre la réservation, l'espace élève, la messagerie ».
 *      Ils disent maintenant ce que SES élèves ont fait chez elle, et se
 *      taisent sur ce qu'ils ne savent pas compter.
 *
 * Auto-adaptatif : sans la migration v119, la phase A prouve que RIEN ne casse
 * (le portail sert, la réservation passe, aucune carte ne ment) ; une fois la
 * migration appliquée, la phase B prouve le chemin complet.
 *
 * ⚠️ La section G envoie UN email RÉEL à bonjour@izisolo.fr (le J-3 refondu) :
 *    c'est voulu, c'est le seul moyen de prouver que le cron l'envoie, et ça
 *    permet de le relire en vrai. Lancer avec SANS_EMAIL=1 pour la sauter.
 *
 * Usage : node scripts/proof-upsell-complet.mjs
 * Prérequis : un serveur sur PROOF_BASE (défaut :3334, build prod).
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.PROOF_BASE || 'http://localhost:3334';
const env = Object.fromEntries(
  readFileSync(join(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const PROJECT_REF = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

let ok = 0, ko = 0;
const c = (l, cond, d = '') => { if (cond) { ok++; console.log('  OK  ' + l + (d ? ' - ' + d : '')); } else { ko++; console.log('  KO  ' + l + (d ? ' - ' + d : '')); } };
const attendre = async (fn, ms = 20000, pas = 400) => {
  const fin = Date.now() + ms;
  for (;;) { const r = await fn(); if (r) return r; if (Date.now() > fin) return null; await new Promise(r2 => setTimeout(r2, pas)); }
};
const TS = Date.now().toString(36);
const aller = async (page, url) => {
  try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 }); }
  catch (e) {
    if (!/ERR_ABORTED/.test(String(e))) throw e;
    await new Promise(r => setTimeout(r, 1500));
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  }
};

const PREFIXE = 'preuve-upsell-';
const S = {
  // Essentiel installé depuis longtemps : c'est lui qui doit voir le compteur.
  essentiel: { email: `${PREFIXE}solo-${TS}@example.com`, slug: `${PREFIXE}solo-${TS}`, nom: 'Preuve Essentiel' },
  // Complet : il ne doit JAMAIS voir la carte (il peut déjà tout faire).
  complet: { email: `${PREFIXE}pro-${TS}@example.com`, slug: `${PREFIXE}pro-${TS}`, nom: 'Preuve Complet' },
  // En essai, à trois jours de la fin, avec de quoi remplir un bilan.
  essai: { email: `${PREFIXE}essai-${TS}@example.com`, slug: `${PREFIXE}essai-${TS}`, nom: 'Preuve Essai' },
  // En essai aussi, mais dont les élèves n'ont rien fait.
  vide: { email: `${PREFIXE}vide-${TS}@example.com`, slug: `${PREFIXE}vide-${TS}`, nom: 'Preuve Essai Vide' },
};

async function purger() {
  const { data: lst } = await svc.auth.admin.listUsers({ page: 1, perPage: 200 }).catch(() => ({ data: null }));
  for (const u of (lst?.users || []).filter(x => (x.email || '').startsWith(PREFIXE) || (x.email || '').startsWith('eleve-upsell-'))) {
    const { data: fiches } = await svc.from('clients').select('id').ilike('email', u.email);
    for (const f of fiches || []) await svc.from('clients').delete().eq('id', f.id);
    await svc.auth.admin.deleteUser(u.id).catch(() => {});
  }
  const { data: profs } = await svc.from('profiles').select('id').ilike('studio_slug', `${PREFIXE}%`);
  for (const p of profs || []) {
    const { data: convs } = await svc.from('conversations').select('id').eq('profile_id', p.id);
    for (const cv of convs || []) {
      await svc.from('messages').delete().eq('conversation_id', cv.id);
      await svc.from('conversation_members').delete().eq('conversation_id', cv.id).then(() => {}, () => {});
      await svc.from('conversations').delete().eq('id', cv.id);
    }
    await svc.from('presences').delete().eq('profile_id', p.id);
    await svc.from('cours').delete().eq('profile_id', p.id);
    await svc.from('clients').delete().eq('profile_id', p.id);
    await svc.from('vues_portail').delete().eq('profile_id', p.id).then(() => {}, () => {});
  }
}
await purger();

// ── Le quota anti-abus de NOTRE adresse, et d'elle seule ────────────────────
// La route de réservation accepte 5 requêtes par heure et par IP (compteur
// PARTAGÉ en base, donc un redémarrage du serveur ne le vide pas) : à la
// cinquième relance de la preuve, le 429 accuse le produit pour rien.
// On libère la clé de l'appelant local, JAMAIS un `like('default:%')` : la
// table est partagée avec la prod et on effacerait le quota d'une vraie
// visiteuse. En local, ipFromRequest ne trouve aucun en-tête de proxy et rend
// `null` : c'est cette empreinte-là qu'on efface.
{
  const { createHash } = await import('node:crypto');
  const sel = env.IP_HASH_SALT || 'izisolo';
  for (const ip of ['null', '::1', '127.0.0.1']) {
    const empreinte = createHash('sha256').update(ip + sel).digest('hex').slice(0, 32);
    await svc.from('rate_limits').delete().eq('cle', `default:${empreinte}`).then(() => {}, () => {});
  }
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
  return cookies.map(x => ({ ...x, url: BASE, sameSite: 'Lax' }));
};

const jours = (n) => new Date(Date.now() + n * 86400000).toISOString();
const jourISO = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

// ── Sonde v119 ──────────────────────────────────────────────────────────────
// Une table absente répond PGRST205 (cache de schéma), jamais 42P01, et un
// select(head) sur une table inconnue peut répondre 204 sans erreur : on lit
// une vraie ligne (leçon v109).
const { error: eVues } = await svc.from('vues_portail').select('profile_id').limit(1);
const { error: eSource } = await svc.from('presences').select('source').limit(1);
const V119 = !eVues && !eSource;
console.log(`\n════ Preuve upsell Complet — v119 ${V119 ? 'APPLIQUÉE (phase complète)' : 'ABSENTE (phase dégradée)'} ════`);

// ── Les studios jetables ────────────────────────────────────────────────────
for (const [cle, s] of Object.entries(S)) {
  const { data: cree, error } = await svc.auth.admin.createUser({ email: s.email, email_confirm: true, password: `Preuve-${TS}!`, user_metadata: { prenom: 'Preuve' } });
  if (error) { console.error(`createUser ${cle}:`, error.message); await purger(); process.exit(1); }
  s.id = cree.user.id;
  const profil = await attendre(async () => { const { data } = await svc.from('profiles').select('id').eq('id', s.id).maybeSingle(); return data || null; }, 15000);
  if (!profil) { console.error('profil non créé'); await purger(); process.exit(1); }
  const enEssai = cle === 'essai' || cle === 'vide';
  await svc.from('profiles').update({
    studio_nom: s.nom, studio_slug: s.slug, portail_actif: true,
    // ⚠️ Un studio EN ESSAI porte plan 'solo' : un plan payant posé sans Stripe
    // est lu comme un plan OFFERT (PLANS_OFFRABLES), donc « abonnée », donc
    // aucun essai. C'est exactement l'état d'une inscription du jour, et c'est
    // ce que la preuve doit simuler (défaut de témoin attrapé au 1er run).
    plan: cle === 'complet' ? 'pro' : 'solo',
    // En essai : démarré il y a 27 jours, donc J-3. Sinon : abonné, jamais gelé,
    // et l'essai est fini depuis longtemps (sinon le bilan prendrait la place
    // de la carte des vues).
    trial_started_at: enEssai ? jours(-27) : jours(-90),
    stripe_subscription_status: enEssai ? null : 'active',
  }).eq('id', s.id);
  // Une séance publique à venir, pour que le portail ait quelque chose à montrer.
  const { data: cours } = await svc.from('cours').insert({
    profile_id: s.id, nom: 'Séance de preuve', date: jourISO(3), heure: '18:00',
    duree_minutes: 60, capacite_max: 10, visibilite: 'public', type_cours: 'Yoga',
  }).select('id').single();
  s.coursId = cours?.id;
}

// De quoi remplir le bilan du studio « essai » : deux élèves avec un compte,
// et un message envoyé par la prof.
{
  const s = S.essai;
  for (const n of [1, 2]) {
    const email = `eleve-upsell-${n}-${TS}@example.com`;
    const { data: u } = await svc.auth.admin.createUser({ email, email_confirm: true, user_metadata: { role: 'eleve' } });
    await svc.from('clients').insert({ profile_id: s.id, prenom: `Élève${n}`, nom: 'Preuve', email, statut: 'actif', auth_user_id: u?.user?.id || null });
  }
  // Une conversation 1 à 1 : le CHECK conv_target_coherent (v24/v87) exige
  // EXACTEMENT une cible, un type 'annonce' sans client_id est refusé par la
  // base (attrapé au 2e run : la ligne « messages envoyés » manquait au bilan).
  const { data: fiche1 } = await svc.from('clients').select('id').eq('profile_id', s.id).limit(1).single();
  const { data: conv, error: eConv } = await svc.from('conversations')
    .insert({ profile_id: s.id, type: 'client', client_id: fiche1.id })
    .select('id').single();
  if (eConv) console.log('  (conversation témoin KO :', eConv.message, ')');
  if (conv) {
    const { error: eMsg } = await svc.from('messages').insert({ conversation_id: conv.id, sender_type: 'pro', sender_profile_id: s.id, content: 'Message de preuve' });
    if (eMsg) console.log('  (message témoin KO :', eMsg.message, ')');
  }
  s.convId = conv?.id;
}

let chromium; try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = await import('@playwright/test')); }
let browser; try { browser = await chromium.launch(); } catch { browser = await chromium.launch({ channel: 'msedge' }); }

const lireVuesDb = async (id) => {
  const { data } = await svc.from('vues_portail').select('jour, vues').eq('profile_id', id);
  return (data || []).reduce((t, l) => t + (l.vues || 0), 0);
};

try {
  for (let i = 0; i < 60; i++) { try { const r = await fetch(`${BASE}/login`); if (r.ok) break; } catch { /* pas prêt */ } await new Promise(r => setTimeout(r, 2000)); }

  // ══ A. Le portail public sert, et compte ce qu'il doit compter ═══════════
  console.log('\nA. Le portail public');
  const ctxAnon = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pAnon = await ctxAnon.newPage();
  const erreurs = [];
  pAnon.on('pageerror', e => erreurs.push(String(e)));
  await aller(pAnon, `${BASE}/p/${S.essentiel.slug}`);
  const texteP = await pAnon.evaluate(() => document.body.innerText);
  c('la page publique se rend (le compteur ne peut pas la casser)', texteP.includes(S.essentiel.nom), texteP.slice(0, 40).replace(/\s+/g, ' '));
  c('aucune erreur JS sur la page publique', erreurs.length === 0, erreurs[0] || '');
  await aller(pAnon, `${BASE}/p/${S.essentiel.slug}`);
  await aller(pAnon, `${BASE}/p/${S.essentiel.slug}`);
  // Un robot : compté nulle part.
  await fetch(`${BASE}/p/${S.essentiel.slug}`, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' } });
  // La prof elle-même : comptée nulle part non plus.
  const ctxProf = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctxProf.addCookies(await sessionCookies(S.essentiel.email));
  const pProf = await ctxProf.newPage();
  await aller(pProf, `${BASE}/p/${S.essentiel.slug}`);
  await new Promise(r => setTimeout(r, 2500)); // after() tourne hors réponse

  if (V119) {
    const vues = await attendre(async () => { const v = await lireVuesDb(S.essentiel.id); return v >= 3 ? v : null; }, 15000);
    c('trois visites anonymes comptées EN BASE', vues === 3, `vues = ${vues}`);
    c('le robot n\'est pas compté', vues === 3);
    c('la prof qui regarde son propre portail n\'est pas comptée', vues === 3);
  } else {
    c('sans v119, rien n\'est écrit et rien ne casse', true, 'le compteur se tait');
  }

  // ══ B. La carte du tableau de bord ══════════════════════════════════════
  console.log('\nB. Le tableau de bord d\'une prof Essentiel');
  await aller(pProf, `${BASE}/dashboard`);
  await pProf.waitForTimeout(1200);
  const carte = async (page) => page.evaluate(() => {
    const el = document.querySelector('.pc');
    if (!el) return null;
    const cta = el.querySelector('a.pc-cta');
    const r = cta?.getBoundingClientRect();
    return {
      texte: el.innerText,
      cta: cta?.getAttribute('href') || null,
      cliquable: r ? (() => { const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!e && (e === cta || cta.contains(e)); })() : false,
    };
  });
  // Une carte absente ne prouve rien si la page a redirigé ailleurs.
  c("le tableau de bord s'est bien rendu", pProf.url().endsWith('/dashboard'), pProf.url());
  const cEssentiel = await carte(pProf);
  if (V119) {
    c('la carte s\'affiche', !!cEssentiel, cEssentiel ? '' : 'absente');
    c('elle dit des OUVERTURES, jamais des personnes', !!cEssentiel && /ouverte 3 fois cette semaine/.test(cEssentiel.texte) && !/3 personnes/.test(cEssentiel.texte), cEssentiel?.texte?.split('\n')[0] || '');
    c('elle nomme ce qui manque', !!cEssentiel && /réserver/.test(cEssentiel.texte));
    c('elle dit ce qu\'on ne mesure pas', !!cEssentiel && /jamais les personnes/.test(cEssentiel.texte));
    c('son bouton mène à l\'abonnement, et il est cliquable', cEssentiel?.cta === '/parametres/abonnement' && cEssentiel?.cliquable);
  } else {
    c('sans v119 : aucune carte, aucun chiffre inventé', cEssentiel === null);
  }

  // Un studio Complet ne voit jamais cette carte.
  const ctxPro = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctxPro.addCookies(await sessionCookies(S.complet.email));
  const pPro = await ctxPro.newPage();
  await aller(pPro, `${BASE}/p/${S.complet.slug}`);
  await aller(pPro, `${BASE}/dashboard`);
  await pPro.waitForTimeout(1000);
  c('un studio Complet ne voit jamais la carte', (await carte(pPro)) === null);

  // ══ C. La réservation depuis le portail ═════════════════════════════════
  console.log('\nC. La réservation, et d\'où elle vient');
  const emailEleve = `eleve-upsell-resa-${TS}@example.com`;
  const rResa = await fetch(`${BASE}/api/portail/${S.complet.slug}/reserver`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ coursId: S.complet.coursId, nom: 'Élève Preuve', email: emailEleve, telephone: '' }),
  });
  const jResa = await rResa.json().catch(() => ({}));
  c('la place est prise (le marqueur ne peut pas casser une réservation)', rResa.ok, `HTTP ${rResa.status} ${jResa?.error || ''}`);
  const { data: pres } = await svc.from('presences').select('id' + (V119 ? ', source' : '')).eq('profile_id', S.complet.id);
  c('une présence EN BASE', (pres || []).length === 1, `${(pres || []).length}`);
  if (V119) c('elle porte source = portail', pres?.[0]?.source === 'portail', String(pres?.[0]?.source));

  // ══ D. Le bilan de fin d'essai ══════════════════════════════════════════
  console.log('\nD. Le bilan chiffré de fin d\'essai');
  const ctxEssai = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctxEssai.addCookies(await sessionCookies(S.essai.email));
  const pEssai = await ctxEssai.newPage();
  await aller(pEssai, `${BASE}/dashboard`);
  await pEssai.waitForTimeout(1200);
  const cBilan = await carte(pEssai);
  c('la carte de bilan s\'affiche à J-3', !!cBilan, cBilan ? '' : 'absente');
  c('elle compte les comptes élèves (2)', !!cBilan && /2 élèves ont leur espace chez toi/.test(cBilan.texte));
  c('elle compte les messages envoyés (1)', !!cBilan && /1 message envoyé/.test(cBilan.texte));
  c('elle ne montre AUCUNE ligne à zéro', !!cBilan && !/\b0 /.test(cBilan.texte), (cBilan?.texte || '').replace(/\n/g, ' | ').slice(0, 120));
  c('elle dit quand ça s\'arrête et combien ça coûte', !!cBilan && /dans 3 jours/.test(cBilan.texte) && /29 € par mois/.test(cBilan.texte));
  c('elle rassure sur le reste du studio', !!cBilan && /le reste de ton studio/i.test(cBilan.texte));
  c('le bouton mène à l\'abonnement', cBilan?.cta === '/parametres/abonnement');

  const ctxVide = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctxVide.addCookies(await sessionCookies(S.vide.email));
  const pVide = await ctxVide.newPage();
  await aller(pVide, `${BASE}/dashboard`);
  await pVide.waitForTimeout(1200);
  const cVide = await carte(pVide);
  c('un essai sans rien : la carte ne vend pas', !!cVide && /Il te reste 3 jours/.test(cVide.texte) && !/29 €/.test(cVide.texte), (cVide?.texte || '').replace(/\n/g, ' | ').slice(0, 100));
  c('elle propose le geste qui manque', !!cVide && /Partage ton lien/.test(cVide.texte));

  // ══ E. L'email J-3 refondu (1 email RÉEL) ═══════════════════════════════
  console.log('\nE. Le cron J-3');
  if (process.env.SANS_EMAIL === '1' || !env.CRON_SECRET) {
    console.log('  (sauté : SANS_EMAIL=1 ou CRON_SECRET absent)');
  } else {
    // Le garde-fou RFC 2606 refuserait un @example.com : pour prouver l'envoi,
    // l'email part chez nous. Les autres studios de la preuve restent en
    // @example.com et ne dérangent personne.
    await svc.from('profiles').update({ email_contact: 'bonjour@izisolo.fr' }).eq('id', S.essai.id);
    // `?profil=` : SEULE la relance d'essai tourne, et SEULEMENT pour ce studio.
    // Sans ça, la preuve déclencherait tout le cron contre la prod (emails aux
    // vraies profs, purges, abonnements) depuis un build local.
    const r = await fetch(`${BASE}/api/cron/expirations?profil=${S.essai.id}`, { headers: { authorization: `Bearer ${env.CRON_SECRET}` } });
    const j = await r.json().catch(() => ({}));
    c('le cron répond', r.ok, `HTTP ${r.status}`);
    const { data: apres } = await svc.from('profiles').select('trial_reminder_sent_j3').eq('id', S.essai.id).single();
    c('le J-3 est parti et le drapeau est posé', apres?.trial_reminder_sent_j3 === true, JSON.stringify(j).slice(0, 120));
  }
} finally {
  await browser.close();
  await purger();
}

console.log(`\n${ok} OK · ${ko} KO${V119 ? '' : ' (phase dégradée : relancer après v119)'}`);
process.exit(ko ? 1 : 0);
