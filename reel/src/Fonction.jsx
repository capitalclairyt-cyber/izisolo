import { AbsoluteFill } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { DUREE_TRANSITION } from './theme';
import { SCENES } from './scenes';
import { Fond } from './composants/Fond';
import { Scene } from './composants/Scene';
import { AppelStudio, DUREE_APPEL } from './composants/AppelStudio';

// « Une fonction, un réel » : une scène du réel principal, seule, suivie de
// la carte « Commente STUDIO ». Huit réels de dix secondes à partir des
// captures et des flèches qui existent déjà : à cette taille de compte, la
// cadence compte plus que le montage, et chaque réel répète le même geste.
export const Fonction = ({ sceneId }) => {
  const scene = SCENES.find((s) => s.id === sceneId);
  return (
    <AbsoluteFill>
      <Fond />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={scene.duree + 30}><Scene scene={scene} /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: DUREE_TRANSITION })} />
        <TransitionSeries.Sequence durationInFrames={DUREE_APPEL}><AppelStudio titre={['Tu veux voir', 'sur tes vrais cours ?']} /></TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

export const dureeFonction = (scene) => scene.duree + 30 + DUREE_APPEL - DUREE_TRANSITION;
