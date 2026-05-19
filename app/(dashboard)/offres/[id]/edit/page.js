'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Save, Ticket, CalendarCheck, Zap,
  ToggleLeft, ToggleRight, Loader2, Info,
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { useToast } from '@/components/ui/ToastProvider';

const TYPES = [
  { value: 'carnet',       label: 'Carnet de séances', Icon: Ticket,        desc: 'Ex : 10 cours pour 120 €' },
  { value: 'abonnement',   label: 'Abonnement',        Icon: CalendarCheck, desc: 'Ex : Annuel sept.–juin' },
  { value: 'cours_unique', label: "Cours à l'unité",   Icon: Zap,           desc: 'Ex : Drop-in 15 €' },
];

export default function EditOffre({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [type, setType] = useState('carnet');
  const [nom, setNom] = useState('');
  const [prix, setPrix] = useState('');
  const [seances, setSeances] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [illimite, setIllimite] = useState(true);
  const [seancesParSemaine, setSeancesParSemaine] = useState('1');
  const [inclutVacances, setInclutVacances] = useState(true);
  const [stripePaymentLink, setStripePaymentLink] = useState('');
  const [carnetDureeJours, setCarnetDureeJours] = useState('');

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('offres')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        toast.error('Offre introuvable');
        router.push('/offres');
        return;
      }

      setType(data.type);
      setNom(data.nom);
      setPrix(String(data.prix));
      setSeances(data.seances ? String(data.seances) : '');
      setDateDebut(data.date_debut || '');
      setDateFin(data.date_fin || '');
      setIllimite(data.type === 'abonnement' ? !data.seances : true);
      setSeancesParSemaine(data.seances_par_semaine ? String(data.seances_par_semaine) : '1');
      setInclutVacances(data.inclut_vacances !== false);
      setStripePaymentLink(data.stripe_payment_link || '');
      setCarnetDureeJours(data.type === 'carnet' && data.duree_jours ? String(data.duree_jours) : '');
      setLoading(false);
    }
    load();
  }, [id, router, toast]);

  function joursDiff(d1, d2) {
    if (!d1 || !d2) return null;
    return Math.round((new Date(d2) - new Date(d1)) / (1000 * 60 * 60 * 24));
  }

  const joursValidite = joursDiff(dateDebut, dateFin);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nom.trim() || !prix) return;

    if (type === 'abonnement' && (!dateDebut || !dateFin)) {
      toast.warning('Les dates sont obligatoires pour un abonnement.');
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const payload = {
        nom: nom.trim(),
        type,
        prix: parseFloat(prix),
      };

      if (type === 'carnet') {
        payload.seances = seances ? parseInt(seances) : null;
        payload.duree_jours = carnetDureeJours ? parseInt(carnetDureeJours) : null;
      } else if (type === 'abonnement') {
        payload.date_debut = dateDebut || null;
        payload.date_fin = dateFin || null;
        payload.duree_jours = joursValidite || null;
        payload.seances = (!illimite && seances) ? parseInt(seances) : null;
        payload.seances_par_semaine = seancesParSemaine ? parseInt(seancesParSemaine) : null;
        payload.inclut_vacances = inclutVacances;
      } else if (type === 'cours_unique') {
        payload.seances = 1;
      }

      payload.stripe_payment_link = stripePaymentLink.trim() || null;

      const { error } = await supabase
        .from('offres')
        .update(payload)
        .eq('id', id);

      if (error) throw error;

      toast.success('Offre modifiée !');
      router.push('/offres');
      router.refresh();
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = nom.trim() && prix && (
    type !== 'abonnement' || (dateDebut && dateFin && joursValidite > 0)
  );

  if (loading) {
    return (
      <div className="eo-page">
        <div className="eo-loading"><Loader2 size={24} className="spin" /> Chargement...</div>
      </div>
    );
  }

  return (
    <div className="eo-page">
      <div className="eo-header animate-fade-in">
        <Link href="/offres" className="back-btn"><ArrowLeft size={20} /></Link>
        <h1>Modifier l'offre</h1>
      </div>

      <form onSubmit={handleSubmit} className="eo-form animate-slide-up">

        {/* Type */}
        <div className="eo-field">
          <label className="eo-label">Type d'offre</label>
          <div className="eo-type-grid">
            {TYPES.map(({ value, label, Icon, desc }) => (
              <button
                key={value}
                type="button"
                className={`eo-type-card ${type === value ? 'selected' : ''}`}
                onClick={() => setType(value)}
              >
                <Icon size={20} />
                <div>
                  <div className="eo-type-label">{label}</div>
                  <div className="eo-type-desc">{desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Carnet: séances + durée de validité */}
        {type === 'carnet' && (
          <>
            <div className="eo-field">
              <label className="eo-label">Nombre de séances</label>
              <input
                className="izi-input"
                type="number"
                min="1"
                value={seances}
                onChange={e => setSeances(e.target.value)}
                placeholder="Ex : 10"
              />
            </div>
            <div className="eo-field">
              <label className="eo-label">
                Durée de validité <span className="eo-optional">(jours, vide = pas de limite)</span>
              </label>
              <div className="eo-chips">
                <button type="button" className={`eo-chip ${!carnetDureeJours ? 'active' : ''}`} onClick={() => setCarnetDureeJours('')}>Pas de limite</button>
                <button type="button" className={`eo-chip ${carnetDureeJours === '90' ? 'active' : ''}`} onClick={() => setCarnetDureeJours('90')}>3 mois</button>
                <button type="button" className={`eo-chip ${carnetDureeJours === '180' ? 'active' : ''}`} onClick={() => setCarnetDureeJours('180')}>6 mois</button>
                <button type="button" className={`eo-chip ${carnetDureeJours === '365' ? 'active' : ''}`} onClick={() => setCarnetDureeJours('365')}>1 an</button>
              </div>
              <input
                className="izi-input"
                type="number"
                min="1"
                placeholder="Ou nombre de jours personnalisé"
                value={carnetDureeJours}
                onChange={e => setCarnetDureeJours(e.target.value)}
              />
            </div>
          </>
        )}

        {/* Abonnement */}
        {type === 'abonnement' && (
          <>
            <div className="eo-row">
              <div className="eo-field">
                <label className="eo-label">Début *</label>
                <input className="izi-input" type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} />
              </div>
              <div className="eo-field">
                <label className="eo-label">Fin *</label>
                <input className="izi-input" type="date" value={dateFin} min={dateDebut || undefined} onChange={e => setDateFin(e.target.value)} />
              </div>
            </div>
            {joursValidite > 0 && (
              <div className="eo-info-pill">
                <Info size={13} />
                {Math.round(joursValidite / 7)} semaines · {joursValidite} jours
              </div>
            )}

            <div className="eo-field">
              <label className="eo-label">Séances incluses</label>
              <div className="eo-toggle-row">
                <button type="button" className={`eo-toggle-btn ${illimite ? 'active' : ''}`} onClick={() => setIllimite(true)}>Illimitées</button>
                <button type="button" className={`eo-toggle-btn ${!illimite ? 'active' : ''}`} onClick={() => setIllimite(false)}>Nombre fixe</button>
              </div>
              {!illimite && (
                <input className="izi-input" type="number" min="1" value={seances} onChange={e => setSeances(e.target.value)} placeholder="Ex : 32" />
              )}
            </div>

            <div className="eo-row">
              <div className="eo-field">
                <label className="eo-label">Séances / semaine</label>
                <div className="eo-chips">
                  {['1', '2', '3'].map(n => (
                    <button key={n} type="button" className={`eo-chip ${seancesParSemaine === n ? 'active' : ''}`} onClick={() => setSeancesParSemaine(n)}>
                      {n}x/sem
                    </button>
                  ))}
                </div>
              </div>
              <div className="eo-field">
                <label className="eo-label">Vacances scolaires</label>
                <button type="button" className="eo-vacances-toggle" onClick={() => setInclutVacances(v => !v)}>
                  {inclutVacances
                    ? <><ToggleRight size={22} style={{ color: 'var(--brand)' }} /> Incluses</>
                    : <><ToggleLeft size={22} style={{ color: 'var(--text-muted)' }} /> Exclues</>
                  }
                </button>
              </div>
            </div>
          </>
        )}

        {/* Nom + Prix */}
        <div className="eo-divider" />

        <div className="eo-field">
          <label className="eo-label">Nom de l'offre *</label>
          <input className="izi-input" type="text" value={nom} onChange={e => setNom(e.target.value)} required />
        </div>

        <div className="eo-field">
          <label className="eo-label">Prix *</label>
          <div className="eo-prix-wrap">
            <input
              className="izi-input eo-prix-input"
              type="number" step="0.01" min="0" inputMode="decimal"
              value={prix} onChange={e => setPrix(e.target.value)} required
            />
            <span className="eo-currency">€</span>
          </div>
        </div>

        {/* Stripe link */}
        <div className="eo-field">
          <label className="eo-label">Lien Stripe Payment Link <span className="eo-optional">(optionnel)</span></label>
          <input
            className="izi-input"
            type="url"
            value={stripePaymentLink}
            onChange={e => setStripePaymentLink(e.target.value)}
            placeholder="https://buy.stripe.com/..."
          />
        </div>

        <button type="submit" className="izi-btn izi-btn-primary eo-submit" disabled={saving || !canSubmit}>
          {saving
            ? <><Loader2 size={16} className="spin" /> Enregistrement...</>
            : <><Save size={18} /> Enregistrer les modifications</>
          }
        </button>
      </form>

      <style jsx global>{`
        .eo-page { display: flex; flex-direction: column; gap: 20px; padding-bottom: 48px; }
        .eo-loading { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 60px; color: var(--text-muted); }
        .eo-header { display: flex; align-items: center; gap: 12px; }
        .eo-header h1 { font-size: 1.25rem; font-weight: 700; }
        .back-btn {
          width: 40px; height: 40px; border-radius: var(--radius-sm);
          border: 1px solid var(--border); background: var(--bg-card);
          display: flex; align-items: center; justify-content: center;
          color: var(--text-secondary); text-decoration: none; flex-shrink: 0;
        }
        .eo-form { display: flex; flex-direction: column; gap: 18px; }
        .eo-field { display: flex; flex-direction: column; gap: 7px; }
        .eo-label { font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary); }
        .eo-optional { font-weight: 400; color: var(--text-muted); font-size: 0.75rem; }
        .eo-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .eo-divider { border: none; border-top: 1px solid var(--border); margin: 2px 0; }

        .eo-type-grid { display: flex; flex-direction: column; gap: 6px; }
        .eo-type-card {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 14px; border-radius: var(--radius-md);
          border: 2px solid var(--border); background: var(--bg-card);
          cursor: pointer; text-align: left; transition: all var(--transition-fast);
          color: var(--text-secondary);
        }
        .eo-type-card.selected { border-color: var(--brand); background: var(--brand-light); color: var(--brand-700); }
        .eo-type-label { font-weight: 600; font-size: 0.9rem; }
        .eo-type-desc { font-size: 0.75rem; color: var(--text-muted); margin-top: 1px; }

        .eo-info-pill {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 5px 12px; border-radius: var(--radius-full);
          background: var(--brand-light); color: var(--brand-700);
          font-size: 0.8125rem; font-weight: 600; align-self: flex-start;
        }
        .eo-toggle-row { display: flex; gap: 8px; }
        .eo-toggle-btn {
          flex: 1; padding: 8px 12px; border-radius: var(--radius-full);
          border: 1.5px solid var(--border); background: var(--bg-card);
          font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary);
          cursor: pointer; transition: all var(--transition-fast);
        }
        .eo-toggle-btn.active { border-color: var(--brand); background: var(--brand-light); color: var(--brand-700); }

        .eo-chips { display: flex; gap: 6px; flex-wrap: wrap; }
        .eo-chip {
          padding: 6px 12px; border-radius: var(--radius-full);
          border: 1.5px solid var(--border); background: var(--bg-card);
          font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary);
          cursor: pointer; transition: all var(--transition-fast);
        }
        .eo-chip.active { border-color: var(--brand); background: var(--brand-light); color: var(--brand-700); }

        .eo-vacances-toggle {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 8px 12px; border-radius: var(--radius-md);
          border: 1.5px solid var(--border); background: var(--bg-card);
          font-size: 0.875rem; font-weight: 600; color: var(--text-secondary);
          cursor: pointer; align-self: flex-start;
        }

        .eo-prix-wrap { position: relative; }
        .eo-prix-input { padding-right: 28px !important; }
        .eo-currency {
          position: absolute; right: 11px; top: 50%; transform: translateY(-50%);
          font-weight: 600; color: var(--text-secondary); pointer-events: none;
        }

        .eo-submit { width: 100%; margin-top: 4px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }
      `}</style>
    </div>
  );
}
