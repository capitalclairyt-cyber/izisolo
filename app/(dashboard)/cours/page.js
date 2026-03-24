import { createServerClient } from '@/lib/supabase-server';
import CoursEventsClient from './CoursEventsClient';

export default async function CoursPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

  const [
    { data: profile },
    { data: recurrences },
    { data: ponctuels },
    { data: lieux },
    { data: coursRecurrents },
  ] = await Promise.all([
    supabase.from('profiles').select('types_cours, metier').eq('id', user.id).single(),

    // Séries récurrentes
    supabase.from('recurrences')
      .select('*')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false }),

    // Cours ponctuels à venir (sans série)
    supabase.from('cours')
      .select('*, presences(count)')
      .eq('profile_id', user.id)
      .is('recurrence_parent_id', null)
      .gte('date', todayStr)
      .eq('est_annule', false)
      .order('date')
      .order('heure'),

    // Lieux actifs
    supabase.from('lieux')
      .select('id, nom')
      .eq('profile_id', user.id)
      .eq('actif', true)
      .order('ordre'),

    // Prochaines séances des séries (pour stats)
    supabase.from('cours')
      .select('id, recurrence_parent_id, date, heure, presences(count)')
      .eq('profile_id', user.id)
      .not('recurrence_parent_id', 'is', null)
      .gte('date', todayStr)
      .eq('est_annule', false)
      .order('date'),
  ]);

  return (
    <CoursEventsClient
      profile={profile}
      recurrences={recurrences || []}
      ponctuels={ponctuels || []}
      lieux={lieux || []}
      coursRecurrents={coursRecurrents || []}
      todayStr={todayStr}
    />
  );
}
