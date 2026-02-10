import { MetadataRoute } from 'next'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { toTopicSlug } from '@/lib/topic-utils'

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

function extractTopicTitles(data: TrendsResponse): string[] {
  return [
    ...(data.trends?.de || []).map((item) => item.title || ''),
    ...(data.trends?.en || []).map((item) => item.title || ''),
  ].map((title) => title.trim()).filter(Boolean)
}

async function getTopicTitlesForPeriod(periodId: string, apiUrl: string): Promise<string[]> {
  try {
    const res = await fetch(`${apiUrl}/trends/${periodId}`, { next: { revalidate: 3600 } })
    if (res.ok) {
      const data = (await res.json()) as TrendsResponse
      const titles = extractTopicTitles(data)
      if (titles.length > 0) return titles
    }
  } catch {
    // Handled by static file fallback.
  }

  try {
    const filePath = path.join(process.cwd(), 'public', 'data', periodId, 'trends.json')
    const raw = await readFile(filePath, 'utf-8')
    const data = JSON.parse(raw) as TrendsResponse
    return extractTopicTitles(data)
  } catch {
    return []
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

  const periodEntries = periodIds.flatMap((periodId) => {
    const lastModified = lastModFromId(periodId)
    return [
      {
        url: `${baseUrl}/de/week/${periodId}`,
        lastModified,
        changeFrequency: 'daily' as const,
        priority: 0.8,
      },
      {
        url: `${baseUrl}/en/week/${periodId}`,
        lastModified,
        changeFrequency: 'daily' as const,
        priority: 0.7,
      },
    ]
  })

  const topicTitleSet = new Set<string>()
  for (const periodId of periodIds.slice(0, 8)) {
    const titles = await getTopicTitlesForPeriod(periodId, apiUrl)
    for (const title of titles) topicTitleSet.add(title)
  }

  const topicSlugs = Array.from(topicTitleSet)
    .map((title) => toTopicSlug(title))
    .filter((slug) => slug && slug !== 'topic')
    .slice(0, 120)

  const topicEntries = topicSlugs.flatMap((topic) => [
    {
      url: `${baseUrl}/de/topic/${topic}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/en/topic/${topic}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    },
  ])

  const featuredTopicSlugs = topicSlugs.slice(0, 30)
  const featuredPeriodIds = periodIds.slice(0, 2)
  const filterSections = ['tech', 'investment', 'tips'] as const

  const topicFilterEntries = featuredTopicSlugs.flatMap((topic) =>
    (['de', 'en'] as const).flatMap((lang) => [
      ...filterSections.map((section) => ({
        url: `${baseUrl}/${lang}/topic/${topic}?section=${section}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.45,
      })),
      ...featuredPeriodIds.flatMap((periodId) =>
        filterSections.map((section) => ({
          url: `${baseUrl}/${lang}/topic/${topic}?section=${section}&period=${encodeURIComponent(periodId)}`,
          lastModified: lastModFromId(periodId),
          changeFrequency: 'daily' as const,
          priority: 0.4,
        }))
      ),
    ])
  )

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/de`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/en`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/feed.xml`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.3,
    },
    ...topicEntries,
    ...topicFilterEntries,
    ...periodEntries,
  ]
}
