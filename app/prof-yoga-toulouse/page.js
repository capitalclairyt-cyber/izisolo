import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import LocalLanding from '@/components/landing/LocalLanding';
import { getBreadcrumbSchema, BASE_URL } from '@/lib/seo';
import { CITIES } from '@/content/cities';
import '../landing.css';

const CITY = CITIES.toulouse;

export const metadata = {
  title: 'Logiciel pour profs de yoga à Toulouse — IziSolo',
  description: "Outil de gestion pensé pour les profs de yoga indépendant·e·s à Toulouse : agenda, élèves, paiements, portail public. Dès 12 €/mois pour les 100 premières. 14 jours d'essai sans CB.",
  alternates: { canonical: `${BASE_URL}/prof-yoga-toulouse` },
  openGraph: {
    title: 'Logiciel pour profs de yoga à Toulouse — IziSolo',
    description: 'Tout-en-un pour les profs yoga indé toulousain·e·s : agenda, élèves, paiements, portail public.',
    url: `${BASE_URL}/prof-yoga-toulouse`,
    type: 'website',
  },
};

export default async function ProfYogaToulousePage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');

  const breadcrumb = getBreadcrumbSchema([
    { name: 'Accueil', url: '/' },
    { name: 'Profs de yoga', url: '/profs-de-yoga' },
    { name: 'Toulouse', url: '/prof-yoga-toulouse' },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <LocalLanding city={CITY} discipline="yoga" />
    </>
  );
}
