import { spring, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import type { CSSProperties, ReactNode } from 'react';

type FadeInProps = {
  children: ReactNode;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  distance?: number;
  style?: CSSProperties;
  damping?: number;
};

export const FadeIn: React.FC<FadeInProps> = ({
  children,
  delay = 0,
  direction = 'up',
  distance = 30,
  style,
  damping = 200,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame,
    fps,
    delay,
    config: { damping },
  });

  const opacity = interpolate(progress, [0, 1], [0, 1]);

  const translateMap = {
    up: { transform: `translateY(${interpolate(progress, [0, 1], [distance, 0])}px)` },
    down: { transform: `translateY(${interpolate(progress, [0, 1], [-distance, 0])}px)` },
    left: { transform: `translateX(${interpolate(progress, [0, 1], [distance, 0])}px)` },
    right: { transform: `translateX(${interpolate(progress, [0, 1], [-distance, 0])}px)` },
    none: {},
  };

  return (
    <div style={{ opacity, ...translateMap[direction], ...style }}>
      {children}
    </div>
  );
};
