"use client";

import React from "react"

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useSettings } from "@/lib/settings-context";

interface TrendItem {
  category: string;
  title: string;
}

// Fallback data in case JSON fetch fails
const fallbackTrends = {
  de: [
    { category: "KI · Trend", title: "GPT-5" },
    { category: "Technologie · Trend", title: "NVIDIA Blackwell" },
    { category: "Finanzen · Trend", title: "KI-Aktien" },
    { category: "Wissenschaft · Trend", title: "AlphaFold 3" },
    { category: "Startups · Trend", title: "Anthropic" },
    { category: "KI · Trend", title: "Open-Source LLMs" },
    { category: "Technologie · Trend", title: "KI-Agenten" },
    { category: "Finanzen · Trend", title: "KI-Infrastruktur" },
    { category: "Wissenschaft · Trend", title: "Multimodale KI" },
    { category: "Startups · Trend", title: "KI-Regulierung" },
  ],
  en: [
    { category: "AI · Trending", title: "GPT-5" },
    { category: "Technology · Trending", title: "NVIDIA Blackwell" },
    { category: "Finance · Trending", title: "AI Stocks" },
    { category: "Science · Trending", title: "AlphaFold 3" },
    { category: "Startups · Trending", title: "Anthropic" },
    { category: "AI · Trending", title: "Open-Source LLMs" },
    { category: "Technology · Trending", title: "AI Agents" },
    { category: "Finance · Trending", title: "AI Infrastructure" },
    { category: "Science · Trending", title: "Multimodal AI" },
    { category: "Startups · Trending", title: "AI Regulation" },
  ],
};


interface RightSidebarProps {
  weekId: string;
  onSearchChange: (query: string) => void;
}

export function RightSidebar({ weekId, onSearchChange }: RightSidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [sidebarStyle, setSidebarStyle] = useState<CSSProperties>({});
  const lastScrollY = useRef(0);
  const currentTop = useRef(0);
  const { language, t } = useSettings();

  const [searchValue, setSearchValue] = useState("");
  const [trends, setTrends] = useState<TrendItem[]>(fallbackTrends[language]);

  useEffect(() => {
    const processData = (data: any) => {
      if (data.trends) {
        setTrends(data.trends[language] || data.trends["de"] || fallbackTrends[language]);
      }
    };

    // Try API first if configured, fall back to static JSON
    const apiBase = process.env.NEXT_PUBLIC_API_URL;
    const fetchUrl = apiBase
      ? `${apiBase}/trends/${weekId}`
      : `/data/${weekId}/trends.json`;

    fetch(fetchUrl)
      .then((res) => res.json())
      .then(processData)
      .catch(() => {
        // If API fails, try static JSON as fallback
        if (apiBase) {
          fetch(`/data/${weekId}/trends.json`)
            .then((res) => res.json())
            .then(processData)
            .catch(() => setTrends(fallbackTrends[language]));
        } else {
          setTrends(fallbackTrends[language]);
        }
      });
  }, [weekId, language]);

  useEffect(() => {
    const handleScroll = () => {
      if (!sidebarRef.current || !contentRef.current) return;

      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const contentHeight = contentRef.current.offsetHeight;
      const scrollDelta = scrollY - lastScrollY.current;

      if (contentHeight <= windowHeight) {
        setSidebarStyle({ position: "sticky", top: 0 });
        lastScrollY.current = scrollY;
        return;
      }

      const maxNegativeTop = -(contentHeight - windowHeight);

      if (scrollDelta > 0) {
        currentTop.current = Math.max(currentTop.current - scrollDelta, maxNegativeTop);
      } else {
        currentTop.current = Math.min(currentTop.current - scrollDelta, 0);
      }

      setSidebarStyle({
        position: "sticky",
        top: `${currentTop.current}px`,
      });

      lastScrollY.current = scrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <aside ref={sidebarRef} style={sidebarStyle} className="py-3 pl-6 pr-4 bg-sidebar">
      <div ref={contentRef}>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("search")}
            className="pl-10 bg-secondary border-0 focus-visible:ring-1 focus-visible:ring-primary rounded-full"
            value={searchValue}
            onChange={(e) => {
              setSearchValue(e.target.value);
              onSearchChange(e.target.value);
            }}
          />
        </div>

        {/* Trends */}
        <div className="mt-4 rounded-xl bg-secondary/50 p-4">
          <h3 className="text-xl font-bold text-foreground">{t("whatsNew")}</h3>
          <div className="mt-3 space-y-4">
            {trends.slice(0, 10).map((trend, index) => (
              <div key={index} className="group cursor-pointer">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{trend.category}</p>
                    <p className="font-bold text-foreground group-hover:underline">{trend.title}</p>
                  </div>
                  <button className="rounded-full p-1 opacity-0 group-hover:opacity-100 hover:bg-primary/10 transition-all">
                    <svg className="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="6" r="2" />
                      <circle cx="12" cy="12" r="2" />
                      <circle cx="12" cy="18" r="2" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 px-2">
          <p className="text-xs text-muted-foreground">&copy; 2026 Data Cube, All Rights Reserved</p>
        </div>
      </div>
    </aside>
  );
}
