"use client";

import { Cpu, TrendingUp, Lightbulb, Home, Search, Users, Sun, Moon, Languages, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/lib/settings-context";
import type { TranslationKey } from "@/lib/translations";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const getTabsData = (t: (key: TranslationKey) => string) => [
  {
    id: "tech",
    label: t("aiTechnology"),
    icon: Cpu,
    description: t("techProgress"),
  },
  {
    id: "investment",
    label: t("investments"),
    icon: TrendingUp,
    description: t("marketFunding"),
  },
  {
    id: "tips",
    label: t("practicalTips"),
    icon: Lightbulb,
    description: t("handsOnAI"),
  },
];

const getNavItems = (t: (key: TranslationKey) => string) => [
  { id: "home", label: t("home"), icon: Home },
  { id: "search", label: t("discover"), icon: Search },
  { id: "team", label: t("dataCube"), icon: Users },
];

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { theme, setTheme, language, setLanguage, t } = useSettings();
  const tabs = getTabsData(t);
  const navItems = getNavItems(t);

  return (
    <aside className="sticky top-0 h-screen flex flex-col bg-background px-3 py-4 w-full">
      {/* Logo */}
      <div className="mb-6 px-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <span className="text-lg font-bold text-primary-foreground">DC</span>
          </div>
          <span className="text-xl font-bold text-foreground hidden xl:block">Data Cube</span>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1">
        {navItems.slice(0, 2).map((item) => (
          <button
            key={item.id}
            className="flex w-full items-center gap-4 rounded-full px-4 py-3 text-foreground transition-colors hover:bg-secondary"
          >
            <item.icon className="h-6 w-6" />
            <span className="text-lg hidden xl:block">{item.label}</span>
          </button>
        ))}

        {/* Category Tabs */}
        <div className="py-4">
          <p className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden xl:block">
            {t("categories")}
          </p>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex w-full items-center gap-4 rounded-full px-4 py-3 transition-all duration-200",
                activeTab === tab.id
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-foreground hover:bg-secondary"
              )}
            >
              <tab.icon
                className={cn(
                  "h-6 w-6 transition-colors",
                  activeTab === tab.id ? "text-primary" : ""
                )}
              />
              <div className="text-left hidden xl:block">
                <span className="text-lg">{tab.label}</span>
                <p className="text-xs text-muted-foreground">{tab.description}</p>
              </div>
            </button>
          ))}
        </div>

        {navItems.slice(2).map((item) => (
          <button
            key={item.id}
            className="flex w-full items-center gap-4 rounded-full px-4 py-3 text-foreground transition-colors hover:bg-secondary"
          >
            <item.icon className="h-6 w-6" />
            <span className="text-lg hidden xl:block">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Settings Controls */}
      <div className="border-t border-border pt-4 space-y-2">
        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex w-full items-center gap-4 rounded-full px-4 py-3 text-foreground transition-colors hover:bg-secondary"
        >
          {theme === "dark" ? (
            <Sun className="h-6 w-6" />
          ) : (
            <Moon className="h-6 w-6" />
          )}
          <span className="text-lg hidden xl:block">
            {theme === "dark" ? t("lightMode") : t("darkMode")}
          </span>
        </button>

        {/* Language Toggle */}
        <button
          onClick={() => setLanguage(language === "de" ? "en" : "de")}
          className="flex w-full items-center gap-4 rounded-full px-4 py-3 text-foreground transition-colors hover:bg-secondary"
        >
          <Languages className="h-6 w-6" />
          <span className="text-lg hidden xl:block">
            {language === "de" ? "English" : "Deutsch"}
          </span>
        </button>
      </div>

      {/* User Profile */}
      <div className="border-t border-border pt-4 mt-2">
        <div className="flex items-center gap-3 rounded-full px-3 py-2 hover:bg-secondary transition-colors cursor-pointer">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground font-semibold">
            DC
          </div>
          <div className="hidden xl:block">
            <p className="text-sm font-semibold text-foreground">Data Cube Team</p>
            <p className="text-xs text-muted-foreground">@datacube_analytics</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
