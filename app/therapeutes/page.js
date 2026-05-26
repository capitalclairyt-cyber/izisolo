import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import PersonaLanding from '@/components/landing/PersonaLanding';
import { getBreadcrumbSchema, ogImageUrl } from '@/lib/seo';
import '../landing.css';

const OG = ogImageUrl({
  eyebrow: 'THÉRAPEUTES',
  title: 'L\'outil de gestion pour les praticien·ne·s bien-être.',
  subtitle: 'Page de RDV publique, fiche patient·e RGPD, reçus PDF — sans usine à gaz.',
  palette: 'sky',
});

export const metadata = {
  title: 'Logiciel pour thérapeutes et praticien·ne·s bien-être',
  description: "Une alternative douce à Doctolib pour sophro, naturo, énergéticien·ne·s, hypno. Page de RDV publique, fiche patient·e RGPD, reçus PDF. 14 jours d'essai gratuit, dès 17 €/mois.",
  alternates: { canonical: 'https://www.izisolo.fr/therapeutes' },
  openGraph: {
    title: 'Logiciel pour thérapeutes — IziSolo',
    description: 'Alternative douce à Doctolib pour les praticien·ne·s bien-être indépendant·e·s. RDV public, fiche patient·e, reçus PDF.',
    url: 'https://www.izisolo.fr/therapeutes',
    type: 'website',
    images: [{ url: OG, width: 1200, height: 630, alt: 'Logiciel pour thérapeutes — IziSolo' }],
  },
  twitter: { card: 'summary_large_image', images: [OG] },
};

export default async function TherapeutesPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');

  const breadcrumb = getBreadcrumbSchema([
    { name: 'Accueil', url: '/' },
    { name: 'Thérapeutes', url: '/therapeutes' },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <PersonaLanding persona="therapeutes" />
    </>
  );
}
