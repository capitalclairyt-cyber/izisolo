/**
 * Verrous B1b (audit agenda/récurrences 2026-07-25) — Node pur, aucun navigateur.
 *
 * 1. semainesEntre (lib/dates) : la parité bimensuelle comptait les semaines
 *    en millisecondes locales → le passage à l'heure d'été perdait 1 h et
 *    flippait la parité (série « 1 sem./2 » ancrée lundi 02/03/2026 : 02/03,
 *    16/03 puis 06/04 au lieu du 30/03). Prouvé par exécution avant fix.
 *
 * 2. presenceOccupePlace (lib/presences) : formule de capacité v74 — les
 *    annulations tardives et statuts annule/declinee ne bloquent pas une
 *    place. Six surfaces comptaient encore « brut » avant B1b.
 */
import { test, expect } from '@playwright/test';
import { semainesEntre } from '../../lib/dates.js';
import {
  presenceOccupePlace, presenceEstReservationActive, compterPlacesOccupees,
} from '../../lib/presences.js';

test.describe('semainesEntre — parité insensible au DST', () => {
  test('semaines exactes avant le changement d\'heure', () => {
    expect(semainesEntre('2026-03-02', '2026-03-02')).toBe(0);
    expect(semainesEntre('2026-03-02', '2026-03-16')).toBe(2);
  });

  test('à travers le passage à l\'heure d\'été (29/03/2026) — le bug historique', () => {
    // Avant fix : floor((30/03 - 02/03) / 7j) = 3.99… → 3 (impair) → date sautée.
    expect(semainesEntre('2026-03-02', '2026-03-30')).toBe(4); // PAIR → générée
    expect(semainesEntre('2026-03-02', '2026-04-06')).toBe(5);
    expect(semainesEntre('2026-03-02', '2026-04-13')).toBe(6); // PAIR
    expect(semainesEntre('2026-03-02', '2026-04-27')).toBe(8); // PAIR
  });

  test('à travers le passage à l\'heure d\'hiver (25/10/2026)', () => {
    expect(semainesEntre('2026-10-19', '2026-11-02')).toBe(2);
    expect(semainesEntre('2026-10-19', '2026-11-16')).toBe(4);
  });

  test('accepte Date et string, jours partiels arrondis à la semaine inférieure', () => {
    expect(semainesEntre(new Date(2026, 2, 2), '2026-03-10')).toBe(1); // 8 jours
    expect(semainesEntre('2026-03-02', '2026-03-08')).toBe(0);         // 6 jours
  });
});

test.describe('presenceOccupePlace — formule v74', () => {
  test('inscrit / pointé occupent une place', () => {
    expect(presenceOccupePlace({ statut_pointage: 'inscrit' })).toBe(true);
    expect(presenceOccupePlace({ statut_pointage: 'present' })).toBe(true);
    expect(presenceOccupePlace({ statut_pointage: 'absent' })).toBe(true);
    expect(presenceOccupePlace({ statut_pointage: 'absent_compte' })).toBe(true);
    expect(presenceOccupePlace({ statut_pointage: 'excuse' })).toBe(true);
    // NULL = 'inscrit' (DEFAULT v5, coalesce v74)
    expect(presenceOccupePlace({ statut_pointage: null })).toBe(true);
  });

  test('annulation tardive / annule / declinee libèrent la place', () => {
    expect(presenceOccupePlace({ statut_pointage: 'inscrit', annulation_tardive: true })).toBe(false);
    expect(presenceOccupePlace({ statut_pointage: 'annule' })).toBe(false);
    expect(presenceOccupePlace({ statut_pointage: 'declinee' })).toBe(false);
    expect(presenceOccupePlace(null)).toBe(false);
  });

  test('réservation active = inscrit vivant uniquement', () => {
    expect(presenceEstReservationActive({ statut_pointage: 'inscrit' })).toBe(true);
    expect(presenceEstReservationActive({ statut_pointage: null })).toBe(true);
    expect(presenceEstReservationActive({ statut_pointage: 'present' })).toBe(false); // pointée
    expect(presenceEstReservationActive({ statut_pointage: 'inscrit', annulation_tardive: true })).toBe(false);
    expect(presenceEstReservationActive({ statut_pointage: 'annule' })).toBe(false);
  });

  test('compterPlacesOccupees — le scénario du portail « Complet » à tort', () => {
    const presences = [
      { statut_pointage: 'inscrit' },
      { statut_pointage: 'inscrit' },
      { statut_pointage: 'inscrit', annulation_tardive: true }, // siège fantôme
      { statut_pointage: 'annule' },                             // siège fantôme
    ];
    // Avant B1b : 4/4 « Complet » — bouton Réserver masqué pour 2 places libres.
    expect(compterPlacesOccupees(presences)).toBe(2);
    expect(compterPlacesOccupees([])).toBe(0);
    expect(compterPlacesOccupees(null)).toBe(0);
  });
});
