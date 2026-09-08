/**
 * Preuve : valider une demande de cours d'essai APRÈS la séance (retour Maude,
 * feedback du 2026-09-07 : « doit pouvoir accepter après le cours »).
 *
 * Chemin réel, session du démo Atelier Soleil, route POST /api/admin/essais/[id]
 * du serveur local (PROOF_BASE, défaut http://localhost:3333) contre la base :
 *   1. une demande témoin sur une séance PASSÉE du démo ;
 *   2. « valider » sans rien dire → 409 code SEANCE_PASSEE, RIEN n'est écrit ;
 *   3. « valider » avec apresCoup → 200, fiche créée (prospect), inscription
 *      « essai » sur la séance passée, demande finalisée, réponse marquée
 *      apresCoup (donc aucun email de confirmation) ;
 *   4. une séance ANNULÉE reste refusée, même après coup.
 * Témoins purgés à la fin, même en cas d'échec. Re-runnable.
 * Usage : node scripts/proof-essai-apres-coup.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const BASE = process.env.PROOF_BASE || 'http://localhost:3333';
const EMAIL = 'camille@atelier-soleil.fr';
const PROFILE_ID = '17a6194a-87e6-47e2-ac31-c6224cd78f44';
const TEMOIN_EMAIL = 'temoin.essai.apres-coup@example.com';
const REF = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

let ok = 0, ko = 0;
const check = (cond, label, detail = '') => { if (cond) { ok++; console.log(`  ✅ ${label}`); } else { ko++; console.log(`  ❌ ${label}${detail ? ' : ' + detail : ''}`); } };

// Session démo → cookie
const { data: l } = await admin.auth.admin.generateLink({ type: 'magiclink', email: EMAIL });
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: o, error: eOtp } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: l.properties.hashed_token });
if (eOtp) { console.error(eOtp.message); process.exit(1); }
const value = 'base64-' + Buffer.from(JSON.stringify(o.session)).toString('base64url');
const name = `sb-${REF}-auth-token`;
const cookies = value.length <= 3180 ? [[name, value]] : Array.from({ length: Math.ceil(value.length / 3180) }, (_, i) => [`${name}.${i}`, value.slice(i * 3180, (i + 1) * 3180)]);
const COOKIE = cookies.map(([n, v]) => `${n}=${v}`).join('; ');
const poster = (id, body) => fetch(`${BASE}/api/admin/essais/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: COOKIE }, body: JSON.stringify(body) })
  .then(async r => ({ status: r.status, json: await r.json().catch(() => ({})) }));

const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
const purger = async () => {
  const { data: fiches } = await admin.from('clients').select('id').eq('profile_id', PROFILE_ID).ilike('email', TEMOIN_EMAIL);
  for (const f of fiches || []) {
    await admin.from('presences').delete().eq('client_id', f.id);
    await admin.from('cours_essai_demandes').delete().eq('client_id', f.id);
    await admin.from('clients').delete().eq('id', f.id);
  }
  await admin.from('cours_essai_demandes').delete().eq('profile_id', PROFILE_ID).ilike('email', TEMOIN_EMAIL);
};
await purger();

try {
  // Une séance PASSÉE, non annulée, avec de la place (ou sans capacité).
  const { data: passes } = await admin.from('cours').select('id, nom, date, heure, capacite_max, est_annule')
    .eq('profile_id', PROFILE_ID).lt('date', today).eq('est_annule', false).order('date', { ascending: false }).limit(10);
  let seance = null;
  for (const c of passes || []) {
    if (c.capacite_max == null) { seance = c; break; }
    const { count } = await admin.from('presences').select('id', { count: 'exact', head: true }).eq('cours_id', c.id).not('statut_pointage', 'in', '("annule","declinee")');
    if ((count || 0) < c.capacite_max) { seance = c; break; }
  }
  if (!seance) throw new Error('aucune séance passée avec de la place sur le démo (lancer le refresh)');
  console.log(`Séance témoin : ${seance.nom} du ${seance.date} (${seance.id.slice(0, 8)})`);

  const { data: demande, error: eD } = await admin.from('cours_essai_demandes').insert({
    profile_id: PROFILE_ID, cours_id: seance.id, prenom: 'Témoin', nom: 'AprèsCoup', email: TEMOIN_EMAIL, statut: 'en_attente',
  }).select('id').single();
  if (eD) throw new Error('insert demande : ' + eD.message);

  console.log('\n1. Valider sans le dire → refus explicite, rien d\'écrit');
  const r1 = await poster(demande.id, { action: 'valider' });
  check(r1.status === 409, 'répond 409', `status ${r1.status} ${JSON.stringify(r1.json).slice(0, 120)}`);
  check(r1.json.code === 'SEANCE_PASSEE', 'code SEANCE_PASSEE', r1.json.code);
  const { count: fichesAvant } = await admin.from('clients').select('id', { count: 'exact', head: true }).eq('profile_id', PROFILE_ID).ilike('email', TEMOIN_EMAIL);
  check((fichesAvant || 0) === 0, 'aucune fiche créée par le refus');
  const { data: d1 } = await admin.from('cours_essai_demandes').select('statut').eq('id', demande.id).single();
  check(d1?.statut === 'en_attente', 'la demande reste en attente', d1?.statut);

  console.log('\n2. Valider après coup → fiche, inscription essai sur la séance passée, sans email');
  const r2 = await poster(demande.id, { action: 'valider', apresCoup: true });
  check(r2.status === 200 && r2.json.ok === true, 'répond 200 ok', `status ${r2.status} ${JSON.stringify(r2.json).slice(0, 160)}`);
  check(r2.json.apresCoup === true, 'la réponse dit « après coup » (aucun email de confirmation envoyé)');
  const { data: fiche } = await admin.from('clients').select('id, statut, source').eq('profile_id', PROFILE_ID).ilike('email', TEMOIN_EMAIL).maybeSingle();
  check(!!fiche, 'fiche créée');
  check(fiche?.statut === 'prospect', 'fiche en prospect', fiche?.statut);
  const { data: pres } = await admin.from('presences').select('id, cours_id, type_presence, statut_pointage').eq('id', r2.json.presence_id).maybeSingle();
  check(pres?.cours_id === seance.id, 'inscription posée sur LA séance passée', pres?.cours_id);
  check(pres?.type_presence === 'essai', 'inscription typée essai (ne décomptera jamais un carnet)', pres?.type_presence);
  const { data: d2 } = await admin.from('cours_essai_demandes').select('statut, client_id, presence_id').eq('id', demande.id).single();
  check(d2?.statut === 'finalisee', 'demande finalisée', d2?.statut);
  check(d2?.client_id === fiche?.id && d2?.presence_id === pres?.id, 'demande rattachée à la fiche et à l\'inscription');

  console.log('\n3. Une séance ANNULÉE reste refusée, même après coup');
  const { data: annulee } = await admin.from('cours').select('id, nom, date').eq('profile_id', PROFILE_ID).eq('est_annule', true).limit(1).maybeSingle();
  if (annulee) {
    const { data: d3 } = await admin.from('cours_essai_demandes').insert({
      profile_id: PROFILE_ID, cours_id: annulee.id, prenom: 'Témoin', nom: 'Annulée', email: TEMOIN_EMAIL, statut: 'en_attente',
    }).select('id').single();
    const r3 = await poster(d3.id, { action: 'valider', apresCoup: true });
    check(r3.status === 409 && /annul/i.test(r3.json.error || ''), 'séance annulée → 409', `${r3.status} ${r3.json.error}`);
  } else {
    console.log('  (aucune séance annulée sur le démo : point sauté)');
  }
} catch (e) {
  ko++;
  console.log('❌ ' + e.message);
} finally {
  await purger();
  const { count } = await admin.from('clients').select('id', { count: 'exact', head: true }).eq('profile_id', PROFILE_ID).ilike('email', TEMOIN_EMAIL);
  console.log(`\nMénage : ${count || 0} fiche témoin restante.`);
}
console.log(`\n${ok} OK, ${ko} KO`);
process.exit(ko ? 1 : 0);
