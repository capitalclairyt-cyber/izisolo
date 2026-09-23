// ═══════════════════════════════════════════════════════════════════════════
// Verrou CI — la fenêtre de la page publique et la suite à la demande
// (2026-09-23, retour Manon / Soleya : ses élèves lisaient « Aucun cours cette
// semaine » sur une semaine de novembre où huit séances les attendaient).
//
// Ce qu'on ne laisse pas glisser :
//   1. Les règles de fenêtre sont PURES et exactes : ce qu'il manque pour une
//      semaine, jamais ce qu'on a déjà, jamais au-delà d'un an.
//   2. La route ne sert jamais plus d'un mois, jamais une plage inversée ou
//      passée, et ramène une plage qui commence hier à aujourd'hui (une élève
//      qui recule d'une semaine ne doit pas recevoir une erreur).
//   3. Une plage vide est CHARGÉE : « Aucun cours cette semaine » ne se dit
//      qu'après la réponse.
//   4. `lireIntervenantes` lit par lots : un `.in()` PostgREST tombe entre 350
//      et 400 ids (mesuré), et l'échec rendait une carte vide en silence.
//   5. Aucune limite de lignes ne coupe plus la fenêtre de la page, et la
//      page comme la route passent par la même chaîne (le service).
// ═══════════════════════════════════════════════════════════════════════════
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  FENETRE_JOURS, HORIZON_JOURS, PLAGE_MAX_JOURS, PAS_LISTE_JOURS,
  ajouterJours, joursEntre, dateIsoValide, finFenetre, finHorizon,
  validerPlage, plageManquante, plageSuivante, semaineHorsHorizon,
  fusionnerSeances, cleCachePlage,
} from '../../lib/portail-fenetre.js';
import { lireIntervenantes, LOT_IDS } from '../../lib/intervenante.js';

const RACINE = process.cwd();
const lire = (p) => readFileSync(join(RACINE, p), 'utf8');
const AUJ = '2026-09-23';

test.describe('la fenêtre : les dates', () => {
  test('constantes : 60 jours chargés, un an devant, un mois par appel', () => {
    expect(FENETRE_JOURS).toBe(60);
    expect(HORIZON_JOURS).toBe(366);
    expect(PLAGE_MAX_JOURS).toBe(31);
    expect(PAS_LISTE_JOURS).toBe(28);
  });

  test('ajouterJours et joursEntre ne dérivent pas au changement d\'heure', () => {
    expect(ajouterJours('2026-10-24', 1)).toBe('2026-10-25'); // nuit du passage à l'heure d'hiver
    expect(ajouterJours('2026-03-28', 1)).toBe('2026-03-29');
    expect(ajouterJours('2026-12-31', 1)).toBe('2027-01-01');
    expect(joursEntre('2026-10-24', '2026-10-25')).toBe(1);
    expect(joursEntre(AUJ, ajouterJours(AUJ, 366))).toBe(366);
  });

  test('la fenêtre de Soleya : le 23 septembre, la page s\'arrête au 22 novembre', () => {
    expect(finFenetre(AUJ)).toBe('2026-11-22');
    expect(finHorizon(AUJ)).toBe('2027-09-24');
  });

  test('dateIsoValide refuse ce qui n\'existe pas', () => {
    expect(dateIsoValide('2026-02-31')).toBe(false);
    expect(dateIsoValide('2026-9-3')).toBe(false);
    expect(dateIsoValide('')).toBe(false);
    expect(dateIsoValide(null)).toBe(false);
    expect(dateIsoValide('2026-11-23')).toBe(true);
  });
});

test.describe('la route : validerPlage', () => {
  test('une semaine de novembre passe telle quelle', () => {
    expect(validerPlage('2026-11-23', '2026-11-29', AUJ)).toEqual({ ok: true, de: '2026-11-23', a: '2026-11-29' });
  });
  test('31 jours passent, 32 sont refusés', () => {
    expect(validerPlage('2026-11-23', '2026-12-23', AUJ).ok).toBe(true);
    expect(validerPlage('2026-11-23', '2026-12-24', AUJ)).toEqual({ ok: false, raison: 'PLAGE_TROP_LONGUE' });
  });
  test('inversée, invalide, passée, hors horizon', () => {
    expect(validerPlage('2026-11-29', '2026-11-23', AUJ).raison).toBe('PLAGE_INVERSEE');
    expect(validerPlage('2026-11-31', '2026-12-02', AUJ).raison).toBe('DATE_INVALIDE');
    expect(validerPlage('2026-09-14', '2026-09-20', AUJ).raison).toBe('PLAGE_PASSEE');
    expect(validerPlage('2027-09-27', '2027-10-03', AUJ).raison).toBe('HORS_HORIZON');
  });
  test('une plage à cheval sur hier est ramenée à aujourd\'hui, et bornée à l\'horizon', () => {
    expect(validerPlage('2026-09-21', '2026-09-27', AUJ)).toEqual({ ok: true, de: AUJ, a: '2026-09-27' });
    expect(validerPlage('2027-09-20', '2027-09-26', AUJ)).toEqual({ ok: true, de: '2027-09-20', a: '2027-09-24' });
  });
});

test.describe('le navigateur : ce qu\'il manque', () => {
  const chargeJusqu = '2026-11-22';
  test('une semaine déjà chargée ne demande rien', () => {
    expect(plageManquante('2026-11-16', '2026-11-22', chargeJusqu, AUJ)).toBeNull();
    expect(plageManquante('2026-09-21', '2026-09-27', chargeJusqu, AUJ)).toBeNull();
  });
  test('la première semaine hors fenêtre demande exactement la semaine', () => {
    expect(plageManquante('2026-11-23', '2026-11-29', chargeJusqu, AUJ)).toEqual({ de: '2026-11-23', a: '2026-11-29' });
  });
  test('une semaine à cheval ne redemande que ce qui manque', () => {
    expect(plageManquante('2026-11-16', '2026-11-22', '2026-11-19', AUJ)).toEqual({ de: '2026-11-20', a: '2026-11-22' });
  });
  test('au-delà de l\'horizon : rien, ou bornée', () => {
    expect(plageManquante('2027-09-27', '2027-10-03', '2027-09-24', AUJ)).toBeNull();
    expect(plageManquante('2027-09-20', '2027-09-26', '2027-09-19', AUJ)).toEqual({ de: '2027-09-20', a: '2027-09-24' });
    expect(semaineHorsHorizon('2027-09-27', AUJ)).toBe(true);
    expect(semaineHorsHorizon('2027-09-20', AUJ)).toBe(false);
  });
  test('la liste avance de 28 jours, puis s\'arrête à l\'horizon', () => {
    expect(plageSuivante(chargeJusqu, AUJ)).toEqual({ de: '2026-11-23', a: '2026-12-20' });
    expect(plageSuivante('2027-09-10', AUJ)).toEqual({ de: '2027-09-11', a: '2027-09-24' });
    expect(plageSuivante('2027-09-24', AUJ)).toBeNull();
  });
});

test.describe('fusionner ce qu\'on reçoit', () => {
  test('aucun doublon, la version reçue gagne, trié par date puis heure', () => {
    const avant = [
      { id: 'a', date: '2026-11-23', heure: '09:10:00', nbInscrits: 2 },
      { id: 'b', date: '2026-11-24', heure: '19:00:00', nbInscrits: 0 },
    ];
    const recu = [
      { id: 'a', date: '2026-11-23', heure: '09:10:00', nbInscrits: 5 },
      { id: 'c', date: '2026-11-23', heure: '12:15:00', nbInscrits: 1 },
    ];
    const f = fusionnerSeances(avant, recu);
    expect(f.map(c => c.id)).toEqual(['a', 'c', 'b']);
    expect(f[0].nbInscrits).toBe(5);
    expect(fusionnerSeances([], [])).toEqual([]);
    expect(fusionnerSeances(null, [{ id: 'x', date: '2026-01-01' }]).length).toBe(1);
  });
  test('la clé de cache ne mêle pas deux studios ni deux plages', () => {
    expect(cleCachePlage('soleya', '2026-11-23', '2026-11-29')).not.toBe(cleCachePlage('soleya', '2026-11-30', '2026-12-06'));
    expect(cleCachePlage('soleya', '2026-11-23', '2026-11-29')).not.toBe(cleCachePlage('maude-yoga', '2026-11-23', '2026-11-29'));
  });
});

test.describe('lireIntervenantes lit par lots', () => {
  const fauxClient = (tailles, reponse) => ({
    from() {
      return {
        select() {
          return {
            in(_col, ids) {
              tailles.push(ids.length);
              return Promise.resolve({ data: reponse(ids), error: null });
            },
          };
        },
      };
    },
  });
  test('400 ids partent en lots de 120 au plus, et tout revient', async () => {
    const ids = Array.from({ length: 400 }, (_, i) => `id-${i}`);
    const tailles = [];
    const out = await lireIntervenantes(fauxClient(tailles, (lot) => lot.map(id => ({ id, intervenant_id: 'm-' + id }))), ids);
    expect(Math.max(...tailles)).toBeLessThanOrEqual(LOT_IDS);
    expect(tailles.reduce((a, b) => a + b, 0)).toBe(400);
    expect(Object.keys(out).length).toBe(400);
    expect(out['id-399']).toBe('m-id-399');
  });
  test('les doublons d\'ids ne partent qu\'une fois, un id sans intervenante n\'entre pas', async () => {
    const tailles = [];
    const out = await lireIntervenantes(fauxClient(tailles, (lot) => lot.map(id => ({ id, intervenant_id: id === 'a' ? 'm' : null }))), ['a', 'a', 'b']);
    expect(tailles).toEqual([2]);
    expect(out).toEqual({ a: 'm' });
  });
});

test.describe('les surfaces', () => {
  test('la page publique et la route passent par le service, sans limite de lignes', () => {
    const page = lire('app/p/[studioSlug]/page.js');
    expect(page).toContain("from '@/lib/portail-seances-service'");
    expect(page).not.toMatch(/\.limit\(240\)/);
    expect(page).toContain('fenetreFin');
    const route = lire('app/api/portail/[studioSlug]/seances/route.js');
    expect(route).toContain('validerPlage');
    expect(route).toContain('filterCoursVisibles');
    expect(route).toContain('rateLimit');
    const service = lire('lib/portail-seances-service.js');
    expect(service).toContain('.range(from, from + PAGE - 1)');
  });
  test('le composant dit « chargement » avant de dire « aucun », et borne ▶ à l\'horizon', () => {
    const home = lire('app/p/[studioSlug]/PortailHome.js');
    expect(home).toContain('portail-semaine-chargement');
    expect(home).toContain('portail-semaine-vide');
    expect(home).toContain('portail-semaine-erreur');
    expect(home).toContain('portail-liste-plus');
    expect(home).toContain('disabled={semaineSuivanteHorsHorizon}');
    // Le spinner vit sur un span NATIF : une classe styled-jsx scopée sur un composant ne matche jamais (§12).
    expect(home).not.toMatch(/<Loader[^>]*className="portail-spin"/);
  });
  test('le centre d\'aide en parle', () => {
    expect(lire('content/faq-support.js')).toContain('ne voient rien au-delà de deux mois');
    expect(lire('components/portail/AideEleve.js')).toContain('Je ne vois pas les cours du mois prochain');
    expect(lire('app/(dashboard)/aide/page.js')).toContain('Voir les semaines suivantes');
  });
});
