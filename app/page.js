import Landing from '@/components/landing/Landing';
import { getSoftwareApplicationSchema, getFAQSchema, BASE_URL } from '@/lib/seo';
import { FAQ_ITEMS } from '@/content/faq';
import './landing.css';

// Canonical explicite (2026-08-28, export Search Console) : la home n'en avait
// AUCUNE, comme 21 autres pages, alors que izisolo.fr et www.izisolo.fr
// répondent tous les deux. Ce n'est pas théorique : le rapport « fonctionnalités
// génératives » liste une impression sur https://izisolo.fr/profs-de-meditation,
// donc en version non-www. Sans canonique, c'est Google qui tranche à notre
// place, et il l'annonce dans « Autre page avec balise canonique correcte ».
export const metadata = {
  alternates: { canonical: BASE_URL },
};

/**
 * Home publique IziSolo (landing) — STATIQUE depuis AUDIT-PERF cat 2.4.
 *
 * Les cas spéciaux d'arrivée AUTH sont gérés PAR LE PROXY (proxy.js, section
 * « pages marketing »), sans appel réseau, pour que cette page (et les 32
 * autres pages marketing) soit servie par le CDN au lieu d'une lambda :
 *
 *   1) Visiteur avec un cookie de session sb-* → /dashboard
 *      (cookie périmé : le layout dashboard renverra vers /login)
 *
 *   2) ?code=XXX (PKCE flow Supabase) → forward /auth/callback?code=...
 *
 *   3) ?token_hash=XXX&type=signup (OTP server-side) → idem /auth/callback
 *      (liens de confirmation email Supabase qui pointent sur SiteURL = `/`)
 *
 *   4) #access_token=... (OTP fragment legacy) → invisible côté serveur,
 *      géré par AuthFragmentCatcher inline dans <head> de app/layout.js.
 */
export default function Home() {
  // Schema.org JSON-LD pour la home : SaaS (prix, features) + FAQ rich snippets.
  // Cf. lib/seo.js. L'Organization + WebSite sont posés sur le layout root.
  const faqItems = FAQ_ITEMS.map(it => ({ question: it.q, answer: it.a }));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(getSoftwareApplicationSchema()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(getFAQSchema(faqItems)) }}
      />
      <Landing />
    </>
  );
}
