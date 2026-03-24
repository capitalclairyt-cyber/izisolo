'use client';

import { useState, useMemo } from 'react';
import { MessageCircle, CheckCircle, Clock, AlertCircle, ChevronDown, ChevronUp, Send } from 'lucide-react';

const STATUS_CONFIG = {
  open:       { label: 'Ouvert',    color: '#60a5fa', bg: '#1e3a5f', icon: Clock },
  in_progress:{ label: 'En cours',  color: '#fb923c', bg: '#3f2d1f', icon: AlertCircle },
  resolved:   { label: 'Résolu',    color: '#4ade80', bg: '#1c3a2e', icon: CheckCircle },
};

export default function AdminTicketsClient({ initialTickets }) {
  const [tickets, setTickets] = useState(initialTickets);
  const [filterStatus, setFilterStatus] = useState('');
  const [openTicket, setOpenTicket] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    if (!filterStatus) return tickets;
    return tickets.filter(t => t.status === filterStatus);
  }, [tickets, filterStatus]);

  const counts = useMemo(() => {
    return {
      open: tickets.filter(t => t.status === 'open').length,
      in_progress: tickets.filter(t => t.status === 'in_progress').length,
      resolved: tickets.filter(t => t.status === 'resolved').length,
    };
  }, [tickets]);

  const handleUpdateTicket = async (ticketId, updates) => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/tickets/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, ...updates }),
      });
      if (!res.ok) throw new Error('Erreur serveur');
      setTickets(prev => prev.map(t =>
        t.id === ticketId ? { ...t, ...updates } : t
      ));
      if (updates.admin_reply !== undefined) setReplyText('');
    } catch (e) {
      alert('Erreur : ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSendReply = async (ticket) => {
    if (!replyText.trim()) return;
    await handleUpdateTicket(ticket.id, {
      admin_reply: replyText.trim(),
      status: 'resolved',
    });
  };

  if (tickets.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <h1 className="admin-title">🎫 Tickets Support</h1>
        <div className="admin-card" style={{ textAlign: 'center', padding: '48px', color: '#475569' }}>
          <MessageCircle size={32} style={{ margin: '0 auto 12px', opacity: 0.4, display: 'block' }} />
          <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '8px', color: '#64748b' }}>Aucun ticket pour l'instant</div>
          <div style={{ fontSize: '0.875rem' }}>
            Les tickets sont créés quand un utilisateur soumet un problème depuis la page Support.
            <br />
            La table <code style={{ color: '#60a5fa', background: '#1e3a5f', padding: '1px 6px', borderRadius: '4px' }}>support_tickets</code> doit exister dans Supabase.
          </div>
        </div>
        <TicketsSetupNote />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h1 className="admin-title">🎫 Tickets Support</h1>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setFilterStatus('')}
          className={`admin-filter-pill ${!filterStatus ? 'active' : ''}`}
        >
          Tous ({tickets.length})
        </button>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setFilterStatus(filterStatus === key ? '' : key)}
            className={`admin-filter-pill ${filterStatus === key ? 'active' : ''}`}
            style={filterStatus === key ? { borderColor: cfg.color, color: cfg.color, background: cfg.bg } : {}}
          >
            {cfg.label} ({counts[key] || 0})
          </button>
        ))}
      </div>

      {/* Liste */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filtered.length === 0 ? (
          <div className="admin-card" style={{ textAlign: 'center', color: '#475569', padding: '32px' }}>
            Aucun ticket dans cette catégorie
          </div>
        ) : filtered.map(ticket => {
          const cfg = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
          const StatusIcon = cfg.icon;
          const isOpen = openTicket === ticket.id;

          return (
            <div key={ticket.id} className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Header du ticket */}
              <button
                onClick={() => setOpenTicket(isOpen ? null : ticket.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <StatusIcon size={16} style={{ color: cfg.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {ticket.subject || 'Sans objet'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '2px' }}>
                    {ticket.user_email || 'Utilisateur inconnu'} · {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </div>
                </div>
                <span
                  className="admin-badge"
                  style={{ background: cfg.bg, color: cfg.color, flexShrink: 0 }}
                >
                  {cfg.label}
                </span>
                {isOpen ? <ChevronUp size={14} style={{ color: '#64748b', flexShrink: 0 }} /> : <ChevronDown size={14} style={{ color: '#64748b', flexShrink: 0 }} />}
              </button>

              {/* Détail */}
              {isOpen && (
                <div style={{ padding: '0 16px 16px', borderTop: '1px solid #2d2d3f' }}>
                  {/* Message */}
                  <div style={{ marginTop: '12px', background: '#0f0f13', borderRadius: '8px', padding: '12px 14px', fontSize: '0.875rem', color: '#94a3b8', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {ticket.message}
                  </div>

                  {/* Réponse admin existante */}
                  {ticket.admin_reply && (
                    <div style={{ marginTop: '10px' }}>
                      <div style={{ fontSize: '0.75rem', color: '#4ade80', marginBottom: '6px', fontWeight: 600 }}>✓ Réponse envoyée</div>
                      <div style={{ background: '#1c3a2e', borderRadius: '8px', padding: '10px 14px', fontSize: '0.875rem', color: '#4ade80', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                        {ticket.admin_reply}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* Changer le statut */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', alignSelf: 'center' }}>Statut :</span>
                      {Object.entries(STATUS_CONFIG).map(([key, c]) => (
                        <button
                          key={key}
                          disabled={saving || ticket.status === key}
                          onClick={() => handleUpdateTicket(ticket.id, { status: key })}
                          style={{
                            padding: '4px 10px', border: `1px solid ${ticket.status === key ? c.color : '#2d2d3f'}`,
                            borderRadius: '99px', background: ticket.status === key ? c.bg : 'none',
                            color: ticket.status === key ? c.color : '#64748b',
                            fontSize: '0.75rem', cursor: ticket.status === key || saving ? 'default' : 'pointer',
                            opacity: saving ? 0.6 : 1,
                          }}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>

                    {/* Zone de réponse */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        placeholder="Répondre à l'utilisateur (marque le ticket comme résolu)…"
                        onKeyDown={e => e.key === 'Enter' && handleSendReply(ticket)}
                        style={{
                          flex: 1, background: '#0f0f13', border: '1px solid #2d2d3f', borderRadius: '8px',
                          padding: '8px 12px', color: '#e2e8f0', fontSize: '0.875rem', outline: 'none',
                        }}
                      />
                      <button
                        disabled={saving || !replyText.trim()}
                        onClick={() => handleSendReply(ticket)}
                        style={{
                          padding: '8px 14px', background: '#4ade80', color: '#0f2018',
                          border: 'none', borderRadius: '8px', cursor: saving || !replyText.trim() ? 'not-allowed' : 'pointer',
                          opacity: saving || !replyText.trim() ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '6px',
                          fontWeight: 600, fontSize: '0.8125rem',
                        }}
                      >
                        <Send size={14} /> Répondre
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TicketsSetupNote() {
  return (
    <div className="admin-card" style={{ borderColor: '#1e3a5f' }}>
      <h2 className="admin-subtitle" style={{ marginBottom: '10px' }}>📋 Mise en place des tickets</h2>
      <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0 0 10px', lineHeight: 1.6 }}>
        Pour activer les tickets de support, créer la table suivante dans Supabase :
      </p>
      <pre style={{
        background: '#0f0f13', borderRadius: '8px', padding: '14px', fontSize: '0.8rem',
        color: '#60a5fa', overflow: 'auto', margin: 0, lineHeight: 1.6,
      }}>{`create table public.support_tickets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  user_email text,
  subject text,
  message text not null,
  status text default 'open' check (status in ('open', 'in_progress', 'resolved')),
  admin_reply text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS : l'user voit ses tickets, l'admin voit tout
alter table public.support_tickets enable row level security;

create policy "Users see own tickets"
  on support_tickets for select
  using (auth.uid() = user_id);

create policy "Users insert own tickets"
  on support_tickets for insert
  with check (auth.uid() = user_id);

create policy "Service role full access"
  on support_tickets
  using (auth.role() = 'service_role');`}</pre>
    </div>
  );
}
