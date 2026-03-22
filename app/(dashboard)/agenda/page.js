'use client';
import { Calendar } from 'lucide-react';

export default function Agenda() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px', textAlign: 'center' }}>
      <Calendar size={40} style={{ color: 'var(--brand)' }} />
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Agenda</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>Bientôt disponible — Phase 1</p>
    </div>
  );
}
