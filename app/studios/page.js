import Structures from '@/components/landing/Structures';
import { ogImageUrl } from '@/lib/seo';
import '../landing.css';

const OG = ogImageUrl({
  eyebrow: 'POUR UN STUDIO',
  title: 'Plusieurs profs, plusieurs salles, une seule caisse.',
  subtitle: 'Des salles qui ne se chevauchent pas, la marge de chaque séance, le résultat par salle et par intervenante.',
  palette: 'sable',
});

export const metadata = {
  title: 'IziSolo pour un studio de yoga, pilates ou danse · 59 € par mois',
  description: 'Le plan Studio : tout Complet, des intervenantes illimitées avec leurs droits, des salles sans chevauchement, la marge de chaque séance, le résultat par salle et par intervenante, les contrats, les relevés. 59 € par mois ou 590 € à l’année.',
  alternates: { canonical: 'https://www.izisolo.fr/studios' },
  openGraph: {
    title: 'IziSolo pour un studio',
    description: 'Plusieurs profs, plusieurs salles, une seule caisse. 59 € par mois.',
    url: 'https://www.izisolo.fr/studios',
    type: 'website',
    images: [{ url: OG, width: 1200, height: 630, alt: 'IziSolo pour un studio' }],
  },
  twitter: { card: 'summary_large_image', images: [OG] },
};

export default function StudiosPage() {
  return <Structures variante="studio" />;
}
