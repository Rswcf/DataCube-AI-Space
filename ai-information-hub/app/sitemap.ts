import { MetadataRoute } from 'next'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { toTopicSlug } from '@/lib/topic-utils'
import { SUPPORTED_LANGUAGES } from '@/lib/i18n'

interface WeeksResponse {
  weeks: { id: string; days?: { id: string }[] }[]
}

interface TrendsResponse {
  trends?: {
    de?: { title?: string }[]
    en?: { title?: string }[]
  }
}

function lastModFromId(id: string): Date {
  // Day ID: YYYY-MM-DD
  const dayMatch = id.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (dayMatch) {
    return new Date(`${dayMatch[1]}-${dayMatch[2]}-${dayMatch[3]}T00:00:00Z`)
  }
  // Week ID: YYYY-kwWW — calculate Saturday of that ISO week
  const weekMatch = id.match(/^(\d{4})-kw(\d{2})$/)
  if (weekMatch) {
    const year = parseInt(weekMatch[1], 10)
    const week = parseInt(weekMatch[2], 10)
    // Jan 4 is always in ISO week 1
    const jan4 = new Date(Date.UTC(year, 0, 4))
    const dayOfWeek = jan4.getUTCDay() || 7 // Mon=1 .. Sun=7
    const mondayWeek1 = new Date(jan4)
    mondayWeek1.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1)
    const saturday = new Date(mondayWeek1)
    saturday.setUTCDate(mondayWeek1.getUTCDate() + (week - 1) * 7 + 5) // +5 = Saturday
    return saturday
  }
  return new Date()
}

async function getTopicTitlesByLanguage(periodId: string, apiUrl: string): Promise<{ de: string[]; en: string[] }> {
  let data: TrendsResponse | null = null
  try {
    const res = await fetch(`${apiUrl}/trends/${periodId}`, { next: { revalidate: 3600 } })
    if (res.ok) data = (await res.json()) as TrendsResponse
  } catch {}

  if (!data) {
    try {
      const filePath = path.join(process.cwd(), 'public', 'data', periodId, 'trends.json')
      const raw = await readFile(filePath, 'utf-8')
      data = JSON.parse(raw) as TrendsResponse
    } catch {}
  }

  return {
    de: (data?.trends?.de || []).map((i) => (i.title || '').trim()).filter(Boolean),
    en: (data?.trends?.en || []).map((i) => (i.title || '').trim()).filter(Boolean),
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.datacubeai.space'
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api-production-3ee5.up.railway.app/api'

  // Fetch all periods from API with static file fallback
  let weeks: { id: string; days?: { id: string }[] }[] = []
  try {
    const response = await fetch(`${apiUrl}/weeks`, { next: { revalidate: 3600 } })
    if (response.ok) {
      const data: WeeksResponse = await response.json()
      weeks = data.weeks || []
    }
  } catch {
    // Handled by static fallback below.
  }

  if (weeks.length === 0) {
    try {
      const filePath = path.join(process.cwd(), 'public', 'data', 'weeks.json')
      const raw = await readFile(filePath, 'utf-8')
      const data = JSON.parse(raw) as WeeksResponse
      weeks = data.weeks || []
    } catch {
      // Keep empty when all sources fail.
    }
  }

  const periodIds = Array.from(
    new Set(
      weeks.flatMap((week) => [
        week.id,
        ...(week.days ? week.days.map((day) => day.id) : []),
      ])
    )
  )

  const langPriority: Record<string, number> = { de: 0.8, en: 0.7 }
  const defaultPriority = 0.5

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const periodEntries = periodIds.flatMap((periodId) => {
    const lastModified = lastModFromId(periodId)
    // Older periods are unlikely to change daily — use "weekly" for accuracy.
    const changeFrequency: 'daily' | 'weekly' = lastModified < sevenDaysAgo ? 'weekly' : 'daily'
    return SUPPORTED_LANGUAGES.map((lang) => ({
      url: `${baseUrl}/${lang}/week/${periodId}`,
      lastModified,
      changeFrequency,
      priority: langPriority[lang] ?? defaultPriority,
    }))
  })

  const deTopicSet = new Set<string>()
  const enTopicSet = new Set<string>()
  for (const periodId of periodIds.slice(0, 8)) {
    const titles = await getTopicTitlesByLanguage(periodId, apiUrl)
    for (const t of titles.de) {
      const s = toTopicSlug(t)
      if (s && s !== 'topic') deTopicSet.add(s)
    }
    for (const t of titles.en) {
      const s = toTopicSlug(t)
      if (s && s !== 'topic') enTopicSet.add(s)
    }
  }

  // Filter out empty or invalid slugs to avoid sitemap entries pointing to empty topic pages.
  // Note: Topics with 0 matching articles may still appear if trends data includes them
  // but actual article matching yields nothing. A full fix would require querying article
  // counts per topic, which is too expensive at sitemap generation time.
  const deSlugs = Array.from(deTopicSet).filter((s) => s.length > 1).slice(0, 30)
  const enSlugs = Array.from(enTopicSet).filter((s) => s.length > 1).slice(0, 30)

  const topicEntries = SUPPORTED_LANGUAGES.flatMap((lang) => {
    const slugs = lang === 'de' ? deSlugs : enSlugs
    // Skip languages with no topic data to avoid empty topic pages in sitemap.
    if (slugs.length === 0) return []
    return slugs.map((topic) => ({
      url: `${baseUrl}/${lang}/topic/${topic}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    }))
  })

  const homePriority: Record<string, number> = { de: 0.9, en: 0.9 }
  const homeDefault = 0.7

  const langHomeEntries = SUPPORTED_LANGUAGES.map((lang) => ({
    url: `${baseUrl}/${lang}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: homePriority[lang] ?? homeDefault,
  }))

  // Tool pages - all 8 languages (individual tools)
  const toolSlugs = ['ai-news-aggregator', 'ai-report-generator', 'ai-stock-tracker', 'ai-news-api']
  const toolEntries = toolSlugs.flatMap((slug) =>
    SUPPORTED_LANGUAGES.map((lang) => ({
      url: `${baseUrl}/${lang}/tools/${slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))
  )

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/impressum`,
      lastModified: new Date('2026-02-18T00:00:00Z'),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/datenschutz`,
      lastModified: new Date('2026-02-18T00:00:00Z'),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    ...langHomeEntries,
    ...toolEntries,
    ...topicEntries,
    ...periodEntries,
  ]
}
