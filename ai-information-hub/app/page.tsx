"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Feed } from "@/components/feed";
import { RightSidebar } from "@/components/right-sidebar";
import { Cpu, TrendingUp, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/lib/settings-context";

export default function Home() {
  const [activeTab, setActiveTab] = useState("tech");

  return (
    <div className="min-h-screen w-full">
      <div className="mx-auto flex max-w-[1280px]">
        {/* Left Sidebar - Fixed width */}
        <div className="hidden md:flex md:w-20 xl:w-[275px] shrink-0 justify-end">
          <div className="w-full xl:w-[275px]">
            <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
          </div>
        </div>

        {/* Main Feed - Flexible center column */}
        <div className="flex-1 min-w-0 max-w-[600px] border-x border-border">
          <Feed activeTab={activeTab} />
        </div>

        {/* Right Sidebar - Fixed width, hidden on smaller screens */}
        <div className="hidden lg:block w-[350px] shrink-0">
          <RightSidebar />
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

function MobileNav({ activeTab, onTabChange }: { activeTab: string; onTabChange: (tab: string) => void }) {
  const { t } = useSettings();
  const tabs = [
    { id: "tech", label: t("technology"), icon: Cpu },
    { id: "investment", label: t("investments"), icon: TrendingUp },
    { id: "tips", label: t("tips"), icon: Lightbulb },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border bg-background/95 backdrop-blur-md py-2 md:hidden">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "flex flex-col items-center gap-1 px-4 py-2 transition-colors",
            activeTab === tab.id ? "text-primary" : "text-muted-foreground"
          )}
        >
          <tab.icon className="h-6 w-6" />
          <span className="text-xs font-medium">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
