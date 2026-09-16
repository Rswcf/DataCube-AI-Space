import { afterEach, beforeEach, describe, it, vi } from 'vitest'
import { createElement, type ComponentType, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { FIXED_NOW, PERIOD_ID, STORY_ID, TOPIC, stubApiFetch } from '../fixtures/api'
import { expectGolden, normalizeHtml } from './golden'

vi.mock('next/link', () => ({
  default: ({ href, children, prefetch: _prefetch, ...rest }: any) =>
    createElement('a', { href: typeof href === 'string' ? href : String(href?.pathname ?? ''), ...rest }, children),
}))
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useRouter: () => ({ push: () => undefined, replace: () => undefined, prefetch: () => undefined }),
}))
vi.mock('@/components/home-page-client', () => ({ default: () => null }))
// The root shell loads next/font and analytics, which only work inside the Next.js compiler.
vi.mock('next/font/google', () => ({
  Geist: () => ({ variable: 'font-geist-sans' }),
  Geist_Mono: () => ({ variable: 'font-geist-mono' }),
  Newsreader: () => ({ variable: 'font-newsreader' }),
}))
vi.mock('@vercel/analytics/next', () => ({ Analytics: () => null }))

type AnyElement = ReactElement<Record<string, unknown>>

beforeEach(() => {
  vi.useFakeTimers({ now: FIXED_NOW, toFake: ['Date'] })
  // The login page positions decorative lines with Math.random(); a fixed value makes every render reproducible.
  vi.spyOn(Math, 'random').mockReturnValue(0.5)
  stubApiFetch()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

/** renderToStaticMarkup cannot render an async server component, so a top-level one is called first. */
async function resolveTopLevel(element: AnyElement): Promise<AnyElement> {
  const type = element.type
  if (typeof type === 'function' && type.constructor.name === 'AsyncFunction') {
    return resolveTopLevel(await (type as (props: Record<string, unknown>) => Promise<AnyElement>)(element.props))
  }
  return element
}

async function render(element: ReactElement | Promise<ReactElement>): Promise<string> {
  return normalizeHtml(renderToStaticMarkup(await resolveTopLevel((await element) as AnyElement)))
}

const TOOLS = {
  'ai-news-aggregator': () => import('@/app/(localized)/[lang]/tools/ai-news-aggregator/page'),
  'ai-news-api': () => import('@/app/(localized)/[lang]/tools/ai-news-api/page'),
  'ai-report-generator': () => import('@/app/(localized)/[lang]/tools/ai-report-generator/page'),
  'ai-stock-tracker': () => import('@/app/(localized)/[lang]/tools/ai-stock-tracker/page'),
}

const STATIC_PAGES: Record<string, () => Promise<{ default: ComponentType }>> = {
  about: () => import('@/app/(site)/about/page'),
  'ai-disclosure': () => import('@/app/(site)/ai-disclosure/page'),
  'editorial-policy': () => import('@/app/(site)/editorial-policy/page'),
  'source-methodology': () => import('@/app/(site)/source-methodology/page'),
  corrections: () => import('@/app/(site)/corrections/page'),
  contact: () => import('@/app/(site)/contact/page'),
  impressum: () => import('@/app/(site)/impressum/page'),
  datenschutz: () => import('@/app/(site)/datenschutz/page'),
  premium: () => import('@/app/(site)/premium/page'),
  'for-teams': () => import('@/app/(site)/for-teams/page'),
  funding: () => import('@/app/(site)/funding/page'),
  login: () => import('@/app/(site)/login/page'),
}

describe('rendered pages', () => {
  for (const [slug, load] of Object.entries(TOOLS)) {
    it.each(['en', 'zh'])(`tool ${slug} in %s`, async (lang) => {
      const { default: Page } = await load()
      await expectGolden(await render(Page({ params: Promise.resolve({ lang }) })), `pages/tool-${slug}-${lang}.html`)
    })
  }

  it('home page in en', async () => {
    const { default: Page } = await import('@/app/(localized)/[lang]/page')
    await expectGolden(await render(Page({ params: Promise.resolve({ lang: 'en' }) })), 'pages/home-en.html')
  })

  it.each(['en', 'de', 'zh'])('week page in %s', async (lang) => {
    const { default: Page } = await import('@/app/(localized)/[lang]/week/[weekId]/page')
    await expectGolden(await render(Page({ params: Promise.resolve({ lang, weekId: PERIOD_ID }) })), `pages/week-${lang}.html`)
  })

  it.each(['en', 'zh'])('article page in %s', async (lang) => {
    const { default: Page } = await import('@/app/(localized)/[lang]/news/[periodId]/[storyId]/page')
    const props = { params: Promise.resolve({ lang, periodId: PERIOD_ID, storyId: STORY_ID }) }
    await expectGolden(await render(Page(props)), `pages/article-${lang}.html`)
  })

  it('topic page in en', async () => {
    const { default: Page } = await import('@/app/(localized)/[lang]/topic/[topic]/page')
    const props = { params: Promise.resolve({ lang: 'en', topic: TOPIC }), searchParams: Promise.resolve({ period: PERIOD_ID }) }
    await expectGolden(await render(Page(props)), 'pages/topic-en.html')
  })

  // The <html> shell of both root layouts: preconnect links, the site-wide JSON-LD and the feed discovery links.
  it.each(['en', 'zh'] as const)('root shell in %s', async (lang) => {
    const { RootShell } = await import('@/components/root-shell')
    const shell = createElement(RootShell, { lang, children: createElement('p', null, 'Page body') })
    await expectGolden(await render(shell), `pages/root-shell-${lang}.html`)
  })

  for (const [name, load] of Object.entries(STATIC_PAGES)) {
    it(`${name} page`, async () => {
      const { default: Page } = await load()
      await expectGolden(await render(createElement(Page)), `pages/${name}.html`)
    })
  }
})
