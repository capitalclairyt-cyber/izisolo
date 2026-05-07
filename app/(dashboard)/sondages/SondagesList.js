'use client';

import Link from 'next/link';
import { Calendar, ChevronRight } from 'lucide-react';
import Pagination, { usePagination } from '@/components/ui/Pagination';

/**
 * Liste paginée des sondages — extraite de la page server pour permettre
 * la pagination côté client (8/page).
 */
export default function SondagesList({ sondages }) {
  const { paginated, currentPage, totalPages, setPage } = usePagination(sondages, 8);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <div className="sp-list">
        {paginated.map(s => {
          const closed = !s.actif || (s.date_fin && s.date_fin < today);
          return (
            <Link key={s.id} href={`/sondages/${s.id}`} className={`sp-card izi-card izi-card-interactive ${closed ? 'closed' : ''}`}>
              <div className="sp-card-main">
                <div className="sp-card-title">{s.titre}</div>
                <div className="sp-card-meta">
                  <Calendar size={12} />
                  {s.date_fin
                    ? `Jusqu'au ${new Date(s.date_fin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
                    : 'Sans date limite'}
                  {' · '}
                  {s.nbCreneaux} créneau{s.nbCreneaux > 1 ? 'x' : ''}
                </div>
              </div>
              <div className="sp-card-stats">
                <div className="sp-stat">
                  <strong>{s.nbReponses}</strong>
                  <span>réponse{s.nbReponses > 1 ? 's' : ''}</span>
                </div>
                {closed
                  ? <span className="sp-badge closed">Clos</span>
                  : <span className="sp-badge active">Actif</span>}
                <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
              </div>
            </Link>
          );
        })}
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onChange={setPage}
        label="sondages"
      />
    </>
  );
}
