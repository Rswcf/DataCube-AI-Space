import { expect } from 'vitest'

/** React static markup without the empty comment separators React can place between text nodes. */
export function normalizeHtml(html: string): string {
  return html.replaceAll('<!-- -->', '')
}

/** Pretty JSON with a final newline, so golden diffs stay readable. */
export function stableJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`
}

/**
 * Compares `text` with test/golden/__goldens__/<name>. `npx vitest run <file> -u` rewrites the file —
 * only for an intended change listed in the plan, followed by a review of the golden diff.
 */
export async function expectGolden(text: string, name: string): Promise<void> {
  await expect(text).toMatchFileSnapshot(`./__goldens__/${name}`)
}
