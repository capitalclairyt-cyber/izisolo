'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  MessageCircle, Send, ChevronDown, ChevronUp,
  Mail, ExternalLink, Bot, User, Loader, Ticket, CheckCircle
} from 'lucide-react';

const FAQ = [
  {
    q: "Comment créer un cours récurrent ?",
    a: "Va dans l'Agenda → bouton + → remplis le formulaire → choisis une fréquence (hebdomadaire, bimensuel…). IziSolo génère automatiquement les séances."
  },
  {
    q: "Comment pointer les présences d'un cours ?",
    a: "Ouvre le cours depuis l'agenda → clique sur \"Pointer\". Tu peux marquer chaque élève présent ou absent. Le cours affiche ensuite une icône verte dans l'agenda."
  },
  {
    q: "Comment ajouter un élève à un cours ?",
    a: "Depuis la fiche élève → onglet Abonnements → assigner l'élève à une offre. Ou depuis le cours → ajouter un inscrit."
  },
  {
    q: "Comment modifier un seul cours d'une série récurrente ?",
    a: "Ouvre le cours → clique sur l'icône crayon. Les modifications s'appliquent uniquement à cette séance. Pour modifier toute la série, clique sur \"Modifier toute la série\" dans le bandeau d'avertissement."
  },
  {
    q: "Comment créer des types de cours et catégories ?",
    a: "Va dans Cours & Évènements → section Types de cours. Tu peux créer des catégories (ex: Yoga) et ajouter des types dans chaque catégorie (ex: Hatha, Vinyasa). Les types apparaissent ensuite lors de la création de cours."
  },
  {
    q: "Où trouver mes factures ?",
    a: "Dans Paramètres → Abonnement. Tes factures sont générées automatiquement après chaque paiement."
  },
  {
    q: "Comment exporter mes données ?",
    a: "Dans Paramètres → depuis le bas de la page, tu peux exporter tes données en CSV. Pour un export complet, contacte support@izisolo.fr."
  },
  {
    q: "Comment changer de formule d'abonnement ?",
    a: "Dans Paramètres → Abonnement → Changer de formule. Le changement prend effet immédiatement."
  },
];

export default function SupportPage() {
  const [openFaq, setOpenFaq]     = useState(null);
  const [messages, setMessages]   = useState([
    { role: 'assistant', content: "Bonjour ! Je suis l'assistant support IziSolo 👋 Comment puis-je t'aider ?" }
  ]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const messagesEndRef             = useRef(null);
  const inputRef                   = useRef(null);

  // Ticket form state
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketSubject, setTicketSubject]   = useState('');
  const [ticketMessage, setTicketMessage]   = useState('');
  const [ticketSending, setTicketSending]   = useState(false);
  const [ticketSent, setTicketSent]         = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages.filter(m => m.role !== 'assistant' || newMessages.indexOf(m) > 0) }),
      });

      if (!res.ok) throw new Error('Erreur réseau');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantMsg = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantMsg += decoder.decode(value, { stream: true });
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: assistantMsg };
          return updated;
        });
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Désolé, je rencontre un problème technique. Contacte-nous à support@izisolo.fr 🙏"
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const suggestQuestion = (q) => {
    setInput(q);
    inputRef.current?.focus();
  };

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
      alert('Erreur : impossible d\'envoyer le ticket. Contacte directement support@izisolo.fr.');
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
        <a href="mailto:support@izisolo.fr" className="support-contact-btn">
          <Mail size={16} />
          support@izisolo.fr
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
                <div className="faq-a">{item.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Chatbot */}
      <div className="support-section">
        <h2 className="support-section-title">
          <Bot size={18} /> Assistant IA
        </h2>
        <div className="chat-box izi-card">
          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role}`}>
                <div className="chat-msg-avatar">
                  {m.role === 'assistant' ? <Bot size={14} /> : <User size={14} />}
                </div>
                <div className="chat-msg-content">{m.content || <Loader size={14} className="chat-loading" />}</div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          {messages.length <= 1 && (
            <div className="chat-suggestions">
              {["Comment créer un cours ?", "Comment pointer les présences ?", "Comment gérer mes abonnements ?"].map(s => (
                <button key={s} className="chat-suggestion" onClick={() => suggestQuestion(s)}>{s}</button>
              ))}
            </div>
          )}

          <div className="chat-input-row">
            <input
              ref={inputRef}
              className="chat-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
              placeholder="Pose ta question…"
              disabled={loading}
            />
            <button className="chat-send" onClick={handleSend} disabled={loading || !input.trim()}>
              {loading ? <Loader size={16} className="spin" /> : <Send size={16} />}
            </button>
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
          padding: 0 16px 14px;
          font-size: 0.875rem; color: var(--text-secondary); line-height: 1.6;
          border-top: 1px solid var(--border);
          padding-top: 12px;
        }

        /* Chat */
        .chat-box { display: flex; flex-direction: column; gap: 0; padding: 0; overflow: hidden; }
        .chat-messages {
          flex: 1; padding: 16px; display: flex; flex-direction: column; gap: 12px;
          max-height: 380px; overflow-y: auto;
        }
        .chat-msg { display: flex; gap: 10px; align-items: flex-start; }
        .chat-msg.user { flex-direction: row-reverse; }
        .chat-msg-avatar {
          width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center; font-size: 0.75rem;
        }
        .chat-msg.assistant .chat-msg-avatar { background: var(--brand-light); color: var(--brand); }
        .chat-msg.user .chat-msg-avatar { background: var(--brand); color: white; }
        .chat-msg-content {
          max-width: 80%; padding: 10px 14px;
          border-radius: 14px; font-size: 0.875rem; line-height: 1.5;
          white-space: pre-wrap;
        }
        .chat-msg.assistant .chat-msg-content { background: var(--bg-soft, #f5f5f5); color: var(--text-primary); border-bottom-left-radius: 4px; }
        .chat-msg.user .chat-msg-content { background: var(--brand); color: white; border-bottom-right-radius: 4px; }
        .chat-loading { animation: spin 1s linear infinite; }

        .chat-suggestions { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 16px 12px; }
        .chat-suggestion {
          padding: 6px 12px; background: var(--bg-soft); border: 1px solid var(--border);
          border-radius: var(--radius-full); font-size: 0.8rem; color: var(--text-secondary);
          cursor: pointer; transition: all 0.15s;
        }
        .chat-suggestion:hover { border-color: var(--brand); color: var(--brand); background: var(--brand-light); }

        .chat-input-row {
          display: flex; gap: 8px; padding: 12px 16px;
          border-top: 1px solid var(--border);
        }
        .chat-input {
          flex: 1; border: 1.5px solid var(--border); border-radius: var(--radius-full);
          padding: 10px 16px; font-size: 0.9rem; outline: none; transition: border-color 0.15s;
          background: var(--bg-soft);
        }
        .chat-input:focus { border-color: var(--brand); background: white; }
        .chat-send {
          width: 40px; height: 40px; border-radius: 50%;
          background: var(--brand); color: white; border: none;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: background 0.15s; flex-shrink: 0;
        }
        .chat-send:hover:not(:disabled) { background: var(--brand-600, #b07070); }
        .chat-send:disabled { opacity: 0.5; cursor: not-allowed; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
