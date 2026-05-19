import { createServerClient } from '@/lib/supabase-server';
import AgendaClient from './AgendaClient';

export default async function AgendaPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('metier, vocabulaire, types_cours')
    .eq('id', user.id)
    .single();

  // Charger les cours du mois en cours (± 1 semaine pour la grille mois)
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const debut = new Date(y, m - 1, 1); // mois précédent
  const fin = new Date(y, m + 2, 0);   // fin du mois suivant

  const debutStr = `${debut.getFullYear()}-${String(debut.getMonth() + 1).padStart(2, '0')}-${String(debut.getDate()).padStart(2, '0')}`;
  const finStr = `${fin.getFullYear()}-${String(fin.getMonth() + 1).padStart(2, '0')}-${String(fin.getDate()).padStart(2, '0')}`;

  const [{ data: cours }, { data: laEntries }] = await Promise.all([
    supabase
      .from('cours')
      .select('*, presences(pointee)')
      .eq('profile_id', user.id)
      .gte('date', debutStr)
      .lte('date', finStr)
      .order('date')
      .order('heure'),
    supabase
      .from('liste_attente')
      .select('cours_id, notified_at')
      .eq('profile_id', user.id)
      .is('notified_at', null),
  ]);

  // Compter les entrées liste d'attente par cours_id
  const laByCours = {};
  for (const e of (laEntries || [])) {
    laByCours[e.cours_id] = (laByCours[e.cours_id] || 0) + 1;
  }

  // Date du jour en local
  const todayStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  return (
    <AgendaClient
      cours={cours || []}
      profile={profile}
      initialDate={todayStr}
      listeAttenteByCours={laByCours}
    />
  );
}
