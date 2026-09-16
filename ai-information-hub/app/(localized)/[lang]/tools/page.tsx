import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { SUPPORTED_LANGUAGES, isSupportedLanguage, toBcp47 } from '@/lib/i18n'

export const revalidate = 86400

const BASE_URL = 'https://www.datacubeai.space'

type Props = {
  params: Promise<{ lang: string }>
}

type L = Record<string, string>
const t = (map: L, lang: string) => map[lang] || map.en

// Every tool page ends with a "View all tools" link to this route. It had no
// page until 2026-09-16, so those links 404ed into Next's bare fallback shell
// (no layout, no styles) on 4 pages x 8 languages.
const CROSS_NEWS_NAME: L = { de: 'KI-News-Aggregator', en: 'AI News Aggregator', zh: 'AI\u65b0\u95fb\u805a\u5408\u5668', fr: "Agr\u00e9gateur d'actualit\u00e9s IA", es: 'Agregador de noticias IA', pt: 'Agregador de not\u00edcias IA', ja: 'AI\u30cb\u30e5\u30fc\u30b9\u30a2\u30b0\u30ea\u30b2\u30fc\u30bf\u30fc', ko: 'AI \ub274\uc2a4 \uc9d1\ud569\uae30' }
const CROSS_NEWS_DESC: L = { de: '35+ Quellen, 8 Sprachen, t\u00e4glich aktualisiert.', en: '35+ sources, 8 languages, updated daily.', zh: '35+\u4fe1\u606f\u6e90\uff0c8\u79cd\u8bed\u8a00\uff0c\u6bcf\u65e5\u66f4\u65b0\u3002', fr: '35+ sources, 8 langues, mis \u00e0 jour quotidiennement.', es: '35+ fuentes, 8 idiomas, actualizado diariamente.', pt: '35+ fontes, 8 idiomas, atualizado diariamente.', ja: '35\u4ee5\u4e0a\u306e\u30bd\u30fc\u30b9\u30018\u8a00\u8a9e\u3001\u6bce\u65e5\u66f4\u65b0\u3002', ko: '35\uac1c+ \uc18c\uc2a4, 8\uac1c \uc5b8\uc5b4, \ub9e4\uc77c \uc5c5\ub370\uc774\ud2b8.' }
const CROSS_REPORT_NAME: L = { de: 'KI-Bericht-Generator', en: 'AI Report Generator', zh: 'AI\u62a5\u544a\u751f\u6210\u5668', fr: 'G\u00e9n\u00e9rateur de rapports IA', es: 'Generador de informes IA', pt: 'Gerador de relat\u00f3rios IA', ja: 'AI\u30ec\u30dd\u30fc\u30c8\u30b8\u30a7\u30cd\u30ec\u30fc\u30bf\u30fc', ko: 'AI \ubcf4\uace0\uc11c \uc0dd\uc131\uae30' }
const CROSS_REPORT_DESC: L = { de: 'Streaming-Berichte, 5 Exportformate.', en: 'Streaming reports, 5 export formats.', zh: '\u6d41\u5f0f\u62a5\u544a\uff0c5\u79cd\u5bfc\u51fa\u683c\u5f0f\u3002', fr: 'Rapports en streaming, 5 formats.', es: 'Informes en streaming, 5 formatos.', pt: 'Relat\u00f3rios em streaming, 5 formatos.', ja: '\u30b9\u30c8\u30ea\u30fc\u30df\u30f3\u30b0\u30ec\u30dd\u30fc\u30c8\u30015\u3064\u306e\u30a8\u30af\u30b9\u30dd\u30fc\u30c8\u5f62\u5f0f\u3002', ko: '\uc2a4\ud2b8\ub9ac\ubc0d \ubcf4\uace0\uc11c, 5\uac00\uc9c0 \ub0b4\ubcf4\ub0b4\uae30 \ud615\uc2dd.' }
const CROSS_STOCK_NAME: L = { de: 'KI-Aktien-Tracker', en: 'AI Stock Tracker', zh: 'AI\u80a1\u7968\u8ffd\u8e2a\u5668', fr: 'Tracker actions IA', es: 'Rastreador acciones IA', pt: 'Rastreador a\u00e7\u00f5es IA', ja: 'AI\u682a\u5f0f\u30c8\u30e9\u30c3\u30ab\u30fc', ko: 'AI \uc8fc\uc2dd \ucd94\uc801\uae30' }
const CROSS_STOCK_DESC: L = { de: 'Pausiert — Lizenzprüfung läuft.', en: 'Paused — licensing review in progress.', zh: '暂停中 — 授权审查进行中。', fr: 'En pause — revue de licence en cours.', es: 'En pausa — revisión de licencias en curso.', pt: 'Em pausa — revisão de licenciamento em andamento.', ja: '一時停止中 — ライセンス審査中。', ko: '일시 중지 — 라이선스 검토 중.' }
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
const CROSS_API_NAME: L = { de: 'KI-News-API', en: 'AI News API', zh: 'AI\u65b0\u95fbAPI', fr: 'API actualit\u00e9s IA', es: 'API noticias IA', pt: 'API not\u00edcias IA', ja: 'AI\u30cb\u30e5\u30fc\u30b9API', ko: 'AI \ub274\uc2a4 API' }
const CROSS_API_DESC: L = { de: 'REST API, JSON, keine Authentifizierung.', en: 'REST API, JSON, no authentication required.', zh: 'REST API\u3001JSON\u3001\u65e0\u9700\u8ba4\u8bc1\u3002', fr: 'API REST, JSON, sans authentification.', es: 'API REST, JSON, sin autenticaci\u00f3n.', pt: 'API REST, JSON, sem autentica\u00e7\u00e3o.', ja: 'REST API\u3001JSON\u3001\u8a8d\u8a3c\u4e0d\u8981\u3002', ko: 'REST API, JSON, \uc778\uc99d \ubd88\ud544\uc694.' }

const META_TITLES: L = {
  de: 'Kostenlose KI-Tools | DataCube AI',
  en: 'Free AI Tools | DataCube AI',
  zh: '免费 AI 工具 | DataCube AI',
  fr: 'Outils IA gratuits | DataCube AI',
  es: 'Herramientas de IA gratuitas | DataCube AI',
  pt: 'Ferramentas de IA gratuitas | DataCube AI',
  ja: '無料AIツール | DataCube AI',
  ko: '무료 AI 도구 | DataCube AI',
}

const META_DESCRIPTIONS: L = {
  de: 'Alle kostenlosen KI-Tools von DataCube AI: News-Aggregator, Bericht-Generator und offene News-API. Ohne Konto nutzbar.',
  en: 'Every free AI tool from DataCube AI: news aggregator, report generator, and the open news API. No account required.',
  zh: 'DataCube AI 的全部免费 AI 工具：新闻聚合器、报告生成器和开放新闻 API。无需注册。',
  fr: "Tous les outils IA gratuits de DataCube AI : agrégateur d'actualités, générateur de rapports et API ouverte. Sans compte.",
  es: 'Todas las herramientas de IA gratuitas de DataCube AI: agregador de noticias, generador de informes y API abierta. Sin cuenta.',
  pt: 'Todas as ferramentas de IA gratuitas da DataCube AI: agregador de notícias, gerador de relatórios e API aberta. Sem conta.',
  ja: 'DataCube AI の無料AIツール一覧：ニュースアグリゲーター、レポートジェネレーター、オープンAPI。アカウント不要。',
  ko: 'DataCube AI의 모든 무료 AI 도구: 뉴스 집합기, 보고서 생성기, 오픈 뉴스 API. 계정 불필요.',
}

const PAGE_TITLE: L = {
  de: 'Kostenlose KI-Tools',
  en: 'Free AI Tools',
  zh: '免费 AI 工具',
  fr: 'Outils IA gratuits',
  es: 'Herramientas de IA gratuitas',
  pt: 'Ferramentas de IA gratuitas',
  ja: '無料AIツール',
  ko: '무료 AI 도구',
}

const PAGE_LEAD: L = {
  de: 'Jedes Tool ist ohne Konto und ohne Zahlung nutzbar.',
  en: 'Every tool here is free to use, with no account and no payment.',
  zh: '此处每个工具均免费使用，无需账号，无需付费。',
  fr: "Chaque outil est gratuit, sans compte ni paiement.",
  es: 'Cada herramienta es gratuita, sin cuenta ni pago.',
  pt: 'Cada ferramenta é gratuita, sem conta e sem pagamento.',
  ja: 'ここのツールはすべて無料で、アカウントも支払いも不要です。',
  ko: '여기의 모든 도구는 계정과 결제 없이 무료로 사용할 수 있습니다.',
}

const BACK_HOME: L = {
  de: 'Zur Startseite',
  en: 'Back to home',
  zh: '返回首页',
  fr: "Retour à l'accueil",
  es: 'Volver al inicio',
  pt: 'Voltar ao início',
  ja: 'ホームに戻る',
  ko: '홈으로 돌아가기',
}

export async function generateStaticParams() {
  return SUPPORTED_LANGUAGES.map((lang) => ({ lang }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params
  if (!isSupportedLanguage(lang)) return {}

  const pageUrl = `${BASE_URL}/${lang}/tools`
  const hreflangEntries: Record<string, string> = {
    'x-default': `${BASE_URL}/en/tools`,
  }
  for (const code of SUPPORTED_LANGUAGES) {
    hreflangEntries[toBcp47(code)] = `${BASE_URL}/${code}/tools`
  }

  return {
    title: { absolute: t(META_TITLES, lang) },
    description: t(META_DESCRIPTIONS, lang),
    alternates: { canonical: pageUrl, languages: hreflangEntries },
    openGraph: {
      title: t(META_TITLES, lang),
      description: t(META_DESCRIPTIONS, lang),
      url: pageUrl,
      type: 'website',
    },
  }
}

export default async function ToolsIndexPage({ params }: Props) {
  const { lang } = await params
  if (!isSupportedLanguage(lang)) notFound()

  const tools = [
    { slug: 'ai-news-aggregator', name: CROSS_NEWS_NAME, desc: CROSS_NEWS_DESC },
    { slug: 'ai-report-generator', name: CROSS_REPORT_NAME, desc: CROSS_REPORT_DESC },
    { slug: 'ai-news-api', name: CROSS_API_NAME, desc: CROSS_API_DESC },
    { slug: 'ai-stock-tracker', name: CROSS_STOCK_NAME, desc: CROSS_STOCK_DESC },
  ]

  return (
    <main id="main-content" className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
      <Link
        href={`/${lang}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary rounded"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {t(BACK_HOME, lang)}
      </Link>

      <h1 className="mt-6 font-display text-3xl sm:text-4xl font-bold">{t(PAGE_TITLE, lang)}</h1>
      <p className="mt-3 text-muted-foreground">{t(PAGE_LEAD, lang)}</p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {tools.map((tool) => (
          <Link
            key={tool.slug}
            href={`/${lang}/tools/${tool.slug}`}
            className="group rounded-xl border border-border/50 bg-card/50 p-6 transition-colors hover:bg-card/80 focus-visible:ring-2 focus-visible:ring-primary"
          >
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              {t(tool.name, lang)}
              <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{t(tool.desc, lang)}</p>
          </Link>
        ))}
      </div>
    </main>
  )
}
