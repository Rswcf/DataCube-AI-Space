import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { COLORS, FONTS } from '../theme';
import { FadeIn } from '../components/FadeIn';

const TECH_CARDS = [
  { title: 'GPT-5 Achieves PhD-Level Reasoning', source: 'TechCrunch', impact: 'critical' as const },
  { title: 'DeepSeek Opens V4 Model Weights', source: 'The Verge', impact: 'high' as const },
  { title: 'NVIDIA Ships Blackwell Ultra B300', source: 'Ars Technica', impact: 'medium' as const },
  { title: 'EU AI Act Enforcement Begins', source: 'Reuters', impact: 'medium' as const },
];

const IMPACT_COLORS: Record<string, string> = {
  critical: COLORS.critical,
  high: COLORS.high,
  medium: COLORS.medium,
  low: COLORS.low,
};

const IMPACT_LABELS: Record<string, string> = {
  critical: 'CRITICAL',
  high: 'HIGH',
  medium: 'MEDIUM',
  low: 'LOW',
};

export const TechFeedScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Header animation
  const headerProgress = spring({ frame, fps, config: { damping: 14, stiffness: 80 } });
  const headerOpacity = interpolate(headerProgress, [0, 1], [0, 1]);
  const headerTranslateX = interpolate(headerProgress, [0, 1], [-40, 0]);

  // Language toggle
  const langProgress = spring({ frame, fps, delay: 15, config: { damping: 14 } });
  const langOpacity = interpolate(langProgress, [0, 1], [0, 1]);

  // Video card animation
  const videoProgress = spring({ frame, fps, delay: 50, config: { damping: 12, stiffness: 60 } });
  const videoOpacity = interpolate(videoProgress, [0, 1], [0, 1]);
  const videoTranslateX = interpolate(videoProgress, [0, 1], [60, 0]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.background,
        padding: 80,
      }}
    >
      {/* Subtle blue gradient at top-left */}
      <div
        style={{
          position: 'absolute',
          top: -200,
          left: -200,
          width: 900,
          height: 900,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${COLORS.tech}0D 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      {/* DE | EN language toggle — top right */}
      <div
        style={{
          position: 'absolute',
          top: 40,
          right: 60,
          opacity: langOpacity,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontFamily: FONTS.body,
          fontSize: 16,
          fontWeight: 600,
          zIndex: 2,
        }}
      >
        <span
          style={{
            color: COLORS.primary,
            backgroundColor: `${COLORS.primary}1A`,
            padding: '4px 10px',
            borderRadius: 6,
          }}
        >
          DE
        </span>
        <span style={{ color: COLORS.muted }}>|</span>
        <span style={{ color: COLORS.muted, padding: '4px 10px' }}>EN</span>
      </div>

      {/* Section header */}
      <div
        style={{
          opacity: headerOpacity,
          transform: `translateX(${headerTranslateX}px)`,
          display: 'flex',
          alignItems: 'center',
          marginBottom: 48,
        }}
      >
        <div
          style={{
            width: 4,
            height: 48,
            backgroundColor: COLORS.tech,
            borderRadius: 2,
            marginRight: 20,
          }}
        />
        <span
          style={{
            fontFamily: FONTS.display,
            fontSize: 52,
            color: COLORS.foreground,
            lineHeight: 1.2,
          }}
        >
          Tech Feed
        </span>
      </div>

      {/* Content area: cards left, video right */}
      <div
        style={{
          display: 'flex',
          gap: 48,
          flex: 1,
        }}
      >
        {/* Left: Tech article cards */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            width: 620,
          }}
        >
          {TECH_CARDS.map((card, i) => (
            <FadeIn key={card.title} delay={15 + i * 10} direction="up" distance={24} damping={14}>
              <div
                style={{
                  backgroundColor: COLORS.card,
                  borderRadius: 12,
                  borderLeft: `3px solid ${IMPACT_COLORS[card.impact]}`,
                  padding: '20px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    fontFamily: FONTS.body,
                    fontSize: 22,
                    fontWeight: 600,
                    color: COLORS.foreground,
                    lineHeight: 1.3,
                  }}
                >
                  {card.title}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      fontFamily: FONTS.body,
                      fontSize: 13,
                      color: COLORS.muted,
                      backgroundColor: COLORS.subtle,
                      padding: '3px 10px',
                      borderRadius: 6,
                    }}
                  >
                    {card.source}
                  </span>
                  <span
                    style={{
                      fontFamily: FONTS.mono,
                      fontSize: 11,
                      fontWeight: 700,
                      color: IMPACT_COLORS[card.impact],
                      backgroundColor: `${IMPACT_COLORS[card.impact]}1A`,
                      padding: '3px 10px',
                      borderRadius: 6,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    {IMPACT_LABELS[card.impact]}
                  </span>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>

        {/* Right: Embedded video card */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            opacity: videoOpacity,
            transform: `translateX(${videoTranslateX}px)`,
          }}
        >
          <div
            style={{
              backgroundColor: COLORS.card,
              borderRadius: 16,
              overflow: 'hidden',
              border: `1px solid ${COLORS.subtle}`,
            }}
          >
            {/* Video thumbnail area */}
            <div
              style={{
                width: '100%',
                aspectRatio: '16 / 9',
                background: `linear-gradient(135deg, ${COLORS.subtle} 0%, ${COLORS.card} 100%)`,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative',
              }}
            >
              {/* Play button triangle */}
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    width: 0,
                    height: 0,
                    borderLeft: '24px solid white',
                    borderTop: '14px solid transparent',
                    borderBottom: '14px solid transparent',
                    marginLeft: 6,
                  }}
                />
              </div>

              {/* YouTube label top-right */}
              <div
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  backgroundColor: COLORS.video,
                  color: '#fff',
                  fontFamily: FONTS.body,
                  fontSize: 13,
                  fontWeight: 700,
                  padding: '4px 12px',
                  borderRadius: 6,
                }}
              >
                YouTube
              </div>
            </div>

            {/* Video info */}
            <div style={{ padding: '18px 20px' }}>
              <div
                style={{
                  fontFamily: FONTS.body,
                  fontSize: 18,
                  fontWeight: 600,
                  color: COLORS.foreground,
                  lineHeight: 1.4,
                  marginBottom: 8,
                }}
              >
                AI Explained: What GPT-5 Means for Developers
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  fontFamily: FONTS.body,
                  fontSize: 13,
                  color: COLORS.muted,
                }}
              >
                <span>124K views</span>
                <span>12:34</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
