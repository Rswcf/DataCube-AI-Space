"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { Feed } from "@/components/feed";
import { RightSidebar } from "@/components/right-sidebar";
import { ChatWidget } from "@/components/chat-widget";
import { ReportGenerator } from "@/components/report-generator";
import { Cpu, TrendingUp, Lightbulb, Search, X, Settings, Sun, Moon, Languages, Heart, Mail, Check, Loader2, ArrowLeft } from "lucide-react";
import { LANGUAGE_OPTIONS } from "@/lib/translations";
import { cn } from "@/lib/utils";
import { useSettings } from "@/lib/settings-context";

interface HomePageClientProps {
  initialWeekId?: string;
}

export default function HomePageClient({ initialWeekId = "" }: HomePageClientProps) {
  const [activeTab, setActiveTab] = useState("tech");
  const [selectedWeekId, setSelectedWeekId] = useState(initialWeekId);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showMobileSettings, setShowMobileSettings] = useState(false);

  useEffect(() => {
    const processData = (data: {
      weeks?: {
        id: string;
        current?: boolean;
        days?: { id: string; current?: boolean }[];
      }[];
    }) => {
      const weeks = data.weeks || [];

      if (weeks.length > 0) {
        const currentWeek = weeks.find((w) => w.current) || weeks[0];

        if (currentWeek.days && currentWeek.days.length > 0) {
          const today = currentWeek.days.find((d) => d.current);
          const latest = currentWeek.days[currentWeek.days.length - 1];
          setSelectedWeekId((today || latest).id);
        } else {
          setSelectedWeekId(currentWeek.id);
        }
      }
    };

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

  return (
    <div className="min-h-dvh w-full overflow-x-hidden pb-16 md:pb-0">
      {/* Ambient gradient - visual continuity from login */}
      <div
        className="pointer-events-none fixed top-0 left-0 right-0 h-32 bg-gradient-to-b from-primary/[0.02] to-transparent z-0"
        aria-hidden="true"
      />
      <div id="main-content" className="mx-auto flex max-w-[1280px]">
        {/* Left Sidebar - Fixed width */}
        <div className="hidden md:flex md:w-20 xl:w-[275px] shrink-0 justify-end">
          <div className="w-full xl:w-[275px]">
            <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
          </div>
        </div>

        {/* Main Feed - Flexible center column */}
        <div className="flex-1 min-w-0 max-w-[600px] border-x border-border dark:bg-content-surface">
          <Feed activeTab={activeTab} selectedWeekId={selectedWeekId} onWeekChange={setSelectedWeekId} searchQuery={searchQuery} />
        </div>

        {/* Right Sidebar - Fixed width, hidden on smaller screens */}
        <div className="hidden lg:block w-[350px] shrink-0">
          <RightSidebar weekId={selectedWeekId} onSearchChange={setSearchQuery} />
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSearchClick={() => setShowMobileSearch(true)}
        onSettingsClick={() => setShowMobileSettings(true)}
      />

      {/* Mobile Search Drawer */}
      <MobileSearchDrawer
        isOpen={showMobileSearch}
        onClose={() => { setShowMobileSearch(false); setSearchQuery(""); }}
        weekId={selectedWeekId}
        onSearchChange={setSearchQuery}
      />

      {/* Mobile Settings Drawer */}
      <MobileSettingsDrawer
        isOpen={showMobileSettings}
        onClose={() => setShowMobileSettings(false)}
      />

      {/* AI Report Generator */}
      {selectedWeekId && <ReportGenerator weekId={selectedWeekId} />}

      {/* AI Chat Widget */}
      {selectedWeekId && <ChatWidget weekId={selectedWeekId} />}
    </div>
  );
}

function MobileNav({
  activeTab,
  onTabChange,
  onSearchClick,
  onSettingsClick,
}: {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSearchClick: () => void;
  onSettingsClick: () => void;
}) {
  const { t } = useSettings();
  const tabs = [
    { id: "tech", label: t("technology"), icon: Cpu },
    { id: "investment", label: t("investments"), icon: TrendingUp },
    { id: "tips", label: t("tips"), icon: Lightbulb },
  ];

  return (
    <nav aria-label="Main navigation" className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border bg-background/95 backdrop-blur-md py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "flex flex-col items-center gap-1 px-3 py-2 active:scale-95 transition-transform duration-200",
            activeTab === tab.id ? "text-primary scale-105" : "text-muted-foreground"
          )}
        >
          <tab.icon className="h-5 w-5" aria-hidden="true" />
          {activeTab === tab.id && (
            <span className="h-1 w-1 rounded-full bg-primary" aria-hidden="true" />
          )}
          <span className="text-[10px] font-medium">{tab.label}</span>
        </button>
      ))}
      <button
        onClick={onSearchClick}
        className="flex flex-col items-center gap-1 px-3 py-2 active:scale-95 transition-transform duration-200 text-muted-foreground"
      >
        <Search className="h-5 w-5" aria-hidden="true" />
        <span className="text-[10px] font-medium">{t("search")}</span>
      </button>
      <button
        onClick={onSettingsClick}
        className="flex flex-col items-center gap-1 px-3 py-2 active:scale-95 transition-transform duration-200 text-muted-foreground"
      >
        <Settings className="h-5 w-5" aria-hidden="true" />
        <span className="text-[10px] font-medium">{t("settings")}</span>
      </button>
    </nav>
  );
}

// Fallback trends data (used when API is unavailable)
const fallbackTrendsEN = [
  { category: "AI · Trending", title: "GPT-5" },
  { category: "Technology · Trending", title: "NVIDIA Blackwell" },
  { category: "Finance · Trending", title: "AI Stocks" },
  { category: "Science · Trending", title: "AlphaFold 3" },
  { category: "Startups · Trending", title: "Anthropic" },
];
const fallbackTrends: Record<string, { category: string; title: string }[]> = {
  de: [
    { category: "KI · Trend", title: "GPT-5" },
    { category: "Technologie · Trend", title: "NVIDIA Blackwell" },
    { category: "Finanzen · Trend", title: "KI-Aktien" },
    { category: "Wissenschaft · Trend", title: "AlphaFold 3" },
    { category: "Startups · Trend", title: "Anthropic" },
  ],
  en: fallbackTrendsEN,
};

function getFallbackTrends(lang: string) {
  return fallbackTrends[lang] || fallbackTrendsEN;
}

function MobileSearchDrawer({
  isOpen,
  onClose,
  weekId,
  onSearchChange,
}: {
  isOpen: boolean;
  onClose: () => void;
  weekId: string;
  onSearchChange: (query: string) => void;
}) {
  const { language, t } = useSettings();
  const [searchValue, setSearchValue] = useState("");
  const [trends, setTrends] = useState<{ category: string; title: string }[]>(getFallbackTrends(language));

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  useEffect(() => {
    if (!weekId) return;

    const processData = (data: { trends?: Record<string, { category: string; title: string }[]> }) => {
      if (data.trends) {
        setTrends(data.trends[language] || data.trends["de"] || getFallbackTrends(language));
      }
    };

    const apiBase = process.env.NEXT_PUBLIC_API_URL;
    const fetchUrl = apiBase ? `${apiBase}/trends/${weekId}` : `/data/${weekId}/trends.json`;

    fetch(fetchUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(processData)
      .catch(() => setTrends(getFallbackTrends(language)));
  }, [weekId, language]);

  const handleSearch = (value: string) => {
    setSearchValue(value);
    onSearchChange(value);
  };

  const handleTrendClick = (title: string) => {
    handleSearch(title);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true" aria-labelledby="mobile-search-title">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />

      {/* Drawer */}
      <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] rounded-t-2xl bg-background animate-in slide-in-from-bottom duration-300">
        {/* Handle with subtle gradient */}
        <div className="relative flex justify-center py-3" aria-hidden="true">
          <div className="absolute inset-x-0 top-0 h-full rounded-t-2xl bg-gradient-to-b from-primary/[0.03] to-transparent" />
          <div className="relative h-1 w-12 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3">
          <h2 id="mobile-search-title" className="text-lg font-bold">{t("search")}</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2.5 hover:bg-secondary transition-colors focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={language === "de" ? "Schließen" : "Close"}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Search Input */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              type="text"
              placeholder={t("search")}
              value={searchValue}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full rounded-full border border-input bg-secondary pl-10 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
              aria-label={t("search")}
            />
            {searchValue && (
              <button
                onClick={() => handleSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 hover:bg-muted-foreground/20 transition-colors"
                aria-label="Clear search"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Trends / Search Feedback */}
        <div className="px-4 pb-6 overflow-y-auto max-h-[50vh]">
          {searchValue ? (
            <div className="text-center py-8">
              <Search className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                {language === "de" ? `Filtere nach "${searchValue}"...` : `Filtering for "${searchValue}"...`}
              </p>
              <button
                onClick={onClose}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity focus-visible:ring-2 focus-visible:ring-ring"
              >
                {language === "de" ? "Ergebnisse anzeigen" : "Show results"}
              </button>
            </div>
          ) : (
            <>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">{t("whatsNew")}</h3>
              <div className="space-y-1">
                {trends.map((trend, index) => (
                  <button
                    key={index}
                    onClick={() => handleTrendClick(trend.title)}
                    className="w-full text-left p-3 rounded-lg hover:bg-secondary transition-colors focus-visible:ring-2 focus-visible:ring-ring flex items-start gap-3"
                  >
                    <span className="text-sm font-bold text-muted-foreground/50 mt-0.5 w-5 shrink-0 tabular-nums" aria-hidden="true">{index + 1}</span>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{trend.category}</p>
                      <p className="font-semibold">{trend.title}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MobileSettingsDrawer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { theme, setTheme, language, setLanguage, t } = useSettings();
  const [email, setEmail] = useState("");
  const [subscribeState, setSubscribeState] = useState<"idle" | "selectLang" | "loading" | "success" | "error">("idle");
  const [newsletterLang, setNewsletterLang] = useState(language);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true" aria-labelledby="mobile-settings-title">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />

      {/* Drawer */}
      <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] rounded-t-2xl bg-background animate-in slide-in-from-bottom duration-300 overflow-y-auto">
        {/* Handle */}
        <div className="flex justify-center py-3" aria-hidden="true">
          <div className="h-1 w-12 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3">
          <h2 id="mobile-settings-title" className="text-lg font-bold">{t("settings")}</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2.5 hover:bg-secondary transition-colors focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={language === "de" ? "Schließen" : "Close"}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Settings Options */}
        <div className="px-4 pb-8 space-y-2">
          {/* Theme Toggle */}
          <button
            onClick={() => {
              setTheme(theme === "dark" ? "light" : "dark");
            }}
            className="flex w-full items-center gap-4 rounded-xl p-4 hover:bg-secondary transition-colors focus-visible:ring-2 focus-visible:ring-ring"
          >
            {theme === "dark" ? (
              <Sun className="h-6 w-6 text-primary" aria-hidden="true" />
            ) : (
              <Moon className="h-6 w-6 text-primary" aria-hidden="true" />
            )}
            <div className="flex-1 text-left">
              <p className="font-semibold">{theme === "dark" ? t("lightMode") : t("darkMode")}</p>
              <p className="text-sm text-muted-foreground">
                {theme === "dark" ? t("switchToLight") : t("switchToDark")}
              </p>
            </div>
          </button>

          {/* Language Selector */}
          <div className="rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Languages className="h-5 w-5 text-primary" aria-hidden="true" />
              <p className="font-semibold">{t("language")}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {LANGUAGE_OPTIONS.map((opt) => (
                <button
                  key={opt.code}
                  onClick={() => setLanguage(opt.code)}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    opt.code === language
                      ? "bg-primary/10 text-primary font-semibold border border-primary/30"
                      : "hover:bg-secondary border border-transparent"
                  )}
                >
                  <span>{opt.nativeName}</span>
                  {opt.code === language && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
                </button>
              ))}
            </div>
          </div>

          {/* Support (Ko-fi) */}
          <button
            onClick={() => window.open("https://ko-fi.com/datacubeai", "_blank", "noopener,noreferrer")}
            className="flex w-full items-center gap-4 rounded-xl p-4 hover:bg-secondary transition-colors focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Heart className="h-6 w-6 text-pink-500" aria-hidden="true" />
            <div className="flex-1 text-left">
              <p className="font-semibold">{t("support")}</p>
              <p className="text-sm text-muted-foreground">{t("supportDescription")}</p>
            </div>
          </button>

          {/* Divider */}
          <div className="border-t border-border my-2" />

          {/* Quick Links */}
          <div className="flex flex-wrap gap-3 px-2 py-2 text-sm">
            <a href={`/${language}/tools`} className="text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-primary rounded">Tools</a>
            <a href="/about" className="text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-primary rounded">About</a>
            <a href="/developers" className="text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-primary rounded">API</a>
            <a href="/pricing" className="text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-primary rounded">Pricing</a>
            <a href="/jobs" className="text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-primary rounded">Jobs</a>
          </div>

          {/* Divider */}
          <div className="border-t border-border my-2" />

          {/* Newsletter */}
          <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
              <h3 className="font-bold text-foreground">{t("newsletter")}</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">{t("newsletterDescription")}</p>
            {subscribeState === "success" ? (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <Check className="h-4 w-4" aria-hidden="true" />
                <span>{t("subscribed")}</span>
              </div>
            ) : subscribeState === "selectLang" ? (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-foreground">{t("chooseNewsletterLang")}</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {LANGUAGE_OPTIONS.map((opt) => (
                    <button
                      key={opt.code}
                      type="button"
                      onClick={() => setNewsletterLang(opt.code)}
                      className={cn(
                        "rounded-md px-2 py-1.5 text-xs transition-colors",
                        opt.code === newsletterLang
                          ? "bg-primary/10 text-primary font-semibold border border-primary/30"
                          : "bg-secondary hover:bg-secondary/80 text-muted-foreground border border-transparent"
                      )}
                    >
                      {opt.nativeName}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <button
                    type="button"
                    onClick={() => setSubscribeState("idle")}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="h-3 w-3" aria-hidden="true" />
                    {t("back")}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setSubscribeState("loading");
                      try {
                        const res = await fetch("/api/subscribe", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ email: email.trim(), language: newsletterLang }),
                        });
                        if (!res.ok) throw new Error();
                        setEmail("");
                        setSubscribeState("success");
                        setTimeout(() => setSubscribeState("idle"), 4000);
                      } catch {
                        setSubscribeState("error");
                        setTimeout(() => setSubscribeState("idle"), 3000);
                      }
                    }}
                    className="rounded-full bg-gradient-to-r from-primary to-accent px-4 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {t("confirm")}
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!email.trim() || subscribeState === "loading") return;
                  setNewsletterLang(language);
                  setSubscribeState("selectLang");
                }}
                className="flex flex-col gap-2"
              >
                <input
                  type="email"
                  required
                  placeholder={t("emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {subscribeState === "error" && (
                  <p className="text-xs text-red-500">{t("subscribeError")}</p>
                )}
                <button
                  type="submit"
                  disabled={subscribeState === "loading"}
                  className="w-full rounded-full bg-gradient-to-r from-primary to-accent px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                >
                  {subscribeState === "loading" ? (
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" aria-hidden="true" />
                  ) : (
                    t("subscribe")
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
