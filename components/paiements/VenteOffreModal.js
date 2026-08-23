'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Package, Ticket, CalendarCheck, Zap, X, ChevronRight, Loader2, Search,
} from 'lucide-react';
import { formatMontant, matchRecherche } from '@/lib/utils';
import { createClient } from '@/lib/supabase';
import PaiementStep from '@/components/paiements/PaiementStep';
import { calcProRata } from '@/lib/prorata';
import { bornesVente } from '@/lib/offres-periode';

/**
 * VenteOffreModal — LE tunnel de vente d'une offre, partagé entre pages.
 *
 * Extrait de OffresClient (AssignerClientModal) le 2026-08-18, lot
 * « simplification » (appel Patricia : la vente — et donc le paiement en
 * plusieurs fois — était introuvable ; le bouton était un icône-seul
 * « Assigner à un élève », et la page Carnets & abos n'avait aucun point
 * de vente).
 *
 * MÊME moteur que la fiche client : PaiementStep (payé / à régler plus tard /
 * échéancier) + RPC atomique vendre_offre (snapshot types_cours_autorises,
 * dates d'abonnement respectées).
 *
 * Deux entrées :
 *  - `offre` fournie (page Offres : carte → « Vendre ») → étapes élève → paiement
 *  - sans `offre` (page Carnets & abos) → le modal charge les offres actives
 *    et ajoute l'étape « Choisir une offre » en tête
 *
 * Autonome : charge offres/élèves lui-même et embarque le CSS du modal —
 * montable sur n'importe quelle page sans plomberie.
 */

const TYPE_ICONS = { carnet: Ticket, abonnement: CalendarCheck, cours_unique: Zap };

// Pro-rata abonnement : calcul unique lib/prorata (2026-08-21 — la copie
// locale comparait « aujourd'hui » avec l'heure courante, l'aperçu de
// création à minuit : montants divergents possibles en limite de semaine).
const proRataOffre = (offre) => calcProRata({
  actif: offre.pro_rata_actif,
  dateDebut: offre.date_debut,
  dateFin: offre.date_fin,
  prix: offre.prix,
  dateLimite: offre.pro_rata_date_limite || null,
});

export default function VenteOffreModal({ offre: offreInitiale = null, clientInitial = null, onClose, onSuccess }) {
  // 'offre' (si pas d'offre fournie) | 'client' | 'paiement'
  // clientInitial (v97) : la vente part d'une DEMANDE d'élève, on sait déjà
  // qui et quoi — on ouvre droit sur le règlement, le seul choix qui reste.
  const [step, setStep] = useState(
    offreInitiale ? (clientInitial ? 'paiement' : 'client') : 'offre'
  );
  const [offre, setOffre] = useState(offreInitiale);
  const [offres, setOffres] = useState(null); // null = pas encore chargées
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState(clientInitial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoadingClients(false); setOffres([]); return; }
      // Défense en profondeur : filtre par profile_id même si la table n'est
      // pas (encore) exposée par une policy publique.
      const [{ data: cls }, offresRes] = await Promise.all([
        supabase
          .from('clients')
          .select('id, prenom, nom, nom_structure, type_client, statut, telephone')
          .eq('profile_id', user.id)
          .order('nom'),
        offreInitiale ? Promise.resolve(null) : supabase
          .from('offres')
          .select('id, nom, prix, type, seances, duree_jours, date_debut, date_fin, types_cours_autorises, pro_rata_actif, pro_rata_date_limite')
          .eq('profile_id', user.id)
          .eq('actif', true)
          .neq('type', 'cours_unique') // legacy, plus jamais vendu
          .order('prix'),
      ]);
      setClients(cls || []);
      setLoadingClients(false);
      if (offresRes) setOffres(offresRes.data || []);
    };
    load();
  }, [offreInitiale]);

  const filtered = clients.filter(c =>
    matchRecherche(search, c.prenom, c.nom_structure || c.nom)
  );

  const displayName = (c) => {
    const isPro = c.type_client && c.type_client !== 'particulier';
    return isPro
      ? (c.nom_structure || c.nom)
      : [c.prenom, c.nom].filter(Boolean).join(' ');
  };

  const selectClient = (c) => {
    setSelectedClient(c);
    setStep('paiement');
  };

  // Même construction que la fiche client (AssignerOffreModal.handleConfirm) :
  // abonnement avec dates de l'OFFRE + snapshot types_cours_autorises, paiements
  // paid/pending/échéancier — le tout persisté par la RPC atomique vendre_offre.
  const handleConfirm = async ({ montant, modePaiement, notes, numeroCheque, reglement = 'paye', premierEncaisse = true, versements = [] }) => {
    if (!selectedClient || !offre) return;
    setSubmitting(true);
    setError('');
    try {
      const supabase = createClient();
      const today = new Date().toISOString().split('T')[0];
      const multiVersement = reglement === 'multi';

      const abonnement = {
        client_id: selectedClient.id,
        offre_id: offre.id,
        offre_nom: offre.nom,
        type: offre.type,
        // Bornes : dates de l'offre (période fixe) ou aujourd'hui + durée
        // (abonnement glissant). Source unique lib/offres-periode.
        ...bornesVente(offre),
        seances_total: offre.seances || null,
        types_cours_autorises: offre.types_cours_autorises || null,
      };

      let paiements;
      if (multiVersement && versements.length > 1) {
        const echId = crypto.randomUUID();
        paiements = versements.map((v, i) => {
          // Encaissé + mode PAR VERSEMENT (2026-08-20) — PaiementStep garantit
          // qu'une ligne encaissée a son mode ; fallback legacy premierEncaisse
          // si des versements sans le champ arrivaient encore.
          const encaisse = v.encaisse != null ? v.encaisse === true : (i === 0 && premierEncaisse);
          const mode = encaisse ? (v.mode || modePaiement || null) : null;
          return {
            client_id: selectedClient.id,
            offre_id: offre.id,
            echeancier_id: echId,
            intitule: `${offre.nom} (${i + 1}/${versements.length})`,
            type: offre.type,
            montant: v.montant,
            statut: encaisse ? 'paid' : 'pending',
            mode,
            date: v.date,
            notes: encaisse && i === 0 ? (notes || null) : null,
            numero_cheque: mode === 'cheque' && numeroCheque ? numeroCheque : null,
          };
        });
      } else {
        const impaye = reglement === 'aregler';
        paiements = [{
          client_id: selectedClient.id,
          offre_id: offre.id,
          echeancier_id: null,
          intitule: offre.nom,
          type: offre.type,
          montant: montant,
          statut: impaye ? 'pending' : 'paid',
          mode: impaye ? null : modePaiement,
          date: today,
          notes: notes || null,
          numero_cheque: impaye ? null : (numeroCheque || null),
        }];
      }

      const { data: result, error: rpcErr } = await supabase.rpc('vendre_offre', {
        p_abonnement: abonnement,
        p_paiements: paiements,
      });
      if (rpcErr || !result?.ok) {
        throw (rpcErr || new Error(result?.reason || 'Vente non enregistrée'));
      }

      onSuccess();
    } catch (err) {
      console.error('[vendre_offre]', err);
      setError(err.message || 'Erreur inconnue');
      setSubmitting(false);
    }
  };

  const back = () => {
    if (step === 'paiement') setStep('client');
    else if (step === 'client' && !offreInitiale) setStep('offre');
  };
  const showBack = step === 'paiement' || (step === 'client' && !offreInitiale);
  const titre = step === 'offre' ? 'Choisir une offre' : step === 'client' ? 'Choisir un élève' : 'Paiement';

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-sheet animate-slide-up" role="dialog" aria-modal="true">

        {/* Header */}
        <div className="modal-header">
          {showBack ? (
            <button className="modal-back" onClick={back} type="button" aria-label="Retour">
              <ChevronRight size={18} style={{ transform: 'rotate(180deg)' }} />
            </button>
          ) : (
            <div style={{ width: 36 }} />
          )}
          <span className="modal-title">{titre}</span>
          <button className="modal-close" onClick={onClose} type="button" aria-label="Fermer"><X size={20} /></button>
        </div>

        {/* Step 0 — Choisir une offre (entrée Carnets & abos) */}
        {step === 'offre' && (
          <div className="modal-body">
            {offres === null ? (
              <div className="modal-loading"><Loader2 size={24} className="spin" /> Chargement...</div>
            ) : offres.length === 0 ? (
              <div className="modal-empty">
                <p>Aucune offre active dans ton catalogue.</p>
                <Link href="/offres/nouveau" className="izi-btn izi-btn-secondary" onClick={onClose}>
                  Créer une offre
                </Link>
              </div>
            ) : (
              <div className="client-list">
                {offres.map(o => {
                  const Icon = TYPE_ICONS[o.type] || Package;
                  return (
                    <button key={o.id} className="client-choice-btn" onClick={() => { setOffre(o); setStep('client'); }} type="button">
                      <div className="client-choice-avatar" style={{ borderRadius: 10 }}><Icon size={17} /></div>
                      <div className="client-choice-info">
                        <span className="client-choice-nom">{o.nom}</span>
                        <span className="client-choice-tel">{formatMontant(o.prix)}</span>
                      </div>
                      <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 1 — Choisir un client */}
        {step === 'client' && offre && (
          <div className="modal-body">
            {/* Récap offre */}
            <div className="offre-recap-pill">
              {(() => { const Icon = TYPE_ICONS[offre.type] || Package; return <Icon size={16} />; })()}
              <span>{offre.nom}</span>
              <span className="offre-recap-prix">{formatMontant(offre.prix)}</span>
            </div>

            {/* Search */}
            <div className="search-wrap">
              <Search size={16} className="search-icon" />
              <input
                className="izi-input search-input"
                type="text"
                placeholder="Rechercher un élève..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
              />
            </div>

            {loadingClients ? (
              <div className="modal-loading"><Loader2 size={24} className="spin" /> Chargement...</div>
            ) : filtered.length === 0 ? (
              <div className="modal-empty">
                <p>Aucun élève trouvé.</p>
                <Link href="/clients/nouveau" className="izi-btn izi-btn-secondary" onClick={onClose}>
                  Ajouter un élève
                </Link>
              </div>
            ) : (
              <div className="client-list">
                {filtered.map(c => (
                  <button key={c.id} className="client-choice-btn" onClick={() => selectClient(c)} type="button">
                    <div className="client-choice-avatar">
                      {displayName(c).charAt(0).toUpperCase()}
                    </div>
                    <div className="client-choice-info">
                      <span className="client-choice-nom">{displayName(c)}</span>
                      {c.telephone && <span className="client-choice-tel">{c.telephone}</span>}
                    </div>
                    <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2 — Paiement (composant partagé avec la fiche client) */}
        {step === 'paiement' && selectedClient && offre && (() => {
          const prorata = offre.type === 'abonnement' ? proRataOffre(offre) : null;
          return (
            <>
              {error && <p className="error-msg" style={{ margin: '10px 16px 0' }}>{error}</p>}
              <PaiementStep
                offreNom={offre.nom}
                clientNom={displayName(selectedClient)}
                offrePrix={prorata ? prorata.montant : offre.prix}
                prixDetail={prorata ? `Pro-rata : ${prorata.resteSemaines} semaine${prorata.resteSemaines > 1 ? 's' : ''} restante${prorata.resteSemaines > 1 ? 's' : ''} sur ${prorata.totalSemaines} (prix plein ${offre.prix} €)` : null}
                onConfirm={handleConfirm}
                submitting={submitting}
              />
            </>
          );
        })()}
      </div>

      {/* CSS du modal + des classes hôtes de PaiementStep — embarqué pour que
          le tunnel soit montable sur n'importe quelle page (copie conforme du
          bloc « Modal partagé » d'OffresClient ; les doublons de déclarations
          globales identiques sont sans effet). */}
      <style jsx global>{`
        .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 200; display: flex; align-items: flex-end; justify-content: center; }
        @media (min-width: 600px) { .modal-backdrop { align-items: center; } }
        .modal-sheet { background: var(--bg-card); border-radius: var(--radius-lg) var(--radius-lg) 0 0; width: 100%; max-width: 520px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; }
        @media (min-width: 600px) { .modal-sheet { border-radius: var(--radius-lg); } }

        .modal-header { display: flex; align-items: center; gap: 8px; padding: 16px 16px 12px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
        .modal-back { background: none; border: none; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); cursor: pointer; border-radius: var(--radius-sm); }
        .modal-back:hover { background: var(--cream-dark); }
        .modal-title { flex: 1; font-weight: 700; font-size: 1rem; text-align: center; }
        .modal-close { background: none; border: none; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); cursor: pointer; border-radius: var(--radius-sm); }
        .modal-close:hover { background: var(--cream-dark); }

        .modal-body { padding: 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
        .modal-loading { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 32px; color: var(--text-muted); }
        .modal-empty { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 32px 16px; color: var(--text-muted); text-align: center; }

        .offre-recap-pill { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: var(--brand-light); border-radius: var(--radius-full); color: var(--brand-700); font-weight: 600; font-size: 0.9rem; }
        .offre-recap-prix { margin-left: auto; font-weight: 700; }

        .search-wrap { position: relative; }
        .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
        .search-input { padding-left: 36px !important; }

        .client-list { display: flex; flex-direction: column; gap: 4px; }
        .client-choice-btn { display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--cream, #faf8f5); border: 1.5px solid var(--border); border-radius: var(--radius-md); cursor: pointer; text-align: left; width: 100%; transition: all var(--transition-fast); }
        .client-choice-btn:hover { border-color: var(--brand); background: var(--brand-light); }
        .client-choice-avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--brand); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.9375rem; flex-shrink: 0; }
        .client-choice-info { flex: 1; display: flex; flex-direction: column; gap: 1px; }
        .client-choice-nom { font-weight: 600; font-size: 0.9375rem; color: var(--text-primary); }
        .client-choice-tel { font-size: 0.75rem; color: var(--text-muted); }

        .paiement-recap { padding: 12px 14px; background: var(--brand-light); border-radius: var(--radius-md); border: 1px solid var(--brand); display: flex; flex-direction: column; gap: 2px; }
        .paiement-recap-nom { font-weight: 700; font-size: 1rem; color: var(--brand-700); }
        .paiement-recap-client { font-size: 0.8125rem; color: var(--brand-700); opacity: 0.8; }
        .paiement-section-label { font-size: 0.8125rem; font-weight: 700; color: var(--text-secondary); }

        .mode-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .mode-btn { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; padding: 12px 8px; border-radius: var(--radius-md); border: 1.5px solid var(--border); background: var(--bg-card); font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); cursor: pointer; transition: all var(--transition-fast); min-height: 64px; position: relative; }
        .mode-btn.active { border-color: var(--brand); background: var(--brand-light); color: var(--brand-700); }
        .mode-btn:not(.active):not(:disabled):hover { border-color: var(--brand); }
        .mode-btn-soon { opacity: 0.45; cursor: not-allowed; }
        .soon-badge { position: absolute; top: 4px; right: 4px; background: var(--text-muted); color: white; font-size: 0.625rem; font-weight: 700; padding: 1px 5px; border-radius: var(--radius-full); }

        .montant-row { display: flex; align-items: center; gap: 8px; }
        .montant-input { flex: 1; font-size: 1.25rem !important; font-weight: 700 !important; text-align: right; }
        .montant-currency { font-size: 1.25rem; font-weight: 700; color: var(--text-secondary); }
        .montant-hint { font-size: 0.75rem; color: var(--text-muted); text-align: right; margin-top: -8px; }

        .confirm-btn { width: 100%; margin-top: 4px; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .error-msg { color: var(--danger); font-size: 0.8125rem; text-align: center; }

        .multi-nb-chips { display: flex; gap: 6px; flex-wrap: wrap; }
        .multi-nb-chip {
          padding: 5px 12px; border-radius: var(--radius-full);
          border: 1.5px solid var(--border); background: var(--bg-card);
          font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary);
          cursor: pointer; transition: all var(--transition-fast);
        }
        .multi-nb-chip.active { border-color: var(--brand); background: var(--brand-light); color: var(--brand-700); }
      `}</style>
    </div>
  );
}
