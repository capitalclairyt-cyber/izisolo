/**
 * Preuve — le module /admin/prospection (v109), CHEMIN RÉEL (routes HTTP avec
 * une session ADMIN réelle, contre le dev server :3333). Re-runnable, témoins
 * purgés même en cas d'échec. Auto-adaptatif :
 *   - table absente (pré-migration) : phase A, le dégradé honnête ;
 *   - table présente : phase B, le parcours complet (tirage, brouillon,
 *     refus des crochets, refus du domaine de test, écart, remise dans la
 *     pile, réponse, relance, envoi PROGRAMMÉ puis ANNULÉ chez Resend).
 *
 * ⚠️ Phase B : un email est PROGRAMMÉ vers bonjour@izisolo.fr (à +4 min)
 * puis ANNULÉ via l'API Resend avant de partir. Si l'annulation échouait, un
 * email nous arriverait à nous-mêmes : jamais à une prof.
 *
 * Usage : node scripts/proof-prospection.mjs   (dev server sur :3333 lancé)
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const BASE = process.env.PROOF_BASE || 'http://localhost:3333';
const ADMIN_EMAIL = 'admin@melutek.fr';       // allowlist lib/admin.js
const MARQUE = 'zz-preuve-prospection';

const env = Object.fromEntries(
  readFileSync(join(ROOT, '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const PROJECT_REF = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

let ok = 0, ko = 0;
const assert = (cond, label) => { if (cond) { ok++; console.log(`  ✅ ${label}`); } else { ko++; console.log(`  ❌ ${label}`); } };
const attendre = ms => new Promise(r => setTimeout(r, ms));

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

// Compte admin jetable : emprunté s'il existe, créé sinon et purgé à la fin.
let adminCree = false;
{
  const { data: page } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existant = (page?.users || []).find(u => (u.email || '').toLowerCase() === ADMIN_EMAIL);
  if (!existant) {
    const { error } = await admin.auth.admin.createUser({ email: ADMIN_EMAIL, password: `preuve-${Date.now()}-Aa!`, email_confirm: true, user_metadata: { role: 'eleve' } });
    if (error) { console.error('création admin jetable :', error.message); process.exit(1); }
    adminCree = true;
  }
}
const cookie = await cookieAdmin(ADMIN_EMAIL);
const appel = async (url, body, methode = 'PATCH', avecSession = true) => {
  const res = await fetch(`${BASE}${url}`, {
    method: methode, redirect: 'manual',
    headers: { 'Content-Type': 'application/json', ...(avecSession ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  });
  let json = null; try { json = await res.json(); } catch { /* pas de JSON */ }
  return { status: res.status, json };
};
const page = async (url, avecSession = true) => {
  const res = await fetch(`${BASE}${url}`, { redirect: 'manual', headers: avecSession ? { Cookie: cookie } : {} });
  return { status: res.status, html: await res.text().catch(() => '') };
};

// La table est-elle là ? ⚠️ Un HEAD (count, head:true) sur une table ABSENTE
// répond 204 sans erreur : la sonde doit lire une vraie ligne (constaté ici
// même, 2026-09-12 : la preuve croyait v109 appliquée et tombait en phase B).
let tableLa = true;
{
  const { error } = await admin.from('prospects').select('id').limit(1);
  if (error) tableLa = false;
}
console.log(tableLa ? '📦 v109 appliquée : phase B (parcours complet)' : '📦 v109 absente : phase A (dégradé honnête)');

const TEXTE_OK = "Bonjour Zoé,\n\nJ'ai vu ton Vinyasa du mardi à Nantes, et tes deux forfaits.\n\nTes créneaux se remplissent ?\n\nTu m'envoies ton planning et tes tarifs, ici ou sur izisolo.fr/creer-mon-studio, et je te monte ton studio gratuitement sous 48 h.\n\nBelle rentrée,\nMaude";

try {
  console.log('\n— Accès');
  {
    const r = await appel('/api/admin/prospection/tirage', { n: 1 }, 'POST', false);
    assert(r.status === 401 || r.status === 403 || r.status === 307, `anonyme refusé sur le tirage (${r.status})`);
    const p = await page('/admin/prospection', false);
    assert(p.status === 307 || p.status === 302 || p.status === 401, `page admin refusée sans session (${p.status})`);
  }

  if (!tableLa) {
    console.log('\n— Phase A : sans la table');
    const p = await page('/admin/prospection');
    assert(p.status === 200, 'la page admin se rend (200)');
    assert(/v109/.test(p.html), 'elle dit que v109 manque');
    const t = await appel('/api/admin/prospection/tirage', { n: 1 }, 'POST');
    assert(t.status === 503 && t.json?.code === 'MIGRATION_V109_REQUISE', `tirage : 503 MIGRATION_V109_REQUISE (${t.status} ${t.json?.code})`);
    const a = await appel('/api/admin/prospection/ajouter', { nom: `${MARQUE} Zoé`, email: `${MARQUE}-a@example.com`, source: 'site' }, 'POST');
    assert(a.status === 503 && a.json?.code === 'MIGRATION_V109_REQUISE', `ajouter : 503 honnête (${a.status} ${a.json?.code})`);
  } else {
    console.log('\n— Phase B : ajouter une prof à la main');
    const a = await appel('/api/admin/prospection/ajouter', { nom: `${MARQUE} Zoé`, email: `${MARQUE}-a@example.com`, ville: 'Nantes', site: 'www.zoe-yoga.fr', source: 'site' }, 'POST');
    assert(a.status === 200 && a.json?.prospect?.statut === 'en_cours', `fiche créée « à rédiger » (${a.status})`);
    assert(a.json?.email?.statut === 'brouillon' && /\[/.test(a.json?.email?.corps || ''), 'brouillon gabarit créé, avec ses crochets');
    const prospectA = a.json.prospect; const emailA = a.json.email;
    const { data: enBase } = await admin.from('prospects').select('statut, email').eq('id', prospectA.id).maybeSingle();
    assert(enBase?.statut === 'en_cours' && enBase.email === `${MARQUE}-a@example.com`, 'constaté EN BASE');
    const a2 = await appel('/api/admin/prospection/ajouter', { nom: 'Doublon', email: `${MARQUE.toUpperCase()}-A@example.com`, source: 'site' }, 'POST');
    assert(a2.status === 409 && a2.json?.code === 'DEJA_LA', `la même adresse, casse différente → 409 DEJA_LA (${a2.status})`);
    const a3 = await appel('/api/admin/prospection/ajouter', { nom: 'Suisse', email: `${MARQUE}-ch@example.com`, ville: 'Genève', source: 'site' }, 'POST');
    assert(a3.status === 400 && a3.json?.code === 'INELIGIBLE', `Genève refusée (${a3.status} ${a3.json?.error})`);

    console.log('\n— Le gabarit tel quel ne part pas');
    const e1 = await appel(`/api/admin/prospection/emails/${emailA.id}`, { action: 'envoyer' });
    assert(e1.status === 400 && e1.json?.code === 'TEXTE' && /crochet/.test(e1.json.error || ''), `envoi refusé : crochets (${e1.json?.error})`);
    const s1 = await appel(`/api/admin/prospection/emails/${emailA.id}`, { action: 'enregistrer', objet: 'ton mardi soir', corps: TEXTE_OK });
    assert(s1.status === 200 && s1.json?.email?.corps === TEXTE_OK, 'texte enregistré');
    const e2 = await appel(`/api/admin/prospection/emails/${emailA.id}`, { action: 'envoyer' });
    assert(e2.status === 400 && e2.json?.code === 'DOMAINE_TEST', `domaine de test refusé, rien ne part (${e2.json?.code})`);
    const { data: em2 } = await admin.from('prospection_emails').select('statut, resend_id').eq('id', emailA.id).maybeSingle();
    assert(em2?.statut === 'brouillon' && !em2.resend_id, 'toujours brouillon en base, sans id Resend');
    const e3 = await appel(`/api/admin/prospection/emails/${emailA.id}`, { action: 'envoyer', a: '00:01' });
    assert(e3.status === 400 && (e3.json?.code === 'HEURE_PASSEE' || e3.json?.code === 'DOMAINE_TEST'), `heure passée ou domaine refusés avant tout envoi (${e3.json?.code})`);

    console.log('\n— Le tirage');
    const { data: pile } = await admin.from('prospects').insert([
      { nom: `${MARQUE} Pile 1`, email: `${MARQUE}-p1@example.com`, site: 'www.p1.fr', source: 'ify.fr', statut: 'a_contacter' },
      { nom: `${MARQUE} Pile 2`, email: `${MARQUE}-p2@example.com`, site: 'www.p2.fr', source: 'ify.fr', statut: 'a_contacter' },
    ]).select('id');
    assert(pile?.length === 2, 'deux profs témoins dans la pile');
    const t = await appel('/api/admin/prospection/tirage', { n: 1 }, 'POST');
    // Le tirage pioche dans TOUTE la pile (prod comprise) : on ne peut exiger
    // qu'une de nos deux témoins, seulement qu'UNE prof soit sortie, cohérente.
    assert(t.status === 200 && t.json?.tires?.length === 1, `tirage de 1 → 1 prof (${t.status})`);
    const tiree = t.json?.tires?.[0];
    if (tiree) {
      const { data: tb } = await admin.from('prospects').select('statut').eq('id', tiree.prospect.id).maybeSingle();
      assert(tb?.statut === 'en_cours' && tiree.email?.statut === 'brouillon', 'la prof tirée est « à rédiger » en base avec un brouillon');
      const rem = await appel(`/api/admin/prospection/prospects/${tiree.prospect.id}`, { action: 'remettre' });
      const { data: tb2 } = await admin.from('prospects').select('statut').eq('id', tiree.prospect.id).maybeSingle();
      const { count: nbB } = await admin.from('prospection_emails').select('id', { count: 'exact', head: true }).eq('prospect_id', tiree.prospect.id).eq('statut', 'brouillon');
      assert(rem.status === 200 && tb2?.statut === 'a_contacter' && nbB === 0, 'remise dans la pile : statut rendu, brouillon jeté');
    }

    console.log('\n— Écarter');
    const ec = await appel(`/api/admin/prospection/prospects/${prospectA.id}`, { action: 'ecarter', motif: 'pas_a_son_nom' });
    const { data: ecb } = await admin.from('prospects').select('statut, motif_ecart').eq('id', prospectA.id).maybeSingle();
    const { count: nbBA } = await admin.from('prospection_emails').select('id', { count: 'exact', head: true }).eq('prospect_id', prospectA.id);
    assert(ec.status === 200 && ecb?.statut === 'ecartee' && ecb.motif_ecart === 'pas_a_son_nom' && nbBA === 0, 'écartée avec motif, brouillon supprimé');
    const a4 = await appel('/api/admin/prospection/ajouter', { nom: 'Encore', email: `${MARQUE}-a@example.com`, source: 'site' }, 'POST');
    assert(a4.status === 409 && a4.json?.code === 'ECARTEE', `une écartée ne revient pas par la porte « ajouter » (${a4.status})`);
    const ecx = await appel(`/api/admin/prospection/prospects/${prospectA.id}`, { action: 'ecarter', motif: 'nimporte' });
    assert(ecx.status === 400, `motif inconnu refusé (${ecx.status})`);

    console.log('\n— Réponse et relance');
    const { data: pc } = await admin.from('prospects').insert({ nom: `${MARQUE} Contactée`, email: `${MARQUE}-c@example.com`, site: 'www.c.fr', source: 'ify.fr', statut: 'contactee' }).select('id').single();
    const ilYa7j = new Date(Date.now() - 7 * 86400000).toISOString();
    await admin.from('prospection_emails').insert({ prospect_id: pc.id, objet: 'x', corps: TEXTE_OK, statut: 'envoye', envoye_at: ilYa7j });
    const rl = await appel(`/api/admin/prospection/prospects/${pc.id}`, { action: 'relance' });
    assert(rl.status === 200 && rl.json?.email?.relance === true && /semaine dernière/.test(rl.json.email.corps), 'relance préparée (brouillon relance)');
    const rl2 = await appel(`/api/admin/prospection/prospects/${pc.id}`, { action: 'relance' });
    assert(rl2.status === 409 && rl2.json?.code === 'DEJA_RELANCEE', `deuxième relance refusée : jamais de troisième (${rl2.status})`);
    const rp = await appel(`/api/admin/prospection/prospects/${pc.id}`, { action: 'repondu' });
    const { data: rpb } = await admin.from('prospects').select('statut, repondu_at').eq('id', pc.id).maybeSingle();
    assert(rp.status === 200 && rpb?.statut === 'repondu' && rpb.repondu_at, 'a répondu : statut + date en base');
    const rn = await appel(`/api/admin/prospection/prospects/${pc.id}`, { action: 'non_repondu' });
    const { data: rnb } = await admin.from('prospects').select('statut, repondu_at').eq('id', pc.id).maybeSingle();
    assert(rn.status === 200 && rnb?.statut === 'contactee' && !rnb.repondu_at, 'erreur corrigée : redevient contactée');

    console.log('\n— Envoi programmé puis annulé (vers nous-mêmes)');
    const nous = await appel('/api/admin/prospection/ajouter', { nom: `${MARQUE} Nous`, email: 'bonjour@izisolo.fr', source: 'site' }, 'POST');
    assert(nous.status === 200, `fiche bonjour@izisolo.fr créée (${nous.status} ${nous.json?.error || ""})`);
    if (nous.status === 200) {
      const emailN = nous.json.email;
      await appel(`/api/admin/prospection/emails/${emailN.id}`, { action: 'enregistrer', objet: `${MARQUE} test programmé`, corps: TEXTE_OK });
      const dans4 = new Date(Date.now() + 4 * 60000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris', hour12: false });
      const pr = await appel(`/api/admin/prospection/emails/${emailN.id}`, { action: 'envoyer', a: dans4 });
      assert(pr.status === 200 && pr.json?.programme === true && pr.json.email?.statut === 'programme' && pr.json.email.resend_id, `programmé à ${dans4} (${pr.status} ${pr.json?.error || ""}) avec un id Resend`);
      const { data: pnb } = await admin.from('prospects').select('statut').eq('id', nous.json.prospect.id).maybeSingle();
      assert(pnb?.statut === 'contactee', 'la prof passe « contactée » dès la programmation');
      const an = await appel(`/api/admin/prospection/emails/${emailN.id}`, { action: 'annuler' });
      if (an.status === 502 && an.json?.code === 'RESEND_CLE_RESTREINTE') {
        // La clé du projet n'autorise que l'envoi : l'annulation est refusée
        // HONNÊTEMENT (statut inchangé), et l'email part vers nous-mêmes.
        const { data: enc } = await admin.from('prospection_emails').select('statut').eq('id', emailN.id).maybeSingle();
        assert(enc?.statut === 'programme', `clé d'envoi seul : annulation refusée avec la raison, l'email reste « programmé » (partira vers bonjour@izisolo.fr à ${dans4})`);
        console.log('  ⚠️  pour prouver l\'annulation, poser RESEND_API_KEY_GESTION (clé à accès complet) dans .env.local');
      } else {
        assert(an.status === 200 && an.json?.email?.statut === 'brouillon' && !an.json.email.resend_id, `annulé chez Resend, revenu en brouillon (${an.status} ${an.json?.error || ''})`);
        const { data: pnb2 } = await admin.from('prospects').select('statut').eq('id', nous.json.prospect.id).maybeSingle();
        assert(pnb2?.statut === 'en_cours', 'la prof redevient « à rédiger »');
        const an2 = await appel(`/api/admin/prospection/emails/${emailN.id}`, { action: 'annuler' });
        assert(an2.status === 409, `annuler un brouillon → 409 (${an2.status})`);
      }
    }

    console.log('\n— La page');
    const p = await page('/admin/prospection');
    assert(p.status === 200 && /Prospection/.test(p.html), 'la page se rend (200)');
    assert(p.html.includes(`${MARQUE} Contactée`), 'elle montre la prof contactée témoin');
  }
} catch (err) {
  ko++;
  console.error('💥 exception :', err);
} finally {
  // Purge : les fiches témoins (emails en cascade), y compris bonjour@izisolo.fr créée par la preuve.
  if (tableLa) {
    const { data: t } = await admin.from('prospects').select('id, email').or(`nom.ilike.${MARQUE}%,email.ilike.${MARQUE}%`);
    const ids = (t || []).map(x => x.id);
    if (ids.length) await admin.from('prospects').delete().in('id', ids);
    console.log(`\n🧹 ${ids.length} fiche(s) témoin(s) purgée(s)`);
  }
  if (adminCree) {
    const { data: page } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const u = (page?.users || []).find(x => (x.email || '').toLowerCase() === ADMIN_EMAIL);
    if (u) await admin.auth.admin.deleteUser(u.id);
  }
}
console.log(`\n${ko === 0 ? '🎉' : '💥'} ${ok} OK / ${ko} KO`);
process.exit(ko === 0 ? 0 : 1);
