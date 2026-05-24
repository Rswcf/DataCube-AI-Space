import type { Metadata } from 'next'
import { TrustPage, type TrustPageConfig } from '../trust-page'

export const metadata: Metadata = {
  title: 'Source Methodology | Data Cube AI',
  description: 'How Data Cube AI sources, filters, summarizes, and links AI news and intelligence items.',
  alternates: { canonical: 'https://www.datacubeai.space/source-methodology' },
}

const config: TrustPageConfig = {
  label: 'Source Methodology',
  title: 'How Sources Become Briefing Items',
  description: 'This page describes how Data Cube AI turns source material into period pages, feeds, and AI-readable summaries.',
  sections: [
    {
      title: 'Source Types',
      bullets: [
        'Publisher RSS feeds and public news sources.',
        'Developer and research community sources.',
        'YouTube sources for relevant AI videos.',
        'Community sources such as Hacker News and Reddit when they surface practical workflows or important discussions.',
      ],
    },
    {
      title: 'Processing Pipeline',
      body: [
        'The pipeline collects candidate items, groups them by period, assigns categories, summarizes content, translates into supported languages, and exposes the result through HTML pages, JSON endpoints, Atom feeds, and Markdown summaries.',
      ],
    },
    {
      title: 'Deduplication And Ranking',
      body: [
        'Items may be filtered or ranked based on source relevance, topic fit, timeliness, and impact label. The goal is to produce a useful briefing, not an exhaustive archive of every mention.',
      ],
    },
    {
      title: 'Source Links',
      body: [
        'Where available, source URLs are preserved as outbound references. Feed entries use Data Cube AI URLs as the primary alternate link, while the original publisher appears as the source link.',
      ],
    },
    {
      title: 'Known Limits',
      body: [
        'Automated source processing can miss context, source updates, or later corrections. Readers should verify important decisions against the cited primary source.',
      ],
    },
  ],
}

export default function SourceMethodologyPage() {
  return <TrustPage config={config} />
}
