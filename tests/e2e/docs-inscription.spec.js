/**
 * Documents d'inscription (v85, lib/docs-inscription) — verrou du sanitize.
 *
 * La liste vit en JSONB libre (profiles.docs_inscription) et s'affiche sur
 * des surfaces PUBLIQUES (formulaire d'essai, espace élève) : sanitizeDocs
 * est la seule barrière entre ce JSONB et le DOM. Verrouille : https
 * obligatoire, nom requis/tronqué, plafond MAX_DOCS, entrées difformes
 * jetées sans casser.
 *
 * Test Node pur (aucun navigateur).
 */
import { test, expect } from '@playwright/test';
import { sanitizeDocs, MAX_DOCS } from '../../lib/docs-inscription.js';

const doc = (over = {}) => ({ url: 'https://blob.vercel-storage.com/x.pdf', nom: 'Questionnaire santé', ...over });

test.describe('sanitizeDocs', () => {
  test('valeur saine → conservée telle quelle', () => {
    const out = sanitizeDocs([doc({ ajoute_le: '2026-08-18' })]);
    expect(out).toEqual([{ url: 'https://blob.vercel-storage.com/x.pdf', nom: 'Questionnaire santé', ajoute_le: '2026-08-18' }]);
  });

  test('pas un tableau (null, objet, chaîne) → []', () => {
    expect(sanitizeDocs(null)).toEqual([]);
    expect(sanitizeDocs(undefined)).toEqual([]);
    expect(sanitizeDocs({ url: 'https://x' })).toEqual([]);
    expect(sanitizeDocs('https://x')).toEqual([]);
  });

  test('url non-https jetée (http, javascript:, data:, vide)', () => {
    expect(sanitizeDocs([doc({ url: 'http://insecure.com/a.pdf' })])).toEqual([]);
    expect(sanitizeDocs([doc({ url: 'javascript:alert(1)' })])).toEqual([]);
    expect(sanitizeDocs([doc({ url: 'data:text/html,<b>x</b>' })])).toEqual([]);
    expect(sanitizeDocs([doc({ url: '' })])).toEqual([]);
  });

  test('nom manquant ou vide → jeté ; nom trop long → tronqué à 80', () => {
    expect(sanitizeDocs([doc({ nom: '' })])).toEqual([]);
    expect(sanitizeDocs([doc({ nom: '   ' })])).toEqual([]);
    const long = sanitizeDocs([doc({ nom: 'x'.repeat(200) })]);
    expect(long[0].nom).toHaveLength(80);
  });

  test(`plafond ${MAX_DOCS} documents`, () => {
    const beaucoup = Array.from({ length: 10 }, (_, i) => doc({ url: `https://b.com/${i}.pdf` }));
    expect(sanitizeDocs(beaucoup)).toHaveLength(MAX_DOCS);
  });

  test('entrées difformes mélangées → seules les saines survivent', () => {
    const out = sanitizeDocs([null, 42, doc(), { url: 'https://ok.com/a.pdf' } /* sans nom */, doc({ url: 'https://ok.com/b.pdf', nom: 'CGV' })]);
    expect(out.map(d => d.nom)).toEqual(['Questionnaire santé', 'CGV']);
  });
});
