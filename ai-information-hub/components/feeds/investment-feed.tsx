"use client";

import { useState, useEffect } from "react";
import { ExternalLink, TrendingUp, TrendingDown, Building2, Briefcase, GitMerge } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ShareButton } from "@/components/share-button";
import { cn } from "@/lib/utils";
import { useSettings } from "@/lib/settings-context";

interface InvestmentFeedProps {
  weekId: string;
  searchQuery?: string;
}

type MarketTab = "primary" | "secondary" | "ma";

interface PrimaryMarketPost {
  id: number;
  author: { name: string; handle: string; avatar: string; verified: boolean };
  content: string;
  company: string;
  amount: string;
  round: string;
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

interface MAPost {
  id: number;
  author: { name: string; handle: string; avatar: string; verified: boolean };
  content: string;
  acquirer: string;
  target: string;
  dealValue: string;
  dealType: string;
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
      .then((res) => res.json())
      .then(processData)
      .catch(() => {
        // If API fails, try static JSON as fallback
        if (apiBase) {
          fetch(`/data/${weekId}/investment.json`)
            .then((res) => res.json())
            .then(processData)
            .catch(clearData);
        } else {
          clearData();
        }
      });
  }, [weekId, language]);

  const weekNum = weekId.split("-kw")[1];

  const filterByQuery = (text: string) => {
    if (!searchQuery) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  const filteredPrimary = primaryPosts.filter((p) =>
    !searchQuery || filterByQuery(p.content) || filterByQuery(p.company) || filterByQuery(p.round) || p.investors.some((i) => filterByQuery(i))
  );
  const filteredSecondary = secondaryPosts.filter((p) =>
    !searchQuery || filterByQuery(p.content) || filterByQuery(p.ticker)
  );
  const filteredMa = maPosts.filter((p) =>
    !searchQuery || filterByQuery(p.content) || filterByQuery(p.acquirer) || filterByQuery(p.target) || filterByQuery(p.dealType)
  );

  const tabs = [
    { id: "primary" as const, label: t("primaryMarket"), icon: Briefcase },
    { id: "secondary" as const, label: t("secondaryMarket"), icon: TrendingUp },
    { id: "ma" as const, label: "M&A", icon: GitMerge },
  ];

  const VerifiedBadge = () => (
    <svg className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
    </svg>
  );

  const SourceLink = ({ sourceUrl }: { sourceUrl?: string }) =>
    sourceUrl ? (
      <div className="mt-2 flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
        <ExternalLink className="h-3 w-3" />
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
      <div className="bg-secondary/30 px-3 py-2 sm:px-4 sm:py-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-accent" />
          <h3 className="text-sm sm:text-base font-semibold text-foreground">{t("aiInvestments")}</h3>
          <Badge variant="secondary" className="ml-auto">
            {t("week")} {weekNum}
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
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {/* Primary Market Posts */}
      {!loading && activeTab === "primary" && (
        <div className="divide-y divide-border">
          {filteredPrimary.length === 0 && (
            <div className="px-4 py-12 text-center text-muted-foreground">
              {language === "de" ? "Keine Daten für diese Woche verfügbar." : "No data available for this week."}
            </div>
          )}
          {filteredPrimary.map((post) => (
            <article key={post.id} className="px-3 py-3 sm:px-4 sm:py-4 transition-colors hover:bg-secondary/30 cursor-pointer">
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
                        <Building2 className="h-4 w-4 text-accent" />
                        <span className="font-semibold text-foreground">{post.company}</span>
                      </div>
                      <Badge className="bg-accent/20 text-accent border-accent/30">{post.round}</Badge>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
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
          {filteredSecondary.length === 0 && (
            <div className="px-4 py-12 text-center text-muted-foreground">
              {language === "de" ? "Keine Daten für diese Woche verfügbar." : "No data available for this week."}
            </div>
          )}
          {filteredSecondary.map((post) => (
            <article key={post.id} className="px-3 py-3 sm:px-4 sm:py-4 transition-colors hover:bg-secondary/30 cursor-pointer">
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
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-foreground">{post.ticker}</span>
                        <span className="text-xl font-semibold text-foreground">{post.price}</span>
                      </div>
                      <div
                        className={cn(
                          "flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold",
                          post.direction === "up"
                            ? "bg-accent/20 text-accent"
                            : "bg-destructive/20 text-destructive"
                        )}
                      >
                        {post.direction === "up" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        {post.change}
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      {t("marketCap")}: <span className="text-foreground">{post.marketCap}</span>
                    </div>
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
            <div className="px-4 py-12 text-center text-muted-foreground">
              {language === "de" ? "Keine Daten für diese Woche verfügbar." : "No data available for this week."}
            </div>
          )}
          {filteredMa.map((post) => (
            <article key={post.id} className="px-3 py-3 sm:px-4 sm:py-4 transition-colors hover:bg-secondary/30 cursor-pointer">
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
                    <div className="flex items-center justify-center gap-4">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">{t("acquirer")}</p>
                        <p className="font-semibold text-foreground">{post.acquirer}</p>
                      </div>
                      <GitMerge className="h-6 w-6 text-chart-5" />
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">{t("target")}</p>
                        <p className="font-semibold text-foreground">{post.target}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-center gap-4">
                      <Badge className="bg-chart-5/20 text-chart-5 border-chart-5/30">
                        {post.dealType}
                      </Badge>
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
