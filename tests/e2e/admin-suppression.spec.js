// ═══════════════════════════════════════════════════════════════════════════
// Verrou CI — suppression d'un studio depuis l'admin (2026-08-22). Spec Node
// pure : fige les garde-fous de lib/admin-suppression.js.
//
// C'est l'opération la plus destructive de l'app (cascade sur ~40 tables, pas
// de corbeille). Ce qui est verrouillé ici, ce sont les conditions dans
// lesquelles elle NE DOIT PAS avoir lieu, et les avertissements qui doivent
// rester visibles quand elle a lieu quand même.
// ═══════════════════════════════════════════════════════════════════════════
import { test, expect } from '@playwright/test';
import {
  confirmationValide, motifsDeRefus, avertissements,
  orphelinSupprimable, resumeSuppression, CE_QUI_RESTE,
} from '../../lib/admin-suppression.js';

test.describe('Confirmation — le nom exact, retapé', () => {
  test('accepte le nom exact, tolère les espaces en trop', () => {
    expect(confirmationValide('Yoga Doux Annecy', 'Yoga Doux Annecy')).toBe(true);
    expect(confirmationValide('  Yoga Doux Annecy  ', 'Yoga Doux Annecy')).toBe(true);
    expect(confirmationValide('Yoga  Doux   Annecy', 'Yoga Doux Annecy')).toBe(true);
  });

  test('refuse le à-peu-près : casse, accents, mot manquant', () => {
    expect(confirmationValide('yoga doux annecy', 'Yoga Doux Annecy')).toBe(false);
    expect(confirmationValide('Yoga Doux', 'Yoga Doux Annecy')).toBe(false);
    expect(confirmationValide('Yoga Doux Annecy !', 'Yoga Doux Annecy')).toBe(false);
    expect(confirmationValide('', 'Yoga Doux Annecy')).toBe(false);
    expect(confirmationValide(null, 'Yoga Doux Annecy')).toBe(false);
  });

  test('un studio SANS nom ne peut pas être confirmé (on ne devine pas)', () => {
    expect(confirmationValide('', '')).toBe(false);
    expect(confirmationValide('   ', null)).toBe(false);
    expect(confirmationValide('nimportequoi', undefined)).toBe(false);
  });
});

test.describe('Refus — les cas où la suppression n\'a jamais lieu', () => {
  test('on ne supprime pas son propre compte depuis l\'admin', () => {
    const m = motifsDeRefus({ profil: { id: 'moi' }, adminUserId: 'moi' });
    expect(m.length).toBe(1);
    expect(m[0]).toContain('ton propre compte');
  });

  test('un abonnement Stripe vivant bloque (le prélèvement continuerait)', () => {
    for (const statut of ['active', 'trialing', 'past_due']) {
      const m = motifsDeRefus({ profil: { id: 'a', stripe_subscription_status: statut }, adminUserId: 'b' });
      expect(m.length).toBe(1);
      expect(m[0]).toContain('Stripe');
    }
  });

  test('un abonnement résilié ou absent ne bloque pas', () => {
    for (const statut of ['canceled', 'incomplete_expired', '', null, undefined]) {
      expect(motifsDeRefus({ profil: { id: 'a', stripe_subscription_status: statut }, adminUserId: 'b' })).toEqual([]);
    }
  });

  test('les refus se cumulent sans s\'écraser', () => {
    const m = motifsDeRefus({ profil: { id: 'moi', stripe_subscription_status: 'active' }, adminUserId: 'moi' });
    expect(m.length).toBe(2);
  });
});

test.describe('Avertissements — bruyants sur ce qui compte', () => {
  const TEST = { inventaire: {}, estTest: true };

  test('un compte de test vide ne déclenche rien', () => {
    expect(avertissements(TEST)).toEqual([]);
  });

  test('les factures émises sont un avertissement GRAVE (pièces comptables)', () => {
    const a = avertissements({ inventaire: { factures: 3 }, estTest: true });
    expect(a.some(x => x.niveau === 'grave' && /facture/i.test(x.texte))).toBe(true);
  });

  test('de l\'argent réellement encaissé est GRAVE', () => {
    const a = avertissements({ inventaire: { encaisse: 1240 }, estTest: true });
    expect(a.some(x => x.niveau === 'grave' && x.texte.includes('1240'))).toBe(true);
  });

  test('un compte qui ne ressemble PAS à un test est GRAVE', () => {
    const a = avertissements({ inventaire: {}, estTest: false });
    expect(a.some(x => x.niveau === 'grave' && /pas.*compte de test/i.test(x.texte))).toBe(true);
  });

  test('les fiches élèves et la dernière activité sont signalées', () => {
    const a = avertissements({ inventaire: { clients: 32, derniereActivite: '2026-08-21' }, estTest: true });
    expect(a.some(x => x.texte.includes('32'))).toBe(true);
    expect(a.some(x => x.texte.includes('2026-08-21'))).toBe(true);
  });

  test('zéro n\'est jamais présenté comme un danger', () => {
    expect(avertissements({ inventaire: { factures: 0, encaisse: 0, clients: 0 }, estTest: true })).toEqual([]);
  });
});

test.describe('Comptes élèves orphelins — jamais un prof, jamais un élève encore rattaché', () => {
  const RESTANTS = new Set(['emma@exemple.fr']);

  test('supprimable si plus aucune fiche nulle part', () => {
    expect(orphelinSupprimable({ id: 'u1', email: 'lea@example.com' }, RESTANTS)).toBe(true);
  });

  test('épargné s\'il lui reste une fiche dans un autre studio', () => {
    expect(orphelinSupprimable({ id: 'u2', email: 'emma@exemple.fr' }, RESTANTS)).toBe(false);
    expect(orphelinSupprimable({ id: 'u2', email: 'EMMA@Exemple.FR' }, RESTANTS)).toBe(false);
  });

  test('un compte PROF n\'est jamais traité comme un orphelin d\'élève', () => {
    expect(orphelinSupprimable({ id: 'u3', email: 'prof@studio.fr', estProf: true }, RESTANTS)).toBe(false);
  });

  test('entrée difforme = on ne supprime pas', () => {
    expect(orphelinSupprimable(null, RESTANTS)).toBe(false);
    expect(orphelinSupprimable({ id: 'u4' }, RESTANTS)).toBe(false);
    expect(orphelinSupprimable({ email: 'x@y.fr' }, RESTANTS)).toBe(false);
  });
});

test.describe('Compte-rendu et honnêteté', () => {
  test('le résumé dit ce qui est parti', () => {
    const r = resumeSuppression({
      studio: 'Yoga Doux Annecy',
      inventaire: { clients: 12, cours: 40, paiements: 8, factures: 2 },
      orphelinsSupprimes: 5,
    });
    expect(r).toContain('Yoga Doux Annecy');
    expect(r).toContain('12 élève(s)');
    expect(r).toContain('2 facture(s)');
    expect(r).toContain('5 compte(s) élève orphelin(s)');
  });

  test('sans facture ni orphelin, le résumé ne les invente pas', () => {
    const r = resumeSuppression({ studio: 'X', inventaire: { clients: 0, cours: 0, paiements: 0 } });
    expect(r).not.toContain('facture');
    expect(r).not.toContain('orphelin');
  });

  test('la liste de ce qui SURVIT est servie, jamais vide', () => {
    expect(CE_QUI_RESTE.length).toBeGreaterThan(0);
    expect(CE_QUI_RESTE.join(' ')).toMatch(/stockage/i);
    expect(CE_QUI_RESTE.join(' ')).toMatch(/autre studio/i);
  });
});
