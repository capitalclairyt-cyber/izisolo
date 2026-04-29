'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Save, Palette, User, Building2, Bell, MapPin,
  Plus, X, Trash2, Flower2, Sliders, Crown, Mail, Home,
  Eye, Settings, Zap, Gift, ToggleLeft, ToggleRight, Cake,
  CreditCard, Copy, Check, ExternalLink, AlertCircle, Loader2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { useToast } from '@/components/ui/ToastProvider';
import { METIERS } from '@/lib/constantes';
import BackgroundDecor, { ILLUSTRATION_OPTIONS } from '@/components/background/BackgroundDecor';
import ReglesTab from './ReglesTab';
import PhotoUploader from '@/components/ui/PhotoUploader';
import PalettePicker from '@/components/settings/PalettePicker';

const PALETTES = [
  { id: 'rose', label: 'Rose', color: '#d4a0a0' },
  { id: 'ocean', label: 'Océan', color: '#7aa0c4' },
  { id: 'foret', label: 'Forêt', color: '#7ab07a' },
  { id: 'soleil', label: 'Soleil', color: '#d4b06a' },
  { id: 'lavande', label: 'Lavande', color: '#a890c4' },
  { id: 'terre', label: 'Terre', color: '#c4956a' },
];

const TABS = [
  { id: 'profil',        label: 'Profil',        icon: User },
  { id: 'reglages',      label: 'Réglages',      icon: Sliders },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'regles',        label: 'Règles',        icon: Zap },
  { id: 'abonnement',    label: 'Abonnement',    icon: Crown },
];

const ANNIV_MODES = [
  { id: 'off',    label: 'Désactivé',  desc: 'Aucune alerte anniversaire' },
  { id: 'manuel', label: 'Manuel',     desc: 'Notification uniquement, tu envoies toi-même' },
  { id: 'semi',   label: 'Semi-auto',  desc: 'Notification + confirmation avant envoi' },
  { id: 'auto',   label: 'Automatique',desc: 'Envoi automatique sans confirmation' },
];

const REGLAGES_SUBTABS = [
  { id: 'apparences', label: 'Apparences', icon: Eye },
  { id: 'general', label: 'Général', icon: Settings },
];

// ════════════════════════════════════════════════════════════════════════════
// Section "Notifications élèves" — emails/SMS automatiques que l'app envoie
// directement aux élèves. Le pro coche ce qu'il veut activer.
// ════════════════════════════════════════════════════════════════════════════
const NOTIFS_TYPES = [
  { key: 'cours_annule',       label: 'Cours annulé par mes soins',       desc: "Email/SMS automatique aux inscrits quand j'annule un cours." },
  { key: 'annulation_tardive', label: 'Annulation tardive — séance comptée', desc: "L'élève reçoit un rappel transparent : sa séance a été décomptée." },
  { key: 'credits_faibles',    label: 'Crédits faibles',                  desc: "Quand il reste peu de séances sur un carnet (seuil dans Notifications)." },
  { key: 'expiration_abo',     label: 'Expiration prochaine d\'abonnement', desc: "X jours avant la date de fin (seuil dans Notifications)." },
];

function NotifsElevesSection({ profile, setProfile, setDirty }) {
  const [smsConso, setSmsConso] = useState(null);
  const notifs = profile?.notifs_eleves || {};
  const smsGlobalOff = notifs.sms_global_off === true;
  const seuilMois = profile?.sms_seuil_mois ?? '';

  // Charger la conso SMS du mois pour info au pro
  useEffect(() => {
    if (!profile?.id) return;
    const supabase = createClient();
    const debutMois = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    supabase
      .from('notifications_eleves')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profile.id)
      .eq('channel', 'sms')
      .eq('statut', 'sent')
      .gte('sent_at', debutMois)
      .then(({ count }) => setSmsConso(count || 0));
  }, [profile?.id]);

  const toggle = (typeKey, channel) => () => {
    const current = notifs[typeKey] || { email: false, sms: false };
    setProfile(prev => ({
      ...prev,
      notifs_eleves: {
        ...(prev?.notifs_eleves || {}),
        [typeKey]: { ...current, [channel]: !current[channel] },
      },
    }));
    setDirty(true);
  };

  const toggleSmsGlobalOff = () => {
    setProfile(prev => ({
      ...prev,
      notifs_eleves: {
        ...(prev?.notifs_eleves || {}),
        sms_global_off: !smsGlobalOff,
      },
    }));
    setDirty(true);
  };

  const updateSeuilMois = (val) => {
    setProfile(prev => ({ ...prev, sms_seuil_mois: val === '' ? null : Math.max(0, parseInt(val) || 0) }));
    setDirty(true);
  };

  // Alerte si on s'approche du seuil
  const alerteSeuil = seuilMois && smsConso !== null && smsConso >= (seuilMois * 0.8);
  const seuilAtteint = seuilMois && smsConso !== null && smsConso >= seuilMois;

  return (
    <div className="section izi-card">
      <div className="section-top">
        <div className="section-icon"><Bell size={20} /></div>
        <h2>Notifications élèves automatiques</h2>
      </div>
      <p className="section-desc">
        L'app envoie ces emails (et SMS) <strong>directement à tes élèves</strong>, en ton nom.
        Tu n'as plus rien à faire à la main.
      </p>

      {/* Master kill-switch SMS */}
      <div className={`sms-master ${smsGlobalOff ? 'off' : ''}`}>
        <div className="sms-master-left">
          <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>
            {smsGlobalOff ? '🔇 Tous les SMS sont coupés' : '📱 SMS activés'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {smsGlobalOff
              ? 'Aucun SMS ne sera envoyé, même si tu coches une case ci-dessous.'
              : 'Master switch — coupe tout d\'un coup en cas de doute sur la facture.'}
          </div>
        </div>
        <button type="button" onClick={toggleSmsGlobalOff} className="toggle-btn-mini" aria-label={smsGlobalOff ? 'Réactiver les SMS' : 'Couper tous les SMS'}>
          {smsGlobalOff ? <ToggleLeft size={32} style={{ color: '#dc2626' }} /> : <ToggleRight size={32} style={{ color: 'var(--brand)' }} />}
        </button>
      </div>

      <table className="notifs-table">
        <thead>
          <tr>
            <th>Type</th>
            <th style={{ width: 80, textAlign: 'center' }}>Email</th>
            <th style={{ width: 80, textAlign: 'center' }}>SMS</th>
          </tr>
        </thead>
        <tbody>
          {NOTIFS_TYPES.map(t => {
            const pref = notifs[t.key] || { email: false, sms: false };
            return (
              <tr key={t.key}>
                <td>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{t.label}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{t.desc}</div>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button type="button" onClick={toggle(t.key, 'email')} className="toggle-btn-mini">
                    {pref.email ? <ToggleRight size={26} style={{ color: 'var(--brand)' }} /> : <ToggleLeft size={26} style={{ color: 'var(--text-muted)' }} />}
                  </button>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={toggle(t.key, 'sms')}
                    className="toggle-btn-mini"
                    disabled={smsGlobalOff}
                    style={{ opacity: smsGlobalOff ? 0.3 : 1 }}
                  >
                    {pref.sms ? <ToggleRight size={26} style={{ color: 'var(--brand)' }} /> : <ToggleLeft size={26} style={{ color: 'var(--text-muted)' }} />}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{
        marginTop: 16, padding: 14, background: 'var(--bg-soft, #faf8f5)',
        border: '1px dashed var(--border)', borderRadius: 12,
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>📱 SMS — facturation au volume</span>
          {smsConso !== null && (
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              <strong>{smsConso} SMS</strong> ce mois · <strong>{(smsConso * 0.08).toFixed(2).replace('.', ',')} €</strong>
            </span>
          )}
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
          Les SMS sont facturés <strong>0,08 € l'unité</strong> sur ta facture IziSolo. Les emails restent gratuits, illimités.
        </p>

        {/* Seuil mensuel optionnel */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <label htmlFor="sms_seuil" style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            🛡️ Bloquer après
          </label>
          <input
            id="sms_seuil"
            type="number"
            min="0"
            placeholder="illimité"
            value={seuilMois}
            onChange={(e) => updateSeuilMois(e.target.value)}
            style={{ width: 90, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.875rem', textAlign: 'right' }}
          />
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>SMS / mois</span>
        </div>
        {seuilAtteint && (
          <div style={{ fontSize: '0.75rem', background: '#fee2e2', color: '#991b1b', padding: '6px 10px', borderRadius: 8, fontWeight: 600 }}>
            ⛔ Seuil atteint — les nouveaux SMS sont bloqués jusqu'au mois prochain.
          </div>
        )}
        {alerteSeuil && !seuilAtteint && (
          <div style={{ fontSize: '0.75rem', background: '#fef3c7', color: '#854d0e', padding: '6px 10px', borderRadius: 8, fontWeight: 600 }}>
            ⚠️ Tu as utilisé {smsConso}/{seuilMois} SMS ce mois.
          </div>
        )}
      </div>

      <style jsx global>{`
        .notifs-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        .notifs-table th { font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; padding: 8px 0; border-bottom: 1px solid var(--border); text-align: left; }
        .notifs-table td { padding: 12px 0; border-bottom: 1px solid var(--border); vertical-align: middle; }
        .notifs-table tr:last-child td { border-bottom: none; }
        .toggle-btn-mini { background: none; border: none; cursor: pointer; padding: 0; display: inline-flex; }
        .toggle-btn-mini:disabled { cursor: not-allowed; }

        .sms-master {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; padding: 12px 14px; border-radius: 12px;
          background: var(--brand-light); border: 1px solid var(--brand-200, #f0d0d0);
          margin: 12px 0;
        }
        .sms-master.off {
          background: #fef2f2; border-color: #fecaca;
        }
        .sms-master-left { flex: 1; }
      `}</style>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Section "Abonnement" — Stripe SaaS Mélutek
// 2 plans payants (Solo 9€ / Pro 19€) en mensuel ou annuel (-20%)
// ════════════════════════════════════════════════════════════════════════════
function AbonnementCheckout({ currentPlan }) {
  const [annuel, setAnnuel] = useState(false);
  const [loading, setLoading] = useState(null); // 'solo' | 'pro' | null

  const PLANS_PUB = [
    { id: 'solo', nom: 'Solo', prix: { mensuel: '9 €', annuel: '7,20 €' }, sub: { mensuel: '/mois', annuel: '/mois (86 €/an)' }, desc: 'Élèves illimités, mailing automatisé.', features: ['Élèves illimités', 'Email auto', 'Notifications', 'Support email'] },
    { id: 'pro',  nom: 'Pro',  prix: { mensuel: '19 €', annuel: '15,20 €' }, sub: { mensuel: '/mois', annuel: '/mois (182 €/an)' }, desc: 'Multi-prof + Stripe Payment Link + vidéos.', features: ['Tout Solo', 'Stripe Payment Link', 'Multi-utilisateurs', 'Vidéos cours', 'Support prioritaire'] },
  ];

  const subscribe = async (plan) => {
    setLoading(plan);
    try {
      const res = await fetch('/api/stripe/checkout-saas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, periode: annuel ? 'annuel' : 'mensuel' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur');
      if (json.url) window.location.href = json.url;
    } catch (err) {
      alert('Erreur : ' + err.message);
      setLoading(null);
    }
  };

  return (
    <div className="section izi-card">
      <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, marginBottom: 4 }}>Passer à la vitesse supérieure</h2>
      <p className="section-desc">Débloque toutes les fonctionnalités pour développer ton activité.</p>

      <div style={{ display: 'inline-flex', background: 'var(--bg-soft, #faf8f5)', border: '1px solid var(--border)', borderRadius: 999, padding: 4, gap: 2, marginBottom: 16 }}>
        <button onClick={() => setAnnuel(false)} style={pillStyle(!annuel)}>Mensuel</button>
        <button onClick={() => setAnnuel(true)} style={pillStyle(annuel)}>Annuel <span style={{ background: '#10b981', color: 'white', fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: 99, marginLeft: 4 }}>−20%</span></button>
      </div>

      <div className="plans-grid">
        {PLANS_PUB.map(p => {
          const isCurrent = currentPlan === p.id;
          return (
            <div key={p.id} className={`plan-card ${p.id === 'pro' ? 'recommended' : ''}`}>
              {p.id === 'pro' && <div className="plan-badge">Recommandé</div>}
              <div className="plan-name">{p.nom}</div>
              <div className="plan-price">
                <span className="plan-amount">{annuel ? p.prix.annuel : p.prix.mensuel}</span>
                <span className="plan-period">{annuel ? p.sub.annuel : p.sub.mensuel}</span>
              </div>
              <p className="plan-desc">{p.desc}</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                {p.features.map(f => <li key={f} style={{ padding: '3px 0' }}>✓ {f}</li>)}
              </ul>
              <button
                onClick={() => subscribe(p.id)}
                disabled={isCurrent || loading === p.id}
                className={`izi-btn ${p.id === 'pro' ? 'izi-btn-primary' : 'izi-btn-secondary'} plan-cta`}
              >
                {isCurrent ? 'Plan actuel' : loading === p.id ? 'Redirection…' : `Passer à ${p.nom}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  function pillStyle(active) {
    return {
      padding: '6px 14px', borderRadius: 999, border: 'none',
      background: active ? 'var(--brand)' : 'transparent',
      color: active ? 'white' : 'var(--text-secondary)',
      fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
      display: 'inline-flex', alignItems: 'center',
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Section "Règles d'annulation" — l'app applique automatiquement les règles
// configurées ici (délai libre, séance comptée si tardive). La prof n'a plus à
// se positionner en "méchant·e" face à ses élèves.
// ════════════════════════════════════════════════════════════════════════════
const DELAIS_PRESETS = [
  { value: 6,   label: '6 heures', sub: 'très souple' },
  { value: 12,  label: '12 heures', sub: 'demi-journée' },
  { value: 24,  label: '24 heures', sub: 'recommandé' },
  { value: 48,  label: '48 heures', sub: 'pour cours premium' },
  { value: 72,  label: '72 heures', sub: 'stages et ateliers' },
];

function ReglesAnnulationSection({ profile, setProfile, setDirty }) {
  const regles = profile?.regles_annulation || {};
  const delai = typeof regles.delai_heures === 'number' ? regles.delai_heures : 24;
  const message = regles.message || '';

  const updateRegles = (patch) => {
    setProfile(prev => ({
      ...prev,
      regles_annulation: { ...(prev?.regles_annulation || {}), ...patch },
    }));
    setDirty(true);
  };

  return (
    <div className="section izi-card">
      <div className="section-top">
        <div className="section-icon"><AlertCircle size={20} /></div>
        <h2>Règles d'annulation</h2>
      </div>
      <p className="section-desc">
        L'app applique automatiquement ces règles. <strong>Au-delà du délai, la séance est comptée</strong> dans le crédit de l'élève — tu n'as plus besoin d'expliquer toi-même la règle.
      </p>

      <div className="form-group">
        <label className="form-label">Délai libre d'annulation avant le cours</label>
        <div className="ra-presets">
          {DELAIS_PRESETS.map(p => (
            <button
              key={p.value}
              type="button"
              onClick={() => updateRegles({ delai_heures: p.value })}
              className={`ra-preset-btn ${delai === p.value ? 'active' : ''}`}
            >
              <span className="ra-preset-label">{p.label}</span>
              <span className="ra-preset-sub">{p.sub}</span>
            </button>
          ))}
        </div>
        <p className="form-hint">
          En-deçà de ce délai, l'élève peut toujours annuler depuis son espace, mais
          la séance sera décomptée de son carnet/abonnement (ou marquée due si pas de crédit).
        </p>
      </div>

      <div className="form-group">
        <label className="form-label">Message affiché à l'élève (optionnel)</label>
        <input
          type="text"
          className="izi-input"
          value={message}
          onChange={e => updateRegles({ message: e.target.value })}
          placeholder={`Ex : Annulation acceptée jusqu'à ${delai}h avant le cours`}
          maxLength={200}
        />
        <p className="form-hint">
          Si vide, l'app affiche automatiquement <em>« Annulation libre jusqu'au [date limite] »</em>.
        </p>
      </div>

      <div className="ra-preview">
        <strong>Aperçu côté élève :</strong>
        <p>
          Annulation libre jusqu'à <strong>{delai}h avant le cours</strong>.
          Après, la séance sera décomptée de ton crédit.
        </p>
      </div>

      <style jsx global>{`
        .ra-presets {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
          gap: 8px; margin-top: 4px;
        }
        .ra-preset-btn {
          display: flex; flex-direction: column; align-items: center; gap: 2px;
          padding: 12px 8px; border-radius: 12px;
          border: 1.5px solid var(--border); background: white;
          cursor: pointer; transition: all 0.15s;
        }
        .ra-preset-btn:hover { border-color: var(--brand); }
        .ra-preset-btn.active {
          border-color: var(--brand);
          background: var(--brand-light);
        }
        .ra-preset-label { font-weight: 600; font-size: 0.875rem; color: var(--text-primary); }
        .ra-preset-sub { font-size: 0.7rem; color: var(--text-muted); }
        .ra-preset-btn.active .ra-preset-label { color: var(--brand-700); }
        .ra-preview {
          background: var(--bg-soft, #faf8f5);
          border: 1px dashed var(--border);
          border-radius: 10px;
          padding: 12px 14px;
          margin-top: 14px;
          font-size: 0.8125rem;
          color: var(--text-secondary);
        }
        .ra-preview strong { color: var(--text-primary); }
        .ra-preview p { margin: 6px 0 0; line-height: 1.5; }
      `}</style>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Section "Page publique" — enrichit ce que voient les visiteurs sur /p/[slug]
// Bio, photo, formations, horaires, FAQ, réseaux sociaux. Tous champs optionnels.
// ════════════════════════════════════════════════════════════════════════════
function PagePubliqueSection({ profile, setProfile, setDirty }) {
  const studioSlug = profile?.studio_slug;
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://izisolo.fr';
  const publicUrl = studioSlug ? `${baseUrl}/p/${studioSlug}` : null;
  const previewUrl = publicUrl ? `${publicUrl}?preview=1` : null;
  const [previewLoading, setPreviewLoading] = useState(false);

  const set = (field) => (e) => {
    const value = e?.target ? e.target.value : e;
    setProfile(prev => ({ ...prev, [field]: value }));
    setDirty(true);
  };
  const toggle = (field) => () => {
    setProfile(prev => ({ ...prev, [field]: !prev?.[field] }));
    setDirty(true);
  };

  const openPreview = async () => {
    if (!previewUrl) return;
    setPreviewLoading(true);
    try {
      // Pousser un brouillon contenant les valeurs actuelles non encore sauvegardées
      const draft = {
        bio: profile?.bio || null,
        philosophie: profile?.philosophie || null,
        formations: profile?.formations || null,
        annees_experience: profile?.annees_experience ? parseInt(profile.annees_experience) : null,
        horaires_studio: profile?.horaires_studio || null,
        afficher_tarifs: profile?.afficher_tarifs === true,
        faq_publique: profile?.faq_publique || [],
        photo_url: profile?.photo_url || null,
        photo_couverture: profile?.photo_couverture || null,
        instagram_url: profile?.instagram_url || null,
        facebook_url: profile?.facebook_url || null,
        website_url: profile?.website_url || null,
      };
      await fetch('/api/profile/page-publique', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      window.open(previewUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('[preview] save draft err:', err);
      window.open(previewUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setPreviewLoading(false);
    }
  };

  // FAQ : array de { q, a }
  const faq = Array.isArray(profile?.faq_publique) ? profile.faq_publique : [];
  const updateFaq = (next) => {
    setProfile(prev => ({ ...prev, faq_publique: next }));
    setDirty(true);
  };
  const addFaq = () => updateFaq([...faq, { q: '', a: '' }]);
  const removeFaq = (i) => updateFaq(faq.filter((_, idx) => idx !== i));
  const editFaq = (i, key, value) =>
    updateFaq(faq.map((item, idx) => idx === i ? { ...item, [key]: value } : item));

  return (
    <div className="section izi-card">
      <div className="section-top">
        <div className="section-icon"><Eye size={20} /></div>
        <h2>Ma page publique</h2>
        {publicUrl && (
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="page-public-preview"
            title="Voir ma page publique"
          >
            <ExternalLink size={13} /> Voir
          </a>
        )}
      </div>
      <p className="section-desc">
        Tout ce que tes futur·e·s élèves voient sur <strong>{publicUrl || 'ta page'}</strong>. Tous les champs sont optionnels — laisse vide ce que tu ne veux pas montrer.
      </p>

      {/* Workflow brouillon → aperçu → publication */}
      {studioSlug && (
        <div className="page-pub-workflow">
          <div className="page-pub-workflow-info">
            <strong>Aperçu avant publication</strong> — visualise tes modifs comme tes élèves les verront, avant de cliquer Enregistrer en bas de page.
          </div>
          <div className="page-pub-workflow-actions">
            <button
              type="button"
              onClick={openPreview}
              disabled={previewLoading}
              className="izi-btn izi-btn-secondary"
            >
              <Eye size={14} /> {previewLoading ? 'Préparation…' : "Voir l'aperçu"}
            </button>
          </div>
        </div>
      )}

      {/* Photo de profil — upload direct via Vercel Blob, resize 1024px côté client */}
      <div className="form-group">
        <label className="form-label"><User size={14} /> Photo de profil</label>
        <PhotoUploader
          currentUrl={profile?.photo_url || null}
          kind="profil"
          onUploaded={(url) => {
            setProfile(prev => ({ ...prev, photo_url: url }));
            // Pas de setDirty : la mise à jour DB est faite côté API (immédiate)
          }}
          label="Téléverser une photo"
        />
        <p className="form-hint" style={{ marginTop: 8 }}>
          JPG, PNG ou WebP, max 8 Mo (resize automatique à 1024×1024 avant envoi).
        </p>
      </div>

      {/* Bio */}
      <div className="form-group">
        <label className="form-label">Bio courte</label>
        <textarea
          className="izi-input"
          rows={3}
          value={profile?.bio || ''}
          onChange={set('bio')}
          placeholder="Ex : Prof de Hatha & Vinyasa depuis 8 ans. J'ai à cœur de transmettre une pratique douce et accessible…"
          maxLength={400}
        />
        <p className="form-hint">~2-3 phrases pour te présenter. {(profile?.bio || '').length}/400</p>
      </div>

      {/* Années d'expérience + formations */}
      <div className="form-row">
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Années d'expérience</label>
          <input
            type="number"
            min="0"
            max="80"
            className="izi-input"
            value={profile?.annees_experience || ''}
            onChange={set('annees_experience')}
            placeholder="Ex : 8"
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Formations / certifications</label>
        <textarea
          className="izi-input"
          rows={2}
          value={profile?.formations || ''}
          onChange={set('formations')}
          placeholder="Ex : RYT 500 — Yoga Alliance · Diplôme Hatha (Sivananda) · Formation prénatal"
        />
      </div>

      {/* Philosophie */}
      <div className="form-group">
        <label className="form-label">Ma philosophie / ce qui me rend unique</label>
        <textarea
          className="izi-input"
          rows={3}
          value={profile?.philosophie || ''}
          onChange={set('philosophie')}
          placeholder="Ex : Mes cours mêlent rigueur de la posture et écoute du souffle. Je crois qu'un yoga juste se construit lentement, sans course à la performance…"
          maxLength={600}
        />
      </div>

      {/* Horaires */}
      <div className="form-group">
        <label className="form-label">Horaires d'ouverture du studio</label>
        <textarea
          className="izi-input"
          rows={2}
          value={profile?.horaires_studio || ''}
          onChange={set('horaires_studio')}
          placeholder={'Ex :\nLun–Ven 9h–20h · Sam 10h–14h · Dim fermé'}
        />
      </div>

      {/* Tarifs visibles */}
      <div className="form-group toggle-row">
        <button
          type="button"
          onClick={toggle('afficher_tarifs')}
          className="toggle-btn"
          aria-pressed={profile?.afficher_tarifs === true}
        >
          {profile?.afficher_tarifs ? <ToggleRight size={28} style={{ color: 'var(--brand)' }} /> : <ToggleLeft size={28} style={{ color: 'var(--text-muted)' }} />}
          <span>Afficher mes tarifs (offres) sur ma page publique</span>
        </button>
        <p className="form-hint">Liste tes carnets, abonnements et cours unitaires actifs avec leur prix.</p>
      </div>

      {/* Réseaux sociaux */}
      <div className="form-group">
        <label className="form-label">Réseaux sociaux & site</label>
        <div className="form-row">
          <input
            type="url"
            className="izi-input"
            value={profile?.instagram_url || ''}
            onChange={set('instagram_url')}
            placeholder="https://instagram.com/…"
          />
          <input
            type="url"
            className="izi-input"
            value={profile?.facebook_url || ''}
            onChange={set('facebook_url')}
            placeholder="https://facebook.com/…"
          />
        </div>
        <input
          type="url"
          className="izi-input"
          value={profile?.website_url || ''}
          onChange={set('website_url')}
          placeholder="https://mon-site.fr"
          style={{ marginTop: 8 }}
        />
      </div>

      {/* FAQ publique */}
      <div className="form-group">
        <label className="form-label">FAQ — questions de tes élèves</label>
        <p className="form-hint" style={{ marginTop: 0, marginBottom: 8 }}>
          Anticipe les questions classiques (« dois-je amener mon tapis ? », « où me garer ? »).
        </p>
        <div className="faq-editor-list">
          {faq.map((item, i) => (
            <div key={i} className="faq-editor-item">
              <input
                className="izi-input"
                value={item.q || ''}
                onChange={e => editFaq(i, 'q', e.target.value)}
                placeholder="Question"
              />
              <textarea
                className="izi-input"
                rows={2}
                value={item.a || ''}
                onChange={e => editFaq(i, 'a', e.target.value)}
                placeholder="Réponse"
              />
              <button
                type="button"
                onClick={() => removeFaq(i)}
                className="izi-btn izi-btn-ghost faq-remove-btn"
                aria-label="Supprimer cette question"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addFaq} className="izi-btn izi-btn-secondary" style={{ marginTop: 8 }}>
          <Plus size={14} /> Ajouter une question
        </button>
      </div>

      <style jsx global>{`
        .page-public-preview {
          margin-left: auto;
          display: inline-flex; align-items: center; gap: 4px;
          padding: 5px 10px; border-radius: 999px;
          background: var(--brand-light); color: var(--brand-700);
          font-size: 0.75rem; font-weight: 600;
          text-decoration: none;
          border: 1px solid var(--brand-200, #f0d0d0);
        }
        .page-public-preview:hover { background: var(--brand); color: white; }
        .page-pub-workflow {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; flex-wrap: wrap;
          padding: 12px 14px; margin: 4px 0 16px;
          background: var(--bg-soft, #faf8f5);
          border: 1px solid var(--border); border-radius: 12px;
        }
        .page-pub-workflow-info { font-size: 0.8125rem; color: var(--text-secondary); flex: 1; min-width: 220px; }
        .page-pub-workflow-info strong { color: var(--text-primary); font-weight: 600; }
        .page-pub-workflow-actions { display: flex; gap: 6px; flex-shrink: 0; }
        .toggle-row .toggle-btn {
          display: inline-flex; align-items: center; gap: 10px;
          background: none; border: none; cursor: pointer;
          padding: 0; font-size: 0.875rem; color: var(--text-primary);
          font-weight: 500;
        }
        .form-hint { font-size: 0.75rem; color: var(--text-muted); margin-top: 4px; line-height: 1.4; }
        .faq-editor-list { display: flex; flex-direction: column; gap: 12px; margin-top: 4px; }
        .faq-editor-item {
          display: grid;
          grid-template-columns: 1fr 36px;
          grid-template-areas: "q remove" "a remove";
          gap: 8px;
          padding: 12px;
          background: var(--bg-soft, #faf8f5);
          border: 1px solid var(--border);
          border-radius: 10px;
        }
        .faq-editor-item input { grid-area: q; }
        .faq-editor-item textarea { grid-area: a; resize: vertical; min-height: 60px; font-family: inherit; }
        .faq-remove-btn {
          grid-area: remove; padding: 0; width: 36px; min-height: 36px;
          color: var(--danger, #dc2626);
          align-self: start;
        }
      `}</style>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Section "Paiement en ligne (Stripe)"
// Le pro renseigne son webhook signing secret. IziSolo lui affiche l'URL endpoint
// à coller dans son dashboard Stripe (avec son profile_id en query param pour le retrouver).
// ════════════════════════════════════════════════════════════════════════════
function StripePaiementSection({ profile, setProfile, setDirty }) {
  const [copied, setCopied] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://izisolo.fr';
  const webhookUrl = profile?.id ? `${baseUrl}/api/stripe/webhook?profile=${profile.id}` : '';
  const secret = profile?.stripe_webhook_secret || '';
  const configured = !!secret;

  const copyWebhookUrl = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleSecretChange = (e) => {
    setProfile(prev => ({ ...prev, stripe_webhook_secret: e.target.value }));
    setDirty(true);
  };

  return (
    <div className="section izi-card">
      <div className="section-top">
        <div className="section-icon"><CreditCard size={20} /></div>
        <h2>Paiement en ligne</h2>
        {configured && (
          <span className="stripe-status-pill"><Check size={11} /> Configuré</span>
        )}
      </div>
      <p className="section-desc">
        Branche Stripe pour permettre à tes élèves de payer leurs carnets et abonnements
        par CB depuis ton portail. <strong>Frais de fonctionnement IziSolo : 1%</strong> du volume — ajoutés
        à ta facture mensuelle, jamais prélevés sur tes paiements.
      </p>

      <div className="stripe-config">
        <div className="stripe-step">
          <span className="stripe-step-num">1</span>
          <div className="stripe-step-body">
            <strong>URL d'endpoint à configurer sur Stripe</strong>
            <div className="stripe-url-row">
              <code className="stripe-url-code">{webhookUrl}</code>
              <button type="button" onClick={copyWebhookUrl} className="stripe-copy-btn">
                {copied ? <><Check size={13} /> Copié</> : <><Copy size={13} /> Copier</>}
              </button>
            </div>
            <p className="stripe-step-hint">
              Va sur <a href="https://dashboard.stripe.com/webhooks" target="_blank" rel="noopener noreferrer">dashboard.stripe.com/webhooks</a>
              {' '}→ <strong>+ Add endpoint</strong> → colle l'URL → coche l'événement{' '}
              <code>checkout.session.completed</code> (et optionnellement <code>charge.refunded</code>).
            </p>
          </div>
        </div>

        <div className="stripe-step">
          <span className="stripe-step-num">2</span>
          <div className="stripe-step-body">
            <label className="stripe-label" htmlFor="stripe-webhook-secret">
              <strong>Webhook signing secret</strong>
            </label>
            <p className="stripe-step-hint">
              Une fois l'endpoint créé sur Stripe, clique dessus → onglet <strong>Signing secret</strong> → <strong>Reveal</strong>. Copie le secret (commence par <code>whsec_</code>) et colle-le ci-dessous.
            </p>
            <div className="stripe-secret-row">
              <input
                id="stripe-webhook-secret"
                type={showSecret ? 'text' : 'password'}
                className="izi-input"
                value={secret}
                onChange={handleSecretChange}
                placeholder="whsec_..."
                autoComplete="off"
              />
              <button type="button" onClick={() => setShowSecret(s => !s)} className="stripe-eye-btn">
                {showSecret ? 'Masquer' : 'Afficher'}
              </button>
            </div>
          </div>
        </div>

        <div className="stripe-step">
          <span className="stripe-step-num">3</span>
          <div className="stripe-step-body">
            <strong>Crée tes Payment Links sur tes offres</strong>
            <p className="stripe-step-hint">
              Va dans <a href="/offres/nouveau" target="_blank">Offres → Nouvelle offre</a> et colle un Payment Link Stripe pour chaque carnet/abonnement vendable en ligne.
            </p>
          </div>
        </div>
      </div>

      {!configured && (
        <div className="stripe-warning">
          <AlertCircle size={14} /> Tant que le secret n'est pas renseigné, IziSolo ne pourra pas confirmer automatiquement les paiements Stripe (ils devront être marqués manuellement).
        </div>
      )}

      <style jsx global>{`
        .stripe-status-pill {
          display: inline-flex; align-items: center; gap: 4px;
          background: #ecfdf5; color: #065f46;
          font-size: 0.7rem; font-weight: 700;
          padding: 3px 9px; border-radius: 99px;
          margin-left: auto; border: 1px solid #6ee7b7;
        }
        .stripe-config { display: flex; flex-direction: column; gap: 18px; margin-top: 14px; }
        .stripe-step { display: flex; gap: 12px; }
        .stripe-step-num {
          flex-shrink: 0; width: 26px; height: 26px; border-radius: 50%;
          background: #635bff; color: white;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.8125rem; font-weight: 700;
        }
        .stripe-step-body { flex: 1; min-width: 0; }
        .stripe-step-body strong { display: block; font-size: 0.875rem; color: var(--text-primary); margin-bottom: 6px; }
        .stripe-step-hint { font-size: 0.75rem; color: var(--text-secondary); line-height: 1.5; margin: 4px 0 0; }
        .stripe-step-hint a { color: #635bff; font-weight: 600; }
        .stripe-step-hint code {
          background: var(--bg-soft, #f5f5f5); padding: 1px 5px; border-radius: 4px;
          font-size: 0.7rem; color: var(--text-primary);
        }
        .stripe-url-row { display: flex; gap: 6px; margin-top: 4px; align-items: center; }
        .stripe-url-code {
          flex: 1; min-width: 0; padding: 7px 10px;
          background: var(--bg-soft, #faf8f5); border: 1px solid var(--border);
          border-radius: 6px; font-size: 0.7rem; word-break: break-all;
          color: var(--text-primary);
        }
        .stripe-copy-btn {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 6px 12px; border-radius: 6px;
          background: var(--brand-light); color: var(--brand-700);
          border: 1px solid var(--brand-200, #fbd5d5); cursor: pointer;
          font-size: 0.7rem; font-weight: 600; flex-shrink: 0;
        }
        .stripe-copy-btn:hover { background: var(--brand); color: white; }
        .stripe-secret-row { display: flex; gap: 6px; align-items: center; margin-top: 4px; }
        .stripe-eye-btn {
          padding: 7px 10px; border-radius: 6px; cursor: pointer;
          background: white; border: 1px solid var(--border);
          font-size: 0.7rem; color: var(--text-secondary); flex-shrink: 0;
        }
        .stripe-warning {
          display: flex; align-items: flex-start; gap: 6px;
          margin-top: 14px; padding: 10px 12px;
          background: #fffbeb; border: 1px solid #fcd34d;
          color: #78350f; border-radius: 8px;
          font-size: 0.75rem; line-height: 1.4;
        }
        .stripe-warning svg { flex-shrink: 0; margin-top: 1px; color: #f59e0b; }
        .stripe-label { font-size: 0.875rem; }
      `}</style>
    </div>
  );
}

export default function Parametres() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [profile, setProfile] = useState(null);
  const [lieux, setLieux] = useState([]);
  const [newLieu, setNewLieu] = useState('');
  const [activeTab, setActiveTab] = useState('profil');
  const [reglagesSubTab, setReglagesSubTab] = useState('apparences');
  // Sous-onglet notifications
  const [notifSubTab, setNotifSubTab] = useState('general');
  // Notifications générales
  const [notifNouveauClient, setNotifNouveauClient]       = useState(true);
  const [notifPaiementRetard, setNotifPaiementRetard]     = useState(true);
  const [notifCarnetEpuise, setNotifCarnetEpuise]         = useState(true);
  const [notifAbonnementExpire, setNotifAbonnementExpire] = useState(true);
  // Anniversaires
  const [annivMode, setAnnivMode] = useState('semi');
  const [annivMessage, setAnnivMessage] = useState('');
  const [annivCadeauActif, setAnnivCadeauActif] = useState(false);
  const [annivCadeauOffreId, setAnnivCadeauOffreId] = useState('');
  const [annivCadeauType, setAnnivCadeauType] = useState('gratuit');
  const [annivCadeauRemisePct, setAnnivCadeauRemisePct] = useState(20);
  const [offresDisponibles, setOffresDisponibles] = useState([]);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const [{ data: prof }, { data: lieuxData }, { data: offresData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('lieux').select('*').eq('profile_id', user.id).order('ordre'),
        supabase.from('offres').select('id, nom, prix, type').eq('profile_id', user.id).eq('actif', true).order('nom'),
      ]);

      setProfile(prof);
      setLieux(lieuxData || []);
      setOffresDisponibles(offresData || []);

      // Notifs générales
      setNotifNouveauClient(prof?.notif_nouveau_client !== false);
      setNotifPaiementRetard(prof?.notif_paiement_retard !== false);
      setNotifCarnetEpuise(prof?.notif_carnet_epuise !== false);
      setNotifAbonnementExpire(prof?.notif_abonnement_expire !== false);
      // Anniversaires
      setAnnivMode(prof?.anniversaire_mode || 'semi');
      setAnnivMessage(prof?.anniversaire_message || 'Joyeux anniversaire {{prenom}} ! 🎂 En ce jour spécial, toute l\'équipe du studio vous souhaite une magnifique journée. À très bientôt sur le tapis !');
      setAnnivCadeauActif(prof?.anniversaire_cadeau_actif || false);
      setAnnivCadeauOffreId(prof?.anniversaire_cadeau_offre_id || '');
      setAnnivCadeauType(prof?.anniversaire_cadeau_type || 'gratuit');
      setAnnivCadeauRemisePct(prof?.anniversaire_cadeau_remise_pct || 20);

      setLoading(false);
    };
    load();
  }, []);

  const handleChange = (field) => (e) => {
    setProfile(prev => ({ ...prev, [field]: e.target.value }));
    setDirty(true);
  };

  // Avertir si tentative de quitter avec des changements non sauvegardés
  useEffect(() => {
    if (!dirty) return undefined;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  // --- Lieux ---
  const addLieu = async () => {
    if (!newLieu.trim()) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from('lieux').insert({
      profile_id: user.id,
      nom: newLieu.trim(),
      ordre: lieux.length,
    }).select().single();

    if (!error && data) {
      setLieux(prev => [...prev, data]);
      setNewLieu('');
    }
  };

  const removeLieu = async (id) => {
    const lieu = lieux.find(l => l.id === id);
    const nom = lieu?.nom?.trim() || 'ce lieu';
    if (!confirm(`Supprimer "${nom}" ? Les cours déjà associés à ce lieu garderont leur référence textuelle, mais tu ne pourras plus le sélectionner.`)) {
      return;
    }
    const supabase = createClient();
    await supabase.from('lieux').delete().eq('id', id);
    setLieux(prev => prev.filter(l => l.id !== id));
  };

  const updateLieu = async (id, field, value) => {
    const supabase = createClient();
    await supabase.from('lieux').update({ [field]: value }).eq('id', id);
    setLieux(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  // --- Save profile ---
  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from('profiles').update({
      prenom: profile.prenom,
      nom: profile.nom,
      email: profile.email,
      studio_nom: profile.studio_nom,
      adresse: profile.adresse,
      ville: profile.ville,
      telephone: profile.telephone,
      metier: profile.metier,
      lieu_principal: profile.lieu_principal || null,
      ui_couleur: profile.ui_couleur,
      ui_illustration: profile.ui_illustration || 'lotus',
      ui_grille_active: profile.ui_grille_active !== false,
      ui_animation_active: profile.ui_animation_active !== false,
      alerte_seances_seuil: parseInt(profile.alerte_seances_seuil) || 2,
      alerte_expiration_jours: parseInt(profile.alerte_expiration_jours) || 7,
      anniversaire_mode:            annivMode,
      anniversaire_message:         annivMessage,
      anniversaire_cadeau_actif:    annivCadeauActif,
      anniversaire_cadeau_offre_id: annivCadeauOffreId || null,
      anniversaire_cadeau_type:     annivCadeauType,
      anniversaire_cadeau_remise_pct: parseInt(annivCadeauRemisePct) || 20,
      notif_nouveau_client:    notifNouveauClient,
      notif_paiement_retard:   notifPaiementRetard,
      notif_carnet_epuise:     notifCarnetEpuise,
      notif_abonnement_expire: notifAbonnementExpire,
      stripe_webhook_secret:   profile.stripe_webhook_secret || null,
      // Règles d'annulation (v5 + v15)
      regles_annulation:       profile.regles_annulation || null,
      // Notifications élèves (v19+v21) — OctoPush Mélutek, toggles + kill-switch + seuil
      notifs_eleves:           profile.notifs_eleves || null,
      sms_seuil_mois:          profile.sms_seuil_mois ? parseInt(profile.sms_seuil_mois) : null,
      // Page publique enrichie (v14)
      photo_url:               profile.photo_url || null,
      photo_couverture:        profile.photo_couverture || null,
      bio:                     profile.bio || null,
      philosophie:             profile.philosophie || null,
      formations:              profile.formations || null,
      annees_experience:       profile.annees_experience ? parseInt(profile.annees_experience) : null,
      horaires_studio:         profile.horaires_studio || null,
      afficher_tarifs:         profile.afficher_tarifs === true,
      faq_publique:            profile.faq_publique || [],
      instagram_url:           profile.instagram_url || null,
      facebook_url:            profile.facebook_url || null,
      website_url:             profile.website_url || null,
    }).eq('id', profile.id);

    if (!error) {
      router.refresh();
      toast.success('Paramètres enregistrés !');
      setDirty(false);
    } else {
      toast.error('Erreur : ' + error.message);
    }
    setSaving(false);
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Chargement...</div>;

  return (
    <div className="parametres">
      <BackgroundDecor
        illustration={profile.ui_illustration || 'lotus'}
        grilleActive={profile.ui_grille_active !== false}
        animationActive={profile.ui_animation_active !== false}
      />

      <div className="page-header animate-fade-in">
        <h1>Paramètres</h1>
      </div>

      {/* === ONGLETS PRINCIPAUX === */}
      <div className="tabs-bar animate-fade-in">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ============================================ */}
      {/* ONGLET 1 — PROFIL                           */}
      {/* ============================================ */}
      {activeTab === 'profil' && (
        <div className="tab-content animate-fade-in">

          {/* Profil */}
          <div className="section izi-card">
            <div className="section-top"><div className="section-icon"><User size={20} /></div><h2>Mon profil</h2></div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Prénom</label>
                <input className="izi-input" value={profile.prenom || ''} onChange={handleChange('prenom')} />
              </div>
              <div className="form-group">
                <label className="form-label">Nom</label>
                <input className="izi-input" value={profile.nom || ''} onChange={handleChange('nom')} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label"><Mail size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />Adresse e-mail</label>
              <input className="izi-input" type="email" value={profile.email || ''} onChange={handleChange('email')} placeholder="ton@email.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Téléphone</label>
              <input className="izi-input" value={profile.telephone || ''} onChange={handleChange('telephone')} />
            </div>
            <div className="form-group">
              <label className="form-label"><Home size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />Adresse</label>
              <input className="izi-input" value={profile.adresse || ''} onChange={handleChange('adresse')} placeholder="Adresse postale" />
            </div>
          </div>

          {/* Studio */}
          <div className="section izi-card">
            <div className="section-top"><div className="section-icon"><Building2 size={20} /></div><h2>Mon activité</h2></div>
            <div className="form-group">
              <label className="form-label">Nom du studio</label>
              <input className="izi-input" value={profile.studio_nom || ''} onChange={handleChange('studio_nom')} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Ville</label>
                <input className="izi-input" value={profile.ville || ''} onChange={handleChange('ville')} />
              </div>
              <div className="form-group">
                <label className="form-label">Métier</label>
                <select className="izi-input" value={profile.metier || 'yoga'} onChange={handleChange('metier')}>
                  {Object.entries(METIERS).map(([k, v]) => (
                    <option key={k} value={k}>{v.emoji} {v.label}</option>
                  ))}
                </select>
              </div>
            </div>
            {lieux.length > 0 && (
              <div className="form-group">
                <label className="form-label"><MapPin size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />Ma salle principale</label>
                <select
                  className="izi-input"
                  value={profile.lieu_principal || ''}
                  onChange={handleChange('lieu_principal')}
                >
                  <option value="">Aucune sélection</option>
                  {lieux.map(l => (
                    <option key={l.id} value={l.id}>{l.nom}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Lieux */}
          <div className="section izi-card">
            <div className="section-top"><div className="section-icon"><MapPin size={20} /></div><h2>Mes lieux</h2></div>
            <p className="section-desc">Les salles et espaces où tu donnes tes cours.</p>

            {lieux.length > 0 && (
              <div className="lieux-list">
                {lieux.map(lieu => (
                  <div key={lieu.id} className="lieu-item">
                    <div className="lieu-info">
                      <input
                        className="lieu-nom-input"
                        value={lieu.nom}
                        onChange={e => updateLieu(lieu.id, 'nom', e.target.value)}
                      />
                      <input
                        className="lieu-adresse-input"
                        value={lieu.adresse || ''}
                        onChange={e => updateLieu(lieu.id, 'adresse', e.target.value)}
                        placeholder="Adresse (optionnel)"
                      />
                    </div>
                    <button className="lieu-delete" onClick={() => removeLieu(lieu.id)} title="Supprimer">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="add-row">
              <input
                className="izi-input"
                value={newLieu}
                onChange={e => setNewLieu(e.target.value)}
                placeholder="Nouveau lieu..."
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addLieu())}
              />
              <button className="izi-btn izi-btn-secondary add-btn" onClick={addLieu} disabled={!newLieu.trim()}>
                <Plus size={18} />
              </button>
            </div>
          </div>

          {/* Règles d'annulation */}
          <ReglesAnnulationSection
            profile={profile}
            setProfile={setProfile}
            setDirty={setDirty}
          />

          {/* Notifications élèves automatiques */}
          <NotifsElevesSection
            profile={profile}
            setProfile={setProfile}
            setDirty={setDirty}
          />

          {/* Page publique enrichie */}
          <PagePubliqueSection
            profile={profile}
            setProfile={setProfile}
            setDirty={setDirty}
          />

          {/* Paiement en ligne (Stripe Payment Link) */}
          <StripePaiementSection
            profile={profile}
            setProfile={setProfile}
            setDirty={setDirty}
          />

          <button onClick={handleSave} className="izi-btn izi-btn-primary save-btn" disabled={saving}>
            <Save size={18} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      )}

      {/* ============================================ */}
      {/* ONGLET 2 — RÉGLAGES                         */}
      {/* ============================================ */}
      {activeTab === 'reglages' && (
        <div className="tab-content animate-fade-in">

          {/* Sous-onglets Réglages */}
          <div className="subtabs-bar">
            {REGLAGES_SUBTABS.map(sub => {
              const Icon = sub.icon;
              return (
                <button
                  key={sub.id}
                  className={`subtab-btn ${reglagesSubTab === sub.id ? 'active' : ''}`}
                  onClick={() => setReglagesSubTab(sub.id)}
                >
                  <Icon size={14} />
                  <span>{sub.label}</span>
                </button>
              );
            })}
          </div>

          {/* === SOUS-ONGLET : APPARENCES === */}
          {reglagesSubTab === 'apparences' && (
            <div className="subtab-content animate-fade-in">

              {/* Palette IziSolo (4 thèmes interchangeables) */}
              <div className="section izi-card">
                <div className="section-top"><div className="section-icon"><Palette size={20} /></div><h2>Ambiance visuelle</h2></div>
                <p className="section-desc">
                  Choisis la palette de couleurs qui te correspond. Le changement s'applique à tout ton espace IziSolo immédiatement.
                </p>
                <PalettePicker initial={profile.palette || 'sable'} />
              </div>

              {/* Décor visuel */}
              <div className="section izi-card">
                <div className="section-top"><div className="section-icon"><Flower2 size={20} /></div><h2>Décor visuel</h2></div>
                <p className="section-desc">Personnalise l'ambiance visuelle de ton espace.</p>

                <div className="form-group">
                  <label className="form-label">Illustration</label>
                  <div className="decor-options">
                    {ILLUSTRATION_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`decor-option ${(profile.ui_illustration || 'lotus') === opt.value ? 'selected' : ''}`}
                        onClick={() => setProfile(prev => ({ ...prev, ui_illustration: opt.value }))}
                      >
                        <span className="decor-emoji">{opt.emoji}</span> {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="toggle-row">
                  <label className="toggle-label">Grille décorative d'arrière-plan</label>
                  <button
                    type="button"
                    className={`toggle-switch ${(profile.ui_grille_active !== false) ? 'active' : ''}`}
                    onClick={() => setProfile(prev => ({ ...prev, ui_grille_active: !(prev.ui_grille_active !== false) }))}
                  >
                    <span className="toggle-knob" />
                  </button>
                </div>

                <div className="toggle-row">
                  <label className="toggle-label">Animation de l'arrière-plan</label>
                  <button
                    type="button"
                    className={`toggle-switch ${(profile.ui_animation_active !== false) ? 'active' : ''}`}
                    onClick={() => setProfile(prev => ({ ...prev, ui_animation_active: !(prev.ui_animation_active !== false) }))}
                  >
                    <span className="toggle-knob" />
                  </button>
                </div>

                {(profile.ui_illustration || 'lotus') !== 'aucun' && (
                  <div className="illustration-preview">
                    <img
                      src={`/illustrations/${profile.ui_illustration || 'lotus'}.jpg`}
                      alt={ILLUSTRATION_OPTIONS.find(o => o.value === (profile.ui_illustration || 'lotus'))?.label || ''}
                    />
                  </div>
                )}
              </div>

              <button onClick={handleSave} className="izi-btn izi-btn-primary save-btn" disabled={saving}>
                <Save size={18} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          )}

          {/* === SOUS-ONGLET : GÉNÉRAL === */}
          {reglagesSubTab === 'general' && (
            <div className="subtab-content animate-fade-in">

              {/* Alertes & Notifications */}
              <div className="section izi-card">
                <div className="section-top"><div className="section-icon"><Bell size={20} /></div><h2>Alertes</h2></div>
                <p className="section-desc">Configure les seuils de notification pour tes élèves.</p>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Seuil séances basses</label>
                    <input className="izi-input" type="number" value={profile.alerte_seances_seuil || 2} onChange={handleChange('alerte_seances_seuil')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Jours avant expiration</label>
                    <input className="izi-input" type="number" value={profile.alerte_expiration_jours || 7} onChange={handleChange('alerte_expiration_jours')} />
                  </div>
                </div>
              </div>

              <button onClick={handleSave} className="izi-btn izi-btn-primary save-btn" disabled={saving}>
                <Save size={18} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ============================================ */}
      {/* ONGLET — NOTIFICATIONS & ANNIVERSAIRES      */}
      {/* ============================================ */}
      {activeTab === 'notifications' && (
        <div className="tab-content animate-fade-in">

          {/* ── Sous-onglets ── */}
          <div className="notif-subtabs">
            <button
              className={`notif-subtab ${notifSubTab === 'general' ? 'active' : ''}`}
              onClick={() => setNotifSubTab('general')}
            >
              <Bell size={14} /> Général
            </button>
            <button
              className={`notif-subtab ${notifSubTab === 'anniversaire' ? 'active' : ''}`}
              onClick={() => setNotifSubTab('anniversaire')}
            >
              <Cake size={14} /> Anniversaires
            </button>
          </div>

          {/* ══════════ SOUS-ONGLET GÉNÉRAL ══════════ */}
          {notifSubTab === 'general' && (
            <div className="notif-general animate-fade-in">
              <p className="param-section-desc" style={{ marginBottom: 4 }}>
                Choisissez les événements pour lesquels vous souhaitez recevoir une notification dans l'application.
              </p>

              {[
                {
                  key:     'nouveau_client',
                  state:   notifNouveauClient,
                  setter:  setNotifNouveauClient,
                  label:   'Nouvel élève ajouté',
                  desc:    'Quand un élève est ajouté (manuellement ou via inscription)',
                  emoji:   '👤',
                },
                {
                  key:     'paiement_retard',
                  state:   notifPaiementRetard,
                  setter:  setNotifPaiementRetard,
                  label:   'Paiement en attente',
                  desc:    'Paiement non réglé depuis plus de 7 jours',
                  emoji:   '💶',
                },
                {
                  key:     'carnet_epuise',
                  state:   notifCarnetEpuise,
                  setter:  setNotifCarnetEpuise,
                  label:   'Carnet de séances épuisé',
                  desc:    'Quand il reste moins de 2 séances dans un carnet actif',
                  emoji:   '📋',
                },
                {
                  key:     'abonnement_expire',
                  state:   notifAbonnementExpire,
                  setter:  setNotifAbonnementExpire,
                  label:   'Abonnement qui expire bientôt',
                  desc:    'Abonnement arrivant à échéance dans moins de 14 jours',
                  emoji:   '⏰',
                },
              ].map(({ key, state, setter, label, desc, emoji, soon }) => (
                <div key={key} className="notif-row param-section">
                  <div className="notif-row-left">
                    <span className="notif-row-emoji">{emoji}</span>
                    <div>
                      <div className="notif-row-label">
                        {label}
                        {soon && <span className="notif-soon-badge">Bientôt</span>}
                      </div>
                      <div className="notif-row-desc">{desc}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`param-toggle-switch ${soon ? 'disabled' : ''}`}
                    onClick={() => !soon && setter(v => !v)}
                    disabled={soon}
                  >
                    {state && !soon
                      ? <ToggleRight size={26} style={{ color: 'var(--brand)' }} />
                      : <ToggleLeft  size={26} style={{ color: soon ? 'var(--border)' : 'var(--border)' }} />
                    }
                  </button>
                </div>
              ))}

              <button className="izi-btn izi-btn-primary" onClick={handleSave} disabled={saving}>
                <Save size={16} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          )}

          {/* ══════════ SOUS-ONGLET ANNIVERSAIRES ══════════ */}
          {notifSubTab === 'anniversaire' && (
            <div className="notif-anniv animate-fade-in">

              {/* Mode */}
              <div className="param-section">
                <div className="param-section-title">
                  <Cake size={16} /> Mode d'envoi
                </div>
                <p className="param-section-desc">
                  IziSolo détecte automatiquement les anniversaires et peut envoyer un message personnalisé.
                </p>
                <div className="anniv-modes">
                  {ANNIV_MODES.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      className={`anniv-mode-btn ${annivMode === m.id ? 'active' : ''}`}
                      onClick={() => setAnnivMode(m.id)}
                    >
                      <div className="anniv-mode-label">{m.label}</div>
                      <div className="anniv-mode-desc">{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Message type */}
              {annivMode !== 'off' && (
                <div className="param-section">
                  <div className="param-section-title">
                    <Mail size={16} /> Message d'anniversaire
                  </div>
                  <p className="param-section-desc">
                    Utilise <code>{'{{prenom}}'}</code> pour personnaliser avec le prénom de l'élève.
                  </p>
                  <textarea
                    className="izi-input anniv-textarea"
                    value={annivMessage}
                    onChange={e => setAnnivMessage(e.target.value)}
                    rows={4}
                    placeholder="Joyeux anniversaire {{prenom}} ! 🎂"
                  />
                  <div className="anniv-preview">
                    <span className="anniv-preview-label">Aperçu :</span>
                    {annivMessage.replace(/\{\{prenom\}\}/g, 'Sophie')}
                  </div>
                </div>
              )}

              {/* Cadeau */}
              {annivMode !== 'off' && (
                <div className="param-section">
                  <div className="param-section-title-row">
                    <div className="param-section-title">
                      <Gift size={16} /> Offrir quelque chose
                    </div>
                    <button
                      type="button"
                      className="param-toggle-switch"
                      onClick={() => setAnnivCadeauActif(v => !v)}
                    >
                      {annivCadeauActif
                        ? <ToggleRight size={26} style={{ color: 'var(--brand)' }} />
                        : <ToggleLeft  size={26} style={{ color: 'var(--border)' }} />
                      }
                    </button>
                  </div>
                  <p className="param-section-desc">
                    Joindre un cadeau au message : offre à 0€ ou remise sur une prestation.
                  </p>

                  {annivCadeauActif && (
                    <div className="anniv-cadeau-zone animate-slide-up">
                      <div className="form-group">
                        <label className="form-label">Type de cadeau</label>
                        <div className="anniv-cadeau-type-row">
                          {[
                            { id: 'gratuit', label: '🎁 Offre offerte (0€)' },
                            { id: 'remise',  label: '% Remise sur une offre' },
                          ].map(ct => (
                            <button
                              key={ct.id}
                              type="button"
                              className={`anniv-cadeau-type-btn ${annivCadeauType === ct.id ? 'active' : ''}`}
                              onClick={() => setAnnivCadeauType(ct.id)}
                            >
                              {ct.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">
                          {annivCadeauType === 'gratuit' ? 'Offre à offrir' : 'Offre sur laquelle appliquer la remise'}
                        </label>
                        <select
                          className="izi-input"
                          value={annivCadeauOffreId}
                          onChange={e => setAnnivCadeauOffreId(e.target.value)}
                        >
                          <option value="">— Choisir une offre —</option>
                          {offresDisponibles.map(o => (
                            <option key={o.id} value={o.id}>
                              {o.nom} {o.prix > 0 ? `— ${o.prix}€` : '(offert)'}
                            </option>
                          ))}
                        </select>
                      </div>

                      {annivCadeauType === 'remise' && (
                        <div className="form-group">
                          <label className="form-label">Pourcentage de remise</label>
                          <div className="anniv-remise-row">
                            {[10, 20, 30, 50].map(p => (
                              <button
                                key={p}
                                type="button"
                                className={`anniv-pct-btn ${annivCadeauRemisePct === p ? 'active' : ''}`}
                                onClick={() => setAnnivCadeauRemisePct(p)}
                              >
                                {p}%
                              </button>
                            ))}
                            <input
                              className="izi-input anniv-pct-input"
                              type="number" min="1" max="100"
                              value={annivCadeauRemisePct}
                              onChange={e => setAnnivCadeauRemisePct(Number(e.target.value))}
                              placeholder="Autre %"
                            />
                          </div>
                        </div>
                      )}

                      <div className="anniv-cadeau-hint">
                        💡 Le cadeau sera joint au message et créera automatiquement un abonnement/carnet à 0€ (ou avec remise) pour l'élève une fois le message envoyé.
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button className="izi-btn izi-btn-primary" onClick={handleSave} disabled={saving}>
                <Save size={16} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          )}

        </div>
      )}

      {/* ============================================ */}
      {/* ONGLET 3 — RÈGLES                           */}
      {/* ============================================ */}
      {activeTab === 'regles' && (
        <div className="tab-content animate-fade-in">
          <ReglesTab profileId={profile.id} />
        </div>
      )}

      {/* ============================================ */}
      {/* ONGLET 4 — ABONNEMENT                       */}
      {/* ============================================ */}
      {activeTab === 'abonnement' && (
        <div className="tab-content animate-fade-in">

          {/* Plan actuel */}
          <div className="section izi-card">
            <div className="section-top"><div className="section-icon abo-icon"><Crown size={20} /></div><h2>Mon abonnement</h2></div>

            <div className="abo-current">
              <div className="abo-badge">Gratuit</div>
              <p className="abo-status">Tu utilises actuellement le plan <strong>Découverte</strong>.</p>
            </div>

            <div className="abo-features">
              <div className="abo-feature included">
                <span className="abo-check">✓</span>
                <span>Gestion de 15 élèves</span>
              </div>
              <div className="abo-feature included">
                <span className="abo-check">✓</span>
                <span>Planning des cours</span>
              </div>
              <div className="abo-feature included">
                <span className="abo-check">✓</span>
                <span>Suivi des présences</span>
              </div>
              <div className="abo-feature locked">
                <span className="abo-lock">🔒</span>
                <span>Élèves illimités</span>
              </div>
              <div className="abo-feature locked">
                <span className="abo-lock">🔒</span>
                <span>Facturation & paiements</span>
              </div>
              <div className="abo-feature locked">
                <span className="abo-lock">🔒</span>
                <span>Statistiques avancées</span>
              </div>
              <div className="abo-feature locked">
                <span className="abo-lock">🔒</span>
                <span>Page de réservation publique</span>
              </div>
            </div>
          </div>

          {/* Plans */}
          <AbonnementCheckout currentPlan={profile?.plan || 'free'} />

          <div className="section izi-card" style={{ background: 'var(--bg-soft, #faf8f5)', border: '1px dashed var(--border)' }}>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
              <strong>Frais de fonctionnement IziSolo</strong> : 1 % du volume payé en ligne via Stripe — ajoutés à ta facture mensuelle, jamais prélevés sur tes paiements. Tu encaisses sur ton propre compte Stripe, IziSolo ne touche jamais l'argent de tes élèves.
            </p>
          </div>

        </div>
      )}

      <style jsx global>{`
        .parametres { display: flex; flex-direction: column; gap: 0; padding-bottom: 40px; }
        .page-header { margin-bottom: 12px; }
        .page-header h1 { font-size: 1.375rem; font-weight: 700; }

        /* === CONTENU — collé aux onglets === */
        .tab-content {
          display: flex; flex-direction: column; gap: 0;
          background: var(--bg-card);
          border: 1.5px solid var(--border); border-top: none;
          border-radius: 0 0 var(--radius-lg) var(--radius-lg);
          padding: 16px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.04);
        }
        .tab-content > .section {
          border-radius: var(--radius-md);
          margin-bottom: 12px;
        }
        .tab-content > .save-btn {
          margin-top: 4px;
        }
        .subtab-content > .section {
          border-radius: var(--radius-md);
          margin-bottom: 12px;
        }
        .subtab-content > .section:last-of-type { margin-bottom: 4px; }
        .subtab-content > .save-btn {
          margin-top: 4px;
        }

        /* subtabs-bar / subtab-btn → globals.css */

        .subtab-content {
          display: flex; flex-direction: column; gap: 0;
          background: var(--bg-card);
          border: 1px solid var(--border); border-top: none;
          border-radius: 0 0 var(--radius-md) var(--radius-md);
          padding: 12px;
        }

        /* === SECTIONS === */
        .section { padding: 20px; display: flex; flex-direction: column; gap: 12px; }
        .section-top { display: flex; align-items: center; gap: 10px; }
        .section-top h2 { font-size: 1.0625rem; font-weight: 700; margin: 0; }
        .section-icon { width: 36px; height: 36px; border-radius: var(--radius-sm); background: var(--brand-light); color: var(--brand-700); display: flex; align-items: center; justify-content: center; }
        .section-desc { font-size: 0.8125rem; color: var(--text-muted); margin: -4px 0 4px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-label { font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary); }

        /* Types de cours */
        .chips-list { display: flex; flex-wrap: wrap; gap: 6px; }
        .chip-editable { display: flex; align-items: center; gap: 4px; padding: 6px 10px; background: var(--brand-light); color: var(--brand-700); border-radius: var(--radius-full); font-size: 0.8125rem; font-weight: 500; }
        .chip-remove { background: none; border: none; cursor: pointer; color: var(--brand-600); padding: 0; display: flex; align-items: center; opacity: 0.6; }
        .chip-remove:hover { opacity: 1; }

        /* Lieux */
        .lieux-list { display: flex; flex-direction: column; gap: 8px; }
        .lieu-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--cream); border-radius: var(--radius-sm); border: 1px solid var(--border); }
        .lieu-info { flex: 1; display: flex; flex-direction: column; gap: 4px; }
        .lieu-nom-input { border: none; background: none; font-weight: 600; font-size: 0.9375rem; color: var(--text-primary); outline: none; padding: 0; }
        .lieu-adresse-input { border: none; background: none; font-size: 0.75rem; color: var(--text-muted); outline: none; padding: 0; }
        .lieu-delete { background: none; border: none; color: var(--danger); cursor: pointer; padding: 4px; border-radius: var(--radius-sm); opacity: 0.5; }
        .lieu-delete:hover { opacity: 1; background: #fef2f2; }

        /* Add row */
        .add-row { display: flex; gap: 8px; }
        .add-row .izi-input { flex: 1; }
        .add-btn { min-width: 48px; padding: 0; display: flex; align-items: center; justify-content: center; }

        /* Palette */
        .palette-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .palette-btn { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px; border-radius: var(--radius-md); border: 2px solid var(--border); background: var(--bg-card); cursor: pointer; transition: all var(--transition-fast); }
        .palette-btn.selected { border-color: var(--brand); box-shadow: 0 0 0 2px var(--brand-light); }
        .palette-swatch { width: 32px; height: 32px; border-radius: 50%; }
        .palette-label { font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); }
        .save-btn { width: 100%; }

        /* Décor options */
        .decor-options { display: flex; flex-wrap: wrap; gap: 6px; }
        .decor-option {
          padding: 8px 14px; border-radius: var(--radius-full);
          border: 1.5px solid var(--border); background: var(--bg-card);
          font-size: 0.8125rem; font-weight: 500; color: var(--text-secondary);
          cursor: pointer; transition: all var(--transition-fast);
        }
        .decor-option.selected {
          border-color: var(--brand); background: var(--brand-light); color: var(--brand-700);
        }
        .decor-emoji { font-size: 0.9rem; }

        /* Illustration preview */
        .illustration-preview {
          display: flex; align-items: center; justify-content: center;
          padding: 16px; border-radius: var(--radius-md);
          border: 1px solid var(--border); background: var(--bg-card);
        }
        .illustration-preview img {
          width: 180px; height: 180px; object-fit: contain; opacity: 0.7;
        }

        /* Toggle switch */
        .toggle-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .toggle-label { font-size: 0.875rem; font-weight: 500; color: var(--text-primary); }
        .toggle-switch { width: 48px; height: 28px; border-radius: 14px; border: none; background: var(--cream-dark); cursor: pointer; position: relative; transition: background var(--transition-fast); padding: 0; }
        .toggle-switch.active { background: var(--brand); }
        .toggle-knob { position: absolute; top: 3px; left: 3px; width: 22px; height: 22px; border-radius: 50%; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.15); transition: transform var(--transition-fast); display: block; }
        .toggle-switch.active .toggle-knob { transform: translateX(20px); }

        /* === ABONNEMENT === */
        .abo-icon { background: linear-gradient(135deg, #fef3c7, #fde68a); color: #b45309; }
        .abo-current { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .abo-badge {
          padding: 4px 12px; border-radius: var(--radius-full);
          background: var(--cream); border: 1px solid var(--border);
          font-size: 0.75rem; font-weight: 700; color: var(--text-secondary);
          text-transform: uppercase; letter-spacing: 0.5px;
        }
        .abo-status { font-size: 0.875rem; color: var(--text-secondary); margin: 0; }
        .abo-features { display: flex; flex-direction: column; gap: 8px; margin-top: 4px; }
        .abo-feature {
          display: flex; align-items: center; gap: 10px;
          font-size: 0.875rem; color: var(--text-secondary);
          padding: 8px 12px; border-radius: var(--radius-sm);
        }
        .abo-feature.included { color: var(--text-primary); }
        .abo-feature.locked { opacity: 0.55; }
        .abo-check { color: var(--brand); font-weight: 700; font-size: 1rem; }
        .abo-lock { font-size: 0.8rem; }

        /* Plans */
        .plans-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 4px; }
        .plan-card {
          display: flex; flex-direction: column; gap: 8px;
          padding: 20px; border-radius: var(--radius-md);
          border: 2px solid var(--border); background: var(--bg-card);
          position: relative;
        }
        .plan-card.recommended {
          border-color: var(--brand);
          background: var(--brand-light);
        }
        .plan-badge {
          position: absolute; top: -10px; right: 12px;
          padding: 2px 10px; border-radius: var(--radius-full);
          background: var(--brand); color: white;
          font-size: 0.6875rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .plan-name { font-size: 1.125rem; font-weight: 700; color: var(--text-primary); }
        .plan-price { display: flex; align-items: baseline; gap: 2px; }
        .plan-amount { font-size: 1.75rem; font-weight: 800; color: var(--text-primary); }
        .plan-period { font-size: 0.8125rem; color: var(--text-muted); }
        .plan-desc { font-size: 0.8125rem; color: var(--text-muted); margin: 0; flex: 1; }
        .plan-cta { margin-top: 8px; }

        @media (max-width: 480px) {
          .plans-grid { grid-template-columns: 1fr; }
          .form-row { grid-template-columns: 1fr; }
        }

        /* Animation */
        .animate-fade-in {
          animation: fadeIn 0.25s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up { animation: slideUp 0.2s ease; }

        /* ── Sous-onglets notifications ── */
        .notif-subtabs {
          display: flex; gap: 4px;
          background: var(--border); border-radius: 10px;
          padding: 3px; width: fit-content; margin-bottom: 14px;
        }
        .notif-subtab {
          display: flex; align-items: center; gap: 5px;
          padding: 6px 16px; border-radius: 8px; border: none;
          background: none; font-size: 0.8125rem; font-weight: 600;
          color: var(--text-muted); cursor: pointer; transition: all 0.15s;
        }
        .notif-subtab.active {
          background: var(--bg-card); color: var(--text-primary);
          box-shadow: 0 1px 4px rgba(0,0,0,0.07);
        }

        /* Général notif rows */
        .notif-general, .notif-anniv { display: flex; flex-direction: column; gap: 10px; }
        .notif-row {
          display: flex; align-items: center;
          justify-content: space-between; gap: 12px; flex-direction: row !important;
        }
        .notif-row-left { display: flex; align-items: center; gap: 12px; flex: 1; }
        .notif-row-emoji { font-size: 1.25rem; flex-shrink: 0; width: 28px; text-align: center; }
        .notif-row-label {
          font-size: 0.875rem; font-weight: 600; color: var(--text-primary);
          display: flex; align-items: center; gap: 7px;
        }
        .notif-row-desc  { font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; }
        .notif-soon-badge {
          font-size: 0.625rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.05em; padding: 2px 6px; border-radius: 5px;
          background: #fef9c3; color: #a16207; border: 1px solid #fde047;
        }
        .param-toggle-switch.disabled { opacity: 0.4; cursor: not-allowed; }

        /* ── Notifications / Anniversaires ── */
        .param-section {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: var(--radius-md); padding: 16px;
          display: flex; flex-direction: column; gap: 12px;
        }
        .param-section + .param-section { margin-top: 12px; }
        .param-section-title {
          display: flex; align-items: center; gap: 8px;
          font-size: 0.875rem; font-weight: 700; color: var(--text-primary);
        }
        .param-section-title-row {
          display: flex; align-items: center; justify-content: space-between;
        }
        .param-section-desc {
          font-size: 0.8125rem; color: var(--text-muted); margin: 0; line-height: 1.5;
        }
        .param-section-desc code {
          background: var(--border); padding: 1px 5px; border-radius: 4px;
          font-size: 0.75rem; font-family: monospace;
        }
        .param-toggle-switch { background: none; border: none; cursor: pointer; padding: 0; display: flex; }

        /* Modes anniversaire */
        .anniv-modes { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
        .anniv-mode-btn {
          padding: 10px 12px; border-radius: var(--radius-md);
          border: 1.5px solid var(--border); background: var(--bg-card);
          text-align: left; cursor: pointer; transition: all 0.15s;
        }
        .anniv-mode-btn.active { border-color: var(--brand); background: var(--brand-light); }
        .anniv-mode-label { font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); }
        .anniv-mode-desc  { font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; }
        .anniv-mode-btn.active .anniv-mode-label { color: var(--brand-700); }

        /* Textarea message */
        .anniv-textarea { resize: vertical; min-height: 80px; }
        .anniv-preview {
          font-size: 0.8125rem; color: var(--text-muted);
          padding: 8px 10px; background: var(--cream, #faf8f5);
          border-radius: var(--radius-sm); border: 1px dashed var(--border);
          line-height: 1.5;
        }
        .anniv-preview-label {
          font-weight: 700; font-size: 0.6875rem; text-transform: uppercase;
          letter-spacing: 0.06em; display: block; margin-bottom: 4px; color: var(--text-muted);
        }

        /* Cadeau */
        .anniv-cadeau-zone { display: flex; flex-direction: column; gap: 10px; }
        .anniv-cadeau-type-row { display: flex; gap: 8px; flex-wrap: wrap; }
        .anniv-cadeau-type-btn {
          flex: 1; padding: 8px 12px; border-radius: var(--radius-full);
          border: 1.5px solid var(--border); background: var(--bg-card);
          font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary);
          cursor: pointer; transition: all 0.15s; white-space: nowrap;
        }
        .anniv-cadeau-type-btn.active { border-color: var(--brand); background: var(--brand-light); color: var(--brand-700); }
        .anniv-remise-row { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
        .anniv-pct-btn {
          padding: 7px 14px; border-radius: var(--radius-full);
          border: 1.5px solid var(--border); background: var(--bg-card);
          font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary);
          cursor: pointer; transition: all 0.15s;
        }
        .anniv-pct-btn.active { border-color: var(--brand); background: var(--brand-light); color: var(--brand-700); }
        .anniv-pct-input { width: 80px !important; }
        .anniv-cadeau-hint {
          font-size: 0.75rem; color: var(--text-muted);
          padding: 8px 10px; background: var(--cream, #faf8f5);
          border-radius: var(--radius-sm); line-height: 1.5;
        }

        @media (max-width: 480px) {
          .anniv-modes { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
