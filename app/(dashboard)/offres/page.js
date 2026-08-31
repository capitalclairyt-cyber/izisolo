import { createServerClient } from '@/lib/supabase-server';
import { resoudreStudioActif } from '@/lib/studio-actif';
import { effectivePlan, planConfig } from '@/lib/plan-guard';
import OffresClient from './OffresClient';
import { offresEnAttenteDeWebhook } from '@/lib/paiement-en-ligne';

export default async function OffresPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Le studio affiché (v101) : pour une prof seule c'est elle-même,
  // pour une prof invitée dans une association c'est le studio de l'asso.
  const { studioId } = await resoudreStudioActif(supabase, user);

  const [
    { data: offres },
    { data: profile },
  ] = await Promise.all([
    supabase.from('offres').select('*').eq('profile_id', studioId).order('ordre'),
    supabase.from('profiles').select('metier, vocabulaire, plan, trial_started_at, stripe_subscription_status, afficher_tarifs, studio_slug').eq('id', studioId).single(),
  ]);

  // Demandes d'élèves en attente (v97) — lecture DÉFENSIVE et séparée : sans
  // la table, la page des offres continue de marcher, sans file d'attente.
  let demandes = [];
  try {
    const { data, error } = await supabase
      .from('demandes_offre')
      .select('id, offre_id, client_id, prenom, nom, email, message, created_at, clients(id, prenom, nom, email, telephone)')
      .eq('profile_id', studioId)
      .eq('statut', 'nouvelle')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    demandes = data || [];
  } catch { /* pré-v97 : aucune file, jamais bloquant */ }

  const planKey = effectivePlan(profile);
  const plan = planConfig(planKey);

  // Le paiement en ligne se branche en DEUX gestes, et on ne vérifiait que le
  // premier : coller un Payment Link sur une offre, puis déclarer le webhook
  // Stripe. Sans le second, l'élève paie et IziSolo n'en sait jamais rien
  // (retour Manon 2026-08-26). On le DIT ici, sur l'écran où les liens vivent.
  // ⚠️ Lecture SÉPARÉE : le secret ne doit pas entrer dans le `profile` envoyé
  // au navigateur — seul le compte des offres concernées en sort.
  let offresSansWebhook = 0;
  try {
    const { data: conf } = await supabase
      .from('profiles')
      .select('stripe_webhook_secret')
      .eq('id', studioId)
      .maybeSingle();
    offresSansWebhook = offresEnAttenteDeWebhook(offres, conf).length;
  } catch { /* jamais bloquant : au pire, pas d'alerte */ }

  return (
    <OffresClient
      offres={offres || []}
      profile={profile}
      planKey={planKey}
      limiteOffres={plan.limiteOffres}
      demandes={demandes}
      offresSansWebhook={offresSansWebhook}
    />
  );
}
