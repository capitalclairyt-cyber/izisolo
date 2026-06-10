import Link from 'next/link';
import { getAllArticles, formatDateFR } from '@/lib/blog';
import { getBreadcrumbSchema, ogImageUrl } from '@/lib/seo';
import '../landing.css';
import './blog.css';

const OG = ogImageUrl({
  eyebrow: 'Le journal',
  title: 'Ressources pour les profs indépendant·e·s.',
  subtitle: 'Articles, guides et tableaux pour les profs de yoga, pilates, danse, méditation et coachs bien-être.',
  palette: 'sable',
});

export const metadata = {
  title: 'Le journal IziSolo — Ressources pour profs indépendant·e·s',
  description: "Articles, guides et tableaux pour les profs de yoga, pilates, danse, méditation et coachs bien-être indépendant·e·s. Gérer ses élèves, fixer ses tarifs, lancer son activité.",
  alternates: { canonical: 'https://www.izisolo.fr/blog' },
  openGraph: {
    title: 'Le journal IziSolo',
    description: 'Ressources pour les profs indépendant·e·s du mouvement et du bien-être.',
    url: 'https://www.izisolo.fr/blog',
    type: 'website',
    images: [{ url: OG, width: 1200, height: 630, alt: 'Le journal IziSolo' }],
  },
  twitter: { card: 'summary_large_image', images: [OG] },
};

export default function BlogIndexPage() {
  const articles = getAllArticles();
  const featured = articles.find(a => a.featured) || articles[0];
  const rest = articles.filter(a => a.slug !== featured?.slug);

  const breadcrumb = getBreadcrumbSchema([
    { name: 'Accueil', url: '/' },
    { name: 'Le journal', url: '/blog' },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <div className="izi-landing-root" data-palette="sable">
        <main className="blog-page">
          <div className="container">
            {/* Header */}
            <header className="blog-header">
              <Link href="/" className="blog-back">← Retour à IziSolo</Link>
              <span className="eyebrow">Le journal</span>
              <h1 className="blog-h1 serif">
                Ressources pour les <em>profs indépendant·e·s</em>.
              </h1>
              <p className="blog-intro">
                Articles, guides et tableaux pour gérer ton studio, fixer tes tarifs,
                lancer ton activité. Pensés pour les profs solo de yoga, pilates,
                danse, méditation, coach bien-être et thérapeutes.
              </p>
            </header>

            {articles.length === 0 ? (
              <div className="blog-empty">
                <p>Pas encore d'article publié. Reviens bientôt 🌿</p>
              </div>
            ) : (
              <>
                {/* Article featured — layout 2 colonnes avec hero photo */}
                {featured && (
                  <article className="blog-featured">
                    <Link href={`/blog/${featured.slug}`} className="blog-featured-link">
                      {featured.image && (
                        <div className="blog-featured-image">
                          <img
                            src={featured.image}
                            alt={featured.title}
                            loading="eager"
                          />
                        </div>
                      )}
                      <div className="blog-featured-content">
                        <span className="eyebrow">À la une · {featured.readingTime} min de lecture</span>
                        <h2 className="serif">{featured.title}</h2>
                        <p className="blog-featured-excerpt">{featured.excerpt}</p>
                        <div className="blog-featured-meta">
                          <time dateTime={featured.date}>{formatDateFR(featured.date)}</time>
                          <span className="blog-card-dot">·</span>
                          <span>{featured.readingTime} min de lecture</span>
                        </div>
                        <span className="blog-featured-cta">Lire l'article →</span>
                      </div>
                    </Link>
                  </article>
                )}

                {/* Grille des autres articles avec photo en top */}
                {rest.length > 0 && (
                  <div className="blog-grid">
                    {rest.map(article => (
                      <article key={article.slug} className="blog-card">
                        <Link href={`/blog/${article.slug}`} className="blog-card-link">
                          {article.image && (
                            <div className="blog-card-image">
                              <img
                                src={article.image}
                                alt={article.title}
                                loading="lazy"
                              />
                            </div>
                          )}
                          <div className="blog-card-content">
                            <div className="blog-card-meta">
                              <time dateTime={article.date}>{formatDateFR(article.date)}</time>
                              <span className="blog-card-dot">·</span>
                              <span>{article.readingTime} min</span>
                            </div>
                            <h3 className="serif">{article.title}</h3>
                            <p className="blog-card-excerpt">{article.excerpt}</p>
                            {article.tags?.length > 0 && (
                              <div className="blog-card-tags">
                                {article.tags.slice(0, 3).map(tag => (
                                  <span key={tag} className="blog-tag">{tag}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </Link>
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* CTA en bas */}
            <div className="blog-footer-cta">
              <p>
                Tu es prof indépendant·e et tu cherches un outil pour gérer ton studio&nbsp;?
              </p>
              <Link href="/" className="btn btn-primary btn-lg">Découvrir IziSolo →</Link>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
