import { fetchStudioPublic, ogPortail } from '@/lib/portail-metadata';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { studioCan } from '@/lib/plan-guard';
import EspaceIndisponible from '@/components/portail/EspaceIndisponible';

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

export default async function PortailConnexionLayout({ children, params }) {
  // Frontière des plans (2026-09-07) : sans espace élève (Essentiel), la page
  // de connexion ne propose pas un lien magique vers un espace fermé.
  const { studioSlug } = await params;
  const { data: studio } = await supabaseAdmin
    .from('profiles')
    .select('studio_nom, plan, trial_started_at, stripe_subscription_status')
    .eq('studio_slug', studioSlug)
    .maybeSingle();
  if (studio && !studioCan(studio, 'espace_eleve')) {
    return <EspaceIndisponible studioNom={studio.studio_nom} studioSlug={studioSlug} />;
  }
  return children;
}
