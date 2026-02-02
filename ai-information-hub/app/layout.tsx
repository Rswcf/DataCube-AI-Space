import React from "react"
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SettingsProvider } from '@/lib/settings-context'
import { OrganizationSchema, WebsiteSchema, FAQSchema } from '@/components/structured-data'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL('https://www.datacubeai.space'),
  title: {
    default: 'DataCube AI | Weekly AI News & Insights',
    template: '%s | DataCube AI',
  },
  description: 'Bilingual (DE/EN) weekly AI news aggregator. Tech breakthroughs, investment news, practical tips, and curated YouTube videos.',
  keywords: ['AI news', 'artificial intelligence', 'machine learning', 'AI investment', 'AI tips', 'KI Nachrichten', 'weekly AI digest', 'AI trends', 'tech news'],
  authors: [{ name: 'DataCube Team' }],
  creator: 'DataCube AI',
  publisher: 'DataCube AI',
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

  // Open Graph - uses dynamic opengraph-image.tsx
  openGraph: {
    type: 'website',
    locale: 'en_US',
    alternateLocale: 'de_DE',
    url: 'https://www.datacubeai.space',
    siteName: 'DataCube AI',
    title: 'DataCube AI | Weekly AI News & Insights',
    description: 'Curated AI news, investment updates, and practical tips - updated weekly in German and English.',
  },

  // Twitter - uses dynamic opengraph-image.tsx
  twitter: {
    card: 'summary_large_image',
    title: 'DataCube AI | Weekly AI News',
    description: 'Your weekly dose of AI news, investments, and tips.',
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
      'en': 'https://www.datacubeai.space/?lang=en',
      'de': 'https://www.datacubeai.space/?lang=de',
    },
  },

  // Verification
  verification: {
    google: 'tpfZ2qy_2c2rvsuf2_rOrsq5yiBxyLfazfnhdrzZ_Zg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <OrganizationSchema />
        <WebsiteSchema />
        <FAQSchema />
      </head>
      <body className={`font-sans antialiased`}>
        <SettingsProvider>
          {children}
        </SettingsProvider>
        <Analytics />
      </body>
    </html>
  )
}
