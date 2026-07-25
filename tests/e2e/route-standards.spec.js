/**
 * Ratchet des standards de routes (B2c, 2026-07-25).
 *
 * Deux lois, verrouillées par listes EXACTES qui ne peuvent que rétrécir :
 *
 *  1. Toute route API passe par withRoute (lib/api-route.js). Les exceptions
 *     vivent dans SANS_WRAPPER — ajouter une route à cette liste est un
 *     échec de review, la retirer est un progrès. La liste est « honnête » :
 *     une entrée qui n'existe plus, ou qui utilise désormais withRoute,
 *     fait AUSSI échouer le test (pour forcer sa mise à jour).
 *
 *  2. Zéro catch strictement vide (`catch {}` sans même un commentaire) :
 *     un catch silencieux cache un bug jusqu'au retour utilisateur
 *     (cause racine n°1 du diagnostic de campagne). Un catch avec un
 *     commentaire d'intention (`catch { /* fail-open : … *\/ }`) est
 *     accepté : l'intention est déclarée. CATCHS_VIDES fige les restants.
 *
 * Test Node pur (fs seulement), tourne dans le gate CI.
 */
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(process.cwd());

// ─── Loi 1 : routes hors withRoute (NE PEUT QUE RÉTRÉCIR) ──────────────────
const SANS_WRAPPER = [
  'app/api/leads/route.js',
  'app/api/og/route.js',
  'app/api/portail-login/route.js',
  'app/api/portail/[studioSlug]/annuler/route.js',
  'app/api/portail/[studioSlug]/assistant/route.js',
  'app/api/portail/[studioSlug]/essai/route.js',
  'app/api/portail/[studioSlug]/facture/[paiementId]/route.js',
  'app/api/portail/[studioSlug]/liste-attente/route.js',
  'app/api/portail/[studioSlug]/profil/route.js',
  'app/api/portail/[studioSlug]/reserver-serie/route.js',
  'app/api/portail/[studioSlug]/reserver/route.js',
  'app/api/sondage/[sondageSlug]/repondre/route.js',
  'app/api/stripe/checkout-saas/route.js',
  'app/api/stripe/customer-portal/route.js',
  'app/api/stripe/webhook-saas/route.js',
  'app/api/stripe/webhook/route.js',
  'app/api/support/route.js',
  'app/api/unsubscribe/route.js',
];

// ─── Loi 2 : catchs strictement vides par fichier (NE PEUT QUE RÉTRÉCIR) ───
// clé = chemin relatif, valeur = nombre exact toléré.
const CATCHS_VIDES = {
  'app/(auth)/onboarding/page.js': 3,
  'app/(dashboard)/clients/ClientsClient.js': 1,
  'app/(dashboard)/cours/[coursId]/page.js': 1,
  'app/(dashboard)/layout.js': 2,
  'app/(dashboard)/parametres/page.js': 1,
  'app/api/cours/[coursId]/annuler/route.js': 1,
  'app/api/cron/digest-messagerie/route.js': 1,
  'app/api/liste-attente/[id]/promouvoir/route.js': 1,
  'app/api/portail/[studioSlug]/annuler/route.js': 2,
  'app/api/portail/[studioSlug]/liste-attente/route.js': 1,
  'app/api/portail/[studioSlug]/reserver/route.js': 1,
  'app/api/stripe/webhook-saas/route.js': 1,
  'app/p/[studioSlug]/espace/page.js': 1,
  'lib/api-route.js': 2,
  'lib/promotion-liste-attente.js': 1,
};

// ─── Scan helpers ───────────────────────────────────────────────────────────
function listFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      listFiles(full, out);
    } else if (entry.name.endsWith('.js')) {
      out.push(full);
    }
  }
  return out;
}

const rel = (abs) => path.relative(ROOT, abs).split(path.sep).join('/');

// Un catch « strictement vide » : bloc sans AUCUN contenu (même pas un
// commentaire). `catch {}`, `catch (e) {}`, multiligne inclus.
const EMPTY_CATCH_RE = /catch\s*(\([^)]*\))?\s*\{\s*\}/g;

test.describe('Ratchet — standards de routes API', () => {
  test('toute route passe par withRoute (hors allowlist, qui ne peut que rétrécir)', () => {
    const routes = listFiles(path.join(ROOT, 'app', 'api'))
      .filter(f => path.basename(f) === 'route.js')
      .map(rel)
      .sort();

    const problemes = [];
    for (const route of routes) {
      const src = fs.readFileSync(path.join(ROOT, route), 'utf8');
      const usesWrapper = /withRoute\s*\(/.test(src);
      const listed = SANS_WRAPPER.includes(route);
      if (!usesWrapper && !listed) {
        problemes.push(`NOUVELLE route hors standard : ${route} — utilise withRoute() (lib/api-route.js)`);
      }
      if (usesWrapper && listed) {
        problemes.push(`Progrès non enregistré : ${route} utilise withRoute — la retirer de SANS_WRAPPER`);
      }
    }
    for (const listed of SANS_WRAPPER) {
      if (!routes.includes(listed)) {
        problemes.push(`Entrée fantôme dans SANS_WRAPPER : ${listed} n'existe plus — la retirer`);
      }
    }
    expect(problemes, problemes.join('\n')).toEqual([]);
  });

  test('zéro catch strictement vide hors allowlist (qui ne peut que rétrécir)', () => {
    const files = [
      ...listFiles(path.join(ROOT, 'app')),
      ...listFiles(path.join(ROOT, 'lib')),
    ];

    const trouves = {};
    for (const f of files) {
      const src = fs.readFileSync(f, 'utf8');
      const n = (src.match(EMPTY_CATCH_RE) || []).length;
      if (n > 0) trouves[rel(f)] = n;
    }

    const problemes = [];
    for (const [file, n] of Object.entries(trouves)) {
      const tolere = CATCHS_VIDES[file] || 0;
      if (n > tolere) {
        problemes.push(`${file} : ${n} catch vide(s) (toléré : ${tolere}) — gérer l'erreur, reportError, ou a minima un commentaire d'intention`);
      }
    }
    for (const [file, tolere] of Object.entries(CATCHS_VIDES)) {
      const n = trouves[file] || 0;
      if (n < tolere) {
        problemes.push(`Progrès non enregistré : ${file} n'a plus que ${n} catch vide(s) (toléré : ${tolere}) — abaisser CATCHS_VIDES`);
      }
    }
    expect(problemes, problemes.join('\n')).toEqual([]);
  });
});
