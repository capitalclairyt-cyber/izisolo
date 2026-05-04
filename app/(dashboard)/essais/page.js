import { createServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import EssaisClient from './EssaisClient';

export const metadata = { title: 'Demandes de cours d\'essai' };

export default async function EssaisPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Profil pro pour vérifier que essai_actif et récupérer la config
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, studio_nom, essai_actif, essai_mode, essai_paiement, essai_prix')
    .eq('id', user.id)
    .single();

  // Demandes (RLS filtre déjà par profile_id = auth.uid())
  const { data: demandesRaw } = await supabase
    .from('cours_essai_demandes')
    .select('*')
    .order('created_at', { ascending: false });

  // Hydrater les cours associés en parallèle
  const coursIds = [...new Set((demandesRaw || []).map(d => d.cours_id))];
  let coursById = new Map();
  if (coursIds.length > 0) {
    const { data: coursList } = await supabase
      .from('cours')
      .select('id, nom, type_cours, date, heure, lieu')
      .in('id', coursIds);
    coursById = new Map((coursList || []).map(c => [c.id, c]));
  }

  const demandes = (demandesRaw || []).map(d => ({
    ...d,
    cours: coursById.get(d.cours_id) || null,
  }));

  return (
    <EssaisClient profile={profile} demandes={demandes} />
  );
}
