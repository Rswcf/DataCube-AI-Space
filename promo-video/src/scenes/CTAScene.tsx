import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { COLORS, FONTS } from '../theme';

export const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // URL spring entrance
  const urlProgress = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 60 },
  });

  const urlOpacity = interpolate(urlProgress, [0, 1], [0, 1]);
  const urlScale = interpolate(urlProgress, [0, 1], [0.7, 1]);

  // Tagline fades in after 20 frames
  const taglineOpacity = interpolate(frame, [20, 45], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const taglineTranslateY = interpolate(frame, [20, 45], [15, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Button spring entrance after 45 frames
  const buttonProgress = spring({
    frame,
    fps,
    delay: 45,
    config: { damping: 12, stiffness: 80 },
  });

  const buttonOpacity = interpolate(buttonProgress, [0, 1], [0, 1]);
  const buttonScale = interpolate(buttonProgress, [0, 1], [0.6, 1]);

  // Button subtle pulse: sine-like oscillation between 1.0 and 1.03
  // Only active once button has fully appeared
  const pulseActive = frame > 75;
  const pulseScale = pulseActive
    ? interpolate(
        (frame - 75) % 60,
        [0, 15, 30, 45, 60],
        [1.0, 1.03, 1.0, 1.03, 1.0],
        { extrapolateRight: 'clamp' }
      )
    : 1.0;

  const combinedButtonScale = buttonScale * pulseScale;

  // Open source badge fades in after 90 frames
  const badgeOpacity = interpolate(frame, [90, 115], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const badgeTranslateY = interpolate(frame, [90, 115], [10, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* Radial gradient glow */}
      <div
        style={{
          position: 'absolute',
          width: 1200,
          height: 1200,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${COLORS.primary}14 0%, transparent 65%)`,
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
          gap: 0,
          zIndex: 1,
        }}
      >
        {/* URL */}
        <div
          style={{
            opacity: urlOpacity,
            transform: `scale(${urlScale})`,
            fontSize: 64,
            fontFamily: FONTS.display,
            fontWeight: 400,
            color: COLORS.foreground,
            letterSpacing: -1,
          }}
        >
          datacubeai.space
        </div>

        {/* Tagline */}
        <div
          style={{
            opacity: taglineOpacity,
            transform: `translateY(${taglineTranslateY}px)`,
            fontSize: 28,
            fontFamily: FONTS.body,
            color: COLORS.muted,
            marginTop: 16,
          }}
        >
          Your daily AI news, curated by AI.
        </div>

        {/* Visit button */}
        <div
          style={{
            opacity: buttonOpacity,
            transform: `scale(${combinedButtonScale})`,
            marginTop: 48,
            backgroundColor: COLORS.primary,
            color: '#ffffff',
            fontSize: 22,
            fontFamily: FONTS.body,
            fontWeight: 600,
            padding: '18px 48px',
            borderRadius: 999,
            letterSpacing: 0.5,
          }}
        >
          Start Reading →
        </div>

        {/* Open source badge */}
        <div
          style={{
            opacity: badgeOpacity,
            transform: `translateY(${badgeTranslateY}px)`,
            marginTop: 32,
            fontSize: 16,
            fontFamily: FONTS.mono,
            color: COLORS.muted,
            padding: '8px 20px',
            border: `1px solid ${COLORS.subtle}`,
            borderRadius: 999,
          }}
        >
          Open Source · MIT License
        </div>
      </div>
    </AbsoluteFill>
  );
};
