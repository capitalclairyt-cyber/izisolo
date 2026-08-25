// ═══════════════════════════════════════════════════════════════════════════
// Verrou CI — lien de pointage confié (v100, 2026-08-25, demande Colin :
// « un lien sécurisé à envoyer pour accéder UNIQUEMENT au pointage d'un
// cours, même sans compte »).
// Spec Node pure : fige lib/lien-pointage.js.
//
// Ce qu'on ne laisse pas glisser, dans l'ordre de gravité :
//   1. Ce lien est remis à quelqu'un d'extérieur au studio. Rien d'autre que
//      des noms ne doit sortir : ni email, ni téléphone, ni carnet, ni
//      montant, ni lien visio. Un champ ajouté par mégarde à une requête ne
//      doit pas se retrouver dans le JSON public.
//   2. Un lien révoqué ou expiré ferme, sans exception et sans excuse.
//   3. Un lien ne vaut que pour SON cours et SON studio.
//   4. L'expiration s'ancre sur la séance, pas sur l'instant de création.
// ═══════════════════════════════════════════════════════════════════════════
import { test, expect } from '@playwright/test';
import {
  genererToken, hashToken, urlLien,
  parisVersUtc, jourParis, expirationPour,
  etatLien, verifierLien,
  presencePourInvitee, coursPourInvitee,
  sanitizeNomInvitee, sanitizeNote, statutInviteValide, labelEtat,
  STATUTS_INVITE, DUREES, DUREE_DEFAUT,
} from '../../lib/lien-pointage.js';

const PROFIL = '11111111-1111-1111-1111-111111111111';
const AUTRE_PROFIL = '22222222-2222-2222-2222-222222222222';
const COURS = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const AUTRE_COURS = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

const lienActif = (o = {}) => ({
  id: 'lien-1',
  profile_id: PROFIL,
  cours_id: COURS,
  expire_at: '2026-08-25T21:59:59.000Z',
  revoque_at: null,
  ...o,
});
const coursOk = (o = {}) => ({
  id: COURS, profile_id: PROFIL, nom: 'Vinyasa', date: '2026-08-25',
  heure: '18:30:00', est_annule: false, ...o,
});

// ── 1. Le jeton ────────────────────────────────────────────────────────────

test.describe('jeton — non devinable, jamais stocké en clair', () => {
  test('256 bits en base64url, différent à chaque appel', () => {
    const a = genererToken();
    const b = genererToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/); // 32 octets en base64url
  });

  test('le hash est stable, et ne ressemble jamais au jeton', () => {
    const t = genererToken();
    const h = hashToken(t);
    expect(h).toBe(hashToken(t));
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).not.toContain(t);
  });

  test('un jeton trop court ne produit AUCUN hash exploitable', () => {
    // Sinon un « ? » dans l'URL suffirait à interroger la table.
    expect(hashToken('')).toBeNull();
    expect(hashToken(null)).toBeNull();
    expect(hashToken('abc')).toBeNull();
    expect(hashToken('1234567890123456789')).toBeNull(); // 19 caractères
  });

  test("l'URL colle le jeton sur la base, sans double slash", () => {
    expect(urlLien('https://www.izisolo.fr', 'JETON')).toBe('https://www.izisolo.fr/pointage-invite/JETON');
    expect(urlLien('https://www.izisolo.fr/', 'JETON')).toBe('https://www.izisolo.fr/pointage-invite/JETON');
  });
});

// ── 2. Le temps ────────────────────────────────────────────────────────────

test.describe('expiration — ancrée sur la séance, pas sur la création', () => {
  test('23h59 à Paris, été comme hiver', () => {
    expect(parisVersUtc('2026-01-15T23:59:59').toISOString()).toBe('2026-01-15T22:59:59.000Z'); // UTC+1
    expect(parisVersUtc('2026-07-15T23:59:59').toISOString()).toBe('2026-07-15T21:59:59.000Z'); // UTC+2
  });

  test('un lien préparé à l\'avance ne meurt pas avant le cours', () => {
    const maintenant = new Date('2026-08-25T10:00:00Z');
    // Séance dans deux semaines : l'expiration suit la SÉANCE.
    const exp = expirationPour({ date: '2026-09-08' }, 'fin_journee', maintenant);
    expect(exp.toISOString()).toBe('2026-09-08T21:59:59.000Z');
    expect(exp.getTime()).toBeGreaterThan(maintenant.getTime());
  });

  test('un lien créé APRÈS la séance (pointage oublié) naît valide', () => {
    const maintenant = new Date('2026-08-25T10:00:00Z');
    const exp = expirationPour({ date: '2026-08-20' }, 'fin_journee', maintenant);
    // Ancré sur aujourd'hui, pas sur une séance passée : sinon il naîtrait expiré.
    expect(exp.getTime()).toBeGreaterThan(maintenant.getTime());
    expect(exp.toISOString()).toBe('2026-08-25T21:59:59.000Z');
  });

  test('les trois durées proposées font bien 0, 1 et 7 jours', () => {
    const maintenant = new Date('2026-08-25T10:00:00Z');
    const cours = { date: '2026-08-25' };
    expect(expirationPour(cours, 'fin_journee', maintenant).toISOString()).toBe('2026-08-25T21:59:59.000Z');
    expect(expirationPour(cours, 'j1', maintenant).toISOString()).toBe('2026-08-26T21:59:59.000Z');
    expect(expirationPour(cours, 'j7', maintenant).toISOString()).toBe('2026-09-01T21:59:59.000Z');
    // Durée inconnue = la plus courte, jamais la plus longue.
    expect(expirationPour(cours, 'nimporte-quoi', maintenant).toISOString()).toBe('2026-08-25T21:59:59.000Z');
  });

  test('un cours sans date ne produit aucun lien', () => {
    expect(expirationPour({}, 'j7')).toBeNull();
    expect(expirationPour(null, 'j7')).toBeNull();
  });

  test('le catalogue de durées et son défaut restent cohérents', () => {
    expect(DUREES.map(d => d.cle)).toEqual(['fin_journee', 'j1', 'j7']);
    expect(DUREES.some(d => d.cle === DUREE_DEFAUT)).toBe(true);
  });

  test('jourParis rend bien la journée de Paris, pas celle d\'UTC', () => {
    // 22h30 UTC le 24 = déjà le 25 à Paris (heure d'été).
    expect(jourParis(new Date('2026-08-24T22:30:00Z'))).toBe('2026-08-25');
  });
});

// ── 3. La fermeture ────────────────────────────────────────────────────────

test.describe('etatLien / verifierLien — un lien fermé ferme', () => {
  test('actif, révoqué, expiré', () => {
    const t = new Date('2026-08-25T12:00:00Z');
    expect(etatLien(lienActif(), t)).toBe('actif');
    expect(etatLien(lienActif({ revoque_at: '2026-08-25T09:00:00Z' }), t)).toBe('revoque');
    expect(etatLien(lienActif({ expire_at: '2026-08-24T21:59:59Z' }), t)).toBe('expire');
    expect(etatLien(lienActif({ expire_at: null }), t)).toBe('expire');
    expect(etatLien(null, t)).toBe('expire');
  });

  test('la révocation prime sur une expiration encore lointaine', () => {
    const t = new Date('2026-08-25T12:00:00Z');
    const lien = lienActif({ revoque_at: '2026-08-25T11:00:00Z', expire_at: '2027-01-01T00:00:00Z' });
    expect(etatLien(lien, t)).toBe('revoque');
    expect(verifierLien(lien, coursOk(), t).ok).toBe(false);
  });

  test('le cas nominal passe', () => {
    const r = verifierLien(lienActif(), coursOk(), new Date('2026-08-25T18:00:00Z'));
    expect(r.ok).toBe(true);
  });

  test('un lien inexistant ne dit rien du studio', () => {
    const r = verifierLien(null, null, new Date());
    expect(r.ok).toBe(false);
    expect(r.code).toBe('INTROUVABLE');
    expect(r.message).not.toMatch(/studio|profile|uuid/i);
  });

  test('une séance annulée n\'est pas pointable par un lien', () => {
    const r = verifierLien(lienActif(), coursOk({ est_annule: true }), new Date('2026-08-25T18:00:00Z'));
    expect(r.ok).toBe(false);
    expect(r.code).toBe('ANNULE');
  });

  test('LE test qui compte : un lien ne vaut que pour SON cours et SON studio', () => {
    const t = new Date('2026-08-25T18:00:00Z');
    // Même studio, autre cours.
    expect(verifierLien(lienActif(), coursOk({ id: AUTRE_COURS }), t).code).toBe('INCOHERENT');
    // Même cours, autre studio.
    expect(verifierLien(lienActif(), coursOk({ profile_id: AUTRE_PROFIL }), t).code).toBe('INCOHERENT');
  });

  test('tous les refus portent un message lisible ET un code', () => {
    const t = new Date('2026-08-30T12:00:00Z');
    for (const r of [
      verifierLien(null, null, t),
      verifierLien(lienActif({ revoque_at: '2026-08-25T09:00:00Z' }), coursOk(), t),
      verifierLien(lienActif(), coursOk(), t), // expiré à cette date
      verifierLien(lienActif({ expire_at: '2026-09-30T00:00:00Z' }), null, t),
    ]) {
      expect(r.ok).toBe(false);
      expect(typeof r.code).toBe('string');
      expect(r.message.length).toBeGreaterThan(10);
    }
  });
});

// ── 4. La minimisation ─────────────────────────────────────────────────────

test.describe('minimisation — le lien sort des noms, rien d\'autre', () => {
  const presenceComplete = {
    id: 'pres-1',
    profile_id: PROFIL,
    cours_id: COURS,
    client_id: 'cli-1',
    abonnement_id: 'abo-1',
    statut_pointage: 'inscrit',
    pointee: false,
    type_presence: 'normal',
    annulation_tardive: false,
    payer_plus_tard: true,
    est_due: true,
    clients: {
      id: 'cli-1', prenom: 'Léa', nom: 'Martin',
      email: 'lea@example.com', telephone: '0612345678',
      date_naissance: '1990-04-01', notes: 'genou gauche',
    },
    abonnements: { id: 'abo-1', offre_nom: 'Carnet 10', seances_total: 10, seances_utilisees: 7 },
  };

  test('LE test de fuite : aucune coordonnée, aucun carnet, aucune dette', () => {
    const sortie = presencePourInvitee(presenceComplete);
    const json = JSON.stringify(sortie);
    for (const interdit of [
      'lea@example.com', '0612345678', '1990-04-01', 'genou gauche',
      'Carnet 10', 'seances_utilisees', 'abonnement', 'payer_plus_tard',
      'est_due', 'client_id', 'profile_id',
    ]) {
      expect(json).not.toContain(interdit);
    }
    // Les clés autorisées, à la clé près : tout ajout futur casse ce test,
    // et c'est exactement ce qu'on veut.
    expect(Object.keys(sortie).sort()).toEqual(['essai', 'id', 'info', 'nom', 'prenom', 'statut']);
    expect(sortie.prenom).toBe('Léa');
    expect(sortie.nom).toBe('Martin');
  });

  test('le statut est dérivé comme côté prof (pointee sans statut)', () => {
    expect(presencePourInvitee({ id: 'p', pointee: true }).statut).toBe('present');
    expect(presencePourInvitee({ id: 'p', pointee: false }).statut).toBe('inscrit');
    expect(presencePourInvitee({ id: 'p', statut_pointage: 'excuse', pointee: false }).statut).toBe('excuse');
  });

  test('les lignes qui ne se pointent pas sont marquées « info »', () => {
    expect(presencePourInvitee({ id: 'p', annulation_tardive: true }).info).toBe(true);
    expect(presencePourInvitee({ id: 'p', statut_pointage: 'annule' }).info).toBe(true);
    expect(presencePourInvitee({ id: 'p', statut_pointage: 'declinee' }).info).toBe(true);
    expect(presencePourInvitee({ id: 'p', statut_pointage: 'inscrit' }).info).toBe(false);
  });

  test('un essai est signalé : la remplaçante ne connaît pas le groupe', () => {
    expect(presencePourInvitee({ id: 'p', type_presence: 'essai' }).essai).toBe(true);
    expect(presencePourInvitee({ id: 'p', type_presence: 'normal' }).essai).toBe(false);
  });

  test('LE lien visio d\'un cours en ligne ne sort JAMAIS (v86 est payant)', () => {
    const sortie = coursPourInvitee({
      id: COURS, profile_id: PROFIL, nom: 'Yin en ligne', date: '2026-08-25', heure: '18:30:00',
      format: 'en_ligne', lien_visio: 'https://zoom.us/j/SECRET', lien_visio_verrouille: true,
      tarif_unitaire: 20, stripe_payment_link_unit: 'https://buy.stripe.com/SECRET',
      capacite_max: 12,
    }, 'Atelier Soleil');
    const json = JSON.stringify(sortie);
    expect(json).not.toContain('zoom.us');
    expect(json).not.toContain('SECRET');
    expect(json).not.toContain('buy.stripe.com');
    expect(json).not.toContain('tarif');
    expect(sortie.en_ligne).toBe(true);       // le badge, sans le lien
    expect(sortie.heure).toBe('18:30');       // Postgres 'time' → HH:MM (§12)
    expect(sortie.studio_nom).toBe('Atelier Soleil');
  });
});

// ── 5. Les entrées ─────────────────────────────────────────────────────────

test.describe('entrées — tronquer plutôt que perdre', () => {
  test('seuls trois statuts sont posables par une invitée', () => {
    expect(STATUTS_INVITE).toEqual(['present', 'absent', 'excuse']);
    for (const s of STATUTS_INVITE) expect(statutInviteValide(s)).toBe(true);
    // Tout ce qui touche à l'argent ou aux cas reste chez la prof.
    for (const s of ['absent_compte', 'annule', 'declinee', 'inscrit', '', null, 'DROP TABLE']) {
      expect(statutInviteValide(s)).toBe(false);
    }
  });

  test('le nom de l\'invitée est nettoyé, jamais rejeté', () => {
    expect(sanitizeNomInvitee('  Claire   Dupont ')).toBe('Claire Dupont');
    expect(sanitizeNomInvitee('')).toBeNull();
    expect(sanitizeNomInvitee(null)).toBeNull();
    expect(sanitizeNomInvitee('x'.repeat(200))).toHaveLength(60);
  });

  test('la note de l\'invitée est TRONQUÉE, jamais jetée', () => {
    // Perdre « Léa est venue mais n'était pas sur la liste » parce que le
    // message fait 501 caractères serait absurde.
    expect(sanitizeNote('  coucou  ')).toBe('coucou');
    expect(sanitizeNote('')).toBeNull();
    expect(sanitizeNote('a'.repeat(900))).toHaveLength(500);
  });

  test('les libellés d\'état sont en français, sans jargon', () => {
    expect(labelEtat('actif')).toBe('Actif');
    expect(labelEtat('revoque')).toBe('Désactivé');
    expect(labelEtat('expire')).toBe('Expiré');
  });
});
