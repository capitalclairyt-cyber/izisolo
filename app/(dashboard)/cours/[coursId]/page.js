import { createServerClient } from '@/lib/supabase-server';
import { resoudreStudioActif } from '@/lib/studio-actif';
import { notFound } from 'next/navigation';
import CoursDetailClient from './CoursDetailClient';

export default async function CoursDetailPage({ params, searchParams }) {
  const { coursId } = await params;
  const { edit } = (await searchParams) || {};
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Le studio affiché (v101) : pour une prof seule c'est elle-même,
  // pour une prof invitée dans une association c'est le studio de l'asso.
  const { studioId } = await resoudreStudioActif(supabase, user);

  // Charger le cours avec ses relations
  const { data: cours } = await supabase
    .from('cours')
    .select('*, recurrence:recurrence_parent_id(*)')
    .eq('id', coursId)
    .eq('profile_id', studioId)
    .single();

  if (!cours) notFound();

  // Charger les présences (inscrits) — avec le carnet LIÉ (override explicite,
  // prioritaire sur la résolution auto, même contrat que le pointage).
  const { data: presences } = await supabase
    .from('presences')
    .select('*, clients(id, prenom, nom, statut, email, telephone), abonnements(id, offre_nom, seances_total, seances_utilisees)')
    .eq('cours_id', coursId)
    .eq('profile_id', studioId);

  // Régime tarifaire de la séance (retour Maude 2026-07-25 : « le prix du
  // cours, s'il est pris sur un abonnement ou non, et le prévisionnel ») :
  //  - cours couvert par carnets → carnets actifs des inscrit·es pour la
  //    résolution d'affichage (miroir exact du pointage, lib/carnet-resolution) ;
  //  - cours à tarif_unitaire → paiements à la séance (v65) déjà encaissés.
  const abosParClient = {};
  let paiementsSeance = [];
  const clientIds = [...new Set((presences || []).map(p => p.client_id).filter(Boolean))];
  if (clientIds.length > 0 && !(Number(cours.tarif_unitaire) > 0)) {
    const { data: abos } = await supabase
      .from('abonnements')
      .select('id, client_id, offre_nom, type, seances_total, seances_utilisees, statut, date_fin, date_pause_debut, date_pause_fin, types_cours_autorises')
      .eq('profile_id', studioId)
      .eq('statut', 'actif')
      .in('client_id', clientIds);
    (abos || []).forEach(a => {
      (abosParClient[a.client_id] = abosParClient[a.client_id] || []).push(a);
    });
  }
  if (Number(cours.tarif_unitaire) > 0 && (presences || []).length > 0) {
    const { data: pays } = await supabase
      .from('paiements')
      .select('id, presence_id, statut, montant')
      .eq('profile_id', studioId)
      .in('presence_id', presences.map(p => p.id));
    paiementsSeance = pays || [];
  }

  // Charger la liste d'attente (table v16, RLS profile_id = auth.uid())
  // Try/catch silencieux : si la table n'existe pas (compte legacy avant v16),
  // on retombe sur [].
  let listeAttente = [];
  try {
    const { data: la } = await supabase
      .from('liste_attente')
      .select('id, email, nom, telephone, position, notified_at, created_at')
      .eq('cours_id', coursId)
      .eq('profile_id', studioId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });
    listeAttente = la || [];
  } catch { /* fail-open : le détail du cours s'affiche sans la liste d'attente */ }

  // Charger les lieux
  const { data: lieux } = await supabase
    .from('lieux')
    .select('id, nom, adresse')
    .eq('profile_id', studioId)
    .eq('actif', true)
    .order('ordre');

  // Charger le profil (types de cours, vocabulaire)
  const { data: profile } = await supabase
    .from('profiles')
    .select('metier, vocabulaire, types_cours, plan, trial_started_at, stripe_subscription_status')
    .eq('id', studioId)
    .single();

  // Catalogue des offres décomptables (bloc « Payable avec » — feedback
  // Camille 2026-08-20) : la couverture se calcule côté client via
  // lib/coherence-offres (la formule du pointage). cours_unique = legacy,
  // jamais décompté → exclu.
  const { data: offresCatalogue } = await supabase
    .from('offres')
    .select('id, nom, type, types_cours_autorises')
    .eq('profile_id', studioId)
    .eq('actif', true)
    .in('type', ['carnet', 'abonnement'])
    .order('nom');

  // Combien de séances à venir partagent ce type ? (l'édition de couverture
  // vaut pour TOUTES — le chiffre honnête va dans la confirmation)
  let nbSeancesType = 0;
  if (cours.type_cours) {
    const n = new Date();
    const aujourdHui = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
    const { count } = await supabase
      .from('cours')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', studioId)
      .eq('type_cours', cours.type_cours)
      .gte('date', aujourdHui);
    nbSeancesType = count || 0;
  }

  // Si récurrent, compter les occurrences restantes
  let nbOccurrences = 0;
  if (cours.recurrence_parent_id) {
    const { count } = await supabase
      .from('cours')
      .select('id', { count: 'exact', head: true })
      .eq('recurrence_parent_id', cours.recurrence_parent_id)
      .eq('profile_id', studioId)
      .gte('date', (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; })());
    nbOccurrences = count || 0;
  }

  return (
    <CoursDetailClient
      cours={cours}
      presences={presences || []}
      lieux={lieux || []}
      profile={profile}
      nbOccurrences={nbOccurrences}
      autoEdit={edit === '1'}
      listeAttente={listeAttente}
      abosParClient={abosParClient}
      paiementsSeance={paiementsSeance}
      offresCatalogue={offresCatalogue || []}
      nbSeancesType={nbSeancesType}
    />
  );
}
