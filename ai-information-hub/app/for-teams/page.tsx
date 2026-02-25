import type { Metadata } from 'next'
import { ContactForm } from './contact-form'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'For Teams & Enterprise',
  description:
    'Enterprise AI intelligence for corporate innovation teams, investment firms, and consulting companies. Custom dashboards, white-label feeds, data APIs, and trend reports from 40+ curated sources in 8 languages.',
}

const useCases = [
  {
    title: 'Corporate Innovation Teams',
    description:
      'Stay ahead of AI trends affecting your industry. Monitor breakthroughs, track competitor moves, and identify emerging technologies before they reshape your market.',
    icon: 'B',
    accent: 'bg-blue-100 text-blue-700',
  },
  {
    title: 'Investment Firms',
    description:
      'Track AI funding rounds, M&A activity, and market movements in real time. Get structured intelligence on primary and secondary market activity with integrated stock data.',
    icon: 'I',
    accent: 'bg-amber-100 text-amber-700',
  },
  {
    title: 'Research Departments',
    description:
      'Monitor AI breakthroughs and academic developments from 22+ curated sources. Receive daily digests covering technology, tools, and practical applications.',
    icon: 'R',
    accent: 'bg-emerald-100 text-emerald-700',
  },
  {
    title: 'Consulting Firms',
    description:
      'White-label AI news feed for client deliverables. Embed curated, multilingual AI intelligence directly into your reports, newsletters, and intranet portals.',
    icon: 'C',
    accent: 'bg-purple-100 text-purple-700',
  },
]

const products = [
  {
    name: 'Enterprise Dashboard',
    description: 'Custom AI news dashboard with team access, role-based permissions, and saved filters',
    price: 'EUR 500/mo',
  },
  {
    name: 'White-Label Feed',
    description: 'Branded AI news widget for your website or corporate intranet',
    price: 'EUR 300/mo',
  },
  {
    name: 'Custom Data Feeds',
    description: 'Filtered REST API access with custom categories, webhooks, and Swagger documentation',
    price: 'EUR 200/mo',
  },
  {
    name: 'AI Trend Reports',
    description: 'Monthly or weekly analyst-grade AI trend reports with executive summaries',
    price: 'EUR 100/report',
  },
]

const benefits = [
  '40+ curated sources, updated daily',
  '8-language support (DACH + global coverage)',
  'Real-time stock data integration via Polygon.io',
  'REST API with full Swagger documentation',
  'Custom filtering by topic, company, and technology',
  'Dedicated account support and SLA options',
  'GDPR-compliant data processing',
  'No long-term commitment required',
]

export default function ForTeamsPage() {
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
      <section className="mb-12">
        <h1 className="text-3xl font-bold mb-4">AI Intelligence for Your Team</h1>
        <p className="text-lg leading-relaxed text-gray-700">
          Data Cube AI delivers curated, multilingual AI news and market intelligence for corporate
          innovation teams, investment professionals, and technology leaders. Our automated pipeline
          processes 40+ sources daily, producing structured intelligence in 8 languages — so your
          team can focus on decisions, not discovery.
        </p>
      </section>

      {/* Use Cases */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Who We Serve</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {useCases.map((uc) => (
            <div
              key={uc.title}
              className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3 mb-3">
                <span
                  className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold ${uc.accent}`}
                  aria-hidden="true"
                >
                  {uc.icon}
                </span>
                <h3 className="text-lg font-semibold">{uc.title}</h3>
              </div>
              <p className="text-sm leading-relaxed text-gray-600">{uc.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Product Offerings */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Product Offerings</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-gray-200 px-4 py-3 text-left font-semibold">
                  Product
                </th>
                <th className="border border-gray-200 px-4 py-3 text-left font-semibold">
                  Description
                </th>
                <th className="border border-gray-200 px-4 py-3 text-left font-semibold whitespace-nowrap">
                  Starting Price
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.name}>
                  <td className="border border-gray-200 px-4 py-3 font-medium whitespace-nowrap">
                    {product.name}
                  </td>
                  <td className="border border-gray-200 px-4 py-3">{product.description}</td>
                  <td className="border border-gray-200 px-4 py-3 whitespace-nowrap tabular-nums">
                    {product.price}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          All prices exclude VAT. Volume discounts available for annual contracts.
        </p>
      </section>

      {/* Key Benefits */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Key Benefits</h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {benefits.map((benefit) => (
            <li key={benefit} className="flex items-start gap-2 text-sm leading-relaxed">
              <span className="text-green-600 mt-0.5 shrink-0" aria-hidden="true">
                &#10003;
              </span>
              {benefit}
            </li>
          ))}
        </ul>
      </section>

      {/* Contact Form */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Get in Touch</h2>
        <p className="text-sm text-gray-600 mb-6">
          Tell us about your team and requirements. We will get back to you within one business day.
        </p>
        <ContactForm />
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
