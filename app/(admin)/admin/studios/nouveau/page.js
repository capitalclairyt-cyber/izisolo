import NouveauStudioClient from './NouveauStudioClient';

export const metadata = { title: 'Créer un studio' };

// Pré-remplissage depuis /admin/demandes (v96) : la demande porte déjà le
// prénom, l'email, le nom du studio et l'activité — les retaper serait une
// occasion de se tromper sur l'adresse à laquelle part le lien d'accès.
export default async function NouveauStudioPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const un = (v) => (Array.isArray(v) ? v[0] : v) || '';
  return (
    <NouveauStudioClient
      initial={{
        prenom: un(sp.prenom),
        email: un(sp.email),
        studioNom: un(sp.studio),
        metier: un(sp.metier),
      }}
    />
  );
}
