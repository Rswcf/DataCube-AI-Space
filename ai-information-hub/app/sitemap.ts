import { MetadataRoute } from 'next'

interface WeeksResponse {
  weeks: { id: string }[]
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.datacubeai.space'

  // Fetch all weeks from API with fallback
  let weeks: { id: string }[] = []
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    if (apiUrl) {
      const response = await fetch(`${apiUrl}/weeks`, { next: { revalidate: 3600 } })
      if (response.ok) {
        const data: WeeksResponse = await response.json()
        weeks = data.weeks || []
      }
    }
  } catch {
    // Fallback: no weeks in sitemap if API unavailable
  }

  const weekEntries = weeks.flatMap((week) => {
    const lastModified = lastModFromId(week.id)
    return [
      {
        url: `${baseUrl}/week/${week.id}`,
        lastModified,
        changeFrequency: 'daily' as const,
        priority: 0.8,
      },
      {
        url: `${baseUrl}/week/${week.id}?lang=en`,
        lastModified,
        changeFrequency: 'daily' as const,
        priority: 0.7,
      },
    ]
  })

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/feed.xml`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.3,
    },
    ...weekEntries,
  ]
}
