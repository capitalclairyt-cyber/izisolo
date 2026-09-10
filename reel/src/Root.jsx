import { Composition } from 'remotion';
import { Reel, dureeReel } from './Reel';
import { Clip, dureeClip, LARGEUR_CLIP, hauteurClip } from './Clip';
import { SCENES } from './scenes';
import { Pov } from './Pov';
import { DUREE_POV, VARIANTES } from './pov-variantes';
import { Split } from './Split';
import { ReponseDM } from './ReponseDM';
import { Rentree } from './Rentree';
import { Fonction, dureeFonction } from './Fonction';
import { SPLIT, REPONSE_DM, RENTREE } from './formats';
import { Migration, MigrationClip, DUREE_MIGRATION, DUREE_CLIP_MIGRATION } from './Migration';
import { FPS, H, W } from './theme';

// Trois familles : le réel complet (Instagram / Facebook), pour la landing un
// clip « écran seul » par scène (`Clip-<id>`, rendu par scripts/rendre-clips.mjs),
// les réels « POV » en texte pur (`Pov-<id>`, rendus par scripts/rendre-pov.mjs),
// et les formats « déclencheurs » du 10/09 (Split, ReponseDM, Rentree, Fonction-<scène>,
// rendus par scripts/rendre-formats.mjs).
export const RemotionRoot = () => (
  <>
    <Composition id="Reel" component={Reel} durationInFrames={dureeReel()} fps={FPS} width={W} height={H} />
    {VARIANTES.map((v) => (
      <Composition key={v.id} id={`Pov-${v.id}`} component={Pov} defaultProps={{ varianteId: v.id }}
        durationInFrames={DUREE_POV} fps={FPS} width={W} height={H} />
    ))}
    <Composition id="Split" component={Split} durationInFrames={SPLIT.duree} fps={FPS} width={W} height={H} />
    <Composition id="ReponseDM" component={ReponseDM} durationInFrames={REPONSE_DM.duree} fps={FPS} width={W} height={H} />
    <Composition id="Rentree" component={Rentree} durationInFrames={RENTREE.duree} fps={FPS} width={W} height={H} />
    <Composition id="Migration" component={Migration} durationInFrames={DUREE_MIGRATION} fps={FPS} width={W} height={H} />
    <Composition id="Clip-migration" component={MigrationClip} durationInFrames={DUREE_CLIP_MIGRATION} fps={FPS} width={LARGEUR_CLIP} height={hauteurClip(1558)} />
    {SCENES.map((scene) => (
      <Composition key={`f-${scene.id}`} id={`Fonction-${scene.id}`} component={Fonction} defaultProps={{ sceneId: scene.id }}
        durationInFrames={dureeFonction(scene)} fps={FPS} width={W} height={H} />
    ))}
    {SCENES.map((scene) => (
      <Composition key={scene.id} id={`Clip-${scene.id}`} component={Clip} defaultProps={{ sceneId: scene.id }}
        durationInFrames={dureeClip(scene)} fps={FPS} width={LARGEUR_CLIP} height={hauteurClip(scene.mockup.imgH)} />
    ))}
  </>
);
