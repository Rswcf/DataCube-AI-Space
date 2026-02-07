import { TechPost } from '@/lib/types'

export function OrganizationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'NewsMediaOrganization',
    name: 'DataCube AI',
    url: 'https://www.datacubeai.space',
    logo: 'https://www.datacubeai.space/icon.svg',
    description: 'Bilingual AI news aggregator providing weekly tech, investment, and tips content.',
    foundingDate: '2026-01',
    publishingPrinciples: 'https://www.datacubeai.space/impressum',
    sameAs: [],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export function WebsiteSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'DataCube AI',
    url: 'https://www.datacubeai.space',
    inLanguage: ['en', 'de'],
    description: 'Weekly AI news aggregator with tech breakthroughs, investment news, and practical tips.',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://www.datacubeai.space/?search={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export function ArticleSchema({ post, inLanguage = 'de', url }: { post: TechPost; inLanguage?: string; url?: string }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: post.content.slice(0, 110),
    description: post.content,
    datePublished: post.timestamp,
    dateModified: post.timestamp,
    image: 'https://www.datacubeai.space/opengraph-image',
    inLanguage,
    isAccessibleForFree: true,
    url: url || post.sourceUrl || 'https://www.datacubeai.space',
    author: {
      '@type': 'Organization',
      name: 'DataCube AI',
    },
    publisher: {
      '@type': 'Organization',
      name: 'DataCube AI',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.datacubeai.space/icon.svg',
      },
    },
    mainEntityOfPage: post.sourceUrl || 'https://www.datacubeai.space',
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export function VideoSchema({ video }: { video: TechPost }) {
  if (!video.isVideo || !video.videoId) return null

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: video.content.slice(0, 110),
    description: video.content,
    thumbnailUrl: video.videoThumbnailUrl || `https://img.youtube.com/vi/${video.videoId}/maxresdefault.jpg`,
    uploadDate: video.timestamp,
    duration: video.videoDuration,
    contentUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
    embedUrl: `https://www.youtube.com/embed/${video.videoId}`,
    publisher: {
      '@type': 'Organization',
      name: 'DataCube AI',
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export function FAQSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is DataCube AI?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'DataCube AI is a bilingual (German/English) weekly AI news aggregator that curates tech breakthroughs, investment news, practical tips, and YouTube videos from RSS feeds, Hacker News, and YouTube.',
        },
      },
      {
        '@type': 'Question',
        name: 'How often is the content updated?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Content is updated weekly, with new tech posts, investment news, and tips curated every week.',
        },
      },
      {
        '@type': 'Question',
        name: 'What languages does DataCube AI support?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'DataCube AI supports both German (DE) and English (EN). Users can switch between languages using the language toggle.',
        },
      },
      {
        '@type': 'Question',
        name: 'What types of AI news does DataCube AI cover?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'DataCube AI covers three main categories: Tech (AI breakthroughs, research, and product launches), Investment (funding rounds, M&A, stock movements), and Tips (practical AI tools and prompts).',
        },
      },
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export function BreadcrumbListSchema({ weekId, weekLabel }: { weekId: string; weekLabel: string }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.datacubeai.space' },
      { '@type': 'ListItem', position: 2, name: weekLabel, item: `https://www.datacubeai.space/week/${weekId}` },
    ],
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
}
