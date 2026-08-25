/**
 * Preuve — le pays d'un studio (v105, 2026-08-25).
 *
 * Déclencheur : Melyflow, prof de yoga à Genly (Belgique), inscrite le
 * 2026-08-25. « La fonction facturation n'est pas adaptée pour moi. »
 * Elle n'était pas bloquée : elle était mal accueillie. L'app lui affichait
 * « SIRET : 14 chiffres » EN ROUGE sous son numéro d'entreprise valide, et
 * imprimait « SIRET » sur ses factures belges.
 *
 * Ce qu'on prouve, dans l'ordre :
 *   A. Le sélecteur de pays existe et propose les trois pays servis.
 *   B. Choisir la Belgique renomme le champ à l'écran : « Numéro
 *      d'entreprise », plus « SIRET ».
 *   C. LE test de Melyflow : son numéro belge est ACCEPTÉ (aucun rouge).
 *   D. Un numéro faux est signalé — on n'a pas remplacé un mensonge par un
 *      laxisme.
 *   E. Aucune mention fiscale n'est pré-remplie hors de France (le champ
 *      reste VIDE, la suggestion vit dans le placeholder).
 *   F. Le bloc « Ma déclaration URSSAF » DISPARAÎT des Paramètres, et
 *      revient en repassant en France.
 *   G. (post-migration) Le pays est enregistré EN BASE.
 *   H. (post-migration) /revenus n'affiche plus le bloc de déclaration, et
 *      la page de déclaration REFUSE en expliquant pourquoi.
 *   I. (post-migration) LA conséquence réelle : une facture émise porte
 *      « Numéro d'entreprise » dans son snapshot, le numéro belge mis en
 *      forme, et AUCUNE mention de l'article 293 B du CGI français.
 *   J. Ménage : pays, numéro et mention restaurés, facture témoin annulée,
 *      fiche et paiement jetables purgés — MÊME en cas d'échec.
 *
 * Auto-adaptatif : sans la migration v105, les phases A→F tournent quand
 * même (l'écran dégrade proprement) et G→I sont annoncées comme ignorées.
 *
 * Usage : node scripts/proof-pays.mjs
 * Prérequis : dev server sur :3333.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { construireSnapshot } from '../lib/factures.js';

const ROOT = process.cwd();
const PORT = 3333;
const PROF_EMAIL = 'bonjour@melutek.com';
const NUM_BE = '0202239951';      // un numéro d'entreprise belge public, valide
const NUM_BE_FAUX = '0202239950'; // même numéro, clé de contrôle fausse

const env = Object.fromEntries(
  readFileSync(join(ROOT, '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const PROJECT_REF = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];

let ok = 0, ko = 0;
const check = (cond, label, detail = '') => {
  if (cond) { ok++; console.log(`  OK  ${label}${detail ? ` — ${detail}` : ''}`); }
  else { ko++; console.log(`  KO  ${label}${detail ? ` — ${detail}` : ''}`); }
};
const attendre = ms => new Promise(r => setTimeout(r, ms));

for (let i = 0; i < 90; i++) {
  try { const r = await fetch(`http://localhost:${PORT}/login`); if (r.ok) break; } catch { /* pas prêt */ }
  await attendre(2000);
  if (i === 89) { console.error(`dev server injoignable sur :${PORT}`); process.exit(1); }
}
console.log('dev server pret\n');

const { data: { users } } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
const prof = (users || []).find(u => u.email === PROF_EMAIL);
if (!prof) { console.error(`compte démo ${PROF_EMAIL} introuvable`); process.exit(1); }

// ⚠️ Le select PRINCIPAL ne nomme JAMAIS la colonne neuve : une colonne
// absente rend `data` null et le script entier tombe sur « Cannot read
// properties of null ». Règle §12 — cette famille de preuves y est déjà
// tombée une fois (v104).
const { data: profil } = await admin
  .from('profiles')
  .select('studio_nom, facturation_siret, facturation_raison_sociale, facturation_mention_tva')
  .eq('id', prof.id).single();

// Sonde v105, en requête SÉPARÉE.
const sonde = await admin.from('profiles').select('pays').eq('id', prof.id).maybeSingle();
const V105 = !sonde.error;
const ETAT_INITIAL = {
  pays: V105 ? (sonde.data?.pays ?? 'FR') : null,
  facturation_siret: profil.facturation_siret ?? null,
  facturation_mention_tva: profil.facturation_mention_tva ?? null,
};
console.log(`studio « ${profil.studio_nom} »`);
console.log(V105
  ? '── v105 appliquée : parcours COMPLET ──\n'
  : `── v105 absente (${sonde.error.code}) : parcours DÉGRADÉ (A→F) ──\n`);

const poserPays = async (code) => {
  if (!V105) return;
  const { error } = await admin.from('profiles').update({ pays: code }).eq('id', prof.id);
  if (error) throw new Error(`pays=${code} : ${error.message} (migration v105 appliquée ?)`);
};
const poserNumero = async (n) => {
  const { error } = await admin.from('profiles')
    .update({ facturation_siret: n, facturation_mention_tva: null }).eq('id', prof.id);
  if (error) throw new Error(`numéro : ${error.message}`);
};

async function sessionCookies(email) {
  const { data: linkData, error: eLink } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (eLink) throw new Error(`generateLink(${email}): ${eLink.message}`);
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: otp, error: eOtp } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: linkData.properties.hashed_token });
  if (eOtp || !otp?.session) throw new Error(`verifyOtp(${email}): ${eOtp?.message || 'pas de session'}`);
  const value = 'base64-' + Buffer.from(JSON.stringify(otp.session)).toString('base64url');
  const nom = `sb-${PROJECT_REF}-auth-token`;
  const cookies = [];
  if (value.length <= 3180) cookies.push({ name: nom, value });
  else for (let i = 0; i * 3180 < value.length; i++) cookies.push({ name: `${nom}.${i}`, value: value.slice(i * 3180, (i + 1) * 3180) });
  return cookies.map(c => ({ ...c, domain: 'localhost', path: '/' }));
}

const texte = async (page) => page.evaluate(() => document.body.innerText);
const naviguer = async (page, url) => {
  for (let i = 0; i < 3; i++) {
    try { await page.goto(url, { waitUntil: 'domcontentloaded' }); return; }
    catch (e) { if (i === 2) throw e; await attendre(1200); }
  }
};

/** Ouvre Paramètres → Profil & studio → Activité (là où vit la Facturation). */
async function ouvrirActivite(page) {
  await naviguer(page, `http://localhost:${PORT}/parametres?tab=profil&s=activite`);
  await page.waitForSelector('text=Facturation', { timeout: 20000 });
  await attendre(700); // hydratation : le select ne réagit pas avant
}

let browser, factureTemoin = null, ficheTemoin = null, paiementTemoin = null;
try {
  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch { ({ chromium } = await import('@playwright/test')); }
  try { browser = await chromium.launch(); }
  catch { browser = await chromium.launch({ channel: 'msedge' }); }

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addCookies(await sessionCookies(PROF_EMAIL));
  const page = await ctx.newPage();
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(String(e)));

  // ══ A. Le sélecteur de pays ═══════════════════════════════════════════════
  console.log('A. Le pays est un CHOIX, pas une supposition');
  await poserPays('FR');
  await poserNumero(null);
  await ouvrirActivite(page);
  const optionsPays = await page.evaluate(() => {
    const sel = [...document.querySelectorAll('select')]
      .find(s => [...s.options].some(o => /France/.test(o.textContent)));
    return sel ? [...sel.options].map(o => o.textContent.trim()) : [];
  });
  check(optionsPays.length === 3, 'trois pays proposés', optionsPays.join(' · ') || 'aucun');
  check(optionsPays.some(o => /Belgique/.test(o)), 'la Belgique est servie');
  check(!optionsPays.some(o => /Suisse/.test(o)), 'la Suisse est ABSENTE (le franc est un chantier à part)');

  const libelleNumero = () => page.evaluate(() => {
    const l = [...document.querySelectorAll('label')]
      .find(x => /SIRET|Numéro d'entreprise|Numéro RCS/.test(x.textContent));
    return l ? l.textContent.trim() : '';
  });
  check((await libelleNumero()) === 'SIRET', 'en France, le champ s\'appelle toujours SIRET');

  // ══ B+C+D+E. La Belgique, à l'écran ══════════════════════════════════════
  console.log('\nB→E. Ce que voit Melyflow quand elle choisit la Belgique');
  await page.evaluate(() => {
    const sel = [...document.querySelectorAll('select')]
      .find(s => [...s.options].some(o => /France/.test(o.textContent)));
    const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
    setter.call(sel, 'BE');
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await attendre(400);
  check((await libelleNumero()) === "Numéro d'entreprise",
    'le champ se renomme « Numéro d\'entreprise »', await libelleNumero());

  const champNumero = () => page.evaluate(() => {
    const l = [...document.querySelectorAll('label')]
      .find(x => /SIRET|Numéro d'entreprise|Numéro RCS/.test(x.textContent));
    return l?.parentElement?.querySelector('input') ? true : false;
  });
  check(await champNumero(), 'le champ existe toujours (rien n\'a disparu au passage)');

  const saisirNumero = async (v) => {
    await page.evaluate((val) => {
      const l = [...document.querySelectorAll('label')]
        .find(x => /SIRET|Numéro d'entreprise|Numéro RCS/.test(x.textContent));
      const input = l.parentElement.querySelector('input');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, val);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }, v);
    await attendre(350);
    return page.evaluate(() => {
      const l = [...document.querySelectorAll('label')]
        .find(x => /SIRET|Numéro d'entreprise|Numéro RCS/.test(x.textContent));
      const hints = [...l.parentElement.querySelectorAll('.form-hint')];
      // ⚠️ Piège de PREUVE : React pose la couleur par le CSSOM, donc
      // getAttribute('style') rend « color: rgb(220, 38, 38) » et jamais le
      // « #dc2626 » écrit dans le code. Chercher le hex ne trouve RIEN et la
      // preuve échoue sur elle-même. Le seul juge honnête est la couleur
      // CALCULÉE (même leçon que le contraste de v99).
      const estRouge = (h) => {
        const [r, g, b] = (getComputedStyle(h).color.match(/\d+/g) || []).map(Number);
        return r > 150 && g < 90 && b < 90;
      };
      const rouge = hints.find(estRouge);
      return { rouge: rouge ? rouge.textContent.trim() : null, tous: hints.map(h => h.textContent.trim()) };
    });
  };

  const bon = await saisirNumero(NUM_BE);
  check(bon.rouge === null,
    'LE test de Melyflow : son numéro belge est ACCEPTÉ', bon.rouge || 'aucun message rouge');

  const faux = await saisirNumero(NUM_BE_FAUX);
  check(!!faux.rouge, 'un numéro faux reste SIGNALÉ', faux.rouge || 'rien');
  check(faux.rouge && !/SIRET/.test(faux.rouge),
    'et le message ne parle plus de SIRET', faux.rouge);

  const corps = await texte(page);
  check(/vérifie la formulation exacte auprès de ton comptable/i.test(corps),
    'la mention fiscale renvoie à son comptable, on n\'invente rien');
  const mentionValeur = await page.evaluate(() => {
    const l = [...document.querySelectorAll('label')].find(x => /Mention TVA/.test(x.textContent));
    const i = l?.parentElement?.querySelector('input');
    return { valeur: i?.value ?? null, placeholder: i?.placeholder ?? null };
  });
  check(mentionValeur.valeur === '', 'le champ Mention TVA reste VIDE en Belgique',
    JSON.stringify(mentionValeur.valeur));
  check(!!mentionValeur.placeholder && !/293 B|CGI/.test(mentionValeur.placeholder),
    'la suggestion ne cite aucun article de loi française', mentionValeur.placeholder);

  // ══ F. L'URSSAF s'éteint ══════════════════════════════════════════════════
  console.log('\nF. Le bloc URSSAF n\'existe que là où il a un sens');
  check(!/Ma déclaration URSSAF/.test(corps),
    'la carte « Ma déclaration URSSAF » disparaît en Belgique');
  check(/appelle tes cotisations/.test(corps),
    'et l\'écran DIT qui appelle ses cotisations à la place');

  await page.evaluate(() => {
    const sel = [...document.querySelectorAll('select')]
      .find(s => [...s.options].some(o => /France/.test(o.textContent)));
    const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
    setter.call(sel, 'FR');
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await attendre(400);
  check(/Ma déclaration URSSAF/.test(await texte(page)),
    'elle revient en repassant en France (rien n\'est perdu)');

  if (!V105) {
    console.log('\n⏭  G→I ignorées : la migration v105 n\'est pas appliquée.');
  } else {
    // ══ G. La vérité en base ════════════════════════════════════════════════
    console.log('\nG. Le pays s\'enregistre RÉELLEMENT');
    await poserPays('BE');
    const relu = await admin.from('profiles').select('pays').eq('id', prof.id).maybeSingle();
    check(relu.data?.pays === 'BE', 'pays = BE en base', String(relu.data?.pays));

    // ══ H. Les conséquences côté Revenus ════════════════════════════════════
    console.log('\nH. Revenus ne réclame plus une déclaration qui n\'existe pas');
    await naviguer(page, `http://localhost:${PORT}/revenus`);
    await page.waitForSelector('text=Revenus', { timeout: 20000 });
    await attendre(900);
    const revenus = await texte(page);
    check(!/Ma déclaration URSSAF/.test(revenus), 'le bloc de déclaration est absent de /revenus');
    check(/Export|Encaiss/i.test(revenus), 'mais la page Revenus, elle, fonctionne normalement');

    const annee = new Date().getFullYear();
    await naviguer(page, `http://localhost:${PORT}/revenus/declaration/T3-${annee}`);
    await attendre(900);
    const decl = await texte(page);
    check(/Pas de déclaration à faire ici/.test(decl), 'la page de déclaration REFUSE');
    check(/Belgique/.test(decl) && /caisse d'assurances sociales/.test(decl),
      'et elle explique pourquoi, en nommant qui appelle les cotisations');
    check(/Retour à mes revenus/.test(decl), 'avec une sortie utile, jamais un cul-de-sac');

    // ══ I. LA conséquence réelle : la facture ═══════════════════════════════
    console.log('\nI. La facture belge porte le bon libellé');
    await poserNumero(NUM_BE);

    const { data: fiche, error: eFiche } = await admin.from('clients').insert({
      profile_id: prof.id, prenom: 'Preuve', nom: 'PaysBE',
      email: `preuve-pays-${Date.now()}@example.com`, statut: 'actif',
    }).select('id, prenom, nom, email').single();
    if (eFiche) throw new Error(`fiche témoin : ${eFiche.message}`);
    ficheTemoin = fiche.id;

    const { data: paiement, error: ePaie } = await admin.from('paiements').insert({
      profile_id: prof.id, client_id: fiche.id, montant: 42, statut: 'paid',
      mode: 'virement', date: new Date().toISOString().slice(0, 10),
      date_encaissement: new Date().toISOString().slice(0, 10),
      intitule: 'Preuve v105 — cours belge',
    }).select('id, montant, statut, date, date_encaissement, intitule, mode').single();
    if (ePaie) throw new Error(`paiement témoin : ${ePaie.message}`);
    paiementTemoin = paiement.id;

    const { data: facturation } = await admin.from('profiles')
      .select('facturation_siret, facturation_raison_sociale, facturation_mention_tva, pays')
      .eq('id', prof.id).single();
    const { data: profilComplet } = await admin.from('profiles')
      .select('studio_nom, ville, adresse, email_contact, telephone').eq('id', prof.id).single();

    const snapshot = construireSnapshot({
      profile: profilComplet, facturation, client: fiche, paiements: [paiement],
    });
    const { data: emise, error: eEmise } = await admin.rpc('emettre_facture', {
      p_profile_id: prof.id, p_client_id: fiche.id,
      p_paiement_ids: [paiement.id], p_snapshot: snapshot,
    });
    if (eEmise) throw new Error(`emettre_facture : ${eEmise.message}`);
    check(emise?.ok === true, 'facture émise', emise?.numero_affiche || JSON.stringify(emise));
    factureTemoin = emise?.facture_id || null;

    // ⚠️ On relit en BASE, pas l'objet qu'on vient de construire : c'est le
    // document figé qui sera re-servi à l'élève dans six mois.
    const { data: enBase } = await admin.from('factures')
      .select('snapshot').eq('id', factureTemoin).single();
    const em = enBase?.snapshot?.emetteur || {};
    check(em.identifiant_label === "Numéro d'entreprise",
      'le snapshot FIGÉ porte « Numéro d\'entreprise »', String(em.identifiant_label));
    check(em.identifiant_affiche === '0202.239.951',
      'le numéro est mis en forme à la belge', String(em.identifiant_affiche));
    check(em.pays === 'BE', 'et le pays voyage avec le document', String(em.pays));
    check(!/293 B|CGI|URSSAF/.test(JSON.stringify(enBase?.snapshot || {})),
      'AUCUNE mention fiscale française n\'a été inventée sur une facture belge');
  }

  check(erreurs.length === 0, 'console navigateur propre', erreurs.slice(0, 2).join(' | ') || 'aucune erreur');

} catch (e) {
  ko++;
  console.log(`\n  KO  exception : ${e.message}`);
} finally {
  // ══ J. Ménage — MÊME en cas d'échec ═══════════════════════════════════════
  console.log('\nJ. Ménage');
  try {
    if (factureTemoin) {
      const { error } = await admin.rpc('annuler_facture', { p_profile_id: prof.id, p_facture_id: factureTemoin });
      console.log(error ? `  ⚠️ facture témoin non annulée : ${error.message}` : '  facture témoin annulée');
    }
    if (paiementTemoin) await admin.from('paiements').delete().eq('id', paiementTemoin);
    if (ficheTemoin) await admin.from('clients').delete().eq('id', ficheTemoin);
    const restauration = {
      facturation_siret: ETAT_INITIAL.facturation_siret,
      facturation_mention_tva: ETAT_INITIAL.facturation_mention_tva,
    };
    if (V105) restauration.pays = ETAT_INITIAL.pays;
    await admin.from('profiles').update(restauration).eq('id', prof.id);
    const verif = await admin.from('profiles').select('facturation_siret').eq('id', prof.id).maybeSingle();
    console.log(`  réglages restaurés (numéro : ${verif.data?.facturation_siret ?? 'vide'})`);
  } catch (e) {
    console.log(`  ⚠️ ménage incomplet : ${e.message}`);
  }
  if (browser) await browser.close();
}

console.log(`\n${ok}/${ok + ko} — ${ko === 0 ? '✅ tout est vert' : `❌ ${ko} échec(s)`}`);
process.exit(ko === 0 ? 0 : 1);
