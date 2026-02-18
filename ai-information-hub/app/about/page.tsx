import type { Metadata } from 'next'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'About & Editorial Standards',
  description:
    'How Data Cube AI curates daily AI news from 22+ sources using a transparent AI-assisted editorial pipeline. Learn about our data sources, processing stages, and multilingual coverage.',
}

export default function AboutPage() {
  return (
    <article className="max-w-4xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">About &amp; Editorial Standards</h1>
        <p className="mt-2 text-sm text-gray-600">
          <a
            href="/"
            className="underline hover:no-underline focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            &larr; Back to Home
          </a>
        </p>
        <p className="mt-4 text-sm text-gray-500">Last updated: February 18, 2026</p>
      </header>

      {/* Mission */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
        <p className="leading-relaxed">
          Data Cube AI is a multilingual daily AI news aggregator. We curate technology
          breakthroughs, investment news, practical tips, and YouTube videos from established
          sources across the AI and machine learning landscape. Our goal is to provide a concise,
          well-structured overview of the most relevant developments each day, available in eight
          languages.
        </p>
      </section>

      {/* Content Curation */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">How Content Is Curated</h2>
        <p className="leading-relaxed">
          Content is curated using an AI-assisted pipeline. We do not generate original reporting.
          Instead, we aggregate, classify, and summarize information from publicly available sources.
          Every item traces back to a verifiable original source with a direct link.
        </p>
        <p className="leading-relaxed mt-3">
          The curation process combines automated data collection with large language model (LLM)
          processing. Articles are scored for relevance, classified by topic, and summarized into
          structured entries. Human oversight is applied to pipeline configuration, source selection,
          and quality checks.
        </p>
      </section>

      {/* Data Sources */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Data Sources</h2>
        <p className="leading-relaxed mb-4">
          We monitor over 22 RSS feeds, the Hacker News front page (via the Algolia API), and
          YouTube channels (via the YouTube Data API v3). Sources are grouped into the following
          categories:
        </p>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Technology &amp; Research</h3>
            <p className="leading-relaxed text-sm">
              Major technology publications and AI-focused outlets including TechCrunch, Ars
              Technica, The Verge, MIT Technology Review, VentureBeat AI, and others. Hacker News
              front-page stories are included for community-validated technical content.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Investment &amp; Markets</h3>
            <p className="leading-relaxed text-sm">
              Financial and business sources covering AI-related investment activity, including
              primary market (funding rounds), secondary market (public equities), and M&amp;A
              (mergers and acquisitions). Real-time stock data is provided via Polygon.io.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Practical Tips</h3>
            <p className="leading-relaxed text-sm">
              14 Reddit communities focused on AI tools and workflows (such as r/LocalLLaMA,
              r/MachineLearning, r/ChatGPT, r/StableDiffusion), plus curated blogs including Simon
              Willison{"'"}s Weblog. Tips sources bypass LLM classification and are processed
              directly.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">YouTube Videos</h3>
            <p className="leading-relaxed text-sm">
              Curated AI and technology YouTube channels. Videos are summarized with key takeaways,
              view counts, and embedded directly in the feed.
            </p>
          </div>
        </div>
      </section>

      {/* Editorial Pipeline */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Editorial Pipeline</h2>
        <p className="leading-relaxed mb-4">
          Content processing follows a 4.5-stage pipeline, executed automatically during each
          collection cycle:
        </p>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-gray-200 px-3 py-2 text-left font-semibold">Stage</th>
                <th className="border border-gray-200 px-3 py-2 text-left font-semibold">Process</th>
                <th className="border border-gray-200 px-3 py-2 text-left font-semibold">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-200 px-3 py-2">1</td>
                <td className="border border-gray-200 px-3 py-2">Fetch</td>
                <td className="border border-gray-200 px-3 py-2">
                  Raw data is collected from all RSS feeds, Hacker News, and YouTube. Articles are
                  filtered by period boundaries (daily or weekly).
                </td>
              </tr>
              <tr>
                <td className="border border-gray-200 px-3 py-2">2</td>
                <td className="border border-gray-200 px-3 py-2">Classify</td>
                <td className="border border-gray-200 px-3 py-2">
                  An LLM classifier scores articles for AI relevance and assigns them to categories
                  (tech, investment, or tips). Tips-specific sources skip this step.
                </td>
              </tr>
              <tr>
                <td className="border border-gray-200 px-3 py-2">3</td>
                <td className="border border-gray-200 px-3 py-2">Process</td>
                <td className="border border-gray-200 px-3 py-2">
                  Parallel LLM processing generates structured summaries in German and English.
                  Each section (tech, investment, tips, videos) is processed independently with
                  section-specific prompts.
                </td>
              </tr>
              <tr>
                <td className="border border-gray-200 px-3 py-2">3.5</td>
                <td className="border border-gray-200 px-3 py-2">Translate</td>
                <td className="border border-gray-200 px-3 py-2">
                  English content is translated into six additional languages (Chinese, French,
                  Spanish, Portuguese, Japanese, Korean) using a free LLM model chain at zero cost.
                </td>
              </tr>
              <tr>
                <td className="border border-gray-200 px-3 py-2">4</td>
                <td className="border border-gray-200 px-3 py-2">Save</td>
                <td className="border border-gray-200 px-3 py-2">
                  Processed and translated content is stored in PostgreSQL. All original source
                  links are preserved.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Content Freshness */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Content Freshness</h2>
        <p className="leading-relaxed">
          The automated collection pipeline runs daily at 22:00 UTC (23:00 CET). Each daily cycle
          produces approximately 10 technology articles, 5 investment entries, 5 practical tips,
          and 2 video summaries. Weekly compilations aggregate the full week{"'"}s content with
          higher output counts.
        </p>
        <p className="leading-relaxed mt-3">
          Period identifiers follow the format <code className="text-sm bg-gray-100 px-1 py-0.5 rounded">YYYY-MM-DD</code> for
          daily editions and <code className="text-sm bg-gray-100 px-1 py-0.5 rounded">YYYY-kwWW</code> for weekly editions
          (ISO week numbering).
        </p>
      </section>

      {/* Language Support */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Language Support</h2>
        <p className="leading-relaxed mb-4">
          All content is available in eight languages. German and English are generated natively
          during the LLM processing stage. The remaining six languages are translated from English:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-gray-200 px-3 py-2 text-left font-semibold">Code</th>
                <th className="border border-gray-200 px-3 py-2 text-left font-semibold">Language</th>
                <th className="border border-gray-200 px-3 py-2 text-left font-semibold">Method</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-200 px-3 py-2">DE</td>
                <td className="border border-gray-200 px-3 py-2">German</td>
                <td className="border border-gray-200 px-3 py-2">Natively generated</td>
              </tr>
              <tr>
                <td className="border border-gray-200 px-3 py-2">EN</td>
                <td className="border border-gray-200 px-3 py-2">English</td>
                <td className="border border-gray-200 px-3 py-2">Natively generated</td>
              </tr>
              <tr>
                <td className="border border-gray-200 px-3 py-2">ZH</td>
                <td className="border border-gray-200 px-3 py-2">Chinese (Simplified)</td>
                <td className="border border-gray-200 px-3 py-2">Translated from English</td>
              </tr>
              <tr>
                <td className="border border-gray-200 px-3 py-2">FR</td>
                <td className="border border-gray-200 px-3 py-2">French</td>
                <td className="border border-gray-200 px-3 py-2">Translated from English</td>
              </tr>
              <tr>
                <td className="border border-gray-200 px-3 py-2">ES</td>
                <td className="border border-gray-200 px-3 py-2">Spanish</td>
                <td className="border border-gray-200 px-3 py-2">Translated from English</td>
              </tr>
              <tr>
                <td className="border border-gray-200 px-3 py-2">PT</td>
                <td className="border border-gray-200 px-3 py-2">Portuguese</td>
                <td className="border border-gray-200 px-3 py-2">Translated from English</td>
              </tr>
              <tr>
                <td className="border border-gray-200 px-3 py-2">JA</td>
                <td className="border border-gray-200 px-3 py-2">Japanese</td>
                <td className="border border-gray-200 px-3 py-2">Translated from English</td>
              </tr>
              <tr>
                <td className="border border-gray-200 px-3 py-2">KO</td>
                <td className="border border-gray-200 px-3 py-2">Korean</td>
                <td className="border border-gray-200 px-3 py-2">Translated from English</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="leading-relaxed text-sm mt-3">
          The newsletter is also delivered in the subscriber{"'"}s preferred language, selected
          automatically based on the site language at the time of signup.
        </p>
      </section>

      {/* AI Disclosure */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">AI Disclosure</h2>
        <p className="leading-relaxed">
          Data Cube AI uses large language models (LLMs) at multiple stages of the editorial
          pipeline: classification, summarization, translation, and interactive features (chat
          assistant, report generator). We believe in full transparency about the role of AI in
          our process:
        </p>
        <ul className="list-disc list-inside text-sm mt-3 space-y-2">
          <li>
            <strong>Classification and relevance scoring</strong> are performed by LLMs to filter
            and rank articles from a large pool of source material.
          </li>
          <li>
            <strong>Summaries and structured entries</strong> are generated by LLMs from original
            source content. Every entry links to its original source for verification.
          </li>
          <li>
            <strong>Translations</strong> into six additional languages are produced by LLMs. German
            and English content is generated directly during the processing stage.
          </li>
          <li>
            <strong>Source selection, pipeline design, and quality oversight</strong> are managed by
            the editorial team.
          </li>
        </ul>
      </section>

      {/* Author Attribution */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Author Attribution</h2>
        <p className="leading-relaxed">
          Content on Data Cube AI is published by the <strong>Data Cube AI Editorial Team</strong>{' '}
          using AI-assisted curation. The editorial team is responsible for source selection, pipeline
          configuration, quality assurance, and the overall editorial direction. Individual articles
          are not bylined, as they are aggregated summaries rather than original reporting.
        </p>
      </section>

      {/* Accuracy and Corrections */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Accuracy and Corrections</h2>
        <p className="leading-relaxed">
          While we strive for accuracy in all summaries and translations, AI-generated content may
          contain errors. Every entry includes a link to its original source, which should be
          considered the authoritative reference. If you identify an inaccuracy, please contact us
          through the information provided on our{' '}
          <a
            href="/impressum"
            className="underline hover:no-underline focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            Impressum page
          </a>
          .
        </p>
      </section>

      {/* Technology Stack */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Technology</h2>
        <p className="leading-relaxed">
          The frontend is built with Next.js and deployed on Vercel. The backend API runs on
          FastAPI with a PostgreSQL database, deployed on Railway. Content processing uses
          OpenRouter for LLM access. The site is open to all visitors without authentication.
        </p>
      </section>

      {/* Contact */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Contact</h2>
        <p className="leading-relaxed">
          For legal information, operator details, and contact options, see the{' '}
          <a
            href="/impressum"
            className="underline hover:no-underline focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            Impressum / Legal Notice
          </a>
          . For privacy-related inquiries, see the{' '}
          <a
            href="/datenschutz"
            className="underline hover:no-underline focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            Datenschutz / Privacy Policy
          </a>
          .
        </p>
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
