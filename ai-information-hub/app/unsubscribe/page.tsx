import Link from "next/link";
import type { Metadata } from "next";
import { isWellFormedUnsubscribeToken } from "@/lib/newsletter/unsubscribe-token";
import { UnsubscribeConfirm } from "./unsubscribe-confirm";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string | string[] }>;
}) {
  const { t } = await searchParams;
  const token = isWellFormedUnsubscribeToken(t) ? t : null;

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background p-6">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-bold">Unsubscribe</h1>
        {token ? (
          <UnsubscribeConfirm token={token} />
        ) : (
          <p className="text-muted-foreground">
            Newsletter emails carry a personal link at the bottom that unsubscribes you with one
            click. If the link in your email brought you to this page instead, send us a message
            through the{" "}
            <Link href="/contact" className="underline hover:no-underline">
              contact form
            </Link>{" "}
            using the address you subscribed with, and we will unsubscribe you by hand.
          </p>
        )}
        <Link
          href="/"
          className="inline-block rounded-full border border-border px-6 py-2 text-sm font-medium transition-opacity hover:opacity-90"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
