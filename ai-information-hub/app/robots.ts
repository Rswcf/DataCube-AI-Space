import type { MetadataRoute } from 'next'
import { absoluteUrl } from '@/lib/brand'

// Groups do not inherit from the wildcard group, so every crawler group repeats the blocked paths.
const ALLOW = ['/', '/api/content-summary']
// '/*/topic/*?' keeps the topic filter variants (?section=, ?period=, ?page=, ?q=) out of reach: they are
// uncached dynamic renders, and only the filter-free topic page is meant to be crawled.
const DISALLOW = ['/api/', '/login', '/*/topic/*?']
const AI_CRAWLERS_WITH_DELAY = [
  'GPTBot',
  'ChatGPT-User',
  'OAI-SearchBot',
  'PerplexityBot',
  'Perplexity-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
]
const AI_CRAWLERS_WITHOUT_DELAY = ['anthropic-ai', 'Google-Extended']

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: ALLOW, disallow: DISALLOW },
      ...AI_CRAWLERS_WITH_DELAY.map((userAgent) => ({ userAgent, allow: ALLOW, disallow: DISALLOW, crawlDelay: 2 })),
      ...AI_CRAWLERS_WITHOUT_DELAY.map((userAgent) => ({ userAgent, allow: ALLOW, disallow: DISALLOW })),
      // Common Crawl feeds many AI training corpora; allowing it helps long-tail AI citation.
      { userAgent: 'CCBot', allow: ALLOW, disallow: DISALLOW, crawlDelay: 2 },
      // Meta's AI-training crawler brings no referrals; the Vercel WAF has denied it since 2026-09-15.
      { userAgent: 'meta-externalagent', disallow: '/' },
    ],
    sitemap: [absoluteUrl('/sitemap.xml'), absoluteUrl('/news-sitemap.xml')],
  }
}
