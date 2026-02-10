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

function isLocalizablePath(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname === '/de' ||
    pathname === '/en' ||
    /^\/week\/[^/]+$/.test(pathname) ||
    /^\/topic\/[^/]+$/.test(pathname) ||
    /^\/(de|en)\/week\/[^/]+$/.test(pathname) ||
    /^\/(de|en)\/topic\/[^/]+$/.test(pathname)
  )
}

function isSeoAlwaysAllowedPath(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname === '/de' ||
    pathname === '/en' ||
    pathname === '/impressum' ||
    pathname === '/datenschutz' ||
    /^\/week\/[^/]+$/.test(pathname) ||
    /^\/topic\/[^/]+$/.test(pathname) ||
    /^\/(de|en)\/week\/[^/]+$/.test(pathname) ||
    /^\/(de|en)\/topic\/[^/]+$/.test(pathname)
  )
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip login, API and static assets.
  if (
    pathname === '/login' ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Keep login for normal browsers, but let crawlers/automation reach SEO paths.
  const isSeoAutomationPass = isSeoAlwaysAllowedPath(pathname) && !isLikelyHumanBrowser(request)
  const shouldBypassLoginGate = isCrawler(request) || isSeoAutomationPass
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

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
