import ChangerOutil from '@/components/landing/ChangerOutil';
import { ogImageUrl } from '@/lib/seo';
import '../landing.css';

const OG = ogImageUrl({
  eyebrow: 'DÉJÀ ÉQUIPÉE ?',
  title: 'On reprend ce qui se reprend.',
  subtitle: 'Tes élèves, tes carnets, ton planning. Tu gardes ton ancien outil le temps de comparer.',
  palette: 'sable',
});

export const metadata = {
  title: 'Changer d’outil sans rien perdre · IziSolo',
  description: 'Déjà équipée d’une appli de gestion ? On reprend tes élèves depuis ton export, tes carnets avec les séances restantes et ton planning, en 48 h, gratuitement. Tu gardes ton ancien outil ouvert le temps de comparer.',
  alternates: { canonical: 'https://www.izisolo.fr/changer-d-outil' },
  openGraph: {
    title: 'Changer d’outil sans rien perdre',
    description: 'Tes élèves, tes carnets, ton planning : repris en 48 h. Gratuit.',
    url: 'https://www.izisolo.fr/changer-d-outil',
    type: 'website',
    images: [{ url: OG, width: 1200, height: 630, alt: 'Changer d’outil · IziSolo' }],
  },
  twitter: { card: 'summary_large_image', images: [OG] },
};

export default function ChangerOutilPage() {
  return <ChangerOutil />;
}
