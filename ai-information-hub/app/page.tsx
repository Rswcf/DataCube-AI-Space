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

  return (
    <main className="min-h-screen w-full">
      <section className="sr-only">
        <h1>Data Cube AI: Daily AI News, Investment Signals, and Practical Tips</h1>
        <p>
          Multilingual AI intelligence hub covering technology breakthroughs,
          funding and market movements, practical AI workflows, and curated
          videos — updated daily in 8 languages (German, English, Chinese,
          French, Spanish, Portuguese, Japanese, Korean).
        </p>

        {headlines.length > 0 && (
          <section>
            <h2>Latest AI News</h2>
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
          <nav aria-label="Latest AI news periods">
            <h2>Recent Updates</h2>
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
          <nav aria-label="Trending AI topics">
            <h2>Trending Topics</h2>
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
