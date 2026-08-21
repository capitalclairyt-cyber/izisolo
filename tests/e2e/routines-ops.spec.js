/**
 * Verrou — lib/routines-ops.js (tableau « Travail récurrent » de l'admin).
 * Règles gravées : à-la-demande jamais en retard, jamais-exécutée = en retard,
 * seuil « bientôt » à 7 jours, date invalide = en retard (jamais un crash).
 * Spec Node pur (zéro navigateur), lancé en CI.
 */
import { test, expect } from '@playwright/test';
import { ROUTINES_OPS, etatRoutine, nbRoutinesEnRetard } from '../../lib/routines-ops.js';

const T = (iso) => new Date(iso + 'T12:00:00');

test.describe('etatRoutine', () => {
  test('sans fréquence : à la demande, jamais en retard', () => {
    const r = { frequenceJours: null, derniereExecution: null };
    expect(etatRoutine(r, T('2030-01-01')).statut).toBe('a_la_demande');
  });

  test('jamais exécutée avec fréquence : en retard', () => {
    const r = { frequenceJours: 30, derniereExecution: null };
    expect(etatRoutine(r, T('2026-08-21')).statut).toBe('en_retard');
  });

  test('exécutée aujourd\'hui, fréquence 90 j : à jour, échéance à J+90', () => {
    const r = { frequenceJours: 90, derniereExecution: '2026-08-21' };
    const e = etatRoutine(r, T('2026-08-21'));
    expect(e.statut).toBe('a_jour');
    expect(e.joursRestants).toBe(90);
    expect(e.prochaine.toISOString().slice(0, 10)).toBe('2026-11-19');
  });

  test('échéance dans 7 jours ou moins : bientôt (bord inclus)', () => {
    const r = { frequenceJours: 30, derniereExecution: '2026-08-01' };
    expect(etatRoutine(r, T('2026-08-24')).statut).toBe('bientot'); // J-7
    expect(etatRoutine(r, T('2026-08-31')).statut).toBe('bientot'); // jour J
    expect(etatRoutine(r, T('2026-08-23')).statut).toBe('a_jour');  // J-8
  });

  test('échéance dépassée : en retard, joursRestants négatif', () => {
    const r = { frequenceJours: 30, derniereExecution: '2026-06-01' };
    const e = etatRoutine(r, T('2026-08-21'));
    expect(e.statut).toBe('en_retard');
    expect(e.joursRestants).toBeLessThan(0);
  });

  test('date invalide : en retard, pas de crash', () => {
    const r = { frequenceJours: 30, derniereExecution: 'n-importe-quoi' };
    expect(etatRoutine(r, T('2026-08-21')).statut).toBe('en_retard');
  });
});

test.describe('nbRoutinesEnRetard + registre', () => {
  test('compte uniquement les en-retard', () => {
    const routines = [
      { frequenceJours: 30, derniereExecution: '2026-01-01' }, // en retard
      { frequenceJours: 30, derniereExecution: '2026-08-20' }, // à jour
      { frequenceJours: null, derniereExecution: null },        // à la demande
    ];
    expect(nbRoutinesEnRetard(routines, T('2026-08-21'))).toBe(1);
  });

  test('le registre réel est bien formé (id/nom/procédure, dates AAAA-MM-JJ)', () => {
    expect(ROUTINES_OPS.length).toBeGreaterThan(0);
    for (const r of ROUTINES_OPS) {
      expect(typeof r.id).toBe('string');
      expect(r.nom.length).toBeGreaterThan(3);
      expect(r.procedure.length).toBeGreaterThan(10);
      if (r.derniereExecution !== null) {
        expect(r.derniereExecution).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
      if (r.frequenceJours !== null) {
        expect(r.frequenceJours).toBeGreaterThan(0);
      }
    }
  });
});
