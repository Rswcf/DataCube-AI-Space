"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Lightbulb, Copy, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShareButton } from "@/components/share-button";
import { VerifiedBadge } from "@/components/verified-badge";
import { FeedSkeleton } from "@/components/feeds/feed-skeleton";
import { useSettings } from "@/lib/settings-context";
import { getPeriodLabel } from "@/lib/period-utils";

interface TipsFeedProps {
  weekId: string;
  searchQuery?: string;
}

interface TipPost {
  id: number;
  author: { name: string; handle: string; avatar: string; verified: boolean };
  platform: string;
  content: string;
  tip: string;
  category: string;
  difficulty: string;
  timestamp: string;
  metrics: { comments: number; retweets: number; likes: number; views: string };
  sourceUrl?: string;
}

const difficultyColors: Record<string, string> = {
  "Anfänger": "bg-accent/20 text-accent border-accent/30",
  "Mittel": "bg-chart-3/20 text-chart-3 border-chart-3/30",
  "Fortgeschritten": "bg-chart-4/20 text-chart-4 border-chart-4/30",
  "Beginner": "bg-accent/20 text-accent border-accent/30",
  "Intermediate": "bg-chart-3/20 text-chart-3 border-chart-3/30",
  "Advanced": "bg-chart-4/20 text-chart-4 border-chart-4/30",
};

const platformColors: Record<string, string> = {
  X: "bg-foreground text-background",
  Reddit: "bg-chart-4 text-chart-4-foreground",
};

export function TipsFeed({ weekId, searchQuery }: TipsFeedProps) {
  const { language, t } = useSettings();
  const [posts, setPosts] = useState<TipPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const filteredPosts = posts.filter((post) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      post.content.toLowerCase().includes(q) ||
      post.tip.toLowerCase().includes(q) ||
      post.category.toLowerCase().includes(q) ||
      post.platform.toLowerCase().includes(q) ||
      post.author.name.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    setLoading(true);

    // Try API first if configured, fall back to static JSON
    const apiBase = process.env.NEXT_PUBLIC_API_URL;
    const fetchUrl = apiBase
      ? `${apiBase}/tips/${weekId}`
      : `/data/${weekId}/tips.json`;

    fetch(fetchUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setPosts(data[language] || data["de"] || []);
        setLoading(false);
      })
      .catch(() => {
        // If API fails, try static JSON as fallback
        if (apiBase) {
          fetch(`/data/${weekId}/tips.json`)
            .then((res) => {
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              return res.json();
            })
            .then((data) => {
              setPosts(data[language] || data["de"] || []);
              setLoading(false);
            })
            .catch(() => {
              setPosts([]);
              setLoading(false);
            });
        } else {
          setPosts([]);
          setLoading(false);
        }
      });
  }, [weekId, language]);

  const handleCopy = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const periodLabel = getPeriodLabel(weekId, language);

  return (
    <div className="divide-y divide-border">
      {/* Section Header */}
      <div className="section-header-tips border-l-4 border-tips-accent px-3 py-2 sm:px-4 sm:py-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-tips-accent" aria-hidden="true" />
          <h3 className="font-display text-base sm:text-lg font-semibold text-foreground">{t("practicalTipsTitle")}</h3>
          {!loading && filteredPosts.length > 0 && (
            <Badge variant="outline" className="text-xs text-tips-accent border-tips-accent/30">
              {filteredPosts.length}
            </Badge>
          )}
          <Badge variant="secondary" className="ml-auto">
            {periodLabel}
          </Badge>
        </div>
        <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-muted-foreground">
          {t("handsOnTipsFrom")}
        </p>
      </div>

      {/* Loading State */}
      {loading && <FeedSkeleton />}

      {/* Empty State */}
      {!loading && filteredPosts.length === 0 && (
        <div className="px-4 py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
            <Lightbulb className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
          </div>
          <p className="text-muted-foreground font-medium">{t("noDataForThisPeriod")}</p>
          <p className="mt-1 text-sm text-muted-foreground/60">
            {language === "de" ? "Daten werden täglich um 23:00 Uhr gesammelt" : "Data is collected daily at 11:00 PM CET"}
          </p>
        </div>
      )}

      {/* Tips Posts */}
      {filteredPosts.map((post, index) => (
        <article
          key={post.id}
          className="border-l-2 border-l-tips-accent/30 px-3 py-3 sm:px-4 sm:py-4 transition-colors hover:bg-tips-accent/5 cursor-pointer animate-fade-up"
          style={{ animationDelay: `${Math.min(index, 10) * 50}ms` }}
        >
          <div className="flex gap-2 sm:gap-3">
            {/* Avatar */}
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full bg-chart-3/20 text-chart-3 font-bold text-sm sm:text-base">
              {post.author.avatar}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Author Info */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="font-bold text-sm sm:text-base text-foreground">{post.author.name}</span>
                {post.author.verified && <VerifiedBadge />}
                <span className="text-xs sm:text-sm text-muted-foreground">{post.author.handle}</span>
                <span className="text-xs sm:text-sm text-muted-foreground">·</span>
                <span className="text-xs sm:text-sm text-muted-foreground">{post.timestamp}</span>
                <Badge className={`text-xs ${platformColors[post.platform] || ""}`}>
                  {post.platform}
                </Badge>
              </div>

              {/* Category & Difficulty */}
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {post.category}
                </Badge>
                <Badge className={`text-xs border ${difficultyColors[post.difficulty] || ""}`}>
                  {post.difficulty}
                </Badge>
              </div>

              {/* Post Content */}
              <p className="mt-2 text-[15px] sm:text-base text-foreground leading-relaxed">{post.content}</p>

              {/* Tip Code Block */}
              <div className="mt-3 rounded-lg border border-tips-accent/20 bg-tips-accent/5 p-3">
                <div className="flex items-start justify-between gap-2">
                  <pre className="flex-1 overflow-x-auto whitespace-pre-wrap text-sm font-mono text-foreground leading-relaxed">
                    {post.tip}
                  </pre>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(post.id, post.tip);
                    }}
                  >
                    {copiedId === post.id ? (
                      <Check className="h-4 w-4 text-accent" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Source */}
              {post.sourceUrl && (
                <div className="mt-2 flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  <a
                    href={post.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary hover:underline transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {t("source")}
                  </a>
                </div>
              )}

              <div className="mt-3">
                <ShareButton
                  title={post.category}
                  text={`${post.content}\n\n${post.tip}`}
                  url={post.sourceUrl}
                />
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
