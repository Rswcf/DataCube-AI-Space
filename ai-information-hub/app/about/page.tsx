import type { Metadata } from 'next'
import { TrustPage, type TrustPageConfig } from '../trust-page'

export const metadata: Metadata = {
  title: 'About Data Cube AI',
  description: 'About Data Cube AI, a multilingual AI intelligence memo covering technology, capital, and practical workflows.',
  alternates: { canonical: 'https://www.datacubeai.space/about' },
}

const config: TrustPageConfig = {
  label: 'Publisher Information',
  title: 'About Data Cube AI',
  description: 'Data Cube AI is a multilingual intelligence memo for AI technology news, investment signals, and practical workflows.',
  sections: [
    {
      title: 'What We Publish',
      body: [
        'Data Cube AI curates AI-related developments across technology, capital markets, and hands-on workflows. The product is designed for readers who need a concise daily and weekly briefing instead of a raw feed.',
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
        'Data Cube AI is an information product. It is not investment advice, legal advice, or a substitute for reading the cited primary sources.',
      ],
    },
  ],
}

export default function AboutPage() {
  return <TrustPage config={config} />
}
