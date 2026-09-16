import type { Metadata } from 'next'
import { BRAND, absoluteUrl } from '@/lib/brand'

// Site-wide metadata shared by both root layouts (app/(site)/layout.tsx and
// app/(localized)/[lang]/layout.tsx). Pages override what they need via
// their own metadata / generateMetadata.
export const siteMetadata: Metadata = {
  metadataBase: new URL(BRAND.siteUrl),
  title: {
    default: `${BRAND.name} | Daily AI News, Investment Signals & Practical Tips`,
    template: `%s | ${BRAND.name}`,
  },
  description: 'Free multilingual AI news aggregator covering generative AI breakthroughs, LLM updates, AI investment signals, and practical tips — curated daily from 35+ sources in 8 languages.',
  keywords: [
    // English
    'AI news', 'artificial intelligence', 'machine learning', 'AI investment', 'AI tips',
    'generative AI', 'LLM news', 'ChatGPT updates', 'AI weekly digest', 'AI newsletter',
    'AI stocks', 'AI funding', 'AI tools', 'deep learning', 'AI breakthroughs',
    'prompt engineering', 'AI startups', 'AI daily digest',
    // German
    'künstliche Intelligenz', 'KI-Nachrichten', 'KI-Investitionen', 'KI News', 'KI Tipps',
    // Chinese
    '人工智能', '大模型', 'AI投资', 'AI新闻', 'AI工具推荐',
    // French
    'actualités IA', 'intelligence artificielle', 'investissement IA',
    // Spanish
    'noticias IA', 'inteligencia artificial', 'inversiones IA',
    // Portuguese
    'notícias IA', 'inteligência artificial',
    // Japanese
    'AIニュース', '人工知能ニュース', '機械学習',
    // Korean
    'AI 뉴스', '인공지능 뉴스', 'AI 투자',
  ],
  authors: [{ name: BRAND.name, url: BRAND.siteUrl }],
  creator: BRAND.name,
  publisher: BRAND.name,
  generator: 'Next.js',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },

  // Open Graph
  openGraph: {
    type: 'website',
    locale: 'en_US',
    alternateLocale: ['de_DE', 'zh_CN', 'fr_FR', 'es_ES', 'pt_BR', 'ja_JP', 'ko_KR'],
    url: BRAND.siteUrl,
    siteName: BRAND.name,
    title: `${BRAND.name} | Daily AI News & Insights`,
    description: 'Free AI news aggregator: generative AI breakthroughs, investment signals, and practical tips – curated daily from 35+ sources in 8 languages.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: BRAND.name,
        type: 'image/jpeg',
      },
    ],
  },

  // Twitter Card — no static images so child pages' openGraph.images propagate automatically
  twitter: {
    card: 'summary_large_image',
    title: `${BRAND.name} | Daily AI News`,
    description: 'Daily AI news digest: tech breakthroughs, investment signals, and practical tips – free in 8 languages.',
    images: [
      {
        url: '/og-image.jpg',
        alt: BRAND.name,
      },
    ],
  },

  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  // Alternates for multilingual
  alternates: {
    canonical: BRAND.siteUrl,
    languages: {
      'de': absoluteUrl('/de'),
      'en': absoluteUrl('/en'),
      'zh-Hans': absoluteUrl('/zh'),
      'fr': absoluteUrl('/fr'),
      'es': absoluteUrl('/es'),
      'pt': absoluteUrl('/pt'),
      'ja': absoluteUrl('/ja'),
      'ko': absoluteUrl('/ko'),
      'x-default': BRAND.siteUrl,
    },
  },

  // Verification
  verification: {
    google: 'tpfZ2qy_2c2rvsuf2_rOrsq5yiBxyLfazfnhdrzZ_Zg',
  },
}

export const siteViewport = {
  width: 'device-width' as const,
  initialScale: 1,
  viewportFit: 'cover' as const,
};
