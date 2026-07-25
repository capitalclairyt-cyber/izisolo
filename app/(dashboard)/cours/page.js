import { createServerClient } from '@/lib/supabase-server';
import CoursEventsClient from './CoursEventsClient';

export default async function CoursPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Heure de PARIS (serveur Vercel en UTC : entre minuit et 2 h l'été,
  // « à venir » incluait hier — B1b).
  const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });

  const [
    { data: profile },
    { data: recurrences },
    { data: ponctuels },
    { data: lieux },
    { data: coursRecurrents },
    { data: laEntries },
  ] = await Promise.all([
    supabase.from('profiles').select('types_cours, metier').eq('id', user.id).single(),

    // Séries récurrentes
    supabase.from('recurrences')
      .select('*')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false }),

    // Cours ponctuels à venir (sans série) — presences en LIGNES (statut +
    // tardive) : le count brut comptait les sièges fantômes v74 (B1b).
    supabase.from('cours')
      .select('*, presences(statut_pointage, annulation_tardive)')
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

    // Prochaines séances des séries (pour stats) — même règle v74
    supabase.from('cours')
      .select('id, recurrence_parent_id, date, heure, presences(statut_pointage, annulation_tardive)')
      .eq('profile_id', user.id)
      .not('recurrence_parent_id', 'is', null)
      .gte('date', todayStr)
      .eq('est_annule', false)
      .order('date'),

    // Liste d'attente : compter par cours (non notifiées uniquement)
    supabase.from('liste_attente')
      .select('cours_id, notified_at')
      .eq('profile_id', user.id)
      .is('notified_at', null),
  ]);

  // Compter les entrées liste d'attente par cours_id
  const laByCours = {};
  for (const e of (laEntries || [])) {
    laByCours[e.cours_id] = (laByCours[e.cours_id] || 0) + 1;
  }

  return (
    <CoursEventsClient
      profile={profile}
      recurrences={recurrences || []}
      ponctuels={ponctuels || []}
      lieux={lieux || []}
      coursRecurrents={coursRecurrents || []}
      todayStr={todayStr}
      listeAttenteByCours={laByCours}
    />
  );
}
