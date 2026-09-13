import { createServerClient } from '@/lib/supabase-server';
import { resoudreStudioActif } from '@/lib/studio-actif';
import { redirect } from 'next/navigation';
import { can } from '@/lib/plan-guard';
import { peut } from '@/lib/studio-membre';
import PlanRequis from '@/components/plan/PlanRequis';
import { membrePublic } from '@/lib/equipe';
import { chargerAdhesions, chargerDocuments, chargerAssemblees } from '@/lib/vie-asso-service';
import { classerDocuments } from '@/lib/vie-asso';
import { Suspense } from 'react';
import AssociationClient from './AssociationClient';

export const metadata = { title: 'Association · bureau, adhésions, documents, assemblées' };

/**
 * /association — la vie de l'ASSOCIATION (v113, lot 3 Associations & Studios,
 * PLAN-ASSOS-STUDIOS-2026.md §5.1) : le bureau, les adhésions, les documents
 * et les assemblées générales. Rien de plus : IziSolo reste l'outil des cours,
 * des adhérentes et de l'argent des cours.
 *
 * Trois gardes serveur : une ASSOCIATION seulement (un studio n'a pas de
 * bureau ni d'AG), le plan `vie_asso`, et la personne doit voir les élèves.
 * Tout est chargé DÉFENSIVEMENT : sans v113, l'écran le dit.
 */
export default async function AssociationPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { studioId, membre } = await resoudreStudioActif(supabase, user);
  if (!studioId) redirect('/onboarding');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, studio_nom, plan, trial_started_at, stripe_subscription_status, type_structure, rna, created_at, facturation_siret')
    .eq('id', studioId)
    .single();

  if (profile?.type_structure !== 'association') redirect('/dashboard');
  if (!can(profile, 'vie_asso')) {
    return <PlanRequis capacite="vie_asso" titre="Association" texte="Le bureau et ses fonctions, les adhésions de saison avec leur reçu de cotisation, les documents de l'association et l'assemblée générale (convocation, émargement, quorum, PV)." />;
  }
  if (!peut(membre, 'eleves_voir')) redirect('/dashboard');

  const aujourdhui = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });

  // Le bureau : les membres et leur fonction (lecture large : membrePublic ne
  // rend jamais un secret).
  const { data: membresBruts } = await supabase.from('studio_membres').select('*').eq('profile_id', studioId).in('statut', ['actif', 'invite']).order('role', { ascending: true });
  const membres = (membresBruts || []).map(membrePublic);

  // Les adhérentes : fiches (prénom, nom, email) + adhésions.
  const { data: clients } = await supabase.from('clients').select('id, prenom, nom, email, statut').eq('profile_id', studioId).neq('statut', 'archive').order('nom', { ascending: true }).limit(2000);
  const [{ adhesions, migrationManquante: m1 }, { documents, migrationManquante: m2 }, { assemblees, migrationManquante: m3 }] = await Promise.all([
    chargerAdhesions(supabase, studioId),
    chargerDocuments(supabase, studioId),
    chargerAssemblees(supabase, studioId),
  ]);
  const indisponible = m1 || m2 || m3;
  return (
    <Suspense fallback={null}>
      <AssociationClient
        studioNom={profile?.studio_nom || 'ton association'}
        rna={profile?.rna || null}
        identifiantFacturation={!!profile?.facturation_siret}
        aujourdhui={aujourdhui}
        membresInit={membres}
        clients={clients || []}
        adhesionsInit={adhesions}
        documentsInit={documents}
        classement={classerDocuments(documents)}
        assembleesInit={assemblees}
        indisponible={indisponible}
        peutDocuments={peut(membre, 'documents')}
        peutArgent={peut(membre, 'argent_gerer')}
        peutEquipe={peut(membre, 'equipe_gerer')}
      />
    </Suspense>
  );
}
