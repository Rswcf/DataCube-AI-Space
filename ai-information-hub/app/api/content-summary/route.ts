import { NextRequest } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api-production-3ee5.up.railway.app/api';

interface TechPost {
  id: number;
  content: string;
  category: string;
  impact: string;
  source: string;
  sourceUrl?: string;
  isVideo?: boolean;
  videoId?: string;
}

interface PrimaryMarketPost {
  company: string;
  amount: string;
  round: string;
  content: string;
}

interface SecondaryMarketPost {
  ticker: string;
  price: string;
  change: string;
  content: string;
}

interface MAPost {
  acquirer: string;
  target: string;
  dealValue: string;
  dealType: string;
  content: string;
}

interface TipPost {
  content: string;
  tip: string;
  category: string;
}

type SummarySection = 'all' | 'tech' | 'investment' | 'tips';

function isValidPeriodId(value: string): boolean {
  return /^\d{4}-kw\d{2}$/.test(value) || /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseSection(value: string | null): SummarySection | null {
  if (!value) return 'all';
  const normalized = value.toLowerCase();
  if (normalized === 'all' || normalized === 'tech' || normalized === 'investment' || normalized === 'tips') {
    return normalized;
  }
  return null;
}

function matchTopic(fields: Array<string | undefined>, topic: string): boolean {
  if (!topic) return true;
  return fields.some((value) => (value || '').toLowerCase().includes(topic));
}

export async function GET(request: NextRequest) {
  const lang = request.nextUrl.searchParams.get('lang') === 'en' ? 'en' : 'de';
  const requestedPeriodId = request.nextUrl.searchParams.get('periodId')?.trim() || '';
  const section = parseSection(request.nextUrl.searchParams.get('section'));
  const topic = (request.nextUrl.searchParams.get('topic') || '').trim().toLowerCase();

  if (requestedPeriodId && !isValidPeriodId(requestedPeriodId)) {
    return new Response('Invalid periodId. Use YYYY-kwWW or YYYY-MM-DD.', { status: 400 });
  }

  if (!section) {
    return new Response('Invalid section. Use all, tech, investment, or tips.', { status: 400 });
  }

  let periodId = requestedPeriodId;

  if (!periodId) {
    try {
      const weeksRes = await fetch(`${API_BASE}/weeks`, { next: { revalidate: 3600 } });
      if (weeksRes.ok) {
        const data = await weeksRes.json();
        const weeks = data.weeks || [];
        if (weeks.length > 0) {
          periodId = weeks[0].id;
        }
      }
    } catch {}
  }

  if (!periodId) {
    return new Response('# Data Cube AI\n\nNo content available.', {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600',
      },
    });
  }

  const [techRes, investmentRes, tipsRes] = await Promise.all([
    fetch(`${API_BASE}/tech/${periodId}`, { next: { revalidate: 3600 } }).catch(() => null),
    fetch(`${API_BASE}/investment/${periodId}`, { next: { revalidate: 3600 } }).catch(() => null),
    fetch(`${API_BASE}/tips/${periodId}`, { next: { revalidate: 3600 } }).catch(() => null),
  ]);

  const techData = techRes?.ok ? await techRes.json() : null;
  const investmentData = investmentRes?.ok ? await investmentRes.json() : null;
  const tipsData = tipsRes?.ok ? await tipsRes.json() : null;

  const isDayId = /^\d{4}-\d{2}-\d{2}$/.test(periodId);
  let title: string;
  if (isDayId) {
    const [y, m, d] = periodId.split('-').map(Number);
    const deLabel = `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`;
    const enLabel = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
    title = lang === 'de'
      ? `Data Cube AI - KI-News ${deLabel}`
      : `Data Cube AI - AI News ${enLabel}`;
  } else {
    const weekLabel = periodId.replace(/^\d{4}-kw/, 'KW ');
    title = lang === 'de'
      ? `Data Cube AI - KI-News ${weekLabel}`
      : `Data Cube AI - AI News Week ${weekLabel.replace('KW ', '')}`;
  }

  let md = `# ${title}\n\n`;

  if ((section === 'all' || section === 'tech') && techData?.[lang]) {
    const posts: TechPost[] = (techData[lang] || []).filter((post: TechPost) =>
      matchTopic([post.content, post.category, post.source], topic)
    );

    const articles = posts.filter((p) => !p.isVideo);
    const videos = posts.filter((p) => p.isVideo);

    if (articles.length > 0) {
      md += lang === 'de' ? `## Technologie\n\n` : `## Technology\n\n`;
      for (const post of articles) {
        md += `### ${post.category} (${post.impact})\n`;
        md += `${post.content}\n`;
        if (post.sourceUrl) md += `Source: [${post.source}](${post.sourceUrl})\n`;
        md += '\n';
      }
    }

    if (videos.length > 0) {
      md += `## Videos\n\n`;
      for (const v of videos) {
        md += `- [${v.content.slice(0, 100)}](https://youtube.com/watch?v=${v.videoId})\n`;
      }
      md += '\n';
    }
  }

  if (section === 'all' || section === 'investment') {
    md += `## Investment\n\n`;

    const pm: PrimaryMarketPost[] = (investmentData?.primaryMarket?.[lang] || []).filter((post: PrimaryMarketPost) =>
      matchTopic([post.company, post.round, post.content], topic)
    );
    if (pm.length > 0) {
      md += `### Primary Market\n\n`;
      md += `| Company | Amount | Round |\n|---------|--------|-------|\n`;
      for (const p of pm) {
        md += `| ${p.company} | ${p.amount} | ${p.round} |\n`;
      }
      md += '\n';
    }

    const sm: SecondaryMarketPost[] = (investmentData?.secondaryMarket?.[lang] || []).filter((post: SecondaryMarketPost) =>
      matchTopic([post.ticker, post.content], topic)
    );
    if (sm.length > 0) {
      md += `### Secondary Market\n\n`;
      md += `| Ticker | Price | Change |\n|--------|-------|--------|\n`;
      for (const s of sm) {
        md += `| ${s.ticker} | ${s.price} | ${s.change} |\n`;
      }
      md += '\n';
    }

    const ma: MAPost[] = (investmentData?.ma?.[lang] || []).filter((post: MAPost) =>
      matchTopic([post.acquirer, post.target, post.dealType, post.content], topic)
    );
    if (ma.length > 0) {
      md += `### M&A\n\n`;
      md += `| Acquirer | Target | Value | Type |\n|----------|--------|-------|------|\n`;
      for (const m of ma) {
        md += `| ${m.acquirer} | ${m.target} | ${m.dealValue} | ${m.dealType} |\n`;
      }
      md += '\n';
    }
  }

  if (section === 'all' || section === 'tips') {
    const tips: TipPost[] = (tipsData?.[lang] || []).filter((tip: TipPost) =>
      matchTopic([tip.content, tip.category, tip.tip], topic)
    );

    if (tips.length > 0) {
      md += `## Tips\n\n`;
      for (const t of tips) {
        md += `### ${t.category}\n`;
        md += `${t.content}\n\n`;
        if (t.tip) {
          md += '```\n' + t.tip + '\n```\n';
        }
        md += '\n';
      }
    }
  }

  const permalinkParams = new URLSearchParams({ lang, periodId });
  if (section !== 'all') permalinkParams.set('section', section);
  if (topic) permalinkParams.set('topic', topic);

  md += `---\n\n`;
  md += `Canonical summary URL: https://www.datacubeai.space/api/content-summary?${permalinkParams.toString()}\n\n`;
  md += `*Updated daily. Visit [Data Cube AI](https://www.datacubeai.space) for the interactive version.*\n`;

  return new Response(md, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
    },
  });
}
