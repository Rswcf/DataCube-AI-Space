import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { COLORS, FONTS } from '../theme';
import { FadeIn } from '../components/FadeIn';

const NEWS_SOURCES = [
  { name: 'MIT Tech Review', color: '#dc2626' },
  { name: 'Crunchbase', color: '#2563eb' },
  { name: 'TechCrunch', color: '#059669' },
  { name: 'Financial Times', color: '#d97706' },
  { name: 'Reddit', color: '#ea580c' },
  { name: 'Hacker News', color: '#ea580c' },
  { name: 'YouTube', color: '#dc2626' },
  { name: 'Wired', color: '#71717a' },
  { name: 'Ars Technica', color: '#2563eb' },
  { name: 'The Verge', color: '#059669' },
  { name: 'VentureBeat', color: '#6b21a8' },
  { name: 'Reuters', color: '#d97706' },
  { name: 'Bloomberg', color: '#2563eb' },
  { name: 'The Information', color: '#71717a' },
  { name: 'IEEE Spectrum', color: '#059669' },
  { name: 'ArXiv', color: '#dc2626' },
  { name: 'Nature', color: '#2563eb' },
  { name: 'CNBC', color: '#d97706' },
  { name: 'Axios', color: '#059669' },
  { name: 'Semafor', color: '#ea580c' },
];

// Deterministic pseudo-random based on index for consistent renders
const seededRandom = (seed: number): number => {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};

// Pre-computed card positions in a scattered grid layout
const CARD_LAYOUTS = NEWS_SOURCES.map((_, i) => {
  const cols = 5;
  const row = Math.floor(i / cols);
  const col = i % cols;

  const baseX = 180 + col * 320;
  const baseY = 160 + row * 200;

  // Add scatter offset
  const offsetX = (seededRandom(i * 7) - 0.5) * 80;
  const offsetY = (seededRandom(i * 13) - 0.5) * 60;

  // Random rotation between -3 and 3 degrees
  const rotation = (seededRandom(i * 31) - 0.5) * 6;

  return {
    x: baseX + offsetX,
    y: baseY + offsetY,
    rotation,
  };
});

export const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // At frame 180, cards start to blur and fade
  const fadeOutProgress = interpolate(
    frame,
    [180, 240],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  const cardsOpacity = interpolate(fadeOutProgress, [0, 1], [1, 0.3]);

  // Blur increases as cards fade
  const blurAmount = interpolate(fadeOutProgress, [0, 1], [0, 8]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.background,
      }}
    >
      {/* Cards container */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: cardsOpacity,
          filter: `blur(${blurAmount}px)`,
        }}
      >
        {NEWS_SOURCES.map((source, i) => {
          const layout = CARD_LAYOUTS[i];

          // Staggered spring entrance — 5 frame delay between each card
          const cardProgress = spring({
            frame,
            fps,
            delay: i * 5,
            config: { damping: 12, stiffness: 100 },
          });

          const cardScale = interpolate(cardProgress, [0, 1], [0, 1]);
          const cardOpacity = interpolate(cardProgress, [0, 1], [0, 1]);

          return (
            <div
              key={source.name}
              style={{
                position: 'absolute',
                left: layout.x,
                top: layout.y,
                transform: `rotate(${layout.rotation}deg) scale(${cardScale})`,
                opacity: cardOpacity,
                width: 260,
                padding: '14px 18px',
                backgroundColor: COLORS.card,
                borderRadius: 10,
                borderLeft: `3px solid ${source.color}`,
                boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              {/* Color dot */}
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: source.color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: FONTS.body,
                  fontSize: 16,
                  color: COLORS.foreground,
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                }}
              >
                {source.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Text overlay — appears after cards fade */}
      {frame >= 180 && (
        <AbsoluteFill
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1,
          }}
        >
          <FadeIn delay={0} direction="up" distance={40} damping={14}>
            <div
              style={{
                fontFamily: FONTS.display,
                fontSize: 72,
                fontWeight: 700,
                color: COLORS.foreground,
                textAlign: 'center',
                textShadow: '0 4px 40px rgba(0,0,0,0.8)',
              }}
            >
              Information overload is real.
            </div>
          </FadeIn>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
