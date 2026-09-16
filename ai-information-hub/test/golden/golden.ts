import { expect } from 'vitest'

/** React static markup without the empty comment separators React can place between text nodes. */
export function normalizeHtml(html: string): string {
  return html.replaceAll('<!-- -->', '')
}

/**
 * Pretty JSON with a final newline, so golden diffs stay readable.
 *
 * `JSON.stringify(value, null, 2)` silently drops any own key whose value is
 * `undefined` — a page returning `{ robots: cond ? {...} : undefined }`
 * serializes identically to one that never sets `robots` at all, so a golden
 * built that way cannot see a metadata key appearing or disappearing (this
 * exact shape shipped to production and stripped robots directives from
 * every indexed article and canonical topic hub — see task-1-review.md §2 /
 * main PR #12). The replacer below makes a present-but-undefined value
 * serialize as the literal string "__undefined__" instead of being skipped,
 * so that regression would show up as a golden diff.
 */
export function stableJson(value: unknown): string {
  const revealUndefined = (_key: string, v: unknown) => (v === undefined ? '__undefined__' : v)
  return `${JSON.stringify(value, revealUndefined, 2)}\n`
}

/**
 * Compares `text` with test/golden/__goldens__/<name>. `npx vitest run <file> -u` rewrites the file —
 * only for an intended change listed in the plan, followed by a review of the golden diff.
 */
export async function expectGolden(text: string, name: string): Promise<void> {
  await expect(text).toMatchFileSnapshot(`./__goldens__/${name}`)
}
