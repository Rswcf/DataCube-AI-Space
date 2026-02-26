import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { SUPPORTED_LANGUAGES, isSupportedLanguage, toBcp47 } from '@/lib/i18n'
import { TrendingUp, BarChart3, Briefcase, ArrowRight, Globe, Cpu, Code2, Languages } from 'lucide-react'

export const revalidate = 86400

const BASE_URL = 'https://www.datacubeai.space'

type Props = {
  params: Promise<{ lang: string }>
}

type L = Record<string, string>
const t = (map: L, lang: string) => map[lang] || map.en

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

const META_TITLES: L = {
  de: 'KI-Aktien-Tracker \u2014 Echtzeit-Kurse f\u00fcr KI-Unternehmen | DataCube AI',
  en: 'AI Stock Tracker \u2014 Real-Time AI Company Stock Data | DataCube AI',
  zh: 'AI\u80a1\u7968\u8ffd\u8e2a\u5668 \u2014 AI\u516c\u53f8\u5b9e\u65f6\u80a1\u4ef7\u6570\u636e | DataCube AI',
  fr: 'Tracker Actions IA \u2014 Donn\u00e9es Boursi\u00e8res IA en Temps R\u00e9el | DataCube AI',
  es: 'Rastreador Acciones IA \u2014 Datos Burs\u00e1tiles IA en Tiempo Real | DataCube AI',
  pt: 'Rastreador A\u00e7\u00f5es IA \u2014 Dados de A\u00e7\u00f5es IA em Tempo Real | DataCube AI',
  ja: 'AI\u682a\u5f0f\u30c8\u30e9\u30c3\u30ab\u30fc \u2014 AI\u4f01\u696d\u306e\u30ea\u30a2\u30eb\u30bf\u30a4\u30e0\u682a\u4fa1\u30c7\u30fc\u30bf | DataCube AI',
  ko: 'AI \uc8fc\uc2dd \ucd94\uc801\uae30 \u2014 AI \uae30\uc5c5 \uc2e4\uc2dc\uac04 \uc8fc\uac00 \ub370\uc774\ud130 | DataCube AI',
}

const META_DESCRIPTIONS: L = {
  de: 'Verfolgen Sie KI-Aktienkurse in Echtzeit mit DataCube AI. Finanzierungsrunden, M&A-Deals, Aktienbewegungen der f\u00fchrenden KI-Unternehmen. Kostenlos.',
  en: 'Track AI company stocks in real-time with DataCube AI. Funding rounds, M&A deals, stock movements of leading AI companies. Powered by Polygon.io. Free.',
  zh: '\u4f7f\u7528DataCube AI\u5b9e\u65f6\u8ffd\u8e2aAI\u516c\u53f8\u80a1\u7968\u3002\u878d\u8d44\u8f6e\u6b21\u3001\u5e76\u8d2d\u4ea4\u6613\u3001\u9886\u5148AI\u4f01\u4e1a\u7684\u80a1\u4ef7\u53d8\u52a8\u3002\u7531Polygon.io\u63d0\u4f9b\u6570\u636e\u3002\u514d\u8d39\u3002',
  fr: 'Suivez les actions des entreprises IA en temps r\u00e9el avec DataCube AI. Lev\u00e9es de fonds, M&A, mouvements boursiers des leaders de l\u2019IA. Gratuit.',
  es: 'Rastree acciones de empresas IA en tiempo real con DataCube AI. Rondas de financiaci\u00f3n, M&A, movimientos burs\u00e1tiles de l\u00edderes en IA. Gratuito.',
  pt: 'Acompanhe a\u00e7\u00f5es de empresas IA em tempo real com DataCube AI. Rodadas de financiamento, M&A, movimentos de a\u00e7\u00f5es dos l\u00edderes em IA. Gratuito.',
  ja: 'DataCube AI\u3067AI\u4f01\u696d\u306e\u682a\u4fa1\u3092\u30ea\u30a2\u30eb\u30bf\u30a4\u30e0\u3067\u8ffd\u8de1\u3002\u8cc7\u91d1\u8abf\u9054\u3001M&A\u3001\u4e3b\u8981AI\u4f01\u696d\u306e\u682a\u4fa1\u5909\u52d5\u3002Polygon.io\u642d\u8f09\u3002\u7121\u6599\u3002',
  ko: 'DataCube AI\ub85c AI \uae30\uc5c5 \uc8fc\uc2dd\uc744 \uc2e4\uc2dc\uac04 \ucd94\uc801\ud558\uc138\uc694. \uc790\uae08 \uc870\ub2ec, M&A, \uc8fc\uc694 AI \uae30\uc5c5\uc758 \uc8fc\uac00 \ubcc0\ub3d9. Polygon.io \uc9c0\uc6d0. \ubb34\ub8cc.',
}

export async function generateStaticParams() {
  return SUPPORTED_LANGUAGES.map((lang) => ({ lang }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params
  if (!isSupportedLanguage(lang)) return {}

  const pageUrl = `${BASE_URL}/${lang}/tools/ai-stock-tracker`

  const hreflangEntries: Record<string, string> = {
    'x-default': `${BASE_URL}/en/tools/ai-stock-tracker`,
  }
  for (const code of SUPPORTED_LANGUAGES) {
    hreflangEntries[toBcp47(code)] = `${BASE_URL}/${code}/tools/ai-stock-tracker`
  }

  return {
    title: { absolute: t(META_TITLES, lang) },
    description: t(META_DESCRIPTIONS, lang),
    alternates: {
      canonical: pageUrl,
      languages: hreflangEntries,
    },
    openGraph: {
      title: t(META_TITLES, lang),
      description: t(META_DESCRIPTIONS, lang),
      url: pageUrl,
      images: [
        {
          url: '/og-image.jpg',
          width: 1200,
          height: 630,
          alt: 'DataCube AI Stock Tracker',
        },
      ],
    },
  }
}

// ---------------------------------------------------------------------------
// Localized strings
// ---------------------------------------------------------------------------

const H1: L = {
  de: 'KI-Aktien-Tracker',
  en: 'AI Stock Tracker',
  zh: 'AI\u80a1\u7968\u8ffd\u8e2a\u5668',
  fr: 'Tracker Actions IA',
  es: 'Rastreador Acciones IA',
  pt: 'Rastreador A\u00e7\u00f5es IA',
  ja: 'AI\u682a\u5f0f\u30c8\u30e9\u30c3\u30ab\u30fc',
  ko: 'AI \uc8fc\uc2dd \ucd94\uc801\uae30',
}

const SUBTITLE: L = {
  de: 'Echtzeit-Aktiendaten f\u00fcr KI-Unternehmen \u2014 NVIDIA, Microsoft, Google, Meta, AMD und mehr. Finanzierungsrunden, M&A-Deals, Marktbewegungen. Powered by Polygon.io.',
  en: 'Real-time stock data for AI companies \u2014 NVIDIA, Microsoft, Google, Meta, AMD, and more. Funding rounds, M&A deals, market movements. Powered by Polygon.io.',
  zh: 'AI\u4f01\u4e1a\u5b9e\u65f6\u80a1\u7968\u6570\u636e \u2014 NVIDIA\u3001\u5fae\u8f6f\u3001\u8c37\u6b4c\u3001Meta\u3001AMD\u7b49\u3002\u878d\u8d44\u8f6e\u6b21\u3001\u5e76\u8d2d\u4ea4\u6613\u3001\u5e02\u573a\u52a8\u6001\u3002\u7531Polygon.io\u63d0\u4f9b\u6570\u636e\u3002',
  fr: 'Donn\u00e9es boursi\u00e8res en temps r\u00e9el pour les entreprises IA \u2014 NVIDIA, Microsoft, Google, Meta, AMD et plus. Lev\u00e9es de fonds, M&A, mouvements de march\u00e9. Aliment\u00e9 par Polygon.io.',
  es: 'Datos burs\u00e1tiles en tiempo real para empresas IA \u2014 NVIDIA, Microsoft, Google, Meta, AMD y m\u00e1s. Rondas de financiaci\u00f3n, M&A, movimientos de mercado. Powered by Polygon.io.',
  pt: 'Dados de a\u00e7\u00f5es em tempo real para empresas IA \u2014 NVIDIA, Microsoft, Google, Meta, AMD e mais. Rodadas de financiamento, M&A, movimentos de mercado. Powered by Polygon.io.',
  ja: 'AI\u4f01\u696d\u306e\u30ea\u30a2\u30eb\u30bf\u30a4\u30e0\u682a\u4fa1\u30c7\u30fc\u30bf \u2014 NVIDIA\u3001Microsoft\u3001Google\u3001Meta\u3001AMD\u306a\u3069\u3002\u8cc7\u91d1\u8abf\u9054\u30e9\u30a6\u30f3\u30c9\u3001M&A\u3001\u5e02\u5834\u52d5\u5411\u3002Polygon.io\u642d\u8f09\u3002',
  ko: 'AI \uae30\uc5c5 \uc2e4\uc2dc\uac04 \uc8fc\uc2dd \ub370\uc774\ud130 \u2014 NVIDIA, Microsoft, Google, Meta, AMD \ub4f1. \uc790\uae08 \uc870\ub2ec \ub77c\uc6b4\ub4dc, M&A, \uc2dc\uc7a5 \ub3d9\ud5a5. Polygon.io \uc9c0\uc6d0.',
}

const CTA_INVESTMENT: L = {
  de: 'Investment-Daten ansehen',
  en: 'View Investment Data',
  zh: '\u67e5\u770b\u6295\u8d44\u6570\u636e',
  fr: "Voir les donn\u00e9es d'investissement",
  es: 'Ver datos de inversi\u00f3n',
  pt: 'Ver dados de investimento',
  ja: '\u6295\u8cc7\u30c7\u30fc\u30bf\u3092\u898b\u308b',
  ko: '\ud22c\uc790 \ub370\uc774\ud130 \ubcf4\uae30',
}

const CTA_API: L = {
  de: 'API entdecken',
  en: 'Explore API',
  zh: '\u63a2\u7d22 API',
  fr: "D\u00e9couvrir l'API",
  es: 'Explorar API',
  pt: 'Explorar API',
  ja: 'API\u3092\u63a2\u7d22',
  ko: 'API \ud0d0\uc0c9',
}

const STAT_REALTIME: L = { de: 'Echtzeit-Daten', en: 'Real-Time Data', zh: '\u5b9e\u65f6\u6570\u636e', fr: 'Donn\u00e9es en temps r\u00e9el', es: 'Datos en tiempo real', pt: 'Dados em tempo real', ja: '\u30ea\u30a2\u30eb\u30bf\u30a4\u30e0\u30c7\u30fc\u30bf', ko: '\uc2e4\uc2dc\uac04 \ub370\uc774\ud130' }
const STAT_POLYGON: L = { de: 'Polygon.io Powered', en: 'Polygon.io Powered', zh: 'Polygon.io \u9a71\u52a8', fr: 'Aliment\u00e9 par Polygon.io', es: 'Powered by Polygon.io', pt: 'Powered by Polygon.io', ja: 'Polygon.io\u642d\u8f09', ko: 'Polygon.io \uc9c0\uc6d0' }
const STAT_AI_FOCUS: L = { de: 'KI-Sektor-Fokus', en: 'AI Sector Focus', zh: 'AI\u884c\u4e1a\u805a\u7126', fr: 'Focus secteur IA', es: 'Enfoque sector IA', pt: 'Foco setor IA', ja: 'AI\u30bb\u30af\u30bf\u30fc\u7279\u5316', ko: 'AI \uc139\ud130 \ud2b9\ud654' }
const STAT_FREE: L = { de: '100% Kostenlos', en: '100% Free', zh: '100% \u514d\u8d39', fr: '100% Gratuit', es: '100% Gratuito', pt: '100% Gratuito', ja: '100% \u7121\u6599', ko: '100% \ubb34\ub8cc' }

// Section B — Tracked Companies
const H2_COMPANIES: L = {
  de: 'Welche KI-Unternehmen k\u00f6nnen Sie verfolgen?',
  en: 'Which AI companies can you track?',
  zh: '\u60a8\u53ef\u4ee5\u8ffd\u8e2a\u54ea\u4e9bAI\u516c\u53f8\uff1f',
  fr: 'Quelles entreprises IA pouvez-vous suivre ?',
  es: '\u00bfQu\u00e9 empresas IA puede rastrear?',
  pt: 'Quais empresas IA voc\u00ea pode rastrear?',
  ja: '\u3069\u306eAI\u4f01\u696d\u3092\u8ffd\u8de1\u3067\u304d\u307e\u3059\u304b\uff1f',
  ko: '\uc5b4\ub5a4 AI \uae30\uc5c5\uc744 \ucd94\uc801\ud560 \uc218 \uc788\ub098\uc694?',
}

const COMPANIES_LEAD: L = {
  de: 'DataCube AI verfolgt die wichtigsten b\u00f6rsennotierten KI-Unternehmen, darunter NVIDIA, Microsoft, Alphabet (Google), Meta, AMD, Tesla und weitere Branchenf\u00fchrer aus den Bereichen Halbleiter, Cloud und KI-Software.',
  en: 'DataCube AI tracks the most important publicly traded AI companies, including NVIDIA, Microsoft, Alphabet (Google), Meta, AMD, Tesla, and other industry leaders in semiconductors, cloud, and AI software.',
  zh: 'DataCube AI\u8ffd\u8e2a\u6700\u91cd\u8981\u7684\u4e0a\u5e02AI\u516c\u53f8\uff0c\u5305\u62ecNVIDIA\u3001\u5fae\u8f6f\u3001Alphabet\uff08\u8c37\u6b4c\uff09\u3001Meta\u3001AMD\u3001\u7279\u65af\u62c9\u4ee5\u53ca\u534a\u5bfc\u4f53\u3001\u4e91\u8ba1\u7b97\u548cAI\u8f6f\u4ef6\u9886\u57df\u7684\u5176\u4ed6\u884c\u4e1a\u9886\u5bfc\u8005\u3002',
  fr: 'DataCube AI suit les entreprises IA cot\u00e9es les plus importantes, notamment NVIDIA, Microsoft, Alphabet (Google), Meta, AMD, Tesla et d\u2019autres leaders dans les semi-conducteurs, le cloud et les logiciels IA.',
  es: 'DataCube AI rastrea las empresas IA cotizadas m\u00e1s importantes, incluyendo NVIDIA, Microsoft, Alphabet (Google), Meta, AMD, Tesla y otros l\u00edderes en semiconductores, nube y software IA.',
  pt: 'DataCube AI rastreia as empresas IA listadas mais importantes, incluindo NVIDIA, Microsoft, Alphabet (Google), Meta, AMD, Tesla e outros l\u00edderes em semicondutores, nuvem e software IA.',
  ja: 'DataCube AI\u306fNVIDIA\u3001Microsoft\u3001Alphabet\uff08Google\uff09\u3001Meta\u3001AMD\u3001Tesla\u306a\u3069\u3001\u534a\u5c0e\u4f53\u3001\u30af\u30e9\u30a6\u30c9\u3001AI\u30bd\u30d5\u30c8\u30a6\u30a7\u30a2\u306e\u696d\u754c\u30ea\u30fc\u30c0\u30fc\u3092\u542b\u3080\u4e3b\u8981\u306a\u4e0a\u5834AI\u4f01\u696d\u3092\u8ffd\u8de1\u3057\u307e\u3059\u3002',
  ko: 'DataCube AI\ub294 NVIDIA, Microsoft, Alphabet(Google), Meta, AMD, Tesla \ub4f1 \ubc18\ub3c4\uccb4, \ud074\ub77c\uc6b0\ub4dc, AI \uc18c\ud504\ud2b8\uc6e8\uc5b4 \ubd84\uc57c\uc758 \uc5c5\uacc4 \ub9ac\ub354\ub97c \ud3ec\ud568\ud55c \uc8fc\uc694 \uc0c1\uc7a5 AI \uae30\uc5c5\uc744 \ucd94\uc801\ud569\ub2c8\ub2e4.',
}

const VIEW_INVESTMENT: L = {
  de: 'Zum Investment-Bereich',
  en: 'View Full Investment Section',
  zh: '\u67e5\u770b\u5b8c\u6574\u6295\u8d44\u677f\u5757',
  fr: "Voir la section investissement compl\u00e8te",
  es: 'Ver secci\u00f3n de inversi\u00f3n completa',
  pt: 'Ver se\u00e7\u00e3o de investimento completa',
  ja: '\u6295\u8cc7\u30bb\u30af\u30b7\u30e7\u30f3\u3092\u898b\u308b',
  ko: '\uc804\uccb4 \ud22c\uc790 \uc139\uc158 \ubcf4\uae30',
}

// Section C — Data Categories
const H2_CATEGORIES: L = {
  de: 'Welche Investment-Daten bietet DataCube AI?',
  en: 'What investment data does DataCube AI provide?',
  zh: 'DataCube AI\u63d0\u4f9b\u54ea\u4e9b\u6295\u8d44\u6570\u636e\uff1f',
  fr: "Quelles donn\u00e9es d'investissement DataCube AI fournit-il ?",
  es: '\u00bfQu\u00e9 datos de inversi\u00f3n proporciona DataCube AI?',
  pt: 'Quais dados de investimento o DataCube AI fornece?',
  ja: 'DataCube AI\u306f\u3069\u306e\u3088\u3046\u306a\u6295\u8cc7\u30c7\u30fc\u30bf\u3092\u63d0\u4f9b\u3057\u307e\u3059\u304b\uff1f',
  ko: 'DataCube AI\ub294 \uc5b4\ub5a4 \ud22c\uc790 \ub370\uc774\ud130\ub97c \uc81c\uacf5\ud558\ub098\uc694?',
}

const CATEGORY_TITLES: L[] = [
  { de: 'Prim\u00e4rmarkt', en: 'Primary Market', zh: '\u4e00\u7ea7\u5e02\u573a', fr: 'March\u00e9 primaire', es: 'Mercado primario', pt: 'Mercado prim\u00e1rio', ja: '\u30d7\u30e9\u30a4\u30de\u30ea\u30fc\u30de\u30fc\u30b1\u30c3\u30c8', ko: '\ud504\ub77c\uc774\uba38\ub9ac \ub9c8\ucf13' },
  { de: 'Sekund\u00e4rmarkt', en: 'Secondary Market', zh: '\u4e8c\u7ea7\u5e02\u573a', fr: 'March\u00e9 secondaire', es: 'Mercado secundario', pt: 'Mercado secund\u00e1rio', ja: '\u30bb\u30ab\u30f3\u30c0\u30ea\u30fc\u30de\u30fc\u30b1\u30c3\u30c8', ko: '\uc138\ucee8\ub354\ub9ac \ub9c8\ucf13' },
  { de: 'M&A', en: 'M&A', zh: '\u5e76\u8d2d', fr: 'M&A', es: 'M&A', pt: 'M&A', ja: 'M&A', ko: 'M&A' },
]

const CATEGORY_DESCRIPTIONS: L[] = [
  {
    de: 'Finanzierungsrunden von Seed bis Late/PE, Unternehmensbewertungen, Investorennamen. Alle Deals im KI-Sektor auf einen Blick.',
    en: 'Funding rounds from Seed to Late/PE, company valuations, investor names. All AI sector deals at a glance.',
    zh: '\u4eceSeed\u5230Late/PE\u7684\u878d\u8d44\u8f6e\u6b21\u3001\u516c\u53f8\u4f30\u503c\u3001\u6295\u8d44\u8005\u540d\u79f0\u3002AI\u884c\u4e1a\u6240\u6709\u4ea4\u6613\u4e00\u89c8\u65e0\u4f59\u3002',
    fr: "Tours de financement de Seed \u00e0 Late/PE, valorisations d'entreprises, noms d'investisseurs. Tous les deals du secteur IA en un coup d'\u0153il.",
    es: 'Rondas de financiaci\u00f3n de Seed a Late/PE, valoraciones de empresas, nombres de inversores. Todos los acuerdos del sector IA de un vistazo.',
    pt: 'Rodadas de financiamento de Seed a Late/PE, avalia\u00e7\u00f5es de empresas, nomes de investidores. Todos os neg\u00f3cios do setor IA em um relance.',
    ja: 'Seed\u304b\u3089Late/PE\u307e\u3067\u306e\u8cc7\u91d1\u8abf\u9054\u30e9\u30a6\u30f3\u30c9\u3001\u4f01\u696d\u8a55\u4fa1\u984d\u3001\u6295\u8cc7\u5bb6\u540d\u3002AI\u30bb\u30af\u30bf\u30fc\u306e\u5168\u30c7\u30a3\u30fc\u30eb\u3092\u4e00\u76ee\u3067\u3002',
    ko: 'Seed\ubd80\ud130 Late/PE\uae4c\uc9c0\uc758 \ud380\ub529 \ub77c\uc6b4\ub4dc, \uae30\uc5c5 \uac00\uce58 \ud3c9\uac00, \ud22c\uc790\uc790\uba85. AI \uc139\ud130\uc758 \ubaa8\ub4e0 \uac70\ub798\ub97c \ud55c\ub208\uc5d0.',
  },
  {
    de: 'Aktienkurse, t\u00e4gliche Ver\u00e4nderungen, Marktkapitalisierung, Performance der f\u00fchrenden KI-Unternehmen. Echtzeit-Daten via Polygon.io.',
    en: 'Stock prices, daily changes, market cap, performance of leading AI companies. Real-time data via Polygon.io.',
    zh: '\u80a1\u4ef7\u3001\u6bcf\u65e5\u53d8\u52a8\u3001\u5e02\u503c\u3001\u9886\u5148AI\u516c\u53f8\u7684\u8868\u73b0\u3002\u901a\u8fc7Polygon.io\u63d0\u4f9b\u5b9e\u65f6\u6570\u636e\u3002',
    fr: "Cours des actions, variations quotidiennes, capitalisation boursi\u00e8re, performance des leaders de l'IA. Donn\u00e9es en temps r\u00e9el via Polygon.io.",
    es: 'Precios de acciones, cambios diarios, capitalizaci\u00f3n de mercado, rendimiento de empresas IA l\u00edderes. Datos en tiempo real v\u00eda Polygon.io.',
    pt: 'Pre\u00e7os de a\u00e7\u00f5es, varia\u00e7\u00f5es di\u00e1rias, capitaliza\u00e7\u00e3o de mercado, desempenho de empresas IA l\u00edderes. Dados em tempo real via Polygon.io.',
    ja: '\u682a\u4fa1\u3001\u65e5\u6b21\u5909\u52d5\u3001\u6642\u4fa1\u7dcf\u984d\u3001\u4e3b\u8981AI\u4f01\u696d\u306e\u30d1\u30d5\u30a9\u30fc\u30de\u30f3\u30b9\u3002Polygon.io\u7d4c\u7531\u306e\u30ea\u30a2\u30eb\u30bf\u30a4\u30e0\u30c7\u30fc\u30bf\u3002',
    ko: '\uc8fc\uac00, \uc77c\uc77c \ubcc0\ub3d9, \uc2dc\uac00\uce4d, \uc8fc\uc694 AI \uae30\uc5c5\uc758 \uc131\uacfc. Polygon.io\ub97c \ud1b5\ud55c \uc2e4\uc2dc\uac04 \ub370\uc774\ud130.',
  },
  {
    de: 'Fusionen und \u00dcbernahmen im KI-Sektor, Deal-Volumen, Branchenkategorien. Verfolgen Sie die Konsolidierung der KI-Industrie.',
    en: 'Mergers and acquisitions in the AI sector, deal values, industry categories. Track the consolidation of the AI industry.',
    zh: 'AI\u884c\u4e1a\u7684\u517c\u5e76\u6536\u8d2d\u3001\u4ea4\u6613\u4ef7\u503c\u3001\u884c\u4e1a\u5206\u7c7b\u3002\u8ffd\u8e2aAI\u4ea7\u4e1a\u7684\u6574\u5408\u8d8b\u52bf\u3002',
    fr: "Fusions et acquisitions dans le secteur IA, valeurs des transactions, cat\u00e9gories d'industrie. Suivez la consolidation de l'industrie IA.",
    es: 'Fusiones y adquisiciones en el sector IA, valores de transacciones, categor\u00edas de industria. Rastree la consolidaci\u00f3n de la industria IA.',
    pt: 'Fus\u00f5es e aquisi\u00e7\u00f5es no setor IA, valores de transa\u00e7\u00f5es, categorias da ind\u00fastria. Acompanhe a consolida\u00e7\u00e3o da ind\u00fastria IA.',
    ja: 'AI\u30bb\u30af\u30bf\u30fc\u306e\u5408\u4f75\u30fb\u8cb7\u53ce\u3001\u53d6\u5f15\u984d\u3001\u696d\u754c\u30ab\u30c6\u30b4\u30ea\u30fc\u3002AI\u7523\u696d\u306e\u7d71\u5408\u3092\u8ffd\u8de1\u3002',
    ko: 'AI \uc139\ud130\uc758 \ud569\ubcd1 \ubc0f \uc778\uc218, \uac70\ub798 \uac00\uce58, \uc0b0\uc5c5 \uce74\ud14c\uace0\ub9ac. AI \uc0b0\uc5c5\uc758 \ud1b5\ud569\uc744 \ucd94\uc801\ud558\uc138\uc694.',
  },
]

// Section D — Features
const H2_FEATURES: L = {
  de: 'Warum DataCube AI f\u00fcr Investment-Tracking nutzen?',
  en: 'Why use DataCube AI for investment tracking?',
  zh: '\u4e3a\u4ec0\u4e48\u4f7f\u7528DataCube AI\u8fdb\u884c\u6295\u8d44\u8ffd\u8e2a\uff1f',
  fr: "Pourquoi utiliser DataCube AI pour le suivi d'investissement ?",
  es: '\u00bfPor qu\u00e9 usar DataCube AI para seguimiento de inversiones?',
  pt: 'Por que usar DataCube AI para rastreamento de investimentos?',
  ja: '\u306a\u305cDataCube AI\u3092\u6295\u8cc7\u30c8\u30e9\u30c3\u30ad\u30f3\u30b0\u306b\u4f7f\u3046\u306e\u304b\uff1f',
  ko: '\uc65c DataCube AI\ub97c \ud22c\uc790 \ucd94\uc801\uc5d0 \uc0ac\uc6a9\ud574\uc57c \ud558\ub098\uc694?',
}

const FEATURE_KEYS = ['realtime', 'aifocus', 'funding', 'ma', 'languages', 'api'] as const

const FEATURE_TITLES: Record<string, L> = {
  realtime: { de: 'Echtzeit-Aktiendaten', en: 'Real-Time Stock Data', zh: '\u5b9e\u65f6\u80a1\u7968\u6570\u636e', fr: 'Donn\u00e9es boursi\u00e8res en temps r\u00e9el', es: 'Datos burs\u00e1tiles en tiempo real', pt: 'Dados de a\u00e7\u00f5es em tempo real', ja: '\u30ea\u30a2\u30eb\u30bf\u30a4\u30e0\u682a\u4fa1\u30c7\u30fc\u30bf', ko: '\uc2e4\uc2dc\uac04 \uc8fc\uc2dd \ub370\uc774\ud130' },
  aifocus: { de: 'KI-Sektor-Fokus', en: 'AI Sector Focus', zh: 'AI\u884c\u4e1a\u805a\u7126', fr: 'Focus secteur IA', es: 'Enfoque sector IA', pt: 'Foco setor IA', ja: 'AI\u30bb\u30af\u30bf\u30fc\u7279\u5316', ko: 'AI \uc139\ud130 \ud2b9\ud654' },
  funding: { de: 'Finanzierungsrunden-Tracking', en: 'Funding Round Tracking', zh: '\u878d\u8d44\u8f6e\u6b21\u8ffd\u8e2a', fr: 'Suivi des tours de financement', es: 'Seguimiento de rondas de financiaci\u00f3n', pt: 'Rastreamento de rodadas de financiamento', ja: '\u8cc7\u91d1\u8abf\u9054\u30e9\u30a6\u30f3\u30c9\u8ffd\u8de1', ko: '\ud380\ub529 \ub77c\uc6b4\ub4dc \ucd94\uc801' },
  ma: { de: 'M&A-Intelligence', en: 'M&A Intelligence', zh: '\u5e76\u8d2d\u60c5\u62a5', fr: 'Intelligence M&A', es: 'Inteligencia M&A', pt: 'Intelig\u00eancia M&A', ja: 'M&A\u30a4\u30f3\u30c6\u30ea\u30b8\u30a7\u30f3\u30b9', ko: 'M&A \uc778\ud154\ub9ac\uc804\uc2a4' },
  languages: { de: '8 Sprachen', en: '8 Language Support', zh: '8\u79cd\u8bed\u8a00\u652f\u6301', fr: '8 Langues', es: '8 Idiomas', pt: '8 Idiomas', ja: '8\u8a00\u8a9e\u5bfe\u5fdc', ko: '8\uac1c \uc5b8\uc5b4 \uc9c0\uc6d0' },
  api: { de: 'API-Zugang', en: 'API Access', zh: 'API\u8bbf\u95ee', fr: "Acc\u00e8s API", es: 'Acceso API', pt: 'Acesso API', ja: 'API\u30a2\u30af\u30bb\u30b9', ko: 'API \uc561\uc138\uc2a4' },
}

const FEATURE_DESCRIPTIONS: Record<string, L> = {
  realtime: {
    de: 'Aktienkurse, Kurs\u00e4nderungen und Marktkapitalisierung via Polygon.io API. Daten werden direkt in die Investment-Karten integriert.',
    en: 'Stock prices, price changes, and market cap via Polygon.io API. Data is integrated directly into investment cards.',
    zh: '\u901a\u8fc7Polygon.io API\u63d0\u4f9b\u80a1\u4ef7\u3001\u4ef7\u683c\u53d8\u52a8\u548c\u5e02\u503c\u3002\u6570\u636e\u76f4\u63a5\u96c6\u6210\u5230\u6295\u8d44\u5361\u7247\u4e2d\u3002',
    fr: "Cours des actions, variations de prix et capitalisation boursi\u00e8re via l'API Polygon.io. Les donn\u00e9es sont int\u00e9gr\u00e9es directement dans les cartes d'investissement.",
    es: 'Precios de acciones, cambios de precio y capitalizaci\u00f3n de mercado v\u00eda API de Polygon.io. Los datos se integran directamente en las tarjetas de inversi\u00f3n.',
    pt: 'Pre\u00e7os de a\u00e7\u00f5es, varia\u00e7\u00f5es de pre\u00e7o e capitaliza\u00e7\u00e3o de mercado via API Polygon.io. Dados integrados diretamente nos cart\u00f5es de investimento.',
    ja: 'Polygon.io API\u7d4c\u7531\u306e\u682a\u4fa1\u3001\u4fa1\u683c\u5909\u52d5\u3001\u6642\u4fa1\u7dcf\u984d\u3002\u30c7\u30fc\u30bf\u306f\u6295\u8cc7\u30ab\u30fc\u30c9\u306b\u76f4\u63a5\u7d71\u5408\u3002',
    ko: 'Polygon.io API\ub97c \ud1b5\ud55c \uc8fc\uac00, \uac00\uaca9 \ubcc0\ub3d9, \uc2dc\uac00\uce4d. \ub370\uc774\ud130\ub294 \ud22c\uc790 \uce74\ub4dc\uc5d0 \uc9c1\uc811 \ud1b5\ud569.',
  },
  aifocus: {
    de: 'Spezialisiert auf den KI-Sektor: Halbleiter, Cloud-Infrastruktur, KI-Software, Robotik und mehr. Keine irrelevanten Branchen.',
    en: 'Specialized in the AI sector: semiconductors, cloud infrastructure, AI software, robotics, and more. No irrelevant industries.',
    zh: '\u4e13\u6ce8AI\u884c\u4e1a\uff1a\u534a\u5bfc\u4f53\u3001\u4e91\u57fa\u7840\u8bbe\u65bd\u3001AI\u8f6f\u4ef6\u3001\u673a\u5668\u4eba\u7b49\u3002\u65e0\u4e0d\u76f8\u5173\u884c\u4e1a\u3002',
    fr: "Sp\u00e9cialis\u00e9 dans le secteur IA : semi-conducteurs, infrastructure cloud, logiciels IA, robotique et plus. Aucune industrie non pertinente.",
    es: 'Especializado en el sector IA: semiconductores, infraestructura cloud, software IA, rob\u00f3tica y m\u00e1s. Sin industrias irrelevantes.',
    pt: 'Especializado no setor IA: semicondutores, infraestrutura cloud, software IA, rob\u00f3tica e mais. Sem ind\u00fastrias irrelevantes.',
    ja: 'AI\u30bb\u30af\u30bf\u30fc\u306b\u7279\u5316\uff1a\u534a\u5c0e\u4f53\u3001\u30af\u30e9\u30a6\u30c9\u30a4\u30f3\u30d5\u30e9\u3001AI\u30bd\u30d5\u30c8\u30a6\u30a7\u30a2\u3001\u30ed\u30dc\u30c6\u30a3\u30af\u30b9\u306a\u3069\u3002\u7121\u95a2\u4fc2\u306a\u696d\u754c\u306a\u3057\u3002',
    ko: 'AI \uc139\ud130 \ud2b9\ud654: \ubc18\ub3c4\uccb4, \ud074\ub77c\uc6b0\ub4dc \uc778\ud504\ub77c, AI \uc18c\ud504\ud2b8\uc6e8\uc5b4, \ub85c\ubd07 \ub4f1. \uad00\ub828 \uc5c6\ub294 \uc0b0\uc5c5 \uc5c6\uc74c.',
  },
  funding: {
    de: 'Verfolgen Sie Seed- bis Late-Stage-Runden mit Investorennamen, Bewertungen und Volumina. Filtern Sie nach Rundenkategorie.',
    en: 'Track Seed to Late-stage rounds with investor names, valuations, and deal sizes. Filter by round category.',
    zh: '\u8ffd\u8e2a\u4eceSeed\u5230Late\u9636\u6bb5\u7684\u878d\u8d44\u8f6e\u6b21\uff0c\u5305\u542b\u6295\u8d44\u8005\u540d\u79f0\u3001\u4f30\u503c\u548c\u89c4\u6a21\u3002\u6309\u8f6e\u6b21\u7c7b\u522b\u7b5b\u9009\u3002',
    fr: 'Suivez les tours de Seed \u00e0 Late-stage avec noms d\u2019investisseurs, valorisations et montants. Filtrez par cat\u00e9gorie de tour.',
    es: 'Rastree rondas de Seed a Late-stage con nombres de inversores, valoraciones y vol\u00famenes. Filtre por categor\u00eda de ronda.',
    pt: 'Acompanhe rodadas de Seed a Late-stage com nomes de investidores, avalia\u00e7\u00f5es e volumes. Filtre por categoria de rodada.',
    ja: 'Seed\u304b\u3089Late\u30b9\u30c6\u30fc\u30b8\u307e\u3067\u306e\u30e9\u30a6\u30f3\u30c9\u3092\u6295\u8cc7\u5bb6\u540d\u3001\u8a55\u4fa1\u984d\u3001\u898f\u6a21\u3068\u3068\u3082\u306b\u8ffd\u8de1\u3002\u30e9\u30a6\u30f3\u30c9\u30ab\u30c6\u30b4\u30ea\u30fc\u3067\u30d5\u30a3\u30eb\u30bf\u30fc\u3002',
    ko: '\ud22c\uc790\uc790\uba85, \uac00\uce58 \ud3c9\uac00, \uac70\ub798 \uaddc\ubaa8\uc640 \ud568\uaed8 Seed\ubd80\ud130 Late \ub2e8\uacc4 \ub77c\uc6b4\ub4dc\ub97c \ucd94\uc801. \ub77c\uc6b4\ub4dc \uce74\ud14c\uace0\ub9ac\ubcc4 \ud544\ud130\ub9c1.',
  },
  ma: {
    de: '\u00dcbernahmen und Fusionen im KI-Sektor mit Deal-Volumen, K\u00e4ufer/Ziel-Informationen und Branchenkategorien.',
    en: 'Acquisitions and mergers in the AI sector with deal values, acquirer/target info, and industry categories.',
    zh: 'AI\u884c\u4e1a\u7684\u6536\u8d2d\u548c\u517c\u5e76\uff0c\u5305\u542b\u4ea4\u6613\u4ef7\u503c\u3001\u6536\u8d2d\u65b9/\u76ee\u6807\u4fe1\u606f\u548c\u884c\u4e1a\u5206\u7c7b\u3002',
    fr: "Acquisitions et fusions dans le secteur IA avec valeurs de transactions, informations acqu\u00e9reur/cible et cat\u00e9gories d'industrie.",
    es: 'Adquisiciones y fusiones en el sector IA con valores de transacciones, informaci\u00f3n comprador/objetivo y categor\u00edas de industria.',
    pt: 'Aquisi\u00e7\u00f5es e fus\u00f5es no setor IA com valores de transa\u00e7\u00f5es, informa\u00e7\u00f5es comprador/alvo e categorias da ind\u00fastria.',
    ja: 'AI\u30bb\u30af\u30bf\u30fc\u306e\u8cb7\u53ce\u30fb\u5408\u4f75\u3001\u53d6\u5f15\u984d\u3001\u8cb7\u53ce\u8005/\u30bf\u30fc\u30b2\u30c3\u30c8\u60c5\u5831\u3001\u696d\u754c\u30ab\u30c6\u30b4\u30ea\u30fc\u3002',
    ko: 'AI \uc139\ud130\uc758 \uc778\uc218 \ubc0f \ud569\ubcd1, \uac70\ub798 \uac00\uce58, \uc778\uc218\uc790/\ub300\uc0c1 \uc815\ubcf4, \uc0b0\uc5c5 \uce74\ud14c\uace0\ub9ac.',
  },
  languages: {
    de: 'Alle Investment-Daten in 8 Sprachen verf\u00fcgbar: Deutsch, Englisch, Chinesisch, Franz\u00f6sisch, Spanisch, Portugiesisch, Japanisch, Koreanisch.',
    en: 'All investment data available in 8 languages: German, English, Chinese, French, Spanish, Portuguese, Japanese, Korean.',
    zh: '\u6240\u6709\u6295\u8d44\u6570\u636e\u63d0\u4f9b8\u79cd\u8bed\u8a00\uff1a\u5fb7\u8bed\u3001\u82f1\u8bed\u3001\u4e2d\u6587\u3001\u6cd5\u8bed\u3001\u897f\u73ed\u7259\u8bed\u3001\u8461\u8404\u7259\u8bed\u3001\u65e5\u8bed\u3001\u97e9\u8bed\u3002',
    fr: "Toutes les donn\u00e9es d'investissement disponibles en 8 langues : allemand, anglais, chinois, fran\u00e7ais, espagnol, portugais, japonais, cor\u00e9en.",
    es: 'Todos los datos de inversi\u00f3n disponibles en 8 idiomas: alem\u00e1n, ingl\u00e9s, chino, franc\u00e9s, espa\u00f1ol, portugu\u00e9s, japon\u00e9s, coreano.',
    pt: 'Todos os dados de investimento dispon\u00edveis em 8 idiomas: alem\u00e3o, ingl\u00eas, chin\u00eas, franc\u00eas, espanhol, portugu\u00eas, japon\u00eas, coreano.',
    ja: '\u5168\u6295\u8cc7\u30c7\u30fc\u30bf\u304c8\u8a00\u8a9e\u3067\u5229\u7528\u53ef\u80fd\uff1a\u30c9\u30a4\u30c4\u8a9e\u3001\u82f1\u8a9e\u3001\u4e2d\u56fd\u8a9e\u3001\u30d5\u30e9\u30f3\u30b9\u8a9e\u3001\u30b9\u30da\u30a4\u30f3\u8a9e\u3001\u30dd\u30eb\u30c8\u30ac\u30eb\u8a9e\u3001\u65e5\u672c\u8a9e\u3001\u97d3\u56fd\u8a9e\u3002',
    ko: '\ubaa8\ub4e0 \ud22c\uc790 \ub370\uc774\ud130\ub97c 8\uac1c \uc5b8\uc5b4\ub85c \uc81c\uacf5: \ub3c5\uc77c\uc5b4, \uc601\uc5b4, \uc911\uad6d\uc5b4, \ud504\ub791\uc2a4\uc5b4, \uc2a4\ud398\uc778\uc5b4, \ud3ec\ub974\ud22c\uac08\uc5b4, \uc77c\ubcf8\uc5b4, \ud55c\uad6d\uc5b4.',
  },
  api: {
    de: 'REST-API-Endpunkte f\u00fcr programmatischen Zugriff auf Aktiendaten. Einzelabfrage, Batch-Abfrage und formatierte Ausgabe.',
    en: 'REST API endpoints for programmatic access to stock data. Single lookup, batch lookup, and pre-formatted output.',
    zh: 'REST API\u7aef\u70b9\u7528\u4e8e\u7a0b\u5e8f\u5316\u8bbf\u95ee\u80a1\u7968\u6570\u636e\u3002\u5355\u4e2a\u67e5\u8be2\u3001\u6279\u91cf\u67e5\u8be2\u548c\u683c\u5f0f\u5316\u8f93\u51fa\u3002',
    fr: "Points de terminaison API REST pour l'acc\u00e8s programmatique aux donn\u00e9es boursi\u00e8res. Recherche simple, lot et sortie pr\u00e9format\u00e9e.",
    es: 'Endpoints API REST para acceso program\u00e1tico a datos burs\u00e1tiles. Consulta individual, por lotes y salida preformateada.',
    pt: 'Endpoints API REST para acesso program\u00e1tico a dados de a\u00e7\u00f5es. Consulta individual, em lote e sa\u00edda pr\u00e9-formatada.',
    ja: '\u682a\u4fa1\u30c7\u30fc\u30bf\u3078\u306e\u30d7\u30ed\u30b0\u30e9\u30de\u30c6\u30a3\u30c3\u30af\u30a2\u30af\u30bb\u30b9\u7528REST API\u30a8\u30f3\u30c9\u30dd\u30a4\u30f3\u30c8\u3002\u5358\u4e00\u691c\u7d22\u3001\u30d0\u30c3\u30c1\u691c\u7d22\u3001\u30d5\u30a9\u30fc\u30de\u30c3\u30c8\u6e08\u307f\u51fa\u529b\u3002',
    ko: '\uc8fc\uc2dd \ub370\uc774\ud130\uc5d0 \ud504\ub85c\uadf8\ub798\ub9c8\ud2f1 \uc561\uc138\uc2a4\ub97c \uc704\ud55c REST API \uc5d4\ub4dc\ud3ec\uc778\ud2b8. \ub2e8\uc77c \uc870\ud68c, \ubc30\uce58 \uc870\ud68c, \ud3ec\ub9f7\ub41c \ucd9c\ub825.',
  },
}

// Section E — API Endpoints
const H2_API: L = {
  de: 'Wie kann ich KI-Aktiendaten programmatisch abrufen?',
  en: 'How can I access AI stock data programmatically?',
  zh: '\u5982\u4f55\u4ee5\u7f16\u7a0b\u65b9\u5f0f\u8bbf\u95eeAI\u80a1\u7968\u6570\u636e\uff1f',
  fr: 'Comment acc\u00e9der aux donn\u00e9es boursi\u00e8res IA par programmation ?',
  es: '\u00bfC\u00f3mo puedo acceder a datos burs\u00e1tiles IA program\u00e1ticamente?',
  pt: 'Como posso acessar dados de a\u00e7\u00f5es IA programaticamente?',
  ja: 'AI\u682a\u4fa1\u30c7\u30fc\u30bf\u306b\u30d7\u30ed\u30b0\u30e9\u30de\u30c6\u30a3\u30c3\u30af\u306b\u30a2\u30af\u30bb\u30b9\u3059\u308b\u306b\u306f\uff1f',
  ko: 'AI \uc8fc\uc2dd \ub370\uc774\ud130\uc5d0 \ud504\ub85c\uadf8\ub798\ub9c8\ud2f1\ud558\uac8c \uc561\uc138\uc2a4\ud558\ub824\uba74?',
}

const API_DOC_LINK: L = {
  de: 'Vollst\u00e4ndige API-Dokumentation',
  en: 'Full API Documentation',
  zh: '\u5b8c\u6574API\u6587\u6863',
  fr: 'Documentation API compl\u00e8te',
  es: 'Documentaci\u00f3n API completa',
  pt: 'Documenta\u00e7\u00e3o API completa',
  ja: '\u5b8c\u5168\u306aAPI\u30c9\u30ad\u30e5\u30e1\u30f3\u30c8',
  ko: '\uc804\uccb4 API \ubb38\uc11c',
}

// Section F — FAQ
const H2_FAQ: L = {
  de: 'H\u00e4ufig gestellte Fragen',
  en: 'Frequently Asked Questions',
  zh: '\u5e38\u89c1\u95ee\u9898',
  fr: 'Questions fr\u00e9quemment pos\u00e9es',
  es: 'Preguntas frecuentes',
  pt: 'Perguntas frequentes',
  ja: '\u3088\u304f\u3042\u308b\u8cea\u554f',
  ko: '\uc790\uc8fc \ubb3b\ub294 \uc9c8\ubb38',
}

const FAQ_ITEMS: Array<{ q: L; a: L }> = [
  {
    q: {
      de: 'Was ist der KI-Aktien-Tracker?',
      en: 'What is the AI stock tracker?',
      zh: '\u4ec0\u4e48\u662fAI\u80a1\u7968\u8ffd\u8e2a\u5668\uff1f',
      fr: "Qu'est-ce que le tracker d'actions IA ?",
      es: '\u00bfQu\u00e9 es el rastreador de acciones IA?',
      pt: 'O que \u00e9 o rastreador de a\u00e7\u00f5es IA?',
      ja: 'AI\u682a\u5f0f\u30c8\u30e9\u30c3\u30ab\u30fc\u3068\u306f\uff1f',
      ko: 'AI \uc8fc\uc2dd \ucd94\uc801\uae30\ub780 \ubb34\uc5c7\uc778\uac00\uc694?',
    },
    a: {
      de: 'Der KI-Aktien-Tracker von DataCube AI ist ein kostenloses Tool, das Echtzeit-Aktiendaten f\u00fcr f\u00fchrende KI-Unternehmen bereitstellt. Er kombiniert Aktienkurse (via Polygon.io), Finanzierungsrunden und M&A-Deals in einer \u00fcbersichtlichen Darstellung.',
      en: 'The DataCube AI stock tracker is a free tool that provides real-time stock data for leading AI companies. It combines stock prices (via Polygon.io), funding rounds, and M&A deals in a clear, organized view.',
      zh: 'DataCube AI\u80a1\u7968\u8ffd\u8e2a\u5668\u662f\u4e00\u6b3e\u514d\u8d39\u5de5\u5177\uff0c\u4e3a\u9886\u5148\u7684AI\u516c\u53f8\u63d0\u4f9b\u5b9e\u65f6\u80a1\u7968\u6570\u636e\u3002\u5b83\u5c06\u80a1\u4ef7\uff08\u901a\u8fc7Polygon.io\uff09\u3001\u878d\u8d44\u8f6e\u6b21\u548c\u5e76\u8d2d\u4ea4\u6613\u7ec4\u5408\u5728\u4e00\u4e2a\u6e05\u6670\u7684\u754c\u9762\u4e2d\u3002',
      fr: "Le tracker d'actions IA de DataCube AI est un outil gratuit qui fournit des donn\u00e9es boursi\u00e8res en temps r\u00e9el pour les principales entreprises IA. Il combine cours des actions (via Polygon.io), tours de financement et op\u00e9rations M&A dans une vue claire.",
      es: 'El rastreador de acciones IA de DataCube AI es una herramienta gratuita que proporciona datos burs\u00e1tiles en tiempo real para empresas IA l\u00edderes. Combina precios de acciones (v\u00eda Polygon.io), rondas de financiaci\u00f3n y operaciones M&A en una vista organizada.',
      pt: 'O rastreador de a\u00e7\u00f5es IA do DataCube AI \u00e9 uma ferramenta gratuita que fornece dados de a\u00e7\u00f5es em tempo real para empresas IA l\u00edderes. Combina pre\u00e7os de a\u00e7\u00f5es (via Polygon.io), rodadas de financiamento e opera\u00e7\u00f5es M&A em uma visualiza\u00e7\u00e3o organizada.',
      ja: 'DataCube AI\u682a\u5f0f\u30c8\u30e9\u30c3\u30ab\u30fc\u306f\u3001\u4e3b\u8981AI\u4f01\u696d\u306e\u30ea\u30a2\u30eb\u30bf\u30a4\u30e0\u682a\u4fa1\u30c7\u30fc\u30bf\u3092\u63d0\u4f9b\u3059\u308b\u7121\u6599\u30c4\u30fc\u30eb\u3067\u3059\u3002\u682a\u4fa1\uff08Polygon.io\u7d4c\u7531\uff09\u3001\u8cc7\u91d1\u8abf\u9054\u30e9\u30a6\u30f3\u30c9\u3001M&A\u30c7\u30a3\u30fc\u30eb\u3092\u898b\u3084\u3059\u304f\u7d71\u5408\u3002',
      ko: 'DataCube AI \uc8fc\uc2dd \ucd94\uc801\uae30\ub294 \uc8fc\uc694 AI \uae30\uc5c5\uc758 \uc2e4\uc2dc\uac04 \uc8fc\uc2dd \ub370\uc774\ud130\ub97c \uc81c\uacf5\ud558\ub294 \ubb34\ub8cc \ub3c4\uad6c\uc785\ub2c8\ub2e4. \uc8fc\uac00(Polygon.io \uacbd\uc720), \ud380\ub529 \ub77c\uc6b4\ub4dc, M&A \uac70\ub798\ub97c \uae54\ub054\ud558\uac8c \ud1b5\ud569\ud569\ub2c8\ub2e4.',
    },
  },
  {
    q: {
      de: 'Sind die Aktiendaten in Echtzeit?',
      en: 'Is the stock data real-time?',
      zh: '\u80a1\u7968\u6570\u636e\u662f\u5b9e\u65f6\u7684\u5417\uff1f',
      fr: 'Les donn\u00e9es boursi\u00e8res sont-elles en temps r\u00e9el ?',
      es: '\u00bfLos datos burs\u00e1tiles son en tiempo real?',
      pt: 'Os dados das a\u00e7\u00f5es s\u00e3o em tempo real?',
      ja: '\u682a\u4fa1\u30c7\u30fc\u30bf\u306f\u30ea\u30a2\u30eb\u30bf\u30a4\u30e0\u3067\u3059\u304b\uff1f',
      ko: '\uc8fc\uc2dd \ub370\uc774\ud130\ub294 \uc2e4\uc2dc\uac04\uc778\uac00\uc694?',
    },
    a: {
      de: 'Ja, die Aktienkurse werden \u00fcber die Polygon.io API abgerufen und bieten Kursdaten mit minimaler Verz\u00f6gerung. Preise, prozentuale Ver\u00e4nderungen und Marktkapitalisierung werden direkt in die Investment-Karten integriert.',
      en: 'Yes, stock prices are fetched via the Polygon.io API and provide data with minimal delay. Prices, percentage changes, and market cap are integrated directly into the investment cards.',
      zh: '\u662f\u7684\uff0c\u80a1\u4ef7\u901a\u8fc7Polygon.io API\u83b7\u53d6\uff0c\u63d0\u4f9b\u6700\u5c0f\u5ef6\u8fdf\u7684\u6570\u636e\u3002\u4ef7\u683c\u3001\u767e\u5206\u6bd4\u53d8\u52a8\u548c\u5e02\u503c\u76f4\u63a5\u96c6\u6210\u5230\u6295\u8d44\u5361\u7247\u4e2d\u3002',
      fr: "Oui, les cours sont r\u00e9cup\u00e9r\u00e9s via l'API Polygon.io avec un d\u00e9lai minimal. Prix, variations en pourcentage et capitalisation sont int\u00e9gr\u00e9s directement dans les cartes d'investissement.",
      es: 'S\u00ed, los precios se obtienen a trav\u00e9s de la API de Polygon.io con un retraso m\u00ednimo. Precios, cambios porcentuales y capitalizaci\u00f3n se integran directamente en las tarjetas de inversi\u00f3n.',
      pt: 'Sim, os pre\u00e7os s\u00e3o obtidos via API Polygon.io com atraso m\u00ednimo. Pre\u00e7os, varia\u00e7\u00f5es percentuais e capitaliza\u00e7\u00e3o s\u00e3o integrados diretamente nos cart\u00f5es de investimento.',
      ja: '\u306f\u3044\u3001\u682a\u4fa1\u306fPolygon.io API\u7d4c\u7531\u3067\u53d6\u5f97\u3055\u308c\u3001\u6700\u5c0f\u9650\u306e\u9045\u5ef6\u3067\u30c7\u30fc\u30bf\u3092\u63d0\u4f9b\u3002\u4fa1\u683c\u3001\u5909\u52d5\u7387\u3001\u6642\u4fa1\u7dcf\u984d\u306f\u6295\u8cc7\u30ab\u30fc\u30c9\u306b\u76f4\u63a5\u7d71\u5408\u3002',
      ko: '\ub124, \uc8fc\uac00\ub294 Polygon.io API\ub97c \ud1b5\ud574 \ucd5c\uc18c \uc9c0\uc5f0\uc73c\ub85c \uac00\uc838\uc635\ub2c8\ub2e4. \uac00\uaca9, \ubcc0\ub3d9\ub960, \uc2dc\uac00\uce4d\uc774 \ud22c\uc790 \uce74\ub4dc\uc5d0 \uc9c1\uc811 \ud1b5\ud569\ub429\ub2c8\ub2e4.',
    },
  },
  {
    q: {
      de: 'Welche KI-Aktien werden verfolgt?',
      en: 'Which AI company stocks are tracked?',
      zh: '\u8ffd\u8e2a\u54ea\u4e9bAI\u516c\u53f8\u80a1\u7968\uff1f',
      fr: "Quelles actions d'entreprises IA sont suivies ?",
      es: '\u00bfQu\u00e9 acciones de empresas IA se rastrean?',
      pt: 'Quais a\u00e7\u00f5es de empresas IA s\u00e3o rastreadas?',
      ja: '\u3069\u306eAI\u4f01\u696d\u306e\u682a\u304c\u8ffd\u8de1\u3055\u308c\u307e\u3059\u304b\uff1f',
      ko: '\uc5b4\ub5a4 AI \uae30\uc5c5 \uc8fc\uc2dd\uc774 \ucd94\uc801\ub418\ub098\uc694?',
    },
    a: {
      de: 'DataCube AI verfolgt f\u00fchrende KI-Unternehmen wie NVIDIA (NVDA), Microsoft (MSFT), Alphabet (GOOGL), Meta (META), AMD (AMD), Tesla (TSLA), Broadcom (AVGO), ASML (ASML), Arm Holdings (ARM), Palantir (PLTR), Snowflake (SNOW) und C3.ai (AI).',
      en: 'DataCube AI tracks leading AI companies including NVIDIA (NVDA), Microsoft (MSFT), Alphabet (GOOGL), Meta (META), AMD (AMD), Tesla (TSLA), Broadcom (AVGO), ASML (ASML), Arm Holdings (ARM), Palantir (PLTR), Snowflake (SNOW), and C3.ai (AI).',
      zh: 'DataCube AI\u8ffd\u8e2a\u9886\u5148\u7684AI\u516c\u53f8\uff0c\u5305\u62ecNVIDIA (NVDA)\u3001Microsoft (MSFT)\u3001Alphabet (GOOGL)\u3001Meta (META)\u3001AMD (AMD)\u3001Tesla (TSLA)\u3001Broadcom (AVGO)\u3001ASML (ASML)\u3001Arm Holdings (ARM)\u3001Palantir (PLTR)\u3001Snowflake (SNOW)\u548cC3.ai (AI)\u3002',
      fr: 'DataCube AI suit les principales entreprises IA dont NVIDIA (NVDA), Microsoft (MSFT), Alphabet (GOOGL), Meta (META), AMD (AMD), Tesla (TSLA), Broadcom (AVGO), ASML (ASML), Arm Holdings (ARM), Palantir (PLTR), Snowflake (SNOW) et C3.ai (AI).',
      es: 'DataCube AI rastrea empresas IA l\u00edderes como NVIDIA (NVDA), Microsoft (MSFT), Alphabet (GOOGL), Meta (META), AMD (AMD), Tesla (TSLA), Broadcom (AVGO), ASML (ASML), Arm Holdings (ARM), Palantir (PLTR), Snowflake (SNOW) y C3.ai (AI).',
      pt: 'DataCube AI rastreia empresas IA l\u00edderes como NVIDIA (NVDA), Microsoft (MSFT), Alphabet (GOOGL), Meta (META), AMD (AMD), Tesla (TSLA), Broadcom (AVGO), ASML (ASML), Arm Holdings (ARM), Palantir (PLTR), Snowflake (SNOW) e C3.ai (AI).',
      ja: 'DataCube AI\u306fNVIDIA (NVDA)\u3001Microsoft (MSFT)\u3001Alphabet (GOOGL)\u3001Meta (META)\u3001AMD (AMD)\u3001Tesla (TSLA)\u3001Broadcom (AVGO)\u3001ASML (ASML)\u3001Arm Holdings (ARM)\u3001Palantir (PLTR)\u3001Snowflake (SNOW)\u3001C3.ai (AI)\u306a\u3069\u306e\u4e3b\u8981AI\u4f01\u696d\u3092\u8ffd\u8de1\u3002',
      ko: 'DataCube AI\ub294 NVIDIA (NVDA), Microsoft (MSFT), Alphabet (GOOGL), Meta (META), AMD (AMD), Tesla (TSLA), Broadcom (AVGO), ASML (ASML), Arm Holdings (ARM), Palantir (PLTR), Snowflake (SNOW), C3.ai (AI) \ub4f1 \uc8fc\uc694 AI \uae30\uc5c5\uc744 \ucd94\uc801\ud569\ub2c8\ub2e4.',
    },
  },
  {
    q: {
      de: 'Ist der KI-Aktien-Tracker kostenlos?',
      en: 'Is the AI stock tracker free?',
      zh: 'AI\u80a1\u7968\u8ffd\u8e2a\u5668\u514d\u8d39\u5417\uff1f',
      fr: "Le tracker d'actions IA est-il gratuit ?",
      es: '\u00bfEs gratuito el rastreador de acciones IA?',
      pt: 'O rastreador de a\u00e7\u00f5es IA \u00e9 gratuito?',
      ja: 'AI\u682a\u5f0f\u30c8\u30e9\u30c3\u30ab\u30fc\u306f\u7121\u6599\u3067\u3059\u304b\uff1f',
      ko: 'AI \uc8fc\uc2dd \ucd94\uc801\uae30\ub294 \ubb34\ub8cc\uc778\uac00\uc694?',
    },
    a: {
      de: 'Ja, der KI-Aktien-Tracker ist 100% kostenlos. Alle Aktiendaten, Finanzierungsrunden und M&A-Informationen sind ohne Registrierung oder Bezahlung zug\u00e4nglich.',
      en: 'Yes, the AI stock tracker is 100% free. All stock data, funding rounds, and M&A information are accessible without registration or payment.',
      zh: '\u662f\u7684\uff0cAI\u80a1\u7968\u8ffd\u8e2a\u5668100%\u514d\u8d39\u3002\u6240\u6709\u80a1\u7968\u6570\u636e\u3001\u878d\u8d44\u8f6e\u6b21\u548c\u5e76\u8d2d\u4fe1\u606f\u5747\u65e0\u9700\u6ce8\u518c\u6216\u4ed8\u8d39\u5373\u53ef\u8bbf\u95ee\u3002',
      fr: "Oui, le tracker d'actions IA est 100% gratuit. Toutes les donn\u00e9es boursi\u00e8res, tours de financement et informations M&A sont accessibles sans inscription ni paiement.",
      es: 'S\u00ed, el rastreador de acciones IA es 100% gratuito. Todos los datos burs\u00e1tiles, rondas de financiaci\u00f3n e informaci\u00f3n de M&A son accesibles sin registro ni pago.',
      pt: 'Sim, o rastreador de a\u00e7\u00f5es IA \u00e9 100% gratuito. Todos os dados de a\u00e7\u00f5es, rodadas de financiamento e informa\u00e7\u00f5es de M&A s\u00e3o acess\u00edveis sem registro ou pagamento.',
      ja: '\u306f\u3044\u3001AI\u682a\u5f0f\u30c8\u30e9\u30c3\u30ab\u30fc\u306f100%\u7121\u6599\u3067\u3059\u3002\u5168\u682a\u4fa1\u30c7\u30fc\u30bf\u3001\u8cc7\u91d1\u8abf\u9054\u30e9\u30a6\u30f3\u30c9\u3001M&A\u60c5\u5831\u306f\u767b\u9332\u3084\u652f\u6255\u3044\u306a\u3057\u3067\u30a2\u30af\u30bb\u30b9\u53ef\u80fd\u3002',
      ko: '\ub124, AI \uc8fc\uc2dd \ucd94\uc801\uae30\ub294 100% \ubb34\ub8cc\uc785\ub2c8\ub2e4. \ubaa8\ub4e0 \uc8fc\uc2dd \ub370\uc774\ud130, \ud380\ub529 \ub77c\uc6b4\ub4dc, M&A \uc815\ubcf4\ub294 \ub4f1\ub85d\uc774\ub098 \uacb0\uc81c \uc5c6\uc774 \uc811\uadfc \uac00\ub2a5\ud569\ub2c8\ub2e4.',
    },
  },
  {
    q: {
      de: 'Kann ich Aktiendaten per API abrufen?',
      en: 'Can I access stock data via API?',
      zh: '\u6211\u53ef\u4ee5\u901a\u8fc7API\u8bbf\u95ee\u80a1\u7968\u6570\u636e\u5417\uff1f',
      fr: "Puis-je acc\u00e9der aux donn\u00e9es boursi\u00e8res via API ?",
      es: '\u00bfPuedo acceder a datos burs\u00e1tiles v\u00eda API?',
      pt: 'Posso acessar dados de a\u00e7\u00f5es via API?',
      ja: 'API\u3067\u682a\u4fa1\u30c7\u30fc\u30bf\u306b\u30a2\u30af\u30bb\u30b9\u3067\u304d\u307e\u3059\u304b\uff1f',
      ko: 'API\ub97c \ud1b5\ud574 \uc8fc\uc2dd \ub370\uc774\ud130\uc5d0 \uc561\uc138\uc2a4\ud560 \uc218 \uc788\ub098\uc694?',
    },
    a: {
      de: 'Ja! DataCube AI bietet REST-API-Endpunkte f\u00fcr Aktiendaten: Einzelabfrage (/api/stock/{ticker}), Batch-Abfrage (/api/stock/batch/) und formatierte Ausgabe (/api/stock/formatted/{ticker}). Registrieren Sie sich auf der Entwicklerseite f\u00fcr einen API-Schl\u00fcssel.',
      en: 'Yes! DataCube AI provides REST API endpoints for stock data: single lookup (/api/stock/{ticker}), batch lookup (/api/stock/batch/), and pre-formatted output (/api/stock/formatted/{ticker}). Register on the developer portal for an API key.',
      zh: '\u662f\u7684\uff01DataCube AI\u63d0\u4f9b\u80a1\u7968\u6570\u636e\u7684REST API\u7aef\u70b9\uff1a\u5355\u4e2a\u67e5\u8be2\uff08/api/stock/{ticker}\uff09\u3001\u6279\u91cf\u67e5\u8be2\uff08/api/stock/batch/\uff09\u548c\u683c\u5f0f\u5316\u8f93\u51fa\uff08/api/stock/formatted/{ticker}\uff09\u3002\u5728\u5f00\u53d1\u8005\u9875\u9762\u6ce8\u518c\u83b7\u53d6API\u5bc6\u94a5\u3002',
      fr: "Oui ! DataCube AI fournit des endpoints API REST pour les donn\u00e9es boursi\u00e8res : recherche simple (/api/stock/{ticker}), lot (/api/stock/batch/) et sortie format\u00e9e (/api/stock/formatted/{ticker}). Inscrivez-vous sur le portail d\u00e9veloppeur.",
      es: '\u00a1S\u00ed! DataCube AI ofrece endpoints API REST para datos burs\u00e1tiles: consulta individual (/api/stock/{ticker}), por lotes (/api/stock/batch/) y salida formateada (/api/stock/formatted/{ticker}). Reg\u00edstrese en el portal de desarrolladores.',
      pt: 'Sim! DataCube AI oferece endpoints API REST para dados de a\u00e7\u00f5es: consulta individual (/api/stock/{ticker}), em lote (/api/stock/batch/) e sa\u00edda formatada (/api/stock/formatted/{ticker}). Registre-se no portal de desenvolvedores.',
      ja: '\u306f\u3044\uff01DataCube AI\u306f\u682a\u4fa1\u30c7\u30fc\u30bf\u7528REST API\u30a8\u30f3\u30c9\u30dd\u30a4\u30f3\u30c8\u3092\u63d0\u4f9b\uff1a\u5358\u4e00\u691c\u7d22\uff08/api/stock/{ticker}\uff09\u3001\u30d0\u30c3\u30c1\uff08/api/stock/batch/\uff09\u3001\u30d5\u30a9\u30fc\u30de\u30c3\u30c8\u6e08\u307f\uff08/api/stock/formatted/{ticker}\uff09\u3002\u958b\u767a\u8005\u30dd\u30fc\u30bf\u30eb\u3067\u767b\u9332\u3002',
      ko: '\ub124! DataCube AI\ub294 \uc8fc\uc2dd \ub370\uc774\ud130\uc6a9 REST API \uc5d4\ub4dc\ud3ec\uc778\ud2b8\ub97c \uc81c\uacf5: \ub2e8\uc77c \uc870\ud68c(/api/stock/{ticker}), \ubc30\uce58(/api/stock/batch/), \ud3ec\ub9f7\ub41c \ucd9c\ub825(/api/stock/formatted/{ticker}). \uac1c\ubc1c\uc790 \ud3ec\ud138\uc5d0\uc11c \ub4f1\ub85d\ud558\uc138\uc694.',
    },
  },
]

// Section G — Final CTA
const H2_CTA_FINAL: L = {
  de: 'Jetzt KI-Investments verfolgen',
  en: 'Start tracking AI investments now',
  zh: '\u7acb\u5373\u5f00\u59cb\u8ffd\u8e2aAI\u6295\u8d44',
  fr: "Commencez \u00e0 suivre les investissements IA maintenant",
  es: 'Empiece a rastrear inversiones IA ahora',
  pt: 'Comece a rastrear investimentos IA agora',
  ja: '\u4eca\u3059\u3050AI\u6295\u8cc7\u306e\u8ffd\u8de1\u3092\u59cb\u3081\u308b',
  ko: '\uc9c0\uae08 AI \ud22c\uc790 \ucd94\uc801 \uc2dc\uc791',
}

const TRUST_LINE: L = {
  de: 'Von KI-Investoren und Analysten genutzt',
  en: 'Trusted by AI investors and analysts',
  zh: '\u53d7AI\u6295\u8d44\u8005\u548c\u5206\u6790\u5e08\u4fe1\u8d56',
  fr: "Utilis\u00e9 par des investisseurs et analystes IA",
  es: 'Usado por inversores y analistas de IA',
  pt: 'Usado por investidores e analistas de IA',
  ja: 'AI\u6295\u8cc7\u5bb6\u3068\u30a2\u30ca\u30ea\u30b9\u30c8\u306b\u4fe1\u983c\u3055\u308c\u3066\u3044\u307e\u3059',
  ko: 'AI \ud22c\uc790\uc790\uc640 \ubd84\uc11d\uac00\ub4e4\uc774 \uc2e0\ub8b0\ud569\ub2c8\ub2e4',
}

// Breadcrumb labels
const HOME_LABEL: L = { de: 'Startseite', en: 'Home', zh: '\u9996\u9875', fr: 'Accueil', es: 'Inicio', pt: 'In\u00edcio', ja: '\u30db\u30fc\u30e0', ko: '\ud648' }
const TOOLS_LABEL: L = { de: 'Tools', en: 'Tools', zh: '\u5de5\u5177', fr: 'Outils', es: 'Herramientas', pt: 'Ferramentas', ja: '\u30c4\u30fc\u30eb', ko: '\ub3c4\uad6c' }
const TOOL_LABEL: L = { de: 'KI-Aktien-Tracker', en: 'AI Stock Tracker', zh: 'AI\u80a1\u7968\u8ffd\u8e2a\u5668', fr: 'Tracker Actions IA', es: 'Rastreador Acciones IA', pt: 'Rastreador A\u00e7\u00f5es IA', ja: 'AI\u682a\u5f0f\u30c8\u30e9\u30c3\u30ab\u30fc', ko: 'AI \uc8fc\uc2dd \ucd94\uc801\uae30' }

// Cross-tool navigation
const H2_OTHER_TOOLS: L = {
  de: 'Weitere kostenlose KI-Tools',
  en: 'More Free AI Tools',
  zh: '\u66f4\u591a\u514d\u8d39AI\u5de5\u5177',
  fr: "Plus d'outils IA gratuits",
  es: 'M\u00e1s herramientas IA gratuitas',
  pt: 'Mais ferramentas IA gratuitas',
  ja: '\u305d\u306e\u4ed6\u306e\u7121\u6599AI\u30c4\u30fc\u30eb',
  ko: '\ub354 \ub9ce\uc740 \ubb34\ub8cc AI \ub3c4\uad6c',
}
const ALL_TOOLS_LABEL: L = {
  de: 'Alle Tools ansehen',
  en: 'View All Tools',
  zh: '\u67e5\u770b\u6240\u6709\u5de5\u5177',
  fr: 'Voir tous les outils',
  es: 'Ver todas las herramientas',
  pt: 'Ver todas as ferramentas',
  ja: '\u3059\u3079\u3066\u306e\u30c4\u30fc\u30eb\u3092\u898b\u308b',
  ko: '\ubaa8\ub4e0 \ub3c4\uad6c \ubcf4\uae30',
}
const CROSS_NEWS_NAME: L = { de: 'KI-News-Aggregator', en: 'AI News Aggregator', zh: 'AI\u65b0\u95fb\u805a\u5408\u5668', fr: "Agr\u00e9gateur d'actualit\u00e9s IA", es: 'Agregador de noticias IA', pt: 'Agregador de not\u00edcias IA', ja: 'AI\u30cb\u30e5\u30fc\u30b9\u30a2\u30b0\u30ea\u30b2\u30fc\u30bf\u30fc', ko: 'AI \ub274\uc2a4 \uc9d1\ud569\uae30' }
const CROSS_NEWS_DESC: L = { de: '22+ Quellen, 8 Sprachen, t\u00e4glich aktualisiert.', en: '22+ sources, 8 languages, updated daily.', zh: '22+\u4fe1\u606f\u6e90\uff0c8\u79cd\u8bed\u8a00\uff0c\u6bcf\u65e5\u66f4\u65b0\u3002', fr: '22+ sources, 8 langues, mis \u00e0 jour quotidiennement.', es: '22+ fuentes, 8 idiomas, actualizado diariamente.', pt: '22+ fontes, 8 idiomas, atualizado diariamente.', ja: '22\u4ee5\u4e0a\u306e\u30bd\u30fc\u30b9\u30018\u8a00\u8a9e\u3001\u6bce\u65e5\u66f4\u65b0\u3002', ko: '22\uac1c+ \uc18c\uc2a4, 8\uac1c \uc5b8\uc5b4, \ub9e4\uc77c \uc5c5\ub370\uc774\ud2b8.' }
const CROSS_REPORT_NAME: L = { de: 'KI-Bericht-Generator', en: 'AI Report Generator', zh: 'AI\u62a5\u544a\u751f\u6210\u5668', fr: 'G\u00e9n\u00e9rateur de rapports IA', es: 'Generador de informes IA', pt: 'Gerador de relat\u00f3rios IA', ja: 'AI\u30ec\u30dd\u30fc\u30c8\u30b8\u30a7\u30cd\u30ec\u30fc\u30bf\u30fc', ko: 'AI \ubcf4\uace0\uc11c \uc0dd\uc131\uae30' }
const CROSS_REPORT_DESC: L = { de: 'Streaming-Berichte, 5 Exportformate.', en: 'Streaming reports, 5 export formats.', zh: '\u6d41\u5f0f\u62a5\u544a\uff0c5\u79cd\u5bfc\u51fa\u683c\u5f0f\u3002', fr: 'Rapports en streaming, 5 formats.', es: 'Informes en streaming, 5 formatos.', pt: 'Relat\u00f3rios em streaming, 5 formatos.', ja: '\u30b9\u30c8\u30ea\u30fc\u30df\u30f3\u30b0\u30ec\u30dd\u30fc\u30c8\u30015\u3064\u306e\u30a8\u30af\u30b9\u30dd\u30fc\u30c8\u5f62\u5f0f\u3002', ko: '\uc2a4\ud2b8\ub9ac\ubc0d \ubcf4\uace0\uc11c, 5\uac00\uc9c0 \ub0b4\ubcf4\ub0b4\uae30 \ud615\uc2dd.' }
const CROSS_API_NAME: L = { de: 'KI-News-API', en: 'AI News API', zh: 'AI\u65b0\u95fbAPI', fr: 'API actualit\u00e9s IA', es: 'API noticias IA', pt: 'API not\u00edcias IA', ja: 'AI\u30cb\u30e5\u30fc\u30b9API', ko: 'AI \ub274\uc2a4 API' }
const CROSS_API_DESC: L = { de: 'REST API, JSON, keine Authentifizierung.', en: 'REST API, JSON, no authentication required.', zh: 'REST API\u3001JSON\u3001\u65e0\u9700\u8ba4\u8bc1\u3002', fr: 'API REST, JSON, sans authentification.', es: 'API REST, JSON, sin autenticaci\u00f3n.', pt: 'API REST, JSON, sem autentica\u00e7\u00e3o.', ja: 'REST API\u3001JSON\u3001\u8a8d\u8a3c\u4e0d\u8981\u3002', ko: 'REST API, JSON, \uc778\uc99d \ubd88\ud544\uc694.' }

// Company data
const COMPANIES = [
  { name: 'NVIDIA', ticker: 'NVDA', sector: 'GPU / AI Chips' },
  { name: 'Microsoft', ticker: 'MSFT', sector: 'Cloud / AI Platform' },
  { name: 'Alphabet', ticker: 'GOOGL', sector: 'AI Research / Cloud' },
  { name: 'Meta', ticker: 'META', sector: 'AI / Social Media' },
  { name: 'AMD', ticker: 'AMD', sector: 'AI Chips / GPU' },
  { name: 'Tesla', ticker: 'TSLA', sector: 'AI / Autonomous' },
  { name: 'Broadcom', ticker: 'AVGO', sector: 'AI Infrastructure' },
  { name: 'ASML', ticker: 'ASML', sector: 'Semiconductor Equipment' },
  { name: 'Arm Holdings', ticker: 'ARM', sector: 'Chip Architecture' },
  { name: 'Palantir', ticker: 'PLTR', sector: 'AI Software' },
  { name: 'Snowflake', ticker: 'SNOW', sector: 'AI Data Cloud' },
  { name: 'C3.ai', ticker: 'AI', sector: 'Enterprise AI' },
]

// API endpoints for display
const API_ENDPOINTS = [
  { method: 'GET', path: '/api/stock/{ticker}' },
  { method: 'GET', path: '/api/stock/batch/?tickers=AAPL,NVDA' },
  { method: 'GET', path: '/api/stock/formatted/{ticker}?language=en' },
]

const API_ENDPOINT_DESCRIPTIONS: L[] = [
  { de: 'Einzelne Aktienabfrage', en: 'Single stock lookup', zh: '\u5355\u4e2a\u80a1\u7968\u67e5\u8be2', fr: 'Recherche d\u2019action unique', es: 'Consulta de acci\u00f3n individual', pt: 'Consulta de a\u00e7\u00e3o individual', ja: '\u5358\u4e00\u682a\u691c\u7d22', ko: '\ub2e8\uc77c \uc8fc\uc2dd \uc870\ud68c' },
  { de: 'Batch-Abfrage f\u00fcr mehrere Ticker', en: 'Batch lookup for multiple tickers', zh: '\u591a\u4e2a\u80a1\u7968\u4ee3\u7801\u6279\u91cf\u67e5\u8be2', fr: 'Recherche par lot pour plusieurs titres', es: 'Consulta por lotes para m\u00faltiples tickers', pt: 'Consulta em lote para m\u00faltiplos tickers', ja: '\u8907\u6570\u30c6\u30a3\u30c3\u30ab\u30fc\u306e\u30d0\u30c3\u30c1\u691c\u7d22', ko: '\uc5ec\ub7ec \ud2f0\ucee4 \ubc30\uce58 \uc870\ud68c' },
  { de: 'Formatierte Ausgabe mit Sprache', en: 'Pre-formatted output with language', zh: '\u5e26\u8bed\u8a00\u7684\u683c\u5f0f\u5316\u8f93\u51fa', fr: 'Sortie pr\u00e9format\u00e9e avec langue', es: 'Salida preformateada con idioma', pt: 'Sa\u00edda pr\u00e9-formatada com idioma', ja: '\u8a00\u8a9e\u4ed8\u304d\u30d5\u30a9\u30fc\u30de\u30c3\u30c8\u6e08\u307f\u51fa\u529b', ko: '\uc5b8\uc5b4\ubcc4 \ud3ec\ub9f7\ub41c \ucd9c\ub825' },
]

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function AIStockTrackerToolPage({ params }: Props) {
  const { lang } = await params
  if (!isSupportedLanguage(lang)) notFound()

  const pageUrl = `${BASE_URL}/${lang}/tools/ai-stock-tracker`

  // -- JSON-LD schemas --------------------------------------------------------

  const softwareAppSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'DataCube AI Stock Tracker',
    description: t(META_DESCRIPTIONS, lang),
    url: pageUrl,
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
    },
    author: {
      '@type': 'Organization',
      name: 'DataCube AI',
      url: BASE_URL,
    },
    inLanguage: ['de', 'en', 'zh-Hans', 'fr', 'es', 'pt', 'ja', 'ko'],
    featureList: [
      'Real-time AI stock data',
      'Polygon.io powered',
      'Funding round tracking',
      'M&A intelligence',
      '8 language support',
      'REST API access',
    ],
  }

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: t(item.q, lang),
      acceptedAnswer: {
        '@type': 'Answer',
        text: t(item.a, lang),
      },
    })),
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: t(HOME_LABEL, lang), item: `${BASE_URL}/${lang}` },
      { '@type': 'ListItem', position: 2, name: t(TOOLS_LABEL, lang), item: `${BASE_URL}/${lang}/tools` },
      { '@type': 'ListItem', position: 3, name: t(TOOL_LABEL, lang), item: pageUrl },
    ],
  }

  // -- Feature icon mapping ---------------------------------------------------
  const featureIcons: Record<string, React.ReactNode> = {
    realtime: <BarChart3 className="h-6 w-6" />,
    aifocus: <Cpu className="h-6 w-6" />,
    funding: <Briefcase className="h-6 w-6" />,
    ma: <TrendingUp className="h-6 w-6" />,
    languages: <Languages className="h-6 w-6" />,
    api: <Code2 className="h-6 w-6" />,
  }

  const featureAccents: Record<string, string> = {
    realtime: 'text-[var(--invest-accent)]',
    aifocus: 'text-[var(--tech-accent)]',
    funding: 'text-[var(--invest-accent)]',
    ma: 'text-[var(--tips-accent)]',
    languages: 'text-[var(--tech-accent)]',
    api: 'text-[var(--video-accent,theme(colors.rose.500))]',
  }

  const categoryIcons = [
    <TrendingUp key="primary" className="h-8 w-8" />,
    <BarChart3 key="secondary" className="h-8 w-8" />,
    <Briefcase key="ma" className="h-8 w-8" />,
  ]

  const categoryAccents = [
    'text-[var(--invest-accent)]',
    'text-[var(--tech-accent)]',
    'text-[var(--tips-accent)]',
  ]

  return (
    <>
      {/* JSON-LD structured data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <article className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* ================================================================= */}
        {/* Section A: Hero                                                   */}
        {/* ================================================================= */}
        <section className="py-12 sm:py-16 text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-[family-name:var(--font-display)] leading-tight">
            {t(H1, lang)}
          </h1>

          <p className="mt-6 max-w-3xl mx-auto text-lg text-muted-foreground leading-relaxed">
            {t(SUBTITLE, lang)}
          </p>

          {/* CTA buttons */}
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href={`/${lang}`}
              className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-6 py-3 font-medium hover:bg-primary/90 transition-colors focus-visible:ring-2 focus-visible:ring-primary"
            >
              {t(CTA_INVESTMENT, lang)} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={`/${lang}/tools/ai-news-api`}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 font-medium hover:bg-accent transition-colors focus-visible:ring-2 focus-visible:ring-primary"
            >
              {t(CTA_API, lang)}
            </Link>
          </div>

          {/* Stat badges */}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {[STAT_REALTIME, STAT_POLYGON, STAT_AI_FOCUS, STAT_FREE].map((stat, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium"
              >
                {t(stat, lang)}
              </span>
            ))}
          </div>
        </section>

        {/* ================================================================= */}
        {/* Section B: Tracked Companies                                      */}
        {/* ================================================================= */}
        <section className="py-12 sm:py-16">
          <h2 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-display)]">
            {t(H2_COMPANIES, lang)}
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            {t(COMPANIES_LEAD, lang)}
          </p>

          <div className="mt-8 grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {COMPANIES.map((company) => (
              <div
                key={company.ticker}
                className="rounded-xl border border-border/50 bg-card/50 p-4 transition-colors hover:bg-card/80"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">{company.name}</span>
                  <span className="text-sm font-mono tabular-nums text-muted-foreground">{company.ticker}</span>
                </div>
                <span className="mt-2 inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {company.sector}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <Link
              href={`/${lang}`}
              className="inline-flex items-center gap-2 font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-primary rounded"
            >
              {t(VIEW_INVESTMENT, lang)} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* ================================================================= */}
        {/* Section C: Data Categories                                        */}
        {/* ================================================================= */}
        <section className="py-12 sm:py-16">
          <h2 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-display)] text-center">
            {t(H2_CATEGORIES, lang)}
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {CATEGORY_TITLES.map((title, i) => (
              <div
                key={i}
                className="rounded-xl border border-border/50 bg-card/50 p-6"
              >
                <div className={`mb-4 ${categoryAccents[i]}`} aria-hidden="true">
                  {categoryIcons[i]}
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {t(title, lang)}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t(CATEGORY_DESCRIPTIONS[i], lang)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ================================================================= */}
        {/* Section D: Features Grid                                          */}
        {/* ================================================================= */}
        <section className="py-12 sm:py-16">
          <h2 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-display)] text-center">
            {t(H2_FEATURES, lang)}
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURE_KEYS.map((key) => (
              <div
                key={key}
                className="rounded-xl border border-border/50 bg-card/50 p-6"
              >
                <div className={`mb-4 ${featureAccents[key]}`} aria-hidden="true">
                  {featureIcons[key]}
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {t(FEATURE_TITLES[key], lang)}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t(FEATURE_DESCRIPTIONS[key], lang)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ================================================================= */}
        {/* Section E: API Endpoints                                          */}
        {/* ================================================================= */}
        <section className="py-12 sm:py-16">
          <h2 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-display)] text-center">
            {t(H2_API, lang)}
          </h2>

          <div className="mt-10 grid gap-4 max-w-3xl mx-auto">
            {API_ENDPOINTS.map((ep, i) => (
              <div
                key={i}
                className="rounded-xl border border-border/50 bg-card/50 p-5"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center rounded-md bg-green-500/15 px-2.5 py-1 text-xs font-bold text-green-600 dark:text-green-400 font-mono">
                    {ep.method}
                  </span>
                  <code className="text-sm font-mono tabular-nums text-foreground break-all">
                    {ep.path}
                  </code>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t(API_ENDPOINT_DESCRIPTIONS[i], lang)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              href={`/${lang}`}
              className="inline-flex items-center gap-2 font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-primary rounded"
            >
              {t(API_DOC_LINK, lang)} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* ================================================================= */}
        {/* Section F: FAQ                                                    */}
        {/* ================================================================= */}
        <section className="py-12 sm:py-16">
          <h2 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-display)] text-center">
            {t(H2_FAQ, lang)}
          </h2>

          <div className="mt-10 max-w-3xl mx-auto space-y-4">
            {FAQ_ITEMS.map((item, i) => (
              <details
                key={i}
                className="group rounded-xl border border-border/50 bg-card/50 overflow-hidden"
              >
                <summary className="cursor-pointer px-6 py-4 font-medium select-none list-none flex items-center justify-between gap-4 hover:bg-accent/50 transition-colors focus-visible:ring-2 focus-visible:ring-primary rounded">
                  <span>{t(item.q, lang)}</span>
                  <span className="shrink-0 text-muted-foreground transition-transform group-open:rotate-45 text-xl leading-none" aria-hidden="true">+</span>
                </summary>
                <div className="px-6 pb-4 text-muted-foreground leading-relaxed">
                  {t(item.a, lang)}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* ================================================================= */}
        {/* Cross-Tool Navigation                                             */}
        {/* ================================================================= */}
        <section className="py-12 sm:py-16">
          <h2 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-display)] text-center">
            {t(H2_OTHER_TOOLS, lang)}
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <Link
              href={`/${lang}/tools/ai-news-aggregator`}
              className="rounded-xl border border-border/50 bg-card/50 p-6 transition-colors hover:bg-card/80 focus-visible:ring-2 focus-visible:ring-primary"
            >
              <h3 className="text-lg font-semibold">{t(CROSS_NEWS_NAME, lang)}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t(CROSS_NEWS_DESC, lang)}</p>
            </Link>
            <Link
              href={`/${lang}/tools/ai-report-generator`}
              className="rounded-xl border border-border/50 bg-card/50 p-6 transition-colors hover:bg-card/80 focus-visible:ring-2 focus-visible:ring-primary"
            >
              <h3 className="text-lg font-semibold">{t(CROSS_REPORT_NAME, lang)}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t(CROSS_REPORT_DESC, lang)}</p>
            </Link>
            <Link
              href={`/${lang}/tools/ai-news-api`}
              className="rounded-xl border border-border/50 bg-card/50 p-6 transition-colors hover:bg-card/80 focus-visible:ring-2 focus-visible:ring-primary"
            >
              <h3 className="text-lg font-semibold">{t(CROSS_API_NAME, lang)}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t(CROSS_API_DESC, lang)}</p>
            </Link>
          </div>

          <div className="mt-8 text-center">
            <Link
              href={`/${lang}/tools`}
              className="inline-flex items-center gap-2 font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-primary rounded"
            >
              {t(ALL_TOOLS_LABEL, lang)} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* ================================================================= */}
        {/* Section G: Final CTA                                              */}
        {/* ================================================================= */}
        <section className="py-12 sm:py-16 my-8 rounded-2xl bg-primary/5 text-center px-6">
          <h2 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-display)]">
            {t(H2_CTA_FINAL, lang)}
          </h2>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href={`/${lang}`}
              className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-6 py-3 font-medium hover:bg-primary/90 transition-colors focus-visible:ring-2 focus-visible:ring-primary"
            >
              {t(CTA_INVESTMENT, lang)} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={`/${lang}`}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 font-medium hover:bg-accent transition-colors focus-visible:ring-2 focus-visible:ring-primary"
            >
              {t(CTA_API, lang)}
            </Link>
          </div>

          <p className="mt-6 text-sm text-muted-foreground">{t(TRUST_LINE, lang)}</p>
        </section>
      </article>
    </>
  )
}
