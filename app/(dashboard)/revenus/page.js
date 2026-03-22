'use client';
import { Wallet } from 'lucide-react';

export default function Revenus() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px', textAlign: 'center' }}>
      <Wallet size={40} style={{ color: 'var(--brand)' }} />
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Tes revenus</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>Bientôt disponible — Phase 1</p>
    </div>
  );
}
