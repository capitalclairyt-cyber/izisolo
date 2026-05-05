'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Save, Palette, User, Building2, Bell, MapPin,
  Plus, X, Trash2, Flower2, Sliders, Crown, Mail, Home,
  Eye, Settings, Zap, Gift, ToggleLeft, ToggleRight, Cake,
  CreditCard, Copy, Check, ExternalLink, AlertCircle, Loader2,
  Pencil,
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { useToast } from '@/components/ui/ToastProvider';
import { METIERS, PLANS } from '@/lib/constantes';
import { getTrialStatus, effectivePlan as effectivePlanFromTrial } from '@/lib/trial';
import { slugify } from '@/lib/utils';
// import BackgroundDecor — retiré, plus utilisé (apparences supprimées)

// Normalise une URL utilisateur :
//   - vide / null / espaces → null (pour respecter la CHECK constraint NULL OK)
//   - sans protocole "https://" ou "http://" → on préfixe avec "https://"
// Évite l'erreur DB : profiles_website_url_format / instagram / facebook
function normalizeUrl(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return 'https://' + trimmed;
}
import ReglesTab from './ReglesTab';
import PhotoUploader from '@/components/ui/PhotoUploader';
import UnsavedChangesBar from '@/components/ui/UnsavedChangesBar';
import UnsavedChangesGuard from '@/components/ui/UnsavedChangesGuard';

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

// Sous-onglets Réglages — Apparences retiré (palette + décor imposés brand
// pour cohérence visuelle de toute l'app, plus de personnalisation pro).
const REGLAGES_SUBTABS = [
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
// Section "Abonnement IziSolo" — Stripe SaaS
// 3 plans publics (Solo 12€ / Pro 24€ / Premium 49€) — MENSUEL UNIQUEMENT
// (l'annuel est désactivé pour l'instant ; sera ajouté plus tard avec -20%)
// Trial 14 jours sur tous. Plan `free` (interne, exempté) jamais affiché ici.
// ════════════════════════════════════════════════════════════════════════════
function AbonnementCheckout({ currentPlan }) {
  const [loading, setLoading] = useState(null); // 'solo' | 'pro' | 'premium'

  const PLANS_PUB = [
    {
      id: 'solo',
      nom: 'Solo',
      prixMensuel: 12,
      tagline: 'Pour démarrer en autonomie',
      pitch: 'Tout l\'essentiel pour gérer ton studio à la main.',
      features: [
        'Jusqu\'à 40 élèves',
        '1 lieu',
        'Cours, agenda, pointage présences',
        'Carnets / abonnements / paiements manuels',
        'Page publique studio (basique)',
        'Réservation en ligne pour élèves',
        'Messagerie chat élèves',
      ],
      limits: 'Pas d\'encaissement Stripe, pas de mailing, pas d\'automatisations.',
    },
    {
      id: 'pro',
      nom: 'Pro',
      recommended: true,
      prixMensuel: 24,
      tagline: 'Ton studio devient une machine',
      pitch: 'Encaissement en ligne + automatisations + outils marketing.',
      features: [
        'Élèves illimités',
        'Jusqu\'à 3 lieux',
        'Tout Solo +',
        'Stripe Payment Link (1% IziSolo)',
        'Mailing campagnes + SMS (0,07€/SMS)',
        'Notifications auto élèves (rappels, carnets)',
        'Sondages planning',
        'Cours d\'essai pour visiteurs',
        'Templates communication + anniversaires auto',
        'Page publique enrichie + page brouillon',
        'Annulation par l\'élève',
        'Export comptabilité',
        'Liste d\'attente + dette annulation tardive',
        'Support prioritaire',
      ],
    },
    {
      id: 'premium',
      nom: 'Premium',
      prixMensuel: 49,
      tagline: 'Pour les studios matures',
      pitch: 'Zéro frais Stripe IziSolo, white-label, support sous 24h.',
      features: [
        'Tout Pro +',
        'Lieux illimités',
        '0% de frais Stripe IziSolo',
        'Logo studio dans tous les emails (white-label)',
        'Support prioritaire — réponse < 24h',
      ],
      bonus: 'Les souscripteurs Premium bénéficieront automatiquement des futures features (vidéos de cours, assistant IA, multi-prof) à leur sortie.',
    },
  ];

  const subscribe = async (plan) => {
    setLoading(plan);
    try {
      const res = await fetch('/api/stripe/checkout-saas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, periode: 'mensuel' }),
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
      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 4 }}>Mon abonnement IziSolo</h2>
      <p className="section-desc">
        14 jours d'essai gratuit sur tous les plans. Tu peux changer ou annuler à tout moment.
      </p>

      <div className="plans-grid plans-grid-3">
        {PLANS_PUB.map(p => {
          const isCurrent = currentPlan === p.id;
          return (
            <div key={p.id} className={`plan-card ${p.recommended ? 'recommended' : ''}`}>
              {p.recommended && <div className="plan-badge">Recommandé</div>}
              <div className="plan-name">{p.nom}</div>
              <div className="plan-tagline">{p.tagline}</div>
              <div className="plan-price">
                <span className="plan-amount">{p.prixMensuel} €</span>
                <span className="plan-period">/mois</span>
              </div>
              <p className="plan-desc">{p.pitch}</p>
              <ul className="plan-features">
                {p.features.map(f => (
                  <li key={f}>
                    <Check size={13} style={{ color: 'var(--success, #6B9A6B)', flexShrink: 0, marginTop: 2 }} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {p.limits && (
                <p className="plan-limits">{p.limits}</p>
              )}
              {p.bonus && (
                <p className="plan-bonus">✦ {p.bonus}</p>
              )}
              <button
                onClick={() => subscribe(p.id)}
                disabled={isCurrent || loading === p.id}
                className={`izi-btn ${p.recommended ? 'izi-btn-primary' : 'izi-btn-secondary'} plan-cta`}
              >
                {isCurrent
                  ? 'Plan actuel'
                  : loading === p.id
                    ? 'Redirection…'
                    : (currentPlan && currentPlan !== 'free' ? `Passer à ${p.nom}` : `Démarrer mes 14 jours gratuits`)
                }
              </button>
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 14, textAlign: 'center' }}>
        Frais Stripe natifs (1,4% + 0,25 €) toujours dus à Stripe. Les frais
        IziSolo (1% sur Pro, 0% sur Premium) viennent en plus.
      </p>
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

// ════════════════════════════════════════════════════════════════════════════
// Section "Cours d'essai" — pour les visiteurs non encore clients
// ════════════════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════════════
// Section "Visibilité par défaut des cours" — pour le portail public
// ════════════════════════════════════════════════════════════════════════════
function VisibiliteSection({ profile, setProfile, setDirty }) {
  const current = profile?.visibilite_default || 'public';
  const set = (val) => {
    setProfile(prev => ({ ...prev, visibilite_default: val }));
    setDirty(true);
  };

  const options = [
    { value: 'public',   label: 'Tout le monde',          desc: 'Visible par tous les visiteurs (default).' },
    { value: 'inscrits', label: 'Élèves inscrits',         desc: 'Seulement ceux qui ont déjà une fiche dans ton studio.' },
    { value: 'abonnes',  label: 'Détenteurs d\'abonnement', desc: 'Seulement avec un abonnement actif (carnet, mensuel...).' },
    { value: 'fideles',  label: 'Élèves fidèles',          desc: 'Seulement ceux marqués \'Fidèle\' dans ta CRM.' },
  ];

  return (
    <div className="section izi-card">
      <div className="section-top">
        <div className="section-icon"><Eye size={20} /></div>
        <h2>Visibilité des cours</h2>
      </div>
      <p className="section-desc">
        Détermine qui peut voir tes cours sur ton portail public. Ce paramètre s'applique
        à tous les <strong>nouveaux cours</strong> créés. Tu peux ensuite override la visibilité
        cours par cours depuis sa fiche.
      </p>

      <div className="vis-radio-group">
        {options.map(opt => (
          <label key={opt.value} className={`vis-radio-opt ${current === opt.value ? 'active' : ''}`}>
            <input
              type="radio"
              name="visibilite_default"
              value={opt.value}
              checked={current === opt.value}
              onChange={() => set(opt.value)}
            />
            <div>
              <div className="vis-radio-label">{opt.label}</div>
              <div className="vis-radio-desc">{opt.desc}</div>
            </div>
          </label>
        ))}
      </div>

      <style jsx>{`
        .vis-radio-group { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
        .vis-radio-opt {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 10px 12px; border: 1.5px solid var(--border);
          border-radius: 10px; cursor: pointer; transition: all 0.15s;
        }
        .vis-radio-opt.active { border-color: var(--brand); background: var(--brand-light); }
        .vis-radio-opt input { margin-top: 4px; accent-color: var(--brand); }
        .vis-radio-label { font-size: 0.875rem; font-weight: 600; color: var(--text-primary); }
        .vis-radio-desc { font-size: 0.75rem; color: var(--text-secondary); margin-top: 2px; line-height: 1.4; }
      `}</style>
    </div>
  );
}

function CoursEssaiSection({ profile, setProfile, setDirty }) {
  const set = (field) => (val) => {
    setProfile(prev => ({ ...prev, [field]: val }));
    setDirty(true);
  };
  const actif = profile?.essai_actif === true;
  const mode  = profile?.essai_mode || 'manuel';
  const paiement = profile?.essai_paiement || 'gratuit';

  return (
    <div className="section izi-card">
      <div className="section-top">
        <div className="section-icon"><Zap size={20} /></div>
        <h2>Cours d'essai</h2>
      </div>
      <p className="section-desc">
        Permets aux visiteurs de demander un cours d'essai depuis ta page publique.
        Idéal pour tester ton activité avant de s'inscrire.
      </p>

      {/* Toggle actif */}
      <div className="essai-toggle-row" onClick={() => set('essai_actif')(!actif)}>
        <div>
          <div className="essai-toggle-label">{actif ? 'Activé' : 'Désactivé'}</div>
          <div className="essai-toggle-sub">
            {actif
              ? 'Le bouton "Cours d\'essai" est visible sur ton portail public.'
              : 'Aucun bouton de demande d\'essai sur ton portail public.'}
          </div>
        </div>
        <div className={`essai-switch ${actif ? 'on' : ''}`}>
          <div className="essai-switch-knob" />
        </div>
      </div>

      {actif && (
        <div className="essai-config">
          {/* Mode de validation */}
          <div className="form-group">
            <label className="form-label">Mode de validation</label>
            <div className="essai-radio-group">
              {[
                { val: 'auto',   label: 'Automatique',   desc: 'La demande est validée immédiatement, sans intervention de ta part.' },
                { val: 'semi',   label: 'Semi-automatique', desc: 'Validée immédiatement, tu reçois juste un email de notification.' },
                { val: 'manuel', label: 'Manuel',         desc: 'Tu reçois la demande, tu la valides ou la refuses depuis l\'app.' },
              ].map(opt => (
                <label key={opt.val} className={`essai-radio-opt ${mode === opt.val ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="essai_mode"
                    value={opt.val}
                    checked={mode === opt.val}
                    onChange={() => set('essai_mode')(opt.val)}
                  />
                  <div>
                    <div className="essai-radio-label">{opt.label}</div>
                    <div className="essai-radio-desc">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Paiement */}
          <div className="form-group">
            <label className="form-label">Paiement</label>
            <div className="essai-radio-group">
              {[
                { val: 'gratuit',  label: 'Gratuit',         desc: 'Le cours d\'essai est offert.' },
                { val: 'sur_place', label: 'Payant sur place', desc: 'Le visiteur règle le jour du cours, en espèces / CB / chèque.' },
                { val: 'stripe',   label: 'Paiement Stripe',  desc: 'Le visiteur règle en ligne via un Stripe Payment Link.' },
              ].map(opt => (
                <label key={opt.val} className={`essai-radio-opt ${paiement === opt.val ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="essai_paiement"
                    value={opt.val}
                    checked={paiement === opt.val}
                    onChange={() => set('essai_paiement')(opt.val)}
                  />
                  <div>
                    <div className="essai-radio-label">{opt.label}</div>
                    <div className="essai-radio-desc">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Prix (sauf si gratuit) */}
          {paiement !== 'gratuit' && (
            <div className="form-group">
              <label className="form-label">Prix du cours d'essai (€)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                className="izi-input"
                value={profile?.essai_prix || ''}
                onChange={e => set('essai_prix')(parseFloat(e.target.value) || 0)}
                placeholder="ex : 10"
              />
            </div>
          )}

          {/* Stripe Payment Link */}
          {paiement === 'stripe' && (
            <div className="form-group">
              <label className="form-label">Lien de paiement Stripe</label>
              <input
                type="url"
                className="izi-input"
                value={profile?.essai_stripe_payment_link || ''}
                onChange={e => set('essai_stripe_payment_link')(e.target.value)}
                placeholder="https://buy.stripe.com/..."
              />
              <span className="form-hint">
                Crée un Payment Link dans ton dashboard Stripe (Produits → Payment links) et colle l'URL ici.
              </span>
            </div>
          )}

          {/* Message d'accueil */}
          <div className="form-group">
            <label className="form-label">Message d'accueil (optionnel)</label>
            <textarea
              className="izi-input"
              rows={3}
              maxLength={500}
              value={profile?.essai_message || ''}
              onChange={e => set('essai_message')(e.target.value)}
              placeholder="Bienvenue ! Je serais ravi·e de t'accueillir pour un cours d'essai."
            />
            <span className="form-hint">{(profile?.essai_message || '').length}/500</span>
          </div>
        </div>
      )}

      <style jsx>{`
        .essai-toggle-row {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; padding: 14px; cursor: pointer;
          background: var(--bg-soft, #faf8f5); border-radius: 12px;
          margin-top: 4px;
        }
        .essai-toggle-label { font-weight: 700; color: var(--text-primary); font-size: 0.9375rem; }
        .essai-toggle-sub   { font-size: 0.8125rem; color: var(--text-muted); margin-top: 2px; }
        .essai-switch {
          width: 42px; height: 24px; flex-shrink: 0;
          background: #ccc; border-radius: 999px;
          position: relative; transition: background .2s;
        }
        .essai-switch.on { background: var(--brand); }
        .essai-switch-knob {
          position: absolute; top: 2px; left: 2px;
          width: 20px; height: 20px;
          background: white; border-radius: 50%;
          transition: transform .2s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }
        .essai-switch.on .essai-switch-knob { transform: translateX(18px); }
        .essai-config {
          margin-top: 16px; padding-top: 16px;
          border-top: 1px solid var(--border);
          display: flex; flex-direction: column; gap: 16px;
        }
        .essai-radio-group { display: flex; flex-direction: column; gap: 6px; }
        .essai-radio-opt {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 10px 12px; border: 1.5px solid var(--border);
          border-radius: 10px; cursor: pointer; transition: all 0.15s;
        }
        .essai-radio-opt.active { border-color: var(--brand); background: var(--brand-light); }
        .essai-radio-opt input { margin-top: 4px; accent-color: var(--brand); }
        .essai-radio-label { font-size: 0.875rem; font-weight: 600; color: var(--text-primary); }
        .essai-radio-desc { font-size: 0.75rem; color: var(--text-secondary); margin-top: 2px; line-height: 1.4; }
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
  // Modal d'édition d'un lieu :
  //   null            → modal fermée
  //   { id: null, ...} → mode "création"
  //   { id: 'uuid', ...} → mode "édition"
  const [lieuEdit, setLieuEdit] = useState(null);
  const [lieuSaving, setLieuSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profil');
  const [reglagesSubTab, setReglagesSubTab] = useState('general');
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

  // Garde des modifs non enregistrées : géré désormais par <UnsavedChangesGuard />
  // (popstate retour navigateur + beforeunload tab close + modal pretty)

  // Re-charger les données serveur (= annuler les modifs locales)
  const handleDiscard = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (prof) {
      setProfile(prof);
      // Reset les états notif/anniv qui ne sont pas dans `profile`
      setNotifNouveauClient(prof.notif_nouveau_client !== false);
      setNotifPaiementRetard(prof.notif_paiement_retard !== false);
      setNotifCarnetEpuise(prof.notif_carnet_epuise !== false);
      setNotifAbonnementExpire(prof.notif_abonnement_expire !== false);
      setAnnivMode(prof.anniversaire_mode || 'semi');
      setAnnivMessage(prof.anniversaire_message || '');
      setAnnivCadeauActif(prof.anniversaire_cadeau_actif || false);
      setAnnivCadeauOffreId(prof.anniversaire_cadeau_offre_id || '');
      setAnnivCadeauType(prof.anniversaire_cadeau_type || 'gratuit');
      setAnnivCadeauRemisePct(prof.anniversaire_cadeau_remise_pct || 20);
    }
    setDirty(false);
    toast.success('Modifications annulées');
  };

  // --- Lieux ---
  // Ouvre la modal en mode "création" (ou "édition" si on passe un lieu existant)
  const openLieuModal = (lieu = null) => {
    setLieuEdit(lieu ? { ...lieu } : { id: null, nom: '', adresse: '', ville: '', notes: '' });
  };

  // Ferme la modal sans sauvegarder
  const closeLieuModal = () => {
    if (lieuSaving) return;
    setLieuEdit(null);
  };

  // Sauvegarde le lieu (insert si id null, update sinon)
  const saveLieu = async () => {
    if (!lieuEdit?.nom?.trim()) {
      toast.error('Le nom du lieu est obligatoire');
      return;
    }
    setLieuSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const payload = {
      nom: lieuEdit.nom.trim(),
      adresse: lieuEdit.adresse?.trim() || null,
      ville: lieuEdit.ville?.trim() || null,
      notes: lieuEdit.notes?.trim() || null,
    };

    if (lieuEdit.id) {
      // Update existant
      const { error } = await supabase.from('lieux').update(payload).eq('id', lieuEdit.id);
      if (error) {
        toast.error('Erreur : ' + error.message);
        setLieuSaving(false);
        return;
      }
      setLieux(prev => prev.map(l => l.id === lieuEdit.id ? { ...l, ...payload } : l));
      toast.success('Lieu modifié');
    } else {
      // Création
      const { data, error } = await supabase.from('lieux').insert({
        ...payload,
        profile_id: user.id,
        ordre: lieux.length,
      }).select().single();
      if (error || !data) {
        toast.error('Erreur : ' + (error?.message || 'lieu non créé'));
        setLieuSaving(false);
        return;
      }
      setLieux(prev => [...prev, data]);
      toast.success('Lieu ajouté');
    }
    setLieuSaving(false);
    setLieuEdit(null);
  };

  const removeLieu = async (id) => {
    const lieu = lieux.find(l => l.id === id);
    const nom = lieu?.nom?.trim() || 'ce lieu';
    if (!confirm(`Supprimer "${nom}" ? Les cours déjà associés à ce lieu garderont leur référence textuelle, mais tu ne pourras plus le sélectionner.`)) {
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.from('lieux').delete().eq('id', id);
    if (error) {
      toast.error('Erreur : ' + error.message);
      return;
    }
    setLieux(prev => prev.filter(l => l.id !== id));
    toast.success('Lieu supprimé');
  };

  // --- Save profile ---
  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();

    // === Auto-magie : si la prof a renseigné un studio_nom mais qu'aucun slug
    // n'existe encore, on en génère un automatiquement + on active le portail public.
    // Objectif : que l'inscription / configuration soit "zéro friction" pour des
    // utilisatrices non-tek (profs de yoga, pilates, etc.). Pas besoin qu'elles
    // comprennent ce qu'est un slug ni d'aller cocher "activer ma page publique".
    let computedSlug = profile.studio_slug || null;
    let computedPortailActif = profile.portail_actif === true;

    if (profile.studio_nom && !computedSlug) {
      const baseSlug = slugify(profile.studio_nom) || 'studio';
      // Vérifier l'unicité — si déjà pris par un autre studio, on suffixe -2, -3, ...
      let candidate = baseSlug;
      let suffix = 1;
      // Limite de sécurité (ne devrait jamais arriver en pratique)
      while (suffix < 50) {
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('studio_slug', candidate)
          .neq('id', profile.id)
          .maybeSingle();
        if (!existing) break;
        suffix += 1;
        candidate = `${baseSlug}-${suffix}`;
      }
      computedSlug = candidate;
    }

    // Si on a un slug (qu'on vient de générer OU qui existait déjà), on s'assure
    // que le portail public est actif — sinon la page /p/{slug} renvoie 404 à cause
    // de la RLS publique (v25) qui filtre sur portail_actif = true.
    if (computedSlug && !computedPortailActif) {
      computedPortailActif = true;
    }

    const { error } = await supabase.from('profiles').update({
      prenom: profile.prenom,
      nom: profile.nom,
      // email_contact = email de contact public (différent de auth.users.email
      // qui est l'email de connexion, géré par Supabase Auth). Rempli auto au
      // signup par le trigger handle_new_user, modifiable ici.
      email_contact: profile.email_contact || null,
      studio_nom: profile.studio_nom,
      studio_slug: computedSlug,
      portail_actif: computedPortailActif,
      adresse: profile.adresse,
      ville: profile.ville,
      telephone: profile.telephone,
      metier: profile.metier,
      lieu_principal: profile.lieu_principal || null,
      // ui_couleur / ui_illustration / ui_grille_active / ui_animation_active
      // ne sont plus modifiables via l'app (palette imposée brand IziSolo).
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
      // URLs : normaliser pour respecter la contrainte CHECK (must start with http(s)://)
      // Si vide → null, sinon préfixer https:// si absent
      instagram_url:           normalizeUrl(profile.instagram_url),
      facebook_url:            normalizeUrl(profile.facebook_url),
      website_url:             normalizeUrl(profile.website_url),
      // Cours d'essai (v29)
      essai_actif:                profile.essai_actif === true,
      essai_mode:                 profile.essai_mode || 'manuel',
      essai_paiement:             profile.essai_paiement || 'gratuit',
      essai_prix:                 parseFloat(profile.essai_prix) || 0,
      essai_stripe_payment_link:  profile.essai_stripe_payment_link || null,
      essai_message:              profile.essai_message || null,
      // Visibilité par défaut des cours (v30)
      visibilite_default:         profile.visibilite_default || 'public',
    }).eq('id', profile.id);

    if (!error) {
      // Refléter immédiatement le slug + activation auto dans l'état local,
      // pour que l'UI affiche tout de suite l'URL publique sans rechargement manuel.
      setProfile(prev => ({
        ...prev,
        studio_slug: computedSlug,
        portail_actif: computedPortailActif,
      }));
      router.refresh();
      if (computedSlug && computedSlug !== profile.studio_slug) {
        toast.success(`Page publique activée : /p/${computedSlug}`);
      } else {
        toast.success('Paramètres enregistrés !');
      }
      setDirty(false);
    } else {
      toast.error('Erreur : ' + error.message);
    }
    setSaving(false);
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Chargement...</div>;

  return (
    <div className="parametres">
      {/* Garde-fou : intercepte le bouton retour navigateur + beforeunload */}
      <UnsavedChangesGuard dirty={dirty} onConfirmLeave={() => setDirty(false)} />

      {/* Barre sticky en bas — Enregistrer / Annuler toujours accessibles */}
      <UnsavedChangesBar
        dirty={dirty}
        saving={saving}
        onSave={handleSave}
        onDiscard={handleDiscard}
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
              <input className="izi-input" type="email" value={profile.email_contact || ''} onChange={handleChange('email_contact')} placeholder="ton@email.com" />
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

            {lieux.length > 0 ? (
              <div className="lieux-list">
                {lieux.map(lieu => (
                  <div key={lieu.id} className="lieu-card">
                    <div className="lieu-card-icon"><MapPin size={18} /></div>
                    <div className="lieu-card-info">
                      <div className="lieu-card-nom">{lieu.nom}</div>
                      {(lieu.adresse || lieu.ville) && (
                        <div className="lieu-card-adresse">
                          {[lieu.adresse, lieu.ville].filter(Boolean).join(' — ')}
                        </div>
                      )}
                      {lieu.notes && <div className="lieu-card-notes">{lieu.notes}</div>}
                    </div>
                    <div className="lieu-card-actions">
                      <button
                        className="lieu-action-btn"
                        onClick={() => openLieuModal(lieu)}
                        title="Modifier"
                        aria-label={`Modifier ${lieu.nom}`}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="lieu-action-btn lieu-action-danger"
                        onClick={() => removeLieu(lieu.id)}
                        title="Supprimer"
                        aria-label={`Supprimer ${lieu.nom}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="lieux-empty">
                <MapPin size={20} />
                <span>Aucun lieu pour l'instant. Ajoute ta première salle pour pouvoir l'associer à tes cours.</span>
              </div>
            )}

            <button
              className="izi-btn izi-btn-secondary lieu-add-btn"
              onClick={() => openLieuModal(null)}
              type="button"
            >
              <Plus size={18} /> Ajouter un lieu
            </button>
          </div>

          {/* === Modal édition lieu === */}
          {lieuEdit && (
            <div
              className="modal-backdrop"
              onClick={e => { if (e.target === e.currentTarget) closeLieuModal(); }}
            >
              <div className="modal-sheet animate-slide-up" role="dialog" aria-modal="true">
                <div className="modal-header">
                  <span className="modal-title">
                    {lieuEdit.id ? 'Modifier le lieu' : 'Nouveau lieu'}
                  </span>
                  <button className="modal-close" onClick={closeLieuModal} type="button" aria-label="Fermer">
                    <X size={20} />
                  </button>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="form-label">Nom d'affichage *</label>
                    <input
                      className="izi-input"
                      value={lieuEdit.nom || ''}
                      onChange={e => setLieuEdit(prev => ({ ...prev, nom: e.target.value }))}
                      placeholder="Ex: Studio Lotus, Salle des fêtes..."
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveLieu();
                      }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Adresse</label>
                    <input
                      className="izi-input"
                      value={lieuEdit.adresse || ''}
                      onChange={e => setLieuEdit(prev => ({ ...prev, adresse: e.target.value }))}
                      placeholder="12 rue des Lilas"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Ville</label>
                    <input
                      className="izi-input"
                      value={lieuEdit.ville || ''}
                      onChange={e => setLieuEdit(prev => ({ ...prev, ville: e.target.value }))}
                      placeholder="Lyon"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Notes (interne)</label>
                    <textarea
                      className="izi-input"
                      rows={3}
                      value={lieuEdit.notes || ''}
                      onChange={e => setLieuEdit(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Code d'entrée, infos parking, etc. (visible uniquement par toi)"
                    />
                  </div>

                  <div className="modal-footer">
                    <button
                      className="izi-btn izi-btn-secondary"
                      onClick={closeLieuModal}
                      type="button"
                      disabled={lieuSaving}
                    >
                      Annuler
                    </button>
                    <button
                      className="izi-btn izi-btn-primary"
                      onClick={saveLieu}
                      type="button"
                      disabled={lieuSaving || !lieuEdit.nom?.trim()}
                    >
                      {lieuSaving ? <><Loader2 size={16} className="spin" /> Enregistrement…</> : (lieuEdit.id ? 'Enregistrer' : 'Ajouter')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

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

          {/* Visibilité par défaut des cours */}
          <VisibiliteSection
            profile={profile}
            setProfile={setProfile}
            setDirty={setDirty}
          />

          {/* Cours d'essai pour visiteurs */}
          <CoursEssaiSection
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

          {/* === SOUS-ONGLET APPARENCES retiré ===
              Palette de couleur + décor visuel + grille/animation d'arrière-plan
              ne sont plus personnalisables — on impose le brand IziSolo (rose
              tonal Claude Design) pour assurer la cohérence visuelle. Les colonnes
              ui_couleur / ui_illustration / ui_grille_active / ui_animation_active
              restent en DB mais ne sont plus exposées. */}

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

          {/* Plan actuel — dynamique selon le plan EFFECTIF (incluant trial) */}
          {(() => {
            const trial = getTrialStatus(profile);
            const realPlanKey = profile?.plan || 'solo';
            const currentPlanKey = effectivePlanFromTrial(profile);
            const currentPlan = PLANS[currentPlanKey] || PLANS.solo;
            const isFree = currentPlanKey === 'free';
            const isPremium = currentPlanKey === 'premium';
            const isTrialActive = trial.active;
            // Liste des features à afficher avec leur statut selon le plan
            // (label visible + clé dans l'objet PLANS pour vérif inclusion)
            const featuresList = [
              {
                label: currentPlan.limiteClients == null
                  ? 'Élèves illimités'
                  : `Jusqu'à ${currentPlan.limiteClients} élèves`,
                included: true,
              },
              {
                label: currentPlan.limiteLieux == null
                  ? 'Lieux illimités'
                  : currentPlan.limiteLieux === 1 ? '1 lieu' : `Jusqu'à ${currentPlan.limiteLieux} lieux`,
                included: true,
              },
              { label: 'Cours, agenda, pointage présences', included: true },
              { label: 'Carnets / abonnements / paiements manuels', included: true },
              { label: 'Stripe Payment Link (encaissement en ligne)', included: currentPlan.stripePaymentLink },
              { label: 'Mailing campagnes + SMS à l\'usage', included: currentPlan.mailing },
              { label: 'Notifications auto élèves (rappels, expirations)', included: currentPlan.notifsElevesAuto },
              { label: 'Sondages planning + cours d\'essai', included: currentPlan.sondages },
              { label: 'Page publique enrichie (bio, FAQ, philosophie)', included: currentPlan.portailEnrichi },
              { label: 'Annulation par l\'élève + dette tardive', included: currentPlan.annulationParEleve },
              { label: 'Export comptabilité', included: currentPlan.exportCompta },
              { label: 'Logo studio dans emails (white-label)', included: currentPlan.brandingEmail },
              { label: '0% frais Stripe IziSolo', included: currentPlan.fraisStripeIziSolo === 0 && !isFree },
            ];
            return (
              <div className="section izi-card">
                <div className="section-top">
                  <div className="section-icon abo-icon"><Crown size={20} /></div>
                  <h2>Mon abonnement</h2>
                </div>

                <div className="abo-current">
                  <div className="abo-badge">{currentPlan.nom}</div>
                  <p className="abo-status">
                    {isTrialActive ? (
                      <>
                        Tu profites d'un essai <strong>Pro</strong> — il te reste{' '}
                        <strong>{trial.daysLeft} {trial.daysLeft > 1 ? 'jours' : 'jour'}</strong>.
                        Choisis ton abonnement ci-dessous quand tu es prêt·e.
                      </>
                    ) : isFree ? (
                      <>Tu utilises actuellement le plan <strong>{currentPlan.nom}</strong> (compte interne — full access).</>
                    ) : trial.expired ? (
                      <>
                        Ton essai est terminé. Choisis ton plan ci-dessous pour continuer
                        à utiliser IziSolo.
                      </>
                    ) : (
                      <>
                        Tu utilises actuellement le plan <strong>{currentPlan.nom}</strong>
                        {currentPlan.prix > 0 && ` à ${currentPlan.prix} €/mois`}.
                      </>
                    )}
                  </p>
                </div>

                <div className="abo-features">
                  {featuresList.map((f, i) => (
                    <div key={i} className={`abo-feature ${f.included ? 'included' : 'locked'}`}>
                      <span className={f.included ? 'abo-check' : 'abo-lock'}>
                        {f.included ? '✓' : '🔒'}
                      </span>
                      <span>{f.label}</span>
                    </div>
                  ))}
                </div>

                {!isPremium && !isFree && (
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 12 }}>
                    Tu peux upgrader ton plan ci-dessous pour débloquer plus de fonctionnalités.
                  </p>
                )}
              </div>
            );
          })()}

          {/* Plans */}
          <AbonnementCheckout currentPlan={profile?.plan || 'solo'} />

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
        .lieux-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 4px; }
        .lieu-card {
          display: flex; align-items: flex-start; gap: 12px;
          padding: 12px 14px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
        }
        .lieu-card:hover {
          border-color: var(--brand-300, #d4b8a0);
          box-shadow: 0 1px 4px rgba(70, 35, 25, 0.06);
        }
        .lieu-card-icon {
          flex-shrink: 0;
          width: 36px; height: 36px;
          display: flex; align-items: center; justify-content: center;
          background: var(--brand-light);
          color: var(--brand-700);
          border-radius: var(--radius-sm);
        }
        .lieu-card-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
        .lieu-card-nom { font-weight: 600; font-size: 0.9375rem; color: var(--text-primary); line-height: 1.3; }
        .lieu-card-adresse { font-size: 0.8125rem; color: var(--text-secondary); line-height: 1.4; }
        .lieu-card-notes {
          font-size: 0.75rem; color: var(--text-muted);
          font-style: italic; margin-top: 2px;
          overflow: hidden; text-overflow: ellipsis;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
        }
        .lieu-card-actions { display: flex; gap: 4px; flex-shrink: 0; }
        .lieu-action-btn {
          width: 32px; height: 32px;
          display: flex; align-items: center; justify-content: center;
          background: transparent;
          border: 1px solid transparent;
          border-radius: var(--radius-sm);
          color: var(--text-muted);
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .lieu-action-btn:hover {
          background: var(--cream);
          color: var(--text-primary);
          border-color: var(--border);
        }
        .lieu-action-danger:hover {
          background: #fef2f2;
          color: var(--danger);
          border-color: #fecaca;
        }
        .lieu-add-btn {
          width: 100%;
          justify-content: center;
          gap: 8px;
        }
        .lieux-empty {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 14px;
          background: var(--cream);
          border: 1px dashed var(--border);
          border-radius: var(--radius-md);
          color: var(--text-muted);
          font-size: 0.8125rem;
          line-height: 1.4;
          margin-bottom: 8px;
        }
        .lieux-empty svg { flex-shrink: 0; margin-top: 2px; opacity: 0.7; }

        /* Modal lieu — réutilise le pattern .modal-* du reste de l'app */
        .modal-backdrop {
          position: fixed; inset: 0;
          background: rgba(0, 0, 0, 0.45);
          z-index: 200;
          display: flex; align-items: flex-end; justify-content: center;
        }
        @media (min-width: 600px) {
          .modal-backdrop { align-items: center; }
        }
        .modal-sheet {
          background: var(--bg-card);
          border-radius: var(--radius-lg) var(--radius-lg) 0 0;
          width: 100%; max-width: 480px; max-height: 90vh;
          display: flex; flex-direction: column; overflow: hidden;
        }
        @media (min-width: 600px) {
          .modal-sheet { border-radius: var(--radius-lg); }
        }
        .modal-header {
          display: flex; align-items: center; gap: 8px;
          padding: 16px 16px 12px;
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
        }
        .modal-title { flex: 1; font-weight: 700; font-size: 1rem; color: var(--text-primary); }
        .modal-close {
          background: none; border: none;
          width: 36px; height: 36px;
          display: flex; align-items: center; justify-content: center;
          color: var(--text-secondary);
          cursor: pointer;
          border-radius: var(--radius-sm);
        }
        .modal-close:hover { background: var(--cream-dark); }
        .modal-body {
          padding: 16px;
          overflow-y: auto;
          display: flex; flex-direction: column; gap: 14px;
        }
        .modal-footer {
          display: flex; gap: 8px; justify-content: flex-end;
          padding-top: 8px;
          margin-top: 4px;
          border-top: 1px solid var(--border);
        }
        .modal-footer .izi-btn { min-width: 110px; justify-content: center; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

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
