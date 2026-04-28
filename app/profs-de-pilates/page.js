import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import PersonaLanding from '@/components/landing/PersonaLanding';
import '../landing.css';

export const metadata = {
  title: 'Logiciel de gestion pour profs et studios Pilates — IziSolo',
  description: "Mat, Reformer, ateliers — IziSolo gère ton planning, tes capacités par appareil, tes carnets et tes abonnements. Free 25 élèves, Solo dès 9 €/mois.",
  alternates: { canonical: 'https://izisolo.fr/profs-de-pilates' },
};

export default async function ProfsDePilatesPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');
  return <PersonaLanding persona="pilates" />;
}
