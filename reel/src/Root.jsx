import { Composition } from 'remotion';
import { Reel, dureeReel } from './Reel';
import { Clip, dureeClip, LARGEUR_CLIP, hauteurClip } from './Clip';
import { SCENES } from './scenes';
import { Pov } from './Pov';
import { DUREE_POV, VARIANTES } from './pov-variantes';
import { FPS, H, W } from './theme';

// Trois familles : le réel complet (Instagram / Facebook), pour la landing un
// clip « écran seul » par scène (`Clip-<id>`, rendu par scripts/rendre-clips.mjs),
// et les réels « POV » en texte pur (`Pov-<id>`, rendus par scripts/rendre-pov.mjs).
export const RemotionRoot = () => (
  <>
    <Composition id="Reel" component={Reel} durationInFrames={dureeReel()} fps={FPS} width={W} height={H} />
    {VARIANTES.map((v) => (
      <Composition key={v.id} id={`Pov-${v.id}`} component={Pov} defaultProps={{ varianteId: v.id }}
        durationInFrames={DUREE_POV} fps={FPS} width={W} height={H} />
    ))}
    {SCENES.map((scene) => (
      <Composition key={scene.id} id={`Clip-${scene.id}`} component={Clip} defaultProps={{ sceneId: scene.id }}
        durationInFrames={dureeClip(scene)} fps={FPS} width={LARGEUR_CLIP} height={hauteurClip(scene.mockup.imgH)} />
    ))}
  </>
);
