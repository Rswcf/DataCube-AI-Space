// Feed loading for article pages (app/(localized)/[lang]/news/[periodId]/[storyId]).
//
// Article pages are ISR-cached. Whatever a render returns is cached, a 404
// from notFound() included. Until 2026-11 any backend failure fell through to
// notFound(), so a short Railway outage cached real articles as 404 for the
// whole revalidate window. This module tells "the backend says it does not
// exist" apart from "the backend could not answer":
//   - ok:      the feed loaded (from the API or the bundled public/data copy);
//   - missing: the API answered 4xx (the routers raise 404 for an unknown period);
//   - outage:  network error, 5xx, 408, 429 or an unreadable body.
// resolveStory() throws on an outage instead of returning "not found". A
// thrown render is not cached: on a background revalidation Next.js keeps
// serving the previous page, and a first render gets an uncached 500 that the
// next request retries.

export type FeedResult<T> =
  | { kind: 'ok'; data: T }
  | { kind: 'missing' }
  | { kind: 'outage'; reason: string }

export class ArticleFeedOutageError extends Error {
  constructor(reasons: string[]) {
    super(`Article feeds unavailable: ${reasons.join('; ')}`)
    this.name = 'ArticleFeedOutageError'
  }
}

// Status codes that mean "try again later", not "does not exist".
const TRANSIENT_4XX = new Set([408, 425, 429])

export function isDefinitiveMiss(status: number): boolean {
  return status >= 400 && status < 500 && !TRANSIENT_4XX.has(status)
}

// Seconds an article stays cached. Recent periods keep a short window because
// Stage 3.5 translations can land after the first render; until then the page
// shows the en/de fallback. Older periods no longer change.
export const RECENT_PERIOD_REVALIDATE = 3600
export const SETTLED_PERIOD_REVALIDATE = 21600
const RECENT_PERIOD_MS = 3 * 24 * 60 * 60 * 1000

export function feedRevalidateSeconds(publishedAt: Date, now: Date = new Date()): number {
  return now.getTime() - publishedAt.getTime() < RECENT_PERIOD_MS
    ? RECENT_PERIOD_REVALIDATE
    : SETTLED_PERIOD_REVALIDATE
}

type FetchLike = (url: string, init: RequestInit & { next?: { revalidate?: number } }) => Promise<Response>

export async function loadFeed<T>(
  url: string,
  options: {
    revalidate: number
    readStatic: () => Promise<T | null>
    fetchImpl?: FetchLike
  },
): Promise<FeedResult<T>> {
  const fetchImpl = options.fetchImpl ?? (fetch as FetchLike)
  let failure: FeedResult<T>

  try {
    const response = await fetchImpl(url, { next: { revalidate: options.revalidate } })
    if (response.ok) {
      try {
        return { kind: 'ok', data: (await response.json()) as T }
      } catch {
        failure = { kind: 'outage', reason: `${url}: unreadable body` }
      }
    } else if (isDefinitiveMiss(response.status)) {
      failure = { kind: 'missing' }
    } else {
      failure = { kind: 'outage', reason: `${url}: HTTP ${response.status}` }
    }
  } catch (error) {
    failure = { kind: 'outage', reason: `${url}: ${error instanceof Error ? error.message : String(error)}` }
  }

  // The bundled copy (public/data) answers for the periods it holds, in both cases.
  const fallback = await options.readStatic()
  if (fallback !== null) return { kind: 'ok', data: fallback }
  return failure
}

export function feedData<T>(result: FeedResult<T>): T | null {
  return result.kind === 'ok' ? result.data : null
}

// A story found in any loaded feed renders. "Not found" needs every feed to
// have answered; if one was unreachable the story may be in it, so throw.
export function resolveStory<S>(results: FeedResult<unknown>[], story: S | null): S | null {
  if (story !== null) return story
  const reasons = results.flatMap((r) => (r.kind === 'outage' ? [r.reason] : []))
  if (reasons.length > 0) throw new ArticleFeedOutageError(reasons)
  return null
}
