'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { altVignette } from '@/lib/vignette-cours';
import { Clock, MapPin, Calendar, Users, ArrowLeft, CheckCircle, AlertCircle, Loader, Mail, Shield } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import { getDelaiPourCours, evaluerAnnulation, formatDateLimite } from '@/lib/regles-metier';
import { useLangue } from '@/components/portail/LangueProvider';

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

// Les tableaux faits main servent le français ; en anglais, la date se formate
// avec le locale de la visiteuse (langue et locale viennent de useLangue()).
function formatDate(dateStr, langue, locale) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (langue === 'en') {
    return date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  return `${JOURS[date.getDay()]} ${d} ${MOIS[m - 1]} ${y}`;
}
// « 18h30 » en français, « 18:30 » en anglais.
function formatHeure(h, langue) {
  if (!h) return '';
  const [hh, mm] = h.split(':');
  if (langue === 'en') return `${String(hh).padStart(2, '0')}:${mm}`;
  return mm === '00' ? `${parseInt(hh)}h` : `${parseInt(hh)}h${mm}`;
}
// La date limite d'annulation : formatDateLimite (lib/regles-metier) parle
// français ; en anglais on formate la même Date avec le locale.
function formatLimite(dateLimite, langue, locale) {
  if (langue !== 'en') return formatDateLimite(dateLimite);
  if (!dateLimite || isNaN(dateLimite.getTime())) return '';
  const j = dateLimite.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  const h = dateLimite.toTimeString().slice(0, 5);
  return `${j} at ${h}`;
}

function CompletAvecListeAttente({ cours, studioSlug, currentUser }) {
  const { toast } = useToast();
  const { t } = useLangue();
  const [nom, setNom]     = useState(currentUser?.nom || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [tel, setTel]     = useState(currentUser?.tel || '');
  const [website, setWebsite] = useState(''); // honeypot — DOIT rester vide
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [position, setPosition] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nom.trim() || !email.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/portail/${studioSlug}/liste-attente`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coursId: cours.id,
          nom: nom.trim(),
          email: email.trim(),
          tel: tel.trim(),
          website,           // honeypot
          turnstileToken: typeof window !== 'undefined'
            ? document.querySelector('[name="cf-turnstile-response"]')?.value
            : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || t('Erreur'));
      setPosition(json.position);
      setDone(true);
      toast.success(t("Tu es sur la liste d'attente : on te prévient si une place se libère."));
    } catch (e) {
      setError(e.message);
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="portail-card" style={{ textAlign: 'center', padding: '32px 24px' }}>
        <CheckCircle size={40} style={{ color: '#4caf50', margin: '0 auto 12px', display: 'block' }} />
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 8px', color: '#1a1a2e' }}>
          {t("C'est noté !")}
        </h2>
        <p style={{ color: '#666', margin: '0 0 12px', fontSize: '0.9375rem', lineHeight: 1.6 }}>
          {t('Tu es')} <strong>{t('n°{n}', { n: position })}</strong> {t("sur la liste d'attente.")}<br />
          {t("Si une place se libère, on t'envoie un email à")} <strong>{email}</strong>.
        </p>
        <Link href={`/p/${studioSlug}`} className="portail-btn-ghost" style={{ maxWidth: 280, margin: '12px auto 0', width: '100%' }}>
          {t("Voir d'autres cours")}
        </Link>
      </div>
    );
  }

  return (
    <div className="portail-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: '#fffaf0', border: '1px solid #ffe0b2', borderRadius: 12, marginBottom: 16 }}>
        <AlertCircle size={18} style={{ color: '#d97706', flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: '0.875rem', color: '#7c4a03', lineHeight: 1.5 }}>
          <strong>{t('Cette séance est complète.')}</strong><br />
          {t("Inscris-toi sur la liste d'attente : on te prévient en priorité si une place se libère.")}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="portail-field">
          <label className="portail-label" htmlFor="la-nom">{t('Prénom et nom *')}</label>
          <input id="la-nom" type="text" className="portail-input" value={nom} onChange={e => setNom(e.target.value)} placeholder={t('Marie Dupont')} required minLength={2} autoComplete="name" />
        </div>
        <div className="portail-field">
          <label className="portail-label" htmlFor="la-email">{t('Email *')}</label>
          <input id="la-email" type="email" className="portail-input" value={email} onChange={e => setEmail(e.target.value)} placeholder={t('marie@exemple.fr')} required autoComplete="email" />
        </div>
        <div className="portail-field">
          <label className="portail-label" htmlFor="la-tel">{t('Téléphone')} <span style={{ color: '#aaa', fontWeight: 400 }}>{t('(optionnel, SMS si place libérée)')}</span></label>
          <input id="la-tel" type="tel" className="portail-input" value={tel} onChange={e => setTel(e.target.value)} placeholder={t('06 12 34 56 78')} autoComplete="tel" />
        </div>

        {/* Honeypot anti-bot — caché aux humains */}
        <input
          type="text"
          name="verif_hp"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={e => setWebsite(e.target.value)}
          aria-hidden="true"
          style={{ position: 'absolute', left: -9999, width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
        />

        {/* Cloudflare Turnstile (actif uniquement si NEXT_PUBLIC_TURNSTILE_SITE_KEY défini) */}
        {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
          <>
            <div
              className="cf-turnstile"
              data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
              data-theme="light"
              data-size="flexible"
              style={{ marginBottom: 12 }}
            />
            <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
          </>
        )}

        {error && (
          <div style={{ background: '#fff0f0', border: '1px solid #ffcdd2', borderRadius: '8px', padding: '10px 14px', color: '#c62828', fontSize: '0.875rem', marginBottom: '14px' }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={submitting || !nom.trim() || !email.trim()} className="portail-btn-primary">
          {submitting ? <><Loader size={16} className="spin" /> {t('Inscription…')}</> : <>{t("M'inscrire à la liste d'attente")}</>}
        </button>

        <Link href={`/p/${studioSlug}`} style={{ display: 'block', textAlign: 'center', fontSize: '0.8125rem', color: '#888', textDecoration: 'none', marginTop: 14 }}>
          {t("ou voir d'autres cours →")}
        </Link>
      </form>
    </div>
  );
}

export default function CoursReservationClient({ cours, profile, nbInscrits, studioSlug, currentUser, alreadyRegistered = false, prevision = null, canCancel = false, canReserve = true, canWaitlist = false, prixEssaiCours = null, vignette = null }) {
  const { toast } = useToast();
  const { t, langue, locale } = useLangue();
  const [nom, setNom]       = useState(currentUser?.nom || '');
  const [email, setEmail]   = useState(currentUser?.email || '');
  const [tel, setTel]       = useState(currentUser?.tel || '');
  const [website, setWebsite] = useState(''); // honeypot — DOIT rester vide
  const [loading, setLoading] = useState(false);
  const [done, setDone]     = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  // Paiement par séance (v2 de v86) : {url, montant} si le cours a un Payment
  // Link Stripe — la place est déjà réservée, le paiement vient APRÈS.
  const [paiementInfo, setPaiementInfo] = useState(null);
  const [error, setError]   = useState('');
  const isConnected = !!currentUser;

  // Série : inscription à toutes les occurrences récurrentes jusqu'à une date.
  // ⚠️ La vraie colonne est recurrence_parent_id (recurrence_id est vestigiale,
  // jamais peuplée → la case « séances suivantes » ne s'affichait jamais).
  const hasSeries = !!cours.recurrence_parent_id && isConnected;
  const [serieActive, setSerieActive] = useState(false);
  const [serieJusquAu, setSerieJusquAu] = useState(() => {
    // Par défaut : 8 semaines après le cours
    const d = new Date(cours.date + 'T00:00:00');
    d.setDate(d.getDate() + 56);
    return d.toISOString().slice(0, 10);
  });
  const [serieResult, setSerieResult] = useState(null); // { totalBooked, totalSkipped, skipped }

  const places = cours.capacite_max ? cours.capacite_max - nbInscrits : null;
  const complet = places !== null && places <= 0;
  const afficherInscrits = profile.afficher_inscrits !== false; // jauge publique (toggle studio)
  // "Passé" = date avant aujourd'hui, OU date = aujourd'hui mais heure déjà dépassée
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  let passe = false;
  if (cours.date < today) {
    passe = true;
  } else if (cours.date === today && cours.heure) {
    const [hh, mm] = cours.heure.split(':').map(Number);
    const coursDateTime = new Date(now);
    coursDateTime.setHours(hh, mm, 0, 0);
    if (coursDateTime <= now) passe = true;
  }
  const annule = !!cours.est_annule;

  const handleReserver = async (e) => {
    e.preventDefault();
    if (!nom.trim() || !email.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/portail/${studioSlug}/reserver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coursId: cours.id,
          nom: nom.trim(),
          email: email.trim(),
          tel: tel.trim(),
          website,           // honeypot
          turnstileToken: typeof window !== 'undefined'
            ? document.querySelector('[name="cf-turnstile-response"]')?.value
            : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || t('Erreur lors de la réservation'));
      setMagicLinkSent(!!json.magicLinkSent);
      if (json.paiement_url) setPaiementInfo({ url: json.paiement_url, montant: json.paiement_montant });

      // Si l'élève a coché "série", on enchaîne avec /reserver-serie
      if (serieActive && hasSeries) {
        try {
          const resSerie = await fetch(`/api/portail/${studioSlug}/reserver-serie`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ coursId: cours.id, jusquAu: serieJusquAu }),
          });
          const jsonSerie = await resSerie.json();
          if (resSerie.ok) {
            setSerieResult(jsonSerie);
            toast.success(t('{n} cours réservés sur la série', { n: jsonSerie.totalBooked }));
          } else {
            toast.warning(t("On n'a pas pu réserver les séances suivantes, réessaie depuis ton espace."));
          }
        } catch (serieErr) {
          console.warn('[serie] non-blocking error:', serieErr);
          toast.warning(t("On n'a pas pu réserver les séances suivantes, réessaie depuis ton espace."));
        }
      }

      setDone(true);
      toast.success(t('Réservation confirmée !'));
    } catch (e) {
      setError(e.message);
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div>
        <Link href={`/p/${studioSlug}`} className="portail-back-link">
          <ArrowLeft size={15} /> {t('Retour aux cours')}
        </Link>
        <div className="portail-card" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <CheckCircle size={48} style={{ color: '#4caf50', margin: '0 auto 16px', display: 'block' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 8px' }}>{t("C'est réservé !")}</h2>
          <p style={{ color: '#666', margin: '0 0 16px', lineHeight: 1.6 }}>
            {t('Tu es inscrit·e pour')} <strong>{cours.nom}</strong><br />
            {t('le')} <strong>{formatDate(cours.date, langue, locale)}</strong> {t('à')} <strong>{formatHeure(cours.heure, langue)}</strong>.
          </p>

          {paiementInfo && (
            <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px', textAlign: 'left' }}>
              <div style={{ fontSize: '0.875rem', color: '#9a3412', marginBottom: 10 }}>
                <strong>{t('Ta place est réservée.')}</strong> {t('Tu peux régler ta séance')}
                {paiementInfo.montant ? <> (<strong>{Number(paiementInfo.montant).toFixed(2).replace('.', ',')} €</strong>)</> : null} {t('en ligne dès maintenant :')}
              </div>
              <a
                href={paiementInfo.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-block', background: '#9a3412', color: 'white', textDecoration: 'none', padding: '10px 22px', borderRadius: '10px', fontWeight: 700, fontSize: '0.9rem' }}
              >
                {t('💳 Régler ma place par CB')}
              </a>
              <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: 8 }}>
                {t('Tu préfères régler sur place ? Aucun souci, ta réservation reste valable.')}
              </div>
            </div>
          )}

          <div style={{ background: '#f0faf0', border: '1px solid #c8e6c9', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', fontSize: '0.875rem', color: '#2e7d32', display: 'flex', alignItems: 'flex-start', gap: '8px', textAlign: 'left' }}>
            <Mail size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              {t('Email envoyé à')} <strong>{email}</strong>
              {!isConnected && magicLinkSent && (
                <><br /><span style={{ fontSize: '0.8125rem', color: '#1b5e20' }}>{t('Il contient un lien pour accéder à ton espace en un clic.')}</span></>
              )}
            </div>
          </div>

          {serieResult && (
            <div style={{ background: '#fef6ec', border: '1px solid #fde8d0', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', fontSize: '0.875rem', color: '#7c4a03', textAlign: 'left' }}>
              <strong>{serieResult.totalBooked > 1
                ? t('{n} séances suivantes réservées', { n: serieResult.totalBooked })
                : t('{n} séance suivante réservée', { n: serieResult.totalBooked })}</strong>
              {serieResult.totalSkipped > 0 && (
                <>
                  <br />
                  <span style={{ fontSize: '0.8125rem' }}>
                    {serieResult.totalSkipped > 1
                      ? t('{n} non disponibles (complet, déjà inscrit ou annulé).', { n: serieResult.totalSkipped })
                      : t('{n} non disponible (complet, déjà inscrit ou annulé).', { n: serieResult.totalSkipped })}
                  </span>
                </>
              )}
            </div>
          )}

          <div style={{ background: '#fffaf0', border: '1px solid #ffe0b2', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', fontSize: '0.8125rem', color: '#7c4a03', display: 'flex', alignItems: 'flex-start', gap: '8px', textAlign: 'left' }}>
            <Shield size={15} style={{ flexShrink: 0, marginTop: 2 }} />
            {canCancel
              ? <span>{t("Tu peux annuler depuis ton espace jusqu'à")} <strong>{t('{n}h avant la séance', { n: getDelaiPourCours(profile, cours.type_cours) })}</strong>.</span>
              : <span>{t('Pour toute annulation,')} <strong>{t('contacte directement ton studio')}</strong>.</span>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {isConnected && (
              <Link href={`/p/${studioSlug}/espace`} className="portail-btn-primary" style={{ maxWidth: '320px', margin: '0 auto', width: '100%' }}>
                {t('Voir mon espace')}
              </Link>
            )}
            <Link href={`/p/${studioSlug}`} className={isConnected ? 'portail-btn-ghost' : 'portail-btn-primary'} style={{ maxWidth: '320px', margin: '0 auto', width: '100%' }}>
              {t("Voir d'autres cours")}
            </Link>
          </div>
        </div>
        <style jsx global>{`
          .portail-back-link { display: inline-flex; align-items: center; gap: 6px; color: #888; font-size: 0.875rem; text-decoration: none; margin-bottom: 20px; }
          .portail-back-link:hover { color: #d4a0a0; }
        `}</style>
      </div>
    );
  }

  return (
    <div>
      <Link href={`/p/${studioSlug}`} className="portail-back-link">
        <ArrowLeft size={15} /> {t('Retour aux cours')}
      </Link>

      {/* Fiche cours */}
      <div className="portail-card" style={{ marginBottom: '20px' }}>
        {/* v99 — la même image que sur la carte du planning : arriver ici depuis
            une carte illustrée pour tomber sur une page nue faisait un trou. */}
        {vignette && (
          <div className="resa-vignette">
            <Image
              src={vignette}
              alt={altVignette(cours)}
              width={1024}
              height={576}
              sizes="(max-width: 640px) 100vw, 620px"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        )}
        <h1 style={{ fontSize: '1.375rem', fontWeight: 800, margin: '0 0 6px', color: '#1a1a2e' }}>{cours.nom}</h1>
        {cours.type_cours && (
          <span className="portail-tag portail-tag-rose" style={{ marginBottom: '14px', display: 'inline-block' }}>{cours.type_cours}</span>
        )}
        <div className="resa-details">
          <div className="resa-detail-row"><Calendar size={15} /><span>{formatDate(cours.date, langue, locale)}</span></div>
          <div className="resa-detail-row"><Clock size={15} /><span>{formatHeure(cours.heure, langue)}{cours.duree_minutes ? ` · ${cours.duree_minutes} ${t('min')}` : ''}</span></div>
          {(cours.format === 'visio' || cours.format === 'hybride') && (
            <div className="resa-detail-row">🖥<span>{t('En ligne, le lien de la séance sera dans ton espace élève')}</span></div>
          )}
          {cours.lieu && <div className="resa-detail-row"><MapPin size={15} /><span>{cours.lieu}</span></div>}
          {cours.tarif_unitaire > 0 && (
            <div className="resa-detail-row">
              <span style={{ fontWeight: 800, fontSize: '0.95rem', width: 15, textAlign: 'center', flexShrink: 0 }}>€</span>
              {cours.carnets_acceptes === true ? (
                <span><strong>{Number(cours.tarif_unitaire).toFixed(2).replace('.', ',')} €</strong> {t('la séance, ou inclus dans les carnets/abos compatibles')}</span>
              ) : (
                <span>{t('Évènement payant ·')} <strong>{Number(cours.tarif_unitaire).toFixed(2).replace('.', ',')} €</strong>{t(', à régler auprès du studio')}</span>
              )}
            </div>
          )}
          {cours.capacite_max && (afficherInscrits || complet) && (
            <div className="resa-detail-row">
              <Users size={15} />
              <span>
                {afficherInscrits && <>{t('{n}/{max} inscrits', { n: nbInscrits, max: cours.capacite_max })}</>}
                {complet
                  ? <span className="portail-tag portail-tag-amber" style={{ marginLeft: afficherInscrits ? '8px' : '0' }}>{t('Complet')}</span>
                  : afficherInscrits && places <= 3
                  ? <span className="portail-tag portail-tag-amber" style={{ marginLeft: '8px' }}>{places > 1 ? t('{n} places restantes', { n: places }) : t('{n} place restante', { n: places })}</span>
                  : null
                }
              </span>
            </div>
          )}
        </div>
        {cours.description && (
          <p style={{ marginTop: '14px', fontSize: '0.9375rem', color: '#555', lineHeight: 1.6 }}>{cours.description}</p>
        )}
      </div>

      {/* Bandeau "Premier cours en essai" — visible si essai_actif et visiteur non connecté */}
      {profile.essai_actif && !isConnected && !passe && !complet && !annule && (
        <Link
          href={`/p/${studioSlug}/essai?cours=${cours.id}`}
          className="resa-essai-banner"
        >
          <div className="resa-essai-icon">✨</div>
          <div className="resa-essai-body">
            <div className="resa-essai-title">
              {/* prixEssaiCours = prix de CETTE séance (tarif par type v92),
                  calculé serveur ; fallback prix unique si prop absente. */}
              {profile.essai_paiement === 'gratuit'
                ? t('Premier cours offert')
                : t("Premier cours d'essai · {prix}€", { prix: prixEssaiCours ?? profile.essai_prix })}
            </div>
            <div className="resa-essai-sub">
              {t("Tu n'es pas encore client·e ? Profite d'un cours d'essai pour découvrir le studio.")}
            </div>
          </div>
          <span className="resa-essai-cta">{t('Réserver en essai →')}</span>
        </Link>
      )}

      {/* Politique d'annulation — affichée SEULEMENT si le studio offre
          l'annulation self-service (Pro). Sinon on ne promet pas (voir plus bas). */}
      {!passe && !complet && !annule && canCancel && (() => {
        const delai = getDelaiPourCours(profile, cours.type_cours);
        const eval2 = evaluerAnnulation(profile, cours.date, cours.heure, cours.type_cours);
        const limiteStr = eval2.dateLimite ? formatLimite(eval2.dateLimite, langue, locale) : null;
        // Conséquence honnête d'une annulation tardive — affinée par la
        // prévision (B2f) : on sait ce qui arriverait à CETTE élève.
        const consequence = prevision?.kind === 'carnet'
          ? t('Après, la séance sera décomptée de ton carnet.')
          : prevision?.kind === 'unite' || Number(cours.tarif_unitaire) > 0
          ? t('Après, la séance restera due.')
          : t('Après, la séance sera due (décomptée de ton carnet si tu en utilises un).');
        return (
          <div className="resa-policy">
            <Shield size={15} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong style={{ display: 'block', marginBottom: 2 }}>{t('Annulation flexible')}</strong>
              {limiteStr
                ? <>{t("Annulation libre jusqu'au")} <strong>{limiteStr}</strong> {t('({n}h avant la séance).', { n: delai })} {consequence}</>
                : <>{t("Annulation libre jusqu'à")} <strong>{t('{n}h avant la séance', { n: delai })}</strong>. {consequence}</>
              }
            </div>
          </div>
        );
      })()}

      {/* Studio sans annulation self-service (Solo) : pas de promesse intenable */}
      {!passe && !complet && !annule && !canCancel && (
        <div className="resa-policy">
          <Shield size={15} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong style={{ display: 'block', marginBottom: 2 }}>{t('Annulation')}</strong>
            {t('Pour annuler ou modifier ta réservation,')} <strong>{t('contacte directement ton studio')}</strong>.
          </div>
        </div>
      )}

      {/* Prévision paiement (B2f, R2) : la vérité AVANT de réserver — même
          calcul que le pointage (résolution v64/v70/v82 côté serveur). Fini
          le « décomptée de ton carnet si tu en utilises un » à l'aveugle. */}
      {prevision && !passe && !complet && !annule && !alreadyRegistered && canReserve && (
        <div className="resa-policy" style={{ alignItems: 'flex-start' }}>
          <span style={{ fontSize: '0.95rem', flexShrink: 0, width: 15, textAlign: 'center' }}>
            {prevision.kind === 'carnet' ? '🎟' : prevision.kind === 'unite' ? '💶' : 'ℹ️'}
          </span>
          <div>
            <strong style={{ display: 'block', marginBottom: 2 }}>{t('Ta séance')}</strong>
            {prevision.kind === 'carnet' && (
              <>{t('Elle sera décomptée de')} <strong>{prevision.nom}</strong>
                {prevision.resteApres != null
                  ? <>{t(', il te restera')} <strong>{prevision.resteApres > 1 ? t('{n} séances', { n: prevision.resteApres }) : t('{n} séance', { n: prevision.resteApres })}</strong> {t('après celle-ci.')}</>
                  : <> {t('(illimité).')}</>}
              </>
            )}
            {prevision.kind === 'unite' && (
              <>{prevision.carnetInapplicable && <>{t('Ton carnet ne couvre pas ce type de cours :')} </>}
                {t('elle est à')} <strong>{Number(prevision.montant).toFixed(2).replace('.', ',').replace(',00', '')} €</strong>{t(', à régler auprès du studio.')}
              </>
            )}
            {prevision.kind === 'incompatible' && (
              <>{t('Ton carnet actuel ne couvre pas ce type de cours : la séance sera à régler selon les règles du studio.')}</>
            )}
            {prevision.kind === 'sans_carnet' && (
              <>{t("Tu n'as pas de carnet ou d'abonnement actif pour ce cours, parles-en à ton studio si besoin.")}</>
            )}
          </div>
        </div>
      )}

      {/* Formulaire de réservation */}
      {annule ? (
        <div className="portail-card" style={{ textAlign: 'center', color: '#888' }}>
          <AlertCircle size={32} style={{ margin: '0 auto 8px', display: 'block', color: '#dc2626' }} />
          <p style={{ margin: '0 0 12px', fontWeight: 600 }}>{t('Cette séance a été annulée par le studio.')}</p>
          <Link href={`/p/${studioSlug}`} style={{ fontSize: '0.875rem', color: '#d4a0a0', fontWeight: 600, textDecoration: 'none' }}>
            {t("Voir d'autres cours →")}
          </Link>
        </div>
      ) : passe ? (
        <div className="portail-card" style={{ textAlign: 'center', color: '#888' }}>
          <AlertCircle size={32} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.5 }} />
          <p style={{ margin: 0 }}>{t('Cette séance est passée.')}</p>
        </div>
      ) : alreadyRegistered ? (
        <div className="portail-card" style={{ textAlign: 'center', padding: '32px 24px' }}>
          <CheckCircle size={40} style={{ color: '#4caf50', margin: '0 auto 12px', display: 'block' }} />
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 8px', color: '#1a1a2e' }}>
            {t('Tu es déjà inscrit·e à ce cours')}
          </h2>
          <p style={{ color: '#666', margin: '0 0 20px', fontSize: '0.9375rem' }}>
            {t('Retrouve cette réservation dans ton espace personnel.')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Link href={`/p/${studioSlug}/espace`} className="portail-btn-primary" style={{ maxWidth: 280, margin: '0 auto', width: '100%' }}>
              {t('Voir mon espace')}
            </Link>
            <Link href={`/p/${studioSlug}`} className="portail-btn-ghost" style={{ maxWidth: 280, margin: '0 auto', width: '100%' }}>
              {t("Voir d'autres cours")}
            </Link>
          </div>
        </div>
      ) : complet ? (
        canWaitlist ? (
          <CompletAvecListeAttente
            cours={cours}
            studioSlug={studioSlug}
            currentUser={currentUser}
          />
        ) : (
          <div className="portail-card" style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, margin: '0 0 8px', color: '#1a1a2e' }}>{t('Cours complet')}</h2>
            <p style={{ color: '#555', fontSize: '0.9rem', margin: 0 }}>
              {t('Pour être prévenu·e si une place se libère,')} <strong>{t('contacte directement ton studio')}</strong>.
            </p>
          </div>
        )
      ) : !canReserve ? (
        /* Studio Essentiel (vitrine, B3c) : pas de réservation en ligne —
           les infos du cours restent visibles, la résa se fait en direct. */
        <div className="portail-card" style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, margin: '0 0 8px', color: '#1a1a2e' }}>{t('Réserver ta place')}</h2>
          <p style={{ color: '#555', fontSize: '0.9rem', margin: 0 }}>
            {t('Ce studio prend les réservations en direct :')} <strong>{t('contacte-le pour réserver')}</strong> {t('(ses coordonnées sont sur sa page).')}
          </p>
        </div>
      ) : (
        <div className="portail-card">
          <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, margin: '0 0 16px', color: '#1a1a2e' }}>{t('Réserver ma place')}</h2>

          {isConnected && (
            <div style={{ background: '#f0faf0', border: '1px solid #c8e6c9', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', fontSize: '0.8125rem', color: '#2e7d32', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {t('✓ Connecté·e en tant que')} <strong>{email}</strong>
            </div>
          )}

          <form onSubmit={handleReserver}>
            {/* Quand connecté avec un client identifié, on n'affiche pas de form
                — juste un récap et un bouton. */}
            {isConnected && nom ? (
              <div style={{ background: '#faf8f5', border: '1px solid #eee', borderRadius: 12, padding: '12px 14px', marginBottom: 14, fontSize: '0.875rem', color: '#555' }}>
                {t('Tu réserves au nom de')} <strong>{nom}</strong> ({email}).
              </div>
            ) : (
              <>
                <div className="portail-field">
                  <label className="portail-label" htmlFor="resa-nom">{t('Prénom et nom *')}</label>
                  <input
                    id="resa-nom"
                    type="text"
                    className="portail-input"
                    value={nom}
                    onChange={e => setNom(e.target.value)}
                    placeholder={t('Marie Dupont')}
                    required
                    minLength={2}
                    autoComplete="name"
                  />
                </div>
                <div className="portail-field">
                  <label className="portail-label" htmlFor="resa-email">{t('Email *')}</label>
                  <input
                    id="resa-email"
                    type="email"
                    className={`portail-input${isConnected ? ' portail-input--readonly' : ''}`}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    readOnly={isConnected}
                    placeholder={t('marie@exemple.fr')}
                    required
                    autoComplete="email"
                  />
                  {!isConnected && (
                    <p style={{ fontSize: '0.75rem', color: '#aaa', margin: '6px 0 0' }}>
                      {t("On t'enverra un lien pour accéder à ton espace et gérer tes réservations.")}
                    </p>
                  )}
                </div>
                {!isConnected && (
                  <div className="portail-field">
                    <label className="portail-label" htmlFor="resa-tel">{t('Téléphone')} <span style={{ color: '#aaa', fontWeight: 400 }}>{t('(optionnel)')}</span></label>
                    <input
                      id="resa-tel"
                      type="tel"
                      className="portail-input"
                      value={tel}
                      onChange={e => setTel(e.target.value)}
                      placeholder={t('06 12 34 56 78')}
                      autoComplete="tel"
                    />
                  </div>
                )}
              </>
            )}

            {/* Série : inscription à toutes les occurrences récurrentes */}
            {hasSeries && (
              <div style={{ background: '#fefaf5', border: '1.5px solid #fde8d0', borderRadius: 12, padding: '12px 14px', marginBottom: '14px' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={serieActive}
                    onChange={e => setSerieActive(e.target.checked)}
                    style={{ marginTop: 3, accentColor: '#b87333' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#7c4a03' }}>
                      {t("M'inscrire aussi aux séances suivantes")}
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: '#888', marginTop: 2, lineHeight: 1.4 }}>
                      {t("Toutes les occurrences récurrentes de ce cours seront réservées d'un coup.")}
                    </div>
                  </div>
                </label>
                {serieActive && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #fde8d0' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: 4 }}>{t("Jusqu'au")}</label>
                    <input
                      type="date"
                      className="portail-input"
                      value={serieJusquAu}
                      min={cours.date}
                      onChange={e => setSerieJusquAu(e.target.value)}
                      style={{ maxWidth: 200 }}
                    />
                  </div>
                )}
              </div>
            )}

            {error && (
              <div style={{ background: '#fff0f0', border: '1px solid #ffcdd2', borderRadius: '8px', padding: '10px 14px', color: '#c62828', fontSize: '0.875rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={15} /> {error}
              </div>
            )}

            {/* Honeypot anti-bot — caché aux humains */}
            <input
              type="text"
              name="verif_hp"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={e => setWebsite(e.target.value)}
              aria-hidden="true"
              style={{ position: 'absolute', left: -9999, width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
            />

            {/* Cloudflare Turnstile (actif uniquement si NEXT_PUBLIC_TURNSTILE_SITE_KEY défini) */}
            {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
              <>
                <div
                  className="cf-turnstile"
                  data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                  data-theme="light"
                  data-size="flexible"
                  style={{ marginBottom: 12 }}
                />
                <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
              </>
            )}

            <button
              type="submit"
              disabled={loading || !nom.trim() || !email.trim()}
              className="portail-btn-primary"
            >
              {loading ? <Loader size={16} className="spin" /> : null}
              {loading ? t('Réservation en cours…') : t('Confirmer ma réservation')}
            </button>
            <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: '#aaa', margin: '12px 0 0' }}>
              {t('En réservant, tu acceptes les')} <a href="/legal/cgu" target="_blank" rel="noopener noreferrer" style={{ color: '#d4a0a0' }}>{t('CGU')}</a> {t("d'IziSolo.")}
            </p>
          </form>
        </div>
      )}

      <style jsx global>{`
        .portail-back-link { display: inline-flex; align-items: center; gap: 6px; color: #888; font-size: 0.875rem; text-decoration: none; margin-bottom: 20px; }
        .portail-back-link:hover { color: #d4a0a0; }
        .resa-vignette {
          aspect-ratio: 16 / 9; width: 100%; line-height: 0;
          border-radius: 12px; overflow: hidden; margin-bottom: 14px;
          background: rgba(0, 0, 0, 0.04);
        }
        .resa-details { display: flex; flex-direction: column; gap: 8px; }
        .resa-detail-row { display: flex; align-items: center; gap: 8px; font-size: 0.9375rem; color: #555; }
        .resa-detail-row svg { color: #d4a0a0; flex-shrink: 0; }
        .portail-input--readonly { background: #faf8f5; color: #888; cursor: default; border-color: #eee; }
        .resa-essai-banner {
          display: flex; align-items: center; gap: 12px;
          padding: 14px 16px; margin-bottom: 14px;
          background: linear-gradient(135deg, var(--tone-rose-bg-soft, #fdf6f4), white);
          border: 1.5px solid var(--tone-rose-accent, #c47070);
          border-radius: 14px;
          text-decoration: none; color: inherit;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .resa-essai-banner:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(196, 112, 112, 0.16);
        }
        .resa-essai-icon {
          width: 40px; height: 40px; flex-shrink: 0;
          font-size: 1.3rem;
          background: white; border: 1.5px solid var(--tone-rose-accent, #c47070);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
        }
        .resa-essai-body { flex: 1; min-width: 0; }
        .resa-essai-title {
          font-weight: 700; font-size: 0.9375rem;
          color: var(--tone-rose-ink, #8b3838);
        }
        .resa-essai-sub { font-size: 0.8125rem; color: #888; margin-top: 2px; }
        .resa-essai-cta {
          font-size: 0.8125rem; font-weight: 700;
          color: var(--tone-rose-ink, #8b3838);
          flex-shrink: 0;
          white-space: nowrap;
        }
        @media (max-width: 480px) {
          .resa-essai-cta { display: none; }
        }

        .resa-policy {
          display: flex; gap: 10px; align-items: flex-start;
          background: #fffaf0; border: 1px solid #ffe0b2; border-radius: 12px;
          padding: 12px 16px; margin-bottom: 16px;
          font-size: 0.8125rem; color: #7c4a03; line-height: 1.5;
        }
        .resa-policy svg { color: #d97706; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }
      `}</style>
    </div>
  );
}
