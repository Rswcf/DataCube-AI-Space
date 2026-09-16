"use client";

import { useEffect, useState } from "react";
import { API_BASE, USE_API } from "@/lib/api-base";
import type { TrendItem } from "@/lib/types";

type TrendsResponse = {
  trends?: Record<string, TrendItem[] | undefined>;
};

// There is deliberately no hardcoded fallback list. Until 2026-09-16 this file
// shipped one (GPT-5, NVIDIA Blackwell, AlphaFold 3, AI Stocks, Anthropic),
// which rendered as the "What's happening?" rail before the fetch resolved and
// therefore also in the server-rendered HTML: invented 2024-era topics
// presented as today's trends, linking to topic pages that mostly 404ed. An
// empty list shows the skeleton the component already has.
export function getFallbackTrends(_language: string): TrendItem[] {
  return [];
}

/**
 * Pair each localized trend with its English counterpart by position. The
 * backend builds every language's list from the same trends in the same order,
 * so index alignment holds; a length mismatch simply leaves `titleEn` unset and
 * the chip renders without a link.
 */
function withEnglishTitles(items: TrendItem[], englishItems: TrendItem[] | undefined): TrendItem[] {
  if (!englishItems || englishItems.length !== items.length) return items;
  return items.map((item, index) => ({ ...item, titleEn: englishItems[index]?.title }));
}

function selectTrends(data: TrendsResponse, language: string): TrendItem[] {
  const englishTrends = data.trends?.en;

  const languageTrends = data.trends?.[language];
  if (languageTrends && languageTrends.length > 0) return withEnglishTitles(languageTrends, englishTrends);

  const germanTrends = data.trends?.de;
  if (germanTrends && germanTrends.length > 0) return withEnglishTitles(germanTrends, englishTrends);

  if (englishTrends && englishTrends.length > 0) return englishTrends;

  return getFallbackTrends(language);
}

async function fetchJson(url: string, signal: AbortSignal): Promise<TrendsResponse> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<TrendsResponse>;
}

export function usePeriodTrends(weekId: string, language: string, enabled = true) {
  const [trends, setTrends] = useState<TrendItem[]>(() => getFallbackTrends(language));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !weekId) {
      setTrends(getFallbackTrends(language));
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;

    async function loadTrends() {
      setLoading(true);
      const apiUrl = USE_API ? `${API_BASE}/trends/${weekId}` : `/data/${weekId}/trends.json`;

      try {
        const data = await fetchJson(apiUrl, signal);
        if (!signal.aborted) setTrends(selectTrends(data, language));
      } catch {
        if (signal.aborted) return;
        if (USE_API) {
          try {
            const data = await fetchJson(`/data/${weekId}/trends.json`, signal);
            if (!signal.aborted) setTrends(selectTrends(data, language));
          } catch {
            if (!signal.aborted) setTrends(getFallbackTrends(language));
          }
        } else {
          setTrends(getFallbackTrends(language));
        }
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    }

    loadTrends();

    return () => controller.abort();
  }, [enabled, weekId, language]);

  return { trends, loading };
}
