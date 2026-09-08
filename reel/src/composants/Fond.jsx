import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { P } from '../theme';

// Le fond sable de la landing, avec deux halos (cuivre, sauge) qui dérivent
// lentement pour que l'image respire même quand rien ne bouge.
export const Fond = ({ children }) => {
  const frame = useCurrentFrame();
  const d1 = interpolate(frame, [0, 600], [0, 120]);
  const d2 = interpolate(frame, [0, 600], [0, -90]);
  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${P.bgFrom} 0%, ${P.bgTo} 100%)` }}>
      <div style={{ position: 'absolute', left: -200 + d1, top: -160, width: 720, height: 720, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(185,121,77,0.16) 0%, rgba(185,121,77,0) 70%)' }} />
      <div style={{ position: 'absolute', right: -260 + d2, bottom: -120, width: 820, height: 820, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(111,143,94,0.14) 0%, rgba(111,143,94,0) 70%)' }} />
      {children}
    </AbsoluteFill>
  );
};
