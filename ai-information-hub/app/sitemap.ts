import { MetadataRoute } from 'next'

interface WeeksResponse {
  weeks: { id: string }[]
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

  const weekEntries = weeks.flatMap((week) => [
    {
      url: `${baseUrl}/week/${week.id}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/week/${week.id}?lang=en`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
  ])

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/feed.xml`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.3,
    },
    ...weekEntries,
  ]
}
