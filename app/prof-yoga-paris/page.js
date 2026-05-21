import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import LocalLanding from '@/components/landing/LocalLanding';
import { getBreadcrumbSchema, ogImageUrl, BASE_URL } from '@/lib/seo';
import { CITIES } from '@/content/cities';
import '../landing.css';

const CITY = CITIES.paris;
const OG = ogImageUrl({
  eyebrow: 'PARIS · Île-de-France',
  title: `Logiciel pour profs de yoga à ${CITY.name}.`,
  subtitle: 'Agenda, élèves, paiements, portail public — tout-en-un.',
  palette: 'sable',
});

export const metadata = {
  title: 'Logiciel pour profs de yoga à Paris — IziSolo',
  description: "Outil de gestion pensé pour les profs de yoga indépendant·e·s à Paris : agenda, élèves, paiements, portail public. Dès 12 €/mois pour les 100 premières. 14 jours d'essai sans CB.",
  alternates: { canonical: `${BASE_URL}/prof-yoga-paris` },
  openGraph: {
    title: 'Logiciel pour profs de yoga à Paris — IziSolo',
    description: 'Tout-en-un pour les profs yoga indé parisien·ne·s : agenda, élèves, paiements, portail public.',
    url: `${BASE_URL}/prof-yoga-paris`,
    type: 'website',
    images: [{ url: OG, width: 1200, height: 630, alt: 'Logiciel pour profs de yoga à Paris' }],
  },
  twitter: { card: 'summary_large_image', images: [OG] },
};

export default async function ProfYogaParisPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');

  const breadcrumb = getBreadcrumbSchema([
    { name: 'Accueil', url: '/' },
    { name: 'Profs de yoga', url: '/profs-de-yoga' },
    { name: 'Paris', url: '/prof-yoga-paris' },
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
