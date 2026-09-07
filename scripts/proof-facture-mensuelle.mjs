/**
 * PREUVE — « une facture chaque mois » (v106 + versements mensuels, 2026-09-07).
 *
 * Retour Manon (Soleya) : « pour mes abonnements au mois, comment je fais
 * pour que ça leur génère automatiquement une facture chaque début de mois ?
 * Je n'arrive à générer qu'une facture pour le mois d'août. »
 *
 * Ce qu'on prouve, en vrai navigateur (dev :3333), session prof démo :
 *   A. Paramètres → carte Facturation : le réglage « Envoyer la facture à
 *      l'élève par email à chaque encaissement » — avec v106 il s'enregistre
 *      EN BASE, sans v106 il répond honnêtement 503 (jamais un faux « ok »).
 *   B. Fiche élève, abo « au mois » vendu en UN paiement (le cas Jessica) :
 *      « Encaisser un versement » reste proposé malgré « réglé ✓ », et
 *      « Programmer chaque mois » écrit N versements pending EN BASE, un par
 *      mois, jamais dans le mois déjà réglé, jamais après la fin de l'abo ;
 *      rejouer la route ne fabrique RIEN (dédup par mois).
 *   C. « Encaisser » le versement du mois → paid en base ; avec v106 + réglage
 *      actif : facture ÉMISE (factures_paiements) et email parti (claim
 *      emails_envoyes type facture_auto persistant).
 *   D. Tunnel de vente : « En plusieurs fois » → préréglage « Chaque mois
 *      jusqu'à la fin (12 mois) » → 55 €/mois → 12 lignes, total 660 € →
 *      vente : 1 paid + 11 pending EN BASE ; avec v106 : facture du 1er.
 *
 * Auto-adaptative (sonde v106). Re-runnable : témoins purgés et réglages
 * démo restaurés, même en échec. ⚠️ Avec v106 appliquée, envoie 1 à 2
 * emails RÉELS à bonjour@izisolo.fr (le témoin doit être délivrable pour
 * prouver l'envoi ; un @example.com est ignoré par le garde-fou RFC 2606).
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { genererVersementsMensuels, moisCouverts, premierMoisLibre, resumeVersements } from '../lib/versements-mensuels.js';

const BASE = process.env.PROOF_BASE || 'http://localhost:3333';
const EMAIL_TEMOIN = 'bonjour@izisolo.fr';

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
let derniereErreurClic = null;
const clicJusquA = async (bouton, effet, ms = 45000) => attendre(async () => {
  if (await effet()) return true;
  await bouton.click({ timeout: 3000 }).catch(e => { derniereErreurClic = String(e).slice(0, 200); });
  await new Promise(r => setTimeout(r, 900));
  return (await effet()) ? true : null;
}, ms, 300);
const iso = d => d.toLocaleDateString('sv-SE');
const plusJours = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

const { data: demo } = await svc.from('profiles')
  .select('id, studio_slug, studio_nom, facturation_siret, facturation_raison_sociale, facturation_mention_tva')
  .eq('studio_slug', 'atelier-soleil').single();
if (!demo) { console.error('Démo introuvable'); process.exit(1); }

// ── Sonde v106 ─────────────────────────────────────────────────────────────
let V106 = true;
let autoAvant = null;
{
  const { data, error } = await svc.from('profiles').select('facturation_auto').eq('id', demo.id).maybeSingle();
  if (error && (['42703', 'PGRST204', 'PGRST205'].includes(error.code) || /facturation_auto/.test(error.message || ''))) V106 = false;
  else autoAvant = data?.facturation_auto === true;
}
console.log(`migration v106 : ${V106 ? 'APPLIQUEE (phase complète)' : 'ABSENTE (phase dégradée — relance après application)'}`);

const factuAvant = {
  facturation_siret: demo.facturation_siret,
  facturation_raison_sociale: demo.facturation_raison_sociale,
  facturation_mention_tva: demo.facturation_mention_tva,
};

// Garde : la fiche témoin ne doit pas préexister (on ne purge que ce qu'on a créé).
{
  const { data: deja } = await svc.from('clients').select('id, created_at').eq('profile_id', demo.id).ilike('email', EMAIL_TEMOIN);
  if ((deja || []).length) {
    const { data: pays } = await svc.from('paiements').select('id').in('client_id', deja.map(x => x.id));
    const { data: fp } = await svc.from('factures_paiements').select('facture_id').in('paiement_id', (pays || []).map(p => p.id));
    console.log(`  (fiche témoin résiduelle d'un run précédent : ${deja.length}, ${(pays || []).length} paiement(s), ${(fp || []).length} facture(s) — purge)`);
  }
}

let fiche = null, offreTemoin = null;
async function purger() {
  const { data: fiches } = await svc.from('clients').select('id').eq('profile_id', demo.id).ilike('email', EMAIL_TEMOIN);
  for (const f of fiches || []) {
    const { data: pays } = await svc.from('paiements').select('id').eq('client_id', f.id);
    const ids = (pays || []).map(p => p.id);
    if (ids.length) {
      const { data: fp } = await svc.from('factures_paiements').select('facture_id').in('paiement_id', ids);
      const fids = [...new Set((fp || []).map(x => x.facture_id))];
      if (fids.length) await svc.from('factures').delete().in('id', fids);
    }
    await svc.from('factures').delete().eq('client_id', f.id);
    await svc.from('demandes_offre').delete().eq('client_id', f.id);
    await svc.from('paiements').delete().eq('client_id', f.id);
    await svc.from('abonnements').delete().eq('client_id', f.id);
    await svc.from('presences').delete().eq('client_id', f.id);
    await svc.from('clients').delete().eq('id', f.id);
  }
  await svc.from('emails_envoyes').delete().eq('type', 'facture_auto').eq('destinataire', EMAIL_TEMOIN);
  if (offreTemoin) { await svc.from('offres').delete().eq('id', offreTemoin.id); offreTemoin = null; }
  await svc.from('profiles').update(factuAvant).eq('id', demo.id);
  if (V106) await svc.from('profiles').update({ facturation_auto: autoAvant === true }).eq('id', demo.id);
}
await purger();

// ── Mise en place : le cas Jessica, en relatif à aujourd'hui ───────────────
// Abo de SAISON commencé il y a ~2 mois, fini dans ~10 mois, UN paiement de
// 55 € réglé le 1er du mois DERNIER. Aujourd'hui, ce mois-ci n'a rien.
const auj = new Date();
const moisCourant = iso(auj).slice(0, 7);
const moisDernier = (() => { const d = new Date(auj.getFullYear(), auj.getMonth() - 1, 1); return iso(d).slice(0, 7); })();
const aboDebut = iso(plusJours(auj, -70));
const aboFin = iso(plusJours(auj, 300));

await svc.from('profiles').update({
  facturation_siret: '73282932000074',
  facturation_raison_sociale: 'Studio Démo — preuve facture mensuelle',
  facturation_mention_tva: null,
}).eq('id', demo.id);

{
  const { data: f, error } = await svc.from('clients').insert({
    profile_id: demo.id, prenom: 'Jessica', nom: 'Témoin', email: EMAIL_TEMOIN, statut: 'actif',
  }).select('id').single();
  if (error) { console.error('fiche témoin KO:', error.message); process.exit(1); }
  fiche = f;
}
const { data: aboJ, error: eAbo } = await svc.from('abonnements').insert({
  profile_id: demo.id, client_id: fiche.id, offre_nom: 'Abonnement au mois (témoin)', type: 'abonnement',
  statut: 'actif', date_debut: aboDebut, date_fin: aboFin, seances_total: null,
}).select('id').single();
if (eAbo) { console.error('abo témoin KO:', eAbo.message); await purger(); process.exit(1); }
const { data: payJ, error: ePay } = await svc.from('paiements').insert({
  profile_id: demo.id, client_id: fiche.id, abonnement_id: aboJ.id, intitule: 'Abonnement au mois (témoin)', type: 'abonnement',
  montant: 55, statut: 'paid', mode: 'CB', date: `${moisDernier}-01`, date_encaissement: `${moisDernier}-01`,
}).select('id').single();
if (ePay) { console.error('paiement témoin KO:', ePay.message); await purger(); process.exit(1); }

// Offre témoin pour le tunnel : abo de saison sur 12 mois, prix du MOIS (55 €,
// comme celle de Manon). nbMoisOffre → 12.
{
  const { data: o, error } = await svc.from('offres').insert({
    profile_id: demo.id, nom: 'Abo au mois (témoin preuve)', type: 'abonnement', prix: 55,
    date_debut: aboDebut, date_fin: aboFin, actif: true,
  }).select('id, nom').single();
  if (error) { console.error('offre témoin KO:', error.message); await purger(); process.exit(1); }
  offreTemoin = o;
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

let chromium; try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = await import('@playwright/test')); }
let browser; try { browser = await chromium.launch({ channel: 'msedge' }); } catch { browser = await chromium.launch(); }

try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  await ctx.addCookies((await sessionCookies('camille@atelier-soleil.fr')).map(cc => ({ ...cc, url: BASE, sameSite: 'Lax' })));
  const page = await ctx.newPage();
  const erreursPage = [];
  page.on('pageerror', e => erreursPage.push(String(e).slice(0, 160)));

  // ── A. Le réglage dans Paramètres ────────────────────────────────────────
  console.log('\n— A. Paramètres : « envoyer la facture à chaque encaissement » —');
  await page.goto(`${BASE}/parametres?tab=profil&s=activite`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('text=Envoyer la facture à l\'élève par email', { timeout: 90000 });
  c('la case « Envoyer la facture à l\'élève par email à chaque encaissement » est rendue', true);
  const caseAuto = page.locator('label:has-text("Envoyer la facture à l\'élève par email") input[type=checkbox]');
  c('la case est active (SIRET renseigné)', await caseAuto.isEnabled());
  const [repReglage] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/profile/facturation-auto'), { timeout: 45000 }),
    caseAuto.click(),
  ]);
  const corpsReglage = await repReglage.json().catch(() => ({}));
  if (V106) {
    c('la route répond 200 et le réglage est EN BASE', repReglage.status() === 200 && corpsReglage.actif === true, `status ${repReglage.status()}`);
    const { data: p } = await svc.from('profiles').select('facturation_auto').eq('id', demo.id).maybeSingle();
    c('profiles.facturation_auto = true en base', p?.facturation_auto === true);
  } else {
    c('sans v106 : la route répond 503 MIGRATION_V106_REQUISE, jamais un faux « ok »', repReglage.status() === 503 && corpsReglage.code === 'MIGRATION_V106_REQUISE', `status ${repReglage.status()} · ${JSON.stringify(corpsReglage).slice(0, 200)}`);
    c('le message dit que les factures restent disponibles au clic', /restent disponibles au clic/.test(corpsReglage.error || ''));
  }

  // ── B. La fiche : « Programmer chaque mois » sur l'abo de Jessica ────────
  console.log('\n— B. Fiche élève : programmer un versement chaque mois —');
  await page.goto(`${BASE}/clients/${fiche.id}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('text=Abonnement au mois (témoin)', { timeout: 90000 });
  const titreAbo = page.locator('button.abo-nom-btn', { hasText: 'Abonnement au mois (témoin)' }).first();
  const detailOuvert = await clicJusquA(titreAbo, async () => (await page.getByRole('button', { name: 'Programmer chaque mois' }).count()) > 0);
  if (!detailOuvert) throw new Error('détail abo fermé: ' + derniereErreurClic);
  const txtDetail = await page.innerText('.abo-detail-sheet');
  c('l\'abo est « réglé ✓ » (55 € reçu, solde zéro : le cas exact de Jessica)', /réglé ✓/.test(txtDetail));
  c('« Encaisser un versement » est proposé MALGRÉ le solde à zéro', (await page.getByRole('button', { name: 'Encaisser un versement' }).count()) === 1);
  c('« Programmer chaque mois » est proposé', true);

  await page.getByRole('button', { name: 'Programmer chaque mois' }).click();
  await page.waitForSelector('[data-testid="apercu-mensuel"]', { timeout: 15000 });
  const montantPre = await page.locator('.modal-sheet input.montant-input').inputValue();
  c('le montant est prérempli avec le dernier versement (55)', montantPre === '55', montantPre);
  const moisPre = await page.locator('.modal-sheet input[type=month]').inputValue();
  c(`le mois de départ proposé est le mois COURANT (${moisCourant}), le mois dernier étant réglé`, moisPre === moisCourant, moisPre);

  // L'aperçu doit dire EXACTEMENT ce que la lib calcule (même source).
  const attendu = genererVersementsMensuels({
    montant: 55, jour: 1, debut: moisCourant, fin: aboFin,
    couverts: moisCouverts([{ statut: 'paid', date: `${moisDernier}-01`, date_encaissement: `${moisDernier}-01` }]),
  });
  const apercu = (await page.locator('[data-testid="apercu-mensuel"]').innerText()).trim();
  c(`l'aperçu dit « ${resumeVersements(attendu.versements, attendu.ignores)} »`, apercu === resumeVersements(attendu.versements, attendu.ignores), apercu);
  c('l\'aperçu ne compte AUCUN versement après la fin de l\'abo', attendu.versements.every(v => v.date <= aboFin) && attendu.versements.length >= 9);

  const [repProg] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/versements-mensuels') && r.request().method() === 'POST', { timeout: 45000 }),
    page.getByRole('button', { name: /Programmer \d+ versements?/ }).click(),
  ]);
  const corpsProg = await repProg.json().catch(() => ({}));
  c(`la route écrit ${attendu.versements.length} versements`, repProg.status() === 200 && corpsProg.count === attendu.versements.length, `status ${repProg.status()} count ${corpsProg.count}`);

  const { data: pend } = await svc.from('paiements').select('id, statut, date, montant, echeancier_id, abonnement_id, intitule')
    .eq('client_id', fiche.id).eq('statut', 'pending').order('date');
  c(`EN BASE : ${attendu.versements.length} paiements pending rattachés à l'abo`, (pend || []).length === attendu.versements.length && pend.every(p => p.abonnement_id === aboJ.id));
  c('tous datés du 1er du mois, montant 55, un seul échéancier partagé', (pend || []).every(p => /-01$/.test(p.date) && parseFloat(p.montant) === 55) && new Set((pend || []).map(p => p.echeancier_id)).size === 1 && pend?.[0]?.echeancier_id);
  c(`aucun versement dans le mois déjà réglé (${moisDernier}) ni après la fin (${aboFin})`, (pend || []).every(p => !p.date.startsWith(moisDernier) && p.date <= aboFin));
  c('le premier versement est celui de CE mois', pend?.[0]?.date === `${moisCourant}-01`);
  c('l\'intitulé dit « versement mensuel »', (pend || []).every(p => /versement mensuel/.test(p.intitule)));

  // Rejouer la route avec la session du navigateur : dédup par mois.
  const rejeu = await page.request.post(`${BASE}/api/abonnements/${aboJ.id}/versements-mensuels`, { data: { montant: 55, jour: 1, debut: moisCourant } });
  const corpsRejeu = await rejeu.json().catch(() => ({}));
  c('rejouer la route ne fabrique RIEN (count 0) et avoue les mois ignorés', rejeu.status() === 200 && corpsRejeu.count === 0 && (corpsRejeu.ignores || []).length === attendu.versements.length, JSON.stringify(corpsRejeu).slice(0, 120));
  const { count: nbApres } = await svc.from('paiements').select('id', { count: 'exact', head: true }).eq('client_id', fiche.id);
  c('le nombre de paiements en base n\'a pas bougé', nbApres === attendu.versements.length + 1, String(nbApres));

  // ── C. Encaisser le versement du mois → facture ──────────────────────────
  console.log('\n— C. Encaisser le versement du mois : la facture suit —');
  const premierPending = pend[0];
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('button.tab-btn:has-text("Paiements")', { timeout: 90000 });
  await page.locator('button.tab-btn:has-text("Paiements")').click();
  await page.waitForSelector('.paiement-fiche-item:has-text("versement mensuel")', { timeout: 30000 });
  // Les lignes sont triées par date décroissante : parmi les versements
  // encaissables, celui de CE mois est le dernier.
  const ligne = page.locator('.paiement-fiche-item').filter({ hasText: 'versement mensuel' }).filter({ has: page.locator('button.encaisser-btn-fiche') }).last();
  const btnEnc = ligne.locator('button.encaisser-btn-fiche');
  const modaleEnc = await clicJusquA(btnEnc, async () => (await page.locator('.modal-sheet .mode-btn').count()) > 0);
  if (!modaleEnc) throw new Error('modale Encaisser fermée: ' + derniereErreurClic);
  await page.locator('.modal-sheet .mode-btn', { hasText: 'Espèces' }).click();
  const [repEnc] = await Promise.all([
    page.waitForResponse(r => /\/api\/paiements\/[^/]+\/encaisser/.test(r.url()), { timeout: 45000 }),
    page.locator('.modal-sheet button.confirm-btn', { hasText: 'Encaisser' }).click(),
  ]);
  c('la route encaisser répond 200', repEnc.status() === 200, `status ${repEnc.status()}`);
  const idEncaisse = repEnc.url().match(/paiements\/([^/]+)\/encaisser/)?.[1];
  const payEnc = await attendre(async () => {
    const { data } = await svc.from('paiements').select('id, statut, mode, date_encaissement').eq('id', idEncaisse).maybeSingle();
    return data?.statut === 'paid' ? data : null;
  });
  c('EN BASE : le versement est paid, mode especes, daté d\'aujourd\'hui', !!payEnc && payEnc.mode === 'especes' && payEnc.date_encaissement === iso(auj), JSON.stringify(payEnc));
  c('c\'est bien un des versements programmés', (pend || []).some(p => p.id === idEncaisse), idEncaisse);

  if (V106) {
    const facture = await attendre(async () => {
      const { data } = await svc.from('factures_paiements').select('facture_id, facture:facture_id (numero_affiche, statut, client_id)').eq('paiement_id', idEncaisse).maybeSingle();
      return data?.facture?.statut === 'emise' ? data.facture : null;
    }, 40000);
    c('la facture est ÉMISE toute seule sur ce versement (numéro FAC-…)', !!facture && /^FAC-/.test(facture.numero_affiche || ''), facture?.numero_affiche);
    c('la facture porte la fiche témoin', facture?.client_id === fiche.id);
    const claim = await attendre(async () => {
      const { data } = await svc.from('emails_envoyes').select('id').eq('type', 'facture_auto').eq('destinataire', EMAIL_TEMOIN).eq('ref', `${demo.id}:${idEncaisse}`).maybeSingle();
      return data || null;
    }, 20000);
    c('l\'email est PARTI (claim facture_auto persistant, libéré seulement si l\'envoi échoue)', !!claim);
    // Un 2e passage (double appel) ne renvoie pas : le claim tient.
    const rejeuAuto = await page.request.post(`${BASE}/api/factures/auto`, { data: { paiementIds: [idEncaisse] } });
    await new Promise(r => setTimeout(r, 2500));
    const { count: nbClaims } = await svc.from('emails_envoyes').select('id', { count: 'exact', head: true }).eq('type', 'facture_auto').eq('destinataire', EMAIL_TEMOIN).eq('ref', `${demo.id}:${idEncaisse}`);
    const { count: nbFact } = await svc.from('factures_paiements').select('paiement_id', { count: 'exact', head: true }).eq('paiement_id', idEncaisse);
    c('rejouer /api/factures/auto : toujours 1 facture, 1 email (idempotent)', rejeuAuto.status() === 200 && nbClaims === 1 && nbFact === 1, `claims ${nbClaims} factures ${nbFact}`);
  } else {
    await new Promise(r => setTimeout(r, 2500));
    const { data: fp } = await svc.from('factures_paiements').select('facture_id').eq('paiement_id', idEncaisse);
    c('sans v106 : aucune facture n\'est émise toute seule (le réglage n\'existe pas encore)', (fp || []).length === 0);
    const { data: claims } = await svc.from('emails_envoyes').select('id').eq('type', 'facture_auto').eq('destinataire', EMAIL_TEMOIN);
    c('sans v106 : aucun email facture parti', (claims || []).length === 0);
  }

  // ── D. Le tunnel : « Chaque mois jusqu'à la fin (12 mois) » ─────────────
  console.log('\n— D. Tunnel de vente : préréglage « Chaque mois » —');
  await page.goto(`${BASE}/clients/${fiche.id}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('text=Abonnement au mois (témoin)', { timeout: 90000 });
  const btnAjouter = page.getByRole('button', { name: 'Ajouter une offre' }).first();
  const tunnelOuvert = await clicJusquA(btnAjouter, async () => (await page.locator('.modal-sheet').count()) > 0);
  if (!tunnelOuvert) throw new Error('tunnel fermé: ' + derniereErreurClic);
  await page.locator('.modal-sheet').getByText(offreTemoin.nom, { exact: false }).first().click();
  await page.waitForSelector('.modal-sheet >> text=Règlement', { timeout: 30000 });
  await page.getByRole('button', { name: 'En plusieurs fois' }).click();
  const chip = page.getByRole('button', { name: /Chaque mois jusqu'à la fin \(12 mois\)/ });
  c('le préréglage « Chaque mois jusqu\'à la fin (12 mois) » est proposé (offre de saison sur 12 mois)', (await chip.count()) === 1);
  await chip.click();
  const champMois = page.locator('.modal-sheet input[placeholder="Ex : 55"]');
  await champMois.fill('55');
  await page.waitForTimeout(400);
  const txtTunnel = await page.innerText('.modal-sheet');
  c('le hint dit « 12 versements de 55 € » et que le total devient 660 €', /12 versements de 55/.test(txtTunnel) && /660/.test(txtTunnel));
  const nbLignes = await page.locator('.modal-sheet .multi-v-row').count();
  c('12 lignes de versement sont remplies', nbLignes === 12, String(nbLignes));
  c('le total affiché est 660 € / 660 €', /Total\s*:\s*660[\s\S]{0,12}\/\s*660/.test(txtTunnel.replace(/ /g, ' ')) || /660,00 € \/ 660,00 €|660 € \/ 660 €/.test(txtTunnel.replace(/ /g, ' ')));
  // Le 1er versement est coché encaissé : son mode se DÉCLARE (leçon Kim).
  const selMode = page.locator('.modal-sheet .multi-v-row').first().locator('select');
  await selMode.selectOption('especes');
  const [repVente] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/factures/auto'), { timeout: 45000 }).catch(() => null),
    page.getByRole('button', { name: /Enregistrer l'échéancier/ }).click(),
  ]);
  const aboVente = await attendre(async () => {
    const { data } = await svc.from('abonnements').select('id').eq('client_id', fiche.id).eq('offre_id', offreTemoin.id).maybeSingle();
    return data || null;
  }, 30000);
  c('la vente est enregistrée (abonnement créé)', !!aboVente);
  const { data: paysVente } = await svc.from('paiements').select('id, statut, date, montant, echeancier_id').eq('abonnement_id', aboVente?.id || '00000000-0000-0000-0000-000000000000').order('date');
  c('EN BASE : 12 paiements, 1 paid + 11 pending, 55 € chacun, un seul échéancier', (paysVente || []).length === 12 && paysVente.filter(p => p.statut === 'paid').length === 1 && paysVente.every(p => parseFloat(p.montant) === 55) && new Set(paysVente.map(p => p.echeancier_id)).size === 1);
  c('le 1er est daté d\'aujourd\'hui, le 12e onze mois plus tard', paysVente?.[0]?.date === iso(auj) && paysVente?.[11]?.date?.slice(0, 7) === iso(new Date(auj.getFullYear(), auj.getMonth() + 11, 1)).slice(0, 7), `${paysVente?.[0]?.date} → ${paysVente?.[11]?.date}`);
  const payePremier = (paysVente || []).find(p => p.statut === 'paid');
  if (V106) {
    c('le tunnel a appelé /api/factures/auto après la vente', !!repVente && repVente.status() === 200, repVente ? `status ${repVente.status()}` : 'aucun appel');
    const fact2 = await attendre(async () => {
      const { data } = await svc.from('factures_paiements').select('facture:facture_id (numero_affiche, statut)').eq('paiement_id', payePremier?.id || '00000000-0000-0000-0000-000000000000').maybeSingle();
      return data?.facture?.statut === 'emise' ? data.facture : null;
    }, 40000);
    c('la facture du 1er versement est émise toute seule', !!fact2, fact2?.numero_affiche);
    const { data: fpPending } = await svc.from('factures_paiements').select('paiement_id').in('paiement_id', (paysVente || []).filter(p => p.statut !== 'paid').map(p => p.id));
    c('aucune facture sur les 11 versements à venir (une facture acquittée ne porte que du réglé)', (fpPending || []).length === 0);
  } else {
    c('sans v106 : le tunnel appelle /api/factures/auto et la route répond 200 sans rien émettre', !!repVente && repVente.status() === 200, repVente ? `status ${repVente.status()}` : 'aucun appel');
  }

  c('aucune erreur de page (pageerror) pendant le parcours', erreursPage.length === 0, erreursPage.join(' | '));
} finally {
  await browser.close().catch(() => {});
  await purger();
  console.log('\nTémoins purgés (fiche, abos, paiements, factures, offre) et réglages démo restaurés.');
}

console.log(`\nRésultat : ${ok} OK / ${ko} KO`);
process.exit(ko === 0 ? 0 : 1);
