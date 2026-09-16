import '@/lib/test-support/next-runtime-globals'
import { describe, expect, it } from 'vitest'
import { unstable_doesMiddlewareMatch as doesProxyMatch } from 'next/experimental/testing/server'
import { config } from '@/middleware'

// The middleware matcher decides which requests pay for an Edge Middleware
// invocation. Static assets, route handlers and API routes never need the
// redirect/prefetch logic, so they must be excluded at the matcher level.
function runsFor(path: string): boolean {
  return doesProxyMatch({ config, nextConfig: {}, url: path })
}

describe('middleware matcher', () => {
  it.each([
    '/',
    '/en',
    '/de/week/2026-09-10',
    '/week/2026-09-10',
    '/topic/openai',
    '/en/topic/openai',
    '/news/2026-09-10/tech-1',
    '/en/news/2026-09-10/tech-1',
    '/en/tools/ai-news-aggregator',
    '/about',
    '/funding',
  ])('runs for page path %s', (path) => {
    expect(runsFor(path)).toBe(true)
  })

  it.each([
    '/og-image.jpg',
    '/icon.svg',
    '/icon-light-32x32.png',
    '/apple-icon.png',
    '/favicon.ico',
    '/robots.txt',
    '/llms.txt',
    '/sitemap.xml',
    '/feed.xml',
    '/news-sitemap.xml',
    '/newsletter.xml',
    '/_vercel/insights/view',
    '/_vercel/insights/script.js',
    '/_next/static/chunks/main.js',
    '/_next/image',
    '/api/chat',
    '/api/og',
    '/api/content-summary',
  ])('skips %s', (path) => {
    expect(runsFor(path)).toBe(false)
  })
})
