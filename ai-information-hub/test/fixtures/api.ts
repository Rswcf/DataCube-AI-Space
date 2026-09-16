// Deterministic backend responses for golden and label tests. Synthetic data only: this repository is public.
import { vi } from 'vitest'

export const LANGS = ['de', 'en', 'zh', 'fr', 'es', 'pt', 'ja', 'ko'] as const
export const FIXED_NOW = new Date('2026-09-14T08:00:00.000Z')
export const PERIOD_ID = '2026-09-13'
export const WEEK_ID = '2026-kw37'
export const STORY_ID = 'tech-101'
export const TOPIC = 'openai'

const author = { name: 'Example News', handle: '', avatar: 'EN', verified: false }
const metrics = { comments: 0, retweets: 0, likes: 0, views: '0' }

function perLanguage<T>(build: (lang: string) => T[]): Record<string, T[]> {
  return Object.fromEntries(LANGS.map((lang) => [lang, build(lang)]))
}

export function techFixture() {
  return perLanguage((lang) => [
    {
      id: 101, author, metrics, tags: ['OpenAI', 'LLM'], category: 'LLM', iconType: 'Brain', impact: 'high',
      content: `OpenAI ships a new reasoning model for developers: the release adds tool use and a lower price (${lang}).`,
      timestamp: '2026-09-13T09:00:00.000Z', source: 'Example News', sourceUrl: 'https://example.com/openai-model',
    },
    {
      id: 102, author, metrics, tags: ['Chips'], category: 'Infrastructure', iconType: 'Server', impact: 'medium',
      content: `Chip startup expands inference capacity in Europe with a new data center (${lang}).`,
      timestamp: '2026-09-13T11:30:00.000Z', source: 'Example Wire', sourceUrl: 'https://example.com/chips',
    },
    {
      id: 103, author, metrics, tags: ['Agents'], category: 'Video', iconType: 'Zap', impact: 'low',
      content: `Video: how agents plan multi-step tasks (${lang}).`,
      timestamp: '2026-09-13T12:00:00.000Z', source: 'Example Channel', isVideo: true, videoId: 'abc123XYZ00',
    },
  ])
}

export function investmentFixture() {
  return {
    primaryMarket: perLanguage((lang) => [{
      id: 201, author, metrics, content: `Example AI raises a Series B round (${lang}).`, company: 'Example AI',
      amount: '$50M', round: 'Series B', roundCategory: 'Series B', investors: ['Example Ventures'], valuation: '$400M',
      timestamp: '2026-09-13T10:00:00.000Z', sourceUrl: 'https://example.com/series-b',
    }]),
    secondaryMarket: perLanguage((lang) => [{
      id: 301, author, metrics, content: `Chip stocks rise after earnings (${lang}).`, ticker: 'NVDA', price: 'N/A',
      change: '+2.1%', direction: 'up', timestamp: '2026-09-13T15:00:00.000Z',
    }]),
    ma: perLanguage((lang) => [{
      id: 401, author, metrics, content: `Big Cloud acquires Example Labs (${lang}).`, acquirer: 'Big Cloud',
      target: 'Example Labs', dealValue: '$1.2B', dealType: 'Acquisition', industry: 'Cloud',
      timestamp: '2026-09-13T13:00:00.000Z', sourceUrl: 'https://example.com/ma',
    }]),
  }
}

export function tipsFixture() {
  return perLanguage((lang) => [{
    id: 501, author, metrics, platform: 'Reddit', category: 'Prompting', difficulty: 'Intermediate',
    content: `Use structured outputs to validate agent replies (${lang}).`,
    tip: 'Ask for JSON and validate it against a schema before acting.',
    timestamp: '2026-09-13T08:00:00.000Z', sourceUrl: 'https://example.com/tip',
  }])
}

export function trendsFixture() {
  return {
    trends: perLanguage(() => [{ category: 'AI · Trending', title: 'OpenAI', posts: 2 }]),
    editorial: perLanguage((lang) => [{ text: `Two stories point to cheaper inference this week (${lang}).`, topic: 'Inference' }]),
  }
}

export function weeksFixture() {
  return { weeks: [{ id: WEEK_ID, dateRange: 'Sep 7 – Sep 13, 2026', days: [{ id: '2026-09-12' }, { id: PERIOD_ID }] }] }
}

/**
 * Serves /weeks, /tech, /investment, /tips and /trends for any period, on any API host.
 * `overrides` maps an API path (e.g. '/weeks') to a response body. Returns the list of fetched URLs.
 */
export function stubApiFetch(overrides: Record<string, unknown> = {}): string[] {
  const calls: string[] = []
  vi.stubGlobal('fetch', async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    calls.push(url)
    const path = new URL(url).pathname.replace(/^.*?\/api(?=\/)/, '')
    if (path in overrides) return Response.json(overrides[path])
    if (path === '/weeks') return Response.json(weeksFixture())
    switch (path.match(/^\/(tech|investment|tips|trends)\/[^/]+$/)?.[1]) {
      case 'tech': return Response.json(techFixture())
      case 'investment': return Response.json(investmentFixture())
      case 'tips': return Response.json(tipsFixture())
      case 'trends': return Response.json(trendsFixture())
      default: return new Response('not found', { status: 404 })
    }
  })
  return calls
}
