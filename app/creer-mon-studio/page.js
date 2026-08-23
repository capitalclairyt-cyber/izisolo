import CreerMonStudio from '@/components/landing/CreerMonStudio';
import { ogImageUrl } from '@/lib/seo';
import '../landing.css';

const OG = ogImageUrl({
  eyebrow: 'MISE EN ROUTE',
  title: 'On monte ton studio.',
  subtitle: 'Ton planning, tes tarifs, tes lieux : prêts sous 48 h. Gratuit.',
  palette: 'sable',
});

export const metadata = {
  title: 'On crée ton studio sous 48 h · IziSolo',
  description: "Tu n'as pas le temps de tout paramétrer ? Remplis un formulaire, on monte ton studio à ta place sous 48 h ouvrées : planning, tarifs, lieux. Gratuit, sans engagement.",
  alternates: { canonical: 'https://www.izisolo.fr/creer-mon-studio' },
  openGraph: {
    title: 'On crée ton studio sous 48 h',
    description: 'Planning, tarifs, lieux : déjà en place quand tu arrives. Gratuit.',
    url: 'https://www.izisolo.fr/creer-mon-studio',
    type: 'website',
    images: [{ url: OG, width: 1200, height: 630, alt: 'On crée ton studio · IziSolo' }],
  },
  twitter: { card: 'summary_large_image', images: [OG] },
};

export default function CreerMonStudioPage() {
  return <CreerMonStudio />;
}
