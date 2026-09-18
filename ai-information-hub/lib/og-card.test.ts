import { describe, expect, it } from 'vitest'
import { OG_TITLE_MAX, ogCard, techPostIdFromStoryId } from '@/lib/og-card'

describe('ogCard', () => {
  it('keeps the period card unchanged when nothing else is asked for', () => {
    expect(ogCard({ period: '2026-09-17', lang: 'en' })).toEqual({
      title: 'AI News 2026-09-17',
      showHeadlines: true,
    })
    expect(ogCard({ period: '2026-09-17', lang: 'de' }).title).toBe('KI-News 2026-09-17')
  })

  it('drops the trailing space when there is no period', () => {
    expect(ogCard({ lang: 'en' }).title).toBe('AI News')
    expect(ogCard({ lang: 'de' }).title).toBe('KI-News')
  })

  it('shows one story headline instead of the period headlines', () => {
    expect(ogCard({ period: '2026-09-17', lang: 'en', storyHeadline: 'Anthropic ships a thing' })).toEqual({
      title: 'Anthropic ships a thing',
      showHeadlines: false,
    })
  })

  it('falls back to the period card when the story id resolved to nothing', () => {
    // A stale share link must still render a usable card, not a blank one.
    expect(ogCard({ period: '2026-09-17', lang: 'en', storyHeadline: null })).toEqual({
      title: 'AI News 2026-09-17',
      showHeadlines: true,
    })
    expect(ogCard({ period: '2026-09-17', lang: 'en', storyHeadline: '   ' }).showHeadlines).toBe(true)
  })

  it('titles a topic card from its slug', () => {
    expect(ogCard({ lang: 'en', topicSlug: 'openai' })).toEqual({ title: 'Openai', showHeadlines: false })
  })

  it('caps both caller-influenced titles', () => {
    const longHeadline = 'a'.repeat(200)
    const longSlug = 'b'.repeat(200)

    for (const card of [ogCard({ lang: 'en', storyHeadline: longHeadline }), ogCard({ lang: 'en', topicSlug: longSlug })]) {
      expect(card.title.length).toBeLessThanOrEqual(OG_TITLE_MAX)
      expect(card.title.endsWith('...')).toBe(true)
    }
  })

  it('prefers a story over a topic when both are given', () => {
    expect(ogCard({ lang: 'en', storyHeadline: 'Story wins', topicSlug: 'openai' }).title).toBe('Story wins')
  })
})

describe('techPostIdFromStoryId', () => {
  it('reads the post id out of tech and video story ids', () => {
    expect(techPostIdFromStoryId('tech-42')).toBe('42')
    expect(techPostIdFromStoryId('video-42')).toBe('42')
  })

  it('returns null for story ids that live in other feeds', () => {
    // tip / primary / secondary / ma stories are not in the tech payload the
    // card already fetches; they fall back to the period card.
    for (const id of ['tip-42', 'tips-42', 'primary-42', 'secondary-42', 'ma-42']) {
      expect(techPostIdFromStoryId(id)).toBeNull()
    }
  })

  it('returns null for malformed input', () => {
    for (const id of ['', 'tech-', 'tech', 'techno-42', '42', 'tech-4 2']) {
      expect(techPostIdFromStoryId(id)).toBeNull()
    }
  })
})
