// ═══════════════════════════════════════════════════════════════════════════
// Verrou CI — rétablir une séance annulée (2026-09-09, retour Maude : deux
// séances de séries annulées qu'elle voulait remettre, sans y parvenir).
// Spec Node pur (zéro navigateur, zéro serveur) : fige lib/retablir-seance.js,
// qui décide QUI peut être rétabli, QUI est prévenu, et ce qu'on promet.
//
// Règle de fond : rétablir = la MÊME séance redevient normale, sans doublon,
// sans re-décompter un carnet (l'annulation a déjà rendu ce qui devait l'être,
// le pointage fera le reste).
// ═══════════════════════════════════════════════════════════════════════════
import { test, expect } from '@playwright/test';
import { retablissable, planRetablissement, apercuRetablissement, emailRetablissement } from '../../lib/retablir-seance.js';

test.describe('retablissable — qui a le droit', () => {
  test('une séance annulée à venir : oui', () => {
    expect(retablissable({ est_annule: true, date: '2026-09-15', aujourdhui: '2026-09-09' })).toEqual({ ok: true });
  });
  test('le jour même : oui (elle n\'est pas encore passée)', () => {
    expect(retablissable({ est_annule: true, date: '2026-09-09', aujourdhui: '2026-09-09' }).ok).toBe(true);
  });
  test('une séance qui n\'est pas annulée : non, avec la raison', () => {
    const r = retablissable({ est_annule: false, date: '2026-09-15', aujourdhui: '2026-09-09' });
    expect(r.ok).toBe(false);
    expect(r.raison).toMatch(/pas annulée/);
  });
  test('une séance passée : non, et on dit quoi faire', () => {
    const r = retablissable({ est_annule: true, date: '2026-09-01', aujourdhui: '2026-09-09' });
    expect(r.ok).toBe(false);
    expect(r.raison).toMatch(/passée/);
    expect(r.raison).toMatch(/recrée/);
  });
  test('sans date : on ne bloque pas sur une donnée absente', () => {
    expect(retablissable({ est_annule: true, aujourdhui: '2026-09-09' }).ok).toBe(true);
  });
  test('aujourd\'hui par défaut = la date du jour, jamais une exception', () => {
    expect(() => retablissable({ est_annule: true, date: '2099-01-01' })).not.toThrow();
    expect(retablissable({ est_annule: true, date: '2099-01-01' }).ok).toBe(true);
  });
});

const p = (statut, extra = {}) => ({ statut_pointage: statut, annulation_tardive: false, ...extra });

test.describe('planRetablissement — qui est prévenu', () => {
  test('les réservations actives, et elles seules', () => {
    const plan = planRetablissement({ presences: [
      p('inscrit', { id: 'a' }),
      p('inscrit', { id: 'b' }),
      p('annule', { id: 'c' }),      // l'élève avait annulé : ne vient pas
      p('declinee', { id: 'd' }),
      p('inscrit', { id: 'e', annulation_tardive: true }), // annulée tard : ne vient pas
    ] });
    expect(plan.nbInscrites).toBe(2);
    expect(plan.aPrevenir.map(x => x.id)).toEqual(['a', 'b']);
    expect(plan.nbIgnorees).toBe(3);
  });
  test('statut NULL vaut « inscrit » (DEFAULT v5)', () => {
    const plan = planRetablissement({ presences: [{ id: 'x', statut_pointage: null }] });
    expect(plan.nbInscrites).toBe(1);
  });
  test('personne : un plan vide, pas une exception', () => {
    expect(planRetablissement()).toEqual({ nbInscrites: 0, aPrevenir: [], nbIgnorees: 0 });
  });
});

test.describe('apercuRetablissement — ce qu\'on promet', () => {
  test('sans inscrite : aucun email ne part, et on le dit', () => {
    const t = apercuRetablissement(planRetablissement({ presences: [] }));
    expect(t).toMatch(/redevient normale/);
    expect(t).toMatch(/aucun email ne part/);
  });
  test('avec inscrites : elles sont prévenues, les carnets ne bougent pas', () => {
    const t = apercuRetablissement(planRetablissement({ presences: [p('inscrit'), p('inscrit'), p('inscrit')] }));
    expect(t).toContain('3 inscrit·es reçoivent un email');
    expect(t).toMatch(/carnets ne bougent pas/);
    expect(t).toMatch(/pointage/);
  });
  test('une seule inscrite : singulier', () => {
    const t = apercuRetablissement(planRetablissement({ presences: [p('inscrit')] }));
    expect(t).toContain('1 inscrit·e reçoit un email');
  });
  test('plan absent : chaîne utile, pas une exception', () => {
    expect(apercuRetablissement(null)).toMatch(/aucun email/);
  });
  test('jamais de promesse de re-crédit : l\'annulation l\'a déjà fait', () => {
    const t = apercuRetablissement(planRetablissement({ presences: [p('inscrit')] }));
    expect(t).not.toMatch(/recrédit|re-crédit|restitu/i);
  });
});

test.describe('emailRetablissement — le message à l\'élève', () => {
  test('sujet, date, heure, lieu, studio, et la réservation toujours valable', () => {
    const e = emailRetablissement({ coursNom: 'Yin Yoga', dateStr: 'lundi 14 septembre', heureStr: '18h00', lieu: 'Espace Montgontier', studio: 'Maude Yoga' });
    expect(e.sujet).toBe('Séance maintenue — Yin Yoga');
    expect(e.corps).toContain('« Yin Yoga » du lundi 14 septembre à 18h00 a finalement lieu');
    expect(e.corps).toContain('Lieu : Espace Montgontier.');
    expect(e.corps).toContain('Ta réservation est toujours valable');
    expect(e.corps).toContain('{{prenom}}');
    expect(e.corps.trim().endsWith('Maude Yoga')).toBe(true);
    expect(e.sms).toContain('Yin Yoga');
  });
  test('sans lieu ni heure ni studio : rien d\'inventé', () => {
    const e = emailRetablissement({ coursNom: 'Yoga', dateStr: 'mardi 15 septembre' });
    expect(e.corps).not.toContain('Lieu :');
    expect(e.corps).toContain('du mardi 15 septembre a finalement lieu');
    expect(e.corps.trim().endsWith('Ton studio')).toBe(true);
  });
});
