import { createServerClient } from '@/lib/supabase-server';
import { resoudreStudioActif } from '@/lib/studio-actif';
import { redirect } from 'next/navigation';
import { can } from '@/lib/plan-guard';
import { peut } from '@/lib/studio-membre';
import PlanRequis from '@/components/plan/PlanRequis';
import { chargerIntervenantes, labelIntervenante } from '@/lib/intervenante';
import { chargerPrestationsStructure } from '@/lib/prestations-service';
import { prestationPourStructure } from '@/lib/prestations';
import { sanitizeRemuneration } from '@/lib/remuneration';
import { debutExerciceDefaut, exerciceDe, derniersExercices } from '@/lib/depenses';
import { typeStructure } from '@/lib/structure';
import { Suspense } from 'react';
import ComptaClient from './ComptaClient';

export const metadata = { title: 'Compta · dépenses, relevés et prestations' };

/**
 * /compta — l'argent de la STRUCTURE (v112, lot 2 Associations & Studios) :
 * ses dépenses, les relevés de ses intervenantes, les prestations qui en
 * naissent, et l'export d'exercice pour le trésorier ou le comptable.
 *
 * Deux gardes serveur, comme partout : le studio doit avoir le plan
 * (Association ou Studio), la personne doit voir l'argent (argent_voir).
 * Tout est chargé DÉFENSIVEMENT : sans v112, l'écran le dit.
 */
const ABSENT = ['PGRST204', 'PGRST205', '42703', '42P01'];

export default async function ComptaPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { studioId, membre } = await resoudreStudioActif(supabase, user);
  if (!studioId) redirect('/onboarding');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, studio_nom, plan, trial_started_at, stripe_subscription_status, type_structure, created_at')
    .eq('id', studioId)
    .single();

  if (!can(profile, 'depenses')) {
    return <PlanRequis capacite="depenses" titre="Compta" texte="Tes dépenses, les relevés de tes intervenantes et leurs prestations, et l'export de ton exercice pour ton trésorier ou ton comptable." />;
  }
  if (!peut(membre, 'argent_voir')) redirect('/dashboard');

  const debutMois = debutExerciceDefaut(typeStructure(profile));
  const aujourdhui = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
  const exercice = exerciceDe(aujourdhui, debutMois);

  // Les dépenses de l'exercice courant (lecture défensive : v112).
  let depenses = [];
  let indisponible = false;
  const { data: dep, error: eDep } = await supabase
    .from('depenses')
    .select('id, date, categorie, libelle, montant_ttc, montant_ht, tva_taux, fournisseur, justificatif_url, notes, membre_id, lieu_id, cours_id, prestation_id, statut, date_reglement, mode_reglement, created_at')
    .eq('profile_id', studioId)
    .gte('date', exercice.from)
    .lte('date', exercice.to)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(500);
  if (eDep) indisponible = ABSENT.includes(eDep.code);
  else depenses = dep || [];

  // Les intervenantes (jamais la propriétaire : elle ne se rémunère pas par
  // un relevé) et ce qui est convenu avec chacune (`select('*')` : la colonne
  // remuneration n'existe qu'avec v112).
  const membresBruts = await chargerIntervenantes(supabase, studioId);
  const membres = membresBruts
    .filter(m => m.role !== 'proprietaire')
    .map(m => ({ id: m.id, label: labelIntervenante(m), email: m.email, a_un_compte: !!m.auth_user_id, remuneration: sanitizeRemuneration(m.remuneration), statut: m.statut }));
  const parId = Object.fromEntries(membres.map(m => [m.id, m]));

  const { prestations: pBrutes, migrationManquante } = await chargerPrestationsStructure(supabase, studioId);
  const prestations = pBrutes.map(p => prestationPourStructure(p, parId[p.membre_id]));
  if (migrationManquante) indisponible = true;

  return (
    <Suspense fallback={null}>
    <ComptaClient
      studioNom={profile?.studio_nom || 'ta structure'}
      typeStructure={typeStructure(profile)}
      exercice={exercice}
      exercices={derniersExercices(3, debutMois)}
      depensesInit={depenses}
      membres={membres}
      prestationsInit={prestations}
      indisponible={indisponible}
      peutGerer={peut(membre, 'argent_gerer')}
    />
    </Suspense>
  );
}
