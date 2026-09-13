// ═══════════════════════════════════════════════════════════════════════════
// Verrou CI — l'argent de l'écosystème (lot 2 Associations & Studios, v112,
// 2026-09-13) : rémunération et relevé, dépenses et exercice, prestations et
// facture v2.
//
// Ce qu'on ne laisse pas glisser :
//   1. Le relevé ne compte que les présences POINTÉES présentes, jamais une
//      annulation tardive ni une ligne d'information ; le CA n'est jamais
//      inventé (abonnement sans prix par séance = plancher annoncé).
//   2. Les quatre modes de rémunération donnent le montant attendu, et une
//      rémunération absurde (pourcentage > 100, montant négatif) est jetée.
//   3. Une dépense sans montant, sans date ou avec une TVA hors bornes est
//      REFUSÉE ; les textes sont tronqués, jamais rejetés.
//   4. L'exercice d'une association suit la saison (septembre → août),
//      celui d'un studio l'année civile ; un id d'exercice se relit.
//   5. Le snapshot de la facture v2 porte `a_regler`, l'émetteur est
//      l'intervenante, le « client » est la structure, une seule ligne.
//   6. La migration v112 dit la même chose que le code (relecture).
// ═══════════════════════════════════════════════════════════════════════════
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import {
  MODES_REMUNERATION, CODES_REMUNERATION, sanitizeRemuneration, labelRemuneration,
  bornesMois, labelMois, moisPrecedent, derniersMois, presenceComptee, caPresence, calculerReleve, resumeReleve, euros,
} from '../../lib/remuneration.js';
import {
  CATEGORIES_DEPENSE, sanitizeDepense, tvaDe, totauxDepenses, exerciceDe, exerciceParId, derniersExercices, debutExerciceDefaut,
} from '../../lib/depenses.js';
import {
  STATUTS_PRESTATION, libellePrestation, prestationPourIntervenante, prestationPourStructure,
  construireSnapshotPrestation, emailRelevePret, emailFacturePrestation,
} from '../../lib/prestations.js';
import { CAPACITES, PALIERS } from '../../lib/constantes.js';
import { can } from '../../lib/plan-guard.js';

test.describe('la rémunération convenue', () => {
  test('quatre modes, un libellé lisible', () => {
    expect(CODES_REMUNERATION).toEqual(['par_seance', 'horaire', 'pourcentage_ca', 'forfait_mensuel']);
    expect(labelRemuneration({ mode: 'par_seance', montant: 30 })).toBe('30 € / séance');
    expect(labelRemuneration({ mode: 'pourcentage_ca', montant: 12.5 })).toBe('12,50 % du CA');
    expect(labelRemuneration(null)).toBeNull();
    for (const c of CODES_REMUNERATION) expect(MODES_REMUNERATION[c].aide.length).toBeGreaterThan(10);
  });

  test('sanitize : virgule acceptée, absurde jeté', () => {
    expect(sanitizeRemuneration({ mode: 'horaire', montant: '25,5' })).toEqual({ mode: 'horaire', montant: 25.5 });
    expect(sanitizeRemuneration({ mode: 'pourcentage_ca', montant: 150 })).toBeNull();
    expect(sanitizeRemuneration({ mode: 'par_seance', montant: -3 })).toBeNull();
    expect(sanitizeRemuneration({ mode: 'inconnu', montant: 10 })).toBeNull();
    expect(sanitizeRemuneration({ mode: 'forfait_mensuel', montant: 'abc' })).toBeNull();
    expect(sanitizeRemuneration(undefined)).toBeNull();
  });
});

test.describe('le mois', () => {
  test('bornes, libellé, précédent, derniers', () => {
    expect(bornesMois('2026-02')).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(bornesMois('2028-02').to).toBe('2028-02-29');
    expect(bornesMois('2026-13')).toBeNull();
    expect(labelMois('2026-09')).toBe('septembre 2026');
    expect(moisPrecedent('2026-01')).toBe('2025-12');
    expect(derniersMois(3, new Date('2026-09-13T10:00:00Z'))).toEqual(['2026-09', '2026-08', '2026-07']);
  });
});

test.describe('le relevé', () => {
  const abos = new Map([['abo10', { prix: 120, seances_total: 10 }], ['illim', { prix: 55, seances_total: null }]]);
  const seances = [
    { id: 's1', nom: 'Hatha', date: '2026-09-02', heure: '18:00', duree_minutes: 60, presences: [
      { statut_pointage: 'present', abonnement_id: 'abo10' },
      { statut_pointage: 'present', paiement_montant: 15 },
      { statut_pointage: 'absent', abonnement_id: 'abo10' },
      { statut_pointage: 'present', annulation_tardive: true },
      { statut_pointage: 'present', abonnement_id: 'illim' },
    ] },
    { id: 's2', nom: 'Yin', date: '2026-09-09', heure: '19:00', duree_minutes: 90, presences: [{ pointee: true }] },
    { id: 's3', nom: 'Annulée', date: '2026-09-16', est_annule: true, presences: [{ statut_pointage: 'present' }] },
  ];

  test('présence comptée : présente pointée, jamais tardive ni absente', () => {
    expect(presenceComptee({ statut_pointage: 'present' })).toBe(true);
    expect(presenceComptee({ pointee: true })).toBe(true);
    expect(presenceComptee({ statut_pointage: 'absent' })).toBe(false);
    expect(presenceComptee({ statut_pointage: 'present', annulation_tardive: true })).toBe(false);
    expect(presenceComptee({ statut_pointage: 'inscrit' })).toBe(false);
  });

  test('CA par présence : à l\'unité, prorata carnet, inconnu jamais deviné', () => {
    expect(caPresence({ paiement_montant: 15 }, abos)).toEqual({ montant: 15, source: 'seance' });
    expect(caPresence({ abonnement_id: 'abo10' }, abos)).toEqual({ montant: 12, source: 'carnet' });
    expect(caPresence({ abonnement_id: 'illim' }, abos)).toEqual({ montant: 0, source: 'inconnu' });
    expect(caPresence({}, abos)).toEqual({ montant: 0, source: 'aucune' });
  });

  test('calcul : séances, heures, présentes, CA, montant dû par mode', () => {
    const r = calculerReleve(seances, abos, { mode: 'par_seance', montant: 30 });
    expect(r.nb_seances).toBe(2);
    expect(r.heures).toBe(2.5);
    expect(r.nb_presentes).toBe(4);
    expect(r.ca).toBe(27);
    expect(r.ca_inconnu).toBe(1);
    expect(r.montant_du).toBe(60);
    expect(r.lignes.map(l => l.id)).toEqual(['s1', 's2']);
    expect(calculerReleve(seances, abos, { mode: 'horaire', montant: 20 }).montant_du).toBe(50);
    expect(calculerReleve(seances, abos, { mode: 'pourcentage_ca', montant: 50 }).montant_du).toBe(13.5);
    expect(calculerReleve(seances, abos, { mode: 'forfait_mensuel', montant: 400 }).montant_du).toBe(400);
    expect(calculerReleve([], abos, { mode: 'forfait_mensuel', montant: 400 }).montant_du).toBe(0);
    expect(calculerReleve(seances, abos, null).montant_du).toBeNull();
    expect(resumeReleve(r)).toBe('2 séances · 2,5 h · 4 présentes · 60 € dû');
    expect(euros(12.5)).toBe('12,50 €');
  });
});

test.describe('les dépenses', () => {
  test('sanitize : refus explicites, troncature des textes', () => {
    expect(sanitizeDepense({ libelle: '', date: '2026-09-01', montant_ttc: 10 }).ok).toBe(false);
    expect(sanitizeDepense({ libelle: 'Salle', date: 'hier', montant_ttc: 10 }).ok).toBe(false);
    expect(sanitizeDepense({ libelle: 'Salle', date: '2026-09-01', montant_ttc: '' }).ok).toBe(false);
    expect(sanitizeDepense({ libelle: 'Salle', date: '2026-09-01', montant_ttc: 10, tva_taux: 120 }).ok).toBe(false);
    const ok = sanitizeDepense({ libelle: ' Loyer   salle '.padEnd(200, 'x'), date: '2026-09-01', montant_ttc: '120,50', categorie: 'salle', statut: 'a_regler', justificatif_url: 'http://pas-https', fournisseur: 'Mairie' });
    expect(ok.ok).toBe(true);
    expect(ok.depense.libelle.length).toBeLessThanOrEqual(160);
    expect(ok.depense.montant_ttc).toBe(120.5);
    expect(ok.depense.statut).toBe('a_regler');
    expect(ok.depense.date_reglement).toBeNull();
    expect(ok.depense.justificatif_url).toBeNull();
    const reglee = sanitizeDepense({ libelle: 'Tapis', date: '2026-09-01', montant_ttc: 40, categorie: 'materiel', statut: 'reglee', mode_reglement: 'cb' });
    expect(reglee.depense.date_reglement).toBe('2026-09-01');
    expect(reglee.depense.mode_reglement).toBe('cb');
    expect(sanitizeDepense({ libelle: 'X', date: '2026-09-01', montant_ttc: 1, categorie: 'inventee' }).depense.categorie).toBe('autre');
    expect(Object.keys(CATEGORIES_DEPENSE)).toContain('intervenante');
  });

  test('TVA et totaux', () => {
    expect(tvaDe({ montant_ttc: 120, montant_ht: 100 })).toBe(20);
    expect(tvaDe({ montant_ttc: 120, tva_taux: 20 })).toBe(20);
    expect(tvaDe({ montant_ttc: 120 })).toBeNull();
    const t = totauxDepenses([{ montant_ttc: 120, montant_ht: 100, categorie: 'salle', statut: 'reglee' }, { montant_ttc: 30, categorie: 'intervenante', statut: 'a_regler' }, { montant_ttc: 5, categorie: '??', statut: 'reglee' }]);
    expect(t).toEqual({ ttc: 155, reglees: 125, a_regler: 30, tva: 20, parCategorie: { salle: 120, intervenante: 30, autre: 5 } });
  });

  test('exercice : saison pour une association, année civile pour un studio', () => {
    expect(debutExerciceDefaut('association')).toBe(9);
    expect(debutExerciceDefaut('studio')).toBe(1);
    expect(exerciceDe('2026-09-13', 9)).toMatchObject({ id: '2026-2027', from: '2026-09-01', to: '2027-08-31' });
    expect(exerciceDe('2026-03-13', 9)).toMatchObject({ id: '2025-2026', from: '2025-09-01', to: '2026-08-31' });
    expect(exerciceDe('2026-03-13', 1)).toMatchObject({ id: '2026', from: '2026-01-01', to: '2026-12-31' });
    expect(exerciceParId('2025-2026', 9)).toMatchObject({ id: '2025-2026' });
    expect(exerciceParId('2026', 9)).toMatchObject({ id: '2026', from: '2026-01-01' });
    expect(exerciceParId('2025-2027', 9)).toBeNull();
    expect(derniersExercices(3, 9, new Date('2026-09-13T10:00:00Z')).map(e => e.id)).toEqual(['2026-2027', '2025-2026', '2024-2025']);
  });
});

test.describe('les prestations et la facture v2', () => {
  test('statuts et libellé', () => {
    expect(Object.keys(STATUTS_PRESTATION)).toEqual(['emise', 'facturee', 'reglee', 'annulee']);
    expect(libellePrestation('Asso Yoga', '2026-09')).toBe('Prestation · Asso Yoga · septembre 2026');
  });

  test('deux vues : l\'intervenante ne voit jamais la dépense, la structure jamais le paiement chez elle', () => {
    const p = { id: 'p', profile_id: 's', membre_id: 'm', periode: '2026-09', montant: 60, statut: 'emise', depense_id: 'd', facture_id: null, paiement_id: 'pay', created_at: 'x' };
    const vi = prestationPourIntervenante(p, { studio_nom: 'Asso' });
    expect(vi.structure_nom).toBe('Asso');
    expect(vi).not.toHaveProperty('depense_id');
    const vs = prestationPourStructure(p, { label: 'Léa', auth_user_id: 'u' });
    expect(vs.membre_label).toBe('Léa');
    expect(vs.membre_a_un_compte).toBe(true);
    expect(vs).not.toHaveProperty('paiement_id');
  });

  test('snapshot : a_regler, émetteur = intervenante, client = structure, une ligne, total', () => {
    const s = construireSnapshotPrestation({
      profile: { studio_nom: 'Léa Yoga', adresse: '1 rue', ville: 'Lyon' },
      facturation: { facturation_raison_sociale: 'Léa Martin EI', facturation_siret: '12345678901234', pays: 'FR' },
      structure: { studio_nom: 'Asso Yoga', rna: 'W751234567', ville: 'Lyon' },
      prestation: { periode: '2026-09', montant: 60, releve: { nb_seances: 2, heures: 2.5, remuneration: { mode: 'par_seance', montant: 30 } } },
    });
    expect(s.a_regler).toBe(true);
    expect(s.emetteur.nom).toBe('Léa Martin EI');
    expect(s.client.nom).toBe('Asso Yoga');
    expect(s.client.rna).toBe('W751234567');
    expect(s.lignes).toHaveLength(1);
    expect(s.lignes[0].intitule).toContain('septembre 2026');
    expect(s.lignes[0].periode).toBe('2026-09');
    expect(s.total).toBe(60);
    expect(s.mention_tva).toContain('293 B');
  });

  test('les emails ne promettent rien de faux', () => {
    const e1 = emailRelevePret({ prenom: 'Léa', nomStructure: 'Asso', periode: '2026-09', montant: 60, aUnCompte: false });
    expect(e1.subject).toContain('septembre 2026');
    expect(e1.html).toContain('gratuit');
    expect(e1.html).not.toContain('Mes prestations');
    const e2 = emailRelevePret({ prenom: 'Léa', nomStructure: 'Asso', periode: '2026-09', montant: 60, aUnCompte: true, lien: 'https://x/revenus' });
    expect(e2.html).toContain('Mes prestations');
    const e3 = emailFacturePrestation({ nomIntervenante: 'Léa', nomStructure: 'Asso', periode: '2026-09', montant: 60, numero: 'FAC-2026-0003' });
    expect(e3.subject).toBe('Facture FAC-2026-0003 · Léa · septembre 2026');
    expect(e3.html).toContain('60 €');
  });
});

test.describe('le gating', () => {
  test('depenses = palier équipe (Association et Studio), jamais Complet ni Essentiel', () => {
    expect(CAPACITES.depenses).toBe('equipe');
    expect(PALIERS.equipe).toEqual(['asso', 'studio']);
    expect(can({ plan: 'asso', stripe_subscription_status: 'active' }, 'depenses')).toBe(true);
    expect(can({ plan: 'studio' }, 'depenses')).toBe(true);
    expect(can({ plan: 'pro', stripe_subscription_status: 'active' }, 'depenses')).toBe(false);
    expect(can({ plan: 'solo' }, 'depenses')).toBe(false);
  });
});

test.describe('la migration v112 dit la même chose que le code', () => {
  const sql = readFileSync('migrations-v112-argent-ecosysteme.sql', 'utf8');
  test('rémunération, dépenses, prestations, factures v2, RPC service_role', () => {
    expect(sql).toContain('add column if not exists remuneration jsonb');
    expect(sql).toContain('create table if not exists public.depenses');
    expect(sql).toContain('create table if not exists public.prestations');
    expect(sql).toContain("check (statut in ('emise', 'facturee', 'reglee', 'annulee'))");
    expect(sql).toContain("check (type in ('acquittee', 'a_regler'))");
    expect(sql).toContain("check (statut in ('emise', 'payee', 'annulee'))");
    expect(sql).toContain('emettre_facture_prestation');
    expect(sql).toContain('regler_prestation');
    expect(sql).toContain("mes_studios_staff('argent_voir')");
    expect(sql).toContain("mes_studios_staff('argent_gerer')");
    expect(sql).toMatch(/revoke execute on function public\.regler_prestation[^;]*from public, anon, authenticated/);
    expect(sql).not.toMatch(/to anon/);
  });
});
