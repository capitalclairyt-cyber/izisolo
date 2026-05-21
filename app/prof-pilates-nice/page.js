import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import LocalLanding from '@/components/landing/LocalLanding';
import { getBreadcrumbSchema, ogImageUrl, BASE_URL } from '@/lib/seo';
import { CITIES } from '@/content/cities';
import '../landing.css';

const CITY = CITIES.nice;
const OG = ogImageUrl({
  eyebrow: 'NICE · PILATES',
  title: `Logiciel pour profs de Pilates à ${CITY.name}.`,
  subtitle: 'Mat, Reformer, ateliers — agenda, élèves, paiements, portail public.',
  palette: 'blush',
});

export const metadata = {
  title: 'Logiciel pour profs de Pilates à Nice — IziSolo',
  description: "Outil de gestion pensé pour les profs de Pilates indépendant·e·s à Nice : Mat + Reformer, planning, élèves, paiements, portail public. Dès 12 €/mois pour les 100 premières. 14 jours d'essai sans CB.",
  alternates: { canonical: `${BASE_URL}/prof-pilates-nice` },
  openGraph: {
    title: 'Logiciel pour profs de Pilates à Nice — IziSolo',
    description: 'Tout-en-un pour les profs Pilates indé niçois·es : Mat, Reformer, agenda, paiements, portail public.',
    url: `${BASE_URL}/prof-pilates-nice`,
    type: 'website',
    images: [{ url: OG, width: 1200, height: 630, alt: 'Logiciel pour profs de Pilates à Nice' }],
  },
  twitter: { card: 'summary_large_image', images: [OG] },
};

export default async function ProfPilatesNicePage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');

  const breadcrumb = getBreadcrumbSchema([
    { name: 'Accueil', url: '/' },
    { name: 'Profs de Pilates', url: '/profs-de-pilates' },
    { name: 'Nice', url: '/prof-pilates-nice' },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <LocalLanding city={CITY} discipline="pilates" />
    </>
  );
}
