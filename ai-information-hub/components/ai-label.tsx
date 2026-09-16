import { AI_DISCLOSURE_PATH, aiLabel, aiLabelLinkText } from '@/lib/ai-label'

/** Spec AD7 label for surfaces that show AI-written prose. No hooks, so it renders in server and client trees. */
export function AiLabel({ lang, className = 'text-xs text-muted-foreground' }: { lang: string; className?: string }) {
  return (
    <p data-ai-label="" className={className}>
      {aiLabel(lang)}{' '}
      <a href={AI_DISCLOSURE_PATH} className="underline hover:no-underline">
        {aiLabelLinkText(lang)}
      </a>
    </p>
  )
}
