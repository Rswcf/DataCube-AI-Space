import type { Metadata } from 'next'
import { ArticleSchema, VideoSchema, BreadcrumbListSchema } from '@/components/structured-data'
import { formatPeriodTitle } from '@/lib/period-utils'
import type { TechPost, BilingualData, InvestmentData, TipPost, ImpactLevel } from '@/lib/types'
import { toTopicSlug } from '@/lib/topic-utils'

// API base URL with production fallback
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api-production-3ee5.up.railway.app/api'

// ISR: revalidate every hour
export const revalidate = 3600

// Next.js 15+ async params/searchParams typing per request
export type Props = {
  params: Promise<{ weekId: string }>
  searchParams: Promise<{ lang?: string }>
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { weekId } = await params
  const lang = (await searchParams)?.lang === 'en' ? 'en' : 'de'
  const periodLabel = formatPeriodTitle(weekId, lang)
  const localizedUrl = `https://www.datacubeai.space/${lang}/week/${weekId}`

  return {
    title: lang === 'de' ? `KI-News ${periodLabel}` : `AI News ${periodLabel}`,
    description: lang === 'de'
      ? `Kuratierte KI-News der ${periodLabel}: Technologie-Durchbrüche, Investment-Signale und praktische Tipps – täglich aktualisiert auf DataCube AI.`
      : `Curated AI news for ${periodLabel}: technology breakthroughs, investment signals, and practical tips – updated daily on DataCube AI.`,
    alternates: {
      canonical: localizedUrl,
      languages: {
        de: `https://www.datacubeai.space/de/week/${weekId}`,
        en: `https://www.datacubeai.space/en/week/${weekId}`,
        'x-default': `https://www.datacubeai.space/de/week/${weekId}`,
      },
    },
    openGraph: {
      title: lang === 'de' ? `KI-News ${periodLabel}` : `AI News ${periodLabel}`,
      description: lang === 'de'
        ? `Kuratierte KI-News der ${periodLabel}: Technologie-Durchbrüche, Investment-Signale und praktische Tipps – täglich aktualisiert auf DataCube AI.`
        : `Curated AI news for ${periodLabel}: technology breakthroughs, investment signals, and practical tips – updated daily on DataCube AI.`,
      url: localizedUrl,
      type: 'article',
    },
  }
}

export async function generateStaticParams() {
  try {
    const res = await fetch(`${API_BASE}/weeks`, { next: { revalidate: 3600 } })
    if (res.ok) {
      const data = await res.json()
      return (data.weeks || []).map((w: { id: string }) => ({ weekId: w.id }))
    }
  } catch {}
  return []
}

function impactBadgeClass(impact: ImpactLevel | undefined) {
  switch (impact) {
    case 'critical':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'medium':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'low':
      return 'bg-gray-100 text-gray-800 border-gray-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

function snippetFromContent(content: string, max = 100) {
  const firstLine = (content || '').split('\n')[0]?.trim() || ''
  const base = firstLine.length > 0 ? firstLine : (content || '')
  return base.length > max ? `${base.slice(0, max)}…` : base
}

export default async function WeekPage({ params, searchParams }: Props) {
  const { weekId } = await params
  const lang = (await searchParams)?.lang === 'en' ? 'en' : 'de'
  const periodLabel = formatPeriodTitle(weekId, lang)

  // Fetch the three feeds in parallel
  const [techRes, investmentRes, tipsRes] = await Promise.all([
    fetch(`${API_BASE}/tech/${weekId}`, { next: { revalidate: 3600 } }),
    fetch(`${API_BASE}/investment/${weekId}`, { next: { revalidate: 3600 } }),
    fetch(`${API_BASE}/tips/${weekId}`, { next: { revalidate: 3600 } }),
  ])

  let techData: BilingualData<TechPost> | null = null
  let investmentData: InvestmentData | null = null
  let tipsData: BilingualData<TipPost> | null = null

  try {
    if (techRes.ok) techData = await techRes.json()
  } catch {}
  try {
    if (investmentRes.ok) investmentData = await investmentRes.json()
  } catch {}
  try {
    if (tipsRes.ok) tipsData = await tipsRes.json()
  } catch {}

  const techPostsAll: TechPost[] = techData ? (techData as any)[lang] || (techData as any).de || [] : []
  const nonVideoTechPosts = (techPostsAll || []).filter((p) => !p.isVideo)
  const videoTechPosts = (techPostsAll || []).filter((p) => !!p.isVideo)

  const primaryMarket = investmentData ? (investmentData as any).primaryMarket?.[lang] || [] : []
  const secondaryMarket = investmentData ? (investmentData as any).secondaryMarket?.[lang] || [] : []
  const maDeals = investmentData ? (investmentData as any).ma?.[lang] || [] : []

  const tips = tipsData ? (tipsData as any)[lang] || [] : []

  // Optionally fetch weeks to display date range and prev/next navigation
  let dateRange: string | undefined
  let prevId: string | undefined
  let nextId: string | undefined
  try {
    const weeksRes = await fetch(`${API_BASE}/weeks`, { next: { revalidate: 3600 } })
    if (weeksRes.ok) {
      const weeksData = await weeksRes.json()
      const allWeeks: { id: string; dateRange?: string; days?: { id: string }[] }[] = weeksData?.weeks || []
      const match = allWeeks.find((w) => w.id === weekId)
      dateRange = match?.dateRange

      // Build a flat list of all period IDs (weeks + days) for prev/next
      const allIds: string[] = []
      for (const w of allWeeks) {
        allIds.push(w.id)
        if (w.days) {
          for (const d of w.days) {
            allIds.push(d.id)
          }
        }
      }
      const currentIdx = allIds.indexOf(weekId)
      if (currentIdx > 0) prevId = allIds[currentIdx - 1]
      if (currentIdx >= 0 && currentIdx < allIds.length - 1) nextId = allIds[currentIdx + 1]
    }
  } catch {}

  return (
    <article className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <BreadcrumbListSchema weekId={weekId} weekLabel={periodLabel} />
      <header className="mb-8">
        <h1 className="text-3xl font-bold">AI News {periodLabel}</h1>
        <p className="mt-2 text-sm text-gray-600">
          {dateRange ? <span>{dateRange}</span> : null}
          {dateRange ? <span> • </span> : null}
          <span>Language: </span>
          <a href={`/de/week/${weekId}`} className={lang === 'de' ? 'font-semibold underline' : 'hover:underline'}>DE</a>
          <span> / </span>
          <a href={`/en/week/${weekId}`} className={lang === 'en' ? 'font-semibold underline' : 'hover:underline'}>EN</a>
        </p>
      </header>

      {/* Tech Section */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Technology / Technologie</h2>
        {nonVideoTechPosts.length === 0 ? (
          <p className="text-gray-600">No technology posts available.</p>
        ) : (
          <div className="space-y-6">
            {nonVideoTechPosts.map((post) => (
              <article key={post.id} className="border-b border-gray-200 pb-6">
                <h3 className="text-xl font-semibold">
                  {snippetFromContent(post.content, 100)}
                </h3>
                <p className="mt-2 whitespace-pre-wrap leading-relaxed">{post.content}</p>
                <div className="mt-3 text-sm text-gray-700 flex flex-wrap items-center gap-2">
                  <span>Category: {post.category}</span>
                  <span className="text-gray-400">|</span>
                  <span className="flex items-center gap-1">
                    Impact:
                    <span className={`inline-block rounded border px-2 py-0.5 text-xs ${impactBadgeClass(post.impact)}`}>
                      {post.impact}
                    </span>
                  </span>
                  {post.source || post.sourceUrl ? (
                    <>
                      <span className="text-gray-400">|</span>
                      <span>
                        Source:{' '}
                        {post.sourceUrl ? (
                          <a href={post.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">
                            {post.source || post.sourceUrl}
                          </a>
                        ) : (
                          post.source
                        )}
                      </span>
                    </>
                  ) : null}
                </div>
                {Array.from(new Set([post.category, ...(post.tags || []).slice(0, 3)])).filter(Boolean).length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Array.from(new Set([post.category, ...(post.tags || []).slice(0, 3)])).filter(Boolean).map((topic) => (
                      <a
                        key={`${post.id}-${topic}`}
                        href={`/${lang}/topic/${toTopicSlug(topic)}`}
                        className="rounded-full border border-gray-300 px-2 py-0.5 text-xs text-gray-700 hover:border-gray-500 hover:text-gray-900"
                      >
                        {topic}
                      </a>
                    ))}
                  </div>
                ) : null}
                <ArticleSchema post={post} inLanguage={lang} url={`https://www.datacubeai.space/${lang}/week/${weekId}`} />
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Video Section */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Videos</h2>
        {videoTechPosts.length === 0 ? (
          <p className="text-gray-600">No video posts available.</p>
        ) : (
          <div className="space-y-6">
            {videoTechPosts.map((post, index) => (
              <article key={post.id} className="border-b border-gray-200 pb-6">
                <h3 className="text-xl font-semibold">
                  {snippetFromContent(post.content, 100)}
                </h3>
                {post.videoId ? (
                  <a
                    href={`https://youtube.com/watch?v=${post.videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block mt-3"
                  >
                    <img
                      src={post.videoThumbnailUrl || `https://img.youtube.com/vi/${post.videoId}/hqdefault.jpg`}
                      alt={snippetFromContent(post.content, 100)}
                      className="w-full h-auto rounded"
                      {...(index === 0 ? { fetchPriority: 'high' as any } : { loading: 'lazy' as any })}
                    />
                  </a>
                ) : null}
                <p className="mt-2 whitespace-pre-wrap leading-relaxed">{post.content}</p>
                <VideoSchema video={post} />
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Investment Section */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Investment</h2>

        <h3 className="text-xl font-semibold mb-2">Primary Market</h3>
        {primaryMarket.length === 0 ? (
          <p className="text-gray-600 mb-6">No primary market data.</p>
        ) : (
          <div className="overflow-x-auto mb-6">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border border-gray-200 px-2 py-1 text-left">Company</th>
                  <th className="border border-gray-200 px-2 py-1 text-left">Amount</th>
                  <th className="border border-gray-200 px-2 py-1 text-left">Round</th>
                  <th className="border border-gray-200 px-2 py-1 text-left">Investors</th>
                </tr>
              </thead>
              <tbody>
                {primaryMarket.map((p: any) => (
                  <tr key={p.id}>
                    <td className="border border-gray-200 px-2 py-1">{p.company}</td>
                    <td className="border border-gray-200 px-2 py-1">{p.amount}</td>
                    <td className="border border-gray-200 px-2 py-1">{p.round}</td>
                    <td className="border border-gray-200 px-2 py-1">{Array.isArray(p.investors) ? p.investors.join(', ') : p.investors}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h3 className="text-xl font-semibold mb-2">Secondary Market</h3>
        {secondaryMarket.length === 0 ? (
          <p className="text-gray-600 mb-6">No secondary market data.</p>
        ) : (
          <div className="overflow-x-auto mb-6">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border border-gray-200 px-2 py-1 text-left">Ticker</th>
                  <th className="border border-gray-200 px-2 py-1 text-left">Price</th>
                  <th className="border border-gray-200 px-2 py-1 text-left">Change</th>
                </tr>
              </thead>
              <tbody>
                {secondaryMarket.map((p: any) => (
                  <tr key={p.id}>
                    <td className="border border-gray-200 px-2 py-1">{p.ticker}</td>
                    <td className="border border-gray-200 px-2 py-1">{p.price}</td>
                    <td className={`border border-gray-200 px-2 py-1 ${String(p.change).startsWith('-') ? 'text-red-600' : 'text-green-700'}`}>{p.change}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h3 className="text-xl font-semibold mb-2">M&amp;A</h3>
        {maDeals.length === 0 ? (
          <p className="text-gray-600">No M&amp;A data.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border border-gray-200 px-2 py-1 text-left">Acquirer</th>
                  <th className="border border-gray-200 px-2 py-1 text-left">Target</th>
                  <th className="border border-gray-200 px-2 py-1 text-left">Deal Value</th>
                  <th className="border border-gray-200 px-2 py-1 text-left">Deal Type</th>
                </tr>
              </thead>
              <tbody>
                {maDeals.map((p: any) => (
                  <tr key={p.id}>
                    <td className="border border-gray-200 px-2 py-1">{p.acquirer}</td>
                    <td className="border border-gray-200 px-2 py-1">{p.target}</td>
                    <td className="border border-gray-200 px-2 py-1">{p.dealValue}</td>
                    <td className="border border-gray-200 px-2 py-1">{p.dealType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Tips Section */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Tips</h2>
        {tips.length === 0 ? (
          <p className="text-gray-600">No tips available.</p>
        ) : (
          <div className="space-y-6">
            {tips.map((tip: TipPost) => (
              <article key={tip.id} className="border-b border-gray-200 pb-6">
                <h3 className="text-xl font-semibold">{tip.category}</h3>
                <p className="mt-2 leading-relaxed">{tip.content}</p>
                <pre className="mt-3 whitespace-pre-wrap rounded bg-gray-50 p-3 text-sm overflow-x-auto">{tip.tip}</pre>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <nav className="flex justify-between items-center mt-8 pt-4 border-t border-gray-200">
        {prevId ? <a href={`/${lang}/week/${prevId}`} className="hover:underline">&larr; Previous</a> : <span />}
        <a href={`/${lang}`} className="hover:underline">Home</a>
        {nextId ? <a href={`/${lang}/week/${nextId}`} className="hover:underline">Next &rarr;</a> : <span />}
      </nav>
      <footer className="mt-4">
        <a href={`/${lang}`} className="underline">
          View interactive version / Interaktive Version ansehen
        </a>
      </footer>
    </article>
  )
}
