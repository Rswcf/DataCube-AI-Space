import { afterEach, beforeEach, describe, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { FIXED_NOW, LANGS, PERIOD_ID, stubApiFetch } from '../fixtures/api'
import { expectGolden, stableJson } from './golden'

// The handlers ignore the request host; example.com keeps legacy brand strings out of the request.
const SITE = 'https://www.example.com'

beforeEach(() => {
  vi.useFakeTimers({ now: FIXED_NOW, toFake: ['Date'] })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('feed.xml', () => {
  it.each(LANGS)('%s', async (lang) => {
    stubApiFetch()
    const { GET } = await import('@/app/feed.xml/route')
    const res = await GET(new NextRequest(`${SITE}/feed.xml?lang=${lang}`))
    await expectGolden(await res.text(), `feed-${lang}.xml`)
  })
})

describe('newsletter.xml', () => {
  it.each(['de', 'en'])('%s', async (lang) => {
    stubApiFetch()
    const { GET } = await import('@/app/newsletter.xml/route')
    const res = await GET(new NextRequest(`${SITE}/newsletter.xml?lang=${lang}`))
    await expectGolden(await res.text(), `newsletter-${lang}.xml`)
  })
})

describe('content-summary', () => {
  it.each(LANGS)('%s for a given period', async (lang) => {
    stubApiFetch()
    const { GET } = await import('@/app/api/content-summary/route')
    const res = await GET(new NextRequest(`${SITE}/api/content-summary?lang=${lang}&periodId=${PERIOD_ID}`))
    await expectGolden(await res.text(), `content-summary-${lang}.md`)
  })

  it('latest period', async () => {
    stubApiFetch()
    const { GET } = await import('@/app/api/content-summary/route')
    const res = await GET(new NextRequest(`${SITE}/api/content-summary?lang=en`))
    await expectGolden(await res.text(), 'content-summary-latest-en.md')
  })

  it('no content', async () => {
    stubApiFetch({ '/weeks': { weeks: [] } })
    const { GET } = await import('@/app/api/content-summary/route')
    const res = await GET(new NextRequest(`${SITE}/api/content-summary?lang=en`))
    await expectGolden(await res.text(), 'content-summary-empty.md')
  })
})

describe('sitemaps', () => {
  it('news-sitemap.xml', async () => {
    stubApiFetch()
    const { GET } = await import('@/app/news-sitemap.xml/route')
    await expectGolden(await (await GET()).text(), 'news-sitemap.xml')
  })

  it('sitemap.xml entries', async () => {
    stubApiFetch()
    const { default: sitemap } = await import('@/app/sitemap')
    await expectGolden(stableJson(await sitemap()), 'sitemap.json')
  })
})
