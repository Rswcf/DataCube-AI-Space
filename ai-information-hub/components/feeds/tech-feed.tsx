"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Cpu, Brain, Zap, Server } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ShareButton } from "@/components/share-button";
import { VideoEmbed, VideoBadge } from "@/components/video-embed";
import { useSettings } from "@/lib/settings-context";
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
      .then((res) => res.json())
      .then((data) => {
        setPosts(data[language] || data["de"] || []);
        setLoading(false);
      })
      .catch(() => {
        // If API fails, try static JSON as fallback
        if (apiBase) {
          fetch(`/data/${weekId}/tech.json`)
            .then((res) => res.json())
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

  const weekNum = weekId.split("-kw")[1];

  return (
    <div className="divide-y divide-border">
      {/* Section Header */}
      <div className="bg-secondary/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <Cpu className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">{t("aiTechProgress")}</h3>
          <Badge variant="secondary" className="ml-auto">
            {t("week")} {weekNum}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("importantDevThisWeek")}
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredPosts.length === 0 && (
        <div className="px-4 py-12 text-center text-muted-foreground">
          {language === "de" ? "Keine Daten für diese Woche verfügbar." : "No data available for this week."}
        </div>
      )}

      {/* Posts */}
      {filteredPosts.map((post) => {
        const IconComponent = iconMap[post.iconType] || Brain;
        const isVideoPost = post.isVideo && post.videoId;

        return (
          <article
            key={post.id}
            className="px-4 py-4 transition-colors hover:bg-secondary/30"
          >
            <div className="flex gap-3">
              {/* Avatar */}
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-bold ${
                isVideoPost
                  ? "bg-red-600/20 text-red-600"
                  : "bg-primary/20 text-primary"
              }`}>
                {post.author.avatar}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Author Info */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-foreground">{post.author.name}</span>
                  {post.author.verified && (
                    <svg className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
                    </svg>
                  )}
                  <span className="text-muted-foreground">{post.author.handle}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{post.timestamp}</span>
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
                <p className="mt-2 text-foreground leading-relaxed">{post.content}</p>

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
                <div className="mt-2 flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-sm text-primary hover:underline cursor-pointer"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                {/* Source */}
                <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                  <ExternalLink className="h-3 w-3" />
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
