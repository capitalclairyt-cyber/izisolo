import { redirect } from 'next/navigation';

// Le module /communication a été fusionné dans le hub /messagerie pour éviter
// le doublon (sélection destinataires + envoi). L'onglet "Annoncer" du hub
// reproduit toutes les fonctionnalités de l'ancien composer (sélection par
// cours / type / abonnement / sélection libre + envoi groupé).
//
// À noter : la feature "cadeau anniversaire" liée à l'envoi mailing n'est pas
// encore portée dans le hub — à réintroduire si elle servait. Backup de
// l'ancienne page conservé en page.js.bak (et dans l'historique git).
export default function CommunicationRedirect() {
  redirect('/messagerie?tab=annoncer');
}
