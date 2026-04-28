'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { parseDate, toDateStr } from '@/lib/dates';
import { getAllTypesFromCategories, normalizeTypesCours } from '@/lib/utils';
import Link from 'next/link';
import {
  ArrowLeft, Save, Calendar, Clock, MapPin, Users, Repeat,
  Building2, Plus, ChevronDown, X, AlertTriangle, ExternalLink
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { useToast } from '@/components/ui/ToastProvider';

const FREQUENCES = [
  { value: 'unique', label: 'Cours unique', desc: 'Une seule date' },
  { value: 'hebdomadaire', label: 'Chaque semaine', desc: 'Même jour, même heure' },
  { value: 'bimensuel', label: 'Toutes les 2 semaines', desc: 'Un cours sur deux' },
  { value: 'quotidien', label: 'Tous les jours', desc: 'Du lundi au dimanche' },
  { value: 'mensuel', label: 'Une fois par mois', desc: 'Même date chaque mois' },
  { value: 'personnalise', label: 'Personnalisé', desc: 'Choisis les jours' },
];

const JOURS_SEMAINE = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mer' },
  { value: 4, label: 'Jeu' },
  { value: 5, label: 'Ven' },
  { value: 6, label: 'Sam' },
  { value: 7, label: 'Dim' },
];

// Preview des 8 premières dates générées par la récurrence — donne au prof
// une vraie idée de ce qui sera créé avant de cliquer "Créer la série".
function RecurrencePreview({ form }) {
  const dates = useMemo(() => {
    const out = [];
    const start = parseDate(form.date);
    if (!start || isNaN(start.getTime())) return out;
    const end = form.date_fin
      ? parseDate(form.date_fin)
      : new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7 * 12);
    if (!end || end < start) return out;

    const cursor = new Date(start);
    let safety = 0;
    while (cursor <= end && out.length < 8 && safety < 500) {
      safety++;
      const day = cursor.getDay() === 0 ? 7 : cursor.getDay();
      let include = false;
      if (form.frequence === 'quotidien') include = true;
      else if (form.frequence === 'hebdomadaire') include = day === ((start.getDay() === 0 ? 7 : start.getDay()));
      else if (form.frequence === 'bimensuel') {
        const sameDay = day === ((start.getDay() === 0 ? 7 : start.getDay()));
        const weeks = Math.floor((cursor - start) / (7 * 86400000));
        include = sameDay && weeks % 2 === 0;
      }
      else if (form.frequence === 'mensuel') include = cursor.getDate() === start.getDate();
      else if (form.frequence === 'personnalise') include = (form.jours_semaine || []).includes(day);

      if (include) out.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return out;
  }, [form.date, form.date_fin, form.frequence, form.jours_semaine]);

  if (dates.length === 0) {
    return (
      <div className="rec-preview rec-preview-empty">
        ⚠ Avec ces réglages, aucune date ne sera générée.
        {form.frequence === 'personnalise' && (form.jours_semaine || []).length === 0 &&
          <> Choisis au moins un jour de la semaine.</>}
      </div>
    );
  }

  const total = form.date_fin
    ? `jusqu'au ${parseDate(form.date_fin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
    : 'sur 12 semaines';

  return (
    <div className="rec-preview">
      <div className="rec-preview-head">
        <strong>Aperçu</strong>
        <span className="rec-preview-meta">{dates.length === 8 ? '8 premières dates' : `${dates.length} date${dates.length > 1 ? 's' : ''}`} {total}</span>
      </div>
      <div className="rec-preview-list">
        {dates.map((d, i) => (
          <span key={i} className="rec-preview-chip">
            {d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
        ))}
        {dates.length === 8 && <span className="rec-preview-more">…</span>}
      </div>
    </div>
  );
}

function NouveauCoursInner() {
  const router       = useRouter();
  const { toast }    = useToast();
  const searchParams = useSearchParams();
  // Date pré-remplie depuis l'agenda (split diagonal) ou aujourd'hui
  const dateInitiale = searchParams.get('date') || toDateStr(new Date());
  const [loading, setLoading] = useState(false);
  const [typesCours, setTypesCours] = useState([]);
  const [rawTypesCours, setRawTypesCours] = useState([]);
  const [showNewType, setShowNewType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [savingType, setSavingType] = useState(false);
  const [lieux, setLieux] = useState([]);
  const [clientsPro, setClientsPro] = useState([]);
  const [showNewLieu, setShowNewLieu] = useState(false);
  const [newLieuNom, setNewLieuNom] = useState('');

  const [form, setForm] = useState({
    nom: '',
    type_cours: '',
    date: dateInitiale,
    heure: '18:00', // 18h = créneau le plus courant pour cours après-travail
    duree_minutes: '60',
    lieu_id: '',
    capacite_max: '',
    client_pro_id: '',
    notes: '',
    // Récurrence
    frequence: 'unique',
    jours_semaine: [],
    date_fin: '',
    intervalle: 1,
  });

  // Charger les données
  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const [{ data: prof }, { data: lieuxData }, { data: prosData }] = await Promise.all([
        supabase.from('profiles').select('types_cours, metier').eq('id', user.id).single(),
        supabase.from('lieux').select('*, clients:client_pro_id(id, nom_structure)').eq('profile_id', user.id).eq('actif', true).order('ordre'),
        supabase.from('clients').select('id, nom, prenom, nom_structure, type_client')
          .eq('profile_id', user.id)
          .in('type_client', ['association', 'studio', 'entreprise', 'autre_pro']),
      ]);

      if (prof?.types_cours) {
        const normalized = normalizeTypesCours(prof.types_cours);
        setRawTypesCours(normalized);
        setTypesCours(normalized.flatMap(cat => cat.items || []));
      }
      setLieux(lieuxData || []);
      setClientsPro(prosData || []);

      // Duplication : si ?from=COURS_ID, on pré-remplit le formulaire avec les détails du cours source
      const fromId = searchParams.get('from');
      if (fromId) {
        const { data: source } = await supabase
          .from('cours')
          .select('nom, type_cours, heure, duree_minutes, lieu_id, capacite_max, client_pro_id, notes')
          .eq('id', fromId)
          .eq('profile_id', user.id)
          .maybeSingle();
        if (source) {
          setForm(prev => ({
            ...prev,
            nom: source.nom || '',
            type_cours: source.type_cours || '',
            heure: source.heure || '09:00',
            duree_minutes: String(source.duree_minutes || '60'),
            lieu_id: source.lieu_id || '',
            capacite_max: source.capacite_max ? String(source.capacite_max) : '',
            client_pro_id: source.client_pro_id || '',
            notes: source.notes || '',
            // date reste à dateInitiale (aujourd'hui ou ?date=...) — le prof choisit la nouvelle date
          }));
          toast.info('Cours dupliqué — choisis une nouvelle date.');
        }
      }
    };
    load();
  }, []);

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  // Quand on sélectionne un type de cours, pré-remplir le nom
  const selectType = (type) => {
    setForm(prev => ({
      ...prev,
      type_cours: prev.type_cours === type ? '' : type,
      nom: prev.nom || type,
    }));
  };

  // Enregistrer un nouveau type de cours (en préservant la hiérarchie)
  const saveNewType = async () => {
    const t = newTypeName.trim();
    if (!t || typesCours.includes(t)) return;
    setSavingType(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      // Ajouter au groupe sans catégorie, en préservant les autres catégories
      let updatedRaw;
      const nullCat = rawTypesCours.find(cat => cat.categorie === null);
      if (nullCat) {
        updatedRaw = rawTypesCours.map(cat =>
          cat.categorie === null ? { ...cat, items: [...(cat.items || []), t] } : cat
        );
      } else {
        updatedRaw = [...rawTypesCours, { categorie: null, items: [t] }];
      }
      await supabase.from('profiles').update({ types_cours: updatedRaw }).eq('id', user.id);
      setRawTypesCours(updatedRaw);
      setTypesCours(prev => [...prev, t]);
      setForm(prev => ({ ...prev, type_cours: t, nom: prev.nom || t }));
      setNewTypeName('');
      setShowNewType(false);
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    } finally {
      setSavingType(false);
    }
  };

  // Toggle jour de la semaine (pour récurrence personnalisée)
  const toggleJour = (jour) => {
    setForm(prev => ({
      ...prev,
      jours_semaine: prev.jours_semaine.includes(jour)
        ? prev.jours_semaine.filter(j => j !== jour)
        : [...prev.jours_semaine, jour].sort(),
    }));
  };

  // Quand on sélectionne un client pro, filtrer les lieux associés
  const selectedPro = clientsPro.find(c => c.id === form.client_pro_id);
  const lieuxFiltres = useMemo(() => {
    if (form.client_pro_id) {
      // Lieux du client pro + lieux perso
      return lieux.filter(l => l.client_pro_id === form.client_pro_id || !l.client_pro_id);
    }
    return lieux.filter(l => !l.client_pro_id);
  }, [lieux, form.client_pro_id]);

  // Ajouter un lieu à la volée
  const addLieuInline = async () => {
    if (!newLieuNom.trim()) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from('lieux').insert({
      profile_id: user.id,
      nom: newLieuNom.trim(),
      client_pro_id: form.client_pro_id || null,
      ordre: lieux.length,
    }).select().single();

    if (!error && data) {
      setLieux(prev => [...prev, data]);
      setForm(prev => ({ ...prev, lieu_id: data.id }));
      setNewLieuNom('');
      setShowNewLieu(false);
    }
  };

  // Création effective (sans vérification doublon)
  const doCreate = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (form.frequence === 'unique') {
        const { error } = await supabase.from('cours').insert({
          profile_id: user.id,
          nom: form.nom.trim(),
          type_cours: form.type_cours || null,
          date: form.date,
          heure: form.heure || null,
          duree_minutes: form.duree_minutes ? parseInt(form.duree_minutes) : 60,
          lieu: lieuxFiltres.find(l => l.id === form.lieu_id)?.nom || null,
          lieu_id: form.lieu_id || null,
          client_pro_id: form.client_pro_id || null,
          capacite_max: form.capacite_max ? parseInt(form.capacite_max) : null,
          notes: form.notes || null,
        });
        if (error) throw error;
      } else {
        const { data: recurrence, error: recErr } = await supabase.from('recurrences').insert({
          profile_id: user.id,
          nom: form.nom.trim(),
          type_cours: form.type_cours || null,
          heure: form.heure || null,
          duree_minutes: form.duree_minutes ? parseInt(form.duree_minutes) : 60,
          lieu_id: form.lieu_id || null,
          client_pro_id: form.client_pro_id || null,
          capacite_max: form.capacite_max ? parseInt(form.capacite_max) : null,
          frequence: form.frequence,
          jours_semaine: form.frequence === 'personnalise' ? form.jours_semaine : getJoursSemaine(),
          intervalle: form.frequence === 'bimensuel' ? 2 : 1,
          date_debut: form.date,
          date_fin: form.date_fin || null,
        }).select().single();
        if (recErr) throw recErr;

        const dates = genererDates(form, 12);
        if (dates.length > 0) {
          const coursACreer = dates.map(d => ({
            profile_id: user.id,
            nom: form.nom.trim(),
            type_cours: form.type_cours || null,
            date: d,
            heure: form.heure || null,
            duree_minutes: form.duree_minutes ? parseInt(form.duree_minutes) : 60,
            lieu: lieuxFiltres.find(l => l.id === form.lieu_id)?.nom || null,
            lieu_id: form.lieu_id || null,
            client_pro_id: form.client_pro_id || null,
            capacite_max: form.capacite_max ? parseInt(form.capacite_max) : null,
            recurrence_parent_id: recurrence.id,
          }));
          const { error: coursErr } = await supabase.from('cours').insert(coursACreer);
          if (coursErr) throw coursErr;
        }
      }

      router.push('/agenda');
      router.refresh();
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Soumission directe — pas de modale doublon bloquante.
  // Si vraie collision (même nom + même date + même heure pour un cours unique),
  // on affiche un toast warning non-bloquant et on crée quand même.
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nom.trim() || !form.date) return;

    if (form.frequence === 'unique') {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const { data: collision } = await supabase
          .from('cours')
          .select('id')
          .eq('profile_id', user.id)
          .ilike('nom', form.nom.trim())
          .eq('date', form.date)
          .eq('heure', form.heure || '10:00')
          .maybeSingle();
        if (collision) {
          toast.warning('Un cours identique existe déjà à cette date et heure — création en cours quand même.');
        }
      } catch {
        // erreur réseau : on continue
      }
    }

    await doCreate();
  };

  // Helper : jours de la semaine selon fréquence (timezone-safe)
  const getJoursSemaine = () => {
    if (form.frequence === 'quotidien') return [1, 2, 3, 4, 5, 6, 7];
    if (form.frequence === 'hebdomadaire' || form.frequence === 'bimensuel') {
      const d = parseDate(form.date); // parseDate évite le bug UTC
      const day = d.getDay();
      return [day === 0 ? 7 : day];
    }
    return form.jours_semaine;
  };

  return (
    <div className="nouveau-cours">
      <div className="page-header animate-fade-in">
        <Link href="/agenda" className="back-btn"><ArrowLeft size={20} /></Link>
        <div>
          <h1>Nouveau cours</h1>
          {searchParams.get('date') && (
            <p className="header-date-hint">
              <Calendar size={12} /> {parseDate(dateInitiale).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="form animate-slide-up">

        {/* Type de cours (chips) */}
        <div className="form-group">
          <label className="form-label"><Tag size={14} /> Type de cours</label>
          <div className="type-chips">
            {typesCours.map(type => (
              <button
                key={type}
                type="button"
                className={`chip ${form.type_cours === type ? 'selected' : ''}`}
                onClick={() => selectType(type)}
              >
                {type}
              </button>
            ))}
            <button type="button" className="chip chip-new" onClick={() => setShowNewType(true)}>
              <Plus size={13} /> Nouveau
            </button>
          </div>
        </div>

        {/* Modale nouveau type */}
        {showNewType && (
          <div className="modal-overlay" onClick={() => { setShowNewType(false); setNewTypeName(''); }}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
              <h3 className="modal-title">Nouveau type de cours</h3>
              <input
                className="izi-input"
                value={newTypeName}
                onChange={e => setNewTypeName(e.target.value)}
                placeholder="Ex : Pilates, Danse, Éveil corporel…"
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); saveNewType(); }
                  if (e.key === 'Escape') { setShowNewType(false); setNewTypeName(''); }
                }}
              />
              <div className="modal-actions">
                <button type="button" className="izi-btn izi-btn-ghost"
                  onClick={() => { setShowNewType(false); setNewTypeName(''); }}>
                  Annuler
                </button>
                <button type="button" className="izi-btn izi-btn-primary"
                  onClick={saveNewType}
                  disabled={!newTypeName.trim() || savingType}>
                  <Save size={16} /> {savingType ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Nom */}
        <div className="form-group">
          <label className="form-label">Nom du cours *</label>
          <input className="izi-input" value={form.nom} onChange={handleChange('nom')} placeholder="Ex : Yoga Vinyasa" required />
        </div>

        {/* Contexte : perso ou intervention */}
        {clientsPro.length > 0 && (
          <div className="form-group">
            <label className="form-label"><Building2 size={14} /> Contexte</label>
            <select className="izi-input" value={form.client_pro_id} onChange={handleChange('client_pro_id')}>
              <option value="">Mon activité personnelle</option>
              <optgroup label="Interventions">
                {clientsPro.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nom_structure || `${c.prenom} ${c.nom}`} ({c.type_client})
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        )}

        {/* Date + Heure */}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label"><Calendar size={14} /> Date *</label>
            <input className="izi-input" type="date" value={form.date} onChange={handleChange('date')} required />
          </div>
          <div className="form-group">
            <label className="form-label"><Clock size={14} /> Heure</label>
            <input className="izi-input" type="time" value={form.heure} onChange={handleChange('heure')} />
          </div>
        </div>

        {/* Durée + Capacité */}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Durée <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.75rem' }}>(min)</span></label>
            <input className="izi-input" type="number" value={form.duree_minutes} onChange={handleChange('duree_minutes')} placeholder="60" />
          </div>
          <div className="form-group">
            <label className="form-label"><Users size={14} /> Capacité max</label>
            <input className="izi-input" type="number" value={form.capacite_max} onChange={handleChange('capacite_max')} placeholder="ex : 12 — vide = illimité" />
          </div>
        </div>

        {/* Lieu (dropdown intelligent) */}
        <div className="form-group">
          <label className="form-label"><MapPin size={14} /> Lieu</label>
          {!showNewLieu ? (
            <div className="lieu-select-row">
              <select className="izi-input" value={form.lieu_id} onChange={handleChange('lieu_id')} style={{ flex: 1 }}>
                <option value="">-- Choisir un lieu --</option>
                {lieuxFiltres.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.nom}{l.clients?.nom_structure ? ` (${l.clients.nom_structure})` : ''}{l.adresse ? ` — ${l.adresse}` : ''}
                  </option>
                ))}
              </select>
              <button type="button" className="izi-btn izi-btn-secondary new-lieu-btn" onClick={() => setShowNewLieu(true)}>
                <Plus size={16} />
              </button>
            </div>
          ) : (
            <div className="new-lieu-row">
              <input
                className="izi-input"
                value={newLieuNom}
                onChange={e => setNewLieuNom(e.target.value)}
                placeholder="Nom du nouveau lieu..."
                autoFocus
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addLieuInline())}
              />
              <button type="button" className="izi-btn izi-btn-primary new-lieu-btn" onClick={addLieuInline} disabled={!newLieuNom.trim()}>
                <Save size={16} />
              </button>
              <button type="button" className="izi-btn izi-btn-ghost new-lieu-btn" onClick={() => { setShowNewLieu(false); setNewLieuNom(''); }}>
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Récurrence */}
        <div className="form-group">
          <label className="form-label"><Repeat size={14} /> Récurrence</label>
          <div className="freq-grid">
            {FREQUENCES.map(f => (
              <button
                key={f.value}
                type="button"
                className={`freq-btn ${form.frequence === f.value ? 'selected' : ''}`}
                onClick={() => setForm(prev => ({ ...prev, frequence: f.value }))}
              >
                <span className="freq-label">{f.label}</span>
                <span className="freq-desc">{f.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Jours de la semaine (si personnalisé) */}
        {form.frequence === 'personnalise' && (
          <div className="form-group">
            <label className="form-label">Jours de cours</label>
            <div className="jours-grid">
              {JOURS_SEMAINE.map(j => (
                <button
                  key={j.value}
                  type="button"
                  className={`jour-btn ${form.jours_semaine.includes(j.value) ? 'selected' : ''}`}
                  onClick={() => toggleJour(j.value)}
                >
                  {j.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Date de fin (si récurrent) */}
        {form.frequence !== 'unique' && (
          <div className="form-group">
            <label className="form-label">Fin de la récurrence</label>
            <input className="izi-input" type="date" value={form.date_fin} onChange={handleChange('date_fin')} />
            <span className="form-hint">Laisse vide pour générer 12 semaines de cours</span>
          </div>
        )}

        {/* Aperçu des dates générées (si récurrent et date renseignée) */}
        {form.frequence !== 'unique' && form.date && (
          <RecurrencePreview form={form} />
        )}

        {/* Notes */}
        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea className="izi-input" value={form.notes} onChange={handleChange('notes')} placeholder="Infos complémentaires..." rows={2} style={{ resize: 'vertical' }} />
        </div>

        {/* Submit */}
        <button type="submit" className="izi-btn izi-btn-primary submit-btn" disabled={loading || !form.nom.trim()}>
          <Save size={18} />
          {loading ? 'Création...' : form.frequence === 'unique' ? 'Créer le cours' : 'Créer la série de cours'}
        </button>
      </form>

      <style jsx global>{`
        .nouveau-cours { display: flex; flex-direction: column; gap: 20px; padding-bottom: 40px; }

        /* Preview récurrence */
        .rec-preview {
          background: var(--brand-light);
          border: 1px solid var(--brand-200, #f0d0d0);
          border-radius: 12px;
          padding: 12px 14px;
          margin-top: 4px;
        }
        .rec-preview-empty {
          background: #fffaf0;
          border-color: #fcd34d;
          color: #78350f;
          font-size: 0.875rem;
        }
        .rec-preview-head {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 8px;
        }
        .rec-preview-head strong {
          font-size: 0.8125rem; font-weight: 700; color: var(--brand-700, var(--brand));
          text-transform: uppercase; letter-spacing: 0.04em;
        }
        .rec-preview-meta {
          font-size: 0.75rem; color: var(--text-muted);
        }
        .rec-preview-list {
          display: flex; flex-wrap: wrap; gap: 6px;
        }
        .rec-preview-chip {
          background: white; border: 1px solid var(--brand-200, #f0d0d0);
          border-radius: 99px; padding: 4px 10px;
          font-size: 0.75rem; font-weight: 600; color: var(--brand-700, var(--brand));
          text-transform: capitalize;
        }
        .rec-preview-more {
          padding: 4px 8px; font-size: 0.75rem; color: var(--text-muted); align-self: center;
        }
        .page-header { display: flex; align-items: center; gap: 12px; }
        .page-header h1 { font-size: 1.25rem; font-weight: 700; }
        .header-date-hint { display: flex; align-items: center; gap: 4px; font-size: 0.8125rem; color: var(--brand); font-weight: 600; margin-top: 2px; text-transform: capitalize; }
        .back-btn { width: 40px; height: 40px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--bg-card); display: flex; align-items: center; justify-content: center; color: var(--text-secondary); text-decoration: none; }

        .form { display: flex; flex-direction: column; gap: 16px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-label { display: flex; align-items: center; gap: 4px; font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary); }
        .form-hint { font-size: 0.75rem; color: var(--text-muted); }

        /* Type chips */
        .type-chips { display: flex; flex-wrap: wrap; gap: 6px; }
        .chip { padding: 8px 14px; border-radius: var(--radius-full); border: 1px solid var(--border); background: var(--bg-card); color: var(--text-secondary); font-size: 0.8125rem; font-weight: 500; cursor: pointer; transition: all var(--transition-fast); }
        .chip.selected { background: var(--brand); color: white; border-color: var(--brand); }
        .chip:active { transform: scale(0.95); }
        .chip-new { display: inline-flex; align-items: center; gap: 4px; border-style: dashed; color: var(--brand); border-color: var(--brand-200); }
        .chip-new:hover { background: var(--brand-light); border-color: var(--brand); }

        /* Modale nouveau type */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; animation: fadeIn 0.15s ease; }
        .modal-box { background: white; border-radius: var(--radius-md); padding: 24px; width: 100%; max-width: 380px; box-shadow: 0 20px 60px rgba(0,0,0,0.15); display: flex; flex-direction: column; gap: 16px; }
        .modal-title { font-size: 1rem; font-weight: 700; color: var(--text-primary); }
        .modal-actions { display: flex; justify-content: flex-end; gap: 8px; }

        /* Lieu */
        .lieu-select-row, .new-lieu-row { display: flex; gap: 8px; align-items: center; }
        .new-lieu-btn { min-width: 44px; min-height: 44px; padding: 0; display: flex; align-items: center; justify-content: center; }

        /* Fréquence */
        .freq-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
        .freq-btn { padding: 10px 12px; border-radius: var(--radius-sm); border: 1.5px solid var(--border); background: var(--bg-card); cursor: pointer; text-align: left; transition: all var(--transition-fast); }
        .freq-btn.selected { border-color: var(--brand); background: var(--brand-50); }
        .freq-btn:active { transform: scale(0.98); }
        .freq-label { display: block; font-weight: 600; font-size: 0.8125rem; color: var(--text-primary); }
        .freq-desc { display: block; font-size: 0.6875rem; color: var(--text-muted); margin-top: 1px; }
        .freq-btn.selected .freq-label { color: var(--brand-700); }

        /* Jours */
        .jours-grid { display: flex; gap: 6px; }
        .jour-btn { width: 44px; height: 44px; border-radius: 50%; border: 1.5px solid var(--border); background: var(--bg-card); color: var(--text-secondary); font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all var(--transition-fast); }
        .jour-btn.selected { background: var(--brand); color: white; border-color: var(--brand); }
        .jour-btn:active { transform: scale(0.9); }

        .submit-btn { width: 100%; margin-top: 8px; }

        /* Modale doublon */
        .dup-modal { max-width: 420px; gap: 0; padding: 0; overflow: hidden; }
        .dup-modal-header {
          display: flex; align-items: flex-start; gap: 12px;
          padding: 20px 20px 16px;
          background: #fef3c7; border-bottom: 1px solid #f59e0b22;
        }
        .dup-modal-icon { color: #d97706; flex-shrink: 0; margin-top: 2px; }
        .dup-modal-title { font-size: 0.9375rem; font-weight: 700; color: #92400e; }
        .dup-modal-subtitle { font-size: 0.8125rem; color: #78350f; margin-top: 2px; }

        .dup-list { display: flex; flex-direction: column; padding: 12px 16px; gap: 6px; }
        .dup-item {
          display: flex; align-items: center; justify-content: space-between;
          gap: 10px; padding: 10px 12px;
          background: var(--bg-soft, #f8f9fa); border: 1px solid var(--border);
          border-radius: var(--radius-sm); text-decoration: none; color: inherit;
          transition: background 0.15s;
        }
        .dup-item:hover { background: var(--brand-50, #eef2ff); border-color: var(--brand-200, #c7d2fe); }
        .dup-item-left { display: flex; align-items: flex-start; gap: 8px; min-width: 0; }
        .dup-item-icon { color: var(--brand); flex-shrink: 0; margin-top: 1px; }
        .dup-item-nom { font-size: 0.875rem; font-weight: 600; color: var(--text-primary); }
        .dup-item-meta { font-size: 0.75rem; color: var(--text-muted); margin-top: 1px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .dup-item-type { background: var(--brand-100, #e0e7ff); color: var(--brand-700, #4338ca); padding: 1px 6px; border-radius: 99px; font-size: 0.6875rem; font-weight: 600; }
        .dup-item-arrow { color: var(--text-muted); flex-shrink: 0; }

        .dup-modal-actions { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 16px 16px; border-top: 1px solid var(--border); }
      `}</style>
    </div>
  );
}

// Générer les dates à partir de la config de récurrence (timezone-safe)
function genererDates(form, maxSemaines = 12) {
  const dates  = [];
  const debut  = parseDate(form.date);                           // local, pas UTC
  const fin    = form.date_fin ? parseDate(form.date_fin) : null;
  const maxMs  = maxSemaines * 7 * 24 * 60 * 60 * 1000;
  const maxDate = fin || new Date(debut.getTime() + maxMs);

  if (form.frequence === 'quotidien') {
    let d = new Date(debut);
    while (d <= maxDate) {
      dates.push(toDateStr(d));
      d.setDate(d.getDate() + 1);
    }
  } else if (form.frequence === 'hebdomadaire' || form.frequence === 'bimensuel') {
    const intervalle = form.frequence === 'bimensuel' ? 2 : 1;
    let d = new Date(debut);
    while (d <= maxDate) {
      dates.push(toDateStr(d));
      d.setDate(d.getDate() + 7 * intervalle);
    }
  } else if (form.frequence === 'mensuel') {
    let d = new Date(debut);
    while (d <= maxDate) {
      dates.push(toDateStr(d));
      d.setMonth(d.getMonth() + 1);
    }
  } else if (form.frequence === 'personnalise' && form.jours_semaine.length > 0) {
    let d = new Date(debut);
    while (d <= maxDate) {
      const jourISO = d.getDay() === 0 ? 7 : d.getDay();
      if (form.jours_semaine.includes(jourISO)) {
        dates.push(toDateStr(d));
      }
      d.setDate(d.getDate() + 1);
    }
  }

  return dates;
}

// useSearchParams nécessite Suspense dans Next.js App Router
export default function NouveauCours() {
  return (
    <Suspense>
      <NouveauCoursInner />
    </Suspense>
  );
}

// Petit composant icône Tag inline
function Tag({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
      <path d="M7 7h.01" />
    </svg>
  );
}

// Petit composant icône Save inline (déjà importé en haut)
