'use client';

import { useEffect } from 'react';
import {
  Nav, Hero, Benefits, Features, MoreFeatures, ForWhom, Concierge, Founder,
  Pricing, FAQ, FinalCta, Footer,
} from './Sections';
import ScrollReveal from './ScrollReveal';

// Landing v2 « pro » (handoff 2026-08-19) — ordre des sections :
// Hero product-led → Pourquoi → Fonctionnalités → Petites choses →
// Pour qui → Fondatrice → Tarifs → FAQ → CTA final. Plus de marquee
// de faux studios ni de faux témoignages (de vrais retours viendront).
export default function Landing() {
  // Applique la palette "sable" sur <html> uniquement quand la landing est montée.
  // Au navigate vers /login, /register ou /dashboard, le DOM sera reconstruit avec
  // un autre layout — pas besoin de cleanup.
  useEffect(() => {
    document.documentElement.dataset.palette = 'sable';
  }, []);

  return (
    <div className="izi-landing-root" data-palette="sable">
      <ScrollReveal />
      <Nav />
      <main>
        <Hero />
        <Benefits />
        <Features />
        <MoreFeatures />
        <ForWhom />
        <Concierge />
        <Founder />
        <Pricing />
        <FAQ />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
