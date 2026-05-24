import Link from 'next/link';
import Image from 'next/image';
import Comparateur from './Comparateur';
import { getBreadcrumbSchema, ogImageUrl, BASE_URL } from '@/lib/seo';
import '../../landing.css';
import './outil.css';

const OG = ogImageUrl({
  eyebrow: 'Comparateur gratuit',
  title: 'Micro / EI / SASU — quel statut pour toi ?',
  subtitle: 'Saisis ton CA, tes charges et ton objectif — on te dit quel statut maximise ton revenu net.',
  palette: 'sage',
});

export const metadata = {
  title: 'Comparateur de statuts juridiques pour prof de yoga (gratuit)',
  description: "Comparateur gratuit micro-entreprise / EI au réel / SASU pour profs de yoga, pilates et coachs indépendants. Saisis CA, charges et objectif — obtiens ton revenu net estimé pour chaque statut + recommandation.",
  alternates: { canonical: `${BASE_URL}/outils/comparateur-statuts-prof-yoga` },
  openGraph: {
    title: 'Comparateur de statuts juridiques prof yoga — IziSolo',
    description: 'Micro vs EI au réel vs SASU : lequel maximise ton revenu net selon ton CA et tes charges ?',
    url: `${BASE_URL}/outils/comparateur-statuts-prof-yoga`,
    type: 'website',
    images: [{ url: OG, width: 1200, height: 630, alt: 'Comparateur statuts juridiques prof yoga' }],
  },
  twitter: { card: 'summary_large_image', images: [OG] },
};

export default function ComparateurStatutsPage() {
  const breadcrumb = getBreadcrumbSchema([
    { name: 'Accueil', url: '/' },
    { name: 'Outils', url: '/outils' },
    { name: 'Comparateur de statuts juridiques', url: '/outils/comparateur-statuts-prof-yoga' },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <div className="izi-landing-root" data-palette="sable">
        <main className="outil-page">
          <div className="container">

            {/* Breadcrumb */}
            <nav className="outil-breadcrumb" aria-label="Fil d'Ariane">
              <Link href="/">Accueil</Link>
              <span>›</span>
              <Link href="/outils">Outils</Link>
              <span>›</span>
              <span className="current">Comparateur de statuts</span>
            </nav>

            {/* Hero photo */}
            <div className="outil-hero-photo">
              <Image
                src="/outils/hero-statuts.jpg"
                alt="Prof de yoga en posture de l'arbre au sommet d'une montagne au coucher du soleil"
                width={1200}
                height={800}
                priority
                sizes="(max-width: 1000px) 100vw, 1200px"
                style={{ objectFit: 'cover', objectPosition: 'center 40%' }}
              />
              <div className="outil-hero-overlay">
                <span className="eyebrow">Outil gratuit · sans inscription</span>
                <h1 className="outil-h1 serif">
                  Micro, EI ou SASU&nbsp;?
                  <br /><em>Quel statut</em> pour toi.
                </h1>
                <p className="outil-lead">
                  Saisis ton CA, tes charges et ton objectif — on calcule
                  ton revenu net annuel pour chaque statut et on te dit
                  lequel te convient le mieux.
                </p>
              </div>
            </div>

            {/* Comparateur interactif */}
            <Comparateur />

            {/* CTA discret IziSolo */}
            <section className="outil-cta">
              <div className="outil-cta-inner">
                <span className="eyebrow">Une fois le statut choisi</span>
                <h3 className="serif">
                  IziSolo s&apos;adapte à ton statut.
                  <br /><em>Micro, réel ou SASU — l&apos;app suit.</em>
                </h3>
                <p>
                  Mini-compta, export CSV pour ton expert-comptable,
                  reçus PDF conformes (art. 293 B CGI), suivi du CA
                  vs plafond micro — tout est intégré.
                </p>
                <Link href="/" className="btn btn-primary btn-lg">
                  Découvrir IziSolo →
                </Link>
                <p className="outil-cta-sub">
                  14 jours d&apos;essai gratuit · sans CB · annulation 1 clic
                </p>
              </div>
            </section>

            {/* Pour aller plus loin */}
            <nav className="outil-related" aria-label="Articles connexes">
              <h2 className="serif">Pour aller plus loin</h2>
              <div className="outil-related-grid">
                <Link href="/blog/statut-juridique-prof-yoga-france" className="outil-related-card">
                  <span className="eyebrow">Article complet</span>
                  <h3>Quel statut juridique pour prof de yoga en France en 2026 ?</h3>
                  <span className="card-cta">Lire l&apos;article →</span>
                </Link>
                <Link href="/blog/combien-gagne-prof-yoga-france-2026" className="outil-related-card">
                  <span className="eyebrow">Revenus</span>
                  <h3>Combien gagne un·e prof de yoga indépendant·e en France ?</h3>
                  <span className="card-cta">Lire l&apos;article →</span>
                </Link>
                <Link href="/outils/calculateur-revenu-prof-yoga" className="outil-related-card">
                  <span className="eyebrow">Outil complémentaire</span>
                  <h3>Calculateur de revenu net pour prof de yoga</h3>
                  <span className="card-cta">Essayer le calculateur →</span>
                </Link>
                <Link href="/outils/checklist-lancement-prof-yoga" className="outil-related-card">
                  <span className="eyebrow">Outil complémentaire</span>
                  <h3>Checklist de lancement prof solo (~30 étapes interactives)</h3>
                  <span className="card-cta">Ouvrir ma checklist →</span>
                </Link>
              </div>
            </nav>

          </div>
        </main>
      </div>
    </>
  );
}
