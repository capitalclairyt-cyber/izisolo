// ═══════════════════════════════════════════════════════════════════════════
// Verrou CI — replier les séances identiques d'une journée (2026-08-25).
//
// Déclencheur : Melyflow, prof à Genly, qui n'enseigne que le samedi. Sa
// journée de rentrée compte cinq « Cours découverte » au même endroit, au même
// prix, à cinq heures différentes — cinq cartes empilées sur son portail.
//
// Ce qu'on ne laisse pas glisser, dans l'ordre de gravité :
//   1. Une séance ANNULÉE ne se replie JAMAIS. « Annulée » est l'information
//      la plus importante de la carte ; la cacher derrière un chevron ferait
//      venir quelqu'un pour rien.
//   2. On ne replie que des séances vraiment interchangeables. Un prix, un
//      lieu ou un format qui diffère = deux cartes, sinon le pli cacherait
//      une différence que l'élève devait voir.
//   3. Aucun chiffre inventé : dès qu'une séance du groupe est à capacité
//      libre, le total de places repasse à « on ne sait pas », jamais à 0.
//   4. Rien ne DISPARAÎT : le nombre de séances rendues est toujours égal au
//      nombre de séances reçues.
// ═══════════════════════════════════════════════════════════════════════════
import { test, expect } from '@playwright/test';
import {
  SEUIL_GROUPE, cleGroupe, resumeGroupe, grouperSeances, libelleGroupe,
} from '../../lib/seances-groupees.js';

const seance = (o = {}) => ({
  id: o.id || Math.random().toString(36).slice(2),
  date: '2026-09-26',
  nom: 'Cours découverte',
  type_cours: null,
  lieu: 'Genly (Yourte)',
  format: 'presentiel',
  tarif_unitaire: 5,
  carnets_acceptes: null,
  photo_url: null,
  capacite_max: 8,
  nbInscrits: 0,
  est_annule: false,
  heure: '09:30:00',
  ...o,
});

/** Le cas RÉEL de Melyflow : 5 découvertes le même samedi. */
const melyflow = () => ['09:30:00', '11:00:00', '13:00:00', '14:30:00', '16:00:00']
  .map((heure, i) => seance({ id: `d${i}`, heure }));

const compter = (items) => items.reduce(
  (n, it) => n + (it.type === 'groupe' ? it.cours.length : 1), 0
);

test.describe('le cas de Melyflow', () => {
  test('cinq découvertes du samedi deviennent UNE carte', () => {
    const items = grouperSeances(melyflow());
    expect(items).toHaveLength(1);
    expect(items[0].type).toBe('groupe');
    expect(items[0].cours).toHaveLength(5);
  });

  test('la phrase de l\'en-tête dit ce qu\'il y a dedans', () => {
    const [g] = grouperSeances(melyflow());
    expect(libelleGroupe(g.resume)).toBe('5 créneaux, de 09:30 à 16:00');
  });

  test('les créneaux sortent dans l\'ordre de la journée', () => {
    // Même mélangés à l'entrée : une visiteuse ne doit pas voir les heures sauter.
    const melange = [...melyflow()].reverse();
    const [g] = grouperSeances(melange);
    expect(g.cours.map(c => c.heure.slice(0, 5)))
      .toEqual(['09:30', '11:00', '13:00', '14:30', '16:00']);
  });

  test('l\'identifiant du groupe est STABLE d\'un rendu à l\'autre', () => {
    // C'est la clé d'ouverture : instable, le pli se refermerait tout seul.
    const a = grouperSeances(melyflow())[0].id;
    const b = grouperSeances([...melyflow()].reverse())[0].id;
    expect(a).toBe(b);
  });
});

test.describe('rien ne disparaît', () => {
  test('autant de séances en sortie qu\'en entrée, dans tous les cas', () => {
    const cas = [
      melyflow(),
      [...melyflow(), seance({ id: 'x', nom: 'Yin', heure: '18:00:00' })],
      [seance({ id: 'a' }), seance({ id: 'b', heure: '11:00:00' })],
      [],
    ];
    for (const liste of cas) {
      expect(compter(grouperSeances(liste)), JSON.stringify(liste.length)).toBe(liste.length);
    }
  });

  test('une liste vide, nulle ou difforme ne casse rien', () => {
    expect(grouperSeances([])).toEqual([]);
    expect(grouperSeances(null)).toEqual([]);
    expect(grouperSeances(undefined)).toEqual([]);
    expect(grouperSeances([null, undefined])).toEqual([]);
  });

  test('le groupe prend la place de son PREMIER membre', () => {
    const liste = [
      seance({ id: 'tot', nom: 'Yin matinal', heure: '08:00:00' }),
      ...melyflow(),
      seance({ id: 'soir', nom: 'Yin du soir', heure: '19:00:00' }),
    ];
    const items = grouperSeances(liste);
    expect(items.map(i => i.type)).toEqual(['seance', 'groupe', 'seance']);
    expect(items[0].cours.id).toBe('tot');
    expect(items[2].cours.id).toBe('soir');
  });
});

test.describe('on ne replie que ce qui est vraiment interchangeable', () => {
  test('LE test qui compte : une séance ANNULÉE reste seule', () => {
    const liste = melyflow();
    liste[2].est_annule = true;
    const items = grouperSeances(liste);
    // 4 repliées + l'annulée toute seule, jamais cachée derrière un chevron.
    expect(items).toHaveLength(2);
    const groupe = items.find(i => i.type === 'groupe');
    const seule = items.find(i => i.type === 'seance');
    expect(groupe.cours).toHaveLength(4);
    expect(groupe.cours.some(c => c.est_annule)).toBe(false);
    expect(seule.cours.est_annule).toBe(true);
  });

  test('un prix différent = deux cartes', () => {
    const liste = melyflow();
    liste[0].tarif_unitaire = 12;
    const items = grouperSeances(liste);
    expect(items.filter(i => i.type === 'seance')).toHaveLength(1);
    expect(items.find(i => i.type === 'groupe').cours).toHaveLength(4);
  });

  test('un lieu, un format ou une image différents = deux cartes', () => {
    for (const champ of [
      { lieu: 'Mons (salle)' },
      { format: 'visio' },
      { photo_url: 'https://exemple/photo.jpg' },
      { domicile: true },
      { type_cours: 'Hatha' },
    ]) {
      const liste = melyflow();
      Object.assign(liste[0], champ);
      const items = grouperSeances(liste);
      expect(items.filter(i => i.type === 'seance'), JSON.stringify(champ)).toHaveLength(1);
    }
  });

  test('en dessous du seuil, on ne replie pas', () => {
    expect(SEUIL_GROUPE).toBe(3);
    const deux = [seance({ id: 'a' }), seance({ id: 'b', heure: '11:00:00' })];
    expect(grouperSeances(deux).every(i => i.type === 'seance')).toBe(true);
    const trois = [...deux, seance({ id: 'c', heure: '13:00:00' })];
    expect(grouperSeances(trois)[0].type).toBe('groupe');
  });

  test('la casse et les espaces ne fabriquent pas de faux étrangers', () => {
    // Deux séances saisies « Cours découverte » et «  COURS DÉCOUVERTE  » sont
    // le même cours pour une visiteuse : elles doivent se replier ensemble.
    const a = seance({ id: 'a', nom: 'Cours découverte' });
    const b = seance({ id: 'b', nom: '  COURS DÉCOUVERTE  ', heure: '11:00:00' });
    expect(cleGroupe(a)).toBe(cleGroupe(b));
  });
});

test.describe('les places : aucun chiffre inventé', () => {
  test('le total est la somme des places restantes', () => {
    const liste = melyflow();
    liste[0].nbInscrits = 8; // complet
    liste[1].nbInscrits = 3;
    const r = resumeGroupe(liste);
    expect(r.placesRestantes).toBe(0 + 5 + 8 + 8 + 8);
    expect(r.toutComplet).toBe(false);
  });

  test('une seule séance à capacité LIBRE et le total redevient inconnu', () => {
    const liste = melyflow();
    liste[3].capacite_max = null;
    const r = resumeGroupe(liste);
    // null = « on ne sait pas ». Surtout pas 0, qui se lirait « complet ».
    expect(r.placesRestantes).toBeNull();
    expect(r.toutComplet).toBe(false);
  });

  test('tout complet se dit tout complet', () => {
    const liste = melyflow().map(c => ({ ...c, nbInscrits: c.capacite_max }));
    const r = resumeGroupe(liste);
    expect(r.placesRestantes).toBe(0);
    expect(r.toutComplet).toBe(true);
  });

  test('une jauge négative ne se propage pas (surbooking manuel)', () => {
    const liste = melyflow();
    liste[0].nbInscrits = 12; // 8 places, 12 inscrites : la prof a forcé
    expect(resumeGroupe(liste).placesRestantes).toBe(8 * 4);
  });
});

test.describe('libelleGroupe — la phrase reste honnête', () => {
  test('un seul horaire ne prétend pas être une plage', () => {
    const r = resumeGroupe([seance({ id: 'a' }), seance({ id: 'b' }), seance({ id: 'c' })]);
    expect(libelleGroupe(r)).toBe('3 créneaux');
  });

  test('un résumé vide ne rend rien plutôt qu\'une phrase absurde', () => {
    expect(libelleGroupe(null)).toBe('');
    expect(libelleGroupe({ nb: 0 })).toBe('');
  });
});
