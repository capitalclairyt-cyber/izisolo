/**
 * Évaluation du délai d'annulation (lib/regles-annulation).
 *
 * Verrouille le fix du 2026-07-25 (bug Manon/Soleya) : Postgres renvoie
 * `heure` en 'HH:MM:SS', l'ancien code construisait '…T17:45:00:00' →
 * Invalid Date → diff NaN → TOUTE annulation était « tardive », même un
 * mois avant le cours.
 *
 * Test Node pur (aucun navigateur) : on importe la fonction directement.
 * Les instants `now` sont passés avec offset explicite (+02:00 été Paris)
 * pour être déterministes quel que soit le fuseau de la machine de test.
 */
import { test, expect } from '@playwright/test';
import { evaluerAnnulation, formatDateLimite } from '../../lib/regles-annulation.js';

const PROFILE_24H = { regles_annulation: { delai_heures: 24 } };

test.describe('evaluerAnnulation — formats d\'heure Postgres', () => {
  test('cours dans un mois, heure HH:MM:SS → annulable (le bug Manon)', () => {
    // Annulation le 24 juillet d'un cours du 24 août : LE cas remonté.
    const now = new Date('2026-07-24T19:00:00+02:00').getTime();
    const r = evaluerAnnulation(PROFILE_24H, '2026-08-24', '17:45:00', null, now);
    expect(r.annulable).toBe(true);
    expect(r.diffHeures).toBeGreaterThan(700); // ~31 jours
  });

  test('cours dans 2 h (délai 24 h) → tardive, diff cohérente', () => {
    const now = new Date('2026-07-24T15:45:00+02:00').getTime();
    const r = evaluerAnnulation(PROFILE_24H, '2026-07-24', '17:45:00', null, now);
    expect(r.annulable).toBe(false);
    expect(r.diffHeures).toBeGreaterThan(1.9);
    expect(r.diffHeures).toBeLessThan(2.1);
  });

  test('heure déjà en HH:MM → même résultat', () => {
    const now = new Date('2026-07-24T19:00:00+02:00').getTime();
    const r = evaluerAnnulation(PROFILE_24H, '2026-08-24', '17:45', null, now);
    expect(r.annulable).toBe(true);
  });

  test('exactement à la limite (24 h pile) → encore annulable', () => {
    const now = new Date('2026-08-23T17:45:00+02:00').getTime();
    const r = evaluerAnnulation(PROFILE_24H, '2026-08-24', '17:45:00', null, now);
    expect(r.annulable).toBe(true);
    expect(Math.abs(r.diffHeures - 24)).toBeLessThan(0.01);
  });

  test('sans heure (null) → minuit, cours de demain matin = tardive', () => {
    const now = new Date('2026-07-24T19:00:00+02:00').getTime();
    const r = evaluerAnnulation(PROFILE_24H, '2026-07-25', null, null, now);
    expect(r.annulable).toBe(false); // minuit du 25 = dans 5 h < 24 h
  });

  test('date imparsable → fail-open : jamais de sanction sur un bug', () => {
    const r = evaluerAnnulation(PROFILE_24H, 'n/importe/quoi', '17:45:00', null, Date.now());
    expect(r.annulable).toBe(true);
    expect(r.dateLimite).toBe(null);
  });

  test('délai spécifique par type de cours prioritaire sur le global', () => {
    const profile = { regles_annulation: { delai_heures: 24, regles_par_type: { 'Yoga Prénatal': { delai_heures: 48 } } } };
    const now = new Date('2026-08-23T10:00:00+02:00').getTime(); // ~31h45 avant
    const global = evaluerAnnulation(profile, '2026-08-24', '17:45:00', 'Vinyasa', now);
    const special = evaluerAnnulation(profile, '2026-08-24', '17:45:00', 'Yoga Prénatal', now);
    expect(global.annulable).toBe(true);   // 31h45 >= 24
    expect(special.annulable).toBe(false); // 31h45 < 48
  });

  test('dateLimite = cours − délai, formatable', () => {
    const now = new Date('2026-07-24T19:00:00+02:00').getTime();
    const r = evaluerAnnulation(PROFILE_24H, '2026-08-24', '17:45:00', null, now);
    expect(formatDateLimite(r.dateLimite)).toContain('23 août');
  });
});
