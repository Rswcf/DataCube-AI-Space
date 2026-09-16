import { isSupportedLanguage, type AppLanguage } from './i18n'

/** Page that explains how AI writes the content; every label links here. */
export const AI_DISCLOSURE_PATH = '/ai-disclosure'

type LabelCopy = { label: string; short: string; link: string }

// Spec AD7: shown near the top of every surface that renders AI-written prose, in the page language.
const AI_LABEL_COPY: Record<AppLanguage, LabelCopy> = {
  en: { label: 'AI-generated: summaries written by AI from the linked sources.', short: 'AI-generated', link: 'How we use AI' },
  de: { label: 'KI-generiert: Die Zusammenfassungen schreibt eine KI auf Grundlage der verlinkten Quellen.', short: 'KI-generiert', link: 'So nutzen wir KI' },
  zh: { label: 'AI 生成：摘要由 AI 根据所链接的来源撰写。', short: 'AI 生成', link: '我们如何使用 AI' },
  fr: { label: 'Généré par IA : résumés rédigés par une IA à partir des sources citées.', short: 'Généré par IA', link: "Notre usage de l'IA" },
  es: { label: 'Generado por IA: resúmenes redactados por IA a partir de las fuentes enlazadas.', short: 'Generado por IA', link: 'Cómo usamos la IA' },
  pt: { label: 'Gerado por IA: resumos escritos por IA a partir das fontes indicadas.', short: 'Gerado por IA', link: 'Como usamos a IA' },
  ja: { label: 'AI生成：要約はリンク先の情報源をもとにAIが作成しています。', short: 'AI生成', link: 'AIの利用について' },
  ko: { label: 'AI 생성: 요약은 링크된 출처를 바탕으로 AI가 작성했습니다.', short: 'AI 생성', link: 'AI 활용 방식' },
}

// The OG renderer bundles only a Latin font; English avoids a CJK font download on every render (Ruling R-5).
const IMAGE_LABEL_LANGUAGES: readonly string[] = ['de', 'en', 'fr', 'es', 'pt']

function copyFor(lang: string): LabelCopy {
  return AI_LABEL_COPY[isSupportedLanguage(lang) ? lang : 'en']
}

export function aiLabel(lang: string): string {
  return copyFor(lang).label
}

export function aiLabelShort(lang: string): string {
  return copyFor(lang).short
}

export function aiLabelLinkText(lang: string): string {
  return copyFor(lang).link
}

export function aiLabelForImage(lang: string): string {
  return aiLabel(IMAGE_LABEL_LANGUAGES.includes(lang) ? lang : 'en')
}
