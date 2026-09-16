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
// presented as today's trends, linking to topic pages that mostly 404ed. While
// a period is still loading, the hook reports `loading` so the rail shows its
// skeleton; see `usePeriodTrends`.
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

  // `loading` is derived, not stored: it is true whenever there is a period to
  // load and no fetch for exactly this period + language has settled yet. A
  // stored flag starts false and only flips inside an effect, and effects never
  // run in a server render — so the first paint (and the server HTML crawlers
  // read) said "No trends available." before anything had been fetched
  // (2026-09-16). Deriving it also covers the first frame after the mobile
  // drawer opens and after the period changes.
  const requestKey = enabled && weekId ? `${weekId}|${language}` : "";
  const [settledKey, setSettledKey] = useState("");

  useEffect(() => {
    if (!enabled || !weekId) {
      setTrends(getFallbackTrends(language));
      return;
    }

    const key = `${weekId}|${language}`;
    const controller = new AbortController();
    const { signal } = controller;

    async function loadTrends() {
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
        if (!signal.aborted) setSettledKey(key);
      }
    }

    loadTrends();

    return () => controller.abort();
  }, [enabled, weekId, language]);

  const loading = requestKey !== "" && settledKey !== requestKey;
  return { trends, loading };
}
