import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { TrendIndex } from '@/components/trend-index'
import { usePeriodTrends } from '@/hooks/use-period-trends'

// A server render never runs effects, so it shows exactly what the first client
// paint shows before any fetch has started. #13 removed the invented fallback
// trends and left `loading` false on that first render, so every homepage
// shipped "No trends available." in its server HTML — a claim made before
// anything had been fetched (2026-09-16).
function renderRail(weekId: string, enabled = true): string {
  function Probe() {
    const { trends, loading } = usePeriodTrends(weekId, 'en', enabled)
    return createElement(TrendIndex, {
      trends,
      loading,
      heading: 'What is happening?',
      language: 'en',
      onFilter: () => {},
    })
  }
  return renderToStaticMarkup(createElement(Probe))
}

describe('trend rail first render', () => {
  it('shows the loading skeleton, not an empty-state claim, while a period is about to load', () => {
    const html = renderRail('2026-09-15')
    expect(html).not.toContain('No trends available.')
    expect(html).toContain('animate-pulse')
  })

  it('says nothing is available when there is no period to load', () => {
    const html = renderRail('')
    expect(html).toContain('No trends available.')
    expect(html).not.toContain('animate-pulse')
  })

  it('does not report loading for a disabled rail', () => {
    const html = renderRail('2026-09-15', false)
    expect(html).not.toContain('animate-pulse')
  })
})
