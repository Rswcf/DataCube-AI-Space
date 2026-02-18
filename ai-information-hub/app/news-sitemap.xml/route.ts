import { NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api-production-3ee5.up.railway.app/api';
const SITE_URL = 'https://www.datacubeai.space';
const SUPPORTED_LANGS = ['de', 'en', 'zh', 'fr', 'es', 'pt', 'ja', 'ko'] as const;

const LANG_NAMES: Record<string, string> = {
  de: 'de', en: 'en', zh: 'zh', fr: 'fr', es: 'es', pt: 'pt', ja: 'ja', ko: 'ko',
};

interface TechPost {
  id: number;
  content: string;
  category: string;
  timestamp: string;
  isVideo?: boolean;
}

interface Week {
  id: string;
  days?: { id: string }[];
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function isWithin72Hours(dateStr: string): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return diffMs <= 72 * 60 * 60 * 1000;
}

function periodIdToDate(id: string): string {
  // Daily: YYYY-MM-DD → use directly
  if (/^\d{4}-\d{2}-\d{2}$/.test(id)) return `${id}T00:00:00Z`;
  // Weekly: YYYY-kwWW → calculate Saturday
  const match = id.match(/^(\d{4})-kw(\d{2})$/);
  if (match) {
    const year = parseInt(match[1], 10);
    const week = parseInt(match[2], 10);
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const dayOfWeek = jan4.getUTCDay() || 7;
    const mondayWeek1 = new Date(jan4);
    mondayWeek1.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1);
    const saturday = new Date(mondayWeek1);
    saturday.setUTCDate(mondayWeek1.getUTCDate() + (week - 1) * 7 + 5);
    return saturday.toISOString();
  }
  return new Date().toISOString();
}

export async function GET() {
  // Fetch weeks
  let weeks: Week[] = [];
  try {
    const res = await fetch(`${API_BASE}/weeks`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json();
      weeks = data.weeks || [];
    }
  } catch {}

  // Get all recent period IDs (last 72 hours)
  const recentPeriodIds: string[] = [];
  for (const week of weeks.slice(0, 4)) {
    if (week.days) {
      for (const day of week.days) {
        const dateStr = periodIdToDate(day.id);
        if (isWithin72Hours(dateStr)) {
          recentPeriodIds.push(day.id);
        }
      }
    }
    const weekDateStr = periodIdToDate(week.id);
    if (isWithin72Hours(weekDateStr)) {
      recentPeriodIds.push(week.id);
    }
  }

  // If no recent periods, use the most recent one
  if (recentPeriodIds.length === 0 && weeks.length > 0) {
    const latest = weeks[0];
    if (latest.days && latest.days.length > 0) {
      recentPeriodIds.push(latest.days[latest.days.length - 1].id);
    } else {
      recentPeriodIds.push(latest.id);
    }
  }

  // Fetch tech posts for recent periods
  const entries: string[] = [];
  for (const periodId of recentPeriodIds) {
    if (entries.length >= 1000) break;

    try {
      const res = await fetch(`${API_BASE}/tech/${periodId}`, { next: { revalidate: 3600 } });
      if (!res.ok) continue;
      const data = await res.json();
      const pubDate = periodIdToDate(periodId);

      for (const lang of SUPPORTED_LANGS) {
        const posts: TechPost[] = data[lang] || [];
        for (const post of posts) {
          if (post.isVideo || entries.length >= 1000) continue;
          const title = post.content.length > 120
            ? post.content.slice(0, 117) + '...'
            : post.content;

          entries.push(`  <url>
    <loc>${SITE_URL}/${lang}/week/${periodId}</loc>
    <news:news>
      <news:publication>
        <news:name>Data Cube AI</news:name>
        <news:language>${LANG_NAMES[lang]}</news:language>
      </news:publication>
      <news:publication_date>${post.timestamp || pubDate}</news:publication_date>
      <news:title>${escapeXml(title)}</news:title>
    </news:news>
  </url>`);
        }
      }
    } catch {}
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${entries.join('\n')}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
    },
  });
}
