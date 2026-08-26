'use client';

// Bloc « Payable avec » de la fiche du cours (feedback Camille 2026-08-20).
// AFFICHE quelles offres du catalogue couvrent cette séance, et permet de
// basculer la couverture — édition A : chaque bascule écrit dans L'OFFRE
// (`types_cours_autorises`, le champ « Vaut pour quels cours ? »), JAMAIS de
// périmètre par cours (non-reco MODELE-COURS-CARNETS-2026.md §4). Le verdict
// est délégué à coursCouvert (= resoudreCarnetApplicable, la formule du
// pointage) et la bascule à basculerTypeCouverture — les deux sous verrou CI
// (carnet-resolution.spec.js). Les carnets DÉJÀ VENDUS gardent leur périmètre
// snapshotté à la vente (v53) : ce bloc parle du catalogue, la note le dit.
import { useState } from 'react';
import { coursCouvert, basculerTypeCouverture } from '@/lib/coherence-offres';
import { createClient } from '@/lib/supabase';
import { useToast } from '@/components/ui/ToastProvider';

export default function CouvertureCours({ cours, offres: offresInit, typesCours = [], nbSeancesType = 0, onChoisirType }) {
  const { toast } = useToast();
  const [offres, setOffres] = useState(offresInit || []);
  const [busyId, setBusyId] = useState(null);

  const tarif = Number(cours.tarif_unitaire) > 0 ? Number(cours.tarif_unitaire) : null;
  const atelierPur = !!tarif && cours.carnets_acceptes !== true;
  const sansType = !cours.type_cours;
  const seances = nbSeancesType > 1 ? ` (${nbSeancesType} séances à venir)` : '';

  const basculer = async (offre, couverte) => {
    const res = basculerTypeCouverture(offre.types_cours_autorises, cours.type_cours, typesCours);
    if (!res.ok) {
      if (res.raison === 'dernier_type') {
        toast.error(`« ${offre.nom} » n'est valable QUE pour les cours « ${cours.type_cours} ». La décocher la rendrait valable pour TOUS tes cours (une offre sans restriction couvre tout). Pour l'écarter de cette séance, donne un autre type au cours.`);
      } else if (res.raison === 'catalogue_insuffisant') {
        toast.error(`Ton catalogue n'a pas d'autre type de cours : impossible de limiter « ${offre.nom} » au reste. Ajoute d'abord tes types de cours dans Paramètres.`);
      }
      return;
    }
    const restreinte = Array.isArray(offre.types_cours_autorises) && offre.types_cours_autorises.length > 0;
    const message = couverte
      ? (restreinte
          ? `« ${offre.nom} » ne couvrira plus AUCUN cours « ${cours.type_cours} »${seances}, pas seulement celui-ci.\n\nLes carnets déjà vendus gardent leur périmètre. Continuer ?`
          : `« ${offre.nom} » couvre aujourd'hui TOUS tes cours. La décocher va la limiter aux types : ${res.types.join(', ')}. Un type créé plus tard ne sera plus couvert automatiquement.\n\nÇa vaut pour tous tes cours « ${cours.type_cours} »${seances}, pas seulement celui-ci. Les carnets déjà vendus gardent leur périmètre. Continuer ?`)
      : `« ${offre.nom} » couvrira désormais TOUS tes cours « ${cours.type_cours} »${seances}, pas seulement celui-ci. Continuer ?`;
    if (!confirm(message)) return;

    setBusyId(offre.id);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('offres')
        .update({ types_cours_autorises: res.types })
        .eq('id', offre.id);
      if (error) throw error;
      setOffres(prev => prev.map(o => o.id === offre.id ? { ...o, types_cours_autorises: res.types } : o));
      toast.success(couverte
        ? `« ${offre.nom} » ne couvre plus les cours « ${cours.type_cours} »`
        : `« ${offre.nom} » couvre maintenant les cours « ${cours.type_cours} »`);
    } catch (e) {
      toast.error(e.message || 'La modification a échoué');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="couv-card izi-card">
      <h3 className="couv-title">🎟️ Payable avec</h3>

      {atelierPur ? (
        <p className="couv-info">
          <strong>À l'unité ({tarif} €) uniquement</strong> : aucun carnet/abo ne se décompte
          sur cette séance. Pour accepter aussi les carnets compatibles, modifie le cours
          et coche la case sous le tarif.
        </p>
      ) : (offres || []).length === 0 ? (
        <p className="couv-info">Aucun carnet ou abonnement actif dans ton catalogue pour l'instant.</p>
      ) : (
        <>
          {sansType && (
            <div className="couv-alerte">
              Ce cours n'a pas de type : il est couvert par <strong>tous</strong> tes carnets/abos,
              même ceux limités à certains types.
              {onChoisirType && (
                <button type="button" className="couv-alerte-btn" onClick={onChoisirType}>
                  Choisir un type pour régler qui le couvre
                </button>
              )}
            </div>
          )}
          <div className="couv-list">
            {offres.map(o => {
              const couverte = coursCouvert(o.types_cours_autorises, cours);
              const restreinte = Array.isArray(o.types_cours_autorises) && o.types_cours_autorises.length > 0;
              return (
                <label key={o.id} className={`couv-row ${couverte ? 'est-couverte' : ''} ${sansType ? 'fige' : ''}`}>
                  <input
                    type="checkbox"
                    checked={couverte}
                    disabled={sansType || busyId === o.id}
                    onChange={() => basculer(o, couverte)}
                  />
                  <span className="couv-nom">{o.nom}</span>
                  <span className="couv-meta">
                    {o.type === 'abonnement' ? 'abo' : 'carnet'}
                    {' · '}
                    {restreinte ? `limité à : ${o.types_cours_autorises.join(', ')}` : 'couvre tous tes cours'}
                  </span>
                </label>
              );
            })}
          </div>
          {tarif && (
            <p className="couv-mixte">Les élèves sans carnet compatible règlent <strong>{tarif} €</strong> la séance (cours mixte).</p>
          )}
          <p className="couv-note">
            Ce réglage vit sur l'offre (« Vaut pour quels cours ? ») : il s'applique à tous les
            cours du même type. Les carnets déjà vendus gardent le périmètre qu'ils avaient à la vente.
          </p>
        </>
      )}

      {/* Global (préfixe couv-) : règle du 2026-08-19 — le scopé styled-jsx ne
          hashe pas les composants, on ne prend pas le risque sur un bloc amené
          à évoluer. Préfixe unique = zéro collision. */}
      <style jsx global>{`
        .couv-card { margin-top: 16px; }
        .couv-title { font-size: 0.9375rem; font-weight: 700; color: var(--text-primary, #3D3229); margin: 0 0 10px; }
        .couv-info { font-size: 0.8125rem; color: var(--text-secondary, #6B5D52); line-height: 1.55; margin: 0; }
        .couv-alerte {
          background: var(--bg-soft, #F8F4ED); border: 1px solid var(--border, #e5e0d8);
          border-radius: 10px; padding: 10px 12px; margin-bottom: 10px;
          font-size: 0.8125rem; color: var(--text-secondary, #6B5D52); line-height: 1.5;
        }
        .couv-alerte-btn {
          display: block; margin-top: 8px; background: none; border: none; padding: 0;
          font-size: 0.8125rem; font-weight: 600; font-family: inherit;
          color: var(--brand, #B87333); cursor: pointer; text-decoration: underline;
        }
        .couv-list { display: flex; flex-direction: column; gap: 4px; }
        .couv-row {
          display: flex; align-items: baseline; gap: 8px; padding: 7px 8px;
          border-radius: 8px; cursor: pointer; font-size: 0.875rem;
        }
        .couv-row:hover { background: var(--bg-soft, #F8F4ED); }
        .couv-row.fige { cursor: default; opacity: 0.75; }
        .couv-row input { accent-color: var(--brand, #B87333); flex-shrink: 0; position: relative; top: 1px; }
        .couv-nom { font-weight: 600; color: var(--text-primary, #3D3229); }
        .couv-row:not(.est-couverte) .couv-nom { color: var(--text-muted, #9A8C7E); font-weight: 500; }
        .couv-meta { font-size: 0.75rem; color: var(--text-muted, #9A8C7E); }
        .couv-mixte { font-size: 0.8125rem; color: var(--text-secondary, #6B5D52); margin: 10px 0 0; }
        .couv-note {
          font-size: 0.75rem; color: var(--text-muted, #9A8C7E); line-height: 1.5;
          margin: 10px 0 0; padding-top: 8px; border-top: 1px dashed var(--border, #e5e0d8);
        }
      `}</style>
    </div>
  );
}
