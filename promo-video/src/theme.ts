// Data Cube AI Brand Theme
// All colors from the real website's globals.css (OKLCH → hex approximations for Remotion)

export const COLORS = {
  // Brand
  primary: '#2563eb',       // oklch(0.55 0.2 250) — blue
  accent: '#0d9488',        // oklch(0.5 0.18 165) — teal

  // Section accents
  tech: '#2563eb',          // blue
  invest: '#d97706',        // amber
  tips: '#059669',          // emerald
  video: '#ea580c',         // coral

  // Neutral
  background: '#0f1117',    // dark mode background
  card: '#1a1d27',          // dark card
  foreground: '#f0f0f5',    // near-white text
  muted: '#71717a',         // gray text
  subtle: '#27272a',        // subtle borders

  // Impact levels (for tech cards)
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#2563eb',
  low: '#6b7280',
} as const;

export const FONTS = {
  display: 'Newsreader',
  body: 'Geist',
  mono: 'Geist Mono',
} as const;

// Composition settings
export const VIDEO = {
  width: 1920,
  height: 1080,
  fps: 30,
  durationInSeconds: 84,
} as const;

export const VIDEO_DURATION_FRAMES = VIDEO.fps * VIDEO.durationInSeconds;
