import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { AiLabel } from '@/components/ai-label'
import { isSupportedLanguage, toBcp47, SUPPORTED_LANGUAGES, type AppLanguage } from '@/lib/i18n'
import { indexById, matchesTopicTerms, toTopicSlug, topicSlugToQuery, topicSlugToTitle } from '@/lib/topic-utils'
import { BRAND, absoluteUrl } from '@/lib/brand'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api-production-3ee5.up.railway.app/api'

// Note: this route reads `searchParams` (section / period / page / q), which
// opts the whole page into dynamic rendering — the `revalidate` below only
// governs the data cache behind the upstream fetches, not the HTML. Making
// the canonical page ISR would mean moving the filters client-side; the
// 2026-09 cost work chose to cut request volume instead (404 for empty
// topics, noindex/nofollow + robots Disallow on filtered variants, WAF).
export const revalidate = 3600

const PAGE_SIZE = 3
const TOPIC_SECTIONS = ['all', 'tech', 'investment', 'tips'] as const

type TopicSection = (typeof TOPIC_SECTIONS)[number]

type Props = {
  params: Promise<{ lang: string; topic: string }>
  searchParams: Promise<{ page?: string; period?: string; q?: string; section?: string }>
}

interface WeekEntry {
  id: string
  days?: { id: string }[]
}

interface WeeksResponse {
  weeks?: WeekEntry[]
}

interface TechPost {
  id: number
  content: string
  category: string
  source: string
  sourceUrl?: string
  tags?: string[]
}

interface PrimaryPost {
  id: number
  content: string
  company: string
  round: string
}

interface SecondaryPost {
  id: number
  content: string
  ticker: string
}

interface MaPost {
  id: number
  content: string
  acquirer: string
  target: string
  dealType: string
}

interface TipPost {
  id: number
  content: string
  tip: string
  category: string
}

type TopicBucket = {
  periodId: string
  tech: TechPost[]
  primary: PrimaryPost[]
  secondary: SecondaryPost[]
  ma: MaPost[]
  tips: TipPost[]
}

function normalizeTopicQuery(value: string | undefined): string {
  const trimmed = (value || '').trim()
  return trimmed.length > 0 && trimmed.length <= 180 ? trimmed : ''
}

function topicQueryToSearchText(topicSlug: string, queryText: string): string {
  if (!queryText) return topicSlugToQuery(topicSlug)
  const querySlug = toTopicSlug(queryText)
  return topicSlugToQuery(querySlug) || topicSlugToQuery(topicSlug)
}

function topicDisplayTitle(topicSlug: string, queryText: string): string {
  return queryText || topicSlugToTitle(topicSlug)
}

function toSearchTerms(topicSlug: string, queryText = ''): string[] {
  return topicQueryToSearchText(topicSlug, queryText)
    .split(' ')
    .map((term) => term.trim())
    .filter(Boolean)
}

function parsePositiveInt(value: string | undefined): number {
  const parsed = Number.parseInt(value || '1', 10)
  if (!Number.isFinite(parsed) || parsed < 1) return 1
  return parsed
}

function parseSection(value: string | undefined): TopicSection {
  if (!value) return 'all'
  if ((TOPIC_SECTIONS as readonly string[]).includes(value)) return value as TopicSection
  return 'all'
}

function isValidPeriodId(value: string | undefined): boolean {
  if (!value) return false
  return /^\d{4}-kw\d{2}$/.test(value) || /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function projectBucketBySection(bucket: TopicBucket, section: TopicSection): TopicBucket {
  if (section === 'all') return bucket
  if (section === 'tech') {
    return { ...bucket, primary: [], secondary: [], ma: [], tips: [] }
  }
  if (section === 'investment') {
    return { ...bucket, tech: [], tips: [] }
  }
  return { ...bucket, tech: [], primary: [], secondary: [], ma: [] }
}

function bucketResultCount(bucket: TopicBucket): number {
  return bucket.tech.length + bucket.primary.length + bucket.secondary.length + bucket.ma.length + bucket.tips.length
}

function buildTopicHref(
  lang: AppLanguage,
  topic: string,
  opts: { page?: number; period?: string; q?: string; section?: TopicSection; hash?: string }
): string {
  const params = new URLSearchParams()
  if (opts.period) params.set('period', opts.period)
  if (opts.q) params.set('q', opts.q)
  if (opts.section && opts.section !== 'all') params.set('section', opts.section)
  if (opts.page && opts.page > 1) params.set('page', String(opts.page))

  const base = `/${lang}/topic/${topic}`
  const query = params.toString()
  const url = query ? `${base}?${query}` : base
  return opts.hash ? `${url}#${opts.hash}` : url
}

function entryAnchorId(periodId: string, section: string, id: number): string {
  return `${periodId}-${section}-${id}`.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase()
}

async function getWeeks(): Promise<WeekEntry[]> {
  try {
    const res = await fetch(`${API_BASE}/weeks`, { next: { revalidate: 3600 } })
    if (res.ok) {
      const data = (await res.json()) as WeeksResponse
      if (data.weeks && data.weeks.length > 0) return data.weeks
    }
  } catch {}

  try {
    const raw = await readFile(path.join(process.cwd(), 'public', 'data', 'weeks.json'), 'utf-8')
    const data = JSON.parse(raw) as WeeksResponse
    return data.weeks || []
  } catch {
    return []
  }
}

// How many recent periods a topic hub aggregates. Each period costs three
// concurrent upstream fetches on a cold render (the responses then sit in the
// shared data cache for an hour), so keep this in line with the sitemap's
// article window rather than widening it — a 2026-08 build fired hundreds of
// concurrent API calls and exhausted the backend's DB connection pool.
const TOPIC_PERIOD_WINDOW = 8

function getCandidatePeriodIds(weeks: WeekEntry[], preferredPeriodId?: string): string[] {
  if (preferredPeriodId) return [preferredPeriodId]
  // Content has lived under daily period ids since collection went daily in
  // 2026-02; a week id only carries content for legacy weekly periods (the
  // ones without nested days). This used to query the six most recent *week*
  // ids, which have been empty ever since — every topic hub rendered
  // "No entries found" (2026-09 finding). Expand weeks to their days first.
  const periodIds = weeks.flatMap((week) =>
    week.days && week.days.length > 0 ? week.days.map((day) => day.id) : [week.id]
  )
  return periodIds.slice(0, TOPIC_PERIOD_WINDOW)
}

// `upstreamReachable` reports whether any period actually answered. An empty
// hub means "no matching entries" only when the content API was reachable —
// see the call site for why the difference matters.
// Searchable fields per section. Each list is applied to the localized item and
// to its English original (paired by id), and a hub matches when the terms
// appear in either. Hub slugs are derived from English, and a translation can
// render an entity away — the Chinese edition writes "Wharton" as 沃顿商学院 —
// so matching the localized text alone left 4 of 64 homepage trend links
// answering 404 in zh/ja/ko/fr (2026-09-16).
const techFields = (post?: TechPost) => (post ? [post.content, post.category, post.source, ...(post.tags || [])] : [])
const primaryFields = (post?: PrimaryPost) => (post ? [post.content, post.company, post.round] : [])
const secondaryFields = (post?: SecondaryPost) => (post ? [post.content, post.ticker] : [])
const maFields = (post?: MaPost) => (post ? [post.content, post.acquirer, post.target, post.dealType] : [])
const tipFields = (post?: TipPost) => (post ? [post.content, post.tip, post.category] : [])

function matchSection<T extends { id: number }>(
  localized: T[] | undefined,
  english: T[] | undefined,
  fields: (post?: T) => Array<string | undefined>,
  terms: string[],
): T[] {
  const englishById = indexById(english)
  return (localized || []).filter((post) =>
    matchesTopicTerms([...fields(post), ...fields(englishById.get(post.id))], terms)
  )
}

async function getTopicBuckets(terms: string[], language: AppLanguage, preferredPeriodId?: string): Promise<{ buckets: TopicBucket[]; upstreamReachable: boolean }> {
  const weeks = await getWeeks()
  const periodIds = getCandidatePeriodIds(weeks, preferredPeriodId)

  const bucketCandidates = await Promise.all(
    periodIds.map(async (periodId) => {
      const [techRes, investmentRes, tipsRes] = await Promise.all([
        fetch(`${API_BASE}/tech/${periodId}`, { next: { revalidate: 3600 } }).catch(() => null),
        fetch(`${API_BASE}/investment/${periodId}`, { next: { revalidate: 3600 } }).catch(() => null),
        fetch(`${API_BASE}/tips/${periodId}`, { next: { revalidate: 3600 } }).catch(() => null),
      ])

      // A 404 means the API answered and that period simply holds nothing, which is
      // a normal answer — only a network error or a 5xx means upstream is down. The
      // distinction matters because `?period=` narrows the candidate set to one id,
      // so treating 404 as unreachable turned any unknown period into a 500.
      const answered = (res: Response | null) => Boolean(res && (res.ok || res.status === 404))
      const reachable = answered(techRes) || answered(investmentRes) || answered(tipsRes)

      const techData = techRes?.ok ? await techRes.json() : null
      const investmentData = investmentRes?.ok ? await investmentRes.json() : null
      const tipsData = tipsRes?.ok ? await tipsRes.json() : null

      const tech = matchSection<TechPost>(techData?.[language], techData?.en, techFields, terms)
      const primary = matchSection<PrimaryPost>(investmentData?.primaryMarket?.[language], investmentData?.primaryMarket?.en, primaryFields, terms)
      const secondary = matchSection<SecondaryPost>(investmentData?.secondaryMarket?.[language], investmentData?.secondaryMarket?.en, secondaryFields, terms)
      const ma = matchSection<MaPost>(investmentData?.ma?.[language], investmentData?.ma?.en, maFields, terms)
      const tips = matchSection<TipPost>(tipsData?.[language], tipsData?.en, tipFields, terms)

      const bucket: TopicBucket | null =
        tech.length || primary.length || secondary.length || ma.length || tips.length
          ? { periodId, tech, primary, secondary, ma, tips }
          : null

      return { reachable, bucket }
    })
  )

  return {
    buckets: bucketCandidates
      .map((candidate) => candidate.bucket)
      .filter((bucket): bucket is TopicBucket => bucket !== null),
    upstreamReachable: bucketCandidates.some((candidate) => candidate.reachable),
  }
}

function buildBreadcrumbSchema(lang: AppLanguage, topic: string, topicTitle: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: ({
          de: 'Startseite',
          en: 'Home',
          zh: '首页',
          fr: 'Accueil',
          es: 'Inicio',
          pt: 'Início',
          ja: 'ホーム',
          ko: '홈',
        } as Record<string, string>)[lang] || 'Home',
        item: absoluteUrl(`/${lang}`),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: topicTitle,
        item: absoluteUrl(`/${lang}/topic/${topic}`),
      },
    ],
  }
}

function buildFAQSchema(lang: AppLanguage, topicTitle: string, buckets: TopicBucket[]) {
  const questions: { '@type': string; name: string; acceptedAnswer: { '@type': string; text: string } }[] = []

  const l = (translations: Record<string, string>): string =>
    translations[lang] || translations.en

  // Q1: What is [topic]?
  const firstTech = buckets.flatMap((b) => b.tech).find((p) => p.content)
  if (firstTech) {
    questions.push({
      '@type': 'Question',
      name: l({
        de: `Was ist ${topicTitle}?`,
        en: `What is ${topicTitle}?`,
        zh: `什么是${topicTitle}？`,
        fr: `Qu'est-ce que ${topicTitle} ?`,
        es: `¿Qué es ${topicTitle}?`,
        pt: `O que é ${topicTitle}?`,
        ja: `${topicTitle}とは？`,
        ko: `${topicTitle}란 무엇인가요?`,
      }),
      acceptedAnswer: {
        '@type': 'Answer',
        text: firstTech.content.slice(0, 300),
      },
    })
  }

  // Q2: Investment implications
  const firstInvest = buckets.flatMap((b) => [...b.primary, ...b.secondary, ...b.ma]).find((p) => p.content)
  if (firstInvest) {
    questions.push({
      '@type': 'Question',
      name: l({
        de: `Welche Investitionsauswirkungen hat ${topicTitle}?`,
        en: `What are the investment implications of ${topicTitle}?`,
        zh: `${topicTitle}的投资影响有哪些？`,
        fr: `Quelles sont les implications d'investissement de ${topicTitle} ?`,
        es: `¿Cuáles son las implicaciones de inversión de ${topicTitle}?`,
        pt: `Quais são as implicações de investimento de ${topicTitle}?`,
        ja: `${topicTitle}の投資への影響は？`,
        ko: `${topicTitle}의 투자 영향은 무엇인가요?`,
      }),
      acceptedAnswer: {
        '@type': 'Answer',
        text: firstInvest.content.slice(0, 300),
      },
    })
  }

  // Q3: Practical tips
  const firstTip = buckets.flatMap((b) => b.tips).find((p) => p.content)
  if (firstTip) {
    questions.push({
      '@type': 'Question',
      name: l({
        de: `Welche praktischen Tipps gibt es für ${topicTitle}?`,
        en: `What are practical tips for ${topicTitle}?`,
        zh: `关于${topicTitle}有哪些实用技巧？`,
        fr: `Quels sont les conseils pratiques pour ${topicTitle} ?`,
        es: `¿Cuáles son los consejos prácticos para ${topicTitle}?`,
        pt: `Quais são as dicas práticas para ${topicTitle}?`,
        ja: `${topicTitle}の実践的なヒントは？`,
        ko: `${topicTitle}에 대한 실용적인 팁은 무엇인가요?`,
      }),
      acceptedAnswer: {
        '@type': 'Answer',
        text: (firstTip.tip || firstTip.content).slice(0, 300),
      },
    })
  }

  if (questions.length === 0) return null

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions,
  }
}

function buildItemListSchema(lang: AppLanguage, topicTitle: string, buckets: TopicBucket[], section: TopicSection) {
  const items = buckets.slice(0, 20).map((bucket, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    url: absoluteUrl(`/${lang}/week/${bucket.periodId}`),
    name: `${topicTitle} - ${bucket.periodId}`,
  }))

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${topicTitle} topic results (${section})`,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    numberOfItems: items.length,
    itemListElement: items,
  }
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { lang, topic } = await params
  if (!isSupportedLanguage(lang)) return {}
  const query = await searchParams

  const topicQuery = normalizeTopicQuery(query.q)
  const topicTitle = topicDisplayTitle(topic, topicQuery)
  const localizedUrl = absoluteUrl(`/${lang}/topic/${topic}`)
  const section = parseSection(query.section)
  const period = isValidPeriodId(query.period) ? query.period : ''

  const canonicalUrl = localizedUrl

  const metaTitle = ({
    de: `${topicTitle} KI-News – Aktuelle Berichte & Analysen`,
    en: `${topicTitle} AI News – Latest Coverage & Analysis`,
    zh: `${topicTitle} AI新闻 – 最新报道与分析`,
    fr: `${topicTitle} Actualités IA – Dernières analyses`,
    es: `${topicTitle} Noticias IA – Últimos informes y análisis`,
    pt: `${topicTitle} Notícias IA – Últimas análises`,
    ja: `${topicTitle} AIニュース – 最新レポート＆分析`,
    ko: `${topicTitle} AI 뉴스 – 최신 보도 & 분석`,
  } as Record<string, string>)[lang] || `${topicTitle} AI News – Latest Coverage & Analysis`

  const metaDescription = ({
    de: `Kuratierte KI-Berichterstattung zu ${topicTitle}: Technologie-Updates, Investment-Signale und praktische Tipps.`,
    en: `Curated AI coverage for ${topicTitle}: technology updates, investment signals, and practical tips.`,
    zh: `${topicTitle}精选AI报道：技术动态、投资信号和实用技巧。`,
    fr: `Couverture IA sélectionnée pour ${topicTitle} : actualités tech, signaux d'investissement et conseils pratiques.`,
    es: `Cobertura de IA seleccionada para ${topicTitle}: noticias tecnológicas, señales de inversión y consejos prácticos.`,
    pt: `Cobertura de IA selecionada para ${topicTitle}: notícias de tecnologia, sinais de investimento e dicas práticas.`,
    ja: `${topicTitle}のAI厳選記事：テクノロジー、投資シグナル、実践ヒント。`,
    ko: `${topicTitle} AI 큐레이션: 기술 뉴스, 투자 신호, 실용 팁.`,
  } as Record<string, string>)[lang] || `Curated AI coverage for ${topicTitle}: technology updates, investment signals, and practical tips.`

  // Filtered variants (?section= / ?period= / ?page= / ?q=) are views of the
  // canonical topic page, not pages of their own: keep them out of the index
  // and stop crawlers from walking the filter combinations.
  const isFilteredVariant = Boolean(query.q || query.section || query.period || query.page)

  return {
    title: metaTitle,
    description: metaDescription,
    ...(isFilteredVariant ? { robots: { index: false, follow: false } } : {}),
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'x-default': absoluteUrl(`/en/topic/${topic}`),
        ...Object.fromEntries(
          SUPPORTED_LANGUAGES.map((code) => [
            toBcp47(code),
            absoluteUrl(`/${code}/topic/${topic}`),
          ])
        ),
      },
    },
    openGraph: {
      title: metaTitle,
      description: metaDescription,
      url: canonicalUrl,
      type: 'article',
      images: [
        {
          url: '/og-image.jpg',
          width: 1200,
          height: 630,
          alt: `${BRAND.name} – ${topicTitle}`,
        },
      ],
    },
  }
}

export async function generateStaticParams() {
  const deSlugs = new Set<string>()
  const enSlugs = new Set<string>()

  try {
    const dataRoot = path.join(process.cwd(), 'public', 'data')
    const entries = await readFile(path.join(dataRoot, 'weeks.json'), 'utf-8')
    const weeks = (JSON.parse(entries) as WeeksResponse).weeks || []

    for (const week of weeks.slice(0, 4)) {
      try {
        const trendsRaw = await readFile(path.join(dataRoot, week.id, 'trends.json'), 'utf-8')
        const trendsData = JSON.parse(trendsRaw)
        for (const item of (trendsData?.trends?.de || [])) {
          const slug = toTopicSlug(item.title)
          if (slug && slug !== 'topic') deSlugs.add(slug)
        }
        for (const item of (trendsData?.trends?.en || [])) {
          const slug = toTopicSlug(item.title)
          if (slug && slug !== 'topic') enSlugs.add(slug)
        }
      } catch {}
    }
  } catch {}

  // Generate params for all supported languages; non-DE languages use EN slugs as fallback
  const { SUPPORTED_LANGUAGES } = await import('@/lib/i18n')
  return SUPPORTED_LANGUAGES.flatMap((lang) => {
    const slugs = lang === 'de' ? deSlugs : enSlugs
    return Array.from(slugs).slice(0, 40).map((topic) => ({ lang, topic }))
  })
}

export default async function TopicPage({ params, searchParams }: Props) {
  const { lang, topic } = await params
  if (!isSupportedLanguage(lang)) notFound()

  const query = await searchParams
  const topicQuery = normalizeTopicQuery(query.q)
  const terms = toSearchTerms(topic, topicQuery)
  if (terms.length === 0) notFound()

  const periodFilter = isValidPeriodId(query.period) ? query.period : ''
  const { buckets, upstreamReachable } = await getTopicBuckets(terms, lang, periodFilter || undefined)
  // Nothing upstream answered — throw instead of 404ing. A 404 here would be
  // cached for `revalidate` seconds and would tell crawlers to drop a URL that
  // is only having a bad minute; a thrown error is not cached and is retried.
  if (!upstreamReachable) {
    throw new Error(`topic hub ${lang}/${topic}: content API unreachable`)
  }
  // A topic with no matching entries is a thin page nobody should crawl,
  // index or cache: answer 404 instead of rendering an empty shell (crawlers
  // enumerating junk slugs made this route the site's biggest compute sink).
  if (buckets.length === 0) notFound()
  const topicTitle = topicDisplayTitle(topic, topicQuery)
  const topicQueryParam = topicQuery || undefined
  const sectionFilter = parseSection(query.section)
  const sectionBuckets = buckets
    .map((bucket) => projectBucketBySection(bucket, sectionFilter))
    .filter((bucket) => bucketResultCount(bucket) > 0)

  const availablePeriods = sectionBuckets.map((bucket) => bucket.periodId)
  const activePeriodFilter = periodFilter && availablePeriods.includes(periodFilter) ? periodFilter : ''

  const filteredBuckets = activePeriodFilter
    ? sectionBuckets.filter((bucket) => bucket.periodId === activePeriodFilter)
    : sectionBuckets

  const requestedPage = parsePositiveInt(query.page)
  const totalPages = Math.max(1, Math.ceil(filteredBuckets.length / PAGE_SIZE))
  const currentPage = Math.min(requestedPage, totalPages)

  const start = (currentPage - 1) * PAGE_SIZE
  const pagedBuckets = filteredBuckets.slice(start, start + PAGE_SIZE)

  const total = filteredBuckets.reduce((acc, item) => acc + bucketResultCount(item), 0)

  const t = (translations: Record<string, string>): string =>
    translations[lang] || translations.en
  const sectionTitle = {
    all: t({ de: 'Alle Bereiche', en: 'All sections', zh: '所有板块', fr: 'Toutes les sections', es: 'Todas las secciones', pt: 'Todas as seções', ja: '全セクション', ko: '모든 섹션' }),
    tech: t({ de: 'Technologie', en: 'Technology', zh: '科技', fr: 'Technologie', es: 'Tecnología', pt: 'Tecnologia', ja: 'テクノロジー', ko: '기술' }),
    investment: t({ de: 'Investitionen', en: 'Investment', zh: '投资', fr: 'Investissement', es: 'Inversión', pt: 'Investimento', ja: '投資', ko: '투자' }),
    tips: t({ de: 'Tipps', en: 'Tips', zh: '技巧', fr: 'Conseils', es: 'Consejos', pt: 'Dicas', ja: 'ヒント', ko: '팁' }),
  } as const
  const breadcrumbSchema = buildBreadcrumbSchema(lang, topic, topicTitle)
  const itemListSchema = buildItemListSchema(lang, topicTitle, pagedBuckets, sectionFilter)
  const faqSchema = buildFAQSchema(lang, topicTitle, filteredBuckets)

  return (
    <main id="main-content">
    <article className="mx-auto max-w-4xl px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      {faqSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />}

      <header className="mb-8 border-b border-border pb-4">
        <h1 className="text-3xl font-bold">{topicTitle}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t({ de: 'Themen-Archiv', en: 'Topic archive', zh: '主题归档', fr: 'Archive thématique', es: 'Archivo temático', pt: 'Arquivo temático', ja: 'トピックアーカイブ', ko: '주제 아카이브' })} • {total} {t({ de: 'Treffer', en: 'matches', zh: '条结果', fr: 'résultats', es: 'resultados', pt: 'resultados', ja: '件', ko: '건' })}
        </p>
        <AiLabel lang={lang} className="mt-2 text-sm text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">
          <a className="underline" href={`/${lang}`}>{t({ de: 'Zur Startseite', en: 'Back to home', zh: '返回首页', fr: "Retour à l'accueil", es: 'Volver al inicio', pt: 'Voltar ao início', ja: 'ホームに戻る', ko: '홈으로 돌아가기' })}</a>
          <span> • </span>
          <a
            className="underline"
            href={`/api/content-summary?lang=${lang}&section=${sectionFilter}&periodId=${encodeURIComponent(periodFilter || pagedBuckets[0]?.periodId || '')}&topic=${encodeURIComponent(terms.join(' '))}`}
          >
            GEO summary endpoint
          </a>
        </p>

        <nav className="mt-4 flex flex-wrap items-center gap-2" aria-label="Section filter">
          {TOPIC_SECTIONS.map((section) => (
            <a rel="nofollow"
              key={section}
              href={buildTopicHref(lang, topic, { section, period: periodFilter || undefined, q: topicQueryParam })}
              className={`rounded-full border px-3 py-1 text-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${sectionFilter === section ? 'border-primary text-primary' : 'border-border text-muted-foreground'}`}
            >
              {sectionTitle[section]}
            </a>
          ))}
        </nav>

        {availablePeriods.length > 0 ? (
          <nav className="mt-3 flex flex-wrap items-center gap-2" aria-label="Period filter">
            <a rel="nofollow"
              href={buildTopicHref(lang, topic, { section: sectionFilter, q: topicQueryParam })}
              className={`rounded-full border px-3 py-1 text-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${periodFilter ? 'border-border text-muted-foreground' : 'border-primary text-primary'}`}
            >
              {t({ de: 'Alle Zeiträume', en: 'All periods', zh: '所有时段', fr: 'Toutes les périodes', es: 'Todos los periodos', pt: 'Todos os períodos', ja: '全期間', ko: '전체 기간' })}
            </a>
            {availablePeriods.slice(0, 12).map((periodId) => (
              <a rel="nofollow"
                key={periodId}
                href={buildTopicHref(lang, topic, { period: periodId, section: sectionFilter, q: topicQueryParam })}
                className={`rounded-full border px-3 py-1 text-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${periodFilter === periodId ? 'border-primary text-primary' : 'border-border text-muted-foreground'}`}
              >
                {periodId}
              </a>
            ))}
          </nav>
        ) : null}
      </header>

      {pagedBuckets.length === 0 ? (
        <p className="text-muted-foreground">{t({ de: 'Keine Einträge für dieses Thema gefunden.', en: 'No entries found for this topic.', zh: '未找到该主题的内容。', fr: 'Aucune entrée trouvée pour ce sujet.', es: 'No se encontraron entradas para este tema.', pt: 'Nenhuma entrada encontrada para este tópico.', ja: 'このトピックに関するエントリは見つかりませんでした。', ko: '이 주제에 대한 항목을 찾을 수 없습니다.' })}</p>
      ) : (
        <div className="space-y-10">
          {pagedBuckets.map((bucket) => (
            <section key={bucket.periodId} className="space-y-5">
              <h2 className="text-2xl font-semibold">
                <a className="hover:underline" href={`/${lang}/week/${bucket.periodId}`}>
                  {bucket.periodId}
                </a>
              </h2>

              {bucket.tech.length > 0 ? (
                <div>
                  <h3 className="mb-2 text-lg font-semibold">{sectionTitle.tech}</h3>
                  <ul className="space-y-3">
                    {bucket.tech.slice(0, 8).map((post) => {
                      const anchorId = entryAnchorId(bucket.periodId, 'tech', post.id)
                      return (
                        <li id={anchorId} key={`tech-${bucket.periodId}-${post.id}`} className="scroll-mt-20 border-l-2 border-border pl-3">
                          <p className="font-medium">{post.content}</p>
                          <p className="text-sm text-muted-foreground">{post.category} • {post.source}</p>
                          <a rel="nofollow"
                            className="text-xs text-muted-foreground underline"
                            href={buildTopicHref(lang, topic, { period: bucket.periodId, q: topicQueryParam, section: sectionFilter, hash: anchorId })}
                          >
                            {t({ de: 'Direktlink', en: 'Permalink', zh: '永久链接', fr: 'Lien permanent', es: 'Enlace permanente', pt: 'Link permanente', ja: 'パーマリンク', ko: '퍼머링크' })}
                          </a>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ) : null}

              {bucket.primary.length + bucket.secondary.length + bucket.ma.length > 0 ? (
                <div>
                  <h3 className="mb-2 text-lg font-semibold">{sectionTitle.investment}</h3>
                  <ul className="space-y-3">
                    {bucket.primary.slice(0, 4).map((post) => {
                      const anchorId = entryAnchorId(bucket.periodId, 'pm', post.id)
                      return (
                        <li id={anchorId} key={`pm-${bucket.periodId}-${post.id}`} className="scroll-mt-20 border-l-2 border-border pl-3">
                          <p className="font-medium">{post.company} • {post.round}</p>
                          <p className="text-sm text-muted-foreground">{post.content}</p>
                          <a rel="nofollow" className="text-xs text-muted-foreground underline" href={buildTopicHref(lang, topic, { period: bucket.periodId, q: topicQueryParam, section: sectionFilter, hash: anchorId })}>
                            {t({ de: 'Direktlink', en: 'Permalink', zh: '永久链接', fr: 'Lien permanent', es: 'Enlace permanente', pt: 'Link permanente', ja: 'パーマリンク', ko: '퍼머링크' })}
                          </a>
                        </li>
                      )
                    })}
                    {bucket.secondary.slice(0, 4).map((post) => {
                      const anchorId = entryAnchorId(bucket.periodId, 'sm', post.id)
                      return (
                        <li id={anchorId} key={`sm-${bucket.periodId}-${post.id}`} className="scroll-mt-20 border-l-2 border-border pl-3">
                          <p className="font-medium">{post.ticker}</p>
                          <p className="text-sm text-muted-foreground">{post.content}</p>
                          <a rel="nofollow" className="text-xs text-muted-foreground underline" href={buildTopicHref(lang, topic, { period: bucket.periodId, q: topicQueryParam, section: sectionFilter, hash: anchorId })}>
                            {t({ de: 'Direktlink', en: 'Permalink', zh: '永久链接', fr: 'Lien permanent', es: 'Enlace permanente', pt: 'Link permanente', ja: 'パーマリンク', ko: '퍼머링크' })}
                          </a>
                        </li>
                      )
                    })}
                    {bucket.ma.slice(0, 4).map((post) => {
                      const anchorId = entryAnchorId(bucket.periodId, 'ma', post.id)
                      return (
                        <li id={anchorId} key={`ma-${bucket.periodId}-${post.id}`} className="scroll-mt-20 border-l-2 border-border pl-3">
                          <p className="font-medium">{post.acquirer} → {post.target}</p>
                          <p className="text-sm text-muted-foreground">{post.content}</p>
                          <a rel="nofollow" className="text-xs text-muted-foreground underline" href={buildTopicHref(lang, topic, { period: bucket.periodId, q: topicQueryParam, section: sectionFilter, hash: anchorId })}>
                            {t({ de: 'Direktlink', en: 'Permalink', zh: '永久链接', fr: 'Lien permanent', es: 'Enlace permanente', pt: 'Link permanente', ja: 'パーマリンク', ko: '퍼머링크' })}
                          </a>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ) : null}

              {bucket.tips.length > 0 ? (
                <div>
                  <h3 className="mb-2 text-lg font-semibold">{sectionTitle.tips}</h3>
                  <ul className="space-y-3">
                    {bucket.tips.slice(0, 6).map((tip) => {
                      const anchorId = entryAnchorId(bucket.periodId, 'tips', tip.id)
                      return (
                        <li id={anchorId} key={`tip-${bucket.periodId}-${tip.id}`} className="scroll-mt-20 border-l-2 border-border pl-3">
                          <p className="font-medium">{tip.category}</p>
                          <p className="text-sm text-muted-foreground">{tip.content}</p>
                          <a rel="nofollow" className="text-xs text-muted-foreground underline" href={buildTopicHref(lang, topic, { period: bucket.periodId, q: topicQueryParam, section: sectionFilter, hash: anchorId })}>
                            {t({ de: 'Direktlink', en: 'Permalink', zh: '永久链接', fr: 'Lien permanent', es: 'Enlace permanente', pt: 'Link permanente', ja: 'パーマリンク', ko: '퍼머링크' })}
                          </a>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ) : null}
            </section>
          ))}
        </div>
      )}

      {filteredBuckets.length > PAGE_SIZE ? (
        <nav className="mt-10 flex items-center justify-between border-t border-border pt-4" aria-label="Topic pagination">
          {currentPage > 1 ? (
            <a rel="nofollow" className="underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded" href={buildTopicHref(lang, topic, { period: periodFilter || undefined, q: topicQueryParam, section: sectionFilter, page: currentPage - 1 })}>
              {t({ de: '← Vorherige', en: '← Previous', zh: '← 上一页', fr: '← Précédent', es: '← Anterior', pt: '← Anterior', ja: '← 前へ', ko: '← 이전' })}
            </a>
          ) : (
            <span className="text-muted-foreground">{t({ de: '← Vorherige', en: '← Previous', zh: '← 上一页', fr: '← Précédent', es: '← Anterior', pt: '← Anterior', ja: '← 前へ', ko: '← 이전' })}</span>
          )}

          <span className="text-sm text-muted-foreground">
            {t({ de: 'Seite', en: 'Page', zh: '页', fr: 'Page', es: 'Página', pt: 'Página', ja: 'ページ', ko: '페이지' })} {currentPage} / {totalPages}
          </span>

          {currentPage < totalPages ? (
            <a rel="nofollow" className="underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded" href={buildTopicHref(lang, topic, { period: periodFilter || undefined, q: topicQueryParam, section: sectionFilter, page: currentPage + 1 })}>
              {t({ de: 'Nächste →', en: 'Next →', zh: '下一页 →', fr: 'Suivant →', es: 'Siguiente →', pt: 'Próximo →', ja: '次へ →', ko: '다음 →' })}
            </a>
          ) : (
            <span className="text-muted-foreground">{t({ de: 'Nächste →', en: 'Next →', zh: '下一页 →', fr: 'Suivant →', es: 'Siguiente →', pt: 'Próximo →', ja: '次へ →', ko: '다음 →' })}</span>
          )}
        </nav>
      ) : null}
      <footer className="mt-8 border-t border-border pt-4 text-sm text-muted-foreground">
        <a className="underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded" href="/contact">
          {t({ de: 'Kontakt', en: 'Contact', zh: '联系', fr: 'Contact', es: 'Contacto', pt: 'Contato', ja: 'お問い合わせ', ko: '문의' })}
        </a>
        <span className="mx-2">|</span>
        <a className="underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded" href="/datenschutz">
          {t({ de: 'Datenschutz', en: 'Privacy Policy', zh: '隐私政策', fr: 'Confidentialité', es: 'Privacidad', pt: 'Privacidade', ja: 'プライバシー', ko: '개인정보' })}
        </a>
      </footer>
    </article>
    </main>
  )
}
