'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, User, Building2, MapPin, Plus, Trash2, Sparkles, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { validerEmail, validerTelephone, formaterTelephone, validerSiret, formaterSiret } from '@/lib/validation';
import { useToast } from '@/components/ui/ToastProvider';
import AutocompleteEntreprise from '@/components/forms/AutocompleteEntreprise';
import AutocompleteCommune from '@/components/forms/AutocompleteCommune';
import ValidatedInput from '@/components/forms/ValidatedInput';

const TYPES_PRO = [
  { value: 'association', label: 'Association' },
  { value: 'studio', label: 'Studio' },
  { value: 'entreprise', label: 'Entreprise' },
  { value: 'autre_pro', label: 'Autre pro' },
];

export default function NouveauClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('particulier');
  const [prefilled, setPrefilled] = useState(false); // animation quand prérempli
  const [doublonsSuggeres, setDoublonsSuggeres] = useState([]); // clients similaires détectés
  const debounceRef = useRef(null);

  const [form, setForm] = useState({
    prenom: '', nom: '', email: '', telephone: '',
    niveau: '', source: '', notes: '',
    // Pro
    type_client: 'association',
    nom_structure: '',
    siret: '',
    adresse: '',
    code_postal: '',
    ville: '',
  });

  // Lieux associés
  const [lieuxPro, setLieuxPro] = useState([]);
  const [newLieuNom, setNewLieuNom] = useState('');
  const [newLieuAdresse, setNewLieuAdresse] = useState('');

  // ── Détection de doublons (debounce 500ms) ────────────────────────────────
  useEffect(() => {
    const nomRecherche = mode === 'pro' ? form.nom_structure.trim() : form.nom.trim();
    if (nomRecherche.length < 2) { setDoublonsSuggeres([]); return; }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('clients')
        .select('id, nom, prenom, email, type_client')
        .eq('profile_id', user.id)
        .ilike('nom', `%${nomRecherche}%`)
        .limit(3);

      const { data } = await query;
      setDoublonsSuggeres(data || []);
    }, 500);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [form.nom, form.prenom, form.nom_structure, mode]);

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleChange = (field) => (e) => updateField(field, e.target.value);

  // Préremplissage depuis API Entreprise
  const handleEntrepriseSelect = (entreprise) => {
    setForm(prev => ({
      ...prev,
      nom_structure: entreprise.nom || prev.nom_structure,
      siret: entreprise.siret ? formaterSiret(entreprise.siret) : prev.siret,
      adresse: entreprise.adresse || prev.adresse,
      code_postal: entreprise.codePostal || prev.code_postal,
      ville: entreprise.ville || prev.ville,
    }));
    setPrefilled(true);
    setTimeout(() => setPrefilled(false), 2000);
  };

  // Commune autocomplete
  const handleCommuneSelect = ({ codePostal, ville }) => {
    setForm(prev => ({ ...prev, code_postal: codePostal || prev.code_postal, ville: ville || prev.ville }));
  };

  const addLieu = () => {
    if (!newLieuNom.trim()) return;
    setLieuxPro(prev => [...prev, { nom: newLieuNom.trim(), adresse: newLieuAdresse.trim() }]);
    setNewLieuNom('');
    setNewLieuAdresse('');
  };

  const removeLieu = (idx) => {
    setLieuxPro(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const isPro = mode === 'pro';

    // Validations
    if (isPro && !form.nom_structure.trim()) {
      toast.warning('Le nom de la structure est obligatoire.');
      return;
    }
    if (!isPro && !form.nom.trim()) return;

    if (form.email) {
      const emailCheck = validerEmail(form.email);
      if (!emailCheck.valide) { toast.warning(emailCheck.message); return; }
    }
    if (form.telephone) {
      const telCheck = validerTelephone(form.telephone);
      if (!telCheck.valide) { toast.warning(telCheck.message); return; }
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const payload = {
        profile_id: user.id,
        statut: 'prospect',
        notes: form.notes.trim() || null,
        email: form.email.trim() || null,
        telephone: form.telephone.trim() || null,
      };

      if (isPro) {
        payload.type_client = form.type_client;
        payload.nom_structure = form.nom_structure.trim();
        payload.nom = form.nom_structure.trim();
        payload.prenom = null;
        payload.siret = form.siret.replace(/\s/g, '').trim() || null;
        const adresseComplete = [form.adresse, form.code_postal, form.ville].filter(Boolean).join(', ');
        payload.adresse = adresseComplete || null;
      } else {
        payload.type_client = 'particulier';
        payload.nom = form.nom.trim();
        payload.prenom = form.prenom.trim();
        payload.niveau = form.niveau || null;
        payload.source = form.source || null;
      }

      const { data: client, error } = await supabase
        .from('clients')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      // Créer les lieux associés (pro)
      if (isPro && lieuxPro.length > 0) {
        const lieuxPayload = lieuxPro.map((l, idx) => ({
          profile_id: user.id,
          client_pro_id: client.id,
          nom: l.nom,
          adresse: l.adresse || null,
          ordre: idx,
        }));

        const { error: errLieux } = await supabase.from('lieux').insert(lieuxPayload);
        if (errLieux) console.warn('Lieux non créés :', errLieux.message);
      }

      router.push('/clients');
      router.refresh();
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="nouveau-client">
      <div className="page-header animate-fade-in">
        <Link href="/clients" className="back-btn"><ArrowLeft size={20} /></Link>
        <h1>Nouveau contact</h1>
      </div>

      {/* Toggle Particulier / Pro */}
      <div className="mode-toggle animate-slide-up">
        <button
          className={`mode-btn ${mode === 'particulier' ? 'active' : ''}`}
          onClick={() => setMode('particulier')}
          type="button"
        >
          <User size={18} /> Particulier
        </button>
        <button
          className={`mode-btn ${mode === 'pro' ? 'active' : ''}`}
          onClick={() => setMode('pro')}
          type="button"
        >
          <Building2 size={18} /> Client pro
        </button>
      </div>

      <form onSubmit={handleSubmit} className="form animate-slide-up">

        {mode === 'pro' ? (
          <>
            {/* Recherche API Entreprise */}
            <div className="api-search-section">
              <AutocompleteEntreprise onSelect={handleEntrepriseSelect} />
              {prefilled && (
                <div className="prefill-badge">
                  <Sparkles size={14} /> Informations préremplies
                </div>
              )}
            </div>

            <div className="section-label">Structure</div>

            <div className="form-group">
              <label className="form-label">Type *</label>
              <div className="type-chips">
                {TYPES_PRO.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    className={`type-chip ${form.type_client === t.value ? 'selected' : ''}`}
                    onClick={() => updateField('type_client', t.value)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Nom de la structure *</label>
              <input
                className={`izi-input ${prefilled ? 'izi-input-prefilled' : ''}`}
                type="text"
                value={form.nom_structure}
                onChange={handleChange('nom_structure')}
                placeholder="YogaFacile, Studio Zen..."
                required
              />
            </div>

            <ValidatedInput
              label="SIRET"
              value={form.siret}
              onChange={v => updateField('siret', v)}
              validate={validerSiret}
              format={formaterSiret}
              inputMode="numeric"
              maxLength={17}
              placeholder="123 456 789 00012"
              className={prefilled ? 'prefilled' : ''}
            />

            <div className="form-group">
              <label className="form-label">Adresse</label>
              <input
                className={`izi-input ${prefilled ? 'izi-input-prefilled' : ''}`}
                type="text"
                value={form.adresse}
                onChange={handleChange('adresse')}
                placeholder="12 rue de la Paix"
              />
            </div>

            <AutocompleteCommune
              codePostal={form.code_postal}
              ville={form.ville}
              onSelect={handleCommuneSelect}
              className={prefilled ? 'prefilled' : ''}
            />

            <div className="section-label">Contact</div>

            <ValidatedInput
              label="Email"
              value={form.email}
              onChange={v => updateField('email', v)}
              validate={validerEmail}
              type="email"
              placeholder="contact@structure.com"
            />

            <ValidatedInput
              label="Téléphone"
              value={form.telephone}
              onChange={v => updateField('telephone', v)}
              validate={validerTelephone}
              format={formaterTelephone}
              inputMode="tel"
              placeholder="01 23 45 67 89"
            />

            {/* Lieux */}
            <div className="section-label"><MapPin size={16} /> Lieux / Salles</div>
            <p className="section-hint">Les salles où tu interviens pour cette structure.</p>

            {lieuxPro.length > 0 && (
              <div className="lieux-list">
                {lieuxPro.map((l, idx) => (
                  <div key={idx} className="lieu-item">
                    <div className="lieu-info">
                      <span className="lieu-nom">{l.nom}</span>
                      {l.adresse && <span className="lieu-adresse">{l.adresse}</span>}
                    </div>
                    <button type="button" className="lieu-delete" onClick={() => removeLieu(idx)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="add-lieu-form">
              <input
                className="izi-input"
                value={newLieuNom}
                onChange={e => setNewLieuNom(e.target.value)}
                placeholder="Nom du lieu..."
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLieu(); } }}
              />
              <input
                className="izi-input"
                value={newLieuAdresse}
                onChange={e => setNewLieuAdresse(e.target.value)}
                placeholder="Adresse (optionnel)"
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLieu(); } }}
              />
              <button type="button" className="izi-btn izi-btn-secondary add-btn" onClick={addLieu} disabled={!newLieuNom.trim()}>
                <Plus size={18} />
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Mode Particulier */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Prénom</label>
                <input className="izi-input" type="text" value={form.prenom} onChange={handleChange('prenom')} placeholder="Marie" />
              </div>
              <div className="form-group">
                <label className="form-label">Nom *</label>
                <input className="izi-input" type="text" value={form.nom} onChange={handleChange('nom')} placeholder="Dupont" required />
              </div>
            </div>

            <ValidatedInput
              label="Email"
              value={form.email}
              onChange={v => updateField('email', v)}
              validate={validerEmail}
              type="email"
              placeholder="marie@email.com"
            />

            <ValidatedInput
              label="Téléphone"
              value={form.telephone}
              onChange={v => updateField('telephone', v)}
              validate={validerTelephone}
              format={formaterTelephone}
              inputMode="tel"
              placeholder="06 12 34 56 78"
            />

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Niveau</label>
                <select className="izi-input" value={form.niveau} onChange={handleChange('niveau')}>
                  <option value="">-- Choisir --</option>
                  <option value="Débutant">Débutant</option>
                  <option value="Intermédiaire">Intermédiaire</option>
                  <option value="Avancé">Avancé</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Source</label>
                <select className="izi-input" value={form.source} onChange={handleChange('source')}>
                  <option value="">-- Choisir --</option>
                  <option value="Bouche à oreille">Bouche à oreille</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Site web">Site web</option>
                  <option value="Événement">Événement</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
            </div>
          </>
        )}

        {/* Avertissement doublons */}
        {doublonsSuggeres.length > 0 && (
          <div className="doublon-alert">
            <AlertTriangle size={15} />
            <div>
              <div className="doublon-alert-title">Client similaire déjà existant</div>
              <div className="doublon-alert-list">
                {doublonsSuggeres.map(c => (
                  <Link key={c.id} href={`/clients/${c.id}`} className="doublon-alert-link">
                    {c.prenom ? `${c.prenom} ${c.nom}` : c.nom}
                    {c.email && <span className="doublon-alert-email"> · {c.email}</span>}
                  </Link>
                ))}
              </div>
              <div className="doublon-alert-hint">Tu peux quand même continuer si c'est un homonyme.</div>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea
            className="izi-input"
            value={form.notes}
            onChange={handleChange('notes')}
            placeholder={mode === 'pro' ? 'Conditions, horaires, contact référent...' : 'Blessures, objectifs...'}
            rows={3}
            style={{ resize: 'vertical' }}
          />
        </div>

        <button
          type="submit"
          className="izi-btn izi-btn-primary submit-btn"
          disabled={loading || (mode === 'particulier' ? !form.nom.trim() : !form.nom_structure.trim())}
        >
          <Save size={18} /> {loading ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </form>

      <style jsx global>{`
        .nouveau-client { display: flex; flex-direction: column; gap: 20px; padding-bottom: 40px; }
        .page-header { display: flex; align-items: center; gap: 12px; }
        .page-header h1 { font-size: 1.25rem; font-weight: 700; }
        .back-btn { width: 40px; height: 40px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--bg-card); display: flex; align-items: center; justify-content: center; color: var(--text-secondary); text-decoration: none; }

        .mode-toggle { display: flex; gap: 8px; }
        .mode-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; border-radius: var(--radius-md); border: 2px solid var(--border); background: var(--bg-card); font-size: 0.9375rem; font-weight: 600; color: var(--text-secondary); cursor: pointer; transition: all var(--transition-fast); }
        .mode-btn.active { border-color: var(--brand); background: var(--brand-light); color: var(--brand-700); }

        .form { display: flex; flex-direction: column; gap: 16px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-label { font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary); }
        .submit-btn { width: 100%; margin-top: 8px; }

        .api-search-section { position: relative; }
        .prefill-badge {
          display: inline-flex; align-items: center; gap: 4px;
          margin-top: 8px; padding: 4px 10px; border-radius: var(--radius-full);
          background: #ecfdf5; color: #059669; font-size: 0.75rem; font-weight: 600;
          animation: fadeInOut 2s ease forwards;
        }
        @keyframes fadeInOut { 0% { opacity: 0; transform: translateY(-4px); } 20% { opacity: 1; transform: translateY(0); } 80% { opacity: 1; } 100% { opacity: 0; } }

        .izi-input-prefilled {
          animation: prefillFlash 1s ease;
        }
        @keyframes prefillFlash {
          0% { background: var(--brand-light); }
          100% { background: var(--bg-card); }
        }

        .section-label { display: flex; align-items: center; gap: 6px; font-size: 0.875rem; font-weight: 700; color: var(--brand-700); margin-top: 4px; padding-top: 8px; border-top: 1px solid var(--border); }
        .section-hint { font-size: 0.75rem; color: var(--text-muted); margin: -8px 0 0; }

        .type-chips { display: flex; flex-wrap: wrap; gap: 6px; }
        .type-chip { padding: 8px 14px; border-radius: var(--radius-full); border: 1.5px solid var(--border); background: var(--bg-card); font-size: 0.8125rem; font-weight: 500; color: var(--text-secondary); cursor: pointer; transition: all var(--transition-fast); }
        .type-chip.selected { border-color: var(--brand); background: var(--brand-light); color: var(--brand-700); }

        .lieux-list { display: flex; flex-direction: column; gap: 6px; }
        .lieu-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--cream, #faf8f5); border-radius: var(--radius-sm); border: 1px solid var(--border); }
        .lieu-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
        .lieu-nom { font-weight: 600; font-size: 0.875rem; color: var(--text-primary); }
        .lieu-adresse { font-size: 0.75rem; color: var(--text-muted); }
        .lieu-delete { background: none; border: none; color: var(--danger); cursor: pointer; padding: 4px; border-radius: var(--radius-sm); opacity: 0.5; }
        .lieu-delete:hover { opacity: 1; background: #fef2f2; }

        .add-lieu-form { display: flex; gap: 8px; flex-wrap: wrap; }
        .add-lieu-form .izi-input { flex: 1; min-width: 120px; }
        .add-btn { min-width: 48px; padding: 0; display: flex; align-items: center; justify-content: center; }

        /* Détection de doublons */
        .doublon-alert {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 12px 14px; border-radius: var(--radius-md);
          background: #fffbeb; border: 1.5px solid #fcd34d; color: #92400e;
          font-size: 0.8125rem;
          animation: slideDown 0.2s ease;
        }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        .doublon-alert > svg { flex-shrink: 0; margin-top: 1px; color: #d97706; }
        .doublon-alert-title { font-weight: 700; margin-bottom: 5px; }
        .doublon-alert-list { display: flex; flex-direction: column; gap: 4px; margin-bottom: 6px; }
        .doublon-alert-link {
          display: inline-flex; align-items: center; gap: 4px;
          font-weight: 600; color: #b45309; text-decoration: underline;
          text-underline-offset: 2px;
        }
        .doublon-alert-link:hover { color: #92400e; }
        .doublon-alert-email { font-weight: 400; color: #b45309; }
        .doublon-alert-hint { font-size: 0.75rem; color: #b45309; opacity: 0.8; }
      `}</style>
    </div>
  );
}
