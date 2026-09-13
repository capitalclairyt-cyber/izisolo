// ═══════════════════════════════════════════════════════════════════════════
// Verrou CI — la vie de l'association (lot 3 Associations & Studios, v113,
// 2026-09-13) : le bureau, l'adhésion, les documents, l'assemblée générale.
//
// Ce qu'on ne laisse pas glisser :
//   1. Une fonction du bureau est une ÉTIQUETTE qui propose un préréglage :
//      jamais une permission hors matrice, jamais un troisième système.
//   2. Une adhésion couvre une saison (septembre → août), ne donne droit à
//      aucune séance, et « payée » exige un mode de règlement.
//   3. Les adhérentes à jour se comptent à une DATE (quorum au jour de l'AG).
//   4. Un document sans fichier est refusé ; une version courante par type.
//   5. Une AG sans date est refusée ; la convocation dit la date, le lieu,
//      l'ordre du jour et le pouvoir ; le délai est rappelé, jamais imposé.
//   6. La migration v113 dit la même chose que le code (relecture).
// ═══════════════════════════════════════════════════════════════════════════
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import {
  FONCTIONS, CODES_FONCTION, FONCTIONS_BUREAU, sanitizeFonction, labelFonction, presetPourFonction,
  saisonDe, saisonsProposees, adhesionAJour, adherentesAJour, sanitizeVenteAdhesion, libelleAdhesion,
  TYPES_DOCUMENT, TYPES_A_VERSION, sanitizeDocument, classerDocuments,
  TYPES_AG, sanitizeAssemblee, DELAI_CONVOCATION_JOURS, joursAvant, texteConvocation, quorum,
} from '../../lib/vie-asso.js';
import { CLES_PERMISSIONS, PERMISSIONS, PRESETS, peut } from '../../lib/studio-membre.js';
import { CAPACITES, PALIERS } from '../../lib/constantes.js';
import { can } from '../../lib/plan-guard.js';

test.describe('le bureau : des fonctions, pas des droits', () => {
  test('six fonctions, quatre du bureau, une étiquette et une aide chacune', () => {
    expect(CODES_FONCTION).toEqual(['presidente', 'tresoriere', 'secretaire', 'membre_bureau', 'prof', 'benevole']);
    expect(FONCTIONS_BUREAU).toEqual(['presidente', 'tresoriere', 'secretaire', 'membre_bureau']);
    for (const c of CODES_FONCTION) { expect(FONCTIONS[c].label.length).toBeGreaterThan(2); expect(FONCTIONS[c].aide.length).toBeGreaterThan(10); }
    expect(sanitizeFonction('presidente')).toBe('presidente');
    expect(sanitizeFonction('roi')).toBeNull();
    expect(labelFonction('tresoriere')).toBe('Trésorière');
  });

  test('chaque préréglage ne contient que des permissions de la matrice', () => {
    for (const c of CODES_FONCTION) {
      const p = presetPourFonction(c);
      expect(['admin', 'prof']).toContain(p.role);
      for (const k of Object.keys(p.permissions)) expect(CLES_PERMISSIONS).toContain(k);
    }
    expect(presetPourFonction('presidente')).toEqual({ role: 'admin', permissions: PRESETS.admin });
    expect(presetPourFonction('prof')).toEqual({ role: 'prof', permissions: PRESETS.prof });
    const t = presetPourFonction('tresoriere');
    expect(t.permissions).toEqual({ argent_voir: true, argent_gerer: true, eleves_voir: true });
    expect(peut({ statut: 'actif', role: 'prof', permissions: t.permissions }, 'messagerie')).toBe(false);
    const s = presetPourFonction('secretaire');
    expect(s.permissions.documents).toBe(true);
    expect(s.permissions.argent_voir).toBeUndefined();
    expect(presetPourFonction('benevole').permissions).toEqual({ pointer: true });
    expect(presetPourFonction('inconnue')).toEqual(presetPourFonction('prof'));
  });

  test('la permission « documents » existe dans la matrice, avec son libellé', () => {
    expect(CLES_PERMISSIONS).toContain('documents');
    expect(PERMISSIONS.find(p => p.cle === 'documents').label).toContain('documents');
    expect(PRESETS.admin.documents).toBe(true);
    expect(PRESETS.prof.documents).toBeUndefined();
  });
});

test.describe('l\'adhésion', () => {
  test('la saison va de septembre à août', () => {
    expect(saisonDe('2026-09-13')).toMatchObject({ id: '2026-2027', from: '2026-09-01', to: '2027-08-31' });
    expect(saisonDe('2027-06-01')).toMatchObject({ id: '2026-2027' });
    expect(saisonsProposees('2026-06-15').map(s => s.id)).toEqual(['2025-2026', '2026-2027']);
  });

  test('à jour = active et couvrant la date ; le tri par date', () => {
    const a = { client_id: 'c1', statut: 'active', date_debut: '2026-09-01', date_fin: '2027-08-31' };
    expect(adhesionAJour(a, '2026-10-01')).toBe(true);
    expect(adhesionAJour(a, '2027-09-01')).toBe(false);
    expect(adhesionAJour({ ...a, statut: 'annulee' }, '2026-10-01')).toBe(false);
    const map = adherentesAJour([a, { ...a, client_id: 'c2', date_fin: '2026-09-30' }], '2026-10-15');
    expect([...map.keys()]).toEqual(['c1']);
  });

  test('vente : saison valide, montant, « payée » exige un mode', () => {
    expect(sanitizeVenteAdhesion({ saison: '2026-2028', montant: 20 }, '2026-09-13').ok).toBe(false);
    expect(sanitizeVenteAdhesion({ saison: '2026-2027', montant: -1 }, '2026-09-13').ok).toBe(false);
    expect(sanitizeVenteAdhesion({ saison: '2026-2027', montant: 20, paye: true }, '2026-09-13').ok).toBe(false);
    const v = sanitizeVenteAdhesion({ saison: '2026-2027', montant: '20,5', paye: true, mode: 'cheque' }, '2026-09-13');
    expect(v.ok).toBe(true);
    expect(v.vente).toMatchObject({ saison: '2026-2027', date_debut: '2026-09-01', date_fin: '2027-08-31', montant: 20.5, paye: true, mode: 'cheque', date: '2026-09-13' });
    const later = sanitizeVenteAdhesion({ saison: '2026-2027', montant: 20, paye: false, mode: 'cheque' }, '2026-09-13');
    expect(later.vente.mode).toBeNull();
    expect(libelleAdhesion('Adhésion plein tarif', '2026-2027')).toBe('Adhésion plein tarif · saison 2026-2027');
  });
});

test.describe('les documents', () => {
  test('types, version courante par type, refus sans fichier', () => {
    expect(Object.keys(TYPES_DOCUMENT)).toContain('pv_ag');
    expect(TYPES_A_VERSION).not.toContain('pv_ag');
    expect(sanitizeDocument({ type: 'statuts', url: 'ftp://x' }).ok).toBe(false);
    const d = sanitizeDocument({ type: 'inconnu', titre: '  Mon  doc ', url: 'https://blob/x.pdf', date_document: '2026-01-10' });
    expect(d.ok).toBe(true);
    expect(d.document).toMatchObject({ type: 'autre', titre: 'Mon doc', date_document: '2026-01-10' });
    expect(sanitizeDocument({ type: 'statuts', url: 'https://blob/s.pdf' }).document.titre).toBe('Statuts');
    const { courants, historique } = classerDocuments([
      { id: 1, type: 'statuts', date_document: '2024-01-01' },
      { id: 2, type: 'statuts', date_document: '2026-01-01' },
      { id: 3, type: 'pv_ag', date_document: '2025-06-01' },
    ]);
    expect(courants.statuts.id).toBe(2);
    expect(historique.map(h => h.id)).toEqual([3, 1]);
  });
});

test.describe('l\'assemblée générale', () => {
  test('sanitize, types, délai rappelé', () => {
    expect(sanitizeAssemblee({ date: '' }).ok).toBe(false);
    const a = sanitizeAssemblee({ type: 'extraordinaire', date: '2026-10-15', heure: '19:30:00', lieu: ' Salle des fêtes ', ordre_du_jour: 'Rapport moral\nRapport financier' });
    expect(a.ok).toBe(true);
    expect(a.assemblee).toMatchObject({ type: 'extraordinaire', titre: TYPES_AG.extraordinaire, heure: '19:30', lieu: 'Salle des fêtes' });
    expect(DELAI_CONVOCATION_JOURS).toBe(15);
    expect(joursAvant('2026-10-15', '2026-10-01')).toBe(14);
  });

  test('la convocation dit tout, et propose le pouvoir', () => {
    const t = texteConvocation({ nomAsso: 'Yoga pour tous', assemblee: { type: 'ordinaire', date: '2026-10-15', heure: '19:30', lieu: 'Salle des fêtes', ordre_du_jour: 'Rapport moral' } });
    expect(t).toContain('Yoga pour tous');
    expect(t).toContain('15 octobre 2026');
    expect(t).toContain('19:30');
    expect(t).toContain('Salle des fêtes');
    expect(t).toContain('Rapport moral');
    expect(t).toContain('pouvoir');
    expect(t).not.toContain('\n\n\n');
  });

  test('le quorum compte, il ne tranche pas', () => {
    expect(quorum({ adherentesAJourAuJour: 40, presentes: 15, pouvoirs: 5 })).toEqual({ total: 40, representees: 20, pourcentage: 50 });
    expect(quorum({ adherentesAJourAuJour: 0 })).toEqual({ total: 0, representees: 0, pourcentage: 0 });
  });
});

test.describe('le gating', () => {
  test('vie_asso = Association seulement', () => {
    expect(CAPACITES.vie_asso).toBe('asso');
    expect(PALIERS.asso).toEqual(['asso']);
    expect(can({ plan: 'asso', stripe_subscription_status: 'active' }, 'vie_asso')).toBe(true);
    expect(can({ plan: 'studio', stripe_subscription_status: 'active' }, 'vie_asso')).toBe(false);
    expect(can({ plan: 'solo', type_structure: 'association', trial_started_at: new Date().toISOString() }, 'vie_asso')).toBe(true);
  });
});

test.describe('la migration v113 dit la même chose que le code', () => {
  const sql = readFileSync('migrations-v113-vie-asso.sql', 'utf8');
  test('fonction, offres.type adhesion, adhesions, documents, assemblees, RLS', () => {
    for (const f of CODES_FONCTION) expect(sql).toContain(`'${f}'`);
    expect(sql).toContain("check (type in ('carnet', 'abonnement', 'cours_unique', 'adhesion'))");
    expect(sql).toContain('create table if not exists public.adhesions');
    expect(sql).toContain('unique (client_id, saison)');
    expect(sql).toContain('create table if not exists public.documents_structure');
    for (const t of Object.keys(TYPES_DOCUMENT)) expect(sql).toContain(`'${t}'`);
    expect(sql).toContain('create table if not exists public.assemblees');
    expect(sql).toContain("mes_studios_staff('documents')");
    expect(sql).toContain('mes_client_ids()');
    expect(sql).not.toMatch(/to anon/);
  });
});
