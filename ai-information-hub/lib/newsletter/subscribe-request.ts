export const SUPPORTED_NEWSLETTER_LANGUAGES = ["de", "en", "zh", "fr", "es", "pt", "ja", "ko"] as const;

export type NewsletterLanguage = (typeof SUPPORTED_NEWSLETTER_LANGUAGES)[number];

export type SubscribeRequest = { email: string; language: NewsletterLanguage };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_EMAIL_LENGTH = 254;

/** Validated subscribe input, or null when the email address is missing or malformed. */
export function parseSubscribeRequest(body: unknown): SubscribeRequest | null {
  if (!body || typeof body !== "object") return null;
  const { email, language } = body as { email?: unknown; language?: unknown };
  if (typeof email !== "string") return null;
  const trimmed = email.trim();
  if (trimmed.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(trimmed)) return null;
  const lang = SUPPORTED_NEWSLETTER_LANGUAGES.find((code) => code === language) ?? "en";
  return { email: trimmed, language: lang };
}

/** Page the reader subscribed from (origin + path only), for Beehiiv's referring_site. */
export function referringSite(referer: string | null): string | undefined {
  if (!referer) return undefined;
  try {
    const url = new URL(referer);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    return `${url.origin}${url.pathname}`.slice(0, 500);
  } catch {
    return undefined;
  }
}

/** Remove email addresses from provider error text before it is logged. */
export function redactEmails(text: string): string {
  return text.replace(/[^\s@"'<>]+@[^\s@"'<>]+/g, "<email>");
}
