import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const CRAWLER_PATTERNS = [
  // Search engines
  'googlebot', 'bingbot', 'yandexbot', 'duckduckbot', 'baiduspider', 'slurp',
  // AI crawlers
  'gptbot', 'chatgpt-user', 'perplexitybot', 'claudebot', 'anthropic-ai',
  'google-extended', 'cohere-ai', 'bytespider',
  // Social media previews
  'twitterbot', 'facebookexternalhit', 'linkedinbot', 'whatsapp',
  'slackbot', 'telegrambot', 'discordbot',
  // Feed fetchers
  'feedfetcher', 'feedly',
  // Additional crawlers
  'applebot', 'ia_archiver', 'sogou', 'ccbot', 'meta-externalagent', 'amazonbot',
];

function isCrawler(request: NextRequest): boolean {
  const ua = request.headers.get('user-agent')?.toLowerCase() || '';
  return CRAWLER_PATTERNS.some(p => ua.includes(p));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow login page and static assets
  if (
    pathname === "/login" ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Allow crawlers to bypass login gate
  if (isCrawler(request)) {
    return NextResponse.next();
  }

  // Check if user has visited before (via cookie)
  const hasVisited = request.cookies.get("visited");

  if (!hasVisited) {
    // First visit: redirect to login page
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
