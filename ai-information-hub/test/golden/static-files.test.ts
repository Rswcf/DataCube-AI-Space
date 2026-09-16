import { readFileSync } from 'node:fs'
import { describe, it } from 'vitest'
import { expectGolden } from './golden'

// Reference copies: Task 12 replaces both files with generated routes and compares against these goldens.
describe('brand-bearing static files', () => {
  it.each(['robots.txt', 'llms.txt'])('%s', async (name) => {
    await expectGolden(readFileSync(new URL(`../../public/${name}`, import.meta.url), 'utf8'), name)
  })
})
