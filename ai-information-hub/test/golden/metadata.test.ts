import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FIXED_NOW, LANGS, PERIOD_ID, STORY_ID, TOPIC, stubApiFetch } from '../fixtures/api'
import { expectGolden, stableJson } from './golden'

// next/font/google + @vercel/analytics/next are mocked globally in test/setup.ts
// (both root layouts load them through components/root-shell.tsx, and that only
// works inside the Next.js compiler). The home client component is not metadata.
vi.mock('@/components/home-page-client', () => ({ default: () => null }))

beforeEach(() => {
  vi.useFakeTimers({ now: FIXED_NOW, toFake: ['Date'] })
  stubApiFetch()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

function params<T>(value: T) {
  return { params: Promise.resolve(value) }
}

describe('metadata', () => {
  it('site metadata and static pages', async () => {
    // lib/site-metadata.ts holds the site-wide metadata; both root layouts export it as is.
    const { siteMetadata, siteViewport } = await import('@/lib/site-metadata')
    for (const layout of [await import('@/app/(site)/layout'), await import('@/app/(localized)/[lang]/layout')]) {
      expect(layout.metadata).toBe(siteMetadata)
      expect(layout.viewport).toBe(siteViewport)
    }
    const modules = {
      home: await import('@/app/(site)/page'),
      about: await import('@/app/(site)/about/page'),
      aiDisclosure: await import('@/app/(site)/ai-disclosure/page'),
      contact: await import('@/app/(site)/contact/page'),
      corrections: await import('@/app/(site)/corrections/page'),
      datenschutz: await import('@/app/(site)/datenschutz/page'),
      editorialPolicy: await import('@/app/(site)/editorial-policy/page'),
      forTeams: await import('@/app/(site)/for-teams/page'),
      funding: await import('@/app/(site)/funding/page'),
      impressum: await import('@/app/(site)/impressum/page'),
      login: await import('@/app/(site)/login/layout'),
      premium: await import('@/app/(site)/premium/page'),
      sourceMethodology: await import('@/app/(site)/source-methodology/page'),
      unsubscribe: await import('@/app/(site)/unsubscribe/page'),
    }
    const metadata = {
      siteMetadata,
      ...Object.fromEntries(Object.entries(modules).map(([name, mod]) => [name, mod.metadata])),
    }
    await expectGolden(stableJson(metadata), 'metadata-static.json')
  })

  it.each(LANGS)('localized pages in %s', async (lang) => {
    const home = await import('@/app/(localized)/[lang]/page')
    const week = await import('@/app/(localized)/[lang]/week/[weekId]/page')
    const topic = await import('@/app/(localized)/[lang]/topic/[topic]/page')
    const article = await import('@/app/(localized)/[lang]/news/[periodId]/[storyId]/page')
    const aggregator = await import('@/app/(localized)/[lang]/tools/ai-news-aggregator/page')
    const api = await import('@/app/(localized)/[lang]/tools/ai-news-api/page')
    const index = await import('@/app/(localized)/[lang]/tools/page')
    const report = await import('@/app/(localized)/[lang]/tools/ai-report-generator/page')
    const stock = await import('@/app/(localized)/[lang]/tools/ai-stock-tracker/page')
    const metadata = {
      home: await home.generateMetadata(params({ lang })),
      week: await week.generateMetadata(params({ lang, weekId: PERIOD_ID })),
      // Filtered by ?period= (isFilteredVariant): index:false, follow:false.
      topic: await topic.generateMetadata({ ...params({ lang, topic: TOPIC }), searchParams: Promise.resolve({ period: PERIOD_ID }) }),
      // Canonical, no searchParams: the indexable variant search engines actually see
      // at /{lang}/topic/{topic}. Filtered-only coverage never captured this case
      // (task-1-review.md §3), so a robots regression on the indexable path — like
      // the one main's PR #12 fixed — had no golden able to catch it.
      topicCanonical: await topic.generateMetadata({ ...params({ lang, topic: TOPIC }), searchParams: Promise.resolve({}) }),
      article: await article.generateMetadata(params({ lang, periodId: PERIOD_ID, storyId: STORY_ID })),
      articleNotFound: await article.generateMetadata(params({ lang, periodId: PERIOD_ID, storyId: 'tech-999' })),
      tools: {
        aggregator: await aggregator.generateMetadata(params({ lang })),
        api: await api.generateMetadata(params({ lang })),
        index: await index.generateMetadata(params({ lang })),
        report: await report.generateMetadata(params({ lang })),
        stock: await stock.generateMetadata(params({ lang })),
      },
    }
    await expectGolden(stableJson(metadata), `metadata-${lang}.json`)
  })
})
