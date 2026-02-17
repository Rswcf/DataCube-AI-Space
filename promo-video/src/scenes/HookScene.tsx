import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { COLORS, FONTS } from '../theme';

export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Line 1: "500+ AI articles published daily." — spring entrance from below
  const line1Progress = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 80 },
  });

  const line1Opacity = interpolate(line1Progress, [0, 1], [0, 1]);
  const line1TranslateY = interpolate(line1Progress, [0, 1], [60, 0]);

  // Line 2: "You read 3." — appears after 1s (30 frames) delay
  const line2Progress = spring({
    frame,
    fps,
    delay: 30,
    config: { damping: 14, stiffness: 80 },
  });

  const line2Opacity = interpolate(line2Progress, [0, 1], [0, 1]);
  const line2TranslateY = interpolate(line2Progress, [0, 1], [60, 0]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* Radial gradient glow behind text */}
      <div
        style={{
          position: 'absolute',
          width: 800,
          height: 800,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${COLORS.primary}1A 0%, transparent 70%)`,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />

      {/* Text container */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
          zIndex: 1,
        }}
      >
        {/* Line 1 */}
        <div
          style={{
            opacity: line1Opacity,
            transform: `translateY(${line1TranslateY}px)`,
            fontFamily: FONTS.display,
            fontSize: 64,
            fontWeight: 700,
            color: COLORS.foreground,
            textAlign: 'center',
            lineHeight: 1.2,
          }}
        >
          500+ AI articles published daily.
        </div>

        {/* Line 2 */}
        <div
          style={{
            opacity: line2Opacity,
            transform: `translateY(${line2TranslateY}px)`,
            fontFamily: FONTS.display,
            fontSize: 80,
            fontWeight: 700,
            color: COLORS.primary,
            textAlign: 'center',
            lineHeight: 1.2,
          }}
        >
          You read 3.
        </div>
      </div>
    </AbsoluteFill>
  );
};
