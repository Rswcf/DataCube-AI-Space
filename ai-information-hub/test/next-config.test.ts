import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

async function loadRedirects() {
  const { default: config } = await import('../next.config.mjs')
  // NextConfig types redirects as optional, so a missing function fails the test rather than the type check.
  if (!config.redirects) throw new Error('next.config.mjs must define redirects()')
  return config.redirects()
}

describe('next.config redirects', () => {
  it('sends the apex host to the canonical www host in one permanent hop, like the former vercel.json', async () => {
    expect(await loadRedirects()).toEqual([
      {
        source: '/:path(.*)',
        has: [{ type: 'host', value: 'datacubeai.space' }],
        destination: 'https://www.datacubeai.space/:path',
        permanent: true,
      },
    ])
  })

  it('follows NEXT_PUBLIC_SITE_URL', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.acme.example')
    expect(await loadRedirects()).toEqual([
      expect.objectContaining({ has: [{ type: 'host', value: 'acme.example' }], destination: 'https://www.acme.example/:path' }),
    ])
  })

  it('adds no redirect when the canonical site has no www host', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://acme.example')
    expect(await loadRedirects()).toEqual([])
  })
})
