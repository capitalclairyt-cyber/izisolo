'use client';

// Primitives de skeleton réutilisables, shimmer teinté warm (palette Sauge & Cuivre).
// Sert à composer des écrans de chargement par page (loading.js) cohérents.
//
// <Skeleton />                      → une ligne 100%
// <Skeleton w="40%" h={20} />       → barre custom
// <Skeleton circle h={44} />        → avatar rond
// <SkeletonCard lines={3} />        → carte izi-card avec n lignes

export function Skeleton({ w = '100%', h = 14, circle = false, radius, style }) {
  return (
    <span
      className="izi-skel"
      style={{
        width: circle ? h : w,
        height: h,
        borderRadius: circle ? '50%' : (radius ?? 8),
        ...style,
      }}
    >
      <style jsx>{`
        .izi-skel {
          display: block;
          flex-shrink: 0;
          background: linear-gradient(
            90deg,
            var(--cream-dark) 25%,
            #f3ede2 50%,
            var(--cream-dark) 75%
          );
          background-size: 200% 100%;
          animation: iziShimmer 1.4s ease-in-out infinite;
        }
        @keyframes iziShimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .izi-skel { animation: none; }
        }
      `}</style>
    </span>
  );
}

export function SkeletonCard({ lines = 3, avatar = false }) {
  return (
    <div className="izi-skel-card izi-card">
      {avatar && <Skeleton circle h={44} />}
      <div className="izi-skel-card-body">
        <Skeleton w="45%" h={16} />
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} w={i === lines - 1 ? '60%' : '100%'} />
        ))}
      </div>

      <style jsx>{`
        .izi-skel-card {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 18px;
        }
        .izi-skel-card-body {
          display: flex;
          flex-direction: column;
          gap: 10px;
          flex: 1;
          min-width: 0;
        }
      `}</style>
    </div>
  );
}

export default Skeleton;
