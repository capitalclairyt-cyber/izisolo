import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import Calculateur from '@/components/landing/Calculateur';
import { ogImageUrl } from '@/lib/seo';
import '../landing.css';

const OG = ogImageUrl({
  eyebrow: 'CALCULATEUR',
  title: 'Combien tu paies vraiment.',
  subtitle: 'Compare le coût réel d\'IziSolo selon ton volume — abonnement + commission, sans surprise.',
  palette: 'sage',
});

export const metadata = {
  title: 'Calculateur de frais — Combien coûte IziSolo ?',
  description: 'Calcule le coût réel d\'IziSolo selon ton volume de paiements. Abonnement + commission détaillés, frais Stripe expliqués. Transparent, sans surprises.',
  alternates: { canonical: 'https://www.izisolo.fr/calculateur' },
  openGraph: {
    title: 'Calculateur de frais — Combien coûte IziSolo ?',
    description: 'Le coût réel selon ton volume. Abonnement + commission, sans surprises.',
    url: 'https://www.izisolo.fr/calculateur',
    type: 'website',
    images: [{ url: OG, width: 1200, height: 630, alt: 'Calculateur de frais IziSolo' }],
  },
  twitter: { card: 'summary_large_image', images: [OG] },
};

export default async function CalculateurPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');
  return <Calculateur />;
}
