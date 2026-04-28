import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import Landing from '@/components/landing/Landing';
import './landing.css';

export default async function Home() {
  // Si l'utilisateur est déjà authentifié, on l'envoie directement à son tableau de bord
  // (il a déjà vu la landing). Sinon on affiche la landing publique.
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return <Landing />;
}
