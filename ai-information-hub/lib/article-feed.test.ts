import { describe, expect, it } from 'vitest'
import {
  ArticleFeedOutageError,
  feedRevalidateSeconds,
  loadFeed,
  resolveStory,
  RECENT_PERIOD_REVALIDATE,
  SETTLED_PERIOD_REVALIDATE,
  type FeedResult,
} from './article-feed'

const URL = 'https://api.example/api/tech/2026-11-10'

function respond(status: number, body: unknown = {}) {
  return async () => new Response(JSON.stringify(body), { status })
}

async function load(fetchImpl: () => Promise<Response>, staticCopy: unknown = null) {
  return loadFeed(URL, { revalidate: 60, readStatic: async () => staticCopy, fetchImpl })
}

describe('loadFeed', () => {
  it('returns the API data on 200', async () => {
    expect(await load(respond(200, { en: [1] }))).toEqual({ kind: 'ok', data: { en: [1] } })
  })

  it('passes the revalidate window to fetch', async () => {
    let seen: unknown
    await loadFeed(URL, {
      revalidate: 21600,
      readStatic: async () => null,
      fetchImpl: async (_url, init) => {
        seen = init.next?.revalidate
        return new Response('{}', { status: 200 })
      },
    })
    expect(seen).toBe(21600)
  })

  it.each([400, 404, 410, 422])('treats HTTP %i as a definitive miss', async (status) => {
    expect(await load(respond(status))).toEqual({ kind: 'missing' })
  })

  it.each([408, 425, 429, 500, 502, 503, 504])('treats HTTP %i as an outage', async (status) => {
    expect((await load(respond(status))).kind).toBe('outage')
  })

  it('treats a network error as an outage', async () => {
    const result = await load(async () => {
      throw new TypeError('fetch failed')
    })
    expect(result).toMatchObject({ kind: 'outage', reason: expect.stringContaining('fetch failed') })
  })

  it('treats an unreadable body as an outage', async () => {
    const result = await load(async () => new Response('<html>', { status: 200 }))
    expect(result.kind).toBe('outage')
  })

  it('falls back to the bundled copy on an outage and on a miss', async () => {
    expect(await load(respond(503), { en: ['static'] })).toEqual({ kind: 'ok', data: { en: ['static'] } })
    expect(await load(respond(404), { en: ['static'] })).toEqual({ kind: 'ok', data: { en: ['static'] } })
  })
})

describe('resolveStory', () => {
  const ok: FeedResult<unknown> = { kind: 'ok', data: {} }
  const missing: FeedResult<unknown> = { kind: 'missing' }
  const outage: FeedResult<unknown> = { kind: 'outage', reason: 'investment: HTTP 503' }

  it('renders a story found in a loaded feed even if another feed is down', () => {
    expect(resolveStory([ok, outage, ok], { id: 'tech-1' })).toEqual({ id: 'tech-1' })
  })

  it('returns not found only when every feed answered', () => {
    expect(resolveStory([ok, missing, ok], null)).toBeNull()
    expect(resolveStory([missing, missing, missing], null)).toBeNull()
  })

  it('throws instead of not found when a feed was unreachable', () => {
    expect(() => resolveStory([ok, outage, ok], null)).toThrow(ArticleFeedOutageError)
    expect(() => resolveStory([outage, outage, outage], null)).toThrow(/HTTP 503/)
  })
})

describe('feedRevalidateSeconds', () => {
  const now = new Date('2026-11-21T12:00:00Z')

  it('keeps periods from the last 3 days at 1 h', () => {
    expect(feedRevalidateSeconds(new Date('2026-11-21T00:00:00Z'), now)).toBe(RECENT_PERIOD_REVALIDATE)
    expect(feedRevalidateSeconds(new Date('2026-11-19T00:00:00Z'), now)).toBe(RECENT_PERIOD_REVALIDATE)
    // A week in progress is dated on its Saturday, which can be in the future.
    expect(feedRevalidateSeconds(new Date('2026-11-22T00:00:00Z'), now)).toBe(RECENT_PERIOD_REVALIDATE)
  })

  it('raises older periods to 6 h', () => {
    expect(feedRevalidateSeconds(new Date('2026-11-18T00:00:00Z'), now)).toBe(SETTLED_PERIOD_REVALIDATE)
    expect(feedRevalidateSeconds(new Date('2026-09-10T00:00:00Z'), now)).toBe(SETTLED_PERIOD_REVALIDATE)
  })
})
