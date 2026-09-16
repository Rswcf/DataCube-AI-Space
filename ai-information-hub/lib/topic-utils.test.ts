import { describe, expect, it } from 'vitest'
import { toTopicSlug, trendTopicSlug } from '@/lib/topic-utils'

// A topic page matches an article only when EVERY term in the slug appears in
// it, so a whole-sentence slug never resolves. Trend chips therefore link by
// the entity the headline is about. Derivation always reads the ENGLISH title
// (the backend generates EN natively and translates the rest), because German
// capitalises every noun and CJK capitalises nothing.
describe('trendTopicSlug', () => {
  it.each([
    ['Nvidia CEO rejects AI slowdown calls', 'nvidia'],
    ['Apple ships Gemini-powered Siri', 'apple'],
    ["OpenAI, Anthropic, Google face 'cartel' criticism over AI slowdown", 'openai'],
    ['OpenAI contractors read ChatGPT chats', 'openai'],
    ['Meta One subscription bundles launch', 'meta'],
    ['DeepSeek open-sources agent runtime Harness', 'deepseek'],
    ['Anthropic CEO urges LLM development brake', 'anthropic'],
    ['Wharton professor questions AI infrastructure bubble', 'wharton'],
    ["Microsoft's Copilot gets a new memory", 'microsoft'],
  ])('takes the leading entity of %j', (title, expected) => {
    expect(trendTopicSlug(title)).toBe(expected)
  })

  it.each([
    'AI industry leaders call for a coordinated slowdown',
    'LLM benchmarks keep drifting',
    'US lawmakers weigh new rules',
  ])('returns null when only generic terms lead: %j', (title) => {
    expect(trendTopicSlug(title)).toBeNull()
  })

  it.each([
    ['', null],
    ['   ', null],
    ['人工智能监管收紧', null],
    ['AI', null],
    ['Ai', null],
  ])('handles %j', (title, expected) => {
    expect(trendTopicSlug(title)).toBe(expected)
  })

  // The topic page matches by substring, so a three-letter slug is a trap:
  // "act" would pull in every article mentioning "impact" or "contract".
  it.each([
    ['EU AI Act enforcement begins', null],
    ['IBM ships a new accelerator', null],
    ['Meta One subscription bundles launch', 'meta'],
  ])('refuses slugs under four characters: %j', (title, expected) => {
    expect(trendTopicSlug(title)).toBe(expected)
  })

  it('never returns a multi-word slug', () => {
    const slug = trendTopicSlug('Nvidia CEO rejects AI slowdown calls')
    expect(slug).not.toBeNull()
    expect(slug).not.toContain('-')
  })

  it('agrees with toTopicSlug on the entity it picks', () => {
    expect(trendTopicSlug('DeepSeek open-sources agent runtime Harness')).toBe(toTopicSlug('DeepSeek'))
  })
})
