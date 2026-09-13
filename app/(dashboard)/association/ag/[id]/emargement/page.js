import { createServerClient } from '@/lib/supabase-server';
import { resoudreStudioActif } from '@/lib/studio-actif';
import { redirect, notFound } from 'next/navigation';
import { can } from '@/lib/plan-guard';
import { peut } from '@/lib/studio-membre';
import { chargerAdhesions } from '@/lib/vie-asso-service';
import { adherentesAJour, TYPES_AG } from '@/lib/vie-asso';
import BoutonImprimer from './BoutonImprimer';

export const metadata = { title: 'Feuille d\'émargement' };

/**
 * /association/ag/[id]/emargement — la FEUILLE D'ÉMARGEMENT d'une AG (v113) :
 * les adhérentes à jour AU JOUR de l'assemblée, une ligne chacune (nom,
 * signature, pouvoir donné à), imprimable. Rien n'est écrit : la feuille se
 * signe sur papier, le quorum se note ensuite sur la page Association.
 */
export default async function EmargementPage({ params }) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { studioId, membre } = await resoudreStudioActif(supabase, user);
  if (!studioId) redirect('/onboarding');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, studio_nom, plan, trial_started_at, stripe_subscription_status, type_structure, rna, created_at')
    .eq('id', studioId)
    .single();
  if (profile?.type_structure !== 'association' || !can(profile, 'vie_asso') || !peut(membre, 'eleves_voir')) redirect('/dashboard');

  const { data: ag } = await supabase.from('assemblees').select('id, type, titre, date, heure, lieu, ordre_du_jour, statut').eq('id', id).eq('profile_id', studioId).maybeSingle();
  if (!ag) notFound();

  const { adhesions } = await chargerAdhesions(supabase, studioId);
  const aJour = adherentesAJour(adhesions, ag.date);
  const ids = [...aJour.keys()];
  let fiches = [];
  if (ids.length > 0) {
    const { data } = await supabase.from('clients').select('id, prenom, nom').eq('profile_id', studioId).in('id', ids);
    fiches = (data || []).sort((a, b) => `${a.nom || ''} ${a.prenom || ''}`.localeCompare(`${b.nom || ''} ${b.prenom || ''}`, 'fr'));
  }
  const jour = new Date(`${ag.date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="em-page" data-testid="emargement">
      <div className="em-actions">
        <BoutonImprimer />
      </div>
      <header className="em-tete">
        <h1>Feuille d&apos;émargement</h1>
        <p className="em-sous">{profile.studio_nom}{profile.rna ? ` · RNA ${profile.rna}` : ''}</p>
        <p className="em-sous">{ag.titre || TYPES_AG[ag.type]} · {jour}{ag.heure ? ` à ${ag.heure}` : ''}{ag.lieu ? ` · ${ag.lieu}` : ''}</p>
        <p className="em-sous"><strong data-testid="emargement-total">{fiches.length}</strong> adhérente(s) à jour au jour de l&apos;assemblée</p>
      </header>
      <table className="em-table">
        <thead>
          <tr><th style={{ width: 32 }}>N°</th><th>Nom et prénom</th><th style={{ width: '28%' }}>Signature</th><th style={{ width: '28%' }}>Pouvoir donné à</th></tr>
        </thead>
        <tbody>
          {fiches.map((f, i) => (
            <tr key={f.id} data-testid="emargement-ligne"><td>{i + 1}</td><td className="em-nom">{(f.nom || '').toUpperCase()} {f.prenom || ''}</td><td></td><td></td></tr>
          ))}
          {Array.from({ length: 4 }).map((_, i) => (
            <tr key={`v${i}`} className="em-vide"><td>{fiches.length + i + 1}</td><td></td><td></td><td></td></tr>
          ))}
        </tbody>
      </table>
      <p className="em-pied">Présentes : ______ · Pouvoirs : ______ · Total représentées : ______ sur {fiches.length} adhérente(s) à jour. Fait à ________________, le ____ / ____ / ________. Signature de la présidente et de la secrétaire de séance.</p>
      <style>{`
        .em-page { max-width: 820px; margin: 0 auto; padding: 8px 0 40px; color: #1a1a2e; }
        .em-actions { display: flex; justify-content: flex-end; margin-bottom: 10px; }
        .em-tete h1 { font-family: var(--font-fraunces, Georgia, serif); font-size: 1.6rem; margin: 0 0 6px; }
        .em-sous { margin: 2px 0; font-size: .92rem; color: #4a423e; }
        .em-table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: .92rem; }
        .em-table th, .em-table td { border: 1px solid #999; padding: 10px 8px; text-align: left; height: 40px; }
        .em-table th { background: #f3efe9; font-size: .78rem; text-transform: uppercase; letter-spacing: .03em; }
        .em-nom { font-weight: 600; }
        .em-pied { margin-top: 18px; font-size: .85rem; line-height: 1.7; color: #4a423e; }
        @media print {
          .em-actions, .sidebar, .bottom-nav, .dashboard-header, nav, [data-feedback-fab], .fab-feedback, .push-prompt, .account-banner { display: none !important; }
          .dashboard-wrapper, .dashboard-content { display: block !important; margin: 0 !important; padding: 0 !important; max-width: none !important; }
          body { background: #fff !important; }
          .em-page { padding: 0; max-width: none; }
          .em-table tr { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
