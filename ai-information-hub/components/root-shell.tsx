import React from 'react'
import { Geist, Geist_Mono, Newsreader } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SettingsProvider } from '@/lib/settings-context'
import { toBcp47, type AppLanguage } from '@/lib/i18n'
import { OrganizationSchema, WebsiteSchema, FAQSchema } from '@/components/structured-data'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })
const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-newsreader',
  display: 'swap',
})

/**
 * The single <html>/<body> shell behind both root layouts:
 *
 *   app/(site)/layout.tsx              language-neutral routes, lang="en"
 *   app/(localized)/[lang]/layout.tsx  /{lang}/... routes, lang from the URL
 *
 * Two root layouts exist so that `lang` can come from a route param. The
 * previous single root layout read it from an `x-lang` request header via
 * headers(), which silently opted every page into dynamic rendering — the
 * whole site ran as uncached function invocations
 * (see .ai-collab/context/vercel-cost-analysis-2026-09.md, root cause A).
 * Nothing in here may touch request-time APIs (headers, cookies,
 * searchParams) or the pages lose their ISR cache again.
 */
export function RootShell({ lang, children }: { lang: AppLanguage; children: React.ReactNode }) {
  return (
    <html lang={toBcp47(lang)} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://api-production-3ee5.up.railway.app" />
        <link rel="preconnect" href="https://img.youtube.com" />
        <link rel="dns-prefetch" href="https://www.youtube.com" />
        <OrganizationSchema />
        <WebsiteSchema />
        <FAQSchema lang={lang} />
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
        <SettingsProvider initialLanguage={lang}>
          {children}
        </SettingsProvider>
        <Analytics />
      </body>
    </html>
  )
}
