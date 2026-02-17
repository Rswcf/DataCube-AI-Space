import { spring, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import type { CSSProperties } from 'react';

type CountUpProps = {
  target: number;
  delay?: number;
  suffix?: string;
  prefix?: string;
  style?: CSSProperties;
};

export const CountUp: React.FC<CountUpProps> = ({
  target,
  delay = 0,
  suffix = '',
  prefix = '',
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame,
    fps,
    delay,
    config: { damping: 200 },
  });

  const value = Math.round(interpolate(progress, [0, 1], [0, target]));

  return (
    <span style={{ fontVariantNumeric: 'tabular-nums', ...style }}>
      {prefix}{value}{suffix}
    </span>
  );
};
