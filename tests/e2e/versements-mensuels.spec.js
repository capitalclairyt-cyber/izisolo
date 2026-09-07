// ═══════════════════════════════════════════════════════════════════════════
// Verrou CI — versements mensuels (2026-09-07, retour Manon/Soleya : « une
// facture chaque début de mois pour mes abonnements au mois »).
// Spec Node pure : fige lib/versements-mensuels.js.
//
// Les règles qu'on ne laisse pas glisser : un mois déjà couvert n'est JAMAIS
// doublé, on ne dépasse jamais la fin de l'abo, le 31 se replie sur le
// dernier jour du mois, et le compte rendu AVOUE les mois ignorés.
// ═══════════════════════════════════════════════════════════════════════════
import { test, expect } from '@playwright/test';
import {
  joursDansMois, dateDuMois, moisPlus, moisCouverts, premierMoisLibre,
  genererVersementsMensuels, resumeVersements, nbMoisOffre, versementsChaqueMois,
  MAX_VERSEMENTS, MAX_VERSEMENTS_TUNNEL,
} from '../../lib/versements-mensuels.js';

test.describe('calendrier — jours et mois', () => {
  test('joursDansMois connaît février et les bissextiles', () => {
    expect(joursDansMois(2026, 2)).toBe(28);
    expect(joursDansMois(2028, 2)).toBe(29);
    expect(joursDansMois(2026, 4)).toBe(30);
    expect(joursDansMois(2026, 12)).toBe(31);
  });

  test('dateDuMois replie le 31 sur le dernier jour, et refuse un mois malformé', () => {
    expect(dateDuMois('2026-04', 31)).toBe('2026-04-30');
    expect(dateDuMois('2026-02', 30)).toBe('2026-02-28');
    expect(dateDuMois('2026-09', 1)).toBe('2026-09-01');
    expect(dateDuMois('2026-09', 0)).toBe('2026-09-01');
    expect(dateDuMois('2026-09', 'abc')).toBe('2026-09-01');
    expect(dateDuMois('septembre', 1)).toBeNull();
  });

  test('moisPlus traverse les années dans les deux sens', () => {
    expect(moisPlus('2026-12', 1)).toBe('2027-01');
    expect(moisPlus('2026-01', -1)).toBe('2025-12');
    expect(moisPlus('2026-09', 12)).toBe('2027-09');
    expect(moisPlus('2026-09', 0)).toBe('2026-09');
  });
});

test.describe('moisCouverts — le mois d\'un paiement', () => {
  test('un paiement réglé compte pour son mois d\'ENCAISSEMENT (le cas Jessica : vendu le 29/07, encaissé le 01/08 → août)', () => {
    const set = moisCouverts([{ statut: 'paid', date: '2026-07-29', date_encaissement: '2026-08-01' }]);
    expect([...set]).toEqual(['2026-08']);
  });

  test('un paiement en attente compte pour son échéance ; annulé/remboursé ne couvre rien', () => {
    const set = moisCouverts([
      { statut: 'pending', date: '2026-10-01' },
      { statut: 'overdue', date: '2026-11-01' },
      { statut: 'refunded', date: '2026-12-01' },
      { statut: 'cancelled', date: '2027-01-01' },
      null,
    ]);
    expect([...set].sort()).toEqual(['2026-10', '2026-11']);
  });
});

test.describe('premierMoisLibre', () => {
  test('propose le mois courant s\'il est libre, sinon le premier qui suit', () => {
    expect(premierMoisLibre('2026-09-07', new Set())).toBe('2026-09');
    expect(premierMoisLibre('2026-09-07', new Set(['2026-09']))).toBe('2026-10');
    expect(premierMoisLibre('2026-09-07', new Set(['2026-09', '2026-10']))).toBe('2026-11');
    expect(premierMoisLibre('n/a')).toBeNull();
  });
});

test.describe('genererVersementsMensuels — le scénario de Manon', () => {
  const finAbo = '2027-06-28';

  test('Jessica : août réglé, du 1er septembre au 1er juin → 10 versements de 55 €, jamais après la fin', () => {
    const { versements, ignores } = genererVersementsMensuels({
      montant: 55, jour: 1, debut: '2026-09', fin: finAbo, couverts: new Set(['2026-08']),
    });
    expect(versements).toHaveLength(10);
    expect(versements[0]).toEqual({ mois: '2026-09', date: '2026-09-01', montant: 55 });
    expect(versements[9]).toEqual({ mois: '2027-06', date: '2027-06-01', montant: 55 });
    expect(ignores).toEqual([]);
    expect(versements.every(v => v.date <= finAbo)).toBe(true);
  });

  test('un mois déjà couvert au milieu est SAUTÉ et avoué, jamais doublé', () => {
    const { versements, ignores } = genererVersementsMensuels({
      montant: 55, jour: 1, debut: '2026-09', fin: '2026-12-31', couverts: new Set(['2026-10']),
    });
    expect(versements.map(v => v.mois)).toEqual(['2026-09', '2026-11', '2026-12']);
    expect(ignores).toEqual(['2026-10']);
  });

  test('re-valider après création ne fabrique rien (tout est couvert)', () => {
    const couverts = new Set(['2026-09', '2026-10', '2026-11', '2026-12']);
    const { versements, ignores } = genererVersementsMensuels({
      montant: 55, jour: 1, debut: '2026-09', fin: '2026-12-31', couverts,
    });
    expect(versements).toHaveLength(0);
    expect(ignores).toHaveLength(4);
  });

  test('le jour 31 se replie mois par mois (30 avril, 28 février) et le 28 juin borne', () => {
    const { versements } = genererVersementsMensuels({
      montant: 20, jour: 31, debut: '2027-01', fin: '2027-06-28',
    });
    expect(versements.map(v => v.date)).toEqual([
      '2027-01-31', '2027-02-28', '2027-03-31', '2027-04-30', '2027-05-31',
    ]);
  });

  test('sans fin : le plafond de 24 s\'applique ; nbMax le réduit', () => {
    expect(genererVersementsMensuels({ montant: 10, debut: '2026-01' }).versements).toHaveLength(MAX_VERSEMENTS);
    expect(genererVersementsMensuels({ montant: 10, debut: '2026-01', nbMax: 3 }).versements).toHaveLength(3);
    expect(genererVersementsMensuels({ montant: 10, debut: '2026-01', nbMax: 999 }).versements).toHaveLength(MAX_VERSEMENTS);
  });

  test('montant nul, négatif, ou début malformé → rien', () => {
    expect(genererVersementsMensuels({ montant: 0, debut: '2026-09' }).versements).toHaveLength(0);
    expect(genererVersementsMensuels({ montant: -5, debut: '2026-09' }).versements).toHaveLength(0);
    expect(genererVersementsMensuels({ montant: 55, debut: 'sept' }).versements).toHaveLength(0);
    expect(genererVersementsMensuels({ montant: '55,00', debut: '2026-09', nbMax: 1 }).versements).toHaveLength(1);
  });

  test('le montant est arrondi au centime', () => {
    const { versements } = genererVersementsMensuels({ montant: 33.333, debut: '2026-09', nbMax: 1 });
    expect(versements[0].montant).toBe(33.33);
  });
});

test.describe('resumeVersements — la phrase lue avant de confirmer', () => {
  test('pluriel avec bornes, singulier, vide', () => {
    const dix = genererVersementsMensuels({ montant: 55, debut: '2026-09', fin: '2027-06-28' }).versements;
    expect(resumeVersements(dix)).toBe('10 versements de 55 €, du 1 septembre 2026 au 1 juin 2027');
    expect(resumeVersements([{ date: '2026-09-15', montant: 42.5 }])).toBe('1 versement de 42,50 €, le 15 septembre 2026');
    expect(resumeVersements([])).toBe('Aucun versement à programmer');
  });

  test('les mois ignorés sont nommés', () => {
    const r = resumeVersements([{ date: '2026-09-01', montant: 55 }], ['2026-10', '2026-11']);
    expect(r).toContain('2 mois déjà couverts : octobre 2026, novembre 2026');
    expect(resumeVersements([], ['2026-10'])).toContain('1 mois déjà couvert : octobre 2026');
  });
});

test.describe('nbMoisOffre — le préréglage « Chaque mois » du tunnel', () => {
  test('offre de saison (Manon : 28/06 → 28/06) = 12 mois', () => {
    expect(nbMoisOffre({ date_debut: '2026-06-28', date_fin: '2027-06-28' })).toBe(12);
  });
  test('offre glissante : duree_jours / 30, arrondi', () => {
    expect(nbMoisOffre({ duree_jours: 365 })).toBe(12);
    expect(nbMoisOffre({ duree_jours: 90 })).toBe(3);
    expect(nbMoisOffre({ duree_jours: 30 })).toBe(1);
    expect(nbMoisOffre({ duree_jours: 120 })).toBe(4);
  });
  test('plafond tunnel 12, plancher 1, inconnu → null', () => {
    expect(nbMoisOffre({ duree_jours: 730 })).toBe(MAX_VERSEMENTS_TUNNEL);
    expect(nbMoisOffre({ duree_jours: 5 })).toBe(1);
    expect(nbMoisOffre({ date_debut: '2026-09-01', date_fin: '2026-09-20' })).toBe(1);
    expect(nbMoisOffre({})).toBeNull();
    expect(nbMoisOffre(null)).toBeNull();
    expect(nbMoisOffre({ date_debut: '2027-01-01', date_fin: '2026-01-01' })).toBeNull();
  });
});

test.describe('versementsChaqueMois — n mois égaux depuis aujourd\'hui', () => {
  test('12 × 55 € depuis le 7 septembre : un par mois, le premier coché encaissé SANS mode', () => {
    const v = versementsChaqueMois({ parMois: 55, nb: 12, aujourdhui: '2026-09-07' });
    expect(v).toHaveLength(12);
    expect(v[0]).toEqual({ montant: 55, date: '2026-09-07', encaisse: true, mode: '' });
    expect(v[1].date).toBe('2026-10-07');
    expect(v[11].date).toBe('2027-08-07');
    expect(v.slice(1).every(x => x.encaisse === false)).toBe(true);
    expect(v.reduce((s, x) => s + x.montant, 0)).toBe(660);
  });
  test('le 31 janvier donne le 28 février, puis le 31 mars', () => {
    const v = versementsChaqueMois({ parMois: 10, nb: 3, aujourdhui: '2026-01-31' });
    expect(v.map(x => x.date)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
  });
  test('montant nul ou date malformée → vide ; nb plafonné à 12', () => {
    expect(versementsChaqueMois({ parMois: 0, nb: 3, aujourdhui: '2026-09-07' })).toEqual([]);
    expect(versementsChaqueMois({ parMois: 10, nb: 3, aujourdhui: 'demain' })).toEqual([]);
    expect(versementsChaqueMois({ parMois: 10, nb: 40, aujourdhui: '2026-09-07' })).toHaveLength(12);
  });
});
