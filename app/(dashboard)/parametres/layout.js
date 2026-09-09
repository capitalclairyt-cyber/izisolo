// Le shell des Paramètres est un LAYOUT : il persiste entre la liste
// (/parametres) et les rubriques (/parametres/<id>), donc le profil du studio
// n'est chargé qu'une fois et les modifications non enregistrées survivent à
// la navigation entre rubriques (lot 1 « Paramètres qui respirent »).
import ParametresShell from './ParametresShell';

export const metadata = { title: 'Paramètres' };

export default function ParametresLayout({ children }) {
  return <ParametresShell>{children}</ParametresShell>;
}
