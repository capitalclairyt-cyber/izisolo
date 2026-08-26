import { fetchStudioPublic, ogPortail } from '@/lib/portail-metadata';

// C'est LE lien que la prof partage à ses élèves (partage natif, modale
// Inviter, QR) : l'aperçu SMS/WhatsApp doit montrer le nom du studio,
// pas le slogan IziSolo (retour Maude, 2026-07-27).
export async function generateMetadata({ params }) {
  const { studioSlug } = await params;
  const studio = await fetchStudioPublic(studioSlug);
  const nom = studio?.studio_nom || 'ton studio';

  return {
    title: `${nom} · Mon espace élève`,
    ...ogPortail({
      studio,
      titre: `${nom} · Mon espace élève`,
      description: `Connecte-toi pour réserver tes séances et suivre tes carnets chez ${nom}.`,
    }),
    robots: { index: false, follow: false },
  };
}

export default function PortailConnexionLayout({ children }) {
  return children;
}
