import type { ReactNode } from 'react'
import { RootShell } from '@/components/root-shell'
import { siteMetadata, siteViewport } from '@/lib/site-metadata'
import '../globals.css'

export const metadata = siteMetadata
export const viewport = siteViewport

// Root layout for language-neutral routes: /, /funding, the trust and legal
// pages, /login, /unsubscribe and the legacy /week + /topic paths (which the
// middleware redirects to /en/...). Localized routes have their own root
// layout in app/(localized)/[lang]/ — see components/root-shell.tsx for why.
export default function SiteRootLayout({ children }: { children: ReactNode }) {
  return <RootShell lang="en">{children}</RootShell>
}
