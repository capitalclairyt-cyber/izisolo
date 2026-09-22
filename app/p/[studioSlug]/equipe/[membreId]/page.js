import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { membrePourPortail, prenomIntervenante } from '@/lib/intervenante';
import { pageDeLIntervenante } from '@/lib/ponts';
import { coursDejaCommence } from '@/lib/dates';
import { fetchStudioPublic, ogPortail } from '@/lib/portail-metadata';
import { traducteurPortail } from '@/lib/i18n-portail-serveur';

/**
 * /p/[studioSlug]/equipe/[membreId] — la page d'UNE intervenante sur le
 * portail de la structure (lot 5 Associations & Studios, §5.2 « une page par
 * intervenante »). Sa photo, sa bio, ses prochaines séances ici, et « Sa
 * page » si elle a relié la sienne (pont 5, v115). Même minimisation que
 * l'onglet L'équipe : jamais un email, jamais un membre sans prénom.
 * La page parle la langue de la visiteuse (2026-09-22) : cookie > studio > fr.
 */
export async function generateMetadata({ params }) {
  const { studioSlug, membreId } = await params;
  const t = await traducteurPortail(studioSlug);
  const studio = await fetchStudioPublic(studioSlug);
  const { data: m } = await supabaseAdmin.from('studio_membres').select('prenom, nom').eq('id', membreId).maybeSingle();
  const nom = m?.prenom ? `${m.prenom}${m.nom ? ` ${m.nom}` : ''}` : t('L\'équipe');
  return { title: `${nom} · ${studio?.studio_nom || 'Studio'}`, ...ogPortail({ studio, description: t('{nom} donne des cours chez {studio}.', { nom, studio: studio?.studio_nom || t('ce studio') }) }) };
}

export default async function IntervenantePage({ params }) {
  const { studioSlug, membreId } = await params;
  const t = await traducteurPortail(studioSlug);
  const supabase = supabaseAdmin;
  const { data: profile } = await supabase.from('profiles').select('id, studio_nom, studio_slug, portail_actif').eq('studio_slug', studioSlug).maybeSingle();
  if (!profile || profile.portail_actif === false) notFound();
  const { data: membre } = await supabase.from('studio_membres').select('*').eq('id', membreId).eq('profile_id', profile.id).in('statut', ['actif', 'invite']).maybeSingle();
  const pub = membrePourPortail(membre);
  if (!pub) notFound();

  // Ses prochaines séances ICI (v103), publiques, non annulées.
  const aujourdhui = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
  let seances = [];
  try {
    const { data } = await supabase
      .from('cours')
      .select('id, nom, date, heure, duree_minutes, lieu, format, est_annule, visibilite')
      .eq('profile_id', profile.id).eq('intervenant_id', membre.id).eq('est_annule', false).eq('visibilite', 'public')
      .gte('date', aujourdhui).order('date').order('heure').limit(12);
    seances = (data || []).filter(c => !coursDejaCommence(c));
  } catch { /* pré-v103 */ }

  // Pont 5 : sa page à elle, si elle a relié (lecture défensive, v115).
  let saPage = null;
  try {
    if (membre.portail_croise === true && membre.auth_user_id) {
      const { data: perso } = await supabase.from('profiles').select('id, studio_nom, studio_slug, portail_actif').eq('id', membre.auth_user_id).maybeSingle();
      saPage = pageDeLIntervenante(membre, perso);
    }
  } catch { /* pré-v115 */ }

  const fmt = (d) => new Date(`${d}T12:00:00`).toLocaleDateString(t.locale, { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <main className="pi-page" data-testid="page-intervenante">
      <Link href={`/p/${studioSlug}?tab=equipe`} className="pi-retour">← {profile.studio_nom}</Link>
      <header className="pi-tete">
        {pub.photo_url
          ? <span className="pi-photo"><Image src={pub.photo_url} alt={pub.prenom} width={160} height={160} sizes="96px" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></span>
          : <span className="pi-photo pi-initiale" aria-hidden="true">{pub.prenom.charAt(0)}</span>}
        <div>
          <h1 className="pi-nom">{pub.prenom}{pub.nom ? ` ${pub.nom}` : ''}</h1>
          <p className="pi-sous">{t('{nom} donne des cours chez {studio}.', { nom: prenomIntervenante(membre), studio: profile.studio_nom })}</p>
          {saPage && <a href={`/p/${saPage.slug}`} className="pi-sa-page" data-testid="intervenante-sa-page">{t('Sa page : {nom} →', { nom: saPage.nom })}</a>}
        </div>
      </header>
      {pub.bio && <p className="pi-bio">{pub.bio}</p>}
      <section className="pi-seances">
        <h2 className="pi-titre">{t('Ses prochaines séances ici')}</h2>
        {seances.length === 0 ? (
          <p className="pi-vide">{t('Aucune séance publique à venir pour l\'instant.')}</p>
        ) : (
          <ul className="pi-liste">
            {seances.map(c => (
              <li key={c.id} data-testid="intervenante-seance">
                <Link href={`/p/${studioSlug}/cours/${c.id}`}>
                  <strong>{c.nom}</strong>
                  <span>{fmt(c.date)}{c.heure ? ` ${t('à {heure}', { heure: String(c.heure).slice(0, 5) })}` : ''}{c.format === 'visio' ? ` · ${t('en ligne')}` : (c.lieu ? ` · ${c.lieu}` : '')}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <style>{`
        .pi-page { max-width: 640px; margin: 0 auto; padding: 20px 16px 48px; }
        .pi-retour { display: inline-block; margin-bottom: 18px; color: var(--text-soft, #7a6f6a); text-decoration: none; font-size: .9rem; }
        .pi-tete { display: flex; gap: 18px; align-items: center; }
        .pi-photo { width: 96px; height: 96px; border-radius: 50%; overflow: hidden; flex-shrink: 0; background: #f1efe9; display: flex; align-items: center; justify-content: center; }
        .pi-initiale { font-size: 2rem; color: var(--brand, #b87333); font-weight: 700; }
        .pi-nom { font-family: var(--font-fraunces, Georgia, serif); font-size: 1.7rem; margin: 0 0 4px; }
        .pi-sous { margin: 0; color: var(--text-soft, #7a6f6a); font-size: .92rem; }
        .pi-sa-page { display: inline-block; margin-top: 6px; color: var(--brand, #b87333); font-weight: 600; text-decoration: none; }
        .pi-bio { margin: 18px 0 0; line-height: 1.6; white-space: pre-line; }
        .pi-titre { font-size: 1.05rem; margin: 28px 0 10px; }
        .pi-vide { color: var(--text-soft, #7a6f6a); }
        .pi-liste { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
        .pi-liste a { display: flex; flex-direction: column; gap: 2px; padding: 12px 14px; border-radius: 12px; background: #fff; border: 1px solid rgba(0,0,0,.07); text-decoration: none; color: inherit; }
        .pi-liste span { font-size: .85rem; color: var(--text-soft, #7a6f6a); }
      `}</style>
    </main>
  );
}
