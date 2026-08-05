/**
 * IziSolo — Chemin réel factures v84 contre la PROD (studio démo, données jetables)
 * ─────────────────────────────────────────────────────────────────────────────
 * Prouve, dans l'ordre du vrai parcours, avec les VRAIES RPC prod :
 *   1. facturation active dès le SIRET posé
 *   2. émission d'une facture 1 ligne (RPC emettre_facture, numéro séquentiel)
 *   3. re-téléchargement = MÊME facture (liaison → snapshot stocké → PDF)
 *   4. règle d'or : re-facturer le même paiement → deja_facture
 *   5. facture du mois (2 lignes, paiement déjà facturé exclu, numéro N+1)
 *   6. paiement pending → paiement_invalide (jamais de facture non acquittée)
 *   7. prédicat du verrou 409 (liaison émise visible sur le paiement)
 *   8. annulation : statut annulee + paiements libérés + autres factures intactes
 *   9. numéro BRÛLÉ : l'émission suivante prend N+2, jamais le numéro annulé
 * Données jetables (fiche + 4 paiements) créées puis PURGÉES ; les réglages
 * facturation du démo sont RESTAURÉS à l'identique. Re-runnable.
 *
 * Usage :  node scripts/proof-v84-walkthrough.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { construireSnapshot } from '../lib/factures.js';
import { genererFacturePdf } from '../lib/facture-pdf.js';

const ROOT = process.cwd();
const env = Object.fromEntries(
  readFileSync(join(ROOT, '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const SLUG_DEMO = 'ben-yoga';
const EMAIL_TEST = 'test-factures-v84@izisolo-test.invalid';

let ok = 0, total = 0;
const check = (nom, cond, detail = '') => {
  total++;
  if (cond) { ok++; console.log(`  ✓ ${nom}${detail ? ` — ${detail}` : ''}`); }
  else { console.log(`  ✗ ${nom}${detail ? ` — ${detail}` : ''}`); throw new Error(`ÉCHEC : ${nom}`); }
};
const die = (msg, err) => { console.error(`✗ ${msg}`, err?.message || err || ''); process.exit(1); };

// ── Contexte ────────────────────────────────────────────────────────────────
const { data: profile, error: profErr } = await sb.from('profiles')
  .select('id, studio_nom, adresse, code_postal, ville, telephone, email_contact, facturation_siret, facturation_raison_sociale, facturation_mention_tva')
  .eq('studio_slug', SLUG_DEMO).single();
if (profErr || !profile) die('profil démo introuvable', profErr);
const backupFacturation = {
  facturation_siret: profile.facturation_siret,
  facturation_raison_sociale: profile.facturation_raison_sociale,
  facturation_mention_tva: profile.facturation_mention_tva,
};
console.log(`Studio démo : ${profile.studio_nom} (${profile.id.slice(0, 8)})`);

let clientId = null;
const paiementIds = [];
const factureIds = [];

try {
  // ── Mise en place : SIRET + fiche + paiements jetables ────────────────────
  {
    const { error } = await sb.from('profiles').update({
      facturation_siret: '73282932000074',
      facturation_raison_sociale: 'Studio Démo — preuve v84',
      facturation_mention_tva: null,
    }).eq('id', profile.id);
    if (error) die('pose du SIRET', error);
  }
  {
    const { data, error } = await sb.from('clients')
      .insert({ profile_id: profile.id, prenom: 'Preuve', nom: 'V84 (jetable)', email: EMAIL_TEST, statut: 'prospect' })
      .select('id').single();
    if (error) die('création fiche jetable', error);
    clientId = data.id;
  }
  const mkPay = async (intitule, montant, jour, statut) => {
    const { data, error } = await sb.from('paiements').insert({
      profile_id: profile.id, client_id: clientId, intitule, montant,
      mode: 'virement', date: `2026-08-${jour}`,
      date_encaissement: statut === 'paid' ? `2026-08-${jour}` : null, statut,
    }).select('id, intitule, montant, mode, date, date_encaissement, statut').single();
    if (error) die(`création paiement ${intitule}`, error);
    paiementIds.push(data.id);
    return data;
  };
  const p1 = await mkPay('Abonnement mensuel — août', 45, '03', 'paid');
  const p2 = await mkPay('Atelier Yin', 20, '10', 'paid');
  const p3 = await mkPay('Séance à l\'unité', 15, '17', 'paid');
  const p4 = await mkPay('Carnet (à régler)', 30, '20', 'pending');

  const facturation = { facturation_siret: '73282932000074', facturation_raison_sociale: 'Studio Démo — preuve v84', facturation_mention_tva: null };
  const { data: fiche } = await sb.from('clients').select('id, prenom, nom, email, adresse, adresse_postale, ville').eq('id', clientId).single();
  const emettre = async (paiements) => {
    const { data, error } = await sb.rpc('emettre_facture', {
      p_profile_id: profile.id, p_client_id: clientId,
      p_paiement_ids: paiements.map(p => p.id),
      p_snapshot: construireSnapshot({ profile, facturation, client: fiche, paiements }),
    });
    if (error) die('RPC emettre_facture', error);
    return data;
  };

  // ── 1-2. Émission facture 1 ligne ─────────────────────────────────────────
  console.log('\n— Émission —');
  const A = await emettre([p1]);
  check('facture A émise', A?.ok === true, A?.numero_affiche);
  factureIds.push(A.facture_id);
  const baseNum = A.numero;

  // ── 3. Re-téléchargement : liaison → snapshot stocké → même document ──────
  const { data: liaisonP1 } = await sb.from('factures_paiements')
    .select('facture:facture_id (id, numero_affiche, statut, date_emission, snapshot)')
    .eq('paiement_id', p1.id).maybeSingle();
  check('re-téléchargement retrouve LA facture A', liaisonP1?.facture?.id === A.facture_id && liaisonP1.facture.numero_affiche === A.numero_affiche);
  check('snapshot stocké fidèle', liaisonP1.facture.snapshot?.lignes?.length === 1 && liaisonP1.facture.snapshot.total === 45);
  const pdf = await genererFacturePdf({ type: 'facture', numeroAffiche: liaisonP1.facture.numero_affiche, dateEmission: liaisonP1.facture.date_emission, snapshot: liaisonP1.facture.snapshot });
  check('PDF re-rendu depuis le snapshot DB', Buffer.from(pdf.slice(0, 5)).toString() === '%PDF-', `${pdf.length} octets`);

  // ── 4. Règle d'or ─────────────────────────────────────────────────────────
  const rejeu = await emettre([p1]);
  check('re-facturer p1 → deja_facture', rejeu?.ok === false && rejeu?.reason === 'deja_facture');

  // ── 5. Facture du mois (p1 exclu, p2+p3) ──────────────────────────────────
  console.log('\n— Facture du mois —');
  const B = await emettre([p2, p3]);
  check('facture B émise (2 lignes)', B?.ok === true);
  factureIds.push(B.facture_id);
  check('numérotation séquentielle', B.numero === baseNum + 1, `${A.numero_affiche} puis ${B.numero_affiche}`);
  const { data: fB } = await sb.from('factures').select('snapshot').eq('id', B.facture_id).single();
  check('2 lignes, total 35 €', fB?.snapshot?.lignes?.length === 2 && fB.snapshot.total === 35);

  // ── 6. Pending refusé ─────────────────────────────────────────────────────
  const pend = await emettre([p4]);
  check('paiement pending → paiement_invalide', pend?.ok === false && pend?.reason === 'paiement_invalide');

  // ── 7. Prédicat du verrou 409 ─────────────────────────────────────────────
  const { data: verrou } = await sb.from('factures_paiements')
    .select('facture:facture_id (numero_affiche, statut)').eq('paiement_id', p2.id).maybeSingle();
  check('p2 verrouillé par facture émise (prédicat 409)', verrou?.facture?.statut === 'emise');

  // ── 8. Annulation ─────────────────────────────────────────────────────────
  console.log('\n— Annulation —');
  const { data: annul, error: annulErr } = await sb.rpc('annuler_facture', { p_profile_id: profile.id, p_facture_id: B.facture_id });
  if (annulErr) die('RPC annuler_facture', annulErr);
  check('annulation ok', annul?.ok === true);
  const { data: fBapres } = await sb.from('factures').select('statut, annulee_at').eq('id', B.facture_id).single();
  check('facture B marquée annulee', fBapres?.statut === 'annulee' && !!fBapres.annulee_at);
  const { data: liaisonsB } = await sb.from('factures_paiements').select('paiement_id').in('paiement_id', [p2.id, p3.id]);
  check('p2 et p3 libérés', (liaisonsB || []).length === 0);
  const { data: liaisonP1bis } = await sb.from('factures_paiements').select('paiement_id').eq('paiement_id', p1.id).maybeSingle();
  check('facture A intacte (p1 toujours lié)', !!liaisonP1bis);

  // ── 9. Numéro brûlé ───────────────────────────────────────────────────────
  const C = await emettre([p2]);
  check('numéro annulé jamais réattribué', C?.ok === true && C.numero === baseNum + 2, `après annulation de ${B.numero_affiche}, C = ${C.numero_affiche}`);
  factureIds.push(C.facture_id);

  console.log(`\n✅ Chemin réel v84 : ${ok}/${total}`);
} catch (e) {
  console.error(`\n❌ Chemin réel v84 : ${ok}/${total} — ${e.message}`);
  process.exitCode = 1;
} finally {
  // ── Purge + restauration (toujours) ───────────────────────────────────────
  const errs = [];
  if (factureIds.length) {
    const { error } = await sb.from('factures').delete().in('id', factureIds); // liaisons en cascade
    if (error) errs.push(`factures: ${error.message}`);
  }
  if (paiementIds.length) {
    const { error } = await sb.from('paiements').delete().in('id', paiementIds);
    if (error) errs.push(`paiements: ${error.message}`);
  }
  if (clientId) {
    const { error } = await sb.from('clients').delete().eq('id', clientId);
    if (error) errs.push(`fiche: ${error.message}`);
  }
  const { error: restoreErr } = await sb.from('profiles').update(backupFacturation).eq('id', profile.id);
  if (restoreErr) errs.push(`restauration facturation: ${restoreErr.message}`);
  console.log(errs.length ? `⚠️ purge incomplète : ${errs.join(' | ')}` : '🧹 purge + restauration démo OK');
}
