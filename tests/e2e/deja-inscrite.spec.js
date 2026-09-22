// ═══════════════════════════════════════════════════════════════════════════
// Verrou CI — le modal « Ajouter des élèves » dit quand la personne cherchée
// est DÉJÀ sur la séance (2026-09-22, retour Maude : elle tapait « Catherine »,
// ne trouvait pas Catherine Mazoyer, et l'écran lui proposait de créer la
// fiche alors que Catherine était déjà sur la liste, pointée présente).
// Spec Node pure : fige lib/deja-inscrite.js.
// ═══════════════════════════════════════════════════════════════════════════
import { test, expect } from '@playwright/test';
import {
  etatPresence, inscritesCorrespondantes, texteDejaInscrites, proposerCreation,
} from '../../lib/deja-inscrite.js';

const PRESENCES = [
  { client_id: 'c1', statut_pointage: 'present', clients: { id: 'c1', prenom: 'Catherine', nom: 'Mazoyer' } },
  { client_id: 'c2', statut_pointage: 'inscrit', clients: { id: 'c2', prenom: 'Anne', nom: 'Dupont' } },
  { client_id: 'c3', statut_pointage: 'annule', clients: { id: 'c3', prenom: 'Hélène', nom: 'Martin' } },
  { client_id: 'c4', statut_pointage: 'present', annulation_tardive: true, clients: { id: 'c4', prenom: 'Zoé', nom: 'Petit' } },
  { client_id: 'c5', clients: null },
];

test.describe('etatPresence — l\'état dit comme sur la liste', () => {
  test('les statuts de pointage', () => {
    expect(etatPresence({ statut_pointage: 'present' })).toBe('présent·e');
    expect(etatPresence({ statut_pointage: 'absent' })).toBe('absent·e');
    expect(etatPresence({ statut_pointage: 'excuse' })).toBe('excusé·e');
    expect(etatPresence({ statut_pointage: 'inscrit' })).toBe('inscrit·e');
    expect(etatPresence({ statut_pointage: 'annule' })).toBe('a annulé sa réservation');
    expect(etatPresence({ statut_pointage: 'declinee' })).toBe('invitation déclinée');
  });

  test('sans statut : « pointee » décide, sinon inscrit·e ; l\'annulation tardive prime', () => {
    expect(etatPresence({ pointee: true })).toBe('présent·e');
    expect(etatPresence({})).toBe('inscrit·e');
    expect(etatPresence(null)).toBe('inscrit·e');
    expect(etatPresence({ statut_pointage: 'present', annulation_tardive: true })).toBe('annulation tardive');
  });
});

test.describe('inscritesCorrespondantes — qui, parmi les inscrites, correspond à la recherche', () => {
  test('le cas de Maude : « Catherine » trouve Catherine Mazoyer, présente', () => {
    const r = inscritesCorrespondantes('Catherine', PRESENCES);
    expect(r).toEqual([{ id: 'c1', nom: 'Catherine Mazoyer', etat: 'présent·e' }]);
  });

  test('tolérante comme la recherche du modal : accents, casse, nom + prénom, espace final', () => {
    expect(inscritesCorrespondantes('helene', PRESENCES).map(i => i.id)).toEqual(['c3']);
    expect(inscritesCorrespondantes('MAZOYER cath', PRESENCES).map(i => i.id)).toEqual(['c1']);
    expect(inscritesCorrespondantes('Anne ', PRESENCES).map(i => i.id)).toEqual(['c2']);
  });

  test('une recherche vide ne correspond à personne (le modal montre alors la liste)', () => {
    expect(inscritesCorrespondantes('', PRESENCES)).toEqual([]);
    expect(inscritesCorrespondantes('   ', PRESENCES)).toEqual([]);
    expect(inscritesCorrespondantes(undefined, PRESENCES)).toEqual([]);
  });

  test('une présence sans fiche jointe est ignorée, jamais une erreur', () => {
    expect(inscritesCorrespondantes('c5', PRESENCES)).toEqual([]);
    expect(inscritesCorrespondantes('x', null)).toEqual([]);
  });

  test('une même élève deux fois sur la séance ne sort qu\'une fois, triée par nom', () => {
    const doublon = [...PRESENCES, { client_id: 'c1', statut_pointage: 'inscrit', clients: { id: 'c1', prenom: 'Catherine', nom: 'Mazoyer' } }];
    const r = inscritesCorrespondantes('e', doublon);   // un « e » dans chacun des quatre noms
    expect(r.map(i => i.nom)).toEqual(['Anne Dupont', 'Catherine Mazoyer', 'Hélène Martin', 'Zoé Petit']);
  });
});

test.describe('texteDejaInscrites — la phrase', () => {
  test('une personne : elle est nommée avec son état', () => {
    expect(texteDejaInscrites([{ id: 'c1', nom: 'Catherine Mazoyer', etat: 'présent·e' }]))
      .toBe('Catherine Mazoyer est déjà sur cette séance (présent·e).');
  });

  test('plusieurs : toutes nommées', () => {
    expect(texteDejaInscrites([
      { id: 'c1', nom: 'Catherine Mazoyer', etat: 'présent·e' },
      { id: 'c2', nom: 'Anne Dupont', etat: 'inscrit·e' },
    ])).toBe('Déjà sur cette séance : Catherine Mazoyer (présent·e), Anne Dupont (inscrit·e).');
  });

  test('personne : rien', () => {
    expect(texteDejaInscrites([])).toBe('');
    expect(texteDejaInscrites(null)).toBe('');
  });
});

test.describe('proposerCreation — « Créer la fiche » seulement quand personne ne correspond', () => {
  test('jamais quand la recherche tombe sur une inscrite (le doublon de Maude)', () => {
    expect(proposerCreation({ query: 'Catherine', proposables: [], inscrites: [{ id: 'c1' }] })).toBe(false);
  });

  test('jamais quand la liste propose déjà quelqu\'un', () => {
    expect(proposerCreation({ query: 'Catherine', proposables: [{ id: 'c9' }], inscrites: [] })).toBe(false);
  });

  test('oui quand la recherche ne correspond vraiment à personne', () => {
    expect(proposerCreation({ query: 'Inconnue', proposables: [], inscrites: [] })).toBe(true);
  });

  test('jamais sur une recherche vide', () => {
    expect(proposerCreation({ query: '  ', proposables: [], inscrites: [] })).toBe(false);
    expect(proposerCreation({ proposables: [], inscrites: [] })).toBe(false);
  });
});
