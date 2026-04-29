'use client';
import { LayoutGrid } from 'lucide-react';
import { PageHeader } from '@/components/np';

export default function Evenements() {
  return (
    <>
      <PageHeader
        eyebrow="ÉVÈNEMENTS"
        title="Événements"
        meta="Stages, ateliers et soirées ponctuelles"
      />
      <div style={{ padding: '40px 22px', textAlign: 'center' }}>
        <LayoutGrid size={40} style={{ color: 'var(--m-accent)', marginBottom: 16 }} />
        <p style={{ color: 'var(--m-ink-mute)', fontSize: '0.9375rem' }}>
          Bientôt disponible — fonctionnalité en cours de développement
        </p>
      </div>
    </>
  );
}
