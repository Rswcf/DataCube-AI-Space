import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { FeedMasthead } from '@/components/feed-masthead'
import { AI_DISCLOSURE_PATH, aiLabel, aiLabelLinkText, aiLabelShort } from '@/lib/ai-label'
import { BRAND } from '@/lib/brand'
import { FIXED_NOW, LANGS, PERIOD_ID, STORY_ID, TOPIC, stubApiFetch } from './fixtures/api'

vi.mock('next/link', () => ({
  default: ({ href, children, prefetch: _prefetch, ...rest }: any) =>
    createElement('a', { href: typeof href === 'string' ? href : String(href?.pathname ?? ''), ...rest }, children),
}))

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#x27;')
}

async function render(element: ReactElement | Promise<ReactElement>): Promise<string> {
  return renderToStaticMarkup(await element).replaceAll('<!-- -->', '')
}

function expectLabel(html: string, lang: string) {
  expect(html).toContain('data-ai-label=""')
  expect(html).toContain(escapeHtml(aiLabel(lang)))
  expect(html).toContain(`href="${AI_DISCLOSURE_PATH}"`)
  expect(html).toContain(escapeHtml(aiLabelLinkText(lang)))
}

beforeEach(() => {
  vi.useFakeTimers({ now: FIXED_NOW, toFake: ['Date'] })
  stubApiFetch()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe.each(LANGS)('AI label on HTML surfaces in %s', (lang) => {
  it('week page: label in the header, no editorial byline', async () => {
    const { default: WeekPage } = await import('@/app/(localized)/[lang]/week/[weekId]/page')
    const html = await render(WeekPage({ params: Promise.resolve({ lang, weekId: PERIOD_ID }) }))
    expectLabel(html, lang)
    expect(html.indexOf('data-ai-label')).toBeLessThan(html.indexOf('id="takeaways-heading"'))
    expect(html).not.toContain(`${BRAND.name} Editorial`)
  })

  it('article page: short label in the byline slot, full label under the headline', async () => {
    const { default: ArticlePage } = await import('@/app/(localized)/[lang]/news/[periodId]/[storyId]/page')
    const html = await render(ArticlePage({ params: Promise.resolve({ lang, periodId: PERIOD_ID, storyId: STORY_ID }) }))
    expectLabel(html, lang)
    expect(html).toContain(`>${escapeHtml(aiLabelShort(lang))}</a>`)
    expect(html.indexOf('data-ai-label')).toBeLessThan(html.indexOf('id="source-brief-heading"'))
    // Visible bylines only: the NewsArticle JSON-LD keeps "<brand> Editorial" as its author until Task 16 (L3).
    const visible = html.replace(/<script[^>]*>[\s\S]*?<\/script>/g, '')
    for (const byline of ['Editorial', 'Redaktion', '编辑部', 'Redaction', 'Redaccion', '編集部', '편집팀']) {
      expect(visible).not.toContain(`${BRAND.name} ${byline}`)
      expect(visible).not.toContain(`${byline} ${BRAND.name}`)
    }
  })

  it('topic page: label in the header', async () => {
    const { default: TopicPage } = await import('@/app/(localized)/[lang]/topic/[topic]/page')
    const props = { params: Promise.resolve({ lang, topic: TOPIC }), searchParams: Promise.resolve({ period: PERIOD_ID }) }
    const html = await render(TopicPage(props))
    expectLabel(html, lang)
    expect(html.indexOf('data-ai-label')).toBeLessThan(html.indexOf('aria-label="Section filter"'))
  })

  it('AI News Aggregator tool page: label above the live preview', async () => {
    const { default: ToolPage } = await import('@/app/(localized)/[lang]/tools/ai-news-aggregator/page')
    const html = await render(ToolPage({ params: Promise.resolve({ lang }) }))
    expectLabel(html, lang)
    expect(html.indexOf('data-ai-label')).toBeLessThan(html.indexOf('OpenAI ships a new reasoning model'))
  })

  it('home feed masthead', async () => {
    expectLabel(await render(createElement(FeedMasthead, { issueLabel: 'Sep 13, 2026', language: lang })), lang)
  })
})
