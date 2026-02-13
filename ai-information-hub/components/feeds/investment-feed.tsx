"use client";

import { useState, useEffect } from "react";
import { ExternalLink, TrendingUp, TrendingDown, Building2, Briefcase, GitMerge } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ShareButton } from "@/components/share-button";
import { cn } from "@/lib/utils";
import { VerifiedBadge } from "@/components/verified-badge";
import { FeedSkeleton } from "@/components/feeds/feed-skeleton";
import { useSettings } from "@/lib/settings-context";
import { getPeriodLabel } from "@/lib/period-utils";

interface InvestmentFeedProps {
  weekId: string;
  searchQuery?: string;
}

type MarketTab = "primary" | "secondary" | "ma";

type RoundCategory = "Early" | "Series A" | "Series B" | "Series C+" | "Late/PE" | "Unknown";

interface PrimaryMarketPost {
  id: number;
  author: { name: string; handle: string; avatar: string; verified: boolean };
  content: string;
  company: string;
  amount: string;
  round: string;
  roundCategory?: RoundCategory;
  investors: string[];
  valuation: string;
  timestamp: string;
  metrics: { comments: number; retweets: number; likes: number; views: string };
  sourceUrl?: string;
}

interface SecondaryMarketPost {
  id: number;
  author: { name: string; handle: string; avatar: string; verified: boolean };
  content: string;
  ticker: string;
  price: string;
  change: string;
  direction: "up" | "down";
  marketCap: string;
  timestamp: string;
  metrics: { comments: number; retweets: number; likes: number; views: string };
  sourceUrl?: string;
}

type IndustryCategory =
  | "AI Healthcare"
  | "AI Finance"
  | "AI Enterprise"
  | "AI Consumer"
  | "AI Infrastructure"
  | "AI Robotics"
  | "AI Security"
  | "AI Creative"
  | "AI Education"
  | "Other AI";

interface MAPost {
  id: number;
  author: { name: string; handle: string; avatar: string; verified: boolean };
  content: string;
  acquirer: string;
  target: string;
  dealValue: string;
  dealType: string;
  industry?: IndustryCategory;
  timestamp: string;
  metrics: { comments: number; retweets: number; likes: number; views: string };
  sourceUrl?: string;
}

export function InvestmentFeed({ weekId, searchQuery }: InvestmentFeedProps) {
  const [activeTab, setActiveTab] = useState<MarketTab>("primary");
  const { language, t } = useSettings();
  const [primaryPosts, setPrimaryPosts] = useState<PrimaryMarketPost[]>([]);
  const [secondaryPosts, setSecondaryPosts] = useState<SecondaryMarketPost[]>([]);
  const [maPosts, setMaPosts] = useState<MAPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [selectedRound, setSelectedRound] = useState<RoundCategory | "All">("All");

  // Filter options
  const roundFilters: (RoundCategory | "All")[] = ["All", "Early", "Series A", "Series B", "Series C+", "Late/PE"];

  // Translations for filter labels
  const getRoundLabel = (round: RoundCategory | "All"): string => {
    const labels: Record<RoundCategory | "All", string> = {
      "All": t("filterAll"),
      "Early": t("filterEarly"),
      "Series A": t("filterSeriesA"),
      "Series B": t("filterSeriesB"),
      "Series C+": t("filterSeriesCPlus"),
      "Late/PE": t("filterLatePE"),
      "Unknown": "Unknown",
    };
    return labels[round] || round;
  };

  // Get display name for AI application domain (shown on M&A cards)
  const getIndustryDisplayName = (industry: string): string => {
    const names: Record<string, { de: string; en: string }> = {
      "AI Healthcare": { de: "AI Gesundheit", en: "AI Healthcare" },
      "AI Finance": { de: "AI Finanzen", en: "AI Finance" },
      "AI Enterprise": { de: "AI Enterprise", en: "AI Enterprise" },
      "AI Consumer": { de: "AI Consumer", en: "AI Consumer" },
      "AI Infrastructure": { de: "AI Infrastruktur", en: "AI Infrastructure" },
      "AI Robotics": { de: "AI Robotik", en: "AI Robotics" },
      "AI Security": { de: "AI Sicherheit", en: "AI Security" },
      "AI Creative": { de: "AI Kreativ", en: "AI Creative" },
      "AI Education": { de: "AI Bildung", en: "AI Education" },
      "Other AI": { de: "Sonstige AI", en: "Other AI" },
    };
    return names[industry]?.[language] || industry;
  };

  // State for real-time stock data loading
  const [stockDataLoading, setStockDataLoading] = useState(false);

  useEffect(() => {
    setLoading(true);

    const processData = (data: any) => {
      setPrimaryPosts(data.primaryMarket?.[language] || data.primaryMarket?.["de"] || []);
      setSecondaryPosts(data.secondaryMarket?.[language] || data.secondaryMarket?.["de"] || []);
      setMaPosts(data.ma?.[language] || data.ma?.["de"] || []);
      setLoading(false);
    };

    const clearData = () => {
      setPrimaryPosts([]);
      setSecondaryPosts([]);
      setMaPosts([]);
      setLoading(false);
    };

    // Try API first if configured, fall back to static JSON
    const apiBase = process.env.NEXT_PUBLIC_API_URL;
    const fetchUrl = apiBase
      ? `${apiBase}/investment/${weekId}`
      : `/data/${weekId}/investment.json`;

    fetch(fetchUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(processData)
      .catch(() => {
        // If API fails, try static JSON as fallback
        if (apiBase) {
          fetch(`/data/${weekId}/investment.json`)
            .then((res) => {
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              return res.json();
            })
            .then(processData)
            .catch(clearData);
        } else {
          clearData();
        }
      });
  }, [weekId, language]);

  // Fetch real-time stock data for secondary market posts
  useEffect(() => {
    const fetchRealTimeStockData = async () => {
      const apiBase = process.env.NEXT_PUBLIC_API_URL;
      if (!apiBase || secondaryPosts.length === 0) return;

      // Get unique tickers from secondary posts
      const tickers = [...new Set(secondaryPosts.map((p) => p.ticker).filter(Boolean))];
      if (tickers.length === 0) return;

      setStockDataLoading(true);

      try {
        const response = await fetch(
          `${apiBase}/stock/formatted/batch/?tickers=${tickers.join(",")}&language=${language}`
        );
        if (!response.ok) throw new Error("Failed to fetch stock data");

        const stockData = await response.json();

        // Merge real-time data into secondary posts
        setSecondaryPosts((posts) =>
          posts.map((post) => {
            const realTimeData = stockData[post.ticker];
            if (realTimeData && !realTimeData.error) {
              return {
                ...post,
                price: realTimeData.price || post.price,
                change: realTimeData.change || post.change,
                direction: realTimeData.direction || post.direction,
                marketCap: realTimeData.marketCap || post.marketCap,
              };
            }
            return post;
          })
        );
      } catch (error) {
        console.error("Failed to fetch real-time stock data:", error);
        // Keep existing data on error
      } finally {
        setStockDataLoading(false);
      }
    };

    fetchRealTimeStockData();
  }, [secondaryPosts.length, language]); // Only re-fetch when posts change or language changes

  const periodLabel = getPeriodLabel(weekId, language);

  const filterByQuery = (text: string) => {
    if (!searchQuery) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  // Primary market posts - filter by search and round category
  const filteredPrimary = primaryPosts.filter((p) => {
    const matchesSearch = !searchQuery || filterByQuery(p.content) || filterByQuery(p.company) || filterByQuery(p.round) || p.investors.some((i) => filterByQuery(i));
    const matchesRound = selectedRound === "All" || p.roundCategory === selectedRound;
    return matchesSearch && matchesRound;
  });

  // Secondary market posts - filter by search only
  const filteredSecondary = secondaryPosts.filter((p) =>
    !searchQuery || filterByQuery(p.content) || filterByQuery(p.ticker)
  );

  // M&A posts - filter by search only (industry badge shown on cards instead of filter)
  const filteredMa = maPosts.filter((p) =>
    !searchQuery || filterByQuery(p.content) || filterByQuery(p.acquirer) || filterByQuery(p.target) || filterByQuery(p.dealType)
  );

  const tabs = [
    { id: "primary" as const, label: t("primaryMarket"), icon: Briefcase },
    { id: "secondary" as const, label: t("secondaryMarket"), icon: TrendingUp },
    { id: "ma" as const, label: "M&A", icon: GitMerge },
  ];

  const SourceLink = ({ sourceUrl }: { sourceUrl?: string }) =>
    sourceUrl ? (
      <div className="mt-2 flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
        <ExternalLink className="h-3 w-3" aria-hidden="true" />
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-primary hover:underline transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {t("source")}
        </a>
      </div>
    ) : null;


  return (
    <div className="divide-y divide-border">
      {/* Section Header */}
      <div className="section-header-invest border-l-4 border-invest-accent px-3 py-2 sm:px-4 sm:py-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-invest-accent" aria-hidden="true" />
          <h3 className="font-display text-base sm:text-lg font-semibold text-foreground">{t("aiInvestments")}</h3>
          <Badge variant="secondary" className="ml-auto">
            {periodLabel}
          </Badge>
        </div>
        <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-muted-foreground">
          {t("fundingNewsMA")}
        </p>
      </div>

      {/* Market Tabs */}
      <div className="flex border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
            )}
          >
            <tab.icon className="h-4 w-4" aria-hidden="true" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter Chips - Primary Market (Round Filter) */}
      {activeTab === "primary" && (
        <div className="px-3 py-2 sm:px-4 sm:py-3 bg-secondary/10 border-b border-border">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {roundFilters.map((round) => (
              <button
                key={round}
                onClick={() => setSelectedRound(round)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors",
                  selectedRound === round
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
              >
                {getRoundLabel(round)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && <FeedSkeleton />}

      {/* Primary Market Posts */}
      {!loading && activeTab === "primary" && (
        <div className="divide-y divide-border">
          {filteredPrimary.length === 0 && (
            <div className="px-4 py-16 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
                <Briefcase className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
              </div>
              <p className="text-muted-foreground font-medium">{t("noDataForThisPeriod")}</p>
              <p className="mt-1 text-sm text-muted-foreground/60">
                {language === "de" ? "Daten werden täglich um 23:00 Uhr gesammelt" : "Data is collected daily at 11:00 PM CET"}
              </p>
            </div>
          )}
          {filteredPrimary.map((post, index) => (
            <article key={post.id} className="border-l-2 border-l-invest-accent/30 px-3 py-3 sm:px-4 sm:py-4 transition-colors hover:bg-invest-accent/5 cursor-pointer animate-fade-up" style={{ animationDelay: `${Math.min(index, 10) * 50}ms` }}>
              <div className="flex gap-2 sm:gap-3">
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent font-bold text-sm sm:text-base">
                  {post.author.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <span className="font-bold text-sm sm:text-base text-foreground">{post.author.name}</span>
                    {post.author.verified && <VerifiedBadge />}
                    <span className="text-xs sm:text-sm text-muted-foreground">{post.author.handle}</span>
                    <span className="text-xs sm:text-sm text-muted-foreground">·</span>
                    <span className="text-xs sm:text-sm text-muted-foreground">{post.timestamp}</span>
                  </div>

                  {/* Deal Info Card */}
                  <div className="mt-2 rounded-lg border border-border bg-card p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-accent" aria-hidden="true" />
                        <span className="font-semibold text-foreground">{post.company}</span>
                      </div>
                      <Badge className="bg-accent/20 text-accent border-accent/30">{post.round}</Badge>
                    </div>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">{t("volume")}:</span>
                        <span className="ml-2 font-semibold text-accent">{post.amount}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t("valuation")}:</span>
                        <span className="ml-2 font-semibold text-foreground">{post.valuation}</span>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {post.investors.map((investor) => (
                        <Badge key={investor} variant="secondary" className="text-xs">{investor}</Badge>
                      ))}
                    </div>
                  </div>

                  <p className="mt-2 text-[15px] sm:text-base text-foreground leading-relaxed">{post.content}</p>
                  <SourceLink sourceUrl={post.sourceUrl} />
                  <div className="mt-3">
                    <ShareButton title={post.company} text={post.content} url={post.sourceUrl} />
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Secondary Market Posts */}
      {!loading && activeTab === "secondary" && (
        <div className="divide-y divide-border">
          {/* Real-time data indicator */}
          {stockDataLoading && (
            <div className="px-4 py-2 bg-chart-3/10 border-b border-border flex items-center gap-2 text-sm text-chart-3">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-chart-3 border-t-transparent" />
              {language === "de" ? "Lade Echtzeit-Kursdaten..." : "Loading real-time stock data..."}
            </div>
          )}
          {filteredSecondary.length === 0 && (
            <div className="px-4 py-16 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
                <TrendingUp className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
              </div>
              <p className="text-muted-foreground font-medium">{t("noDataForThisPeriod")}</p>
              <p className="mt-1 text-sm text-muted-foreground/60">
                {language === "de" ? "Daten werden täglich um 23:00 Uhr gesammelt" : "Data is collected daily at 11:00 PM CET"}
              </p>
            </div>
          )}
          {filteredSecondary.map((post, index) => (
            <article key={post.id} className="border-l-2 border-l-invest-accent/30 px-3 py-3 sm:px-4 sm:py-4 transition-colors hover:bg-invest-accent/5 cursor-pointer animate-fade-up" style={{ animationDelay: `${Math.min(index, 10) * 50}ms` }}>
              <div className="flex gap-2 sm:gap-3">
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full bg-chart-3/20 text-chart-3 font-bold text-sm sm:text-base">
                  {post.author.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <span className="font-bold text-sm sm:text-base text-foreground">{post.author.name}</span>
                    {post.author.verified && <VerifiedBadge />}
                    <span className="text-xs sm:text-sm text-muted-foreground">{post.author.handle}</span>
                    <span className="text-xs sm:text-sm text-muted-foreground">·</span>
                    <span className="text-xs sm:text-sm text-muted-foreground">{post.timestamp}</span>
                  </div>

                  {/* Stock Info Card */}
                  <div className="mt-2 rounded-lg border border-border bg-card p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0 flex-wrap">
                        <span className="text-lg font-bold text-foreground">{post.ticker}</span>
                        {post.price && post.price !== "N/A" && (
                          <span className="text-xl font-semibold text-foreground tabular-nums">{post.price}</span>
                        )}
                        {/* Live indicator for real-time data */}
                        {post.price && post.price !== "N/A" && !stockDataLoading && (
                          <Badge variant="outline" className="text-xs text-chart-3 border-chart-3/50 bg-chart-3/10">
                            {language === "de" ? "Live" : "Live"}
                          </Badge>
                        )}
                      </div>
                      {post.change && post.change !== "N/A" && (
                        <div
                          className={cn(
                            "flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold tabular-nums",
                            post.direction === "up"
                              ? "bg-accent/20 text-accent"
                              : "bg-destructive/20 text-destructive"
                          )}
                        >
                          {post.direction === "up" ? <TrendingUp className="h-4 w-4" aria-hidden="true" /> : <TrendingDown className="h-4 w-4" aria-hidden="true" />}
                          {post.change}
                        </div>
                      )}
                      {(!post.change || post.change === "N/A") && stockDataLoading && (
                        <div className="h-6 w-16 bg-secondary/50 animate-shimmer rounded-full" />
                      )}
                    </div>
                    {post.marketCap && post.marketCap !== "N/A" && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        {t("marketCap")}: <span className="text-foreground tabular-nums">{post.marketCap}</span>
                      </div>
                    )}
                    {(!post.marketCap || post.marketCap === "N/A") && stockDataLoading && (
                      <div className="mt-2 h-4 w-32 bg-secondary/50 animate-shimmer rounded" />
                    )}
                  </div>

                  <p className="mt-2 text-[15px] sm:text-base text-foreground leading-relaxed">{post.content}</p>
                  <SourceLink sourceUrl={post.sourceUrl} />
                  <div className="mt-3">
                    <ShareButton title={post.ticker} text={post.content} url={post.sourceUrl} />
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* M&A Posts */}
      {!loading && activeTab === "ma" && (
        <div className="divide-y divide-border">
          {filteredMa.length === 0 && (
            <div className="px-4 py-16 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
                <GitMerge className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
              </div>
              <p className="text-muted-foreground font-medium">{t("noDataForThisPeriod")}</p>
              <p className="mt-1 text-sm text-muted-foreground/60">
                {language === "de" ? "Daten werden täglich um 23:00 Uhr gesammelt" : "Data is collected daily at 11:00 PM CET"}
              </p>
            </div>
          )}
          {filteredMa.map((post, index) => (
            <article key={post.id} className="border-l-2 border-l-invest-accent/30 px-3 py-3 sm:px-4 sm:py-4 transition-colors hover:bg-invest-accent/5 cursor-pointer animate-fade-up" style={{ animationDelay: `${Math.min(index, 10) * 50}ms` }}>
              <div className="flex gap-2 sm:gap-3">
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full bg-chart-5/20 text-chart-5 font-bold text-sm sm:text-base">
                  {post.author.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <span className="font-bold text-sm sm:text-base text-foreground">{post.author.name}</span>
                    {post.author.verified && <VerifiedBadge />}
                    <span className="text-xs sm:text-sm text-muted-foreground">{post.author.handle}</span>
                    <span className="text-xs sm:text-sm text-muted-foreground">·</span>
                    <span className="text-xs sm:text-sm text-muted-foreground">{post.timestamp}</span>
                  </div>

                  {/* M&A Info Card */}
                  <div className="mt-2 rounded-lg border border-border bg-card p-3">
                    <div className="flex items-center justify-center gap-3 min-w-0">
                      <div className="text-center min-w-0">
                        <p className="text-xs text-muted-foreground">{t("acquirer")}</p>
                        <p className="font-semibold text-foreground truncate">{post.acquirer}</p>
                      </div>
                      <GitMerge className="h-6 w-6 text-chart-5 shrink-0" aria-hidden="true" />
                      <div className="text-center min-w-0">
                        <p className="text-xs text-muted-foreground">{t("target")}</p>
                        <p className="font-semibold text-foreground truncate">{post.target}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
                      <Badge className="bg-chart-5/20 text-chart-5 border-chart-5/30">
                        {post.dealType}
                      </Badge>
                      {post.industry && (
                        <Badge className="bg-primary/20 text-primary border-primary/30">
                          {getIndustryDisplayName(post.industry)}
                        </Badge>
                      )}
                      <span className="text-lg font-bold text-chart-5">{post.dealValue}</span>
                    </div>
                  </div>

                  <p className="mt-2 text-[15px] sm:text-base text-foreground leading-relaxed">{post.content}</p>
                  <SourceLink sourceUrl={post.sourceUrl} />
                  <div className="mt-3">
                    <ShareButton title={`${post.acquirer} → ${post.target}`} text={post.content} url={post.sourceUrl} />
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
