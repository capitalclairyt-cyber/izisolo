'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { PageHeader } from '@/components/np';
import { slugify } from '@/lib/utils';
import { useToast } from '@/components/ui/ToastProvider';
import CalendarBuilder from '@/components/sondage/CalendarBuilder';

const VISIBILITE_OPTIONS = [
  { value: 'inscrits', label: 'Élèves inscrits uniquement', desc: 'Faut être connecté à son espace pour voter.' },
  { value: 'mixte',    label: 'Inscrits + visiteurs avec email', desc: 'Visiteurs anonymes peuvent voter en laissant leur email.' },
  { value: 'public',   label: 'Lien partageable, public',         desc: 'Tout le monde peut voter avec son email.' },
];

// id local temporaire pour les nouveaux créneaux pas encore en DB
let _localId = 0;
const tempId = () => `tmp-${++_localId}`;

export default function NouveauSondageClient({ typesCours, studioSlug }) {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [titre, setTitre] = useState('Mon planning idéal');
  const [message, setMessage] = useState("Aide-moi à choisir mes meilleurs créneaux ! Coche tous les cours auxquels tu viendrais — ça m'aide à construire un planning qui te ressemble.");
  const [dateFin, setDateFin] = useState(() => {
    const d = new Date(Date.now() + 14 * 86400000);
    return d.toISOString().slice(0, 10);
  });
  const [visibilite, setVisibilite] = useState('mixte');

  // Créneaux candidats : démarrage avec 2 exemples
  const [creneaux, setCreneaux] = useState([
    { id: tempId(), type_cours: typesCours[0] || 'Yoga doux',  jour_semaine: 2, heure: '19:30', duree_minutes: 60 },
    { id: tempId(), type_cours: typesCours[0] || 'Yoga doux',  jour_semaine: 4, heure: '10:30', duree_minutes: 60 },
  ]);

  const addCreneau = (c) => setCreneaux(prev => [...prev, { id: tempId(), ...c }]);
  const updateCreneau = (id, fields) => setCreneaux(prev => prev.map(c => c.id === id ? { ...c, ...fields } : c));
  const removeCreneau = (id) => setCreneaux(prev => prev.filter(c => c.id !== id));

  const handleSave = async () => {
    if (!titre.trim()) { toast.error('Donne un titre à ton sondage.'); return; }
    if (creneaux.length < 2) { toast.error('Ajoute au moins 2 créneaux candidats sur le calendrier.'); return; }
    const creneauxIncomplets = creneaux.some(c => !c.type_cours || !c.heure);
    if (creneauxIncomplets) { toast.error('Tous les créneaux doivent avoir un type de cours et une heure.'); return; }

    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const slugBase = slugify(titre).slice(0, 40);
      const slug = `${slugBase}-${Math.random().toString(36).slice(2, 7)}`;

      const { data: sondage, error: sErr } = await supabase
        .from('sondages_planning')
        .insert({
          profile_id: user.id,
          slug,
          titre: titre.trim(),
          message: message.trim() || null,
          date_fin: dateFin || null,
          visibilite,
          actif: true,
        })
        .select()
        .single();
      if (sErr) throw sErr;

      const creneauxRows = creneaux.map((c, ordre) => ({
        sondage_id: sondage.id,
        type_cours: c.type_cours,
        jour_semaine: parseInt(c.jour_semaine),
        heure: c.heure,
        duree_minutes: parseInt(c.duree_minutes) || 60,
        ordre,
      }));
      const { error: cErr } = await supabase.from('sondages_creneaux').insert(creneauxRows);
      if (cErr) throw cErr;

      toast.success('Sondage créé !');
      router.push(`/sondages/${sondage.id}`);
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ns-page">
      <PageHeader eyebrow="NOUVEAU" title="Nouveau sondage" />
      <div style={{ padding: '0 22px 8px' }}>
        <Link href="/sondages" className="izi-btn izi-btn-ghost" style={{ fontSize: '0.8125rem' }}>
          <ArrowLeft size={14} /> Tous les sondages
        </Link>
      </div>

      {/* Titre + message */}
      <div className="izi-card form-section">
        <div className="form-group">
          <label className="form-label">Titre <span className="req">*</span></label>
          <input
            className="izi-input"
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            maxLength={120}
            placeholder="Ex : Mon planning de rentrée"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Message d'intro (optionnel)</label>
          <textarea
            className="izi-input"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Quelques mots pour expliquer ta démarche…"
          />
          <span className="form-hint">{message.length}/500</span>
        </div>
        <div className="form-group">
          <label className="form-label">Date limite des réponses</label>
          <input
            className="izi-input"
            type="date"
            value={dateFin}
            onChange={(e) => setDateFin(e.target.value)}
            min={new Date().toISOString().slice(0, 10)}
          />
          <span className="form-hint">Au-delà, plus personne ne peut voter (tu peux toujours voir les résultats).</span>
        </div>
      </div>

      {/* Visibilité */}
      <div className="izi-card form-section">
        <h2 className="section-h2">Qui peut répondre ?</h2>
        {VISIBILITE_OPTIONS.map(opt => (
          <label key={opt.value} className={`vis-option ${visibilite === opt.value ? 'active' : ''}`}>
            <input
              type="radio"
              name="visibilite"
              value={opt.value}
              checked={visibilite === opt.value}
              onChange={(e) => setVisibilite(e.target.value)}
            />
            <div>
              <div className="vis-label">{opt.label}</div>
              <div className="vis-desc">{opt.desc}</div>
            </div>
          </label>
        ))}
      </div>

      {/* Calendrier de créneaux candidats */}
      <div className="izi-card form-section">
        <h2 className="section-h2">
          Créneaux candidats
          <span className="ns-counter">{creneaux.length}</span>
        </h2>
        <p className="ns-hint">
          Clique sur n'importe quelle case du calendrier pour ajouter un créneau.
          Tes élèves voteront oui / peut-être / non sur chacun.
        </p>

        <CalendarBuilder
          mode="edit"
          creneaux={creneaux}
          onAdd={addCreneau}
          onUpdate={updateCreneau}
          onRemove={removeCreneau}
          defaultType={typesCours[0] || ''}
          typesCoursList={typesCours}
        />
      </div>

      {/* Submit */}
      <button
        type="button"
        className="izi-btn izi-btn-primary submit-btn"
        onClick={handleSave}
        disabled={saving}
      >
        <Save size={16} /> {saving ? 'Création…' : 'Créer le sondage'}
      </button>

      <style>{`
        .ns-page { display: flex; flex-direction: column; gap: 16px; padding-bottom: 60px; }
        .ns-header { display: flex; align-items: center; gap: 12px; }
        .ns-header h1 { font-size: 1.25rem; font-weight: 700; }
        .back-btn { width: 40px; height: 40px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--bg-card); display: flex; align-items: center; justify-content: center; color: var(--text-secondary); text-decoration: none; }

        .form-section { display: flex; flex-direction: column; gap: 14px; padding: 16px; }
        .section-h2 {
          font-size: 0.9375rem; font-weight: 700; color: var(--text-primary);
          display: flex; align-items: center; gap: 8px;
        }
        .ns-counter {
          font-size: 0.75rem; font-weight: 700;
          background: var(--brand-light); color: var(--brand);
          padding: 2px 8px; border-radius: 99px;
        }
        .ns-hint { font-size: 0.75rem; color: var(--text-muted); margin-top: -6px; }
        .req { color: var(--brand); }

        .vis-option {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 10px 12px; border: 1.5px solid var(--border);
          border-radius: 10px; cursor: pointer;
          transition: all 0.15s;
        }
        .vis-option.active { border-color: var(--brand); background: var(--brand-light); }
        .vis-option input { margin-top: 4px; accent-color: var(--brand); }
        .vis-label { font-size: 0.875rem; font-weight: 600; color: var(--text-primary); }
        .vis-desc { font-size: 0.75rem; color: var(--text-secondary); margin-top: 2px; }

        .submit-btn { align-self: stretch; justify-content: center; }
      `}</style>
    </div>
  );
}
