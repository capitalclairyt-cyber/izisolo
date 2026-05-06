'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Save, Banknote, CreditCard, Landmark, FileText,
  Search, User, X, Loader2, Ticket, CalendarCheck, Zap,
  Package, Pencil, Lightbulb, UserX, Check,
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { useToast } from '@/components/ui/ToastProvider';
import { formatMontant } from '@/lib/utils';

// ─── Constantes ───────────────────────────────────────────────────────────────
const MODES_PAIEMENT = [
  { value: 'especes',  label: 'Espèces',  Icon: Banknote },
  { value: 'cheque',   label: 'Chèque',   Icon: FileText },
  { value: 'virement', label: 'Virement', Icon: Landmark },
  { value: 'CB',       label: 'CB',       Icon: CreditCard },
];

const TYPE_ICONS = { carnet: Ticket, abonnement: CalendarCheck, cours_unique: Zap };
const TYPE_COLORS = { carnet: '#6366f1', abonnement: '#0ea5e9', cours_unique: '#f59e0b' };

// Offre "libre" (saisie manuelle)
const OFFRE_LIBRE = { id: '__libre__', nom: 'Autre prestation', type: '__libre__', prix: '' };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function displayName(c) {
  if (!c) return '';
  if (c.nom_structure) return c.nom_structure;
  return [c.prenom, c.nom].filter(Boolean).join(' ') || 'Sans nom';
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function NouveauPaiement() {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const { toast }   = useToast();
  const searchRef   = useRef(null);

  // Si on arrive depuis un cas à traiter (?cas_id=...), on finalisera le cas
  // après création du paiement. Cf. submitForm() qui appelle l'API resolve.
  const casId       = searchParams.get('cas_id');
  const casAction   = searchParams.get('cas_action');
  const prefillClientId = searchParams.get('client_id');

  // Data
  const [clients, setClients]   = useState([]);
  const [offres, setOffres]     = useState([]);
  const [dataReady, setDataReady] = useState(false);

  // Sélections
  const [selectedClient, setSelectedClient] = useState(null); // null | { id, ... } | 'inconnu'
  const [clientSearch, setClientSearch]     = useState('');
  const [showDropdown, setShowDropdown]     = useState(false);
  const [selectedOffre, setSelectedOffre]   = useState(null); // null | offre | OFFRE_LIBRE

  // Form
  const today = new Date().toISOString().split('T')[0];
  const [intitule, setIntitule] = useState('');
  const [montant, setMontant]   = useState('');
  const [mode, setMode]         = useState('especes');
  const [date, setDate]         = useState(today);
  const [notes, setNotes]       = useState('');
  const [loading, setLoading]   = useState(false);

  // Chargement initial
  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const [{ data: cls }, { data: ofs }] = await Promise.all([
        supabase
          .from('clients')
          .select('id, prenom, nom, nom_structure, type_client, statut')
          .in('statut', ['actif', 'prospect'])
          .order('nom'),
        supabase
          .from('offres')
          .select('id, nom, type, prix, seances, duree_jours')
          .eq('actif', true)
          .order('nom'),
      ]);
      setClients(cls || []);
      setOffres(ofs || []);
      setDataReady(true);

      // Pré-sélection du client si on vient d'un cas à traiter
      if (prefillClientId) {
        const matched = (cls || []).find(c => c.id === prefillClientId);
        if (matched) setSelectedClient(matched);
      }
    };
    load();
  }, [prefillClientId]);

  // Quand on sélectionne une offre : pré-remplir intitulé + montant
  const handleSelectOffre = (offre) => {
    setSelectedOffre(offre);
    if (offre.id !== '__libre__') {
      setIntitule(offre.nom);
      setMontant(String(offre.prix));
    } else {
      // Libérer les champs pour saisie libre
      setIntitule('');
      setMontant('');
    }
  };

  // Client
  const filteredClients = clients.filter(c =>
    displayName(c).toLowerCase().includes(clientSearch.toLowerCase())
  );

  const selectClient = (c) => {
    setSelectedClient(c);
    setClientSearch(displayName(c));
    setShowDropdown(false);
  };

  const setClientInconnu = () => {
    setSelectedClient('inconnu');
    setClientSearch('');
    setShowDropdown(false);
  };

  const clearClient = () => {
    setSelectedClient(null);
    setClientSearch('');
  };

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedClient) {
      toast.warning('Sélectionne un client ou indique "Client inconnu".');
      return;
    }
    if (!selectedOffre) {
      toast.warning('Choisis une prestation ou "Autre" pour une saisie libre.');
      return;
    }
    if (!intitule.trim()) {
      toast.warning('L\'intitulé est obligatoire.');
      return;
    }
    if (!montant || parseFloat(montant) <= 0) {
      toast.warning('Le montant doit être supérieur à 0.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      // .select('id').single() pour récupérer l'ID — utile pour résoudre le
      // cas à traiter avec ressource_id si on vient d'un cas (?cas_id=...).
      const { data: paiement, error } = await supabase.from('paiements').insert({
        profile_id: user.id,
        client_id:  (selectedClient !== 'inconnu' && selectedClient?.id) ? selectedClient.id : null,
        offre_id:   (selectedOffre?.id && selectedOffre.id !== '__libre__') ? selectedOffre.id : null,
        intitule:   intitule.trim(),
        type:       selectedOffre?.type !== '__libre__' ? selectedOffre?.type : null,
        montant:    parseFloat(montant),
        mode,
        date,
        statut:     'paid',
        notes:      notes.trim() || null,
      }).select('id').single();

      if (error) throw error;

      // Si on vient d'un cas à traiter → résoudre le cas avec le paiement créé
      if (casId && casAction && paiement?.id) {
        try {
          const resolveRes = await fetch(`/api/cas-a-traiter/${casId}/resolve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: casAction,
              mode: 'deja_fait',
              ressource_id: paiement.id,
              ressource_type: 'paiement',
              notes: `Paiement créé via ce flow : ${intitule.trim()}`,
            }),
          });
          if (!resolveRes.ok) {
            const j = await resolveRes.json().catch(() => ({}));
            toast.warning('Paiement OK, mais cas non résolu : ' + (j.error || 'erreur inconnue'));
          }
        } catch {
          toast.warning('Paiement OK, mais cas non résolu (réseau).');
        }
        toast.success('Paiement enregistré et cas résolu ✓');
        router.push(`/cas-a-traiter?cas_resolu=${casId}`);
        return;
      }

      toast.success('Paiement enregistré !');
      router.push('/revenus');
      router.refresh();
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const clientConfirmed = selectedClient !== null;
  const isInconnu       = selectedClient === 'inconnu';
  const isLibre         = selectedOffre?.id === '__libre__';
  const canSubmit       = clientConfirmed && selectedOffre && intitule.trim() && montant && parseFloat(montant) > 0;

  return (
    <div className="np-page">
      {casId && (
        <div className="np-cas-banner" role="status">
          <span>🔗 Tu finalises un <strong>cas à traiter</strong>. Le paiement sera lié et le cas résolu automatiquement.</span>
          <Link href="/cas-a-traiter" className="np-cas-banner-back">← Retour aux cas</Link>
        </div>
      )}
      <div className="np-header animate-fade-in">
        <Link href={casId ? '/cas-a-traiter' : '/revenus'} className="back-btn"><ArrowLeft size={20} /></Link>
        <h1>Nouveau paiement</h1>
      </div>

      <form onSubmit={handleSubmit} className="np-form animate-slide-up">

        {/* ══════════════════════════════════════════
            1 — CLIENT
        ══════════════════════════════════════════ */}
        <div className="np-section">
          <div className="np-section-label">
            <span className="np-step">1</span> Client
          </div>

          {!clientConfirmed ? (
            <div className="np-client-zone">
              <div className="np-client-search-wrap">
                <Search size={15} className="np-search-icon" />
                <input
                  ref={searchRef}
                  className="izi-input np-search-input"
                  placeholder="Rechercher un élève…"
                  value={clientSearch}
                  onChange={e => { setClientSearch(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                  autoComplete="off"
                />
                {showDropdown && (clientSearch || true) && (
                  <div className="np-dropdown">
                    {clientSearch && filteredClients.slice(0, 6).map(c => (
                      <button key={c.id} type="button" className="np-dropdown-item" onMouseDown={() => selectClient(c)}>
                        <div className="np-client-avatar">{displayName(c).charAt(0).toUpperCase()}</div>
                        <div>
                          <div className="np-dropdown-name">{displayName(c)}</div>
                          <div className="np-dropdown-sub">{c.statut}</div>
                        </div>
                      </button>
                    ))}
                    {!clientSearch && clients.slice(0, 5).map(c => (
                      <button key={c.id} type="button" className="np-dropdown-item" onMouseDown={() => selectClient(c)}>
                        <div className="np-client-avatar">{displayName(c).charAt(0).toUpperCase()}</div>
                        <div>
                          <div className="np-dropdown-name">{displayName(c)}</div>
                          <div className="np-dropdown-sub">{c.statut}</div>
                        </div>
                      </button>
                    ))}
                    {clientSearch && filteredClients.length === 0 && (
                      <div className="np-dropdown-empty">Aucun résultat</div>
                    )}
                  </div>
                )}
              </div>
              <button type="button" className="np-inconnu-btn" onClick={setClientInconnu}>
                <UserX size={15} /> Client inconnu
              </button>
            </div>
          ) : (
            <div className="np-client-confirmed">
              {isInconnu ? (
                <div className="np-client-pill np-client-pill-inconnu">
                  <UserX size={15} />
                  <span>Client inconnu</span>
                </div>
              ) : (
                <div className="np-client-pill">
                  <div className="np-client-avatar-sm">{displayName(selectedClient).charAt(0).toUpperCase()}</div>
                  <span>{displayName(selectedClient)}</span>
                </div>
              )}
              <button type="button" className="np-change-btn" onClick={clearClient}>
                <X size={14} /> Changer
              </button>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════
            2 — PRESTATION
        ══════════════════════════════════════════ */}
        <div className="np-section">
          <div className="np-section-label">
            <span className="np-step">2</span> Prestation
          </div>

          {!dataReady ? (
            <div className="np-loading-row">
              <Loader2 size={16} className="spin" style={{ color: 'var(--text-muted)' }} />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Chargement des offres…</span>
            </div>
          ) : (
            <div className="np-offres-grid">
              {offres.map(offre => {
                const Icon = TYPE_ICONS[offre.type] || Package;
                const color = TYPE_COLORS[offre.type] || '#6b7280';
                const isSelected = selectedOffre?.id === offre.id;
                return (
                  <button
                    key={offre.id}
                    type="button"
                    className={`np-offre-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectOffre(offre)}
                  >
                    {isSelected && <span className="np-offre-check"><Check size={11} /></span>}
                    <div className="np-offre-icon" style={{ background: color + '18' }}>
                      <Icon size={18} style={{ color }} />
                    </div>
                    <div className="np-offre-nom">{offre.nom}</div>
                    <div className="np-offre-prix">{formatMontant(offre.prix)}</div>
                  </button>
                );
              })}

              {/* Carte "Autre" */}
              <button
                type="button"
                className={`np-offre-card np-offre-libre ${isLibre ? 'selected' : ''}`}
                onClick={() => handleSelectOffre(OFFRE_LIBRE)}
              >
                {isLibre && <span className="np-offre-check"><Check size={11} /></span>}
                <div className="np-offre-icon" style={{ background: '#f3f4f6' }}>
                  <Pencil size={18} style={{ color: '#6b7280' }} />
                </div>
                <div className="np-offre-nom">Autre</div>
                <div className="np-offre-prix" style={{ color: 'var(--text-muted)' }}>Libre</div>
              </button>
            </div>
          )}

          {/* Message hint pour saisie libre */}
          {isLibre && (
            <div className="np-libre-hint">
              <Lightbulb size={14} />
              <span>
                Si cette prestation devient récurrente,{' '}
                <Link href="/offres/nouveau" className="np-hint-link">créez une offre</Link>
                {' '}pour la retrouver ici rapidement.
              </span>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════
            3 — DÉTAILS (visible dès qu'une offre est sélectionnée)
        ══════════════════════════════════════════ */}
        {selectedOffre && (
          <div className="np-section np-section-details animate-slide-up">
            <div className="np-section-label">
              <span className="np-step">3</span> Détails du règlement
            </div>

            {/* Intitulé */}
            <div className="np-field">
              <label className="np-label">Intitulé *</label>
              <input
                className="izi-input"
                type="text"
                placeholder={isLibre ? 'Cours particulier, atelier spécial…' : 'Intitulé de la prestation'}
                value={intitule}
                onChange={e => setIntitule(e.target.value)}
                autoFocus={isLibre}
              />
              {!isLibre && selectedOffre && intitule !== selectedOffre.nom && (
                <button
                  type="button"
                  className="np-reset-link"
                  onClick={() => setIntitule(selectedOffre.nom)}
                >
                  ↺ Remettre "{selectedOffre.nom}"
                </button>
              )}
            </div>

            {/* Montant + Date */}
            <div className="np-row">
              <div className="np-field">
                <label className="np-label">Montant *</label>
                <div className="np-montant-wrap">
                  <input
                    className="izi-input np-montant-input"
                    type="number"
                    step="0.01"
                    min="0.01"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={montant}
                    onChange={e => setMontant(e.target.value)}
                  />
                  <span className="np-currency">€</span>
                </div>
                {!isLibre && selectedOffre?.prix && parseFloat(montant) !== selectedOffre.prix && montant && (
                  <button
                    type="button"
                    className="np-reset-link"
                    onClick={() => setMontant(String(selectedOffre.prix))}
                  >
                    ↺ Prix catalogue : {formatMontant(selectedOffre.prix)}
                  </button>
                )}
              </div>
              <div className="np-field">
                <label className="np-label">Date</label>
                <input
                  className="izi-input"
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
              </div>
            </div>

            {/* Mode de règlement */}
            <div className="np-field">
              <label className="np-label">Mode de règlement</label>
              <div className="np-mode-grid">
                {MODES_PAIEMENT.map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    className={`np-mode-btn ${mode === value ? 'active' : ''}`}
                    onClick={() => setMode(value)}
                  >
                    <Icon size={18} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="np-field">
              <label className="np-label">Notes (optionnel)</label>
              <input
                className="izi-input"
                type="text"
                placeholder="N° chèque, référence virement…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* ── Bouton submit ── */}
        <button
          type="submit"
          className="izi-btn izi-btn-primary np-submit"
          disabled={loading || !canSubmit}
        >
          {loading
            ? <><Loader2 size={16} className="spin" /> Enregistrement…</>
            : <><Save size={16} /> Enregistrer le paiement</>
          }
        </button>

      </form>

      <style jsx global>{`
        .np-page  { display: flex; flex-direction: column; gap: 16px; padding-bottom: 48px; }
        .np-cas-banner {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; flex-wrap: wrap;
          background: var(--brand-light, #faf2eb);
          border: 1px solid var(--brand, #b87333);
          border-left: 4px solid var(--brand, #b87333);
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 0.875rem;
          color: var(--brand-700, #8c5826);
        }
        .np-cas-banner-back {
          color: var(--brand-700, #8c5826);
          text-decoration: none;
          font-weight: 600;
          font-size: 0.8125rem;
        }
        .np-cas-banner-back:hover { text-decoration: underline; }
        .np-header { display: flex; align-items: center; gap: 12px; }
        .np-header h1 { font-size: 1.25rem; font-weight: 700; }
        .back-btn {
          width: 40px; height: 40px; border-radius: var(--radius-sm);
          border: 1px solid var(--border); background: var(--bg-card);
          display: flex; align-items: center; justify-content: center;
          color: var(--text-secondary); text-decoration: none; flex-shrink: 0;
        }

        .np-form { display: flex; flex-direction: column; gap: 12px; }

        /* Section */
        .np-section {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 14px 14px 16px;
          display: flex; flex-direction: column; gap: 12px;
        }
        .np-section-details { border-color: var(--brand); box-shadow: 0 0 0 1px var(--brand-light); }
        .np-section-label {
          display: flex; align-items: center; gap: 8px;
          font-size: 0.8125rem; font-weight: 700; color: var(--text-secondary);
          text-transform: uppercase; letter-spacing: 0.04em;
        }
        .np-step {
          width: 20px; height: 20px; border-radius: 50%;
          background: var(--brand); color: white;
          font-size: 0.6875rem; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        /* Client search */
        .np-client-zone { display: flex; flex-direction: column; gap: 8px; }
        .np-client-search-wrap { position: relative; }
        .np-search-icon {
          position: absolute; left: 11px; top: 50%; transform: translateY(-50%);
          color: var(--text-muted); pointer-events: none;
        }
        .np-search-input { padding-left: 34px !important; }

        .np-dropdown {
          position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 60;
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: var(--radius-md); box-shadow: 0 8px 24px rgba(0,0,0,0.12);
          overflow: hidden; max-height: 260px; overflow-y: auto;
        }
        .np-dropdown-item {
          display: flex; align-items: center; gap: 10px;
          width: 100%; padding: 10px 12px; text-align: left;
          background: none; border: none; border-bottom: 1px solid var(--border);
          cursor: pointer; transition: background var(--transition-fast);
        }
        .np-dropdown-item:last-child { border-bottom: none; }
        .np-dropdown-item:hover { background: var(--brand-light); }
        .np-dropdown-name { font-weight: 600; font-size: 0.875rem; }
        .np-dropdown-sub  { font-size: 0.75rem; color: var(--text-muted); }
        .np-dropdown-empty { padding: 14px; text-align: center; font-size: 0.875rem; color: var(--text-muted); }

        .np-client-avatar {
          width: 32px; height: 32px; border-radius: 50%;
          background: var(--brand-light); color: var(--brand-700);
          font-size: 0.875rem; font-weight: 700;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }

        .np-inconnu-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 14px; border-radius: var(--radius-full);
          border: 1.5px dashed var(--border); background: transparent;
          font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary);
          cursor: pointer; align-self: flex-start;
          transition: all var(--transition-fast);
        }
        .np-inconnu-btn:hover { border-color: var(--brand); color: var(--brand-700); background: var(--brand-light); }

        /* Client confirmé */
        .np-client-confirmed { display: flex; align-items: center; gap: 10px; }
        .np-client-pill {
          display: flex; align-items: center; gap: 8px;
          padding: 6px 12px 6px 6px;
          border-radius: var(--radius-full);
          background: var(--brand-light); border: 1px solid var(--brand);
          font-weight: 600; font-size: 0.875rem; color: var(--brand-700);
        }
        .np-client-pill-inconnu {
          background: #f3f4f6; border-color: var(--border); color: var(--text-secondary);
        }
        .np-client-avatar-sm {
          width: 26px; height: 26px; border-radius: 50%;
          background: var(--brand); color: white;
          font-size: 0.75rem; font-weight: 700;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .np-change-btn {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 5px 10px; border-radius: var(--radius-full);
          border: 1px solid var(--border); background: none;
          font-size: 0.75rem; color: var(--text-secondary); cursor: pointer;
          transition: all var(--transition-fast);
        }
        .np-change-btn:hover { background: var(--cream-dark); }

        /* Grille offres */
        .np-offres-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 8px;
        }
        .np-offre-card {
          position: relative;
          display: flex; flex-direction: column; align-items: center; gap: 6px;
          padding: 12px 8px 10px;
          border-radius: var(--radius-md);
          border: 1.5px solid var(--border);
          background: var(--bg-main, #faf8f5);
          cursor: pointer; text-align: center;
          transition: all var(--transition-fast);
        }
        .np-offre-card:hover { border-color: var(--brand); background: var(--brand-light); }
        .np-offre-card.selected {
          border-color: var(--brand); background: var(--brand-light);
          box-shadow: 0 0 0 2px var(--brand);
        }
        .np-offre-check {
          position: absolute; top: 6px; right: 6px;
          width: 18px; height: 18px; border-radius: 50%;
          background: var(--brand); color: white;
          display: flex; align-items: center; justify-content: center;
        }
        .np-offre-icon {
          width: 36px; height: 36px; border-radius: var(--radius-sm);
          display: flex; align-items: center; justify-content: center;
        }
        .np-offre-nom {
          font-size: 0.75rem; font-weight: 600; color: var(--text-primary);
          line-height: 1.3; word-break: break-word;
        }
        .np-offre-prix { font-size: 0.6875rem; font-weight: 700; color: var(--brand-700); }
        .np-offre-libre .np-offre-prix { color: var(--text-muted); }

        /* Hint libre */
        .np-libre-hint {
          display: flex; align-items: flex-start; gap: 8px;
          padding: 10px 12px; border-radius: var(--radius-md);
          background: #fffbeb; border: 1px solid #fcd34d;
          font-size: 0.8125rem; color: #78350f; line-height: 1.4;
        }
        .np-libre-hint svg { flex-shrink: 0; margin-top: 1px; color: #f59e0b; }
        .np-hint-link { color: var(--brand-700); font-weight: 600; text-decoration: underline; }

        /* Champs détails */
        .np-field { display: flex; flex-direction: column; gap: 5px; }
        .np-label { font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary); }
        .np-row   { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .np-montant-wrap { position: relative; }
        .np-montant-input { padding-right: 28px !important; }
        .np-currency {
          position: absolute; right: 11px; top: 50%; transform: translateY(-50%);
          font-weight: 600; color: var(--text-secondary); pointer-events: none; font-size: 0.9rem;
        }
        .np-reset-link {
          background: none; border: none; padding: 0; cursor: pointer;
          font-size: 0.75rem; color: var(--brand-700); text-align: left;
          text-decoration: underline;
        }

        /* Mode paiement */
        .np-mode-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
        .np-mode-btn {
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          padding: 10px 4px; border-radius: var(--radius-md);
          border: 1.5px solid var(--border); background: var(--bg-main, #faf8f5);
          font-size: 0.6875rem; font-weight: 600; color: var(--text-secondary);
          cursor: pointer; transition: all var(--transition-fast);
        }
        .np-mode-btn.active { border-color: var(--brand); background: var(--brand-light); color: var(--brand-700); }

        .np-loading-row { display: flex; align-items: center; gap: 8px; padding: 8px 0; }

        /* Submit */
        .np-submit { width: 100%; }

        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }
      `}</style>
    </div>
  );
}
