// ═══════════════════════════════════════════════════════════════════════════
// Verrou CI — les intervenantes et les ponts de l'écosystème (lot 1
// Associations & Studios, v111, 2026-09-13).
//
// Ce qu'on ne laisse pas glisser :
//   1. Le lien permanent d'une intervenante : un membre retiré, un lien
//      révoqué ou expiré n'ouvrent rien ; le lien vaut la saison ; ce qui
//      sort est minimisé (ni email d'élève, ni carnet, ni lien visio).
//   2. Le classement de ses séances : les siennes, puis les orphelines,
//      jamais celles d'une autre intervenante, jamais une annulée.
//   3. Le pont 1 : une invitation refuse l'adresse de la prof elle-même, un
//      type inconnu, un email difforme ; tronque un nom trop long au lieu de
//      le rejeter ; un lien accepté ou expiré n'ouvre plus rien.
//   4. La lecture seule : un membre marqué `lecture_seule` ne garde que les
//      permissions de lecture, quel que soit son jsonb.
//   5. Les libellés : prénom + nom avant l'email ; un membre sans prénom ne
//      va pas sur le portail.
//   6. La migration v111 dit la même chose que le code (relecture).
// ═══════════════════════════════════════════════════════════════════════════
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import {
  urlLienIntervenante, finDeSaison, etatLienIntervenante, verifierLienIntervenante,
  membrePourIntervenante, seancePourIntervenante, classerSeances, FENETRE_JOURS,
} from '../../lib/lien-intervenante.js';
import {
  sanitizeInvitation, verifierInvitation, invitationPublique, emailInvitationStructure,
  emailParrainAccepte, expirationInvitation, TYPES_INVITABLES, COOKIE_PARRAINAGE,
} from '../../lib/parrainage.js';
import { peut, PERMISSIONS_LECTURE, PRESETS } from '../../lib/studio-membre.js';
import { labelIntervenante, prenomIntervenante, membrePourPortail, equipePourPortail } from '../../lib/intervenante.js';

const j = (n) => new Date(Date.now() + n * 864e5).toISOString();

test.describe('le lien permanent : états et verdicts', () => {
  test('url : /intervenante/<jeton>, sans double slash', () => {
    expect(urlLienIntervenante('https://www.izisolo.fr/', 'abc')).toBe('https://www.izisolo.fr/intervenante/abc');
  });

  test('finDeSaison : le 31 août qui suit', () => {
    const juillet = finDeSaison(new Date('2026-07-01T10:00:00Z'));
    expect(juillet.toISOString().slice(0, 10)).toBe('2026-08-31');
    const septembre = finDeSaison(new Date('2026-09-13T10:00:00Z'));
    expect(septembre.toISOString().slice(0, 10)).toBe('2027-08-31');
    // 31 août 23:59 Paris = 21:59 UTC en été.
    expect(septembre.toISOString()).toBe('2027-08-31T21:59:00.000Z');
  });

  test('état : aucun, actif, révoqué, expiré', () => {
    expect(etatLienIntervenante({})).toBe('aucun');
    expect(etatLienIntervenante({ lien_hash: 'h', lien_expire_at: j(30) })).toBe('actif');
    expect(etatLienIntervenante({ lien_hash: 'h', lien_expire_at: j(30), lien_revoque_at: j(-1) })).toBe('revoque');
    expect(etatLienIntervenante({ lien_hash: 'h', lien_expire_at: j(-1) })).toBe('expire');
    expect(etatLienIntervenante({ lien_hash: 'h' })).toBe('expire'); // sans expiration = pas un lien valide
  });

  test('verdict : un membre retiré, un lien révoqué ou expiré ne rentrent pas', () => {
    const ok = { statut: 'invite', lien_hash: 'h', lien_expire_at: j(30) };
    expect(verifierLienIntervenante(ok).ok).toBe(true);
    expect(verifierLienIntervenante({ ...ok, statut: 'actif' }).ok).toBe(true);
    expect(verifierLienIntervenante({ ...ok, statut: 'revoque' }).code).toBe('RETIREE');
    expect(verifierLienIntervenante({ ...ok, lien_revoque_at: j(-1) }).code).toBe('REVOQUE');
    expect(verifierLienIntervenante({ ...ok, lien_expire_at: j(-1) }).code).toBe('EXPIRE');
    expect(verifierLienIntervenante(null).code).toBe('INTROUVABLE');
    expect(verifierLienIntervenante({ statut: 'actif' }).code).toBe('INTROUVABLE');
  });

  test('minimisation : ce qui sort d\'un membre et d\'une séance', () => {
    const m = membrePourIntervenante({ prenom: 'Léa', nom: 'M', email: 'lea@x.fr', auth_user_id: null, permissions: { argent_voir: true }, lien_hash: 'secret' }, 'Asso');
    expect(m).toEqual({ prenom: 'Léa', nom: 'M', studio_nom: 'Asso', a_un_compte: false, email: 'lea@x.fr' });
    expect(Object.keys(m)).not.toContain('permissions');
    expect(Object.keys(m)).not.toContain('lien_hash');
    const s = seancePourIntervenante({ id: 'c1', nom: 'Yoga', date: '2026-09-20', heure: '18:00:00', format: 'visio', lien_visio: 'https://zoom.us/x', intervenant_id: 'm1', mienne: true }, 4);
    expect(s.heure).toBe('18:00');
    expect(s.en_ligne).toBe(true);
    expect(s.mienne).toBe(true);
    expect(s.nb_inscrites).toBe(4);
    expect(Object.keys(s)).not.toContain('lien_visio');
    expect(Object.keys(s)).not.toContain('intervenant_id');
  });

  test('classement : les miennes, les orphelines, jamais celles d\'une autre ni une annulée', () => {
    const cours = [
      { id: 'a', date: '2026-09-21', heure: '10:00', intervenant_id: 'moi' },
      { id: 'b', date: '2026-09-20', heure: '18:00', intervenant_id: 'moi' },
      { id: 'c', date: '2026-09-19', heure: '09:00', intervenant_id: null },
      { id: 'd', date: '2026-09-19', heure: '09:00', intervenant_id: 'autre' },
      { id: 'e', date: '2026-09-22', heure: '09:00', intervenant_id: 'moi', est_annule: true },
    ];
    const { miennes, orphelines } = classerSeances(cours, 'moi');
    expect(miennes.map(c => c.id)).toEqual(['b', 'a']);
    expect(orphelines.map(c => c.id)).toEqual(['c']);
    expect(FENETRE_JOURS.avant).toBe(7);
    expect(FENETRE_JOURS.apres).toBe(30);
  });
});

test.describe('le pont 1 : faire entrer sa structure', () => {
  test('sanitize : refuse sa propre adresse, un email difforme, un type inconnu ; tronque le nom', () => {
    expect(sanitizeInvitation({ nom: 'Asso', email: 'maude@x.fr', type: 'association' }, 'Maude@X.fr').ok).toBe(false);
    expect(sanitizeInvitation({ nom: 'Asso', email: 'pas-un-email', type: 'association' }, 'a@b.fr').ok).toBe(false);
    expect(sanitizeInvitation({ nom: 'Asso', email: 'c@d.fr', type: 'solo' }, 'a@b.fr').ok).toBe(false);
    expect(sanitizeInvitation({ nom: '', email: 'c@d.fr', type: 'studio' }, 'a@b.fr').ok).toBe(false);
    const long = sanitizeInvitation({ nom: 'x'.repeat(500), email: ' Contact@Asso.FR ', type: 'association', message: 'm'.repeat(1000) }, 'a@b.fr');
    expect(long.ok).toBe(true);
    expect(long.nom.length).toBe(120);
    expect(long.message.length).toBe(600);
    expect(long.email).toBe('contact@asso.fr');
    expect(TYPES_INVITABLES).toEqual(['association', 'studio']);
    expect(COOKIE_PARRAINAGE).toBe('izi_parrainage');
  });

  test('verdict d\'une invitation : envoyée ok ; acceptée, annulée, expirée non', () => {
    const inv = { statut: 'envoyee', expire_at: j(10) };
    expect(verifierInvitation(inv).ok).toBe(true);
    expect(verifierInvitation({ ...inv, statut: 'acceptee' }).code).toBe('DEJA_ACCEPTEE');
    expect(verifierInvitation({ ...inv, statut: 'annulee' }).code).toBe('ANNULEE');
    expect(verifierInvitation({ ...inv, expire_at: j(-1) }).code).toBe('EXPIREE');
    expect(verifierInvitation(null).code).toBe('INTROUVABLE');
    const exp = expirationInvitation(new Date('2026-09-13T00:00:00Z'));
    expect(exp.toISOString().slice(0, 10)).toBe('2026-10-13');
  });

  test('ce que l\'onboarding affiche : jamais l\'email de la structure ni le jeton', () => {
    const pub = invitationPublique({ nom_structure: 'Asso', type_structure: 'association', email_structure: 'contact@asso.fr', token_hash: 'h' }, { prenom: 'Maude', studio_nom: 'Maude Yoga' });
    expect(pub).toEqual({ nom_structure: 'Asso', type_structure: 'association', label_type: 'Une association', parrain_prenom: 'Maude', parrain_studio: 'Maude Yoga' });
  });

  test('les emails ne promettent aucune remise et échappent le message libre', () => {
    const e = emailInvitationStructure({ prenomParrain: 'Maude', studioParrain: 'Maude Yoga', nomStructure: 'Asso <b>', type: 'association', lien: 'https://x/parrainage/t', message: '<script>x</script>' });
    expect(e.subject).toContain('Maude');
    expect(e.html).toContain('https://x/parrainage/t');
    expect(e.html).not.toContain('<script>');
    expect(e.html).toContain('&lt;script&gt;');
    expect(e.html).not.toMatch(/-50|remise|mois offert/i);
    const a = emailParrainAccepte({ prenomParrain: 'Maude', nomStructure: 'Asso', lien: 'https://x/dashboard' });
    expect(a.subject).toContain('Asso');
    expect(a.html).toContain('intervenante');
  });
});

test.describe('la lecture seule', () => {
  test('un membre lecture_seule ne garde que les permissions de lecture', () => {
    const admin = { role: 'admin', statut: 'actif', permissions: PRESETS.admin, lecture_seule: true };
    for (const cle of Object.keys(PRESETS.admin)) {
      expect(peut(admin, cle), cle).toBe(PERMISSIONS_LECTURE.includes(cle));
    }
    expect(PERMISSIONS_LECTURE).toEqual(['eleves_voir', 'argent_voir']);
    // Sans le drapeau, rien ne change.
    expect(peut({ role: 'admin', statut: 'actif', permissions: PRESETS.admin }, 'pointer')).toBe(true);
    // Le propriétaire n'est jamais en lecture seule (c'est son studio).
    expect(peut({ role: 'proprietaire', statut: 'actif', permissions: {}, lecture_seule: true }, 'pointer')).toBe(true);
  });
});

test.describe('les libellés', () => {
  test('prénom et nom avant l\'email', () => {
    expect(labelIntervenante({ prenom: 'Léa', nom: 'Martin', email: 'lea@x.fr' })).toBe('Léa Martin');
    expect(labelIntervenante({ email: 'claire.dupont@x.fr' })).toBe('Claire.dupont');
    expect(prenomIntervenante({ prenom: 'Léa', nom: 'Martin' })).toBe('Léa');
    expect(prenomIntervenante({ email: 'claire@x.fr' })).toBe('Claire');
  });

  test('le portail ne montre pas un membre sans prénom, ni son email', () => {
    expect(membrePourPortail({ id: 'm', email: 'x@y.fr' })).toBeNull();
    const m = membrePourPortail({ id: 'm', email: 'x@y.fr', prenom: 'Léa', bio: ' Prof de yin ', photo_url: null, permissions: {} });
    expect(m).toEqual({ id: 'm', prenom: 'Léa', nom: null, bio: 'Prof de yin', photo_url: null });
    const equipe = equipePourPortail({ prenom: 'Maude', nom: 'P', photo_url: 'https://x/p.jpg' }, [
      { id: 'a', role: 'proprietaire', prenom: 'Maude' },
      { id: 'b', role: 'prof', prenom: 'Léa', email: 'l@x.fr' },
      { id: 'c', role: 'prof', email: 'sansprenom@x.fr' },
    ]);
    expect(equipe.map(e => e.prenom)).toEqual(['Maude', 'Léa']);
    expect(equipe[0].proprietaire).toBe(true);
  });
});

test.describe('la migration v111 dit la même chose que le code', () => {
  const sql = readFileSync('migrations-v111-intervenantes-ponts.sql', 'utf8');
  test('les colonnes du membre et du lien, la série, la table du pont 1', () => {
    for (const col of ['prenom text', 'nom text', 'bio text', 'photo_url text', 'lien_hash text', 'lien_expire_at timestamptz', 'lien_revoque_at timestamptz', 'lien_usages integer']) {
      expect(sql, col).toContain(col);
    }
    expect(sql).toContain('idx_studio_membres_lien_hash');
    expect(sql).toContain('alter table public.recurrences\n  add column if not exists intervenant_id');
    expect(sql).toContain('create table if not exists public.invitations_structure');
    expect(sql).toContain("check (type_structure in ('association', 'studio'))");
    expect(sql).toContain("check (statut in ('envoyee', 'acceptee', 'annulee'))");
    expect(sql).toContain('parrainee_par uuid references public.profiles(id)');
  });
  test('aucune policy anon sur les invitations (coordonnées de tiers)', () => {
    expect(sql).not.toMatch(/to anon/i);
    expect(sql).toContain('enable row level security');
  });
});
