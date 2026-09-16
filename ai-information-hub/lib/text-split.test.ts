import { describe, expect, it } from 'vitest'
import { splitHeadlineDeck } from '@/lib/text-split'

// Cards and article pages show an AI summary as a big headline plus a smaller
// deck. Until 2026-09 three private copies of this split lived in the feeds and
// the article page, and they fell back to "cut at the last space before N
// characters": 78% of tech cards in a 14-day production sample broke a
// sentence mid-clause, and Chinese and Japanese summaries (no spaces) rendered
// whole as a four-line headline.
describe('splitHeadlineDeck', () => {
  it('returns empty parts for empty input', () => {
    expect(splitHeadlineDeck('')).toEqual(['', ''])
    expect(splitHeadlineDeck('   ')).toEqual(['', ''])
  })

  it('keeps short text whole', () => {
    expect(splitHeadlineDeck('OpenAI ships a new model.')).toEqual(['OpenAI ships a new model.', ''])
  })

  it('splits at a separator', () => {
    expect(splitHeadlineDeck('OpenAI launches GPT-6 for developers: a faster model built for coding agents and long tasks.'))
      .toEqual(['OpenAI launches GPT-6 for developers', 'A faster model built for coding agents and long tasks.'])
  })

  it('splits after the first sentence', () => {
    expect(splitHeadlineDeck('DeepSeek has open-sourced its agent runtime Harness. The MIT-licensed code targets modular agent components.'))
      .toEqual(['DeepSeek has open-sourced its agent runtime Harness.', 'The MIT-licensed code targets modular agent components.'])
  })

  it('lets a complete first sentence run up to sentenceMax', () => {
    const text = 'China’s Foreign Ministry rejected U.S. AI safety warnings as fearmongering aimed at preserving advantage. State media piled on.'
    const [headline, deck] = splitHeadlineDeck(text, { maxHeadline: 92, sentenceMax: 110 })
    expect(headline).toBe('China’s Foreign Ministry rejected U.S. AI safety warnings as fearmongering aimed at preserving advantage.')
    expect(deck).toBe('State media piled on.')
  })

  it('prefers a comma over a mid-clause cut (production case)', () => {
    const text = "Apple has finally shipped its rebuilt Siri AI, built on Google's Gemini models and running partly on-device and partly through Private Cloud Compute. Early testers praise multi-step requests."
    expect(splitHeadlineDeck(text)).toEqual([
      'Apple has finally shipped its rebuilt Siri AI…',
      "…built on Google's Gemini models and running partly on-device and partly through Private Cloud Compute. Early testers praise multi-step requests.",
    ])
  })

  it('marks an unavoidable mid-sentence cut on both sides and keeps the continuation lowercase (production case)', () => {
    const text = "Nvidia CEO Jensen Huang told President Trump that the company won't let an AI slowdown happen, pushing back against calls to slow development."
    const [headline, deck] = splitHeadlineDeck(text)
    expect(headline.endsWith('…')).toBe(true)
    expect(deck.startsWith('…')).toBe(true)
    expect(deck[1]).toBe(deck[1].toLowerCase())
    expect((headline.slice(0, -1) + ' ' + deck.slice(1)).replace(/\s+/g, ' ')).toBe(text)
    expect(headline.length).toBeLessThanOrEqual(93)
  })

  it.each([
    ['OpenAI employs hundreds of contract workers to read and rate real ChatGPT conversations, which are anonymized but may contain sensitive data.', '…which are anonymized'],
    ['OpenAI beschäftigt Hunderte von Vertragskräften, die echte ChatGPT-Konversationen lesen und bewerten, die anonymisiert sind.', '…die echte ChatGPT'],
    ['Ein parteiübergreifender UK-Parlamentsausschuss warnt, dass bestehende Gesetze nicht darauf ausgelegt sind, KI-Risiken zu bewältigen.', '…dass bestehende'],
  ])('keeps the clause after a comma lowercase (production cases): %j', (text, deckStart) => {
    expect(splitHeadlineDeck(text)[1].startsWith(deckStart)).toBe(true)
  })

  it('never capitalises the continuation of a cut sentence', () => {
    const text = 'OpenAI bots reportedly knew about a RubyGems caching vulnerability and attempted to exploit it while running web scraping code.'
    const [, deck] = splitHeadlineDeck(text)
    expect(deck).toMatch(/^…[a-z]/)
  })

  describe('CJK', () => {
    it('splits after the first sentence (production case: the whole summary used to be the headline)', () => {
      const text = '英伟达CEO黄仁勋告诉特朗普总统，公司不会让人工智能放缓发生。黄仁勋的评论标志着人工智能发展速度上的重大行业分歧。'
      expect(splitHeadlineDeck(text)).toEqual([
        '英伟达CEO黄仁勋告诉特朗普总统，公司不会让人工智能放缓发生。',
        '黄仁勋的评论标志着人工智能发展速度上的重大行业分歧。',
      ])
    })

    it('does not cut inside a Latin name in mixed text (production case)', () => {
      const text = '苹果终于发布了其重建的Siri AI，基于谷歌的Gemini模型构建，部分在设备上运行，部分通过Private Cloud Compute运行。早期测试者称赞其多步骤请求能力。'
      expect(splitHeadlineDeck(text)).toEqual([
        '苹果终于发布了其重建的Siri AI，基于谷歌的Gemini模型构建，部分在设备上运行…',
        '…部分通过Private Cloud Compute运行。早期测试者称赞其多步骤请求能力。',
      ])
    })

    it('budgets CJK characters at double width', () => {
      const text = '一'.repeat(40) + '，' + '二'.repeat(40) + '。' + '三'.repeat(10) + '。'
      const [headline] = splitHeadlineDeck(text, { maxHeadline: 92 })
      expect([...headline].length).toBeLessThanOrEqual(47)
    })

    it('moves a hard cut out of an embedded Latin phrase', () => {
      // 36 CJK characters use 72 of the 92 width units, so the budget runs out
      // inside "Private Cloud Compute"; the cut must fall before the phrase.
      const prefix = '中'.repeat(36)
      const text = `${prefix}Private Cloud Compute在云端运行并返回结果给用户查看和确认`
      const [headline, deck] = splitHeadlineDeck(text)
      expect(headline).toBe(`${prefix}…`)
      expect(deck).toBe('…Private Cloud Compute在云端运行并返回结果给用户查看和确认')
    })

    it('treats a trailing 。 like a trailing period', () => {
      const text = '中国批准脑机接口人工智能医疗器械标准并要求相关企业在明年之前完成全部产品的合规审查工作。'
      expect(splitHeadlineDeck(text, { maxHeadline: 40, sentenceMax: 120 })).toEqual([text, ''])
    })

    it('keeps a short CJK text whole', () => {
      expect(splitHeadlineDeck('中国批准脑机接口人工智能医疗器械标准。')).toEqual(['中国批准脑机接口人工智能医疗器械标准。', ''])
    })
  })

  it.each([
    ['China rejects U.S. AI safety warnings as fearmongering by rivals. State media piled on.', 'China rejects U.S. AI safety warnings as fearmongering by rivals.'],
    ['Dr. Smith of Acme Inc. says the model is safe for most users. Critics disagree.', 'Dr. Smith of Acme Inc. says the model is safe for most users.'],
    ['Die Firma sammelt 1,5 Mio. Euro für ihr KI-Labor in Berlin ein. Investoren sind zufrieden.', 'Die Firma sammelt 1,5 Mio. Euro für ihr KI-Labor in Berlin ein.'],
  ])('does not end a sentence at an abbreviation: %j', (text, headline) => {
    expect(splitHeadlineDeck(text)[0]).toBe(headline)
  })

  it('never lets a separator pull the headline across a sentence end', () => {
    const text = 'Apple ships its rebuilt Siri assistant today. Critics: it arrives late and misses key features.'
    expect(splitHeadlineDeck(text)[0]).toBe('Apple ships its rebuilt Siri assistant today.')
  })

  it('keeps English clause splits opt-in', () => {
    const text = 'Researchers at a large lab published a study that shows agents cheat when graded by other agents and colleagues.'
    expect(splitHeadlineDeck(text)[0]).not.toBe('Researchers at a large lab published a study')
    expect(splitHeadlineDeck(text, { includeEnglishClauseSplits: true })[0]).toBe('Researchers at a large lab published a study')
  })
})
