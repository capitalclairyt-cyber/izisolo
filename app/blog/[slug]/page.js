import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getArticleBySlug, getAllSlugs, formatDateFR, getAllArticles } from '@/lib/blog';
import { getArticleSchema, getBreadcrumbSchema, getFAQSchema, BASE_URL } from '@/lib/seo';
import '../../landing.css';
import '../blog.css';

export async function generateStaticParams() {
  return getAllSlugs().map(slug => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return { title: 'Article introuvable' };

  return {
    title: article.title,
    description: article.description || article.excerpt,
    alternates: { canonical: `${BASE_URL}/blog/${slug}` },
    openGraph: {
      type: 'article',
      title: article.title,
      description: article.description || article.excerpt,
      url: `${BASE_URL}/blog/${slug}`,
      publishedTime: article.date,
      modifiedTime: article.updated || article.date,
      authors: [article.author],
      tags: article.tags,
      images: article.image ? [{ url: article.image.startsWith('http') ? article.image : `${BASE_URL}${article.image}` }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.description || article.excerpt,
    },
  };
}

export default async function ArticlePage({ params }) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  // Articles "related" (3 plus récents hors celui-ci)
  const allArticles = getAllArticles();
  const related = allArticles
    .filter(a => a.slug !== slug)
    .slice(0, 3);

  // Schema.org : BlogPosting + Breadcrumb (+ FAQ si l'article en a un)
  const articleSchema = getArticleSchema({
    title: article.title,
    description: article.description || article.excerpt,
    slug: article.slug,
    image: article.image,
    datePublished: article.date,
    dateModified: article.updated,
    authorName: article.author,
  });

  const breadcrumb = getBreadcrumbSchema([
    { name: 'Accueil', url: '/' },
    { name: 'Le journal', url: '/blog' },
    { name: article.title, url: `/blog/${article.slug}` },
  ]);

  const faqSchema = article.faq && article.faq.length
    ? getFAQSchema(article.faq)
    : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      <div className="izi-landing-root" data-palette="sable">
        <main className="article-page">
          <div className="container article-container">
            {/* Breadcrumb visible */}
            <nav className="article-breadcrumb" aria-label="Fil d'Ariane">
              <Link href="/">Accueil</Link>
              <span>›</span>
              <Link href="/blog">Le journal</Link>
              <span>›</span>
              <span className="current">{article.title}</span>
            </nav>

            {/* En-tête article */}
            <header className="article-header">
              {article.tags?.length > 0 && (
                <div className="article-tags">
                  {article.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="blog-tag">{tag}</span>
                  ))}
                </div>
              )}
              <h1 className="article-h1 serif">{article.title}</h1>
              {article.excerpt && (
                <p className="article-lead">{article.excerpt}</p>
              )}
              <div className="article-meta">
                <span className="article-author">Par {article.author}</span>
                <span className="article-dot">·</span>
                <time dateTime={article.date}>{formatDateFR(article.date)}</time>
                <span className="article-dot">·</span>
                <span>{article.readingTime} min de lecture</span>
              </div>
            </header>

            {/* Contenu rendu depuis le markdown */}
            <article
              className="article-body"
              dangerouslySetInnerHTML={{ __html: article.html }}
            />

            {/* CTA fin d'article */}
            <aside className="article-cta">
              <div className="article-cta-inner">
                <span className="eyebrow">Outil recommandé</span>
                <h3 className="serif">
                  IziSolo, l'app pour gérer ton studio <em>en 5 minutes par jour</em>.
                </h3>
                <p>
                  Agenda, élèves, paiements, portail public — tout-en-un.
                  14 jours d'essai sans CB, dès 17 €/mois (12 € pour les 100 premières).
                </p>
                <Link href="/" className="btn btn-primary btn-lg">Découvrir IziSolo →</Link>
              </div>
            </aside>

            {/* Articles connexes */}
            {related.length > 0 && (
              <section className="article-related">
                <h2 className="serif">À lire aussi</h2>
                <div className="blog-grid">
                  {related.map(a => (
                    <article key={a.slug} className="blog-card">
                      <Link href={`/blog/${a.slug}`} className="blog-card-link">
                        <div className="blog-card-content">
                          <div className="blog-card-meta">
                            <time dateTime={a.date}>{formatDateFR(a.date)}</time>
                            <span className="blog-card-dot">·</span>
                            <span>{a.readingTime} min</span>
                          </div>
                          <h3 className="serif">{a.title}</h3>
                          <p className="blog-card-excerpt">{a.excerpt}</p>
                        </div>
                      </Link>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
