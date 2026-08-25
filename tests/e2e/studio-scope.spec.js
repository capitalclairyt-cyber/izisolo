// ═══════════════════════════════════════════════════════════════════════════
// Ratchet CI — le studio n'est plus l'utilisateur (v101, lot 2 multi-prof).
//
// Le sweep du 2026-08-25 a remplacé 164 occurrences de `profile_id = user.id`
// par le studio actif. Sans ce ratchet, la forme revient en trois semaines :
// elle est plus courte à écrire, elle marche pour une prof seule, et elle ne
// casse que pour une prof invitée dans une association — c'est-à-dire nulle
// part en développement, et exactement là où ça compte en production.
//
// Les allowlists ne contiennent que les DEUX exceptions permanentes et ne
// peuvent que rétrécir. Même discipline que route-standards.spec.js.
// ═══════════════════════════════════════════════════════════════════════════
import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  ROLES, PERMISSIONS, CLES_PERMISSIONS, PRESETS,
  peut, estProprietaire, estMembreActif,
  sanitizePermissions, sanitizeRole, permissionsParDefaut,
  labelRole, labelStatut, resumeDroits,
  PORTEES_POINTAGE, PORTEE_POINTAGE_DEFAUT,
} from '../../lib/studio-membre.js';

const RACINE = process.cwd();
const DOSSIERS = ['app', 'lib', 'components'];

// Les DEUX seules exceptions légitimes, et elles sont permanentes :
//   • l'onboarding, où la prof crée son propre studio : l'utilisateur EST le
//     studio, par définition ;
//   • le point de résolution lui-même, qui a le droit (et le devoir) de
//     regarder si un profil porte l'id de l'utilisateur — c'est le filet
//     anti-verrouillage du helper SQL, côté JS.
const ALLOWLIST_PROFILE_ID = [
  'app/(auth)/onboarding/page.js',
  'lib/studio-actif.js',
];
const ALLOWLIST_PROFIL_PAR_USER = [
  'app/(auth)/onboarding/page.js',
  'lib/studio-actif.js',
];

/**
 * Retire commentaires et chaînes de doc avant de chercher. Un ratchet qui se
 * déclenche sur sa propre documentation (« ne jamais écrire .eq('profile_id',
 * user.id) ») apprend à tout le monde à l'ignorer — c'est la pire chose qui
 * puisse lui arriver.
 */
function sansCommentaires(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
}

function fichiersJs(dossier, acc = []) {
  for (const entree of readdirSync(dossier)) {
    if (entree === 'node_modules' || entree === '.next') continue;
    const p = join(dossier, entree);
    if (statSync(p).isDirectory()) fichiersJs(p, acc);
    else if (/\.jsx?$/.test(entree)) acc.push(p);
  }
  return acc;
}

const TOUS = DOSSIERS.flatMap(d => fichiersJs(join(RACINE, d)))
  .map(p => ({ rel: p.replace(RACINE + '\\', '').replace(RACINE + '/', '').split('\\').join('/'), src: sansCommentaires(readFileSync(p, 'utf8')) }));

test.describe('Ratchet — le studio actif, jamais l\'utilisateur', () => {
  test('aucun filtre ni insert `profile_id = user.id` (allowlist VIDE)', () => {
    const motif = /profile_id['"]?\s*[,:]\s*(user\.id|userId)\b/;
    const coupables = TOUS
      .filter(f => motif.test(f.src))
      .map(f => f.rel)
      .filter(rel => !ALLOWLIST_PROFILE_ID.includes(rel));
    expect(coupables, `Utilise le studio actif : \`studioId\` (auth.studioId côté route, useStudioId() côté navigateur).\nFichiers : ${coupables.join(', ')}`).toEqual([]);
  });

  test('le profil chargé est celui du STUDIO, pas de la personne', () => {
    // `.from('profiles')…eq('id', user.id)` = « mon profil », ce qui redevient
    // faux dès qu'une prof est invitée ailleurs.
    const coupables = TOUS
      .filter(f => /from\(['"]profiles['"]\)[\s\S]{0,200}?eq\(['"]id['"],\s*user\.id\s*\)/.test(f.src))
      .map(f => f.rel)
      .filter(rel => !ALLOWLIST_PROFIL_PAR_USER.includes(rel));
    expect(coupables, `Charge le profil du studio : .eq('id', studioId).\nFichiers : ${coupables.join(', ')}`).toEqual([]);
  });

  test('l\'allowlist ne peut que rétrécir', () => {
    expect(ALLOWLIST_PROFILE_ID.length).toBeLessThanOrEqual(2);
    expect(ALLOWLIST_PROFIL_PAR_USER.length).toBeLessThanOrEqual(2);
  });
});

// ── Les règles pures d'appartenance ────────────────────────────────────────

const membre = (o = {}) => ({ role: 'prof', statut: 'actif', permissions: {}, ...o });

test.describe('peut — le miroir exact de mes_studios_staff(p_perm) en SQL', () => {
  test('le propriétaire peut tout, sans rien avoir coché', () => {
    const p = membre({ role: 'proprietaire' });
    for (const cle of CLES_PERMISSIONS) expect(peut(p, cle)).toBe(true);
    expect(estProprietaire(p)).toBe(true);
  });

  test('un membre ne peut que ce qui est coché', () => {
    const m = membre({ permissions: { pointer: true } });
    expect(peut(m, 'pointer')).toBe(true);
    expect(peut(m, 'argent_voir')).toBe(false);
    expect(peut(m, 'equipe_gerer')).toBe(false);
  });

  test('LE test qui compte : révoquer ferme TOUT, matrice ou pas', () => {
    // Sinon révoquer dépendrait d'un nettoyage du jsonb — et un nettoyage qui
    // échoue laisserait un accès ouvert sans que personne ne le voie.
    const revoque = membre({ role: 'admin', statut: 'revoque', permissions: PRESETS.admin });
    for (const cle of CLES_PERMISSIONS) expect(peut(revoque, cle)).toBe(false);
    // Y compris un propriétaire dont la ligne serait révoquée.
    expect(peut(membre({ role: 'proprietaire', statut: 'revoque' }), 'pointer')).toBe(false);
    // Et une invitation pas encore acceptée n'ouvre rien.
    expect(peut(membre({ statut: 'invite', permissions: { pointer: true } }), 'pointer')).toBe(false);
  });

  test('une permission inconnue est refusée, jamais accordée par typo', () => {
    const admin = membre({ role: 'admin', permissions: PRESETS.admin });
    expect(peut(admin, 'pointerr')).toBe(false);
    expect(peut(admin, '')).toBe(false);
    expect(peut(admin, null)).toBe(false);
  });

  test('ni membre ni statut : rien', () => {
    expect(peut(null, 'pointer')).toBe(false);
    expect(peut(undefined, 'pointer')).toBe(false);
    expect(estMembreActif(null)).toBe(false);
  });
});

test.describe('la matrice — SQL et JS doivent parler la même langue', () => {
  test('les trois permissions câblées dans la RLS sont marquées comme telles', () => {
    // migrations-v101 appelle mes_studios_staff('argent_voir' | 'messagerie' |
    // 'parametres'). Renommer une de ces clés ici sans migration ferait dire
    // deux choses différentes à l'écran et à la base — et la base gagnerait.
    const dansRls = PERMISSIONS.filter(p => p.rls).map(p => p.cle).sort();
    expect(dansRls).toEqual(['argent_voir', 'messagerie', 'parametres']);
  });

  test('chaque permission a une clé, un libellé et une aide en français', () => {
    for (const p of PERMISSIONS) {
      expect(p.cle).toMatch(/^[a-z_]+$/);
      expect(p.label.length).toBeGreaterThan(3);
      expect(p.aide.length).toBeGreaterThan(5);
    }
    expect(new Set(CLES_PERMISSIONS).size).toBe(CLES_PERMISSIONS.length);
  });

  test('le préréglage « Prof » est ÉTROIT : ni argent, ni messagerie, ni réglages', () => {
    // Un droit qui manque se demande ; un droit de trop ne se voit pas.
    expect(PRESETS.prof.argent_voir).toBeFalsy();
    expect(PRESETS.prof.argent_gerer).toBeFalsy();
    expect(PRESETS.prof.messagerie).toBeFalsy();
    expect(PRESETS.prof.parametres).toBeFalsy();
    expect(PRESETS.prof.equipe_gerer).toBeFalsy();
    expect(PRESETS.prof.pointer).toBe(true);
  });

  test('le préréglage « Admin » a tout', () => {
    for (const cle of CLES_PERMISSIONS) expect(PRESETS.admin[cle]).toBe(true);
  });

  test('permissionsParDefaut suit le rôle', () => {
    expect(permissionsParDefaut('prof').pointer).toBe(true);
    expect(permissionsParDefaut('prof').argent_voir).toBeUndefined();
    expect(permissionsParDefaut('admin').equipe_gerer).toBe(true);
    expect(permissionsParDefaut('proprietaire').equipe_gerer).toBe(true);
    expect(permissionsParDefaut('nimporte quoi').pointer).toBe(true); // retombe sur prof
  });
});

test.describe('sanitize — on nettoie à l\'écriture, on ne devine pas à la lecture', () => {
  test('les clés inventées et les valeurs douteuses sont jetées', () => {
    expect(sanitizePermissions({ pointer: true, inventee: true, argent_voir: 'oui' }))
      .toEqual({ pointer: true });
    expect(sanitizePermissions(null)).toEqual({});
    expect(sanitizePermissions('pointer')).toEqual({});
    expect(sanitizePermissions({ pointer: false })).toEqual({});
  });

  test('`proprietaire` ne s\'obtient JAMAIS par une entrée libre', () => {
    // Il n'y a qu'un propriétaire : celui qui a créé le compte.
    expect(sanitizeRole('proprietaire')).toBe('prof');
    expect(sanitizeRole('admin')).toBe('admin');
    expect(sanitizeRole('root')).toBe('prof');
    expect(sanitizeRole(null)).toBe('prof');
    expect(ROLES).toEqual(['proprietaire', 'admin', 'prof']);
  });
});

test.describe('libellés — lisibles par une prof, pas par un développeur', () => {
  test('rôles et statuts', () => {
    expect(labelRole('proprietaire')).toBe('Propriétaire');
    expect(labelRole('admin')).toBe('Admin');
    expect(labelRole('prof')).toBe('Prof');
    expect(labelStatut('actif')).toBe('Actif');
    expect(labelStatut('invite')).toBe('Invitée');
    expect(labelStatut('revoque')).toBe('Retirée');
  });

  test('le résumé des droits ne récite pas une liste de neuf items', () => {
    expect(resumeDroits(membre({ role: 'proprietaire' }))).toBe('Tous les droits');
    expect(resumeDroits(membre({ permissions: {} }))).toBe('Aucun droit');
    expect(resumeDroits(membre({ role: 'admin', permissions: PRESETS.admin }))).toBe('Tous les droits');
    expect(resumeDroits(membre({ permissions: { pointer: true } }))).toBe('Pointer les séances');
  });
});

test('la portée de pointage a son vocabulaire, en attendant cours.intervenant_id', () => {
  // Décision Colin 2026-08-25 : c'est un choix PAR MEMBRE. Le vocabulaire est
  // posé maintenant pour que SQL, routes et écrans le partagent ; la mise en
  // œuvre attend le lot 3 (sans intervenant, « les siens » ne veut rien dire).
  expect(PORTEES_POINTAGE).toEqual(['tous', 'miens']);
  expect(PORTEES_POINTAGE).toContain(PORTEE_POINTAGE_DEFAUT);
});
