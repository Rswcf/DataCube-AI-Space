"use client";

import React from "react"

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useSettings } from "@/lib/settings-context";

interface TrendItem {
  category: string;
  title: string;
  posts: string;
}

// Fallback data in case JSON fetch fails
const fallbackTrends = {
  de: [
    { category: "KI · Trend", title: "GPT-5", posts: "124.000 Beiträge" },
    { category: "Technologie · Trend", title: "NVIDIA Blackwell", posts: "89.000 Beiträge" },
    { category: "Finanzen · Trend", title: "KI-Aktien", posts: "67.000 Beiträge" },
    { category: "Wissenschaft · Trend", title: "AlphaFold 3", posts: "45.000 Beiträge" },
    { category: "Startups · Trend", title: "Anthropic", posts: "34.000 Beiträge" },
  ],
  en: [
    { category: "AI · Trending", title: "GPT-5", posts: "124K posts" },
    { category: "Technology · Trending", title: "NVIDIA Blackwell", posts: "89K posts" },
    { category: "Finance · Trending", title: "AI Stocks", posts: "67K posts" },
    { category: "Science · Trending", title: "AlphaFold 3", posts: "45K posts" },
    { category: "Startups · Trending", title: "Anthropic", posts: "34K posts" },
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
    fetch(`/data/${weekId}/trends.json`)
      .then((res) => res.json())
      .then((data) => {
        if (data.trends) {
          setTrends(data.trends[language] || data.trends["de"] || fallbackTrends[language]);
        }
      })
      .catch(() => {
        setTrends(fallbackTrends[language]);
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
    <aside ref={sidebarRef} style={sidebarStyle} className="py-3 pl-6 pr-4">
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
            {trends.slice(0, 5).map((trend, index) => (
              <div key={index} className="group cursor-pointer">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{trend.category}</p>
                    <p className="font-bold text-foreground group-hover:underline">{trend.title}</p>
                    <p className="text-xs text-muted-foreground">{trend.posts}</p>
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
