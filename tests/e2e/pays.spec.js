// ═══════════════════════════════════════════════════════════════════════════
// Verrou CI — le pays d'un studio (v105, 2026-08-25).
//
// Déclencheur : Melyflow, prof de yoga à Genly (Belgique). « La fonction
// facturation n'est pas adaptée pour moi. » Elle n'était pas bloquée, elle
// était mal accueillie : l'app lui affichait « SIRET : 14 chiffres » en rouge
// et imprimait « SIRET » sur ses factures.
//
// Ce qu'on ne laisse pas glisser, dans l'ordre de gravité :
//   1. AUCUNE mention fiscale n'est inventée hors de France. Une mention
//      fausse sur une facture engage la prof, pas nous.
//   2. Un pays inconnu retombe sur la France : c'est l'état de 100 % des
//      comptes existants, et le seul défaut sûr.
//   3. Une validation d'identifiant ne BLOQUE jamais : elle signale. Une prof
//      qui a son numéro sous les yeux ne doit pas être arrêtée par notre
//      arithmétique.
//   4. Le bloc de déclaration ne s'allume QU'EN France : ailleurs une caisse
//      appelle les cotisations, et proposer une déclaration serait inventer un
//      geste qui n'existe pas.
// ═══════════════════════════════════════════════════════════════════════════
import { test, expect } from '@playwright/test';
import {
  PAYS, CODES_PAYS, PAYS_DEFAUT, paysDe, estFrance,
  validerIdentifiant, formaterIdentifiant, labelIdentifiant,
  aDeclarationAutomatisable, aLivreRecettes, aApisLocales, aVacancesScolaires,
  mentionParDefaut, mentionSuggeree,
} from '../../lib/pays.js';

test.describe('le catalogue — trois pays servis, et pas un de plus', () => {
  test('France, Belgique, Luxembourg', () => {
    expect(CODES_PAYS.sort()).toEqual(['BE', 'FR', 'LU']);
    expect(PAYS_DEFAUT).toBe('FR');
  });

  test("la Suisse est ABSENTE, volontairement : le franc est un chantier à part", () => {
    // 245 « € » écrits en dur dans des textes, des emails et des PDF.
    // L'ouvrir ici donnerait des montants faux, ce qui est pire que rien.
    expect(CODES_PAYS).not.toContain('CH');
  });

  test('tous les pays servis sont en euro (sinon le catalogue ment)', () => {
    for (const c of CODES_PAYS) expect(PAYS[c].devise, c).toBe('EUR');
  });

  test('chaque pays dit son identifiant, son exemple et son aide', () => {
    for (const c of CODES_PAYS) {
      const p = PAYS[c];
      expect(p.identifiant.label.length, c).toBeGreaterThan(3);
      expect(p.identifiant.exemple.length, c).toBeGreaterThan(3);
      expect(p.identifiant.aide.length, c).toBeGreaterThan(10);
      // L'exemple doit passer sa propre validation : un exemple invalide
      // apprendrait un mauvais format à la prof.
      expect(validerIdentifiant(c, p.identifiant.exemple).valide, `exemple ${c}`).toBe(true);
    }
  });
});

test.describe('paysDe — un défaut sûr, jamais une surprise', () => {
  test('un pays inconnu, vide ou absent retombe sur la France', () => {
    expect(paysDe(null).code).toBe('FR');
    expect(paysDe({}).code).toBe('FR');
    expect(paysDe('ZZ').code).toBe('FR');
    expect(paysDe({ pays: null }).code).toBe('FR');
    expect(estFrance({})).toBe(true);
  });

  test('la casse ne compte pas', () => {
    expect(paysDe('be').code).toBe('BE');
    expect(paysDe({ pays: 'Be' }).code).toBe('BE');
  });
});

test.describe('identifiants — on signale, on ne bloque jamais', () => {
  test('un SIRET réel passe, un faux est signalé', () => {
    expect(validerIdentifiant('FR', '73282932000074').valide).toBe(true);
    expect(validerIdentifiant('FR', '732 829 320 00074').valide).toBe(true);
    expect(validerIdentifiant('FR', '12345678900012').valide).toBe(false);
    expect(validerIdentifiant('FR', '123').message).toContain('14 chiffres');
  });

  test("LE test de Melyflow : un numéro d'entreprise belge réel est ACCEPTÉ", () => {
    // 0202.239.951 — un numéro belge public. Avant v105, l'app lui répondait
    // « SIRET : 14 chiffres » en rouge.
    expect(validerIdentifiant('BE', '0202239951').valide).toBe(true);
    expect(validerIdentifiant('BE', '0202.239.951').valide).toBe(true);
    expect(validerIdentifiant('BE', '0123456749').valide).toBe(true);
    // Et un SIRET français ne passe évidemment pas pour un numéro belge.
    expect(validerIdentifiant('BE', '73282932000074').valide).toBe(false);
  });

  test('une clé de contrôle fausse est SIGNALÉE, avec une phrase utile', () => {
    const r = validerIdentifiant('BE', '0202239950');
    expect(r.valide).toBe(false);
    expect(r.message).toMatch(/Vérifie/);
    expect(r.message).not.toMatch(/error|invalid|null/i);
  });

  test('un identifiant VIDE reste valide : il est optionnel partout', () => {
    // Sans lui, l'élève télécharge un reçu simple. C'était vrai avant v105,
    // ça doit le rester : personne n'est bloqué faute de numéro.
    for (const c of CODES_PAYS) {
      expect(validerIdentifiant(c, '').valide, c).toBe(true);
      expect(validerIdentifiant(c, null).valide, c).toBe(true);
    }
  });

  test('le Luxembourg accepte un format libre : on ne prétend pas connaître sa règle', () => {
    expect(validerIdentifiant('LU', 'B123456').valide).toBe(true);
    expect(validerIdentifiant('LU', 'AB').valide).toBe(false);
  });

  test('la mise en forme respecte chaque pays, et ne mutile jamais', () => {
    expect(formaterIdentifiant('FR', '73282932000074')).toBe('732 829 320 00074');
    expect(formaterIdentifiant('BE', '0202239951')).toBe('0202.239.951');
    expect(formaterIdentifiant('LU', 'B123456')).toBe('B123456');
    // Une valeur qu'on ne sait pas mettre en forme ressort telle quelle.
    expect(formaterIdentifiant('FR', 'pas-un-numero')).toBe('pas-un-numero');
    expect(formaterIdentifiant('BE', '')).toBe('');
  });

  test('le libellé imprimé sur la facture suit le pays', () => {
    expect(labelIdentifiant('FR')).toBe('SIRET');
    expect(labelIdentifiant('BE')).toBe("Numéro d'entreprise");
    expect(labelIdentifiant('LU')).toBe('Numéro RCS');
    expect(labelIdentifiant('ZZ')).toBe('SIRET'); // défaut sûr
  });
});

test.describe('mentions fiscales — on suggère, on n\'invente pas', () => {
  test('LE test qui compte : AUCUNE mention par défaut hors de France', () => {
    // Imprimer une mention devinée engagerait la responsabilité de la prof sur
    // un document qu'elle n'a pas relu. On préfère un pied de facture vide.
    expect(mentionParDefaut('FR')).toContain('293 B');
    expect(mentionParDefaut('BE')).toBeNull();
    expect(mentionParDefaut('LU')).toBeNull();
  });

  test('une suggestion existe quand même, pour l\'aider à remplir', () => {
    expect(mentionSuggeree('BE').length).toBeGreaterThan(10);
    expect(mentionSuggeree('LU').length).toBeGreaterThan(10);
    // En France, la suggestion EST le défaut.
    expect(mentionSuggeree('FR')).toBe(mentionParDefaut('FR'));
  });

  test('aucune suggestion ne cite un article de loi français hors de France', () => {
    for (const c of ['BE', 'LU']) {
      expect(mentionSuggeree(c), c).not.toMatch(/CGI|293 B|URSSAF/);
    }
  });
});

test.describe('ce qui s\'éteint hors de France', () => {
  test('la déclaration auto n\'existe QU\'EN France', () => {
    // Ailleurs, une caisse appelle les cotisations sur une base qu'elle
    // connaît : proposer une déclaration serait inventer un geste.
    expect(aDeclarationAutomatisable('FR')).toBe(true);
    expect(aDeclarationAutomatisable('BE')).toBe(false);
    expect(aDeclarationAutomatisable('LU')).toBe(false);
  });

  test('livre des recettes, APIs locales et vacances scolaires : France seule', () => {
    for (const f of [aLivreRecettes, aApisLocales, aVacancesScolaires]) {
      expect(f('FR')).toBe(true);
      expect(f('BE')).toBe(false);
      expect(f('LU')).toBe(false);
    }
  });

  test('chaque pays nomme QUI appelle ses cotisations', () => {
    // Pour pouvoir l'écrire à l'écran plutôt que de laisser un vide.
    for (const c of CODES_PAYS) {
      expect(PAYS[c].declarationSociale?.nom.length, c).toBeGreaterThan(3);
    }
  });
});
