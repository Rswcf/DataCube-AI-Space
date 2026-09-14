import { describe, expect, it } from "vitest";
import { parseSubscribeRequest, redactEmails, referringSite } from "./subscribe-request";

describe("parseSubscribeRequest", () => {
  it("accepts a valid address and trims it", () => {
    expect(parseSubscribeRequest({ email: "  reader@example.com ", language: "zh" })).toEqual({
      email: "reader@example.com",
      language: "zh",
    });
  });

  it("defaults an unsupported or missing language to English", () => {
    expect(parseSubscribeRequest({ email: "reader@example.com", language: "xx" })?.language).toBe("en");
    expect(parseSubscribeRequest({ email: "reader@example.com" })?.language).toBe("en");
  });

  it("rejects malformed, missing or oversized addresses", () => {
    expect(parseSubscribeRequest({ email: "not-an-email" })).toBeNull();
    expect(parseSubscribeRequest({ email: "a@b" })).toBeNull();
    expect(parseSubscribeRequest({ language: "en" })).toBeNull();
    expect(parseSubscribeRequest(null)).toBeNull();
    expect(parseSubscribeRequest({ email: `${"a".repeat(250)}@example.com` })).toBeNull();
  });
});

describe("referringSite", () => {
  it("keeps origin and path but drops query and fragment", () => {
    expect(referringSite("https://www.datacubeai.space/en/week/2026-09-12?utm=x#top")).toBe(
      "https://www.datacubeai.space/en/week/2026-09-12",
    );
  });

  it("ignores missing or non-http referers", () => {
    expect(referringSite(null)).toBeUndefined();
    expect(referringSite("javascript:alert(1)")).toBeUndefined();
    expect(referringSite("not a url")).toBeUndefined();
  });
});

describe("redactEmails", () => {
  it("removes addresses from provider error text", () => {
    expect(redactEmails('{"error":"reader@example.com is invalid"}')).toBe('{"error":"<email> is invalid"}');
  });
});
