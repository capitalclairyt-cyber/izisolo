'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Save, Ticket, CalendarCheck, Zap,
  Percent, Info, Calculator, ToggleLeft, ToggleRight,
  Loader2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { useToast } from '@/components/ui/ToastProvider';
import { formatMontant } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────
const TYPES = [
  { value: 'carnet',      label: 'Carnet de séances', Icon: Ticket,      desc: 'Ex : 10 cours pour 120€' },
  { value: 'abonnement',  label: 'Abonnement',         Icon: CalendarCheck, desc: 'Ex : Annuel sept.–juin' },
  { value: 'cours_unique',label: 'Cours à l\'unité',   Icon: Zap,          desc: 'Ex : Drop-in 15€' },
];

// Presets séances carnet
const PRESETS_SEANCES = [5, 10, 15];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function joursDiff(d1, d2) {
  // d1, d2 : strings YYYY-MM-DD
  if (!d1 || !d2) return null;
  const diff = new Date(d2) - new Date(d1);
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function semainesDiff(d1, d2) {
  const j = joursDiff(d1, d2);
  if (j === null) return null;
  return Math.max(0, Math.round(j / 7));
}

function calcProRata(dateDebut, dateFin, prixTotal, dateRef) {
  // dateRef = aujourd'hui ou la date de souscription
  if (!dateDebut || !dateFin || !prixTotal || !dateRef) return null;
  const totalSemaines = semainesDiff(dateDebut, dateFin);
  if (!totalSemaines) return null;
  const resteSemaines = semainesDiff(dateRef, dateFin);
  if (resteSemaines <= 0) return null;
  const prixSemaine = parseFloat(prixTotal) / totalSemaines;
  // Arrondi au 0.50€ le plus proche
  return Math.round(prixSemaine * resteSemaines * 2) / 2;
}

function formatDate(s) {
  if (!s) return '';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

// ─── Composant ───────────────────────────────────────────────────────────────
export default function NouvelleOffre() {
  const router      = useRouter();
  const { toast }   = useToast();
  const [loading, setLoading]     = useState(false);
  const [offresUnitaires, setOffresUnitaires] = useState([]); // pour ref prix carnet

  // État principal
  const [type, setType]           = useState('carnet');
  const [nom, setNom]             = useState('');
  const [nomModifie, setNomModifie] = useState(false); // true si user a changé le nom manuellement
  const [prix, setPrix]           = useState('');

  // Carnet
  const [seances, setSeances]           = useState('');
  const [seancesCustom, setSeancesCustom] = useState(false); // true si "Autre"
  const [prixUnitaireRef, setPrixUnitaireRef] = useState('');

  // Abonnement
  const [dateDebut, setDateDebut]     = useState('');
  const [dateFin, setDateFin]         = useState('');
  const [seancesAbo, setSeancesAbo]   = useState(''); // '' = illimité
  const [illimite, setIllimite]       = useState(true);
  const [seancesParSemaine, setSeancesParSemaine] = useState('1');
  const [inclutVacances, setInclutVacances]       = useState(true);
  const [proRataActif, setProRataActif]           = useState(false);
  const [proRataDateLimite, setProRataDateLimite] = useState('');

  // Charger les offres cours_unique pour la référence prix
  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('offres')
        .select('id, nom, prix')
        .eq('type', 'cours_unique')
        .eq('actif', true)
        .order('prix');
      setOffresUnitaires(data || []);
    };
    load();
  }, []);

  // Auto-génération du nom
  useEffect(() => {
    if (nomModifie) return;
    if (type === 'carnet' && seances) {
      setNom(`Carnet ${seances} séances`);
    } else if (type === 'cours_unique') {
      setNom('Cours à l\'unité');
    }
    // Pour abonnement : ne pas auto-remplir (trop variable)
  }, [type, seances, nomModifie]);

  // Quand on change de type, reset certains champs
  const handleTypeChange = (t) => {
    setType(t);
    setNom('');
    setNomModifie(false);
    setPrix('');
    setSeances('');
    setSeancesCustom(false);
    setPrixUnitaireRef('');
  };

  // Séances preset (carnet)
  const selectPreset = (n) => {
    setSeances(String(n));
    setSeancesCustom(false);
    if (!nomModifie) setNom(`Carnet ${n} séances`);
  };

  const handleNomChange = (v) => {
    setNom(v);
    setNomModifie(v !== '' && !(type === 'carnet' && v === `Carnet ${seances} séances`));
  };

  // Calculs dérivés
  const totalSemaines  = semainesDiff(dateDebut, dateFin);
  const joursValidite  = joursDiff(dateDebut, dateFin);
  const today          = new Date().toISOString().split('T')[0];

  // Remise carnet
  const remisePct = (() => {
    if (type !== 'carnet' || !seances || !prix || !prixUnitaireRef) return null;
    const valeurTotale = parseFloat(prixUnitaireRef) * parseInt(seances);
    if (!valeurTotale) return null;
    const remise = ((valeurTotale - parseFloat(prix)) / valeurTotale) * 100;
    return remise > 0 ? remise : null;
  })();

  const prixProRata = proRataActif
    ? calcProRata(dateDebut, dateFin, prix, today)
    : null;

  const prixProRataLimite = proRataActif && proRataDateLimite
    ? calcProRata(dateDebut, dateFin, prix, proRataDateLimite)
    : null;

  // Soumission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nom.trim() || !prix) return;

    if (type === 'abonnement') {
      if (!dateDebut || !dateFin) {
        toast.warning('Les dates de début et de fin sont obligatoires pour un abonnement.');
        return;
      }
      if (joursValidite <= 0) {
        toast.warning('La date de fin doit être après la date de début.');
        return;
      }
      if (proRataActif && !proRataDateLimite) {
        toast.warning('Indique la date limite de souscription au pro-rata.');
        return;
      }
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const payload = {
        profile_id: user.id,
        nom:    nom.trim(),
        type,
        prix:   parseFloat(prix),
        actif:  true,
      };

      if (type === 'carnet') {
        payload.seances          = seances ? parseInt(seances) : null;
        payload.prix_unitaire_ref = prixUnitaireRef ? parseFloat(prixUnitaireRef) : null;
      }

      if (type === 'abonnement') {
        payload.date_debut          = dateDebut || null;
        payload.date_fin            = dateFin   || null;
        payload.duree_jours         = joursValidite || null;
        payload.seances             = (!illimite && seancesAbo) ? parseInt(seancesAbo) : null;
        payload.seances_par_semaine = seancesParSemaine ? parseInt(seancesParSemaine) : null;
        payload.inclut_vacances     = inclutVacances;
        payload.pro_rata_actif      = proRataActif;
        payload.pro_rata_date_limite = (proRataActif && proRataDateLimite) ? proRataDateLimite : null;
      }

      if (type === 'cours_unique') {
        payload.seances = 1;
      }

      const { error } = await supabase.from('offres').insert(payload);
      if (error) throw error;

      toast.success('Offre créée !');
      router.push('/offres');
      router.refresh();
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = nom.trim() && prix && (
    type !== 'abonnement' || (dateDebut && dateFin && joursValidite > 0)
  );

  return (
    <div className="no-page">
      <div className="no-header animate-fade-in">
        <Link href="/offres" className="back-btn"><ArrowLeft size={20} /></Link>
        <h1>Nouvelle offre</h1>
      </div>

      <form onSubmit={handleSubmit} className="no-form animate-slide-up">

        {/* ── Type ── */}
        <div className="no-field">
          <label className="no-label">Type d'offre</label>
          <div className="no-type-grid">
            {TYPES.map(({ value, label, Icon, desc }) => (
              <button
                key={value}
                type="button"
                className={`no-type-card ${type === value ? 'selected' : ''}`}
                onClick={() => handleTypeChange(value)}
              >
                <Icon size={20} />
                <div>
                  <div className="no-type-label">{label}</div>
                  <div className="no-type-desc">{desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ══════════════════ CARNET ══════════════════ */}
        {type === 'carnet' && (
          <>
            <div className="no-field">
              <label className="no-label">Nombre de séances</label>
              <div className="no-presets">
                {PRESETS_SEANCES.map(n => (
                  <button
                    key={n}
                    type="button"
                    className={`no-preset-btn ${seances === String(n) && !seancesCustom ? 'active' : ''}`}
                    onClick={() => selectPreset(n)}
                  >
                    {n} séances
                  </button>
                ))}
                <button
                  type="button"
                  className={`no-preset-btn ${seancesCustom ? 'active' : ''}`}
                  onClick={() => { setSeancesCustom(true); setSeances(''); }}
                >
                  Autre…
                </button>
              </div>
              {seancesCustom && (
                <input
                  className="izi-input no-custom-input"
                  type="number"
                  min="1"
                  placeholder="Nombre de séances"
                  value={seances}
                  onChange={e => {
                    setSeances(e.target.value);
                    if (!nomModifie && e.target.value) setNom(`Carnet ${e.target.value} séances`);
                  }}
                  autoFocus
                />
              )}
            </div>

            {/* Référence prix unitaire */}
            <div className="no-field">
              <label className="no-label">
                Prix du cours à l'unité
                <span className="no-label-hint"> — pour calculer la remise (optionnel)</span>
              </label>
              {offresUnitaires.length > 0 ? (
                <div className="no-ref-row">
                  <select
                    className="izi-input no-ref-select"
                    value={prixUnitaireRef}
                    onChange={e => setPrixUnitaireRef(e.target.value)}
                  >
                    <option value="">Choisir une offre existante…</option>
                    {offresUnitaires.map(o => (
                      <option key={o.id} value={o.prix}>{o.nom} — {formatMontant(o.prix)}</option>
                    ))}
                  </select>
                  <span className="no-ref-or">ou</span>
                  <input
                    className="izi-input no-ref-input"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Prix/séance €"
                    value={prixUnitaireRef}
                    onChange={e => setPrixUnitaireRef(e.target.value)}
                  />
                </div>
              ) : (
                <input
                  className="izi-input"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ex : 15.00 €"
                  value={prixUnitaireRef}
                  onChange={e => setPrixUnitaireRef(e.target.value)}
                />
              )}
            </div>
          </>
        )}

        {/* ══════════════════ ABONNEMENT ══════════════════ */}
        {type === 'abonnement' && (
          <>
            {/* Dates */}
            <div className="no-row">
              <div className="no-field">
                <label className="no-label">Début *</label>
                <input
                  className="izi-input"
                  type="date"
                  value={dateDebut}
                  onChange={e => setDateDebut(e.target.value)}
                />
              </div>
              <div className="no-field">
                <label className="no-label">Fin *</label>
                <input
                  className="izi-input"
                  type="date"
                  value={dateFin}
                  min={dateDebut || undefined}
                  onChange={e => setDateFin(e.target.value)}
                />
              </div>
            </div>
            {totalSemaines !== null && totalSemaines > 0 && (
              <div className="no-info-pill">
                <Info size={13} />
                {totalSemaines} semaines · {joursValidite} jours
              </div>
            )}

            {/* Séances */}
            <div className="no-field">
              <label className="no-label">Séances incluses</label>
              <div className="no-illimite-row">
                <button
                  type="button"
                  className={`no-toggle-btn ${illimite ? 'active' : ''}`}
                  onClick={() => setIllimite(true)}
                >
                  Illimitées
                </button>
                <button
                  type="button"
                  className={`no-toggle-btn ${!illimite ? 'active' : ''}`}
                  onClick={() => setIllimite(false)}
                >
                  Nombre fixe
                </button>
              </div>
              {!illimite && (
                <input
                  className="izi-input"
                  type="number"
                  min="1"
                  placeholder="Ex : 32 séances"
                  value={seancesAbo}
                  onChange={e => setSeancesAbo(e.target.value)}
                />
              )}
            </div>

            {/* Cadence + vacances */}
            <div className="no-row">
              <div className="no-field">
                <label className="no-label">Séances / semaine</label>
                <div className="no-semaine-chips">
                  {['1','2','3'].map(n => (
                    <button
                      key={n}
                      type="button"
                      className={`no-chip ${seancesParSemaine === n ? 'active' : ''}`}
                      onClick={() => setSeancesParSemaine(n)}
                    >
                      {n}×/sem
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`no-chip ${!['1','2','3'].includes(seancesParSemaine) ? 'active' : ''}`}
                    onClick={() => setSeancesParSemaine('')}
                  >
                    Autre
                  </button>
                </div>
                {!['1','2','3'].includes(seancesParSemaine) && (
                  <input
                    className="izi-input no-custom-input"
                    type="number" min="1"
                    placeholder="Nb séances/semaine"
                    value={seancesParSemaine}
                    onChange={e => setSeancesParSemaine(e.target.value)}
                  />
                )}
              </div>
              <div className="no-field">
                <label className="no-label">Vacances scolaires</label>
                <button
                  type="button"
                  className="no-vacances-toggle"
                  onClick={() => setInclutVacances(v => !v)}
                >
                  {inclutVacances
                    ? <><ToggleRight size={22} style={{ color: 'var(--brand)' }} /> Incluses</>
                    : <><ToggleLeft  size={22} style={{ color: 'var(--text-muted)' }} /> Exclues</>
                  }
                </button>
              </div>
            </div>

            {/* Pro-rata */}
            <div className="no-field">
              <div className="no-prorata-header">
                <div>
                  <div className="no-label">Pro-rata à la souscription</div>
                  <div className="no-label-hint" style={{ fontSize: '0.75rem', marginTop: 2 }}>
                    Permet aux élèves de rejoindre en cours d'année à prix réduit
                  </div>
                </div>
                <button
                  type="button"
                  className="no-toggle-switch"
                  onClick={() => setProRataActif(v => !v)}
                  aria-label="Activer le pro-rata"
                >
                  {proRataActif
                    ? <ToggleRight size={28} style={{ color: 'var(--brand)' }} />
                    : <ToggleLeft  size={28} style={{ color: 'var(--border)' }} />
                  }
                </button>
              </div>

              {proRataActif && (
                <div className="no-prorata-zone animate-slide-up">
                  <div className="no-field">
                    <label className="no-label">Date limite de souscription au pro-rata</label>
                    <input
                      className="izi-input"
                      type="date"
                      min={dateDebut || undefined}
                      max={dateFin   || undefined}
                      value={proRataDateLimite}
                      onChange={e => setProRataDateLimite(e.target.value)}
                      placeholder="Ex : 31/10/2025"
                    />
                    <span className="form-hint">
                      Au-delà de cette date, la souscription au pro-rata n'est plus possible.
                    </span>
                  </div>

                  {/* Aperçu calcul pro-rata */}
                  {prix && dateDebut && dateFin && totalSemaines > 0 && (
                    <div className="no-prorata-preview">
                      <div className="no-prorata-preview-title">
                        <Calculator size={14} /> Aperçu du calcul
                      </div>
                      <div className="no-prorata-line">
                        <span>Prix / semaine</span>
                        <strong>{formatMontant(parseFloat(prix) / totalSemaines)}</strong>
                      </div>
                      {prixProRata !== null && (
                        <div className="no-prorata-line highlight">
                          <span>Pro-rata aujourd'hui ({formatDate(today)})</span>
                          <strong>{formatMontant(prixProRata)}</strong>
                        </div>
                      )}
                      {prixProRataLimite !== null && proRataDateLimite && (
                        <div className="no-prorata-line">
                          <span>Pro-rata à la date limite ({formatDate(proRataDateLimite)})</span>
                          <strong>{formatMontant(prixProRataLimite)}</strong>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* ══════════════════ NOM + PRIX (communs) ══════════════════ */}
        <div className="no-divider" />

        <div className="no-field">
          <label className="no-label">
            Nom de l'offre *
            {type === 'carnet' && seances && !nomModifie && (
              <span className="no-label-hint"> — généré automatiquement</span>
            )}
          </label>
          <input
            className="izi-input"
            type="text"
            value={nom}
            onChange={e => handleNomChange(e.target.value)}
            placeholder={
              type === 'carnet'     ? 'Ex : Carnet 10 séances' :
              type === 'abonnement' ? 'Ex : Abonnement annuel 2025-2026' :
                                     'Ex : Cours drop-in'
            }
            required
          />
          {type === 'carnet' && seances && nomModifie && (
            <button
              type="button"
              className="no-reset-link"
              onClick={() => { setNom(`Carnet ${seances} séances`); setNomModifie(false); }}
            >
              ↺ Remettre "Carnet {seances} séances"
            </button>
          )}
        </div>

        <div className="no-field">
          <label className="no-label">Prix *</label>
          <div className="no-prix-wrap">
            <input
              className="izi-input no-prix-input"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              value={prix}
              onChange={e => setPrix(e.target.value)}
              placeholder="0.00"
              required
            />
            <span className="no-currency">€</span>
          </div>

          {/* Remise carnet */}
          {remisePct !== null && (
            <div className="no-remise-badge">
              <Percent size={13} />
              {Math.round(remisePct)}% de remise par rapport au cours à l'unité
              <span className="no-remise-detail">
                ({parseInt(seances)} × {formatMontant(parseFloat(prixUnitaireRef))} = {formatMontant(parseFloat(prixUnitaireRef) * parseInt(seances))})
              </span>
            </div>
          )}
          {type === 'carnet' && seances && prixUnitaireRef && prix && parseFloat(prix) >= parseFloat(prixUnitaireRef) * parseInt(seances) && (
            <div className="no-remise-warn">
              ⚠️ Le prix du carnet est supérieur ou égal au prix unitaire — aucune remise.
            </div>
          )}
        </div>

        <button
          type="submit"
          className="izi-btn izi-btn-primary no-submit"
          disabled={loading || !canSubmit}
        >
          {loading
            ? <><Loader2 size={16} className="spin" /> Création…</>
            : <><Save size={18} /> Créer l'offre</>
          }
        </button>

      </form>

      <style jsx global>{`
        .no-page  { display: flex; flex-direction: column; gap: 20px; padding-bottom: 48px; }
        .no-header { display: flex; align-items: center; gap: 12px; }
        .no-header h1 { font-size: 1.25rem; font-weight: 700; }
        .back-btn {
          width: 40px; height: 40px; border-radius: var(--radius-sm);
          border: 1px solid var(--border); background: var(--bg-card);
          display: flex; align-items: center; justify-content: center;
          color: var(--text-secondary); text-decoration: none; flex-shrink: 0;
        }

        .no-form  { display: flex; flex-direction: column; gap: 18px; }
        .no-row   { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .no-field { display: flex; flex-direction: column; gap: 7px; }
        .no-label { font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary); }
        .no-label-hint { font-weight: 400; color: var(--text-muted); font-size: 0.75rem; }
        .no-divider { border: none; border-top: 1px solid var(--border); margin: 2px 0; }

        /* Type grid */
        .no-type-grid { display: flex; flex-direction: column; gap: 6px; }
        .no-type-card {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 14px; border-radius: var(--radius-md);
          border: 2px solid var(--border); background: var(--bg-card);
          cursor: pointer; text-align: left; transition: all var(--transition-fast);
          color: var(--text-secondary);
        }
        .no-type-card.selected { border-color: var(--brand); background: var(--brand-light); color: var(--brand-700); }
        .no-type-label { font-weight: 600; font-size: 0.9rem; }
        .no-type-desc  { font-size: 0.75rem; color: var(--text-muted); margin-top: 1px; }

        /* Presets séances */
        .no-presets { display: flex; flex-wrap: wrap; gap: 7px; }
        .no-preset-btn {
          padding: 8px 16px; border-radius: var(--radius-full);
          border: 1.5px solid var(--border); background: var(--bg-card);
          font-size: 0.875rem; font-weight: 600; color: var(--text-secondary);
          cursor: pointer; transition: all var(--transition-fast);
        }
        .no-preset-btn.active { border-color: var(--brand); background: var(--brand-light); color: var(--brand-700); }
        .no-custom-input { margin-top: 2px; }

        /* Réf prix */
        .no-ref-row { display: flex; align-items: center; gap: 8px; }
        .no-ref-select { flex: 2; min-width: 0; }
        .no-ref-or { font-size: 0.75rem; color: var(--text-muted); flex-shrink: 0; }
        .no-ref-input { flex: 1; min-width: 0; }

        /* Remise badge */
        .no-remise-badge {
          display: flex; align-items: center; flex-wrap: wrap; gap: 5px;
          padding: 8px 12px; border-radius: var(--radius-md);
          background: #ecfdf5; border: 1px solid #6ee7b7; color: #065f46;
          font-size: 0.8125rem; font-weight: 600;
        }
        .no-remise-detail { font-weight: 400; color: #059669; font-size: 0.75rem; }
        .no-remise-warn { font-size: 0.75rem; color: #92400e; }

        /* Toggle actif/inactif */
        .no-toggle-btn {
          flex: 1; padding: 8px 12px; border-radius: var(--radius-full);
          border: 1.5px solid var(--border); background: var(--bg-card);
          font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary);
          cursor: pointer; transition: all var(--transition-fast);
        }
        .no-toggle-btn.active { border-color: var(--brand); background: var(--brand-light); color: var(--brand-700); }
        .no-illimite-row { display: flex; gap: 8px; }

        /* Chips semaines */
        .no-semaine-chips { display: flex; gap: 6px; flex-wrap: wrap; }
        .no-chip {
          padding: 6px 12px; border-radius: var(--radius-full);
          border: 1.5px solid var(--border); background: var(--bg-card);
          font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary);
          cursor: pointer; transition: all var(--transition-fast);
        }
        .no-chip.active { border-color: var(--brand); background: var(--brand-light); color: var(--brand-700); }

        /* Vacances toggle */
        .no-vacances-toggle {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 8px 12px; border-radius: var(--radius-md);
          border: 1.5px solid var(--border); background: var(--bg-card);
          font-size: 0.875rem; font-weight: 600; color: var(--text-secondary);
          cursor: pointer; transition: all var(--transition-fast);
          align-self: flex-start;
        }

        /* Info pill */
        .no-info-pill {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 5px 12px; border-radius: var(--radius-full);
          background: var(--brand-light); color: var(--brand-700);
          font-size: 0.8125rem; font-weight: 600; align-self: flex-start;
        }

        /* Pro-rata */
        .no-prorata-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
        .no-toggle-switch { background: none; border: none; cursor: pointer; padding: 0; display: flex; align-items: center; flex-shrink: 0; }
        .no-prorata-zone { display: flex; flex-direction: column; gap: 12px; padding: 12px; background: var(--cream, #faf8f5); border-radius: var(--radius-md); border: 1px solid var(--border); }
        .no-prorata-preview {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: var(--radius-md); padding: 12px;
          display: flex; flex-direction: column; gap: 8px;
        }
        .no-prorata-preview-title {
          display: flex; align-items: center; gap: 6px;
          font-size: 0.8125rem; font-weight: 700; color: var(--text-secondary);
          margin-bottom: 2px;
        }
        .no-prorata-line {
          display: flex; justify-content: space-between; align-items: center;
          font-size: 0.8125rem; color: var(--text-secondary);
        }
        .no-prorata-line.highlight { color: var(--brand-700); font-weight: 600; }
        .no-prorata-line strong { font-weight: 700; }

        /* Prix */
        .no-prix-wrap { position: relative; }
        .no-prix-input { padding-right: 28px !important; }
        .no-currency {
          position: absolute; right: 11px; top: 50%; transform: translateY(-50%);
          font-weight: 600; color: var(--text-secondary); pointer-events: none;
        }
        .no-reset-link {
          background: none; border: none; padding: 0; cursor: pointer;
          font-size: 0.75rem; color: var(--brand-700); text-align: left; text-decoration: underline;
        }

        .no-submit { width: 100%; margin-top: 4px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }
        .form-hint { font-size: 0.75rem; color: var(--text-muted); }
      `}</style>
    </div>
  );
}
