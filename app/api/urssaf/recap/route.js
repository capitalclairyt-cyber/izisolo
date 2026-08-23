import { withRoute } from '@/lib/api-route';
import { reportError } from '@/lib/report';
import {
  filtreDateComptable, totauxPaiements, periodeParId, periodesDeclarables,
  aujourdhuiParis, sanitizeConfigUrssaf, estimationCotisations,
  lireExclusions, retirerExclus,
} from '@/lib/urssaf';
import { historique, ecartDepuisDeclaration } from '@/lib/declaration-archive';

// ============================================================================
// Récapitulatif de déclaration URSSAF — LE chiffre à recopier.
//
// Pourquoi une route serveur plutôt qu'un calcul dans RevenusClient : la page
// Revenus ne charge que 12 mois de paiements. Les 6 dernières périodes
// trimestrielles couvrent 18 mois, et le récap ANNUEL de l'an dernier (celui
// de la déclaration de revenus au printemps) sort largement de la fenêtre.
// Un total d'argent faux par troncature silencieuse serait pire que pas de
// total du tout.
//
// Assiette : `paid` UNIQUEMENT, borné sur coalesce(date_encaissement, date)
// (lib/urssaf.js). Un paiement en attente n'est pas du chiffre d'affaires.
//
// Pas de gate de plan : l'obligation de déclarer ne dépend pas de l'abonnement
// (même principe que les factures acquittées v84). L'export CSV détaillé,
// lui, reste sur `export_compta`.
// ============================================================================

export const GET = withRoute({ auth: 'user' }, async ({ request, auth }) => {
  const { user, supabase } = auth;
  const url = new URL(request.url);
  const today = aujourdhuiParis();

  // Réglages : lecture SÉPARÉE et défensive (urssaf_config naît avec v93).
  let configBrute = null;
  let migrationManquante = false;
  try {
    const { data, error } = await supabase.from('profiles').select('urssaf_config').eq('id', user.id).single();
    if (error) throw error;
    configBrute = data?.urssaf_config ?? null;
  } catch {
    migrationManquante = true; // colonne absente : on sert le total, sans estimation
  }
  const config = sanitizeConfigUrssaf(configBrute);

  const periodes = periodesDeclarables(config, today);
  const demande = url.searchParams.get('periode');
  const periode = (demande ? periodeParId(demande, today) : null)
    || periodes.find(p => p.cloturee)
    || periodes[0];

  if (!periode) {
    return Response.json({ error: 'Période invalide' }, { status: 400 });
  }

  // Paginé : un total d'argent ne se tronque pas à 1000 lignes (B1f).
  const paiements = [];
  for (let page = 0; page < 20; page++) {
    const { data: lot, error } = await supabase
      .from('paiements')
      .select('id, montant, mode, date, date_encaissement, commission_montant')
      .eq('profile_id', user.id)
      .eq('statut', 'paid')
      .or(filtreDateComptable(periode.from, periode.to))
      .order('date', { ascending: true })
      .order('id', { ascending: true })
      .range(page * 1000, page * 1000 + 999);
    if (error) {
      reportError('[urssaf/recap] lecture paiements:', error, { route: '/api/urssaf/recap' });
      return Response.json({ error: 'Impossible de calculer ton récapitulatif' }, { status: 500 });
    }
    paiements.push(...(lot || []));
    if (!lot || lot.length < 1000) break;
  }

  // v95 : ce que la prof a sorti de sa déclaration (« je déclare à part »).
  // Lecture séparée et défensive : sans la colonne, rien n'est exclu.
  const exclusions = await lireExclusions(supabase, user.id, periode);
  const totaux = totauxPaiements(retirerExclus(paiements, exclusions), 'encaissement');
  const estimation = config ? estimationCotisations(totaux.brut, config) : null;

  // Archive (v94) : lecture DÉFENSIVE et séparée — sans la table, le bloc perd
  // son historique mais garde son chiffre, qui est l'essentiel.
  let archives = [];
  try {
    const { data, error } = await supabase
      .from('declarations_urssaf')
      .select('periode_id, consultations, derniere_consultation_at, declaree_at, montant_declare')
      .eq('profile_id', user.id)
      .order('periode_debut', { ascending: false })
      .limit(24);
    if (error) throw error;
    archives = data || [];
  } catch { /* pré-v94 : historique vide, jamais bloquant */ }

  return Response.json({
    periode,
    periodes,
    totaux,
    estimation,
    exclusions: { nb: exclusions.nb, montant: exclusions.montant },
    configuree: !!config,
    migrationManquante,
    aujourdhui: today,
    historique: historique(periodes, archives, today),
    ecart: ecartDepuisDeclaration(archives.find(a => a.periode_id === periode.id), totaux.brut),
  });
});
