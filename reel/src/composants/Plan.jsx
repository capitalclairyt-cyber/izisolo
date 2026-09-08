import { AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { Video } from '@remotion/media';

// Un plan vidéo plein cadre (le rush de Colin, préparé par scripts/preparer-videos.mjs)
// qui joue `dureeClip` images, puis se fige sur sa dernière image, avec un lent
// zoom continu. Le `voile` (0 → 1) assombrit l'image pour que le texte par-dessus
// reste lisible ; on le fait monter quand le titre arrive.
export const Plan = ({ nom, dureeClip, voile = 0, zoom = 0.08 }) => {
  const frame = useCurrentFrame();
  const scale = 1 + interpolate(frame, [0, 200], [0, zoom], { extrapolateRight: 'clamp' });
  const fondu = interpolate(frame, [dureeClip - 3, dureeClip + 3], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const style = { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' };
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: '#1a1512' }}>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${scale})`, transformOrigin: '50% 45%' }}>
        <Sequence from={0} durationInFrames={dureeClip + 4} layout="none">
          <Video src={staticFile(`${nom}.mp4`)} muted style={style} />
        </Sequence>
        <Img src={staticFile(`${nom}-fin.jpg`)} style={{ ...style, opacity: fondu }} />
      </div>
      <div style={{ position: 'absolute', inset: 0, opacity: voile,
        background: 'linear-gradient(180deg, rgba(26,21,18,0.42) 0%, rgba(26,21,18,0.5) 60%, rgba(26,21,18,0.62) 100%)' }} />
    </AbsoluteFill>
  );
};
