import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { SUPPORTED_LANGUAGES, isSupportedLanguage, toBcp47 } from '@/lib/i18n'
import { Rss, FileText, TrendingUp, Code, ArrowRight } from 'lucide-react'

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
  de: 'Kostenlose KI-Tools — News-Aggregator, Berichte, Aktien, API | DataCube AI',
  en: 'Free AI Tools — News Aggregator, Reports, Stocks, API | DataCube AI',
  zh: '免费AI工具 — 新闻聚合、报告、股票、API | DataCube AI',
  fr: 'Outils IA Gratuits — Agrégateur, Rapports, Actions, API | DataCube AI',
  es: 'Herramientas IA Gratuitas — Agregador, Informes, Acciones, API | DataCube AI',
  pt: 'Ferramentas IA Gratuitas — Agregador, Relatórios, Ações, API | DataCube AI',
  ja: '無料AIツール — ニュースアグリゲーター、レポート、株式、API | DataCube AI',
  ko: '무료 AI 도구 — 뉴스 집합기, 보고서, 주식, API | DataCube AI',
}

const META_DESCRIPTIONS: L = {
  de: 'Entdecken Sie die kostenlosen KI-Tools von DataCube AI: News-Aggregator, Bericht-Generator, Aktien-Tracker und News-API. Alles in 8 Sprachen.',
  en: "Discover DataCube AI's free AI tools: news aggregator, report generator, stock tracker, and news API. All available in 8 languages.",
  zh: '探索DataCube AI的免费AI工具：新闻聚合器、报告生成器、股票追踪器和新闻API。全部支持8种语言。',
  fr: "Découvrez les outils IA gratuits de DataCube AI : agrégateur d'actualités, générateur de rapports, tracker actions et API. En 8 langues.",
  es: 'Descubra las herramientas IA gratuitas de DataCube AI: agregador de noticias, generador de informes, rastreador de acciones y API. En 8 idiomas.',
  pt: 'Descubra as ferramentas IA gratuitas do DataCube AI: agregador de notícias, gerador de relatórios, rastreador de ações e API. Em 8 idiomas.',
  ja: 'DataCube AIの無料AIツールを発見：ニュースアグリゲーター、レポートジェネレーター、株式トラッカー、ニュースAPI。8言語対応。',
  ko: 'DataCube AI의 무료 AI 도구를 발견하세요: 뉴스 집합기, 보고서 생성기, 주식 추적기, 뉴스 API. 8개 언어 지원.',
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
          alt: 'DataCube AI Tools',
        },
      ],
    },
  }
}

// ---------------------------------------------------------------------------
// Localized strings
// ---------------------------------------------------------------------------

const H1: L = {
  de: 'Kostenlose KI-Tools',
  en: 'Free AI Tools',
  zh: '免费AI工具',
  fr: 'Outils IA Gratuits',
  es: 'Herramientas IA Gratuitas',
  pt: 'Ferramentas IA Gratuitas',
  ja: '無料AIツール',
  ko: '무료 AI 도구',
}

const SUBTITLE: L = {
  de: 'DataCube AI bietet eine Suite kostenloser, KI-gestützter Tools für Nachrichten, Analysen und Entwicklung. Alle Tools sind in 8 Sprachen verfügbar und werden täglich aktualisiert.',
  en: 'DataCube AI offers a suite of free, AI-powered tools for news, analysis, and development. All tools are available in 8 languages and updated daily.',
  zh: 'DataCube AI 提供一套免费的AI驱动工具，用于新闻、分析和开发。所有工具支持8种语言，每日更新。',
  fr: 'DataCube AI propose une suite d\'outils IA gratuits pour l\'actualité, l\'analyse et le développement. Tous les outils sont disponibles en 8 langues et mis à jour quotidiennement.',
  es: 'DataCube AI ofrece un conjunto de herramientas IA gratuitas para noticias, análisis y desarrollo. Todas las herramientas están disponibles en 8 idiomas y se actualizan diariamente.',
  pt: 'DataCube AI oferece um conjunto de ferramentas IA gratuitas para notícias, análises e desenvolvimento. Todas as ferramentas estão disponíveis em 8 idiomas e são atualizadas diariamente.',
  ja: 'DataCube AIはニュース、分析、開発のための無料AIツールスイートを提供しています。すべてのツールは8言語で利用可能で、毎日更新されます。',
  ko: 'DataCube AI는 뉴스, 분석, 개발을 위한 무료 AI 도구 모음을 제공합니다. 모든 도구는 8개 언어로 이용 가능하며 매일 업데이트됩니다.',
}

// Section B: Tool cards
const TOOL_NAMES: Record<string, L> = {
  aggregator: {
    de: 'KI-News-Aggregator', en: 'AI News Aggregator', zh: 'AI新闻聚合器',
    fr: "Agrégateur d'Actualités IA", es: 'Agregador de Noticias IA', pt: 'Agregador de Notícias IA',
    ja: 'AIニュースアグリゲーター', ko: 'AI 뉴스 집합기',
  },
  report: {
    de: 'KI-Bericht-Generator', en: 'AI Report Generator', zh: 'AI报告生成器',
    fr: 'Générateur de Rapports IA', es: 'Generador de Informes IA', pt: 'Gerador de Relatórios IA',
    ja: 'AIレポートジェネレーター', ko: 'AI 보고서 생성기',
  },
  stock: {
    de: 'KI-Aktien-Tracker', en: 'AI Stock Tracker', zh: 'AI股票追踪器',
    fr: 'Tracker Actions IA', es: 'Rastreador de Acciones IA', pt: 'Rastreador de Ações IA',
    ja: 'AI株式トラッカー', ko: 'AI 주식 추적기',
  },
  api: {
    de: 'KI-News-API', en: 'AI News API', zh: 'AI新闻API',
    fr: 'API Actualités IA', es: 'API de Noticias IA', pt: 'API de Notícias IA',
    ja: 'AIニュースAPI', ko: 'AI 뉴스 API',
  },
}

const TOOL_DESCRIPTIONS: Record<string, L> = {
  aggregator: {
    de: 'Täglich kuratierte KI-Nachrichten aus über 22 Quellen. Technologie-Durchbrüche, Investment-Signale, praktische Tipps und YouTube-Videos — automatisch per KI-Pipeline aufbereitet.',
    en: 'Daily curated AI news from 22+ sources. Technology breakthroughs, investment signals, practical tips, and YouTube videos — processed automatically by our AI pipeline.',
    zh: '每日从22+信息源精选AI新闻。技术突破、投资信号、实用技巧和YouTube视频 — 由AI管道自动处理。',
    fr: 'Actualités IA quotidiennes sélectionnées de 22+ sources. Percées technologiques, signaux d\'investissement, conseils pratiques et vidéos YouTube — traités automatiquement.',
    es: 'Noticias de IA curadas diariamente de 22+ fuentes. Avances tecnológicos, señales de inversión, consejos prácticos y videos de YouTube — procesados automáticamente.',
    pt: 'Notícias de IA curadas diariamente de 22+ fontes. Avanços tecnológicos, sinais de investimento, dicas práticas e vídeos do YouTube — processados automaticamente.',
    ja: '22以上のソースから毎日厳選されたAIニュース。技術的ブレークスルー、投資シグナル、実践ヒント、YouTube動画 — AIパイプラインで自動処理。',
    ko: '22개 이상의 소스에서 매일 선별된 AI 뉴스. 기술 돌파구, 투자 신호, 실용 팁, YouTube 동영상 — AI 파이프라인으로 자동 처리.',
  },
  report: {
    de: 'Erstellen Sie umfassende KI-Berichte auf Knopfdruck. Exportieren Sie als PDF, Markdown oder Text — perfekt für Präsentationen, Newsletter und Entscheidungsvorlagen.',
    en: 'Generate comprehensive AI reports at the click of a button. Export as PDF, Markdown, or text — perfect for presentations, newsletters, and decision briefs.',
    zh: '一键生成全面的AI报告。导出为PDF、Markdown或文本 — 完美适用于演示、通讯和决策简报。',
    fr: 'Générez des rapports IA complets en un clic. Exportez en PDF, Markdown ou texte — idéal pour les présentations, newsletters et notes de décision.',
    es: 'Genere informes de IA completos con un clic. Exporte como PDF, Markdown o texto — perfecto para presentaciones, boletines y resúmenes de decisiones.',
    pt: 'Gere relatórios de IA completos com um clique. Exporte como PDF, Markdown ou texto — perfeito para apresentações, newsletters e resumos de decisões.',
    ja: 'ワンクリックで包括的なAIレポートを生成。PDF、Markdown、テキストでエクスポート — プレゼンテーション、ニュースレター、意思決定ブリーフに最適。',
    ko: '버튼 한 번으로 포괄적인 AI 보고서를 생성하세요. PDF, Markdown, 텍스트로 내보내기 — 프레젠테이션, 뉴스레터, 의사결정 브리프에 적합.',
  },
  stock: {
    de: 'Echtzeit-Aktienkurse und Marktdaten für KI-Unternehmen. Verfolgen Sie NVIDIA, Microsoft, Google und weitere KI-Aktien mit Live-Daten von Polygon.io.',
    en: 'Real-time stock quotes and market data for AI companies. Track NVIDIA, Microsoft, Google, and more AI stocks with live data from Polygon.io.',
    zh: '实时股票报价和AI公司市场数据。通过Polygon.io实时数据追踪NVIDIA、微软、Google等AI股票。',
    fr: 'Cours boursiers en temps réel et données de marché pour les entreprises IA. Suivez NVIDIA, Microsoft, Google et d\'autres actions IA avec les données Polygon.io.',
    es: 'Cotizaciones en tiempo real y datos de mercado para empresas de IA. Siga NVIDIA, Microsoft, Google y más acciones de IA con datos en vivo de Polygon.io.',
    pt: 'Cotações em tempo real e dados de mercado para empresas de IA. Acompanhe NVIDIA, Microsoft, Google e mais ações de IA com dados ao vivo do Polygon.io.',
    ja: 'AI企業のリアルタイム株価と市場データ。Polygon.ioのライブデータでNVIDIA、Microsoft、GoogleなどのAI銘柄を追跡。',
    ko: 'AI 기업의 실시간 주가 및 시장 데이터. Polygon.io 실시간 데이터로 NVIDIA, Microsoft, Google 등 AI 주식을 추적하세요.',
  },
  api: {
    de: 'Programmatischer Zugriff auf alle DataCube AI-Daten per REST-API. Tech-, Investment- und Tips-Feeds in 8 Sprachen — ideal für Entwickler, Bots und Integrationen.',
    en: 'Programmatic access to all DataCube AI data via REST API. Tech, investment, and tips feeds in 8 languages — ideal for developers, bots, and integrations.',
    zh: '通过REST API程序化访问所有DataCube AI数据。技术、投资和技巧Feed支持8种语言 — 非常适合开发者、机器人和集成。',
    fr: 'Accès programmatique à toutes les données DataCube AI via API REST. Flux tech, investissement et conseils en 8 langues — idéal pour développeurs et intégrations.',
    es: 'Acceso programático a todos los datos de DataCube AI vía API REST. Feeds de tecnología, inversión y consejos en 8 idiomas — ideal para desarrolladores e integraciones.',
    pt: 'Acesso programático a todos os dados do DataCube AI via API REST. Feeds de tecnologia, investimento e dicas em 8 idiomas — ideal para desenvolvedores e integrações.',
    ja: 'REST API経由でDataCube AIの全データにプログラムからアクセス。テック、投資、ヒントフィードを8言語で — 開発者、ボット、統合に最適。',
    ko: 'REST API를 통해 모든 DataCube AI 데이터에 프로그래밍 방식으로 접근. 기술, 투자, 팁 피드를 8개 언어로 — 개발자, 봇, 통합에 이상적.',
  },
}

const TOOL_STATS: Record<string, L> = {
  aggregator: { de: '22+ Quellen', en: '22+ Sources', zh: '22+ 信息源', fr: '22+ Sources', es: '22+ Fuentes', pt: '22+ Fontes', ja: '22以上のソース', ko: '22개+ 소스' },
  report: { de: '5 Export-Formate', en: '5 Export Formats', zh: '5种导出格式', fr: '5 Formats d\'export', es: '5 Formatos de exportación', pt: '5 Formatos de exportação', ja: '5つのエクスポート形式', ko: '5가지 내보내기 형식' },
  stock: { de: 'Echtzeit-Daten', en: 'Real-Time Data', zh: '实时数据', fr: 'Données temps réel', es: 'Datos en tiempo real', pt: 'Dados em tempo real', ja: 'リアルタイムデータ', ko: '실시간 데이터' },
  api: { de: 'REST-API', en: 'REST API', zh: 'REST API', fr: 'API REST', es: 'API REST', pt: 'API REST', ja: 'REST API', ko: 'REST API' },
}

const LEARN_MORE: L = {
  de: 'Mehr erfahren', en: 'Learn More', zh: '了解更多',
  fr: 'En savoir plus', es: 'Más información', pt: 'Saiba mais',
  ja: '詳しく見る', ko: '자세히 보기',
}

// Section C: Why Free?
const H2_WHY_FREE: L = {
  de: 'Warum sind alle Tools kostenlos?',
  en: 'Why are all tools free?',
  zh: '为什么所有工具都免费？',
  fr: 'Pourquoi tous les outils sont-ils gratuits ?',
  es: '¿Por qué todas las herramientas son gratuitas?',
  pt: 'Por que todas as ferramentas são gratuitas?',
  ja: 'なぜすべてのツールが無料なのか？',
  ko: '왜 모든 도구가 무료인가요?',
}

const WHY_FREE_TEXT: L = {
  de: 'DataCube AI verfolgt einen Community-First-Ansatz. Wir glauben, dass KI-Nachrichten und -Analysen für alle zugänglich sein sollten — unabhängig von Budget oder Standort. Unsere Tools werden durch effiziente Open-Source-KI-Modelle betrieben, die die Kosten minimal halten. Premium-Funktionen mit erweiterten Analysen werden in Zukunft verfügbar sein, aber die Kerntools bleiben dauerhaft kostenlos.',
  en: 'DataCube AI follows a community-first approach. We believe AI news and analysis should be accessible to everyone — regardless of budget or location. Our tools are powered by efficient open-source AI models that keep costs minimal. Premium features with advanced analytics will be available in the future, but the core tools will remain free forever.',
  zh: 'DataCube AI 遵循社区优先的理念。我们相信AI新闻和分析应该对所有人开放 — 无论预算或地理位置。我们的工具由高效的开源AI模型驱动，保持最低成本。未来将推出带有高级分析功能的付费版本，但核心工具将永久免费。',
  fr: 'DataCube AI adopte une approche communautaire. Nous pensons que les actualités et analyses IA doivent être accessibles à tous — quel que soit le budget ou la localisation. Nos outils fonctionnent grâce à des modèles IA open-source efficaces qui maintiennent les coûts au minimum. Des fonctionnalités premium seront disponibles à l\'avenir, mais les outils de base resteront gratuits.',
  es: 'DataCube AI sigue un enfoque comunitario. Creemos que las noticias y análisis de IA deben ser accesibles para todos — sin importar el presupuesto o la ubicación. Nuestras herramientas funcionan con modelos IA de código abierto eficientes que mantienen los costos al mínimo. Las funciones premium estarán disponibles en el futuro, pero las herramientas básicas serán siempre gratuitas.',
  pt: 'DataCube AI segue uma abordagem comunitária. Acreditamos que notícias e análises de IA devem ser acessíveis a todos — independente de orçamento ou localização. Nossas ferramentas são alimentadas por modelos IA de código aberto eficientes que mantêm os custos mínimos. Recursos premium estarão disponíveis no futuro, mas as ferramentas básicas permanecerão gratuitas.',
  ja: 'DataCube AIはコミュニティファーストのアプローチを採用しています。AIニュースと分析は予算や場所に関係なく誰もがアクセスできるべきだと考えています。私たちのツールはコストを最小限に抑える効率的なオープンソースAIモデルで動作しています。高度な分析機能を備えたプレミアム機能は将来提供予定ですが、コアツールは永久に無料です。',
  ko: 'DataCube AI는 커뮤니티 우선 접근 방식을 따릅니다. AI 뉴스와 분석은 예산이나 위치에 관계없이 모든 사람이 접근할 수 있어야 한다고 믿습니다. 우리의 도구는 비용을 최소화하는 효율적인 오픈소스 AI 모델로 구동됩니다. 고급 분석 기능이 포함된 프리미엄 기능은 향후 제공될 예정이지만, 핵심 도구는 영원히 무료로 유지됩니다.',
}

// Section D: CTA
const CTA_HEADING: L = {
  de: 'Starten Sie jetzt mit unseren KI-Tools',
  en: 'Start using our AI tools today',
  zh: '立即开始使用我们的AI工具',
  fr: 'Commencez à utiliser nos outils IA dès aujourd\'hui',
  es: 'Empiece a usar nuestras herramientas IA hoy',
  pt: 'Comece a usar nossas ferramentas IA hoje',
  ja: '今すぐAIツールを使い始めましょう',
  ko: '지금 바로 AI 도구를 사용해 보세요',
}

const CTA_BUTTON: L = {
  de: 'Zur Startseite', en: 'Go to Homepage', zh: '前往首页',
  fr: "Aller à l'accueil", es: 'Ir al inicio', pt: 'Ir para a página inicial',
  ja: 'ホームページへ', ko: '홈페이지로 이동',
}

// Breadcrumb labels
const HOME_LABEL: L = { de: 'Startseite', en: 'Home', zh: '首页', fr: 'Accueil', es: 'Inicio', pt: 'Início', ja: 'ホーム', ko: '홈' }
const TOOLS_LABEL: L = { de: 'Tools', en: 'Tools', zh: '工具', fr: 'Outils', es: 'Herramientas', pt: 'Ferramentas', ja: 'ツール', ko: '도구' }

// ---------------------------------------------------------------------------
// Tool card config
// ---------------------------------------------------------------------------

const TOOLS = [
  { key: 'aggregator', slug: 'ai-news-aggregator', accent: 'text-[var(--tech-accent)]', borderAccent: 'border-[var(--tech-accent)]/20', bgAccent: 'bg-[var(--tech-accent)]/10' },
  { key: 'report', slug: 'ai-report-generator', accent: 'text-[var(--tips-accent)]', borderAccent: 'border-[var(--tips-accent)]/20', bgAccent: 'bg-[var(--tips-accent)]/10' },
  { key: 'stock', slug: 'ai-stock-tracker', accent: 'text-[var(--invest-accent)]', borderAccent: 'border-[var(--invest-accent)]/20', bgAccent: 'bg-[var(--invest-accent)]/10' },
  { key: 'api', slug: 'ai-news-api', accent: 'text-[var(--video-accent,theme(colors.rose.500))]', borderAccent: 'border-[var(--video-accent,theme(colors.rose.500))]/20', bgAccent: 'bg-[var(--video-accent,theme(colors.rose.500))]/10' },
] as const

const TOOL_ICONS: Record<string, React.ReactNode> = {
  aggregator: <Rss className="h-8 w-8" />,
  report: <FileText className="h-8 w-8" />,
  stock: <TrendingUp className="h-8 w-8" />,
  api: <Code className="h-8 w-8" />,
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function ToolsIndexPage({ params }: Props) {
  const { lang } = await params
  if (!isSupportedLanguage(lang)) notFound()

  const pageUrl = `${BASE_URL}/${lang}/tools`

  // -- JSON-LD schemas --------------------------------------------------------

  const collectionPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: t(H1, lang),
    description: t(META_DESCRIPTIONS, lang),
    url: pageUrl,
    isPartOf: {
      '@type': 'WebSite',
      name: 'DataCube AI',
      url: BASE_URL,
    },
    hasPart: TOOLS.map((tool) => ({
      '@type': 'SoftwareApplication',
      name: t(TOOL_NAMES[tool.key], lang),
      description: t(TOOL_DESCRIPTIONS[tool.key], lang),
      url: `${BASE_URL}/${lang}/tools/${tool.slug}`,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
    })),
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: t(HOME_LABEL, lang), item: `${BASE_URL}/${lang}` },
      { '@type': 'ListItem', position: 2, name: t(TOOLS_LABEL, lang), item: pageUrl },
    ],
  }

  return (
    <>
      {/* JSON-LD structured data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPageSchema) }} />
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
        </section>

        {/* ================================================================= */}
        {/* Section B: Tool Cards Grid                                        */}
        {/* ================================================================= */}
        <section className="pb-12 sm:pb-16">
          <div className="grid gap-6 md:grid-cols-2">
            {TOOLS.map((tool) => (
              <Link
                key={tool.key}
                href={`/${lang}/tools/${tool.slug}`}
                className={`group rounded-xl border ${tool.borderAccent} bg-card/50 p-6 sm:p-8 transition-colors hover:bg-card/80 focus-visible:ring-2 focus-visible:ring-primary`}
              >
                {/* Icon + stat badge */}
                <div className="flex items-start justify-between">
                  <div className={`${tool.accent} ${tool.bgAccent} rounded-lg p-3`} aria-hidden="true">
                    {TOOL_ICONS[tool.key]}
                  </div>
                  <span className={`inline-flex items-center rounded-full ${tool.bgAccent} px-3 py-1 text-xs font-medium ${tool.accent}`}>
                    {t(TOOL_STATS[tool.key], lang)}
                  </span>
                </div>

                {/* Name */}
                <h2 className="mt-5 text-xl font-semibold font-[family-name:var(--font-display)]">
                  {t(TOOL_NAMES[tool.key], lang)}
                </h2>

                {/* Description */}
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  {t(TOOL_DESCRIPTIONS[tool.key], lang)}
                </p>

                {/* CTA */}
                <span className={`mt-5 inline-flex items-center gap-1.5 text-sm font-medium ${tool.accent} group-hover:underline`}>
                  {t(LEARN_MORE, lang)} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ================================================================= */}
        {/* Section C: Why Free?                                              */}
        {/* ================================================================= */}
        <section className="py-12 sm:py-16">
          <h2 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-display)] text-center">
            {t(H2_WHY_FREE, lang)}
          </h2>
          <p className="mt-6 max-w-3xl mx-auto text-muted-foreground leading-relaxed text-center">
            {t(WHY_FREE_TEXT, lang)}
          </p>
        </section>

        {/* ================================================================= */}
        {/* Section D: Final CTA                                              */}
        {/* ================================================================= */}
        <section className="py-12 sm:py-16 my-8 rounded-2xl bg-primary/5 text-center px-6">
          <h2 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-display)]">
            {t(CTA_HEADING, lang)}
          </h2>

          <div className="mt-8">
            <Link
              href={`/${lang}`}
              className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-6 py-3 font-medium hover:bg-primary/90 transition-colors focus-visible:ring-2 focus-visible:ring-primary"
            >
              {t(CTA_BUTTON, lang)} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </article>
    </>
  )
}
