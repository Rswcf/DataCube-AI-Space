import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isSupportedLanguage, toLocalizedPath } from './lib/i18n'

// 2026-08: The former login gate ("visited" cookie wall + crawler-UA bypass)
// was removed — it served no auth purpose, suppressed first-visit conversion,
// and showing bots different behavior than humans is a cloaking risk.
//
// 2026-09: The middleware no longer touches responses at all (no cookies, no
// headers) so that ISR pages stay byte-identical and CDN-cacheable for every
// visitor. What used to live here moved closer to where it belongs:
//   - the `visited` cookie the chat/report API guard checks is set client-side
//     (lib/settings-context.tsx);
//   - `<html lang>` comes from the `[lang]` root layout (components/root-shell.tsx)
//     instead of an `x-lang` request header read via headers() — reading
//     headers() in the root layout had silently made every page dynamic;
//   - the noindex for article pages in languages without an audience is page
//     metadata (app/(localized)/[lang]/news/[periodId]/[storyId]/page.tsx).
// Only redirects and the prefetch short-circuit remain.

function buildTarget(pathname: string, searchParams: URLSearchParams): string {
  const query = searchParams.toString()
  return query ? `${pathname}?${query}` : pathname
}

const LANG_RE = '(?:de|en|zh|fr|es|pt|ja|ko)'

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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Router prefetches that carry no RSC header would render a full page for
  // nothing; answer them with an empty 204 instead.
  if (request.headers.get('next-router-prefetch') && !request.headers.get('rsc')) {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Cache-Control': 'private, no-store',
        'X-Robots-Tag': 'noindex, follow',
      },
    })
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
    const target = buildTarget(`/en/week/${legacyWeek[1]}`, searchParams)
    return NextResponse.redirect(new URL(target, request.url), 308)
  }

  const legacyTopic = pathname.match(/^\/topic\/([^/]+)$/)
  if (legacyTopic) {
    const target = buildTarget(`/en/topic/${legacyTopic[1]}`, searchParams)
    return NextResponse.redirect(new URL(target, request.url), 308)
  }

  const legacyNews = pathname.match(/^\/news\/([^/]+)\/([^/]+)$/)
  if (legacyNews) {
    const target = buildTarget(`/en/news/${legacyNews[1]}/${legacyNews[2]}`, searchParams)
    return NextResponse.redirect(new URL(target, request.url), 308)
  }

  return NextResponse.next()
}

export const config = {
  // Each entry is one branch of `middleware()` above, so the function only
  // runs when it can act. Until 2026-11 the matcher was the page-path pattern alone and
  // ~29k of every 12 h of invocations ended in `NextResponse.next()` — about
  // half of the project's billed Function Invocations, for nothing.
  // The source in the first two entries is every page path: everything except
  // API routes, Next.js internals, Vercel internals (analytics beacons) and any
  // path with a file extension. Next.js reads the matcher statically at build
  // time, so it must stay literal (no shared constant).
  // See lib/middleware-matcher.test.ts for the contract.
  matcher: [
    // Router prefetch without an RSC header → empty 204.
    { source: '/((?!api/|_next/|_vercel/|.*\\.[a-zA-Z0-9]+$).*)', has: [{ type: 'header', key: 'next-router-prefetch' }], missing: [{ type: 'header', key: 'rsc' }] },
    // ?lang= on a localizable path → 308 to the localized path.
    { source: '/((?!api/|_next/|_vercel/|.*\\.[a-zA-Z0-9]+$).*)', has: [{ type: 'query', key: 'lang' }] },
    // Legacy unprefixed paths → 308 to /en/….
    '/week/:weekId',
    '/topic/:topic',
    '/news/:periodId/:storyId',
  ],
}
