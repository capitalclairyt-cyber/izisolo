import { Composition } from 'remotion';
import { Reel, dureeReel } from './Reel';
import { FPS, H, W } from './theme';

export const RemotionRoot = () => (
  <Composition id="Reel" component={Reel} durationInFrames={dureeReel()} fps={FPS} width={W} height={H} />
);
