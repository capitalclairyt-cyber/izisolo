// ═══════════════════════════════════════════════════════════════════════════
// Verrou CI — les vitrines, les portails croisés et le hub élève (lot 5
// Associations & Studios, v115, 2026-09-13).
//
// Ce qu'on ne laisse pas glisser :
//   1. Pont 5 : rien n'est relié sans le choix de la personne (`portail_croise`),
//      jamais vers un portail fermé, jamais vers sa propre page ; le lien
//      « Sa page » exige un compte ET son propre portail ouvert.
//   2. Pont 6 : un studio par fiche, jamais une fiche archivée, jamais un
//      studio sans slug ; les séances passées, annulées ou déclinées ne
//      figurent pas dans « mes prochaines séances ».
//   3. Les deux vitrines sont publiques (proxy) et dans le sitemap, sans
//      chiffre inventé ni « 14 jours ».
//   4. La migration v115 dit la même chose que le code (relecture).
// ═══════════════════════════════════════════════════════════════════════════
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { portailOuvert, structuresCitees, pageDeLIntervenante, phraseAilleurs, studiosDeLEleve, prochainesSeancesToutesStructures } from '../../lib/ponts.js';

const ASSO = { id: 'A', studio_nom: 'Yoga pour tous', studio_slug: 'yoga-pour-tous', portail_actif: true, type_structure: 'association' };
const STUDIO = { id: 'S', studio_nom: 'Studio Centre', studio_slug: 'studio-centre', portail_actif: true, type_structure: 'studio' };
const FERME = { id: 'F', studio_nom: 'Fermé', studio_slug: 'ferme', portail_actif: false, type_structure: 'studio' };
const LEA = { id: 'L', studio_nom: 'Léa Yoga', studio_slug: 'lea-yoga', portail_actif: true, type_structure: 'solo' };

test.describe('pont 5 : les portails qui se citent', () => {
  test('un portail est ouvert avec un slug et portail_actif non faux', () => {
    expect(portailOuvert(ASSO)).toBe(true);
    expect(portailOuvert(FERME)).toBe(false);
    expect(portailOuvert({ id: 'x', portail_actif: true })).toBe(false);
    expect(portailOuvert(null)).toBe(false);
  });
  test('sur SA page : seulement les appartenances reliées, actives, ouvertes, jamais la sienne, triées', () => {
    const app = [
      { profile_id: 'S', statut: 'actif', portail_croise: true },
      { profile_id: 'A', statut: 'actif', portail_croise: true },
      { profile_id: 'F', statut: 'actif', portail_croise: true },
      { profile_id: 'L', statut: 'actif', portail_croise: true },
      { profile_id: 'S', statut: 'actif', portail_croise: true },
    ];
    const l = structuresCitees(app, [ASSO, STUDIO, FERME, LEA], 'L');
    expect(l.map(s => s.slug)).toEqual(['studio-centre', 'yoga-pour-tous']);
    expect(structuresCitees([{ profile_id: 'A', statut: 'actif', portail_croise: false }], [ASSO], 'L')).toEqual([]);
    expect(structuresCitees([{ profile_id: 'A', statut: 'revoque', portail_croise: true }], [ASSO], 'L')).toEqual([]);
    expect(phraseAilleurs(l)).toBe('Je donne aussi des cours à Studio Centre et Yoga pour tous');
    expect(phraseAilleurs(l.slice(0, 1))).toBe('Je donne aussi des cours à Studio Centre');
    expect(phraseAilleurs([])).toBeNull();
  });
  test('sur la page de la STRUCTURE : « Sa page » exige le choix, un compte et son portail ouvert', () => {
    expect(pageDeLIntervenante({ portail_croise: true, auth_user_id: 'L' }, LEA)).toEqual({ slug: 'lea-yoga', nom: 'Léa Yoga' });
    expect(pageDeLIntervenante({ portail_croise: false, auth_user_id: 'L' }, LEA)).toBeNull();
    expect(pageDeLIntervenante({ portail_croise: true, auth_user_id: null }, LEA)).toBeNull();
    expect(pageDeLIntervenante({ portail_croise: true, auth_user_id: 'L' }, { ...LEA, portail_actif: false })).toBeNull();
    expect(pageDeLIntervenante({ portail_croise: true, auth_user_id: 'L' }, { ...LEA, id: 'autre' })).toBeNull();
  });
});

test.describe('pont 6 : le hub de l\'élève', () => {
  const fiches = [
    { id: 'f1', profile_id: 'A', statut: 'actif' },
    { id: 'f2', profile_id: 'S', statut: 'actif' },
    { id: 'f3', profile_id: 'S', statut: 'actif' },
    { id: 'f4', profile_id: 'F', statut: 'archive' },
    { id: 'f5', profile_id: 'inconnu', statut: 'actif' },
  ];
  test('un studio par fiche, jamais archivée, jamais sans slug, trié par nom', () => {
    const s = studiosDeLEleve(fiches, [ASSO, STUDIO, FERME]);
    expect(s.map(x => x.slug)).toEqual(['studio-centre', 'yoga-pour-tous']);
    expect(s[0].fiche_id).toBe('f2');
    expect(s[0].portail_ouvert).toBe(true);
  });
  test('les prochaines séances toutes structures, triées, sans passée, annulée ni déclinée', () => {
    const studios = studiosDeLEleve(fiches, [ASSO, STUDIO]);
    const pres = [
      { statut_pointage: 'inscrit', cours: { id: 'c1', nom: 'Hatha', date: '2026-10-02', heure: '18:00:00', profile_id: 'A', lieu: 'Salle' } },
      { statut_pointage: 'inscrit', cours: { id: 'c2', nom: 'Yin', date: '2026-10-01', heure: '19:00:00', profile_id: 'S', format: 'visio' } },
      { statut_pointage: 'inscrit', cours: { id: 'c3', nom: 'Passée', date: '2026-09-01', heure: '10:00', profile_id: 'S' } },
      { statut_pointage: 'inscrit', cours: { id: 'c4', nom: 'Annulée', date: '2026-10-03', heure: '10:00', profile_id: 'S', est_annule: true } },
      { statut_pointage: 'declinee', cours: { id: 'c5', nom: 'Déclinée', date: '2026-10-03', heure: '10:00', profile_id: 'S' } },
      { statut_pointage: 'inscrit', cours: { id: 'c6', nom: 'Ailleurs', date: '2026-10-03', heure: '10:00', profile_id: 'Z' } },
    ];
    const l = prochainesSeancesToutesStructures(pres, studios, '2026-09-13');
    expect(l.map(x => x.id)).toEqual(['c2', 'c1']);
    expect(l[0]).toMatchObject({ studio_nom: 'Studio Centre', studio_slug: 'studio-centre', heure: '19:00', en_ligne: true });
    expect(prochainesSeancesToutesStructures(pres, studios, '2026-09-13', { max: 1 }).length).toBe(1);
  });
});

test.describe('les vitrines sont publiques et sincères', () => {
  test('/associations et /studios : proxy (public + marketing), sitemap', () => {
    const proxy = readFileSync('proxy.js', 'utf8');
    const sitemap = readFileSync('app/sitemap.js', 'utf8');
    for (const p of ['/associations', '/studios']) {
      expect(proxy).toContain(`'${p}'`);
      expect(sitemap).toContain(`path: '${p}'`);
    }
    const src = readFileSync('components/landing/Structures.js', 'utf8');
    expect(src).not.toMatch(/14 jours/);
    expect(src).not.toMatch(/\d+\s*(associations|studios) (nous|font|utilisent)/i);
    // Les prix viennent de la grille (lib/constantes), jamais d'un littéral.
    expect(src).toContain('PLANS.asso.prix');
    expect(src).toContain('PLANS.studio.prix');
    expect(src).not.toMatch(/39 €|59 €/);
  });
  test('la migration v115 dit la même chose que le code', () => {
    const sql = readFileSync('migrations-v115-vitrines-ponts.sql', 'utf8');
    expect(sql).toContain('add column if not exists portail_croise boolean not null default false');
  });
});
