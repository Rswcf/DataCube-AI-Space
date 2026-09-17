import { describe, it } from 'vitest'
import type { ReactElement } from 'react'
import {
  ArticleSchema,
  BreadcrumbListSchema,
  CollectionPageSchema,
  FAQSchema,
  OrganizationSchema,
  SoftwareApplicationSchema,
  VideoSchema,
  WebsiteSchema,
} from '@/components/structured-data'
import type { TechPost } from '@/lib/types'
import { LANGS } from '../fixtures/api'
import { expectGolden, stableJson } from './golden'

type JsonLdScript = ReactElement<{ dangerouslySetInnerHTML: { __html: string } }>

function jsonLd(element: unknown): unknown {
  return JSON.parse((element as JsonLdScript).props.dangerouslySetInnerHTML.__html)
}

const post: TechPost = {
  id: 101,
  author: { name: 'Example News', handle: '', avatar: 'EN', verified: false },
  content: 'OpenAI ships a new reasoning model for developers\nThe release adds tool use.',
  tags: ['OpenAI'],
  category: 'LLM',
  iconType: 'Brain',
  impact: 'high',
  timestamp: '2026-09-13T09:00:00.000Z',
  metrics: { comments: 0, retweets: 0, likes: 0, views: '0' },
  source: 'Example News',
  sourceUrl: 'https://example.com/openai-model',
}

describe('structured data', () => {
  it('site-wide and page schemas', async () => {
    const schemas = {
      organization: jsonLd(OrganizationSchema()),
      website: jsonLd(WebsiteSchema()),
      breadcrumb: jsonLd(BreadcrumbListSchema({ weekId: '2026-09-13', weekLabel: 'Sep 13, 2026', lang: 'en' })),
      softwareApplication: jsonLd(SoftwareApplicationSchema({
        name: 'Example Tool', description: 'A tool.', url: 'https://example.com/tool', lang: 'en',
      })),
      collectionPage: jsonLd(CollectionPageSchema({
        url: 'https://example.com/page', name: 'AI News', description: 'Curated.', inLanguage: 'en',
        datePublished: '2026-09-13T00:00:00.000Z', dateModified: '2026-09-13T12:00:00.000Z',
        speakableCssSelector: ['#takeaways'],
      })),
      articleWithDefaultUrl: jsonLd(ArticleSchema({ post, inLanguage: 'en' })),
      video: jsonLd(VideoSchema({ video: { ...post, isVideo: true, videoId: 'abc123XYZ00' } })),
    }
    await expectGolden(stableJson(schemas), 'structured-data.json')
  })

  it.each(LANGS)('FAQ in %s', async (lang) => {
    await expectGolden(stableJson(jsonLd(FAQSchema({ lang }))), `faq-${lang}.json`)
  })
})
