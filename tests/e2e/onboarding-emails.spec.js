/**
 * Emails d'onboarding J+1 / J+3 (lib/onboarding-emails) — verrou des fenêtres
 * et des rendus. Règles gravées (2026-08-01) :
 *   • J+1 = [1 j, 3 j) ET aucun cours ; J+3 = [3 j, 7 j) ET aucun élève ;
 *   • fenêtres SANS chevauchement, rien avant 1 j ni après 7 j (pas de
 *     backfill des anciens comptes au déploiement) ;
 *   • le geste déjà fait tue l'email (cours créés → pas de J+1 ; élèves
 *     présents → pas de J+3) — on ne relance jamais pour rien.
 *
 * Test Node pur (aucun navigateur) : on importe les fonctions directement.
 */
import { test, expect } from '@playwright/test';
import { choisirEmailOnboarding, renderEmailOnboarding } from '../../lib/onboarding-emails.js';

const NOW = new Date('2026-08-01T03:00:00Z'); // l'heure du cron
const ilYa = (jours) => new Date(NOW.getTime() - jours * 24 * 3600 * 1000).toISOString();

test.describe('choisirEmailOnboarding — fenêtres', () => {
  const cas = [
    // [ageJours, nbCours, nbClients, attendu, label]
    [0.5, 0, 0, null, 'trop tôt (J+0,5)'],
    [1.0, 0, 0, 'j1', 'entrée de fenêtre J+1'],
    [2.9, 0, 0, 'j1', 'fin de fenêtre J+1'],
    [3.0, 0, 0, 'j3', 'entrée de fenêtre J+3 (pas de chevauchement)'],
    [6.9, 0, 0, 'j3', 'fin de fenêtre J+3'],
    [7.0, 0, 0, null, 'trop tard (pas de backfill)'],
    [30, 0, 0, null, 'compte ancien jamais relancé'],
    [2.0, 3, 0, null, 'J+1 tué : des cours existent déjà'],
    [2.0, 3, 5, null, 'J+1 tué par les cours, et pas de J+3 hors fenêtre'],
    [4.0, 0, 8, null, 'J+3 tué : des élèves existent déjà'],
    [4.0, 5, 0, 'j3', 'J+3 envoyé même si des cours existent (critère = élèves)'],
    [1.5, 0, 2, 'j1', 'J+1 envoyé même si des élèves existent (critère = cours)'],
  ];
  for (const [age, nbCours, nbClients, attendu, label] of cas) {
    test(`J+${age} · ${nbCours} cours · ${nbClients} élèves → ${attendu ?? 'rien'} (${label})`, () => {
      expect(choisirEmailOnboarding(
        { createdAt: ilYa(age), nbCours, nbClients },
        NOW
      )).toBe(attendu);
    });
  }

  test('date de création imparsable → null (fail-open, jamais de crash)', () => {
    expect(choisirEmailOnboarding({ createdAt: 'n/a', nbCours: 0, nbClients: 0 }, NOW)).toBe(null);
  });
});

test.describe('renderEmailOnboarding — rendus', () => {
  test('J+1 : sujet récurrence, CTA création de cours, lien guide, Bonjour', () => {
    const { subject, html } = renderEmailOnboarding('j1', { prenom: 'Maude', appUrl: 'https://www.izisolo.fr' });
    expect(subject).toContain('cours récurrent');
    expect(html).toContain('https://www.izisolo.fr/cours/nouveau');
    expect(html).toContain('https://www.izisolo.fr/aide#premier-cours');
    expect(html).toContain('Bonjour Maude,');
    expect(html).not.toMatch(/Salut|Coucou/); // retour Maude — jamais
  });

  test('J+3 : sujet élèves, CTA import CSV, lien guide, Bonjour sans prénom propre', () => {
    const { subject, html } = renderEmailOnboarding('j3', { prenom: '', appUrl: 'https://www.izisolo.fr' });
    expect(subject).toContain('élèves');
    expect(html).toContain('https://www.izisolo.fr/clients/importer');
    expect(html).toContain('https://www.izisolo.fr/aide#eleves');
    expect(html).toContain('Bonjour,'); // pas de « Bonjour  , » avec espace orphelin
    expect(html).not.toMatch(/Salut|Coucou/);
  });
});
