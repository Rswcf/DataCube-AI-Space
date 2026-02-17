import { Composition } from 'remotion';
import { DataCubePromo } from './DataCubePromo';
import { VIDEO } from './theme';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="DataCubePromo"
      component={DataCubePromo}
      durationInFrames={VIDEO.fps * VIDEO.durationInSeconds}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
    />
  );
};
