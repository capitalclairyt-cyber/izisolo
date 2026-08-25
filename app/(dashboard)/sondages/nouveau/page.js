import { createServerClient } from '@/lib/supabase-server';
import { resoudreStudioActif } from '@/lib/studio-actif';
import { redirect } from 'next/navigation';
import NouveauSondageClient from './NouveauSondageClient';
import { normalizeTypesCours } from '@/lib/utils';

export const metadata = { title: 'Nouveau sondage' };

export default async function NouveauSondagePage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { studioId } = await resoudreStudioActif(supabase, user);
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('types_cours, studio_slug')
    .eq('id', studioId)
    .single();

  const typesCoursList = profile?.types_cours
    ? normalizeTypesCours(profile.types_cours).flatMap(cat => cat.items || [])
    : [];

  return (
    <NouveauSondageClient
      typesCours={typesCoursList}
      studioSlug={profile?.studio_slug || ''}
    />
  );
}
