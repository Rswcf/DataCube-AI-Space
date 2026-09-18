import { topicSlugToTitle } from '@/lib/topic-utils'

/**
 * What the social card at `/api/og` puts on the image.
 *
 * The route renders an image, which Vitest cannot exercise, so the decisions
 * live here as plain data: which title to print, and whether the period's top
 * headlines belong under it. A card about one story or one topic shows neither
 * — the period's headlines would be about something else.
 */

export const OG_TITLE_MAX = 80

export interface OgCardInput {
  period?: string | null
  lang?: string | null
  /** Resolved server-side from `?story=`; null when the id matched nothing. */
  storyHeadline?: string | null
  /** The `?topic=` slug, the one caller-controlled string that reaches the image. */
  topicSlug?: string | null
}

export interface OgCard {
  title: string
  showHeadlines: boolean
}

function truncate(text: string, max = OG_TITLE_MAX): string {
  return text.length > max ? `${text.slice(0, max - 3)}...` : text
}

export function ogCard({ period, lang, storyHeadline, topicSlug }: OgCardInput): OgCard {
  const headline = storyHeadline?.trim()
  if (headline) return { title: truncate(headline), showHeadlines: false }

  const slug = topicSlug?.trim()
  if (slug) return { title: truncate(topicSlugToTitle(slug)), showHeadlines: false }

  const prefix = lang === 'de' ? 'KI-News' : 'AI News'
  return { title: period ? `${prefix} ${period}` : prefix, showHeadlines: true }
}

/**
 * The post id inside a `tech-<id>` or `video-<id>` story id.
 *
 * Article pages mint ids per feed (`tech-`, `video-`, `tip-`, `primary-`,
 * `secondary-`, `ma-`). The card already fetches the tech payload for its
 * headlines, so those two resolve for free; the rest return null and fall back
 * to the period card rather than making the image fetch four more endpoints.
 */
export function techPostIdFromStoryId(storyId: string): string | null {
  return /^(?:tech|video)-([A-Za-z0-9_-]+)$/.exec(storyId)?.[1] ?? null
}
