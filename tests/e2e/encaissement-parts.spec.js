// ═══════════════════════════════════════════════════════════════════════════
// Verrou CI — encaisser un paiement en attente en plusieurs moyens
// (2026-09-14, retour Maude : l'abonnement de Marie-Pierre réglé en deux
// chèques après une vente « à régler plus tard »).
// Spec Node pure : fige lib/encaissement-parts.js.
//
// Les règles qu'on ne laisse pas glisser : un découpage qui ne fait pas le
// total est REFUSÉ, un moyen se DÉCLARE (jamais deviné), la ligne d'origine
// garde son id (part n°1), les sœurs partagent le même échéancier, et une
// présence ou une session Stripe ne sont jamais recopiées.
// ═══════════════════════════════════════════════════════════════════════════
import { test, expect } from '@playwright/test';
import {
  MIN_PARTS, MAX_PARTS, dateIsoValide, decouperMontant, validerParts,
  lignesEncaissement, texteParts,
} from '../../lib/encaissement-parts.js';

const AUJ = '2026-09-14';

test.describe('découpage', () => {
  test('decouperMontant met le reliquat sur la première part et tombe juste', () => {
    expect(decouperMontant(480, 2)).toEqual([240, 240]);
    expect(decouperMontant(100, 3)).toEqual([33.34, 33.33, 33.33]);
    expect(decouperMontant(425, 4)).toEqual([106.25, 106.25, 106.25, 106.25]);
    expect(decouperMontant(0, 2)).toEqual([0, 0]);
    expect(decouperMontant('abc', 2)).toEqual([0, 0]);
  });

  test('decouperMontant borne le nombre de parts entre MIN et MAX', () => {
    expect(decouperMontant(10, 1)).toHaveLength(MIN_PARTS);
    expect(decouperMontant(10, 9)).toHaveLength(MAX_PARTS);
  });

  test('dateIsoValide refuse le débordement et les formats libres', () => {
    expect(dateIsoValide('2026-09-14')).toBe(true);
    expect(dateIsoValide('2026-02-31')).toBe(false);
    expect(dateIsoValide('14/09/2026')).toBe(false);
    expect(dateIsoValide('')).toBe(false);
    expect(dateIsoValide(null)).toBe(false);
  });
});

test.describe('validerParts — ce qui est accepté', () => {
  test('deux chèques qui font le total, datés d\'aujourd\'hui par défaut', () => {
    const r = validerParts([
      { montant: 240, mode: 'cheque', numero_cheque: ' 0012345 ' },
      { montant: '240', mode: 'cheque', numero_cheque: '0012346' },
    ], 480, { aujourdhui: AUJ });
    expect(r.ok).toBe(true);
    expect(r.parts).toEqual([
      { montant: 240, mode: 'cheque', numero_cheque: '0012345', date_encaissement: AUJ },
      { montant: 240, mode: 'cheque', numero_cheque: '0012346', date_encaissement: AUJ },
    ]);
  });

  test('un chèque déposé plus tôt garde sa date, un moyen sans chèque perd le numéro', () => {
    const r = validerParts([
      { montant: 80, mode: 'especes', numero_cheque: '999' },
      { montant: 43, mode: 'cheque', date_encaissement: '2026-09-02' },
    ], 123, { aujourdhui: AUJ });
    expect(r.ok).toBe(true);
    expect(r.parts[0].numero_cheque).toBeNull();
    expect(r.parts[1].date_encaissement).toBe('2026-09-02');
  });

  test('tolère l\'arrondi de saisie à deux décimales', () => {
    const r = validerParts([{ montant: 33.33, mode: 'CB' }, { montant: 33.33, mode: 'CB' }, { montant: 33.34, mode: 'virement' }], 100, { aujourdhui: AUJ });
    expect(r.ok).toBe(true);
  });

  test('sans « aujourdhui », la date reste nulle (la route posera la sienne)', () => {
    const r = validerParts([{ montant: 1, mode: 'especes' }, { montant: 1, mode: 'especes' }], 2);
    expect(r.ok).toBe(true);
    expect(r.parts[0].date_encaissement).toBeNull();
  });
});

test.describe('validerParts — ce qui est refusé, avec sa raison', () => {
  test('un découpage qui ne fait pas le total est refusé et nomme les deux montants', () => {
    const r = validerParts([{ montant: 200, mode: 'cheque' }, { montant: 200, mode: 'cheque' }], 480, { aujourdhui: AUJ });
    expect(r.ok).toBe(false);
    expect(r.erreur).toMatch(/400,00 €/);
    expect(r.erreur).toMatch(/480,00 €/);
    expect(r.parts).toEqual([]);
  });

  test('un moyen non déclaré est refusé : jamais deviné', () => {
    const r = validerParts([{ montant: 240, mode: '' }, { montant: 240, mode: 'cheque' }], 480, { aujourdhui: AUJ });
    expect(r.ok).toBe(false);
    expect(r.erreur).toMatch(/n°1/);
    const r2 = validerParts([{ montant: 240, mode: 'Espèces' }, { montant: 240, mode: 'cheque' }], 480, { aujourdhui: AUJ });
    expect(r2.ok).toBe(false);
  });

  test('un montant nul ou négatif est refusé', () => {
    expect(validerParts([{ montant: 0, mode: 'cheque' }, { montant: 480, mode: 'cheque' }], 480, { aujourdhui: AUJ }).ok).toBe(false);
    expect(validerParts([{ montant: -10, mode: 'cheque' }, { montant: 490, mode: 'cheque' }], 480, { aujourdhui: AUJ }).ok).toBe(false);
  });

  test('moins de deux parts ou plus de quatre : refusé', () => {
    expect(validerParts([{ montant: 480, mode: 'cheque' }], 480, { aujourdhui: AUJ }).ok).toBe(false);
    const cinq = Array.from({ length: 5 }, () => ({ montant: 96, mode: 'especes' }));
    expect(validerParts(cinq, 480, { aujourdhui: AUJ }).ok).toBe(false);
  });

  test('une date dans le futur ou malformée est refusée', () => {
    expect(validerParts([{ montant: 240, mode: 'cheque', date_encaissement: '2026-09-15' }, { montant: 240, mode: 'cheque' }], 480, { aujourdhui: AUJ }).ok).toBe(false);
    expect(validerParts([{ montant: 240, mode: 'cheque', date_encaissement: 'demain' }, { montant: 240, mode: 'cheque' }], 480, { aujourdhui: AUJ }).ok).toBe(false);
  });

  test('un total inconnu ou un tableau absent : refusé sans jeter', () => {
    expect(validerParts([{ montant: 1, mode: 'cheque' }, { montant: 1, mode: 'cheque' }], 0).ok).toBe(false);
    expect(validerParts(null, 480).ok).toBe(false);
    expect(validerParts([null, undefined], 480).ok).toBe(false);
  });
});

test.describe('lignesEncaissement — ce que la route écrit', () => {
  const paiement = {
    id: 'p1', profile_id: 'studio', client_id: 'mp', offre_id: 'off', abonnement_id: 'abo',
    intitule: 'Abonnement annuel 2026-2027 yoga', type: 'abonnement', montant: 480,
    date: '2026-08-25', echeancier_id: null, notes: null, presence_id: 'pres', stripe_session_id: 'cs_x',
  };
  const parts = validerParts([
    { montant: 240, mode: 'cheque', numero_cheque: '0012345' },
    { montant: 240, mode: 'cheque', numero_cheque: '0012346', date_encaissement: '2026-09-10' },
  ], 480, { aujourdhui: AUJ }).parts;

  test('la ligne d\'origine devient la part 1, réglée, avec son moyen et son numéro', () => {
    const { principale } = lignesEncaissement(paiement, parts, { echeancierId: 'ech-neuf' });
    expect(principale).toEqual({
      statut: 'paid', montant: 240, mode: 'cheque', numero_cheque: '0012345', date_encaissement: AUJ,
      intitule: 'Abonnement annuel 2026-2027 yoga (1/2)', echeancier_id: 'ech-neuf', notes: null,
    });
  });

  test('les sœurs sont neuves, réglées, même échéancier, même vente, sans présence ni session Stripe', () => {
    const { nouvelles } = lignesEncaissement(paiement, parts, { echeancierId: 'ech-neuf' });
    expect(nouvelles).toHaveLength(1);
    const s = nouvelles[0];
    expect(s.profile_id).toBe('studio');
    expect(s.client_id).toBe('mp');
    expect(s.abonnement_id).toBe('abo');
    expect(s.offre_id).toBe('off');
    expect(s.echeancier_id).toBe('ech-neuf');
    expect(s.intitule).toBe('Abonnement annuel 2026-2027 yoga (2/2)');
    expect(s.statut).toBe('paid');
    expect(s.mode).toBe('cheque');
    expect(s.numero_cheque).toBe('0012346');
    expect(s.date).toBe('2026-08-25');
    expect(s.date_encaissement).toBe('2026-09-10');
    expect(s.presence_id).toBeNull();
    expect(s.stripe_session_id).toBeNull();
  });

  test('un échéancier existant est conservé, jamais remplacé', () => {
    const { principale, nouvelles } = lignesEncaissement({ ...paiement, echeancier_id: 'ech-vente' }, parts, { echeancierId: 'ech-neuf' });
    expect(principale.echeancier_id).toBe('ech-vente');
    expect(nouvelles[0].echeancier_id).toBe('ech-vente');
  });

  test('un intitulé déjà suffixé (versement 2/3) est renuméroté proprement', () => {
    const { principale } = lignesEncaissement({ ...paiement, intitule: 'Abo (2/3)' }, parts, { echeancierId: 'e' });
    expect(principale.intitule).toBe('Abo (1/2)');
  });

  test('les notes de la prof s\'ajoutent à celles qui existent', () => {
    const { principale } = lignesEncaissement({ ...paiement, notes: 'ancienne' }, parts, { echeancierId: 'e', notes: 'reçu en main propre' });
    expect(principale.notes).toBe('ancienne\nreçu en main propre');
  });
});

test('texteParts dit chaque moyen en français', () => {
  expect(texteParts([{ montant: 240, mode: 'cheque' }, { montant: 240, mode: 'cheque' }])).toBe('240 € par chèque + 240 € par chèque');
  expect(texteParts([{ montant: 80, mode: 'especes' }, { montant: 43.5, mode: 'CB' }])).toBe('80 € en espèces + 43,50 € par cb');
});

// ── Un versement reçu s'impute sur ce qui attend (2026-09-15, Marie-Pierre bis) ──
import { planImputation, texteImputation } from '../../lib/encaissement-parts.js';

test.describe("planImputation : un versement reçu s'impute sur les lignes en attente", () => {
  const l480 = [{ id: 'a', montant: 480, date: '2026-08-25', statut: 'pending' }];

  test('245 € sur 480 attendus : la ligne est scindée, 245 réglés, 235 restants', () => {
    const p = planImputation(l480, 245);
    expect(p.ok).toBe(true);
    expect(p.actions).toEqual([{ id: 'a', action: 'scinder', paye: 245, reste: 235 }]);
    expect(p.surplus).toBe(0);
  });

  test('le montant exact règle la ligne entière', () => {
    expect(planImputation(l480, 480).actions).toEqual([{ id: 'a', action: 'regler' }]);
  });

  test('deux échéances : la plus ancienne est réglée d abord, la suivante scindée', () => {
    const lignes = [
      { id: 'b', montant: 100, date: '2026-10-01', statut: 'pending' },
      { id: 'a', montant: 100, date: '2026-09-01', statut: 'overdue' },
    ];
    expect(planImputation(lignes, 150).actions).toEqual([
      { id: 'a', action: 'regler' },
      { id: 'b', action: 'scinder', paye: 50, reste: 50 },
    ]);
  });

  test('un versement qui dépasse le total attendu est refusé, avec les deux montants', () => {
    const p = planImputation(l480, 500);
    expect(p.ok).toBe(false);
    expect(p.erreur).toMatch(/500 €/);
    expect(p.erreur).toMatch(/480 €/);
    expect(p.actions).toEqual([]);
    expect(p.surplus).toBe(20);
  });

  test('les lignes déjà réglées ne comptent pas : sans attente, aucune action et tout le montant en surplus', () => {
    const p = planImputation([{ id: 'x', montant: 480, statut: 'paid' }], 100);
    expect(p.ok).toBe(true);
    expect(p.actions).toEqual([]);
    expect(p.surplus).toBe(100);
  });

  test('un montant nul ou absurde est refusé', () => {
    expect(planImputation(l480, 0).ok).toBe(false);
    expect(planImputation(l480, 'abc').ok).toBe(false);
  });

  test('les centimes : 0,01 € de tolérance, jamais un reste négatif', () => {
    const p = planImputation([{ id: 'a', montant: 33.33, statut: 'pending' }], 33.34);
    expect(p.actions).toEqual([{ id: 'a', action: 'regler' }]);
  });
});

test.describe('texteImputation : la phrase de la modale', () => {
  const l480 = [{ id: 'a', montant: 480, date: '2026-08-25', statut: 'pending' }];
  test('rien sans ligne en attente', () => {
    expect(texteImputation([], 100)).toBeNull();
    expect(texteImputation([{ id: 'x', montant: 10, statut: 'paid' }], 100)).toBeNull();
  });
  test('avant la saisie : annonce que le versement se déduira', () => {
    expect(texteImputation(l480, '')).toBe("480 € attendent sur cet abonnement : ce versement s'en déduira.");
  });
  test('pendant la saisie : dit ce qui restera', () => {
    expect(texteImputation(l480, 245)).toBe('Ces 245 € se déduisent des 480 € attendus : il restera 235 € à encaisser.');
  });
  test('le montant exact : tout est soldé', () => {
    expect(texteImputation(l480, 480)).toBe('Ces 480 € soldent les 480 € attendus : plus rien à encaisser sur cet abonnement.');
  });
  test('au-delà : la raison du refus', () => {
    expect(texteImputation(l480, 500)).toMatch(/dépasse/);
  });
});
