// ═══════════════════════════════════════════════════════════════════════════
// Verrou CI — l'équipe d'un studio et le plan Multi (lot 3 multi-prof,
// 2026-08-25, demande Colin : « tout ça n'est accessible qu'au plan multi ?
// il faut aussi un plan free multi pour les tests et les premiers studios »).
//
// Ce qu'on ne laisse pas glisser :
//   1. La bêta offerte doit être le plan payant MOINS LA FACTURE, jamais un
//      god mode : sinon les premières testeuses valident un produit qui
//      n'existe pas et ne remontent aucune vraie friction.
//   2. Le propriétaire ne se retire pas, et personne ne modifie ses propres
//      droits — deux façons de se retrouver enfermé dehors.
//   3. Aucun identifiant auth ne sort vers l'écran.
//   4. Les routes d'écriture sensibles déclarent leur permission : une
//      permission qui ne vit que dans l'UI ne vaut rien.
// ═══════════════════════════════════════════════════════════════════════════
import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PLANS, CAPACITES, ALL_PLANS, PUBLIC_PLANS } from '../../lib/constantes.js';
import { effectivePlan, getAccountStatus, isAccountFrozen, isReadOnly } from '../../lib/trial.js';
import { can } from '../../lib/plan-guard.js';
import { PRESETS } from '../../lib/studio-membre.js';
import {
  verifierEmailInvitation, peutModifierMembre, emailInvitation,
  normaliserEmail, membrePublic,
} from '../../lib/equipe.js';

const RACINE = process.cwd();

test.describe('plan Multi — et sa bêta, qui doit être fidèle', () => {
  test('Multi existe, forfait plat à 49 €, aucun quota', () => {
    expect(PLANS.multi.prix).toBe(49);
    expect(PLANS.multi.limiteClients).toBeNull();
    expect(PLANS.multi.limiteLieux).toBeNull();
    expect(PLANS.multi.limiteOffres).toBeNull();
  });

  test("LE test de la bêta : multi_free est Multi à l'identique, pas un god mode", () => {
    // Une bêta posée sur le plan `free` ouvrirait TOUTES les capacités (can()
    // y court-circuite) : les testeuses valideraient un produit qui n'existe
    // pas, et ne remonteraient aucune friction réelle.
    expect(effectivePlan({ plan: 'multi_free' })).toBe('multi');
    const beta = { plan: 'multi_free' };
    const payant = { plan: 'multi' };
    for (const cle of Object.keys(CAPACITES)) {
      expect(can(beta, cle), `capacité ${cle}`).toBe(can(payant, cle));
    }
    // Et surtout, elle ne prend PAS le court-circuit de `free`. La nuance
    // n'est pas visible sur une capacité inconnue (rien n'existe au-dessus de
    // Multi, donc elle passe légitimement) : elle se lit sur le plan effectif.
    // `free` = « ce compte ne suit aucune règle » ; `multi_free` = « ce compte
    // suit exactement les règles de Multi, on ne lui envoie pas la facture ».
    expect(effectivePlan(beta)).not.toBe('free');
    expect(effectivePlan(beta)).toBe('multi');
    expect(effectivePlan({ plan: 'free' })).toBe('free');
  });

  test('la bêta est invisible au public, facturée 0, mais garde la même économie', () => {
    expect(PLANS.multi_free.public).toBe(false);
    expect(PLANS.multi_free.prix).toBe(0);
    expect(PLANS.multi_free.fraisStripeIziSolo).toBe(PLANS.multi.fraisStripeIziSolo);
  });

  test("Multi n'est PAS encore public : la caisse Stripe ne sait pas l'encaisser", () => {
    // Afficher une carte dont le checkout renvoie 500 est pire que ne rien
    // afficher. Ce test tombera le jour où on l'ouvrira, volontairement.
    expect(PUBLIC_PLANS).toEqual(['solo', 'pro']);
    expect(ALL_PLANS).toContain('multi');
    expect(ALL_PLANS).toContain('multi_free');
  });

  test("l'échelle classe Multi au-dessus de Complet, sans rien lui retirer", () => {
    expect(can({ plan: 'solo' }, 'equipe')).toBe(false);
    expect(can({ plan: 'pro' }, 'equipe')).toBe(false);
    expect(can({ plan: 'multi' }, 'equipe')).toBe(true);
    expect(can({ plan: 'multi_free' }, 'equipe')).toBe(true);
    expect(can({ plan: 'multi' }, 'reservation_en_ligne')).toBe(true);
    expect(can({ plan: 'multi' }, 'export_compta')).toBe(true);
    expect(can({ plan: 'multi' }, 'lien_pointage')).toBe(true);
  });

  test("le trial reste Complet : inviter une collègue EST le moment d'upsell", () => {
    // Décision Colin 2026-08-25. Sinon une asso en essai perdrait ses profs
    // au 15e jour, d'un coup, sans écran pour l'annoncer.
    const enEssai = { plan: 'solo', trial_started_at: new Date().toISOString() };
    expect(effectivePlan(enEssai)).toBe('pro');
    expect(can(enEssai, 'equipe')).toBe(false);
  });

  test('LE piège du plan posé à la main : ni Stripe, ni essai, et pourtant PAS gelé', () => {
    // Un studio Multi posé depuis /admin n'a AUCUN abonnement Stripe (la
    // caisse ne sait pas encore l'encaisser) et la bêta offerte n'en aura
    // jamais. Leur essai des 14 jours est fini depuis des mois : sans les
    // nommer explicitement, ils tombent en `trial_expired` → compte GELÉ →
    // 402 sur toute écriture. C'est ce qui serait arrivé au PREMIER studio de
    // la bêta ; trouvé par la preuve, pas par la relecture.
    const vieilEssai = new Date(Date.now() - 200 * 86400000).toISOString();
    for (const plan of ['multi', 'multi_free']) {
      const studio = { plan, trial_started_at: vieilEssai, stripe_subscription_status: null };
      expect(getAccountStatus(studio), plan).toBe('subscribed');
      expect(isAccountFrozen(studio), plan).toBe(false);
      expect(isReadOnly(studio), plan).toBe(false);
      expect(can(studio, 'equipe'), plan).toBe(true);
    }
    // Et un Essentiel dans la même situation reste gelé : on n'a rien ouvert
    // au passage.
    const solo = { plan: 'solo', trial_started_at: vieilEssai, stripe_subscription_status: null };
    expect(isAccountFrozen(solo)).toBe(true);
  });

  test('premium reste mappé sur pro : les deux alias cohabitent', () => {
    expect(effectivePlan({ plan: 'premium' })).toBe('pro');
    expect(can({ plan: 'premium' }, 'equipe')).toBe(false);
  });
});

test.describe('équipe — qui a le droit de toucher à qui', () => {
  const proprio = { role: 'proprietaire', statut: 'actif', auth_user_id: 'u-1', permissions: {} };
  const admin = { role: 'admin', statut: 'actif', auth_user_id: 'u-2', permissions: PRESETS.admin };
  const prof = { role: 'prof', statut: 'actif', auth_user_id: 'u-3', permissions: PRESETS.prof };

  test('le propriétaire ne peut être ni modifié ni retiré', () => {
    // C'est le compte qui paie : le retirer laisserait un studio orphelin.
    expect(peutModifierMembre(admin, proprio).ok).toBe(false);
    expect(peutModifierMembre(proprio, proprio).ok).toBe(false);
  });

  test('personne ne modifie ses propres droits', () => {
    expect(peutModifierMembre(admin, { ...admin }).ok).toBe(false);
    expect(peutModifierMembre(proprio, prof).ok).toBe(true);
    expect(peutModifierMembre(admin, prof).ok).toBe(true);
  });

  test('une cible inexistante est refusée sans exploser', () => {
    expect(peutModifierMembre(admin, null).ok).toBe(false);
    expect(peutModifierMembre(null, prof).ok).toBe(false);
  });

  test('chaque refus porte une raison lisible par une prof', () => {
    for (const r of [peutModifierMembre(admin, proprio), peutModifierMembre(admin, { ...admin })]) {
      expect(r.raison.length).toBeGreaterThan(15);
      expect(r.raison).not.toMatch(/error|null|undefined/i);
    }
  });

  test("s'inviter soi-même est refusé AVANT de heurter l'index unique", () => {
    expect(verifierEmailInvitation('maude@studio.fr', 'MAUDE@studio.fr').ok).toBe(false);
    expect(verifierEmailInvitation('claire@x.fr', 'maude@studio.fr').ok).toBe(true);
    expect(verifierEmailInvitation('pas-un-email', 'maude@studio.fr').ok).toBe(false);
    expect(verifierEmailInvitation('', 'maude@studio.fr').ok).toBe(false);
    expect(verifierEmailInvitation(' Claire@X.FR ', 'maude@studio.fr').email).toBe('claire@x.fr');
    expect(normaliserEmail('  A@B.FR ')).toBe('a@b.fr');
  });
});

test.describe("l'email d'invitation dit ce qu'il faut, et rien de plus", () => {
  const membre = { role: 'prof', statut: 'actif', permissions: PRESETS.prof };

  test('il nomme qui invite, le rôle, les droits, et porte le lien', () => {
    const { subject, html } = emailInvitation({
      studioNom: 'Atelier Soleil', prenomInvitee: 'Claire', prenomProprietaire: 'Camille',
      lien: 'https://www.izisolo.fr/auth/callback?token=X', membre, compteExistant: false,
    });
    expect(subject).toContain('Camille');
    expect(subject).toContain('Atelier Soleil');
    expect(html).toContain('Bonjour Claire');
    expect(html).toContain('Prof');
    expect(html).toContain('Pointer les séances');
    expect(html).toContain('https://www.izisolo.fr/auth/callback?token=X');
  });

  test("il n'énumère PAS neuf permissions : une ligne suffit", () => {
    const admin = { role: 'admin', statut: 'actif', permissions: PRESETS.admin };
    const { html } = emailInvitation({ studioNom: 'S', lien: 'x', membre: admin, compteExistant: true });
    expect(html).toContain('Tous les droits');
    expect(html).not.toContain('Modifier les réglages');
  });

  test('le bouton dit la vérité selon que le compte existe ou non', () => {
    const neuf = emailInvitation({ studioNom: 'S', lien: 'x', membre, compteExistant: false }).html;
    const connu = emailInvitation({ studioNom: 'S', lien: 'x', membre, compteExistant: true }).html;
    expect(neuf).toContain('Choisir mon mot de passe');
    expect(connu).toContain('Ouvrir le studio');
    expect(connu).toContain('déjà un compte');
  });

  test('zéro tiret quadratin dans un texte destiné à un humain', () => {
    const { subject, html } = emailInvitation({
      studioNom: 'S', prenomProprietaire: 'Camille', lien: 'x', membre, compteExistant: false,
    });
    expect(subject).not.toContain('—');
    expect(html).not.toContain('—');
  });
});

test("membrePublic ne laisse JAMAIS sortir l'identifiant auth", () => {
  const sortie = membrePublic({
    id: 'm-1', profile_id: 'p-1', auth_user_id: 'SECRET-AUTH-ID', email: 'c@x.fr',
    role: 'prof', permissions: { pointer: true }, statut: 'actif',
    invite_at: 'a', accepte_at: 'b', revoque_at: null,
  });
  const json = JSON.stringify(sortie);
  expect(json).not.toContain('SECRET-AUTH-ID');
  expect(json).not.toContain('p-1');
  expect(sortie.liee).toBe(true); // l'information utile, sans l'identifiant
});

test("les routes d'écriture sensibles déclarent leur permission", () => {
  // Une permission qui ne vit que dans l'UI ne vaut rien : le navigateur peut
  // appeler la route à la main. Cette liste ne peut que s'allonger.
  const SENSIBLES = [
    'app/api/clients/[id]/route.js',
    'app/api/clients/import/route.js',
    'app/api/cours/[coursId]/annuler/route.js',
    'app/api/presences/[presenceId]/route.js',
    'app/api/presences/[presenceId]/relier/route.js',
    'app/api/paiements/[id]/route.js',
    'app/api/paiements/[id]/encaisser/route.js',
    'app/api/abonnements/[id]/route.js',
    'app/api/profile/route.js',
    'app/api/profile/page-publique/route.js',
    'app/api/urssaf/declaration/route.js',
    'app/api/factures/[id]/annuler/route.js',
    'app/api/messagerie/announce/route.js',
    'app/api/equipe/route.js',
    'app/api/equipe/[id]/route.js',
    'app/api/liens-pointage/route.js',
  ];
  const sansPerm = SENSIBLES.filter(rel => {
    const p = join(RACINE, ...rel.split('/'));
    if (!existsSync(p)) return false;
    return !/perm:\s*'/.test(readFileSync(p, 'utf8'));
  });
  expect(sansPerm, `Ajoute perm: '…' aux options withRoute.\n${sansPerm.join(', ')}`).toEqual([]);
});

test("withRoute applique bien la garde de permission, pas seulement l'écran", () => {
  const src = readFileSync(join(RACINE, 'lib', 'api-route.js'), 'utf8');
  expect(src).toContain("peut(authCtx.membre, perm)");
  expect(src).toContain('PERMISSION_REQUISE');
  // La garde doit tourner AVANT que le handler ne touche quoi que ce soit.
  expect(src.indexOf('PERMISSION_REQUISE')).toBeLessThan(src.indexOf('return await handler('));
});
