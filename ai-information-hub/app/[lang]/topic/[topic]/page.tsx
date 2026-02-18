import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { isSupportedLanguage, type AppLanguage } from '@/lib/i18n'
import { toTopicSlug, topicSlugToQuery, topicSlugToTitle } from '@/lib/topic-utils'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api-production-3ee5.up.railway.app/api'

export const revalidate = 3600

const PAGE_SIZE = 3
const TOPIC_SECTIONS = ['all', 'tech', 'investment', 'tips'] as const

type TopicSection = (typeof TOPIC_SECTIONS)[number]

type Props = {
  params: Promise<{ lang: string; topic: string }>
  searchParams: Promise<{ page?: string; period?: string; section?: string }>
}

interface WeekEntry {
  id: string
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

function toSearchTerms(topicSlug: string): string[] {
  return topicSlugToQuery(topicSlug)
    .split(' ')
    .map((term) => term.trim())
    .filter(Boolean)
}

function matchesTerms(fields: Array<string | undefined>, terms: string[]): boolean {
  if (terms.length === 0) return false
  const haystack = fields.map((field) => (field || '').toLowerCase()).join(' ')
  return terms.every((term) => haystack.includes(term))
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
  opts: { page?: number; period?: string; section?: TopicSection; hash?: string }
): string {
  const params = new URLSearchParams()
  if (opts.period) params.set('period', opts.period)
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

async function getTopicBuckets(terms: string[], language: AppLanguage): Promise<TopicBucket[]> {
  const weeks = await getWeeks()
  const periodIds = weeks.slice(0, 6).map((w) => w.id)

  const bucketCandidates = await Promise.all(
    periodIds.map(async (periodId) => {
      const [techRes, investmentRes, tipsRes] = await Promise.all([
        fetch(`${API_BASE}/tech/${periodId}`, { next: { revalidate: 3600 } }).catch(() => null),
        fetch(`${API_BASE}/investment/${periodId}`, { next: { revalidate: 3600 } }).catch(() => null),
        fetch(`${API_BASE}/tips/${periodId}`, { next: { revalidate: 3600 } }).catch(() => null),
      ])

      const techData = techRes?.ok ? await techRes.json() : null
      const investmentData = investmentRes?.ok ? await investmentRes.json() : null
      const tipsData = tipsRes?.ok ? await tipsRes.json() : null

      const tech: TechPost[] = (techData?.[language] || []).filter((post: TechPost) =>
        matchesTerms([post.content, post.category, post.source, ...(post.tags || [])], terms)
      )

      const primary: PrimaryPost[] = (investmentData?.primaryMarket?.[language] || []).filter((post: PrimaryPost) =>
        matchesTerms([post.content, post.company, post.round], terms)
      )

      const secondary: SecondaryPost[] = (investmentData?.secondaryMarket?.[language] || []).filter((post: SecondaryPost) =>
        matchesTerms([post.content, post.ticker], terms)
      )

      const ma: MaPost[] = (investmentData?.ma?.[language] || []).filter((post: MaPost) =>
        matchesTerms([post.content, post.acquirer, post.target, post.dealType], terms)
      )

      const tips: TipPost[] = (tipsData?.[language] || []).filter((post: TipPost) =>
        matchesTerms([post.content, post.tip, post.category], terms)
      )

      if (tech.length || primary.length || secondary.length || ma.length || tips.length) {
        return { periodId, tech, primary, secondary, ma, tips }
      }

      return null
    })
  )

  return bucketCandidates.filter((bucket): bucket is TopicBucket => bucket !== null)
}

function buildBreadcrumbSchema(lang: AppLanguage, topic: string, topicTitle: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: lang === 'de' ? 'Startseite' : 'Home',
        item: `https://www.datacubeai.space/${lang}`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: topicTitle,
        item: `https://www.datacubeai.space/${lang}/topic/${topic}`,
      },
    ],
  }
}

function buildFAQSchema(lang: AppLanguage, topicTitle: string, buckets: TopicBucket[]) {
  const questions: { '@type': string; name: string; acceptedAnswer: { '@type': string; text: string } }[] = []

  // Q1: What is [topic]?
  const firstTech = buckets.flatMap((b) => b.tech).find((p) => p.content)
  if (firstTech) {
    questions.push({
      '@type': 'Question',
      name: lang === 'de' ? `Was ist ${topicTitle}?` : `What is ${topicTitle}?`,
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
      name: lang === 'de'
        ? `Welche Investitionsauswirkungen hat ${topicTitle}?`
        : `What are the investment implications of ${topicTitle}?`,
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
      name: lang === 'de'
        ? `Welche praktischen Tipps gibt es für ${topicTitle}?`
        : `What are practical tips for ${topicTitle}?`,
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
    url: `https://www.datacubeai.space/${lang}/week/${bucket.periodId}`,
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

  const topicTitle = topicSlugToTitle(topic)
  const localizedUrl = `https://www.datacubeai.space/${lang}/topic/${topic}`
  const section = parseSection(query.section)
  const period = isValidPeriodId(query.period) ? query.period : ''

  const canonicalUrl = localizedUrl

  return {
    title: lang === 'de' ? `${topicTitle} KI-News` : `${topicTitle} AI News`,
    description: lang === 'de'
      ? `Kuratierte KI-Berichterstattung und Investment-/Tipps-Updates zum Thema ${topicTitle}.`
      : `Curated AI coverage and investment/tips updates for: ${topicTitle}.`,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'x-default': canonicalUrl,
      },
    },
    openGraph: {
      title: lang === 'de' ? `${topicTitle} KI-News` : `${topicTitle} AI News`,
      description: lang === 'de'
        ? `KI-Berichterstattung: ${topicTitle}.`
        : `AI coverage: ${topicTitle}.`,
      url: canonicalUrl,
      type: 'article',
      images: [
        {
          url: '/og-image.jpg',
          width: 1200,
          height: 630,
          alt: lang === 'de'
            ? `Data Cube AI – ${topicTitle}`
            : `Data Cube AI – ${topicTitle}`,
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
  const terms = toSearchTerms(topic)
  if (terms.length === 0) notFound()

  const buckets = await getTopicBuckets(terms, lang)
  const topicTitle = topicSlugToTitle(topic)
  const sectionFilter = parseSection(query.section)
  const sectionBuckets = buckets
    .map((bucket) => projectBucketBySection(bucket, sectionFilter))
    .filter((bucket) => bucketResultCount(bucket) > 0)

  const availablePeriods = sectionBuckets.map((bucket) => bucket.periodId)
  const periodFilter = query.period && availablePeriods.includes(query.period) ? query.period : ''

  const filteredBuckets = periodFilter
    ? sectionBuckets.filter((bucket) => bucket.periodId === periodFilter)
    : sectionBuckets

  const requestedPage = parsePositiveInt(query.page)
  const totalPages = Math.max(1, Math.ceil(filteredBuckets.length / PAGE_SIZE))
  const currentPage = Math.min(requestedPage, totalPages)

  const start = (currentPage - 1) * PAGE_SIZE
  const pagedBuckets = filteredBuckets.slice(start, start + PAGE_SIZE)

  const total = filteredBuckets.reduce((acc, item) => acc + bucketResultCount(item), 0)

  const sectionLabel = (de: string, en: string): string => (lang === 'de' ? de : en)
  const sectionTitle = {
    all: sectionLabel('Alle Bereiche', 'All sections'),
    tech: sectionLabel('Technologie', 'Technology'),
    investment: sectionLabel('Investment', 'Investment'),
    tips: sectionLabel('Tipps', 'Tips'),
  } as const
  const breadcrumbSchema = buildBreadcrumbSchema(lang, topic, topicTitle)
  const itemListSchema = buildItemListSchema(lang, topicTitle, pagedBuckets, sectionFilter)
  const faqSchema = buildFAQSchema(lang, topicTitle, filteredBuckets)

  return (
    <article className="mx-auto max-w-4xl px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      {faqSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />}

      <header className="mb-8 border-b border-border pb-4">
        <h1 className="text-3xl font-bold">{topicTitle}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {sectionLabel('Themen-Archiv', 'Topic archive')} • {total} {sectionLabel('Treffer', 'matches')}
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          <a className="underline" href={`/${lang}`}>{sectionLabel('Zur Startseite', 'Back to home')}</a>
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
            <a
              key={section}
              href={buildTopicHref(lang, topic, { section, period: periodFilter || undefined })}
              className={`rounded-full border px-3 py-1 text-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${sectionFilter === section ? 'border-primary text-primary' : 'border-border text-muted-foreground'}`}
            >
              {sectionTitle[section]}
            </a>
          ))}
        </nav>

        {availablePeriods.length > 0 ? (
          <nav className="mt-3 flex flex-wrap items-center gap-2" aria-label="Period filter">
            <a
              href={buildTopicHref(lang, topic, { section: sectionFilter })}
              className={`rounded-full border px-3 py-1 text-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${periodFilter ? 'border-border text-muted-foreground' : 'border-primary text-primary'}`}
            >
              {sectionLabel('Alle Zeiträume', 'All periods')}
            </a>
            {availablePeriods.slice(0, 12).map((periodId) => (
              <a
                key={periodId}
                href={buildTopicHref(lang, topic, { period: periodId, section: sectionFilter })}
                className={`rounded-full border px-3 py-1 text-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${periodFilter === periodId ? 'border-primary text-primary' : 'border-border text-muted-foreground'}`}
              >
                {periodId}
              </a>
            ))}
          </nav>
        ) : null}
      </header>

      {pagedBuckets.length === 0 ? (
        <p className="text-muted-foreground">{sectionLabel('Keine Einträge für dieses Thema gefunden.', 'No entries found for this topic.')}</p>
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
                  <h3 className="mb-2 text-lg font-semibold">Technology</h3>
                  <ul className="space-y-3">
                    {bucket.tech.slice(0, 8).map((post) => {
                      const anchorId = entryAnchorId(bucket.periodId, 'tech', post.id)
                      return (
                        <li id={anchorId} key={`tech-${bucket.periodId}-${post.id}`} className="scroll-mt-20 border-l-2 border-border pl-3">
                          <p className="font-medium">{post.content}</p>
                          <p className="text-sm text-muted-foreground">{post.category} • {post.source}</p>
                          <a
                            className="text-xs text-muted-foreground underline"
                            href={buildTopicHref(lang, topic, { period: bucket.periodId, section: sectionFilter, hash: anchorId })}
                          >
                            {sectionLabel('Direktlink', 'Permalink')}
                          </a>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ) : null}

              {bucket.primary.length + bucket.secondary.length + bucket.ma.length > 0 ? (
                <div>
                  <h3 className="mb-2 text-lg font-semibold">Investment</h3>
                  <ul className="space-y-3">
                    {bucket.primary.slice(0, 4).map((post) => {
                      const anchorId = entryAnchorId(bucket.periodId, 'pm', post.id)
                      return (
                        <li id={anchorId} key={`pm-${bucket.periodId}-${post.id}`} className="scroll-mt-20 border-l-2 border-border pl-3">
                          <p className="font-medium">{post.company} • {post.round}</p>
                          <p className="text-sm text-muted-foreground">{post.content}</p>
                          <a className="text-xs text-muted-foreground underline" href={buildTopicHref(lang, topic, { period: bucket.periodId, section: sectionFilter, hash: anchorId })}>
                            {sectionLabel('Direktlink', 'Permalink')}
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
                          <a className="text-xs text-muted-foreground underline" href={buildTopicHref(lang, topic, { period: bucket.periodId, section: sectionFilter, hash: anchorId })}>
                            {sectionLabel('Direktlink', 'Permalink')}
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
                          <a className="text-xs text-muted-foreground underline" href={buildTopicHref(lang, topic, { period: bucket.periodId, section: sectionFilter, hash: anchorId })}>
                            {sectionLabel('Direktlink', 'Permalink')}
                          </a>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ) : null}

              {bucket.tips.length > 0 ? (
                <div>
                  <h3 className="mb-2 text-lg font-semibold">Tips</h3>
                  <ul className="space-y-3">
                    {bucket.tips.slice(0, 6).map((tip) => {
                      const anchorId = entryAnchorId(bucket.periodId, 'tips', tip.id)
                      return (
                        <li id={anchorId} key={`tip-${bucket.periodId}-${tip.id}`} className="scroll-mt-20 border-l-2 border-border pl-3">
                          <p className="font-medium">{tip.category}</p>
                          <p className="text-sm text-muted-foreground">{tip.content}</p>
                          <a className="text-xs text-muted-foreground underline" href={buildTopicHref(lang, topic, { period: bucket.periodId, section: sectionFilter, hash: anchorId })}>
                            {sectionLabel('Direktlink', 'Permalink')}
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
            <a className="underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded" href={buildTopicHref(lang, topic, { period: periodFilter || undefined, section: sectionFilter, page: currentPage - 1 })}>
              {sectionLabel('← Vorherige', '← Previous')}
            </a>
          ) : (
            <span className="text-muted-foreground">{sectionLabel('← Vorherige', '← Previous')}</span>
          )}

          <span className="text-sm text-muted-foreground">
            {sectionLabel('Seite', 'Page')} {currentPage} / {totalPages}
          </span>

          {currentPage < totalPages ? (
            <a className="underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded" href={buildTopicHref(lang, topic, { period: periodFilter || undefined, section: sectionFilter, page: currentPage + 1 })}>
              {sectionLabel('Nächste →', 'Next →')}
            </a>
          ) : (
            <span className="text-muted-foreground">{sectionLabel('Nächste →', 'Next →')}</span>
          )}
        </nav>
      ) : null}
    </article>
  )
}
