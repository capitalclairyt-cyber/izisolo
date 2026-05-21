import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import PersonaLanding from '@/components/landing/PersonaLanding';
import { getBreadcrumbSchema, ogImageUrl } from '@/lib/seo';
import '../landing.css';

const OG = ogImageUrl({
  eyebrow: 'PROFS DE PILATES',
  title: 'L\'outil pensé pour les profs Pilates indé.',
  subtitle: 'Mat, Reformer, ateliers — planning, capacités, carnets et abonnements.',
  palette: 'blush',
});

export const metadata = {
  title: 'Logiciel de gestion pour profs et studios Pilates',
  description: "Mat, Reformer, ateliers — IziSolo gère ton planning, tes capacités par appareil, tes carnets et abonnements. 14 jours d'essai gratuit, dès 17 €/mois (12 € pour les 100 premières).",
  alternates: { canonical: 'https://izisolo.fr/profs-de-pilates' },
  openGraph: {
    title: 'Logiciel de gestion pour profs Pilates — IziSolo',
    description: 'Mat, Reformer, ateliers — IziSolo gère ton planning, tes capacités, tes carnets et abonnements.',
    url: 'https://izisolo.fr/profs-de-pilates',
    type: 'website',
    images: [{ url: OG, width: 1200, height: 630, alt: 'Logiciel de gestion pour profs Pilates' }],
  },
  twitter: { card: 'summary_large_image', images: [OG] },
};

export default async function ProfsDePilatesPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');

  const breadcrumb = getBreadcrumbSchema([
    { name: 'Accueil', url: '/' },
    { name: 'Profs de Pilates', url: '/profs-de-pilates' },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <PersonaLanding persona="pilates" />
    </>
  );
}
