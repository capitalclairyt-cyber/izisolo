// ═══════════════════════════════════════════════════════════════════════════
// Verrou CI — règlement par virement (v98, 2026-08-23, demande Colin dans la
// foulée de la demande d'offre v97 : « un mail automatisé avec le tarif à
// payer et son RIB pour que la cliente effectue un virement »).
// Spec Node pure : fige lib/reglement.js.
//
// Les règles qu'on ne laisse pas glisser : un IBAN faux ne part JAMAIS dans
// un email (mod-97 obligatoire), la référence de virement est STABLE par
// élève (c'est elle qui rend le rapprochement bancaire possible), le QR suit
// le standard EPC069-12 à la ligne près, et l'email en mode « espèces » ne
// divulgue pas le RIB.
// ═══════════════════════════════════════════════════════════════════════════
import { test, expect } from '@playwright/test';
import {
  validerIban, formatIban, referenceVirement, sanitizeReglementConfig,
  lireReglementConfig, preselectionEmail, epcQrPayload, emailReglement,
  EMAIL_MODES, VARIANTES_EMAIL,
} from '../../lib/reglement.js';

const IBAN_FR = 'FR1420041010050500013M02606'; // exemple canonique, mod-97 valide
const IBAN_DE = 'DE89370400440532013000';
const IBAN_BE = 'BE68539007547034';

test.describe('validerIban — jamais un IBAN faux dans un email', () => {
  test('accepte les IBAN valides, espaces et minuscules compris', () => {
    expect(validerIban(IBAN_FR).ok).toBe(true);
    expect(validerIban('fr14 2004 1010 0505 0001 3M02 606').ok).toBe(true);
    expect(validerIban(IBAN_DE).ok).toBe(true);
    expect(validerIban(IBAN_BE).ok).toBe(true);
    expect(validerIban(' fr1420041010050500013m02606 ').iban).toBe(IBAN_FR);
  });

  test('rejette la faute de frappe (mod-97) et les formats difformes', () => {
    expect(validerIban('FR1420041010050500013M02607').ok).toBe(false); // dernier chiffre altéré
    expect(validerIban('FR14200410100505013M02606').ok).toBe(false);   // FR ≠ 27 caractères
    expect(validerIban('1420041010050500013M02606FR').ok).toBe(false); // pays manquant
    expect(validerIban('').ok).toBe(false);
    expect(validerIban(null).ok).toBe(false);
    expect(validerIban('FRXX20041010050500013M0260').ok).toBe(false);
  });

  test('formatIban : blocs de 4 pour les yeux', () => {
    expect(formatIban(IBAN_FR)).toBe('FR14 2004 1010 0505 0001 3M02 606');
    expect(formatIban('be68 5390 0754 7034')).toBe('BE68 5390 0754 7034');
  });
});

test.describe('referenceVirement — stable par élève', () => {
  test('dérivée de la fiche, toujours la même', () => {
    const id = '26f8f6c9-d52a-4862-8221-da21244dfbac';
    expect(referenceVirement(id)).toBe('IZI-26F8F6');
    expect(referenceVirement(id)).toBe(referenceVirement(id));
    expect(referenceVirement(null)).toBe(null);
    expect(referenceVirement('')).toBe(null);
  });
});

test.describe('sanitizeReglementConfig — le seul lecteur du JSONB (v98)', () => {
  test('config complète : rib nettoyé, modes de la liste blanche', () => {
    const c = sanitizeReglementConfig({
      rib: { titulaire: '  Maude Yoga  ', iban: 'fr14 2004 1010 0505 0001 3m02 606', bic: 'psst frpp xxx' },
      email_mode: 'auto', email_defaut: 'virement',
    });
    expect(c.rib).toEqual({ titulaire: 'Maude Yoga', iban: IBAN_FR, bic: 'PSSTFRPPXXX' });
    expect(c.email_mode).toBe('auto');
    expect(c.email_defaut).toBe('virement');
  });

  test('un IBAN invalide JETTE le rib entier (jamais envoyé faux)', () => {
    const c = sanitizeReglementConfig({
      rib: { titulaire: 'Maude', iban: 'FR1420041010050500013M02607' },
      email_mode: 'auto',
    });
    expect(c.rib).toBeUndefined();
    expect(c.email_mode).toBe('auto');
  });

  test('valeurs hors liste blanche → défauts ; tout vide → null', () => {
    const c = sanitizeReglementConfig({ email_mode: 'hacker', email_defaut: 'bitcoin', rib: { iban: 'nope' } });
    expect(c).toBe(null); // rien d'utilisable → la colonne reste NULL
    expect(sanitizeReglementConfig(null)).toBe(null);
    expect(sanitizeReglementConfig({})).toBe(null);
    expect(sanitizeReglementConfig('texte')).toBe(null);
    expect(lireReglementConfig({ reglement_config: { email_mode: 'jamais' } }).email_mode).toBe('jamais');
    expect(lireReglementConfig({})).toBe(null);
  });

  test('un BIC difforme est jeté, le rib reste', () => {
    const c = sanitizeReglementConfig({ rib: { titulaire: 'M', iban: IBAN_FR, bic: 'tro-p-court' } });
    expect(c.rib.bic).toBe(null);
    expect(c.rib.iban).toBe(IBAN_FR);
  });
});

test.describe('preselectionEmail — le réglage auto / choix / jamais', () => {
  test('jamais → le bloc du tunnel disparaît', () => {
    expect(preselectionEmail({ email_mode: 'jamais' })).toEqual({ actif: false, presel: null });
  });
  test('choix (et défaut sans config) → bloc actif, rien de présélectionné', () => {
    expect(preselectionEmail({ email_mode: 'choix' })).toEqual({ actif: true, presel: null });
    expect(preselectionEmail(null)).toEqual({ actif: true, presel: null });
  });
  test('auto → le moyen par défaut, SAUF virement sans RIB (pas de présomption)', () => {
    const rib = { titulaire: 'M', iban: IBAN_FR, bic: null };
    expect(preselectionEmail({ email_mode: 'auto', email_defaut: 'virement', rib }).presel).toBe('virement');
    expect(preselectionEmail({ email_mode: 'auto', email_defaut: 'virement' }).presel).toBe(null);
    expect(preselectionEmail({ email_mode: 'auto', email_defaut: 'especes' }).presel).toBe('especes');
    expect(preselectionEmail({ email_mode: 'auto', email_defaut: 'cheque' }).presel).toBe('cheque');
  });
});

test.describe('epcQrPayload — le standard EPC069-12, à la ligne près', () => {
  test('structure exacte (BCD / 002 / 1 / SCT / BIC / nom / IBAN / montant / réf)', () => {
    const p = epcQrPayload({ titulaire: 'Maude Yoga', iban: IBAN_FR, bic: 'PSSTFRPPXXX', montant: 480, reference: 'IZI-26F8F6' });
    expect(p.split('\n')).toEqual([
      'BCD', '002', '1', 'SCT', 'PSSTFRPPXXX', 'Maude Yoga', IBAN_FR,
      'EUR480.00', '', '', 'IZI-26F8F6', '',
    ]);
  });

  test('BIC et montant optionnels (version 002), champs nettoyés des retours ligne', () => {
    const p = epcQrPayload({ titulaire: 'Maude\nYoga', iban: 'fr14 2004 1010 0505 0001 3M02 606' });
    const lignes = p.split('\n');
    expect(lignes[4]).toBe('');            // BIC vide autorisé en 002
    expect(lignes[5]).toBe('Maude Yoga');  // \n du nom neutralisé
    expect(lignes[6]).toBe(IBAN_FR);
    expect(lignes[7]).toBe('');            // pas de montant
  });

  test('sans nom ou sans IBAN : pas de QR', () => {
    expect(epcQrPayload({ titulaire: '', iban: IBAN_FR })).toBe(null);
    expect(epcQrPayload({ titulaire: 'M', iban: '' })).toBe(null);
  });
});

test.describe('emailReglement — trois variantes honnêtes', () => {
  const rib = { titulaire: 'Maude Yoga', iban: IBAN_FR, bic: 'PSSTFRPPXXX' };
  const base = { studioNom: 'Maude Yoga', prenom: 'Cécile', intitule: 'Abonnement annuel', montant: 480, rib, reference: 'IZI-26F8F6', studioSlug: 'maude-yoga' };

  test('virement : RIB formaté, référence mise en avant, lien espace, alternatives', () => {
    const m = emailReglement({ ...base, variante: 'virement' });
    expect(m.subject).toContain('480,00 €');
    expect(m.subject).toContain('virement');
    expect(m.html).toContain('FR14 2004 1010 0505 0001 3M02 606');
    expect(m.html).toContain('IZI-26F8F6');
    expect(m.html).toContain('PSSTFRPPXXX');
    expect(m.html).toContain('/p/maude-yoga/espace');
    expect(m.html).toContain('QR code');
    expect(m.html).toContain('Déjà réglé ?');
  });

  test('espèces et chèque : JAMAIS l\'IBAN dans le corps', () => {
    const esp = emailReglement({ ...base, variante: 'especes' });
    expect(esp.subject).toContain('espèces');
    expect(esp.html).not.toContain('FR14');
    const chq = emailReglement({ ...base, variante: 'cheque' });
    expect(chq.subject).toContain('chèque');
    expect(chq.html).not.toContain('FR14');
    expect(chq.html).toContain('à l\'ordre de');
  });

  test('virement sans RIB : refus (null), variante inconnue : refus', () => {
    expect(emailReglement({ ...base, variante: 'virement', rib: null })).toBe(null);
    expect(emailReglement({ ...base, variante: 'paypal' })).toBe(null);
  });

  test('échéancier : les versements à venir sont listés', () => {
    const m = emailReglement({ ...base, variante: 'virement', versements: [
      { date: '2026-09-01', montant: 160 }, { date: '2026-10-01', montant: 160 }, { date: '2026-11-01', montant: 160 },
    ] });
    expect(m.html).toContain('Ton échéancier');
    expect((m.html.match(/160,00 €/g) || []).length).toBe(3);
  });

  test('zéro tiret quadratin (règle de rédaction maison) et HTML échappé', () => {
    for (const variante of VARIANTES_EMAIL) {
      const m = emailReglement({ ...base, variante, intitule: 'Abo <script>&' });
      expect(m.subject).not.toContain('—');
      expect(m.html).not.toContain('—');
      expect(m.html).not.toContain('<script>');
      expect(m.html).toContain('Abo &lt;script&gt;&amp;');
    }
  });

  test('les listes blanches sont figées', () => {
    expect(EMAIL_MODES).toEqual(['auto', 'choix', 'jamais']);
    expect(VARIANTES_EMAIL).toEqual(['virement', 'especes', 'cheque']);
  });
});
