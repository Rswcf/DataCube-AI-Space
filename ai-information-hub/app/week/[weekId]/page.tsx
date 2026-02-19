import type { Metadata } from 'next'
import { ArticleSchema, VideoSchema, BreadcrumbListSchema } from '@/components/structured-data'
import { formatPeriodTitle } from '@/lib/period-utils'
import type { TechPost, MultilingualData, InvestmentData, TipPost, ImpactLevel } from '@/lib/types'
import { toTopicSlug } from '@/lib/topic-utils'
import { isSupportedLanguage, SUPPORTED_LANGUAGES, toBcp47 } from '@/lib/i18n'

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
  const rawLang = (await searchParams)?.lang || 'de'
  const lang = isSupportedLanguage(rawLang) ? rawLang : 'de'
  const periodLabel = formatPeriodTitle(weekId, lang)
  const localizedUrl = `https://www.datacubeai.space/${lang}/week/${weekId}`

  return {
    title: ({ de: `KI-News ${periodLabel} – Technologie, Investment & Tipps`, en: `AI News ${periodLabel} – Tech Breakthroughs, Investment & Tips`, zh: `AI新闻 ${periodLabel} – 技术突破、投资与实用技巧`, fr: `Actualités IA ${periodLabel} – Technologies, Investissements & Astuces`, es: `Noticias IA ${periodLabel} – Tecnología, Inversiones y Consejos`, pt: `Notícias IA ${periodLabel} – Tecnologia, Investimentos e Dicas`, ja: `AIニュース ${periodLabel} – テクノロジー、投資＆実用ヒント`, ko: `AI 뉴스 ${periodLabel} – 기술, 투자 & 실용 팁` } as Record<string, string>)[lang] || `AI News ${periodLabel} – Tech, Investment & Tips`,
    description: ({ de: `Kuratierte KI-News der ${periodLabel}: Technologie-Durchbrüche, Investment-Signale und praktische Tipps – täglich aktualisiert auf Data Cube AI.`, en: `Curated AI news for ${periodLabel}: technology breakthroughs, investment signals, and practical tips – updated daily on Data Cube AI.`, zh: `${periodLabel} AI新闻精选：技术突破、投资信号和实用技巧 – 每日更新于 Data Cube AI。`, fr: `Actualités IA sélectionnées pour ${periodLabel} : percées technologiques, signaux d'investissement et conseils pratiques – mis à jour quotidiennement.`, es: `Noticias de IA seleccionadas para ${periodLabel}: avances tecnológicos, señales de inversión y consejos prácticos – actualizado diariamente.`, pt: `Notícias de IA selecionadas para ${periodLabel}: avanços tecnológicos, sinais de investimento e dicas práticas – atualizado diariamente.`, ja: `${periodLabel}のAIニュース厳選：技術的ブレークスルー、投資シグナル、実践ヒント – 毎日更新。`, ko: `${periodLabel} AI 뉴스 큐레이션: 기술 돌파구, 투자 신호, 실용 팁 – 매일 업데이트.` } as Record<string, string>)[lang] || `Curated AI news for ${periodLabel}: technology breakthroughs, investment signals, and practical tips – updated daily on Data Cube AI.`,
    alternates: {
      canonical: localizedUrl,
      languages: {
        'x-default': `https://www.datacubeai.space/de/week/${weekId}`,
        ...Object.fromEntries(SUPPORTED_LANGUAGES.map((code) => [toBcp47(code), `https://www.datacubeai.space/${code}/week/${weekId}`])),
      },
    },
    openGraph: {
      title: ({ de: `KI-News ${periodLabel} – Technologie, Investment & Tipps`, en: `AI News ${periodLabel} – Tech Breakthroughs, Investment & Tips`, zh: `AI新闻 ${periodLabel} – 技术突破、投资与实用技巧`, fr: `Actualités IA ${periodLabel} – Technologies, Investissements & Astuces`, es: `Noticias IA ${periodLabel} – Tecnología, Inversiones y Consejos`, pt: `Notícias IA ${periodLabel} – Tecnologia, Investimentos e Dicas`, ja: `AIニュース ${periodLabel} – テクノロジー、投資＆実用ヒント`, ko: `AI 뉴스 ${periodLabel} – 기술, 투자 & 실용 팁` } as Record<string, string>)[lang] || `AI News ${periodLabel} – Tech, Investment & Tips`,
      description: ({ de: `Kuratierte KI-News der ${periodLabel}: Technologie-Durchbrüche, Investment-Signale und praktische Tipps – täglich aktualisiert auf Data Cube AI.`, en: `Curated AI news for ${periodLabel}: technology breakthroughs, investment signals, and practical tips – updated daily on Data Cube AI.`, zh: `${periodLabel} AI新闻精选：技术突破、投资信号和实用技巧 – 每日更新于 Data Cube AI。`, fr: `Actualités IA sélectionnées pour ${periodLabel} : percées technologiques, signaux d'investissement et conseils pratiques – mis à jour quotidiennement.`, es: `Noticias de IA seleccionadas para ${periodLabel}: avances tecnológicos, señales de inversión y consejos prácticos – actualizado diariamente.`, pt: `Notícias de IA selecionadas para ${periodLabel}: avanços tecnológicos, sinais de investimento e dicas práticas – atualizado diariamente.`, ja: `${periodLabel}のAIニュース厳選：技術的ブレークスルー、投資シグナル、実践ヒント – 毎日更新。`, ko: `${periodLabel} AI 뉴스 큐레이션: 기술 돌파구, 투자 신호, 실용 팁 – 매일 업데이트.` } as Record<string, string>)[lang] || `Curated AI news for ${periodLabel}: technology breakthroughs, investment signals, and practical tips – updated daily on Data Cube AI.`,
      url: localizedUrl,
      type: 'article',
      images: [
        {
          url: `/api/og?period=${weekId}&lang=${lang}`,
          width: 1200,
          height: 630,
          alt: ({ de: `Data Cube AI – KI-News ${periodLabel}`, en: `Data Cube AI – AI News ${periodLabel}`, zh: `Data Cube AI – AI新闻 ${periodLabel}`, fr: `Data Cube AI – Actualités IA ${periodLabel}`, es: `Data Cube AI – Noticias IA ${periodLabel}`, pt: `Data Cube AI – Notícias IA ${periodLabel}`, ja: `Data Cube AI – AIニュース ${periodLabel}`, ko: `Data Cube AI – AI 뉴스 ${periodLabel}` } as Record<string, string>)[lang] || `Data Cube AI – AI News ${periodLabel}`,
        },
      ],
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
  const rawLang = (await searchParams)?.lang || 'de'
  const lang = isSupportedLanguage(rawLang) ? rawLang : 'de'
  const periodLabel = formatPeriodTitle(weekId, lang)

  // Fetch the three feeds in parallel
  const [techRes, investmentRes, tipsRes] = await Promise.all([
    fetch(`${API_BASE}/tech/${weekId}`, { next: { revalidate: 3600 } }),
    fetch(`${API_BASE}/investment/${weekId}`, { next: { revalidate: 3600 } }),
    fetch(`${API_BASE}/tips/${weekId}`, { next: { revalidate: 3600 } }),
  ])

  let techData: MultilingualData<TechPost> | null = null
  let investmentData: InvestmentData | null = null
  let tipsData: MultilingualData<TipPost> | null = null

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
      <BreadcrumbListSchema weekId={weekId} weekLabel={periodLabel} lang={lang} />
      <header className="mb-8">
        <h1 className="text-3xl font-bold">{({ de: `KI-News ${periodLabel}`, en: `AI News ${periodLabel}`, zh: `AI新闻 ${periodLabel}`, fr: `Actualités IA ${periodLabel}`, es: `Noticias IA ${periodLabel}`, pt: `Notícias IA ${periodLabel}`, ja: `AIニュース ${periodLabel}`, ko: `AI 뉴스 ${periodLabel}` } as Record<string, string>)[lang] || `AI News ${periodLabel}`}</h1>
        <p className="mt-2 text-sm text-gray-600">
          {dateRange ? <span>{dateRange}</span> : null}
          {dateRange ? <span> • </span> : null}
          <span>Language: </span>
          {SUPPORTED_LANGUAGES.map((code, index) => (
            <span key={code}>
              {index > 0 && <span> / </span>}
              <a href={`/${code}/week/${weekId}`} className={`rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${lang === code ? 'font-semibold underline' : 'hover:underline'}`}>{code.toUpperCase()}</a>
            </span>
          ))}
        </p>
      </header>

      {/* Tech Section */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">{({ de: 'Was sind die wichtigsten KI-Durchbrüche?', en: 'What are the top AI breakthroughs?', zh: '本期最重要的AI技术突破有哪些？', fr: 'Quelles sont les principales avancées en IA ?', es: '¿Cuáles son los principales avances en IA?', pt: 'Quais são os principais avanços em IA?', ja: '最も重要なAIブレークスルーは？', ko: '가장 중요한 AI 기술 돌파구는?' } as Record<string, string>)[lang] || 'What are the top AI breakthroughs?'}</h2>
        <p className="mb-4 text-gray-700 leading-relaxed">
          {({ de: `Diese ${periodLabel} umfasst ${nonVideoTechPosts.length} kuratierte KI-Nachrichten aus Technologie, Forschung und Produktentwicklung.`, en: `This ${periodLabel} covers ${nonVideoTechPosts.length} curated AI news items spanning technology, research, and product developments.`, zh: `本期${periodLabel}精选了${nonVideoTechPosts.length}条AI新闻，涵盖技术、研究和产品动态。`, fr: `Ce ${periodLabel} couvre ${nonVideoTechPosts.length} actualités IA sélectionnées dans les domaines de la technologie, de la recherche et des produits.`, es: `Este ${periodLabel} incluye ${nonVideoTechPosts.length} noticias de IA seleccionadas sobre tecnología, investigación y desarrollos de productos.`, pt: `Este ${periodLabel} abrange ${nonVideoTechPosts.length} notícias de IA selecionadas sobre tecnologia, pesquisa e desenvolvimento de produtos.`, ja: `この${periodLabel}は、技術・研究・製品開発にわたる${nonVideoTechPosts.length}件のAIニュースを厳選しています。`, ko: `이번 ${periodLabel}은 기술, 연구, 제품 개발에 걸친 ${nonVideoTechPosts.length}건의 AI 뉴스를 엄선했습니다.` } as Record<string, string>)[lang] || `This ${periodLabel} covers ${nonVideoTechPosts.length} curated AI news items spanning technology, research, and product developments.`}
          {nonVideoTechPosts.length > 0 && ` ${nonVideoTechPosts[0].content.slice(0, 120)}...`}
        </p>
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
                          <a href={post.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:no-underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
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
        <h2 className="text-2xl font-semibold mb-4">{({ de: 'Top KI-Videos der Woche', en: 'Top AI Videos This Week', zh: '本周热门AI视频', fr: 'Meilleures vidéos IA de la semaine', es: 'Mejores videos de IA de la semana', pt: 'Melhores vídeos de IA da semana', ja: '今週のトップAI動画', ko: '이번 주 최고의 AI 동영상' } as Record<string, string>)[lang] || 'Top AI Videos This Week'}</h2>
        <p className="mb-4 text-gray-700 leading-relaxed">
          {({ de: `${videoTechPosts.length} kuratierte YouTube-Videos über KI-Entwicklungen.`, en: `${videoTechPosts.length} curated YouTube videos about AI developments.`, zh: `${videoTechPosts.length}个精选YouTube视频，聚焦AI最新发展。`, fr: `${videoTechPosts.length} vidéos YouTube sélectionnées sur les développements en IA.`, es: `${videoTechPosts.length} videos de YouTube seleccionados sobre desarrollos en IA.`, pt: `${videoTechPosts.length} vídeos do YouTube selecionados sobre desenvolvimentos em IA.`, ja: `AI最新動向に関する厳選YouTube動画${videoTechPosts.length}本。`, ko: `AI 발전에 관한 엄선된 YouTube 동영상 ${videoTechPosts.length}개.` } as Record<string, string>)[lang] || `${videoTechPosts.length} curated YouTube videos about AI developments.`}
        </p>
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
                      width={480}
                      height={360}
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
        <h2 className="text-2xl font-semibold mb-4">{({ de: 'Was sind die neuesten KI-Investment-Signale?', en: 'What are the latest AI investment signals?', zh: '最新的AI投资信号有哪些？', fr: "Quels sont les derniers signaux d'investissement IA ?", es: '¿Cuáles son las últimas señales de inversión en IA?', pt: 'Quais são os sinais mais recentes de investimento em IA?', ja: '最新のAI投資シグナルは？', ko: '최신 AI 투자 신호는?' } as Record<string, string>)[lang] || 'What are the latest AI investment signals?'}</h2>
        <p className="mb-4 text-gray-700 leading-relaxed">
          {({ de: `Aktuelle KI-Investment-Signale: ${primaryMarket.length} Finanzierungsrunden, ${secondaryMarket.length} Aktienbewegungen und ${maDeals.length} M&A-Transaktionen.`, en: `Latest AI investment signals: ${primaryMarket.length} funding rounds, ${secondaryMarket.length} stock movements, and ${maDeals.length} M&A transactions.`, zh: `最新AI投资信号：${primaryMarket.length}轮融资、${secondaryMarket.length}只股票变动和${maDeals.length}宗并购交易。`, fr: `Derniers signaux d'investissement IA : ${primaryMarket.length} levées de fonds, ${secondaryMarket.length} mouvements boursiers et ${maDeals.length} transactions M&A.`, es: `Últimas señales de inversión en IA: ${primaryMarket.length} rondas de financiación, ${secondaryMarket.length} movimientos bursátiles y ${maDeals.length} transacciones de M&A.`, pt: `Últimos sinais de investimento em IA: ${primaryMarket.length} rodadas de financiamento, ${secondaryMarket.length} movimentos de ações e ${maDeals.length} transações de M&A.`, ja: `最新AI投資シグナル：資金調達${primaryMarket.length}件、株価変動${secondaryMarket.length}件、M&A取引${maDeals.length}件。`, ko: `최신 AI 투자 신호: 펀딩 라운드 ${primaryMarket.length}건, 주가 변동 ${secondaryMarket.length}건, M&A 거래 ${maDeals.length}건.` } as Record<string, string>)[lang] || `Latest AI investment signals: ${primaryMarket.length} funding rounds, ${secondaryMarket.length} stock movements, and ${maDeals.length} M&A transactions.`}
        </p>

        <h3 className="text-xl font-semibold mb-2">{({ de: 'Primärmarkt – Finanzierungsrunden', en: 'Primary Market – Funding Rounds', zh: '一级市场 – 融资轮次', fr: 'Marché primaire – Levées de fonds', es: 'Mercado primario – Rondas de financiación', pt: 'Mercado primário – Rodadas de financiamento', ja: 'プライマリーマーケット – 資金調達', ko: '1차 시장 – 펀딩 라운드' } as Record<string, string>)[lang] || 'Primary Market – Funding Rounds'}</h3>
        {primaryMarket.length === 0 ? (
          <p className="text-gray-600 mb-6">No primary market data.</p>
        ) : (
          <div className="overflow-x-auto mb-6">
            <table className="w-full border-collapse text-sm tabular-nums">
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

        <h3 className="text-xl font-semibold mb-2">{({ de: 'Sekundärmarkt – Aktienbewegungen', en: 'Secondary Market – Stock Movements', zh: '二级市场 – 股票动态', fr: 'Marché secondaire – Mouvements boursiers', es: 'Mercado secundario – Movimientos bursátiles', pt: 'Mercado secundário – Movimentos de ações', ja: 'セカンダリーマーケット – 株価動向', ko: '2차 시장 – 주가 동향' } as Record<string, string>)[lang] || 'Secondary Market – Stock Movements'}</h3>
        {secondaryMarket.length === 0 ? (
          <p className="text-gray-600 mb-6">No secondary market data.</p>
        ) : (
          <div className="overflow-x-auto mb-6">
            <table className="w-full border-collapse text-sm tabular-nums">
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

        <h3 className="text-xl font-semibold mb-2">{({ de: 'M&A – Fusionen & Übernahmen', en: 'M&A – Mergers & Acquisitions', zh: 'M&A – 并购交易', fr: 'M&A – Fusions & Acquisitions', es: 'M&A – Fusiones y Adquisiciones', pt: 'M&A – Fusões e Aquisições', ja: 'M&A – 合併・買収', ko: 'M&A – 인수합병' } as Record<string, string>)[lang] || 'M&A – Mergers & Acquisitions'}</h3>
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
        <h2 className="text-2xl font-semibold mb-4">{({ de: 'Welche praktischen KI-Tipps gibt es diese Woche?', en: 'What are practical AI tips this week?', zh: '本周有哪些实用的AI技巧？', fr: 'Quelles astuces IA pratiques cette semaine ?', es: '¿Qué consejos prácticos de IA hay esta semana?', pt: 'Quais dicas práticas de IA esta semana?', ja: '今週の実用的なAIヒントは？', ko: '이번 주 실용적인 AI 팁은?' } as Record<string, string>)[lang] || 'What are practical AI tips this week?'}</h2>
        <p className="mb-4 text-gray-700 leading-relaxed">
          {({ de: `${tips.length} praktische KI-Tipps aus Reddit-Communities und Experten-Blogs.`, en: `${tips.length} practical AI tips curated from Reddit communities and expert blogs.`, zh: `${tips.length}条实用AI技巧，精选自Reddit社区和专家博客。`, fr: `${tips.length} astuces IA pratiques sélectionnées sur Reddit et des blogs d'experts.`, es: `${tips.length} consejos prácticos de IA seleccionados de comunidades de Reddit y blogs de expertos.`, pt: `${tips.length} dicas práticas de IA selecionadas de comunidades do Reddit e blogs de especialistas.`, ja: `Redditコミュニティと専門家ブログから厳選した実用AIヒント${tips.length}件。`, ko: `Reddit 커뮤니티와 전문가 블로그에서 엄선한 실용 AI 팁 ${tips.length}건.` } as Record<string, string>)[lang] || `${tips.length} practical AI tips curated from Reddit communities and expert blogs.`}
          {tips.length > 0 && ` ${(tips[0] as any).content?.slice(0, 100)}...`}
        </p>
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
        {prevId ? <a href={`/${lang}/week/${prevId}`} className="hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">&larr; Previous</a> : <span />}
        <a href={`/${lang}`} className="hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Home</a>
        {nextId ? <a href={`/${lang}/week/${nextId}`} className="hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Next &rarr;</a> : <span />}
      </nav>
      <footer className="mt-4">
        <a href={`/${lang}`} className="underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
          View interactive version / Interaktive Version ansehen
        </a>
      </footer>
    </article>
  )
}
