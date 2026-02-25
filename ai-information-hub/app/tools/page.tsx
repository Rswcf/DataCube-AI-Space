import type { Metadata } from 'next'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'AI Tools & Resources',
  description:
    'Curated collection of the best AI tools for writing, productivity, development, video creation, and research. Find the right AI tool for your workflow.',
  openGraph: {
    title: 'AI Tools & Resources | DataCube AI',
    description:
      'Curated collection of the best AI tools for writing, productivity, development, video creation, and research.',
    type: 'website',
  },
}

interface Tool {
  name: string
  description: string
  category: string
  categoryColor: string
  pricing: string
  hasFree: boolean
  url: string
}

const tools: Tool[] = [
  {
    name: 'Notion AI',
    description:
      'AI-powered workspace combining notes, docs, and project management with built-in AI writing and analysis features.',
    category: 'Productivity',
    categoryColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    pricing: 'From $10/mo',
    hasFree: true,
    url: 'https://AFFILIATE_LINK_PLACEHOLDER',
  },
  {
    name: 'Jasper',
    description:
      'Enterprise AI writing assistant for marketing teams. Generate blog posts, ad copy, social media content, and more.',
    category: 'Writing',
    categoryColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    pricing: 'From $49/mo',
    hasFree: false,
    url: 'https://AFFILIATE_LINK_PLACEHOLDER',
  },
  {
    name: 'Copy.ai',
    description:
      'AI-powered marketing copy generator with templates for ads, emails, product descriptions, and social media posts.',
    category: 'Writing',
    categoryColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    pricing: 'From $49/mo',
    hasFree: true,
    url: 'https://AFFILIATE_LINK_PLACEHOLDER',
  },
  {
    name: 'Synthesia',
    description:
      'Create professional AI-generated videos with realistic avatars and voiceovers in over 130 languages.',
    category: 'Video',
    categoryColor: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
    pricing: 'From $22/mo',
    hasFree: false,
    url: 'https://AFFILIATE_LINK_PLACEHOLDER',
  },
  {
    name: 'CustomGPT.ai',
    description:
      'Build custom AI chatbots trained on your own data. Ideal for customer support, internal knowledge bases, and documentation.',
    category: 'Development',
    categoryColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    pricing: 'From $89/mo',
    hasFree: false,
    url: 'https://AFFILIATE_LINK_PLACEHOLDER',
  },
  {
    name: 'Cursor',
    description:
      'AI-native code editor built on VS Code. Features intelligent code completion, chat-based editing, and codebase-aware assistance.',
    category: 'Development',
    categoryColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    pricing: 'From $20/mo',
    hasFree: true,
    url: 'https://AFFILIATE_LINK_PLACEHOLDER',
  },
  {
    name: 'Perplexity Pro',
    description:
      'AI-powered research assistant that provides sourced answers with citations. Ideal for deep research and fact-checking.',
    category: 'Research',
    categoryColor: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
    pricing: 'From $20/mo',
    hasFree: true,
    url: 'https://AFFILIATE_LINK_PLACEHOLDER',
  },
  {
    name: 'Midjourney',
    description:
      'Leading AI image generation platform. Create photorealistic images, illustrations, and concept art from text prompts.',
    category: 'Creative',
    categoryColor: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-300',
    pricing: 'From $10/mo',
    hasFree: false,
    url: 'https://AFFILIATE_LINK_PLACEHOLDER',
  },
  {
    name: 'Runway ML',
    description:
      'Professional AI video editing and generation suite. Features include text-to-video, motion tracking, and background removal.',
    category: 'Video',
    categoryColor: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
    pricing: 'From $12/mo',
    hasFree: true,
    url: 'https://AFFILIATE_LINK_PLACEHOLDER',
  },
  {
    name: 'Descript',
    description:
      'AI-powered audio and video editing platform. Edit media by editing text transcripts with automatic filler word removal.',
    category: 'Video',
    categoryColor: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
    pricing: 'From $24/mo',
    hasFree: true,
    url: 'https://AFFILIATE_LINK_PLACEHOLDER',
  },
]

function ToolInitial({ name, category }: { name: string; category: string }) {
  const colorMap: Record<string, string> = {
    Writing: 'bg-blue-500',
    Productivity: 'bg-amber-500',
    Development: 'bg-emerald-500',
    Video: 'bg-rose-500',
    Research: 'bg-violet-500',
    Creative: 'bg-fuchsia-500',
  }

  return (
    <div
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white text-lg font-bold ${colorMap[category] || 'bg-gray-500'}`}
      aria-hidden="true"
    >
      {name.charAt(0)}
    </div>
  )
}

export default function ToolsPage() {
  return (
    <article className="max-w-4xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">AI Tools &amp; Resources</h1>
        <p className="mt-2 text-sm text-gray-600">
          <a
            href="/"
            className="underline hover:no-underline focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            &larr; Back to Home
          </a>
        </p>
      </header>

      {/* Affiliate Disclosure */}
      <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/50 dark:bg-amber-950/20">
        <p className="text-sm text-amber-800 dark:text-amber-300">
          <strong>Affiliate-Hinweis / Affiliate Disclosure:</strong> Einige Links auf
          dieser Seite sind Affiliate-Links. Wenn Sie einen Kauf t&auml;tigen, erhalten
          wir m&ouml;glicherweise eine Provision, ohne dass Ihnen zus&auml;tzliche Kosten
          entstehen. / Some links on this page are affiliate links. If you make a purchase,
          we may earn a commission at no additional cost to you.
        </p>
      </div>

      {/* Introduction */}
      <section className="mb-10">
        <p className="leading-relaxed">
          A curated selection of AI tools that we find genuinely useful across different
          workflows. Each tool has been evaluated for quality, reliability, and value.
          Whether you are a developer, writer, researcher, or content creator, these
          tools can help integrate AI into your daily work.
        </p>
      </section>

      {/* Tool Cards Grid */}
      <section className="mb-10">
        <div className="grid gap-4 sm:grid-cols-2">
          {tools.map((tool) => (
            <div
              key={tool.name}
              className="flex flex-col rounded-xl border border-border bg-secondary/30 p-5 transition-colors hover:bg-secondary/60"
            >
              <div className="flex items-start gap-4 mb-3">
                <ToolInitial name={tool.name} category={tool.category} />
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold leading-tight">{tool.name}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${tool.categoryColor}`}
                    >
                      {tool.category}
                    </span>
                    {tool.hasFree && (
                      <span className="inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
                        Free tier
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <p className="flex-1 text-sm leading-relaxed text-muted-foreground mb-4">
                {tool.description}
              </p>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  {tool.pricing}
                </span>
                <a
                  href={tool.url}
                  rel="nofollow sponsored"
                  target="_blank"
                  className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Try it
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Methodology */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">How We Select Tools</h2>
        <p className="leading-relaxed">
          Tools featured on this page are selected by the Data Cube AI editorial team based
          on product quality, user reviews, pricing transparency, and relevance to AI-related
          workflows. Inclusion on this page does not constitute an endorsement of every aspect
          of a product. We encourage you to evaluate each tool based on your specific needs.
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
