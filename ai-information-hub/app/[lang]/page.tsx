import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { HomePageContent } from '../page'
import { isSupportedLanguage } from '@/lib/i18n'

export const revalidate = 3600

type Props = {
  params: Promise<{ lang: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params
  if (!isSupportedLanguage(lang)) return {}

  const localizedHome = `https://www.datacubeai.space/${lang}`

  return {
    alternates: {
      canonical: localizedHome,
      languages: {
        de: 'https://www.datacubeai.space/de',
        en: 'https://www.datacubeai.space/en',
        'x-default': 'https://www.datacubeai.space',
      },
    },
    openGraph: {
      url: localizedHome,
    },
  }
}

export default async function LocalizedHomePage({ params }: Props) {
  const { lang } = await params
  if (!isSupportedLanguage(lang)) notFound()

  return HomePageContent({ language: lang })
}
