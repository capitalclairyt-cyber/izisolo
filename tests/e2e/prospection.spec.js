// Verrou CI — prospection à la main (v109, lib/prospection.js).
// Node pur, aucune DB, aucun navigateur.
import { test, expect } from '@playwright/test';
import {
  eligibleProspect, prenomDepuisNom, urlSite, gabaritEmail, validerTexte, rendreEmail,
  heureParisAujourdhui, statsProspection, relanceDue, SEUIL_ENVOIS, SOURCES,
} from '../../lib/prospection.js';
import { SOURCES_ECARTEES, sourceNommable } from '../../lib/prospection-sources.js';

const base = { nom: 'DURAND Léa', email: 'lea@example.org', ville: 'Nantes 44000', site: 'www.lea-yoga.fr', specialite: 'Yoga', source: 'annuaireduyoga.com' };

test.describe('eligibleProspect', () => {
  test('une prof avec site et source citable est éligible', () => {
    expect(eligibleProspect(base)).toEqual({ ok: true, raison: null });
  });
  test('sans site : écartée du tirage, mais acceptée à la main', () => {
    expect(eligibleProspect({ ...base, site: '' }).ok).toBe(false);
    expect(eligibleProspect({ ...base, site: '' }, { siteRequis: false }).ok).toBe(true);
  });
  test('les sources non citables ne sont jamais démarchées', () => {
    for (const s of Object.keys(SOURCES_ECARTEES)) {
      expect(sourceNommable(s)).toBe(false);
      expect(eligibleProspect({ ...base, source: s }).raison).toBe('source non citable');
    }
  });
  test('Suisse, écoles et lignes sales sont écartées avec leur raison', () => {
    expect(eligibleProspect({ ...base, ville: 'Genève' }).raison).toMatch(/Suisse/);
    expect(eligibleProspect({ ...base, specialite: 'Yoga (école)' }).raison).toBe('école');
    expect(eligibleProspect({ ...base, site: 'https://www.facebook.com/sharer/sharer.php?u=x' }).raison).toMatch(/réseau social/);
    expect(eligibleProspect({ ...base, nom: 'Professeur de Hatha Yoga' }).raison).toMatch(/générique/);
    expect(eligibleProspect({ ...base, email: 'pas-une-adresse' }).raison).toBe('adresse invalide');
  });
});

test.describe('prénom et site', () => {
  test('le prénom se retrouve dans « NOM Prénom » comme dans « Prénom NOM »', () => {
    expect(prenomDepuisNom('DURAND Léa')).toBe('Léa');
    expect(prenomDepuisNom('Léa DURAND')).toBe('Léa');
    expect(prenomDepuisNom('Anne-dominique DEFONTAINES')).toBe('Anne-Dominique');
    expect(prenomDepuisNom('DURAND Léa', 'Aurore')).toBe('Aurore');
    expect(prenomDepuisNom('')).toBe('');
  });
  test('urlSite normalise, y compris la ligne « https://http//… » de la base', () => {
    expect(urlSite('www.lea-yoga.fr')).toBe('https://www.lea-yoga.fr/');
    expect(urlSite('https://http//www.ayurvedajyotiprema.com')).toBe('https://www.ayurvedajyotiprema.com/');
    expect(urlSite('pas un site')).toBeNull();
    expect(urlSite('javascript:alert(1)')).toBeNull();
    expect(urlSite('')).toBeNull();
  });
});

test.describe('gabarit et validation', () => {
  test('le gabarit tel quel est REFUSÉ : il reste des crochets', () => {
    const g = gabaritEmail(base);
    const v = validerTexte(g);
    expect(v.ok).toBe(false);
    expect(v.erreurs.join(' ')).toMatch(/crochet/);
  });
  test('un email rempli, signé Maude, avec le seul lien concierge, passe', () => {
    const corps = "Bonjour Léa,\n\nJ'ai vu ton Vinyasa du mardi à Nantes.\n\nTes créneaux se remplissent ?\n\nTu m'envoies ton planning, ici ou sur izisolo.fr/creer-mon-studio, et je te monte ton studio.\n\nBelle rentrée,\nMaude";
    expect(validerTexte({ objet: 'ton mardi soir', corps })).toEqual({ ok: true, erreurs: [] });
  });
  test('ce qu\'on refuse : tiret quadratin, pas de signature, lien externe, deux liens, concurrent', () => {
    const ok = "Bonjour,\n\nBelle rentrée,\nMaude";
    expect(validerTexte({ objet: 'x', corps: ok.replace('Bonjour,', 'Bonjour — toi') }).erreurs.join(' ')).toMatch(/quadratin/);
    expect(validerTexte({ objet: 'x', corps: 'Bonjour,\n\nColin' }).erreurs.join(' ')).toMatch(/Maude/);
    expect(validerTexte({ objet: 'x', corps: 'Regarde https://exemple.com/x\n\nMaude' }).erreurs.join(' ')).toMatch(/ne mène pas chez nous/);
    expect(validerTexte({ objet: 'x', corps: 'izisolo.fr/creer-mon-studio et izisolo.fr/changer-d-outil\n\nMaude' }).erreurs.join(' ')).toMatch(/un seul lien/);
    expect(validerTexte({ objet: 'x', corps: 'Mieux que Momoyoga\n\nMaude' }).erreurs.join(' ')).toMatch(/concurrent/);
    expect(validerTexte({ objet: '', corps: '' }).erreurs.length).toBeGreaterThanOrEqual(2);
  });
  test('la relance a son propre gabarit, sans deuxième observation inventée', () => {
    const g = gabaritEmail(base, { relance: true });
    expect(g.corps).toMatch(/écrit la semaine dernière/);
    expect(g.corps).toMatch(/izisolo\.fr\/creer-mon-studio/);
  });
});

test.describe('rendreEmail (le pied RGPD)', () => {
  test('le pied dit d\'où vient l\'adresse, offre la désinscription vers la PAGE, nomme l\'éditeur', () => {
    const r = rendreEmail({ to: 'Lea@Example.org', source: 'site', objet: 'coucou ?', corps: 'Bonjour\n\nMaude' });
    expect(r.sujet).toBe('coucou ?');   // espace fine avant « ? »
    expect(r.desinscription).toBe('https://www.izisolo.fr/unsubscribe?email=lea%40example.org');
    expect(r.desinscription).not.toMatch(/\/api\//);
    expect(r.text).toMatch(/ton adresse est sur la page contact de ton site/);
    expect(r.text).toMatch(/édité par Maude Yoga/);
    expect(r.html).toMatch(/href="https:\/\/www\.izisolo\.fr\/legal\/mentions"/);
  });
  test('izisolo.fr/… devient un vrai lien, le HTML est échappé', () => {
    const r = rendreEmail({ to: 'a@b.fr', source: 'ify.fr', objet: 'x', corps: 'va sur izisolo.fr/creer-mon-studio <b>\n\nMaude' });
    expect(r.html).toMatch(/<a href="https:\/\/www\.izisolo\.fr\/creer-mon-studio"/);
    expect(r.html).toMatch(/&lt;b&gt;/);
    expect(r.text).toMatch(/l'annuaire de l'Institut Français de Yoga/);
  });
  test('une source non citable ne se rend pas', () => {
    expect(() => rendreEmail({ to: 'a@b.fr', source: 'Sadhana', objet: 'x', corps: 'Maude' })).toThrow(/non citable/);
    for (const k of Object.keys(SOURCES)) expect(SOURCES[k]).toMatch(/^t(on|a) /);
  });
});

test.describe('heure programmée', () => {
  test('« 09:40 » donne 9 h 40 à Paris le jour même, format strict', () => {
    const maintenant = new Date('2026-09-12T06:00:00Z');
    const d = heureParisAujourdhui('09:40', maintenant);
    expect(d.toLocaleString('sv-SE', { timeZone: 'Europe/Paris' })).toBe('2026-09-12 09:40:00');
    expect(heureParisAujourdhui('9:40', maintenant)).toBeNull();
    expect(heureParisAujourdhui('25:00', maintenant)).toBeNull();
    expect(heureParisAujourdhui('', maintenant)).toBeNull();
  });
  test('en hiver aussi (offset +01:00)', () => {
    const d = heureParisAujourdhui('08:15', new Date('2026-01-15T06:00:00Z'));
    expect(d.toISOString()).toBe('2026-01-15T07:15:00.000Z');
  });
});

test.describe('compteur et relance', () => {
  test(`après ${SEUIL_ENVOIS} envois sous 3 % de réponses, on change l'angle`, () => {
    expect(statsProspection({ envoyes: 40, repondus: 0 }).changerAngle).toBe(false);
    expect(statsProspection({ envoyes: 100, repondus: 2 }).changerAngle).toBe(true);
    expect(statsProspection({ envoyes: 100, repondus: 3 }).changerAngle).toBe(false);
    expect(statsProspection({ envoyes: 30, repondus: 3 }).restants).toBe(70);
    expect(statsProspection({}).taux).toBe(0);
  });
  test('la relance n\'est due qu\'après 6 jours, sans réponse, une seule fois', () => {
    const now = new Date('2026-09-20T10:00:00Z');
    expect(relanceDue({ envoye_at: '2026-09-12T10:00:00Z' }, now)).toBe(true);
    expect(relanceDue({ envoye_at: '2026-09-16T10:00:00Z' }, now)).toBe(false);
    expect(relanceDue({ envoye_at: '2026-09-12T10:00:00Z', repondu: true }, now)).toBe(false);
    expect(relanceDue({ envoye_at: '2026-09-12T10:00:00Z', dejaRelancee: true }, now)).toBe(false);
    expect(relanceDue({ envoye_at: null }, now)).toBe(false);
  });
});
