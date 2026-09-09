// ═══════════════════════════════════════════════════════════════════════════
// Verrou CI — changer les PLACES d'une série récurrente déjà créée
// (2026-09-09, retour Maude : « Yoga enfants » de 8 à 13, impossible ailleurs
// que séance par séance). Spec Node pur (zéro navigateur, zéro serveur) :
// fige lib/serie-capacite.js, qui décide ce qu'on écrit et ce qu'on annonce.
//
// La règle de fond : on ne retire JAMAIS une inscrite. Une séance déjà plus
// remplie que la nouvelle capacité reste telle quelle, et l'aperçu le dit.
// ═══════════════════════════════════════════════════════════════════════════
import { test, expect } from '@playwright/test';
import { parseCapacite, capaciteInchangee, planCapacite, apercuCapacite } from '../../lib/serie-capacite.js';

test.describe('parseCapacite — ce que le champ accepte', () => {
  test('vide = illimité, comme à la création', () => {
    expect(parseCapacite('')).toEqual({ ok: true, capacite: null });
    expect(parseCapacite('   ')).toEqual({ ok: true, capacite: null });
    expect(parseCapacite(null)).toEqual({ ok: true, capacite: null });
    expect(parseCapacite(undefined)).toEqual({ ok: true, capacite: null });
  });

  test('un entier positif passe, avec ses espaces', () => {
    expect(parseCapacite('13')).toEqual({ ok: true, capacite: 13 });
    expect(parseCapacite(' 8 ')).toEqual({ ok: true, capacite: 8 });
    expect(parseCapacite(1)).toEqual({ ok: true, capacite: 1 });
  });

  test('zéro, négatif, décimal, texte : refusés avec une raison', () => {
    for (const v of ['0', '-3', '12.5', 'douze', '1e3']) {
      const r = parseCapacite(v);
      expect(r.ok, v).toBe(false);
      expect(typeof r.raison).toBe('string');
      expect(r.raison.length).toBeGreaterThan(10);
    }
  });
});

test.describe('capaciteInchangee — null et undefined disent la même chose', () => {
  test('rien à écrire', () => {
    expect(capaciteInchangee(8, 8)).toBe(true);
    expect(capaciteInchangee(null, null)).toBe(true);
    expect(capaciteInchangee(undefined, null)).toBe(true);
  });
  test('quelque chose à écrire', () => {
    expect(capaciteInchangee(8, 13)).toBe(false);
    expect(capaciteInchangee(null, 13)).toBe(false);
    expect(capaciteInchangee(8, null)).toBe(false);
  });
});

const occ = (date, inscrites, id = date) => ({ id, date, inscrites });

test.describe('planCapacite — ce qui va se passer', () => {
  test('personne au-dessus : aucun dépassement', () => {
    const plan = planCapacite({ occurrences: [occ('2026-09-15', 6), occ('2026-09-22', 8)], capacite: 13 });
    expect(plan).toEqual({ capacite: 13, nbSeances: 2, depassements: [] });
  });

  test('une séance déjà plus remplie que la nouvelle capacité est nommée, jamais vidée', () => {
    const plan = planCapacite({
      occurrences: [occ('2026-09-15', 9, 'a'), occ('2026-09-22', 8, 'b'), occ('2026-09-29', 10, 'c')],
      capacite: 8,
    });
    expect(plan.depassements).toEqual([
      { id: 'a', date: '2026-09-15', inscrites: 9 },
      { id: 'c', date: '2026-09-29', inscrites: 10 },
    ]);
    expect(plan.nbSeances).toBe(3);
  });

  test('égalité stricte : 8 inscrites sur 8 places, ce n\'est pas un dépassement', () => {
    const plan = planCapacite({ occurrences: [occ('2026-09-15', 8)], capacite: 8 });
    expect(plan.depassements).toEqual([]);
  });

  test('illimité : jamais de dépassement, quel que soit le remplissage', () => {
    const plan = planCapacite({ occurrences: [occ('2026-09-15', 40)], capacite: null });
    expect(plan.depassements).toEqual([]);
    expect(plan.capacite).toBeNull();
  });

  test('inscrites absentes = 0, pas NaN', () => {
    const plan = planCapacite({ occurrences: [{ id: 'x', date: '2026-09-15' }], capacite: 1 });
    expect(plan.depassements).toEqual([]);
  });

  test('aucune séance à venir : un plan vide, pas une exception', () => {
    expect(planCapacite({ capacite: 5 })).toEqual({ capacite: 5, nbSeances: 0, depassements: [] });
  });
});

test.describe('apercuCapacite — la phrase avant de confirmer', () => {
  test('cas simple, au pluriel', () => {
    const t = apercuCapacite(planCapacite({ occurrences: [occ('2026-09-15', 6), occ('2026-09-22', 8)], capacite: 13 }));
    expect(t).toBe('Les 2 séances à venir passent à 13 places.');
  });

  test('une seule séance, une seule place : singuliers', () => {
    const t = apercuCapacite(planCapacite({ occurrences: [occ('2026-09-15', 0)], capacite: 1 }));
    expect(t).toBe('La séance à venir passe à 1 place.');
  });

  test('illimité se dit en toutes lettres', () => {
    const t = apercuCapacite(planCapacite({ occurrences: [occ('2026-09-15', 6), occ('2026-09-22', 6)], capacite: null }));
    expect(t).toBe('Les 2 séances à venir passent en places illimitées.');
  });

  test('un dépassement est annoncé avec sa date et son nombre, et la promesse « personne n\'est retiré »', () => {
    const t = apercuCapacite(planCapacite({ occurrences: [occ('2026-09-15', 9), occ('2026-09-22', 3)], capacite: 8 }));
    expect(t).toContain('passent à 8 places');
    expect(t).toContain('1 séance a déjà plus d\'inscrites que ça (15/09/2026 : 9)');
    expect(t).toContain('personne n\'est retiré');
    expect(t).toContain('elle reste complète');
  });

  test('plusieurs dépassements : trois exemples au plus, puis des points de suspension', () => {
    const t = apercuCapacite(planCapacite({
      occurrences: ['01', '08', '15', '22', '29'].map(d => occ(`2026-09-${d}`, 12)),
      capacite: 10,
    }));
    expect(t).toContain('5 séances ont déjà plus d\'inscrites que ça');
    expect(t).toContain('01/09/2026 : 12, 08/09/2026 : 12, 15/09/2026 : 12…');
    expect(t).not.toContain('22/09/2026');
    expect(t).toContain('elles restent complètes');
  });

  test('plan absent : chaîne vide, pas une exception', () => {
    expect(apercuCapacite(null)).toBe('');
  });
});
