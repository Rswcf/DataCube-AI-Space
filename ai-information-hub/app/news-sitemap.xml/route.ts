import { NextResponse } from 'next/server';
import { formatPeriodTitle, periodPublishedDate } from '@/lib/period-utils';

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

function getLocalizedPosts(data: any, lang: string): TechPost[] {
  return data?.[lang] || data?.tech?.[lang] || data?.de || data?.tech?.de || [];
}

function isWithin72Hours(dateStr: string): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return diffMs <= 72 * 60 * 60 * 1000;
}

function periodIdToDate(id: string): string {
  return periodPublishedDate(id).toISOString();
}

function toNewsDate(value: string | undefined, fallback: string): string {
  const date = new Date(value || fallback);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function getRecentPeriodIds(weeks: Week[]): string[] {
  const recentPeriodIds: string[] = [];
  for (const week of weeks.slice(0, 4)) {
    if (week.days) {
      for (const day of [...week.days].reverse()) {
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

  if (recentPeriodIds.length === 0 && weeks.length > 0) {
    const latest = weeks[0];
    if (latest.days && latest.days.length > 0) {
      recentPeriodIds.push(latest.days[latest.days.length - 1].id);
    } else {
      recentPeriodIds.push(latest.id);
    }
  }

  return Array.from(new Set(recentPeriodIds));
}

function newsTitle(periodId: string, lang: string): string {
  const periodLabel = formatPeriodTitle(periodId, lang);
  const labels: Record<string, string> = {
    de: `Data Cube AI KI-News ${periodLabel}`,
    en: `Data Cube AI AI News ${periodLabel}`,
    zh: `Data Cube AI AI新闻 ${periodLabel}`,
    fr: `Data Cube AI Actualités IA ${periodLabel}`,
    es: `Data Cube AI Noticias IA ${periodLabel}`,
    pt: `Data Cube AI Notícias IA ${periodLabel}`,
    ja: `Data Cube AI AIニュース ${periodLabel}`,
    ko: `Data Cube AI AI 뉴스 ${periodLabel}`,
  };
  return labels[lang] || labels.en;
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

  const recentPeriodIds = getRecentPeriodIds(weeks);

  const entries: string[] = [];
  for (const periodId of recentPeriodIds) {
    if (entries.length >= 1000) break;

    try {
      const res = await fetch(`${API_BASE}/tech/${periodId}`, { next: { revalidate: 3600 } });
      if (!res.ok) continue;
      const data = await res.json();
      const fallbackDate = periodIdToDate(periodId);

      for (const lang of SUPPORTED_LANGS) {
        const posts = getLocalizedPosts(data, lang).filter((post) => !post.isVideo);
        if (posts.length === 0 || entries.length >= 1000) continue;

        const latestTimestamp = [...posts]
          .map((post) => post.timestamp)
          .filter(Boolean)
          .sort()
          .at(-1);

        entries.push(`  <url>
    <loc>${SITE_URL}/${lang}/week/${periodId}</loc>
    <news:news>
      <news:publication>
        <news:name>Data Cube AI</news:name>
        <news:language>${LANG_NAMES[lang]}</news:language>
      </news:publication>
      <news:publication_date>${toNewsDate(latestTimestamp, fallbackDate)}</news:publication_date>
      <news:title>${escapeXml(newsTitle(periodId, lang))}</news:title>
    </news:news>
  </url>`);
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
