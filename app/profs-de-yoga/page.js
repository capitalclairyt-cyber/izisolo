import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import PersonaLanding from '@/components/landing/PersonaLanding';
import '../landing.css';

export const metadata = {
  title: 'Logiciel de gestion pour profs de yoga — IziSolo',
  description: "L'outil de gestion calme et beau pour les profs de yoga indépendant·e·s. Agenda, élèves, paiements, portail public. Free 25 élèves, Solo dès 9 €/mois.",
  alternates: { canonical: 'https://izisolo.fr/profs-de-yoga' },
};

export default async function ProfsDeYogaPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');
  return <PersonaLanding persona="yoga" />;
}
