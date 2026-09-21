/**
 * PREUVE — le rappel « Paiement en attente » de la cloche (2026-09-21)
 *
 * Retour Maude : six jours après avoir saisi le premier chèque de Marie-Pierre,
 * la cloche disait encore « 235 € · en attente depuis 26 jours », tous les
 * deux jours. Ce script exerce la VRAIE route /api/notifications/check avec
 * la session du démo Atelier Soleil, sur des lignes témoins, et relit la
 * table `notifications` en base.
 *
 * Ce qu'il prouve :
 *   1. une ligne seule → rappel court, jours depuis la date de la ligne ;
 *   2. un reste avec un acompte réglé (sœur par l'échéancier) → le rappel dit
 *      « reste X € (Y € déjà reçus, dernier par chèque le JJ/MM) » et compte
 *      les jours depuis le chèque ;
 *   3. le rappel vit sept jours (expires_at), pas 48 h ;
 *   4. un second check ne double rien et n'écrase pas « lu » ;
 *   5. un rappel dont la ligne a été ENCAISSÉE (par la vraie route Encaisser)
 *      est purgé au check suivant, les autres restent ;
 *   6. un rappel orphelin (ligne supprimée) est purgé lui aussi.
 *
 * Prérequis : dev server sur :3333 (PROOF_BASE pour un autre port).
 * Re-runnable, témoins purgés même en cas d'échec, aucun email (élève @example.com).
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

const BASE = process.env.PROOF_BASE || 'http://localhost:3333';
const EMAIL_TEMOIN = 'preuve-rappel-paiement@example.com';

const env = Object.fromEntries(
  readFileSync(join(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const PROJECT_REF = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

let ok = 0, ko = 0;
const c = (l, cond, d = '') => { if (cond) { ok++; console.log('  OK  ' + l + (d ? ' - ' + d : '')); } else { ko++; console.log('  KO  ' + l + (d ? ' - ' + d : '')); } };
const isoParis = (d = new Date()) => d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
const plusJours = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const jjmm = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

const { data: demo } = await svc.from('profiles').select('id, studio_slug, alerte_paiement_attente_jours').eq('studio_slug', 'atelier-soleil').single();
if (!demo) { console.error('Démo introuvable'); process.exit(1); }
const SEUIL = parseInt(demo.alerte_paiement_attente_jours) || 14;

const REF_ORPHELIN = `paiement_retard_${randomUUID()}`;
let fiche = null;
async function purger() {
  const { data: fiches } = await svc.from('clients').select('id').eq('profile_id', demo.id).ilike('email', EMAIL_TEMOIN);
  for (const f of fiches || []) {
    const { data: pays } = await svc.from('paiements').select('id').eq('client_id', f.id);
    const ids = (pays || []).map(p => p.id);
    if (ids.length) {
      const { data: fp } = await svc.from('factures_paiements').select('facture_id').in('paiement_id', ids);
      const fids = [...new Set((fp || []).map(x => x.facture_id))];
      if (fids.length) await svc.from('factures').delete().in('id', fids);
      await svc.from('notifications').delete().eq('profile_id', demo.id).in('ref_key', ids.map(i => `paiement_retard_${i}`));
    }
    await svc.from('paiements').delete().eq('client_id', f.id);
    await svc.from('abonnements').delete().eq('client_id', f.id);
    await svc.from('clients').delete().eq('id', f.id);
  }
  await svc.from('notifications').delete().eq('profile_id', demo.id).eq('ref_key', REF_ORPHELIN);
}
await purger();

// ── Session de la prof (cookie @supabase/ssr) ────────────────────────────────
const sessionCookieHeader = async (email) => {
  const { data: linkData } = await svc.auth.admin.generateLink({ type: 'magiclink', email });
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: otp } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: linkData.properties.hashed_token });
  const value = 'base64-' + Buffer.from(JSON.stringify(otp.session)).toString('base64url');
  const nm = `sb-${PROJECT_REF}-auth-token`;
  const parts = [];
  if (value.length <= 3180) parts.push(`${nm}=${value}`);
  else for (let i = 0; i * 3180 < value.length; i++) parts.push(`${nm}.${i}=${value.slice(i * 3180, (i + 1) * 3180)}`);
  return parts.join('; ');
};
const COOKIE = await sessionCookieHeader('camille@atelier-soleil.fr');
const appel = (path, body) => fetch(BASE + path, {
  method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: COOKIE }, body: JSON.stringify(body || {}),
});
const check = async () => {
  const r = await appel('/api/notifications/check');
  if (r.status !== 200) throw new Error(`check → ${r.status} ${(await r.text()).slice(0, 200)}`);
  const { data } = await svc.from('notifications').select('ref_key, titre, corps, data, lu, expires_at, created_at')
    .eq('profile_id', demo.id).eq('type', 'paiement_retard');
  return data || [];
};

// ── Mise en place ────────────────────────────────────────────────────────────
const auj = new Date();
const dateVente = isoParis(plusJours(auj, -(SEUIL + 6)));       // J-20 par défaut
const dateVenteB = isoParis(plusJours(auj, -(SEUIL + 13)));     // J-27
const dateCheque = isoParis(plusJours(auj, -(SEUIL - 1)));      // J-13 : sous le seuil
try {
  const { data: f, error } = await svc.from('clients').insert({
    profile_id: demo.id, prenom: 'Marie-Pierre', nom: 'Témoin rappel', email: EMAIL_TEMOIN, statut: 'actif',
  }).select('id').single();
  if (error) throw new Error('fiche témoin KO: ' + error.message);
  fiche = f;

  const creerAbo = async (nom) => {
    const { data, error } = await svc.from('abonnements').insert({
      profile_id: demo.id, client_id: fiche.id, offre_nom: nom, type: 'abonnement',
      statut: 'actif', date_debut: dateVenteB, date_fin: isoParis(plusJours(auj, 280)), seances_total: null,
    }).select('id').single();
    if (error) throw new Error('abo KO: ' + error.message);
    return data;
  };
  const creerPaiement = async (abo, champs) => {
    const { data, error } = await svc.from('paiements').insert({
      profile_id: demo.id, client_id: fiche.id, abonnement_id: abo.id, type: 'abonnement', ...champs,
    }).select('id').single();
    if (error) throw new Error('paiement KO: ' + error.message);
    return data;
  };
  const aboA = await creerAbo('Abonnement témoin seul');
  const payA = await creerPaiement(aboA, { intitule: 'Abonnement témoin seul', montant: 480, statut: 'pending', mode: null, date: dateVente });
  const aboB = await creerAbo('Abonnement témoin acompte');
  const ech = randomUUID();
  const payB = await creerPaiement(aboB, { intitule: 'Abonnement témoin acompte', montant: 235, statut: 'pending', mode: null, date: dateVenteB, echeancier_id: ech });
  await creerPaiement(aboB, { intitule: 'Abonnement témoin acompte (versement)', montant: 245, statut: 'paid', mode: 'cheque', date: dateCheque, date_encaissement: dateCheque, echeancier_id: ech });
  const aboC = await creerAbo('Abonnement témoin à encaisser');
  const payC = await creerPaiement(aboC, { intitule: 'Abonnement témoin à encaisser', montant: 100, statut: 'pending', mode: null, date: dateVente });
  // Un rappel orphelin, tel qu'en laisse une ligne supprimée après coup.
  await svc.from('notifications').insert({
    profile_id: demo.id, type: 'paiement_retard', titre: 'orphelin', corps: 'orphelin', data: {},
    ref_key: REF_ORPHELIN, expires_at: new Date(Date.now() + 86400000).toISOString(),
  });

  const refA = `paiement_retard_${payA.id}`, refB = `paiement_retard_${payB.id}`, refC = `paiement_retard_${payC.id}`;

  console.log('\n── A. Premier check : trois rappels, un reste qui dit ce qu\'il a reçu ──');
  let notifs = await check();
  const nA = notifs.find(n => n.ref_key === refA), nB = notifs.find(n => n.ref_key === refB), nC = notifs.find(n => n.ref_key === refC);
  c('les trois lignes témoins ont leur rappel', !!nA && !!nB && !!nC);
  c('ligne seule : phrase courte, jours depuis la vente',
    nA?.corps === `Abonnement témoin seul · 480 € · en attente depuis ${SEUIL + 6} jours`, nA?.corps);
  c('reste avec acompte : dit ce qui a été reçu, par chèque, à sa date, et compte depuis le chèque',
    nB?.corps === `Abonnement témoin acompte · reste 235 € (245 € déjà reçus, dernier par chèque le ${jjmm(dateCheque)}) · en attente depuis ${SEUIL - 1} jours`, nB?.corps);
  c('data du reste : montant 235, reçu 245, total 480', nB?.data?.montant === 235 && nB?.data?.recu === 245 && nB?.data?.total === 480, JSON.stringify(nB?.data));
  c('le titre nomme l’élève', nB?.titre === '💶 Paiement en attente — Marie-Pierre Témoin rappel', nB?.titre);
  const vie = nA ? (new Date(nA.expires_at) - Date.now()) / 86400000 : 0;
  c('le rappel vit sept jours (pas 48 h)', vie > 6.9 && vie < 7.1, vie.toFixed(2) + ' j');
  c('le rappel orphelin (ligne disparue) est purgé', !notifs.some(n => n.ref_key === REF_ORPHELIN));
  c('les rappels naissent non lus', nA?.lu === false && nB?.lu === false);

  console.log('\n── B. Lu puis second check : rien ne double, rien ne se rallume ──');
  await svc.from('notifications').update({ lu: true }).eq('profile_id', demo.id).eq('ref_key', refB);
  notifs = await check();
  c('toujours un seul rappel par ligne', notifs.filter(n => [refA, refB, refC].includes(n.ref_key)).length === 3);
  c('un rappel lu reste lu', notifs.find(n => n.ref_key === refB)?.lu === true);

  console.log('\n── C. Encaisser par la vraie route, puis check : le rappel disparaît ──');
  const r = await appel(`/api/paiements/${payC.id}/encaisser`, { mode: 'especes', date_encaissement: isoParis(auj) });
  c('la route Encaisser répond 200', r.status === 200, String(r.status));
  const { data: payCdb } = await svc.from('paiements').select('statut, mode').eq('id', payC.id).single();
  c('la ligne est réglée en base', payCdb?.statut === 'paid' && payCdb?.mode === 'especes');
  notifs = await check();
  c('le rappel de la ligne encaissée est purgé', !notifs.some(n => n.ref_key === refC));
  c('les deux autres rappels restent', notifs.some(n => n.ref_key === refA) && notifs.some(n => n.ref_key === refB));

  console.log('\n── D. Un acompte de plus : le rappel se met à jour à l’expiration, pas avant ──');
  // Le texte d'un rappel VIVANT ne change pas (ignoreDuplicates) : la
  // prochaine vérité arrive à son réarmement hebdomadaire. On le force en
  // expirant le rappel, comme le temps le ferait.
  const ech2 = randomUUID();
  await svc.from('paiements').update({ echeancier_id: ech2 }).eq('id', payA.id);
  await creerPaiement(aboA, { intitule: 'Abonnement témoin seul (versement)', montant: 200, statut: 'paid', mode: 'virement', date: isoParis(auj), date_encaissement: isoParis(auj), echeancier_id: ech2 });
  await svc.from('paiements').update({ montant: 280 }).eq('id', payA.id);
  await svc.from('notifications').update({ expires_at: new Date(Date.now() - 1000).toISOString() }).eq('profile_id', demo.id).eq('ref_key', refA);
  notifs = await check();
  const nA2 = notifs.find(n => n.ref_key === refA);
  c('après expiration, le rappel renaît avec le nouvel acompte et zéro jour d’attente',
    nA2?.corps === `Abonnement témoin seul · reste 280 € (200 € déjà reçus, dernier par virement le ${jjmm(isoParis(auj))}) · en attente depuis 0 jour`, nA2?.corps);
  c('un rappel expiré est recréé AU MÊME check (purge avant upsert)', !!nA2 && nA2.lu === false);
} catch (e) {
  ko++; console.log('  KO  exception : ' + (e?.message || e));
} finally {
  await purger();
}

console.log(`\n${ok} OK / ${ko} KO`);
process.exit(ko ? 1 : 0);
