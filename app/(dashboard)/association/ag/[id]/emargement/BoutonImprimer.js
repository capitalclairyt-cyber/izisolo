'use client';

import { Printer } from 'lucide-react';

/** Le bouton d'impression de la feuille d'émargement (v113). */
export default function BoutonImprimer() {
  return (
    <button type="button" className="izi-btn btn-sm izi-btn-primary" onClick={() => window.print()} data-testid="emargement-imprimer">
      <Printer size={14} /> Imprimer
    </button>
  );
}
