// ═══════════════════════════════════════════════════════════════════════════
// Verrou CI — ce qu'un abonnement donne droit à faire (2026-08-23, retour
// Colin : « illimité c'est sans limite mais on demande ensuite combien de
// séances par semaine »). Spec Node pur (zéro navigateur, zéro serveur) :
// fige lib/offres-seances.js, l'unique traducteur entre le choix fait à
// l'écran et le couple de colonnes (seances, seances_par_semaine).
//
// Le cas qui a motivé le module est le tout dernier test : une cadence posée
// par défaut fabriquait des abonnements « illimités » bloqués à une séance
// par semaine (7 sur 13 en prod, dont un avec 7 élèves actives dessus).
// ═══════════════════════════════════════════════════════════════════════════
import { test, expect } from '@playwright/test';
import {
  modeSeances, payloadSeances, libelleSeances, apercuSeances,
  MODE_ILLIMITE, MODE_CADENCE, MODE_TOTAL,
} from '../../lib/offres-seances.js';

test.describe('modeSeances — relire une offre existante sans la trahir', () => {
  test('ni total ni cadence : illimité', () => {
    expect(modeSeances({ seances: null, seances_par_semaine: null })).toBe(MODE_ILLIMITE);
    expect(modeSeances({})).toBe(MODE_ILLIMITE);
    expect(modeSeances(null)).toBe(MODE_ILLIMITE);
    expect(modeSeances(undefined)).toBe(MODE_ILLIMITE);
  });

  test('une cadence seule : X fois par semaine', () => {
    expect(modeSeances({ seances: null, seances_par_semaine: 1 })).toBe(MODE_CADENCE);
    expect(modeSeances({ seances: null, seances_par_semaine: 4 })).toBe(MODE_CADENCE);
  });

  test('un total : total, même avec une cadence par-dessus', () => {
    expect(modeSeances({ seances: 32, seances_par_semaine: null })).toBe(MODE_TOTAL);
    expect(modeSeances({ seances: 40, seances_par_semaine: 1 })).toBe(MODE_TOTAL);
  });

  test('0 ne borne rien (une colonne à 0 vaut « pas de limite », comme la résa le lit)', () => {
    // /api/portail/[slug]/reserver fait `seances_par_semaine || 0` puis
    // `if (aboCap > 0)` : un 0 en base ne bloque personne. On lit pareil.
    expect(modeSeances({ seances: 0, seances_par_semaine: 0 })).toBe(MODE_ILLIMITE);
  });

  test('valeurs difformes : jamais une limite inventée', () => {
    expect(modeSeances({ seances: '', seances_par_semaine: '' })).toBe(MODE_ILLIMITE);
    expect(modeSeances({ seances: 'douze', seances_par_semaine: -3 })).toBe(MODE_ILLIMITE);
  });
});

test.describe('payloadSeances — le seul chemin d\'écriture', () => {
  test('illimité vide les DEUX colonnes, même si l\'écran gardait des valeurs', () => {
    // Le formulaire garde en mémoire ce qui a été tapé avant de changer d'avis :
    // ces restes ne doivent jamais partir en base.
    expect(payloadSeances({ mode: MODE_ILLIMITE, total: '32', cadence: '1' }))
      .toEqual({ seances: null, seances_par_semaine: null });
  });

  test('cadence : une cadence, aucun total', () => {
    expect(payloadSeances({ mode: MODE_CADENCE, cadence: '2', total: '32' }))
      .toEqual({ seances: null, seances_par_semaine: 2 });
  });

  test('total : un total, cadence facultative', () => {
    expect(payloadSeances({ mode: MODE_TOTAL, total: '32' }))
      .toEqual({ seances: 32, seances_par_semaine: null });
    expect(payloadSeances({ mode: MODE_TOTAL, total: '40', cadence: '2' }))
      .toEqual({ seances: 40, seances_par_semaine: 2 });
  });

  test('champs vides ou farfelus : null, jamais NaN ni 0 (le CHECK DB refuse NaN)', () => {
    expect(payloadSeances({ mode: MODE_TOTAL, total: '', cadence: 'abc' }))
      .toEqual({ seances: null, seances_par_semaine: null });
    expect(payloadSeances({ mode: MODE_CADENCE, cadence: '0' }))
      .toEqual({ seances: null, seances_par_semaine: null });
    expect(payloadSeances({})).toEqual({ seances: null, seances_par_semaine: null });
  });

  test('aller-retour : ce qu\'on écrit se relit dans le même mode', () => {
    for (const choix of [
      { mode: MODE_ILLIMITE },
      { mode: MODE_CADENCE, cadence: '3' },
      { mode: MODE_TOTAL, total: '32' },
      { mode: MODE_TOTAL, total: '40', cadence: '2' },
    ]) {
      expect(modeSeances(payloadSeances(choix))).toBe(choix.mode);
    }
  });
});

test.describe('libelleSeances — la phrase que la prof ET l\'élève voient', () => {
  test('les quatre cas, au singulier comme au pluriel', () => {
    expect(libelleSeances({})).toBe('Séances illimitées');
    expect(libelleSeances({ seances_par_semaine: 1 })).toBe('1 séance par semaine');
    expect(libelleSeances({ seances_par_semaine: 2 })).toBe('2 séances par semaine');
    expect(libelleSeances({ seances: 1 })).toBe('1 séance au total');
    expect(libelleSeances({ seances: 32 })).toBe('32 séances au total');
    expect(libelleSeances({ seances: 40, seances_par_semaine: 2 }))
      .toBe('40 séances au total, 2 par semaine maximum');
  });

  test('une offre capée ne peut plus se taire : sa cadence est dans la phrase', () => {
    // L'ancien état de l'art : aucune surface n'affichait seances_par_semaine,
    // donc « Abonnement au mois » capé à 1×/sem semblait illimité partout.
    expect(libelleSeances({ seances: null, seances_par_semaine: 1 })).toContain('par semaine');
  });
});

test.describe('apercuSeances — le contrat annoncé au moment de créer l\'offre', () => {
  test('chaque mode dit ce que l\'élève pourra faire', () => {
    expect(apercuSeances({ mode: MODE_ILLIMITE })).toContain('sans limite');
    expect(apercuSeances({ mode: MODE_CADENCE, cadence: '1' })).toContain('1 fois par semaine');
    expect(apercuSeances({ mode: MODE_CADENCE, cadence: '1' })).toContain('sans nombre total');
    expect(apercuSeances({ mode: MODE_TOTAL, total: '32' })).toContain('32 fois');
    expect(apercuSeances({ mode: MODE_TOTAL, total: '40', cadence: '2' })).toContain('2 séances par semaine');
  });

  test('l\'aperçu ne promet JAMAIS plus que ce qui part en base', () => {
    // Le piège d'origine, retourné en test : « illimité » qui annoncerait une
    // liberté que la colonne cadence contredirait à la première réservation.
    const choix = { mode: MODE_ILLIMITE, cadence: '1' };
    expect(payloadSeances(choix).seances_par_semaine).toBe(null);
    expect(apercuSeances(choix)).not.toContain('par semaine');
  });
});
