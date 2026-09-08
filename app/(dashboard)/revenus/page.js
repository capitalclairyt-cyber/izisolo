import { createServerClient } from '@/lib/supabase-server';
import { resoudreStudioActif } from '@/lib/studio-actif';
import { reportError } from '@/lib/report';
import { resoudreCarnetApplicable } from '@/lib/carnet-resolution';
import RevenusClient from './RevenusClient';

// Boucle .range() : le select nu plafonne à 1000 lignes EN SILENCE — sur cette
// page ça voulait dire des TOTAUX D'ARGENT FAUX dès ~1000 paiements/12 mois
// (AUDIT-PERF cat 2.7, le bug du CSV B1f jamais corrigé sur la page).
// Même modèle que app/api/export/paiements-csv.
async function fetchTout(buildQuery, label) {
  const rows = [];
  for (let page = 0; page < 30; page++) {
    const { data, error } = await buildQuery().range(page * 1000, page * 1000 + 999);
    if (error) {
      reportError(`[revenus] ${label} err:`, error, { route: '/revenus' });
      break;
    }
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

export default async function RevenusPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Le studio affiché (v101) : pour une prof seule c'est elle-même,
  // pour une prof invitée dans une association c'est le studio de l'asso.
  const { studioId } = await resoudreStudioActif(supabase, user);

  // On charge les paiements des 12 derniers mois ; le filtrage par période
  // se fait côté client pour un UX réactif sans round-trip serveur.
  const debutFenetre = new Date();
  debutFenetre.setMonth(debutFenetre.getMonth() - 12);
  const debutFenetreStr = debutFenetre.toISOString().split('T')[0];

  const paiements = await fetchTout(() => supabase
    .from('paiements')
    .select('id, intitule, type, montant, statut, mode, date, date_encaissement, notes, commission_montant, stripe_session_id, client_id, presence_id, clients(prenom, nom, nom_structure)')
    .eq('profile_id', studioId)
    .gte('date', debutFenetreStr)
    .order('date', { ascending: false })
    .order('id', { ascending: false }), 'paiements');

  // ── Dettes dérivées (audit cohérence 2026-07-22) ──────────────────────────
  // « À percevoir » ne voyait QUE les lignes `paiements` pending/overdue. Deux
  // familles d'argent dû n'y figuraient pas :
  //   1. les séances sur cours payable à la séance (tarif_unitaire) réservées/
  //      pointées mais jamais encaissées — dérivées des présences + paiements
  //      liés (v65), comme dans l'espace élève ;
  //   2. les annulations tardives « séance due » sans carnet décompté
  //      (presences.est_due, montant à la discrétion de la prof).

  // 1. Séances payables à la séance non couvertes par un paiement lié
  const presTarifees = await fetchTout(() => supabase
    .from('presences')
    .select('id, statut_pointage, type_presence, annulation_tardive, client_id, clients(prenom, nom, nom_structure), cours:cours_id!inner(id, nom, date, heure, type_cours, tarif_unitaire, carnets_acceptes)')
    .eq('profile_id', studioId)
    .gt('cours.tarif_unitaire', 0)
    // Une séance d'un cours ANNULÉ par la prof n'est pas de l'argent dû
    // (B1f, rouge : 8 inscrit·es × 15 € restaient « À percevoir » à vie
    // après l'annulation — l'espace élève, lui, filtrait déjà).
    .eq('cours.est_annule', false)
    .gte('cours.date', debutFenetreStr)
    .order('id'), 'presences tarifées');

  const presCandidates = (presTarifees || []).filter(p =>
    (p.type_presence || 'normal') === 'normal'
    // annule/declinee = résa annulée côté studio (lignes info v74) : les
    // compter « dues » était le miroir ARGENT du bug de capacité (B1f, rouge).
    && !['absent', 'excuse', 'annule', 'declinee'].includes(p.statut_pointage)
  );

  // Cours MIXTE (carnets acceptés + tarif à la séance) : l'inscrite dont un
  // carnet ou un abonnement actif couvre le cours ne doit RIEN à la séance,
  // c'est le carnet qui se décomptera au pointage. Sans ce tri, une élève à
  // l'abonnement annuel « à régler plus tard » comptait DEUX fois : l'abo, ET
  // chacune de ses séances de la saison, semaine après semaine (retour Maude
  // et Colin, 2026-09-07 : 48 lignes fantômes sur 98 chez Maude). Même
  // résolution que le pointage (RPC v82) et que l'espace élève, via le miroir
  // JS `resoudreCarnetApplicable` ; un atelier pur (carnets refusés) reste dû.
  const abosParClient = new Map();
  const clientsMixtes = [...new Set(presCandidates.filter(p => p.cours?.carnets_acceptes === true).map(p => p.client_id).filter(Boolean))];
  for (let i = 0; i < clientsMixtes.length; i += 200) {
    const { data: abos, error: abosErr } = await supabase
      .from('abonnements')
      .select('client_id, statut, seances_total, seances_utilisees, date_fin, date_pause_debut, date_pause_fin, types_cours_autorises')
      .eq('profile_id', studioId)
      .eq('statut', 'actif')
      .in('client_id', clientsMixtes.slice(i, i + 200));
    if (abosErr) {
      // Lecture en échec = on ne devine pas : les lignes restent dues (état d'avant).
      reportError('[revenus] abonnements (prévision mixte) err:', abosErr, { route: '/revenus' });
      continue;
    }
    for (const a of abos || []) {
      if (!abosParClient.has(a.client_id)) abosParClient.set(a.client_id, []);
      abosParClient.get(a.client_id).push(a);
    }
  }
  const presEligibles = presCandidates.filter(p =>
    !(p.cours?.carnets_acceptes === true && resoudreCarnetApplicable(abosParClient.get(p.client_id) || [], p.cours))
  );
  let seancesDues = [];
  if (presEligibles.length > 0) {
    // Chunké par 200 : un .in() de centaines d'uuids casse l'URL PostgREST
    // → couvertes vide → les séances DÉJÀ PAYÉES repassaient toutes
    // « À percevoir » (B1f).
    const paiesLies = [];
    const presIds = presEligibles.map(p => p.id);
    for (let i = 0; i < presIds.length; i += 200) {
      const { data: lot, error: lotErr } = await supabase
        .from('paiements')
        .select('presence_id, statut')
        .eq('profile_id', studioId)
        .in('presence_id', presIds.slice(i, i + 200));
      if (lotErr) {
        reportError('[revenus] paiements liés err:', lotErr, { route: '/revenus' });
        continue;
      }
      paiesLies.push(...(lot || []));
    }
    const couvertes = new Set(paiesLies
      .filter(x => ['paid', 'pending', 'overdue'].includes(x.statut))
      .map(x => x.presence_id));
    seancesDues = presEligibles
      .filter(p => !couvertes.has(p.id))
      .map(p => ({
        id: p.id,
        clients: p.clients,
        client_id: p.client_id,
        cours_id: p.cours.id,
        cours_nom: p.cours.nom,
        date: p.cours.date,
        montant: Number(p.cours.tarif_unitaire),
        annulationTardive: !!p.annulation_tardive,
      }));
  }

  // 2. Annulations tardives « séance due » sur cours normal (pas de carnet
  //    décompté, pas de montant fixe) — hors celles déjà tracées par un cas
  //    dette ouvert (decompter_ou_dette) pour éviter le doublon.
  const { data: presDues } = await supabase
    .from('presences')
    .select('id, client_id, clients(prenom, nom, nom_structure), cours:cours_id!inner(id, nom, date, heure, tarif_unitaire)')
    .eq('profile_id', studioId)
    .eq('est_due', true)
    .is('abonnement_id', null)
    .gte('cours.date', debutFenetreStr);
  let annulationsDues = (presDues || []).filter(p => !(Number(p.cours?.tarif_unitaire) > 0));
  if (annulationsDues.length > 0) {
    const { data: casDettes } = await supabase
      .from('cas_a_traiter')
      .select('presence_id')
      .eq('profile_id', studioId)
      .is('resolu_at', null)
      .in('presence_id', annulationsDues.map(p => p.id));
    const traitees = new Set((casDettes || []).map(c => c.presence_id).filter(Boolean));
    annulationsDues = annulationsDues.filter(p => !traitees.has(p.id));
  }
  annulationsDues = annulationsDues.map(p => ({
    id: p.id,
    clients: p.clients,
    client_id: p.client_id,
    cours_id: p.cours.id,
    cours_nom: p.cours.nom,
    date: p.cours.date,
  }));

  // v95 « je déclare à part » : lecture SÉPARÉE et défensive. La colonne
  // exclu_compta ne va JAMAIS dans le select principal — absente, elle ferait
  // échouer toute la page (42703) et les totaux d'argent disparaîtraient sans
  // un mot. Sans elle : aucun paiement marqué, comme avant v95.
  let exclusIds = [];
  try {
    const { data, error } = await supabase
      .from('paiements')
      .select('id')
      .eq('profile_id', studioId)
      .eq('exclu_compta', true)
      .limit(5000);
    if (error) throw error;
    exclusIds = (data || []).map(p => p.id);
  } catch { /* pré-v95 : rien d'exclu */ }
  const exclus = new Set(exclusIds);
  const paiementsAvecFlag = (paiements || []).map(p => (
    exclus.has(p.id) ? { ...p, exclu_compta: true } : p
  ));

  // Le pays du studio (v105), en lecture SÉPARÉE et défensive : la colonne est
  // neuve, la nommer dans un select principal ferait tomber toute la page tant
  // que la migration n'est pas passée (§12).
  let pays = 'FR';
  try {
    const { data, error } = await supabase.from('profiles').select('pays').eq('id', studioId).maybeSingle();
    if (!error && data?.pays) pays = data.pays;
  } catch { /* pré-v105 : la France, c'est-à-dire le comportement d'avant */ }

  return <RevenusClient paiements={paiementsAvecFlag} seancesDues={seancesDues} annulationsDues={annulationsDues} pays={pays} />;
}
