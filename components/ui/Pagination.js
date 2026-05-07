'use client';

/**
 * Composant de pagination réutilisable.
 *
 * Usage :
 *   const { paginated, currentPage, totalPages, setPage } = usePagination(items, 8);
 *   {paginated.map(...)}
 *   <Pagination currentPage={currentPage} totalPages={totalPages} onChange={setPage} />
 *
 * Affiche : "← Précédent · Page 1/3 · Suivant →"
 * Auto-hidden si totalPages <= 1.
 */

import { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const DEFAULT_PAGE_SIZE = 8;

/**
 * Hook : prend un array et retourne la slice paginée + helpers.
 * Reset auto à la page 1 quand `items` change (ex : filtres).
 */
export function usePagination(items, pageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil((items?.length || 0) / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    if (!items) return [];
    return items.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [items, currentPage, pageSize]);

  // Reset à 1 quand le nombre total d'items change (ex : changement de filtre)
  useEffect(() => { setPage(1); }, [items?.length]);

  return { paginated, currentPage, totalPages, setPage, pageSize };
}

export default function Pagination({ currentPage, totalPages, onChange, label = 'éléments' }) {
  if (!totalPages || totalPages <= 1) return null;
  const onPrev = () => onChange(Math.max(1, currentPage - 1));
  const onNext = () => onChange(Math.min(totalPages, currentPage + 1));

  return (
    <div className="izi-pagination" role="navigation" aria-label={`Pagination des ${label}`}>
      <button
        type="button"
        className="izi-pagination-btn"
        onClick={onPrev}
        disabled={currentPage === 1}
        aria-label="Page précédente"
      >
        <ChevronLeft size={14} /> Précédent
      </button>
      <span className="izi-pagination-info">
        Page {currentPage} / {totalPages}
      </span>
      <button
        type="button"
        className="izi-pagination-btn"
        onClick={onNext}
        disabled={currentPage === totalPages}
        aria-label="Page suivante"
      >
        Suivant <ChevronRight size={14} />
      </button>

      <style jsx>{`
        .izi-pagination {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px;
          padding: 14px 0;
        }
        .izi-pagination-btn {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 7px 12px;
          background: white;
          border: 1px solid var(--border, #e5e0d8);
          border-radius: 8px;
          font-size: 0.8125rem; font-weight: 500;
          color: var(--text-primary, #1a1612);
          cursor: pointer;
          transition: all 0.15s ease;
          font-family: inherit;
        }
        .izi-pagination-btn:hover:not(:disabled) {
          border-color: var(--brand, #b87333);
          color: var(--brand-700, #8c5826);
        }
        .izi-pagination-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .izi-pagination-info {
          font-size: 0.75rem;
          color: var(--text-muted, #888);
          font-family: var(--font-geist-mono), ui-monospace, monospace;
        }
      `}</style>
    </div>
  );
}
