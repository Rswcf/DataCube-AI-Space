import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import LegacyWeekPage, {
  generateMetadata as generateLegacyMetadata,
  generateStaticParams as generateLegacyStaticParams,
} from '../../../week/[weekId]/page'
import { isSupportedLanguage } from '@/lib/i18n'

export const revalidate = 3600

type Props = {
  params: Promise<{ lang: string; weekId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, weekId } = await params
  if (!isSupportedLanguage(lang)) return {}

  return generateLegacyMetadata({
    params: Promise.resolve({ weekId }),
    searchParams: Promise.resolve({ lang }),
  })
}

export async function generateStaticParams() {
  const periods = (await generateLegacyStaticParams()) as { weekId: string }[]
  return periods.flatMap((period) => [
    { lang: 'de', weekId: period.weekId },
    { lang: 'en', weekId: period.weekId },
  ])
}

export default async function LocalizedWeekPage({ params }: Props) {
  const { lang, weekId } = await params
  if (!isSupportedLanguage(lang)) notFound()

  return LegacyWeekPage({
    params: Promise.resolve({ weekId }),
    searchParams: Promise.resolve({ lang }),
  })
}
