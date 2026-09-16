import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { resolveRobots } from 'next/dist/build/webpack/loaders/metadata/resolve-route-data'
import robots from './robots'

type Group = { agents: string[]; allow: string[]; disallow: string[]; crawlDelay?: string }

/** robots.txt as comparable groups. RFC 9309: directive names are case-insensitive; order inside a group does not matter. */
function parse(text: string): { groups: Group[]; sitemaps: string[] } {
  const groups: Group[] = []
  const sitemaps: string[] = []
  let current: Group | undefined
  let previousWasAgent = false
  for (const raw of text.split('\n')) {
    const line = raw.replace(/#.*$/, '').trim()
    if (!line) continue
    const separator = line.indexOf(':')
    const key = line.slice(0, separator).trim().toLowerCase()
    const value = line.slice(separator + 1).trim()
    if (key === 'user-agent') {
      if (!current || !previousWasAgent) {
        current = { agents: [], allow: [], disallow: [] }
        groups.push(current)
      }
      current.agents.push(value)
      previousWasAgent = true
      continue
    }
    previousWasAgent = false
    if (key === 'sitemap') sitemaps.push(value)
    else if (current && key === 'allow') current.allow.push(value)
    else if (current && key === 'disallow') current.disallow.push(value)
    else if (current && key === 'crawl-delay') current.crawlDelay = value
  }
  return {
    groups: groups.map((group) => ({ ...group, allow: [...group.allow].sort(), disallow: [...group.disallow].sort() })),
    sitemaps,
  }
}

describe('robots.txt', () => {
  it('serves the same crawler rules as the former public/robots.txt', () => {
    const former = readFileSync(new URL('../test/golden/__goldens__/robots.txt', import.meta.url), 'utf8')
    expect(parse(resolveRobots(robots()))).toEqual(parse(former))
  })

  it('keeps topic filter variants out of every crawler group and blocks meta-externalagent entirely', () => {
    const { groups } = parse(resolveRobots(robots()))
    const meta = groups.filter((group) => group.agents.includes('meta-externalagent'))
    expect(meta).toEqual([{ agents: ['meta-externalagent'], allow: [], disallow: ['/'] }])
    for (const group of groups.filter((group) => !meta.includes(group))) {
      expect(group.disallow, group.agents.join(', ')).toContain('/*/topic/*?')
    }
  })
})
