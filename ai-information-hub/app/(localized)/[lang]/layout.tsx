import type { ReactNode } from 'react'
import { RootShell } from '@/components/root-shell'
import { isSupportedLanguage } from '@/lib/i18n'
import { siteMetadata, siteViewport } from '@/lib/site-metadata'
import '../../globals.css'

export const metadata = siteMetadata
export const viewport = siteViewport

// Root layout for every /{lang}/... route. `lang` is a route param, so this
// stays statically renderable and the pages below keep their ISR cache.
// Unsupported language segments are 404ed by the pages themselves; the shell
// only needs a sane <html lang> for that response.
export default async function LocalizedRootLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  return <RootShell lang={isSupportedLanguage(lang) ? lang : 'en'}>{children}</RootShell>
}
