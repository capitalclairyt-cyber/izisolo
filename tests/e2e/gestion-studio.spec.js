// ═══════════════════════════════════════════════════════════════════════════
// Verrou CI — la gestion du studio (lot 4 Associations & Studios, v114,
// 2026-09-13) : les salles et le chevauchement, la marge et l'analyse
// d'exercice, le relevé automatique.
//
// Ce qu'on ne laisse pas glisser :
//   1. Une salle EST un lieu (`salle_de`) : le sélecteur les indente, le
//      libellé nomme le lieu parent, une salle ne se rattache qu'à un lieu.
//   2. Le chevauchement : même salle, même jour, [début, fin[ qui se croisent,
//      jamais une annulée, jamais sans salle ; le miroir JS = le trigger SQL.
//   3. La marge d'une séance ne fabrique jamais un coût : sans rémunération
//      convenue, marge null ; le CA est celui du relevé (paiement de présence
//      ou prorata du carnet, un abonnement sans prix = 0 et « inconnu »).
//   4. L'analyse dit ce qui n'est PAS rattaché à une séance.
//   5. Le relevé automatique : fenêtre de cinq jours, le mois précédent, une
//      référence par (structure, intervenante, mois), jamais un relevé vide.
//   6. La migration v114 dit la même chose que le code (relecture).
// ═══════════════════════════════════════════════════════════════════════════
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import {
  estSalle, sallesDe, lieuxRacine, lieuParent, labelLieu, optionsLieux, sanitizeSalle,
  plageDe, chevauche, chevauchementsPour, texteChevauchement, estRefusChevauchement,
} from '../../lib/salles.js';
import { coutIntervenanteSeance, caSeance, margeSeance, analyserExercice, tvaParTaux } from '../../lib/marge.js';
import { FENETRE_JOURS, moisAEnvoyer, refReleveAuto, releveAEnvoyer, emailReleveAuto } from '../../lib/releve-auto.js';

const LIEUX = [
  { id: 'L1', nom: 'Studio Centre', salle_de: null, ordre: 1 },
  { id: 'S1', nom: 'Salle Zen', salle_de: 'L1', ordre: 1, capacite: 12 },
  { id: 'S2', nom: 'Salle Flow', salle_de: 'L1', ordre: 2, capacite: 20 },
  { id: 'L2', nom: 'Annexe', salle_de: null, ordre: 2 },
];

test.describe('les salles : un lieu qui a des salles', () => {
  test('une salle est un lieu rattaché ; racines, salles, parent, libellé', () => {
    expect(estSalle(LIEUX[1])).toBe(true);
    expect(estSalle(LIEUX[0])).toBe(false);
    expect(lieuxRacine(LIEUX).map(l => l.id)).toEqual(['L1', 'L2']);
    expect(sallesDe(LIEUX, 'L1').map(l => l.id)).toEqual(['S1', 'S2']);
    expect(sallesDe(LIEUX, 'L2')).toEqual([]);
    expect(lieuParent(LIEUX, 'S2')?.id).toBe('L1');
    expect(lieuParent(LIEUX, 'L2')?.id).toBe('L2');
    expect(labelLieu(LIEUX, 'S1')).toBe('Salle Zen · Studio Centre');
    expect(labelLieu(LIEUX, 'L1')).toBe('Studio Centre');
    expect(labelLieu(LIEUX, 'inconnu')).toBe('');
  });

  test('le sélecteur indente les salles sous leur lieu', () => {
    const o = optionsLieux(LIEUX);
    expect(o.map(x => x.id)).toEqual(['L1', 'S1', 'S2', 'L2']);
    expect(o[1]).toEqual({ id: 'S1', label: '↳ Salle Zen', salle: true, capacite: 12 });
    expect(o[0].salle).toBe(false);
  });

  test('sanitize : un nom obligatoire, une capacité entière entre 1 et 500 ou vide', () => {
    expect(sanitizeSalle({ nom: '  Salle   Zen ', capacite: '12' })).toEqual({ ok: true, salle: { nom: 'Salle Zen', capacite: 12 } });
    expect(sanitizeSalle({ nom: 'Salle', capacite: '' }).salle.capacite).toBeNull();
    expect(sanitizeSalle({ nom: '' }).ok).toBe(false);
    expect(sanitizeSalle({ nom: 'Salle', capacite: 0 }).ok).toBe(false);
    expect(sanitizeSalle({ nom: 'Salle', capacite: 2.5 }).ok).toBe(false);
  });
});

test.describe('le chevauchement : le miroir du trigger v114', () => {
  const s = (over) => ({ id: 'a', lieu_id: 'S1', date: '2026-10-01', heure: '18:00', duree_minutes: 60, nom: 'Hatha', ...over });
  test('plage [début, fin[ en minutes ; sans heure, pas de plage', () => {
    expect(plageDe(s())).toEqual({ debut: 1080, fin: 1140 });
    expect(plageDe(s({ heure: '18:00:00', duree_minutes: 90 }))).toEqual({ debut: 1080, fin: 1170 });
    expect(plageDe(s({ heure: null }))).toBeNull();
    expect(plageDe(s({ duree_minutes: null })).fin).toBe(1140);
  });
  test('même salle, même jour, intervalles qui se croisent', () => {
    expect(chevauche(s(), s({ id: 'b', heure: '18:30' }))).toBe(true);
    expect(chevauche(s(), s({ id: 'b', heure: '17:30', duree_minutes: 45 }))).toBe(true);
    expect(chevauche(s(), s({ id: 'b', heure: '19:00' }))).toBe(false);      // bout à bout : pas un chevauchement
    expect(chevauche(s(), s({ id: 'b', heure: '17:00' }))).toBe(false);
    expect(chevauche(s(), s({ id: 'b', date: '2026-10-02' }))).toBe(false);
    expect(chevauche(s(), s({ id: 'b', lieu_id: 'S2' }))).toBe(false);
    expect(chevauche(s(), s({ id: 'b', est_annule: true, heure: '18:30' }))).toBe(false);
    expect(chevauche(s(), s({ id: 'a', heure: '18:30' }))).toBe(false);      // la même séance (modification)
    expect(chevauche(s({ lieu_id: null }), s({ id: 'b', lieu_id: null }))).toBe(false);
  });
  test('les conflits d\'une série contre l\'existant ET entre elles ; sans salle, aucun', () => {
    const existantes = [s({ id: 'e1', heure: '18:30', nom: 'Yin' })];
    const candidates = [s({ id: null }), s({ id: null, date: '2026-10-08' }), s({ id: null, date: '2026-10-08', heure: '18:15', nom: 'Doublon' })];
    const conflits = chevauchementsPour(candidates, existantes);
    expect(conflits.length).toBe(2);
    expect(conflits[0].contre.nom).toBe('Yin');
    expect(conflits[1].contre.nom).toBe('Doublon');
    expect(chevauchementsPour(candidates, existantes, { salle: false })).toEqual([]);
    expect(texteChevauchement(conflits[0], 'Salle Zen')).toBe('Le 01/10/2026 à 18:00, Salle Zen est déjà prise par « Yin » (18:30, 60 min).');
    expect(estRefusChevauchement({ message: 'CHEVAUCHEMENT_SALLE: « Yin » occupe déjà cette salle' })).toBe(true);
    expect(estRefusChevauchement({ message: 'autre' })).toBe(false);
  });
});

test.describe('la marge : jamais un coût inventé', () => {
  const abos = new Map([['A1', { prix: 120, seances_total: 10 }], ['A2', { prix: 0, seances_total: null }]]);
  const seance = { id: 'c1', date: '2026-10-01', nom: 'Hatha', type_cours: 'hatha', lieu_id: 'S1', intervenant_id: 'M1', duree_minutes: 90, presences: [
    { statut_pointage: 'present', abonnement_id: 'A1' },
    { statut_pointage: 'present', paiement_montant: 15 },
    { statut_pointage: 'present', abonnement_id: 'A2' },
    { statut_pointage: 'absent' },
  ] };
  test('le coût de l\'intervenante selon le mode', () => {
    expect(coutIntervenanteSeance({ mode: 'par_seance', montant: 30 })).toBe(30);
    expect(coutIntervenanteSeance({ mode: 'horaire', montant: 40 }, { duree_minutes: 90 })).toBe(60);
    expect(coutIntervenanteSeance({ mode: 'pourcentage_ca', montant: 50 }, { ca: 27 })).toBe(13.5);
    expect(coutIntervenanteSeance({ mode: 'forfait_mensuel', montant: 300 }, { nbSeancesMois: 4 })).toBe(75);
    expect(coutIntervenanteSeance(null)).toBeNull();
  });
  test('le CA d\'une séance = paiement de présence + prorata carnet, un abo sans prix compte « inconnu »', () => {
    expect(caSeance(seance, abos)).toEqual({ ca: 27, ca_inconnu: 1, nb_presentes: 3 });
  });
  test('la marge = CA − intervenante − dépenses de la séance ; null sans rémunération', () => {
    const m = margeSeance(seance, { abonnements: abos, remuneration: { mode: 'par_seance', montant: 20 }, depenses: [{ cours_id: 'c1', montant_ttc: 5 }, { cours_id: 'autre', montant_ttc: 99 }] });
    expect(m.ca).toBe(27); expect(m.cout_intervenante).toBe(20); expect(m.depenses).toBe(5); expect(m.marge).toBe(2);
    expect(margeSeance(seance, { abonnements: abos }).marge).toBeNull();
  });
  test('l\'analyse d\'exercice : par mois, par salle, par intervenante, par type, et le non rattaché', () => {
    const a = analyserExercice({
      paiements: [{ montant: 120, date_encaissement: '2026-09-15' }, { montant: 15, date: '2026-10-01' }, { montant: 20, date_encaissement: '2026-10-03' }],
      depenses: [{ montant_ttc: 5, montant_ht: 4.17, tva_taux: 20, date: '2026-10-01', cours_id: 'c1' }, { montant_ttc: 200, date: '2026-10-05', lieu_id: 'S1' }],
      seances: [seance],
      abonnements: abos,
      membres: [{ id: 'M1', label: 'Léa', remuneration: { mode: 'par_seance', montant: 20 } }],
      lieux: LIEUX,
      mois: ['2026-09', '2026-10'],
    });
    expect(a.totaux).toEqual({ recettes: 155, depenses: 205, resultat: -50, ca_rattache: 27, non_rattache: 128, nb_seances: 1 });
    expect(a.par_mois.find(m => m.id === '2026-10')).toMatchObject({ recettes: 35, depenses: 205, nb_seances: 1, nb_presentes: 3 });
    expect(a.par_salle[0]).toMatchObject({ id: 'S1', label: 'Salle Zen · Studio Centre', recettes: 27, depenses: 200 });
    expect(a.par_intervenante[0]).toMatchObject({ id: 'M1', label: 'Léa', recettes: 27, depenses: 20, resultat: 7 });
    expect(a.par_type[0]).toMatchObject({ id: 'hatha', recettes: 27, depenses: 25 });
    expect(a.tva).toEqual([{ taux: 20, ht: 4.17, tva: 0.83, ttc: 5 }]);
    expect(a.seances[0].marge).toBe(2);
  });
  test('la TVA par taux ignore une dépense sans HT ni taux', () => {
    expect(tvaParTaux([{ montant_ttc: 100 }, { montant_ttc: 110, montant_ht: 100, tva_taux: 10 }])).toEqual([{ taux: 10, ht: 100, tva: 10, ttc: 110 }]);
  });
});

test.describe('le relevé automatique', () => {
  test('fenêtre de cinq jours, le mois précédent', () => {
    expect(FENETRE_JOURS).toBe(5);
    expect(moisAEnvoyer('2026-10-01')).toBe('2026-09');
    expect(moisAEnvoyer('2026-10-05')).toBe('2026-09');
    expect(moisAEnvoyer('2026-10-06')).toBeNull();
    expect(moisAEnvoyer('2027-01-02')).toBe('2026-12');
    expect(moisAEnvoyer('nimporte')).toBeNull();
  });
  test('une référence par structure, intervenante et mois ; jamais un relevé vide', () => {
    expect(refReleveAuto('S', 'M', '2026-09')).toBe('S:M:2026-09');
    expect(releveAEnvoyer({ nb_seances: 0 })).toBe(false);
    expect(releveAEnvoyer({ nb_seances: 3 })).toBe(true);
    expect(releveAEnvoyer(null)).toBe(false);
  });
  test('l\'email dit le mois, la structure, le montant convenu et que la validation suit', () => {
    const e = emailReleveAuto({ prenom: 'Léa', nomStructure: 'Studio Centre', mois: '2026-09', releve: { nb_seances: 8, nb_presentes: 40, montant_du: 240 }, aUnCompte: true, lien: 'https://x/revenus' });
    expect(e.subject).toContain('septembre 2026');
    expect(e.html).toContain('Bonjour Léa');
    expect(e.html).toContain('8 séances');
    expect(e.html).toContain('240');
    expect(e.html).toContain('VALIDE');
    expect(e.html).toContain('Mes prestations');
    expect(emailReleveAuto({ nomStructure: 'S', mois: '2026-09', releve: { nb_seances: 1, nb_presentes: 1 }, aUnCompte: false }).html).not.toContain('Mes prestations');
  });
});

test.describe('la migration v114 dit la même chose que le code', () => {
  test('salle_de, capacite, trigger de chevauchement sur une SALLE seulement, releve_auto', () => {
    const sql = readFileSync('migrations-v114-gestion-studio.sql', 'utf8');
    expect(sql).toContain('add column if not exists salle_de uuid references public.lieux(id)');
    expect(sql).toContain('add column if not exists capacite integer');
    expect(sql).toContain('trg_chevauchement_salle');
    expect(sql).toContain("select (salle_de is not null) into v_salle");
    expect(sql).toContain('c.heure < v_fin');
    expect(sql).toContain('CHEVAUCHEMENT_SALLE');
    expect(sql).toContain('add column if not exists releve_auto boolean not null default false');
    expect(sql).toContain('trg_lieux_un_seul_niveau');
  });
});
