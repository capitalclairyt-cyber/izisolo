import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import PersonaLanding from '@/components/landing/PersonaLanding';
import { getBreadcrumbSchema } from '@/lib/seo';
import '../landing.css';

export const metadata = {
  title: 'Logiciel de gestion pour coachs bien-être indépendant·e·s',
  description: "Sessions 1-à-1, programmes, suivi sur la durée. IziSolo réunit tes RDV, tes notes confidentielles et tes paiements. 14 jours d'essai gratuit, dès 17 €/mois.",
  alternates: { canonical: 'https://izisolo.fr/coachs-bien-etre' },
  openGraph: {
    title: 'Logiciel de gestion pour coachs bien-être — IziSolo',
    description: 'Sessions 1-à-1, programmes, suivi sur la durée. RDV, notes, paiements en un seul outil.',
    url: 'https://izisolo.fr/coachs-bien-etre',
    type: 'website',
  },
};

export default async function CoachsBienEtrePage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');

  const breadcrumb = getBreadcrumbSchema([
    { name: 'Accueil', url: '/' },
    { name: 'Coachs bien-être', url: '/coachs-bien-etre' },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <PersonaLanding persona="coaching" />
    </>
  );
}
