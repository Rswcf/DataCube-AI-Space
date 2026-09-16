/**
 * Lowercase and strip diacritics the way topic slugs do. Slugs and the text
 * they are matched against must go through the same folding, or an accented
 * term ("sécurité" → slug "securite") can never match its own source text.
 */
export function foldForTopicMatch(input: string): string {
  return input
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'o')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function toTopicSlug(input: string): string {
  const normalized = foldForTopicMatch(input)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalized || 'topic'
}

/**
 * True when every term appears in the combined fields. Terms come from a slug,
 * so they are already folded; the fields are folded here to match. Without
 * this, every French, Spanish or Portuguese hub whose tag carried an accent
 * answered 404 (2026-09-16).
 */
export function matchesTopicTerms(fields: Array<string | undefined | null>, terms: string[]): boolean {
  if (terms.length === 0) return false
  const haystack = foldForTopicMatch(fields.map((field) => field || '').join(' '))
  return terms.every((term) => haystack.includes(term))
}

/**
 * The hub a content tag links to, or null when the tag has no Latin letters or
 * digits. toTopicSlug falls back to the placeholder "topic" for such input, so
 * every pure Chinese, Japanese or Korean tag used to link to
 * /{lang}/topic/topic — one 404 shared by all of them.
 */
export function tagTopicSlug(label: string): string | null {
  if (!/[a-z0-9]/.test(foldForTopicMatch(label || ''))) return null
  return toTopicSlug(label)
}

/**
 * Items keyed by id. Every language's list is built from the same records, so
 * a localized item can be paired with its English original by id.
 */
export function indexById<T extends { id: unknown }>(items: T[] | null | undefined): Map<T['id'], T> {
  return new Map((items || []).map((item) => [item.id, item]))
}

export function topicSlugToQuery(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '')
    .replace(/-+/g, ' ')
    .trim()
}

export function topicSlugToTitle(slug: string): string {
  const query = topicSlugToQuery(slug)
  if (!query) return 'Topic'
  return query
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Generic headline words that must never become a topic hub: acronyms a
 * headline capitalises by convention, plus the hub slugs that would match
 * almost every article and therefore say nothing.
 */
const TREND_ENTITY_STOPWORDS = new Set([
  'ai', 'ki', 'llm', 'llms', 'gpt', 'api', 'apis', 'gpu', 'gpus', 'cpu', 'ipo',
  'ceo', 'cto', 'cfo', 'coo', 'vp', 'us', 'usa', 'uk', 'eu', 'un', 'uae',
  'the', 'a', 'an', 'new', 'now', 'top', 'how', 'why', 'what', 'more', 'this',
])

const MIN_TREND_ENTITY_LENGTH = 4

/**
 * The entity a trend headline is about, as a topic slug, or null when the
 * headline leads with nothing specific enough to be worth a hub.
 *
 * A topic page matches an article only when EVERY term of its slug appears in
 * that article, so slugging a whole headline
 * ("nvidia-ceo-rejects-ai-slowdown-calls") produces a page that can never
 * resolve — 6 of the 8 homepage trend links 404ed this way (2026-09-16).
 * Single entities resolve, because the same words already back the article tag
 * links on week pages.
 *
 * Always pass the ENGLISH title, which the backend generates natively and
 * translates from: German capitalises every noun, and CJK capitalises nothing,
 * so capitalisation only carries meaning in English. Latin-script brand names
 * survive verbatim into every translation, so the derived slug stays correct
 * for the localized chip that links to it.
 */
export function trendTopicSlug(title: string): string | null {
  // Apostrophes are separators here, so "Microsoft's" already yields
  // "Microsoft" and a lone "s". Do not strip a trailing "s" on top of that: it
  // would also cut names that end in one (Databricks, Siemens, Genesis).
  for (const token of (title || '').split(/[^\p{L}\p{N}]+/u)) {
    // Four characters minimum: the topic page matches by substring, so a short
    // token is a trap — "act" (from "EU AI Act") would pull in every article
    // containing "impact" or "contract". Short tickers like IBM or ARM are lost
    // with it, which is the right side to err on for an auto-generated link.
    if (token.length < MIN_TREND_ENTITY_LENGTH) continue
    // Only a capital marks a proper noun, and an all-lowercase token never does.
    if (token === token.toLowerCase()) continue
    const slug = toTopicSlug(token)
    if (!slug || slug === 'topic' || slug.length < MIN_TREND_ENTITY_LENGTH) continue
    if (TREND_ENTITY_STOPWORDS.has(slug)) continue
    return slug
  }
  return null
}
