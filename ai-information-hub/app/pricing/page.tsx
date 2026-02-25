import type { Metadata } from 'next'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'DataCube AI pricing plans. Free access to daily AI news in 8 languages. Premium subscription and API access for developers and businesses.',
}

const premiumFeatures = [
  { feature: 'Daily AI news feed', free: 'Last 7 days', premium: 'Full archive' },
  { feature: 'Content languages', free: 'All 8', premium: 'All 8 + custom filters' },
  { feature: 'AI chat assistant', free: '5 queries/day', premium: 'Unlimited' },
  { feature: 'Email digest', free: 'Weekly', premium: 'Daily + breaking news' },
  { feature: 'API access', free: '100 calls/day', premium: '5,000 calls/day' },
  { feature: 'Custom alerts', free: 'No', premium: 'Keyword/topic alerts' },
  { feature: 'Ad-free experience', free: 'With ads', premium: 'No ads' },
  { feature: 'Export/download', free: 'No', premium: 'CSV/JSON export' },
]

const apiTiers = [
  {
    name: 'Free',
    price: '0',
    calls: '100',
    archive: 'Current week',
    endpoints: 'Basic',
    webhooks: 'No',
    support: 'Community',
    sla: '-',
    export: 'No',
  },
  {
    name: 'Developer',
    price: '19',
    calls: '1,000',
    archive: 'Full',
    endpoints: 'All',
    webhooks: 'Yes',
    support: 'Email',
    sla: '-',
    export: 'No',
  },
  {
    name: 'Business',
    price: '79',
    calls: '10,000',
    archive: 'Full',
    endpoints: 'All + custom filters',
    webhooks: 'Yes',
    support: 'Priority',
    sla: '99.5%',
    export: 'CSV/JSON',
  },
  {
    name: 'Enterprise',
    price: '249+',
    calls: 'Unlimited',
    archive: 'Full',
    endpoints: 'All + custom integration',
    webhooks: 'Yes',
    support: 'Dedicated',
    sla: '99.9%',
    export: 'CSV/JSON + bulk',
  },
]

const faqs = [
  {
    q: 'Is the free plan really free?',
    a: 'Yes. The free tier includes access to the current week of AI news data across all 8 languages, the AI chat assistant (5 queries/day), and 100 API calls per day. No credit card required.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'Premium subscriptions and API plans will be available via credit card (Visa, Mastercard, Amex) through Stripe. Invoicing is available for Enterprise plans.',
  },
  {
    q: 'Can I switch plans at any time?',
    a: 'Yes. You can upgrade or downgrade your plan at any time. When upgrading, the new features are available immediately. When downgrading, the change takes effect at the end of the current billing period.',
  },
  {
    q: 'What happens when I exceed my API rate limit?',
    a: 'When you reach your daily API call limit, subsequent requests return a 429 status code with a message indicating when the limit resets. You can upgrade your plan for higher limits.',
  },
  {
    q: 'Do you offer discounts for annual billing?',
    a: 'Annual billing will be available at launch with a 20% discount compared to monthly pricing.',
  },
  {
    q: 'What languages are supported?',
    a: 'All content is available in 8 languages: German (DE), English (EN), Chinese Simplified (ZH), French (FR), Spanish (ES), Portuguese (PT), Japanese (JA), and Korean (KO).',
  },
  {
    q: 'How do I get an API key?',
    a: 'Register at /api/developer/register with your email address. A free API key is generated immediately. No approval process required.',
  },
  {
    q: 'Is there an SLA for the API?',
    a: 'The Business plan includes a 99.5% uptime SLA, and Enterprise includes 99.9%. The Free and Developer tiers have no SLA but target the same availability.',
  },
]

export default function PricingPage() {
  return (
    <article className="max-w-4xl mx-auto px-4 py-8">
      <header className="mb-8">
        <p className="text-sm text-gray-600">
          <a
            href="/"
            className="underline hover:no-underline focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            &larr; Back to Home
          </a>
        </p>
      </header>

      {/* Hero */}
      <section className="mb-12 text-center">
        <h1 className="text-4xl font-bold mb-4">Pricing</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Start free. Upgrade when you need more. All plans include access to curated AI news
          in 8 languages.
        </p>
      </section>

      {/* Premium Subscription */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Premium Subscription</h2>
        <p className="leading-relaxed mb-6">
          Unlock the full DataCube AI experience with a Premium subscription.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Free card */}
          <div className="border border-gray-200 rounded-lg p-5 flex flex-col">
            <h3 className="text-lg font-semibold mb-2">Free</h3>
            <div className="mb-3">
              <span className="text-3xl font-bold">EUR 0</span>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Everything you need to stay informed about AI developments.
            </p>
            <a
              href="/"
              className="block text-center text-sm font-medium py-2 px-4 rounded-lg border border-gray-300 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-primary"
            >
              Current Plan
            </a>
          </div>

          {/* Premium card */}
          <div className="border border-gray-900 ring-1 ring-gray-900 rounded-lg p-5 flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold">Premium</h3>
              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                Coming Soon
              </span>
            </div>
            <div className="mb-3">
              <span className="text-3xl font-bold">EUR 7</span>
              <span className="text-sm text-gray-500">/month</span>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Full archive, unlimited chat, daily digest, and ad-free reading.
            </p>
            <button
              disabled
              className="block text-center text-sm font-medium py-2 px-4 rounded-lg bg-gray-900 text-white opacity-60 cursor-not-allowed"
            >
              Coming Soon
            </button>
          </div>
        </div>

        {/* Feature comparison table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-gray-200 px-3 py-2 text-left font-semibold">Feature</th>
                <th className="border border-gray-200 px-3 py-2 text-left font-semibold">Free</th>
                <th className="border border-gray-200 px-3 py-2 text-left font-semibold">
                  Premium (EUR 7/mo)
                </th>
              </tr>
            </thead>
            <tbody>
              {premiumFeatures.map((row) => (
                <tr key={row.feature}>
                  <td className="border border-gray-200 px-3 py-2 font-medium">{row.feature}</td>
                  <td className="border border-gray-200 px-3 py-2">{row.free}</td>
                  <td className="border border-gray-200 px-3 py-2">{row.premium}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* API Access */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">API Access</h2>
        <p className="leading-relaxed mb-6">
          Build on top of DataCube AI data. All API plans include access to structured JSON
          endpoints with multilingual content.{' '}
          <a
            href="/developers"
            className="underline hover:no-underline focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            View API documentation
          </a>
          .
        </p>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-gray-200 px-3 py-2 text-left font-semibold">Feature</th>
                {apiTiers.map((tier) => (
                  <th key={tier.name} className="border border-gray-200 px-3 py-2 text-left font-semibold">
                    {tier.name}
                    <br />
                    <span className="font-normal text-gray-500">
                      EUR {tier.price}{tier.price !== '0' && '/mo'}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-200 px-3 py-2 font-medium">Requests/day</td>
                {apiTiers.map((tier) => (
                  <td key={tier.name} className="border border-gray-200 px-3 py-2">{tier.calls}</td>
                ))}
              </tr>
              <tr>
                <td className="border border-gray-200 px-3 py-2 font-medium">Archive access</td>
                {apiTiers.map((tier) => (
                  <td key={tier.name} className="border border-gray-200 px-3 py-2">{tier.archive}</td>
                ))}
              </tr>
              <tr>
                <td className="border border-gray-200 px-3 py-2 font-medium">Endpoints</td>
                {apiTiers.map((tier) => (
                  <td key={tier.name} className="border border-gray-200 px-3 py-2">{tier.endpoints}</td>
                ))}
              </tr>
              <tr>
                <td className="border border-gray-200 px-3 py-2 font-medium">Webhooks</td>
                {apiTiers.map((tier) => (
                  <td key={tier.name} className="border border-gray-200 px-3 py-2">{tier.webhooks}</td>
                ))}
              </tr>
              <tr>
                <td className="border border-gray-200 px-3 py-2 font-medium">Support</td>
                {apiTiers.map((tier) => (
                  <td key={tier.name} className="border border-gray-200 px-3 py-2">{tier.support}</td>
                ))}
              </tr>
              <tr>
                <td className="border border-gray-200 px-3 py-2 font-medium">SLA</td>
                {apiTiers.map((tier) => (
                  <td key={tier.name} className="border border-gray-200 px-3 py-2">{tier.sla}</td>
                ))}
              </tr>
              <tr>
                <td className="border border-gray-200 px-3 py-2 font-medium">Export</td>
                {apiTiers.map((tier) => (
                  <td key={tier.name} className="border border-gray-200 px-3 py-2">{tier.export}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
        <div className="space-y-6">
          {faqs.map((faq) => (
            <div key={faq.q}>
              <h3 className="text-lg font-semibold mb-1">{faq.q}</h3>
              <p className="leading-relaxed text-sm">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

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
            href="/developers"
            className="underline hover:no-underline focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            Developers
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
