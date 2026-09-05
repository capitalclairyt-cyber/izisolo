import ComptabiliteLanding from '@/components/landing/ComptabiliteLanding';
import { getBreadcrumbSchema, getFAQSchema, ogImageUrl, BASE_URL } from '@/lib/seo';
import { FAQ_COMPTA } from '@/content/faq-logiciel';
import '../landing.css';

const URL_CANON = `${BASE_URL}/logiciel-comptabilite-prof-yoga`;

const OG = ogImageUrl({
  eyebrow: 'COMPTA & DÉCLARATION',
  title: "La compta d'une prof indépendante, tenue toute seule.",
  subtitle: 'Livre des recettes, factures numérotées, montant à déclarer.',
  palette: 'sable',
});

export const metadata = {
  title: 'Logiciel de comptabilité pour prof de yoga et studio',
  description:
    "Livre des recettes, factures numérotées avec ton SIRET et montant de ta déclaration URSSAF calculé à la date d'encaissement. Tout ce que la micro-entreprise réclame, dès 15 €/mois. 14 jours d'essai sans CB.",
  keywords: [
    'logiciel comptable centre de yoga',
    'logiciel comptabilité prof de yoga',
    'livre des recettes prof de yoga',
    'facture prof de yoga',
    'déclaration URSSAF micro-entreprise yoga',
  ],
  alternates: { canonical: URL_CANON },
  openGraph: {
    title: 'Logiciel de comptabilité pour prof de yoga — IziSolo',
    description:
      "Livre des recettes, factures numérotées et déclaration URSSAF calculée à la date d'encaissement.",
    url: URL_CANON,
    type: 'website',
    images: [{ url: OG, width: 1200, height: 630, alt: 'Comptabilité pour prof de yoga indépendante' }],
  },
  twitter: { card: 'summary_large_image', images: [OG] },
};

export default async function LogicielComptabilitePage() {
  const breadcrumb = getBreadcrumbSchema([
    { name: 'Accueil', url: '/' },
    { name: 'Logiciel de gestion pour prof de yoga', url: '/logiciel-gestion-prof-yoga' },
    { name: 'Comptabilité et déclaration', url: '/logiciel-comptabilite-prof-yoga' },
  ]);

  // Le schema FAQ et la page lisent la MÊME liste (content/faq-logiciel.js).
  // Annoncer à Google une question absente de la page est un signal trompeur,
  // et c'est ce qui arrive dès qu'on tient deux listes à la main.
  const faq = getFAQSchema(FAQ_COMPTA.map(({ q, r }) => ({ question: q, answer: r })));

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faq && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />}
      <ComptabiliteLanding />
    </>
  );
}
