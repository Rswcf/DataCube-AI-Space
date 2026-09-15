import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const SUBSCRIPTIONS = "https://api.beehiiv.com/v2/publications/pub_test/subscriptions";

type BeehiivCall = { url: string; init: RequestInit };

let nextIp = 0;

// A distinct client IP per request keeps the per-IP rate limit out of these tests.
function subscribeRequest(email: string, language = "en"): Request {
  nextIp += 1;
  return new Request("https://www.datacubeai.space/api/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `203.0.113.${nextIp}` },
    body: JSON.stringify({ email, language }),
  });
}

function stubBeehiiv(lookup: () => Response): BeehiivCall[] {
  const calls: BeehiivCall[] = [];
  vi.stubGlobal("fetch", async (url: string | URL, init: RequestInit = {}) => {
    calls.push({ url: String(url), init });
    if (String(url).includes("/by_email/")) return lookup();
    return Response.json({ data: { status: "validating" } }, { status: 201 });
  });
  return calls;
}

function creates(calls: BeehiivCall[]): BeehiivCall[] {
  return calls.filter((call) => call.init.method === "POST");
}

beforeEach(() => {
  vi.stubEnv("BEEHIIV_API_KEY", "bh_test");
  vi.stubEnv("BEEHIIV_PUBLICATION_ID", "pub_test");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/subscribe", () => {
  it("creates a new address with forced double opt-in and without reactivation", async () => {
    const calls = stubBeehiiv(() => new Response("{}", { status: 404 }));

    const res = await POST(subscribeRequest("new.reader@example.com", "de"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(calls[0].url).toBe(`${SUBSCRIPTIONS}/by_email/new.reader%40example.com`);
    expect(creates(calls)).toHaveLength(1);
    expect(creates(calls)[0].url).toBe(SUBSCRIPTIONS);
    expect(JSON.parse(String(creates(calls)[0].init.body))).toMatchObject({
      email: "new.reader@example.com",
      double_opt_override: "on",
      reactivate_existing: false,
      custom_fields: [{ name: "language", value: "de" }],
    });
  });

  it("never reactivates an address that unsubscribed, and answers like a new signup", async () => {
    const calls = stubBeehiiv(() => Response.json({ data: { status: "inactive" } }));

    const res = await POST(subscribeRequest("former.reader@example.com"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(creates(calls)).toHaveLength(0);
  });

  it("sends an existing address that did not unsubscribe through create, still without reactivation", async () => {
    const calls = stubBeehiiv(() => Response.json({ data: { status: "validating" } }));

    const res = await POST(subscribeRequest("pending.reader@example.com"));

    expect(res.status).toBe(200);
    expect(creates(calls)).toHaveLength(1);
    expect(JSON.parse(String(creates(calls)[0].init.body)).reactivate_existing).toBe(false);
  });

  it("creates without reactivation when the lookup fails", async () => {
    const calls = stubBeehiiv(() => {
      throw new TypeError("fetch failed");
    });

    const res = await POST(subscribeRequest("lookup.failure@example.com"));

    expect(res.status).toBe(200);
    expect(creates(calls)).toHaveLength(1);
    expect(JSON.parse(String(creates(calls)[0].init.body)).reactivate_existing).toBe(false);
  });
});
