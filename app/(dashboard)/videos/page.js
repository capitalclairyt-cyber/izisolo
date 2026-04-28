import { createServerClient } from '@/lib/supabase-server';
import VideosClient from './VideosClient';

export const metadata = { title: 'Vidéos — IziSolo' };

export default async function VideosPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: videos } = await supabase
    .from('videos_cours')
    .select('*')
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false });

  return <VideosClient videosInit={videos || []} />;
}
