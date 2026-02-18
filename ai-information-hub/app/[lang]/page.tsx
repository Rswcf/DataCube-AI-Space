import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { HomePageContent } from '../page'
import { isSupportedLanguage, SUPPORTED_LANGUAGES, toBcp47 } from '@/lib/i18n'

export const revalidate = 3600

type Props = {
  params: Promise<{ lang: string }>
}

const META: Record<string, { title: string; description: string; ogDescription: string; ogAlt: string }> = {
  de: {
    title: 'Data Cube AI | T\u00e4gliche KI-News & Einblicke',
    description: 'Mehrsprachiger t\u00e4glicher KI-News-Aggregator. Technologie-Durchbr\u00fcche, Investment-News, praktische Tipps und kuratierte YouTube-Videos.',
    ogDescription: 'Kuratierte KI-News, Investments und Tipps \u2013 t\u00e4glich aktualisiert in 8 Sprachen.',
    ogAlt: 'Data Cube AI \u2013 Wo KI auf menschliche Einsicht trifft',
  },
  en: {
    title: 'Data Cube AI | Daily AI News & Insights',
    description: 'Multilingual daily AI news aggregator. Tech breakthroughs, investment news, practical tips, and curated YouTube videos.',
    ogDescription: 'Curated AI news, investment updates, and practical tips - updated daily in 8 languages.',
    ogAlt: 'Data Cube AI \u2013 Where AI meets human insight',
  },
  zh: {
    title: 'Data Cube AI | \u6bcf\u65e5 AI \u65b0\u95fb\u4e0e\u6d1e\u5bdf',
    description: '\u591a\u8bed\u8a00\u6bcf\u65e5 AI \u65b0\u95fb\u805a\u5408\u5668\u3002\u6280\u672f\u7a81\u7834\u3001\u6295\u8d44\u65b0\u95fb\u3001\u5b9e\u7528\u6280\u5de7\u548c\u7cbe\u9009 YouTube \u89c6\u9891\u3002',
    ogDescription: '\u7cbe\u9009 AI \u65b0\u95fb\u3001\u6295\u8d44\u52a8\u6001\u548c\u5b9e\u7528\u6280\u5de7 \u2014 \u6bcf\u65e5\u66f4\u65b0\uff0c\u652f\u6301 8 \u79cd\u8bed\u8a00\u3002',
    ogAlt: 'Data Cube AI \u2013 AI \u4e0e\u4eba\u7c7b\u667a\u6167\u7684\u4ea4\u6c47',
  },
  fr: {
    title: 'Data Cube AI | Actualit\u00e9s IA quotidiennes',
    description: 'Agr\u00e9gateur d\u2019actualit\u00e9s IA quotidien multilingue. Perc\u00e9es technologiques, investissements, astuces pratiques et vid\u00e9os YouTube s\u00e9lectionn\u00e9es.',
    ogDescription: 'Actualit\u00e9s IA, investissements et astuces \u2014 mis \u00e0 jour quotidiennement en 8 langues.',
    ogAlt: 'Data Cube AI \u2013 O\u00f9 l\u2019IA rencontre l\u2019intelligence humaine',
  },
  es: {
    title: 'Data Cube AI | Noticias diarias de IA',
    description: 'Agregador diario multilingüe de noticias de IA. Avances tecnol\u00f3gicos, noticias de inversiones, consejos pr\u00e1cticos y v\u00eddeos seleccionados de YouTube.',
    ogDescription: 'Noticias de IA, inversiones y consejos \u2014 actualizados diariamente en 8 idiomas.',
    ogAlt: 'Data Cube AI \u2013 Donde la IA se encuentra con la inteligencia humana',
  },
  pt: {
    title: 'Data Cube AI | Not\u00edcias di\u00e1rias de IA',
    description: 'Agregador di\u00e1rio multilingue de not\u00edcias de IA. Avan\u00e7os tecnol\u00f3gicos, not\u00edcias de investimentos, dicas pr\u00e1ticas e v\u00eddeos selecionados do YouTube.',
    ogDescription: 'Not\u00edcias de IA, investimentos e dicas \u2014 atualizados diariamente em 8 idiomas.',
    ogAlt: 'Data Cube AI \u2013 Onde a IA encontra a intelig\u00eancia humana',
  },
  ja: {
    title: 'Data Cube AI | \u6bcf\u65e5\u306eAI\u30cb\u30e5\u30fc\u30b9\u3068\u30a4\u30f3\u30b5\u30a4\u30c8',
    description: '\u591a\u8a00\u8a9e\u5bfe\u5fdc\u306e\u6bcf\u65e5\u306eAI\u30cb\u30e5\u30fc\u30b9\u30a2\u30b0\u30ea\u30b2\u30fc\u30bf\u30fc\u3002\u6280\u8853\u7684\u30d6\u30ec\u30fc\u30af\u30b9\u30eb\u30fc\u3001\u6295\u8cc7\u30cb\u30e5\u30fc\u30b9\u3001\u5b9f\u8df5\u7684\u306a\u30c6\u30a3\u30c3\u30d7\u30b9\u3001\u53b3\u9078\u3055\u308c\u305fYouTube\u52d5\u753b\u3002',
    ogDescription: '\u53b3\u9078\u3055\u308c\u305fAI\u30cb\u30e5\u30fc\u30b9\u3001\u6295\u8cc7\u60c5\u5831\u3001\u5b9f\u8df5\u30c6\u30a3\u30c3\u30d7\u30b9 \u2014 8\u8a00\u8a9e\u3067\u6bcf\u65e5\u66f4\u65b0\u3002',
    ogAlt: 'Data Cube AI \u2013 AI\u3068\u4eba\u9593\u306e\u77e5\u6075\u304c\u51fa\u4f1a\u3046\u5834\u6240',
  },
  ko: {
    title: 'Data Cube AI | \ub9e4\uc77c AI \ub274\uc2a4 & \uc778\uc0ac\uc774\ud2b8',
    description: '\ub2e4\uad6d\uc5b4 \uc77c\uc77c AI \ub274\uc2a4 \uc560\uadf8\ub9ac\uac8c\uc774\ud130. \uae30\uc220 \ub3cc\ud30c\uad6c, \ud22c\uc790 \ub274\uc2a4, \uc2e4\uc6a9 \ud301, \uc5c4\uc120\ub41c YouTube \ub3d9\uc601\uc0c1.',
    ogDescription: '\uc5c4\uc120\ub41c AI \ub274\uc2a4, \ud22c\uc790 \uc815\ubcf4, \uc2e4\uc6a9 \ud301 \u2014 8\uac1c \uc5b8\uc5b4\ub85c \ub9e4\uc77c \uc5c5\ub370\uc774\ud2b8.',
    ogAlt: 'Data Cube AI \u2013 AI\uc640 \uc778\uac04\uc758 \ud1b5\ucc30\ub825\uc774 \ub9cc\ub098\ub294 \uacf3',
  },
}

export async function generateStaticParams() {
  return SUPPORTED_LANGUAGES.map((lang) => ({ lang }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params
  if (!isSupportedLanguage(lang)) return {}

  const localizedHome = `https://www.datacubeai.space/${lang}`
  const meta = META[lang] || META.en

  const hreflangEntries: Record<string, string> = { 'x-default': 'https://www.datacubeai.space' }
  for (const code of SUPPORTED_LANGUAGES) {
    hreflangEntries[toBcp47(code)] = `https://www.datacubeai.space/${code}`
  }

  return {
    title: { absolute: meta.title },
    description: meta.description,
    alternates: {
      canonical: localizedHome,
      languages: hreflangEntries,
    },
    openGraph: {
      title: meta.title,
      description: meta.ogDescription,
      url: localizedHome,
      images: [
        {
          url: '/og-image.jpg',
          width: 1200,
          height: 630,
          alt: meta.ogAlt,
        },
      ],
    },
  }
}

export default async function LocalizedHomePage({ params }: Props) {
  const { lang } = await params
  if (!isSupportedLanguage(lang)) notFound()

  return HomePageContent({ language: lang })
}
