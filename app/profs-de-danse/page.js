import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import PersonaLanding from '@/components/landing/PersonaLanding';
import { getBreadcrumbSchema, ogImageUrl } from '@/lib/seo';
import '../landing.css';

const OG = ogImageUrl({
  eyebrow: 'PROFS DE DANSE',
  title: 'Tes cours, tes troupes, ton studio.',
  subtitle: 'Cycles trimestriels, multi-niveaux, stages week-end, billetterie spectacle.',
  palette: 'blush',
});

export const metadata = {
  title: 'Logiciel pour profs de danse indépendant·e·s — IziSolo',
  description: "Outil de gestion pour les profs de danse : classique, contemporain, hip-hop, swing, salsa. Cycles trimestriels, paiement échelonné, stages week-end, multi-niveaux. 14 jours d'essai gratuit, dès 17 €/mois.",
  alternates: { canonical: 'https://izisolo.fr/profs-de-danse' },
  openGraph: {
    title: 'Logiciel pour profs de danse — IziSolo',
    description: 'Classique, contemporain, hip-hop, swing — cycles trimestriels, stages, billetterie spectacle.',
    url: 'https://izisolo.fr/profs-de-danse',
    type: 'website',
    images: [{ url: OG, width: 1200, height: 630, alt: 'Logiciel pour profs de danse — IziSolo' }],
  },
  twitter: { card: 'summary_large_image', images: [OG] },
};

export default async function ProfsDeDansePage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');

  const breadcrumb = getBreadcrumbSchema([
    { name: 'Accueil', url: '/' },
    { name: 'Profs de danse', url: '/profs-de-danse' },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <PersonaLanding persona="danse" />
    </>
  );
}
