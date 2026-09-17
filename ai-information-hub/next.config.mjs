import { readFileSync } from 'node:fs'

// The canonical site comes from the brand config (lib/brand-defaults.json, shared with lib/brand.ts);
// NEXT_PUBLIC_SITE_URL overrides it at build time.
const brandDefaults = JSON.parse(readFileSync(new URL('./lib/brand-defaults.json', import.meta.url), 'utf8'))
const siteUrl = new URL((process.env.NEXT_PUBLIC_SITE_URL || '').trim() || brandDefaults.siteUrl)
const apexHost = siteUrl.hostname.replace(/^www\./, '')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep metadata in the initial <head> for crawlers and audit tools instead of
  // streaming it after page content.
  htmlLimitedBots: /.*/,
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'img.youtube.com', pathname: '/vi/**' },
      { protocol: 'https', hostname: 'i.ytimg.com', pathname: '/**' },
    ],
  },
  async headers() {
    return [
      {
        source: '/api/:path((?!content-summary).*)',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://vercel.live https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://img.youtube.com https://i.ytimg.com; font-src 'self' data:; connect-src 'self' https://api-production-3ee5.up.railway.app https://*.vercel-insights.com https://vitals.vercel-insights.com; frame-src https://www.youtube.com https://www.youtube-nocookie.com; frame-ancestors 'self'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests" },
        ],
      },
    ]
  },
  async redirects() {
    // Apex host → canonical www host in one permanent (308) hop; path and query are kept.
    if (apexHost === siteUrl.hostname) return []
    return [
      {
        source: '/:path(.*)',
        has: [{ type: 'host', value: apexHost }],
        destination: `${siteUrl.origin}/:path`,
        permanent: true,
      },
    ]
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/:path*',
          has: [{ type: 'header', key: 'next-router-prefetch' }],
          missing: [{ type: 'header', key: 'rsc' }],
          destination: '/api/prefetch-noop',
        },
      ],
    }
  },
}

export default nextConfig
