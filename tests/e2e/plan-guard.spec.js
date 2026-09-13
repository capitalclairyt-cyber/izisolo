/**
 * La matrice des plans — verrou du gating par capacités.
 *
 * B3a (2026-07-26) : gating par CAPACITÉS, une frontière « boucle élève ».
 * Lot 0 Associations & Studios (2026-09-13) : les PALIERS remplacent l'échelle
 * de rangs. Association et Studio sont deux frères (Complet + équipe + leur
 * famille), pas deux marches : « la capacité d'équipe » est ouverte par les
 * deux, « la vie de l'asso » par l'un seul, « la gestion du studio » par
 * l'autre seul.
 *
 * Verrouille :
 *  1. effectivePlan : essai actif → le plan ESSAYÉ selon la structure ;
 *     premium → pro ; multi / multi_free → studio ; free → free ; jamais un
 *     alias en sortie ; essai fini sans abonnement → solo (Essentiel gratuit).
 *  2. can(profile, capacite) : Essentiel n'a jamais une capacité 'pro',
 *     Complet a toute la boucle élève et rien de l'équipe, Association et
 *     Studio ont l'équipe, chacun sa famille, free a tout, capacité INCONNUE
 *     = réservée Complet (pas de fuite par typo).
 *  3. requireCapacite : la 403 typée { code: 'PLAN_REQUIS', upgradeTo, plans }.
 *
 * Test Node pur — les dates d'essai sont relatives à l'horloge réelle
 * (TRIAL_DAYS = 30) : -3 j = actif, -60 j = fini, quel que soit le jour.
 */
import { test, expect } from '@playwright/test';
import { can, requireCapacite, effectivePlan, plansPour, planMinimum, libellePlansPour } from '../../lib/plan-guard.js';
import { CAPACITES, PALIERS, PLANS } from '../../lib/constantes.js';

const j = (n) => new Date(Date.now() + n * 864e5).toISOString();

const SOLO_GRATUIT  = { plan: 'solo', trial_started_at: j(-60) };
const SOLO_EN_ESSAI = { plan: 'solo', trial_started_at: j(-3) };
const PRO           = { plan: 'pro' };
const ASSO          = { plan: 'asso' };
const STUDIO        = { plan: 'studio' };
const PREMIUM       = { plan: 'premium' };
const MULTI         = { plan: 'multi' };
const FREE          = { plan: 'free' };

test.describe('effectivePlan — essai, alias legacy, free', () => {
  test('essai actif → le plan ESSAYÉ selon la structure', () => {
    expect(effectivePlan(SOLO_EN_ESSAI)).toBe('pro');
    expect(effectivePlan({ ...SOLO_EN_ESSAI, type_structure: 'association' })).toBe('asso');
    expect(effectivePlan({ ...SOLO_EN_ESSAI, type_structure: 'studio' })).toBe('studio');
  });
  test('essai fini sans abonnement → Essentiel gratuit, quel que soit le type', () => {
    expect(effectivePlan(SOLO_GRATUIT)).toBe('solo');
    expect(effectivePlan({ ...SOLO_GRATUIT, type_structure: 'association' })).toBe('solo');
  });
  test('les alias : premium → pro ; multi et multi_free → studio', () => {
    expect(effectivePlan(PREMIUM)).toBe('pro');
    expect(effectivePlan(MULTI)).toBe('studio');
    expect(effectivePlan({ plan: 'multi_free' })).toBe('studio');
  });
  test('free, pro, asso, studio inchangés ; null → solo', () => {
    expect(effectivePlan(FREE)).toBe('free');
    expect(effectivePlan(PRO)).toBe('pro');
    expect(effectivePlan(ASSO)).toBe('asso');
    expect(effectivePlan(STUDIO)).toBe('studio');
    expect(effectivePlan(null)).toBe('solo');
  });
  test('un abonnement résilié ramène sur Essentiel, même si la colonne plan dit encore pro', () => {
    expect(effectivePlan({ plan: 'pro', stripe_subscription_status: 'canceled', trial_started_at: j(-90) })).toBe('solo');
    expect(effectivePlan({ plan: 'asso', stripe_subscription_status: 'incomplete_expired', trial_started_at: j(-90) })).toBe('solo');
  });
});

test.describe('can — la frontière boucle élève', () => {
  test('demande d\'offre (v97) = Complet, comme tout geste d\'élève en ligne (2026-09-07)', () => {
    expect(can(SOLO_GRATUIT, 'demande_offre')).toBe(false);
    expect(can(PRO, 'demande_offre')).toBe(true);
    expect(can(SOLO_GRATUIT, 'sondages')).toBe(false);
    expect(can(SOLO_GRATUIT, 'espace_eleve')).toBe(false);
    expect(can(SOLO_GRATUIT, 'cours_prives')).toBe(false);
    expect(can(SOLO_GRATUIT, 'portail_enrichi')).toBe(false);
  });

  test('Essentiel (gratuit) : la prof seule OUI, la boucle élève NON', () => {
    expect(can(SOLO_GRATUIT, 'carnets_manuels')).toBe(true);   // D1
    expect(can(SOLO_GRATUIT, 'export_compta')).toBe(true);     // D2
    expect(can(SOLO_GRATUIT, 'reservation_en_ligne')).toBe(false);
    expect(can(SOLO_GRATUIT, 'espace_eleve')).toBe(false);
    expect(can(SOLO_GRATUIT, 'messagerie')).toBe(false);
    expect(can(SOLO_GRATUIT, 'paiement_en_ligne')).toBe(false);
    expect(can(SOLO_GRATUIT, 'photo_import')).toBe(false);
  });
  test('Complet (pro) et premium legacy : toute la boucle élève, rien de l\'équipe', () => {
    for (const [cap, palier] of Object.entries(CAPACITES)) {
      const attendu = palier === 'solo' || palier === 'pro';
      expect(can(PRO, cap), `capacité ${cap}`).toBe(attendu);
      expect(can(PREMIUM, cap), `capacité ${cap} (premium legacy)`).toBe(attendu); // le mapping en action
    }
    expect(can(PRO, 'equipe')).toBe(false);
  });
  test('Association et Studio : tout Complet + l\'équipe ; chacun sa famille, jamais celle de l\'autre', () => {
    for (const cap of Object.keys(CAPACITES)) {
      const palier = CAPACITES[cap];
      if (palier === 'asso') { expect(can(ASSO, cap), cap).toBe(true); expect(can(STUDIO, cap), cap).toBe(false); continue; }
      if (palier === 'studio') { expect(can(STUDIO, cap), cap).toBe(true); expect(can(ASSO, cap), cap).toBe(false); continue; }
      expect(can(ASSO, cap), `asso ${cap}`).toBe(true);
      expect(can(STUDIO, cap), `studio ${cap}`).toBe(true);
    }
    expect(can(ASSO, 'equipe')).toBe(true);
    expect(can(STUDIO, 'equipe')).toBe(true);
    // Les legacy suivent Studio.
    expect(can(MULTI, 'equipe')).toBe(true);
    expect(can({ plan: 'multi_free' }, 'equipe')).toBe(true);
  });
  test('essai actif = le plan essayé ; essai fini = Essentiel', () => {
    expect(can(SOLO_EN_ESSAI, 'reservation_en_ligne')).toBe(true);
    expect(can(SOLO_EN_ESSAI, 'equipe')).toBe(false);
    expect(can({ ...SOLO_EN_ESSAI, type_structure: 'association' }, 'equipe')).toBe(true);
    expect(can(SOLO_GRATUIT, 'reservation_en_ligne')).toBe(false);
    expect(can(SOLO_GRATUIT, 'export_compta')).toBe(true);
  });
  test('free (interne) : tout, y compris une capacité inconnue', () => {
    expect(can(FREE, 'reservation_en_ligne')).toBe(true);
    expect(can(FREE, 'capacite_qui_n_existe_pas')).toBe(true);
  });
  test('capacité inconnue = réservée Complet (pas de fuite par typo)', () => {
    expect(can(SOLO_GRATUIT, 'capacite_qui_n_existe_pas')).toBe(false);
    expect(can(PRO, 'capacite_qui_n_existe_pas')).toBe(true);
  });
  test('la matrice ne connaît que les paliers déclarés, et chaque palier nomme des plans publics', () => {
    for (const [cap, palier] of Object.entries(CAPACITES)) {
      expect(Object.keys(PALIERS), `capacité ${cap}`).toContain(palier);
    }
    for (const [palier, plans] of Object.entries(PALIERS)) {
      expect(plans.length, palier).toBeGreaterThan(0);
      for (const p of plans) expect(PLANS[p]?.public, `${palier} → ${p}`).toBe(true);
    }
    // Le premier plan d'un palier est le moins cher : c'est lui qu'on nomme.
    for (const plans of Object.values(PALIERS)) {
      const prix = plans.map(p => PLANS[p].prix);
      expect(Math.min(...prix)).toBe(prix[0]);
    }
  });
});

test.describe('plansPour / planMinimum / libellePlansPour', () => {
  test('une capacité d\'équipe nomme Association ET Studio, jamais l\'un pour l\'autre', () => {
    expect(plansPour('equipe')).toEqual(['asso', 'studio']);
    expect(planMinimum('equipe')).toBe('asso');
    expect(libellePlansPour('equipe')).toBe('des plans Association et Studio');
  });
  test('une capacité de la boucle élève nomme Complet seul', () => {
    expect(planMinimum('messagerie')).toBe('pro');
    expect(libellePlansPour('messagerie')).toBe('du plan Complet');
  });
  test('capacité inconnue → le palier Complet', () => {
    expect(plansPour('capacite_qui_n_existe_pas')).toEqual(PALIERS.pro);
  });
});

test.describe('requireCapacite — la 403 typée', () => {
  test('autorisé → null', () => {
    expect(requireCapacite(PRO, 'mailing')).toBe(null);
    expect(requireCapacite(ASSO, 'equipe')).toBe(null);
  });
  test('refusé → 403 { code: PLAN_REQUIS, upgradeTo: pro }', async () => {
    const res = requireCapacite(SOLO_GRATUIT, 'mailing');
    expect(res).not.toBe(null);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('PLAN_REQUIS');
    expect(body.upgradeTo).toBe('pro');
    expect(body.plans).toEqual(['pro', 'asso', 'studio']);
  });
  test('refusé sur l\'équipe → nomme les deux plans, jamais Complet', async () => {
    const res = requireCapacite(PRO, 'equipe');
    const body = await res.json();
    expect(body.upgradeTo).toBe('asso');
    expect(body.plans).toEqual(['asso', 'studio']);
    expect(body.error).toContain('Association');
    expect(body.error).toContain('Studio');
    expect(body.error).not.toContain('Complet');
  });
});
