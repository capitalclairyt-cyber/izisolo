// ═══════════════════════════════════════════════════════════════════════════
// Verrou CI — comment une offre borne sa période (2026-08-22, retour Colin :
// « si on met comme date que le mois de septembre on ne va pas refaire ça
// douze fois »). Spec Node pur (zéro navigateur, zéro serveur) : fige les
// règles de lib/offres-periode.js — période fixe contre durée glissante,
// calcul de la date de fin en heure de Paris, bornes posées à la vente.
// ═══════════════════════════════════════════════════════════════════════════
import { test, expect } from '@playwright/test';
import { estPeriodeGlissante, finGlissanteISO, bornesVente } from '../../lib/offres-periode.js';

test.describe('estPeriodeGlissante — une offre sans dates se compte depuis la vente', () => {
  test('abonnement mensuel : pas de dates, une durée', () => {
    expect(estPeriodeGlissante({ duree_jours: 30, date_debut: null, date_fin: null })).toBe(true);
  });

  test('saison : des dates, donc jamais glissante (même avec duree_jours)', () => {
    expect(estPeriodeGlissante({ date_debut: '2026-09-01', date_fin: '2027-06-30', duree_jours: 302 })).toBe(false);
    // Une seule des deux bornes suffit à sortir du glissant : une offre à
    // moitié datée n'est pas un abonnement mensuel, c'est une offre à réparer.
    expect(estPeriodeGlissante({ date_debut: '2026-09-01', date_fin: null, duree_jours: 30 })).toBe(false);
    expect(estPeriodeGlissante({ date_debut: null, date_fin: '2026-09-30', duree_jours: 30 })).toBe(false);
  });

  test('ni dates ni durée : rien à calculer, donc pas glissante', () => {
    expect(estPeriodeGlissante({ date_debut: null, date_fin: null, duree_jours: null })).toBe(false);
    expect(estPeriodeGlissante({})).toBe(false);
    expect(estPeriodeGlissante(null)).toBe(false);
    expect(estPeriodeGlissante(undefined)).toBe(false);
  });
});

test.describe('finGlissanteISO — la date de fin, sans dérive de fuseau', () => {
  test('durée ajoutée au jour de départ', () => {
    expect(finGlissanteISO(30, '2026-09-01')).toBe('2026-10-01');
    expect(finGlissanteISO(90, '2026-09-01')).toBe('2026-11-30');
    expect(finGlissanteISO(365, '2026-09-01')).toBe('2027-09-01');
    expect(finGlissanteISO(1, '2026-12-31')).toBe('2027-01-01');
  });

  test('la durée peut arriver en chaîne (champ de formulaire)', () => {
    expect(finGlissanteISO('30', '2026-09-01')).toBe('2026-10-01');
  });

  test('changement d\'heure : un mois reste un mois, pas 29 jours et 23 h', () => {
    // Passage à l'heure d'hiver en France dans la fenêtre (dernier dimanche
    // d'octobre). Un calcul en heure locale perdrait une heure et pourrait
    // reculer d'un jour ; le calcul en UTC pur ne bouge pas.
    expect(finGlissanteISO(30, '2026-10-20')).toBe('2026-11-19');
    // Et à l'inverse au printemps.
    expect(finGlissanteISO(30, '2027-03-20')).toBe('2027-04-19');
  });

  test('année bissextile traversée', () => {
    expect(finGlissanteISO(30, '2028-02-10')).toBe('2028-03-11');
  });

  test('durée absente ou absurde : null, jamais une date inventée', () => {
    expect(finGlissanteISO(null, '2026-09-01')).toBeNull();
    expect(finGlissanteISO(0, '2026-09-01')).toBeNull();
    expect(finGlissanteISO(-10, '2026-09-01')).toBeNull();
    expect(finGlissanteISO('abc', '2026-09-01')).toBeNull();
    expect(finGlissanteISO(undefined, '2026-09-01')).toBeNull();
  });

  test('sans date de départ : aujourd\'hui, au format AAAA-MM-JJ', () => {
    expect(finGlissanteISO(30)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

test.describe('bornesVente — ce qui est écrit sur l\'abonnement de l\'élève', () => {
  test('période fixe : les dates de l\'offre, telles quelles', () => {
    expect(bornesVente({ date_debut: '2026-09-01', date_fin: '2027-06-30', duree_jours: 302 }, '2026-11-15'))
      .toEqual({ date_debut: '2026-09-01', date_fin: '2027-06-30' });
  });

  test('glissante : la vente pose le départ, la durée pose la fin', () => {
    expect(bornesVente({ date_debut: null, date_fin: null, duree_jours: 30 }, '2026-11-15'))
      .toEqual({ date_debut: '2026-11-15', date_fin: '2026-12-15' });
  });

  test('deux ventes du même abonnement mensuel à des dates différentes ne se marchent pas dessus', () => {
    const offre = { date_debut: null, date_fin: null, duree_jours: 30 };
    expect(bornesVente(offre, '2026-09-03').date_fin).toBe('2026-10-03');
    expect(bornesVente(offre, '2026-09-28').date_fin).toBe('2026-10-28');
  });

  test('carnet sans durée : début posé, fin ouverte (jamais une fin bidon)', () => {
    expect(bornesVente({ date_debut: null, date_fin: null, duree_jours: null }, '2026-11-15'))
      .toEqual({ date_debut: '2026-11-15', date_fin: null });
  });

  test('offre absente : on pose quand même un début, pas un undefined en base', () => {
    expect(bornesVente(null, '2026-11-15')).toEqual({ date_debut: '2026-11-15', date_fin: null });
  });
});
