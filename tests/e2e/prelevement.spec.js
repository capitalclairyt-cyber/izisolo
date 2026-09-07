// ═══════════════════════════════════════════════════════════════════════════
// Verrou CI — prélèvement automatique par carte (v107, 2026-09-07).
// Spec Node pure : fige lib/prelevement.js, la lecture des événements Stripe
// et les quatre politiques (échec, résiliation, engagement, pause).
// ═══════════════════════════════════════════════════════════════════════════
import { test, expect } from '@playwright/test';
import {
  estAboPreleve, dateStripe, estSessionAbonnement, lireSessionAbonnement, lireInvoice,
  echecFinal, intitulePrelevement, finApresPrelevement, finPeriodeSubscription,
  statutApresResiliation, libellePreleve, EVENEMENTS_WEBHOOK, ECHECS_AVANT_PAUSE,
} from '../../lib/prelevement.js';

const T = 1757203200; // 2025-09-07 00:00 UTC

test.describe('estAboPreleve / libellePreleve', () => {
  test('prélevé dès qu\'un sub_ est posé, jamais sur une chaîne vide', () => {
    expect(estAboPreleve({ stripe_subscription_id: 'sub_123' })).toBe(true);
    expect(estAboPreleve({ stripe_subscription_id: '' })).toBe(false);
    expect(estAboPreleve({ stripe_subscription_id: null })).toBe(false);
    expect(estAboPreleve({})).toBe(false);
    expect(estAboPreleve(null)).toBe(false);
  });
  test('le libellé nomme le prochain prélèvement quand la fin est connue', () => {
    expect(libellePreleve({ stripe_subscription_id: 'sub_1', date_fin: '2026-10-07' })).toBe('Prélèvement automatique par carte · prochain autour du 7 octobre 2026');
    expect(libellePreleve({ stripe_subscription_id: 'sub_1' })).toBe('Prélèvement automatique par carte');
    expect(libellePreleve({ stripe_subscription_id: null, date_fin: '2026-10-07' })).toBeNull();
  });
});

test.describe('lecture des événements Stripe', () => {
  test('dateStripe : epoch → ISO, sinon null', () => {
    expect(dateStripe(T)).toBe('2025-09-07');
    expect(dateStripe(0)).toBeNull();
    expect(dateStripe('x')).toBeNull();
    expect(dateStripe(undefined)).toBeNull();
  });

  test('une session en mode subscription est un abonnement ; un paiement unique non', () => {
    expect(estSessionAbonnement({ mode: 'subscription' })).toBe(true);
    expect(estSessionAbonnement({ mode: 'payment', subscription: 'sub_x' })).toBe(true);
    expect(estSessionAbonnement({ mode: 'payment', subscription: null })).toBe(false);
    expect(estSessionAbonnement({})).toBe(false);
  });

  test('lireSessionAbonnement accepte ids en chaîne ou objets étendus', () => {
    const l = lireSessionAbonnement({
      mode: 'subscription', subscription: { id: 'sub_a' }, customer: 'cus_b',
      customer_details: { email: 'Jess@Example.com' }, payment_link: 'plink_c', client_reference_id: null,
    });
    expect(l).toEqual({ subscriptionId: 'sub_a', customerId: 'cus_b', email: 'Jess@Example.com', paymentLinkId: 'plink_c', clientReferenceId: null });
  });

  test('lireInvoice : montant en euros, date de paiement, période depuis la ligne, sub_ depuis l\'ancienne OU la nouvelle forme', () => {
    const ancienne = lireInvoice({
      id: 'in_1', subscription: 'sub_1', customer: 'cus_1', customer_email: 'j@x.fr', amount_paid: 5500,
      status_transitions: { paid_at: T }, billing_reason: 'subscription_cycle', attempt_count: 1,
      lines: { data: [{ description: 'Abonnement au mois', period: { start: T, end: T + 30 * 86400 } }] },
    });
    expect(ancienne.invoiceId).toBe('in_1');
    expect(ancienne.subscriptionId).toBe('sub_1');
    expect(ancienne.montant).toBe(55);
    expect(ancienne.datePaiement).toBe('2025-09-07');
    expect(ancienne.periodeDebut).toBe('2025-09-07');
    expect(ancienne.periodeFin).toBe('2025-10-07');
    expect(ancienne.billingReason).toBe('subscription_cycle');
    expect(ancienne.description).toBe('Abonnement au mois');

    const nouvelle = lireInvoice({
      id: 'in_2', parent: { subscription_details: { subscription: 'sub_2' } }, amount_paid: 1999, created: T,
      lines: { data: [{ parent: { subscription_item_details: { subscription: 'sub_2' } }, period: { start: T, end: T + 86400 } }] },
    });
    expect(nouvelle.subscriptionId).toBe('sub_2');
    expect(nouvelle.montant).toBe(19.99);
    expect(nouvelle.datePaiement).toBe('2025-09-07'); // repli sur created
    expect(nouvelle.description).toBeNull();
  });

  test('lireInvoice sur un échec : amount_due, tentatives, prochaine tentative', () => {
    const l = lireInvoice({ id: 'in_3', subscription: 'sub_3', amount_paid: 0, amount_due: 5500, attempt_count: 2, next_payment_attempt: T + 3 * 86400 });
    expect(l.montant).toBe(55);
    expect(l.tentatives).toBe(2);
    expect(l.prochaineTentative).toBe('2025-09-10');
    expect(lireInvoice(null).invoiceId).toBeNull();
  });
});

test.describe('politique 1 — échec de prélèvement', () => {
  test('pas final tant que Stripe réessaie et que le plafond n\'est pas atteint', () => {
    expect(echecFinal({ tentatives: 1, prochaineTentative: '2026-09-10' })).toBe(false);
    expect(echecFinal({ tentatives: 2, prochaineTentative: '2026-09-14' })).toBe(false);
  });
  test('final quand Stripe abandonne, ou au 3e échec', () => {
    expect(echecFinal({ tentatives: 1, prochaineTentative: null })).toBe(true);
    expect(echecFinal({ tentatives: ECHECS_AVANT_PAUSE, prochaineTentative: '2026-09-20' })).toBe(true);
    expect(echecFinal(null)).toBe(false);
  });
});

test.describe('intitulé et fin d\'abo après prélèvement', () => {
  test('« Offre · mois de la période », repli sur la description Stripe, puis « Prélèvement »', () => {
    expect(intitulePrelevement({ offreNom: 'Abonnement au mois', periodeDebut: '2026-09-07' })).toBe('Abonnement au mois · septembre 2026');
    expect(intitulePrelevement({ offreNom: null, periodeDebut: '2026-10-01', description: 'Monthly yoga' })).toBe('Monthly yoga · octobre 2026');
    expect(intitulePrelevement({ offreNom: '', periodeDebut: null, description: '' })).toBe('Prélèvement');
  });
  test('la fin d\'abo ne recule JAMAIS (événement rejoué ou tardif)', () => {
    expect(finApresPrelevement('2026-10-07', '2026-11-07')).toBe('2026-11-07');
    expect(finApresPrelevement('2026-11-07', '2026-10-07')).toBe('2026-11-07');
    expect(finApresPrelevement(null, '2026-10-07')).toBe('2026-10-07');
    expect(finApresPrelevement('2026-10-07', null)).toBe('2026-10-07');
    expect(finApresPrelevement(null, 'bidule')).toBeNull();
  });
});

test.describe('politique 2 — résiliation', () => {
  test('la fin de période se lit sur les deux formes de l\'objet subscription', () => {
    expect(finPeriodeSubscription({ current_period_end: T })).toBe('2025-09-07');
    expect(finPeriodeSubscription({ items: { data: [{ current_period_end: T + 86400 }] } })).toBe('2025-09-08');
    expect(finPeriodeSubscription({ ended_at: T })).toBe('2025-09-07');
    expect(finPeriodeSubscription({})).toBeNull();
  });
  test('la période payée reste acquise : actif jusqu\'à sa fin, expiré si elle est passée', () => {
    expect(statutApresResiliation('2026-10-07', '2026-09-07')).toBe('actif');
    expect(statutApresResiliation('2026-09-07', '2026-09-07')).toBe('actif');
    expect(statutApresResiliation('2026-09-01', '2026-09-07')).toBe('expire');
    expect(statutApresResiliation(null, '2026-09-07')).toBe('expire');
  });
});

test.describe('événements à cocher sur Stripe', () => {
  test('la liste affichée à la prof contient les cinq événements lus par le webhook', () => {
    expect(EVENEMENTS_WEBHOOK).toEqual(expect.arrayContaining([
      'checkout.session.completed', 'invoice.paid', 'invoice.payment_failed', 'customer.subscription.deleted', 'charge.refunded',
    ]));
  });
});
