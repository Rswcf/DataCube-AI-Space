import type { Metadata } from 'next'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Premium',
  description:
    'Unlock the full power of Data Cube AI with Premium: unlimited AI chat, full archive access, custom keyword alerts, data export, and ad-free reading across 8 languages.',
}

/* -------------------------------------------------------------------
   Feature comparison data
   ------------------------------------------------------------------- */

const FEATURES: { label: string; free: string; premium: string }[] = [
  { label: 'Daily AI news feed', free: 'Last 7 days', premium: 'Full archive access' },
  { label: 'Content languages', free: 'All 8 languages', premium: 'All 8 + custom filters' },
  { label: 'AI chat assistant', free: '5 queries/day', premium: 'Unlimited queries' },
  { label: 'Weekly email digest', free: 'Yes', premium: 'Daily digest + breaking news alerts' },
  { label: 'API access', free: '100 calls/day', premium: '5,000 calls/day' },
  { label: 'Custom keyword alerts', free: 'No', premium: 'Yes' },
  { label: 'Ad-free experience', free: 'No', premium: 'Yes' },
  { label: 'Data export (CSV/JSON)', free: 'No', premium: 'Yes' },
  { label: 'Priority support', free: 'No', premium: 'Yes' },
]

const PREMIUM_FEATURES = [
  'Full archive access',
  'Unlimited AI chat queries',
  'Daily digest + breaking news alerts',
  '5,000 API calls/day',
  'Custom keyword alerts',
  'Ad-free experience',
  'Data export (CSV/JSON)',
  'Priority support',
  'All 8 languages + custom filters',
]

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. You can cancel your subscription from your account settings at any time. You will retain access until the end of your current billing period.',
  },
  {
    q: 'What payment methods are accepted?',
    a: 'All major credit and debit cards are accepted via Stripe. We support Visa, Mastercard, American Express, and more.',
  },
  {
    q: 'Is there a free trial?',
    a: 'Yes. Every Premium subscription starts with a 7-day free trial. You will not be charged until the trial period ends.',
  },
  {
    q: 'What happens to my data if I cancel?',
    a: 'Your bookmarks, saved searches, and settings are preserved. You can reactivate your subscription at any time to regain Premium access.',
  },
]

const TRUST_BADGES = [
  'GDPR Compliant',
  'No Tracking Ads',
  '8 Languages',
  '40+ Sources',
]

/* -------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------- */

function Check({ className }: { className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M7 10l2 2 4-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function XMark({ className }: { className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M7 7l6 6M13 7l-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CellValue({ value }: { value: string }) {
  if (value === 'Yes') {
    return <Check className="text-emerald-600 mx-auto" />
  }
  if (value === 'No') {
    return <XMark className="text-gray-400 mx-auto" />
  }
  return <span>{value}</span>
}

/* -------------------------------------------------------------------
   Page
   ------------------------------------------------------------------- */

export default function PremiumPage() {
  return (
    <article className="max-w-4xl mx-auto px-4 py-8">
      {/* Back link */}
      <p className="text-sm text-gray-600 mb-8">
        <a
          href="/"
          className="underline hover:no-underline focus-visible:ring-2 focus-visible:ring-primary rounded"
        >
          &larr; Back to Home
        </a>
      </p>

      {/* ---- Hero ---- */}
      <header className="mb-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Unlock the Full Power of Data Cube AI
        </h1>
        <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Get unlimited AI chat, full archive access, custom keyword alerts, data export,
          and an ad-free reading experience across all 8 languages. Stay ahead with
          daily digests and breaking news alerts delivered straight to your inbox.
        </p>
      </header>

      {/* ---- Feature Comparison Table ---- */}
      <section className="mb-16">
        <h2 className="text-2xl font-semibold mb-6 text-center">Free vs. Premium</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-gray-200 px-4 py-3 text-left font-semibold">
                  Feature
                </th>
                <th className="border border-gray-200 px-4 py-3 text-center font-semibold w-40">
                  Free
                </th>
                <th className="border border-gray-200 px-4 py-3 text-center font-semibold w-52 bg-amber-50">
                  Premium (EUR 7/mo)
                </th>
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((f) => (
                <tr key={f.label}>
                  <td className="border border-gray-200 px-4 py-3">{f.label}</td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-gray-600">
                    <CellValue value={f.free} />
                  </td>
                  <td className="border border-gray-200 px-4 py-3 text-center bg-amber-50/50 font-medium">
                    <CellValue value={f.premium} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---- Pricing Card ---- */}
      <section className="mb-16 flex justify-center">
        <div className="w-full max-w-md border-2 border-amber-400 rounded-xl p-8 shadow-lg text-center">
          <div className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full uppercase tracking-wide mb-4">
            Premium
          </div>
          <div className="text-5xl font-bold tracking-tight">
            EUR 7
            <span className="text-lg font-normal text-gray-500">/month</span>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            or EUR 70/year (save 17%)
          </p>

          <ul className="mt-8 text-left space-y-3">
            {PREMIUM_FEATURES.map((feat) => (
              <li key={feat} className="flex items-start gap-2 text-sm">
                <Check className="text-emerald-600 mt-0.5 flex-shrink-0" />
                <span>{feat}</span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            disabled
            className="mt-8 w-full rounded-lg bg-gray-400 px-6 py-3 text-sm font-semibold text-white cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Subscribe now (coming soon)"
          >
            Coming Soon
          </button>
          <p className="mt-3 text-xs text-gray-500">
            7-day free trial included. Cancel anytime.
          </p>
        </div>
      </section>

      {/* ---- FAQ ---- */}
      <section className="mb-16">
        <h2 className="text-2xl font-semibold mb-6 text-center">
          Frequently Asked Questions
        </h2>
        <div className="space-y-6 max-w-2xl mx-auto">
          {FAQ.map((item) => (
            <div key={item.q}>
              <h3 className="text-lg font-semibold mb-1">{item.q}</h3>
              <p className="leading-relaxed text-sm text-gray-600">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Social Proof / Trust ---- */}
      <section className="mb-16 text-center">
        <p className="text-lg font-semibold mb-4">
          Join data-driven professionals who trust Data Cube AI
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          {TRUST_BADGES.map((badge) => (
            <span
              key={badge}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-700"
            >
              <Check className="text-emerald-600" />
              {badge}
            </span>
          ))}
        </div>
      </section>

      {/* ---- Footer ---- */}
      <footer className="mt-12 border-t border-gray-200 pt-6">
        <div className="flex gap-4 text-sm">
          <a
            href="/"
            className="underline hover:no-underline focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            Home
          </a>
          <span className="text-gray-400">|</span>
          <a
            href="/impressum"
            className="underline hover:no-underline focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            Impressum
          </a>
          <span className="text-gray-400">|</span>
          <a
            href="/datenschutz"
            className="underline hover:no-underline focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            Datenschutz
          </a>
        </div>
      </footer>
    </article>
  )
}
