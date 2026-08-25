// ═══════════════════════════════════════════════════════════════════════════
// Verrou CI — saisir une durée dans SON unité (2026-08-25).
//
// Retour d'une prof le jour même de son inscription : « ici je voulais définir
// 4 mois mais ce n'est pas possible, on ne peut mettre que des jours quand on
// sélectionne autre ». Les préréglages parlaient en mois (1 mois, 3 mois,
// 1 an) et le champ libre réclamait des jours : dès qu'elle sortait des trois
// cases, on lui demandait une conversion mentale.
//
// Ce qu'on ne laisse pas glisser :
//   1. On stocke TOUJOURS des jours : c'est ce que la vente calcule et ce que
//      toute l'app lit. Seule la saisie change d'unité.
//   2. Rouvrir une offre existante la montre dans l'unité la plus lisible :
//      120 jours se relisent « 4 mois », pas « 120 jours ».
//   3. Changer d'unité garde le NOMBRE affiché : passer de « 4 mois » à
//      « 4 semaines » est ce que le geste veut dire.
// ═══════════════════════════════════════════════════════════════════════════
import { test, expect } from '@playwright/test';
import { uniteNaturelle, valeurDansUnite, enJours } from '../../components/offres/DureeLibre.js';

test.describe('enJours — on stocke des jours, toujours', () => {
  test('LE cas du retour terrain : 4 mois deviennent 120 jours', () => {
    expect(enJours('4', 'mois')).toBe('120');
    expect(enJours('1', 'mois')).toBe('30');
    expect(enJours('12', 'mois')).toBe('360');
  });

  test('semaines et jours suivent la même route', () => {
    expect(enJours('6', 'semaines')).toBe('42');
    expect(enJours('45', 'jours')).toBe('45');
  });

  test('une saisie vide ou absurde ne fabrique pas une durée', () => {
    // Mieux vaut un champ vide qu'un abonnement de zéro jour vendu par erreur.
    expect(enJours('', 'mois')).toBe('');
    expect(enJours('0', 'mois')).toBe('');
    expect(enJours('-3', 'mois')).toBe('');
    expect(enJours('abc', 'mois')).toBe('');
  });

  test('une unité inconnue compte en jours, jamais en rien', () => {
    expect(enJours('10', 'siecles')).toBe('10');
  });
});

test.describe('uniteNaturelle — relire une offre comme elle a été pensée', () => {
  test('120 jours se relisent en mois, 42 en semaines', () => {
    expect(uniteNaturelle(120)).toBe('mois');
    expect(uniteNaturelle(30)).toBe('mois');
    expect(uniteNaturelle(365)).toBe('jours');   // ni multiple de 30 ni de 7
    expect(uniteNaturelle(42)).toBe('semaines');
    expect(uniteNaturelle(45)).toBe('jours');
  });

  test('sans durée, on propose les mois (l\'unité dont parlent les préréglages)', () => {
    expect(uniteNaturelle(null)).toBe('mois');
    expect(uniteNaturelle('')).toBe('mois');
    expect(uniteNaturelle(0)).toBe('mois');
  });
});

test.describe('valeurDansUnite — l\'aller-retour ne perd rien', () => {
  test('ce qu\'on a stocké se réaffiche à l\'identique', () => {
    for (const [n, u] of [['4', 'mois'], ['6', 'semaines'], ['45', 'jours'], ['1', 'mois']]) {
      const jours = enJours(n, u);
      expect(valeurDansUnite(jours, u), `${n} ${u}`).toBe(n);
    }
  });

  test('changer d\'unité garde le nombre affiché', () => {
    // « 4 mois » → on bascule sur semaines → on veut « 4 semaines », donc 28 j.
    const quatreMois = enJours('4', 'mois');       // 120
    const affiche = valeurDansUnite(quatreMois, 'mois'); // '4'
    expect(enJours(affiche, 'semaines')).toBe('28');
  });

  test('rien à afficher quand il n\'y a rien à afficher', () => {
    expect(valeurDansUnite('', 'mois')).toBe('');
    expect(valeurDansUnite(0, 'mois')).toBe('');
    expect(valeurDansUnite('abc', 'mois')).toBe('');
  });
});
