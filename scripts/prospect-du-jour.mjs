// Tire N profs à qui écrire aujourd'hui, depuis la base prospection/
// prospects-yoga-fr.csv (hors dépôt git, coordonnées de tiers), pour que
// quelqu'un aille voir leur site et écrive l'email à la main
// (scripts/envoyer-email-prof.mjs). Rien n'est envoyé ici.
//
// Ce qu'on écarte, et pourquoi (décisions du 2026-09-12) :
//   - sans site : on n'a rien de vrai à observer, l'email serait générique ;
//   - les écoles : on cherche des profs qui enseignent à leur nom ;
//   - la Suisse : le franc n'est pas géré (v105) ;
//   - les sources qu'on ne saurait pas citer dans le pied (Sadhana, cartes
//     de visite, annuaire manuel) : voir lib/prospection-sources.js ;
//   - les lignes sales (YogMee : colonnes décalées, site = bouton Facebook) ;
//   - déjà contactée, déjà rédigée, ou désinscrite.
//
// Usage : node scripts/prospect-du-jour.mjs [N=5]
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { sourceNommable } from '../lib/prospection-sources.js';

const env = Object.fromEntries(
  readFileSync(join(process.cwd(), '.env.local'), 'utf8').split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]; }),
);

const N = Math.max(1, parseInt(process.argv[2] || '5', 10) || 5);
const CSV = join(process.cwd(), 'prospection', 'prospects-yoga-fr.csv');
const DOSSIER = join(process.cwd(), '..', 'reseaux', 'prospects');
const lireJson = (f) => (existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null);
const journal = lireJson(join(DOSSIER, 'envoyes.json')) || {};
const rediges = lireJson(join(DOSSIER, 'emails.json')) || [];
const dejaVues = new Set([
  ...Object.values(journal).map((j) => j.to.toLowerCase()),
  ...rediges.map((e) => e.to.toLowerCase()),
]);

const SUISSE = /gen[èe]ve|lausanne|suisse|neuch[âa]tel|fribourg|valais|vaud|\bCH\b|nyon|montreux|\bsion\b|yverdon/i;
const lignes = readFileSync(CSV, 'utf8').replace(/^﻿/, '').split(/\r?\n/).slice(1).filter(Boolean);
const tous = lignes.map((l) => {
  const [nom, email, ville, site, specialite, source, notes] = l.split(';').map((c) => (c || '').trim());
  return { nom, email: email.toLowerCase(), ville, site, specialite, source, notes };
});
const candidates = tous.filter((p) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)
  && p.site && /\.[a-z]{2,}/i.test(p.site) && !/facebook\.com|instagram\.com/i.test(p.site)
  && !/^professeur/i.test(p.nom)
  && !/[ée]cole/i.test(p.specialite)
  && sourceNommable(p.source)
  && !SUISSE.test(p.ville)
  && !dejaVues.has(p.email));

// Désinscrites : une seule requête, sur toute la liste.
let blacklist = new Set();
if (env.SUPABASE_SERVICE_ROLE_KEY) {
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const { data } = await sb.from('email_blacklist').select('email');
  blacklist = new Set((data || []).map((r) => r.email.toLowerCase()));
}
const eligibles = candidates.filter((p) => !blacklist.has(p.email));

// Tirage au hasard, sans biais de position dans le fichier.
const tirage = [];
const pool = [...eligibles];
while (tirage.length < N && pool.length) tirage.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);

console.log(`${tous.length} lignes, ${eligibles.length} éligibles (site, source citable, hors écoles / Suisse / déjà vues / désinscrites), ${Object.keys(journal).length} déjà envoyés.\n`);
for (const p of tirage) {
  const brut = p.site.replace(/^https?:\/\/http\/?\/?/i, '');
  const site = /^https?:\/\//i.test(brut) ? brut : `https://${brut}`;
  const spe = p.specialite && p.specialite !== 'Yoga' ? `  ·  ${p.specialite}` : '';
  console.log(`• ${p.nom}  —  ${p.ville}\n  ${site}\n  ${p.email}  ·  source : ${p.source}${spe}\n`);
}
