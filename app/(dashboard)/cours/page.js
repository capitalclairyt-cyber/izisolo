import { createServerClient } from '@/lib/supabase-server';
import { resoudreStudioActif } from '@/lib/studio-actif';
import CoursEventsClient from './CoursEventsClient';

export default async function CoursPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Le studio affiché (v101) : pour une prof seule c'est elle-même,
  // pour une prof invitée dans une association c'est le studio de l'asso.
  const { studioId } = await resoudreStudioActif(supabase, user);

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
    supabase.from('profiles').select('types_cours, metier').eq('id', studioId).single(),

    // Séries récurrentes
    supabase.from('recurrences')
      .select('*')
      .eq('profile_id', studioId)
      .order('created_at', { ascending: false }),

    // Cours ponctuels à venir (sans série) — presences en LIGNES (statut +
    // tardive) : le count brut comptait les sièges fantômes v74 (B1b).
    supabase.from('cours')
      .select('*, presences(statut_pointage, annulation_tardive)')
      .eq('profile_id', studioId)
      .is('recurrence_parent_id', null)
      .gte('date', todayStr)
      .eq('est_annule', false)
      .order('date')
      .order('heure'),

    // Lieux actifs
    supabase.from('lieux')
      .select('id, nom')
      .eq('profile_id', studioId)
      .eq('actif', true)
      .order('ordre'),

    // Prochaines séances des séries (pour stats) — même règle v74. PAGINÉ
    // (AUDIT-PERF 2.9) : des séries prolongées à l'année dépassent le cap
    // PostgREST 1000 → stats de séries silencieusement fausses.
    (async () => {
      const rows = [];
      for (let page = 0; page < 20; page++) {
        const { data, error } = await supabase.from('cours')
          .select('id, recurrence_parent_id, date, heure, presences(statut_pointage, annulation_tardive)')
          .eq('profile_id', studioId)
          .not('recurrence_parent_id', 'is', null)
          .gte('date', todayStr)
          .eq('est_annule', false)
          .order('date')
          .order('id')
          .range(page * 1000, page * 1000 + 999);
        if (error) break;
        rows.push(...(data || []));
        if (!data || data.length < 1000) break;
      }
      return { data: rows };
    })(),

    // Liste d'attente : compter par cours (non notifiées uniquement)
    supabase.from('liste_attente')
      .select('cours_id, notified_at')
      .eq('profile_id', studioId)
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
