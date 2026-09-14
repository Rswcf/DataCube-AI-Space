// Mirrors ai-hub-backend/app/services/unsubscribe_tokens.py:
// v1.<8 hex key id>.<Beehiiv subscription id>.<43-char base64url HMAC>
const TOKEN_PATTERN = /^v1\.[0-9a-f]{8}\.[A-Za-z0-9_-]{1,64}\.[A-Za-z0-9_-]{43}$/;

export function isWellFormedUnsubscribeToken(value: unknown): value is string {
  return typeof value === "string" && TOKEN_PATTERN.test(value);
}

/**
 * Token of a one-click unsubscribe POST. RFC 8058 mail receivers keep it in
 * the URL (`?t=`) and send `List-Unsubscribe=One-Click` as a form body; the
 * confirm page sends it as the form field `t`.
 */
export function extractUnsubscribeToken(
  url: { searchParams: URLSearchParams },
  contentType: string | null,
  rawBody: string,
): string | null {
  const fromQuery = url.searchParams.get("t");
  if (isWellFormedUnsubscribeToken(fromQuery)) return fromQuery;
  if ((contentType ?? "").toLowerCase().startsWith("application/x-www-form-urlencoded")) {
    const fromForm = new URLSearchParams(rawBody).get("t");
    if (isWellFormedUnsubscribeToken(fromForm)) return fromForm;
  }
  return null;
}
