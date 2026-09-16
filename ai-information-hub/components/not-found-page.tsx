import Link from 'next/link'

// Rendered inside whichever root layout threw notFound(). Kept deliberately
// language-neutral: not-found.tsx receives no params, and the localized shell
// already sets <html lang> for the request.
export function NotFoundPage() {
  return (
    <main id="main-content" className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm uppercase tracking-widest text-muted-foreground">404</p>
      <h1 className="text-3xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground">This page does not exist or is no longer available.</p>
      <Link href="/" className="underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded">
        Back to home
      </Link>
    </main>
  )
}
