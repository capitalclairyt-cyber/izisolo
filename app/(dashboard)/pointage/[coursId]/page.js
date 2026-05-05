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

  // Charger les présences existantes avec les infos client + abonnement
  const { data: presences } = await supabase
    .from('presences')
    .select('*, clients(id, prenom, nom, statut, email, telephone), abonnements(id, offre_nom, seances_total, seances_utilisees, statut)')
    .eq('cours_id', coursId)
    .eq('profile_id', user.id);

  // Charger tous les clients actifs (pour ajouter des inscrits)
  const { data: clients } = await supabase
    .from('clients')
    .select('id, prenom, nom, statut, abonnements(id, offre_nom, type, seances_total, seances_utilisees, statut)')
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
      presences={presences || []}
      tousClients={clients || []}
      profile={profile}
      dettesParClient={dettesParClient}
      regles={regles || []}
    />
  );
}
