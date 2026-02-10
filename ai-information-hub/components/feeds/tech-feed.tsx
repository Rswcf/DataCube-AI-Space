"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Cpu, Brain, Zap, Server } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ShareButton } from "@/components/share-button";
import { VideoEmbed, VideoBadge } from "@/components/video-embed";
import { VerifiedBadge } from "@/components/verified-badge";
import { FeedSkeleton } from "@/components/feeds/feed-skeleton";
import { useSettings } from "@/lib/settings-context";
import { getPeriodLabel } from "@/lib/period-utils";
import type { TechPost } from "@/lib/types";

interface TechFeedProps {
  weekId: string;
  searchQuery?: string;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Brain,
  Server,
  Zap,
  Cpu,
};

const impactColors: Record<string, string> = {
  critical: "bg-destructive/20 text-destructive border-destructive/30",
  high: "bg-chart-4/20 text-chart-4 border-chart-4/30",
  medium: "bg-chart-3/20 text-chart-3 border-chart-3/30",
  low: "bg-muted text-muted-foreground border-border",
};

const impactBorderColors: Record<string, string> = {
  critical: "border-l-destructive",
  high: "border-l-chart-4",
  medium: "border-l-primary",
  low: "border-l-transparent",
};

const impactLabels = {
  de: { critical: "Kritisch", high: "Hoch", medium: "Mittel", low: "Niedrig" },
  en: { critical: "Critical", high: "High", medium: "Medium", low: "Low" },
};

/**
 * Displays AI technology news posts for a given week.
 *
 * Data loading pattern (reference implementation for other feeds):
 * 1. useEffect triggers on weekId or language change
 * 2. Fetches /data/{weekId}/tech.json (or API endpoint if configured)
 * 3. Selects data[language] with fallback to data["de"]
 * 4. Filters by searchQuery if provided
 *
 * Video posts are interspersed among regular posts and displayed with
 * an embedded YouTube player and special "Video" badge styling.
 *
 * @param weekId - Week ID in format "YYYY-kwWW"
 * @param searchQuery - Optional filter string for content/tags/source
 *
 * @example
 * <TechFeed weekId="2025-kw04" searchQuery="" />
 */
export function TechFeed({ weekId, searchQuery }: TechFeedProps) {
  const { language, t } = useSettings();
  const [posts, setPosts] = useState<TechPost[]>([]);
  const [loading, setLoading] = useState(true);
  const impacts = impactLabels[language];

  const filteredPosts = posts.filter((post) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      post.content.toLowerCase().includes(q) ||
      post.category.toLowerCase().includes(q) ||
      post.source.toLowerCase().includes(q) ||
      post.tags.some((tag) => tag.toLowerCase().includes(q)) ||
      post.author.name.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    setLoading(true);

    // Try API first if configured, fall back to static JSON
    const apiBase = process.env.NEXT_PUBLIC_API_URL;
    const fetchUrl = apiBase
      ? `${apiBase}/tech/${weekId}`
      : `/data/${weekId}/tech.json`;

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
          fetch(`/data/${weekId}/tech.json`)
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

  const periodLabel = getPeriodLabel(weekId, language);

  return (
    <div className="divide-y divide-border">
      {/* Section Header */}
      <div className="section-header-tech border-l-4 border-tech-accent px-3 py-2 sm:px-4 sm:py-3">
        <div className="flex items-center gap-2">
          <Cpu className="h-5 w-5 text-tech-accent" aria-hidden="true" />
          <h3 className="font-display text-base sm:text-lg font-semibold text-foreground">{t("aiTechProgress")}</h3>
          {!loading && filteredPosts.length > 0 && (
            <Badge variant="outline" className="text-xs text-tech-accent border-tech-accent/30">
              {filteredPosts.length}
            </Badge>
          )}
          <Badge variant="secondary" className="ml-auto">
            {periodLabel}
          </Badge>
        </div>
        <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-muted-foreground">
          {t("importantDevThisWeek")}
        </p>
      </div>

      {/* Loading State */}
      {loading && <FeedSkeleton />}

      {/* Empty State */}
      {!loading && filteredPosts.length === 0 && (
        <div className="px-4 py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
            <Cpu className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
          </div>
          <p className="text-muted-foreground font-medium">{t("noDataForThisPeriod")}</p>
          <p className="mt-1 text-sm text-muted-foreground/60">
            {language === "de" ? "Daten werden täglich um 23:00 Uhr gesammelt" : "Data is collected daily at 11:00 PM CET"}
          </p>
        </div>
      )}

      {/* Posts */}
      {filteredPosts.map((post, index) => {
        const IconComponent = iconMap[post.iconType] || Brain;
        const isVideoPost = post.isVideo && post.videoId;
        const borderColor = isVideoPost ? "border-l-video-accent" : (impactBorderColors[post.impact] || "border-l-transparent");

        return (
          <article
            key={post.id}
            className={`border-l-2 ${borderColor} px-3 py-3 sm:px-4 sm:py-4 cursor-pointer transition-colors hover:bg-tech-accent/5 animate-fade-up`}
            style={{ animationDelay: `${Math.min(index, 10) * 50}ms` }}
          >
            <div className="flex gap-2 sm:gap-3">
              {/* Avatar */}
              <div className={`flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full font-bold text-sm sm:text-base ${
                isVideoPost
                  ? "bg-red-600/20 text-red-600"
                  : "bg-primary/20 text-primary"
              }`}>
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
                </div>

                {/* Category & Impact (or Video Badge) */}
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  {isVideoPost ? (
                    <VideoBadge
                      duration={post.videoDuration}
                      viewCount={post.videoViewCount}
                    />
                  ) : (
                    <>
                      <Badge variant="outline" className="text-xs">
                        <IconComponent className="mr-1 h-3 w-3" />
                        {post.category}
                      </Badge>
                      <Badge className={`text-xs border ${impactColors[post.impact]}`}>
                        {t("impact")}: {impacts[post.impact as keyof typeof impacts]}
                      </Badge>
                    </>
                  )}
                </div>

                {/* Post Content */}
                <p className="mt-2 text-[15px] sm:text-base text-foreground leading-relaxed">{post.content}</p>

                {/* Video Embed */}
                {isVideoPost && post.videoId && (
                  <div className="mt-3">
                    <VideoEmbed
                      videoId={post.videoId}
                      thumbnailUrl={post.videoThumbnailUrl}
                      duration={post.videoDuration}
                      viewCount={post.videoViewCount}
                      title={post.content}
                    />
                  </div>
                )}

                {/* Tags */}
                <div className="mt-2 flex flex-wrap gap-1.5 sm:gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs sm:text-sm text-primary hover:underline cursor-pointer"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                {/* Source */}
                <div className="mt-2 flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  {post.sourceUrl ? (
                    <a
                      href={post.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary hover:underline transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {t("source")}: {post.source}
                    </a>
                  ) : (
                    <span>{t("source")}: {post.source}</span>
                  )}
                </div>

                <div className="mt-3">
                  <ShareButton
                    title={post.category}
                    text={post.content}
                    url={post.sourceUrl}
                  />
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
