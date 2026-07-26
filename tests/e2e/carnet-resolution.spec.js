/**
 * Résolution du carnet applicable à une séance (lib/carnet-resolution).
 * Verrouille les règles figées le 2026-07-13 (cf. MODELE-PAIEMENTS-2026.md §2)
 * et le miroir SQL du RPC pointer_presence (v64).
 *
 * Test Node pur (aucun navigateur).
 */
import { test, expect } from '@playwright/test';
import { resoudreCarnetApplicable } from '../../lib/carnet-resolution.js';

const carnet = (o) => ({
  id: o.id,
  statut: 'actif',
  seances_total: 10,
  seances_utilisees: 0,
  date_fin: null,
  date_pause_debut: null,
  date_pause_fin: null,
  types_cours_autorises: null,
  ...o,
});

const COURS_YOGA = { type_cours: 'yoga', date: '2026-08-01' };
const COURS_RENFO = { type_cours: 'renfo', date: '2026-08-01' };

test('carnet yoga + cours renfo → non applicable (le cas Léa)', () => {
  const abos = [carnet({ id: 'yoga10', types_cours_autorises: ['yoga'] })];
  expect(resoudreCarnetApplicable(abos, COURS_RENFO)).toBeNull();
  // …mais s'applique bien au yoga
  expect(resoudreCarnetApplicable(abos, COURS_YOGA)?.id).toBe('yoga10');
});

test('carnet non restreint couvre TOUS les cours (y compris renfo)', () => {
  const abos = [carnet({ id: 'all', types_cours_autorises: null })];
  expect(resoudreCarnetApplicable(abos, COURS_RENFO)?.id).toBe('all');
  const abosVide = [carnet({ id: 'all2', types_cours_autorises: [] })];
  expect(resoudreCarnetApplicable(abosVide, COURS_RENFO)?.id).toBe('all2');
});

test('le plus SPÉCIFIQUE d’abord (restreint au type avant « tous »)', () => {
  const abos = [
    carnet({ id: 'all', types_cours_autorises: null, date_fin: '2026-08-10' }),
    carnet({ id: 'yoga', types_cours_autorises: ['yoga'], date_fin: '2026-12-31' }),
  ];
  // même si le « tous » expire plus tôt, on consomme d’abord le spécifique yoga
  expect(resoudreCarnetApplicable(abos, COURS_YOGA)?.id).toBe('yoga');
});

test('à spécificité égale → celui qui EXPIRE LE PLUS TÔT', () => {
  const abos = [
    carnet({ id: 'tard', types_cours_autorises: ['yoga'], date_fin: '2026-12-31' }),
    carnet({ id: 'tot',  types_cours_autorises: ['yoga'], date_fin: '2026-08-15' }),
  ];
  expect(resoudreCarnetApplicable(abos, COURS_YOGA)?.id).toBe('tot');
});

test('carnet « jamais » (date_fin null) passe APRÈS un carnet daté', () => {
  const abos = [
    carnet({ id: 'jamais', types_cours_autorises: ['yoga'], date_fin: null }),
    carnet({ id: 'date',   types_cours_autorises: ['yoga'], date_fin: '2026-09-01' }),
  ];
  expect(resoudreCarnetApplicable(abos, COURS_YOGA)?.id).toBe('date');
});

test('exclut épuisé / expiré / en pause / mauvais statut', () => {
  const abos = [
    carnet({ id: 'epuise',  seances_total: 5, seances_utilisees: 5 }),
    carnet({ id: 'expire',  date_fin: '2026-07-01' }),                       // avant la date du cours
    carnet({ id: 'pause',   date_pause_debut: '2026-07-25', date_pause_fin: '2026-08-10' }),
    carnet({ id: 'annule',  statut: 'annule' }),
  ];
  expect(resoudreCarnetApplicable(abos, COURS_YOGA)).toBeNull();
});

test('carnet illimité (seances_total null) reste applicable', () => {
  const abos = [carnet({ id: 'illim', seances_total: null, seances_utilisees: 0 })];
  expect(resoudreCarnetApplicable(abos, COURS_YOGA)?.id).toBe('illim');
});

test('aucun carnet → null', () => {
  expect(resoudreCarnetApplicable([], COURS_YOGA)).toBeNull();
  expect(resoudreCarnetApplicable(null, COURS_YOGA)).toBeNull();
});

// ─── Cours payable à la séance (tarif_unitaire) — gate v70 ───────────────────
// Promesse du formulaire de cours : « il ne décomptera aucun carnet ».
// Le cas Maude : atelier « Yoga Renfo » à 15 €, élèves à carnet « tous cours ».

test('cours à tarif_unitaire → AUCUN carnet résolu, même « tous cours »', () => {
  const abos = [carnet({ id: 'all', types_cours_autorises: null })];
  expect(resoudreCarnetApplicable(abos, { ...COURS_RENFO, tarif_unitaire: 15 })).toBeNull();
});

test('cours à tarif_unitaire → même un carnet SPÉCIFIQUE au type ne s’applique pas', () => {
  const abos = [carnet({ id: 'renfo', types_cours_autorises: ['renfo'] })];
  expect(resoudreCarnetApplicable(abos, { ...COURS_RENFO, tarif_unitaire: 12.5 })).toBeNull();
});

test('tarif_unitaire null / 0 / absent → résolution normale', () => {
  const abos = [carnet({ id: 'all' })];
  expect(resoudreCarnetApplicable(abos, { ...COURS_YOGA, tarif_unitaire: null })?.id).toBe('all');
  expect(resoudreCarnetApplicable(abos, { ...COURS_YOGA, tarif_unitaire: 0 })?.id).toBe('all');
  expect(resoudreCarnetApplicable(abos, COURS_YOGA)?.id).toBe('all');
});

// ─── Cours MIXTE (carnets_acceptes — v82, MODELE-COURS-CARNETS-2026.md R1) ───
// Le tarif à l'unité devient un FILET : carnet applicable → décompte ;
// sinon → « à régler X € ». La case décochée (ou absente : cours d'avant
// v82, select sans la colonne) = comportement v70 strict, verrouillé par
// les 2 tests ci-dessus qui passent un cours SANS carnets_acceptes.

test('mixte : tarif + carnets_acceptes → le carnet applicable décompte (le cas Colin)', () => {
  const abos = [carnet({ id: 'all', types_cours_autorises: null })];
  expect(resoudreCarnetApplicable(abos, { ...COURS_RENFO, tarif_unitaire: 20, carnets_acceptes: true })?.id).toBe('all');
  const specifique = [carnet({ id: 'renfo', types_cours_autorises: ['renfo'] })];
  expect(resoudreCarnetApplicable(specifique, { ...COURS_RENFO, tarif_unitaire: 20, carnets_acceptes: true })?.id).toBe('renfo');
});

test('mixte : carnet du MAUVAIS type → null (l\'élève paiera les 20 €)', () => {
  const abos = [carnet({ id: 'yoga10', types_cours_autorises: ['yoga'] })];
  expect(resoudreCarnetApplicable(abos, { ...COURS_RENFO, tarif_unitaire: 20, carnets_acceptes: true })).toBeNull();
});

test('mixte : la priorité multi-carnets reste identique (restreint d\'abord, expire tôt)', () => {
  const abos = [
    carnet({ id: 'all',  types_cours_autorises: null, date_fin: '2026-08-10' }),
    carnet({ id: 'renfo', types_cours_autorises: ['renfo'], date_fin: '2026-12-31' }),
  ];
  expect(resoudreCarnetApplicable(abos, { ...COURS_RENFO, tarif_unitaire: 20, carnets_acceptes: true })?.id).toBe('renfo');
});

test('carnets_acceptes explicitement false / sans tarif → aucun effet', () => {
  const abos = [carnet({ id: 'all' })];
  // false = atelier pur, gate v70 intact
  expect(resoudreCarnetApplicable(abos, { ...COURS_RENFO, tarif_unitaire: 15, carnets_acceptes: false })).toBeNull();
  // flag posé sans tarif (combinaison sans objet) → résolution normale
  expect(resoudreCarnetApplicable(abos, { ...COURS_YOGA, carnets_acceptes: true })?.id).toBe('all');
});
