/**
 * Messagerie support prof ↔ IziSolo (lib/messagerie-support, v87) — verrou
 * des RÈGLES du chantier :
 *
 *   1. Un fil support n'est JAMAIS visible côté élève (liste blanche, pas
 *      liste noire — un type futur ne fuit pas non plus).
 *   2. Un fil support ne fan-out JAMAIS vers des élèves (email instantané,
 *      push) : la dérivation des destinataires par type est la source unique.
 *   3. Le non-lu admin : NULL = jamais lu (anti-pattern « Lu fantôme » v24 —
 *      le champ naît NULL et n'est posé que par l'action de lecture).
 *   4. Le mapping « migration v87 manquante » (23514) — sans lui, l'insert
 *      échouerait en silence derrière un « Erreur serveur » (piège v19/v77).
 *
 * Test Node pur (aucun navigateur, aucun import lourd).
 */
import { test, expect } from '@playwright/test';
import {
  estSupport,
  estVisiblePourEleve,
  clientIdsNotifiables,
  estNonLuePourAdmin,
  estErreurMigrationV87,
  SUPPORT_TITRE,
} from '../../lib/messagerie-support.js';

test.describe('estVisiblePourEleve — liste blanche côté élève', () => {
  test('client et cours passent', () => {
    expect(estVisiblePourEleve({ type: 'client' })).toBe(true);
    expect(estVisiblePourEleve({ type: 'cours' })).toBe(true);
  });

  test('support ne passe JAMAIS', () => {
    expect(estVisiblePourEleve({ type: 'support' })).toBe(false);
  });

  test('type inconnu ou conv absente ne passent pas (liste blanche)', () => {
    expect(estVisiblePourEleve({ type: 'broadcast_futur' })).toBe(false);
    expect(estVisiblePourEleve({})).toBe(false);
    expect(estVisiblePourEleve(null)).toBe(false);
  });
});

test.describe('clientIdsNotifiables — un fil support ne notifie aucun élève', () => {
  test('support → personne, même avec des membres passés par erreur', () => {
    expect(clientIdsNotifiables({ type: 'support' })).toEqual([]);
    expect(clientIdsNotifiables({ type: 'support', client_id: 'c1' }, ['c2', 'c3'])).toEqual([]);
  });

  test('client → la fiche cible ; sans client_id → personne', () => {
    expect(clientIdsNotifiables({ type: 'client', client_id: 'c1' })).toEqual(['c1']);
    expect(clientIdsNotifiables({ type: 'client', client_id: null })).toEqual([]);
  });

  test('cours → les membres, dédupliqués, sans null', () => {
    expect(clientIdsNotifiables({ type: 'cours' }, ['c1', 'c2', 'c1', null])).toEqual(['c1', 'c2']);
    expect(clientIdsNotifiables({ type: 'cours' }, [])).toEqual([]);
    expect(clientIdsNotifiables({ type: 'cours' })).toEqual([]);
  });

  test('type inconnu ou conv absente → personne', () => {
    expect(clientIdsNotifiables({ type: 'mystere' }, ['c1'])).toEqual([]);
    expect(clientIdsNotifiables(null, ['c1'])).toEqual([]);
  });
});

test.describe('estNonLuePourAdmin — NULL = jamais lu', () => {
  test('aucun message de la prof → rien à lire', () => {
    expect(estNonLuePourAdmin(null, null)).toBe(false);
    expect(estNonLuePourAdmin(undefined, '2026-08-19T10:00:00Z')).toBe(false);
  });

  test('message prof + jamais ouvert par l\'équipe → non lu', () => {
    expect(estNonLuePourAdmin('2026-08-19T10:00:00Z', null)).toBe(true);
  });

  test('lecture APRÈS le dernier message prof → lu', () => {
    expect(estNonLuePourAdmin('2026-08-19T10:00:00Z', '2026-08-19T10:05:00Z')).toBe(false);
  });

  test('nouveau message prof APRÈS la dernière lecture → non lu', () => {
    expect(estNonLuePourAdmin('2026-08-19T11:00:00Z', '2026-08-19T10:05:00Z')).toBe(true);
  });

  test('lecture à la MÊME milliseconde que le message → lu (pas de faux positif)', () => {
    expect(estNonLuePourAdmin('2026-08-19T10:00:00.000Z', '2026-08-19T10:00:00.000Z')).toBe(false);
  });
});

test.describe('estSupport + mapping migration v87', () => {
  test('estSupport reconnaît le type, et rien d\'autre', () => {
    expect(estSupport({ type: 'support' })).toBe(true);
    expect(estSupport({ type: 'client' })).toBe(false);
    expect(estSupport(null)).toBe(false);
  });

  test('23514 (check_violation) = migration v87 manquante ; le reste non', () => {
    expect(estErreurMigrationV87({ code: '23514' })).toBe(true);
    expect(estErreurMigrationV87({ code: '23505' })).toBe(false);
    expect(estErreurMigrationV87(null)).toBe(false);
  });

  test('le titre du fil est stable (affiché en header prof + liste admin)', () => {
    expect(SUPPORT_TITRE).toBe('Équipe IziSolo');
  });
});
