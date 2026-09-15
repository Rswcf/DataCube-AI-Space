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

/** True when Beehiiv holds this address as unsubscribed. A failed lookup counts as false. */
async function hasUnsubscribed(subscriptionsUrl: string, apiKey: string, email: string): Promise<boolean> {
  try {
    const res = await fetch(`${subscriptionsUrl}/by_email/${encodeURIComponent(email)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return false;
    const body = (await res.json()) as { data?: { status?: string } };
    return body.data?.status === "inactive";
  } catch {
    return false;
  }
}

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

    const subscriptionsUrl = `https://api.beehiiv.com/v2/publications/${publicationId}/subscriptions`;

    // Beehiiv reactivates an opted-out address at once, without double opt-in, so the site never
    // reactivates: a reader who unsubscribed asks through the contact form. The response matches
    // a new signup, so it does not reveal who unsubscribed.
    if (await hasUnsubscribed(subscriptionsUrl, apiKey, parsed.email)) {
      return Response.json({ ok: true });
    }

    const res = await fetch(subscriptionsUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: parsed.email,
        // Forced double opt-in: every signup is confirmed from the inbox.
        double_opt_override: "on",
        reactivate_existing: false,
        send_welcome_email: true,
        utm_source: "website",
        referring_site: referringSite(req.headers.get("referer")),
        custom_fields: [{ name: "language", value: parsed.language }],
      }),
    });

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
