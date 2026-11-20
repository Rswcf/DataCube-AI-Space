import '@/lib/test-support/next-runtime-globals'
import type { IncomingHttpHeaders } from 'node:http'
import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { unstable_doesMiddlewareMatch as doesProxyMatch } from 'next/experimental/testing/server'
import { config, middleware } from '@/middleware'

// The matcher decides which requests pay for a middleware invocation. It is
// narrowed to the five branches of `middleware()` (prefetch 204, ?lang=
// redirect, three legacy redirects): every other request would only reach
// `NextResponse.next()`, which is billed and does nothing.
function runsFor(url: string, headers: IncomingHttpHeaders = {}): boolean {
  return doesProxyMatch({ config, nextConfig: {}, url, headers })
}

const PREFETCH = { 'next-router-prefetch': '1' }

describe('middleware matcher', () => {
  it.each([
    '/',
    '/en',
    '/de/week/2026-09-10',
    '/en/topic/openai',
    '/en/news/2026-09-10/tech-1',
    '/en/tools/ai-news-aggregator',
    '/about',
    '/funding',
    '/en/topic/openai?section=tech&page=2',
  ])('skips a plain page request %s', (url) => {
    expect(runsFor(url)).toBe(false)
  })

  it.each([
    '/?lang=de',
    '/en?lang=fr',
    '/week/2026-09-10?lang=zh',
    '/en/topic/openai?lang=ja',
    '/en/news/2026-09-10/tech-1?lang=ko',
    '/en/tools?lang=de',
    '/about?lang=de',
  ])('runs for a ?lang= request %s', (url) => {
    expect(runsFor(url)).toBe(true)
  })

  it.each(['/week/2026-09-10', '/topic/openai', '/news/2026-09-10/tech-1'])(
    'runs for the legacy path %s',
    (url) => {
      expect(runsFor(url)).toBe(true)
    }
  )

  it.each(['/', '/en', '/en/news/2026-09-10/tech-1', '/about'])(
    'runs for a router prefetch without RSC on %s',
    (url) => {
      expect(runsFor(url, PREFETCH)).toBe(true)
    }
  )

  it('skips a router prefetch that carries an RSC header', () => {
    expect(runsFor('/en', { ...PREFETCH, rsc: '1' })).toBe(false)
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
    '/api/content-summary?lang=de',
    '/robots.txt?lang=de',
  ])('skips %s', (url) => {
    expect(runsFor(url)).toBe(false)
    expect(runsFor(url, PREFETCH)).toBe(false)
  })
})

// Parity: whenever `middleware()` would do something other than pass the
// request through, the matcher must let it run. A narrower matcher may only
// drop requests that end in `NextResponse.next()`.
describe('middleware matcher covers every acting branch', () => {
  const SITE = 'https://www.datacubeai.space'
  const paths = [
    '/',
    '/en',
    '/de',
    '/week/2026-09-10',
    '/topic/openai',
    '/news/2026-09-10/tech-1',
    '/en/week/2026-09-10',
    '/en/topic/openai',
    '/en/news/2026-09-10/tech-1',
    '/en/tools',
    '/en/tools/ai-news-aggregator',
    '/about',
    '/funding',
  ]
  const queries = ['', '?lang=de', '?lang=en', '?lang=xx', '?page=2', '?lang=fr&page=2']
  const headerSets: IncomingHttpHeaders[] = [{}, PREFETCH, { ...PREFETCH, rsc: '1' }]

  const cases = paths.flatMap((p) =>
    queries.flatMap((q) => headerSets.map((h) => ({ url: `${p}${q}`, headers: h })))
  )

  it.each(cases)('$url $headers', ({ url, headers }) => {
    const request = new NextRequest(`${SITE}${url}`, {
      headers: Object.fromEntries(Object.entries(headers).map(([k, v]) => [k, String(v)])),
    })
    const response = middleware(request)
    const passesThrough = response.headers.get('x-middleware-next') === '1'
    if (!passesThrough) {
      expect(runsFor(url, headers)).toBe(true)
    }
  })
})
