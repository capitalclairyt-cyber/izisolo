import AdminMfaClient from './AdminMfaClient';

// Page de challenge TOTP de l'admin — VOLONTAIREMENT hors du groupe (admin) :
// le layout admin redirige ici quand la session est aal1 avec un facteur
// vérifié ; si cette page vivait sous ce layout, elle bouclerait.
export const metadata = {
  title: 'Vérification — IziSolo Admin',
  robots: { index: false, follow: false },
};

export default function AdminMfaPage() {
  return <AdminMfaClient />;
}
