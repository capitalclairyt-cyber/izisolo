import { AbsoluteFill } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { DUREE_INTRO, DUREE_OUTRO, DUREE_TRANSITION } from './theme';
import { SCENES } from './scenes';
import { Fond } from './composants/Fond';
import { Intro } from './composants/Intro';
import { Scene } from './composants/Scene';
import { Outro } from './composants/Outro';

const transition = () => (
  <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: DUREE_TRANSITION })} />
);

// Le fond vit SOUS la série : les fondus n'enchaînent que le contenu, jamais le sable.
export const Reel = () => (
  <AbsoluteFill>
    <Fond />
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={DUREE_INTRO}><Intro /></TransitionSeries.Sequence>
      {SCENES.flatMap((scene) => [
        transition(),
        <TransitionSeries.Sequence key={scene.id} durationInFrames={scene.duree}><Scene scene={scene} /></TransitionSeries.Sequence>,
      ])}
      {transition()}
      <TransitionSeries.Sequence durationInFrames={DUREE_OUTRO}><Outro /></TransitionSeries.Sequence>
    </TransitionSeries>
  </AbsoluteFill>
);

export const dureeReel = () =>
  DUREE_INTRO + SCENES.reduce((t, s) => t + s.duree, 0) + DUREE_OUTRO - (SCENES.length + 1) * DUREE_TRANSITION;
