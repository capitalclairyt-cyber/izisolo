import { redirect } from 'next/navigation';

// La page /mailing était un placeholder. Elle redirige vers le hub messagerie
// (onglet Annoncer). À conserver tant que des liens externes/anciens emails
// pourraient encore pointer ici.
export default function MailingRedirect() {
  redirect('/messagerie?tab=annoncer');
}
