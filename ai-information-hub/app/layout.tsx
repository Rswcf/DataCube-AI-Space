import React from "react"
import type { Metadata } from 'next'
import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SettingsProvider } from '@/lib/settings-context'
import { OrganizationSchema, WebsiteSchema, FAQSchema } from '@/components/structured-data'
import './globals.css'

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const instrumentSerif = Instrument_Serif({ subsets: ["latin"], weight: "400", variable: "--font-display" });

export const metadata: Metadata = {
  metadataBase: new URL('https://www.datacubeai.space'),
  title: {
    default: 'Data Cube AI | Daily AI News & Insights',
    template: '%s | Data Cube AI',
  },
  description: 'Bilingual (DE/EN) daily AI news aggregator. Tech breakthroughs, investment news, practical tips, and curated YouTube videos.',
  keywords: ['AI news', 'artificial intelligence', 'machine learning', 'AI investment', 'AI tips', 'KI Nachrichten', 'daily AI digest', 'AI trends', 'tech news'],
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
    alternateLocale: 'de_DE',
    url: 'https://www.datacubeai.space',
    siteName: 'Data Cube AI',
    title: 'Data Cube AI | Daily AI News & Insights',
    description: 'Curated AI news, investment updates, and practical tips - updated daily in German and English.',
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

  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: 'Data Cube AI | Daily AI News',
    description: 'Your daily dose of AI news, investments, and tips.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Data Cube AI – Where AI meets human insight',
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

  // Alternates for bilingual
  alternates: {
    canonical: 'https://www.datacubeai.space',
    languages: {
      'en': 'https://www.datacubeai.space/en',
      'de': 'https://www.datacubeai.space/de',
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://api-production-3ee5.up.railway.app" />
        <link rel="preconnect" href="https://img.youtube.com" />
        <link rel="dns-prefetch" href="https://www.youtube.com" />
        <OrganizationSchema />
        <WebsiteSchema />
        <FAQSchema />
        <link rel="alternate" type="application/atom+xml" title="Data Cube AI (DE)" href="/feed.xml?lang=de" />
        <link rel="alternate" type="application/atom+xml" title="Data Cube AI (EN)" href="/feed.xml?lang=en" />
      </head>
      <body className={`${geist.variable} ${geistMono.variable} ${instrumentSerif.variable} font-sans antialiased`}>
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
