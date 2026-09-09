import { Composition } from 'remotion';
import { Reel, dureeReel } from './Reel';
import { Clip, dureeClip, LARGEUR_CLIP, hauteurClip } from './Clip';
import { SCENES } from './scenes';
import { FPS, H, W } from './theme';

// Deux familles : le réel complet (Instagram / Facebook) et, pour la landing,
// un clip « écran seul » par scène (`Clip-<id>`), rendu par scripts/rendre-clips.mjs.
export const RemotionRoot = () => (
  <>
    <Composition id="Reel" component={Reel} durationInFrames={dureeReel()} fps={FPS} width={W} height={H} />
    {SCENES.map((scene) => (
      <Composition key={scene.id} id={`Clip-${scene.id}`} component={Clip} defaultProps={{ sceneId: scene.id }}
        durationInFrames={dureeClip(scene)} fps={FPS} width={LARGEUR_CLIP} height={hauteurClip(scene.mockup.imgH)} />
    ))}
  </>
);
