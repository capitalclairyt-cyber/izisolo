import { supabaseAdmin } from '@/lib/supabase-admin';
import { createServerClient } from '@/lib/supabase-server';
import { studioCan } from '@/lib/plan-guard';
import { resolveClientInfo, filterCoursVisibles } from '@/lib/visibilite';
import { notFound } from 'next/navigation';
import EssaiClient from './EssaiClient';

export const metadata = { title: 'Cours d\'essai' };

async function getData(studioSlug) {
  // Contenu PUBLIC (studio + cours futurs) via admin : les RLS bloquent un
  // élève connecté (authenticated ≠ prof) → sans ça, page "introuvable".
  // Le select sur profiles ne liste que des champs publics (pas de secrets).
  const supabase = supabaseAdmin;
  const today = new Date().toISOString().slice(0, 10);
  const in60 = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, studio_nom, studio_slug, metier, ville, photo_url, essai_actif, essai_mode, essai_paiement, essai_prix, essai_stripe_payment_link, essai_message, plan, trial_started_at, stripe_subscription_status')
    .eq('studio_slug', studioSlug)
    .single();

  // Capacité Complet (B3c) : pour un studio Essentiel la page essai n'existe
  // pas (vitrine) — la route API refuse déjà, ceci évite le formulaire → 403.
  if (!profile || !profile.essai_actif || !studioCan(profile, 'cours_essai')) return null;

  // Cours futurs (60j) du studio, pour la sélection du créneau
  // (aligné sur la fenêtre de la home pour qu'un cours présélectionné à 31-60j apparaisse)
  const { data: coursRaw } = await supabase
    .from('cours')
    .select('id, nom, type_cours, date, heure, duree_minutes, lieu, capacite_max, est_annule, visibilite')
    .eq('profile_id', profile.id)
    .eq('est_annule', false)
    .gte('date', today)
    .lte('date', in60)
    .order('date', { ascending: true })
    .order('heure', { ascending: true })
    .limit(60);

  // Visibilité : un cours réservé aux inscrits/abonnés/fidèles ne doit pas
  // apparaître dans le sélecteur d'essai pour un visiteur qui n'y a pas droit
  // (aligne l'essai sur la home, qui filtrait déjà). Invité non connecté =>
  // clientInfo null => seuls les cours 'public' sont proposés.
  const ssrClient = await createServerClient();
  const { data: { user } } = await ssrClient.auth.getUser();
  const clientInfo = user ? await resolveClientInfo(supabase, profile.id, user) : null; // v83 : FK d'abord
  let cours = filterCoursVisibles(coursRaw || [], clientInfo);

  // Cours COMPLETS masqués (audit 2026-07-25) : le sélecteur chargeait
  // capacite_max sans jamais compter les inscrits → on proposait des cours
  // pleins à l'essai (et la finalisation sur-réservait, aucune porte ne
  // vérifiant). La RPC re-vérifie sous verrou à la finalisation ; ici on
  // évite juste de proposer l'impossible.
  const avecJauge = cours.filter(c => c.capacite_max != null).map(c => c.id);
  if (avecJauge.length > 0) {
    const { data: presRows, error: presErr } = await supabase
      .from('presences')
      .select('cours_id')
      .in('cours_id', avecJauge);
    if (!presErr) {
      const compte = {};
      for (const p of presRows || []) compte[p.cours_id] = (compte[p.cours_id] || 0) + 1;
      cours = cours.filter(c => c.capacite_max == null || (compte[c.id] || 0) < c.capacite_max);
    }
  }

  return { profile, cours };
}

export default async function EssaiPage({ params, searchParams }) {
  const { studioSlug } = await params;
  const sp = await searchParams;
  const data = await getData(studioSlug);
  if (!data) notFound();

  return (
    <EssaiClient
      profile={data.profile}
      cours={data.cours}
      studioSlug={studioSlug}
      preselectedCoursId={sp?.cours || null}
    />
  );
}
