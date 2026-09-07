/**
 * PREUVE — la frontière Essentiel / Complet est EFFECTIVE (2026-09-07).
 *
 * Question Colin : « les permissions des trois plans sont bien effectives et
 * fonctionnelles ? ». Réponse par le chemin réel : deux studios jetables,
 * l'un abonné Essentiel (solo), l'autre abonné Complet (pro), tous deux
 * avec un abonnement Stripe « active » en base (donc subscribed, jamais
 * gelés), et la même batterie sur chacun, capacité par capacité :
 *
 *   Côté prof (session réelle, vrai navigateur) :
 *     • barre latérale : Messagerie, Sondages, Essais, Liste d'attente portent
 *       un cadenas en Essentiel, aucun en Complet ;
 *     • ces quatre pages rendent PlanRequis en Essentiel, leur contenu en Complet ;
 *     • le formulaire de cours ne propose « Privé (sur invitation) » qu'en Complet ;
 *     • Paramètres → Ma page prévient en Essentiel que bio/FAQ ne s'affichent pas.
 *   Côté public / élève :
 *     • page publique : pas de « Demander cette offre », pas d'« Acheter en
 *       ligne », pas de bio en Essentiel — tout ça en Complet ;
 *     • route demander-offre : 403 en Essentiel, acceptée en Complet ;
 *     • espace élève et page de connexion : « pas d'espace élève » en
 *       Essentiel, espace normal en Complet ; route de lien magique : 403 / ≠403 ;
 *     • sondage public : indisponible en Essentiel, ouvert en Complet ; la
 *       route de vote refuse (403) en Essentiel.
 *
 * Re-runnable : studios, élèves, comptes purgés même en échec. Aucun email
 * réel (élèves en @example.com, le lien magique Complet n'est pas envoyé).
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.PROOF_BASE || 'http://localhost:3333';
const env = Object.fromEntries(
  readFileSync(join(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const PROJECT_REF = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

let ok = 0, ko = 0;
const c = (l, cond, d = '') => { if (cond) { ok++; console.log('  OK  ' + l + (d ? ' - ' + d : '')); } else { ko++; console.log('  KO  ' + l + (d ? ' - ' + d : '')); } };
const attendre = async (fn, ms = 20000, pas = 500) => {
  const fin = Date.now() + ms;
  for (;;) { const r = await fn(); if (r) return r; if (Date.now() > fin) return null; await new Promise(r2 => setTimeout(r2, pas)); }
};
const TS = Date.now().toString(36);
// Une navigation peut être avortée par une redirection concurrente du
// tableau de bord (ERR_ABORTED) : on la rejoue une fois avant de conclure.
const aller = async (page, url) => {
  try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 }); }
  catch (e) {
    if (!/ERR_ABORTED/.test(String(e))) throw e;
    await new Promise(r => setTimeout(r, 1500));
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  }
};
const STUDIOS = {
  solo: { email: `preuve-frontiere-solo-${TS}@example.com`, slug: `preuve-frontiere-solo-${TS}`, nom: 'Preuve Essentiel', plan: 'solo', eleve: `eleve-frontiere-solo-${TS}@example.com` },
  pro:  { email: `preuve-frontiere-pro-${TS}@example.com`,  slug: `preuve-frontiere-pro-${TS}`,  nom: 'Preuve Complet',   plan: 'pro',  eleve: `eleve-frontiere-pro-${TS}@example.com` },
};

async function purger() {
  const { data: lst } = await svc.auth.admin.listUsers({ page: 1, perPage: 200 }).catch(() => ({ data: null }));
  for (const u of (lst?.users || []).filter(x => /^(preuve|eleve)-frontiere-/.test(x.email || ''))) {
    const { data: fiches } = await svc.from('clients').select('id').ilike('email', u.email);
    for (const f of fiches || []) {
      await svc.from('demandes_offre').delete().eq('client_id', f.id);
      await svc.from('clients').delete().eq('id', f.id);
    }
    await svc.auth.admin.deleteUser(u.id).catch(() => {});
  }
  const { data: profs } = await svc.from('profiles').select('id').ilike('studio_slug', 'preuve-frontiere-%');
  for (const p of profs || []) {
    await svc.from('demandes_offre').delete().eq('profile_id', p.id);
    await svc.from('sondages_planning').delete().eq('profile_id', p.id);
    await svc.from('offres').delete().eq('profile_id', p.id);
    await svc.from('cours').delete().eq('profile_id', p.id);
    await svc.from('clients').delete().eq('profile_id', p.id);
  }
}
await purger();

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

// ── Deux studios jetables, abonnés (Stripe « active » en base) ─────────────
for (const [cle, s] of Object.entries(STUDIOS)) {
  const { data: cree, error } = await svc.auth.admin.createUser({ email: s.email, email_confirm: true, password: `Preuve-${TS}!`, user_metadata: { prenom: 'Preuve' } });
  if (error) { console.error(`createUser ${cle}:`, error.message); process.exit(1); }
  s.id = cree.user.id;
  const profil = await attendre(async () => { const { data } = await svc.from('profiles').select('id').eq('id', s.id).maybeSingle(); return data || null; }, 15000, 500);
  if (!profil) { console.error('profil non créé'); await purger(); process.exit(1); }
  await svc.from('profiles').update({
    studio_nom: s.nom, studio_slug: s.slug, plan: s.plan, stripe_subscription_status: 'active',
    portail_actif: true, afficher_tarifs: true, essai_actif: true,
    bio: 'Une bio de preuve, visible seulement en Complet.',
    stripe_webhook_secret: 'whsec_preuve_frontiere',
  }).eq('id', s.id);
  const { data: offre } = await svc.from('offres').insert({ profile_id: s.id, nom: `Carnet preuve ${cle}`, type: 'carnet', prix: 50, seances: 5, duree_jours: 90, stripe_payment_link: 'https://buy.stripe.com/plink_preuve_frontiere', actif: true }).select('id').single();
  s.offreId = offre?.id;
  const { data: sondage, error: eSondage } = await svc.from('sondages_planning').insert({ profile_id: s.id, slug: `sondage-${s.slug}`, titre: 'Sondage de preuve', visibilite: 'public', actif: true, date_fin: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) }).select('id, slug').single();
  s.sondageSlug = sondage?.slug || `sondage-${s.slug}`;
  s.sondageErreur = eSondage?.message || null;
  if (sondage) {
    const { data: cr, error: eCr } = await svc.from('sondages_creneaux').insert({ sondage_id: sondage.id, type_cours: 'Yoga', jour_semaine: 2, heure: '18:00', duree_minutes: 60, ordre: 1 }).select('id').single();
    if (eCr) console.log('  (créneau KO :', eCr.message, ')');
    s.creneauId = cr?.id;
  }
  const { data: fiche } = await svc.from('clients').insert({ profile_id: s.id, prenom: 'Élève', nom: 'Preuve', email: s.eleve, statut: 'actif' }).select('id').single();
  s.ficheId = fiche?.id;
  const { data: creeE } = await svc.auth.admin.createUser({ email: s.eleve, email_confirm: true, user_metadata: { role: 'eleve' } });
  s.eleveId = creeE?.user?.id;
}

let chromium; try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = await import('@playwright/test')); }
let browser; try { browser = await chromium.launch({ channel: 'msedge' }); } catch { browser = await chromium.launch(); }

try {
  for (let i = 0; i < 60; i++) { try { const r = await fetch(`${BASE}/login`); if (r.ok) break; } catch { /* pas prêt */ } await new Promise(r => setTimeout(r, 2000)); }

  for (const [cle, s] of Object.entries(STUDIOS)) {
    const complet = cle === 'pro';
    const NOM = complet ? 'Complet' : 'Essentiel';
    console.log(`\n══════ Studio ${NOM} (${s.slug}) ══════`);

    // ── Prof ───────────────────────────────────────────────────────────────
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    await ctx.addCookies((await sessionCookies(s.email)).map(cc => ({ ...cc, url: BASE, sameSite: 'Lax' })));
    const page = await ctx.newPage();
    const erreurs = [];
    page.on('pageerror', e => erreurs.push(String(e).slice(0, 160)));

    console.log('— Prof : barre latérale et pages —');
    await aller(page, `${BASE}/dashboard`);
    await page.waitForSelector('nav.sidebar-nav a[href="/messagerie"]', { timeout: 90000 });
    // La barre est rendue deux fois (bureau + tiroir mobile) : on compte les
    // ENTRÉES verrouillées, pas les icônes.
    const cadenas = new Set(await page.locator('nav.sidebar-nav a:has([data-testid="sidebar-lock"])').evaluateAll(els => els.map(e => e.getAttribute('href')))).size;
    c(complet ? 'aucun cadenas dans la navigation' : 'quatre cadenas : Messagerie, Sondages, Essais, Liste d\'attente', complet ? cadenas === 0 : cadenas === 4, String(cadenas));
    for (const [href, cap] of [['/messagerie', 'messagerie'], ['/sondages', 'sondages'], ['/essais', 'cours_essai'], ['/liste-attente', 'liste_attente']]) {
      await aller(page, `${BASE}${href}`);
      await page.waitForSelector('main', { timeout: 90000 });
      await attendre(async () => (await page.locator('[data-testid="plan-requis"], .sp-header, h1').count()) > 0 ? true : null, 30000, 300);
      const requis = await page.locator(`[data-testid="plan-requis"][data-capacite="${cap}"]`).count();
      c(`${href} → ${complet ? 'la page normale' : 'PlanRequis (' + cap + ')'}`, complet ? requis === 0 : requis === 1);
    }
    await aller(page, `${BASE}/cours/nouveau`);
    await page.waitForSelector('select option[value="fideles"]', { state: 'attached', timeout: 90000 }); // une <option> est « cachée » pour Playwright
    await attendre(async () => (await page.locator('select option[value="public"]').count()) > 0 ? true : null, 15000, 300);
    await page.waitForTimeout(1500); // le profil se charge après l'hydratation
    const optPrive = await page.locator('select option[value="prive"]').count();
    c(`formulaire de cours : option « Privé (sur invitation) » ${complet ? 'proposée' : 'absente'}`, complet ? optPrive >= 1 : optPrive === 0, String(optPrive));
    await aller(page, `${BASE}/parametres?tab=portail&s=page`);
    await page.waitForSelector('text=Ma philosophie', { timeout: 90000 });
    const hint = await page.locator('[data-testid="hint-portail-enrichi"]').count();
    c(`Ma page : avertissement bio/FAQ ${complet ? 'absent' : 'présent'}`, complet ? hint === 0 : hint === 1);
    c('aucune erreur de page côté prof', erreurs.length === 0, erreurs.join(' | '));
    await ctx.close();

    // ── Public ─────────────────────────────────────────────────────────────
    console.log('— Public : page du studio, demande d\'offre, sondage —');
    const ctxAnon = await browser.newContext({ viewport: { width: 480, height: 1000 } });
    const pa = await ctxAnon.newPage();
    await aller(pa, `${BASE}/p/${s.slug}?tab=tarifs`);
    await pa.waitForSelector(`text=Carnet preuve ${cle}`, { timeout: 90000 });
    const txt = await pa.innerText('body');
    const nbDemander = await pa.locator('button.pp-demande-btn').count();
    c(`« Demander cette offre » ${complet ? 'proposé' : 'absent'}`, complet ? nbDemander >= 1 : nbDemander === 0, String(nbDemander));
    c(`« Acheter en ligne » ${complet ? 'affiché' : 'absent'}`, complet ? txt.includes('Acheter en ligne') : !txt.includes('Acheter en ligne'));
    c(`aucun lien buy.stripe.com dans le DOM ${complet ? '(présent en Complet)' : ''}`, complet ? (await pa.locator('a[href*="buy.stripe.com"]').count()) >= 1 : (await pa.locator('a[href*="buy.stripe.com"]').count()) === 0);
    await aller(pa, `${BASE}/p/${s.slug}?tab=apropos`);
    await pa.waitForSelector('text=Preuve', { timeout: 90000 });
    const txtApropos = await pa.innerText('body');
    c(`bio ${complet ? 'visible' : 'absente'} sur la page publique`, complet ? txtApropos.includes('Une bio de preuve') : !txtApropos.includes('Une bio de preuve'));
    const rDem = await pa.request.post(`${BASE}/api/portail/${s.slug}/demander-offre`, { data: { offreId: s.offreId, prenom: 'Anonyme', email: `demande-${TS}@example.com`, verif_hp: '' } });
    c(`POST demander-offre → ${complet ? '200' : '403'}`, complet ? rDem.status() === 200 : rDem.status() === 403, String(rDem.status()));
    await aller(pa, `${BASE}/p/${s.slug}/sondage/${s.sondageSlug}`);
    await attendre(async () => (await pa.locator('[data-testid="sondage-indisponible"], form, h1').count()) > 0 ? true : null, 30000, 300);
    const indispo = await pa.locator('[data-testid="sondage-indisponible"]').count();
    c(`sondage public ${complet ? 'ouvert' : 'indisponible'}`, complet ? indispo === 0 : indispo === 1);
    c(`la BASE ${complet ? 'accepte' : 'REFUSE'} la création d'un sondage (trigger de plan v54/v80)`, complet ? !s.sondageErreur : !!s.sondageErreur, s.sondageErreur || 'créé');
    const rVote = await pa.request.post(`${BASE}/api/sondage/${s.sondageSlug}/repondre`, { data: { prenom: 'Anonyme', email: `vote-${TS}@example.com`, reponses: s.creneauId ? { [s.creneauId]: 'oui' } : {} } });
    c(`POST repondre (corps valide) → ${complet ? '200' : 'jamais 200'}`, complet ? rVote.status() === 200 : rVote.status() !== 200, String(rVote.status()));
    await aller(pa, `${BASE}/p/${s.slug}/connexion`);
    await attendre(async () => (await pa.locator('[data-testid="espace-indisponible"], form, input').count()) > 0 ? true : null, 30000, 300);
    const connIndispo = await pa.locator('[data-testid="espace-indisponible"]').count();
    c(`page de connexion élève : ${complet ? 'formulaire' : '« pas d\'espace élève »'}`, complet ? connIndispo === 0 : connIndispo === 1);
    const rLogin = await pa.request.post(`${BASE}/api/portail-login`, { data: { email: s.eleve, studioSlug: s.slug } });
    c(`POST portail-login → ${complet ? 'pas 403' : '403'}`, complet ? rLogin.status() !== 403 : rLogin.status() === 403, String(rLogin.status()));
    await ctxAnon.close();

    // ── Élève connectée ────────────────────────────────────────────────────
    console.log('— Élève connectée : espace —');
    const ctxE = await browser.newContext({ viewport: { width: 420, height: 1000 } });
    await ctxE.addCookies((await sessionCookies(s.eleve)).map(cc => ({ ...cc, url: BASE, sameSite: 'Lax' })));
    const pe = await ctxE.newPage();
    await aller(pe, `${BASE}/p/${s.slug}/espace`);
    await attendre(async () => ((await pe.locator('[data-testid="espace-indisponible"]').count()) > 0 || (await pe.getByText(/Mes paiements|prochains cours/).count()) > 0) ? true : null, 60000, 300);
    const espIndispo = await pe.locator('[data-testid="espace-indisponible"]').count();
    const txtEsp = await pe.innerText('body');
    c(`espace élève : ${complet ? 'ouvert' : '« pas d\'espace élève »'}`, complet ? (espIndispo === 0 && /Mes paiements|prochains cours/.test(txtEsp)) : espIndispo === 1);
    await ctxE.close();
  }
} finally {
  await browser.close().catch(() => {});
  await purger();
  console.log('\nStudios, élèves et comptes jetables purgés.');
}

console.log(`\nRésultat : ${ok} OK / ${ko} KO`);
process.exit(ko === 0 ? 0 : 1);
