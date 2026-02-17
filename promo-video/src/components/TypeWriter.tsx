import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import type { CSSProperties } from 'react';

type TypeWriterProps = {
  text: string;
  startDelay?: number;
  charFrames?: number;
  cursorBlink?: number;
  style?: CSSProperties;
  cursorColor?: string;
};

export const TypeWriter: React.FC<TypeWriterProps> = ({
  text,
  startDelay = 0,
  charFrames = 2,
  cursorBlink = 16,
  style,
  cursorColor = '#2563eb',
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - startDelay);

  const typedChars = Math.min(text.length, Math.floor(adjustedFrame / charFrames));
  const typedText = text.slice(0, typedChars);

  const cursorOpacity = interpolate(
    adjustedFrame % cursorBlink,
    [0, cursorBlink / 2, cursorBlink],
    [1, 0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <span style={style}>
      {typedText}
      <span style={{ opacity: cursorOpacity, color: cursorColor }}>|</span>
    </span>
  );
};
