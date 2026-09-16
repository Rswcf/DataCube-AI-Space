import { describe, expect, it } from 'vitest'
import { indexById, matchesTopicTerms, tagTopicSlug, toTopicSlug, trendTopicSlug } from '@/lib/topic-utils'

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

// Topic slugs fold accents ("sécurité" → "securite"), so the text they are
// matched against must be folded the same way or no accented term can ever
// match: every French hub with an accented tag answered 404 (2026-09-16).
describe('matchesTopicTerms', () => {
  it.each([
    [['La sécurité de l’IA progresse'], ['securite']],
    [['Protection de la confidentialité'], ['confidentialite']],
    [['Un dispositif médical approuvé'], ['dispositif', 'medical']],
    [['Neue Regeln zur Straße'], ['strasse']],
    [['Überwachung durch KI'], ['uberwachung']],
    [['Réglementation européenne'], ['reglementation']],
    [['Nvidia CEO rejects calls'], ['nvidia']],
    [[undefined, 'OpenAI ships', undefined], ['openai']],
  ])('matches %j on %j', (fields, terms) => {
    expect(matchesTopicTerms(fields, terms)).toBe(true)
  })

  it('requires every term', () => {
    expect(matchesTopicTerms(['Nvidia CEO rejects calls'], ['nvidia', 'apple'])).toBe(false)
  })

  it('never matches an empty term list', () => {
    expect(matchesTopicTerms(['anything at all'], [])).toBe(false)
  })

  it('does not invent a match across scripts', () => {
    expect(matchesTopicTerms(['沃顿商学院的一位金融教授'], ['wharton'])).toBe(false)
  })
})

// Pure CJK tags have no Latin letters, so toTopicSlug falls back to the
// placeholder "topic" and every such tag linked to /{lang}/topic/topic, a 404.
describe('tagTopicSlug', () => {
  it.each([
    ['人工智能', null],
    ['政策', null],
    ['規制', null],
    ['인공지능', null],
    ['', null],
    ['   ', null],
  ])('returns null for %j', (label, expected) => {
    expect(tagTopicSlug(label)).toBe(expected)
  })

  it.each([
    ['Anthropic', 'anthropic'],
    ['sécurité de l’IA', 'securite-de-l-ia'],
    ['dispositif médical', 'dispositif-medical'],
    ['AI安全', 'ai'],
    ['Topic modeling', 'topic-modeling'],
  ])('slugs %j', (label, expected) => {
    expect(tagTopicSlug(label)).toBe(expected)
  })
})

describe('indexById', () => {
  it('maps items by id and tolerates missing input', () => {
    const map = indexById([{ id: 1, v: 'a' }, { id: 2, v: 'b' }])
    expect(map.get(2)?.v).toBe('b')
    expect(indexById(undefined).size).toBe(0)
    expect(indexById(null).size).toBe(0)
  })
})
