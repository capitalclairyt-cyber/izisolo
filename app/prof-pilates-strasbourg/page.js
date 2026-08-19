import LocalLanding from '@/components/landing/LocalLanding';
import { getBreadcrumbSchema, ogImageUrl, BASE_URL } from '@/lib/seo';
import { CITIES } from '@/content/cities';
import '../landing.css';

const CITY = CITIES.strasbourg;
const OG = ogImageUrl({
  eyebrow: 'STRASBOURG · PILATES',
  title: `Logiciel pour profs de Pilates à ${CITY.name}.`,
  subtitle: 'Mat, Reformer, ateliers — agenda, élèves, paiements, portail public.',
  palette: 'sage',
});

export const metadata = {
  title: 'Logiciel pour profs de Pilates à Strasbourg — IziSolo',
  description: "Outil de gestion pensé pour les profs de Pilates indépendant·e·s à Strasbourg : Mat + Reformer, planning, élèves, paiements, portail public. Dès 15 €/mois. 14 jours d'essai sans CB.",
  alternates: { canonical: `${BASE_URL}/prof-pilates-strasbourg` },
  openGraph: {
    title: 'Logiciel pour profs de Pilates à Strasbourg — IziSolo',
    description: 'Tout-en-un pour les profs Pilates indé strasbourgeois·es : Mat, Reformer, agenda, paiements, portail public.',
    url: `${BASE_URL}/prof-pilates-strasbourg`,
    type: 'website',
    images: [{ url: OG, width: 1200, height: 630, alt: 'Logiciel pour profs de Pilates à Strasbourg' }],
  },
  twitter: { card: 'summary_large_image', images: [OG] },
};

export default async function ProfPilatesStrasbourgPage() {
  const breadcrumb = getBreadcrumbSchema([
    { name: 'Accueil', url: '/' },
    { name: 'Profs de Pilates', url: '/profs-de-pilates' },
    { name: 'Strasbourg', url: '/prof-pilates-strasbourg' },
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
