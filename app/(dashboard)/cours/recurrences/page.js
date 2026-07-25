import { createServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import RecurrencesClient from './RecurrencesClient';

export const metadata = {
  title: 'Mes cours récurrents',
};

export default async function RecurrencesPage({ searchParams }) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Pré-sélection + ouverture directe de l'édition depuis le crayon d'une série
  // (CoursEventsClient → /cours/recurrences?rec=<id>&edit=1).
  const sp = await searchParams;
  const initialRecId = sp?.rec || null;
  const autoEdit = sp?.edit === '1';

  // Charger les récurrences du profil + leurs cours générés (pour compteur + calendrier)
  const today = new Date().toISOString().slice(0, 10);
  const dansUnAn = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);

  const [{ data: recurrences }, { data: profile }, { data: cours }] = await Promise.all([
    supabase
      .from('recurrences')
      // ⚠️ domicile/client_id/frais_deplacement/client_pro_id DOIVENT être
      // chargés : l'ajout d'occurrence et la prolongation les recopient sur
      // chaque cours créé. Sans eux, `selected.domicile` était undefined →
      // le spread conditionnel ne posait RIEN, en silence (séances à domicile
      // prolongées sans l'élève inscrite — audit B1b 2026-07-25).
      .select('id, nom, type_cours, heure, duree_minutes, lieu_id, capacite_max, frequence, jours_semaine, intervalle, date_debut, date_fin, nb_occurrences, exclure_vacances, exclure_feries, zone_vacances, actif, created_at, domicile, client_id, frais_deplacement, client_pro_id')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('zone_vacances_default, types_cours')
      .eq('id', user.id)
      .single(),
    supabase
      .from('cours')
      .select('id, nom, date, heure, recurrence_parent_id, est_annule')
      .eq('profile_id', user.id)
      .not('recurrence_parent_id', 'is', null)
      .gte('date', today)
      .lte('date', dansUnAn)
      .order('date'),
  ]);

  return (
    <RecurrencesClient
      recurrences={recurrences || []}
      cours={cours || []}
      profile={profile || {}}
      initialRecId={initialRecId}
      autoEdit={autoEdit}
    />
  );
}
