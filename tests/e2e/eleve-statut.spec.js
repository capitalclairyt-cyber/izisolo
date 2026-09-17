// ═══════════════════════════════════════════════════════════════════════════
// Verrou CI — l'état de compte d'une élève parle de CE studio (v120).
//
// Le 17/09/2026, jour de l'import d'Atout Gym : quatre adhérentes sur
// quarante-trois s'affichaient « Compte actif · dernière connexion le
// 26 juil. » alors qu'aucune des 43 fiches n'avait jamais ouvert l'espace de
// l'association. Elles sont aussi élèves chez Maude Yoga, et c'est cette
// connexion-là que la pastille racontait : `auth.users.last_sign_in_at` est la
// dernière connexion du COMPTE, et l'identité élève est globale à IziSolo.
//
// Ce fichier fige la règle : aucune date venue d'un autre studio ne ressort
// d'ici, et aucune surface prof n'en affiche.
// ═══════════════════════════════════════════════════════════════════════════
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  statutCompteEleve, STATUT_COMPTE_LABEL, STATUT_COMPTE_AIDE,
  resteAInviter, formatDateRelative,
} from '../../lib/eleve-statut.js';

const ILYA = (jours) => new Date(Date.now() - jours * 86400000).toISOString();
// Ce que la RPC v67 rend pour une personne qui a un compte quelque part.
const COMPTE_GLOBAL = { has_account: true, last_sign_in_at: ILYA(53) };

test.describe('statutCompteEleve — quatre états, tous scopés au studio', () => {
  test('venue ici : la fiche est liée et porte sa date de visite', () => {
    const st = statutCompteEleve(
      { auth_user_id: 'u1', derniere_visite_at: ILYA(3) }, COMPTE_GLOBAL);
    expect(st.etat).toBe('venue');
    expect(st.visite).toBeTruthy();
  });

  test('venue ici avant v120 : liée, sans date, et on n\'en invente pas', () => {
    const st = statutCompteEleve({ auth_user_id: 'u1' }, COMPTE_GLOBAL);
    expect(st.etat).toBe('venue');
    expect(st.visite).toBeNull();
  });

  test('une date de visite suffit, même si la FK v83 manque', () => {
    expect(statutCompteEleve({ derniere_visite_at: ILYA(1) }, null).etat).toBe('venue');
  });

  test('invitée et pas encore venue', () => {
    const st = statutCompteEleve({ invitation_envoyee_at: ILYA(2) }, null);
    expect(st.etat).toBe('invite');
    expect(st.invite).toBeTruthy();
  });

  test('a un compte IziSolo mais n\'est JAMAIS venue ici', () => {
    // Le cas des quatre adhérentes d'Atout Gym. Avant, c'était « Compte actif ».
    const st = statutCompteEleve({ email: 'lea@example.com' }, COMPTE_GLOBAL);
    expect(st.etat).toBe('compte');
    expect(st.aUnCompte).toBe(true);
  });

  test('ni compte ni invitation', () => {
    expect(statutCompteEleve({ email: 'lea@example.com' }, null).etat).toBe('aucun');
  });

  test('une invitation envoyée prime sur « a un compte » : c\'est le geste le plus récent', () => {
    const st = statutCompteEleve({ invitation_envoyee_at: ILYA(1) }, COMPTE_GLOBAL);
    expect(st.etat).toBe('invite');
  });

  test('une fiche vide, nulle ou difforme ne jette pas', () => {
    for (const entree of [null, undefined, {}, { auth_user_id: null }, 'nimporte quoi']) {
      expect(() => statutCompteEleve(entree, undefined)).not.toThrow();
    }
    expect(statutCompteEleve(null, null).etat).toBe('aucun');
  });
});

test.describe('LA règle : la connexion d\'un autre studio ne sort jamais d\'ici', () => {
  test('aucune date n\'est rendue pour quelqu\'un qui n\'est pas venu ici', () => {
    for (const client of [{ email: 'x@y.fr' }, { invitation_envoyee_at: ILYA(2) }]) {
      const st = statutCompteEleve(client, COMPTE_GLOBAL);
      expect(st.visite, 'la visite est propre au studio, elle reste nulle').toBeNull();
      // Le champ qui portait la date globale n'existe plus dans le retour.
      expect(st.lastSignIn, 'last_sign_in_at ne doit plus ressortir').toBeUndefined();
    }
  });

  test('la date rendue est TOUJOURS celle de la fiche, jamais celle du compte', () => {
    const visite = ILYA(2);
    const st = statutCompteEleve(
      { auth_user_id: 'u1', derniere_visite_at: visite },
      { has_account: true, last_sign_in_at: ILYA(53) });
    expect(st.visite).toBe(visite);
  });

  test('aucun libellé ne promet une « dernière connexion »', () => {
    const textes = [...Object.values(STATUT_COMPTE_LABEL), ...Object.values(STATUT_COMPTE_AIDE)];
    for (const t of textes) expect(t.toLowerCase()).not.toContain('dernière connexion');
    expect(STATUT_COMPTE_AIDE.compte).toMatch(/jamais ouvert ton espace/i);
  });

  test('les quatre états ont un libellé et une explication', () => {
    for (const etat of ['venue', 'invite', 'compte', 'aucun']) {
      expect(STATUT_COMPTE_LABEL[etat], etat).toBeTruthy();
      expect(STATUT_COMPTE_AIDE[etat], etat).toBeTruthy();
    }
  });

  test('inviter garde un sens partout sauf pour quelqu\'un déjà venu', () => {
    expect(resteAInviter('venue')).toBe(false);
    for (const e of ['invite', 'compte', 'aucun']) expect(resteAInviter(e)).toBe(true);
  });
});

test.describe('Les surfaces prof n\'affichent plus la connexion globale', () => {
  const SURFACES = [
    'app/(dashboard)/clients/ClientsClient.js',
    'app/(dashboard)/clients/[id]/FicheClientClient.js',
  ];
  test('ni lastSignIn, ni last_sign_in_at dans la liste et la fiche', () => {
    for (const rel of SURFACES) {
      const src = readFileSync(join(process.cwd(), rel), 'utf8');
      expect(src, `${rel} affiche encore une date de connexion globale`).not.toMatch(/\.lastSignIn\b|last_sign_in_at/);
    }
  });
});

test.describe('formatDateRelative — inchangée', () => {
  test('aujourd\'hui, hier, il y a N j, il y a N sem., puis la date', () => {
    expect(formatDateRelative(new Date().toISOString())).toBe("aujourd'hui");
    expect(formatDateRelative(ILYA(1))).toBe('hier');
    expect(formatDateRelative(ILYA(3))).toBe('il y a 3 j');
    expect(formatDateRelative(ILYA(14))).toBe('il y a 2 sem.');
    expect(formatDateRelative(ILYA(60))).toMatch(/^le /);
  });
  test('rien à afficher pour une entrée vide ou illisible', () => {
    expect(formatDateRelative(null)).toBe('');
    expect(formatDateRelative('pas une date')).toBe('');
  });
});
