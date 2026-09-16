import type { Metadata } from 'next'
import { BRAND, absoluteUrl } from '@/lib/brand'
import { TrustPage, type TrustPageConfig } from '../trust-page'

export const metadata: Metadata = {
  title: { absolute: `About ${BRAND.name}` },
  description: `About ${BRAND.name}, a multilingual AI intelligence memo covering technology, capital, practical workflows, sources, and update rhythm.`,
  alternates: { canonical: absoluteUrl('/about') },
  openGraph: {
    title: `About ${BRAND.name}`,
    description: `Publisher information for ${BRAND.name}, a multilingual intelligence memo for AI technology and capital signals.`,
    url: absoluteUrl('/about'),
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: BRAND.name }],
  },
}

const config: TrustPageConfig = {
  label: 'Publisher Information',
  title: `About ${BRAND.name}`,
  description: `${BRAND.name} is a multilingual intelligence memo for AI technology news, investment signals, and practical workflows.`,
  sections: [
    {
      title: 'What We Publish',
      body: [
        `${BRAND.name} curates AI-related developments across technology, capital markets, and hands-on workflows. The product is designed for readers who need a concise daily and weekly briefing instead of a raw feed.`,
      ],
      bullets: [
        'Technology updates across models, infrastructure, products, research, and regulation.',
        'Investment signals including funding rounds, public-market moves, and M&A activity.',
        'Practical AI tips, prompts, tools, and workflow examples.',
        'Curated video items when a source is better consumed as video.',
      ],
    },
    {
      title: 'Languages And Access',
      body: [
        'The site supports German, English, Chinese, French, Spanish, Portuguese, Japanese, and Korean. Public briefing pages are intended to be accessible to readers, search engines, feed readers, and AI retrieval systems.',
      ],
    },
    {
      title: 'Update Rhythm',
      body: [
        'The content pipeline is updated daily, with period pages available by daily ID or weekly ID. Atom feeds, sitemap files, and llms.txt are maintained as discovery surfaces for search and AI systems.',
      ],
    },
    {
      title: 'Important Limits',
      body: [
        `${BRAND.name} is an information product. It is not investment advice, legal advice, or a substitute for reading the cited primary sources.`,
      ],
    },
  ],
}

export default function AboutPage() {
  return <TrustPage config={config} />
}
