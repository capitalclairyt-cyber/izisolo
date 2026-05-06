'use client';

/**
 * Modale de résolution d'un cas — pattern "Déjà fait / À faire / Direct"
 *
 * Selon l'action choisie, on affiche :
 *   • Action à effet métier (paiement / abonnement) :
 *       → Radio "Déjà fait dans IziSolo" (sélectionne ressource existante)
 *         vs "Créer maintenant" (redirect vers formulaire avec retour auto)
 *   • Action directe (décompte / excuse / crédit / prolongé / annule) :
 *       → Confirmation simple, on prévient si ça touche une ressource
 *   • Action neutre (ignore / offert / dette_creee) :
 *       → Confirmation simple, pas d'effet DB
 *
 * Toutes les actions passent par /api/cas-a-traiter/[id]/resolve qui
 * orchestre l'effet métier + la résolution.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, AlertCircle, Loader2, ExternalLink, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase';

// Quelles actions ont un effet métier "création de ressource" ?
// Ces actions affichent les 2 chemins "Déjà fait" / "À faire maintenant".
const ACTIONS_WITH_RESOURCE = {
  encaisse:       { type: 'paiement',    label: 'paiement' },
  unitaire:       { type: 'paiement',    label: 'paiement' },
  paye_stripe:    { type: 'paiement',    label: 'paiement Stripe' },
  paye_place:     { type: 'paiement',    label: 'paiement sur place' },
  rembourse:      { type: 'paiement',    label: 'remboursement' },
  carnet_vendu:   { type: 'abonnement',  label: 'carnet/abonnement' },
  nouveau_carnet: { type: 'abonnement',  label: 'nouveau carnet' },
};

// Actions à effet direct DB (l'API applique l'effet sans formulaire externe)
const DIRECT_ACTIONS = new Set([
  'decompte', 'excuse', 'credit_rendu', 'prolonge', 'reporte', 'annule',
  'place_donnee', 'declinee', 'offert', 'ignore', 'dette_creee',
]);

// Description humaine de l'effet pour chaque action directe (preview avant confirm)
const DIRECT_ACTION_PREVIEW = {
  decompte:      'La séance sera décomptée du carnet de l\'élève (irréversible après 7 jours).',
  excuse:        'La séance sera marquée comme excusée — pas de décompte sur le carnet.',
  credit_rendu:  'Une séance sera restituée sur le carnet (seances_utilisees -1).',
  prolonge:      'La date de fin du carnet sera étendue jusqu\'à la date du cours.',
  reporte:       'L\'inscription sera basculée sur un autre cours.',
  annule:        'L\'inscription au cours sera annulée.',
  place_donnee:  'L\'élève passera de la liste d\'attente à confirmé(e).',
  declinee:      'L\'élève sera retiré(e) de la liste d\'attente.',
  offert:        'Le cours est offert à titre commercial. Aucun paiement n\'est créé.',
  ignore:        'Le cas sera marqué comme vu, sans action.',
  dette_creee:   'Une dette sera enregistrée sur la fiche élève (à régulariser au prochain achat).',
};

export default function ResolveCasModal({ item, action, actionLabel, onClose, onResolved }) {
  const router = useRouter();
  const [mode, setMode]         = useState(null); // 'deja_fait' | 'a_faire' | 'direct'
  const [notes, setNotes]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState(null);

  // Choix de la ressource existante (mode "deja_fait")
  const [ressources, setRessources] = useState([]);
  const [ressourceId, setRessourceId] = useState('');
  const [loadingRess, setLoadingRess] = useState(false);

  const resourceConfig = ACTIONS_WITH_RESOURCE[action];
  const isDirect       = DIRECT_ACTIONS.has(action);
  const directPreview  = DIRECT_ACTION_PREVIEW[action];

  // Mode initial selon le type d'action
  useEffect(() => {
    if (isDirect) setMode('direct');
    else if (resourceConfig) setMode(null); // l'utilisateur DOIT choisir
    else setMode('direct'); // fallback
  }, [action, isDirect, resourceConfig]);

  // Si mode "deja_fait" sur une ressource paiement/abo → charger les
  // dernières ressources du client pour proposer un dropdown
  useEffect(() => {
    if (mode !== 'deja_fait' || !resourceConfig || !item.client_id) return;
    setLoadingRess(true);
    const supabase = createClient();
    const fetcher = resourceConfig.type === 'paiement'
      ? supabase
          .from('paiements')
          .select('id, montant, mode_paiement, created_at')
          .eq('client_id', item.client_id)
          .order('created_at', { ascending: false })
          .limit(10)
      : supabase
          .from('abonnements')
          .select('id, seances_total, seances_utilisees, date_fin, statut')
          .eq('client_id', item.client_id)
          .order('created_at', { ascending: false })
          .limit(10);

    fetcher.then(({ data, error: e }) => {
      if (e) setError(e.message);
      else setRessources(data || []);
      setLoadingRess(false);
    });
  }, [mode, resourceConfig, item.client_id]);

  // Soumission
  const submit = async () => {
    if (!mode) {
      setError('Choisis "Déjà fait" ou "Créer maintenant" avant de confirmer.');
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/cas-a-traiter/${item.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          mode,
          notes: notes.trim() || null,
          ressource_id: mode === 'deja_fait' && ressourceId ? ressourceId : null,
          ressource_type: resourceConfig?.type || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur serveur');

      // Mode "à faire" → redirect vers formulaire
      if (json.mode === 'a_faire' && json.redirect_to) {
        router.push(json.redirect_to);
        return;
      }

      // Mode "déjà fait" ou "direct" → cas résolu
      onResolved?.(json.cas);
      onClose?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const fmtPaiement = (p) => {
    const d = new Date(p.created_at).toLocaleDateString('fr-FR');
    return `${p.montant} € · ${p.mode_paiement || '?'} · ${d}`;
  };
  const fmtAbo = (a) => {
    const reste = (a.seances_total || 0) - (a.seances_utilisees || 0);
    return `${a.seances_total ? `${reste}/${a.seances_total} séances` : 'illimité'} · ${a.statut} · ${a.date_fin ? `fin ${new Date(a.date_fin).toLocaleDateString('fr-FR')}` : ''}`;
  };

  return (
    <div className="resolve-modal-overlay" onClick={onClose}>
      <div className="resolve-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="resolve-modal-close" onClick={onClose} aria-label="Fermer">
          <X size={18} />
        </button>

        <div className="resolve-modal-header">
          <h2 className="resolve-modal-title">{actionLabel}</h2>
          <p className="resolve-modal-subtitle">
            {item.clients ? `${item.clients.prenom || ''} ${item.clients.nom || ''}` : 'Élève'}
            {item.cours?.nom && <> · {item.cours.nom}</>}
          </p>
        </div>

        {/* Action à effet métier : choix entre "déjà fait" et "à faire" */}
        {resourceConfig && (
          <div className="resolve-modal-body">
            <div className="resolve-question">Le {resourceConfig.label} a-t-il déjà été enregistré dans IziSolo ?</div>

            <label className={`resolve-option ${mode === 'deja_fait' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="mode"
                value="deja_fait"
                checked={mode === 'deja_fait'}
                onChange={() => setMode('deja_fait')}
              />
              <div className="resolve-option-body">
                <div className="resolve-option-title">Oui, c'est déjà fait</div>
                <div className="resolve-option-desc">
                  Je sélectionne le {resourceConfig.label} concerné dans la liste.
                </div>
                {mode === 'deja_fait' && (
                  <div className="resolve-option-extra">
                    {loadingRess ? (
                      <div className="resolve-loading"><Loader2 size={14} className="spin" /> Chargement…</div>
                    ) : ressources.length === 0 ? (
                      <div className="resolve-empty">
                        Aucun {resourceConfig.label} récent trouvé pour cet élève.
                        Choisis "Créer maintenant" plutôt.
                      </div>
                    ) : (
                      <select
                        value={ressourceId}
                        onChange={e => setRessourceId(e.target.value)}
                        className="resolve-select"
                      >
                        <option value="">— Choisir un {resourceConfig.label} —</option>
                        {ressources.map(r => (
                          <option key={r.id} value={r.id}>
                            {resourceConfig.type === 'paiement' ? fmtPaiement(r) : fmtAbo(r)}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>
            </label>

            <label className={`resolve-option ${mode === 'a_faire' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="mode"
                value="a_faire"
                checked={mode === 'a_faire'}
                onChange={() => setMode('a_faire')}
              />
              <div className="resolve-option-body">
                <div className="resolve-option-title">
                  Non, créer maintenant <ExternalLink size={12} style={{ verticalAlign: 'middle' }} />
                </div>
                <div className="resolve-option-desc">
                  On t'emmène sur le formulaire pré-rempli. Tu reviens ici une fois validé.
                </div>
              </div>
            </label>
          </div>
        )}

        {/* Action directe : preview de l'effet */}
        {isDirect && directPreview && (
          <div className="resolve-modal-body">
            <div className="resolve-preview">
              <CheckCircle2 size={16} className="resolve-preview-icon" />
              <span>{directPreview}</span>
            </div>
          </div>
        )}

        {/* Note libre — toujours dispo */}
        <div className="resolve-note">
          <label htmlFor="resolve-notes">Note (optionnel)</label>
          <textarea
            id="resolve-notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Détails à garder en mémoire (ex: réglée en espèces, élève prévenue par WhatsApp…)"
            rows={2}
            maxLength={2000}
          />
        </div>

        {error && (
          <div className="resolve-error">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <div className="resolve-modal-actions">
          <button className="resolve-btn-cancel" onClick={onClose} disabled={submitting}>
            Annuler
          </button>
          <button
            className="resolve-btn-confirm"
            onClick={submit}
            disabled={submitting || !mode || (mode === 'deja_fait' && resourceConfig && !ressourceId && ressources.length > 0)}
          >
            {submitting ? <><Loader2 size={14} className="spin" /> Confirmation…</> : 'Confirmer'}
          </button>
        </div>
      </div>

      <style jsx global>{`
        .resolve-modal-overlay {
          position: fixed; inset: 0;
          background: rgba(20, 18, 14, 0.45);
          backdrop-filter: blur(2px);
          display: flex; align-items: center; justify-content: center;
          padding: 20px; z-index: 100;
          animation: resolve-fade-in 0.15s ease-out;
        }
        @keyframes resolve-fade-in { from { opacity: 0; } to { opacity: 1; } }

        .resolve-modal {
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.2);
          max-width: 560px; width: 100%;
          max-height: 90vh; overflow-y: auto;
          padding: 24px;
          position: relative;
          font-family: var(--font-geist), -apple-system, sans-serif;
        }
        .resolve-modal-close {
          position: absolute; top: 14px; right: 14px;
          background: none; border: none; cursor: pointer;
          color: var(--text-muted, #888);
          padding: 4px; border-radius: 6px;
        }
        .resolve-modal-close:hover { background: var(--bg-card-hover, #f5f5f0); color: var(--text-primary, #111); }

        .resolve-modal-header { margin-bottom: 16px; padding-right: 28px; }
        .resolve-modal-title {
          font-size: 1.125rem; font-weight: 700;
          margin: 0 0 4px;
          color: var(--text-primary, #1a1612);
        }
        .resolve-modal-subtitle {
          font-size: 0.875rem; color: var(--text-secondary, #666);
          margin: 0;
        }

        .resolve-modal-body { margin-bottom: 14px; }
        .resolve-question {
          font-size: 0.875rem; font-weight: 600;
          color: var(--text-primary, #1a1612);
          margin-bottom: 10px;
        }

        .resolve-option {
          display: flex; gap: 10px;
          padding: 12px 14px;
          border: 1.5px solid var(--border, #e5e0d8);
          border-radius: 10px;
          cursor: pointer;
          margin-bottom: 8px;
          transition: all 0.15s ease;
          background: white;
        }
        .resolve-option:hover { border-color: var(--brand, #b87333); }
        .resolve-option.selected {
          border-color: var(--brand, #b87333);
          background: var(--brand-light, #faf2eb);
        }
        .resolve-option input[type="radio"] {
          margin-top: 3px; flex-shrink: 0; accent-color: var(--brand, #b87333);
        }
        .resolve-option-body { flex: 1; }
        .resolve-option-title { font-weight: 600; font-size: 0.9rem; color: var(--text-primary, #1a1612); }
        .resolve-option-desc { font-size: 0.8125rem; color: var(--text-secondary, #666); margin-top: 2px; }
        .resolve-option-extra { margin-top: 10px; }

        .resolve-select {
          width: 100%;
          padding: 8px 10px;
          border: 1px solid var(--border, #e5e0d8);
          border-radius: 6px;
          font-size: 0.875rem;
          background: white;
        }
        .resolve-loading, .resolve-empty {
          display: flex; align-items: center; gap: 6px;
          font-size: 0.8125rem; color: var(--text-muted, #888);
          padding: 8px;
        }
        .resolve-empty { font-style: italic; }

        .resolve-preview {
          display: flex; gap: 8px; align-items: flex-start;
          background: var(--bg-warm, #faf6f0);
          border-left: 3px solid var(--brand, #b87333);
          padding: 12px 14px;
          border-radius: 6px;
          font-size: 0.875rem;
          color: var(--text-secondary, #444);
          line-height: 1.5;
        }
        .resolve-preview-icon { color: var(--brand, #b87333); flex-shrink: 0; margin-top: 2px; }

        .resolve-note {
          margin-bottom: 14px;
        }
        .resolve-note label {
          display: block;
          font-size: 0.8125rem; font-weight: 600;
          margin-bottom: 4px;
          color: var(--text-primary, #1a1612);
        }
        .resolve-note textarea {
          width: 100%;
          padding: 8px 10px;
          border: 1px solid var(--border, #e5e0d8);
          border-radius: 6px;
          font-size: 0.875rem;
          font-family: inherit;
          resize: vertical;
        }

        .resolve-error {
          display: flex; align-items: center; gap: 6px;
          background: #fee2e2;
          border-radius: 6px;
          padding: 8px 10px;
          font-size: 0.8125rem; color: #991b1b;
          margin-bottom: 12px;
        }

        .resolve-modal-actions {
          display: flex; gap: 10px; justify-content: flex-end;
        }
        .resolve-btn-cancel, .resolve-btn-confirm {
          padding: 10px 18px;
          border-radius: 8px;
          font-size: 0.875rem; font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.15s ease;
        }
        .resolve-btn-cancel {
          background: white;
          border: 1px solid var(--border, #e5e0d8);
          color: var(--text-primary, #1a1612);
        }
        .resolve-btn-cancel:hover:not(:disabled) {
          background: var(--bg-card-hover, #f5f5f0);
        }
        .resolve-btn-confirm {
          background: var(--brand, #b87333);
          border: 1px solid var(--brand, #b87333);
          color: white;
          display: inline-flex; align-items: center; gap: 6px;
        }
        .resolve-btn-confirm:hover:not(:disabled) {
          background: var(--brand-700, #8c5826);
          border-color: var(--brand-700, #8c5826);
        }
        .resolve-btn-confirm:disabled, .resolve-btn-cancel:disabled {
          opacity: 0.6; cursor: not-allowed;
        }
        .spin { animation: resolve-spin 0.8s linear infinite; }
        @keyframes resolve-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
