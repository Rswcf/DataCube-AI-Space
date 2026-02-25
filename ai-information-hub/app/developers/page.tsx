import type { Metadata } from 'next'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'API for Developers',
  description:
    'Access curated AI news data from 40+ sources in 8 languages via the DataCube AI REST API. Technology, investment, tips, and video endpoints with real-time stock data.',
}

const API_BASE = 'https://api-production-3ee5.up.railway.app'

const endpoints = [
  { path: '/api/weeks', method: 'GET', description: 'List all available periods (weeks with nested days)' },
  { path: '/api/tech/{periodId}', method: 'GET', description: 'Technology news + video summaries' },
  { path: '/api/investment/{periodId}', method: 'GET', description: 'Investment data (funding rounds, stocks, M&A)' },
  { path: '/api/tips/{periodId}', method: 'GET', description: 'Practical AI tips from Reddit + blogs' },
  { path: '/api/videos/{periodId}', method: 'GET', description: 'YouTube video summaries with key takeaways' },
  { path: '/api/trends/{periodId}', method: 'GET', description: 'Trending topics and rankings' },
  { path: '/api/stock/{ticker}', method: 'GET', description: 'Real-time stock data (Polygon.io)' },
  { path: '/api/stock/batch/', method: 'GET', description: 'Batch stock data (e.g. ?tickers=AAPL,NVDA)' },
]

const tiers = [
  {
    name: 'Free',
    price: '0',
    calls: '100',
    features: ['Current week only', 'Basic endpoints', 'Community support'],
    highlight: false,
    cta: 'Get Started',
    ctaHref: `${API_BASE}/docs`,
    comingSoon: false,
  },
  {
    name: 'Developer',
    price: '19',
    calls: '1,000',
    features: ['Full archive access', 'All endpoints', 'Webhook support', 'Email support'],
    highlight: true,
    cta: 'Get Started',
    ctaHref: '#',
    comingSoon: true,
  },
  {
    name: 'Business',
    price: '79',
    calls: '10,000',
    features: ['Priority support', 'Custom filters', 'Bulk export (CSV/JSON)', 'SLA 99.5%'],
    highlight: false,
    cta: 'Get Started',
    ctaHref: '#',
    comingSoon: true,
  },
  {
    name: 'Enterprise',
    price: '249+',
    calls: 'Unlimited',
    features: ['Dedicated support', 'Custom integration', 'SLA 99.9%', 'On-premise option'],
    highlight: false,
    cta: 'Contact Us',
    ctaHref: '#',
    comingSoon: true,
  },
]

export default function DevelopersPage() {
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
        <h1 className="text-4xl font-bold mb-4">DataCube AI API</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Access curated AI news data from 40+ sources in 8 languages. Technology breakthroughs,
          investment rounds, practical tips, and video summaries — all structured and ready for
          your application.
        </p>
        <div className="mt-6">
          <a
            href={`${API_BASE}/docs`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-primary"
          >
            Get Started
          </a>
        </div>
      </section>

      {/* API Overview */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">API Endpoints</h2>
        <p className="leading-relaxed mb-4">
          All endpoints return JSON. Period IDs use the format{' '}
          <code className="text-sm bg-gray-100 px-1 py-0.5 rounded">YYYY-MM-DD</code> for daily
          editions and{' '}
          <code className="text-sm bg-gray-100 px-1 py-0.5 rounded">YYYY-kwWW</code> for weekly
          editions.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-gray-200 px-3 py-2 text-left font-semibold">Endpoint</th>
                <th className="border border-gray-200 px-3 py-2 text-left font-semibold">Method</th>
                <th className="border border-gray-200 px-3 py-2 text-left font-semibold">Description</th>
              </tr>
            </thead>
            <tbody>
              {endpoints.map((ep) => (
                <tr key={ep.path}>
                  <td className="border border-gray-200 px-3 py-2 font-mono text-xs">{ep.path}</td>
                  <td className="border border-gray-200 px-3 py-2">{ep.method}</td>
                  <td className="border border-gray-200 px-3 py-2">{ep.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Code Examples */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Quick Start</h2>
        <p className="leading-relaxed mb-4">
          Fetch the latest tech articles in just a few lines:
        </p>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">JavaScript</h3>
            <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-x-auto text-sm">
              <code>{`// Fetch today's tech articles
const response = await fetch(
  '${API_BASE}/api/tech/2026-02-25'
);
const data = await response.json();

// data.en = Array of English tech articles
// data.de = Array of German tech articles
console.log(data.en[0].content);`}</code>
            </pre>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Python</h3>
            <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-x-auto text-sm">
              <code>{`import requests

# Fetch today's tech articles
response = requests.get(
    '${API_BASE}/api/tech/2026-02-25'
)
data = response.json()

# data['en'] = List of English tech articles
# data['de'] = List of German tech articles
print(data['en'][0]['content'])`}</code>
            </pre>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">cURL</h3>
            <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-x-auto text-sm">
              <code>{`curl -s ${API_BASE}/api/weeks | python -m json.tool`}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">API Pricing</h2>
        <p className="leading-relaxed mb-6">
          Start for free. Scale as your application grows.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`border rounded-lg p-5 flex flex-col ${
                tier.highlight
                  ? 'border-gray-900 ring-1 ring-gray-900'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold">{tier.name}</h3>
                {tier.highlight && (
                  <span className="text-xs bg-gray-900 text-white px-2 py-0.5 rounded-full">
                    Popular
                  </span>
                )}
                {tier.comingSoon && (
                  <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                    Coming Soon
                  </span>
                )}
              </div>

              <div className="mb-3">
                <span className="text-3xl font-bold">
                  EUR {tier.price}
                </span>
                {tier.price !== '0' && (
                  <span className="text-sm text-gray-500">/month</span>
                )}
              </div>

              <p className="text-sm text-gray-600 mb-3">
                {tier.calls} requests/day
              </p>

              <ul className="text-sm space-y-1.5 mb-5 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5" aria-hidden="true">-</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <a
                href={tier.ctaHref}
                target={tier.ctaHref.startsWith('http') ? '_blank' : undefined}
                rel={tier.ctaHref.startsWith('http') ? 'noopener noreferrer' : undefined}
                className={`block text-center text-sm font-medium py-2 px-4 rounded-lg focus-visible:ring-2 focus-visible:ring-primary ${
                  tier.highlight
                    ? 'bg-gray-900 text-white hover:bg-gray-800'
                    : 'border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {tier.cta}
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive Docs */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Interactive Documentation</h2>
        <p className="leading-relaxed">
          Explore all endpoints, request parameters, and response schemas in the interactive
          Swagger documentation:
        </p>
        <p className="mt-3">
          <a
            href={`${API_BASE}/docs`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:no-underline focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            Open API Documentation
          </a>
        </p>
      </section>

      {/* Data Coverage */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Data Coverage</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-gray-200 px-3 py-2 text-left font-semibold">Category</th>
                <th className="border border-gray-200 px-3 py-2 text-left font-semibold">Sources</th>
                <th className="border border-gray-200 px-3 py-2 text-left font-semibold">Daily Output</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-200 px-3 py-2">Technology</td>
                <td className="border border-gray-200 px-3 py-2">RSS feeds + Hacker News</td>
                <td className="border border-gray-200 px-3 py-2">~10 articles + 2 videos</td>
              </tr>
              <tr>
                <td className="border border-gray-200 px-3 py-2">Investment</td>
                <td className="border border-gray-200 px-3 py-2">Financial RSS feeds</td>
                <td className="border border-gray-200 px-3 py-2">~5 entries (funding, stocks, M&amp;A)</td>
              </tr>
              <tr>
                <td className="border border-gray-200 px-3 py-2">Tips</td>
                <td className="border border-gray-200 px-3 py-2">14 Reddit communities + blogs</td>
                <td className="border border-gray-200 px-3 py-2">~5 practical tips</td>
              </tr>
              <tr>
                <td className="border border-gray-200 px-3 py-2">Videos</td>
                <td className="border border-gray-200 px-3 py-2">Curated YouTube channels</td>
                <td className="border border-gray-200 px-3 py-2">~2 video summaries</td>
              </tr>
              <tr>
                <td className="border border-gray-200 px-3 py-2">Languages</td>
                <td className="border border-gray-200 px-3 py-2">LLM translation pipeline</td>
                <td className="border border-gray-200 px-3 py-2">8 (DE, EN, ZH, FR, ES, PT, JA, KO)</td>
              </tr>
            </tbody>
          </table>
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
            href="/pricing"
            className="underline hover:no-underline focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            Pricing
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
