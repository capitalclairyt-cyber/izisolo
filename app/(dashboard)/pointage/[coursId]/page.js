import { createServerClient } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';
import PointageClient from './PointageClient';

export default async function PointagePage({ params }) {
  const { coursId } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Charger le cours
  const { data: cours } = await supabase
    .from('cours')
    .select('*')
    .eq('id', coursId)
    .eq('profile_id', user.id)
    .single();

  if (!cours) notFound();

  // Charger les présences existantes avec les infos client + abonnement lié
  const { data: presences } = await supabase
    .from('presences')
    .select('*, clients(id, prenom, nom, statut, email, telephone), abonnements(id, offre_nom, seances_total, seances_utilisees, statut)')
    .eq('cours_id', coursId)
    .eq('profile_id', user.id);

  // Carnets ACTIFS de chaque élève présent — pour résoudre le carnet applicable
  // à CE cours au pointage (affichage « sur carnet » + branchement pay-as-you-go,
  // Lot 2b) même quand la présence n'est pas encore liée à un carnet.
  const clientIds = [...new Set((presences || []).map(p => p.client_id).filter(Boolean))];
  const abosParClient = {};
  if (clientIds.length > 0) {
    const { data: abos } = await supabase
      .from('abonnements')
      .select('id, client_id, offre_nom, type, seances_total, seances_utilisees, statut, date_fin, date_pause_debut, date_pause_fin, types_cours_autorises')
      .eq('profile_id', user.id)
      .eq('statut', 'actif')
      .in('client_id', clientIds);
    (abos || []).forEach(a => {
      (abosParClient[a.client_id] = abosParClient[a.client_id] || []).push(a);
    });
  }

  // Paiements à la séance déjà encaissés (liés à une présence de ce cours).
  // Lignes COMPLÈTES (id, montant, mode) : le pointage affiche le mode après
  // validation et permet de le corriger (retour Maude 2026-07-23 — elle avait
  // mis CB au lieu d'espèces sans pouvoir ni le voir ni le changer).
  // presence_id existe à partir de v65 ; sans la migration, la requête dégrade
  // proprement (data null → aucun « déjà payé » pré-coché).
  const presenceIds = (presences || []).map(p => p.id);
  let paiementsSeance = [];
  if (presenceIds.length > 0) {
    const { data: paies } = await supabase
      .from('paiements')
      .select('id, presence_id, montant, mode, statut')
      .eq('profile_id', user.id)
      .eq('statut', 'paid')
      .in('presence_id', presenceIds);
    paiementsSeance = (paies || []).filter(x => x.presence_id);
  }

  const presencesEnrichies = (presences || []).map(p => ({
    ...p,
    client_abos: abosParClient[p.client_id] || [],
  }));

  // Charger tous les clients actifs (pour ajouter des inscrits).
  // Les champs date_fin/pause/types_cours_autorises servent à la résolution
  // d'affichage (client_abos) des élèves ajoutés en cours de pointage.
  const { data: clients } = await supabase
    .from('clients')
    .select('id, prenom, nom, statut, abonnements(id, offre_nom, type, seances_total, seances_utilisees, statut, date_fin, date_pause_debut, date_pause_fin, types_cours_autorises)')
    .eq('profile_id', user.id)
    .in('statut', ['prospect', 'actif', 'fidele'])
    .order('prenom');

  // Charger le profil (vocabulaire + règles d'annulation + règles métier)
  const { data: profile } = await supabase
    .from('profiles')
    .select('metier, vocabulaire, regles_annulation, regles_metier, essais_par_defaut')
    .eq('id', user.id)
    .single();

  // Compter les dettes différées par client (pour alerte multi-impayés)
  const { data: dettesRaw } = await supabase
    .from('presences')
    .select('client_id')
    .eq('profile_id', user.id)
    .eq('payer_plus_tard', true);
  const dettesParClient = {};
  (dettesRaw || []).forEach(d => {
    dettesParClient[d.client_id] = (dettesParClient[d.client_id] || 0) + 1;
  });

  // Charger les règles actives du profil
  const { data: regles } = await supabase
    .from('regles')
    .select('*')
    .eq('profile_id', user.id)
    .eq('actif', true)
    .order('ordre');

  return (
    <PointageClient
      cours={cours}
      presences={presencesEnrichies}
      tousClients={clients || []}
      profile={profile}
      dettesParClient={dettesParClient}
      regles={regles || []}
      initialPaiementsSeance={paiementsSeance}
    />
  );
}
