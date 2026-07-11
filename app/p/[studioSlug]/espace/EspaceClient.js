'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, MapPin, ArrowLeft, LogOut, CheckCircle, XCircle, Loader, AlertCircle, User, Lock, CreditCard, Ticket, CalendarCheck, Zap, Download, Receipt, MessageCircle, Send, X, Phone, Home, Pencil, Save, Wallet } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/ToastProvider';
import { evaluerAnnulation, formatDateLimite } from '@/lib/regles-annulation';
import { toneForCours, toneForPaiement } from '@/lib/tones';

const STRIPE_TYPE_ICONS = { carnet: Ticket, abonnement: CalendarCheck, cours_unique: Zap };

const MOIS  = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${JOURS[date.getDay()]} ${d} ${MOIS[m - 1]} ${y}`;
}
function formatHeure(h) {
  if (!h) return '';
  const [hh, mm] = h.split(':');
  return mm === '00' ? `${parseInt(hh)}h` : `${parseInt(hh)}h${mm}`;
}

// Mini chatbot Claude pour aider l'élève à choisir un cours
function AssistantBookingButton({ studioSlug, prenom }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: prenom
      ? `Bonjour ${prenom} ! Je peux t'aider à trouver un cours dans les 14 prochains jours. Qu'est-ce qui te ferait plaisir ?`
      : `Bonjour ! Je peux t'aider à trouver un cours dans les 14 prochains jours. Qu'est-ce qui te ferait plaisir ?`
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const send = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch(`/api/portail/${studioSlug}/assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur');
      setMessages([...next, { role: 'assistant', content: json.message }]);
    } catch (err) {
      setMessages([...next, { role: 'assistant', content: `Désolé, je rencontre un souci technique : ${err.message}. Réessaie dans un instant.` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Aide-moi à choisir un cours"
        style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 50,
          width: 54, height: 54, borderRadius: '50%',
          background: '#d4a0a0', color: 'white', border: 'none',
          boxShadow: '0 4px 16px rgba(212, 160, 160, 0.45)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <MessageCircle size={22} />
      </button>

      {open && (
        <div style={{
          position: 'fixed', bottom: 84, right: 20, zIndex: 51,
          width: 'calc(100vw - 40px)', maxWidth: 360,
          height: 460, maxHeight: 'calc(100vh - 120px)',
          background: 'white', borderRadius: 16,
          boxShadow: '0 10px 40px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{ padding: '14px 16px', background: '#d4a0a0', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MessageCircle size={16} />
              <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Aide-moi à choisir</span>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white', padding: 0, display: 'flex' }}>
              <X size={18} />
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                background: m.role === 'user' ? '#d4a0a0' : '#faf8f5',
                color: m.role === 'user' ? 'white' : '#1a1a2e',
                padding: '8px 12px', borderRadius: 12,
                fontSize: '0.875rem', lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
              }}>
                {/* Markdown links basiques [text](url) → vrai <a> */}
                {m.content.split(/(\[[^\]]+\]\([^)]+\))/g).map((part, j) => {
                  const m2 = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
                  if (m2) return <a key={j} href={m2[2]} style={{ color: m.role === 'user' ? 'white' : '#d4a0a0', fontWeight: 600 }}>{m2[1]}</a>;
                  return <span key={j}>{part}</span>;
                })}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', color: '#888', fontSize: '0.875rem' }}>
                <Loader size={14} className="spin" /> Recherche…
              </div>
            )}
          </div>
          <form onSubmit={send} style={{ padding: 12, borderTop: '1px solid #f0ebe8', display: 'flex', gap: 6 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ex : un Hatha doux mardi soir"
              disabled={loading}
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 10,
                border: '1px solid #e8e0db', fontSize: '0.875rem', outline: 'none',
              }}
            />
            <button type="submit" disabled={loading || !input.trim()} style={{
              padding: '8px 12px', borderRadius: 10,
              background: '#d4a0a0', color: 'white', border: 'none', cursor: 'pointer',
              opacity: loading || !input.trim() ? 0.6 : 1,
            }}>
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function modeLabel(mode) {
  const map = { especes: 'Espèces', cheque: 'Chèque', virement: 'Virement', CB: 'CB' };
  return map[mode] || mode;
}

function CoursCard({ presence, profile, studioSlug, onAnnuler, annulEnCours }) {
  const c = presence.cours;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const aVenir = c.date >= today && !c.est_annule;
  // Règle d'annulation lue depuis profile.regles_annulation (fallback 24h)
  const evaluation = aVenir
    ? evaluerAnnulation(profile, c.date, c.heure, c.type_cours)
    : { annulable: false, delaiHeures: 24 };
  const annulable = aVenir && evaluation.annulable;
  const futureMaisTardive = aVenir && !annulable;
  const tone = toneForCours(c.type_cours);

  return (
    <div className={`espace-cours-card espace-cours-card--${tone}`}>
      <div className="espace-cours-info">
        <div className="espace-cours-nom">{c.nom}</div>
        {c.type_cours && <span className={`portail-tag portail-tag-${tone}`} style={{ marginBottom: 6, display: 'inline-block' }}>{c.type_cours}</span>}
        <div className="espace-cours-details">
          <span><Calendar size={13} /> {formatDate(c.date)}</span>
          {c.heure && <span><Clock size={13} /> {formatHeure(c.heure)}{c.duree_minutes ? ` · ${c.duree_minutes} min` : ''}</span>}
          {c.lieu && <span><MapPin size={13} /> {c.lieu}</span>}
        </div>
      </div>
      <div className="espace-cours-status">
        {c.est_annule ? (
          <span className="portail-tag portail-tag-amber">Annulé</span>
        ) : aVenir ? (
          // Cours à venir : toujours « Inscrit·e » (rien n'est encore pointé).
          <span className="portail-tag portail-tag-blue">Inscrit·e</span>
        ) : presence.statut_pointage === 'present' ? (
          <span className="portail-tag portail-tag-green">✓ Présent·e</span>
        ) : presence.statut_pointage === 'absent' ? (
          <span className="portail-tag" style={{ background: '#f5f5f5', color: '#999' }}>Absent·e</span>
        ) : presence.statut_pointage === 'excuse' ? (
          <span className="portail-tag" style={{ background: '#fef3e2', color: '#b45309' }}>Excusé·e</span>
        ) : (
          // Cours passé non pointé par la prof → aucun statut affirmé
          // (avant : lisait presence.present, champ inexistant → « Absent·e » à tort).
          null
        )}

        {aVenir && !c.est_annule && (
          futureMaisTardive ? (
            // Annulation tardive : on PEUT toujours annuler, mais la séance sera due
            confirmOpen ? (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 220 }}>
                <p style={{ fontSize: '0.75rem', color: '#7c4a03', margin: '0 0 4px', fontWeight: 600, lineHeight: 1.4 }}>
                  ⚠ Annulation tardive : la séance sera décomptée de ton crédit. Confirmer ?
                </p>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => { onAnnuler(presence.id, true); setConfirmOpen(false); }}
                    disabled={annulEnCours}
                    style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: 'none', background: '#c62828', color: 'white', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {annulEnCours ? <Loader size={12} className="spin" /> : 'Oui'}
                  </button>
                  <button
                    onClick={() => setConfirmOpen(false)}
                    style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: '1px solid #e5e5e5', background: 'white', fontSize: '0.75rem', cursor: 'pointer', color: '#666' }}
                  >
                    Non
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmOpen(true)}
                className="espace-annul-btn espace-annul-btn--tardive"
                title={`Annulation possible mais la séance sera comptée (délai libre : ${evaluation.delaiHeures}h avant)`}
              >
                <Lock size={11} /> Annuler (séance due)
              </button>
            )
          ) : confirmOpen ? (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <p style={{ fontSize: '0.8rem', color: '#c62828', margin: '0 0 4px', fontWeight: 600 }}>Confirmer l'annulation ?</p>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => { onAnnuler(presence.id, false); setConfirmOpen(false); }}
                  disabled={annulEnCours}
                  style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: 'none', background: '#c62828', color: 'white', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  {annulEnCours ? <Loader size={12} className="spin" /> : 'Oui, annuler'}
                </button>
                <button
                  onClick={() => setConfirmOpen(false)}
                  style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: '1px solid #e5e5e5', background: 'white', fontSize: '0.8rem', cursor: 'pointer', color: '#666' }}
                >
                  Non
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmOpen(true)}
              className="espace-annul-btn"
            >
              <XCircle size={13} /> Annuler
            </button>
          )
        )}
      </div>
    </div>
  );
}

export default function EspaceClient({ profile, client, aVenir, passes, paiements = [], offresStripe = [], abonnements = [], aRegler = [], studioSlug, userEmail, isDemo = false }) {
  const router = useRouter();
  const { toast } = useToast();
  const [annulEnCours, setAnnulEnCours] = useState(null);
  const [annuleIds, setAnnuleIds]       = useState([]);
  const [errMsg, setErrMsg]             = useState('');
  const [loggingOut, setLoggingOut]     = useState(false);

  // Coordonnées éditables par l'élève (téléphone / adresse / ville).
  // `coords` est la source d'affichage ET d'édition → reste à jour après save
  // sans recharger la page. `coordsBackup` permet d'annuler une édition.
  const [coords, setCoords] = useState({
    telephone: client?.telephone || '',
    adresse_postale: client?.adresse_postale || '',
    ville: client?.ville || '',
  });
  const [coordsBackup, setCoordsBackup] = useState(null);
  const [editCoords, setEditCoords] = useState(false);
  const [savingCoords, setSavingCoords] = useState(false);

  // Paiements dus (statut ≠ 'paid') : affichés dans « À régler ». Les paiements
  // réglés vont dans « Mes paiements » (avec reçu). Un versement d'échéancier
  // en attente (echeancier_id) apparaît donc à régler tant qu'il n'est pas encaissé.
  const paiementsDus = (paiements || []).filter(p => p.statut && p.statut !== 'paid');
  const paiementsRegles = (paiements || []).filter(p => p.statut === 'paid');
  // Total dû = paiements en attente + dettes issues des cas (annulation tardive,
  // séance sans carnet…) quand un montant est connu. Les cas sans montant chiffré
  // restent listés mais ne faussent pas le total.
  const totalDu =
    paiementsDus.reduce((s, p) => s + (parseFloat(p.montant) || 0), 0) +
    aRegler.reduce((s, c) => s + (parseFloat(c.context?.montant ?? c.context?.tarif_unitaire ?? 0) || 0), 0);
  const nbARegler = aRegler.length + paiementsDus.length;

  const handleSaveCoords = async () => {
    if (isDemo) { setEditCoords(false); return; }
    setSavingCoords(true);
    try {
      const res = await fetch(`/api/portail/${studioSlug}/profil`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(coords),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Erreur');
      toast.success('Coordonnées mises à jour 🌿');
      setEditCoords(false);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSavingCoords(false);
    }
  };

  const handleAnnuler = async (presenceId, tardiveAttendue = false) => {
    setAnnulEnCours(presenceId);
    setErrMsg('');
    try {
      const res = await fetch(`/api/portail/${studioSlug}/annuler`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presenceId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur');
      setAnnuleIds(prev => [...prev, presenceId]);
      if (json.tardive) {
        toast.warning('Annulation enregistrée — la séance a été comptée (annulation tardive).');
      } else {
        toast.success('Réservation annulée. On t\'attend la prochaine fois 🌿');
      }
    } catch (e) {
      setErrMsg(e.message);
      toast.error(e.message);
    } finally {
      setAnnulEnCours(null);
    }
  };

  const handleDeconnexion = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push(`/p/${studioSlug}`);
    router.refresh();
  };

  const aVenirFiltered = aVenir.filter(p => !annuleIds.includes(p.id));

  if (!client) {
    return (
      <div>
        <Link href={`/p/${studioSlug}`} className="portail-back-link">
          <ArrowLeft size={15} /> Retour aux cours
        </Link>
        <div className="portail-card" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>👋</div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, margin: '0 0 10px', color: '#1a1a2e' }}>
            Bienvenue sur {profile.studio_nom} !
          </h2>
          <p style={{ color: '#888', fontSize: '0.9rem', margin: '0 0 24px', lineHeight: 1.6 }}>
            Tu es connecté·e avec <strong>{userEmail}</strong>, mais tu n'as pas encore de réservation dans ce studio.
          </p>
          <Link href={`/p/${studioSlug}`} className="portail-btn-primary" style={{ maxWidth: 260, margin: '0 auto 12px' }}>
            Voir les cours disponibles
          </Link>
          <button onClick={handleDeconnexion} className="portail-btn-ghost" style={{ maxWidth: 260, margin: '0 auto' }}>
            <LogOut size={15} /> Se déconnecter
          </button>
        </div>
        <style jsx global>{`
          .portail-back-link { display: inline-flex; align-items: center; gap: 6px; color: #888; font-size: 0.875rem; text-decoration: none; margin-bottom: 20px; }
          .portail-back-link:hover { color: #d4a0a0; }
        `}</style>
      </div>
    );
  }

  const prenom = client.prenom || client.email;

  return (
    <div>
      {isDemo && (
        <div style={{
          background: 'linear-gradient(135deg, #fefaf5, #fef0dc)',
          border: '1.5px solid #f0c897',
          borderRadius: 12,
          padding: '12px 16px',
          marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 10,
          fontSize: '0.875rem', color: '#7c4a03', lineHeight: 1.4,
        }}>
          <span style={{ fontSize: '1.25rem' }}>👁️</span>
          <div style={{ flex: 1 }}>
            <strong>Mode démo</strong> — tu vois ton espace élève avec des données fictives.
            <span style={{ fontWeight: 400, opacity: 0.85 }}> Camille, une élève imaginaire, a un carnet 10 séances et 2 cours réservés.</span>
          </div>
        </div>
      )}

      <Link href={`/p/${studioSlug}${isDemo ? '?demo=1' : ''}`} className="portail-back-link">
        <ArrowLeft size={15} /> Retour aux cours
      </Link>

      {/* En-tête profil */}
      <div className="portail-card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fce8e8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <User size={20} style={{ color: '#d4a0a0' }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1a1a2e' }}>
                {client.prenom} {client.nom}
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#888' }}>{client.email}</div>
            </div>
          </div>
          <button
            onClick={handleDeconnexion}
            disabled={loggingOut}
            title="Se déconnecter"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', padding: 8, display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8125rem' }}
          >
            {loggingOut ? <Loader size={15} className="spin" /> : <LogOut size={15} />}
          </button>
        </div>
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f5f0ee', fontSize: '0.8125rem', color: '#888' }}>
          Studio : <strong style={{ color: '#555' }}>{profile.studio_nom}</strong>
        </div>

        {/* Quick actions : Messages */}
        <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
          <Link
            href={`/p/${studioSlug}/espace/messages`}
            style={{
              flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '10px 14px', border: '1.5px solid #d4a0a0', borderRadius: 10,
              color: '#d4a0a0', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none',
              background: 'white',
            }}
          >
            <MessageCircle size={15} /> Mes messages
          </Link>
        </div>
      </div>

      {/* Mes coordonnées — affichées + modifiables par l'élève */}
      {(() => {
        const hasCoords = !!(coords.telephone || coords.adresse_postale || coords.ville);
        return (
          <div className="portail-card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <h2 className="espace-section-title" style={{ margin: 0 }}>
                <User size={16} style={{ color: '#d4a0a0' }} /> Mes coordonnées
              </h2>
              {!editCoords && !isDemo && (
                <button
                  type="button"
                  onClick={() => { setCoordsBackup(coords); setEditCoords(true); }}
                  className="espace-coord-edit"
                >
                  <Pencil size={13} /> {hasCoords ? 'Modifier' : 'Compléter'}
                </button>
              )}
            </div>

            {editCoords ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
                <label className="espace-coord-field">
                  <span><Phone size={13} /> Téléphone</span>
                  <input value={coords.telephone} onChange={e => setCoords({ ...coords, telephone: e.target.value })} placeholder="06 12 34 56 78" autoComplete="tel" inputMode="tel" />
                </label>
                <label className="espace-coord-field">
                  <span><Home size={13} /> Adresse</span>
                  <input value={coords.adresse_postale} onChange={e => setCoords({ ...coords, adresse_postale: e.target.value })} placeholder="12 rue des Lilas" autoComplete="street-address" />
                </label>
                <label className="espace-coord-field">
                  <span><MapPin size={13} /> Ville</span>
                  <input value={coords.ville} onChange={e => setCoords({ ...coords, ville: e.target.value })} placeholder="Gillonnay" autoComplete="address-level2" />
                </label>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button type="button" onClick={handleSaveCoords} disabled={savingCoords} className="portail-btn-primary" style={{ flex: 1 }}>
                    {savingCoords ? <Loader size={15} className="spin" /> : <><Save size={15} /> Enregistrer</>}
                  </button>
                  <button type="button" onClick={() => { if (coordsBackup) setCoords(coordsBackup); setEditCoords(false); }} className="portail-btn-ghost" style={{ flex: 1 }}>
                    Annuler
                  </button>
                </div>
              </div>
            ) : hasCoords ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                {coords.telephone && <div className="espace-coord-row"><Phone size={14} /> {coords.telephone}</div>}
                {(coords.adresse_postale || coords.ville) && (
                  <div className="espace-coord-row"><MapPin size={14} /> {[coords.adresse_postale, coords.ville].filter(Boolean).join(', ')}</div>
                )}
              </div>
            ) : (
              <p style={{ color: '#aaa', fontSize: '0.875rem', margin: '10px 0 0', lineHeight: 1.5 }}>
                Ajoute ton téléphone et ton adresse pour que ton studio puisse te joindre facilement.
              </p>
            )}
          </div>
        );
      })()}

      {errMsg && (
        <div style={{ background: '#fff0f0', border: '1px solid #ffcdd2', borderRadius: '10px', padding: '12px 14px', color: '#c62828', fontSize: '0.875rem', marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
          <AlertCircle size={15} /> {errMsg}
        </div>
      )}

      {/* Cours à venir */}
      <div style={{ marginBottom: 24 }}>
        <h2 className="espace-section-title">
          <CheckCircle size={16} style={{ color: '#d4a0a0' }} />
          Cours à venir
          {aVenirFiltered.length > 0 && <span className="espace-count">{aVenirFiltered.length}</span>}
        </h2>
        {aVenirFiltered.length === 0 ? (
          <div className="portail-card" style={{ textAlign: 'center', padding: '28px 20px' }}>
            <div style={{ fontSize: '1.75rem', marginBottom: 8 }}>📅</div>
            <p style={{ color: '#888', margin: 0, fontSize: '0.9rem' }}>Aucun cours à venir.</p>
            <Link href={`/p/${studioSlug}`} style={{ display: 'inline-block', marginTop: 12, fontSize: '0.875rem', color: '#d4a0a0', fontWeight: 600, textDecoration: 'none' }}>
              Réserver un cours →
            </Link>
          </div>
        ) : (
          aVenirFiltered.map(p => (
            <CoursCard
              key={p.id}
              presence={p}
              profile={profile}
              studioSlug={studioSlug}
              onAnnuler={handleAnnuler}
              annulEnCours={annulEnCours === p.id}
            />
          ))
        )}
      </div>

      {/* Historique */}
      {passes.length > 0 && (
        <div>
          <h2 className="espace-section-title" style={{ color: '#aaa' }}>
            Historique
            <span className="espace-count" style={{ background: '#f5f5f5', color: '#bbb' }}>{passes.length}</span>
          </h2>
          {passes.map(p => (
            <CoursCard
              key={p.id}
              presence={p}
              profile={profile}
              studioSlug={studioSlug}
              onAnnuler={handleAnnuler}
              annulEnCours={false}
            />
          ))}
        </div>
      )}

      {/* Section "Mes carnets & abonnements" — solde séances + expiration */}
      {abonnements.length > 0 && (
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid #f0ebe8' }}>
          <h2 className="espace-section-title">
            <Ticket size={16} style={{ color: '#b87333' }} />
            Mes carnets &amp; abonnements
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {abonnements.map(abo => {
              const reste = abo.seances_total != null
                ? Math.max(0, abo.seances_total - (abo.seances_utilisees || 0))
                : null;
              const today = new Date().toISOString().slice(0, 10);
              const expire = abo.date_fin && abo.date_fin < today;
              const epuise = reste === 0;
              const enPause = abo.statut === 'gele' || (
                abo.date_pause_debut && abo.date_pause_fin
                && abo.date_pause_debut <= today && abo.date_pause_fin >= today
              );
              const inactif = expire || epuise || enPause || abo.statut !== 'actif';
              const Icon = STRIPE_TYPE_ICONS[abo.type] || Ticket;
              const joursRestants = abo.date_fin
                ? Math.ceil((new Date(abo.date_fin) - new Date(today)) / (1000 * 60 * 60 * 24))
                : null;
              return (
                <div
                  key={abo.id}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 12,
                    border: `1.5px solid ${inactif ? '#e5e5e5' : '#fde8d0'}`,
                    background: inactif ? '#fafafa' : 'linear-gradient(135deg, #fefaf5 0%, #fef3e6 100%)',
                    opacity: inactif ? 0.65 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: inactif ? '#eee' : '#fef0dc',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: inactif ? '#999' : '#b87333', flexShrink: 0,
                    }}>
                      <Icon size={18} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#1a1a2e', marginBottom: 2 }}>
                        {abo.offre_nom || 'Abonnement'}
                      </div>
                      {reste !== null ? (
                        <div style={{ fontSize: '0.8125rem', color: inactif ? '#888' : '#7c4a03', fontWeight: 600 }}>
                          {epuise
                            ? 'Carnet épuisé'
                            : `${reste} séance${reste > 1 ? 's' : ''} restante${reste > 1 ? 's' : ''}`}
                          {abo.seances_total != null && <span style={{ fontWeight: 400, color: '#999' }}> / {abo.seances_total}</span>}
                        </div>
                      ) : abo.type === 'abonnement' ? (
                        <div style={{ fontSize: '0.8125rem', color: inactif ? '#888' : '#7c4a03', fontWeight: 600 }}>
                          Séances illimitées
                        </div>
                      ) : null}
                      {enPause && abo.date_pause_fin && (
                        <div style={{ fontSize: '0.75rem', color: '#7c4a03', marginTop: 3, fontWeight: 600 }}>
                          ⏸ En pause jusqu'au {new Date(abo.date_pause_fin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                      )}
                      {!enPause && abo.date_fin && (
                        <div style={{ fontSize: '0.75rem', color: '#888', marginTop: 3 }}>
                          {expire
                            ? <>Expiré le {new Date(abo.date_fin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</>
                            : <>Valable jusqu'au {new Date(abo.date_fin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                              {joursRestants != null && joursRestants <= 30 && joursRestants > 0 && (
                                <span style={{ color: '#d97706', fontWeight: 600 }}> — plus que {joursRestants} jour{joursRestants > 1 ? 's' : ''}</span>
                              )}
                            </>
                          }
                        </div>
                      )}
                    </div>
                  </div>
                  {!inactif && abo.seances_total != null && (
                    <div style={{ marginTop: 10, height: 6, borderRadius: 3, background: '#fef0dc', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(100, (reste / abo.seances_total) * 100)}%`,
                          background: reste <= 2 ? '#d97706' : '#b87333',
                          transition: 'width 0.3s',
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Section "À régler" — paiements dus + dettes / séances dues ouvertes */}
      {nbARegler > 0 && (
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid #f0ebe8' }}>
          <h2 className="espace-section-title">
            <Wallet size={16} style={{ color: '#d97706' }} />
            À régler
            <span className="espace-count" style={{ background: '#fff0d6', color: '#b45309' }}>{nbARegler}</span>
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Paiements/versements en attente attribués par le studio */}
            {paiementsDus.map(p => {
              const dateStr = p.date
                ? new Date(p.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
                : null;
              return (
                <div key={`pay-${p.id}`} className="espace-aregler-row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1a1a2e' }}>{p.intitule || 'Paiement'}</div>
                    <div style={{ fontSize: '0.7rem', color: '#b45309', marginTop: 2 }}>
                      En attente de règlement{dateStr ? ` · échéance ${dateStr}` : ''}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#b45309', flexShrink: 0 }}>
                    {parseFloat(p.montant).toFixed(2).replace('.', ',')} €
                  </div>
                </div>
              );
            })}
            {aRegler.map(c => {
              const montant = c.context?.montant ?? c.context?.tarif_unitaire ?? null;
              const coursNom = c.cours?.nom || c.context?.cours_nom || 'Séance';
              const dateStr = c.cours?.date
                ? new Date(c.cours.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
                : (c.context?.cours_date ? new Date(c.context.cours_date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : null);
              const reason = c.case_type === 'annulation_hors_delai' ? 'Annulation tardive' : 'Séance sans carnet';
              return (
                <div key={c.id} className="espace-aregler-row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1a1a2e' }}>{coursNom}</div>
                    <div style={{ fontSize: '0.7rem', color: '#b45309', marginTop: 2 }}>
                      {reason}{dateStr ? ` · ${dateStr}` : ''}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#b45309', flexShrink: 0 }}>
                    {montant != null ? `${montant} €` : 'à régler'}
                  </div>
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: '0.72rem', color: '#a16207', margin: '10px 2px 0', lineHeight: 1.5 }}>
            {totalDu > 0 && (
              <>Total à régler : <strong>{totalDu.toFixed(2).replace('.', ',')} €</strong>. </>
            )}
            À régler directement avec ton studio (sur place ou selon ses modalités habituelles).
          </p>
        </div>
      )}

      {/* Section "Mes paiements" — historique des règlements + reçu PDF */}
      {paiementsRegles.length > 0 && (
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid #f0ebe8' }}>
          <h2 className="espace-section-title">
            <Receipt size={16} style={{ color: '#d4a0a0' }} />
            Mes paiements
            <span className="espace-count">{paiementsRegles.length}</span>
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {paiementsRegles.slice(0, 10).map(p => {
              const tone = toneForPaiement(p.statut);
              return (
              <div key={p.id} className={`paiement-row paiement-row--${tone}`}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1a1a2e' }}>
                    {p.intitule || 'Paiement'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#888', marginTop: 2 }}>
                    {new Date(p.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {p.mode && <> · {modeLabel(p.mode)}</>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: p.statut === 'paid' ? '#1a1a2e' : '#888' }}>
                    {parseFloat(p.montant).toFixed(2).replace('.', ',')} €
                  </span>
                  {p.statut === 'paid' && (
                    <a
                      href={`/api/portail/${studioSlug}/facture/${p.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Télécharger le reçu PDF"
                      className="paiement-pdf-btn"
                    >
                      <Download size={13} />
                    </a>
                  )}
                </div>
              </div>
              );
            })}
          </div>
          {paiements.length > 10 && (
            <p style={{ fontSize: '0.75rem', color: '#888', textAlign: 'center', marginTop: 12 }}>
              {paiements.length - 10} paiement{paiements.length - 10 > 1 ? 's' : ''} plus ancien{paiements.length - 10 > 1 ? 's' : ''} non affichés
            </p>
          )}
        </div>
      )}

      {/* Section "Acheter en ligne" via Stripe — uniquement si offres avec Payment Link */}
      {offresStripe.length > 0 && (
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid #f0ebe8' }}>
          <h2 className="espace-section-title">
            <CreditCard size={16} style={{ color: '#635bff' }} /> Acheter en ligne
          </h2>
          <p style={{ fontSize: '0.8125rem', color: '#888', margin: '0 0 12px' }}>
            Recharge ton carnet ou souscris à un abonnement par CB.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {offresStripe.map(o => {
              const Icon = STRIPE_TYPE_ICONS[o.type] || Ticket;
              const url = userEmail
                ? `${o.stripe_payment_link}?prefilled_email=${encodeURIComponent(userEmail)}`
                : o.stripe_payment_link;
              return (
                <a
                  key={o.id}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="espace-stripe-card"
                >
                  <div className="espace-stripe-icon"><Icon size={16} /></div>
                  <div className="espace-stripe-info">
                    <div className="espace-stripe-nom">{o.nom}</div>
                    {o.seances && <div className="espace-stripe-meta">{o.seances} séance{o.seances > 1 ? 's' : ''}</div>}
                  </div>
                  <div className="espace-stripe-prix">{o.prix}€</div>
                </a>
              );
            })}
          </div>
          <p style={{ fontSize: '0.7rem', color: '#aaa', textAlign: 'center', margin: '12px 0 0' }}>
            🔒 Paiement sécurisé via Stripe
          </p>
        </div>
      )}

      {/* Assistant Claude — désactivé temporairement (UX pas au point).
          Pour réactiver, déscommenter la ligne ci-dessous. */}
      {/* <AssistantBookingButton studioSlug={studioSlug} prenom={client?.prenom} /> */}

      {/* Bouton rebooking */}
      <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid #f0ebe8', textAlign: 'center' }}>
        <Link href={`/p/${studioSlug}`} className="portail-btn-primary" style={{ maxWidth: 280, margin: '0 auto' }}>
          📅 Voir les prochains cours
        </Link>
      </div>

      <style jsx global>{`
        .portail-back-link { display: inline-flex; align-items: center; gap: 6px; color: #888; font-size: 0.875rem; text-decoration: none; margin-bottom: 20px; }
        .portail-back-link:hover { color: #d4a0a0; }

        .espace-section-title {
          display: flex; align-items: center; gap: 8px;
          font-size: 0.875rem; font-weight: 700; color: #555;
          text-transform: uppercase; letter-spacing: 0.04em;
          margin: 0 0 10px; padding-left: 2px;
        }
        .espace-count {
          background: #fce8e8; color: #c06060;
          font-size: 0.75rem; font-weight: 700;
          padding: 2px 8px; border-radius: 99px; letter-spacing: 0;
        }

        /* Coordonnées éditables */
        .espace-coord-edit {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 0.75rem; font-weight: 600; color: #d4a0a0;
          background: none; border: 1px solid #f0d4d4; border-radius: 99px;
          padding: 5px 11px; cursor: pointer; transition: all 0.15s; flex-shrink: 0;
        }
        .espace-coord-edit:hover { background: #fdf3f3; border-color: #d4a0a0; }
        .espace-coord-row {
          display: flex; align-items: center; gap: 8px;
          font-size: 0.9375rem; color: #444;
        }
        .espace-coord-row svg { color: #d4a0a0; flex-shrink: 0; }
        .espace-coord-field { display: flex; flex-direction: column; gap: 5px; }
        .espace-coord-field > span {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 0.75rem; font-weight: 600; color: #888;
        }
        .espace-coord-field > span svg { color: #d4a0a0; }
        .espace-coord-field input {
          padding: 10px 12px; border: 1.5px solid #f0ebe8; border-radius: 10px;
          font-size: 0.9375rem; outline: none; transition: border-color 0.15s;
          width: 100%; box-sizing: border-box; background: white;
        }
        .espace-coord-field input:focus { border-color: #d4a0a0; }

        /* À régler (paiements à prévoir) */
        .espace-aregler-row {
          display: flex; align-items: center; gap: 12px;
          background: #fffaf0; border: 1px solid #fde8c8; border-radius: 12px;
          padding: 12px 14px; border-left: 4px solid #d97706;
        }

        .espace-cours-card {
          background: white; border-radius: 14px;
          padding: 16px; margin-bottom: 8px;
          box-shadow: 0 1px 6px rgba(0,0,0,0.05);
          display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
          border-left: 6px solid transparent;
        }
        .espace-cours-card--rose     { background: var(--tone-rose-bg);     border-left-color: var(--tone-rose-accent); }
        .espace-cours-card--sage     { background: var(--tone-sage-bg);     border-left-color: var(--tone-sage-accent); }
        .espace-cours-card--sand     { background: var(--tone-sand-bg);     border-left-color: var(--tone-sand-accent); }
        .espace-cours-card--lavender { background: var(--tone-lavender-bg); border-left-color: var(--tone-lavender-accent); }
        .espace-cours-card--ink      { background: var(--tone-ink-bg);      border-left-color: var(--tone-ink-bg); }
        .espace-cours-info { flex: 1; min-width: 0; }
        .espace-cours-nom { font-weight: 700; font-size: 0.9375rem; color: #1a1a2e; margin-bottom: 4px; }
        .espace-cours-details {
          display: flex; flex-direction: column; gap: 4px;
          font-size: 0.8125rem; color: #888; margin-top: 6px;
        }
        .espace-cours-details span { display: flex; align-items: center; gap: 5px; }
        .espace-cours-details svg { color: #d4a0a0; flex-shrink: 0; }
        .espace-cours-status { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0; }

        .espace-annul-btn {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 0.75rem; font-weight: 600; color: #888;
          background: none; border: 1px solid #e5e5e5; border-radius: 99px;
          padding: 4px 10px; cursor: pointer; transition: all 0.15s;
        }
        .espace-annul-btn:hover { color: #c62828; border-color: #c62828; background: #fff0f0; }
        .espace-annul-btn--tardive { color: #d97706; border-color: #fcd34d; background: #fffaf0; }
        .espace-annul-btn--tardive:hover { background: #fff0d6; color: #92400e; border-color: #d97706; }
        .espace-annul-locked {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 0.7rem; color: #bbb; background: #f8f8f8;
          border: 1px solid #eee; border-radius: 99px;
          padding: 3px 8px; cursor: help;
        }

        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }

        /* Cartes Stripe */
        .espace-stripe-card {
          display: flex; align-items: center; gap: 12px;
          background: white; border: 1px solid #e8e0db; border-radius: 12px;
          padding: 12px 14px; text-decoration: none; color: inherit;
          transition: all 0.15s;
        }
        .espace-stripe-card:hover {
          border-color: #635bff; transform: translateX(2px);
          box-shadow: 0 2px 8px rgba(99, 91, 255, 0.1);
        }
        .espace-stripe-icon {
          width: 32px; height: 32px; border-radius: 8px;
          background: #f6f9fc; color: #635bff;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .espace-stripe-info { flex: 1; min-width: 0; }
        .espace-stripe-nom { font-weight: 600; font-size: 0.9375rem; color: #1a1a2e; }
        .espace-stripe-meta { font-size: 0.75rem; color: #888; margin-top: 2px; }
        .espace-stripe-prix { font-weight: 700; font-size: 1rem; color: #635bff; }

        /* Paiements */
        .paiement-row {
          display: flex; align-items: center; gap: 12px;
          background: white; border: 1px solid #f0ebe8; border-radius: 12px;
          padding: 10px 14px;
          border-left-width: 4px;
        }
        .paiement-row--rose     { border-left-color: var(--tone-rose-accent); }
        .paiement-row--sage     { border-left-color: var(--tone-sage-accent); }
        .paiement-row--sand     { border-left-color: var(--tone-sand-accent); }
        .paiement-row--lavender { border-left-color: var(--tone-lavender-accent); }
        .paiement-pdf-btn {
          width: 30px; height: 30px; border-radius: 8px;
          background: #faf8f5; color: #888; border: 1px solid #f0ebe8;
          display: flex; align-items: center; justify-content: center;
          text-decoration: none; transition: all 0.15s;
        }
        .paiement-pdf-btn:hover { background: #d4a0a0; color: white; border-color: #d4a0a0; }
      `}</style>
    </div>
  );
}
