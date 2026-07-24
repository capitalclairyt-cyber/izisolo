// ============================================================================
// IziSolo — Helpers stats ADMIN (server only, client service_role)
// ----------------------------------------------------------------------------
// Construit les infos qui manquaient à l'espace admin (retour Colin
// 2026-07-23) : statut de compte réel (trial/abonné/impayé…), activité par
// compte (élèves, cours, paiements), MRR estimé, funnel d'activation.
//
// ⚠️ PostgREST plafonne chaque requête à 1000 lignes (db-max-rows) — la leçon
// du cron d'archivage : TOUTES les lectures « globales » ici sont PAGINÉES et
// vérifient `error` (jamais data null → « zéro » silencieux).
// ============================================================================

import { PLANS } from '@/lib/constantes';
import { getAccountStatus, getTrialStatus } from '@/lib/trial';

/** Lit TOUTES les lignes d'une table (colonnes minimales), paginé par 1000. */
export async function fetchAllRows(supabase, table, colonnes, applyFilters = null) {
  const rows = [];
  const PAGE = 1000;
  for (let i = 0; i < 50; i++) { // garde-fou 50 000 lignes
    let q = supabase.from(table).select(colonnes).range(i * PAGE, (i + 1) * PAGE - 1);
    if (applyFilters) q = applyFilters(q);
    const { data, error } = await q;
    if (error) {
      console.error(`[admin-stats] ${table}:`, error.message);
      break;
    }
    rows.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

/** Map profile_id → nombre de lignes. */
export function countParProfil(rows) {
  const m = {};
  for (const r of rows) if (r.profile_id) m[r.profile_id] = (m[r.profile_id] || 0) + 1;
  return m;
}

/**
 * Compte de TEST (heuristique — comptes de Colin/Maude/démo à exclure du
 * funnel et du MRR ; cf. mémoire projet « comptes de test »).
 */
export function estCompteTest({ email, studio_slug, studio_nom }) {
  const e = (email || '').toLowerCase();
  const slug = (studio_slug || '').toLowerCase();
  const nom = (studio_nom || '').toLowerCase();
  if (/^colin([+.@]|$)/.test(e) || e.startsWith('colin+')) return true;
  if (e === 'bonjour@melutek.com') return true; // compte démo seedé
  if (['atelier-soleil', 'colin-studio', 'colin2', 'ben-yoga'].includes(slug)) return true;
  if (nom.includes('démo') || nom.includes('demo')) return true;
  return false;
}

const PRIX_MENSUEL = {
  solo: PLANS?.solo?.prix ?? 17,
  pro: PLANS?.pro?.prix ?? 22,
  premium: PLANS?.premium?.prix ?? 79,
};

/**
 * Enrichit une liste de profils avec statut de compte + usage + flag test.
 * `usage` = { clientsParProfil, coursParProfil, paiements30jParProfil, dernierPaiementParProfil }
 */
export function enrichirProfil(p, emailById, lastSignInById, usage) {
  const email = emailById[p.id] || null;
  const statut = getAccountStatus(p);
  const trial = getTrialStatus(p);
  return {
    ...p,
    email,
    last_sign_in_at: lastSignInById[p.id] || null,
    compte_statut: statut,               // free | trial_active | trial_expired | subscribed | past_due | canceled
    trial_jours_restants: trial.active ? trial.daysLeft : 0,
    est_test: estCompteTest({ email, studio_slug: p.studio_slug, studio_nom: p.studio_nom }),
    nb_clients: usage.clientsParProfil[p.id] || 0,
    nb_cours: usage.coursParProfil[p.id] || 0,
    nb_paiements_30j: usage.paiements30jParProfil[p.id] || 0,
    dernier_paiement: usage.dernierPaiementParProfil[p.id] || null,
  };
}

/** MRR brut estimé (hors remises/coupons Stripe, non visibles côté DB). */
export function mrrEstime(profilsEnrichis) {
  return profilsEnrichis
    .filter(p => !p.est_test && p.compte_statut === 'subscribed' && p.plan !== 'free')
    .reduce((s, p) => s + (PRIX_MENSUEL[p.plan] || 0), 0);
}

/** Répartition par statut de compte (hors comptes test). */
export function repartitionStatuts(profilsEnrichis) {
  const rep = { subscribed: 0, trial_active: 0, trial_expired: 0, past_due: 0, canceled: 0, free: 0 };
  for (const p of profilsEnrichis) {
    if (p.est_test) continue;
    rep[p.compte_statut] = (rep[p.compte_statut] || 0) + 1;
  }
  return rep;
}

/** Funnel d'activation (hors comptes test). */
export function funnelActivation(profilsEnrichis) {
  const reels = profilsEnrichis.filter(p => !p.est_test);
  return {
    inscrits: reels.length,
    onboardes: reels.filter(p => p.studio_slug).length,
    avecCours: reels.filter(p => p.nb_cours > 0).length,
    avecEleves: reels.filter(p => p.nb_clients > 0).length,
    avecPaiement: reels.filter(p => p.dernier_paiement).length,
    actifs30j: reels.filter(p => p.nb_paiements_30j > 0).length,
  };
}
