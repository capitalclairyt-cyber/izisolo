'use client';

// ════════════════════════════════════════════════════════════════════════════
// La liste des rubriques de Paramètres : la page d'accueil (/parametres) et,
// en version compacte, la colonne de gauche d'une rubrique sur desktop.
//
// Le modèle est celui des Réglages d'un téléphone : une ligne par rubrique,
// son libellé, son état sur une ligne, un chevron. Les groupes sont ceux de
// lib/parametres-rubriques (pur) ; les icônes sont résolues ici.
// ════════════════════════════════════════════════════════════════════════════

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  User, Building2, UserCog, Eye, Palette, Sparkles, FileText, Code2,
  Receipt, CreditCard, Landmark, Scale, ClipboardList, EyeOff, Clock, Zap,
  Gauge, Bell, Send, Crown, ChevronRight, Settings,
} from 'lucide-react';
import { rubriquesParGroupe, resumeRubrique } from '@/lib/parametres-rubriques';
import { useParametres } from './ParametresContext';

const ICONES = {
  User, Building2, UserCog, Eye, Palette, Sparkles, FileText, Code2,
  Receipt, CreditCard, Landmark, Scale, ClipboardList, EyeOff, Clock, Zap,
  Gauge, Bell, Send, Crown,
};

export default function RubriquesListe({ compact = false }) {
  const { profile, lieux } = useParametres();
  const pathname = usePathname();
  const groupes = rubriquesParGroupe(profile, { lieux });

  return (
    <nav className={`rubriques ${compact ? 'rubriques-compact' : ''}`} aria-label="Rubriques des paramètres">
      {groupes.map(g => (
        <section key={g.id} className="rubriques-groupe">
          <h2 className="rubriques-groupe-titre">{g.label}</h2>
          <div className="rubriques-lignes">
            {g.rubriques.map(r => {
              const Icone = ICONES[r.icone] || Settings;
              const href = r.lien || `/parametres/${r.id}`;
              const active = pathname === href;
              const resume = resumeRubrique(r, profile, { lieux });
              return (
                <Link
                  key={r.id}
                  href={href}
                  className={`rubrique-ligne ${active ? 'active' : ''}`}
                  data-rubrique={r.id}
                  aria-current={active ? 'page' : undefined}
                >
                  <span className="rubrique-icone"><Icone size={compact ? 16 : 18} /></span>
                  <span className="rubrique-texte">
                    <span className="rubrique-label">{r.label}</span>
                    {!compact && resume && <span className="rubrique-resume">{resume}</span>}
                  </span>
                  <ChevronRight size={16} className="rubrique-chevron" />
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </nav>
  );
}
