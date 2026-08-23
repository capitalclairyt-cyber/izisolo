// ═══════════════════════════════════════════════════════════════════════════
// Verrou CI — inscrire un·e élève sur tout ou partie d'une série récurrente
// (2026-08-23, retour Maude depuis l'écran de pointage : « on doit pouvoir
// inscrire l'élève soi même sur toute la récurrence des cours »).
// Spec Node pure : fige lib/inscription-serie.js.
//
// Les quatre règles verrouillées ici sont celles qu'on doit pouvoir défendre
// devant une prof : jamais dans le passé, jamais sur une séance annulée,
// jamais deux fois la même personne sur la même séance, et un compte rendu
// qui avoue ce qu'il a ignoré.
// ═══════════════════════════════════════════════════════════════════════════
import { test, expect } from '@playwright/test';
import {
  occurrencesCibles, lignesInscription, resumeInscription, apercuPortee,
  PORTEE_SEULE, PORTEE_TOUTES, PORTEE_N,
} from '../../lib/inscription-serie.js';

// Une série du lundi : une séance passée, celle qu'on pointe, quatre à venir,
// dont une annulée.
const SERIE = [
  { id: 'p1', date: '2026-08-17' },                     // passée
  { id: 'act', date: '2026-08-24' },                    // celle affichée
  { id: 'f1', date: '2026-08-31' },
  { id: 'f2', date: '2026-09-07', est_annule: true },   // annulée
  { id: 'f3', date: '2026-09-14' },
  { id: 'f4', date: '2026-09-21' },
];
const ACTUEL = { id: 'act', date: '2026-08-24' };

test.describe('occurrencesCibles — ce qu\'on touche, et ce qu\'on laisse', () => {
  test('« cette séance seulement » ne vise rien d\'autre', () => {
    expect(occurrencesCibles({ occurrences: SERIE, coursActuel: ACTUEL, portee: PORTEE_SEULE })).toEqual([]);
    expect(occurrencesCibles({ occurrences: SERIE, coursActuel: ACTUEL })).toEqual([]);
  });

  test('« toute la série » : les séances à venir, sans la passée, sans l\'annulée, sans celle-ci', () => {
    const cibles = occurrencesCibles({ occurrences: SERIE, coursActuel: ACTUEL, portee: PORTEE_TOUTES });
    expect(cibles.map(c => c.id)).toEqual(['f1', 'f3', 'f4']);
  });

  test('« les N prochaines » prend les PLUS PROCHES, quel que soit l\'ordre reçu', () => {
    const melange = [SERIE[5], SERIE[2], SERIE[0], SERIE[4], SERIE[1], SERIE[3]];
    const cibles = occurrencesCibles({ occurrences: melange, coursActuel: ACTUEL, portee: PORTEE_N, nb: 2 });
    expect(cibles.map(c => c.id)).toEqual(['f1', 'f3']);
  });

  test('N plus grand que la série : on prend ce qui existe, sans inventer', () => {
    const cibles = occurrencesCibles({ occurrences: SERIE, coursActuel: ACTUEL, portee: PORTEE_N, nb: 99 });
    expect(cibles).toHaveLength(3);
  });

  test('N absent ou difforme : rien, plutôt qu\'un « toutes » par accident', () => {
    expect(occurrencesCibles({ occurrences: SERIE, coursActuel: ACTUEL, portee: PORTEE_N })).toEqual([]);
    expect(occurrencesCibles({ occurrences: SERIE, coursActuel: ACTUEL, portee: PORTEE_N, nb: 0 })).toEqual([]);
    expect(occurrencesCibles({ occurrences: SERIE, coursActuel: ACTUEL, portee: PORTEE_N, nb: 'deux' })).toEqual([]);
  });

  test('on pointe une séance PASSÉE : les séances entre-temps restent dans le passé', () => {
    // La prof pointe le 17/08 en retard et veut inscrire sur la suite. Le 24/08
    // est passé lui aussi : l'inscrire serait fabriquer un historique.
    const cibles = occurrencesCibles({
      occurrences: SERIE, coursActuel: { id: 'p1', date: '2026-08-17' },
      portee: PORTEE_TOUTES, aujourdhui: '2026-08-28',
    });
    expect(cibles.map(c => c.id)).toEqual(['f1', 'f3', 'f4']);
  });

  test('données absentes : jamais un plantage sur un écran de pointage', () => {
    expect(occurrencesCibles({})).toEqual([]);
    expect(occurrencesCibles({ occurrences: null, coursActuel: ACTUEL, portee: PORTEE_TOUTES })).toEqual([]);
    expect(occurrencesCibles({ occurrences: SERIE, coursActuel: null, portee: PORTEE_TOUTES })).toEqual([]);
  });
});

test.describe('lignesInscription — jamais deux fois la même personne', () => {
  const cibles = [{ id: 'f1' }, { id: 'f3' }];

  test('le produit élèves × séances, prêt à insérer', () => {
    const { lignes, ignorees } = lignesInscription({
      cibles, clientIds: ['c1', 'c2'], dejaInscrits: [], profileId: 'pro',
    });
    expect(lignes).toHaveLength(4);
    expect(ignorees).toBe(0);
    expect(lignes[0]).toMatchObject({
      profile_id: 'pro', cours_id: 'f1', client_id: 'c1',
      statut_pointage: 'inscrit', pointee: false, type_presence: 'normal',
    });
  });

  test('JAMAIS de carnet pré-lié : la résolution appartient au pointage', () => {
    // Pré-lier ici a déjà fait décompter le mauvais carnet (v64/v70/v82).
    const { lignes } = lignesInscription({ cibles, clientIds: ['c1'], profileId: 'pro' });
    expect(lignes.every(l => l.abonnement_id === null)).toBe(true);
  });

  test('les inscriptions existantes sont ignorées, et COMPTÉES', () => {
    const { lignes, ignorees } = lignesInscription({
      cibles, clientIds: ['c1', 'c2'], profileId: 'pro',
      dejaInscrits: [{ cours_id: 'f1', client_id: 'c1' }, { cours_id: 'f3', client_id: 'c2' }],
    });
    expect(lignes.map(l => `${l.cours_id}|${l.client_id}`).sort()).toEqual(['f1|c2', 'f3|c1']);
    expect(ignorees).toBe(2);
  });

  test('le type de séance choisi est propagé', () => {
    const { lignes } = lignesInscription({
      cibles, clientIds: ['c1'], profileId: 'pro', typePresence: 'offert',
    });
    expect(lignes.every(l => l.type_presence === 'offert')).toBe(true);
  });

  test('rien à faire : une liste vide, pas une erreur', () => {
    expect(lignesInscription({ cibles: [], clientIds: ['c1'], profileId: 'p' }).lignes).toEqual([]);
    expect(lignesInscription({ cibles, clientIds: [], profileId: 'p' }).lignes).toEqual([]);
    expect(lignesInscription({}).lignes).toEqual([]);
  });
});

test.describe('les phrases : promettre puis rendre compte', () => {
  test('l\'aperçu dit jusqu\'où ça va, et combien ça fait', () => {
    const cibles = occurrencesCibles({ occurrences: SERIE, coursActuel: ACTUEL, portee: PORTEE_TOUTES });
    const phrase = apercuPortee({ portee: PORTEE_TOUTES, cibles, nbEleves: 2 });
    expect(phrase).toContain('3 séances à venir');
    expect(phrase).toContain('21/09/2026');
    expect(phrase).toContain('6 inscriptions');
  });

  test('« cette séance seulement » le dit sans détour', () => {
    expect(apercuPortee({ portee: PORTEE_SEULE })).toBe('Uniquement cette séance.');
    expect(apercuPortee({ portee: PORTEE_TOUTES, cibles: [] })).toBe('Uniquement cette séance.');
  });

  test('le compte rendu AVOUE les doublons ignorés', () => {
    // Un « c'est fait » qui tait 12 doublons laisse croire à un bug le jour où
    // la prof recompte.
    const r = resumeInscription({ nbEleves: 1, nbSeances: 8, ignorees: 2 });
    expect(r).toContain('8 séances à venir');
    expect(r).toContain('2 inscriptions existaient déjà');
    expect(resumeInscription({ nbEleves: 1, nbSeances: 8, ignorees: 0 })).not.toContain('déjà');
  });

  test('accords au singulier', () => {
    const r = resumeInscription({ nbEleves: 1, nbSeances: 1, ignorees: 1 });
    expect(r).toContain('1 élève inscrit sur 1 séance à venir');
    expect(r).toContain('1 inscription existait déjà');
  });

  test('rien fait : rien à raconter', () => {
    expect(resumeInscription({ nbEleves: 2, nbSeances: 0 })).toBe('');
    expect(resumeInscription()).toBe('');
  });

  test('zéro tiret quadratin (règle de rédaction maison)', () => {
    expect(resumeInscription({ nbEleves: 2, nbSeances: 3, ignorees: 1 })).not.toContain('—');
    expect(apercuPortee({ portee: PORTEE_TOUTES, cibles: [{ id: 'f1', date: '2026-09-14' }] })).not.toContain('—');
  });
});
