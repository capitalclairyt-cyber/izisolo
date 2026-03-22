'use client';
import { Settings } from 'lucide-react';

export default function Parametres() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px', textAlign: 'center' }}>
      <Settings size={40} style={{ color: 'var(--brand)' }} />
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Paramètres</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>Bientôt disponible — Phase 1</p>
    </div>
  );
}
