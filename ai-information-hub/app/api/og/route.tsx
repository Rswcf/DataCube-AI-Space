import { ImageResponse } from '@vercel/og'
import type { NextRequest } from 'next/server'

export const runtime = 'edge'

const API_BASE = 'https://api-production-3ee5.up.railway.app/api'

interface TechPost {
  author?: { name?: string }
  content?: string
  impact?: string
}

async function getTopHeadlines(periodId: string, lang: string): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE}/tech/${periodId}`, { next: { revalidate: 3600 } })
    if (!res.ok) return []
    const data = await res.json() as Record<string, TechPost[]>
    const posts = data[lang] || data.en || data.de || []
    return posts
      .filter((p: TechPost) => !('isVideo' in p && (p as any).isVideo))
      .slice(0, 3)
      .map((p: TechPost) => {
        const name = p.author?.name || ''
        return name.length > 60 ? name.slice(0, 57) + '...' : name
      })
      .filter(Boolean)
  } catch {
    return []
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || ''
  const lang = searchParams.get('lang') || 'en'
  const title = lang === 'de' ? `KI-News ${period}` : `AI News ${period}`

  const headlines = await getTopHeadlines(period, lang)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Logo cube */}
        <svg width="80" height="80" viewBox="0 0 512 512" fill="none">
          <defs>
            <linearGradient id="r" x1="256" y1="60" x2="400" y2="300" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#2563EB" />
            </linearGradient>
            <linearGradient id="l" x1="256" y1="60" x2="112" y2="300" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#2DD4BF" />
              <stop offset="100%" stopColor="#0D9488" />
            </linearGradient>
            <linearGradient id="b" x1="256" y1="220" x2="256" y2="400" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
          </defs>
          <polygon points="256,220 256,60 400,140 400,300" fill="url(#r)" />
          <polygon points="256,220 256,60 112,140 112,300" fill="url(#l)" />
          <polygon points="256,220 400,300 256,380 112,300" fill="url(#b)" />
        </svg>

        {/* Brand name */}
        <div
          style={{
            fontSize: 28,
            color: '#888',
            marginTop: 16,
            letterSpacing: '0.05em',
          }}
        >
          Data Cube AI
        </div>

        {/* Period title */}
        <div
          style={{
            fontSize: 52,
            fontWeight: 700,
            color: 'white',
            marginTop: 12,
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </div>

        {/* Headlines */}
        {headlines.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginTop: 28,
              gap: 8,
            }}
          >
            {headlines.map((h, i) => (
              <div
                key={i}
                style={{
                  fontSize: 20,
                  color: '#a0a0a0',
                  maxWidth: 900,
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span style={{ color: '#60A5FA', fontSize: 16 }}>●</span>
                {h}
              </div>
            ))}
          </div>
        )}

        {/* Language badges */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginTop: 32,
            fontSize: 14,
            color: '#555',
          }}
        >
          {['DE', 'EN', 'ZH', 'FR', 'ES', 'PT', 'JA', 'KO'].map((l) => (
            <span
              key={l}
              style={{
                color: l === lang.toUpperCase() ? '#60A5FA' : '#555',
                fontWeight: l === lang.toUpperCase() ? 700 : 400,
              }}
            >
              {l}
            </span>
          ))}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
