import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { NextRequest } from 'next/server'
import { FeedMasthead } from '@/components/feed-masthead'
import { AI_DISCLOSURE_PATH, aiLabel, aiLabelForImage, aiLabelLinkText, aiLabelShort } from '@/lib/ai-label'
import { BRAND, absoluteUrl } from '@/lib/brand'
import { FIXED_NOW, LANGS, PERIOD_ID, STORY_ID, TOPIC, WEEK_ID, stubApiFetch } from './fixtures/api'

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

describe('AI News Aggregator live preview', () => {
  it('reads the newest day, because week ids hold no content since collection went daily', async () => {
    // Production answers a week id with an empty feed; only day ids carry posts (C2).
    const calls = stubApiFetch({ [`/tech/${WEEK_ID}`]: {} })
    const { default: ToolPage } = await import('@/app/(localized)/[lang]/tools/ai-news-aggregator/page')
    const html = await render(ToolPage({ params: Promise.resolve({ lang: 'en' }) }))
    expect(html).toContain('OpenAI ships a new reasoning model')
    expectLabel(html, 'en')
    expect(calls.some((url) => url.endsWith(`/tech/${PERIOD_ID}`))).toBe(true)
  })
})

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// next/og renders with fonts. This stand-in keeps the element tree it is given, so the OG test reads the
// image text without fonts or network.
vi.mock('next/og', () => ({
  ImageResponse: class {
    element: unknown
    constructor(element: unknown) {
      this.element = element
    }
  },
}))

/** Every string in a JSX element tree, in render order. */
function textOf(node: unknown): string[] {
  if (typeof node === 'string' || typeof node === 'number') return [String(node)]
  if (Array.isArray(node)) return node.flatMap(textOf)
  if (node && typeof node === 'object' && 'props' in node) {
    return textOf((node as { props: { children?: unknown } }).props.children)
  }
  return []
}

describe('AI label on machine-readable surfaces', () => {
  const SITE = 'https://www.example.com'

  it.each(LANGS)('feed.xml subtitle in %s', async (lang) => {
    const { GET } = await import('@/app/feed.xml/route')
    const xml = await (await GET(new NextRequest(`${SITE}/feed.xml?lang=${lang}`))).text()
    expect(xml).toMatch(new RegExp(`<subtitle>[^<]* · ${escapeRegExp(aiLabel(lang))}</subtitle>`))
  })

  it.each(LANGS)('feed.xml entry summaries start with the short label in %s', async (lang) => {
    const { GET } = await import('@/app/feed.xml/route')
    const xml = await (await GET(new NextRequest(`${SITE}/feed.xml?lang=${lang}`))).text()
    const summaries = xml.split('<summary type="text">').slice(1)
    expect(summaries.length).toBeGreaterThan(0)
    for (const summary of summaries) {
      // None of the 8 short-label strings contain XML specials, so the escaped and raw forms are identical.
      expect(summary.startsWith(`${aiLabelShort(lang)} · `)).toBe(true)
    }
  })

  it.each(['de', 'en'])('newsletter.xml subtitle and every entry in %s', async (lang) => {
    const { GET } = await import('@/app/newsletter.xml/route')
    const xml = await (await GET(new NextRequest(`${SITE}/newsletter.xml?lang=${lang}`))).text()
    expect(xml).toContain(` · ${aiLabel(lang)}</subtitle>`)
    const entries = xml.split('<entry>').slice(1)
    expect(entries.length).toBeGreaterThan(0)
    for (const entry of entries) {
      expect(entry).toContain(`<content type="html">&lt;p&gt;&lt;em&gt;${aiLabel(lang)}&lt;/em&gt;&lt;/p&gt;`)
    }
  })

  it.each(LANGS)('content summary in %s: label below the title, AI-generated footer', async (lang) => {
    const { GET } = await import('@/app/api/content-summary/route')
    const md = await (await GET(new NextRequest(`${SITE}/api/content-summary?lang=${lang}&periodId=${PERIOD_ID}`))).text()
    const label = `\n\n> ${aiLabel(lang)} ${absoluteUrl(AI_DISCLOSURE_PATH)}\n\n`
    expect(md).toContain(label)
    expect(md.indexOf(label)).toBeLessThan(md.indexOf('## Summary Statistics'))
    expect(md).toContain('Content is AI-generated')
  })

  it('llms.txt carries the label in its introduction', async () => {
    const { GET } = await import('@/app/llms.txt/route')
    const text = await GET().text()
    const label = `> ${aiLabel('en')} How we use AI: ${absoluteUrl(AI_DISCLOSURE_PATH)}`
    expect(text).toContain(label)
    expect(text.indexOf(label)).toBeLessThan(text.indexOf('## Content Sections'))
  })

  it.each(['en', 'zh'])('OG image text in %s', async (lang) => {
    const { GET } = await import('@/app/api/og/route')
    const image = (await GET(new NextRequest(`${SITE}/api/og?period=${PERIOD_ID}&lang=${lang}`))) as unknown as { element: unknown }
    // English on the image for zh, ja and ko (Ruling R-5); aiLabelForImage encodes that choice.
    expect(textOf(image.element)).toContain(aiLabelForImage(lang))
  })
})
