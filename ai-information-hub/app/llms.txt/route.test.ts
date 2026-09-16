import { describe, expect, it } from 'vitest'
import { GET } from './route'

describe('GET /llms.txt', () => {
  it('serves the site description as plain text built from the brand config', async () => {
    const res = GET()
    expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8')
    await expect(await res.text()).toMatchFileSnapshot('../../test/golden/__goldens__/llms.txt')
  })
})
