// Charge la base de prospection dans la table `prospects` (v109), pour que
// le module /admin/prospection ait une pile où tirer. Re-runnable : dédup par
// adresse (index unique lower(email)), une prof déjà en base n'est jamais
// réécrite (son statut, ses notes et ses emails lui appartiennent).
//
// Sources, HORS dépôt (coordonnées de tiers) :
//   prospection/prospects-yoga-fr.csv    la base (nom;email;ville;site;specialite;source;notes)
//   reseaux/prospects/emails.json        les emails rédigés à la main avant le module (ex. Aurore)
//   reseaux/prospects/envoyes.json       le journal des envois faits par le script du matin
//
// Ce qui entre : les lignes ÉLIGIBLES (lib/prospection.eligibleProspect :
// site, source citable, hors écoles / Suisse / lignes sales), statut
// « a_contacter ». Les emails rédigés entrent en « en_cours » avec leur
// brouillon, les envoyés en « contactee » avec l'email marqué envoyé.
//
// Usage : node scripts/importer-prospects.mjs [--apercu]
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { eligibleProspect } from '../lib/prospection.js';

const env = Object.fromEntries(
  readFileSync(join(process.cwd(), '.env.local'), 'utf8').split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]; }),
);
const apercu = process.argv.includes('--apercu');
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const CSV = join(process.cwd(), 'prospection', 'prospects-yoga-fr.csv');
const DOSSIER = join(process.cwd(), '..', 'reseaux', 'prospects');
const lireJson = (f) => (existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null);

// La table existe-t-elle ? (PGRST205 = cache de schéma, leçon v97). ⚠️ Pas un
// HEAD : sur une table absente il répond 204 sans erreur (piège du 2026-09-12).
{
  const { error } = await admin.from('prospects').select('id').limit(1);
  if (error) { console.error(`💥 table prospects illisible (${error.code}) : la migration v109 est-elle appliquée ?`); process.exit(1); }
}

const lignes = readFileSync(CSV, 'utf8').replace(/^﻿/, '').split(/\r?\n/).slice(1).filter(Boolean);
const raisons = {};
const eligibles = [];
const vus = new Set();
for (const l of lignes) {
  const [nom, email, ville, site, specialite, source, notes] = l.split(';').map((c) => (c || '').trim());
  const p = { nom, email: email.toLowerCase(), ville, site, specialite, source, notes };
  const e = eligibleProspect(p);
  if (!e.ok) { raisons[e.raison] = (raisons[e.raison] || 0) + 1; continue; }
  if (vus.has(p.email)) { raisons['doublon dans le fichier'] = (raisons['doublon dans le fichier'] || 0) + 1; continue; }
  vus.add(p.email);
  eligibles.push({ nom: p.nom.slice(0, 160), email: p.email, ville: p.ville || null, site: p.site || null, specialite: p.specialite || null, source: p.source, notes: p.notes || null, statut: 'a_contacter' });
}
console.log(`${lignes.length} lignes lues, ${eligibles.length} éligibles.`);
for (const [r, n] of Object.entries(raisons).sort((a, b) => b[1] - a[1])) console.log(`   écartées « ${r} » : ${n}`);

// Les emails rédigés/envoyés avant le module.
const rediges = lireJson(join(DOSSIER, 'emails.json')) || [];
const journal = lireJson(join(DOSSIER, 'envoyes.json')) || {};
console.log(`${rediges.length} email(s) rédigé(s) à la main, ${Object.keys(journal).length} déjà envoyé(s).`);

if (apercu) { console.log('(aperçu : rien n\'est écrit)'); process.exit(0); }

// Déjà en base : on ne touche pas.
const { data: existants } = await admin.from('prospects').select('email');
const dejaLa = new Set((existants || []).map((r) => r.email.toLowerCase()));
const nouveaux = eligibles.filter((p) => !dejaLa.has(p.email) && !rediges.some((e) => e.to.toLowerCase() === p.email));
let inseres = 0;
for (let i = 0; i < nouveaux.length; i += 200) {
  const lot = nouveaux.slice(i, i + 200);
  const { error, data } = await admin.from('prospects').insert(lot).select('id');
  if (error) { console.error(`💥 lot ${i / 200 + 1} refusé :`, error.message); process.exit(1); }
  inseres += data?.length || 0;
}
console.log(`✅ ${inseres} prof(s) ajoutée(s) dans la pile (${dejaLa.size} déjà en base).`);

for (const e of rediges) {
  const email = e.to.toLowerCase();
  if (dejaLa.has(email)) { console.log(`   ${email} déjà en base, ignorée`); continue; }
  const envoi = journal[e.id];
  const { data: p, error } = await admin.from('prospects').insert({
    nom: [e.prenom, e.nom].filter(Boolean).join(' ').trim() || e.prenom || email,
    prenom: e.prenom || null, email, ville: null, site: e.site || null, specialite: null,
    source: e.source, notes: e.studio || null,
    statut: envoi ? 'contactee' : 'en_cours',
  }).select('id').single();
  if (error) { console.error(`💥 ${email} :`, error.message); continue; }
  const { error: eM } = await admin.from('prospection_emails').insert({
    prospect_id: p.id, objet: e.objet, corps: e.corps,
    statut: envoi ? 'envoye' : 'brouillon',
    envoye_at: envoi ? (envoi.programme || envoi.date) : null,
    resend_id: envoi?.resendId || null,
  });
  if (eM) { console.error(`💥 email de ${email} :`, eM.message); continue; }
  console.log(`   ${email} → ${envoi ? 'contactée (email envoyé le ' + envoi.date.slice(0, 10) + ')' : 'à rédiger (brouillon repris)'}`);
}
console.log('Terminé. Les JSON de reseaux/prospects/ ne sont plus la source : le module /admin/prospection l\'est.');
