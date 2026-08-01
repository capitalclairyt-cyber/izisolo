'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Send, ChevronDown, ChevronUp, Mail, ExternalLink,
  Loader, Ticket, CheckCircle, BookOpen, MessageSquarePlus, ArrowRight
} from 'lucide-react';

// FAQ réécrite le 2026-08-01 (décision Colin « aide utilisateur ») : les vraies
// questions du terrain, avec les VRAIS chemins de l'app et le lexique gravé
// (Cours = modèle / Séance = occurrence / Offre = catalogue / Carnets & abos).
// L'ancienne FAQ promettait des choses fausses (« factures générées
// automatiquement », « export en bas de Paramètres ») — plus jamais ça :
// chaque réponse a été vérifiée contre l'écran qu'elle décrit.
const FAQ = [
  {
    q: "Comment créer un cours qui se répète chaque semaine ?",
    a: "Va dans Cours & Évènements → « Créer un cours », choisis une fréquence (hebdomadaire, tous les 15 jours, mensuelle) et une date de fin : IziSolo génère toutes les séances d'un coup. Pour prolonger une série qui se termine (rentrée, nouveau trimestre), ouvre l'écran des cours récurrents et clique sur l'icône 📅+ de la série.",
    lien: { href: '/aide#premier-cours', label: 'Voir le pas-à-pas' },
  },
  {
    q: "Comment pointer les présences d'une séance ?",
    a: "Depuis l'Accueil ou l'Agenda, ouvre la séance du jour → « Pointer ». Un clic par élève, et le carnet se décompte automatiquement.",
    lien: { href: '/aide#pointage', label: 'Voir le pas-à-pas' },
  },
  {
    q: "Le carnet ne s'est pas décompté (ou pas sur le bon carnet) — comment corriger ?",
    a: "Au pointage, ouvre le menu ··· sur la ligne de l'élève : « Décompter sur » te laisse choisir le bon carnet, ou repasser la séance « À l'unité ». Le compteur se corrige immédiatement.",
  },
  {
    q: "Comment inviter mes élèves sur leur espace en ligne ?",
    a: "Page Élèves → « Inviter » (ou depuis une fiche) : chaque élève reçoit un lien d'accès à son espace — réservations, carnet, messages. Et après un import CSV, l'écran de fin te propose d'inviter tout le monde en un clic.",
    lien: { href: '/aide#eleves', label: 'Voir le pas-à-pas' },
  },
  {
    q: "Comment vendre un carnet ou un abonnement à une élève ?",
    a: "Crée d'abord ton offre dans Offres (carnet 10 séances, abo mensuel…). Puis fiche élève → « Ajouter une offre » : payé maintenant, à régler plus tard, ou en plusieurs fois — les montants dus t'attendent dans Revenus, section « À percevoir ».",
    lien: { href: '/aide#encaisser', label: 'Voir le pas-à-pas' },
  },
  {
    q: "Comment modifier une seule séance sans toucher au reste de la série ?",
    a: "Ouvre la séance → icône crayon : la modification ne s'applique qu'à cette séance. Pour changer l'horaire ou le lieu de toutes les séances, utilise « Modifier toute la série » dans le bandeau.",
  },
  {
    q: "Où je règle mon délai d'annulation et mes règles (absences, retards…) ?",
    a: "Paramètres → Règles : délai d'annulation, absence non prévenue, annulation tardive… Tes élèves voient la règle au moment d'annuler, et les cas ambigus remontent dans « À traiter » pour que tu tranches.",
  },
  {
    q: "Comment exporter mes données ?",
    a: "Page Élèves → « Exporter » : un CSV de toutes tes fiches, disponible quel que soit ton plan. L'export comptable des encaissements se fait depuis Revenus (plan Complet).",
  },
  {
    q: "Comment gérer mon abonnement IziSolo ?",
    a: "Paramètres → Abonnement IziSolo. Pour une facture ou une question de facturation, écris-nous à bonjour@izisolo.fr — on te répond vite.",
  },
];

export default function SupportPage() {
  const [openFaq, setOpenFaq] = useState(null);

  // Ticket form state
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketSending, setTicketSending] = useState(false);
  const [ticketSent, setTicketSent] = useState(false);

  const handleSubmitTicket = async () => {
    if (!ticketMessage.trim()) return;
    setTicketSending(true);
    try {
      const res = await fetch('/api/support-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: ticketSubject, message: ticketMessage }),
      });
      if (!res.ok) throw new Error('Erreur réseau');
      setTicketSent(true);
      setTicketSubject('');
      setTicketMessage('');
    } catch (e) {
      alert('Erreur : impossible d\'envoyer le ticket. Contacte directement bonjour@izisolo.fr.');
    } finally {
      setTicketSending(false);
    }
  };

  return (
    <div className="support-page">
      <div className="support-header">
        <h1>Support &amp; Aide</h1>
        <p className="support-subtitle">Des questions ? On est là.</p>
      </div>

      {/* Contact rapide */}
      <div className="support-contact-bar">
        <a href="mailto:bonjour@izisolo.fr" className="support-contact-btn">
          <Mail size={16} />
          bonjour@izisolo.fr
        </a>
        <Link href="/legal/cgu" className="support-contact-btn ghost" target="_blank">
          <ExternalLink size={14} />
          CGU
        </Link>
        <Link href="/legal/rgpd" className="support-contact-btn ghost" target="_blank">
          <ExternalLink size={14} />
          RGPD
        </Link>
        <Link href="/legal/mentions" className="support-contact-btn ghost" target="_blank">
          <ExternalLink size={14} />
          Mentions légales
        </Link>
      </div>

      {/* Guide de démarrage */}
      <Link href="/aide" className="support-guide-card">
        <BookOpen size={22} />
        <div className="support-guide-txt">
          <div className="support-guide-title">Le guide de démarrage</div>
          <div className="support-guide-desc">
            Ton premier cours récurrent, inviter tes élèves, encaisser, le pointage,
            ta page publique — pas à pas, avec les vrais écrans.
          </div>
        </div>
        <ArrowRight size={18} className="support-guide-arrow" />
      </Link>

      {/* FAQ */}
      <div className="support-section">
        <h2 className="support-section-title">Questions fréquentes</h2>
        <div className="faq-list">
          {FAQ.map((item, i) => (
            <div key={i} className={`faq-item ${openFaq === i ? 'open' : ''}`}>
              <button className="faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <span>{item.q}</span>
                {openFaq === i ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {openFaq === i && (
                <div className="faq-a">
                  {item.a}
                  {item.lien && (
                    <Link href={item.lien.href} className="faq-lien">
                      {item.lien.label} <ArrowRight size={12} />
                    </Link>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Un bug ? Une idée ? — le widget feedback est LE canal (2026-08-01 :
          38 retours reçus, tous lus — c'est lui qui pilote les correctifs) */}
      <div className="support-section">
        <h2 className="support-section-title">
          <MessageSquarePlus size={18} /> Un bug ? Une idée ?
        </h2>
        <div className="izi-card" style={{ padding: '20px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <MessageSquarePlus size={22} style={{ color: 'var(--brand)', flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Le plus simple : le bouton <strong>« Donner du feedback »</strong> en haut à droite
            de ton écran. Décris ce qui coince (ou ce qui te ferait gagner du temps) —{' '}
            <strong>on lit chaque message</strong>, et c'est comme ça que la plupart des
            améliorations de l'app sont nées.
          </div>
        </div>
      </div>

      {/* Ticket de support */}
      <div className="support-section">
        <h2 className="support-section-title">
          <Ticket size={18} /> Contacter le support
        </h2>
        {ticketSent ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-card)', border: '1px solid #4ade80', borderRadius: 'var(--radius-md)', padding: '16px 20px' }}>
            <CheckCircle size={20} style={{ color: '#4ade80', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>Ticket envoyé !</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Notre équipe revient vers toi dans les meilleurs délais.</div>
            </div>
            <button onClick={() => setTicketSent(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
              Nouveau ticket
            </button>
          </div>
        ) : !showTicketForm ? (
          <button className="support-contact-btn" style={{ alignSelf: 'flex-start' }} onClick={() => setShowTicketForm(true)}>
            <Ticket size={16} /> Ouvrir un ticket
          </button>
        ) : (
          <div className="izi-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px' }}>
            <input
              type="text"
              value={ticketSubject}
              onChange={e => setTicketSubject(e.target.value)}
              placeholder="Objet (ex : Impossible de créer un cours récurrent)"
              style={{
                border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)',
                padding: '10px 14px', fontSize: '0.9rem', outline: 'none', background: 'var(--bg-soft)',
                width: '100%', boxSizing: 'border-box',
              }}
            />
            <textarea
              value={ticketMessage}
              onChange={e => setTicketMessage(e.target.value)}
              placeholder="Décris ton problème en détail…"
              rows={4}
              style={{
                border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)',
                padding: '10px 14px', fontSize: '0.875rem', outline: 'none', background: 'var(--bg-soft)',
                width: '100%', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5,
              }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowTicketForm(false)} style={{ padding: '8px 16px', background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-full)', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Annuler
              </button>
              <button
                className="support-contact-btn"
                disabled={ticketSending || !ticketMessage.trim()}
                onClick={handleSubmitTicket}
                style={{ opacity: ticketSending || !ticketMessage.trim() ? 0.6 : 1, cursor: ticketSending || !ticketMessage.trim() ? 'not-allowed' : 'pointer' }}
              >
                {ticketSending ? <Loader size={14} className="spin" /> : <Send size={14} />}
                Envoyer
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        .support-page { display: flex; flex-direction: column; gap: 24px; padding-bottom: 80px; }
        .support-header { }
        .support-header h1 { font-size: 1.375rem; font-weight: 800; margin: 0 0 4px; }
        .support-subtitle { color: var(--text-secondary); font-size: 0.9rem; margin: 0; }

        .support-contact-bar {
          display: flex; flex-wrap: wrap; gap: 8px;
        }
        .support-contact-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 14px; border-radius: var(--radius-full);
          font-size: 0.8125rem; font-weight: 600; text-decoration: none;
          background: var(--brand); color: white;
          transition: background 0.15s;
        }
        .support-contact-btn:hover { background: var(--brand-600, #b07070); }
        .support-contact-btn.ghost {
          background: var(--bg-card); color: var(--text-secondary);
          border: 1px solid var(--border);
        }
        .support-contact-btn.ghost:hover { border-color: var(--brand); color: var(--brand); background: var(--brand-light); }

        .support-guide-card {
          display: flex; align-items: center; gap: 14px;
          padding: 18px 20px; border-radius: var(--radius-md);
          background: var(--bg-card); border: 1.5px solid var(--brand-200, #f0d0d0);
          color: var(--brand); text-decoration: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .support-guide-card:hover { border-color: var(--brand); box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
        .support-guide-txt { flex: 1; min-width: 0; }
        .support-guide-title { font-weight: 700; font-size: 0.95rem; color: var(--text-primary); margin-bottom: 2px; }
        .support-guide-desc { font-size: 0.8125rem; color: var(--text-secondary); line-height: 1.45; }
        .support-guide-arrow { flex-shrink: 0; }

        .support-section-title {
          display: flex; align-items: center; gap: 8px;
          font-size: 1rem; font-weight: 700; margin: 0 0 12px; color: var(--text-primary);
        }

        /* FAQ */
        .faq-list { display: flex; flex-direction: column; gap: 6px; }
        .faq-item { border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--bg-card); overflow: hidden; }
        .faq-item.open { border-color: var(--brand-200, #f0d0d0); }
        .faq-q {
          width: 100%; display: flex; align-items: center; justify-content: space-between;
          gap: 12px; padding: 14px 16px;
          background: none; border: none; cursor: pointer; text-align: left;
          font-size: 0.9rem; font-weight: 600; color: var(--text-primary);
          transition: background 0.15s;
        }
        .faq-q:hover { background: var(--bg-soft, #f8f9fa); }
        .faq-a {
          padding: 0 16px 14px; font-size: 0.875rem; line-height: 1.6;
          color: var(--text-secondary); white-space: pre-line;
        }
        .faq-lien {
          display: inline-flex; align-items: center; gap: 4px;
          margin-top: 8px; font-size: 0.8125rem; font-weight: 600;
          color: var(--brand); text-decoration: none;
        }
        .faq-lien:hover { text-decoration: underline; }

        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
