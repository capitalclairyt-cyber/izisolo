import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import Calculateur from '@/components/landing/Calculateur';
import '../landing.css';

export const metadata = {
  title: 'Calculateur de frais — Combien coûte IziSolo ?',
  description: 'Calcule le coût réel d\'IziSolo selon ton volume de paiements. Abonnement + commission détaillés, frais Stripe expliqués. Transparent, sans surprises.',
  alternates: { canonical: 'https://izisolo.fr/calculateur' },
};

export default async function CalculateurPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');
  return <Calculateur />;
}
