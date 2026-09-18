/**
 * Serialize a schema.org object for a `<script type="application/ld+json">`.
 *
 * The values come from third parties — RSS headlines, LLM summaries, topic
 * names — and a raw `JSON.stringify` lets a `</script>` inside any of them end
 * the script element early, dropping the rest of the string into the document
 * as markup. Script content is raw text, so `<` is the only character that can
 * do that (it also opens `<!--`), and its escaped form is the same JSON string:
 * escaping it neutralizes both sequences while leaving ordinary content — `&`,
 * quotes, non-ASCII — byte-identical to what `JSON.stringify` produced before.
 */
export function jsonLdScript(schema: unknown): string {
  return JSON.stringify(schema).replace(/</g, '\\u003c')
}
