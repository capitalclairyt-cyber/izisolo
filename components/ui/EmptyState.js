'use client';

// État vide réutilisable (élèves, offres, sondages, essais…).
// Remplace le markup .empty-state dupliqué dans une dizaine de pages.
//
// Props :
//   icon  : emoji (string) ou nœud React (ex. <Users size={32} />)
//   title : titre court
//   description : phrase d'aide / d'incitation
//   children : zone d'action (un bouton/lien, optionnel)
//   className : classes additionnelles sur le conteneur
export default function EmptyState({ icon, title, description, children, className = '' }) {
  return (
    <div className={`izi-empty-state izi-card ${className}`}>
      {icon != null && <div className="izi-empty-icon">{icon}</div>}
      {title && <p className="izi-empty-title">{title}</p>}
      {description && <p className="izi-empty-desc">{description}</p>}
      {children && <div className="izi-empty-action">{children}</div>}

      <style jsx>{`
        .izi-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 40px 20px;
          text-align: center;
          animation: iziEmptyIn 0.4s ease forwards;
        }
        .izi-empty-icon {
          font-size: 2.5rem;
          line-height: 1;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .izi-empty-title {
          font-weight: 600;
          color: var(--text-primary);
        }
        .izi-empty-desc {
          font-size: 0.875rem;
          color: var(--text-muted);
          margin-bottom: 8px;
          max-width: 34ch;
        }
        .izi-empty-action {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: center;
        }
        @keyframes iziEmptyIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .izi-empty-state { animation: none; }
        }
      `}</style>
    </div>
  );
}
