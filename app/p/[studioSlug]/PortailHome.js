'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { MapPin, Calendar, Clock, Users, ChevronRight, ChevronLeft, Search, CreditCard, Ticket, CalendarCheck, Zap, Instagram, Facebook, Globe, Award, BookOpen, LayoutGrid, List, Check, Loader } from 'lucide-react';
import { toneForCours } from '@/lib/tones';
import ScrollReveal from '@/components/landing/ScrollReveal';
import { useToast } from '@/components/ui/ToastProvider';

// Helpers semaine
function getWeekStart(date) {
  // Lundi = 1, Dimanche = 0 → on veut le lundi de la semaine
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}
function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function fmtIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function fmtWeekRange(start) {
  const end = addDays(start, 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const sameYear  = start.getFullYear() === end.getFullYear();
  if (sameMonth) {
    return `${start.getDate()}–${end.getDate()} ${MOIS[end.getMonth()]}${sameYear ? '' : ' ' + end.getFullYear()}`;
  }
  return `${start.getDate()} ${MOIS[start.getMonth()]} – ${end.getDate()} ${MOIS[end.getMonth()]}`;
}
const JOURS_LONG = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

const TYPE_ICONS = { carnet: Ticket, abonnement: CalendarCheck, cours_unique: Zap };

const JOURS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MOIS = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc'];

function formatDateCourt(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((date - today) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Aujourd\'hui';
  if (diff === 1) return 'Demain';
  return `${JOURS[date.getDay()]} ${d} ${MOIS[m - 1]}`;
}

function formatHeure(h) {
  if (!h) return '';
  const [hh, mm] = h.split(':');
  return mm === '00' ? `${parseInt(hh)}h` : `${parseInt(hh)}h${mm}`;
}

function PlacesBadge({ capacite, inscrits, afficherInscrits = true }) {
  if (!capacite) return null;
  const dispo = capacite - inscrits;
  // "Complet" reste toujours affiché (info utile). Si la jauge est masquée
  // (afficherInscrits=false), on n'expose pas le détail places/inscrits.
  if (dispo <= 0) return <span className="portail-tag portail-tag-amber">Complet</span>;
  if (!afficherInscrits) return null;
  if (dispo <= 3) return <span className="portail-tag portail-tag-amber">{dispo} place{dispo > 1 ? 's' : ''}</span>;
  return <span className="portail-tag portail-tag-green">Places disponibles</span>;
}

export default function PortailHome({ profile, cours, offresStripe = [], offresPubliques = [], sondageActif = null, studioSlug, isPreview = false, isDemo = false, currentClient = null, reservedCoursIds = [] }) {
  // Suffixe de query pour préserver le mode demo dans les liens internes
  const demoQS = isDemo ? '?demo=1' : '';

  // ── Réservation 1 clic (élève connecté + reconnu) ──────────────────────────
  // currentClient = { nom, email } d'un visiteur qui a déjà une fiche dans ce
  // studio. Pour lui, les cartes de cours portent un bouton « Réserver » qui
  // réserve directement (toast + bascule « Inscrit·e »), sans page intermédiaire.
  // Désactivé en aperçu/démo (le pro qui visite n'est pas un élève).
  const { toast } = useToast();
  const canQuickBook = !!currentClient && !isPreview && !isDemo;
  const [reserved, setReserved] = useState(() => new Set(reservedCoursIds));
  const [pendingId, setPendingId] = useState(null);

  const handleQuickReserve = async (c) => {
    if (!currentClient || pendingId) return;
    setPendingId(c.id);
    try {
      const res = await fetch(`/api/portail/${studioSlug}/reserver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coursId: c.id, nom: currentClient.nom, email: currentClient.email }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        // 409 « déjà inscrit » → on bascule quand même en « Inscrit·e »
        if (res.status === 409 && /déjà inscrit/i.test(json.error || '')) {
          setReserved(prev => new Set(prev).add(c.id));
          toast.warning('Tu es déjà inscrit·e à ce cours.');
          return;
        }
        // Complet → renvoyer vers la page du cours (liste d'attente)
        if (res.status === 409 && /complet/i.test(json.error || '')) {
          toast.warning('Ce cours est complet — rejoins la liste d\'attente depuis sa page.');
          return;
        }
        throw new Error(json.error || 'La réservation a échoué');
      }
      setReserved(prev => new Set(prev).add(c.id));
      toast.success('C\'est réservé ! 🌿');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setPendingId(null);
    }
  };

  // Rend l'action à droite d'une carte de cours : bouton « Réserver » 1 clic
  // pour un élève reconnu, badge « Inscrit·e » s'il l'est déjà, sinon le chevron
  // classique (visiteur non connecté → la carte mène à la page de réservation).
  const renderCoursAction = (c) => {
    const dispo = c.capacite_max ? c.capacite_max - c.nbInscrits : null;
    const complet = dispo !== null && dispo <= 0;
    if (canQuickBook && reserved.has(c.id)) {
      return <span className="portail-resa-done"><Check size={13} /> Inscrit·e</span>;
    }
    if (canQuickBook && !complet) {
      // <span role=button> (et non <button>) car la carte est un <Link> (<a>) :
      // un <button> imbriqué dans un <a> est du HTML invalide → warning + DOM
      // « réparé » par le navigateur. Le span reste valide et accessible.
      const activate = (e) => { e.preventDefault(); e.stopPropagation(); handleQuickReserve(c); };
      const busy = pendingId === c.id;
      return (
        <span
          role="button"
          tabIndex={0}
          aria-disabled={busy}
          className="portail-resa-btn"
          onClick={activate}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') activate(e); }}
        >
          {busy ? <><Loader size={13} className="spin" /> …</> : 'Réserver'}
        </span>
      );
    }
    return <ChevronRight size={16} style={{ color: '#ccc' }} />;
  };
  const hasAbout = !!(profile.bio || profile.philosophie || profile.formations || profile.annees_experience);
  const hasSocial = !!(profile.instagram_url || profile.facebook_url || profile.website_url);
  const faq = Array.isArray(profile.faq_publique) ? profile.faq_publique.filter(f => f?.q && f?.a) : [];
  const adresseComplete = [profile.adresse, profile.code_postal, profile.ville].filter(Boolean).join(', ');
  const mapsQuery = adresseComplete ? encodeURIComponent(adresseComplete) : null;
  const hasTarifs = !!(profile.afficher_tarifs && offresPubliques.length > 0);
  const horairesVisibles = !!(profile.afficher_horaires && profile.horaires_studio);
  const hasInfos  = !!(adresseComplete || horairesVisibles || faq.length > 0 || hasSocial);

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [tab, setTab] = useState('cours'); // 'cours' | 'propos' | 'tarifs' | 'infos'
  const [viewMode, setViewMode] = useState('week'); // 'week' | 'list'
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));

  const weekEnd = addDays(weekStart, 6);
  const weekStartIso = fmtIsoDate(weekStart);
  const weekEndIso   = fmtIsoDate(weekEnd);

  // Tous les types uniques présents dans les cours
  const types = useMemo(() => {
    return [...new Set(cours.map(c => c.type_cours).filter(Boolean))];
  }, [cours]);

  const filtered = useMemo(() => {
    // Masque les cours déjà commencés : un cours de 9h disparaît à 9h00,
    // pas à minuit. Même règle que "prochainCours" (heure locale du visiteur).
    const todayIso = fmtIsoDate(new Date());
    const now = new Date();
    const nowHH = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    return cours.filter(c => {
      if (c.date < todayIso) return false;
      if (c.date === todayIso && c.heure && c.heure.slice(0, 5) <= nowHH) return false;
      const matchSearch = !search ||
        (c.nom || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.type_cours || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.lieu || '').toLowerCase().includes(search.toLowerCase());
      const matchType = !filterType || c.type_cours === filterType;
      return matchSearch && matchType;
    });
  }, [cours, search, filterType]);

  // En mode "semaine" on filtre aussi par plage de dates
  const filteredForView = useMemo(() => {
    if (viewMode !== 'week') return filtered;
    return filtered.filter(c => c.date >= weekStartIso && c.date <= weekEndIso);
  }, [filtered, viewMode, weekStartIso, weekEndIso]);

  // Grouper par date
  const grouped = useMemo(() => {
    const map = new Map();
    filteredForView.forEach(c => {
      if (!map.has(c.date)) map.set(c.date, []);
      map.get(c.date).push(c);
    });
    return [...map.entries()];
  }, [filteredForView]);

  // Pour la vue semaine : on construit les 7 jours (même vides) pour qu'ils soient tous représentés
  const weekDays = useMemo(() => {
    if (viewMode !== 'week') return null;
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i);
      const iso = fmtIsoDate(d);
      const todayIso = fmtIsoDate(new Date());
      days.push({
        date: d,
        iso,
        isToday: iso === todayIso,
        cours: filteredForView.filter(c => c.date === iso),
      });
    }
    return days;
  }, [viewMode, weekStart, filteredForView]);

  // Prochain cours (le plus tôt, hors annulés, capacité dispo non requise)
  // Sert au CTA conversion "réserve maintenant" sous le hero.
  const prochainCours = useMemo(() => {
    const todayIso = fmtIsoDate(new Date());
    const now = new Date();
    const nowHH = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    const futurs = cours.filter(c => {
      if (c.est_annule) return false;
      if (c.date > todayIso) return true;
      if (c.date === todayIso && c.heure && c.heure > nowHH) return true;
      return false;
    });
    return futurs[0] || null;
  }, [cours]);

  return (
    <div>
      <ScrollReveal />

      {/* Studio header — hero photo moderne (pattern Lumorae : photo pure
          plein écran centré, dégradé doux, contenu sous la photo) */}
      {profile.photo_couverture ? (
        <>
          <div className="portail-hero-cover">
            <div className="portail-hero-cover-inner">
              <img
                className="portail-hero-img"
                src={profile.photo_couverture}
                alt=""
                style={{
                  objectPosition: `50% ${profile.photo_couverture_focal_y ?? 50}%`,
                }}
              />
              <div className="portail-hero-cover-fade" aria-hidden="true" />
            </div>
          </div>
          <header className="portail-hero-header">
            {profile.photo_url && (
              <div className="portail-hero-avatar">
                <img src={profile.photo_url} alt={profile.studio_nom} />
              </div>
            )}
            {(profile.metier || profile.ville) && (
              <div className="portail-hero-eyebrow">
                {[profile.metier, profile.ville, profile.code_postal].filter(Boolean).join(' · ')}
              </div>
            )}
            <h1 className="portail-hero-name">
              {(profile.studio_nom || '').split(' ').map((word, i, arr) => (
                <span key={i}>
                  <span className="portail-hero-word" style={{ '--word-index': i }}>
                    <span className="portail-hero-word-inner">{word}</span>
                  </span>
                  {i < arr.length - 1 && ' '}
                </span>
              ))}
            </h1>
          </header>
        </>
      ) : (
        <div className="portail-studio-header">
          <div className="portail-studio-avatar">
            {profile.photo_url
              ? <img src={profile.photo_url} alt={profile.studio_nom} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              : <span style={{ fontSize: '2rem' }}>🌿</span>
            }
          </div>
          <div>
            <h1 className="portail-studio-name">{profile.studio_nom}</h1>
            <div className="portail-studio-meta">
              {profile.metier && <span>{profile.metier}</span>}
              {(profile.ville || profile.code_postal) && (
                <span className="portail-studio-ville">
                  <MapPin size={12} />
                  {[profile.ville, profile.code_postal].filter(Boolean).join(' · ')}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {isPreview && (
        <div style={{
          background: '#fffaf0', border: '1px solid #ffe0b2', color: '#7c4a03',
          padding: '10px 14px', borderRadius: 10, marginBottom: 16,
          fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          👁 <strong>Mode aperçu</strong> — tu vois ton brouillon, pas encore publié.
        </div>
      )}

      {isDemo && (
        <div style={{
          background: 'linear-gradient(135deg, #fefaf5, #fef0dc)',
          border: '1.5px solid #f0c897',
          borderRadius: 12,
          padding: '14px 16px',
          marginBottom: 18,
          display: 'flex', alignItems: 'center', gap: 14,
          fontSize: '0.875rem', color: '#7c4a03', lineHeight: 1.4,
          flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: '1.4rem' }}>👁️</span>
          <div style={{ flex: 1, minWidth: 200 }}>
            <strong>Mode démo</strong> — tu visites ton portail comme une élève.
            <span style={{ fontWeight: 400, opacity: 0.85 }}> Réserve un cours pour tester, ou ouvre l'espace élève fictif (Camille, carnet 10 séances).</span>
          </div>
          <Link
            href={`/p/${studioSlug}/espace?demo=1`}
            style={{
              padding: '8px 16px',
              background: '#b87333',
              color: 'white',
              borderRadius: 99,
              fontSize: '0.8125rem',
              fontWeight: 600,
              textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            Voir l'espace démo →
          </Link>
        </div>
      )}

      {/* Bandeau sondage actif */}
      {sondageActif && (
        <Link
          href={`/p/${studioSlug}/sondage/${sondageActif.slug}${demoQS}`}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 14px', borderRadius: 14, marginBottom: 16,
            background: 'linear-gradient(135deg, var(--brand-light), white)',
            border: '1px solid var(--brand-200, #f0d0d0)',
            textDecoration: 'none', color: 'inherit',
          }}
        >
          <div style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: 'var(--brand)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.25rem',
          }}>✨</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
              {sondageActif.titre}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Aide {profile.studio_nom} à construire son planning idéal — 30 secondes
            </div>
          </div>
          <span style={{
            background: 'var(--brand)', color: 'white',
            padding: '6px 12px', borderRadius: 99,
            fontSize: '0.75rem', fontWeight: 700,
            flexShrink: 0,
          }}>Répondre →</span>
        </Link>
      )}

      {/* Bloc "Prochain cours" — conversion immédiate, calculé live */}
      {prochainCours && (
        <Link href={`/p/${studioSlug}/cours/${prochainCours.id}${demoQS}`} className="portail-next-cours reveal">
          <div className="portail-next-cours-eyebrow">Prochain cours</div>
          <div className="portail-next-cours-body">
            <div className="portail-next-cours-main">
              <div className="portail-next-cours-nom">{prochainCours.nom}</div>
              <div className="portail-next-cours-meta">
                <Calendar size={13} />
                <span>{formatDateCourt(prochainCours.date)}</span>
                {prochainCours.heure && (
                  <>
                    <span className="portail-next-cours-sep">·</span>
                    <Clock size={13} />
                    <span>{formatHeure(prochainCours.heure)}</span>
                  </>
                )}
                {prochainCours.lieu && (
                  <>
                    <span className="portail-next-cours-sep">·</span>
                    <MapPin size={13} />
                    <span>{prochainCours.lieu}</span>
                  </>
                )}
              </div>
            </div>
            <span className="portail-next-cours-cta">
              {prochainCours.capacite_max && (prochainCours.capacite_max - prochainCours.nbInscrits) <= 0
                ? <>Complet · liste d'attente <ChevronRight size={14} /></>
                : <>Réserver <ChevronRight size={14} /></>}
            </span>
          </div>
        </Link>
      )}

      {/* CTA Cours d'essai — UNIQUEMENT pour les visiteurs SANS compte.
          L'essai est un outil d'acquisition : un·e élève déjà connecté·e (a
          fortiori payant·e) ne doit jamais voir « cours d'essai offert » (évite
          l'ambiguïté + l'embarras). currentClient = fiche de l'élève connecté·e,
          null si anonyme (ou aperçu prof → CTA visible en preview). */}
      {profile.essai_actif && !currentClient && (
        <Link href={`/p/${studioSlug}/essai${demoQS}`} className="portail-essai-cta">
          <div className="portail-essai-cta-icon">✨</div>
          <div className="portail-essai-cta-body">
            <div className="portail-essai-cta-title">
              {profile.essai_paiement === 'gratuit'
                ? 'Réserve ton cours d\'essai offert'
                : `Réserve ton cours d\'essai · ${profile.essai_prix}€`}
            </div>
            <div className="portail-essai-cta-sub">
              Découvre le studio dans l'ambiance d'un vrai cours.
            </div>
          </div>
          <ChevronRight size={18} className="portail-essai-cta-arrow" />
        </Link>
      )}

      {/* Onglets */}
      <div className="portail-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'cours'}
          onClick={() => setTab('cours')}
          className={`portail-tab ${tab === 'cours' ? 'is-active' : ''}`}
        >
          <Calendar size={14} /> Cours
        </button>
        {hasAbout && (
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'propos'}
            onClick={() => setTab('propos')}
            className={`portail-tab ${tab === 'propos' ? 'is-active' : ''}`}
          >
            <Award size={14} /> À propos
          </button>
        )}
        {hasTarifs && (
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'tarifs'}
            onClick={() => setTab('tarifs')}
            className={`portail-tab ${tab === 'tarifs' ? 'is-active' : ''}`}
          >
            <Ticket size={14} /> Tarifs
          </button>
        )}
        {hasInfos && (
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'infos'}
            onClick={() => setTab('infos')}
            className={`portail-tab ${tab === 'infos' ? 'is-active' : ''}`}
          >
            <MapPin size={14} /> Infos
          </button>
        )}
      </div>

      {/* === ONGLET COURS === */}
      {tab === 'cours' && <>
      {/* Switch vue + nav semaine */}
      <div className="portail-view-bar">
        <div className="portail-view-toggle" role="tablist" aria-label="Mode d'affichage">
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'week'}
            onClick={() => setViewMode('week')}
            className={`portail-view-btn ${viewMode === 'week' ? 'is-active' : ''}`}
          >
            <LayoutGrid size={13} /> Semaine
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'list'}
            onClick={() => setViewMode('list')}
            className={`portail-view-btn ${viewMode === 'list' ? 'is-active' : ''}`}
          >
            <List size={13} /> Liste
          </button>
        </div>
        {viewMode === 'week' && (
          <div className="portail-week-nav">
            <button
              type="button"
              onClick={() => setWeekStart(addDays(weekStart, -7))}
              className="portail-week-nav-btn"
              aria-label="Semaine précédente"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="portail-week-label">{fmtWeekRange(weekStart)}</span>
            <button
              type="button"
              onClick={() => setWeekStart(addDays(weekStart, 7))}
              className="portail-week-nav-btn"
              aria-label="Semaine suivante"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Filtres */}
      <div className="portail-filters">
        <div className="portail-search-wrap">
          <Search size={15} style={{ color: '#aaa', flexShrink: 0 }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un cours…"
            className="portail-search-input"
          />
        </div>
        {types.length > 1 && (
          <div className="portail-type-pills">
            <button
              onClick={() => setFilterType('')}
              className={`portail-pill ${!filterType ? 'active' : ''}`}
            >Tous</button>
            {types.map(t => (
              <button
                key={t}
                onClick={() => setFilterType(filterType === t ? '' : t)}
                className={`portail-pill ${filterType === t ? 'active' : ''}`}
              >{t}</button>
            ))}
          </div>
        )}
      </div>

      {/* Vue semaine : tous les jours affichés (même vides) */}
      {viewMode === 'week' && weekDays && (
        <div className="portail-week-grid">
          {weekDays.map(day => (
            <div key={day.iso} className={`portail-week-day ${day.isToday ? 'is-today' : ''}`}>
              <div className="portail-week-day-label">
                <span className="portail-week-day-name">{JOURS_LONG[day.date.getDay()]}</span>
                <span className="portail-week-day-num">{day.date.getDate()}</span>
                {day.isToday && <span className="portail-week-day-badge">Aujourd'hui</span>}
              </div>
              {day.cours.length === 0 ? (
                <div className="portail-week-day-empty">—</div>
              ) : day.cours.map(c => {
                const dispo = c.capacite_max ? c.capacite_max - c.nbInscrits : null;
                const complet = dispo !== null && dispo <= 0;
                const tone = toneForCours(c.type_cours);
                return (
                  <Link
                    key={c.id}
                    href={`/p/${studioSlug}/cours/${c.id}${demoQS}`}
                    className={`portail-cours-card portail-cours-card--${tone} ${complet ? 'complet' : ''}`}
                  >
                    <div className="portail-cours-info">
                      <div className="portail-cours-nom">{c.nom}</div>
                      <div className="portail-cours-details">
                        <span><Clock size={12} /> {formatHeure(c.heure)}{c.duree_minutes ? ` · ${c.duree_minutes}min` : ''}</span>
                        {c.lieu && <span><MapPin size={12} /> {c.lieu}</span>}
                        {c.type_cours && <span className={`portail-tag portail-tag-${tone}`}>{c.type_cours}</span>}
                        {Number(c.tarif_unitaire) > 0 && (
                          <span className="portail-tag portail-tag-amber">{Number(c.tarif_unitaire).toFixed(2).replace('.', ',').replace(',00', '')} € / séance</span>
                        )}
                      </div>
                    </div>
                    <div className="portail-cours-right">
                      <PlacesBadge capacite={c.capacite_max} inscrits={c.nbInscrits} afficherInscrits={profile.afficher_inscrits !== false} />
                      {renderCoursAction(c)}
                    </div>
                  </Link>
                );
              })}
            </div>
          ))}
          {filteredForView.length === 0 && (
            <div className="portail-empty" style={{ marginTop: 8 }}>
              <p style={{ color: '#888', margin: 0 }}>Aucun cours cette semaine</p>
            </div>
          )}
        </div>
      )}

      {/* Vue liste : groupé par date sur 60 jours (comportement initial) */}
      {viewMode === 'list' && cours.length === 0 ? (
        <div className="portail-empty">
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📅</div>
          <p style={{ fontWeight: 600, margin: '0 0 6px' }}>Aucun cours à venir</p>
          <p style={{ color: '#888', fontSize: '0.875rem', margin: 0 }}>
            Les prochains cours seront affichés ici.
          </p>
        </div>
      ) : viewMode === 'list' && grouped.length === 0 ? (
        <div className="portail-empty">
          <p style={{ color: '#888' }}>Aucun cours correspond à ta recherche</p>
        </div>
      ) : viewMode === 'list' && grouped.map(([date, coursDate]) => (
        <div key={date} className="portail-day-group">
          <div className="portail-day-label">{formatDateCourt(date)}</div>
          {coursDate.map(c => {
            const dispo = c.capacite_max ? c.capacite_max - c.nbInscrits : null;
            const complet = dispo !== null && dispo <= 0;
            const tone = toneForCours(c.type_cours);
            return (
              <Link
                key={c.id}
                href={`/p/${studioSlug}/cours/${c.id}${demoQS}`}
                className={`portail-cours-card portail-cours-card--${tone} ${complet ? 'complet' : ''}`}
              >
                <div className="portail-cours-info">
                  <div className="portail-cours-nom">{c.nom}</div>
                  <div className="portail-cours-details">
                    <span><Clock size={12} /> {formatHeure(c.heure)}{c.duree_minutes ? ` · ${c.duree_minutes}min` : ''}</span>
                    {c.lieu && <span><MapPin size={12} /> {c.lieu}</span>}
                    {c.type_cours && <span className={`portail-tag portail-tag-${tone}`}>{c.type_cours}</span>}
                    {Number(c.tarif_unitaire) > 0 && (
                      <span className="portail-tag portail-tag-amber">{Number(c.tarif_unitaire).toFixed(2).replace('.', ',').replace(',00', '')} € / séance</span>
                    )}
                  </div>
                </div>
                <div className="portail-cours-right">
                  <PlacesBadge capacite={c.capacite_max} inscrits={c.nbInscrits} afficherInscrits={profile.afficher_inscrits !== false} />
                  {renderCoursAction(c)}
                </div>
              </Link>
            );
          })}
        </div>
      ))}
      </>}
      {/* === / ONGLET COURS === */}

      {/* === ONGLET À PROPOS === */}
      {tab === 'propos' && hasAbout && (
        <>
          {profile.bio && (
            <section className="portail-about reveal">
              <div className="portail-about-card">
                <p className="portail-about-bio">{profile.bio}</p>
                <div className="portail-about-meta">
                  {profile.annees_experience && (
                    <span className="portail-about-pill">
                      <Award size={13} /> {profile.annees_experience} an{profile.annees_experience > 1 ? 's' : ''} d'expérience
                    </span>
                  )}
                  {profile.formations && (
                    <span className="portail-about-pill">
                      <BookOpen size={13} /> {profile.formations}
                    </span>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Philosophie en versets numérotés (style magazine éditorial) */}
          {profile.philosophie && (() => {
            // On split sur les sauts de ligne doubles, OU sur les points si une
            // seule grosse phrase (max 3 versets affichés)
            let versets = profile.philosophie.split(/\n{2,}/).map(v => v.trim()).filter(Boolean);
            if (versets.length === 1) {
              // Pas de séparateur explicite → on split en phrases (max 3)
              versets = profile.philosophie.split(/(?<=[.!?])\s+/).map(v => v.trim()).filter(Boolean).slice(0, 3);
            } else {
              versets = versets.slice(0, 3);
            }
            return (
              <section className="portail-philo reveal">
                <div className="portail-philo-eyebrow">Ma philosophie</div>
                <div className="portail-philo-list">
                  {versets.map((v, i) => (
                    <div key={i} className="portail-philo-verset">
                      <span className="portail-philo-num">{String(i + 1).padStart(2, '0')}</span>
                      <p className="portail-philo-text">{v}</p>
                    </div>
                  ))}
                </div>
              </section>
            );
          })()}
        </>
      )}

      {/* === ONGLET TARIFS === */}
      {tab === 'tarifs' && hasTarifs && (
        <section className="portail-prices reveal">
          <div className="portail-prices-grid">
            {offresPubliques.map(o => {
              const Icon = TYPE_ICONS[o.type] || Ticket;
              const sub =
                o.type === 'carnet'      ? `Carnet de ${o.seances} séances` :
                o.type === 'abonnement'  ? (o.duree_jours ? `Abonnement ${o.duree_jours} jours` : 'Abonnement') :
                                            'Cours à l\'unité';
              const handleSpotlight = (e) => {
                const r = e.currentTarget.getBoundingClientRect();
                e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
                e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
              };
              return (
                <div key={o.id} className="portail-price-card" onMouseMove={handleSpotlight}>
                  <div className="portail-price-spotlight" aria-hidden="true" />
                  <div className="portail-price-icon"><Icon size={18} /></div>
                  <div className="portail-price-info">
                    <div className="portail-price-nom">{o.nom}</div>
                    <div className="portail-price-sub">{sub}</div>
                  </div>
                  <div className="portail-price-prix">{o.prix}€</div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* === ONGLET INFOS === */}
      {tab === 'infos' && hasInfos && <>
        {(adresseComplete || horairesVisibles) && (
          <section className="portail-venue reveal">
            <h2 className="portail-section-title">Où nous trouver</h2>
            <div className="portail-venue-card">
              {adresseComplete && (
                <div className="portail-venue-row">
                  <MapPin size={16} />
                  <div>
                    <div className="portail-venue-addr">{adresseComplete}</div>
                    {mapsQuery && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="portail-venue-link"
                      >
                        Itinéraire Google Maps →
                      </a>
                    )}
                  </div>
                </div>
              )}
              {profile.afficher_horaires && profile.horaires_studio && (
                <div className="portail-venue-row">
                  <Clock size={16} />
                  <div className="portail-venue-hours">{profile.horaires_studio}</div>
                </div>
              )}
            </div>
          </section>
        )}

        {faq.length > 0 && (
          <section className="portail-faq reveal">
            <h2 className="portail-section-title">Questions fréquentes</h2>
            <div className="portail-faq-list">
              {faq.map((item, i) => (
                <details key={i} className="portail-faq-item">
                  <summary className="portail-faq-q">
                    <span className="portail-faq-q-text">{item.q}</span>
                    <svg className="portail-faq-chevron" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                      <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </summary>
                  <p className="portail-faq-a">{item.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {hasSocial && (
          <section className="portail-social reveal">
            <h2 className="portail-section-title">Suivre le studio</h2>
            <div className="portail-social-row">
              {profile.instagram_url && (
                <a href={profile.instagram_url} target="_blank" rel="noopener noreferrer" className="portail-social-link" aria-label="Instagram">
                  <Instagram size={18} />
                </a>
              )}
              {profile.facebook_url && (
                <a href={profile.facebook_url} target="_blank" rel="noopener noreferrer" className="portail-social-link" aria-label="Facebook">
                  <Facebook size={18} />
                </a>
              )}
              {profile.website_url && (
                <a href={profile.website_url} target="_blank" rel="noopener noreferrer" className="portail-social-link" aria-label="Site web">
                  <Globe size={18} />
                </a>
              )}
            </div>
          </section>
        )}
      </>}

      {/* Section "Acheter en ligne" — affichée uniquement si au moins 1 offre a un Stripe Payment Link */}
      {offresStripe.length > 0 && (
        <div className="portail-stripe-section">
          <div className="portail-stripe-header">
            <CreditCard size={16} style={{ color: '#635bff' }} />
            <h2>Acheter en ligne</h2>
          </div>
          <p className="portail-stripe-desc">
            Paye ton carnet ou abonnement par CB en quelques clics.
          </p>
          <div className="portail-stripe-grid">
            {offresStripe.map(o => {
              const Icon = TYPE_ICONS[o.type] || Ticket;
              return (
                <a
                  key={o.id}
                  href={o.stripe_payment_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="portail-stripe-card"
                >
                  <div className="portail-stripe-card-icon">
                    <Icon size={18} />
                  </div>
                  <div className="portail-stripe-card-info">
                    <div className="portail-stripe-card-nom">{o.nom}</div>
                    {o.seances && (
                      <div className="portail-stripe-card-meta">{o.seances} séance{o.seances > 1 ? 's' : ''}</div>
                    )}
                  </div>
                  <div className="portail-stripe-card-prix">
                    {o.prix}€
                  </div>
                </a>
              );
            })}
          </div>
          <p className="portail-stripe-trust">
            🔒 Paiement sécurisé via Stripe — IziSolo ne stocke aucune donnée bancaire.
          </p>
        </div>
      )}

      <style jsx global>{`
        /* ─── Hero pattern Lumorae : photo pure cinématographique + contenu dessous ─ */
        .portail-hero-cover {
          /* Casser le padding du container pour aller plein écran */
          margin: -24px calc(50% - 50vw) 0;
          position: relative;
        }
        .portail-hero-cover-inner {
          position: relative;
          width: 100%;
          max-width: 1440px;
          margin: 0 auto;
          aspect-ratio: 16 / 9;
          overflow: hidden;
          background: #1a1612;
        }
        .portail-hero-img {
          display: block;
          width: 100%; height: 100%;
          object-fit: cover;
          will-change: transform;
          animation: portail-hero-kenburns 22s ease-out forwards;
          transform-origin: center;
        }
        @keyframes portail-hero-kenburns {
          from { transform: scale(1.08); }
          to   { transform: scale(1.00); }
        }
        /* Parallax léger sur scroll (Chrome 115+) */
        @supports (animation-timeline: scroll()) {
          .portail-hero-img {
            animation:
              portail-hero-kenburns 22s ease-out forwards,
              portail-hero-parallax linear both;
            animation-timeline: auto, scroll(root);
            animation-range: auto, 0 70vh;
          }
          @keyframes portail-hero-parallax {
            to { transform: scale(1.05) translate3d(0, 6%, 0); }
          }
        }
        /* Dégradé doux vers la couleur de fond (style Lumorae, pas sombre) */
        .portail-hero-cover-fade {
          position: absolute;
          left: 0; right: 0; bottom: 0;
          height: 25%;
          background: linear-gradient(to bottom, transparent, var(--bg-page, #faf8f5));
          pointer-events: none;
        }
        @media (max-width: 640px) {
          .portail-hero-cover-inner { aspect-ratio: 4 / 5; }
        }
        @media (min-width: 1024px) {
          .portail-hero-cover-inner { aspect-ratio: 21 / 9; }
        }

        /* En-tête sous la photo : avatar + nom + métier + ville */
        .portail-hero-header {
          position: relative;
          z-index: 2;
          margin: -64px auto 32px;
          max-width: 720px;
          padding: 0 16px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .portail-hero-avatar {
          width: 96px; height: 96px;
          border-radius: 50%;
          overflow: hidden;
          border: 4px solid var(--bg-page, #faf8f5);
          box-shadow: 0 6px 24px rgba(0,0,0,0.18);
          background: var(--bg-page, #faf8f5);
          margin-bottom: 18px;
        }
        .portail-hero-avatar img { display: block; width: 100%; height: 100%; object-fit: cover; }
        .portail-hero-eyebrow {
          font-family: 'Geist Mono', 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.7rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: #b87333;
          margin: 0 0 14px;
          opacity: 0;
          animation: portail-hero-fade-up 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          animation-delay: 130ms;
        }
        .portail-hero-name {
          font-family: 'Instrument Serif', Georgia, serif;
          font-size: clamp(2.25rem, 7vw, 4rem);
          font-weight: 400;
          line-height: 0.98;
          letter-spacing: -0.025em;
          margin: 0;
          color: #1a1a2e;
        }
        @media (max-width: 640px) {
          .portail-hero-header { margin-top: -56px; }
          .portail-hero-avatar { width: 80px; height: 80px; margin-bottom: 14px; }
        }

        /* Animations : text reveal mot-par-mot + fade-up */
        .portail-hero-name { display: block; }
        .portail-hero-word {
          display: inline-block;
          overflow: hidden;
          vertical-align: top;
        }
        .portail-hero-word-inner {
          display: inline-block;
          transform: translateY(110%);
          opacity: 0;
          animation: portail-hero-word-up 0.95s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          animation-delay: calc(180ms + var(--word-index, 0) * 90ms);
        }
        @keyframes portail-hero-word-up {
          to { transform: translateY(0); opacity: 1; }
        }
        .portail-hero-avatar {
          opacity: 0;
          animation: portail-hero-fade-up 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          animation-delay: 60ms;
        }
        @keyframes portail-hero-fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .portail-hero-img,
          .portail-hero-word-inner,
          .portail-hero-avatar,
          .portail-hero-eyebrow {
            animation: none;
            transform: none;
            opacity: 1;
          }
        }
        /* ─── Bloc "Prochain cours" — conversion immediate ───────────────── */
        .portail-next-cours {
          display: block;
          padding: 22px 26px;
          border-radius: 18px;
          background: linear-gradient(135deg, #fefaf5 0%, #fef3e6 100%);
          border: 1.5px solid #fde8d0;
          color: inherit;
          text-decoration: none;
          margin-bottom: 20px;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
          box-shadow: 0 1px 8px rgba(184, 115, 51, 0.04);
        }
        .portail-next-cours:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(184, 115, 51, 0.12);
          border-color: #f0c897;
        }
        .portail-next-cours-eyebrow {
          font-family: 'Geist Mono', 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.68rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: #b87333;
          margin-bottom: 10px;
        }
        .portail-next-cours-body {
          display: flex; align-items: center; gap: 16px;
          justify-content: space-between;
        }
        .portail-next-cours-main { flex: 1; min-width: 0; }
        .portail-next-cours-nom {
          font-family: 'Instrument Serif', Georgia, serif;
          font-size: 1.6rem;
          line-height: 1.05;
          letter-spacing: -0.015em;
          color: #1a1a2e;
          margin-bottom: 6px;
        }
        .portail-next-cours-meta {
          display: flex; align-items: center; flex-wrap: wrap;
          gap: 6px;
          font-size: 0.875rem;
          color: #7c4a03;
        }
        .portail-next-cours-meta svg { opacity: 0.7; }
        .portail-next-cours-sep { color: #d4a574; }
        .portail-next-cours-cta {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 10px 18px;
          background: #b87333;
          color: white;
          border-radius: 99px;
          font-size: 0.875rem;
          font-weight: 600;
          flex-shrink: 0;
          transition: background 0.15s ease;
        }
        .portail-next-cours:hover .portail-next-cours-cta {
          background: #a06228;
        }
        @media (max-width: 540px) {
          .portail-next-cours { padding: 18px 20px; }
          .portail-next-cours-body { flex-direction: column; align-items: stretch; gap: 12px; }
          .portail-next-cours-cta { justify-content: center; }
        }

        .portail-studio-header {
          display: flex; align-items: center; gap: 16px;
          margin-bottom: 24px; padding-bottom: 20px;
          border-bottom: 1px solid #f0ebe8;
        }
        .portail-studio-avatar {
          width: 64px; height: 64px; border-radius: 50%;
          background: #f8f0f0; display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; overflow: hidden;
        }
        .portail-studio-name { font-size: 1.375rem; font-weight: 800; margin: 0 0 4px; color: #1a1a2e; }
        .portail-studio-meta { display: flex; flex-wrap: wrap; gap: 10px; font-size: 0.875rem; color: #888; align-items: center; }
        .portail-studio-ville { display: flex; align-items: center; gap: 4px; }

        /* CTA Cours d'essai */
        .portail-essai-cta {
          display: flex; align-items: center; gap: 16px;
          padding: 20px 24px; margin-bottom: 20px;
          background: linear-gradient(135deg, var(--tone-rose-bg, #fdf6f4), white);
          border: 1.5px solid var(--tone-rose-accent, #c47070);
          border-radius: 16px;
          text-decoration: none; color: inherit;
          transition: transform 0.15s, box-shadow 0.15s;
          box-shadow: 0 2px 12px rgba(196, 112, 112, 0.08);
        }
        .portail-essai-cta:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 18px rgba(196, 112, 112, 0.15);
        }
        .portail-essai-cta-icon {
          width: 44px; height: 44px; flex-shrink: 0;
          font-size: 1.4rem;
          background: white; border: 1.5px solid var(--tone-rose-accent, #c47070);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
        }
        .portail-essai-cta-body { flex: 1; min-width: 0; }
        .portail-essai-cta-title {
          font-weight: 700; font-size: 0.9375rem;
          color: var(--tone-rose-ink, #8b3838);
        }
        .portail-essai-cta-sub {
          font-size: 0.8125rem; color: #888; margin-top: 2px;
        }
        .portail-essai-cta-arrow {
          color: var(--tone-rose-accent, #c47070); flex-shrink: 0;
        }

        /* Onglets de navigation portail */
        .portail-tabs {
          display: flex;
          gap: 4px;
          margin-bottom: 20px;
          padding: 4px;
          background: #faf6f0;
          border: 1px solid #ecdfd5;
          border-radius: 999px;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .portail-tabs::-webkit-scrollbar { display: none; }
        .portail-tab {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 14px;
          font-size: 0.8125rem; font-weight: 600;
          color: #a89c93;
          background: transparent; border: none;
          border-radius: 999px;
          cursor: pointer;
          white-space: nowrap;
          transition: all .15s;
        }
        .portail-tab:hover { color: #1a1612; }
        .portail-tab.is-active {
          background: white;
          color: #1a1612;
          box-shadow: 0 1px 3px rgba(70, 35, 25, 0.08);
        }

        /* View bar (toggle semaine/liste + nav semaine) */
        .portail-view-bar {
          display: flex; align-items: center; justify-content: space-between;
          gap: 10px; margin-bottom: 14px; flex-wrap: wrap;
        }
        .portail-view-toggle {
          display: inline-flex; gap: 2px; padding: 3px;
          background: #faf6f0; border: 1px solid #ecdfd5; border-radius: 999px;
        }
        .portail-view-btn {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 6px 12px;
          font-size: 0.75rem; font-weight: 600;
          color: #a89c93;
          background: transparent; border: none; border-radius: 999px;
          cursor: pointer; transition: all .15s;
        }
        .portail-view-btn:hover { color: #1a1612; }
        .portail-view-btn.is-active {
          background: white; color: #1a1612;
          box-shadow: 0 1px 3px rgba(70, 35, 25, 0.06);
        }
        .portail-week-nav {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 0.8125rem; font-weight: 600;
          color: #1a1612;
        }
        .portail-week-nav-btn {
          width: 30px; height: 30px;
          display: inline-flex; align-items: center; justify-content: center;
          background: white; border: 1px solid #ecdfd5; border-radius: 50%;
          color: #888; cursor: pointer; transition: all .15s;
        }
        .portail-week-nav-btn:hover { color: #1a1612; border-color: #1a1612; }
        .portail-week-label {
          padding: 0 10px; min-width: 110px; text-align: center;
        }

        /* Vue semaine — colonnes par jour */
        .portail-week-grid {
          display: flex; flex-direction: column; gap: 16px;
        }
        .portail-week-day {
          background: white;
          border: 1px solid #f0ebe8;
          border-radius: 14px;
          padding: 12px 14px;
        }
        .portail-week-day.is-today {
          border-color: var(--brand);
          box-shadow: 0 2px 12px rgba(212, 160, 160, 0.18);
        }
        .portail-week-day-label {
          display: flex; align-items: baseline; gap: 8px;
          font-size: 0.875rem; font-weight: 700; color: #1a1612;
          margin-bottom: 10px; padding-bottom: 8px;
          border-bottom: 1px dashed #ecdfd5;
        }
        .portail-week-day-name { text-transform: uppercase; letter-spacing: 0.04em; font-size: 0.75rem; }
        .portail-week-day-num  { font-size: 1.125rem; font-weight: 800; color: #1a1612; }
        .portail-week-day-badge {
          margin-left: auto;
          padding: 2px 8px; border-radius: 999px;
          background: var(--brand); color: white;
          font-size: 0.6875rem; font-weight: 700;
        }
        .portail-week-day-empty {
          color: #ccc; text-align: center; padding: 8px 0;
          font-size: 0.875rem;
        }
        /* Sur tablet+, afficher 2 colonnes pour exploiter l'espace */
        @media (min-width: 768px) {
          .portail-week-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        }

        .portail-filters { margin-bottom: 20px; display: flex; flex-direction: column; gap: 10px; }
        .portail-search-wrap {
          display: flex; align-items: center; gap: 8px;
          background: white; border: 1.5px solid #f0ebe8; border-radius: 10px;
          padding: 9px 12px;
        }
        .portail-search-input { flex: 1; border: none; outline: none; font-size: 0.9rem; background: transparent; }
        .portail-type-pills { display: flex; gap: 6px; flex-wrap: wrap; }
        .portail-pill {
          padding: 5px 12px; border-radius: 99px;
          border: 1px solid #e8e0db; background: white;
          font-size: 0.8125rem; font-weight: 500; cursor: pointer;
          color: #888; transition: all 0.15s;
        }
        .portail-pill:hover { border-color: #d4a0a0; color: #d4a0a0; }
        .portail-pill.active { background: #d4a0a0; border-color: #d4a0a0; color: white; }

        .portail-day-group { margin-bottom: 20px; }
        .portail-day-label {
          font-size: 0.8125rem; font-weight: 700; color: #888;
          text-transform: uppercase; letter-spacing: 0.05em;
          margin-bottom: 8px; padding-left: 2px;
        }
        .portail-cours-card {
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
          background: white; border-radius: 14px; padding: 16px;
          box-shadow: 0 1px 6px rgba(0,0,0,0.05); margin-bottom: 8px;
          text-decoration: none; color: inherit; transition: box-shadow 0.15s, transform 0.1s;
          border-left: 6px solid transparent;
        }
        .portail-cours-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.1); transform: translateY(-1px); }
        .portail-cours-card.complet { opacity: 0.6; }
        .portail-cours-info { flex: 1; min-width: 0; }
        .portail-cours-nom { font-weight: 700; font-size: 1rem; margin-bottom: 6px; color: #1a1a2e; }
        .portail-cours-details { display: flex; flex-wrap: wrap; gap: 8px; font-size: 0.8125rem; color: #888; align-items: center; }
        .portail-cours-details span { display: flex; align-items: center; gap: 4px; }
        .portail-cours-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

        /* Réservation 1 clic — bouton + état inscrit + spinner */
        .portail-resa-btn {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 7px 14px;
          background: #b87333; color: white;
          border: none; border-radius: 99px;
          font-size: 0.8125rem; font-weight: 700;
          cursor: pointer; white-space: nowrap;
          transition: background 0.15s ease, transform 0.1s ease;
        }
        .portail-resa-btn:hover:not([aria-disabled="true"]) { background: #a06228; }
        .portail-resa-btn:active:not([aria-disabled="true"]) { transform: scale(0.95); }
        .portail-resa-btn[aria-disabled="true"] { opacity: 0.7; cursor: default; }
        .portail-resa-done {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 6px 12px;
          background: #f0faf0; color: #2e7d32;
          border: 1px solid #c8e6c9; border-radius: 99px;
          font-size: 0.8125rem; font-weight: 700;
          white-space: nowrap;
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }

        /* Tons par type de cours : fond soft tinté + bord épais accent */
        .portail-cours-card--rose     { background: var(--tone-rose-bg);     border-left-color: var(--tone-rose-accent); }
        .portail-cours-card--sage     { background: var(--tone-sage-bg);     border-left-color: var(--tone-sage-accent); }
        .portail-cours-card--sand     { background: var(--tone-sand-bg);     border-left-color: var(--tone-sand-accent); }
        .portail-cours-card--lavender { background: var(--tone-lavender-bg); border-left-color: var(--tone-lavender-accent); }
        .portail-cours-card--ink      { background: var(--tone-ink-bg);      border-left-color: var(--tone-ink-bg); }

        .portail-tag-rose     { background: var(--tone-rose-bg);     color: var(--tone-rose-ink); }
        .portail-tag-sage     { background: var(--tone-sage-bg);     color: var(--tone-sage-ink); }
        .portail-tag-sand     { background: var(--tone-sand-bg);     color: var(--tone-sand-ink); }
        .portail-tag-lavender { background: var(--tone-lavender-bg); color: var(--tone-lavender-ink); }
        .portail-tag-ink      { background: var(--tone-ink-bg);      color: var(--tone-ink-text); }

        .portail-empty {
          text-align: center; padding: 48px 24px;
          color: #888; background: white; border-radius: 16px;
          box-shadow: 0 1px 6px rgba(0,0,0,0.04);
        }

        /* Sections enrichies (v14) */
        .portail-section-title {
          font-size: 0.8125rem; font-weight: 700; color: #888;
          text-transform: uppercase; letter-spacing: 0.05em;
          margin: 32px 0 12px; padding-left: 2px;
        }

        /* À propos — mise en page éditoriale */
        .portail-about-card {
          background: white; border-radius: 20px; padding: 28px 24px;
          box-shadow: 0 2px 16px rgba(70, 35, 25, 0.06);
          border: 1px solid #f4ede5;
        }
        .portail-about-bio {
          font-size: 1.0625rem;
          color: #1a1a2e;
          line-height: 1.65;
          margin: 0 0 18px;
          font-weight: 400;
        }
        .portail-about-bio:first-letter {
          font-family: 'Instrument Serif', Georgia, serif;
          font-size: 2.5em;
          font-weight: 400;
          float: left;
          line-height: 0.9;
          margin: 6px 8px 0 0;
          color: #b87333;
        }
        /* Philosophie en versets numérotés (ton lavender — spirituel/calme) */
        .portail-philo {
          margin: 32px -16px;
          padding: 44px 24px;
          background: var(--tone-lavender-bg-soft, #f7f4fa);
          border-radius: 24px;
        }
        .portail-philo-eyebrow {
          font-family: 'Geist Mono', 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.7rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: var(--tone-lavender-ink, #5a4d75);
          margin-bottom: 28px;
          text-align: center;
          opacity: 0.85;
        }
        .portail-philo-list {
          display: flex; flex-direction: column;
          gap: 32px;
          max-width: 640px;
          margin: 0 auto;
        }
        .portail-philo-verset {
          position: relative;
          padding: 0 0 0 64px;
        }
        .portail-philo-num {
          position: absolute;
          left: 0; top: -10px;
          font-family: 'Instrument Serif', Georgia, serif;
          font-style: italic;
          font-size: 2.75rem;
          font-weight: 400;
          color: var(--tone-lavender-accent, #8a7caa);
          opacity: 0.85;
          line-height: 1;
          letter-spacing: -0.02em;
        }
        .portail-philo-text {
          font-family: 'Instrument Serif', Georgia, serif;
          font-style: italic;
          font-size: 1.35rem;
          line-height: 1.5;
          color: var(--tone-lavender-ink, #5a4d75);
          margin: 0;
          letter-spacing: -0.005em;
        }
        @media (max-width: 540px) {
          .portail-philo-verset { padding-left: 50px; }
          .portail-philo-num { font-size: 2.25rem; }
          .portail-philo-text { font-size: 1.15rem; }
        }
        .portail-about-meta {
          display: flex; flex-wrap: wrap; gap: 8px;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px dashed #f0ebe8;
        }
        .portail-about-pill {
          display: inline-flex; align-items: center; gap: 6px;
          background: linear-gradient(135deg, #faf8f5, #fef0dc);
          border: 1px solid #f0e0c8;
          border-radius: 99px; padding: 6px 14px;
          font-size: 0.8125rem;
          color: #7c4a03;
          font-weight: 500;
        }
        .portail-about-pill svg { color: #b87333; flex-shrink: 0; }

        /* Tarifs publics */
        .portail-prices-grid {
          display: flex; flex-direction: column; gap: 8px;
        }
        .portail-price-card {
          position: relative;
          isolation: isolate;
          display: flex; align-items: center; gap: 14px;
          background: white; border-radius: 16px; padding: 20px 22px;
          box-shadow: 0 1px 6px rgba(0,0,0,0.05);
          overflow: hidden;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
          border: 1px solid var(--tone-sage-bg, #e2f0e0);
        }
        .portail-price-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(122, 154, 114, 0.18);
          border-color: var(--tone-sage-accent, #7a9a72);
        }
        .portail-price-spotlight {
          position: absolute; inset: 0;
          z-index: 0;
          pointer-events: none;
          background: radial-gradient(circle 200px at var(--mx, 50%) var(--my, 50%), rgba(122, 154, 114, 0.18), transparent 60%);
          opacity: 0;
          transition: opacity 0.25s ease;
          mix-blend-mode: multiply;
        }
        .portail-price-card:hover .portail-price-spotlight { opacity: 1; }
        .portail-price-card > *:not(.portail-price-spotlight) {
          position: relative;
          z-index: 1;
        }
        .portail-price-icon {
          width: 38px; height: 38px; border-radius: 10px;
          background: var(--tone-sage-bg, #e2f0e0); color: var(--tone-sage-ink, #4d6b48);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .portail-price-info { flex: 1; min-width: 0; }
        .portail-price-nom { font-weight: 600; font-size: 0.9375rem; color: #1a1a2e; }
        .portail-price-sub { font-size: 0.75rem; color: #888; margin-top: 2px; }
        .portail-price-prix {
          font-family: 'Instrument Serif', Georgia, serif;
          font-weight: 400;
          font-size: 1.6rem;
          color: var(--tone-sage-ink, #4d6b48);
          letter-spacing: -0.02em;
        }

        /* Venue — ton lavender (calme, posé) */
        .portail-venue-card {
          background: var(--tone-lavender-bg-soft, #f7f4fa);
          border-radius: 16px; padding: 24px 24px;
          box-shadow: 0 1px 6px rgba(90, 77, 117, 0.05);
          border: 1px solid var(--tone-lavender-bg, #ece6f3);
          display: flex; flex-direction: column; gap: 16px;
        }
        .portail-venue-row {
          display: flex; align-items: flex-start; gap: 10px;
          font-size: 0.9375rem; color: #1a1a2e;
        }
        .portail-venue-row svg { color: var(--tone-lavender-accent, #8a7caa); flex-shrink: 0; margin-top: 2px; }
        .portail-venue-addr { font-weight: 600; line-height: 1.4; }
        .portail-venue-hours { white-space: pre-wrap; line-height: 1.5; color: #555; font-size: 0.875rem; }
        /* Underline animé éditorial Mélutek (background-image left-to-right) */
        .portail-venue-link,
        .portail-link-editorial {
          display: inline;
          color: var(--tone-lavender-ink, #5a4d75); text-decoration: none; font-weight: 600;
          background-image: linear-gradient(currentColor, currentColor);
          background-size: 0% 1.5px;
          background-repeat: no-repeat;
          background-position: 0 100%;
          transition: background-size 0.4s cubic-bezier(0.22, 1, 0.36, 1);
          padding-bottom: 2px;
        }
        .portail-venue-link:hover,
        .portail-link-editorial:hover {
          background-size: 100% 1.5px;
        }
        .portail-venue-link {
          display: inline-block; margin-top: 4px;
          font-size: 0.8125rem;
        }

        /* FAQ — ton rose (chaleureux, accessible) */
        .portail-faq-list { display: flex; flex-direction: column; gap: 10px; }
        .portail-faq-item {
          background: white; border-radius: 16px; padding: 22px 26px;
          box-shadow: 0 1px 8px rgba(139, 56, 56, 0.04);
          border: 1px solid var(--tone-rose-bg, #fce8e2);
          transition: box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
        }
        .portail-faq-item:hover {
          box-shadow: 0 8px 28px rgba(139, 56, 56, 0.08);
          border-color: var(--tone-rose-accent, #c47070);
        }
        .portail-faq-item[open] {
          background: var(--tone-rose-bg-soft, #fdf6f4);
          border-color: var(--tone-rose-accent, #c47070);
        }
        .portail-faq-q {
          display: flex; align-items: center; justify-content: space-between;
          gap: 14px;
          font-weight: 600; color: #1a1a2e; cursor: pointer;
          font-size: 0.9375rem; list-style: none;
        }
        .portail-faq-q::-webkit-details-marker { display: none; }
        .portail-faq-q::marker { display: none; }
        .portail-faq-q-text { flex: 1; }
        .portail-faq-chevron {
          flex-shrink: 0;
          color: var(--tone-rose-accent, #c47070);
          transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .portail-faq-item[open] .portail-faq-chevron {
          transform: rotate(180deg);
          color: var(--tone-rose-ink, #8b3838);
        }
        .portail-faq-a {
          margin: 14px 0 0; color: #555; font-size: 0.9375rem; line-height: 1.65;
          padding-top: 14px; border-top: 1px solid var(--tone-rose-bg, #fce8e2);
        }

        /* Social */
        .portail-social { margin-top: 24px; }
        .portail-social-row {
          display: flex; gap: 10px; justify-content: center;
        }
        .portail-social-link {
          width: 40px; height: 40px; border-radius: 50%;
          background: white; color: #888; border: 1px solid #f0ebe8;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s;
        }
        .portail-social-link:hover { color: #d4a0a0; border-color: #d4a0a0; transform: translateY(-2px); }

        /* ─── Scroll reveal — fade + translate doux ─────────────────────── */
        .reveal {
          opacity: 0;
          transform: translateY(28px);
          transition:
            opacity 0.8s cubic-bezier(0.22, 1, 0.36, 1),
            transform 0.8s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .reveal.is-revealed,
        .reveal[data-revealed="true"] {
          opacity: 1;
          transform: translateY(0);
        }
        /* CSS scroll-driven natif (Chrome 115+) : prend la main si supporté */
        @supports (animation-timeline: view()) {
          .reveal {
            opacity: 0;
            transform: translateY(28px);
            animation: portail-reveal-up 1s cubic-bezier(0.22, 1, 0.36, 1) both;
            animation-timeline: view();
            animation-range: entry 5% cover 25%;
          }
          @keyframes portail-reveal-up {
            to { opacity: 1; transform: translateY(0); }
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .reveal {
            opacity: 1; transform: none;
            animation: none; transition: none;
          }
        }
      `}</style>
    </div>
  );
}
