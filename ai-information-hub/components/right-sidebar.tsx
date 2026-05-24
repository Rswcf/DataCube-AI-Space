"use client";

import React from "react"

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Search, Check, TrendingUp, Loader2, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/lib/settings-context";
import { LANGUAGE_OPTIONS } from "@/lib/translations";
import { cn } from "@/lib/utils";
import { API_BASE, USE_API } from "@/lib/api-base";


interface TrendItem {
  category: string;
  title: string;
}

// Fallback data in case JSON fetch fails
const fallbackTrends: Record<string, TrendItem[]> = {
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
  const [trends, setTrends] = useState<TrendItem[]>(fallbackTrends[language] || fallbackTrends.en);
  const [email, setEmail] = useState("");
  const [subscribeState, setSubscribeState] = useState<"idle" | "selectLang" | "loading" | "success" | "error">("idle");
  const [newsletterLang, setNewsletterLang] = useState(language);

  useEffect(() => {
    const processData = (data: any) => {
      if (data.trends) {
        setTrends(data.trends[language] || data.trends["de"] || fallbackTrends[language] || fallbackTrends.en);
      }
    };

    // Try API first if configured, fall back to static JSON
    const fetchUrl = USE_API
      ? `${API_BASE}/trends/${weekId}`
      : `/data/${weekId}/trends.json`;

    fetch(fetchUrl)
      .then((res) => res.json())
      .then(processData)
      .catch(() => {
        // If API fails, try static JSON as fallback
        if (USE_API) {
          fetch(`/data/${weekId}/trends.json`)
            .then((res) => res.json())
            .then(processData)
            .catch(() => setTrends(fallbackTrends[language] || fallbackTrends.en));
        } else {
          setTrends(fallbackTrends[language] || fallbackTrends.en);
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
    <aside ref={sidebarRef} style={sidebarStyle} className="bg-sidebar py-4 pl-6 pr-4">
      <div ref={contentRef}>
        {/* Search */}
        <div className="relative">
          <label htmlFor="desktop-search-input" className="sr-only">
            {t("search")}
          </label>
          <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="desktop-search-input"
            name="search"
            placeholder={t("search")}
            className="rounded-none border-foreground bg-card pl-10 focus-visible:ring-1 focus-visible:ring-primary"
            value={searchValue}
            autoComplete="off"
            aria-label={t("search")}
            onChange={(e) => {
              setSearchValue(e.target.value);
              onSearchChange(e.target.value);
            }}
          />
        </div>

        {/* Newsletter Signup */}
        <div
          id="newsletter"
          className="mt-4 border border-[#1c1a17] bg-[#ffef7a] p-4 text-center dark:border-border dark:bg-card"
        >
          <div>
            <div className="mb-3 font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1c1a17] dark:text-foreground">
              Data Cube AI
            </div>
            <h2 className="mx-auto max-w-[15rem] break-words font-display text-2xl font-normal leading-[1.05] text-[#1c1a17] dark:text-foreground">
              {t("newsletterHeading")}
            </h2>
            <p className="mx-auto mb-2 mt-3 max-w-[15rem] text-xs leading-relaxed text-[#1c1a17] dark:text-muted-foreground">
              {t("newsletterDescription")}
            </p>
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#1c1a17]/70 dark:text-muted-foreground/80">
              {t("newsletterSocialProof")}
            </p>
            {subscribeState === "success" ? (
              <div className="flex items-center justify-center gap-2 text-sm font-semibold text-[#1c1a17] dark:text-tips-accent">
                <Check aria-hidden="true" className="h-4 w-4" />
                <span>{t("subscribed")}</span>
              </div>
            ) : subscribeState === "selectLang" ? (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-foreground">{t("chooseNewsletterLang")}</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {LANGUAGE_OPTIONS.map((opt) => (
                    <button
                      key={opt.code}
                      type="button"
                      onClick={() => setNewsletterLang(opt.code)}
                      className={cn(
                        "rounded-md border px-2 py-1.5 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                        opt.code === newsletterLang
                          ? "border-[#1c1a17] bg-[#1c1a17] font-semibold text-[#fffdf9] dark:border-video-accent dark:bg-video-accent dark:text-primary-foreground"
                          : "border-[#1c1a17]/20 bg-[#fffdf9]/70 text-[#1c1a17] hover:border-[#1c1a17] dark:border-border dark:bg-background dark:text-muted-foreground"
                      )}
                    >
                      {opt.nativeName}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <button
                    type="button"
                    onClick={() => setSubscribeState("idle")}
                    className="flex items-center gap-1 text-xs font-medium text-[#1c1a17]/75 transition-colors hover:text-[#1c1a17] dark:text-muted-foreground dark:hover:text-foreground"
                  >
                    <ArrowLeft className="h-3 w-3" aria-hidden="true" />
                    {t("back")}
                  </button>
                  <Button
                    type="button"
                    onClick={async () => {
                      setSubscribeState("loading");
                      try {
                        const res = await fetch("/api/subscribe", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ email: email.trim(), language: newsletterLang }),
                        });
                        if (!res.ok) throw new Error();
                        setEmail("");
                        setSubscribeState("success");
                        setTimeout(() => setSubscribeState("idle"), 4000);
                      } catch {
                        setSubscribeState("error");
                        setTimeout(() => setSubscribeState("idle"), 3000);
                      }
                    }}
                    className="h-8 rounded bg-[#1c1a17] px-4 text-xs text-[#fffdf9] transition-colors hover:bg-[#2c2924] dark:bg-video-accent dark:text-primary-foreground"
                  >
                    {t("confirm")}
                  </Button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!email.trim() || subscribeState === "loading") return;
                  setNewsletterLang(language);
                  setSubscribeState("selectLang");
                }}
                className="flex flex-col gap-2"
              >
                <label htmlFor="desktop-newsletter-email" className="sr-only">
                  {t("emailPlaceholder")}
                </label>
                <Input
                  id="desktop-newsletter-email"
                  name="email"
                  type="email"
                  required
                  placeholder={t("emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-none border-0 border-b border-[#1c1a17] bg-transparent px-0 text-center text-sm placeholder:text-[#1c1a17]/55 focus-visible:border-[#1c1a17] focus-visible:ring-0 dark:border-border dark:placeholder:text-muted-foreground"
                  autoComplete="email"
                  inputMode="email"
                  spellCheck={false}
                />
                {subscribeState === "error" && (
                  <p className="text-xs text-red-500">{t("subscribeError")}</p>
                )}
                <Button
                type="submit"
                disabled={subscribeState === "loading"}
                className="h-10 w-full rounded bg-[#1c1a17] text-sm font-semibold text-[#fffdf9] transition-colors hover:bg-[#2c2924] dark:bg-video-accent dark:text-primary-foreground"
              >
                  {subscribeState === "loading" ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    t("subscribe")
                  )}
                </Button>
              </form>
            )}
          </div>
        </div>

        {/* Trends */}
        <div className="mt-4 border-t-2 border-foreground bg-card p-4">
          <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
            <h2 className="font-sans text-[11px] font-extrabold uppercase tracking-[0.16em] text-primary">{t("whatsNew")}</h2>
            <TrendingUp aria-hidden="true" className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-1">
            {trends.slice(0, 10).map((trend, index) => (
              <button
                key={index}
                type="button"
                onClick={() => onSearchChange(trend.title)}
                className="flex w-full cursor-pointer items-start gap-3 border-b border-border py-3 text-left transition-colors hover:bg-secondary/70"
              >
                <span className="w-8 shrink-0 select-none font-display text-2xl font-normal leading-none tabular-nums text-primary">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-sans text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{trend.category}</p>
                  <p className="font-display text-lg font-normal leading-tight text-foreground">
                    {trend.title}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 px-2 text-xs text-muted-foreground">
          <nav aria-label="Trust and legal links" className="mb-2 flex flex-wrap gap-x-3 gap-y-1">
            <a href="/about" className="hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring rounded">
              About
            </a>
            <a href="/contact" className="hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring rounded">
              Contact
            </a>
            <a href="/datenschutz" className="hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring rounded">
              Privacy Policy
            </a>
            <a href="/editorial-policy" className="hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring rounded">
              Editorial Policy
            </a>
          </nav>
          <p>&copy; 2026 Data Cube, All Rights Reserved</p>
        </div>
      </div>
    </aside>
  );
}
