'use client';

import { Plus } from 'lucide-react';

export default function FAB({ onClick, icon: Icon = Plus, label = 'Ajouter' }) {
  return (
    <button
      className="izi-fab"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <Icon size={24} />
    </button>
  );
}
