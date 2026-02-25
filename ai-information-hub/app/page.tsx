import { readFile } from 'node:fs/promises'
import path from 'node:path'
import HomePageClient from '@/components/home-page-client'
import type { AppLanguage } from '@/lib/i18n'
import { toTopicSlug } from '@/lib/topic-utils'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api-production-3ee5.up.railway.app/api'

export const revalidate = 3600

interface DayEntry {
  id: string
  current?: boolean
}

interface WeekEntry {
  id: string
  current?: boolean
  days?: DayEntry[]
}

interface WeeksResponse {
  weeks?: WeekEntry[]
}

interface TrendsResponse {
  trends?: Record<string, { title?: string }[]>
}

interface TechHeadline {
  title: string
  summary: string
}

async function getWeeksFromApi(): Promise<WeekEntry[]> {
  try {
    const res = await fetch(`${API_BASE}/weeks`, { next: { revalidate: 3600 } })
    if (!res.ok) return []
    const data = (await res.json()) as WeeksResponse
    return data.weeks || []
  } catch {
    return []
  }
}

async function getWeeksFromStaticFile(): Promise<WeekEntry[]> {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'weeks.json')
    const raw = await readFile(filePath, 'utf-8')
    const data = JSON.parse(raw) as WeeksResponse
    return data.weeks || []
  } catch {
    return []
  }
}

async function getWeeks(): Promise<WeekEntry[]> {
  const apiWeeks = await getWeeksFromApi()
  if (apiWeeks.length > 0) return apiWeeks
  return getWeeksFromStaticFile()
}

function getInitialPeriodId(weeks: WeekEntry[]): string {
  if (weeks.length === 0) return ''

  const currentWeek = weeks.find((w) => w.current) || weeks[0]
  if (currentWeek.days && currentWeek.days.length > 0) {
    const currentDay = currentWeek.days.find((d) => d.current)
    if (currentDay) return currentDay.id
    return currentWeek.days[currentWeek.days.length - 1].id
  }

  return currentWeek.id
}

function getRecentPeriodIds(weeks: WeekEntry[], limit = 10): string[] {
  const ids: string[] = []

  for (const week of weeks) {
    ids.push(week.id)
    if (week.days) {
      for (const day of week.days) ids.push(day.id)
    }
  }

  return Array.from(new Set(ids)).slice(0, limit)
}

function extractTrendTitles(data: TrendsResponse, language: AppLanguage): string[] {
  const languageTrends = data.trends?.[language] || data.trends?.de || []
  return languageTrends
    .map((item) => item.title || '')
    .map((title) => title.trim())
    .filter(Boolean)
}

async function getTrendingTopicTitles(periodId: string, language: AppLanguage): Promise<string[]> {
  if (!periodId) return []

  try {
    const res = await fetch(`${API_BASE}/trends/${periodId}`, { next: { revalidate: 3600 } })
    if (res.ok) {
      const data = (await res.json()) as TrendsResponse
      const titles = extractTrendTitles(data, language)
      if (titles.length > 0) return titles
    }
  } catch {
    // Handled by static fallback below.
  }

  try {
    const filePath = path.join(process.cwd(), 'public', 'data', periodId, 'trends.json')
    const raw = await readFile(filePath, 'utf-8')
    const data = JSON.parse(raw) as TrendsResponse
    return extractTrendTitles(data, language)
  } catch {
    return []
  }
}

async function getLatestHeadlines(periodId: string, language: AppLanguage): Promise<TechHeadline[]> {
  if (!periodId) return []

  try {
    const res = await fetch(`${API_BASE}/tech/${periodId}`, { next: { revalidate: 3600 } })
    if (!res.ok) return []
    const data = (await res.json()) as Record<string, { author?: { name?: string }; content?: string }[]>
    const posts = data[language] || data.en || data.de || []
    return posts
      .filter((p) => !('isVideo' in p && p.isVideo))
      .slice(0, 5)
      .map((p) => ({
        title: p.author?.name || '',
        summary: (p.content || '').slice(0, 200),
      }))
      .filter((h) => h.title)
  } catch {
    return []
  }
}

// Localized sr-only headings for accessibility and SEO.
const SR_ONLY_TEXT: Record<AppLanguage, { h1: string; latestNews: string; recentUpdates: string; trendingTopics: string; description: string }> = {
  de: {
    h1: 'Data Cube AI: Tägliche KI-News, Investment-Signale und praktische Tipps',
    latestNews: 'Aktuelle KI-News',
    recentUpdates: 'Letzte Aktualisierungen',
    trendingTopics: 'Trending-Themen',
    description: 'Mehrsprachiger KI-Nachrichten-Hub: Technologie-Durchbrüche, Finanzierungs- und Marktbewegungen, praktische KI-Workflows und kuratierte Videos – täglich aktualisiert in 8 Sprachen (Deutsch, Englisch, Chinesisch, Französisch, Spanisch, Portugiesisch, Japanisch, Koreanisch).',
  },
  en: {
    h1: 'Data Cube AI: Daily AI News, Investment Signals, and Practical Tips',
    latestNews: 'Latest AI News',
    recentUpdates: 'Recent Updates',
    trendingTopics: 'Trending Topics',
    description: 'Multilingual AI intelligence hub covering technology breakthroughs, funding and market movements, practical AI workflows, and curated videos — updated daily in 8 languages (German, English, Chinese, French, Spanish, Portuguese, Japanese, Korean).',
  },
  zh: {
    h1: 'Data Cube AI：每日AI新闻、投资信号与实用技巧',
    latestNews: '最新AI新闻',
    recentUpdates: '近期更新',
    trendingTopics: '热门话题',
    description: '多语言AI情报中心，涵盖技术突破、融资与市场动态、实用AI工作流和精选视频——每日以8种语言更新。',
  },
  fr: {
    h1: "Data Cube AI : Actualités IA quotidiennes, signaux d'investissement et conseils pratiques",
    latestNews: "Dernières actualités IA",
    recentUpdates: 'Mises à jour récentes',
    trendingTopics: 'Sujets tendance',
    description: "Hub d'intelligence IA multilingue couvrant les percées technologiques, les mouvements de marché, les workflows IA pratiques et les vidéos sélectionnées — mis à jour quotidiennement en 8 langues.",
  },
  es: {
    h1: 'Data Cube AI: Noticias diarias de IA, señales de inversión y consejos prácticos',
    latestNews: 'Últimas noticias de IA',
    recentUpdates: 'Actualizaciones recientes',
    trendingTopics: 'Temas de tendencia',
    description: 'Hub de inteligencia de IA multilingüe que cubre avances tecnológicos, movimientos del mercado, flujos de trabajo prácticos de IA y videos seleccionados — actualizado diariamente en 8 idiomas.',
  },
  pt: {
    h1: 'Data Cube AI: Notícias diárias de IA, sinais de investimento e dicas práticas',
    latestNews: 'Últimas notícias de IA',
    recentUpdates: 'Atualizações recentes',
    trendingTopics: 'Tópicos em alta',
    description: 'Hub de inteligência de IA multilíngue cobrindo avanços tecnológicos, movimentos de mercado, fluxos de trabalho práticos de IA e vídeos selecionados — atualizado diariamente em 8 idiomas.',
  },
  ja: {
    h1: 'Data Cube AI：毎日のAIニュース、投資シグナル、実践ティップス',
    latestNews: '最新AIニュース',
    recentUpdates: '最近の更新',
    trendingTopics: 'トレンドトピック',
    description: '多言語AIインテリジェンスハブ：技術的ブレイクスルー、資金調達と市場動向、実践的AIワークフロー、厳選動画 — 8言語で毎日更新。',
  },
  ko: {
    h1: 'Data Cube AI: 매일 AI 뉴스, 투자 신호, 실용 팁',
    latestNews: '최신 AI 뉴스',
    recentUpdates: '최근 업데이트',
    trendingTopics: '트렌딩 토픽',
    description: '다국어 AI 인텔리전스 허브: 기술 혁신, 투자 동향, 실용적 AI 워크플로, 엄선된 동영상 — 8개 언어로 매일 업데이트.',
  },
}

type HomePageContentProps = {
  language?: AppLanguage
}

export async function HomePageContent({ language = 'de' }: HomePageContentProps = {}) {
  const weeks = await getWeeks()
  const initialWeekId = getInitialPeriodId(weeks)
  const [recentPeriodIds, trendingTopics, headlines] = await Promise.all([
    Promise.resolve(getRecentPeriodIds(weeks)),
    getTrendingTopicTitles(initialWeekId, language).then((t) =>
      Array.from(new Set(t)).slice(0, 8)
    ),
    getLatestHeadlines(initialWeekId, language),
  ])

  const t = SR_ONLY_TEXT[language] || SR_ONLY_TEXT.de

  return (
    <main className="min-h-screen w-full">
      <section className="sr-only">
        <h1>{t.h1}</h1>
        <p>{t.description}</p>

        {headlines.length > 0 && (
          <section>
            <h2>{t.latestNews}</h2>
            <ul>
              {headlines.map((h) => (
                <li key={h.title}>
                  <strong>{h.title}</strong>: {h.summary}
                </li>
              ))}
            </ul>
          </section>
        )}

        {recentPeriodIds.length > 0 && (
          <nav aria-label={t.recentUpdates}>
            <h2>{t.recentUpdates}</h2>
            {recentPeriodIds.map((id) => (
              <a
                key={id}
                href={`/${language}/week/${id}`}
                className="mr-2 inline-block"
              >
                {id}
              </a>
            ))}
          </nav>
        )}

        {trendingTopics.length > 0 && (
          <nav aria-label={t.trendingTopics}>
            <h2>{t.trendingTopics}</h2>
            {trendingTopics.map((topic) => (
              <a
                key={topic}
                href={`/${language}/topic/${toTopicSlug(topic)}`}
                className="mr-2 inline-block"
              >
                {topic}
              </a>
            ))}
          </nav>
        )}
      </section>

      <HomePageClient initialWeekId={initialWeekId} />
    </main>
  )
}

export default async function HomePage() {
  return HomePageContent({ language: 'de' })
}
