import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import PersonaLanding from '@/components/landing/PersonaLanding';
import { getBreadcrumbSchema, ogImageUrl } from '@/lib/seo';
import '../landing.css';

const OG = ogImageUrl({
  eyebrow: 'YOGA ENFANTS',
  title: 'Gérer tes cours yoga enfants sans s\'arracher les cheveux.',
  subtitle: 'Inscriptions parents, autorisations, écoles, stages vacances. Tout-en-un.',
  palette: 'sable',
});

export const metadata = {
  title: 'Logiciel de gestion pour profs de yoga pour enfants',
  description: "L'outil de gestion pensé pour les profs de yoga enfants (3-16 ans). Cours hebdo, stages vacances, interventions écoles. Inscription parents, autorisations parentales, contacts d'urgence — tout est intégré. 14 jours d'essai gratuit sans CB.",
  alternates: { canonical: 'https://www.izisolo.fr/profs-de-yoga-enfants' },
  openGraph: {
    title: 'Logiciel de gestion pour profs de yoga enfants — IziSolo',
    description: "Cours hebdo, stages, écoles. Inscriptions parents, autorisations, suivi par enfant. Pensé pour le yoga 3-16 ans.",
    url: 'https://www.izisolo.fr/profs-de-yoga-enfants',
    type: 'website',
    images: [{ url: OG, width: 1200, height: 630, alt: 'Logiciel de gestion pour profs de yoga enfants' }],
  },
  twitter: { card: 'summary_large_image', images: [OG] },
};

export default async function ProfsDeYogaEnfantsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');

  const breadcrumb = getBreadcrumbSchema([
    { name: 'Accueil', url: '/' },
    { name: 'Profs de yoga pour enfants', url: '/profs-de-yoga-enfants' },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <PersonaLanding persona="yoga-enfants" />
    </>
  );
}
