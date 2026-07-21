import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import LogicielGestionLanding from '@/components/landing/LogicielGestionLanding';
import { getBreadcrumbSchema, ogImageUrl } from '@/lib/seo';
import '../landing.css';

const URL_CANON = 'https://www.izisolo.fr/logiciel-gestion-prof-yoga';

const OG = ogImageUrl({
  eyebrow: 'LOGICIEL DE GESTION YOGA',
  title: "L'appli de gestion tout-en-un pour prof de yoga.",
  subtitle: 'Agenda, élèves, présences, paiements, portail — sur ton téléphone.',
  palette: 'sable',
});

export const metadata = {
  title: 'Logiciel & appli de gestion pour prof de yoga',
  description: "Le logiciel de gestion tout-en-un pour prof de yoga solo : agenda, élèves, présences, paiements, mini-compta et portail de réservation — sur ton téléphone. 14 jours d'essai gratuit sans CB, dès 17 €/mois.",
  keywords: ['logiciel de gestion yoga', 'appli de gestion pour prof de yoga', 'gestionnaire pour le yoga', 'système de gestion pour yoga', 'logiciel prof de yoga'],
  alternates: { canonical: URL_CANON },
  openGraph: {
    title: 'Logiciel & appli de gestion pour prof de yoga — IziSolo',
    description: "Agenda, élèves, présences, paiements et portail de réservation — un seul outil, sur ton téléphone.",
    url: URL_CANON,
    type: 'website',
    images: [{ url: OG, width: 1200, height: 630, alt: 'Logiciel de gestion pour prof de yoga' }],
  },
  twitter: { card: 'summary_large_image', images: [OG] },
};

export default async function LogicielGestionPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');

  const breadcrumb = getBreadcrumbSchema([
    { name: 'Accueil', url: '/' },
    { name: 'Logiciel de gestion pour prof de yoga', url: '/logiciel-gestion-prof-yoga' },
  ]);

  // Schema SoftwareApplication — fort pour les requêtes « logiciel / appli ».
  const appSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'IziSolo',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, iOS, Android (PWA)',
    description: "Logiciel de gestion tout-en-un pour prof de yoga indépendant·e : agenda, élèves, présences, paiements et portail de réservation.",
    url: URL_CANON,
    offers: {
      '@type': 'Offer',
      price: '17',
      priceCurrency: 'EUR',
      description: "14 jours d'essai gratuit sans carte bancaire, puis dès 17 €/mois.",
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }} />
      <LogicielGestionLanding />
    </>
  );
}
