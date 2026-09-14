import type { NextRequest } from "next/server";
import { API_BASE, DEFAULT_API_BASE } from "@/lib/api-base";
import { extractUnsubscribeToken } from "@/lib/newsletter/unsubscribe-token";

// RFC 8058 one-click unsubscribe endpoint named in the List-Unsubscribe header.
// Mail receivers POST here without cookies or Origin, so this route must not
// use enforceProtectedApiRequest, and it answers the POST itself (a redirect
// would drop the POST). The backend verifies the token and calls Beehiiv.
export const dynamic = "force-dynamic";

const MAX_BODY_CHARS = 2_000;

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  if (rawBody.length > MAX_BODY_CHARS) return json({ ok: false, error: "invalid_request" }, 413);

  const token = extractUnsubscribeToken(req.nextUrl, req.headers.get("content-type"), rawBody);
  if (!token) return json({ ok: false, error: "invalid_token" }, 400);

  try {
    const res = await fetch(`${API_BASE || DEFAULT_API_BASE}/newsletter/unsubscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) return json({ ok: true });
    if (res.status === 400) return json({ ok: false, error: "invalid_token" }, 400);
    return json({ ok: false, error: "unavailable" }, 502);
  } catch {
    return json({ ok: false, error: "unavailable" }, 502);
  }
}

// Link checkers and some mail clients open the header URL with GET. GET never
// unsubscribes: it sends the reader to the confirm page.
export function GET(req: NextRequest) {
  const target = new URL("/unsubscribe", req.nextUrl.origin);
  const token = req.nextUrl.searchParams.get("t");
  if (token) target.searchParams.set("t", token);
  return Response.redirect(target, 303);
}
