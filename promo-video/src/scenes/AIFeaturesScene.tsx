import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { COLORS, FONTS } from '../theme';
import { TypeWriter } from '../components/TypeWriter';

const EXPORT_FORMATS = ['DOCX', 'HTML', 'MD', 'TXT', 'JSON'];

// Streaming report content — section headings + paragraph lines
// Each item: type "heading" or "line", final width percentage, startFrame (relative to panel appear)
const REPORT_CONTENT: { type: 'heading' | 'line' | 'gap'; width: number; startFrame: number }[] = [
  // Section 1: "Weekly AI Summary"
  { type: 'heading', width: 55, startFrame: 10 },
  { type: 'gap', width: 0, startFrame: 14 },
  { type: 'line', width: 92, startFrame: 18 },
  { type: 'line', width: 78, startFrame: 26 },
  { type: 'line', width: 88, startFrame: 34 },
  { type: 'line', width: 62, startFrame: 42 },
  { type: 'line', width: 45, startFrame: 50 },
  // Section 2: "Key Developments"
  { type: 'gap', width: 0, startFrame: 62 },
  { type: 'heading', width: 48, startFrame: 68 },
  { type: 'gap', width: 0, startFrame: 72 },
  { type: 'line', width: 95, startFrame: 76 },
  { type: 'line', width: 82, startFrame: 84 },
  { type: 'line', width: 70, startFrame: 92 },
  { type: 'line', width: 88, startFrame: 100 },
  // Section 3: "Investment Highlights"
  { type: 'gap', width: 0, startFrame: 112 },
  { type: 'heading', width: 52, startFrame: 118 },
  { type: 'gap', width: 0, startFrame: 122 },
  { type: 'line', width: 90, startFrame: 126 },
  { type: 'line', width: 75, startFrame: 134 },
  { type: 'line', width: 55, startFrame: 142 },
];

export const AIFeaturesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Left panel (chat) entrance
  const chatPanelProgress = spring({ frame, fps, config: { damping: 14, stiffness: 80 } });
  const chatPanelOpacity = interpolate(chatPanelProgress, [0, 1], [0, 1]);
  const chatPanelTranslateX = interpolate(chatPanelProgress, [0, 1], [-50, 0]);

  // User message bubble
  const userBubbleProgress = spring({ frame, fps, delay: 15, config: { damping: 14 } });
  const userBubbleOpacity = interpolate(userBubbleProgress, [0, 1], [0, 1]);
  const userBubbleTranslateY = interpolate(userBubbleProgress, [0, 1], [20, 0]);

  // AI response container
  const aiResponseProgress = spring({ frame, fps, delay: 30, config: { damping: 14 } });
  const aiResponseOpacity = interpolate(aiResponseProgress, [0, 1], [0, 1]);

  // Divider line
  const dividerProgress = spring({ frame, fps, delay: 10, config: { damping: 14 } });
  const dividerScale = interpolate(dividerProgress, [0, 1], [0, 1]);

  // Right panel (report) entrance — appears after 90 frames
  const reportPanelProgress = spring({ frame, fps, delay: 90, config: { damping: 12, stiffness: 60 } });
  const reportPanelOpacity = interpolate(reportPanelProgress, [0, 1], [0, 1]);
  const reportPanelScale = interpolate(reportPanelProgress, [0, 1], [0.92, 1]);
  const reportPanelTranslateX = interpolate(reportPanelProgress, [0, 1], [50, 0]);

  // Streaming report: track which line is currently being "generated"
  const reportLocalFrame = Math.max(0, frame - 90); // frames since report panel appears
  const STREAM_SPEED = 8; // frames to grow each line from 0% to 100%

  // Find the last active line for cursor positioning
  const lastActiveLine = REPORT_CONTENT.reduce((acc, item, i) => {
    if (item.type !== 'gap' && reportLocalFrame >= item.startFrame) return i;
    return acc;
  }, -1);

  // Generation is "complete" when all lines are fully rendered
  const lastContent = REPORT_CONTENT[REPORT_CONTENT.length - 1];
  const generationDone = reportLocalFrame > lastContent.startFrame + STREAM_SPEED + 10;

  // Export buttons — appear after generation completes
  const exportDelay = 90 + lastContent.startFrame + STREAM_SPEED + 15;
  const exportProgress = spring({ frame, fps, delay: exportDelay, config: { damping: 14 } });
  const exportOpacity = interpolate(exportProgress, [0, 1], [0, 1]);
  const exportTranslateY = interpolate(exportProgress, [0, 1], [15, 0]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.background,
        padding: 60,
        display: 'flex',
        flexDirection: 'row',
        gap: 0,
      }}
    >
      {/* Subtle primary gradient at center */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 1000,
          height: 1000,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${COLORS.primary}08 0%, transparent 70%)`,
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }}
      />

      {/* ===== LEFT SIDE: AI Chat ===== */}
      <div
        style={{
          flex: 1,
          opacity: chatPanelOpacity,
          transform: `translateX(${chatPanelTranslateX}px)`,
          display: 'flex',
          flexDirection: 'column',
          paddingRight: 30,
        }}
      >
        {/* Chat card container */}
        <div
          style={{
            backgroundColor: COLORS.card,
            borderRadius: 16,
            border: `1px solid ${COLORS.subtle}`,
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Chat header */}
          <div
            style={{
              padding: '20px 28px',
              borderBottom: `1px solid ${COLORS.subtle}`,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            {/* Chat icon dot */}
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: COLORS.primary,
              }}
            />
            <span
              style={{
                fontFamily: FONTS.display,
                fontSize: 28,
                color: COLORS.foreground,
              }}
            >
              AI Chat Assistant
            </span>
          </div>

          {/* Chat body */}
          <div
            style={{
              flex: 1,
              padding: 28,
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}
          >
            {/* User message — right aligned */}
            <div
              style={{
                opacity: userBubbleOpacity,
                transform: `translateY(${userBubbleTranslateY}px)`,
                alignSelf: 'flex-end',
                maxWidth: '80%',
              }}
            >
              <div
                style={{
                  backgroundColor: COLORS.primary,
                  color: '#fff',
                  fontFamily: FONTS.body,
                  fontSize: 18,
                  padding: '14px 20px',
                  borderRadius: '16px 16px 4px 16px',
                  lineHeight: 1.5,
                }}
              >
                Summarize this week's top AI news
              </div>
              <div
                style={{
                  fontFamily: FONTS.body,
                  fontSize: 12,
                  color: COLORS.muted,
                  textAlign: 'right',
                  marginTop: 6,
                }}
              >
                You
              </div>
            </div>

            {/* AI response — left aligned, typewriter */}
            <div
              style={{
                opacity: aiResponseOpacity,
                alignSelf: 'flex-start',
                maxWidth: '85%',
              }}
            >
              <div
                style={{
                  backgroundColor: COLORS.subtle,
                  fontFamily: FONTS.body,
                  fontSize: 17,
                  color: COLORS.foreground,
                  padding: '14px 20px',
                  borderRadius: '16px 16px 16px 4px',
                  lineHeight: 1.6,
                }}
              >
                <TypeWriter
                  text="This week saw major breakthroughs in reasoning models, a $45M robotics funding round, and new open-source model releases from DeepSeek. The EU also began enforcing its landmark AI Act..."
                  startDelay={30}
                  charFrames={1}
                  cursorColor={COLORS.accent}
                />
              </div>
              <div
                style={{
                  fontFamily: FONTS.body,
                  fontSize: 12,
                  color: COLORS.muted,
                  marginTop: 6,
                }}
              >
                AI Assistant
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== CENTER DIVIDER ===== */}
      <div
        style={{
          width: 1,
          backgroundColor: COLORS.subtle,
          transform: `scaleY(${dividerScale})`,
          transformOrigin: 'top',
          marginTop: 40,
          marginBottom: 40,
        }}
      />

      {/* ===== RIGHT SIDE: AI Report ===== */}
      <div
        style={{
          flex: 1,
          opacity: reportPanelOpacity,
          transform: `translateX(${reportPanelTranslateX}px) scale(${reportPanelScale})`,
          display: 'flex',
          flexDirection: 'column',
          paddingLeft: 30,
        }}
      >
        {/* Report card container */}
        <div
          style={{
            backgroundColor: COLORS.card,
            borderRadius: 16,
            border: `1px solid ${COLORS.subtle}`,
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Report header */}
          <div
            style={{
              padding: '20px 28px',
              borderBottom: `1px solid ${COLORS.subtle}`,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            {/* Report icon */}
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                backgroundColor: COLORS.accent,
              }}
            />
            <span
              style={{
                fontFamily: FONTS.display,
                fontSize: 28,
                color: COLORS.foreground,
              }}
            >
              AI Weekly Report
            </span>
          </div>

          {/* Report body — streaming generation */}
          <div
            style={{
              flex: 1,
              padding: 28,
              display: 'flex',
              flexDirection: 'column',
              gap: 0,
              position: 'relative',
            }}
          >
            {/* "Generating..." indicator */}
            {!generationDone && reportLocalFrame > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: 10,
                  right: 28,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  opacity: interpolate(reportLocalFrame, [0, 10], [0, 1], {
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp',
                  }),
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: COLORS.accent,
                    opacity: interpolate(
                      reportLocalFrame % 20,
                      [0, 10, 20],
                      [1, 0.3, 1],
                      { extrapolateRight: 'clamp' }
                    ),
                  }}
                />
                <span
                  style={{
                    fontFamily: FONTS.mono,
                    fontSize: 11,
                    color: COLORS.accent,
                  }}
                >
                  Generating...
                </span>
              </div>
            )}

            {/* Streaming content lines */}
            {REPORT_CONTENT.map((item, i) => {
              if (item.type === 'gap') {
                return <div key={i} style={{ height: 10 }} />;
              }

              // Line hasn't started yet
              if (reportLocalFrame < item.startFrame) {
                return null;
              }

              const lineLocalFrame = reportLocalFrame - item.startFrame;
              // Width grows from 0% to final width over STREAM_SPEED frames
              const widthPct = interpolate(
                lineLocalFrame,
                [0, STREAM_SPEED],
                [0, item.width],
                { extrapolateRight: 'clamp' }
              );
              const lineOpacity = interpolate(lineLocalFrame, [0, 3], [0, 1], {
                extrapolateRight: 'clamp',
              });

              const isHeading = item.type === 'heading';
              const isCurrentLine = i === lastActiveLine && lineLocalFrame < STREAM_SPEED + 5;

              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: isHeading ? 4 : 8,
                    marginTop: isHeading ? 4 : 0,
                  }}
                >
                  {/* The growing bar */}
                  <div
                    style={{
                      width: `${widthPct}%`,
                      height: isHeading ? 14 : 10,
                      backgroundColor: isHeading ? COLORS.foreground : COLORS.muted,
                      borderRadius: isHeading ? 3 : 2,
                      opacity: isHeading
                        ? lineOpacity * 0.85
                        : lineOpacity * 0.4,
                    }}
                  />
                  {/* Streaming cursor — appears at the end of the currently active line */}
                  {isCurrentLine && !generationDone && (
                    <div
                      style={{
                        width: 2,
                        height: isHeading ? 16 : 12,
                        backgroundColor: COLORS.accent,
                        marginLeft: 2,
                        borderRadius: 1,
                        opacity: interpolate(
                          reportLocalFrame % 16,
                          [0, 8, 16],
                          [1, 0.2, 1],
                          { extrapolateRight: 'clamp' }
                        ),
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Export button row */}
          <div
            style={{
              padding: '16px 28px',
              borderTop: `1px solid ${COLORS.subtle}`,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              opacity: exportOpacity,
              transform: `translateY(${exportTranslateY}px)`,
            }}
          >
            <span
              style={{
                fontFamily: FONTS.body,
                fontSize: 13,
                color: COLORS.muted,
                marginRight: 4,
              }}
            >
              Export:
            </span>
            {EXPORT_FORMATS.map((fmt, i) => {
              const badgeProgress = spring({
                frame,
                fps,
                delay: 155 + i * 6,
                config: { damping: 14 },
              });
              const badgeOpacity = interpolate(badgeProgress, [0, 1], [0, 1]);
              const badgeScale = interpolate(badgeProgress, [0, 1], [0.8, 1]);

              return (
                <div
                  key={fmt}
                  style={{
                    opacity: badgeOpacity,
                    transform: `scale(${badgeScale})`,
                    fontFamily: FONTS.mono,
                    fontSize: 12,
                    fontWeight: 600,
                    color: COLORS.accent,
                    backgroundColor: `${COLORS.accent}1A`,
                    padding: '5px 12px',
                    borderRadius: 6,
                    letterSpacing: 0.5,
                  }}
                >
                  {fmt}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
