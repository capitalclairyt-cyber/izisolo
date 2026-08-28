import { BASE_URL } from '@/lib/seo';

export const metadata = {
  title: 'Crée ton studio · IziSolo',
  description: "Essai 14 jours gratuit, sans carte bancaire. Lance ton studio IziSolo en 2 minutes. Outil de gestion pour profs de yoga, pilates, méditation, danse et indépendant·e·s du bien-être.",
  // Ajoutée le 2026-08-28 : /register est soumise au sitemap avec une priorité
  // de 0,7 mais n'avait aucune balise canonique, comme 21 autres pages. La page
  // elle-même est un composant client ('use client') et ne peut donc pas porter
  // de metadata : ce layout est le seul endroit possible, et il est scopé au
  // segment /register pour ne pas coller la même canonique à /login et aux
  // pages de mot de passe.
  alternates: { canonical: `${BASE_URL}/register` },
  openGraph: {
    title: 'Crée ton studio sur IziSolo',
    description: "Essai 14 jours gratuit, sans carte bancaire. Lance ton studio en 2 minutes.",
  },
};

export default function RegisterLayout({ children }) {
  return children;
}
