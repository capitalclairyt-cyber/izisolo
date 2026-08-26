// ============================================================================
// Verrou CI — « le paiement en ligne est-il vraiment branché ? »
// ----------------------------------------------------------------------------
// Né du retour Manon / Soleya (2026-08-26) : une élève paie via un Payment
// Link collé sur une offre, l'argent part sur le Stripe de la prof, et IziSolo
// n'en sait rien parce que le webhook n'a jamais été déclaré. Ces tests figent
// la règle qui l'empêche, et surtout le contrat de sécurité : le secret ne
// sort jamais, et un lien qu'on ne doit pas afficher ne part pas au navigateur.
//
// Aucun navigateur, aucun serveur : fonctions pures.
// ============================================================================
import { test, expect } from '@playwright/test';
import {
  webhookConfigure,
  lienPaiementOffre,
  lienPaiementSeance,
  masquerLiensSiNonBranche,
  offresEnAttenteDeWebhook,
  dateSessionStripe,
} from '../../lib/paiement-en-ligne.js';

const LIEN = 'https://buy.stripe.com/4gMcMYcXL17Bdfs9Sofw403';
const BRANCHE = { stripe_webhook_secret: 'whsec_abc123' };
const PAS_BRANCHE = { stripe_webhook_secret: null };

test.describe('webhookConfigure', () => {
  test('un secret renseigné = branché', () => {
    expect(webhookConfigure(BRANCHE)).toBe(true);
  });

  test('null, vide, espaces, profil absent = PAS branché', () => {
    expect(webhookConfigure(PAS_BRANCHE)).toBe(false);
    expect(webhookConfigure({ stripe_webhook_secret: '' })).toBe(false);
    expect(webhookConfigure({ stripe_webhook_secret: '   ' })).toBe(false);
    expect(webhookConfigure({})).toBe(false);
    expect(webhookConfigure(null)).toBe(false);
    expect(webhookConfigure(undefined)).toBe(false);
  });
});

test.describe('lienPaiementOffre — le cas exact de Soleya', () => {
  test('lien collé + webhook configuré → le lien est servi', () => {
    expect(lienPaiementOffre({ stripe_payment_link: LIEN }, BRANCHE)).toBe(LIEN);
  });

  test('lien collé SANS webhook → null (l\'élève verra « Demander »)', () => {
    expect(lienPaiementOffre({ stripe_payment_link: LIEN }, PAS_BRANCHE)).toBeNull();
  });

  test('pas de lien, même branché → null', () => {
    expect(lienPaiementOffre({ stripe_payment_link: null }, BRANCHE)).toBeNull();
    expect(lienPaiementOffre({ stripe_payment_link: '  ' }, BRANCHE)).toBeNull();
    expect(lienPaiementOffre({}, BRANCHE)).toBeNull();
  });
});

test.describe('lienPaiementSeance — même règle pour le paiement à la séance (v86 v2)', () => {
  test('branché → servi ; pas branché → null', () => {
    expect(lienPaiementSeance({ stripe_payment_link_unit: LIEN }, BRANCHE)).toBe(LIEN);
    expect(lienPaiementSeance({ stripe_payment_link_unit: LIEN }, PAS_BRANCHE)).toBeNull();
  });
});

test.describe('masquerLiensSiNonBranche — le contrat de sécurité', () => {
  const offres = [
    { id: 'a', nom: 'Carte 10', prix: 150, stripe_payment_link: LIEN },
    { id: 'b', nom: 'Abo', prix: 55, stripe_payment_link: null },
  ];

  test('sans webhook, AUCUNE URL de paiement ne part au navigateur', () => {
    const sorties = masquerLiensSiNonBranche(offres, PAS_BRANCHE);
    expect(sorties.every(o => o.stripe_payment_link === null)).toBe(true);
    expect(JSON.stringify(sorties)).not.toContain('buy.stripe.com');
  });

  test('le reste de l\'offre est intact (nom, prix, id)', () => {
    const [a] = masquerLiensSiNonBranche(offres, PAS_BRANCHE);
    expect(a.id).toBe('a');
    expect(a.nom).toBe('Carte 10');
    expect(a.prix).toBe(150);
  });

  test('avec webhook, les liens passent tels quels', () => {
    expect(masquerLiensSiNonBranche(offres, BRANCHE)[0].stripe_payment_link).toBe(LIEN);
  });

  test('jamais de mutation de l\'entrée', () => {
    const source = [{ id: 'a', stripe_payment_link: LIEN }];
    masquerLiensSiNonBranche(source, PAS_BRANCHE);
    expect(source[0].stripe_payment_link).toBe(LIEN);
  });

  test('liste vide ou absente → tableau vide', () => {
    expect(masquerLiensSiNonBranche([], PAS_BRANCHE)).toEqual([]);
    expect(masquerLiensSiNonBranche(null, PAS_BRANCHE)).toEqual([]);
  });
});

test.describe('offresEnAttenteDeWebhook — ce qu\'on DIT à la prof', () => {
  test('liste les offres qui promettent un paiement inencaissable', () => {
    const res = offresEnAttenteDeWebhook([
      { nom: 'Carte 5', stripe_payment_link: LIEN },
      { nom: 'Carte 10', stripe_payment_link: LIEN },
      { nom: 'Abo', stripe_payment_link: null },
    ], PAS_BRANCHE);
    expect(res.map(o => o.nom)).toEqual(['Carte 5', 'Carte 10']);
  });

  test('webhook configuré → plus rien à signaler', () => {
    expect(offresEnAttenteDeWebhook([{ stripe_payment_link: LIEN }], BRANCHE)).toEqual([]);
  });

  test('aucun lien collé → rien à signaler (on n\'alarme pas pour rien)', () => {
    expect(offresEnAttenteDeWebhook([{ stripe_payment_link: null }], PAS_BRANCHE)).toEqual([]);
  });
});

test.describe('dateSessionStripe — la date comptable est celle de la session', () => {
  test('un événement REJOUÉ garde la date du paiement, pas celle du rejeu', () => {
    // 2026-08-25 10:00:00 UTC
    const session = { created: Math.floor(Date.UTC(2026, 7, 25, 10, 0, 0) / 1000) };
    expect(dateSessionStripe(session, '2026-09-30')).toBe('2026-08-25');
  });

  test('sans created exploitable, on retombe sur le jour du traitement', () => {
    expect(dateSessionStripe({}, '2026-09-30')).toBe('2026-09-30');
    expect(dateSessionStripe({ created: null }, '2026-09-30')).toBe('2026-09-30');
    expect(dateSessionStripe({ created: 0 }, '2026-09-30')).toBe('2026-09-30');
    expect(dateSessionStripe({ created: 'hier' }, '2026-09-30')).toBe('2026-09-30');
    expect(dateSessionStripe(null, '2026-09-30')).toBe('2026-09-30');
  });
});
