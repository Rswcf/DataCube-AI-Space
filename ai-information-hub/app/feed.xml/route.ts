import { NextRequest } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api-production-3ee5.up.railway.app/api';
const SITE_URL = 'https://www.datacubeai.space';

interface TechPost {
  id: number;
  content: string;
  category: string;
  impact: string;
  timestamp: string;
  source: string;
  sourceUrl?: string;
  isVideo?: boolean;
  videoId?: string;
}

interface Week {
  id: string;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET(request: NextRequest) {
  const SUPPORTED_LANGS = ['de', 'en', 'zh', 'fr', 'es', 'pt', 'ja', 'ko'] as const;
  type Lang = typeof SUPPORTED_LANGS[number];
  const rawLang = request.nextUrl.searchParams.get('lang') || 'de';
  const lang: Lang = SUPPORTED_LANGS.includes(rawLang as Lang) ? (rawLang as Lang) : 'de';

  // Fetch weeks to get the latest 7 periods
  let weekIds: string[] = [];
  try {
    const weeksRes = await fetch(`${API_BASE}/weeks`, { next: { revalidate: 3600 } });
    if (weeksRes.ok) {
      const data = await weeksRes.json();
      weekIds = (data.weeks || []).slice(0, 7).map((w: Week) => w.id);
    }
  } catch {}

  if (weekIds.length === 0) {
    return new Response('<feed xmlns="http://www.w3.org/2005/Atom"></feed>', {
      headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' },
    });
  }

  // Fetch tech posts for the latest weeks
  const allPosts: TechPost[] = [];
  for (const weekId of weekIds) {
    try {
      const res = await fetch(`${API_BASE}/tech/${weekId}`, { next: { revalidate: 3600 } });
      if (res.ok) {
        const data = await res.json();
        const posts: TechPost[] = data[lang] || [];
        allPosts.push(...posts);
      }
    } catch {}
  }

  const feedTitle = ({
    de: 'Data Cube AI – Tägliche KI-News',
    en: 'Data Cube AI – Daily AI News',
    zh: 'Data Cube AI – 每日AI新闻',
    fr: 'Data Cube AI – Actualités IA quotidiennes',
    es: 'Data Cube AI – Noticias diarias de IA',
    pt: 'Data Cube AI – Notícias diárias de IA',
    ja: 'Data Cube AI – 毎日のAIニュース',
    ko: 'Data Cube AI – 매일 AI 뉴스',
  } as Record<string, string>)[lang] || 'Data Cube AI – Daily AI News';
  const feedSubtitle = ({
    de: 'Kuratierte KI-Nachrichten: Technologie, Investment und Tipps',
    en: 'Curated AI news: Technology, Investment, and Tips',
    zh: '精选AI新闻：技术、投资与实用技巧',
    fr: "Actualités IA sélectionnées : technologie, investissement et astuces",
    es: 'Noticias de IA seleccionadas: tecnología, inversión y consejos',
    pt: 'Notícias de IA selecionadas: tecnologia, investimento e dicas',
    ja: '厳選AIニュース：テクノロジー、投資、実践ヒント',
    ko: '엄선된 AI 뉴스: 기술, 투자, 실용 팁',
  } as Record<string, string>)[lang] || 'Curated AI news: Technology, Investment, and Tips';

  const now = new Date().toISOString();

  const entries = allPosts
    .filter(post => !post.isVideo)
    .map(post => {
      const title = post.content.length > 120
        ? post.content.slice(0, 117) + '...'
        : post.content;
      const postUrl = post.sourceUrl || `${SITE_URL}/week/${weekIds[0]}`;

      return `  <entry>
    <title>${escapeXml(title)}</title>
    <link href="${escapeXml(postUrl)}" rel="alternate" />
    <id>tag:datacubeai.space,2026:tech-${post.id}</id>
    <updated>${post.timestamp || now}</updated>
    <summary type="text">${escapeXml(post.content)}</summary>
    <category term="${escapeXml(post.category)}" />
    <source>
      <title>${escapeXml(post.source)}</title>
    </source>
  </entry>`;
    })
    .join('\n');

  const atom = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${lang}">
  <title>${escapeXml(feedTitle)}</title>
  <subtitle>${escapeXml(feedSubtitle)}</subtitle>
  <link href="${SITE_URL}/feed.xml?lang=${lang}" rel="self" type="application/atom+xml" />
  <link href="${SITE_URL}" rel="alternate" type="text/html" />
  <id>tag:datacubeai.space,2026:feed:${lang}</id>
  <updated>${now}</updated>
  <author>
    <name>Data Cube AI</name>
    <uri>${SITE_URL}</uri>
  </author>
  <generator>Data Cube AI</generator>
${entries}
</feed>`;

  return new Response(atom, {
    headers: {
      'Content-Type': 'application/atom+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
    },
  });
}
