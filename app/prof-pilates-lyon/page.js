import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import LocalLanding from '@/components/landing/LocalLanding';
import { getBreadcrumbSchema, ogImageUrl, BASE_URL } from '@/lib/seo';
import { CITIES } from '@/content/cities';
import '../landing.css';

const CITY = CITIES.lyon;
const OG = ogImageUrl({
  eyebrow: 'LYON · PILATES',
  title: `Logiciel pour profs de Pilates à ${CITY.name}.`,
  subtitle: 'Mat, Reformer, ateliers — agenda, élèves, paiements, portail public.',
  palette: 'sage',
});

export const metadata = {
  title: 'Logiciel pour profs de Pilates à Lyon — IziSolo',
  description: "Outil de gestion pensé pour les profs de Pilates indépendant·e·s à Lyon : Mat + Reformer, planning, élèves, paiements, portail public. Dès 12 €/mois pour les 100 premières. 14 jours d'essai sans CB.",
  alternates: { canonical: `${BASE_URL}/prof-pilates-lyon` },
  openGraph: {
    title: 'Logiciel pour profs de Pilates à Lyon — IziSolo',
    description: 'Tout-en-un pour les profs Pilates indé lyonnais·es : Mat, Reformer, agenda, paiements, portail public.',
    url: `${BASE_URL}/prof-pilates-lyon`,
    type: 'website',
    images: [{ url: OG, width: 1200, height: 630, alt: 'Logiciel pour profs de Pilates à Lyon' }],
  },
  twitter: { card: 'summary_large_image', images: [OG] },
};

export default async function ProfPilatesLyonPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');

  const breadcrumb = getBreadcrumbSchema([
    { name: 'Accueil', url: '/' },
    { name: 'Profs de Pilates', url: '/profs-de-pilates' },
    { name: 'Lyon', url: '/prof-pilates-lyon' },
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
