import { afterEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { organizationSchema } from '@/components/structured-data'
import { buildBrand } from '@/lib/brand'
import { FIXED_NOW, PERIOD_ID, STORY_ID, stubApiFetch } from './fixtures/api'

vi.mock('next/link', () => ({
  default: ({ href, children, prefetch: _prefetch, ...rest }: any) =>
    createElement('a', { href: typeof href === 'string' ? href : String(href?.pathname ?? ''), ...rest }, children),
}))

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.resetModules()
})

const trustConfig = { label: 'Label', title: 'Title', description: 'Description', sections: [] }

describe('Organization attribution (spec AD7)', () => {
  it('names a founder only when one is configured', () => {
    expect(organizationSchema(buildBrand({}))).not.toHaveProperty('founder')
    expect(organizationSchema(buildBrand({ NEXT_PUBLIC_FOUNDER_NAME: 'Acme Labs' })).founder).toEqual({
      '@type': 'Organization',
      name: 'Acme Labs',
    })
  })

  it('authors articles as the Organization', async () => {
    vi.useFakeTimers({ now: FIXED_NOW, toFake: ['Date'] })
    stubApiFetch()
    const { default: ArticlePage } = await import('@/app/(localized)/[lang]/news/[periodId]/[storyId]/page')
    const html = renderToStaticMarkup(await ArticlePage({ params: Promise.resolve({ lang: 'en', periodId: PERIOD_ID, storyId: STORY_ID }) }))
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].flatMap((match) => JSON.parse(match[1]))
    const article = blocks.find((block: { '@type'?: string }) => block['@type'] === 'NewsArticle')
    expect(article.author).toEqual({ '@type': 'Organization', name: 'Data Cube AI', url: 'https://www.datacubeai.space' })
  })

  it('shows "Made by" in the trust page footer only when a founder is configured', async () => {
    const unset = await import('@/app/(site)/trust-page')
    expect(renderToStaticMarkup(createElement(unset.TrustPage, { config: trustConfig }))).not.toContain('Made by')

    vi.resetModules()
    vi.stubEnv('NEXT_PUBLIC_FOUNDER_NAME', 'Acme Labs')
    const configured = await import('@/app/(site)/trust-page')
    const html = renderToStaticMarkup(createElement(configured.TrustPage, { config: trustConfig })).replaceAll('<!-- -->', '')
    expect(html).toContain('Made by Acme Labs')
  })
})
