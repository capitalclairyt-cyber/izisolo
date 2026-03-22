// ============================================
// IziSolo — Calcul des alertes métier
// ============================================

/**
 * Calcule toutes les alertes pour un praticien.
 * Appelé par le dashboard et le cron quotidien.
 */
export async function calculerAlertes(supabase, profileId, seuils) {
  const alertes = [];

  const {
    alerte_seances_seuil = 2,
    alerte_expiration_jours = 7,
    alerte_paiement_attente_jours = 14,
  } = seuils || {};

  // 1. Séances basses
  const { data: abonnementsActifs } = await supabase
    .from('abonnements')
    .select('*, clients(nom, prenom)')
    .eq('profile_id', profileId)
    .eq('statut', 'actif')
    .not('seances_total', 'is', null);

  if (abonnementsActifs) {
    for (const abo of abonnementsActifs) {
      const reste = (abo.seances_total || 0) - (abo.seances_utilisees || 0);
      if (reste <= alerte_seances_seuil && reste > 0) {
        alertes.push({
          type: 'seances_basses',
          niveau: 'warning',
          message: `${abo.clients?.prenom || ''} ${abo.clients?.nom || ''} — ${reste} séance${reste > 1 ? 's' : ''} restante${reste > 1 ? 's' : ''} (${abo.offre_nom})`,
          clientId: abo.client_id,
          abonnementId: abo.id,
        });
      }
      if (reste <= 0) {
        alertes.push({
          type: 'seances_epuisees',
          niveau: 'danger',
          message: `${abo.clients?.prenom || ''} ${abo.clients?.nom || ''} — crédit épuisé (${abo.offre_nom})`,
          clientId: abo.client_id,
          abonnementId: abo.id,
        });
      }
    }
  }

  // 2. Abonnements expirant bientôt
  const dateLimite = new Date();
  dateLimite.setDate(dateLimite.getDate() + alerte_expiration_jours);

  const { data: abosExpirants } = await supabase
    .from('abonnements')
    .select('*, clients(nom, prenom)')
    .eq('profile_id', profileId)
    .eq('statut', 'actif')
    .not('date_fin', 'is', null)
    .lte('date_fin', dateLimite.toISOString().split('T')[0]);

  if (abosExpirants) {
    for (const abo of abosExpirants) {
      const joursRestants = Math.ceil(
        (new Date(abo.date_fin) - new Date()) / (1000 * 60 * 60 * 24)
      );
      if (joursRestants > 0) {
        alertes.push({
          type: 'expiration_proche',
          niveau: 'warning',
          message: `${abo.clients?.prenom || ''} ${abo.clients?.nom || ''} — abonnement expire dans ${joursRestants} jour${joursRestants > 1 ? 's' : ''}`,
          clientId: abo.client_id,
          abonnementId: abo.id,
        });
      }
    }
  }

  // 3. Paiements en attente
  const datePaiementLimite = new Date();
  datePaiementLimite.setDate(datePaiementLimite.getDate() - alerte_paiement_attente_jours);

  const { data: paiementsAttente } = await supabase
    .from('paiements')
    .select('*, clients(nom, prenom)')
    .eq('profile_id', profileId)
    .eq('statut', 'pending')
    .lte('date', datePaiementLimite.toISOString().split('T')[0]);

  if (paiementsAttente) {
    for (const p of paiementsAttente) {
      alertes.push({
        type: 'paiement_attente',
        niveau: 'warning',
        message: `${p.clients?.prenom || ''} ${p.clients?.nom || ''} — ${p.montant}€ en attente depuis ${alerte_paiement_attente_jours}+ jours`,
        clientId: p.client_id,
        paiementId: p.id,
      });
    }
  }

  return alertes;
}
