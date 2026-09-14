/**
 * Preuve — « Hors les murs » (v118), CHEMIN RÉEL : la page admin et la route
 * PATCH avec une session ADMIN réelle contre le dev server :3333. Re-runnable,
 * témoin purgé même en cas d'échec. Auto-adaptative :
 *   - table absente (pré-migration) : phase A, le dégradé honnête (la liste et
 *     la fiche se rendent, chaque geste répond 503 MIGRATION_V118_REQUISE) ;
 *   - table présente : phase B, le parcours complet de Maude sur une piste
 *     (enregistrer un texte retouché, refus d'un texte qui casse une règle,
 *     demande de modif → EN BASE + un email RÉEL à bonjour@izisolo.fr, valider,
 *     marquer envoyé, réponse, en cours, écarter, remettre, historique).
 *
 * ⚠️ Phase B : la demande de modif envoie UN email réel à bonjour@izisolo.fr
 * (c'est le chemin réel, et c'est chez nous).
 *
 * Usage : node scripts/proof-hors-les-murs.mjs   (dev server sur :3333 lancé)
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LIEUX } from '../content/hors-les-murs.js';
import { SIGNATURE } from '../lib/hors-les-murs.js';

const ROOT = process.cwd();
const BASE = process.env.PROOF_BASE || 'http://localhost:3333';
const ADMIN_EMAIL = 'admin@melutek.fr'; // allowlist lib/admin.js

const env = Object.fromEntries(
  readFileSync(join(ROOT, '.env.local'), 'utf8')
    .split('\n').filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const PROJECT_REF = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

let ok = 0, ko = 0;
const assert = (cond, label) => { if (cond) { ok++; console.log(`  ✅ ${label}`); } else { ko++; console.log(`  ❌ ${label}`); } };
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

async function cookieAdmin(email) {
  const { data: linkData, error: eLink } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (eLink) throw new Error(`generateLink(${email}): ${eLink.message}`);
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: otpData, error: eOtp } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: linkData.properties.hashed_token });
  if (eOtp || !otpData?.session) throw new Error(`verifyOtp(${email}): ${eOtp?.message || 'pas de session'}`);
  const value = 'base64-' + Buffer.from(JSON.stringify(otpData.session)).toString('base64url');
  const nom = `sb-${PROJECT_REF}-auth-token`;
  if (value.length <= 3180) return `${nom}=${value}`;
  const parts = [];
  for (let i = 0; i * 3180 < value.length; i++) parts.push(`${nom}.${i}=${value.slice(i * 3180, (i + 1) * 3180)}`);
  return parts.join('; ');
}

for (let i = 0; i < 60; i++) {
  try { const r = await fetch(`${BASE}/login`); if (r.ok) break; } catch { /* pas prêt */ }
  await attendre(2000);
  if (i === 59) { console.error('dev server injoignable'); process.exit(1); }
}
console.log('🌐 dev server prêt');

let adminCree = false;
{
  const { data: page } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existant = (page?.users || []).find((u) => (u.email || '').toLowerCase() === ADMIN_EMAIL);
  if (!existant) {
    const { error } = await admin.auth.admin.createUser({ email: ADMIN_EMAIL, password: `preuve-${Date.now()}-Aa!`, email_confirm: true, user_metadata: { role: 'eleve' } });
    if (error) { console.error('création admin jetable :', error.message); process.exit(1); }
    adminCree = true;
  }
}
const cookie = await cookieAdmin(ADMIN_EMAIL);
const appel = async (url, body, avecSession = true) => {
  const res = await fetch(`${BASE}${url}`, { method: 'PATCH', redirect: 'manual', headers: { 'Content-Type': 'application/json', ...(avecSession ? { Cookie: cookie } : {}) }, body: JSON.stringify(body) });
  let json = null; try { json = await res.json(); } catch { /* pas de JSON */ }
  return { status: res.status, json };
};
const page = async (url, avecSession = true) => {
  const res = await fetch(`${BASE}${url}`, { redirect: 'manual', headers: avecSession ? { Cookie: cookie } : {} });
  return { status: res.status, html: await res.text().catch(() => '') };
};

// La table est-elle là ? Une sonde lit une vraie ligne (un HEAD sur une table absente répond 204).
let tableLa = true;
{ const { error } = await admin.from('hlm_suivi').select('id').limit(1); if (error) tableLa = false; }
console.log(tableLa ? '📦 v118 appliquée : phase B (parcours complet)' : '📦 v118 absente : phase A (dégradé honnête)');

// Le témoin : une piste du catalogue à priorité 3 (jamais la grotte), dont le suivi est purgé avant et après.
const temoin = LIEUX.find((l) => l.prio === 3 && l.destinataire?.email) || LIEUX[LIEUX.length - 1];
const purger = async () => { if (tableLa) await admin.from('hlm_suivi').delete().eq('id', temoin.id); };
await purger();
const url = `/api/admin/hors-les-murs/${temoin.id}`;
const corpsRetouche = temoin.email.corps.replace('Bonjour', 'Bonjour à vous');
const corpsCasse = temoin.email.corps.replace(SIGNATURE, 'Maude — à bientôt [prénom]');

try {
  console.log(`\n— Témoin : ${temoin.nom} (${temoin.id})`);
  console.log('\n— Accès');
  {
    const r = await appel(url, { action: 'valider' }, false);
    assert([401, 403, 307].includes(r.status), `anonyme refusé sur la route (${r.status})`);
    const p = await page('/admin/hors-les-murs', false);
    assert([302, 307, 401].includes(p.status), `page admin refusée sans session (${p.status})`);
  }

  console.log('\n— Les pages se rendent');
  {
    const l = await page('/admin/hors-les-murs');
    assert(l.status === 200, 'la liste se rend (200)');
    assert(l.html.includes('Hors les murs') && l.html.includes(temoin.nom.slice(0, 20)), 'la liste montre le catalogue');
    const f = await page(`/admin/hors-les-murs/${temoin.id}`);
    assert(f.status === 200, 'la fiche se rend (200)');
    assert(f.html.includes(temoin.projet.titre.slice(0, 20)) && (f.html.includes('Envoyer depuis ma boîte') || f.html.includes('Copier l')), 'la fiche montre le projet et le bouton d’envoi ou de copie');
    const inconnu = await page('/admin/hors-les-murs/piste-inventee-zz');
    assert(inconnu.status === 404, `un id inventé rend 404 (${inconnu.status})`);
    const g = await page('/admin/guides/hors-les-murs');
    assert(g.status === 200 && g.html.includes('Envoyer depuis ma boîte'), 'le guide admin se rend');
  }

  if (!tableLa) {
    console.log('\n— Phase A : sans la table');
    const l = await page('/admin/hors-les-murs');
    assert(/v118/.test(l.html), 'la liste dit que v118 manque');
    for (const body of [{ action: 'valider' }, { action: 'enregistrer', objet: temoin.email.objet, corps: corpsRetouche }, { action: 'demander_modif', commentaire: 'preuve : trop long' }, { action: 'ecarter', motif: 'trop_loin' }]) {
      const r = await appel(url, body);
      assert(r.status === 503 && r.json?.code === 'MIGRATION_V118_REQUISE', `${body.action} : 503 MIGRATION_V118_REQUISE (${r.status} ${r.json?.code})`);
    }
    const t = await appel(url, { action: 'valider', objet: temoin.email.objet, corps: corpsCasse });
    assert(t.status === 422 || t.status === 503, `un texte cassé est refusé avant tout (${t.status})`);
  } else {
    console.log('\n— Phase B : le parcours de Maude');
    const t = await appel(url, { action: 'valider', objet: temoin.email.objet, corps: corpsCasse });
    assert(t.status === 422 && /crochet|quadratin|signature/.test(t.json?.error || ''), `un texte qui casse une règle est refusé avec la raison (${t.status})`);
    const { data: rien } = await admin.from('hlm_suivi').select('id').eq('id', temoin.id);
    assert((rien || []).length === 0, 'et rien n’a été écrit');

    const e = await appel(url, { action: 'enregistrer', objet: temoin.email.objet, corps: corpsRetouche });
    assert(e.status === 200 && e.json?.fiche?.statut === 'a_relire' && e.json?.fiche?.texteModifie === true, `texte retouché enregistré, statut inchangé (${e.status})`);
    const { data: enBase } = await admin.from('hlm_suivi').select('statut, objet, corps').eq('id', temoin.id).maybeSingle();
    assert(enBase?.corps === corpsRetouche && enBase?.objet === null, 'EN BASE : le corps retouché, l’objet identique au catalogue non recopié');

    const m = await appel(url, { action: 'demander_modif', commentaire: 'preuve automatique : raccourcir le deuxième paragraphe' });
    assert(m.status === 200 && m.json?.fiche?.statut === 'modif_demandee', `demande de modif → statut (${m.status})`);
    assert(m.json?.notification === 'envoyee', `email à bonjour@izisolo.fr parti (${m.json?.notification})`);
    const mCourt = await appel(url, { action: 'demander_modif', commentaire: 'ok' });
    assert(mCourt.status === 400, 'un commentaire trop court est refusé');

    const v = await appel(url, { action: 'valider', objet: temoin.email.objet, corps: corpsRetouche });
    assert(v.status === 200 && v.json?.fiche?.statut === 'valide', `valider → prêt à partir (${v.status})`);
    const rep0 = await appel(url, { action: 'reponse', reponse: 'trop tôt' });
    assert(rep0.status === 409, 'une réponse avant envoi est refusée (409)');

    const env1 = await appel(url, { action: 'marquer_envoye' });
    assert(env1.status === 200 && env1.json?.fiche?.statut === 'envoye' && env1.json?.fiche?.envoye_at, `marquer envoyé → date posée (${env1.status})`);
    const rep = await appel(url, { action: 'reponse', reponse: 'OK pour un repérage jeudi' });
    assert(rep.status === 200 && rep.json?.fiche?.statut === 'repondu' && rep.json?.fiche?.reponse === 'OK pour un repérage jeudi', 'réponse notée');
    const ec = await appel(url, { action: 'en_cours' });
    assert(ec.status === 200 && ec.json?.fiche?.statut === 'en_cours', 'en cours');
    const eca = await appel(url, { action: 'ecarter', motif: 'pas_le_moment' });
    assert(eca.status === 200 && eca.json?.fiche?.statut === 'ecarte' && eca.json?.fiche?.motif_ecart === 'pas_le_moment', 'écartée avec son motif');
    const bloque = await appel(url, { action: 'valider' });
    assert(bloque.status === 409, 'une piste écartée ne bouge plus (409)');
    const rem = await appel(url, { action: 'remettre' });
    assert(rem.status === 200 && rem.json?.fiche?.statut === 'a_relire' && rem.json?.fiche?.motif_ecart === null, 'remise dans la liste');
    assert((rem.json?.fiche?.historique || []).length >= 8, `l’historique garde chaque geste (${(rem.json?.fiche?.historique || []).length})`);
    const inconnu = await appel('/api/admin/hors-les-murs/piste-inventee-zz', { action: 'valider' });
    assert(inconnu.status === 404, 'un id inventé répond 404');
    const f = await page(`/admin/hors-les-murs/${temoin.id}`);
    assert(f.status === 200 && f.html.includes('Bonjour à vous'), 'la fiche rend le texte retouché');
  }
} catch (e) {
  ko++; console.log('  ❌ exception :', e.message);
} finally {
  await purger();
  if (adminCree) await admin.auth.admin.deleteUser((await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })).data.users.find((u) => u.email === ADMIN_EMAIL)?.id).catch(() => {});
}
console.log(`\n${ok} OK, ${ko} KO`);
process.exit(ko ? 1 : 0);
