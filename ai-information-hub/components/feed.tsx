"use client";

import { useState, useRef, useEffect } from "react";
import { WeekNavigation } from "./week-navigation";
import { TechFeed } from "./feeds/tech-feed";
import { InvestmentFeed } from "./feeds/investment-feed";
import { TipsFeed } from "./feeds/tips-feed";
import { ErrorBoundary } from "./error-boundary";
import { cn } from "@/lib/utils";
import { useSettings } from "@/lib/settings-context";
import { Mail, Check } from "lucide-react";

function InlineNewsletterCard() {
  const { language } = useSettings();
  const [email, setEmail] = useState("");
  const [subscribeState, setSubscribeState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem("newsletter-subscribed") === "true");
  }, []);

  if (dismissed) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubscribeState("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, language }),
      });
      if (!res.ok) throw new Error("Subscribe failed");
      setSubscribeState("success");
      localStorage.setItem("newsletter-subscribed", "true");
      setTimeout(() => setDismissed(true), 2000);
    } catch {
      setSubscribeState("error");
    }
  }

  return (
    <div className="mx-4 my-4 rounded-xl border-2 border-primary/30 bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20">
          <Mail className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-lg font-bold text-foreground">
            {language === "de" ? "Täglich informiert" : "Stay Informed Daily"}
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {language === "de"
              ? "KI-News in 3 Minuten — täglich kuratiert, zweisprachig."
              : "AI news in 3 minutes — daily curated, bilingual."}
          </p>
        </div>
      </div>
      {subscribeState === "success" ? (
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 mt-3 ml-[52px]">
          <Check className="h-4 w-4" aria-hidden="true" />
          <span>{language === "de" ? "Abonniert!" : "Subscribed!"}</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-2 mt-3 ml-[52px]">
          <input
            type="email"
            required
            placeholder={language === "de" ? "E-Mail-Adresse" : "Email address"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={subscribeState === "loading"}
            className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            {subscribeState === "loading"
              ? "..."
              : language === "de"
                ? "Kostenlos"
                : "Free"}
          </button>
        </form>
      )}
      {subscribeState === "error" && (
        <p className="text-xs text-red-500 mt-1 ml-[52px]">
          {language === "de" ? "Fehler — bitte erneut versuchen." : "Error — please try again."}
        </p>
      )}
      <p className="text-xs text-muted-foreground/70 italic mt-2 ml-[52px]">
        {language === "de" ? "Schließe dich KI-Profis an" : "Join AI professionals staying ahead"}
      </p>
    </div>
  );
}

interface FeedProps {
  activeTab: string;
  selectedWeekId: string;
  onWeekChange: (weekId: string) => void;
  searchQuery: string;
}

/**
 * Main feed container with tab switching and slide animations.
 *
 * Renders the appropriate feed component (Tech/Investment/Tips) based on activeTab.
 * Handles week navigation and passes search query to child feeds.
 *
 * @param activeTab - Current tab: "tech" | "investment" | "tips"
 * @param selectedWeekId - Week ID in format "YYYY-kwWW" (e.g., "2025-kw04")
 * @param onWeekChange - Callback when user selects a different week
 * @param searchQuery - Filter string passed to feed components
 *
 * @example
 * <Feed
 *   activeTab="tech"
 *   selectedWeekId="2025-kw04"
 *   onWeekChange={(id) => setWeekId(id)}
 *   searchQuery=""
 * />
 */
export function Feed({ activeTab, selectedWeekId, onWeekChange, searchQuery }: FeedProps) {
  const [direction, setDirection] = useState<"left" | "right">("left");
  const [isAnimating, setIsAnimating] = useState(false);
  const prevTabRef = useRef(activeTab);

  const tabOrder = ["tech", "investment", "tips"];

  useEffect(() => {
    if (prevTabRef.current !== activeTab) {
      const prevIndex = tabOrder.indexOf(prevTabRef.current);
      const newIndex = tabOrder.indexOf(activeTab);
      setDirection(newIndex > prevIndex ? "left" : "right");
      setIsAnimating(true);

      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 300);

      prevTabRef.current = activeTab;
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  const renderFeed = () => {
    switch (activeTab) {
      case "tech":
        return <TechFeed weekId={selectedWeekId} searchQuery={searchQuery} />;
      case "investment":
        return <InvestmentFeed weekId={selectedWeekId} searchQuery={searchQuery} />;
      case "tips":
        return <TipsFeed weekId={selectedWeekId} searchQuery={searchQuery} />;
      default:
        return <TechFeed weekId={selectedWeekId} searchQuery={searchQuery} />;
    }
  };

  if (!selectedWeekId) {
    return <main className="min-h-screen" />;
  }

  return (
    <main id="main-content" className="min-h-screen pb-20 md:pb-0">
      <WeekNavigation selectedWeekId={selectedWeekId} onWeekChange={onWeekChange} />

      <InlineNewsletterCard />

      <ErrorBoundary>
        <div className="overflow-hidden">
          <div
            className={cn(
              "transition-opacity duration-300 ease-out",
              isAnimating && direction === "left" && "animate-slide-left",
              isAnimating && direction === "right" && "animate-slide-right",
              isAnimating ? "opacity-0" : "opacity-100"
            )}
            onAnimationEnd={() => setIsAnimating(false)}
          >
            {renderFeed()}
          </div>
        </div>
      </ErrorBoundary>
    </main>
  );
}
