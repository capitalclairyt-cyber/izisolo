// ═══════════════════════════════════════════════════════════════════════════
// Verrou CI — le rappel « Paiement en attente » de la cloche
// (2026-09-21, retour Maude : six jours après avoir saisi le premier chèque
// de Marie-Pierre, la cloche disait encore « 235 € · en attente depuis
// 26 jours », tous les deux jours).
// Spec Node pure : fige lib/rappel-paiement.js.
//
// Les règles qu'on ne laisse pas glisser : un reste DIT ce qui a déjà été
// reçu ; les jours se comptent depuis le dernier mouvement, jamais depuis la
// vente quand un acompte est arrivé après ; un rappel vit sept jours ; un
// rappel dont la ligne n'attend plus rien est purgé ; et la ligne d'origine
// n'est jamais sa propre sœur.
// ═══════════════════════════════════════════════════════════════════════════
import { test, expect } from '@playwright/test';
import {
  DUREE_RAPPEL_JOURS, soeursReglees, dejaRecu, joursAttente, rappelPaiement,
  refRappel, expirationRappel, refsObsoletes,
} from '../../lib/rappel-paiement.js';

const AUJ = '2026-09-21';
const ECH = 'cbb221c9-echeancier';

// Le cas réel de Marie-Pierre après l'imputation du 15/09.
const RESTE = {
  id: 'p-reste', intitule: 'Abonnement annuel 2026-2027 yoga', montant: 235,
  date: '2026-08-25', statut: 'pending', echeancier_id: ECH, client_id: 'c-mp',
  clients: { prenom: 'Marie-Pierre', nom: 'Maclet' },
};
const CHEQUE = {
  id: 'p-cheque', montant: 245, statut: 'paid', mode: 'cheque',
  date: '2026-09-08', date_encaissement: '2026-09-08', echeancier_id: ECH,
};
// Une ligne seule, sans acompte (Elodie).
const SEULE = {
  id: 'p-seule', intitule: 'Abonnement annuel 2026-2027 yoga', montant: 480,
  date: '2026-08-23', statut: 'pending', echeancier_id: null, client_id: 'c-el',
  clients: { prenom: 'Elodie', nom: 'Bart' },
};

test.describe('ce qui a déjà été reçu', () => {
  test('les sœurs réglées partagent l’échéancier, jamais la ligne elle-même', () => {
    const autre = { id: 'p-autre', statut: 'paid', echeancier_id: 'autre', montant: 50 };
    const enAttente = { id: 'p-att', statut: 'pending', echeancier_id: ECH, montant: 10 };
    const resteReglee = { ...RESTE, statut: 'paid' };
    expect(soeursReglees(RESTE, [CHEQUE, autre, enAttente, resteReglee]).map(s => s.id)).toEqual(['p-cheque']);
  });

  test('sans échéancier, aucune sœur', () => {
    expect(soeursReglees(SEULE, [CHEQUE])).toEqual([]);
    expect(dejaRecu(SEULE, [CHEQUE])).toEqual({ total: 0, nb: 0, dernier: null });
  });

  test('dejaRecu additionne et retient le DERNIER encaissement', () => {
    const c2 = { ...CHEQUE, id: 'p-c2', montant: 100, date_encaissement: '2026-09-12', mode: 'especes' };
    const r = dejaRecu(RESTE, [CHEQUE, c2]);
    expect(r.total).toBe(345);
    expect(r.nb).toBe(2);
    expect(r.dernier).toEqual({ date: '2026-09-12', mode: 'especes' });
  });

  test('dejaRecu tombe juste sur les centimes et ignore un montant illisible', () => {
    const a = { ...CHEQUE, id: 'a', montant: 0.1 };
    const b = { ...CHEQUE, id: 'b', montant: 0.2 };
    const c = { ...CHEQUE, id: 'c', montant: 'abc' };
    expect(dejaRecu(RESTE, [a, b, c]).total).toBe(0.3);
  });
});

test.describe('les jours d’attente', () => {
  test('sans acompte, depuis la date de la ligne', () => {
    expect(joursAttente(SEULE, dejaRecu(SEULE, []), AUJ)).toBe(29);
  });

  test('avec un acompte, depuis le dernier encaissement et non depuis la vente', () => {
    expect(joursAttente(RESTE, dejaRecu(RESTE, [CHEQUE]), AUJ)).toBe(13);
  });

  test('un acompte antérieur à la ligne ne recule pas le compteur', () => {
    const vieux = { ...CHEQUE, date_encaissement: '2026-08-01' };
    expect(joursAttente(RESTE, dejaRecu(RESTE, [vieux]), AUJ)).toBe(27);
  });

  test('jamais négatif, jamais NaN', () => {
    expect(joursAttente({ date: '2026-09-30' }, null, AUJ)).toBe(0);
    expect(joursAttente({ date: 'n/a' }, null, AUJ)).toBe(0);
    expect(joursAttente({}, null, AUJ)).toBe(0);
    expect(Number.isNaN(joursAttente({ date: null }, { dernier: { date: 'x' } }, AUJ))).toBe(false);
  });
});

test.describe('le rappel', () => {
  test('un reste dit ce qui a déjà été reçu, par quel moyen et quand', () => {
    const r = rappelPaiement(RESTE, [CHEQUE], AUJ);
    expect(r.titre).toBe('💶 Paiement en attente — Marie-Pierre Maclet');
    expect(r.corps).toBe('Abonnement annuel 2026-2027 yoga · reste 235 € (245 € déjà reçus, dernier par chèque le 08/09) · en attente depuis 13 jours');
    expect(r.data).toEqual({ paiement_id: 'p-reste', client_id: 'c-mp', montant: 235, recu: 245, total: 480, jours: 13 });
  });

  test('une ligne sans acompte garde la phrase courte', () => {
    const r = rappelPaiement(SEULE, [CHEQUE], AUJ);
    expect(r.corps).toBe('Abonnement annuel 2026-2027 yoga · 480 € · en attente depuis 29 jours');
    expect(r.corps).not.toContain('déjà reçus');
    expect(r.data.recu).toBe(0);
    expect(r.data.total).toBe(480);
  });

  test('un seul jour s’écrit au singulier, un mode inconnu ne s’invente pas', () => {
    const hier = { ...SEULE, date: '2026-09-20' };
    expect(rappelPaiement(hier, [], AUJ).corps).toContain('depuis 1 jour');
    const inconnu = { ...CHEQUE, mode: 'troc' };
    expect(rappelPaiement(RESTE, [inconnu], AUJ).corps).toContain('dernier le 08/09)');
  });

  test('un rappel sans fiche ni intitulé ne jette pas', () => {
    const r = rappelPaiement({ id: 'x', montant: '12.5', date: '2026-09-01' }, null, AUJ);
    expect(r.titre).toBe('💶 Paiement en attente — une élève');
    expect(r.corps).toBe('Paiement · 12,50 € · en attente depuis 20 jours');
  });
});

test.describe('la cadence et la purge', () => {
  test('un rappel vit sept jours', () => {
    expect(DUREE_RAPPEL_JOURS).toBe(7);
    const t0 = new Date('2026-09-21T10:00:00Z');
    expect(expirationRappel(t0)).toBe('2026-09-28T10:00:00.000Z');
  });

  test('la clé est stable par ligne', () => {
    expect(refRappel('p-reste')).toBe('paiement_retard_p-reste');
  });

  test('refsObsoletes ne purge que les rappels de paiement dont la ligne n’attend plus', () => {
    const existants = ['paiement_retard_p-reste', 'paiement_retard_p-encaisse', 'carnet_epuise_abo1', 'paiement_retard_p-seule', null];
    expect(refsObsoletes(existants, [RESTE, SEULE])).toEqual(['paiement_retard_p-encaisse']);
    expect(refsObsoletes(existants, [])).toEqual(['paiement_retard_p-reste', 'paiement_retard_p-encaisse', 'paiement_retard_p-seule']);
    expect(refsObsoletes(null, null)).toEqual([]);
  });
});
