import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isSupportedLanguage, toLocalizedPath } from './lib/i18n'

const CRAWLER_PATTERNS = [
  'googlebot',
  'bingbot',
  'yandexbot',
  'duckduckbot',
  'baiduspider',
  'slurp',
  'gptbot',
  'chatgpt-user',
  'oai-searchbot',
  'perplexitybot',
  'perplexity-user',
  'claudebot',
  'claude-searchbot',
  'claude-user',
  'anthropic-ai',
  'google-extended',
  'cohere-ai',
  'bytespider',
  'twitterbot',
  'facebookexternalhit',
  'linkedinbot',
  'whatsapp',
  'slackbot',
  'telegrambot',
  'discordbot',
  'feedfetcher',
  'feedly',
  'applebot',
  'ia_archiver',
  'sogou',
  'ccbot',
  'meta-externalagent',
  'amazonbot',
]

function buildTarget(pathname: string, searchParams: URLSearchParams): string {
  const query = searchParams.toString()
  return query ? `${pathname}?${query}` : pathname
}

function isCrawler(request: NextRequest): boolean {
  const ua = request.headers.get('user-agent')?.toLowerCase() || ''
  return CRAWLER_PATTERNS.some((pattern) => ua.includes(pattern))
}

const LANG_RE = '(?:de|en|zh|fr|es|pt|ja|ko)'

// Article pages are indexed only in languages with a real audience (DE/EN/ZH).
// The other five languages stay served (with hreflang) but send
// `X-Robots-Tag: noindex` — 8x-ing thin article pages amplifies the
// "scaled content" footprint that suppresses the whole site on Google
// (see .ai-collab/context/seo-growth-ads-strategy-2026-07.md §4.2).
// Revisit once domain authority is established.
const INDEXED_ARTICLE_LANGS = new Set(['de', 'en', 'zh'])

function isNoindexArticlePath(pathname: string): boolean {
  const match = pathname.match(/^\/(de|en|zh|fr|es|pt|ja|ko)\/news\/[^/]+\/[^/]+$/)
  return match !== null && !INDEXED_ARTICLE_LANGS.has(match[1])
}

function isLocalizablePath(pathname: string): boolean {
  return (
    pathname === '/' ||
    new RegExp(`^\\/${LANG_RE}$`).test(pathname) ||
    /^\/week\/[^/]+$/.test(pathname) ||
    /^\/topic\/[^/]+$/.test(pathname) ||
    /^\/news\/[^/]+\/[^/]+$/.test(pathname) ||
    new RegExp(`^\\/${LANG_RE}\\/week\\/[^/]+$`).test(pathname) ||
    new RegExp(`^\\/${LANG_RE}\\/topic\\/[^/]+$`).test(pathname) ||
    new RegExp(`^\\/${LANG_RE}\\/news\\/[^/]+\\/[^/]+$`).test(pathname) ||
    new RegExp(`^\\/${LANG_RE}\\/tools(\\/[^/]+)?$`).test(pathname)
  )
}

// Paths that bypass the login gate entirely — accessible to ALL visitors,
// not just crawlers or users with the `visited` cookie.
const LOGIN_BYPASS_PATHS = new Set([
  '/impressum',
  '/datenschutz',
  '/for-teams',
  '/premium',
  '/about',
  '/contact',
  '/editorial-policy',
  '/source-methodology',
  '/corrections',
  '/ai-disclosure',
])

function isSeoAlwaysAllowedPath(pathname: string): boolean {
  return (
    pathname === '/' ||
    new RegExp(`^\\/${LANG_RE}$`).test(pathname) ||
    LOGIN_BYPASS_PATHS.has(pathname) ||
    /^\/week\/[^/]+$/.test(pathname) ||
    /^\/topic\/[^/]+$/.test(pathname) ||
    /^\/news\/[^/]+\/[^/]+$/.test(pathname) ||
    new RegExp(`^\\/${LANG_RE}\\/week\\/[^/]+$`).test(pathname) ||
    new RegExp(`^\\/${LANG_RE}\\/topic\\/[^/]+$`).test(pathname) ||
    new RegExp(`^\\/${LANG_RE}\\/news\\/[^/]+\\/[^/]+$`).test(pathname) ||
    new RegExp(`^\\/${LANG_RE}\\/tools(\\/[^/]+)?$`).test(pathname)
  )
}

function nextWithLang(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl
  const segments = pathname.split('/')
  const langSegment = segments[1]
  const lang = isSupportedLanguage(langSegment) ? langSegment : 'de'

  const requestHeaders = new Headers(request.headers)
  if (requestHeaders.get('next-router-prefetch') && !requestHeaders.get('rsc')) {
    requestHeaders.delete('next-router-prefetch')
    requestHeaders.delete('next-router-segment-prefetch')
  }
  requestHeaders.set('x-lang', lang)
  return NextResponse.next({ request: { headers: requestHeaders } })
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip login, API and static assets.
  if (
    pathname === '/login' ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return nextWithLang(request)
  }

  if (request.headers.get('next-router-prefetch') && !request.headers.get('rsc')) {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Cache-Control': 'private, no-store',
        'X-Robots-Tag': 'noindex, follow',
      },
    })
  }

  // Public SEO and marketing pages must serve the same primary content to
  // humans, search crawlers, AI retrieval bots, and framework prefetches.
  const shouldBypassLoginGate = isSeoAlwaysAllowedPath(pathname) || isCrawler(request)
  if (!shouldBypassLoginGate) {
    const hasVisited = request.cookies.get('visited')
    if (!hasVisited) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  const searchParams = new URLSearchParams(request.nextUrl.searchParams)
  const langParam = searchParams.get('lang')

  if (langParam && isSupportedLanguage(langParam) && isLocalizablePath(pathname)) {
    searchParams.delete('lang')
    const localizedPath = toLocalizedPath(pathname, langParam)
    const target = buildTarget(localizedPath, searchParams)
    const current = buildTarget(pathname, request.nextUrl.searchParams)

    if (target !== current) {
      return NextResponse.redirect(new URL(target, request.url), 308)
    }
  }

  const legacyWeek = pathname.match(/^\/week\/([^/]+)$/)
  if (legacyWeek) {
    const target = buildTarget(`/de/week/${legacyWeek[1]}`, searchParams)
    return NextResponse.redirect(new URL(target, request.url), 308)
  }

  const legacyTopic = pathname.match(/^\/topic\/([^/]+)$/)
  if (legacyTopic) {
    const target = buildTarget(`/de/topic/${legacyTopic[1]}`, searchParams)
    return NextResponse.redirect(new URL(target, request.url), 308)
  }

  const legacyNews = pathname.match(/^\/news\/([^/]+)\/([^/]+)$/)
  if (legacyNews) {
    const target = buildTarget(`/de/news/${legacyNews[1]}/${legacyNews[2]}`, searchParams)
    return NextResponse.redirect(new URL(target, request.url), 308)
  }

  const response = nextWithLang(request)
  if (isNoindexArticlePath(pathname)) {
    response.headers.set('X-Robots-Tag', 'noindex, follow')
  }
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
