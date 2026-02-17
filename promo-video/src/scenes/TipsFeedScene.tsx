import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { COLORS, FONTS } from '../theme';
import { FadeIn } from '../components/FadeIn';

const TIPS = [
  {
    title: 'Use Claude\'s system prompt for consistent outputs',
    source: 'r/ClaudeAI',
    difficulty: 'Beginner' as const,
  },
  {
    title: 'Fine-tune LoRA adapters on consumer GPUs',
    source: 'r/LocalLLaMA',
    difficulty: 'Advanced' as const,
  },
  {
    title: 'Build AI agents with structured tool calling',
    source: 'r/LangChain',
    difficulty: 'Intermediate' as const,
  },
];

const DIFFICULTY_COLORS: Record<string, string> = {
  Beginner: '#22c55e',
  Intermediate: '#eab308',
  Advanced: '#ef4444',
};

export const TipsFeedScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Header animation
  const headerProgress = spring({ frame, fps, config: { damping: 14, stiffness: 80 } });
  const headerOpacity = interpolate(headerProgress, [0, 1], [0, 1]);
  const headerTranslateX = interpolate(headerProgress, [0, 1], [-40, 0]);

  // Footer text animation
  const footerProgress = spring({ frame, fps, delay: 70, config: { damping: 14 } });
  const footerOpacity = interpolate(footerProgress, [0, 1], [0, 1]);
  const footerTranslateY = interpolate(footerProgress, [0, 1], [20, 0]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.background,
        padding: 80,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Subtle emerald gradient at top-left */}
      <div
        style={{
          position: 'absolute',
          top: -200,
          left: -200,
          width: 900,
          height: 900,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${COLORS.tips}0D 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

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
            backgroundColor: COLORS.tips,
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
          Practical Tips
        </span>
      </div>

      {/* Tip cards */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          flex: 1,
          maxWidth: 900,
        }}
      >
        {TIPS.map((tip, i) => (
          <FadeIn key={tip.title} delay={15 + i * 15} direction="up" distance={30} damping={14}>
            <div
              style={{
                backgroundColor: COLORS.card,
                borderRadius: 14,
                padding: '28px 32px',
                border: `1px solid ${COLORS.subtle}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              {/* Top row: difficulty badge + source */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span
                  style={{
                    fontFamily: FONTS.mono,
                    fontSize: 12,
                    fontWeight: 700,
                    color: DIFFICULTY_COLORS[tip.difficulty],
                    backgroundColor: `${DIFFICULTY_COLORS[tip.difficulty]}1A`,
                    padding: '4px 12px',
                    borderRadius: 6,
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
                  }}
                >
                  {tip.difficulty}
                </span>
                <span
                  style={{
                    fontFamily: FONTS.body,
                    fontSize: 13,
                    color: COLORS.muted,
                    backgroundColor: COLORS.subtle,
                    padding: '4px 10px',
                    borderRadius: 6,
                  }}
                >
                  {tip.source}
                </span>
              </div>

              {/* Title */}
              <div
                style={{
                  fontFamily: FONTS.body,
                  fontSize: 24,
                  fontWeight: 600,
                  color: COLORS.foreground,
                  lineHeight: 1.4,
                }}
              >
                {tip.title}
              </div>

              {/* Decorative bottom bar */}
              <div
                style={{
                  width: 48,
                  height: 3,
                  backgroundColor: COLORS.tips,
                  borderRadius: 2,
                  opacity: 0.5,
                }}
              />
            </div>
          </FadeIn>
        ))}
      </div>

      {/* Footer: curation source */}
      <div
        style={{
          opacity: footerOpacity,
          transform: `translateY(${footerTranslateY}px)`,
          fontFamily: FONTS.body,
          fontSize: 17,
          color: COLORS.muted,
          marginTop: 32,
        }}
      >
        Curated from 14 Reddit communities + expert blogs
      </div>
    </AbsoluteFill>
  );
};
