import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { jsonLdScript } from '@/lib/json-ld'

// Schema values carry third-party text: RSS headlines, LLM summaries, topic
// names. Inside a <script> element the only sequence that matters is the one
// that ends it, so `<` is escaped and everything else is left alone.
describe('jsonLd', () => {
  it('escapes < so content cannot close the script element', () => {
    const out = jsonLdScript({
      '@type': 'NewsArticle',
      headline: '</script><script>alert(1)</script>',
    })

    expect(out).not.toContain('</script')
    expect(out).not.toContain('<!--')
  })

  it('stays valid JSON-LD after escaping', () => {
    const schema = {
      '@context': 'https://schema.org',
      headline: 'A < B </script> & C',
      articleBody: ['<!--', '<b>bold</b>'],
    }

    expect(JSON.parse(jsonLdScript(schema))).toEqual(schema)
  })

  it('leaves ordinary content byte-identical to JSON.stringify', () => {
    const schema = {
      name: 'Data Cube AI',
      about: 'AI & robotics',
      url: 'https://www.datacubeai.space/en',
    }

    expect(jsonLdScript(schema)).toBe(JSON.stringify(schema))
  })
})

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.tsx?$/.test(entry) && !entry.includes('.test.') ? [path] : []
  })
}

// The fix is worth nothing if the 23rd call site reintroduces the hole.
describe('JSON-LD call sites', () => {
  it('never stringify straight into a script element', () => {
    const root = process.cwd()
    const offenders = ['app', 'components']
      .flatMap((dir) => sourceFiles(join(root, dir)))
      .filter((path) => /__html:\s*JSON\.stringify/.test(readFileSync(path, 'utf8')))
      .map((path) => relative(root, path))

    expect(offenders).toEqual([])
  })
})
