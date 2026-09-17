import { describe, expect, it } from 'vitest'
import { BRAND, FROZEN_IDS, absoluteUrl, brandedTitle, buildBrand, fillBrand } from './brand'

describe('buildBrand', () => {
  it('reproduces the current identity when no variable is set', () => {
    expect(buildBrand({})).toEqual({
      name: 'Data Cube AI',
      shortName: 'Data Cube',
      siteUrl: 'https://www.datacubeai.space',
      siteHost: 'www.datacubeai.space',
      apexHost: 'datacubeai.space',
      founderName: '',
      githubIssuesUrl: 'https://github.com/Rswcf/DataCube-AI-Space/issues',
    })
  })

  it('takes trimmed overrides and drops a trailing slash from the site URL', () => {
    expect(
      buildBrand({
        NEXT_PUBLIC_BRAND_NAME: ' Acme News ',
        NEXT_PUBLIC_BRAND_SHORT_NAME: 'Acme',
        NEXT_PUBLIC_SITE_URL: 'https://acme.example/',
        NEXT_PUBLIC_FOUNDER_NAME: 'Jane Doe',
      }),
    ).toMatchObject({
      name: 'Acme News',
      shortName: 'Acme',
      siteUrl: 'https://acme.example',
      siteHost: 'acme.example',
      apexHost: 'acme.example',
      founderName: 'Jane Doe',
    })
  })

  it('treats empty and blank variables as unset', () => {
    const brand = buildBrand({ NEXT_PUBLIC_BRAND_NAME: '', NEXT_PUBLIC_SITE_URL: '  ' })
    expect([brand.name, brand.siteUrl]).toEqual(['Data Cube AI', 'https://www.datacubeai.space'])
  })

  it('exports the default brand when the environment sets no brand variable', () => {
    expect(BRAND).toEqual(buildBrand({}))
  })
})

describe('fillBrand', () => {
  const acme = buildBrand({
    NEXT_PUBLIC_BRAND_NAME: 'Acme News',
    NEXT_PUBLIC_BRAND_SHORT_NAME: 'Acme',
    NEXT_PUBLIC_SITE_URL: 'https://acme.example',
  })

  it('replaces every placeholder, however often it appears', () => {
    expect(fillBrand('{brand} | {brand} ({brandShort}) {siteUrl} {siteHost}', acme)).toBe(
      'Acme News | Acme News (Acme) https://acme.example acme.example',
    )
  })

  it('leaves other braces untouched', () => {
    expect(fillBrand('Price {amount}', acme)).toBe('Price {amount}')
  })
})

describe('absoluteUrl and brandedTitle', () => {
  it('joins site paths with or without a leading slash', () => {
    expect(absoluteUrl('/en/week/2026-09-13')).toBe('https://www.datacubeai.space/en/week/2026-09-13')
    expect(absoluteUrl('about')).toBe('https://www.datacubeai.space/about')
    expect(absoluteUrl('/')).toBe('https://www.datacubeai.space/')
  })

  it('appends the brand the way the root title template does', () => {
    expect(brandedTitle('Editorial Policy')).toBe('Editorial Policy | Data Cube AI')
  })
})

describe('FROZEN_IDS', () => {
  it('keeps the identifiers that must survive a rename', () => {
    expect(FROZEN_IDS).toEqual({ atomTagPrefix: 'tag:datacubeai.space,2026:', takeawaysAnchorId: 'dcai-takeaways' })
  })
})
