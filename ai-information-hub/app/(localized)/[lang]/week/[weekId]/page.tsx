import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import LegacyWeekPage, {
  generateMetadata as generateLegacyMetadata,
  generateStaticParams as generateLegacyStaticParams,
} from '@/app/(site)/week/[weekId]/page'
import { isSupportedLanguage, SUPPORTED_LANGUAGES, toBcp47 } from '@/lib/i18n'
import { absoluteUrl } from '@/lib/brand'

export const revalidate = 3600

type Props = {
  params: Promise<{ lang: string; weekId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, weekId } = await params
  if (!isSupportedLanguage(lang)) return {}

  const baseMeta = await generateLegacyMetadata({
    params: Promise.resolve({ weekId }),
    searchParams: Promise.resolve({ lang }),
  })

  // Override hreflang alternates to include all 8 languages
  const hreflangEntries: Record<string, string> = {
    'x-default': absoluteUrl(`/en/week/${weekId}`),
  }
  for (const code of SUPPORTED_LANGUAGES) {
    hreflangEntries[toBcp47(code)] = absoluteUrl(`/${code}/week/${weekId}`)
  }

  return {
    ...baseMeta,
    alternates: {
      canonical: absoluteUrl(`/${lang}/week/${weekId}`),
      languages: hreflangEntries,
    },
  }
}

export async function generateStaticParams() {
  const periods = (await generateLegacyStaticParams()) as { weekId: string }[]
  return periods.flatMap((period) =>
    SUPPORTED_LANGUAGES.map((lang) => ({ lang, weekId: period.weekId }))
  )
}

export default async function LocalizedWeekPage({ params }: Props) {
  const { lang, weekId } = await params
  if (!isSupportedLanguage(lang)) notFound()

  return LegacyWeekPage({
    params: Promise.resolve({ weekId }),
    searchParams: Promise.resolve({ lang }),
  })
}
