// ═══════════════════════════════════════════════════════════════════════════
// Verrou CI — changer le jour d'une série récurrente déjà créée (2026-08-23,
// retour Colin : « on devrait avoir la modif du jour sur cet écran pour les
// cours récurrents »). Spec Node pur (zéro navigateur, zéro serveur) : fige
// lib/serie-jour.js, qui décide CE QUI BOUGE et DE COMBIEN.
//
// Le sujet est délicat : les séances déplacées portent des inscrites. La règle
// est donc « on décale, on ne régénère jamais » — et on n'avance que.
// ═══════════════════════════════════════════════════════════════════════════
import { test, expect } from '@playwright/test';
import {
  jourDeLaSemaine, deltaVersJour, decalerJours,
  serieDeplacable, planDeplacement, apercuDeplacement,
} from '../../lib/serie-jour.js';

test.describe('jourDeLaSemaine — 1 = lundi, 7 = dimanche', () => {
  test('les sept jours d\'une semaine réelle', () => {
    // Semaine du lundi 24 août 2026 au dimanche 30 août 2026.
    expect(jourDeLaSemaine('2026-08-24')).toBe(1);
    expect(jourDeLaSemaine('2026-08-26')).toBe(3);
    expect(jourDeLaSemaine('2026-08-29')).toBe(6);
    expect(jourDeLaSemaine('2026-08-30')).toBe(7); // dimanche, pas 0
  });

  test('rien à lire : null plutôt qu\'un jour inventé', () => {
    expect(jourDeLaSemaine(null)).toBe(null);
    expect(jourDeLaSemaine('')).toBe(null);
  });
});

test.describe('deltaVersJour — on avance, jamais en arrière', () => {
  test('samedi vers mercredi = +4 (et non -3)', () => {
    // Le cas de Maude, à l'envers : la série est née le samedi, elle la veut
    // le mercredi. Reculer de 3 jours ferait passer la séance de cette
    // semaine dans le passé.
    expect(deltaVersJour(6, 3)).toBe(4);
  });

  test('mercredi vers samedi = +3', () => {
    expect(deltaVersJour(3, 6)).toBe(3);
  });

  test('même jour = 0 (aucun mouvement)', () => {
    expect(deltaVersJour(3, 3)).toBe(0);
  });

  test('dimanche vers lundi = +1 (le tour de la semaine passe)', () => {
    expect(deltaVersJour(7, 1)).toBe(1);
  });
});

test.describe('decalerJours — une date qui avance sans dérive', () => {
  test('décalage simple, changement de mois, année bissextile', () => {
    expect(decalerJours('2026-08-29', 4)).toBe('2026-09-02');
    expect(decalerJours('2026-12-30', 3)).toBe('2027-01-02');
    expect(decalerJours('2028-02-27', 3)).toBe('2028-03-01'); // 2028 est bissextile
  });

  test('changement d\'heure : un décalage de jours reste des jours', () => {
    // Passage à l'heure d'hiver 2026 : dimanche 25 octobre. Une série du
    // samedi qui passe au mercredi traverse la bascule.
    expect(decalerJours('2026-10-24', 4)).toBe('2026-10-28');
    // Et au printemps (29 mars 2026).
    expect(decalerJours('2026-03-28', 4)).toBe('2026-04-01');
  });

  test('delta nul ou difforme : la date ne bouge pas', () => {
    expect(decalerJours('2026-08-29', 0)).toBe('2026-08-29');
    expect(decalerJours('2026-08-29', null)).toBe('2026-08-29');
    expect(decalerJours('2026-08-29', 'abc')).toBe('2026-08-29');
  });
});

test.describe('serieDeplacable — ce qu\'on refuse de déplacer', () => {
  const occ = [{ date: '2026-08-29' }, { date: '2026-09-05' }];

  test('hebdomadaire et bimensuel : oui', () => {
    expect(serieDeplacable({ frequence: 'hebdomadaire', joursSemaine: [6], occurrences: occ }))
      .toMatchObject({ ok: true, jourActuel: 6 });
    expect(serieDeplacable({ frequence: 'bimensuel', joursSemaine: [6], occurrences: occ }).ok).toBe(true);
  });

  test('mensuel : non, le jour de la semaine n\'y veut rien dire', () => {
    const r = serieDeplacable({ frequence: 'mensuel', occurrences: occ });
    expect(r.ok).toBe(false);
    expect(r.raison).toContain('jour du mois');
  });

  test('plusieurs jours : non, il n\'y a pas UN jour à changer', () => {
    expect(serieDeplacable({ frequence: 'personnalise', joursSemaine: [1, 4], occurrences: occ }).ok).toBe(false);
    expect(serieDeplacable({ frequence: 'hebdomadaire', joursSemaine: [1, 4], occurrences: occ }).ok).toBe(false);
  });

  test('séances à venir sur des jours différents : non (planning incohérent)', () => {
    const r = serieDeplacable({
      frequence: 'hebdomadaire', joursSemaine: [6],
      occurrences: [{ date: '2026-08-29' }, { date: '2026-09-03' }],
    });
    expect(r.ok).toBe(false);
    expect(r.raison).toContain('même jour');
  });

  test('plus aucune séance à venir : rien à déplacer', () => {
    expect(serieDeplacable({ frequence: 'hebdomadaire', joursSemaine: [6], occurrences: [] }).ok).toBe(false);
    expect(serieDeplacable({}).ok).toBe(false);
  });

  test('série sans jours_semaine configurés : le jour se lit sur les séances', () => {
    // Données anciennes : jours_semaine peut être null. Le jour réel est
    // celui des occurrences, pas celui de la config.
    expect(serieDeplacable({ frequence: 'hebdomadaire', joursSemaine: null, occurrences: occ }))
      .toMatchObject({ ok: true, jourActuel: 6 });
  });
});

test.describe('planDeplacement — ce qui bouge, et de combien', () => {
  const occurrences = [
    { id: 'a', date: '2026-08-29', inscrites: 3 },
    { id: 'b', date: '2026-09-05', inscrites: 0 },
    { id: 'c', date: '2026-09-12', inscrites: 2 },
  ];

  test('samedi vers mercredi : tout avance de 4 jours, rien ne disparaît', () => {
    const plan = planDeplacement({ occurrences, jourVise: 3 });
    expect(plan.delta).toBe(4);
    expect(plan.jourActuel).toBe(6);
    expect(plan.mouvements.map(m => m.vers)).toEqual(['2026-09-02', '2026-09-09', '2026-09-16']);
    // Le nombre de séances est le même AVANT et APRÈS : c'est toute la
    // différence avec « supprimer et recréer ».
    expect(plan.mouvements).toHaveLength(occurrences.length);
    expect(plan.mouvements.map(m => m.vers).every(d => jourDeLaSemaine(d) === 3)).toBe(true);
  });

  test('les inscriptions sont comptées, pas perdues', () => {
    const plan = planDeplacement({ occurrences, jourVise: 3 });
    expect(plan.nbSeancesAvecInscrites).toBe(2);
    expect(plan.nbInscrites).toBe(5);
  });

  test('même jour : aucun mouvement (on ne réécrit pas 40 lignes pour rien)', () => {
    const plan = planDeplacement({ occurrences, jourVise: 6 });
    expect(plan.delta).toBe(0);
    expect(plan.mouvements).toEqual([]);
  });

  test('l\'ordre des séances est préservé, quel que soit l\'ordre reçu', () => {
    const melange = [occurrences[2], occurrences[0], occurrences[1]];
    const plan = planDeplacement({ occurrences: melange, jourVise: 3 });
    expect(plan.mouvements.map(m => m.id)).toEqual(['a', 'b', 'c']);
  });

  test('lignes difformes ignorées, jamais une date null en base', () => {
    const plan = planDeplacement({
      occurrences: [{ id: 'a', date: '2026-08-29' }, { id: null, date: '2026-09-05' }, { id: 'c' }],
      jourVise: 3,
    });
    expect(plan.mouvements.map(m => m.id)).toEqual(['a']);
  });
});

test.describe('apercuDeplacement — la phrase qui engage', () => {
  test('elle dit le décalage, la première date, et les inscrites', () => {
    const plan = planDeplacement({
      occurrences: [{ id: 'a', date: '2026-08-29', inscrites: 3 }],
      jourVise: 3,
    });
    const phrase = apercuDeplacement(plan);
    expect(phrase).toContain('avance de 4 jours');
    expect(phrase).toContain('le samedi devient mercredi');
    expect(phrase).toContain('29/08/2026');
    expect(phrase).toContain('02/09/2026');
    expect(phrase).toContain('préviens ces élèves');
  });

  test('sans inscrite, aucune phrase alarmiste', () => {
    const plan = planDeplacement({ occurrences: [{ id: 'a', date: '2026-08-29' }], jourVise: 3 });
    expect(apercuDeplacement(plan)).not.toContain('préviens');
  });

  test('aucun mouvement : aucune phrase', () => {
    expect(apercuDeplacement(planDeplacement({ occurrences: [{ id: 'a', date: '2026-08-29' }], jourVise: 6 }))).toBe('');
    expect(apercuDeplacement(null)).toBe('');
  });
});
