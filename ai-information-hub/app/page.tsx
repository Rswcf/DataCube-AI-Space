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
  trends?: {
    de?: { title?: string }[]
    en?: { title?: string }[]
  }
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

type HomePageContentProps = {
  language?: AppLanguage
}

export async function HomePageContent({ language = 'de' }: HomePageContentProps = {}) {
  const weeks = await getWeeks()
  const initialWeekId = getInitialPeriodId(weeks)
  const recentPeriodIds = getRecentPeriodIds(weeks)
  const trendingTopics = Array.from(new Set(await getTrendingTopicTitles(initialWeekId, language))).slice(0, 8)

  return (
    <main className="min-h-screen w-full">
      <section className="mx-auto max-w-[1280px] border-b border-border px-4 py-5">
        <h1 className="text-xl font-semibold sm:text-2xl">DataCube AI: Daily AI News, Investment Signals, and Practical Tips</h1>
        <p className="mt-2 max-w-4xl text-sm text-muted-foreground sm:text-base">
          Bilingual AI intelligence hub covering technology breakthroughs, funding and market movements, practical AI workflows,
          and curated videos. Explore the latest periods below or jump into the interactive feed.
        </p>
        {recentPeriodIds.length > 0 ? (
          <nav aria-label="Latest AI news periods" className="mt-4 flex flex-wrap gap-2">
            {recentPeriodIds.map((id) => (
              <a
                key={id}
                href={`/${language}/week/${id}`}
                className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary sm:text-sm"
              >
                {id}
              </a>
            ))}
          </nav>
        ) : null}
        {trendingTopics.length > 0 ? (
          <nav aria-label="Trending AI topics" className="mt-3 flex flex-wrap gap-2">
            {trendingTopics.map((topic) => (
              <a
                key={topic}
                href={`/${language}/topic/${toTopicSlug(topic)}`}
                className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary sm:text-sm"
              >
                {topic}
              </a>
            ))}
          </nav>
        ) : null}
      </section>

      <HomePageClient initialWeekId={initialWeekId} />
    </main>
  )
}

export default async function HomePage() {
  return HomePageContent({ language: 'de' })
}
