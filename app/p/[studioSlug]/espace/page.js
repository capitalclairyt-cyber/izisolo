import { createServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';
import EspaceClient from './EspaceClient';

export const metadata = { title: 'Mon espace — IziSolo' };

async function getData(studioSlug, userEmail) {
  const supabase = await createServerClient();

  // Studio (+ règles d'annulation pour application dans EspaceClient)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, studio_nom, studio_slug, regles_annulation')
    .eq('studio_slug', studioSlug)
    .single();
  if (!profile) return null;

  // Client lié à ce studio + offres avec Stripe Payment Link en parallèle
  const [{ data: client }, { data: offresStripe }] = await Promise.all([
    supabase
      .from('clients')
      .select('id, prenom, nom, email, telephone')
      .eq('profile_id', profile.id)
      .ilike('email', userEmail)
      .single(),
    supabase
      .from('offres')
      .select('id, nom, type, prix, seances, stripe_payment_link')
      .eq('profile_id', profile.id)
      .eq('actif', true)
      .not('stripe_payment_link', 'is', null)
      .order('ordre'),
  ]);

  if (!client) {
    return { profile, client: null, aVenir: [], passes: [], offresStripe: offresStripe || [] };
  }

  // Ses réservations avec détail des cours
  const { data: presences } = await supabase
    .from('presences')
    .select(`
      id,
      present,
      created_at,
      cours:cours_id (
        id, nom, date, heure, duree, lieu, type_cours, est_annule
      )
    `)
    .eq('client_id', client.id)
    .eq('profile_id', profile.id)
    .order('created_at', { ascending: false });

  const today = new Date().toISOString().slice(0, 10);
  const all = presences || [];

  const aVenir = all
    .filter(p => p.cours && p.cours.date >= today && !p.cours.est_annule)
    .sort((a, b) => {
      if (a.cours.date !== b.cours.date) return a.cours.date.localeCompare(b.cours.date);
      return (a.cours.heure || '').localeCompare(b.cours.heure || '');
    });

  const passes = all
    .filter(p => p.cours && (p.cours.date < today || p.cours.est_annule))
    .sort((a, b) => b.cours.date.localeCompare(a.cours.date));

  return { profile, client, aVenir, passes, offresStripe: offresStripe || [] };
}

export default async function EspacePage({ params }) {
  const { studioSlug } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/p/${studioSlug}/connexion`);
  }

  const data = await getData(studioSlug, user.email);
  if (!data) notFound();

  return (
    <EspaceClient
      profile={data.profile}
      client={data.client}
      aVenir={data.aVenir || []}
      passes={data.passes || []}
      offresStripe={data.offresStripe || []}
      studioSlug={studioSlug}
      userEmail={user.email}
    />
  );
}
