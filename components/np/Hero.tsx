/**
 * Hero — KPI principal noir + halo terracotta + 3 stats (pattern designer).
 */
import * as React from 'react';

export interface HeroProps {
  /** Tag haut (eyebrow mono uppercase), ex "CETTE SEMAINE" */
  tag: string;
  /** Valeur principale en gros, ex "2 480 €" */
  value: React.ReactNode;
  /** Sous-titre, ex "+18% vs sem. dernière" */
  sub?: string;
  /** Trio de stats en bas */
  stats?: Array<{ label: string; value: React.ReactNode }>;
}

export function Hero({ tag, value, sub, stats }: HeroProps) {
  return (
    <div className="np-hero">
      <div className="np-hero__tag"><span />{tag}</div>
      <div className="np-hero__num">{value}</div>
      {sub && <div className="np-hero__sub">{sub}</div>}
      {stats && stats.length > 0 && (
        <div className="np-hero__row">
          {stats.map((s, i) => (
            <div key={i}>
              <span>{s.label}</span>
              <b>{s.value}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
