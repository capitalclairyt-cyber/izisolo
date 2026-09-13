import Link from 'next/link';
import { createServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { escapeIlike } from '@/lib/utils';
import { studiosDeLEleve, prochainesSeancesToutesStructures } from '@/lib/ponts';

export const metadata = { title: 'Mes studios · IziSolo', robots: { index: false, follow: false } };

/**
 * /mes-studios — le hub de l'ÉLÈVE (pont 6, lot 5 Associations & Studios,
 * §6.7) : ses studios (une fiche = un studio, par compte v83 puis par email),
 * ses prochaines séances toutes structures confondues, une entrée vers
 * chaque espace. Sans session, la page dit d'où ouvrir un espace : le lien
 * de connexion vit sur chaque studio. Aucune donnée d'un studio ne traverse
 * vers un autre : chaque bloc est lu par studio, l'écran ne fait que lister.
 */
export default async function MesStudiosPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return (
      <main className="ms-page" data-testid="mes-studios-sans-session">
        <h1 className="ms-titre">Mes studios</h1>
        <p className="ms-texte">Cette page réunit tes studios sur IziSolo. Ouvre d&apos;abord ton espace depuis la page d&apos;un de tes studios (lien « Mon espace ») : ta connexion vaut ensuite pour tous.</p>
        <style>{STYLE}</style>
      </main>
    );
  }
  const admin = supabaseAdmin;
  const [{ data: parCompte }, { data: parEmail }] = await Promise.all([
    admin.from('clients').select('id, profile_id, prenom, statut').eq('auth_user_id', user.id),
    user.email ? admin.from('clients').select('id, profile_id, prenom, statut').ilike('email', escapeIlike(user.email)) : Promise.resolve({ data: [] }),
  ]);
  const fiches = [...(parCompte || []), ...(parEmail || [])];
  const profilIds = [...new Set(fiches.map(f => f.profile_id))];
  const { data: profils } = profilIds.length ? await admin.from('profiles').select('id, studio_nom, studio_slug, portail_actif, ville, metier, photo_url').in('id', profilIds) : { data: [] };
  const studios = studiosDeLEleve(fiches, profils || []);
  const aujourdhui = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
  const ficheIds = studios.flatMap(s => fiches.filter(f => f.profile_id === s.id).map(f => f.id));
  const { data: presences } = ficheIds.length
    ? await admin.from('presences').select('statut_pointage, annulation_tardive, cours(id, nom, date, heure, lieu, format, profile_id, est_annule)').in('client_id', ficheIds).limit(400)
    : { data: [] };
  const seances = prochainesSeancesToutesStructures(presences || [], studios, aujourdhui);
  const prenom = fiches.find(f => f.prenom)?.prenom || null;
  const fmt = (d) => new Date(`${d}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <main className="ms-page" data-testid="mes-studios">
      <h1 className="ms-titre">{prenom ? `${prenom}, tes studios` : 'Mes studios'}</h1>
      <p className="ms-texte">Le même compte ouvre chaque espace. Tes carnets, tes paiements et tes messages restent propres à chaque studio.</p>
      {studios.length === 0 ? (
        <p className="ms-vide">Aucun studio ne te connaît encore sous cette adresse. Réserve une séance ou demande un lien à ton studio : ton espace s&apos;ouvrira ici.</p>
      ) : (
        <ul className="ms-studios">
          {studios.map(s => (
            <li key={s.id} className="ms-studio" data-testid="mes-studios-studio">
              <div>
                <strong>{s.nom}</strong>
                <span>{[s.metier, s.ville].filter(Boolean).join(' · ')}</span>
              </div>
              <div className="ms-liens">
                <Link href={`/p/${s.slug}/espace`} className="ms-btn">Mon espace</Link>
                {s.portail_ouvert && <Link href={`/p/${s.slug}`} className="ms-lien">Le planning</Link>}
              </div>
            </li>
          ))}
        </ul>
      )}
      <h2 className="ms-sous-titre">Mes prochaines séances</h2>
      {seances.length === 0 ? (
        <p className="ms-vide">Aucune séance à venir.</p>
      ) : (
        <ul className="ms-seances">
          {seances.map(c => (
            <li key={c.id} data-testid="mes-studios-seance">
              <Link href={`/p/${c.studio_slug}/espace`}>
                <strong>{c.nom}</strong>
                <span>{fmt(c.date)}{c.heure ? ` à ${c.heure}` : ''} · {c.studio_nom}{c.en_ligne ? ' · en ligne' : (c.lieu ? ` · ${c.lieu}` : '')}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <style>{STYLE}</style>
    </main>
  );
}

const STYLE = `
  .ms-page { max-width: 640px; margin: 0 auto; padding: 28px 16px 48px; font-family: var(--font-geist, Inter, system-ui, sans-serif); color: #1a1a2e; }
  .ms-titre { font-family: var(--font-fraunces, Georgia, serif); font-size: 1.8rem; margin: 0 0 8px; }
  .ms-sous-titre { font-size: 1.05rem; margin: 28px 0 10px; }
  .ms-texte, .ms-vide { color: #7a6f6a; line-height: 1.55; margin: 0 0 18px; }
  .ms-studios, .ms-seances { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
  .ms-studio { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; padding: 14px 16px; border-radius: 14px; background: #fff; border: 1px solid rgba(0,0,0,.07); }
  .ms-studio strong { display: block; }
  .ms-studio span { font-size: .82rem; color: #7a6f6a; }
  .ms-liens { display: flex; gap: 12px; align-items: center; }
  .ms-btn { padding: 8px 14px; border-radius: 999px; background: #b87333; color: #fff; text-decoration: none; font-weight: 600; font-size: .86rem; }
  .ms-lien { color: #8a5a44; font-weight: 600; text-decoration: none; font-size: .86rem; }
  .ms-seances a { display: flex; flex-direction: column; gap: 2px; padding: 12px 14px; border-radius: 12px; background: #fff; border: 1px solid rgba(0,0,0,.07); text-decoration: none; color: inherit; }
  .ms-seances span { font-size: .85rem; color: #7a6f6a; }
`;
