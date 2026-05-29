import { createServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import VideosClient from './VideosClient';

export const metadata = { title: 'Vidéos — IziSolo' };

export default async function VideosPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: videos } = await supabase
    .from('videos_cours')
    .select('*')
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false });

  return <VideosClient videosInit={videos || []} />;
}
