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
    title: 'Data Cube AI | Tägliche KI-News & Einblicke',
    description: 'Täglicher KI-News-Aggregator: Künstliche Intelligenz Durchbrüche, KI-Investment-Signale, praktische KI-Tipps und kuratierte Videos – kostenlos in 8 Sprachen. Ihr wöchentlicher KI-Überblick.',
    ogDescription: 'Kuratierte KI-News, Investments und Tipps – täglich aktualisiert in 8 Sprachen.',
    ogAlt: 'Data Cube AI – Wo KI auf menschliche Einsicht trifft',
  },
  en: {
    title: 'Data Cube AI | Daily AI News & Insights',
    description: 'Free daily AI news aggregator: generative AI breakthroughs, LLM updates, AI investment signals, and practical tips curated from 40+ sources in 8 languages.',
    ogDescription: 'Curated AI news, investment updates, and practical tips - updated daily in 8 languages.',
    ogAlt: 'Data Cube AI – Where AI meets human insight',
  },
  zh: {
    title: 'Data Cube AI | 每日 AI 新闻与洞察',
    description: '免费多语言AI新闻聚合：生成式AI突破、大模型动态、AI投资信号和实用技巧 – 每日从40+来源精选，支持8种语言。',
    ogDescription: '精选 AI 新闻、投资动态和实用技巧 — 每日更新，支持 8 种语言。',
    ogAlt: 'Data Cube AI – AI 与人类智慧的交汇',
  },
  fr: {
    title: 'Data Cube AI | Actualités IA quotidiennes',
    description: "Agrégateur gratuit d'actualités IA : percées en intelligence artificielle, actualités LLM, signaux d'investissement IA et conseils pratiques – 8 langues, mis à jour quotidiennement.",
    ogDescription: 'Actualités IA, investissements et astuces — mis à jour quotidiennement en 8 langues.',
    ogAlt: "Data Cube AI – Où l'IA rencontre l'intelligence humaine",
  },
  es: {
    title: 'Data Cube AI | Noticias diarias de IA',
    description: 'Agregador gratuito de noticias de IA: avances en inteligencia artificial, noticias de LLM, señales de inversión en IA y consejos prácticos – 8 idiomas, actualizado diariamente.',
    ogDescription: 'Noticias de IA, inversiones y consejos — actualizados diariamente en 8 idiomas.',
    ogAlt: 'Data Cube AI – Donde la IA se encuentra con la inteligencia humana',
  },
  pt: {
    title: 'Data Cube AI | Notícias diárias de IA',
    description: 'Agregador gratuito de notícias de IA: avanços em inteligência artificial, atualizações de LLM, sinais de investimento em IA e dicas práticas – 8 idiomas, atualizado diariamente.',
    ogDescription: 'Notícias de IA, investimentos e dicas — atualizados diariamente em 8 idiomas.',
    ogAlt: 'Data Cube AI – Onde a IA encontra a inteligência humana',
  },
  ja: {
    title: 'Data Cube AI | 毎日のAIニュースとインサイト',
    description: '無料多言語AIニュースアグリゲーター：生成AI・LLM最新情報、AI投資シグナル、実践ヒント – 40以上のソースから毎日厳選、8言語対応。',
    ogDescription: '厳選されたAIニュース、投資情報、実践ティップス — 8言語で毎日更新。',
    ogAlt: 'Data Cube AI – AIと人間の知恵が出会う場所',
  },
  ko: {
    title: 'Data Cube AI | 매일 AI 뉴스 & 인사이트',
    description: '무료 다국어 AI 뉴스 애그리게이터: 생성형 AI 돌파구, LLM 최신 뉴스, AI 투자 신호, 실용 팁 – 40개 이상 소스에서 매일 엄선, 8개 언어 지원.',
    ogDescription: '엄선된 AI 뉴스, 투자 정보, 실용 팁 — 8개 언어로 매일 업데이트.',
    ogAlt: 'Data Cube AI – AI와 인간의 통찰력이 만나는 곳',
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
