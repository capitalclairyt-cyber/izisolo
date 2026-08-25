import { createServerClient } from '@/lib/supabase-server';
import { resoudreStudioActif } from '@/lib/studio-actif';
import { notFound } from 'next/navigation';
import FicheClientClient from './FicheClientClient';

export default async function FicheClientPage({ params }) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Le studio affiché (v101) : pour une prof seule c'est elle-même,
  // pour une prof invitée dans une association c'est le studio de l'asso.
  const { studioId } = await resoudreStudioActif(supabase, user);

  const [
    { data: client },
    { data: profile },
    { data: abonnements },
    { data: presences },
    { data: paiements },
  ] = await Promise.all([
    supabase.from('clients').select('*').eq('id', id).eq('profile_id', studioId).single(),
    supabase.from('profiles').select('metier, vocabulaire, client_fields_config, studio_slug, studio_nom, prenom').eq('id', studioId).single(),
    supabase.from('abonnements').select('*, offre:offres(nom, type)').eq('client_id', id).eq('profile_id', studioId).order('created_at', { ascending: false }),
    supabase.from('presences').select('*, cours_id, cours(nom, date, heure, recurrence_parent_id, tarif_unitaire)').eq('client_id', id).eq('profile_id', studioId).order('created_at', { ascending: false }).limit(50),
    supabase.from('paiements').select('id, intitule, type, montant, statut, mode, date, date_encaissement, notes, numero_cheque, abonnement_id, echeancier_id, offre_id, abonnement:abonnements(id, offre:offres(nom))').eq('client_id', id).eq('profile_id', studioId).order('date', { ascending: false }),
  ]);

  if (!client) notFound();

  // Statut de compte (RPC v67) — dégrade proprement si migration non appliquée.
  let statutCompte = null;
  {
    const { data: statuts } = await supabase.rpc('eleves_statut_compte');
    statutCompte = (statuts || []).find(s => s.client_id === client.id) || null;
  }

  // Facturation (v84) — requêtes SÉPARÉES et défensives (migration absente →
  // boutons facture masqués, la fiche vit). Lecture RLS (policies v84).
  let facturationActive = false;
  {
    const { data: fact, error: factErr } = await supabase
      .from('profiles')
      .select('facturation_siret')
      .eq('id', studioId)
      .maybeSingle();
    if (!factErr && String(fact?.facturation_siret || '').trim()) facturationActive = true;
  }
  let facturesParPaiement = {};
  if ((paiements || []).length > 0) {
    const { data: liaisons, error: liErr } = await supabase
      .from('factures_paiements')
      .select('paiement_id, facture:facture_id (id, numero_affiche, statut)')
      .in('paiement_id', paiements.map(p => p.id));
    if (!liErr) {
      for (const l of liaisons || []) {
        if (l.facture?.statut === 'emise') {
          facturesParPaiement[l.paiement_id] = { id: l.facture.id, numero: l.facture.numero_affiche };
        }
      }
    }
  }

  // Demandes d'offre en attente de CET élève (v97) — lecture DÉFENSIVE et
  // séparée : sans la table, la fiche vit sans bandeau. Le nom/prix viennent
  // de la jointure (une demande n'est pas une vente : rien n'est figé).
  let demandesOffre = [];
  try {
    const { data, error } = await supabase
      .from('demandes_offre')
      .select('id, offre_id, message, created_at, offres(id, nom, prix)')
      .eq('profile_id', studioId)
      .eq('client_id', id)
      .eq('statut', 'nouvelle')
      .order('created_at', { ascending: false });
    if (error) throw error;
    demandesOffre = data || [];
  } catch { /* pré-v97 : pas de bandeau, jamais bloquant */ }

  // Fetch lieux linked to this client pro
  let lieux = [];
  if (client.type_client && client.type_client !== 'particulier') {
    const { data: lieuxData } = await supabase
      .from('lieux')
      .select('*')
      .eq('client_pro_id', client.id)
      .order('ordre');
    lieux = lieuxData || [];
  }

  return (
    <FicheClientClient
      client={client}
      profile={profile}
      abonnements={abonnements || []}
      presences={presences || []}
      paiements={paiements || []}
      lieux={lieux}
      statutCompte={statutCompte}
      facturationActive={facturationActive}
      facturesParPaiement={facturesParPaiement}
      demandesOffre={demandesOffre}
    />
  );
}
