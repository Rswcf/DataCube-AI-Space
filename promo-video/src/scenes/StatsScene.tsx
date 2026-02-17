import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { COLORS, FONTS } from '../theme';
import { CountUp } from '../components/CountUp';

type Stat = {
  target: number;
  suffix: string;
  label: string;
  color: string;
  text?: string;
};

const STATS: Stat[] = [
  { target: 22, suffix: '+', label: 'RSS Sources', color: COLORS.tech },
  { target: 14, suffix: '', label: 'Reddit Communities', color: COLORS.tips },
  { target: 2, suffix: '', label: 'Languages: DE/EN', color: COLORS.accent },
  { target: 0, suffix: '', label: 'Automated Updates', color: COLORS.invest, text: 'Daily' },
];

export const StatsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Bottom tagline fades in after 60 frames
  const taglineOpacity = interpolate(frame, [60, 80], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const taglineTranslateY = interpolate(frame, [60, 80], [20, 0], {
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
      {/* Subtle gradient wash */}
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          background: `radial-gradient(ellipse at 50% 40%, ${COLORS.primary}14 0%, transparent 60%)`,
        }}
      />

      {/* Stats row */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: 60,
          zIndex: 1,
        }}
      >
        {STATS.map((stat, i) => {
          const cardDelay = i * 15;
          const cardProgress = spring({
            frame,
            fps,
            delay: cardDelay,
            config: { damping: 14, stiffness: 80 },
          });

          const cardOpacity = interpolate(cardProgress, [0, 1], [0, 1]);
          const cardScale = interpolate(cardProgress, [0, 1], [0.8, 1]);

          return (
            <div
              key={stat.label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
                opacity: cardOpacity,
                transform: `scale(${cardScale})`,
                backgroundColor: COLORS.card,
                borderRadius: 16,
                padding: '40px 48px',
                borderTop: `3px solid ${stat.color}`,
              }}
            >
              {/* Large number */}
              <div
                style={{
                  fontSize: 72,
                  fontWeight: 700,
                  fontFamily: FONTS.body,
                  color: stat.color,
                  lineHeight: 1,
                }}
              >
                {stat.text ? (
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {stat.text}
                  </span>
                ) : (
                  <CountUp
                    target={stat.target}
                    delay={cardDelay}
                    suffix={stat.suffix}
                  />
                )}
              </div>

              {/* Label */}
              <div
                style={{
                  fontSize: 18,
                  fontFamily: FONTS.body,
                  color: COLORS.muted,
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                }}
              >
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom tagline */}
      <div
        style={{
          position: 'absolute',
          bottom: 80,
          opacity: taglineOpacity,
          transform: `translateY(${taglineTranslateY}px)`,
          fontSize: 20,
          fontFamily: FONTS.body,
          color: COLORS.muted,
          letterSpacing: 2,
          textTransform: 'uppercase',
        }}
      >
        WCAG Accessible · SEO Optimized · No Login Required
      </div>
    </AbsoluteFill>
  );
};
