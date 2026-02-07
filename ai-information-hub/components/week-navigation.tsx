"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettings } from "@/lib/settings-context";

interface WeekNavigationProps {
  selectedWeekId: string;
  onWeekChange: (weekId: string) => void;
}

interface WeekData {
  id: string;
  label: string;
  year: number;
  weekNum: number;
  dateRange: string;
  current: boolean;
}

export function WeekNavigation({ selectedWeekId, onWeekChange }: WeekNavigationProps) {
  const { language, t } = useSettings();
  const [weeks, setWeeks] = useState<WeekData[]>([]);

  useEffect(() => {
    const processData = (data: any) => setWeeks(data.weeks || []);

    // Try API first if configured, fall back to static JSON
    const apiBase = process.env.NEXT_PUBLIC_API_URL;
    const fetchUrl = apiBase ? `${apiBase}/weeks` : "/data/weeks.json";

    fetch(fetchUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(processData)
      .catch(() => {
        // If API fails, try static JSON as fallback
        if (apiBase) {
          fetch("/data/weeks.json")
            .then((res) => {
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              return res.json();
            })
            .then(processData)
            .catch(() => {});
        }
      });
  }, []);

  const currentIndex = weeks.findIndex((w) => w.id === selectedWeekId);

  const handlePrev = () => {
    if (currentIndex < weeks.length - 1) {
      onWeekChange(weeks[currentIndex + 1].id);
    }
  };

  const handleNext = () => {
    if (currentIndex > 0) {
      onWeekChange(weeks[currentIndex - 1].id);
    }
  };

  const weekLabel = language === "en" ? "W" : "KW";

  return (
    <div className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">{t("weekOverview")}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrev}
            disabled={currentIndex >= weeks.length - 1}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNext}
            disabled={currentIndex <= 0}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Week pills with gradient hints for scrollability */}
      <div className="relative">
        {/* Left gradient hint */}
        <div className="absolute left-0 top-0 bottom-3 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none z-10 md:hidden" />

        <div className="flex gap-1 overflow-x-auto px-4 pb-3 scrollbar-hide">
          {weeks.length === 0 && (
            <>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-20 shrink-0 rounded-lg" />
              ))}
            </>
          )}
          {weeks.map((week) => (
            <button
              key={week.id}
              onClick={() => onWeekChange(week.id)}
              className={cn(
                "flex shrink-0 flex-col items-center rounded-lg px-4 py-2 transition-all duration-200",
                selectedWeekId === week.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              <span className="text-sm font-semibold">
                {weekLabel} {String(week.weekNum).padStart(2, "0")}
              </span>
              <span className="text-xs opacity-80">{week.dateRange}</span>
              {week.current && (
                <span className="mt-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground">
                  {t("current")}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Right gradient hint */}
        <div className="absolute right-0 top-0 bottom-3 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none z-10 md:hidden" />
      </div>
    </div>
  );
}
