/**
 * IziSolo · NewSheet — Sheet "Nouveau" prête à l'emploi
 * src/components/mobile/NewSheet.tsx
 *
 * Sheet ouverte par le bouton + central du <BottomDock>.
 * 6 tuiles colorées : Cours / Élève / Paiement / Atelier / Facture / Modèle.
 *
 * Branche les `onClick` sur ton routeur (Next.js) ou tes mutations.
 */

'use client';

import * as React from 'react';
import { Sheet } from './Sheet';
import { Tile } from './Tile';

export interface NewSheetProps {
  open: boolean;
  onClose: () => void;
  onPick?: (kind: 'cours' | 'eleve' | 'paiement' | 'atelier' | 'facture' | 'modele') => void;
}

export function NewSheet({ open, onClose, onPick }: NewSheetProps) {
  const pick = (kind: Parameters<NonNullable<NewSheetProps['onPick']>>[0]) => () => {
    onPick?.(kind);
    onClose();
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Nouveau"
      hint={<>Astuce · long-press sur l'onglet <strong>Accueil</strong> pour ce menu</>}
    >
      <div className="grid grid-cols-3 gap-2 mb-3.5">
        <Tile icon="cal"      tone="rose"     title="Cours"    sub="Ajouter à l'agenda"     onClick={pick('cours')} />
        <Tile icon="users"    tone="sage"     title="Élève"    sub="Nouvelle inscription"   onClick={pick('eleve')} />
        <Tile icon="euro"     tone="sand"     title="Paiement" sub="Encaisser"              onClick={pick('paiement')} />
        <Tile icon="bookmark" tone="lavender" title="Atelier"  sub="Événement spécial"      onClick={pick('atelier')} />
        <Tile icon="file"     tone="ink"      title="Facture"  sub="Générer un PDF"         onClick={pick('facture')} />
        <Tile icon="sparkle"  tone="rose"     title="Modèle"   sub="Récurrence"             onClick={pick('modele')} />
      </div>
    </Sheet>
  );
}
