'use client';

import { useEffect } from 'react';
import {
  Nav, Hero, TrustStrip, Gratuit, Features, ForWhom, Concierge, Founder,
  Pricing, FAQ, FinalCta, Footer,
} from './Sections';
import ScrollReveal from './ScrollReveal';

// Landing v3 « claire » (2026-09-06) — ordre des sections :
// Hero (un visuel) → bande de confiance → le plan à 0 € → 5 fonctionnalités → Pour qui
// (une ligne) → On monte ton studio → Fondatrice → Tarifs → FAQ → CTA final.
// Plus de « Pourquoi », de « petites choses » ni de cartes personas : les
// quatre rangées portent tout, avec des visuels réels du démo.
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
        <TrustStrip />
        {/* Le plan à 0 € juste sous le hero (2026-09-16) : la question du prix
            se pose avant les fonctionnalités, la grille tarifaire arrivait
            trop bas pour y répondre. */}
        <Gratuit />
        <Features />
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
