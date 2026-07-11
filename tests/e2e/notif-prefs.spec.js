/**
 * Préférences de notification par canal (lib/notif-prefs).
 * Verrouille wantsNotif (email/push, rétrocompat booléen, canal non pertinent,
 * défauts) et sanitizePrefs. Test Node pur (aucun navigateur).
 */
import { test, expect } from '@playwright/test';
import { wantsNotif, sanitizePrefs, effectivePrefs } from '../../lib/notif-prefs.js';

test.describe('wantsNotif — canaux', () => {
  test('nouveau format { email, push } respecté par canal', () => {
    const prefs = { rappel_cours: { email: false, push: true } };
    expect(wantsNotif(prefs, 'rappel_cours', 'eleve', 'email')).toBe(false);
    expect(wantsNotif(prefs, 'rappel_cours', 'eleve', 'push')).toBe(true);
  });

  test('canal non pertinent pour le type → toujours false', () => {
    // "message" (élève) n'émet que du push → pas d'email
    expect(wantsNotif({}, 'message', 'eleve', 'email')).toBe(false);
    expect(wantsNotif({}, 'message', 'eleve', 'push')).toBe(true); // défaut push ON
  });

  test('défaut du catalogue quand la clé est absente', () => {
    expect(wantsNotif({}, 'rappel_cours', 'eleve', 'email')).toBe(true);
    expect(wantsNotif({}, 'pointage_rappel', 'prof', 'push')).toBe(false); // seul défaut OFF
  });

  test('rétrocompat : ancien booléen s\'applique à tous les canaux', () => {
    expect(wantsNotif({ carnet: false }, 'carnet', 'eleve', 'email')).toBe(false);
    expect(wantsNotif({ carnet: false }, 'carnet', 'eleve', 'push')).toBe(false);
    expect(wantsNotif({ carnet: true }, 'carnet', 'eleve', 'email')).toBe(true);
  });

  test('clé de canal absente dans l\'objet stocké → défaut', () => {
    // push explicitement off, email non renseigné → email retombe sur le défaut (true)
    const prefs = { carnet: { push: false } };
    expect(wantsNotif(prefs, 'carnet', 'eleve', 'push')).toBe(false);
    expect(wantsNotif(prefs, 'carnet', 'eleve', 'email')).toBe(true);
  });
});

test.describe('sanitizePrefs', () => {
  test('ne garde que types + canaux connus, format { email, push }', () => {
    const dirty = {
      rappel_cours: { email: false, push: true, sms: true /* inconnu */ },
      inconnu: { push: true },
      message: { email: true /* canal N/A pour message */, push: false },
    };
    const clean = sanitizePrefs(dirty, 'eleve');
    expect(clean.rappel_cours).toEqual({ email: false, push: true });
    expect(clean.inconnu).toBeUndefined();
    expect(clean.message).toEqual({ push: false }); // email retiré (non émis)
  });

  test('migre un ancien booléen vers les canaux du type', () => {
    const clean = sanitizePrefs({ rappel_cours: false }, 'eleve');
    expect(clean.rappel_cours).toEqual({ email: false, push: false });
  });
});

test('effectivePrefs remplit les défauts par canal', () => {
  const eff = effectivePrefs({ rappel_cours: { push: false } }, 'eleve');
  expect(eff.rappel_cours).toEqual({ email: true, push: false }); // email défaut ON
  expect(eff.message).toEqual({ push: true });                    // 1 seul canal
});
