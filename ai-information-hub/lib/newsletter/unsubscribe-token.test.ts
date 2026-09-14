import { describe, expect, it } from "vitest";
import { extractUnsubscribeToken, isWellFormedUnsubscribeToken } from "./unsubscribe-token";

const TOKEN = `v1.0a1b2c3d.sub_3f6a7c1e-1b2c-4d5e-8f90-123456789abc.${"A".repeat(43)}`;
const ENDPOINT = "https://www.datacubeai.space/api/newsletter/unsubscribe";

describe("isWellFormedUnsubscribeToken", () => {
  it("accepts the backend token shape", () => {
    expect(isWellFormedUnsubscribeToken(TOKEN)).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isWellFormedUnsubscribeToken(null)).toBe(false);
    expect(isWellFormedUnsubscribeToken("")).toBe(false);
    expect(isWellFormedUnsubscribeToken(`${TOKEN}\n`)).toBe(false);
    expect(isWellFormedUnsubscribeToken(TOKEN.replace("v1.", "v2."))).toBe(false);
    expect(isWellFormedUnsubscribeToken(`v1.0a1b2c3d.reader@example.com.${"A".repeat(43)}`)).toBe(false);
  });
});

describe("extractUnsubscribeToken", () => {
  it("reads the token from the URL of an RFC 8058 one-click POST", () => {
    const url = new URL(`${ENDPOINT}?t=${TOKEN}`);
    expect(extractUnsubscribeToken(url, "application/x-www-form-urlencoded", "List-Unsubscribe=One-Click")).toBe(TOKEN);
  });

  it("reads the token from the confirm page form body", () => {
    const body = new URLSearchParams({ t: TOKEN }).toString();
    expect(extractUnsubscribeToken(new URL(ENDPOINT), "application/x-www-form-urlencoded;charset=UTF-8", body)).toBe(TOKEN);
  });

  it("returns null when no well-formed token is present", () => {
    const withBadQuery = new URL(`${ENDPOINT}?t=nope`);
    expect(extractUnsubscribeToken(withBadQuery, "application/x-www-form-urlencoded", "List-Unsubscribe=One-Click")).toBeNull();
    expect(extractUnsubscribeToken(new URL(ENDPOINT), "application/json", JSON.stringify({ t: TOKEN }))).toBeNull();
  });
});
