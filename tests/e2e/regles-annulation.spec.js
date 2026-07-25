/**
 * La loi d'annulation et les règles métier du studio — verrou complet (B2a).
 *
 * Verrouille :
 *  1. le fix du 2026-07-25 (bug Manon/Soleya) : Postgres renvoie `heure` en
 *     'HH:MM:SS', l'ancien code construisait '…T17:45:00:00' → Invalid Date
 *     → diff NaN → TOUTE annulation était « tardive », même un mois avant ;
 *  2. le comportement intégral des helpers (défauts, JSONB partiels, merge
 *     des règles stockées) AVANT la fusion regles-metier + regles-annulation
 *     (batch B2a) — la fusion doit laisser cette spec verte à l'identique.
 *
 * Test Node pur (aucun navigateur) : on importe les fonctions directement.
 * Les instants `now` sont passés avec offset explicite (+02:00 été Paris)
 * pour être déterministes quel que soit le fuseau de la machine de test.
 */
import { test, expect } from '@playwright/test';
import { evaluerAnnulation, formatDateLimite, getReglesAnnulation, getDelaiPourCours } from '../../lib/regles-annulation.js';
import { getRegle, defaultRegles, shouldAutoApply, getChoixLabel, CASES } from '../../lib/regles-metier.js';

const PROFILE_24H = { regles_annulation: { delai_heures: 24 } };

test.describe('evaluerAnnulation — formats d\'heure Postgres', () => {
  test('cours dans un mois, heure HH:MM:SS → annulable (le bug Manon)', () => {
    // Annulation le 24 juillet d'un cours du 24 août : LE cas remonté.
    const now = new Date('2026-07-24T19:00:00+02:00').getTime();
    const r = evaluerAnnulation(PROFILE_24H, '2026-08-24', '17:45:00', null, now);
    expect(r.annulable).toBe(true);
    expect(r.diffHeures).toBeGreaterThan(700); // ~31 jours
  });

  test('cours dans 2 h (délai 24 h) → tardive, diff cohérente', () => {
    const now = new Date('2026-07-24T15:45:00+02:00').getTime();
    const r = evaluerAnnulation(PROFILE_24H, '2026-07-24', '17:45:00', null, now);
    expect(r.annulable).toBe(false);
    expect(r.diffHeures).toBeGreaterThan(1.9);
    expect(r.diffHeures).toBeLessThan(2.1);
  });

  test('heure déjà en HH:MM → même résultat', () => {
    const now = new Date('2026-07-24T19:00:00+02:00').getTime();
    const r = evaluerAnnulation(PROFILE_24H, '2026-08-24', '17:45', null, now);
    expect(r.annulable).toBe(true);
  });

  test('exactement à la limite (24 h pile) → encore annulable', () => {
    const now = new Date('2026-08-23T17:45:00+02:00').getTime();
    const r = evaluerAnnulation(PROFILE_24H, '2026-08-24', '17:45:00', null, now);
    expect(r.annulable).toBe(true);
    expect(Math.abs(r.diffHeures - 24)).toBeLessThan(0.01);
  });

  test('sans heure (null) → minuit, cours de demain matin = tardive', () => {
    const now = new Date('2026-07-24T19:00:00+02:00').getTime();
    const r = evaluerAnnulation(PROFILE_24H, '2026-07-25', null, null, now);
    expect(r.annulable).toBe(false); // minuit du 25 = dans 5 h < 24 h
  });

  test('date imparsable → fail-open : jamais de sanction sur un bug', () => {
    const r = evaluerAnnulation(PROFILE_24H, 'n/importe/quoi', '17:45:00', null, Date.now());
    expect(r.annulable).toBe(true);
    expect(r.dateLimite).toBe(null);
  });

  test('délai spécifique par type de cours prioritaire sur le global', () => {
    const profile = { regles_annulation: { delai_heures: 24, regles_par_type: { 'Yoga Prénatal': { delai_heures: 48 } } } };
    const now = new Date('2026-08-23T10:00:00+02:00').getTime(); // ~31h45 avant
    const global = evaluerAnnulation(profile, '2026-08-24', '17:45:00', 'Vinyasa', now);
    const special = evaluerAnnulation(profile, '2026-08-24', '17:45:00', 'Yoga Prénatal', now);
    expect(global.annulable).toBe(true);   // 31h45 >= 24
    expect(special.annulable).toBe(false); // 31h45 < 48
  });

  test('dateLimite = cours − délai, formatable', () => {
    const now = new Date('2026-07-24T19:00:00+02:00').getTime();
    const r = evaluerAnnulation(PROFILE_24H, '2026-08-24', '17:45:00', null, now);
    expect(formatDateLimite(r.dateLimite)).toContain('23 août');
  });
});

test.describe('getReglesAnnulation — normalisation du JSONB', () => {
  test('profil null → défauts complets', () => {
    const r = getReglesAnnulation(null);
    expect(r.delai_heures).toBe(24);
    expect(r.politique).toBe('excuse_si_delai');
    expect(r.message).toBe('Annulation acceptée jusqu\'au délai indiqué');
    expect(r.regles_par_type).toEqual({});
  });

  test('JSONB partiel (message seul, cas réel : la prof ne clique aucun preset) → délai 24 conservé', () => {
    const r = getReglesAnnulation({ regles_annulation: { message: 'Préviens-moi par SMS' } });
    expect(r.delai_heures).toBe(24);
    expect(r.message).toBe('Préviens-moi par SMS');
  });

  test('delai_heures: 0 est une vraie valeur (annulation libre jusqu\'au début), pas un « manquant »', () => {
    expect(getReglesAnnulation({ regles_annulation: { delai_heures: 0 } }).delai_heures).toBe(0);
  });

  test('delai_heures non numérique (string "48") → rejeté, retour au défaut 24', () => {
    expect(getReglesAnnulation({ regles_annulation: { delai_heures: '48' } }).delai_heures).toBe(24);
  });
});

test.describe('getDelaiPourCours — délai global vs par type', () => {
  const PROFILE_TYPES = { regles_annulation: { delai_heures: 12, regles_par_type: { 'Yoga Prénatal': { delai_heures: 48 }, 'Atelier': { delai_heures: 0 } } } };

  test('sans type → délai global', () => {
    expect(getDelaiPourCours(PROFILE_TYPES, null)).toBe(12);
  });

  test('type avec règle spécifique → prioritaire sur le global', () => {
    expect(getDelaiPourCours(PROFILE_TYPES, 'Yoga Prénatal')).toBe(48);
  });

  test('type sans règle spécifique → retombe sur le global', () => {
    expect(getDelaiPourCours(PROFILE_TYPES, 'Vinyasa')).toBe(12);
  });

  test('règle par type à 0 → 0 respecté (check != null, pas falsy)', () => {
    expect(getDelaiPourCours(PROFILE_TYPES, 'Atelier')).toBe(0);
  });
});

test.describe('getRegle — config effective d\'un cas (défauts + merge du stocké)', () => {
  test('profil null → défaut du cas annulation_hors_delai (auto / decompter, zéro notif)', () => {
    const r = getRegle(null, 'annulation_hors_delai');
    expect(r).toEqual({ mode: 'auto', choix: 'decompter', notifProf: false, notifEleveEmail: false, notifEleveSms: false, messageCustom: null });
  });

  test('cas inconnu → null', () => {
    expect(getRegle(null, 'cas_inexistant')).toBe(null);
  });

  test('stocké partiel { choix } → le reste hérite du défaut du cas', () => {
    const r = getRegle({ regles_metier: { annulation_hors_delai: { choix: 'excuser' } } }, 'annulation_hors_delai');
    expect(r.choix).toBe('excuser');
    expect(r.mode).toBe('auto');          // défaut du cas
    expect(r.notifEleveEmail).toBe(false); // défaut du cas
  });

  test('choix: null stocké explicitement → CONSERVÉ (≠ retomber sur le choix par défaut)', () => {
    const r = getRegle({ regles_metier: { annulation_hors_delai: { mode: 'auto', choix: null } } }, 'annulation_hors_delai');
    expect(r.choix).toBe(null);
  });

  test('notifProf: false stocké respecté quand le défaut du cas est true (eleve_sans_carnet)', () => {
    const r = getRegle({ regles_metier: { eleve_sans_carnet: { notifProf: false } } }, 'eleve_sans_carnet');
    expect(r.notifProf).toBe(false);
    expect(r.choix).toBe('paiement_sur_place'); // défaut conservé
  });

  test('no_show par défaut = mode manuel, choix null, notifProf true', () => {
    const r = getRegle({}, 'no_show');
    expect(r.mode).toBe('manuel');
    expect(r.choix).toBe(null);
    expect(r.notifProf).toBe(true);
  });

  test('messageCustom vide ("") → normalisé à null', () => {
    const r = getRegle({ regles_metier: { no_show: { messageCustom: '' } } }, 'no_show');
    expect(r.messageCustom).toBe(null);
  });
});

test.describe('defaultRegles / shouldAutoApply / getChoixLabel', () => {
  test('defaultRegles → les 7 cas exactement, chacun avec messageCustom null', () => {
    const d = defaultRegles();
    expect(Object.keys(d).sort()).toEqual([
      'annulation_hors_delai', 'carnet_expire_avant_cours', 'cours_annule_prof',
      'eleve_sans_carnet', 'liste_attente', 'no_show', 'workshop_vs_cours',
    ]);
    expect(Object.keys(d).length).toBe(CASES.length);
    for (const id of Object.keys(d)) expect(d[id].messageCustom).toBe(null);
  });

  test('shouldAutoApply : auto + choix → true ; manuel → false ; auto sans choix → false', () => {
    expect(shouldAutoApply(null, 'eleve_sans_carnet')).toBe(true);  // défaut auto/paiement_sur_place
    expect(shouldAutoApply(null, 'no_show')).toBe(false);           // défaut manuel
    expect(shouldAutoApply({ regles_metier: { eleve_sans_carnet: { mode: 'auto', choix: null } } }, 'eleve_sans_carnet')).toBe(false);
  });

  test('getChoixLabel : label humain, fallback valeur brute, fallback "—"', () => {
    expect(getChoixLabel('annulation_hors_delai', 'decompter')).toBe('Décompter la séance');
    expect(getChoixLabel('annulation_hors_delai', 'valeur_legacy')).toBe('valeur_legacy');
    expect(getChoixLabel('cas_inconnu', 'x')).toBe('x');
    expect(getChoixLabel('no_show', null)).toBe('—');
  });
});
