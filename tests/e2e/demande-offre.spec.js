// ═══════════════════════════════════════════════════════════════════════════
// Verrou CI — « je veux cette offre » (v97, 2026-08-23, demande Colin : « les
// élèves puissent voir les offres dispo du studio et faire une demande, la
// prof valide ensuite de son côté et gère le paiement »).
// Spec Node pure : fige lib/demande-offre.js.
//
// La règle centrale, celle qu'on ne doit jamais laisser glisser : une demande
// N'EST PAS une vente. Rien n'est débité, rien n'est réservé, aucun droit
// n'est ouvert. Les textes de l'élève doivent le dire — promettre l'offre
// avant que la prof ait validé serait un mensonge qui se paie au cours suivant.
// ═══════════════════════════════════════════════════════════════════════════
import { test, expect } from '@playwright/test';
import {
  sanitizeDemandeOffre, nomDemandeur, emailDemandeur, estProspect,
  confirmationEleve, resumeDemande, STATUTS_DEMANDE_OFFRE,
} from '../../lib/demande-offre.js';

test.describe('sanitizeDemandeOffre — deux portes, une exigence', () => {
  test('élève connectée : sa fiche suffit, on ne redemande rien', () => {
    const r = sanitizeDemandeOffre({ offreId: 'o1', clientId: 'c1' });
    expect(r.ok).toBe(true);
    expect(r.valeurs).toMatchObject({ offre_id: 'o1', client_id: 'c1' });
  });

  test('prospecte : prénom ET email obligatoires (sinon on ne peut pas répondre)', () => {
    expect(sanitizeDemandeOffre({ offreId: 'o1', prenom: 'Léa', email: 'lea@example.org' }).ok).toBe(true);
    const sansEmail = sanitizeDemandeOffre({ offreId: 'o1', prenom: 'Léa' });
    expect(sansEmail.ok).toBe(false);
    expect(sansEmail.erreur).toContain('email');
    const sansPrenom = sanitizeDemandeOffre({ offreId: 'o1', email: 'lea@example.org' });
    expect(sansPrenom.ok).toBe(false);
    expect(sansPrenom.erreur).toContain('prénom');
  });

  test('sans offre, il n\'y a rien à demander', () => {
    expect(sanitizeDemandeOffre({ clientId: 'c1' }).ok).toBe(false);
    expect(sanitizeDemandeOffre({}).ok).toBe(false);
    expect(sanitizeDemandeOffre().ok).toBe(false);
  });

  test('email difforme refusé', () => {
    expect(sanitizeDemandeOffre({ offreId: 'o1', prenom: 'Léa', email: 'lea(at)example' }).ok).toBe(false);
  });

  test('email normalisé en minuscules, champs vides à null', () => {
    const { valeurs } = sanitizeDemandeOffre({ offreId: 'o1', prenom: 'Léa', email: ' LEA@Example.ORG ', nom: '  ' });
    expect(valeurs.email).toBe('lea@example.org');
    expect(valeurs.nom).toBe(null);
  });

  test('message tronqué, jamais rejeté (une demande vaut mieux qu\'un CHECK violé)', () => {
    const { ok, valeurs } = sanitizeDemandeOffre({
      offreId: 'o1', clientId: 'c1', message: 'x'.repeat(5000),
    });
    expect(ok).toBe(true);
    expect(valeurs.message).toHaveLength(1000);
  });
});

test.describe('qui demande — la fiche fait foi', () => {
  test('le nom vient de la fiche quand elle existe', () => {
    expect(nomDemandeur({ clients: { prenom: 'Maude', nom: 'B' }, prenom: 'Usurpateur' })).toBe('Maude B');
    expect(emailDemandeur({ clients: { email: 'fiche@ex.org' }, email: 'saisi@ex.org' })).toBe('fiche@ex.org');
  });

  test('sinon les coordonnées saisies, sinon l\'email, sinon rien d\'inventé', () => {
    expect(nomDemandeur({ prenom: 'Léa', nom: 'Martin' })).toBe('Léa Martin');
    expect(nomDemandeur({ email: 'lea@ex.org' })).toBe('lea@ex.org');
    expect(nomDemandeur({})).toBe('Quelqu\'un');
  });

  test('une demande sans fiche est signalée comme telle', () => {
    // La prof doit le savoir : accepter voudra dire créer la fiche.
    expect(estProspect({ client_id: null })).toBe(true);
    expect(estProspect({ client_id: 'c1' })).toBe(false);
  });
});

test.describe('ce que l\'élève lit — une demande, pas un achat', () => {
  test('la confirmation dit « demande », et que rien n\'est débité ni réservé', () => {
    const m = confirmationEleve({ offreNom: 'Carnet 10', studioNom: 'Yoga Doux' });
    expect(m).toContain('Demande envoyée');
    expect(m).toContain('Carnet 10');
    expect(m).toContain('Yoga Doux');
    expect(m).toContain('Rien n\'est débité, rien n\'est réservé');
  });

  test('elle ne promet JAMAIS que l\'offre est acquise', () => {
    const m = confirmationEleve({ offreNom: 'Carnet 10' }).toLowerCase();
    expect(m).not.toContain('acheté');
    expect(m).not.toContain('achetée');
    expect(m).not.toContain('validée');
    expect(m).not.toContain('confirmée');
  });

  test('sans nom de studio, la phrase reste correcte', () => {
    expect(confirmationEleve({})).toContain('ton studio');
  });

  test('zéro tiret quadratin (règle de rédaction maison)', () => {
    expect(confirmationEleve({ offreNom: 'Carnet 10', studioNom: 'Yoga Doux' })).not.toContain('—');
  });
});

test.describe('ce que la prof voit', () => {
  const ref = new Date('2026-08-23T12:00:00Z');

  test('l\'ancienneté est dite en clair', () => {
    expect(resumeDemande({ created_at: '2026-08-23T08:00:00Z' }, ref).quand).toBe("aujourd'hui");
    expect(resumeDemande({ created_at: '2026-08-22T08:00:00Z' }, ref).quand).toBe('hier');
    expect(resumeDemande({ created_at: '2026-08-13T08:00:00Z' }, ref).quand).toBe('il y a 10 jours');
  });

  test('le résumé porte le nom et le fait qu\'il n\'y ait pas de fiche', () => {
    const r = resumeDemande({ created_at: ref.toISOString(), prenom: 'Léa', client_id: null }, ref);
    expect(r.nom).toBe('Léa');
    expect(r.prospect).toBe(true);
  });

  test('les trois états, et eux seuls (le CHECK de v97 les fige)', () => {
    expect(Object.keys(STATUTS_DEMANDE_OFFRE)).toEqual(['nouvelle', 'acceptee', 'refusee']);
  });
});
