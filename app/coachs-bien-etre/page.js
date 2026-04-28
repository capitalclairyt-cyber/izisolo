import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import PersonaLanding from '@/components/landing/PersonaLanding';
import '../landing.css';

export const metadata = {
  title: 'Logiciel de gestion pour coachs bien-être — IziSolo',
  description: "Sessions 1-à-1, programmes, suivi sur la durée. IziSolo réunit tes RDV, tes notes confidentielles et tes paiements. Free 25 client·e·s, Solo dès 9 €/mois.",
  alternates: { canonical: 'https://izisolo.fr/coachs-bien-etre' },
};

export default async function CoachsBienEtrePage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');
  return <PersonaLanding persona="coaching" />;
}
