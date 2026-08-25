import { createServerClient } from '@/lib/supabase-server';
import { resoudreStudioActif } from '@/lib/studio-actif';
import { redirect } from 'next/navigation';
import { getEssaiPrixParType } from '@/lib/essai-tarif';
import EssaisClient from './EssaisClient';

export const metadata = { title: 'Demandes de cours d\'essai' };

export default async function EssaisPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { studioId } = await resoudreStudioActif(supabase, user);
  if (!user) redirect('/login');

  // Profil pro pour vérifier que essai_actif et récupérer la config
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, studio_nom, essai_actif, essai_mode, essai_paiement, essai_prix')
    .eq('id', studioId)
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

  // Tarif d'essai par type (v92, lecture défensive — null pré-migration)
  const surchargesEssai = await getEssaiPrixParType(supabase, user.id);

  return (
    <EssaisClient profile={profile} demandes={demandes} surchargesEssai={surchargesEssai} />
  );
}
