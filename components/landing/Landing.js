'use client';

import { useEffect } from 'react';
import {
  Nav, Hero, Benefits, ForWhom, Features, Comparison,
  DemoVideo, Testimonials, Pricing, FAQ, FinalCta, Footer,
} from './Sections';

export default function Landing() {
  // Applique la palette "sable" sur <html> uniquement quand la landing est montée.
  // Au navigate vers /login, /register ou /dashboard, le DOM sera reconstruit avec
  // un autre layout — pas besoin de cleanup.
  useEffect(() => {
    document.documentElement.dataset.palette = 'sable';
  }, []);

  return (
    <div className="izi-landing-root" data-palette="sable">
      <Nav />
      <main>
        <Hero />
        <Benefits />
        <ForWhom />
        <Features />
        <Comparison />
        <DemoVideo />
        <Testimonials />
        <Pricing />
        <FAQ />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
