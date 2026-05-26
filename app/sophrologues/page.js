import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import PersonaLanding from '@/components/landing/PersonaLanding';
import { getBreadcrumbSchema, ogImageUrl } from '@/lib/seo';
import '../landing.css';

const OG = ogImageUrl({
  eyebrow: 'SOPHROLOGUES',
  title: 'Tes séances comptent. Ton outil aussi.',
  subtitle: 'RDV public 24/7, fiches confidentielles, programmes thématiques, reçus PDF conformes.',
  palette: 'sage',
});

export const metadata = {
  title: 'Logiciel pour sophrologues indépendant·e·s — IziSolo',
  description: "Une alternative douce à Doctolib pour les sophrologues : RDV public, anamnèse confidentielle, programmes 6-10 séances, reçus PDF conformes (art. 293 B). 14 jours d'essai gratuit, dès 17 €/mois.",
  alternates: { canonical: 'https://www.izisolo.fr/sophrologues' },
  openGraph: {
    title: 'Logiciel pour sophrologues — IziSolo',
    description: 'RDV en ligne, suivi client confidentiel, programmes thématiques, paiements et reçus PDF.',
    url: 'https://www.izisolo.fr/sophrologues',
    type: 'website',
    images: [{ url: OG, width: 1200, height: 630, alt: 'Logiciel pour sophrologues — IziSolo' }],
  },
  twitter: { card: 'summary_large_image', images: [OG] },
};

export default async function SophrologuesPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');

  const breadcrumb = getBreadcrumbSchema([
    { name: 'Accueil', url: '/' },
    { name: 'Sophrologues', url: '/sophrologues' },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <PersonaLanding persona="sophrologie" />
    </>
  );
}
