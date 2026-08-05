/**
 * Factures v84 (lib/factures) — verrou des règles du modèle :
 *
 *   1. Un paiement DÉJÀ facturé n'est jamais re-proposé (règle d'or : jamais
 *      deux justificatifs pour le même argent — le double remboursement CSE).
 *   2. « Facture du mois » = mois à ≥ 2 paiements RÉGLÉS non facturés, datés
 *      par la date de RÈGLEMENT (encaissement d'abord, échéance en secours).
 *   3. Le snapshot est complet et WinAnsi-safe (un emoji dans un intitulé
 *      faisait crasher pdf-lib — B1f), total arrondi au centime.
 *
 * Test Node pur (aucun navigateur) : on importe les fonctions directement.
 */
import { test, expect } from '@playwright/test';
import {
  MENTION_TVA_DEFAUT, REGEX_MOIS, winAnsiSafe, facturationActive,
  moisDePaiement, labelMois, paiementsFacturables, moisFacturables,
  construireLignes, construireSnapshot,
} from '../../lib/factures.js';

const pay = (id, over = {}) => ({
  id, intitule: 'Abonnement mensuel', montant: '45', mode: 'virement',
  date: '2026-08-01', date_encaissement: '2026-08-03', statut: 'paid', ...over,
});

test.describe('moisDePaiement — la date de règlement prime', () => {
  test('date_encaissement d\'abord', () => {
    expect(moisDePaiement(pay('a', { date: '2026-07-28', date_encaissement: '2026-08-03' }))).toBe('2026-08');
  });
  test('échéance en secours', () => {
    expect(moisDePaiement(pay('a', { date_encaissement: null, date: '2026-07-28' }))).toBe('2026-07');
  });
  test('aucune date → chaîne vide (jamais groupé)', () => {
    expect(moisDePaiement({ id: 'a' })).toBe('');
  });
});

test.describe('REGEX_MOIS + labelMois', () => {
  test('accepte AAAA-MM strict, refuse le reste', () => {
    expect(REGEX_MOIS.test('2026-08')).toBe(true);
    expect(REGEX_MOIS.test('2026-13')).toBe(false);
    expect(REGEX_MOIS.test('2026-8')).toBe(false);
    expect(REGEX_MOIS.test('08-2026')).toBe(false);
  });
  test('libellé français', () => {
    expect(labelMois('2026-08')).toBe('août 2026');
    expect(labelMois('2026-01')).toBe('janvier 2026');
  });
});

test.describe('paiementsFacturables — la règle d\'or', () => {
  test('exclut non-payés et déjà facturés (map OU Set)', () => {
    const ps = [pay('a'), pay('b', { statut: 'pending' }), pay('c')];
    expect(paiementsFacturables(ps, { c: 'FAC-2026-0001' }).map(p => p.id)).toEqual(['a']);
    expect(paiementsFacturables(ps, new Set(['a'])).map(p => p.id)).toEqual(['c']);
  });
});

test.describe('moisFacturables — groupement mensuel', () => {
  test('seuil ≥ 2, tri du plus récent au plus ancien', () => {
    const ps = [
      pay('a', { date_encaissement: '2026-08-03' }),
      pay('b', { date_encaissement: '2026-08-10' }),
      pay('c', { date_encaissement: '2026-07-02' }),  // seul en juillet → pas de chip
      pay('d', { date_encaissement: '2026-06-01' }),
      pay('e', { date_encaissement: '2026-06-15' }),
    ];
    const mois = moisFacturables(ps, {});
    expect(mois.map(m => m.mois)).toEqual(['2026-08', '2026-06']);
    expect(mois[0]).toMatchObject({ label: 'août 2026', count: 2, paiementIds: ['a', 'b'] });
  });
  test('un paiement facturé individuellement sort du groupe (jamais recoupé)', () => {
    const ps = [pay('a'), pay('b'), pay('c')];
    const mois = moisFacturables(ps, { a: 'FAC-2026-0001' });
    expect(mois[0].paiementIds).toEqual(['b', 'c']);
  });
  test('tous facturés → aucun chip', () => {
    expect(moisFacturables([pay('a'), pay('b')], { a: 'x', b: 'y' })).toEqual([]);
  });
});

test.describe('construireLignes / construireSnapshot', () => {
  test('lignes triées par date de règlement, montants au centime', () => {
    const lignes = construireLignes([
      pay('b', { date_encaissement: '2026-08-10', montant: '19.999' }),
      pay('a', { date_encaissement: '2026-08-03' }),
    ]);
    expect(lignes.map(l => l.paiement_id)).toEqual(['a', 'b']);
    expect(lignes[1].montant).toBe(20);
  });
  test('snapshot complet, WinAnsi-safe, total arrondi', () => {
    const snap = construireSnapshot({
      profile: { studio_nom: 'Studio Lune 🌙', adresse: '2 rue des Lilas', code_postal: '38260', ville: 'Gillonnay' },
      facturation: { facturation_siret: '123 456 789 00012', facturation_raison_sociale: '', facturation_mention_tva: '' },
      client: { prenom: 'Léa', nom: 'Martin', email: 'lea@ex.fr', adresse_postale: '4 chemin Vert\n2e étage', ville: 'Voiron' },
      paiements: [pay('a', { intitule: 'Carnet 10 ✨', montant: '90.01' }), pay('b', { montant: '45' })],
    });
    expect(snap.emetteur.nom).toBe('Studio Lune');            // raison sociale vide → studio_nom, emoji nettoyé
    expect(snap.emetteur.siret).toBe('12345678900012');       // espaces retirés
    expect(snap.client.nom).toBe('Léa Martin');
    expect(snap.client.adresse).toBe('4 chemin Vert');        // 1re ligne seulement
    expect(snap.lignes[0].intitule).toBe('Carnet 10');        // WinAnsi
    expect(snap.total).toBe(135.01);
    expect(snap.mention_tva).toBe(MENTION_TVA_DEFAUT);        // vide → défaut
  });
  test('mention TVA custom conservée', () => {
    const snap = construireSnapshot({
      profile: {}, facturation: { facturation_siret: '1', facturation_mention_tva: 'TVA 20 % incluse.' },
      client: {}, paiements: [pay('a')],
    });
    expect(snap.mention_tva).toBe('TVA 20 % incluse.');
  });
});

test.describe('divers', () => {
  test('facturationActive = SIRET non vide', () => {
    expect(facturationActive({ facturation_siret: ' 123 ' })).toBe(true);
    expect(facturationActive({ facturation_siret: '  ' })).toBe(false);
    expect(facturationActive(null)).toBe(false);
  });
  test('winAnsiSafe garde l\'euro, les accents et les typographiques Windows-1252, vire les emojis', () => {
    expect(winAnsiSafe('Séance à 20 € 🎉')).toBe('Séance à 20 €');
    expect(winAnsiSafe('Abonnement — août « L’Œuvre »…')).toBe('Abonnement — août « L’Œuvre »…');
  });
});
