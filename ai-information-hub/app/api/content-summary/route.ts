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

export async function GET(request: NextRequest) {
  const lang = request.nextUrl.searchParams.get('lang') === 'en' ? 'en' : 'de';

  // Get current week
  let weekId = '';
  try {
    const weeksRes = await fetch(`${API_BASE}/weeks`, { next: { revalidate: 3600 } });
    if (weeksRes.ok) {
      const data = await weeksRes.json();
      const weeks = data.weeks || [];
      if (weeks.length > 0) {
        weekId = weeks[0].id;
      }
    }
  } catch {}

  if (!weekId) {
    return new Response('# DataCube AI\n\nNo content available.', {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600',
      },
    });
  }

  // Fetch all data in parallel
  const [techRes, investmentRes, tipsRes] = await Promise.all([
    fetch(`${API_BASE}/tech/${weekId}`, { next: { revalidate: 3600 } }).catch(() => null),
    fetch(`${API_BASE}/investment/${weekId}`, { next: { revalidate: 3600 } }).catch(() => null),
    fetch(`${API_BASE}/tips/${weekId}`, { next: { revalidate: 3600 } }).catch(() => null),
  ]);

  const techData = techRes?.ok ? await techRes.json() : null;
  const investmentData = investmentRes?.ok ? await investmentRes.json() : null;
  const tipsData = tipsRes?.ok ? await tipsRes.json() : null;

  const isDayId = /^\d{4}-\d{2}-\d{2}$/.test(weekId);
  let title: string;
  if (isDayId) {
    const [y, m, d] = weekId.split('-').map(Number);
    const deLabel = `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`;
    const enLabel = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
    title = lang === 'de'
      ? `DataCube AI - KI-News ${deLabel}`
      : `DataCube AI - AI News ${enLabel}`;
  } else {
    const weekLabel = weekId.replace(/^\d{4}-kw/, 'KW ');
    title = lang === 'de'
      ? `DataCube AI - KI-News ${weekLabel}`
      : `DataCube AI - AI News Week ${weekLabel.replace('KW ', '')}`;
  }

  let md = `# ${title}\n\n`;

  // Tech section
  if (techData?.[lang]) {
    const posts: TechPost[] = techData[lang];
    const articles = posts.filter(p => !p.isVideo);
    const videos = posts.filter(p => p.isVideo);

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

  // Investment section
  if (investmentData) {
    md += `## Investment\n\n`;

    const pm: PrimaryMarketPost[] = investmentData.primaryMarket?.[lang] || [];
    if (pm.length > 0) {
      md += `### Primary Market\n\n`;
      md += `| Company | Amount | Round |\n|---------|--------|-------|\n`;
      for (const p of pm) {
        md += `| ${p.company} | ${p.amount} | ${p.round} |\n`;
      }
      md += '\n';
    }

    const sm: SecondaryMarketPost[] = investmentData.secondaryMarket?.[lang] || [];
    if (sm.length > 0) {
      md += `### Secondary Market\n\n`;
      md += `| Ticker | Price | Change |\n|--------|-------|--------|\n`;
      for (const s of sm) {
        md += `| ${s.ticker} | ${s.price} | ${s.change} |\n`;
      }
      md += '\n';
    }

    const ma: MAPost[] = investmentData.ma?.[lang] || [];
    if (ma.length > 0) {
      md += `### M&A\n\n`;
      md += `| Acquirer | Target | Value | Type |\n|----------|--------|-------|------|\n`;
      for (const m of ma) {
        md += `| ${m.acquirer} | ${m.target} | ${m.dealValue} | ${m.dealType} |\n`;
      }
      md += '\n';
    }
  }

  // Tips section
  if (tipsData?.[lang]) {
    const tips: TipPost[] = tipsData[lang];
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

  md += `---\n\n`;
  md += `*Updated daily. Visit [DataCube AI](https://www.datacubeai.space) for the interactive version.*\n`;

  return new Response(md, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
    },
  });
}
