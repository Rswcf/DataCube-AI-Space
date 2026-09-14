import type { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { API_BASE, DEFAULT_API_BASE } from "@/lib/api-base";
import { GET, POST } from "./route";

const TOKEN = `v1.0a1b2c3d.sub_3f6a7c1e-1b2c-4d5e-8f90-123456789abc.${"A".repeat(43)}`;
const ENDPOINT = "https://www.datacubeai.space/api/newsletter/unsubscribe";
const BACKEND = `${API_BASE || DEFAULT_API_BASE}/newsletter/unsubscribe`;

type BackendCall = { url: string; init: RequestInit };

function stubBackend(respond: () => Response): BackendCall[] {
  const calls: BackendCall[] = [];
  vi.stubGlobal("fetch", async (url: string | URL, init: RequestInit) => {
    calls.push({ url: String(url), init });
    return respond();
  });
  return calls;
}

function request(method: "GET" | "POST", url: string, contentType?: string, body?: string): NextRequest {
  const headers = new Headers();
  if (contentType) headers.set("content-type", contentType);
  const req = new Request(url, { method, headers, body: method === "GET" ? undefined : (body ?? "") });
  return Object.assign(req, { nextUrl: new URL(url) }) as unknown as NextRequest;
}

function oneClick(): NextRequest {
  return request("POST", `${ENDPOINT}?t=${TOKEN}`, "application/x-www-form-urlencoded", "List-Unsubscribe=One-Click");
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("POST /api/newsletter/unsubscribe", () => {
  it("forwards an RFC 8058 form-urlencoded one-click POST to the backend", async () => {
    const calls = stubBackend(() => new Response("{}", { status: 200 }));

    const res = await POST(oneClick());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(BACKEND);
    expect(calls[0].init.method).toBe("POST");
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ token: TOKEN });
    expect(new Headers(calls[0].init.headers).get("content-type")).toBe("application/json");
  });

  it("accepts a multipart/form-data one-click POST", async () => {
    const calls = stubBackend(() => new Response("{}", { status: 200 }));
    const boundary = "----FormBoundary7MA4YWxk";
    const body = `--${boundary}\r\nContent-Disposition: form-data; name="List-Unsubscribe"\r\n\r\nOne-Click\r\n--${boundary}--\r\n`;

    const res = await POST(request("POST", `${ENDPOINT}?t=${TOKEN}`, `multipart/form-data; boundary=${boundary}`, body));

    expect(res.status).toBe(200);
    expect(calls).toHaveLength(1);
  });

  it("accepts the confirm page's POST with the token in the form body", async () => {
    const calls = stubBackend(() => new Response("{}", { status: 200 }));
    const body = new URLSearchParams({ t: TOKEN }).toString();

    const res = await POST(request("POST", ENDPOINT, "application/x-www-form-urlencoded", body));

    expect(res.status).toBe(200);
    expect(calls).toHaveLength(1);
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ token: TOKEN });
  });

  it.each([
    { backend: 400, status: 400, error: "invalid_token" },
    { backend: 404, status: 502, error: "unavailable" },
    { backend: 502, status: 502, error: "unavailable" },
    { backend: 503, status: 502, error: "unavailable" },
  ])("maps backend $backend to $status $error", async ({ backend, status, error }) => {
    stubBackend(() => new Response("{}", { status: backend }));

    const res = await POST(oneClick());

    expect(res.status).toBe(status);
    expect(await res.json()).toEqual({ ok: false, error });
  });

  it("maps a network failure to 502 unavailable", async () => {
    stubBackend(() => {
      throw new TypeError("fetch failed");
    });

    const res = await POST(oneClick());

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ ok: false, error: "unavailable" });
  });

  it("rejects a malformed token without calling the backend", async () => {
    const calls = stubBackend(() => new Response("{}", { status: 200 }));

    const res = await POST(
      request("POST", `${ENDPOINT}?t=nope`, "application/x-www-form-urlencoded", "List-Unsubscribe=One-Click"),
    );

    expect(res.status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it("never reads the token from a JSON body", async () => {
    const calls = stubBackend(() => new Response("{}", { status: 200 }));

    const res = await POST(request("POST", ENDPOINT, "application/json", JSON.stringify({ t: TOKEN })));

    expect(res.status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it("refuses an oversized body with 413 before any backend call", async () => {
    const calls = stubBackend(() => new Response("{}", { status: 200 }));

    const res = await POST(
      request("POST", `${ENDPOINT}?t=${TOKEN}`, "application/x-www-form-urlencoded", "x".repeat(2001)),
    );

    expect(res.status).toBe(413);
    expect(calls).toHaveLength(0);
  });
});

describe("GET /api/newsletter/unsubscribe", () => {
  it("never unsubscribes and redirects to the confirm page with the token", () => {
    const calls = stubBackend(() => new Response("{}", { status: 200 }));

    const res = GET(request("GET", `${ENDPOINT}?t=${TOKEN}`));

    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(`https://www.datacubeai.space/unsubscribe?t=${TOKEN}`);
    expect(calls).toHaveLength(0);
  });

  it("redirects to the bare confirm page without a token", () => {
    const res = GET(request("GET", ENDPOINT));

    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://www.datacubeai.space/unsubscribe");
  });

  it("cannot be turned into an open redirect", () => {
    for (const hostile of ["//evil.example/x", "https://evil.example/", "/\\evil.example"]) {
      const res = GET(request("GET", `${ENDPOINT}?t=${encodeURIComponent(hostile)}`));
      const location = new URL(res.headers.get("location") ?? "");

      expect(location.origin).toBe("https://www.datacubeai.space");
      expect(location.pathname).toBe("/unsubscribe");
      expect(location.searchParams.get("t")).toBe(hostile);
    }
  });
});
