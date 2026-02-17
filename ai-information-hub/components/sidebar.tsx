"use client";

import { Cpu, TrendingUp, Lightbulb, Sun, Moon, Languages, Heart } from "lucide-react";
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

// Reusable nav button with tooltip for tablet view
function NavButton({
  icon: Icon,
  label,
  description,
  onClick,
  isActive,
  className,
  iconClassName,
}: {
  icon: React.ElementType;
  label: string;
  description?: string;
  onClick?: () => void;
  isActive?: boolean;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            "flex w-full items-center gap-4 rounded-lg px-4 py-3 border-l-[3px] transition-[color,background-color,border-color,transform] duration-200 hover:translate-x-0.5 focus-visible:ring-2 focus-visible:ring-ring",
            isActive
              ? "bg-primary/10 text-primary font-bold shadow-sm shadow-primary/10 border-l-primary"
              : "text-foreground hover:bg-secondary border-l-transparent",
            className
          )}
        >
          <Icon
            aria-hidden="true"
            className={cn(
              "h-6 w-6 shrink-0 transition-colors",
              isActive ? "text-primary" : "",
              iconClassName
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

  return (
    <TooltipProvider delayDuration={300}>
      <aside className="sticky top-0 h-screen flex flex-col bg-sidebar px-3 py-4 w-full">
        {/* Logo */}
        <div className="mb-6 px-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/25">
              <span className="text-lg font-bold text-primary-foreground">DC</span>
            </div>
            <span className="text-xl font-bold text-foreground hidden xl:block">Data Cube</span>
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 space-y-1">
          {/* Category Tabs */}
          <div>
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
        </nav>

        {/* Settings Controls */}
        <div className="border-t border-border pt-4 space-y-2">
          {/* Theme Toggle */}
          <NavButton
            icon={theme === "dark" ? Sun : Moon}
            label={theme === "dark" ? t("lightMode") : t("darkMode")}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            iconClassName={theme === "dark" ? "text-yellow-500" : "text-blue-400"}
          />

          {/* Language Toggle */}
          <NavButton
            icon={Languages}
            label={language === "de" ? "English" : "Deutsch"}
            onClick={() => setLanguage(language === "de" ? "en" : "de")}
            iconClassName="text-accent"
          />

          {/* Support */}
          <NavButton
            icon={Heart}
            label={t("support")}
            onClick={() => window.open("https://ko-fi.com/datacubeai", "_blank", "noopener,noreferrer")}
            iconClassName="text-pink-500"
          />
        </div>

        {/* Legal Links */}
        <div className="border-t border-border pt-3 mt-2 px-4 hidden xl:flex gap-3">
          <a href="/impressum" className="text-xs text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring rounded">
            {language === "de" ? "Impressum" : "Legal Notice"}
          </a>
          <a href="/datenschutz" className="text-xs text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring rounded">
            {language === "de" ? "Datenschutz" : "Privacy"}
          </a>
        </div>
      </aside>
    </TooltipProvider>
  );
}
