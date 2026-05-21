import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import PersonaLanding from '@/components/landing/PersonaLanding';
import { getBreadcrumbSchema, ogImageUrl } from '@/lib/seo';
import '../landing.css';

const OG = ogImageUrl({
  eyebrow: 'PROFS DE MÉDITATION',
  title: 'Enseigner la présence sans en perdre soi-même.',
  subtitle: 'MBSR, vipassana, mindfulness — agenda, élèves, paiements, retraites silencieuses.',
  palette: 'sable',
});

export const metadata = {
  title: 'Logiciel pour profs de méditation indépendant·e·s — IziSolo',
  description: "Outil de gestion pour les profs de méditation et mindfulness : cycles MBSR, méditations guidées, retraites silencieuses, paiements. Sans création de compte pour tes participant·e·s. 14 jours d'essai gratuit, dès 17 €/mois.",
  alternates: { canonical: 'https://izisolo.fr/profs-de-meditation' },
  openGraph: {
    title: 'Logiciel pour profs de méditation — IziSolo',
    description: 'Mindfulness, MBSR, retraites silencieuses — agenda, élèves, paiements en un seul outil.',
    url: 'https://izisolo.fr/profs-de-meditation',
    type: 'website',
    images: [{ url: OG, width: 1200, height: 630, alt: 'Logiciel pour profs de méditation — IziSolo' }],
  },
  twitter: { card: 'summary_large_image', images: [OG] },
};

export default async function ProfsDeMeditationPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');

  const breadcrumb = getBreadcrumbSchema([
    { name: 'Accueil', url: '/' },
    { name: 'Profs de méditation', url: '/profs-de-meditation' },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <PersonaLanding persona="meditation" />
    </>
  );
}
