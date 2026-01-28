"use client";

import React from "react"

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/lib/settings-context";

interface TrendItem {
  category: string;
  title: string;
  posts: string;
}

interface TeamMember {
  name: string;
  role: string;
  handle: string;
  avatar: string;
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

const fallbackTeam = {
  de: [
    { name: "Anna Schmidt", role: "KI-Technologie Lead", handle: "@anna_tech", avatar: "AS" },
    { name: "Max Weber", role: "Investment Analyst", handle: "@max_invest", avatar: "MW" },
    { name: "Lisa Müller", role: "Data Scientist", handle: "@lisa_data", avatar: "LM" },
    { name: "Tom Fischer", role: "Research Lead", handle: "@tom_research", avatar: "TF" },
  ],
  en: [
    { name: "Anna Schmidt", role: "AI Technology Lead", handle: "@anna_tech", avatar: "AS" },
    { name: "Max Weber", role: "Investment Analyst", handle: "@max_invest", avatar: "MW" },
    { name: "Lisa Müller", role: "Data Scientist", handle: "@lisa_data", avatar: "LM" },
    { name: "Tom Fischer", role: "Research Lead", handle: "@tom_research", avatar: "TF" },
  ],
};

interface RightSidebarProps {
  weekId?: string;
}

export function RightSidebar({ weekId = "2025-kw04" }: RightSidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [sidebarStyle, setSidebarStyle] = useState<CSSProperties>({});
  const lastScrollY = useRef(0);
  const currentTop = useRef(0);
  const { language, t } = useSettings();

  const [trends, setTrends] = useState<TrendItem[]>(fallbackTrends[language]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(fallbackTeam[language]);

  useEffect(() => {
    fetch(`/data/${weekId}/trends.json`)
      .then((res) => res.json())
      .then((data) => {
        if (data.trends) {
          setTrends(data.trends[language] || data.trends["de"] || fallbackTrends[language]);
        }
        if (data.teamMembers) {
          setTeamMembers(data.teamMembers[language] || data.teamMembers["de"] || fallbackTeam[language]);
        }
      })
      .catch(() => {
        setTrends(fallbackTrends[language]);
        setTeamMembers(fallbackTeam[language]);
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
          />
        </div>

        {/* Trends */}
        <div className="mt-4 rounded-xl bg-secondary/50 p-4">
          <h3 className="text-xl font-bold text-foreground">{t("whatsNew")}</h3>
          <div className="mt-3 space-y-4">
            {trends.map((trend, index) => (
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
          <button className="mt-3 text-sm text-primary hover:underline">
            {t("showMore")}
          </button>
        </div>

        {/* Team Members */}
        <div className="mt-4 rounded-xl bg-secondary/50 p-4">
          <h3 className="text-xl font-bold text-foreground">{t("team")}</h3>
          <div className="mt-3 space-y-3">
            {teamMembers.map((member, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary font-semibold text-sm">
                    {member.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.role}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="rounded-full h-8 text-xs font-semibold bg-transparent">
                  {t("follow")}
                </Button>
              </div>
            ))}
          </div>
          <button className="mt-3 text-sm text-primary hover:underline">
            {t("showMore")}
          </button>
        </div>

        {/* Footer Links */}
        <div className="mt-4 px-2">
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <a href="#" className="hover:underline">{t("termsOfService")}</a>
            <a href="#" className="hover:underline">{t("privacy")}</a>
            <a href="#" className="hover:underline">{t("cookiePolicy")}</a>
            <a href="#" className="hover:underline">{t("imprint")}</a>
            <a href="#" className="hover:underline">{t("accessibility")}</a>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">© 2025 Data Cube Analytics</p>
        </div>
      </div>
    </aside>
  );
}
