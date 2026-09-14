/**
 * Demander un avis Google (v117, 2026-09-14) — lib/avis-google.
 * Test Node pur (aucun navigateur, aucune base).
 *
 * Verrouille : la validation du lien (https, hôtes Google seulement, jamais
 * deviné), le sanitize (lien invalide = aucun réglage), les candidates de
 * l'email automatique (seuil de 3 présences « présente », séances passées et
 * non annulées seulement, déjà servies exclues, plafond par jour, les plus
 * récentes d'abord), et surtout ce que l'email ne DIT PAS : aucune
 * contrepartie, aucune condition, une seule fois. Les règles de Google sont
 * encodées ici, pas dans un tuto.
 */
import { test, expect } from '@playwright/test';
import {
  lienAvisValide, sanitizeAvisGoogle, lireAvisGoogle, lienAvis, emailAutoActif,
  candidatesAvis, emailAvis, gabaritAnnonceAvis, SEUIL_PRESENCES, MAX_PAR_JOUR, TYPE_NOTIF_AVIS,
} from '../../lib/avis-google.js';
import { wantsNotif, sanitizePrefs, NOTIF_TYPES_ELEVE } from '../../lib/notif-prefs.js';

const LIEN = 'https://g.page/r/CaBcDeFgHiJkL/review';

test.describe('lienAvisValide — un lien Google en https, rien d\'autre', () => {
  test('les formes que Google donne sont acceptées', () => {
    expect(lienAvisValide(LIEN)).toBe(true);
    expect(lienAvisValide('https://search.google.com/local/writereview?placeid=ChIJxyz')).toBe(true);
    expect(lienAvisValide('https://maps.app.goo.gl/AbCdEf')).toBe(true);
    expect(lienAvisValide('https://www.google.com/maps/place/Studio/@45.1,5.7,17z')).toBe(true);
    expect(lienAvisValide('  https://g.page/r/xyz/review  ')).toBe(true); // espaces tolérés
  });

  test('http, un autre domaine, un domaine qui « contient » google, du texte : refusés', () => {
    expect(lienAvisValide('http://g.page/r/xyz/review')).toBe(false);
    expect(lienAvisValide('https://facebook.com/monstudio/reviews')).toBe(false);
    expect(lienAvisValide('https://google.com.evil.fr/review')).toBe(false);
    expect(lienAvisValide('https://notgoogle.com/review')).toBe(false);
    expect(lienAvisValide('g.page/r/xyz/review')).toBe(false); // sans protocole
    expect(lienAvisValide('')).toBe(false);
    expect(lienAvisValide(null)).toBe(false);
    expect(lienAvisValide(42)).toBe(false);
    expect(lienAvisValide('https://g.page/' + 'x'.repeat(600))).toBe(false);
  });
});

test.describe('sanitize / lecture', () => {
  test('lien valide → réglage, auto vrai par défaut', () => {
    expect(sanitizeAvisGoogle({ lien: LIEN })).toEqual({ lien: LIEN, auto: true });
    expect(sanitizeAvisGoogle({ lien: `  ${LIEN} `, auto: false })).toEqual({ lien: LIEN, auto: false });
  });

  test('lien invalide ou absent → aucun réglage, jamais deviné', () => {
    expect(sanitizeAvisGoogle({ lien: 'https://facebook.com/x' })).toBeNull();
    expect(sanitizeAvisGoogle({ auto: true })).toBeNull();
    expect(sanitizeAvisGoogle(null)).toBeNull();
    expect(sanitizeAvisGoogle('https://g.page/r/x/review')).toBeNull(); // pas un objet
    expect(lireAvisGoogle({ avis_google: 'nimporte' })).toBeNull();
    expect(lireAvisGoogle(null)).toBeNull();
  });

  test('lienAvis et emailAutoActif lisent la même vérité', () => {
    expect(lienAvis({ lien: LIEN })).toBe(LIEN);
    expect(lienAvis({ lien: 'http://g.page/x' })).toBeNull();
    expect(emailAutoActif({ lien: LIEN })).toBe(true);
    expect(emailAutoActif({ lien: LIEN, auto: false })).toBe(false);
    expect(emailAutoActif(null)).toBe(false);
    expect(emailAutoActif({ lien: 'pas un lien', auto: true })).toBe(false); // sans lien, rien ne part
  });
});

test.describe('candidatesAvis — qui reçoit l\'email, et quand', () => {
  const today = '2026-09-14';
  const pres = (client_id, date, statut = 'present', est_annule = false) => ({ client_id, statut_pointage: statut, cours: { date, est_annule } });

  test('seuil : 3 présences « présente » sur des séances passées', () => {
    expect(SEUIL_PRESENCES).toBe(3);
    const rows = [
      pres('a', '2026-09-01'), pres('a', '2026-09-08'), pres('a', '2026-09-13'),
      pres('b', '2026-09-01'), pres('b', '2026-09-08'),
    ];
    const out = candidatesAvis(rows, new Set(), today);
    expect(out.map(c => c.client_id)).toEqual(['a']);
    expect(out[0]).toEqual({ client_id: 'a', nb: 3, derniere: '2026-09-13' });
  });

  test('une absente, une excusée, une inscrite non pointée ne comptent pas', () => {
    const rows = [pres('a', '2026-09-01'), pres('a', '2026-09-08'), pres('a', '2026-09-10', 'absent'), pres('a', '2026-09-11', 'excuse'), pres('a', '2026-09-12', 'inscrit')];
    expect(candidatesAvis(rows, new Set(), today)).toEqual([]);
  });

  test('une séance annulée ou à venir ne compte pas', () => {
    const rows = [pres('a', '2026-09-01'), pres('a', '2026-09-08'), pres('a', '2026-09-10', 'present', true), pres('a', '2026-09-20')];
    expect(candidatesAvis(rows, new Set(), today)).toEqual([]);
    // le jour même compte (la séance est passée quand le cron tourne le lendemain matin, mais si la date = today, elle est passée aussi)
    const rows2 = [pres('a', '2026-09-01'), pres('a', '2026-09-08'), pres('a', today)];
    expect(candidatesAvis(rows2, new Set(), today).length).toBe(1);
  });

  test('déjà sollicitée : jamais deux fois', () => {
    const rows = [pres('a', '2026-09-01'), pres('a', '2026-09-08'), pres('a', '2026-09-13')];
    expect(candidatesAvis(rows, new Set(['a']), today)).toEqual([]);
  });

  test('plafond par jour, les plus récentes d\'abord : jamais de rafale sur la fiche', () => {
    expect(MAX_PAR_JOUR).toBe(5);
    const rows = [];
    for (let i = 0; i < 12; i++) {
      const id = `c${String(i).padStart(2, '0')}`;
      rows.push(pres(id, '2026-08-01'), pres(id, '2026-08-08'), pres(id, `2026-09-${String(i + 1).padStart(2, '0')}`));
    }
    const out = candidatesAvis(rows, new Set(), today);
    expect(out.length).toBe(5);
    expect(out.map(c => c.derniere)).toEqual(['2026-09-12', '2026-09-11', '2026-09-10', '2026-09-09', '2026-09-08']);
    // un plafond sur mesure pour la preuve
    expect(candidatesAvis(rows, new Set(), today, { max: 2 }).length).toBe(2);
  });

  test('entrées difformes ignorées, jamais une exception', () => {
    expect(candidatesAvis(null, null, today)).toEqual([]);
    expect(candidatesAvis([{}, { client_id: 'a' }, { client_id: 'a', statut_pointage: 'present' }, { client_id: 'a', statut_pointage: 'present', cours: null }], undefined, today)).toEqual([]);
  });
});

test.describe('l\'email et le gabarit : rien promis, rien exigé, une seule fois', () => {
  const INTERDITS = /offert|gratuit|cadeau|réduction|remise|en échange|si tu es contente|si ça t'a plu|5 étoiles|cinq étoiles/i;

  test('l\'email porte le lien, nomme le studio, dit « une seule fois »', () => {
    const m = emailAvis({ prenom: 'Léa', studioNom: 'Maude Yoga', lien: LIEN });
    expect(m.sujet).toContain('Maude Yoga');
    expect(m.corps).toContain(LIEN);
    expect(m.corps).toContain('Bonjour Léa,');
    expect(m.corps).toMatch(/une seule fois/i);
    expect(m.corps).toMatch(/ce que tu penses vraiment/i);
  });

  test('sans prénom : « Bonjour, » propre, jamais « Bonjour , »', () => {
    const m = emailAvis({ prenom: '', studioNom: 'Maude Yoga', lien: LIEN });
    expect(m.corps.startsWith('Bonjour,\n')).toBe(true);
    expect(m.corps).not.toContain('Bonjour ,');
  });

  test('aucune contrepartie ni condition de satisfaction (règles Google)', () => {
    const m = emailAvis({ prenom: 'Léa', studioNom: 'Maude Yoga', lien: LIEN });
    expect(m.sujet + '\n' + m.corps).not.toMatch(INTERDITS);
    expect(gabaritAnnonceAvis({ studioNom: 'Maude Yoga', lien: LIEN })).not.toMatch(INTERDITS);
  });

  test('le gabarit d\'annonce porte le lien et le studio', () => {
    const g = gabaritAnnonceAvis({ studioNom: 'Maude Yoga', lien: LIEN });
    expect(g).toContain(LIEN);
    expect(g).toContain('Maude Yoga');
    expect(g.length).toBeLessThan(4000); // plafond du composeur
  });

  test('zéro tiret quadratin dans ce qui part aux humains', () => {
    const m = emailAvis({ prenom: 'Léa', studioNom: 'Studio', lien: LIEN });
    expect(m.sujet + m.corps + gabaritAnnonceAvis({ studioNom: 'Studio', lien: LIEN })).not.toContain('—');
  });
});

test.describe('la pref élève « avis » et le type de dédup', () => {
  test('type élève « avis » : email seulement, ON par défaut, désactivable', () => {
    const def = NOTIF_TYPES_ELEVE.find(t => t.key === 'avis');
    expect(def).toBeDefined();
    expect(def.channels).toEqual(['email']);
    expect(wantsNotif({}, 'avis', 'eleve', 'email')).toBe(true);
    expect(wantsNotif({}, 'avis', 'eleve', 'push')).toBe(false); // canal non pertinent
    expect(wantsNotif({ avis: { email: false } }, 'avis', 'eleve', 'email')).toBe(false);
    expect(sanitizePrefs({ avis: { email: false, push: true } }, 'eleve')).toEqual({ avis: { email: false } });
  });

  test('le type notifications_eleves est figé (la dédup à vie en dépend)', () => {
    expect(TYPE_NOTIF_AVIS).toBe('avis_google');
  });
});
