import type { Metadata } from 'next'
import { BRAND, absoluteUrl, brandedTitle } from '@/lib/brand'
import { TrustPage, type TrustPageConfig } from '../trust-page'

export const metadata: Metadata = {
  title: 'Source Methodology',
  description: `How ${BRAND.name} sources, filters, summarizes, verifies, and links AI news items across technology, capital, and workflow coverage.`,
  alternates: { canonical: absoluteUrl('/source-methodology') },
  openGraph: {
    title: brandedTitle('Source Methodology'),
    description: `How ${BRAND.name} turns source material into multilingual period pages, feeds, summaries, and AI-readable surfaces.`,
    url: absoluteUrl('/source-methodology'),
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: BRAND.name }],
  },
}

const config: TrustPageConfig = {
  label: 'Source Methodology',
  updated: 'October 27, 2026',
  title: 'How Sources Become Briefing Items',
  description: `This page describes how ${BRAND.name} turns source material into period pages, feeds, and AI-readable summaries.`,
  sections: [
    {
      title: 'Source Types',
      bullets: [
        'Publisher RSS feeds and public news sources.',
        'Developer and research community sources.',
        'YouTube sources for relevant AI videos.',
        'Hacker News discussions and practical expert publications. Sources that deny automated access are paused.',
        'arXiv research metadata, labelled as preprints, and AI-related European Commission announcements.',
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
        'Items are selected using relevance, date and publisher diversity before bounded summary inputs are sent to a model. Frequent metadata polling reduces losses from short feeds. The goal is a useful briefing, not an exhaustive archive.',
      ],
    },
    {
      title: 'Source Links',
      body: [
        'New practical tips are bound to dated input records. Legacy items whose content has not been rechecked carry an unverified label and an edition date; unmatched outbound links are removed.',
        'Video summaries identify whether they use a transcript excerpt or the publisher’s description. These are evidence limits, not claims that the full video was reviewed.',
        `Where available, source URLs are preserved as outbound references. Feed entries use ${BRAND.name} URLs as the primary alternate link, while the original publisher appears as the source link.`,
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
