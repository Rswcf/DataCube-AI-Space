import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { COLORS, FONTS } from '../theme';
import { LogoCube } from '../components/LogoCube';

export const BrandRevealScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Cube emoji: scales from 0 to 1 with bouncy spring (damping: 8)
  const cubeProgress = spring({
    frame,
    fps,
    config: { damping: 8, stiffness: 100 },
  });

  const cubeScale = interpolate(cubeProgress, [0, 1], [0, 1]);

  // "Data Cube AI" text: appears after 15 frames
  const titleProgress = spring({
    frame,
    fps,
    delay: 15,
    config: { damping: 14, stiffness: 80 },
  });

  const titleOpacity = interpolate(titleProgress, [0, 1], [0, 1]);
  const titleTranslateY = interpolate(titleProgress, [0, 1], [40, 0]);

  // Tagline: appears after 40 frames
  const taglineProgress = spring({
    frame,
    fps,
    delay: 40,
    config: { damping: 20, stiffness: 60 },
  });

  const taglineOpacity = interpolate(taglineProgress, [0, 1], [0, 1]);

  // Gradient line: draws from center outward after 60 frames
  const lineProgress = spring({
    frame,
    fps,
    delay: 60,
    config: { damping: 18, stiffness: 80 },
  });

  const lineWidth = interpolate(lineProgress, [0, 1], [0, 200]);
  const lineOpacity = interpolate(lineProgress, [0, 1], [0, 1]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* Subtle radial gradient glow (primary at 5% opacity) */}
      <div
        style={{
          position: 'absolute',
          width: 1000,
          height: 1000,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${COLORS.primary}0D 0%, transparent 70%)`,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />

      {/* Content container */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          zIndex: 1,
        }}
      >
        {/* Isometric cube logo */}
        <div
          style={{
            transform: `scale(${cubeScale})`,
            marginBottom: 8,
            position: 'relative',
          }}
        >
          {/* Tri-color glow */}
          <div
            style={{
              position: 'absolute',
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3B82F6, #14B8A6, #F59E0B)',
              opacity: 0.15,
              filter: 'blur(40px)',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          />
          <LogoCube size={160} />
        </div>

        {/* "Data Cube AI" title */}
        <div
          style={{
            opacity: titleOpacity,
            transform: `translateY(${titleTranslateY}px)`,
            fontFamily: FONTS.display,
            fontSize: 96,
            fontWeight: 700,
            color: COLORS.foreground,
            textAlign: 'center',
            lineHeight: 1.1,
          }}
        >
          Data Cube AI
        </div>

        {/* Gradient line (primary to accent) */}
        <div
          style={{
            width: lineWidth,
            height: 2,
            opacity: lineOpacity,
            background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.accent})`,
            borderRadius: 1,
            marginTop: 8,
            marginBottom: 8,
          }}
        />

        {/* Tagline */}
        <div
          style={{
            opacity: taglineOpacity,
            fontFamily: FONTS.body,
            fontSize: 24,
            color: COLORS.muted,
            textAlign: 'center',
            letterSpacing: 0.5,
          }}
        >
          Your daily AI news, curated by AI.
        </div>
      </div>
    </AbsoluteFill>
  );
};
