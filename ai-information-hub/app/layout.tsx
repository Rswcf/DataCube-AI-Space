import React from "react"
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { Geist, Geist_Mono, Newsreader } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SettingsProvider } from '@/lib/settings-context'
import { isSupportedLanguage, toBcp47 } from '@/lib/i18n'
import type { AppLanguage } from '@/lib/i18n'
import { OrganizationSchema, WebsiteSchema, FAQSchema } from '@/components/structured-data'
import './globals.css'

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  metadataBase: new URL('https://www.datacubeai.space'),
  title: {
    default: 'Data Cube AI | Daily AI News, Investment Signals & Practical Tips',
    template: '%s | Data Cube AI',
  },
  description: 'Free multilingual AI news aggregator covering generative AI breakthroughs, LLM updates, AI investment signals, and practical tips — curated daily from 40+ sources in 8 languages.',
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
  authors: [{ name: 'Data Cube Team' }],
  creator: 'Data Cube AI',
  publisher: 'Data Cube AI',
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
    url: 'https://www.datacubeai.space',
    siteName: 'Data Cube AI',
    title: 'Data Cube AI | Daily AI News & Insights',
    description: 'Free AI news aggregator: generative AI breakthroughs, investment signals, and practical tips – curated daily from 40+ sources in 8 languages.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Data Cube AI – Where AI meets human insight',
        type: 'image/jpeg',
      },
    ],
  },

  // Twitter Card — no static images so child pages' openGraph.images propagate automatically
  twitter: {
    card: 'summary_large_image',
    title: 'Data Cube AI | Daily AI News',
    description: 'Daily AI news digest: tech breakthroughs, investment signals, and practical tips – free in 8 languages.',
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
    canonical: 'https://www.datacubeai.space',
    languages: {
      'de': 'https://www.datacubeai.space/de',
      'en': 'https://www.datacubeai.space/en',
      'zh-Hans': 'https://www.datacubeai.space/zh',
      'fr': 'https://www.datacubeai.space/fr',
      'es': 'https://www.datacubeai.space/es',
      'pt': 'https://www.datacubeai.space/pt',
      'ja': 'https://www.datacubeai.space/ja',
      'ko': 'https://www.datacubeai.space/ko',
      'x-default': 'https://www.datacubeai.space',
    },
  },

  // Verification
  verification: {
    google: 'tpfZ2qy_2c2rvsuf2_rOrsq5yiBxyLfazfnhdrzZ_Zg',
  },
}

export const viewport = {
  viewportFit: 'cover' as const,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const headersList = await headers()
  const rawLang = headersList.get('x-lang') || 'de'
  const htmlLang = isSupportedLanguage(rawLang) ? toBcp47(rawLang as AppLanguage) : rawLang

  return (
    <html lang={htmlLang} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://api-production-3ee5.up.railway.app" />
        <link rel="preconnect" href="https://img.youtube.com" />
        <link rel="dns-prefetch" href="https://www.youtube.com" />
        <OrganizationSchema />
        <WebsiteSchema />
        <FAQSchema lang={rawLang} />
        {['de', 'en', 'zh', 'fr', 'es', 'pt', 'ja', 'ko'].map((l) => (
          <link key={l} rel="alternate" type="application/atom+xml" title={`Data Cube AI (${l.toUpperCase()})`} href={`/feed.xml?lang=${l}`} />
        ))}
      </head>
      <body className={`${geist.variable} ${geistMono.variable} ${newsreader.variable} font-sans antialiased`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg"
        >
          Skip to content
        </a>
        <SettingsProvider>
          {children}
        </SettingsProvider>
        <Analytics />
      </body>
    </html>
  )
}
