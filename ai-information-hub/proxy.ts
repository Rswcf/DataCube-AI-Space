import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isSupportedLanguage, toLocalizedPath } from './lib/i18n'

function buildTarget(pathname: string, searchParams: URLSearchParams): string {
  const query = searchParams.toString()
  return query ? `${pathname}?${query}` : pathname
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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip API and static assets.
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
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
