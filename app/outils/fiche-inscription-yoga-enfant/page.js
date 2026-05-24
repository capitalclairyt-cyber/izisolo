import Link from 'next/link';
import Image from 'next/image';
import Fiche from './Fiche';
import { getBreadcrumbSchema, ogImageUrl, BASE_URL } from '@/lib/seo';
import '../../landing.css';
import './outil.css';

const OG = ogImageUrl({
  eyebrow: 'Outil gratuit',
  title: 'Fiche d\'inscription yoga enfant + accord parental',
  subtitle: 'Imprimable A4. Santé, contacts urgence, autorisations parentales.',
  palette: 'sable',
});

export const metadata = {
  title: 'Fiche d\'inscription yoga enfant + accord parental (modèle gratuit imprimable)',
  description: "Modèle gratuit de fiche d'inscription pour cours de yoga enfants : identité, parents, antécédents médicaux, contacts d'urgence, autorisations parentales (image, reprise, soins). Personnalisable, imprimable A4, signature parentale incluse.",
  alternates: { canonical: `${BASE_URL}/outils/fiche-inscription-yoga-enfant` },
  openGraph: {
    title: 'Fiche inscription yoga enfant — IziSolo',
    description: 'Modèle imprimable A4 avec accord parental, antécédents médicaux, autorisations. Gratuit.',
    url: `${BASE_URL}/outils/fiche-inscription-yoga-enfant`,
    type: 'website',
    images: [{ url: OG, width: 1200, height: 630, alt: 'Fiche d\'inscription yoga enfant' }],
  },
  twitter: { card: 'summary_large_image', images: [OG] },
};

export default function FicheInscriptionPage() {
  const breadcrumb = getBreadcrumbSchema([
    { name: 'Accueil', url: '/' },
    { name: 'Outils', url: '/outils' },
    { name: 'Fiche d\'inscription yoga enfant', url: '/outils/fiche-inscription-yoga-enfant' },
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

            <nav className="outil-breadcrumb" aria-label="Fil d'Ariane">
              <Link href="/">Accueil</Link>
              <span>›</span>
              <Link href="/outils">Outils</Link>
              <span>›</span>
              <span className="current">Fiche inscription enfant</span>
            </nav>

            <div className="outil-hero-photo">
              <Image
                src="/outils/hero-fiche-enfant.jpg"
                alt="Femme yoga enfants en posture lotus, ambiance douce et pédagogique"
                width={1200}
                height={800}
                priority
                sizes="(max-width: 1000px) 100vw, 1200px"
                style={{ objectFit: 'cover', objectPosition: 'center 40%' }}
              />
              <div className="outil-hero-overlay">
                <span className="eyebrow">Outil gratuit · imprimable A4</span>
                <h1 className="outil-h1 serif">
                  Fiche d&apos;inscription
                  <br /><em>yoga enfant + accord parental.</em>
                </h1>
                <p className="outil-lead">
                  Le modèle qu&apos;il te faut pour la rentrée scolaire ou tes stages
                  vacances : identité, contacts parents, antécédents médicaux,
                  contacts d&apos;urgence et les <strong>4 autorisations
                  parentales</strong> indispensables. Personnalise, imprime,
                  fais signer.
                </p>
              </div>
            </div>

            <Fiche />

            {/* CTA discret IziSolo */}
            <section className="outil-cta">
              <div className="outil-cta-inner">
                <span className="eyebrow">Si tu veux tout digitaliser</span>
                <h3 className="serif">
                  IziSolo gère ça par défaut :
                  <br /><em>parents, autorisations, suivi par enfant.</em>
                </h3>
                <p>
                  L&apos;app a un workflow yoga enfants : les parents créent leur
                  compte, inscrivent leurs enfants, gèrent leurs autorisations.
                  Tu n&apos;as plus à classer des fiches papier ni à chasser les
                  signatures.
                </p>
                <Link href="/profs-de-yoga-enfants" className="btn btn-primary btn-lg">
                  Voir IziSolo pour yoga enfants →
                </Link>
                <p className="outil-cta-sub">
                  14 jours d&apos;essai gratuit · sans CB · annulation 1 clic
                </p>
              </div>
            </section>

            <nav className="outil-related" aria-label="Articles connexes">
              <h2 className="serif">Pour aller plus loin</h2>
              <div className="outil-related-grid">
                <Link href="/blog/yoga-enfants-guide-complet-prof-2026" className="outil-related-card">
                  <span className="eyebrow">Article complet</span>
                  <h3>Yoga pour enfants : le guide complet pour profs (2026)</h3>
                  <span className="card-cta">Lire l&apos;article →</span>
                </Link>
                <Link href="/profs-de-yoga-enfants" className="outil-related-card">
                  <span className="eyebrow">IziSolo pour</span>
                  <h3>Profs de yoga enfants : la page dédiée IziSolo</h3>
                  <span className="card-cta">Découvrir →</span>
                </Link>
                <Link href="/outils/grille-tarifaire-prof-yoga" className="outil-related-card">
                  <span className="eyebrow">Outil complémentaire</span>
                  <h3>Grille tarifaire personnalisable (idéale pour stages)</h3>
                  <span className="card-cta">Essayer →</span>
                </Link>
                <Link href="/outils/checklist-lancement-prof-yoga" className="outil-related-card">
                  <span className="eyebrow">Outil complémentaire</span>
                  <h3>Checklist de lancement prof solo</h3>
                  <span className="card-cta">Ouvrir →</span>
                </Link>
              </div>
            </nav>

          </div>
        </main>
      </div>
    </>
  );
}
