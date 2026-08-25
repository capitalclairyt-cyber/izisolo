import { createServerClient } from '@/lib/supabase-server';
import { resoudreStudioActif } from '@/lib/studio-actif';
import { redirect } from 'next/navigation';
import VideosClient from './VideosClient';

export const metadata = { title: 'Vidéos — IziSolo' };

export default async function VideosPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Le studio affiché (v101) : pour une prof seule c'est elle-même,
  // pour une prof invitée dans une association c'est le studio de l'asso.
  const { studioId } = await resoudreStudioActif(supabase, user);
  if (!user) redirect('/login');

  const { data: videos } = await supabase
    .from('videos_cours')
    .select('*')
    .eq('profile_id', studioId)
    .order('created_at', { ascending: false });

  return <VideosClient videosInit={videos || []} />;
}
