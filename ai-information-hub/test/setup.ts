import { vi } from 'vitest'

// Both root layouts (and components/root-shell.tsx) load next/font and analytics;
// those only work inside the Next.js compiler, not under plain Vitest/Node. Shared
// here (rather than duplicated per test file) because metadata.test.ts and
// pages.test.ts both need it — the home client component itself is separately
// mocked per file, since metadata.test.ts and pages.test.ts disclose different
// reasons and different exceptions for that one.
vi.mock('next/font/google', () => ({
  Geist: () => ({ variable: 'font-geist-sans' }),
  Geist_Mono: () => ({ variable: 'font-geist-mono' }),
  Newsreader: () => ({ variable: 'font-newsreader' }),
}))
vi.mock('@vercel/analytics/next', () => ({ Analytics: () => null }))
