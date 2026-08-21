/**
 * Verrou — lib/todo-ops.js (la to-do équipe de /admin/todo).
 * Règles gravées : registre bien formé (ids uniques, catégories connues,
 * statuts/priorités valides), tri priorité puis ancienneté, badge = hautes
 * non faites. Spec Node pur, lancé en CI.
 */
import { test, expect } from '@playwright/test';
import { TODO_OPS, TODO_CATEGORIES, todoParCategorie, nbTodoHaute } from '../../lib/todo-ops.js';

test.describe('registre TODO_OPS', () => {
  test('bien formé : ids uniques, catégories connues, champs valides', () => {
    const ids = new Set();
    for (const t of TODO_OPS) {
      expect(ids.has(t.id), `id dupliqué : ${t.id}`).toBe(false);
      ids.add(t.id);
      expect(Object.keys(TODO_CATEGORIES)).toContain(t.categorie);
      expect(['haute', 'normale', 'basse']).toContain(t.priorite);
      expect(['a_faire', 'en_cours']).toContain(t.statut);
      expect(t.ajoute).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(t.titre.length).toBeGreaterThan(3);
      expect(t.description.length).toBeGreaterThan(20);
    }
  });
});

test.describe('todoParCategorie', () => {
  test('groupe par catégorie et trie priorité puis ancienneté', () => {
    const items = [
      { id: 'a', categorie: 'secu', priorite: 'basse', statut: 'a_faire', ajoute: '2026-01-01' },
      { id: 'b', categorie: 'secu', priorite: 'haute', statut: 'a_faire', ajoute: '2026-08-01' },
      { id: 'c', categorie: 'secu', priorite: 'haute', statut: 'a_faire', ajoute: '2026-02-01' },
      { id: 'd', categorie: 'features', priorite: 'normale', statut: 'a_faire', ajoute: '2026-03-01' },
    ];
    const g = todoParCategorie(items);
    expect(g.secu.map(t => t.id)).toEqual(['c', 'b', 'a']);
    expect(g.features.map(t => t.id)).toEqual(['d']);
  });

  test('toutes les catégories existent même vides', () => {
    const g = todoParCategorie([]);
    for (const cle of Object.keys(TODO_CATEGORIES)) expect(Array.isArray(g[cle])).toBe(true);
  });
});

test.describe('nbTodoHaute', () => {
  test('compte les hautes non faites', () => {
    expect(nbTodoHaute([
      { priorite: 'haute', statut: 'a_faire' },
      { priorite: 'haute', statut: 'en_cours' },
      { priorite: 'normale', statut: 'a_faire' },
    ])).toBe(2);
  });
});
