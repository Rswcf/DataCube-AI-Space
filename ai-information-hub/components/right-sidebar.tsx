"use client";

import React from "react"

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Search, Mail, Check, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/lib/settings-context";
import { toTopicSlug } from "@/lib/topic-utils";

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
  const [email, setEmail] = useState("");
  const [subscribeState, setSubscribeState] = useState<"idle" | "success">("idle");

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
          <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
          <div className="flex items-center gap-2">
            <TrendingUp aria-hidden="true" className="h-5 w-5 text-primary" />
            <h3 className="font-display text-xl font-bold text-foreground">{t("whatsNew")}</h3>
          </div>
          <div className="mt-3 space-y-1">
            {trends.slice(0, 10).map((trend, index) => (
              <a
                key={index}
                href={`/${language}/topic/${toTopicSlug(trend.title)}`}
                className="group flex items-start gap-3 rounded-lg p-2 hover:bg-secondary/80 transition-colors focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="text-2xl font-bold text-muted-foreground/30 tabular-nums w-8 shrink-0 select-none">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">{trend.category}</p>
                  <p className="font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">
                    {trend.title}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Newsletter Signup */}
        <div className="mt-4 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Mail aria-hidden="true" className="h-4 w-4 text-primary" />
            <h3 className="font-bold text-foreground">{t("newsletter")}</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">{t("newsletterDescription")}</p>
          {subscribeState === "success" ? (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <Check aria-hidden="true" className="h-4 w-4" />
              <span>{t("subscribed")}</span>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!email.trim()) return;
                const existing = JSON.parse(localStorage.getItem("datacube_newsletter_signups") || "[]");
                existing.push({ email: email.trim(), language, date: new Date().toISOString() });
                localStorage.setItem("datacube_newsletter_signups", JSON.stringify(existing));
                setEmail("");
                setSubscribeState("success");
                setTimeout(() => setSubscribeState("idle"), 3000);
              }}
              className="flex flex-col gap-2"
            >
              <Input
                type="email"
                required
                placeholder={t("emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-background border-0 focus-visible:ring-1 focus-visible:ring-primary text-sm"
              />
              <Button type="submit" size="sm" className="w-full rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 transition-opacity">
                {t("subscribe")}
              </Button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 px-2">
          <p className="text-xs text-muted-foreground">&copy; 2026 Data Cube, All Rights Reserved</p>
        </div>
      </div>
    </aside>
  );
}
