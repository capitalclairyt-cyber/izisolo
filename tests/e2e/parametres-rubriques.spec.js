// ═══════════════════════════════════════════════════════════════════════════
// Verrou CI — la carte des Paramètres (lot 1 « Paramètres qui respirent »,
// 2026-09-09).
//
// Ce qu'on ne laisse pas glisser :
//   1. Une carte de réglages (lib/parametres-cartes) vit dans UNE rubrique et
//      une seule. Une carte sans rubrique = des réglages devenus inatteignables
//      sans qu'aucun écran ne le dise ; une carte dans deux rubriques = deux
//      boutons Enregistrer pour les mêmes colonnes.
//   2. Chaque ancien deep-link (?tab=&s=) atterrit sur une rubrique qui
//      existe : les emails déjà envoyés et les favoris des profs en dépendent.
//   3. Un résumé d'état ne jette JAMAIS, même sur un profil vide ou difforme :
//      il est décoratif, il ne doit pas casser la liste.
//   4. Les ids de rubrique sont des segments d'URL sûrs et uniques.
//   5. Le payload d'une carte ne contient QUE ses colonnes (règle B2e).
// ═══════════════════════════════════════════════════════════════════════════
import { test, expect } from '@playwright/test';
import {
  GROUPES, RUBRIQUES, RUBRIQUE_IDS, rubriqueParId, rubriquesVisibles,
  rubriquesParGroupe, resumeRubrique, rubriqueDepuisAncienLien, ANCIENS_LIENS_CONNUS,
  resumeCarte, carteOuverteParDefaut, CARTES_RESUMEES,
} from '../../lib/parametres-rubriques.js';
import { CARTES, payloadCarte, carteDuChamp } from '../../lib/parametres-cartes.js';

const PROFIL_VIDE = {};
const PROFIL_DIFFORME = {
  prenom: 42, types_cours: 'pas un tableau', vignettes_par_type: [1, 2], notifs_eleves: 'x',
  urssaf_config: { regime: 'inconnu' }, reglement_config: { rib: { iban: 'FAUX' } },
  faq_publique: 'non', docs_inscription: [{ url: 'http://pas-https' }], client_fields_config: { custom: 'non' },
  alerte_seances_seuil: 'abc', plan: 'multi_free', pays: 'ZZ',
};
const PROFIL_COMPLET = {
  prenom: 'Camille', nom: 'Leroux', email_contact: 'camille@atelier-soleil.fr',
  studio_nom: "L'Atelier Soleil", metier: 'pilates', ville: 'Bordeaux',
  photo_couverture: 'https://x/y.jpg', bio: 'Pilates', instagram_url: 'https://instagram.com/x',
  faq_publique: [{ q: 'a', a: 'b' }], afficher_tarifs: true,
  types_cours: ['Mat', 'Reformer'], vignettes_par_type: { Mat: 'https://x/m.jpg' },
  essai_actif: true, essai_mode: 'manuel', essai_paiement: 'sur_place', essai_prix: 10,
  docs_inscription: [{ url: 'https://x/a.pdf', nom: 'QS-SPORT' }],
  facturation_siret: '12345678900007', pays: 'FR', facturation_auto: true,
  stripe_webhook_secret: 'whsec_x',
  reglement_config: { rib: { iban: 'FR7630006000011234567890189', titulaire: 'Camille' } },
  urssaf_config: { regime: 'micro_bnc', periodicite: 'trimestrielle', rappel_email: true },
  client_fields_config: { custom: [{ key: 'x' }, { key: 'y' }, { key: 'z' }] },
  visibilite_default: 'public', afficher_inscrits: true,
  regles_annulation: { delai_heures: 24 },
  alerte_seances_seuil: 2, alerte_expiration_jours: 7, alerte_paiement_attente_jours: 14,
  notifs_eleves: { cours_annule: { email: true }, credits_faibles: { email: true }, expiration_abo: { email: false } },
  anniversaire_mode: 'manuel',
  plan: 'pro', stripe_subscription_status: 'active',
};

test.describe('Rubriques : la carte de l\'écran', () => {
  test('les ids sont des segments d\'URL uniques', () => {
    expect(new Set(RUBRIQUE_IDS).size).toBe(RUBRIQUE_IDS.length);
    for (const id of RUBRIQUE_IDS) expect(id).toMatch(/^[a-z][a-z0-9-]*$/);
  });

  test('chaque rubrique appartient à un groupe connu et porte un libellé', () => {
    const groupes = new Set(GROUPES.map(g => g.id));
    for (const r of RUBRIQUES) {
      expect(groupes.has(r.groupe), `${r.id} → groupe ${r.groupe}`).toBe(true);
      expect(typeof r.label).toBe('string');
      expect(r.label.length).toBeGreaterThan(2);
      expect(typeof r.icone).toBe('string');
      expect(Array.isArray(r.cartes)).toBe(true);
    }
  });

  test('chaque carte de réglages vit dans UNE rubrique et une seule', () => {
    const vues = {};
    for (const r of RUBRIQUES) for (const c of r.cartes) {
      expect(CARTES[c], `la rubrique ${r.id} cite une carte inconnue : ${c}`).toBeDefined();
      vues[c] = (vues[c] || 0) + 1;
    }
    for (const c of Object.keys(CARTES)) {
      expect(vues[c], `la carte ${c} n'a aucune rubrique : ses réglages sont devenus inatteignables`).toBe(1);
    }
  });

  test('rubriqueParId retrouve une rubrique et rend null pour l\'inconnu', () => {
    expect(rubriqueParId('facturation')?.groupe).toBe('argent');
    expect(rubriqueParId('inexistante')).toBeNull();
    expect(rubriqueParId('')).toBeNull();
  });
});

test.describe('Rubriques : visibilité', () => {
  test('URSSAF ne s\'affiche qu\'en France (v105)', () => {
    const ids = (p) => rubriquesVisibles(p).map(r => r.id);
    expect(ids({ pays: 'FR' })).toContain('urssaf');
    expect(ids({})).toContain('urssaf'); // défaut = France
    expect(ids({ pays: 'BE' })).not.toContain('urssaf');
    expect(ids({ pays: 'LU' })).not.toContain('urssaf');
  });

  test('Équipe ne s\'affiche qu\'avec la capacité Multi', () => {
    const ids = (p) => rubriquesVisibles(p).map(r => r.id);
    expect(ids({ plan: 'pro', stripe_subscription_status: 'active' })).not.toContain('equipe');
    expect(ids({ plan: 'multi', stripe_subscription_status: 'active' })).toContain('equipe');
    expect(ids({ plan: 'multi_free' })).toContain('equipe');
    expect(ids(null)).not.toContain('equipe');
  });

  test('les groupes vides disparaissent, les autres gardent l\'ordre', () => {
    const groupes = rubriquesParGroupe(PROFIL_COMPLET);
    expect(groupes.map(g => g.id)).toEqual(['studio', 'page', 'argent', 'eleves', 'notifications', 'abonnement']);
    for (const g of groupes) expect(g.rubriques.length).toBeGreaterThan(0);
  });
});

test.describe('Rubriques : résumés d\'état', () => {
  for (const [nom, profil] of [['vide', PROFIL_VIDE], ['null', null], ['difforme', PROFIL_DIFFORME], ['complet', PROFIL_COMPLET]]) {
    test(`aucun résumé ne jette sur un profil ${nom}`, () => {
      for (const r of RUBRIQUES) {
        const s = resumeRubrique(r, profil, { lieux: nom === 'complet' ? [{}, {}] : undefined });
        expect(typeof s, r.id).toBe('string');
        if (nom === 'complet') expect(s.length, `${r.id} : résumé vide sur un profil complet`).toBeGreaterThan(0);
      }
    });
  }

  test('les résumés disent l\'état réel', () => {
    const r = (id, p, ctx) => resumeRubrique(rubriqueParId(id), p, ctx);
    expect(r('studio', PROFIL_COMPLET, { lieux: [{}, {}] })).toBe("L'Atelier Soleil · Pilates · Bordeaux · 2 lieux");
    expect(r('facturation', PROFIL_COMPLET)).toContain('SIRET 123 456 789 00007');
    expect(r('facturation', PROFIL_COMPLET)).toContain('facture envoyée');
    expect(r('facturation', {})).toBe('SIRET à renseigner');
    expect(r('facturation', { pays: 'BE' })).toBe("Numéro d'entreprise à renseigner");
    expect(r('paiement-en-ligne', PROFIL_COMPLET)).toBe('Stripe branché');
    expect(r('paiement-en-ligne', {})).toBe('Pas encore branché');
    expect(r('virement', PROFIL_COMPLET)).toBe('FR76 … 189');
    expect(r('virement', PROFIL_DIFFORME)).toBe('RIB à renseigner'); // IBAN faux = jeté
    expect(r('urssaf', PROFIL_COMPLET)).toBe('Micro-entreprise · BNC · tous les trimestres · rappel activé');
    expect(r('urssaf', {})).toBe('Pas encore configurée');
    expect(r('essai', PROFIL_COMPLET)).toBe('Activé · validation manuelle · 10 €');
    expect(r('essai', {})).toBe('Désactivé');
    expect(r('documents', PROFIL_COMPLET)).toBe('1 PDF');
    expect(r('types-cours', PROFIL_COMPLET)).toBe('2 types · 1 photo');
    expect(r('seuils', PROFIL_COMPLET)).toBe('2 séances · 7 jours · paiement 14 jours');
    expect(r('annulation', {})).toBe('24 h avant la séance');
    expect(r('notifications-eleves', PROFIL_COMPLET)).toBe('2 emails automatiques · anniversaires');
    expect(r('champs', PROFIL_COMPLET)).toBe('3 champs perso');
    expect(r('abonnement', PROFIL_COMPLET)).toBe('Complet · 29 €/mois');
    expect(r('abonnement', { plan: 'solo', trial_started_at: new Date(Date.now() - 2 * 86400000).toISOString() })).toMatch(/^Essai · Complet · \d+ jours? restants?$/);
    expect(r('abonnement', { plan: 'solo', trial_started_at: new Date(Date.now() - 400 * 86400000).toISOString() })).toBe('Essai terminé · choisis ton plan');
  });

  test('un résumé ne contient jamais un secret', () => {
    const p = { ...PROFIL_COMPLET, stripe_webhook_secret: 'whsec_SECRET_QUI_NE_DOIT_PAS_SORTIR' };
    for (const r of RUBRIQUES) expect(resumeRubrique(r, p)).not.toContain('whsec_');
    // L'IBAN complet n'est pas un secret, mais un résumé de liste n'a pas à
    // l'afficher en entier : quatre premiers, trois derniers.
    expect(resumeRubrique(rubriqueParId('virement'), p)).not.toContain('30006000011234567890');
  });
});

test.describe('Anciens deep-links', () => {
  test('chaque ancien lien connu atterrit sur une rubrique existante', () => {
    for (const ancien of ANCIENS_LIENS_CONNUS) {
      const [tab, s] = ancien.split('/');
      const id = rubriqueDepuisAncienLien(tab, s || null);
      expect(RUBRIQUE_IDS, `${ancien} → ${id}`).toContain(id);
    }
  });

  test('les 18 destinations de l\'ancien écran ont toutes une cible', () => {
    const anciennes = [
      ['profil', 'profil'], ['profil', 'activite'], ['profil', 'lieux'], ['profil', 'champs'],
      ['portail', 'page'], ['portail', 'apparence'], ['portail', 'visibilite'], ['portail', 'essai'], ['portail', 'paiement'],
      ['notifications', 'notifs'], ['notifications', 'eleves'], ['notifications', 'seuils'], ['notifications', 'anniv'],
      ['regles', 'annulation'], ['regles', 'metier'], ['abonnement', null],
      ['profil', null], ['portail', null],
    ];
    for (const [tab, s] of anciennes) {
      expect(rubriqueDepuisAncienLien(tab, s), `${tab}/${s}`).not.toBeNull();
    }
    expect(rubriqueDepuisAncienLien('profil', 'activite')).toBe('studio');
    expect(rubriqueDepuisAncienLien('portail', 'paiement')).toBe('paiement-en-ligne');
    expect(rubriqueDepuisAncienLien('regles', 'metier')).toBe('cas-particuliers');
    expect(rubriqueDepuisAncienLien('abonnement', null)).toBe('abonnement');
  });

  test('un sous-onglet inconnu retombe sur l\'onglet, un onglet inconnu sur null', () => {
    expect(rubriqueDepuisAncienLien('portail', 'nimporte')).toBe('page');
    expect(rubriqueDepuisAncienLien('inconnu', null)).toBeNull();
    expect(rubriqueDepuisAncienLien(null, 'page')).toBeNull();
  });
});

test.describe('Cartes : le payload n\'écrit que ses colonnes (règle B2e)', () => {
  test('payloadCarte ne contient que les colonnes de la carte, sérialisées', () => {
    const p = { ...PROFIL_COMPLET, website_url: 'mon-site.fr', facturation_siret: '123 456 789 00007', autre_colonne: 'ne doit pas sortir' };
    const page = payloadCarte('page', p);
    expect(Object.keys(page).sort()).toEqual([...CARTES.page].sort());
    expect(page.website_url).toBe('https://mon-site.fr');
    const fact = payloadCarte('facturation', p);
    expect(fact.facturation_siret).toBe('12345678900007');
    expect(fact).not.toHaveProperty('autre_colonne');
    expect(payloadCarte('inconnue', p)).toBeNull();
    expect(payloadCarte('page', null)).toBeNull();
  });

  test('chaque colonne appartient à une seule carte', () => {
    const index = carteDuChamp();
    const toutes = Object.values(CARTES).flat();
    expect(new Set(toutes).size).toBe(toutes.length);
    expect(index.bio).toBe('page');
    expect(index.pays).toBe('facturation');
  });

  test('le SMS n\'est plus un réglage écrit par les Paramètres (décision 2026-09-09)', () => {
    expect(Object.values(CARTES).flat()).not.toContain('sms_seuil_mois');
  });
});

test.describe('Cartes repliées (lot 2) : chaque carte dit son état', () => {
  test('chaque carte de CARTES a un résumé, et aucun résumé ne jette', () => {
    for (const c of Object.keys(CARTES)) expect(CARTES_RESUMEES, `la carte ${c} n'a pas de résumé : fermée, elle serait muette`).toContain(c);
    for (const c of CARTES_RESUMEES) for (const p of [null, PROFIL_VIDE, PROFIL_DIFFORME, PROFIL_COMPLET]) {
      expect(typeof resumeCarte(c, p, { lieux: [{ nom: 'Salle A' }] }), c).toBe('string');
    }
    expect(resumeCarte('inconnue', PROFIL_COMPLET)).toBe('');
  });

  test('les résumés disent l\'état réel', () => {
    expect(resumeCarte('lieux', {}, { lieux: [{ nom: 'Salle A' }, { nom: 'Salle B' }] })).toBe('2 lieux · Salle A, Salle B');
    expect(resumeCarte('lieux', {}, { lieux: [] })).toBe('Aucun lieu pour l\'instant');
    expect(resumeCarte('page_affichage', { afficher_tarifs: true })).toBe('horaires masqués · tarifs affichés · offres dans l\'espace élève');
    expect(resumeCarte('page_affichage', { offres_espace: false })).toContain('offres hors de l\'espace élève');
    expect(resumeCarte('page_plus', { annees_experience: 9, formations: 'x', faq_publique: [{}, {}] })).toBe('9 ans d\'expérience · formations · 2 questions');
    expect(resumeCarte('page_plus', {})).toBe('Expérience, formations, philosophie, FAQ');
    expect(resumeCarte('seuils', {})).toBe('2 séances · 7 jours avant la fin');
    expect(resumeCarte('seuils_prof', { alerte_paiement_attente_jours: 30 })).toBe('après 30 jours d\'attente');
    expect(resumeCarte('anniv', { anniversaire_mode: 'off' })).toBe('Désactivé');
    expect(resumeCarte('notifs_eleves', PROFIL_COMPLET)).toBe('2 emails automatiques activés');
    expect(resumeCarte('facturation', PROFIL_COMPLET)).toContain('SIRET');
  });

  test('« Changer de plan » ne s\'ouvre tout seul qu\'en essai ou essai terminé', () => {
    expect(carteOuverteParDefaut('changer_plan', { plan: 'solo', trial_started_at: new Date().toISOString() })).toBe(true);
    expect(carteOuverteParDefaut('changer_plan', { plan: 'solo', trial_started_at: new Date(Date.now() - 400 * 86400000).toISOString() })).toBe(true);
    expect(carteOuverteParDefaut('changer_plan', PROFIL_COMPLET)).toBe(false);
    expect(carteOuverteParDefaut('anniv', PROFIL_COMPLET)).toBe(false);
  });
});
