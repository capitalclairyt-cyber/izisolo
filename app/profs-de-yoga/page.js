import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import PersonaLanding from '@/components/landing/PersonaLanding';
import { getBreadcrumbSchema } from '@/lib/seo';
import '../landing.css';

export const metadata = {
  title: 'Logiciel de gestion pour profs de yoga indépendant·e·s',
  description: "L'outil calme et beau pour les profs de yoga solo. Agenda, élèves, paiements, portail public — tout-en-un. 14 jours d'essai gratuit sans CB, dès 17 €/mois (12 € pour les 100 premières).",
  alternates: { canonical: 'https://izisolo.fr/profs-de-yoga' },
  openGraph: {
    title: 'Logiciel de gestion pour profs de yoga — IziSolo',
    description: "L'outil calme pour gérer ton studio yoga solo. Agenda, élèves, paiements, portail public.",
    url: 'https://izisolo.fr/profs-de-yoga',
    type: 'website',
  },
};

export default async function ProfsDeYogaPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');

  const breadcrumb = getBreadcrumbSchema([
    { name: 'Accueil', url: '/' },
    { name: 'Profs de yoga', url: '/profs-de-yoga' },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <PersonaLanding persona="yoga" />
    </>
  );
}
