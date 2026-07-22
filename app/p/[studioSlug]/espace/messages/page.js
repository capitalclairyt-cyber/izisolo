import { createServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { redirect, notFound } from 'next/navigation';
import EspaceMessagesClient from './EspaceMessagesClient';
import { escapeIlike } from '@/lib/utils';

export const metadata = { title: 'Mes messages', robots: { index: false, follow: false } };

export default async function EspaceMessagesPage({ params }) {
  const { studioSlug } = await params;

  // Studio (public) + vérif client (filtrée par profile_id + email) via admin :
  // les RLS bloquent un élève connecté (authenticated ≠ prof) → sans ça,
  // notFound(). Le select sur profiles ne liste que des champs publics.
  const supabase = supabaseAdmin;
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, studio_nom, studio_slug')
    .eq('studio_slug', studioSlug)
    .maybeSingle();
  if (!profile) notFound();

  // getUser() nécessite le client SSR (cookies de session) ; l'admin n'a pas de session.
  const ssrClient = await createServerClient();
  const { data: { user } } = await ssrClient.auth.getUser();
  if (!user) {
    redirect(`/p/${studioSlug}/connexion?next=/p/${studioSlug}/espace/messages`);
  }

  // Vérifier que l'user est bien client de ce studio
  const { data: client } = await supabase
    .from('clients')
    .select('id, prenom, nom')
    .eq('profile_id', profile.id)
    .ilike('email', escapeIlike(user.email))
    .maybeSingle();
  if (!client) {
    return (
      <div style={{ maxWidth: 600, margin: '40px auto', padding: 20, textAlign: 'center' }}>
        <h1>Espace réservé aux élèves</h1>
        <p>Tu n'es pas reconnu·e comme élève de ce studio.</p>
      </div>
    );
  }

  return (
    <EspaceMessagesClient
      profile={profile}
      studioSlug={studioSlug}
      client={client}
    />
  );
}
