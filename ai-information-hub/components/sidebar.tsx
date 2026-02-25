"use client";

import { useState, useRef, useEffect } from "react";
import { Cpu, TrendingUp, Lightbulb, Sun, Moon, Languages, Heart, Check, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/lib/settings-context";
import { LogoCube } from "@/components/logo-cube";
import { LANGUAGE_OPTIONS, type TranslationKey, type Language } from "@/lib/translations";
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

function LanguageDropdown({ language, setLanguage }: { language: Language; setLanguage: (lang: Language) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const current = LANGUAGE_OPTIONS.find((l) => l.code === language) || LANGUAGE_OPTIONS[0];

  return (
    <div className="relative" ref={ref}>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex w-full items-center gap-4 rounded-lg px-4 py-3 border-l-[3px] border-l-transparent transition-[color,background-color,border-color,transform] duration-200 hover:translate-x-0.5 hover:bg-secondary text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Languages aria-hidden="true" className="h-6 w-6 shrink-0 text-accent" />
            <span className="text-lg hidden xl:block">{current.nativeName}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="xl:hidden">
          <p>{current.nativeName}</p>
        </TooltipContent>
      </Tooltip>

      {open && (
        <div className="absolute bottom-full left-0 mb-1 w-48 rounded-lg border border-border bg-popover shadow-lg z-50 py-1">
          {LANGUAGE_OPTIONS.map((opt) => (
            <button
              key={opt.code}
              onClick={() => { setLanguage(opt.code); setOpen(false); }}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring",
                opt.code === language && "font-semibold text-primary"
              )}
            >
              <span className="flex-1 text-left">{opt.nativeName}</span>
              {opt.code === language && <Check aria-hidden="true" className="h-4 w-4 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
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
            <LogoCube size={40} className="shrink-0" />
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

          {/* Language Selector */}
          <LanguageDropdown language={language} setLanguage={setLanguage} />

          {/* AI Tools */}
          <NavButton
            icon={Wrench}
            label={t("aiTools")}
            description={t("aiToolsDescription")}
            onClick={() => window.open("/tools", "_blank", "noopener,noreferrer")}
            iconClassName="text-orange-500"
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
