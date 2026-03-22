import { PLANS } from './constantes';

/**
 * Vérifie si le praticien peut effectuer une action selon son plan.
 * Retourne { allowed: true } ou { allowed: false, message: '...' }
 */
export async function verifierLimite(supabase, profileId, action) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', profileId)
    .single();

  const plan = PLANS[profile?.plan || 'decouverte'];

  switch (action) {
    case 'ajouter_client': {
      if (plan.limiteClients === null) return { allowed: true };
      const { count } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', profileId)
        .in('statut', ['prospect', 'actif', 'fidele']);
      if (count >= plan.limiteClients) {
        return {
          allowed: false,
          message: `Tu as atteint la limite de ${plan.limiteClients} ${plan.limiteClients > 1 ? 'élèves' : 'élève'} pour le plan ${plan.nom}. Passe au plan supérieur pour en ajouter plus !`,
        };
      }
      return { allowed: true };
    }

    case 'ajouter_cours': {
      if (plan.limiteCoursSemaine === null) return { allowed: true };
      // Compter les cours de cette semaine
      const now = new Date();
      const lundi = new Date(now);
      lundi.setDate(now.getDate() - now.getDay() + 1);
      const dimanche = new Date(lundi);
      dimanche.setDate(lundi.getDate() + 6);

      const { count } = await supabase
        .from('cours')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', profileId)
        .gte('date', lundi.toISOString().split('T')[0])
        .lte('date', dimanche.toISOString().split('T')[0]);

      if (count >= plan.limiteCoursSemaine) {
        return {
          allowed: false,
          message: `Tu as atteint la limite de ${plan.limiteCoursSemaine} cours par semaine pour le plan ${plan.nom}.`,
        };
      }
      return { allowed: true };
    }

    case 'portail': {
      if (!plan.portail) {
        return {
          allowed: false,
          message: `Le portail client est disponible à partir du plan Essentiel.`,
        };
      }
      return { allowed: true };
    }

    case 'mailing': {
      if (!plan.mailing) {
        return {
          allowed: false,
          message: `Le mailing est disponible à partir du plan Pro.`,
        };
      }
      return { allowed: true };
    }

    default:
      return { allowed: true };
  }
}
