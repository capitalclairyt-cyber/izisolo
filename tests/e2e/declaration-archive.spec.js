// ═══════════════════════════════════════════════════════════════════════════
// Verrou CI — archive des déclarations URSSAF (v94, 2026-08-22). Spec Node
// pure : fige les règles de lib/declaration-archive.js.
//
// Ce qui est en jeu : les montants sont RECALCULÉS à la lecture depuis les
// paiements. Sans photo figée au moment de la déclaration, revenir sur une
// période des mois plus tard rendrait un total qui n'est pas celui qui a été
// déclaré — et l'écart, qui est justement l'information utile, passerait
// inaperçu.
// ═══════════════════════════════════════════════════════════════════════════
import { test, expect } from '@playwright/test';
import {
  construireSnapshot, montantADeclarer, statutPeriode,
  ecartDepuisDeclaration, texteEcart, historique, STATUTS,
} from '../../lib/declaration-archive.js';
import { periodeTrimestre } from '../../lib/urssaf.js';

const AUJ = '2026-11-10';
const T3 = periodeTrimestre(2026, 3, AUJ);   // clos, échéance 31 octobre → dépassée
const T4 = periodeTrimestre(2026, 4, AUJ);   // en cours

test.describe('Montant à déclarer — euros entiers, comme le formulaire', () => {
  test('arrondi à l\'euro le plus proche', () => {
    expect(montantADeclarer(1240.49)).toBe(1240);
    expect(montantADeclarer(1240.5)).toBe(1241);
    expect(montantADeclarer(0)).toBe(0);
  });

  test('entrée difforme = 0, jamais NaN', () => {
    expect(montantADeclarer('abc')).toBe(0);
    expect(montantADeclarer(null)).toBe(0);
    expect(montantADeclarer(undefined)).toBe(0);
  });
});

test.describe('Snapshot — la photo doit se lire seule', () => {
  const TOTAUX = { brut: 1411, frais: 12.4, nombre: 12, parMois: { '2026-07': 1041 }, parMode: { especes: 900 } };
  const ESTIM = { cotisations: 299.13, cfp: 2.82, liberatoire: 0, total: 301.95, estimable: true };
  const CFG = { regime: 'micro_bnc', taux_cotisations: 21.2, taux_cfp: 0.2, versement_liberatoire: false, taux_liberatoire: 2.2 };

  test('porte la période, les totaux, les ventilations et les taux du moment', () => {
    const s = construireSnapshot({ periode: T3, totaux: TOTAUX, estimation: ESTIM, config: CFG });
    expect(s.version).toBe(1);
    expect(s.periode.id).toBe('T3-2026');
    expect(s.periode.echeanceLabel).toBe('31 octobre 2026');
    expect(s.totaux.brut).toBe(1411);
    expect(s.totaux.parMois['2026-07']).toBe(1041);
    expect(s.totaux.parMode.especes).toBe(900);
    expect(s.estimation.total).toBe(301.95);
    expect(s.regime).toBe('micro_bnc');
    expect(s.taux.cotisations).toBe(21.2);
    expect(s.base).toBe('encaissement');
  });

  test('le taux du versement libératoire n\'est photographié que s\'il s\'applique', () => {
    expect(construireSnapshot({ periode: T3, totaux: TOTAUX, config: CFG }).taux.liberatoire).toBeNull();
    const avec = construireSnapshot({
      periode: T3, totaux: TOTAUX, config: { ...CFG, versement_liberatoire: true },
    });
    expect(avec.taux.liberatoire).toBe(2.2);
  });

  test('sans config ni estimation, la photo reste valide', () => {
    const s = construireSnapshot({ periode: T3, totaux: TOTAUX });
    expect(s.estimation).toBeNull();
    expect(s.regime).toBeNull();
    expect(s.totaux.brut).toBe(1411);
  });

  test('les ventilations sont COPIÉES, pas référencées', () => {
    const totaux = { ...TOTAUX, parMois: { '2026-07': 1041 } };
    const s = construireSnapshot({ periode: T3, totaux });
    totaux.parMois['2026-07'] = 9999;             // la source bouge après coup
    expect(s.totaux.parMois['2026-07']).toBe(1041); // la photo, elle, ne bouge pas
  });
});

test.describe('Statut d\'une période', () => {
  test('déclarée prime sur tout le reste', () => {
    expect(statutPeriode(T3, { declaree_at: '2026-10-05T10:00:00Z' }, AUJ)).toBe('declaree');
    expect(statutPeriode(T4, { declaree_at: '2026-10-05T10:00:00Z' }, AUJ)).toBe('declaree');
  });

  test('période non close = en cours, jamais « en retard »', () => {
    expect(statutPeriode(T4, null, AUJ)).toBe('en_cours');
  });

  test('close et échéance dépassée = en retard', () => {
    expect(statutPeriode(T3, null, AUJ)).toBe('en_retard');
  });

  test('close avec l\'échéance encore devant = à déclarer', () => {
    expect(statutPeriode(T3, null, '2026-10-15')).toBe('a_declarer');
  });

  test('chaque statut a un libellé et une explication', () => {
    for (const cle of ['en_cours', 'a_declarer', 'declaree', 'en_retard']) {
      expect(STATUTS[cle].label).toBeTruthy();
      expect(STATUTS[cle].hint).toBeTruthy();
    }
  });
});

test.describe('Écart — le cœur de l\'archive', () => {
  const DECLAREE = { declaree_at: '2026-10-05T10:00:00Z', montant_declare: 1240 };

  test('rien de déclaré = pas d\'écart à signaler', () => {
    expect(ecartDepuisDeclaration(null, 1240)).toBeNull();
    expect(ecartDepuisDeclaration({ montant_declare: 1240 }, 1300)).toBeNull(); // jamais déclarée
  });

  test('montant inchangé = silence', () => {
    expect(ecartDepuisDeclaration(DECLAREE, 1240)).toBeNull();
    expect(ecartDepuisDeclaration(DECLAREE, 1240.4)).toBeNull(); // même à l'euro près
  });

  test('un paiement ajouté depuis fait remonter le total', () => {
    const e = ecartDepuisDeclaration(DECLAREE, 1315);
    expect(e).toMatchObject({ declare: 1240, actuel: 1315, ecart: 75, sens: 'hausse' });
    expect(texteEcart(e)).toContain('1240 €');
    expect(texteEcart(e)).toContain('1315 €');
    expect(texteEcart(e)).toContain('+75');
    expect(texteEcart(e)).toMatch(/régularisation/i);
  });

  test('un paiement corrigé à la baisse est signalé aussi', () => {
    const e = ecartDepuisDeclaration(DECLAREE, 1180);
    expect(e).toMatchObject({ declare: 1240, actuel: 1180, ecart: -60, sens: 'baisse' });
    expect(texteEcart(e)).toContain('-60');
  });

  test('un montant déclaré à zéro reste un montant déclaré', () => {
    const e = ecartDepuisDeclaration({ declaree_at: '2026-10-05T10:00:00Z', montant_declare: 0 }, 90);
    expect(e).toMatchObject({ declare: 0, actuel: 90, sens: 'hausse' });
  });

  test('pas d\'écart = pas de texte', () => {
    expect(texteEcart(null)).toBeNull();
  });
});

test.describe('Historique — périodes et archives fusionnées', () => {
  const PERIODES = [T4, T3, periodeTrimestre(2026, 2, AUJ)];
  const ARCHIVES = [
    { periode_id: 'T2-2026', declaree_at: '2026-07-20T09:00:00Z', montant_declare: 980, consultations: 3, derniere_consultation_at: '2026-08-01T09:00:00Z' },
  ];

  test('chaque période reçoit son statut et son montant déclaré', () => {
    const h = historique(PERIODES, ARCHIVES, AUJ);
    expect(h.map(x => x.periode.id)).toEqual(['T4-2026', 'T3-2026', 'T2-2026']);
    expect(h[0].statut).toBe('en_cours');
    expect(h[1].statut).toBe('en_retard');
    expect(h[2].statut).toBe('declaree');
    expect(h[2].montantDeclare).toBe(980);
    expect(h[2].consultations).toBe(3);
  });

  test('une période sans archive n\'invente ni montant ni date', () => {
    const h = historique(PERIODES, ARCHIVES, AUJ);
    expect(h[1].montantDeclare).toBeNull();
    expect(h[1].declareeAt).toBeNull();
    expect(h[1].consultations).toBe(0);
  });

  test('entrées vides = liste vide, jamais une erreur', () => {
    expect(historique(null, null, AUJ)).toEqual([]);
    expect(historique([], [], AUJ)).toEqual([]);
  });
});
