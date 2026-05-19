import { createServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import ListeAttenteClient from './ListeAttenteClient';

export const metadata = { title: 'Liste d\'attente' };

export default async function ListeAttentePage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const today = new Date().toISOString().slice(0, 10);

  // Toutes les entrées de liste d'attente pour des cours à venir, non encore notifiées
  const { data: entries } = await supabase
    .from('liste_attente')
    .select('id, email, nom, telephone, position, notified_at, created_at, cours:cours_id(id, nom, date, heure, lieu, capacite_max, est_annule, type_cours)')
    .eq('profile_id', user.id)
    .order('created_at', { ascending: true });

  // Compter les places dispos par cours (capacite_max - count presences)
  const futursAvecLA = (entries || []).filter(e => e.cours && e.cours.date >= today && !e.cours.est_annule);

  // Charger les counts de presences pour chaque cours unique
  const coursIds = [...new Set(futursAvecLA.map(e => e.cours.id))];
  const presencesByCours = {};
  if (coursIds.length > 0) {
    const { data: pres } = await supabase
      .from('presences')
      .select('cours_id')
      .in('cours_id', coursIds);
    for (const p of (pres || [])) {
      presencesByCours[p.cours_id] = (presencesByCours[p.cours_id] || 0) + 1;
    }
  }

  // Grouper par cours
  const coursMap = new Map();
  for (const e of futursAvecLA) {
    const cid = e.cours.id;
    if (!coursMap.has(cid)) {
      const inscrits = presencesByCours[cid] || 0;
      const placesDispos = e.cours.capacite_max ? Math.max(0, e.cours.capacite_max - inscrits) : null;
      coursMap.set(cid, {
        cours: e.cours,
        inscrits,
        placesDispos,
        enAttente: [],
      });
    }
    coursMap.get(cid).enAttente.push(e);
  }

  // Tri par urgence (date du cours)
  const groupes = [...coursMap.values()].sort((a, b) => {
    if (a.cours.date !== b.cours.date) return a.cours.date.localeCompare(b.cours.date);
    return (a.cours.heure || '').localeCompare(b.cours.heure || '');
  });

  return <ListeAttenteClient groupes={groupes} />;
}
