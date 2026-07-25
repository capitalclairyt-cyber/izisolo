import { createServerClient } from '@/lib/supabase-server';
import { reportError } from '@/lib/report';
import RevenusClient from './RevenusClient';

export default async function RevenusPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // On charge les paiements des 12 derniers mois ; le filtrage par période
  // se fait côté client pour un UX réactif sans round-trip serveur.
  const debutFenetre = new Date();
  debutFenetre.setMonth(debutFenetre.getMonth() - 12);
  const debutFenetreStr = debutFenetre.toISOString().split('T')[0];

  const { data: paiements, error: paiementsErr } = await supabase
    .from('paiements')
    .select('id, intitule, type, montant, statut, mode, date, date_encaissement, notes, commission_montant, stripe_session_id, client_id, presence_id, clients(prenom, nom, nom_structure)')
    .eq('profile_id', user.id)
    .gte('date', debutFenetreStr)
    .order('date', { ascending: false });
  if (paiementsErr) reportError('[revenus] paiements err:', paiementsErr, { route: '/revenus' });

  // ── Dettes dérivées (audit cohérence 2026-07-22) ──────────────────────────
  // « À percevoir » ne voyait QUE les lignes `paiements` pending/overdue. Deux
  // familles d'argent dû n'y figuraient pas :
  //   1. les séances sur cours payable à la séance (tarif_unitaire) réservées/
  //      pointées mais jamais encaissées — dérivées des présences + paiements
  //      liés (v65), comme dans l'espace élève ;
  //   2. les annulations tardives « séance due » sans carnet décompté
  //      (presences.est_due, montant à la discrétion de la prof).

  // 1. Séances payables à la séance non couvertes par un paiement lié
  const { data: presTarifees, error: presTarifeesErr } = await supabase
    .from('presences')
    .select('id, statut_pointage, type_presence, annulation_tardive, client_id, clients(prenom, nom, nom_structure), cours:cours_id!inner(id, nom, date, heure, tarif_unitaire)')
    .eq('profile_id', user.id)
    .gt('cours.tarif_unitaire', 0)
    // Une séance d'un cours ANNULÉ par la prof n'est pas de l'argent dû
    // (B1f, rouge : 8 inscrit·es × 15 € restaient « À percevoir » à vie
    // après l'annulation — l'espace élève, lui, filtrait déjà).
    .eq('cours.est_annule', false)
    .gte('cours.date', debutFenetreStr);
  if (presTarifeesErr) reportError('[revenus] presences tarifées err:', presTarifeesErr, { route: '/revenus' });

  const presEligibles = (presTarifees || []).filter(p =>
    (p.type_presence || 'normal') === 'normal'
    // annule/declinee = résa annulée côté studio (lignes info v74) : les
    // compter « dues » était le miroir ARGENT du bug de capacité (B1f, rouge).
    && !['absent', 'excuse', 'annule', 'declinee'].includes(p.statut_pointage)
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
        .eq('profile_id', user.id)
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
    .eq('profile_id', user.id)
    .eq('est_due', true)
    .is('abonnement_id', null)
    .gte('cours.date', debutFenetreStr);
  let annulationsDues = (presDues || []).filter(p => !(Number(p.cours?.tarif_unitaire) > 0));
  if (annulationsDues.length > 0) {
    const { data: casDettes } = await supabase
      .from('cas_a_traiter')
      .select('presence_id')
      .eq('profile_id', user.id)
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

  return <RevenusClient paiements={paiements || []} seancesDues={seancesDues} annulationsDues={annulationsDues} />;
}
