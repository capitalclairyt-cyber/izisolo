// ═══════════════════════════════════════════════════════════════════════════
// Verrou CI — qui donne la séance, et qui a le droit de la pointer
// (v103, lot 3b du chantier multi-prof, 2026-08-25).
//
// Ce qu'on ne laisse pas glisser :
//   1. `peutPointerCours` doit être le miroir EXACT de la fonction SQL
//      `mes_cours_pointables()`. C'est le SQL qui garde vraiment (la RPC
//      pointer_presence est en SECURITY INVOKER) ; ce helper ne sert qu'à ne
//      pas ouvrir un écran qui refuserait d'enregistrer. S'ils divergent,
//      l'écran promet ce que la base refuse.
//   2. Une séance SANS intervenante reste pointable par tout le monde. On ne
//      ferme jamais rétroactivement une porte qui était ouverte : c'est l'état
//      de 100 % des séances existantes le jour de la migration.
//   3. La colonne `intervenant_id` n'entre JAMAIS dans un insert de cours.
// ═══════════════════════════════════════════════════════════════════════════
import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  peutPointerCours, sanitizePortee, labelPortee,
  PORTEES_POINTAGE, PORTEE_POINTAGE_DEFAUT, PRESETS,
} from '../../lib/studio-membre.js';
import { labelIntervenante } from '../../lib/intervenante.js';

const RACINE = process.cwd();

const proprio = { id: 'm-0', role: 'proprietaire', statut: 'actif', permissions: {}, portee_pointage: 'miens' };
const large = { id: 'm-1', role: 'prof', statut: 'actif', permissions: PRESETS.prof, portee_pointage: 'tous' };
const bornee = { id: 'm-2', role: 'prof', statut: 'actif', permissions: PRESETS.prof, portee_pointage: 'miens' };

test.describe('peutPointerCours — miroir de mes_cours_pointables()', () => {
  test('le propriétaire pointe tout, même marqué « miens »', () => {
    // Sa portée n'a aucun sens : c'est son studio.
    expect(peutPointerCours(proprio, { intervenant_id: 'm-2' })).toBe(true);
  });

  test('portée « tous » : tout, quelle que soit l\'intervenante', () => {
    expect(peutPointerCours(large, { intervenant_id: 'm-2' })).toBe(true);
    expect(peutPointerCours(large, { intervenant_id: null })).toBe(true);
  });

  test('LE test qui compte : une séance SANS intervenante reste ouverte à tous', () => {
    // C'est l'état de 100 % des séances le jour de la migration. Fermer
    // rétroactivement une porte ouverte casserait des studios qui marchaient.
    expect(peutPointerCours(bornee, { intervenant_id: null })).toBe(true);
    expect(peutPointerCours(bornee, {})).toBe(true);
    expect(peutPointerCours(bornee, undefined)).toBe(true);
  });

  test('portée « miens » : ses séances oui, celles d\'une collègue non', () => {
    expect(peutPointerCours(bornee, { intervenant_id: 'm-2' })).toBe(true);
    expect(peutPointerCours(bornee, { intervenant_id: 'm-1' })).toBe(false);
  });

  test('sans le droit de pointer, la portée ne change rien', () => {
    const sansDroit = { ...large, permissions: { eleves_voir: true } };
    expect(peutPointerCours(sansDroit, { intervenant_id: null })).toBe(false);
  });

  test('révoquée : plus rien, portée ou pas', () => {
    expect(peutPointerCours({ ...large, statut: 'revoque' }, { intervenant_id: null })).toBe(false);
    expect(peutPointerCours({ ...proprio, statut: 'revoque' }, {})).toBe(false);
    expect(peutPointerCours(null, {})).toBe(false);
  });

  test('une portée absente ou farfelue vaut « tous » (comportement d\'avant)', () => {
    // Pré-v103 la colonne n'existe pas : le défaut doit être l'état d'avant,
    // jamais une fermeture surprise.
    expect(peutPointerCours({ ...bornee, portee_pointage: undefined }, { intervenant_id: 'm-1' })).toBe(true);
    expect(peutPointerCours({ ...bornee, portee_pointage: 'nimporte' }, { intervenant_id: 'm-1' })).toBe(true);
    expect(sanitizePortee(undefined)).toBe('tous');
    expect(sanitizePortee('MIENS')).toBe('tous');
    expect(sanitizePortee('miens')).toBe('miens');
    expect(PORTEE_POINTAGE_DEFAUT).toBe('tous');
    expect(PORTEES_POINTAGE).toEqual(['tous', 'miens']);
  });

  test('les libellés parlent français, pas SQL', () => {
    expect(labelPortee('tous')).toBe('Toutes les séances');
    expect(labelPortee('miens')).toBe('Seulement ses séances');
  });
});

test.describe('labelIntervenante — un nom, pas un identifiant', () => {
  test('tire le prénom de l\'email tant qu\'il n\'y a pas mieux', () => {
    expect(labelIntervenante({ email: 'claire@exemple.fr' })).toBe('Claire');
    expect(labelIntervenante({ email: 'JEAN-MARC@x.fr' })).toBe('JEAN-MARC');
    expect(labelIntervenante({ email: '' })).toBe('Membre');
    expect(labelIntervenante(null)).toBeNull();
  });
});

test('intervenant_id n\'entre JAMAIS dans un insert de cours', () => {
  // Le dégât de B1b, puis de v99 : un insert qui nomme une colonne absente est
  // refusé EN ENTIER par PostgREST, et la séance part à la poubelle avec son
  // tarif, sa visibilité et son lieu. On la pose par un UPDATE de rattrapage
  // (lib/intervenante) et on la lit par une requête séparée.
  const fichiers = [];
  (function marcher(d) {
    for (const e of readdirSync(d)) {
      if (e === 'node_modules' || e === '.next') continue;
      const p = join(d, e);
      if (statSync(p).isDirectory()) marcher(p);
      else if (/\.jsx?$/.test(e)) fichiers.push(p);
    }
  })(join(RACINE, 'app'));
  fichiers.push(join(RACINE, 'lib', 'intervenante.js'));

  const coupables = fichiers.filter(p => {
    const src = readFileSync(p, 'utf8');
    // Un `.insert(` dont le corps mentionne intervenant_id.
    return /\.insert\(\s*[\s\S]{0,900}?intervenant_id/.test(src);
  }).map(p => p.replace(RACINE + '\\', '').split('\\').join('/'));

  expect(coupables, `Pose l'intervenante par poserIntervenante (UPDATE), jamais dans l'insert.\n${coupables.join(', ')}`).toEqual([]);
});

test('le sélecteur de studio revalide toujours contre les appartenances', () => {
  // Le cookie n'est qu'une préférence : le bricoler ne doit ouvrir aucun
  // studio. La revalidation vit à DEUX endroits, et les deux comptent.
  const resolveur = readFileSync(join(RACINE, 'lib', 'studio-actif.js'), 'utf8');
  expect(resolveur).toContain('membres.some(m => m.profile_id === choisi)');
  const route = readFileSync(join(RACINE, 'app', 'api', 'studio-actif', 'route.js'), 'utf8');
  expect(route).toContain('PAS_MEMBRE');
  expect(route).toContain('HttpOnly');
});
