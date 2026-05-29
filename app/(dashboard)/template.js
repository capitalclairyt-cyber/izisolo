'use client';

// template.js (≠ layout.js) : Next remonte ce wrapper à CHAQUE navigation,
// ce qui relance l'animation CSS de montage → transition douce entre pages.
// Respecte prefers-reduced-motion (animation neutralisée plus bas).
export default function DashboardTemplate({ children }) {
  return <div className="dash-page-enter">{children}</div>;
}
