/**
 * lib/seo.js — Helpers SEO centralisés pour IziSolo.
 *
 * Schema.org JSON-LD generators :
 *   - getOrganizationSchema()    Organization (logo, social, contact)
 *   - getSoftwareApplicationSchema()  SaaS (catégorie, prix, audience)
 *   - getWebSiteSchema()         Recherche site (sitelinks searchbox)
 *   - getFAQSchema(items)        FAQPage (rich snippets Google)
 *   - getBreadcrumbSchema(items) BreadcrumbList (fil d'Ariane)
 *   - getArticleSchema(article)  BlogPosting (articles du blog)
 *   - getLocalBusinessSchema(p)  LocalBusiness (pages locales)
 *
 * Pattern d'usage côté page :
 *
 *   import { getFAQSchema } from '@/lib/seo';
 *   // ...
 *   return (
 *     <>
 *       <script
 *         type="application/ld+json"
 *         dangerouslySetInnerHTML={{ __html: JSON.stringify(getFAQSchema(faq)) }}
 *       />
 *       <Landing />
 *     </>
 *   );
 */

export const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.izisolo.fr';

// ─── Open Graph image URL builder ──────────────────────────────────────────
// Génère l'URL vers /api/og qui produit dynamiquement l'image OG 1200×630.
// Pourquoi ce helper : éviter de hardcoder l'encodage URL dans chaque page.
//
// Usage côté page :
//   import { ogImageUrl } from '@/lib/seo';
//   const og = ogImageUrl({
//     title: 'Mon article',
//     subtitle: 'Le sous-titre éditorial',
//     eyebrow: 'Le journal',
//     palette: 'sable',
//   });
//   export const metadata = {
//     openGraph: { images: [{ url: og, width: 1200, height: 630 }] },
//     twitter:   { images: [og] },
//   };
export function ogImageUrl({ title, subtitle, eyebrow, palette } = {}) {
  const params = new URLSearchParams();
  if (title)    params.set('title',    title);
  if (subtitle) params.set('subtitle', subtitle);
  if (eyebrow)  params.set('eyebrow',  eyebrow);
  if (palette && palette !== 'sable') params.set('palette', palette);
  return `${BASE_URL}/api/og?${params.toString()}`;
}

// ─── Organization ──────────────────────────────────────────────────────────
// Décrit IziSolo en tant qu'entreprise. Posé sur le layout root → visible sur
// toutes les pages publiques. Google utilise ça pour le Knowledge Panel.
export function getOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'IziSolo',
    url: BASE_URL,
    logo: `${BASE_URL}/icons/icon-512.png`,
    description: "Outil de gestion calme et beau pour les profs de yoga, pilates, danse, méditation, coach bien-être et thérapeutes indépendant·e·s. Agenda, élèves, paiements, communication — tout-en-un.",
    foundingDate: '2025',
    areaServed: {
      '@type': 'Country',
      name: 'France',
    },
    sameAs: [
      // À compléter dès que les comptes sont créés
      'https://www.instagram.com/izisolo.fr',
      // 'https://www.linkedin.com/company/izisolo',
      // 'https://www.facebook.com/izisolo.fr',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'bonjour@izisolo.fr',
      availableLanguage: ['French'],
    },
  };
}

// ─── WebSite (sitelinks searchbox + nom site dans Google) ──────────────────
export function getWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'IziSolo',
    url: BASE_URL,
    inLanguage: 'fr-FR',
    publisher: {
      '@type': 'Organization',
      name: 'IziSolo',
      url: BASE_URL,
    },
  };
}

// ─── SoftwareApplication — pour le SaaS ─────────────────────────────────────
// Permet d'apparaître dans les résultats "logiciel" avec prix + catégorie.
export function getSoftwareApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'IziSolo',
    operatingSystem: 'Web, iOS, Android',
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'Studio Management',
    description: "Logiciel de gestion pour profs de yoga, pilates, danse, méditation et coachs bien-être indépendant·e·s. Agenda, élèves, paiements, communication, portail public — tout-en-un.",
    url: BASE_URL,
    inLanguage: 'fr-FR',
    audience: {
      '@type': 'Audience',
      audienceType: "Profs yoga, pilates, danse, méditation, coachs bien-être, thérapeutes indépendant·e·s",
    },
    offers: [
      {
        '@type': 'Offer',
        name: 'Solo',
        price: '17',
        priceCurrency: 'EUR',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: '17',
          priceCurrency: 'EUR',
          unitText: 'MONTH',
        },
        description: "Plan Solo : 40 élèves, 1 lieu, 5 formules, fonctionnalités essentielles.",
      },
      {
        '@type': 'Offer',
        name: 'Pro',
        price: '22',
        priceCurrency: 'EUR',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: '22',
          priceCurrency: 'EUR',
          unitText: 'MONTH',
        },
        description: "Plan Pro : élèves illimités, 3 lieux, automatisation, page publique enrichie, paiement en ligne Stripe.",
      },
    ],
    aggregateRating: undefined, // À ajouter quand on aura des avis Trustpilot/Google
    featureList: [
      'Agenda et planning',
      'Gestion des élèves',
      'Carnets et abonnements',
      'Encaissement des paiements',
      'Messagerie élèves',
      'Page publique du studio',
      'Notifications automatiques',
      'Export comptabilité',
      'Mobile + PWA installable',
    ],
  };
}

// ─── FAQPage ────────────────────────────────────────────────────────────────
// items : [{ question: 'string', answer: 'string' }]
// Génère rich snippets "People also ask" sur Google. Très puissant.
export function getFAQSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: (items || []).map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

// ─── BreadcrumbList ────────────────────────────────────────────────────────
// items : [{ name: 'string', url: 'string' }] — du plus haut au plus bas
export function getBreadcrumbSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: (items || []).map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${BASE_URL}${item.url}`,
    })),
  };
}

// ─── Article (BlogPosting) ──────────────────────────────────────────────────
// Pour chaque article du blog. Boost les rich snippets + "Top stories".
export function getArticleSchema({ title, description, slug, image, datePublished, dateModified, authorName = 'Colin (IziSolo)' }) {
  const url = `${BASE_URL}/blog/${slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description: description,
    image: image ? (image.startsWith('http') ? image : `${BASE_URL}${image}`) : `${BASE_URL}/icons/icon-512.png`,
    datePublished: datePublished,
    dateModified: dateModified || datePublished,
    author: {
      '@type': 'Person',
      name: authorName,
    },
    publisher: {
      '@type': 'Organization',
      name: 'IziSolo',
      logo: {
        '@type': 'ImageObject',
        url: `${BASE_URL}/icons/icon-512.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    inLanguage: 'fr-FR',
  };
}

// ─── Helper : <script> JSON-LD inline ──────────────────────────────────────
// Évite de répéter le `dangerouslySetInnerHTML` partout. Renvoie un fragment.
export function JsonLd({ data }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
