import defaults from './brand-defaults.json'

/**
 * Public identity of the site (spec AD1). Rename by changing lib/brand-defaults.json or the NEXT_PUBLIC_*
 * variables. ai-hub-backend/app/config.py carries the same identity for the backend.
 */
export type Brand = {
  name: string
  shortName: string
  siteUrl: string
  siteHost: string
  apexHost: string
  founderName: string
  githubIssuesUrl: string
}

export type BrandEnv = {
  NEXT_PUBLIC_BRAND_NAME?: string
  NEXT_PUBLIC_BRAND_SHORT_NAME?: string
  NEXT_PUBLIC_SITE_URL?: string
  NEXT_PUBLIC_FOUNDER_NAME?: string
}

function pick(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim()
  return trimmed ? trimmed : fallback
}

export function buildBrand(env: BrandEnv): Brand {
  const siteUrl = pick(env.NEXT_PUBLIC_SITE_URL, defaults.siteUrl).replace(/\/+$/, '')
  const siteHost = new URL(siteUrl).hostname
  return {
    name: pick(env.NEXT_PUBLIC_BRAND_NAME, defaults.name),
    shortName: pick(env.NEXT_PUBLIC_BRAND_SHORT_NAME, defaults.shortName),
    siteUrl,
    siteHost,
    apexHost: siteHost.replace(/^www\./, ''),
    founderName: pick(env.NEXT_PUBLIC_FOUNDER_NAME, defaults.founderName),
    githubIssuesUrl: defaults.githubIssuesUrl,
  }
}

// Each variable is read by its full name, so Next.js inlines it into client bundles.
export const BRAND: Brand = buildBrand({
  NEXT_PUBLIC_BRAND_NAME: process.env.NEXT_PUBLIC_BRAND_NAME,
  NEXT_PUBLIC_BRAND_SHORT_NAME: process.env.NEXT_PUBLIC_BRAND_SHORT_NAME,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_FOUNDER_NAME: process.env.NEXT_PUBLIC_FOUNDER_NAME,
})

/** Identifiers that must survive a rename (spec AD1). Never derive them from BRAND. */
export const FROZEN_IDS = {
  atomTagPrefix: 'tag:datacubeai.space,2026:',
  takeawaysAnchorId: 'dcai-takeaways',
} as const

/** Fills the {brand}, {brandShort}, {siteUrl} and {siteHost} placeholders of translated strings. */
export function fillBrand(template: string, brand: Brand = BRAND): string {
  return template
    .replaceAll('{brand}', brand.name)
    .replaceAll('{brandShort}', brand.shortName)
    .replaceAll('{siteUrl}', brand.siteUrl)
    .replaceAll('{siteHost}', brand.siteHost)
}

export function absoluteUrl(path: string, brand: Brand = BRAND): string {
  return `${brand.siteUrl}${path.startsWith('/') ? path : `/${path}`}`
}

/** "<title> | <brand>": the format the title template in lib/site-metadata.ts produces. */
export function brandedTitle(title: string, brand: Brand = BRAND): string {
  return `${title} | ${brand.name}`
}
