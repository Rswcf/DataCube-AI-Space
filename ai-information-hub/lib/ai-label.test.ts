import { describe, expect, it } from 'vitest'
import { AI_DISCLOSURE_PATH, aiLabel, aiLabelForImage, aiLabelLinkText, aiLabelShort } from './ai-label'

// The plan's "AI label copy" table, pinned here so a copy change is a deliberate test change.
const COPY = {
  en: ['AI-generated: summaries written by AI from the linked sources.', 'AI-generated', 'How we use AI'],
  de: ['KI-generiert: Die Zusammenfassungen schreibt eine KI auf Grundlage der verlinkten Quellen.', 'KI-generiert', 'So nutzen wir KI'],
  zh: ['AI 生成：摘要由 AI 根据所链接的来源撰写。', 'AI 生成', '我们如何使用 AI'],
  fr: ['Généré par IA : résumés rédigés par une IA à partir des sources citées.', 'Généré par IA', "Notre usage de l'IA"],
  es: ['Generado por IA: resúmenes redactados por IA a partir de las fuentes enlazadas.', 'Generado por IA', 'Cómo usamos la IA'],
  pt: ['Gerado por IA: resumos escritos por IA a partir das fontes indicadas.', 'Gerado por IA', 'Como usamos a IA'],
  ja: ['AI生成：要約はリンク先の情報源をもとにAIが作成しています。', 'AI生成', 'AIの利用について'],
  ko: ['AI 생성: 요약은 링크된 출처를 바탕으로 AI가 작성했습니다.', 'AI 생성', 'AI 활용 방식'],
} as const

describe('AI label copy', () => {
  it.each(Object.entries(COPY))('%s matches the plan', (lang, [label, short, link]) => {
    expect([aiLabel(lang), aiLabelShort(lang), aiLabelLinkText(lang)]).toEqual([label, short, link])
  })

  it('falls back to English for an unsupported language', () => {
    expect([aiLabel('xx'), aiLabelShort('xx'), aiLabelLinkText('xx')]).toEqual([...COPY.en])
  })

  it('links the AI disclosure page', () => {
    expect(AI_DISCLOSURE_PATH).toBe('/ai-disclosure')
  })

  it('uses English on the OG image outside the scripts its bundled font covers', () => {
    for (const lang of ['de', 'en', 'fr', 'es', 'pt'] as const) expect(aiLabelForImage(lang)).toBe(COPY[lang][0])
    for (const lang of ['zh', 'ja', 'ko', 'xx']) expect(aiLabelForImage(lang)).toBe(COPY.en[0])
  })
})
