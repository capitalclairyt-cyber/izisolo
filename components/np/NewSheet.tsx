/**
 * NewSheet — sheet "Nouveau" pattern designer.
 * 6 tuiles colorées (Cours/Élève/Paiement/Atelier/Facture/Modèle).
 */
'use client';

import * as React from 'react';
import { Icon, type IconName } from './Icon';

export type NewKind = 'cours' | 'eleve' | 'paiement' | 'atelier' | 'facture' | 'modele';

interface TileProps {
  icon: IconName;
  tone: 'rose' | 'sage' | 'sand' | 'lavender' | 'ink';
  title: string;
  sub: string;
  onClick?: () => void;
}

function Tile({ icon, tone, title, sub, onClick }: TileProps) {
  return (
    <button type="button" className={`np-tile np-tile--${tone}`} onClick={onClick}>
      <span className="np-tile__icon"><Icon name={icon} size={20} strokeWidth={1.5} /></span>
      <div className="np-tile__t">{title}</div>
      <div className="np-tile__s">{sub}</div>
    </button>
  );
}

export interface NewSheetProps {
  open: boolean;
  onClose: () => void;
  onPick?: (kind: NewKind) => void;
}

export function NewSheet({ open, onClose, onPick }: NewSheetProps) {
  if (!open) return null;
  const pick = (kind: NewKind) => () => { onPick?.(kind); onClose(); };
  return (
    <>
      <div className="np-sheet-bd" onClick={onClose} />
      <div className="np-sheet">
        <div className="np-sheet__handle" />
        <div className="np-sheet__title">Nouveau</div>
        <div className="np-sheet__grid">
          <Tile icon="cal"      tone="rose"     title="Cours"    sub="Ajouter à l'agenda"   onClick={pick('cours')} />
          <Tile icon="users"    tone="sage"     title="Élève"    sub="Nouvelle inscription" onClick={pick('eleve')} />
          <Tile icon="euro"     tone="sand"     title="Paiement" sub="Encaisser"            onClick={pick('paiement')} />
          <Tile icon="bookmark" tone="lavender" title="Atelier"  sub="Événement spécial"    onClick={pick('atelier')} />
          <Tile icon="file"     tone="ink"      title="Facture"  sub="Générer un PDF"       onClick={pick('facture')} />
          <Tile icon="sparkle"  tone="rose"     title="Modèle"   sub="Récurrence"           onClick={pick('modele')} />
        </div>
        <div className="np-sheet__hint">
          Astuce · long-press sur l'onglet <strong>Accueil</strong> pour ce menu
        </div>
      </div>
    </>
  );
}
