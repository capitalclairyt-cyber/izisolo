/**
 * Lire une photo de LISTE d'élèves (lib/import-photo) — 2026-09-17.
 *
 * Né du montage d'Atout Gym : Maude avait le listing papier de l'association
 * et l'import par photo ne lisait qu'UNE fiche (son prompt le disait en
 * toutes lettres), donc trente élèves demandaient trente photos.
 *
 * Ce que ce verrou tient :
 *   • on n'invente jamais une donnée (le prompt l'interdit, le tamis jette) ;
 *   • les en-têtes fabriqués sont RECONNUS par l'auto-mapping de l'écran
 *     d'import — c'est le seul contrat entre les deux modules, et sans ce
 *     test il se romprait en silence au premier renommage ;
 *   • une lecture tronquée le DIT au lieu de laisser croire que tout est passé.
 *
 * Test Node pur (aucun navigateur, aucune DB).
 */
import { test, expect } from '@playwright/test';
import {
  CHAMPS_PHOTO,
  EN_TETES_PHOTO,
  MAX_LIGNES_PHOTO,
  MAX_TOKENS_LISTE,
  normaliserDatePhoto,
  sanitizeLignePhoto,
  sanitizeLignesPhoto,
  lignesVersRows,
  resumeLecture,
  promptListe,
} from '../../lib/import-photo.js';
import { autoMap, TARGETS } from '../../lib/csv-import.js';

// ── LE contrat : la photo atterrit pré-mappée sur l'écran d'import ──────────
test.describe('les en-têtes fabriqués sont reconnus par l’auto-mapping', () => {
  test('les 7 colonnes sont mappées, chacune à sa place', () => {
    const map = autoMap(EN_TETES_PHOTO);
    expect(CHAMPS_PHOTO.map(c => map[c])).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  test('aucune cible de l’écran d’import ne reste orpheline', () => {
    const map = autoMap(EN_TETES_PHOTO);
    for (const t of TARGETS) expect(map[t.key], `cible « ${t.key} » non mappée`).toBeGreaterThanOrEqual(0);
  });

  test('aller-retour complet : lignes → rows → mapping → valeurs identiques', () => {
    const lignes = [{ prenom: 'Mireille', nom: 'ANDRE', email: 'm@ex.fr', telephone: '07 81 67 86 38', date_naissance: '1974-03-02', ville: 'Gillonnay', notes: 'Groupe 18h45' }];
    const rows = lignesVersRows(lignes);
    const map = autoMap(rows[0]);
    // Ce que buildClients() reconstruirait à partir de la première ligne
    const reconstruit = {};
    for (const t of TARGETS) reconstruit[t.key] = rows[1][map[t.key]];
    expect(reconstruit).toEqual(lignes[0]);
  });
});

// ── La forme rendue : exactement ce que parseCSV rend ───────────────────────
test.describe('lignesVersRows', () => {
  test('en-têtes en première ligne, puis une ligne par personne', () => {
    const rows = lignesVersRows([{ prenom: 'Ada', nom: 'L' }, { prenom: 'Bob', nom: 'M' }]);
    expect(rows[0]).toEqual(EN_TETES_PHOTO);
    expect(rows).toHaveLength(3);
    expect(rows[1][0]).toBe('Ada');
  });

  test('un champ absent devient une case vide, jamais undefined', () => {
    const rows = lignesVersRows([{ prenom: 'Ada' }]);
    expect(rows[1]).toHaveLength(EN_TETES_PHOTO.length);
    expect(rows[1].every(v => typeof v === 'string')).toBe(true);
  });

  test('une entrée difforme ne jette pas', () => {
    expect(() => lignesVersRows(null)).not.toThrow();
    expect(lignesVersRows(null)).toEqual([EN_TETES_PHOTO]);
  });
});

// ── Le tamis : on jette plutôt que de deviner ───────────────────────────────
test.describe('sanitizeLignePhoto', () => {
  test('une ligne sans prénom ni nom ni email est jetée', () => {
    expect(sanitizeLignePhoto({ telephone: '06 00 00 00 00', ville: 'Lyon' })).toBeNull();
    expect(sanitizeLignePhoto({})).toBeNull();
    expect(sanitizeLignePhoto(null)).toBeNull();
    expect(sanitizeLignePhoto('Mireille ANDRE')).toBeNull();
  });

  test('un prénom SEUL suffit : la liste papier d’une asso n’a pas toujours d’email', () => {
    expect(sanitizeLignePhoto({ prenom: 'Lucie' })?.prenom).toBe('Lucie');
    expect(sanitizeLignePhoto({ nom: 'EMPTOZ' })?.nom).toBe('EMPTOZ');
  });

  test('les null du modèle deviennent des chaînes vides, jamais « null »', () => {
    const l = sanitizeLignePhoto({ prenom: 'Ada', nom: null, email: 'null', notes: undefined });
    expect(l.nom).toBe('');
    expect(l.email).toBe('');
    expect(l.notes).toBe('');
  });

  test('l’email est mis en minuscules et détouré', () => {
    expect(sanitizeLignePhoto({ email: '  Mireille.ANDRE@Gmail.COM ' }).email).toBe('mireille.andre@gmail.com');
  });

  test('les espaces multiples et les retours à la ligne sont aplatis', () => {
    expect(sanitizeLignePhoto({ prenom: ' Marie  \n France ' }).prenom).toBe('Marie France');
  });

  test('les champs trop longs sont tronqués, pas rejetés', () => {
    const l = sanitizeLignePhoto({ prenom: 'A'.repeat(500), notes: 'n'.repeat(4000) });
    expect(l.prenom).toHaveLength(120);
    expect(l.notes).toHaveLength(1000);
  });
});

test.describe('normaliserDatePhoto', () => {
  test('l’ISO passe tel quel', () => {
    expect(normaliserDatePhoto('1990-12-05')).toBe('1990-12-05');
  });

  test('le JJ/MM/AAAA français est converti (jamais lu à l’américaine)', () => {
    expect(normaliserDatePhoto('05/12/1990')).toBe('1990-12-05');
    expect(normaliserDatePhoto('5.12.1990')).toBe('1990-12-05');
    expect(normaliserDatePhoto('05-12-1990')).toBe('1990-12-05');
  });

  test('une date impossible ou illisible ne devient JAMAIS une date', () => {
    expect(normaliserDatePhoto('32/01/1990')).toBe('');
    expect(normaliserDatePhoto('05/13/1990')).toBe('');
    expect(normaliserDatePhoto('née en 1990')).toBe('');
    expect(normaliserDatePhoto('')).toBe('');
    expect(normaliserDatePhoto(null)).toBe('');
  });
});

// ── Le plafond, et l’aveu quand on tronque ──────────────────────────────────
test.describe('sanitizeLignesPhoto', () => {
  const personne = (i) => ({ prenom: `P${i}`, nom: `N${i}` });

  test('compte les lignes jetées au lieu de les taire', () => {
    const r = sanitizeLignesPhoto([personne(1), {}, { telephone: '06' }, personne(2)]);
    expect(r.lignes).toHaveLength(2);
    expect(r.ignorees).toBe(2);
  });

  test('plafonne à MAX_LIGNES_PHOTO et le DIT', () => {
    const r = sanitizeLignesPhoto(Array.from({ length: MAX_LIGNES_PHOTO + 10 }, (_, i) => personne(i)));
    expect(r.lignes).toHaveLength(MAX_LIGNES_PHOTO);
    expect(r.tronque).toBe(true);
    expect(r.ignorees).toBe(10);
  });

  test('une liste normale n’est jamais annoncée comme tronquée', () => {
    const r = sanitizeLignesPhoto([personne(1), personne(2)]);
    expect(r.tronque).toBe(false);
    expect(r.ignorees).toBe(0);
  });

  test('une entrée qui n’est pas un tableau rend une lecture vide, sans jeter', () => {
    for (const brut of [null, undefined, {}, 'liste', 42]) {
      expect(() => sanitizeLignesPhoto(brut)).not.toThrow();
      expect(sanitizeLignesPhoto(brut).lignes).toEqual([]);
    }
  });
});

test.describe('resumeLecture', () => {
  test('dit le nombre lu, les ignorées, et la troncature', () => {
    expect(resumeLecture({ lignes: [1, 2, 3] })).toBe('3 élèves lues');
    expect(resumeLecture({ lignes: [1] })).toBe('1 élève lue');
    expect(resumeLecture({ lignes: [1, 2], ignorees: 1 })).toContain('1 ligne ignorée');
    expect(resumeLecture({ lignes: [1], tronque: true })).toContain('photographie la suite');
  });

  test('ne jette pas sur une entrée vide', () => {
    expect(() => resumeLecture()).not.toThrow();
  });
});

// ── Le prompt : c’est lui qui nous sépare d’une base d’élèves imaginaire ────
test.describe('promptListe', () => {
  const p = promptListe();

  test('interdit explicitement d’inventer', () => {
    expect(p).toContain("N'invente RIEN");
    expect(p).toMatch(/null/);
  });

  test('impose une personne par objet et interdit de fusionner', () => {
    expect(p).toContain('UNE personne par objet');
    expect(p).toMatch(/fusionne/i);
  });

  test('exclut les en-têtes, les totaux et les pieds de page', () => {
    expect(p).toMatch(/en-têtes du tableau/i);
    expect(p).toMatch(/total/i);
  });

  test('cite le plafond réellement appliqué', () => {
    expect(promptListe(12)).toContain('Au plus 12 personnes');
    expect(p).toContain(`Au plus ${MAX_LIGNES_PHOTO} personnes`);
  });

  test('demande la date à la française, pas à l’américaine', () => {
    expect(p).toContain('AAAA-MM-JJ');
    expect(p).toContain('JJ/MM/AAAA');
  });

  test('demande un tableau VIDE plutôt qu’une invention quand il n’y a pas de liste', () => {
    expect(p).toMatch(/tableau vide/i);
  });

  test('toutes les clés attendues sont nommées', () => {
    for (const c of CHAMPS_PHOTO) expect(p, `clé « ${c} » absente du prompt`).toContain(`"${c}"`);
  });
});

test('la place de sortie tient la soixantaine de lignes du plafond', () => {
  // ~90 tokens par ligne au pire, plus le « thinking » d'Opus.
  expect(MAX_TOKENS_LISTE).toBeGreaterThanOrEqual(MAX_LIGNES_PHOTO * 90);
});
