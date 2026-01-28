"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
    fetch("/data/weeks.json")
      .then((res) => res.json())
      .then((data) => setWeeks(data.weeks))
      .catch(() => {});
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

      <div className="flex gap-1 overflow-x-auto px-4 pb-3 scrollbar-hide">
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
    </div>
  );
}
