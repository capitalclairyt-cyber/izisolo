'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, User, Building2, MapPin, Plus, Trash2, Sparkles, AlertTriangle, Camera, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { validerEmail, validerTelephone, formaterTelephone, validerSiret, formaterSiret } from '@/lib/validation';
import { useToast } from '@/components/ui/ToastProvider';
import { STATUTS_CLIENT } from '@/lib/constantes';
import AutocompleteEntreprise from '@/components/forms/AutocompleteEntreprise';
import AutocompleteCommune from '@/components/forms/AutocompleteCommune';
import ValidatedInput from '@/components/forms/ValidatedInput';
import DateNaissanceInput from '@/components/forms/DateNaissanceInput';
import AdresseInput from '@/components/forms/AdresseInput';

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
  const [statut, setStatut] = useState('prospect');
  const [prefilled, setPrefilled] = useState(false); // animation quand prérempli
  const [doublonsSuggeres, setDoublonsSuggeres] = useState([]); // clients similaires détectés
  const [extracting, setExtracting] = useState(false); // lecture photo en cours
  // Incrémenté à chaque préremplissage photo pour forcer le remount de
  // DateNaissanceInput / AdresseInput (ils ne resynchronisent pas leur état
  // interne sur un changement externe de `value`).
  const [prefillKey, setPrefillKey] = useState(0);
  const debounceRef = useRef(null);
  const photoInputRef = useRef(null);

  const [form, setForm] = useState({
    prenom: '', nom: '', email: '', telephone: '',
    date_naissance: '',  // pour les rappels d'anniversaire (notif J-1)
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

  // Configuration des champs élèves (depuis profiles.client_fields_config)
  // Détermine quels champs prédéfinis afficher + les champs perso à rendre.
  // Cf. lib/client-fields.js + section "Infos collectées" dans /parametres.
  const [fieldsConfig, setFieldsConfig] = useState({
    predefined: { date_naissance: true, adresse: true, niveau: true, source: true, notes: true },
    custom: [],
  });
  const [customValues, setCustomValues] = useState({}); // { custom_field_id: value }
  const [adressePostale, setAdressePostale] = useState('');

  // Charger la config au mount
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('client_fields_config')
        .eq('id', user.id)
        .single();
      if (data?.client_fields_config) setFieldsConfig({
        predefined: { date_naissance: true, adresse: false, niveau: true, source: true, notes: true, ...(data.client_fields_config.predefined || {}) },
        custom: Array.isArray(data.client_fields_config.custom) ? data.client_fields_config.custom : [],
      });
    })();
  }, []);

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

  // Réduit + compresse l'image AVANT envoi. Les photos de téléphone font
  // 3-8 Mo ; en base64 (+33%) ça dépasse la limite de body Vercel (~4.5 Mo),
  // qui répond alors en texte brut "Request Entity Too Large" → erreur
  // "Unexpected token" côté client. On downscale à 1600px max + JPEG q0.82 :
  // largement assez pour lire le texte, payload ~200-400 Ko.
  const compressImage = (file) => new Promise((resolve, reject) => {
    const MAX_DIM = 1600;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (!width || !height) { reject(new Error('Image illisible')); return; }
      if (Math.max(width, height) > MAX_DIM) {
        const ratio = MAX_DIM / Math.max(width, height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      const data = dataUrl.split(',')[1];
      if (!data) { reject(new Error('Compression de l\'image impossible')); return; }
      resolve({ media_type: 'image/jpeg', data });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image illisible (format non supporté ?)')); };
    img.src = url;
  });

  // ── Import depuis une photo (carte de visite, fiche papier, capture…) ───────
  // La photo est lue par l'IA (Claude vision) côté serveur pour préremplir le
  // formulaire. L'image n'est jamais stockée. La prof vérifie/corrige toujours
  // avant d'enregistrer. Réservé Pro+ (géré côté API → toast si non éligible).
  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // reset pour autoriser une nouvelle sélection du même fichier
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.warning('Choisis une image (photo ou capture d\'écran).');
      return;
    }
    setExtracting(true);
    try {
      // Downscale + compression côté client (évite la limite de body Vercel)
      const { media_type, data } = await compressImage(file);

      const res = await fetch('/api/clients/extract-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media_type, data }),
      });
      // Réponse robuste : si le serveur renvoie autre chose que du JSON
      // (page d'erreur proxy, timeout…), on ne plante pas sur res.json().
      let json;
      try { json = await res.json(); }
      catch { throw new Error(res.ok ? 'Réponse inattendue du serveur, réessaie.' : `Lecture impossible (erreur ${res.status}).`); }
      if (!res.ok) throw new Error(json.error || 'Lecture de la photo impossible.');

      const ex = json.extracted || {};
      const hasAny = ex.prenom || ex.nom || ex.email || ex.telephone || ex.notes
        || ex.date_naissance || ex.adresse_rue || ex.code_postal || ex.ville;
      if (!hasAny) {
        toast.info('Aucune info trouvée sur la photo. Saisis le contact à la main.');
        return;
      }

      setMode('particulier');
      // Date de naissance : on ne garde que du strict ISO AAAA-MM-JJ valide
      // (DateNaissanceInput ignore tout autre format → champ vide sinon), et
      // seulement si le champ est activé dans la config (sinon non revu/non visible).
      const isoDob = (fieldsConfig.predefined.date_naissance && /^\d{4}-\d{2}-\d{2}$/.test(ex.date_naissance || ''))
        ? ex.date_naissance : '';
      setForm(prev => ({
        ...prev,
        prenom: ex.prenom || prev.prenom,
        nom: ex.nom || prev.nom,
        email: ex.email || prev.email,
        telephone: ex.telephone ? formaterTelephone(ex.telephone) : prev.telephone,
        date_naissance: isoDob || prev.date_naissance,
        notes: ex.notes ? (prev.notes ? `${prev.notes}\n${ex.notes}` : ex.notes) : prev.notes,
      }));
      // Adresse (mode particulier = champ adressePostale, format "rue\nCP ville")
      const rue = (ex.adresse_rue || '').trim();
      const cpVille = [(ex.code_postal || '').trim(), (ex.ville || '').trim()].filter(Boolean).join(' ');
      const adresseExtraite = [rue, cpVille].filter(Boolean).join('\n');
      if (adresseExtraite && fieldsConfig.predefined.adresse) setAdressePostale(adresseExtraite);
      // Force le remount des sous-champs date/adresse pour qu'ils affichent les valeurs
      setPrefillKey(k => k + 1);
      setPrefilled(true);
      setTimeout(() => setPrefilled(false), 2000);
      toast.success('Photo lue ! Vérifie et complète avant d\'enregistrer.');
    } catch (err) {
      toast.error(err.message || 'Lecture de la photo impossible.');
    } finally {
      setExtracting(false);
    }
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
        statut,
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
        payload.date_naissance = form.date_naissance || null;
        payload.adresse_postale = adressePostale.trim() || null;
        // Champs perso (config v40) — stockés dans clients.custom_fields JSONB
        payload.custom_fields = customValues && Object.keys(customValues).length > 0
          ? customValues
          : null;
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
              <label className="form-label" htmlFor="nc-nom-structure">Nom de la structure *</label>
              <input
                id="nc-nom-structure"
                className={`izi-input ${prefilled ? 'izi-input-prefilled' : ''}`}
                type="text"
                value={form.nom_structure}
                onChange={handleChange('nom_structure')}
                placeholder="YogaFacile, Studio Zen..."
                required
                aria-required="true"
              />
            </div>

            <ValidatedInput
              id="nc-siret"
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
              <label className="form-label" htmlFor="nc-adresse">Adresse</label>
              <input
                id="nc-adresse"
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
              id="nc-email-pro"
              label="Email"
              value={form.email}
              onChange={v => updateField('email', v)}
              validate={validerEmail}
              type="email"
              placeholder="contact@structure.com"
            />

            <ValidatedInput
              id="nc-tel-pro"
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
                    <button type="button" className="lieu-delete" onClick={() => removeLieu(idx)} aria-label="Supprimer le lieu">
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
              <button type="button" className="izi-btn izi-btn-secondary add-btn" onClick={addLieu} disabled={!newLieuNom.trim()} aria-label="Ajouter un lieu">
                <Plus size={18} />
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Mode Particulier */}

            {/* Import depuis une photo : carte de visite, fiche papier, capture… */}
            <div className="photo-import">
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoSelect}
                hidden
              />
              <button
                type="button"
                className="izi-btn izi-btn-ghost photo-import-btn"
                onClick={() => photoInputRef.current?.click()}
                disabled={extracting}
              >
                {extracting
                  ? <><Loader2 size={16} className="spin" /> Lecture de la photo…</>
                  : <><Camera size={16} /> Remplir depuis une photo</>}
              </button>
              <p className="photo-import-hint">
                Carte de visite, fiche papier ou capture d'écran — l'IA pré-remplit, tu vérifies.
              </p>
              {prefilled && (
                <div className="prefill-badge">
                  <Sparkles size={14} /> Informations préremplies
                </div>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="nc-prenom">Prénom</label>
                <input id="nc-prenom" className={`izi-input ${prefilled ? 'izi-input-prefilled' : ''}`} type="text" value={form.prenom} onChange={handleChange('prenom')} placeholder="Marie" />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="nc-nom">Nom *</label>
                <input id="nc-nom" className={`izi-input ${prefilled ? 'izi-input-prefilled' : ''}`} type="text" value={form.nom} onChange={handleChange('nom')} placeholder="Dupont" required aria-required="true" />
              </div>
            </div>

            <ValidatedInput
              id="nc-email"
              label="Email"
              value={form.email}
              onChange={v => updateField('email', v)}
              validate={validerEmail}
              type="email"
              placeholder="marie@email.com"
            />

            <ValidatedInput
              id="nc-telephone"
              label="Téléphone"
              value={form.telephone}
              onChange={v => updateField('telephone', v)}
              validate={validerTelephone}
              format={formaterTelephone}
              inputMode="tel"
              placeholder="06 12 34 56 78"
            />

            {fieldsConfig.predefined.date_naissance && (
              <div className="form-group">
                <label className="form-label" htmlFor="nc-date-naissance">
                  Date de naissance{' '}
                  <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                    — pour envoyer un mot doux le jour J 🎂
                  </span>
                </label>
                <DateNaissanceInput
                  key={`dob-${prefillKey}`}
                  id="nc-date-naissance"
                  className="izi-input"
                  value={form.date_naissance}
                  onChange={handleChange('date_naissance')}
                />
              </div>
            )}

            {fieldsConfig.predefined.adresse && (
              <div className="form-group">
                <label className="form-label" htmlFor="nc-adresse-postale">Adresse postale</label>
                <AdresseInput
                  key={`addr-${prefillKey}`}
                  id="nc-adresse-postale"
                  value={adressePostale}
                  onChange={setAdressePostale}
                />
              </div>
            )}

            {(fieldsConfig.predefined.niveau || fieldsConfig.predefined.source) && (
              <div className="form-row">
                {fieldsConfig.predefined.niveau && (
                  <div className="form-group">
                    <label className="form-label" htmlFor="nc-niveau">Niveau</label>
                    <select id="nc-niveau" className="izi-input" value={form.niveau} onChange={handleChange('niveau')}>
                      <option value="">-- Choisir --</option>
                      <option value="Débutant">Débutant</option>
                      <option value="Intermédiaire">Intermédiaire</option>
                      <option value="Avancé">Avancé</option>
                    </select>
                  </div>
                )}
                {fieldsConfig.predefined.source && (
                  <div className="form-group">
                    <label className="form-label" htmlFor="nc-source">Source</label>
                    <select id="nc-source" className="izi-input" value={form.source} onChange={handleChange('source')}>
                      <option value="">-- Choisir --</option>
                      <option value="Bouche à oreille">Bouche à oreille</option>
                      <option value="Instagram">Instagram</option>
                      <option value="Site web">Site web</option>
                      <option value="Événement">Événement</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Champs perso configurés par la prof */}
            {fieldsConfig.custom.length > 0 && (
              <>
                <div className="section-label" style={{ marginTop: 8 }}>Infos perso</div>
                {fieldsConfig.custom.map(cf => (
                  <div key={cf.id} className="form-group">
                    <label className="form-label">{cf.label || '(sans nom)'}</label>
                    {cf.type === 'textarea' ? (
                      <textarea
                        className="izi-input"
                        rows={2}
                        value={customValues[cf.id] || ''}
                        onChange={e => setCustomValues(prev => ({ ...prev, [cf.id]: e.target.value }))}
                      />
                    ) : cf.type === 'select' ? (
                      <select
                        className="izi-input"
                        value={customValues[cf.id] || ''}
                        onChange={e => setCustomValues(prev => ({ ...prev, [cf.id]: e.target.value }))}
                      >
                        <option value="">-- Choisir --</option>
                        {(cf.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : (
                      <input
                        className="izi-input"
                        type={cf.type === 'number' ? 'number' : cf.type === 'date' ? 'date' : 'text'}
                        value={customValues[cf.id] || ''}
                        onChange={e => setCustomValues(prev => ({ ...prev, [cf.id]: e.target.value }))}
                      />
                    )}
                  </div>
                ))}
              </>
            )}
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

        {/* Statut */}
        <div className="form-group">
          <label className="form-label">Statut</label>
          <div className="statut-chips">
            {Object.entries(STATUTS_CLIENT).filter(([k]) => k !== 'archive').map(([key, info]) => (
              <button
                key={key}
                type="button"
                className={`izi-badge izi-badge-${info.color} statut-chip ${statut === key ? 'statut-chip-active' : 'statut-chip-inactive'}`}
                onClick={() => setStatut(key)}
              >
                {info.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="form-group">
          <label className="form-label" htmlFor="nc-notes">Notes</label>
          <textarea
            id="nc-notes"
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

        /* Import depuis une photo */
        .photo-import {
          display: flex; flex-direction: column; align-items: flex-start; gap: 6px;
          padding: 14px; margin-bottom: 4px;
          background: var(--brand-light, #f5f3ef);
          border: 1px dashed var(--brand, #b08968);
          border-radius: var(--radius-md, 12px);
        }
        .photo-import-btn { align-self: stretch; justify-content: center; }
        @media (min-width: 600px) { .photo-import-btn { align-self: flex-start; } }
        .photo-import-hint { margin: 0; font-size: 0.75rem; color: var(--text-muted); line-height: 1.4; }
        .spin { animation: photoSpin 0.8s linear infinite; }
        @keyframes photoSpin { to { transform: rotate(360deg); } }

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

        .statut-chips { display: flex; flex-wrap: wrap; gap: 6px; }
        .statut-chip { cursor: pointer; border: none; font-size: 0.75rem; padding: 4px 12px; transition: all 0.15s ease; }
        .statut-chip-inactive { opacity: 0.4; filter: grayscale(0.5); }
        .statut-chip-active { opacity: 1; filter: none; box-shadow: 0 0 0 2px var(--brand); }
      `}</style>
    </div>
  );
}
