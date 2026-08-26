// ═══════════════════════════════════════════════════════════════════════════
// Verrou CI — le repère de jour sous un champ de date (2026-08-26).
//
// Retour de Maude : « le calendrier d'IziSolo affiche le premier septembre un
// jeudi alors que c'est un mardi ». Le code d'IziSolo était juste, vérifié par
// exécution sur les quatre surfaces qui datent des séances. Le calendrier
// qu'elle regardait n'était pas le nôtre : le champ date est un
// `<input type="date">` NATIF, dont le sélecteur est dessiné par le navigateur
// et s'ouvre sur le mois de la valeur déjà saisie. Une année mal tapée ouvre
// donc le sélecteur sur un mois où le 1er septembre EST un jeudi (2011, 2016,
// 2022, 2033), sans que rien à l'écran ne le signale.
//
// Ce qu'on ne laisse pas glisser :
//   1. Le repère dit le JOUR et l'ANNÉE : c'est l'année qui manquait pour voir
//      l'erreur, un jour seul ne suffit pas.
//   2. Un champ VIDE n'affiche RIEN. `parseDate('')` renvoie AUJOURD'HUI :
//      s'appuyer dessus écrirait un repère confiant sous un champ vide, ce qui
//      est pire que pas de repère du tout.
//   3. On ne crie JAMAIS sur une année normale. Une prof prépare sa saison en
//      cours et la suivante, et crée parfois une séance passée (rattrapage
//      d'historique) : ces cas ne doivent produire aucun avertissement, sinon
//      le repère devient du bruit et on cesse de le lire.
// ═══════════════════════════════════════════════════════════════════════════
import { test, expect } from '@playwright/test';
import { repereDate } from '../../lib/dates.js';

// Le jour du retour terrain : mercredi 26 août 2026.
const AUJOURDHUI = new Date(2026, 7, 26);

test.describe('repereDate — le jour et l\'année, écrits', () => {
  test('LE cas du retour terrain : le 1er septembre 2026 est un mardi', () => {
    const r = repereDate('2026-09-01', AUJOURDHUI);
    expect(r.label).toBe('Mardi 1 septembre 2026');
    expect(r.anneeSuspecte).toBe(false);
  });

  test('l\'année fautive est nommée : en 2022, le 1er septembre EST un jeudi', () => {
    const r = repereDate('2022-09-01', AUJOURDHUI);
    expect(r.label).toBe('Jeudi 1 septembre 2022');
    expect(r.annee).toBe(2022);
    expect(r.anneeSuspecte).toBe(true);
  });

  test('le label porte TOUJOURS l\'année : c\'est elle qui manquait', () => {
    for (const iso of ['2026-09-01', '2027-01-15', '2022-09-01']) {
      expect(repereDate(iso, AUJOURDHUI).label).toContain(iso.slice(0, 4));
    }
  });

  test('la première lettre est capitalisée (le repère est une étiquette, pas une phrase)', () => {
    expect(repereDate('2026-12-25', AUJOURDHUI).label).toBe('Vendredi 25 décembre 2026');
  });
});

test.describe('anneeSuspecte — on ne crie que sur ce qui est vraiment louche', () => {
  test('année courante et deux suivantes : aucun avertissement', () => {
    for (const iso of ['2026-01-01', '2026-12-31', '2027-06-01', '2028-11-30']) {
      expect(repereDate(iso, AUJOURDHUI).anneeSuspecte).toBe(false);
    }
  });

  test('une séance PASSÉE de l\'année en cours ne déclenche rien (rattrapage d\'historique)', () => {
    expect(repereDate('2026-01-05', AUJOURDHUI).anneeSuspecte).toBe(false);
  });

  test('les quatre années où le 1er septembre tombe un jeudi sont toutes signalées', () => {
    for (const annee of [2011, 2016, 2022, 2033]) {
      expect(repereDate(`${annee}-09-01`, AUJOURDHUI).anneeSuspecte).toBe(true);
    }
  });

  test('toute année antérieure est suspecte, même la précédente', () => {
    expect(repereDate('2025-09-01', AUJOURDHUI).anneeSuspecte).toBe(true);
  });

  test('le seuil suit la date du jour, il n\'est pas figé dans le code', () => {
    const en2030 = new Date(2030, 0, 15);
    expect(repereDate('2032-09-01', en2030).anneeSuspecte).toBe(false);
    expect(repereDate('2033-09-01', en2030).anneeSuspecte).toBe(true);
    expect(repereDate('2026-09-01', en2030).anneeSuspecte).toBe(true);
  });
});

test.describe('entrées douteuses — le repère se tait plutôt que de mentir', () => {
  test('un champ VIDE ne rend rien (le piège parseDate qui renvoie aujourd\'hui)', () => {
    expect(repereDate('', AUJOURDHUI)).toBeNull();
    expect(repereDate('   ', AUJOURDHUI)).toBeNull();
  });

  test('une date incomplète ou non datée ne rend rien', () => {
    for (const v of ['2026-09', '2026', 'pouet', '01/09/2026', '2026/09/01']) {
      expect(repereDate(v, AUJOURDHUI)).toBeNull();
    }
  });

  test('une date qui n\'existe pas ne rend rien (le 31 février ne devient pas le 3 mars)', () => {
    expect(repereDate('2026-02-31', AUJOURDHUI)).toBeNull();
    expect(repereDate('2026-13-01', AUJOURDHUI)).toBeNull();
    expect(repereDate('2026-00-10', AUJOURDHUI)).toBeNull();
  });

  test('le 29 février d\'une année bissextile reste valide', () => {
    expect(repereDate('2028-02-29', AUJOURDHUI).label).toBe('Mardi 29 février 2028');
    expect(repereDate('2027-02-29', AUJOURDHUI)).toBeNull();
  });

  test('ce qui n\'est pas une chaîne ne rend rien', () => {
    for (const v of [null, undefined, 42, {}, [], new Date()]) {
      expect(repereDate(v, AUJOURDHUI)).toBeNull();
    }
  });
});
