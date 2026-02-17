import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { COLORS, FONTS } from '../theme';
import { FadeIn } from '../components/FadeIn';

const FUNDING_DEALS = [
  { round: 'Series B', amount: '$45M', company: 'AI Robotics Startup' },
  { round: 'Series A', amount: '$12M', company: 'LLM Infrastructure' },
];

const STOCKS = [
  { ticker: 'NVDA', price: '$890.42', change: '+2.3%', positive: true },
  { ticker: 'MSFT', price: '$425.18', change: '+0.8%', positive: true },
];

const MA_DEAL = { type: 'Acquisition', amount: '$2.1B', target: 'Major AI Lab' };

export const InvestmentScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Header animation
  const headerProgress = spring({ frame, fps, config: { damping: 14, stiffness: 80 } });
  const headerOpacity = interpolate(headerProgress, [0, 1], [0, 1]);
  const headerTranslateX = interpolate(headerProgress, [0, 1], [-40, 0]);

  // Sub-section label animations
  const primaryLabelProgress = spring({ frame, fps, delay: 12, config: { damping: 14 } });
  const primaryLabelOpacity = interpolate(primaryLabelProgress, [0, 1], [0, 1]);

  const secondaryLabelProgress = spring({ frame, fps, delay: 55, config: { damping: 14 } });
  const secondaryLabelOpacity = interpolate(secondaryLabelProgress, [0, 1], [0, 1]);

  const maLabelProgress = spring({ frame, fps, delay: 95, config: { damping: 14 } });
  const maLabelOpacity = interpolate(maLabelProgress, [0, 1], [0, 1]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.background,
        padding: 80,
      }}
    >
      {/* Subtle amber gradient at top-left */}
      <div
        style={{
          position: 'absolute',
          top: -200,
          left: -200,
          width: 900,
          height: 900,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${COLORS.invest}0D 0%, transparent 70%)`,
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
            backgroundColor: COLORS.invest,
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
          Investment Tracker
        </span>
      </div>

      {/* Three sub-sections side by side */}
      <div
        style={{
          display: 'flex',
          gap: 36,
          flex: 1,
        }}
      >
        {/* Primary Market */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              opacity: primaryLabelOpacity,
              fontFamily: FONTS.body,
              fontSize: 18,
              fontWeight: 700,
              color: COLORS.invest,
              textTransform: 'uppercase',
              letterSpacing: 1.2,
              marginBottom: 4,
            }}
          >
            Primary Market
          </div>
          {FUNDING_DEALS.map((deal, i) => (
            <FadeIn key={deal.company} delay={20 + i * 12} direction="up" distance={24} damping={14}>
              <div
                style={{
                  backgroundColor: COLORS.card,
                  borderRadius: 12,
                  padding: '22px 24px',
                  border: `1px solid ${COLORS.subtle}`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 10,
                  }}
                >
                  <span
                    style={{
                      fontFamily: FONTS.mono,
                      fontSize: 13,
                      fontWeight: 700,
                      color: COLORS.invest,
                      backgroundColor: `${COLORS.invest}1A`,
                      padding: '3px 10px',
                      borderRadius: 6,
                    }}
                  >
                    {deal.round}
                  </span>
                  <span
                    style={{
                      fontFamily: FONTS.mono,
                      fontSize: 24,
                      fontWeight: 700,
                      color: COLORS.foreground,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {deal.amount}
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: FONTS.body,
                    fontSize: 18,
                    color: COLORS.muted,
                    lineHeight: 1.4,
                  }}
                >
                  {deal.company}
                </div>
              </div>
            </FadeIn>
          ))}
        </div>

        {/* Secondary Market */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              opacity: secondaryLabelOpacity,
              fontFamily: FONTS.body,
              fontSize: 18,
              fontWeight: 700,
              color: COLORS.invest,
              textTransform: 'uppercase',
              letterSpacing: 1.2,
              marginBottom: 4,
            }}
          >
            Secondary Market
          </div>
          {STOCKS.map((stock, i) => (
            <FadeIn key={stock.ticker} delay={60 + i * 12} direction="up" distance={24} damping={14}>
              <div
                style={{
                  backgroundColor: COLORS.card,
                  borderRadius: 12,
                  padding: '22px 24px',
                  border: `1px solid ${COLORS.subtle}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span
                    style={{
                      fontFamily: FONTS.mono,
                      fontSize: 20,
                      fontWeight: 700,
                      color: COLORS.foreground,
                      letterSpacing: 1,
                    }}
                  >
                    {stock.ticker}
                  </span>
                  <span
                    style={{
                      fontFamily: FONTS.mono,
                      fontSize: 32,
                      fontWeight: 700,
                      color: COLORS.foreground,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {stock.price}
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: FONTS.mono,
                    fontSize: 22,
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                    color: stock.positive ? '#22c55e' : COLORS.critical,
                  }}
                >
                  {stock.positive ? '\u25B2' : '\u25BC'}{stock.change}
                </span>
              </div>
            </FadeIn>
          ))}
        </div>

        {/* M&A */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              opacity: maLabelOpacity,
              fontFamily: FONTS.body,
              fontSize: 18,
              fontWeight: 700,
              color: COLORS.invest,
              textTransform: 'uppercase',
              letterSpacing: 1.2,
              marginBottom: 4,
            }}
          >
            M&A
          </div>
          <FadeIn delay={105} direction="up" distance={24} damping={14}>
            <div
              style={{
                backgroundColor: COLORS.card,
                borderRadius: 12,
                padding: '28px 24px',
                border: `1px solid ${COLORS.subtle}`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 14,
                }}
              >
                <span
                  style={{
                    fontFamily: FONTS.mono,
                    fontSize: 13,
                    fontWeight: 700,
                    color: COLORS.video,
                    backgroundColor: `${COLORS.video}1A`,
                    padding: '3px 10px',
                    borderRadius: 6,
                  }}
                >
                  {MA_DEAL.type}
                </span>
              </div>
              <div
                style={{
                  fontFamily: FONTS.mono,
                  fontSize: 40,
                  fontWeight: 700,
                  color: COLORS.foreground,
                  fontVariantNumeric: 'tabular-nums',
                  marginBottom: 10,
                }}
              >
                {MA_DEAL.amount}
              </div>
              <div
                style={{
                  fontFamily: FONTS.body,
                  fontSize: 18,
                  color: COLORS.muted,
                  lineHeight: 1.4,
                }}
              >
                {MA_DEAL.target}
              </div>

              {/* Decorative merge icon */}
              <div
                style={{
                  marginTop: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 2,
                    backgroundColor: COLORS.invest,
                    borderRadius: 1,
                  }}
                />
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: COLORS.invest,
                  }}
                />
                <div
                  style={{
                    width: 32,
                    height: 2,
                    backgroundColor: COLORS.invest,
                    borderRadius: 1,
                  }}
                />
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </AbsoluteFill>
  );
};
