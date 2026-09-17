import { AiLabel } from '@/components/ai-label'
import { LogoCube } from '@/components/logo-cube'
import { BRAND } from '@/lib/brand'

/** Home feed masthead: brand, issue label and the AI label (spec AD7). */
export function FeedMasthead({ issueLabel, language }: { issueLabel: string; language: string }) {
  return (
    <header className="border-b-2 border-foreground bg-card px-5 py-5 sm:px-7">
      <div className="flex items-center justify-between gap-4 font-sans text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
        <span>AI Intelligence</span>
        <LogoCube size={30} />
        <span className="text-right">{issueLabel}</span>
      </div>
      <div className="pt-4 text-center">
        <h1 className="font-display text-5xl font-normal leading-none text-foreground sm:text-6xl">
          {BRAND.name}
        </h1>
        <p className="mt-2 font-sans text-[11px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">
          The Intelligence Memo
        </p>
        <p className="mx-auto mt-2 max-w-[19rem] font-display text-lg leading-snug text-foreground sm:max-w-none">
          Daily AI signals, capital moves, and workflows.
        </p>
        <AiLabel
          lang={language}
          className="mx-auto mt-2 max-w-[19rem] font-sans text-[11px] leading-snug text-muted-foreground sm:max-w-none"
        />
      </div>
    </header>
  )
}
