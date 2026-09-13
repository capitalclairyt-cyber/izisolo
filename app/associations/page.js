import Structures from '@/components/landing/Structures';
import { ogImageUrl } from '@/lib/seo';
import '../landing.css';

const OG = ogImageUrl({
  eyebrow: 'POUR UNE ASSOCIATION',
  title: 'La vie de l’asso, sans AssoConnect.',
  subtitle: 'Le bureau, les adhésions, les documents et l’AG, à côté des cours et des adhérentes.',
  palette: 'sable',
});

export const metadata = {
  title: 'IziSolo pour une association de yoga, pilates ou danse · 39 € par mois',
  description: 'Le plan Association : tout Complet, des profs illimitées avec leurs droits, le bureau, les adhésions avec reçu de cotisation, les documents et l’assemblée générale. 39 € par mois ou 390 € à l’année, réservé aux associations déclarées.',
  alternates: { canonical: 'https://www.izisolo.fr/associations' },
  openGraph: {
    title: 'IziSolo pour une association',
    description: 'Le bureau, les adhésions, les documents et l’AG, à côté des cours. 39 € par mois.',
    url: 'https://www.izisolo.fr/associations',
    type: 'website',
    images: [{ url: OG, width: 1200, height: 630, alt: 'IziSolo pour une association' }],
  },
  twitter: { card: 'summary_large_image', images: [OG] },
};

export default function AssociationsPage() {
  return <Structures variante="association" />;
}
