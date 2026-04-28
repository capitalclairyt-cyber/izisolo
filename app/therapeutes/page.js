import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import PersonaLanding from '@/components/landing/PersonaLanding';
import '../landing.css';

export const metadata = {
  title: 'Logiciel pour thérapeutes & praticien·ne·s bien-être — IziSolo',
  description: "Une alternative douce à Doctolib pour les sophro, naturo, énergéticien·ne·s, hypno. Page de RDV publique, fiche patient·e RGPD, reçus PDF. Free 25 patient·e·s.",
  alternates: { canonical: 'https://izisolo.fr/therapeutes' },
};

export default async function TherapeutesPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');
  return <PersonaLanding persona="therapeutes" />;
}
