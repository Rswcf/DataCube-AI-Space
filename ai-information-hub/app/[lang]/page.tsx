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

  const isDE = lang === 'de'

  return {
    title: {
      absolute: isDE
        ? 'DataCube AI | Tägliche KI-News & Einblicke'
        : 'DataCube AI | Daily AI News & Insights',
    },
    description: isDE
      ? 'Zweisprachiger (DE/EN) täglicher KI-News-Aggregator. Technologie-Durchbrüche, Investment-News, praktische Tipps und kuratierte YouTube-Videos.'
      : 'Bilingual (DE/EN) daily AI news aggregator. Tech breakthroughs, investment news, practical tips, and curated YouTube videos.',
    alternates: {
      canonical: localizedHome,
      languages: {
        de: 'https://www.datacubeai.space/de',
        en: 'https://www.datacubeai.space/en',
        'x-default': 'https://www.datacubeai.space',
      },
    },
    openGraph: {
      title: isDE
        ? 'DataCube AI | Tägliche KI-News & Einblicke'
        : 'DataCube AI | Daily AI News & Insights',
      description: isDE
        ? 'Kuratierte KI-News, Investments und Tipps – täglich aktualisiert auf Deutsch und Englisch.'
        : 'Curated AI news, investment updates, and practical tips - updated daily in German and English.',
      url: localizedHome,
    },
  }
}

export default async function LocalizedHomePage({ params }: Props) {
  const { lang } = await params
  if (!isSupportedLanguage(lang)) notFound()

  return HomePageContent({ language: lang })
}
