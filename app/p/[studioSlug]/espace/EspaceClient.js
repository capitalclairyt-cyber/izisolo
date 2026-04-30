'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, MapPin, ArrowLeft, LogOut, CheckCircle, XCircle, Loader, AlertCircle, User, Lock, CreditCard, Ticket, CalendarCheck, Zap, Download, Receipt, MessageCircle, Send, X } from 'lucide-react';
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
          presence.present
            ? <span className="portail-tag portail-tag-green">Présent·e</span>
            : <span className="portail-tag portail-tag-blue">Inscrit·e</span>
        ) : (
          presence.present
            ? <span className="portail-tag portail-tag-green">✓ Présent·e</span>
            : <span className="portail-tag" style={{ background: '#f5f5f5', color: '#999' }}>Absent·e</span>
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

export default function EspaceClient({ profile, client, aVenir, passes, paiements = [], offresStripe = [], studioSlug, userEmail }) {
  const router = useRouter();
  const { toast } = useToast();
  const [annulEnCours, setAnnulEnCours] = useState(null);
  const [annuleIds, setAnnuleIds]       = useState([]);
  const [errMsg, setErrMsg]             = useState('');
  const [loggingOut, setLoggingOut]     = useState(false);

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
      <Link href={`/p/${studioSlug}`} className="portail-back-link">
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

      {/* Section "Mes paiements" — historique + téléchargement reçu PDF */}
      {paiements.length > 0 && (
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid #f0ebe8' }}>
          <h2 className="espace-section-title">
            <Receipt size={16} style={{ color: '#d4a0a0' }} />
            Mes paiements
            <span className="espace-count">{paiements.length}</span>
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {paiements.slice(0, 10).map(p => {
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

        .espace-cours-card {
          background: white; border-radius: 14px;
          padding: 16px; margin-bottom: 8px;
          box-shadow: 0 1px 6px rgba(0,0,0,0.05);
          display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
          border-left: 6px solid transparent;
        }
        .espace-cours-card--rose     { background: var(--tone-rose-bg-soft);     border-left-color: var(--tone-rose-accent); }
        .espace-cours-card--sage     { background: var(--tone-sage-bg-soft);     border-left-color: var(--tone-sage-accent); }
        .espace-cours-card--sand     { background: var(--tone-sand-bg-soft);     border-left-color: var(--tone-sand-accent); }
        .espace-cours-card--lavender { background: var(--tone-lavender-bg-soft); border-left-color: var(--tone-lavender-accent); }
        .espace-cours-card--ink      { background: var(--tone-ink-bg-soft);      border-left-color: var(--tone-ink-bg); }
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
