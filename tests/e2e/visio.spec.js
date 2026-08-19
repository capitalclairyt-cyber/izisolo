/**
 * Cours en ligne (lib/visio, v86) — verrou de LA règle de visibilité du lien.
 *
 * Le lien de visio est une ressource PAYANTE quand la prof le verrouille :
 * cette règle décide qui le voit (espace élève, rappel J-1). La casser en
 * silence = donner le cours gratuitement ou, pire, le cacher à une élève qui
 * a payé. Verrouille aussi le sanitize (URL https, protocole ajouté).
 *
 * Test Node pur (aucun navigateur).
 */
import { test, expect } from '@playwright/test';
import { lienVisioVisible, sanitizeLienVisio, estCoursEnLigne } from '../../lib/visio.js';

const VISIO = { lien_visio: 'https://zoom.us/j/123', lien_visio_verrouille: true };
const OUVERT = { lien_visio: 'https://zoom.us/j/123', lien_visio_verrouille: false };

test.describe('lienVisioVisible — la règle du verrou', () => {
  test('pas de lien configuré → jamais visible (même déverrouillé)', () => {
    expect(lienVisioVisible(null, { abonnement_id: 'x' })).toBe(false);
    expect(lienVisioVisible({ lien_visio: '', lien_visio_verrouille: false }, { abonnement_id: 'x' })).toBe(false);
  });

  test('cours déverrouillé → visible pour toute inscrite, même sans paiement', () => {
    expect(lienVisioVisible(OUVERT, { abonnement_id: null, type_presence: 'normal' }, [])).toBe(true);
  });

  test('verrouillé + carnet/abo lié → visible', () => {
    expect(lienVisioVisible(VISIO, { abonnement_id: 'abo-1', type_presence: 'normal' }, [])).toBe(true);
  });

  test('verrouillé + paiement paid rattaché à la présence → visible', () => {
    expect(lienVisioVisible(VISIO, { abonnement_id: null, type_presence: 'normal' }, [{ statut: 'paid' }])).toBe(true);
  });

  test('verrouillé + paiement seulement pending → PAS visible', () => {
    expect(lienVisioVisible(VISIO, { abonnement_id: null, type_presence: 'normal' }, [{ statut: 'pending' }])).toBe(false);
  });

  test('verrouillé + essai ou offert → visible (la prof a accepté/offert)', () => {
    expect(lienVisioVisible(VISIO, { abonnement_id: null, type_presence: 'essai' }, [])).toBe(true);
    expect(lienVisioVisible(VISIO, { abonnement_id: null, type_presence: 'offert' }, [])).toBe(true);
  });

  test('verrouillé + rien (walk-in non réglé) → PAS visible', () => {
    expect(lienVisioVisible(VISIO, { abonnement_id: null, type_presence: 'normal' }, [])).toBe(false);
    expect(lienVisioVisible(VISIO, null, [])).toBe(false);
  });
});

test.describe('sanitizeLienVisio + estCoursEnLigne', () => {
  test('https gardé, protocole ajouté, http refusé implicitement via upgrade', () => {
    expect(sanitizeLienVisio('https://meet.google.com/abc')).toBe('https://meet.google.com/abc');
    expect(sanitizeLienVisio('zoom.us/j/99')).toBe('https://zoom.us/j/99');
    expect(sanitizeLienVisio('  ')).toBe('');
    expect(sanitizeLienVisio('javascript:alert(1)')).toBe('');
  });

  test('estCoursEnLigne : visio et hybride, pas presentiel', () => {
    expect(estCoursEnLigne({ format: 'visio' })).toBe(true);
    expect(estCoursEnLigne({ format: 'hybride' })).toBe(true);
    expect(estCoursEnLigne({ format: 'presentiel' })).toBe(false);
    expect(estCoursEnLigne({})).toBe(false);
  });
});
