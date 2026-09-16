import type { Metadata } from 'next'
import { BRAND, absoluteUrl, brandedTitle } from '@/lib/brand'
import { TrustPage, type TrustPageConfig } from '../trust-page'

export const metadata: Metadata = {
  title: 'Corrections Policy',
  description: `Corrections policy for ${BRAND.name} summaries, sources, translations, period pages, feeds, and AI-readable discovery surfaces.`,
  alternates: { canonical: absoluteUrl('/corrections') },
  openGraph: {
    title: brandedTitle('Corrections Policy'),
    description: `How ${BRAND.name} reviews and updates corrections for summaries, source links, translations, feeds, and period pages.`,
    url: absoluteUrl('/corrections'),
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: BRAND.name }],
  },
}

const config: TrustPageConfig = {
  label: 'Corrections Policy',
  title: 'Corrections And Content Updates',
  description: `${BRAND.name} treats corrections as part of source transparency. Errors should be fixed at the affected page, feed, or summary surface.`,
  sections: [
    {
      title: 'What We Correct',
      bullets: [
        'Incorrect summaries or misleading wording.',
        'Wrong source attribution or broken source links.',
        'Wrong dates, categories, impact labels, company names, or funding details.',
        'Translation errors that change the meaning of the original item.',
      ],
    },
    {
      title: 'How To Report',
      body: [
        'Use the contact flow on the teams/contact page and include the page URL, period ID, language, source URL, and a short description of the issue.',
      ],
    },
    {
      title: 'Review Process',
      body: [
        'Correction requests are checked against the source material when possible. If an error is confirmed, the affected content is updated or removed.',
      ],
    },
    {
      title: 'Material Updates',
      body: [
        'When a correction materially changes the meaning of a summary, we prefer to update the period page and downstream feeds rather than silently leaving stale summaries in discovery surfaces.',
      ],
    },
  ],
}

export default function CorrectionsPage() {
  return <TrustPage config={config} />
}
