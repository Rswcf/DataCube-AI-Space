import {
  ApiRouteError,
  apiErrorResponse,
  enforceRateLimit,
  readJsonBody,
} from "@/lib/server/api-guard";
import {
  parseSubscribeRequest,
  redactEmails,
  referringSite,
} from "@/lib/newsletter/subscribe-request";

// Per-IP limit only: subscribe forms must work for first-time visitors, so the
// cookie/origin guard used by the LLM endpoints does not apply here.
const SUBSCRIBE_RATE_LIMIT = { limit: 5, windowMs: 10 * 60 * 1000 };

export async function POST(req: Request) {
  try {
    enforceRateLimit(req, "subscribe", SUBSCRIBE_RATE_LIMIT);
    const parsed = parseSubscribeRequest(await readJsonBody<unknown>(req, 2_000));
    if (!parsed) {
      return Response.json({ error: "A valid email address is required" }, { status: 400 });
    }

    const apiKey = process.env.BEEHIIV_API_KEY;
    const publicationId = process.env.BEEHIIV_PUBLICATION_ID;
    if (!apiKey || !publicationId) {
      console.error("Missing BEEHIIV_API_KEY or BEEHIIV_PUBLICATION_ID");
      return Response.json({ error: "Newsletter service not configured" }, { status: 503 });
    }

    const res = await fetch(
      `https://api.beehiiv.com/v2/publications/${publicationId}/subscriptions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: parsed.email,
          // Forced double opt-in: every signup, including a re-subscribe of an
          // address that opted out, must be confirmed from the inbox.
          double_opt_override: "on",
          reactivate_existing: true,
          send_welcome_email: true,
          utm_source: "website",
          referring_site: referringSite(req.headers.get("referer")),
          custom_fields: [{ name: "language", value: parsed.language }],
        }),
      },
    );

    if (!res.ok) {
      const detail = redactEmails((await res.text()).slice(0, 300));
      console.error(`Beehiiv API error ${res.status}: ${detail}`);
      if (res.status === 409) {
        return Response.json({ ok: true, alreadySubscribed: true });
      }
      return Response.json({ error: "Subscription failed" }, { status: 502 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof ApiRouteError) return apiErrorResponse(err);
    console.error("Subscribe error:", err instanceof Error ? err.message : "unknown");
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
