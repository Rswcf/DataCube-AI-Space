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
  'perplexitybot',
  'claudebot',
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

function isLikelyHumanBrowser(request: NextRequest): boolean {
  const ua = request.headers.get('user-agent')?.toLowerCase() || ''
  if (!ua) return false

  const browserSignatures = ['chrome/', 'safari/', 'firefox/', 'edg/', 'opr/', 'mobile/']
  const automationHints = ['bot', 'spider', 'crawler', 'curl/', 'wget/', 'python-requests', 'headless', 'lighthouse']

  const hasBrowserSignature = browserSignatures.some((signature) => ua.includes(signature))
  const hasAutomationHint = automationHints.some((hint) => ua.includes(hint))

  return hasBrowserSignature && !hasAutomationHint
}

const LANG_RE = '(?:de|en|zh|fr|es|pt|ja|ko)'

function isLocalizablePath(pathname: string): boolean {
  return (
    pathname === '/' ||
    new RegExp(`^\\/${LANG_RE}$`).test(pathname) ||
    /^\/week\/[^/]+$/.test(pathname) ||
    /^\/topic\/[^/]+$/.test(pathname) ||
    new RegExp(`^\\/${LANG_RE}\\/week\\/[^/]+$`).test(pathname) ||
    new RegExp(`^\\/${LANG_RE}\\/topic\\/[^/]+$`).test(pathname)
  )
}

// Paths that bypass the login gate entirely — accessible to ALL visitors,
// not just crawlers or users with the `visited` cookie.
const LOGIN_BYPASS_PATHS = new Set([
  '/impressum',
  '/datenschutz',
  '/about',
  '/developers',
  '/pricing',
  '/for-teams',
  '/jobs',
  '/premium',
])

function isSeoAlwaysAllowedPath(pathname: string): boolean {
  return (
    pathname === '/' ||
    new RegExp(`^\\/${LANG_RE}$`).test(pathname) ||
    LOGIN_BYPASS_PATHS.has(pathname) ||
    /^\/week\/[^/]+$/.test(pathname) ||
    /^\/topic\/[^/]+$/.test(pathname) ||
    new RegExp(`^\\/${LANG_RE}\\/week\\/[^/]+$`).test(pathname) ||
    new RegExp(`^\\/${LANG_RE}\\/topic\\/[^/]+$`).test(pathname)
  )
}

function nextWithLang(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl
  const segments = pathname.split('/')
  const langSegment = segments[1]
  const lang = isSupportedLanguage(langSegment) ? langSegment : 'de'

  const requestHeaders = new Headers(request.headers)
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

  // Informational/marketing pages bypass login gate for ALL visitors (human or bot).
  // SEO content paths bypass for crawlers and non-human browsers only.
  const isPublicInfoPage = LOGIN_BYPASS_PATHS.has(pathname)
  const isSeoAutomationPass = isSeoAlwaysAllowedPath(pathname) && !isLikelyHumanBrowser(request)
  const shouldBypassLoginGate = isPublicInfoPage || isCrawler(request) || isSeoAutomationPass
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

  return nextWithLang(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
