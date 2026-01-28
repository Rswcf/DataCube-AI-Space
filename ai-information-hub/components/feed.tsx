"use client";

import { useState, useRef, useEffect } from "react";
import { WeekNavigation } from "./week-navigation";
import { TechFeed } from "./feeds/tech-feed";
import { InvestmentFeed } from "./feeds/investment-feed";
import { TipsFeed } from "./feeds/tips-feed";
import { cn } from "@/lib/utils";

interface FeedProps {
  activeTab: string;
  selectedWeekId: string;
  onWeekChange: (weekId: string) => void;
  searchQuery: string;
}

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
    <main className="min-h-screen">
      <WeekNavigation selectedWeekId={selectedWeekId} onWeekChange={onWeekChange} />

      <div className="overflow-hidden">
        <div
          className={cn(
            "transition-transform duration-300 ease-out",
            isAnimating && direction === "left" && "animate-slide-left",
            isAnimating && direction === "right" && "animate-slide-right"
          )}
        >
          {renderFeed()}
        </div>
      </div>
    </main>
  );
}
