// ═══════════════════════════════════════════════════════════════════════════
// Verrou CI — « on crée ton studio » (v96, 2026-08-23, demande Colin). Spec
// Node pure (zéro navigateur, zéro serveur) : fige lib/demande-studio.js.
//
// Ce qui est verrouillé, et pourquoi :
//   • les longueurs : une chaîne trop longue ferait échouer l'insert contre
//     les CHECK de v96, donc PERDRE une prospecte. On tronque, on ne jette pas ;
//   • l'email de réponse réclame le planning, les tarifs, et la liste d'élèves
//     SANS OBLIGATION — c'est le canal identifié par lequel arrive la donnée
//     sensible qu'on refuse de collecter sur une page publique ;
//   • on ne redemande QUE ce qui manque : réclamer ce qu'elle vient d'écrire
//     donnerait l'impression que personne n'a lu ;
//   • zéro tiret quadratin (règle de rédaction maison).
// ═══════════════════════════════════════════════════════════════════════════
import { test, expect } from '@playwright/test';
import {
  sanitizeDemande, cequiManque, renderEmailAccuse, renderEmailInterne,
  ACTIVITES, STATUTS_DEMANDE, DELAI_HEURES,
} from '../../lib/demande-studio.js';

test.describe('sanitizeDemande — ce qui entre, et ce qu\'on refuse', () => {
  test('le minimum vital : un prénom et un email', () => {
    expect(sanitizeDemande({ prenom: 'Maude', email: 'maude@example.org' }).ok).toBe(true);
    expect(sanitizeDemande({ email: 'maude@example.org' }).ok).toBe(false);
    expect(sanitizeDemande({ prenom: 'Maude' }).ok).toBe(false);
    expect(sanitizeDemande({}).ok).toBe(false);
    expect(sanitizeDemande().ok).toBe(false);
  });

  test('un email difforme est refusé, avec une phrase qui explique', () => {
    const r = sanitizeDemande({ prenom: 'Maude', email: 'pas-un-email' });
    expect(r.ok).toBe(false);
    expect(r.erreur).toContain('email');
  });

  test('l\'email est normalisé en minuscules (il sert de clé de contact)', () => {
    expect(sanitizeDemande({ prenom: 'Maude', email: '  Maude@Example.ORG ' }).valeurs.email)
      .toBe('maude@example.org');
  });

  test('les champs trop longs sont TRONQUÉS, jamais rejetés', () => {
    // Un CHECK violé ferait perdre la demande. Une prospecte vaut mieux que
    // 4001 caractères de planning.
    const r = sanitizeDemande({
      prenom: 'M'.repeat(200), email: 'a@b.fr', planning: 'x'.repeat(9000),
    });
    expect(r.ok).toBe(true);
    expect(r.valeurs.prenom).toHaveLength(80);
    expect(r.valeurs.planning).toHaveLength(4000);
  });

  test('les champs vides deviennent null, pas des chaînes vides', () => {
    const { valeurs } = sanitizeDemande({ prenom: 'Maude', email: 'a@b.fr', ville: '   ' });
    expect(valeurs.ville).toBe(null);
    expect(valeurs.planning).toBe(null);
  });

  test('une activité hors liste retombe sur « Autre », jamais en base telle quelle', () => {
    expect(sanitizeDemande({ prenom: 'M', email: 'a@b.fr', activite: 'Yoga' }).valeurs.activite).toBe('Yoga');
    expect(sanitizeDemande({ prenom: 'M', email: 'a@b.fr', activite: 'Trapèze' }).valeurs.activite).toBe('Autre');
    expect(sanitizeDemande({ prenom: 'M', email: 'a@b.fr' }).valeurs.activite).toBe(null);
    expect(ACTIVITES).toContain('Yoga');
  });

  test('AUCUNE liste d\'élèves ne peut entrer par ce formulaire', () => {
    // Le refus est structurel : le sanitizer ne connaît pas ces champs, donc
    // rien ne peut atteindre la base même si le client les envoie.
    const { valeurs } = sanitizeDemande({
      prenom: 'M', email: 'a@b.fr',
      eleves: 'Julie;julie@example.org', csv: 'nom;email', liste_eleves: 'x',
    });
    expect(valeurs.eleves).toBeUndefined();
    expect(valeurs.csv).toBeUndefined();
    expect(valeurs.liste_eleves).toBeUndefined();
    expect(Object.keys(valeurs).sort()).toEqual([
      'activite', 'email', 'message', 'nom', 'offres', 'planning',
      'prenom', 'site_web', 'studio_nom', 'telephone', 'ville',
    ]);
  });
});

test.describe('cequiManque — ne réclamer que l\'utile', () => {
  test('tout fourni : rien à redemander', () => {
    expect(cequiManque({ planning: 'lundi 18h', offres: 'carnet 10' }))
      .toEqual({ planning: false, offres: false });
  });
  test('rien fourni : les deux à redemander', () => {
    expect(cequiManque({})).toEqual({ planning: true, offres: true });
  });
});

test.describe('renderEmailAccuse — le canal par lequel arrive la liste', () => {
  test('il annonce le délai et signe d\'un nom', () => {
    const { subject, html } = renderEmailAccuse({ prenom: 'Maude', studioNom: 'Yoga Doux' });
    expect(subject).toContain(String(DELAI_HEURES));
    expect(subject).toContain('Yoga Doux');
    expect(html).toContain('Bonjour Maude,');
    expect(html).toContain('Maude');
    expect(html).toContain('cofondatrice');
  });

  test('il réclame la liste d\'élèves ET dit qu\'elle est facultative', () => {
    const { html } = renderEmailAccuse({ prenom: 'Léa', manque: { planning: true, offres: true } });
    expect(html).toContain('liste d\'élèves');
    expect(html).toContain('pas obligatoire');
    // La promesse qui va avec : sans la liste, le studio se monte quand même.
    expect(html).toContain('on monte quand même ton studio');
  });

  test('il ne redemande PAS ce qui vient d\'être rempli', () => {
    const rempli = renderEmailAccuse({ prenom: 'Léa', manque: { planning: false, offres: false } }).html;
    expect(rempli).not.toContain('<strong>Ton planning</strong>');
    expect(rempli).not.toContain('<strong>Tes tarifs</strong>');
    // La liste, elle, est toujours proposée : on ne l'a jamais demandée avant.
    expect(rempli).toContain('liste d\'élèves');

    const vide = renderEmailAccuse({ prenom: 'Léa', manque: { planning: true, offres: true } }).html;
    expect(vide).toContain('<strong>Ton planning</strong>');
    expect(vide).toContain('<strong>Tes tarifs</strong>');
  });

  test('sans prénom, la formule reste correcte (pas de « Bonjour , »)', () => {
    expect(renderEmailAccuse({}).html).toContain('Bonjour,');
  });

  test('zéro tiret quadratin (règle de rédaction maison)', () => {
    expect(renderEmailAccuse({ prenom: 'Maude', manque: { planning: true, offres: true } }).html)
      .not.toContain('—');
  });
});

test.describe('renderEmailInterne — de quoi créer le studio sans rien redemander', () => {
  test('il porte les champs remplis et tait les vides', () => {
    const { subject, html } = renderEmailInterne({
      prenom: 'Léa', nom: 'Martin', email: 'lea@example.org',
      studio_nom: 'Yoga Doux', planning: 'Hatha lundi 18h',
    });
    expect(subject).toContain('Léa Martin');
    expect(html).toContain('lea@example.org');
    expect(html).toContain('Hatha lundi 18h');
    expect(html).not.toContain('Téléphone'); // absent : pas de ligne vide
    expect(html).toContain('/admin/demandes');
  });

  test('les retours à la ligne d\'un planning restent lisibles en HTML', () => {
    const { html } = renderEmailInterne({ prenom: 'L', email: 'a@b.fr', planning: 'lundi\nmardi' });
    expect(html).toContain('lundi<br>mardi');
  });
});

test.describe('les statuts de suivi', () => {
  test('les quatre états, et eux seuls (le CHECK de v96 les fige)', () => {
    expect(Object.keys(STATUTS_DEMANDE)).toEqual(['nouvelle', 'en_cours', 'creee', 'sans_suite']);
  });
});
