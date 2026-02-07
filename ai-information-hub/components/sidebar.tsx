"use client";

import { Cpu, TrendingUp, Lightbulb, Home, Search, Users, Sun, Moon, Languages, Settings, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/lib/settings-context";
import type { TranslationKey } from "@/lib/translations";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

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

// Reusable nav button with tooltip for tablet view
function NavButton({
  icon: Icon,
  label,
  description,
  onClick,
  isActive,
  className,
}: {
  icon: React.ElementType;
  label: string;
  description?: string;
  onClick?: () => void;
  isActive?: boolean;
  className?: string;
}) {
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            "flex w-full items-center gap-4 rounded-full px-4 py-3 transition-all duration-200",
            isActive
              ? "bg-primary/10 text-primary font-semibold"
              : "text-foreground hover:bg-secondary",
            className
          )}
        >
          <Icon
            className={cn(
              "h-6 w-6 transition-colors",
              isActive ? "text-primary" : ""
            )}
          />
          <div className="text-left hidden xl:block">
            <span className="text-lg">{label}</span>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="xl:hidden">
        <p>{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </TooltipContent>
    </Tooltip>
  );
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { theme, setTheme, language, setLanguage, t } = useSettings();
  const tabs = getTabsData(t);
  const navItems = getNavItems(t);

  return (
    <TooltipProvider delayDuration={300}>
      <aside className="sticky top-0 h-screen flex flex-col bg-sidebar px-3 py-4 w-full">
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
            <NavButton
              key={item.id}
              icon={item.icon}
              label={item.label}
            />
          ))}

          {/* Category Tabs */}
          <div className="py-4">
            <p className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden xl:block">
              {t("categories")}
            </p>
            {tabs.map((tab) => (
              <NavButton
                key={tab.id}
                icon={tab.icon}
                label={tab.label}
                description={tab.description}
                onClick={() => onTabChange(tab.id)}
                isActive={activeTab === tab.id}
              />
            ))}
          </div>

          {navItems.slice(2).map((item) => (
            <NavButton
              key={item.id}
              icon={item.icon}
              label={item.label}
            />
          ))}
        </nav>

        {/* Settings Controls */}
        <div className="border-t border-border pt-4 space-y-2">
          {/* Theme Toggle */}
          <NavButton
            icon={theme === "dark" ? Sun : Moon}
            label={theme === "dark" ? t("lightMode") : t("darkMode")}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          />

          {/* Language Toggle */}
          <NavButton
            icon={Languages}
            label={language === "de" ? "English" : "Deutsch"}
            onClick={() => setLanguage(language === "de" ? "en" : "de")}
          />

          {/* Support */}
          <NavButton
            icon={Heart}
            label={t("support")}
            onClick={() => window.open("https://ko-fi.com/datacubeai", "_blank", "noopener,noreferrer")}
          />
        </div>

        {/* User Profile */}
        <div className="border-t border-border pt-4 mt-2">
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-3 rounded-full px-3 py-2 hover:bg-secondary transition-colors cursor-pointer">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground font-semibold">
                  DC
                </div>
                <div className="hidden xl:block">
                  <p className="text-sm font-semibold text-foreground">Data Cube Team</p>
                  <p className="text-xs text-muted-foreground">@datacube_analytics</p>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="xl:hidden">
              <p className="font-semibold">Data Cube Team</p>
              <p className="text-xs text-muted-foreground">@datacube_analytics</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}
