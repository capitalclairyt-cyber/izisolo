/**
 * lib/i18n-audit.js — relit le CODE du portail et en extrait les clés t('…').
 *
 * PUR (lecture de fichiers seulement), partagé par le verrou CI
 * tests/e2e/i18n-portail.spec.js et par scripts/i18n-cles-manquantes.mjs.
 *
 * Une clé est le premier argument LITTÉRAL d'un appel `t(` : simple ou double
 * quote, jamais un template literal ni une concaténation (le verrou refuse
 * `t(\`…\`)`, qui cacherait une clé que personne ne peut traduire).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** Les fichiers dont les textes partent chez une élève. */
export const DOSSIERS_PORTAIL = ['app/p', 'components/portail'];
export const FICHIERS_PORTAIL = [
  'components/auth/OuvrirLien.js',
  'lib/portail-magic-link.js',
  'app/api/portail/[studioSlug]/reserver/route.js',
  'app/api/portail-login/route.js',
  // v122 : les emails et les push qui partent vers une élève SANS son cookie
  // (crons, gestes de la prof), écrits dans la langue de sa fiche.
  'app/api/admin/essais/[id]/route.js',
  'app/api/cours/[coursId]/annuler/route.js',
  'app/api/cours/[coursId]/retablir/route.js',
  'app/api/cours/inviter/route.js',
  'app/api/cron/alertes/route.js',
  'app/api/cron/notifs-eleves/route.js',
  'app/api/cron/digest-messagerie/route.js',
  'app/api/liste-attente/[id]/promouvoir/route.js',
  'app/api/messagerie/conversations/[id]/messages/route.js',
  'app/api/paiements/[id]/encaisser/route.js',
  'app/api/paiements/email-reglement/route.js',
  'app/api/portail/[studioSlug]/annuler/route.js',
  'app/api/portail/[studioSlug]/essai/route.js',
  'app/api/portail/[studioSlug]/liste-attente/route.js',
  'app/api/portail/[studioSlug]/reserver-serie/route.js',
  'lib/essai.js',
  'lib/facture-auto.js',
  'lib/messagerie-email.js',
  'lib/notif-eleve-regle.js',
  'lib/notifs-eleves.js',
  'lib/prelevement-service.js',
  'lib/promotion-liste-attente.js',
  'lib/reglement.js',
  'lib/avis-google.js',
];

export function listerFichiers(racine) {
  const out = [];
  const marcher = (dir) => {
    for (const nom of readdirSync(dir)) {
      const p = join(dir, nom);
      if (statSync(p).isDirectory()) marcher(p);
      else if (/\.js$/.test(nom)) out.push(p);
    }
  };
  for (const d of DOSSIERS_PORTAIL) marcher(join(racine, d));
  for (const f of FICHIERS_PORTAIL) out.push(join(racine, f));
  return out;
}

const RE_CLE = /(?<![\w.$])t\(\s*(['"])((?:\\.|(?!\1)[^\\])*)\1/g;
const RE_TEMPLATE = /(?<![\w.$])t\(\s*`/g;

function desechapper(s, quote) {
  return s.replace(/\\(.)/g, (m, c) => (c === quote || c === '\\' ? c : m));
}

/** @returns {{ cles: Array<{cle, fichier, ligne}>, templates: Array<{fichier, ligne}> }} */
export function extraireCles(source, fichier = '') {
  const cles = [];
  const templates = [];
  const ligneDe = (idx) => source.slice(0, idx).split('\n').length;
  for (const m of source.matchAll(RE_CLE)) cles.push({ cle: desechapper(m[2], m[1]), fichier, ligne: ligneDe(m.index) });
  for (const m of source.matchAll(RE_TEMPLATE)) templates.push({ fichier, ligne: ligneDe(m.index) });
  return { cles, templates };
}

export function auditerFichiers(fichiers) {
  const cles = [];
  const templates = [];
  for (const f of fichiers) {
    const r = extraireCles(readFileSync(f, 'utf8'), f);
    cles.push(...r.cles);
    templates.push(...r.templates);
  }
  return { cles, templates };
}

/** Les {variables} d'une phrase. */
export function variablesDe(texte) {
  return [...String(texte).matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
}
