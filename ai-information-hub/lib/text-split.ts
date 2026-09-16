/**
 * Split an AI summary into a headline and a deck.
 *
 * Cards and article pages render a summary as a large headline followed by a
 * smaller deck. Until 2026-09 the feeds and the article page each carried a
 * private copy of this split that fell back to "cut at the last space before N
 * characters". In a 14-day production sample that broke 78% of tech cards in
 * the middle of a clause, and Chinese and Japanese summaries, which have no
 * spaces, rendered whole as a four-line headline.
 *
 * Order of preference, first match wins:
 *   1. a separator (": ", " — ", …) inside the first sentence;
 *   2. optionally, an English " that " / " to " clause boundary;
 *   3. the end of the first sentence, if that sentence fits `sentenceMax`;
 *   4. the whole text, if it fits;
 *   5. the last comma or semicolon that fits `maxHeadline`;
 *   6. a cut at a word boundary.
 *
 * Steps 5 and 6 cut a sentence in two, so both halves are marked "…" and the
 * deck keeps its original case: it is the rest of the same sentence, not a new
 * one. Capitalising it produced fragments like "Which are anonymized…" and,
 * in German, turned relative pronouns and conjunctions ("die", "dass") into
 * sentence starts.
 *
 * Budgets are measured in display width: CJK characters count double, so a
 * Chinese headline gets roughly half as many characters as an English one.
 */

export type HeadlineDeckOptions = {
  /** Width budget for a headline cut out of a longer sentence. */
  maxHeadline?: number
  /** Width a complete first sentence may use as the headline. Defaults to `maxHeadline`. */
  sentenceMax?: number
  /** Earliest character position at which a split may happen. */
  minSeparator?: number
  /** Also split English text before " that " / " to ". Off by default: the deck then reads "To …". */
  includeEnglishClauseSplits?: boolean
}

/** Feed cards (tech and tips): the headline is `text-2xl`–`1.75rem` serif. */
export const FEED_HEADLINE: HeadlineDeckOptions = { maxHeadline: 92, sentenceMax: 110 }

/** The article page H1, which also feeds `<title>`, Open Graph and JSON-LD. */
export const ARTICLE_HEADLINE: HeadlineDeckOptions = { maxHeadline: 130, sentenceMax: 150 }

const CJK_RE = /[\u3400-\u9fff\uf900-\ufaff\u3040-\u30ff\uac00-\ud7af]/
const ELLIPSIS = '…'

// A period after one of these is not a sentence end: initialisms ("U.S."),
// single initials ("J."), and common English and German abbreviations.
const ABBREVIATION_RE =
  /(?:\b(?:[A-Za-z]\.)+|\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|Inc|Corp|Ltd|Co|vs|etc|No|Nr|ca|bzw|Hr|Fr|approx|Mio|Mrd))\.?$/

function sentenceCaseFragment(text: string): string {
  if (!text) return ''
  return /^[a-z]/.test(text) ? `${text[0].toUpperCase()}${text.slice(1)}` : text
}

function trimHeadline(text: string): string {
  return text.replace(/[ .,\-;:，、；：。！？]+$/, '').trim()
}

/** Largest index such that `text.slice(0, index)` fits `budget` display-width units. */
function indexForWidth(text: string, budget: number): number {
  let width = 0
  let index = 0
  for (const ch of text) {
    width += CJK_RE.test(ch) ? 2 : 1
    if (width > budget) return index
    index += ch.length
  }
  return text.length
}

/** Index just past the first sentence end at or after `from`, or -1. */
function firstSentenceEnd(text: string, from: number): number {
  const re = /[.?!](?=\s)|[。？！]/g
  let match: RegExpExecArray | null
  while ((match = re.exec(text))) {
    const end = match.index + 1
    if (end < from) continue
    if (match[0] === '.' && ABBREVIATION_RE.test(text.slice(0, end))) continue
    return end
  }
  return -1
}

const LATIN_WORD_RE = /[A-Za-z0-9]/

/** Move a cut that would land inside a Latin word or phrase back to where that run starts. */
function avoidSplittingLatinRun(text: string, cut: number, floor: number): number {
  let index = cut
  const inLatin = (i: number) => i > 0 && i < text.length && LATIN_WORD_RE.test(text[i - 1]) && /[A-Za-z0-9 .'’-]/.test(text[i])
  if (!inLatin(index)) return cut
  while (index > floor && /[A-Za-z0-9 .'’-]/.test(text[index - 1])) index--
  return index > floor ? index : cut
}

export function splitHeadlineDeck(content: string, options: HeadlineDeckOptions = {}): [string, string] {
  const clean = (content || '').replace(/\s+/g, ' ').trim()
  if (!clean) return ['', '']

  const hasCjk = CJK_RE.test(clean)
  const minSeparator = options.minSeparator ?? (hasCjk ? 14 : 24)
  const maxIndex = indexForWidth(clean, options.maxHeadline ?? 92)
  const sentenceMaxIndex = indexForWidth(clean, options.sentenceMax ?? options.maxHeadline ?? 92)
  const sentenceEnd = firstSentenceEnd(clean, minSeparator)
  // True when another sentence follows the first one. A lone trailing "。"
  // ends the only sentence, exactly like a trailing "." does.
  const hasLaterSentence = sentenceEnd !== -1 && sentenceEnd < clean.length
  // Separators and clause splits must fall inside the first sentence, or the
  // headline would run across a sentence boundary.
  const firstSentenceLimit = hasLaterSentence ? sentenceEnd : clean.length

  const separators = hasCjk ? ['：', ' —— ', '——', ': ', ' — ', ' – ', ' - '] : [': ', ' — ', ' – ', ' - ']
  for (const separator of separators) {
    const position = clean.indexOf(separator)
    if (
      position >= minSeparator &&
      position <= maxIndex &&
      position < firstSentenceLimit &&
      position + separator.length < clean.length
    ) {
      return [trimHeadline(clean.slice(0, position)), sentenceCaseFragment(clean.slice(position + separator.length).trim())]
    }
  }

  if (!hasCjk && options.includeEnglishClauseSplits) {
    for (const separator of [' that ', ' to ']) {
      const position = clean.indexOf(separator, 30)
      if (position > 0 && position <= maxIndex && position < firstSentenceLimit) {
        const headline = trimHeadline(clean.slice(0, position))
        let deck = separator === ' to ' ? clean.slice(position + 1).trim() : clean.slice(position + separator.length).trim()
        if (separator === ' to ' && clean.slice(0, position).toLowerCase().includes(' from ')) {
          deck = `toward ${clean.slice(position + separator.length).trim()}`
        }
        return [headline, sentenceCaseFragment(deck)]
      }
    }
  }

  if (hasLaterSentence && sentenceEnd <= sentenceMaxIndex) {
    return [clean.slice(0, sentenceEnd).trim(), sentenceCaseFragment(clean.slice(sentenceEnd).trim())]
  }

  // A single sentence may use the sentence budget; longer text only the headline budget.
  if (clean.length <= (hasLaterSentence ? maxIndex : Math.max(maxIndex, sentenceMaxIndex))) return [clean, '']

  const softFloor = Math.max(12, minSeparator)
  let softCut = -1
  for (const token of hasCjk ? ['，', '、', '；', ',', ';'] : [',', ';']) {
    const index = clean.lastIndexOf(token, maxIndex - 1)
    if (index >= softFloor) softCut = Math.max(softCut, index)
  }
  if (softCut > 0) return continuation(clean, softCut, softCut + 1)

  // No natural break fits: cut at a word boundary.
  let cut = hasCjk ? avoidSplittingLatinRun(clean, maxIndex, minSeparator) : clean.lastIndexOf(' ', maxIndex)
  if (cut <= minSeparator) cut = maxIndex
  return continuation(clean, cut, cut)
}

/** Split one sentence at `headEnd` / `tailStart`, marking both halves as a continuation. */
function continuation(clean: string, headEnd: number, tailStart: number): [string, string] {
  const headline = clean.slice(0, headEnd).replace(/[\s,;:，、；：]+$/, '')
  const deck = clean.slice(tailStart).replace(/^[\s,;:，、；：]+/, '')
  return [`${headline}${ELLIPSIS}`, `${ELLIPSIS}${deck}`]
}
