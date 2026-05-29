import { Skeleton } from '@/components/ui/Skeleton';

// Skeleton calqué sur la vraie liste élèves : en-tête + recherche + lignes
// (avatar + nom + méta + chevron). S'affiche pendant le fetch serveur.
export default function ClientsLoading() {
  return (
    <div className="clients-loading">
      <div className="cl-header">
        <Skeleton w="38%" h={28} radius={10} />
        <Skeleton w={120} h={44} radius={12} />
      </div>
      <Skeleton h={46} radius={12} style={{ marginBottom: 16 }} />

      <div className="cl-list">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="cl-row izi-card">
            <Skeleton circle h={44} />
            <div className="cl-row-body">
              <Skeleton w="50%" h={15} />
              <Skeleton w="32%" h={12} />
            </div>
            <Skeleton w={18} h={18} radius={6} />
          </div>
        ))}
      </div>

      <style>{`
        .clients-loading { display: flex; flex-direction: column; }
        .cl-header {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; margin-bottom: 16px;
        }
        .cl-list { display: flex; flex-direction: column; gap: 10px; }
        .cl-row {
          display: flex; align-items: center; gap: 12px; padding: 14px 16px;
        }
        .cl-row-body {
          display: flex; flex-direction: column; gap: 8px; flex: 1; min-width: 0;
        }
      `}</style>
    </div>
  );
}
