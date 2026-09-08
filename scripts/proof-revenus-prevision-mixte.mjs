/**
 * Preuve : « À percevoir » (Revenus) ne compte plus une séance « à la séance »
 * pour une inscrite dont un carnet ou un abonnement actif couvre un cours MIXTE
 * (retour Maude + Colin, 2026-09-07 : abonnements annuels « à régler plus
 * tard » ET toutes leurs séances de la saison comptées, semaine après semaine).
 *
 * Vrai navigateur (dev :3333), session prof démo, sur le démo Atelier Soleil :
 *   1. un cours à venir du démo passe MIXTE (tarif 20 €, carnets acceptés),
 *      trois inscriptions témoins : Élise (Carnet 10 séances actif, couvre tout),
 *      une élève SANS carnet actif, et Élise sur un atelier PUR déjà existant ;
 *   2. la page Revenus : Élise n'apparaît PAS pour le cours mixte, l'élève sans
 *      carnet oui, Élise sur l'atelier pur oui ; le total « à encaisser » =
 *      paiements en attente + séances réellement dues, au centime.
 * Cours et inscriptions restaurés à la fin, même en cas d'échec. Re-runnable.
 * Usage : node scripts/proof-revenus-prevision-mixte.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const BASE = process.env.PROOF_BASE || 'http://localhost:3333';
const EMAIL = 'camille@atelier-soleil.fr';
const P = '17a6194a-87e6-47e2-ac31-c6224cd78f44';
const REF = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
let ok = 0, ko = 0;
const check = (c, label, detail = '') => { if (c) { ok++; console.log(`  ✅ ${label}`); } else { ko++; console.log(`  ❌ ${label}${detail ? ' : ' + detail : ''}`); } };
const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });

// Session démo → cookies
const { data: l } = await admin.auth.admin.generateLink({ type: 'magiclink', email: EMAIL });
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: o } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: l.properties.hashed_token });
const value = 'base64-' + Buffer.from(JSON.stringify(o.session)).toString('base64url');
const name = `sb-${REF}-auth-token`;
const cookies = value.length <= 3180 ? [{ name, value }] : Array.from({ length: Math.ceil(value.length / 3180) }, (_, i) => ({ name: `${name}.${i}`, value: value.slice(i * 3180, (i + 1) * 3180) }));

// Témoins : un cours à venir SANS tarif (série Mat), Élise (carnet actif), une élève sans carnet.
const { data: cours } = await admin.from('cours').select('id, nom, date, type_cours, tarif_unitaire, carnets_acceptes')
  .eq('profile_id', P).eq('est_annule', false).gt('date', today).is('tarif_unitaire', null).eq('type_cours', 'Mat').order('date').limit(1).single();
const { data: elise } = await admin.from('clients').select('id, prenom, nom').eq('profile_id', P).ilike('prenom', 'Élise').limit(1).single();
const { data: abosElise } = await admin.from('abonnements').select('id, offre_nom, types_cours_autorises').eq('client_id', elise.id).eq('statut', 'actif');
const { data: actifs } = await admin.from('abonnements').select('client_id').eq('profile_id', P).eq('statut', 'actif');
const avecAbo = new Set((actifs || []).map(a => a.client_id));
const { data: tous } = await admin.from('clients').select('id, prenom, nom, statut').eq('profile_id', P).neq('statut', 'archive').order('prenom');
const sans = (tous || []).find(c => !avecAbo.has(c.id) && c.id !== elise.id && !/enfant|^(Nino|Maë|Léonie|Jade|Suzanne)$/.test(c.prenom));
if (!cours || !elise || !abosElise?.length || !sans) { console.error('témoins introuvables (lancer le refresh du démo)', { cours: !!cours, elise: !!elise, abos: abosElise?.length, sans: !!sans }); process.exit(1); }
const { data: atelier } = await admin.from('cours').select('id, nom, date, tarif_unitaire').eq('profile_id', P).eq('est_annule', false).gt('date', today).gt('tarif_unitaire', 0).eq('carnets_acceptes', false).order('date').limit(1).single();
console.log(`Cours mixte témoin : ${cours.nom} du ${cours.date} · Élise (${abosElise[0].offre_nom}) · sans carnet : ${sans.prenom} ${sans.nom} · atelier pur : ${atelier?.nom} ${atelier?.tarif_unitaire} €`);

const idsPres = [];
const restaurer = async () => {
  if (idsPres.length) await admin.from('presences').delete().in('id', idsPres);
  await admin.from('cours').update({ tarif_unitaire: null, carnets_acceptes: false }).eq('id', cours.id);
};
let browser;
try {
  const { error: eC } = await admin.from('cours').update({ tarif_unitaire: 20, carnets_acceptes: true }).eq('id', cours.id);
  if (eC) throw new Error('cours : ' + eC.message);
  const inscrire = async (clientId, coursId) => {
    const { data: deja } = await admin.from('presences').select('id').eq('cours_id', coursId).eq('client_id', clientId).maybeSingle();
    if (deja) return null;
    const { data, error } = await admin.from('presences').insert({ profile_id: P, client_id: clientId, cours_id: coursId, statut_pointage: 'inscrit' }).select('id').single();
    if (error) throw new Error('presence : ' + error.message);
    idsPres.push(data.id);
    return data.id;
  };
  await inscrire(elise.id, cours.id);
  await inscrire(sans.id, cours.id);
  const surAtelier = atelier ? await inscrire(elise.id, atelier.id) : null;

  // Attendu, calculé en base : paiements en attente + séances dues (hors mixte couvert).
  const { data: pend } = await admin.from('paiements').select('montant').eq('profile_id', P).in('statut', ['pending', 'overdue']);
  const attendPaiements = (pend || []).reduce((s, p) => s + Number(p.montant || 0), 0);

  browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'fr-FR' });
  await ctx.addCookies(cookies.map(c => ({ ...c, url: BASE, sameSite: 'Lax' })));
  const page = await ctx.newPage();
  await page.goto(`${BASE}/revenus`, { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForTimeout(1500);
  const toutAfficher = page.getByRole('button', { name: /Tout afficher/ });
  if (await toutAfficher.count()) { await toutAfficher.first().click(); await page.waitForTimeout(400); }
  const bloc = await page.evaluate(() => {
    const t = document.body.innerText; const i = t.indexOf('À percevoir'); const j = t.indexOf('Mode :', i);
    return i >= 0 ? t.slice(i, j > i ? j : i + 6000) : '';
  });
  const lignes = bloc.split('\n');
  const ligneMixteElise = lignes.find(x => x.includes(elise.prenom) && x.includes(cours.nom) && x.includes('à la séance'));
  const ligneMixteSans = lignes.find(x => x.includes(sans.prenom) && x.includes(cours.nom) && x.includes('à la séance'));
  const ligneAtelierElise = atelier ? lignes.find(x => x.includes(elise.prenom) && x.includes(atelier.nom)) : null;

  console.log('\nPage Revenus, bloc « À percevoir »');
  check(bloc.length > 0, 'le bloc est rendu');
  check(!ligneMixteElise, `Élise n'est PAS comptée « à la séance » sur le cours mixte (son carnet le couvre)`, ligneMixteElise);
  check(!!ligneMixteSans, `${sans.prenom} (sans carnet) EST comptée 20 € sur le cours mixte`, 'ligne absente');
  if (atelier && surAtelier) check(!!ligneAtelierElise, `Élise reste due sur l'atelier PUR (${atelier.tarif_unitaire} €)`, 'ligne absente');

  // Le total « à encaisser » = paiements en attente + séances réellement dues.
  const { data: presDues } = await admin.from('presences').select('id, client_id, statut_pointage, type_presence, cours:cours_id!inner(id, date, type_cours, tarif_unitaire, carnets_acceptes)')
    .eq('profile_id', P).gt('cours.tarif_unitaire', 0).eq('cours.est_annule', false).gte('cours.date', today);
  const { data: abosTous } = await admin.from('abonnements').select('client_id, statut, seances_total, seances_utilisees, date_fin, date_pause_debut, date_pause_fin, types_cours_autorises').eq('profile_id', P).eq('statut', 'actif');
  const { resoudreCarnetApplicable } = await import('../lib/carnet-resolution.js').catch(() => ({ resoudreCarnetApplicable: null }));
  if (resoudreCarnetApplicable) {
    const { data: lies } = await admin.from('paiements').select('presence_id, statut').eq('profile_id', P).not('presence_id', 'is', null);
    const couvertes = new Set((lies || []).filter(x => ['paid', 'pending', 'overdue'].includes(x.statut)).map(x => x.presence_id));
    const dues = (presDues || []).filter(p => (p.type_presence || 'normal') === 'normal' && !['absent', 'excuse', 'annule', 'declinee'].includes(p.statut_pointage) && !couvertes.has(p.id)
      && !(p.cours.carnets_acceptes === true && resoudreCarnetApplicable((abosTous || []).filter(a => a.client_id === p.client_id), p.cours)));
    const attendu = attendPaiements + dues.reduce((s, p) => s + Number(p.cours.tarif_unitaire), 0);
    const affiche = (bloc.match(/À percevoir\s*\n\s*([\d\s]+(?:,\d+)?)\s*€/) || [])[1];
    const montant = affiche ? Number(affiche.replace(/\s/g, '').replace(',', '.')) : NaN;
    check(Math.abs(montant - attendu) < 0.01, `total « À percevoir » = ${attendu} € (paiements en attente + séances vraiment dues)`, `affiché ${montant}`);
  } else {
    console.log('  (miroir carnet-resolution non importable ici : total non recalculé)');
  }
} catch (e) {
  ko++; console.log('❌ ' + e.message);
} finally {
  if (browser) await browser.close();
  await restaurer();
  const { data: c } = await admin.from('cours').select('tarif_unitaire, carnets_acceptes').eq('id', cours.id).single();
  console.log(`\nMénage : cours témoin restauré (tarif ${c?.tarif_unitaire}, mixte ${c?.carnets_acceptes}), ${idsPres.length} inscription(s) témoin retirée(s).`);
}
console.log(`\n${ok} OK, ${ko} KO`);
process.exit(ko ? 1 : 0);
