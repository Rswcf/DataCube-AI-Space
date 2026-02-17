import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { COLORS, FONTS } from '../theme';
import { LogoCube } from '../components/LogoCube';

const SECTION_DOTS = [
  COLORS.tech,
  COLORS.invest,
  COLORS.tips,
  COLORS.video,
] as const;

const TOTAL_FRAMES = 150;
const FADE_OUT_START = TOTAL_FRAMES - 30; // frame 120

export const EndCardScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Global fade-out in last 30 frames
  const globalOpacity = interpolate(frame, [FADE_OUT_START, TOTAL_FRAMES], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Emoji spring scale entrance
  const emojiProgress = spring({
    frame,
    fps,
    config: { damping: 10, stiffness: 80 },
  });

  const emojiScale = interpolate(emojiProgress, [0, 1], [0, 1]);

  // "Data Cube AI" text fade in
  const titleOpacity = interpolate(frame, [10, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const titleTranslateY = interpolate(frame, [10, 30], [20, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // URL fade in after 15 frames
  const urlOpacity = interpolate(frame, [15, 35], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const urlTranslateY = interpolate(frame, [15, 35], [15, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Gradient line draws from center (width 0 to 120px)
  const lineProgress = spring({
    frame,
    fps,
    delay: 20,
    config: { damping: 14, stiffness: 60 },
  });

  const lineWidth = interpolate(lineProgress, [0, 1], [0, 120]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: globalOpacity,
      }}
    >
      {/* Content container */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0,
        }}
      >
        {/* Isometric cube logo */}
        <div
          style={{
            transform: `scale(${emojiScale})`,
          }}
        >
          <LogoCube size={100} />
        </div>

        {/* "Data Cube AI" text */}
        <div
          style={{
            opacity: titleOpacity,
            transform: `translateY(${titleTranslateY}px)`,
            fontSize: 48,
            fontFamily: FONTS.display,
            fontWeight: 400,
            color: COLORS.foreground,
            marginTop: 20,
          }}
        >
          Data Cube AI
        </div>

        {/* URL */}
        <div
          style={{
            opacity: urlOpacity,
            transform: `translateY(${urlTranslateY}px)`,
            fontSize: 24,
            fontFamily: FONTS.body,
            color: COLORS.primary,
            marginTop: 12,
          }}
        >
          datacubeai.space
        </div>

        {/* Gradient line */}
        <div
          style={{
            width: lineWidth,
            height: 2,
            marginTop: 24,
            background: `linear-gradient(to right, ${COLORS.primary}, ${COLORS.accent})`,
            borderRadius: 1,
          }}
        />

        {/* Section color dots */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: 16,
            marginTop: 28,
          }}
        >
          {SECTION_DOTS.map((color, i) => {
            const dotProgress = spring({
              frame,
              fps,
              delay: 45 + i * 8,
              config: { damping: 10, stiffness: 100 },
            });

            const dotScale = interpolate(dotProgress, [0, 1], [0, 1]);
            const dotOpacity = interpolate(dotProgress, [0, 1], [0, 1]);

            return (
              <div
                key={color}
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: color,
                  transform: `scale(${dotScale})`,
                  opacity: dotOpacity,
                }}
              />
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
