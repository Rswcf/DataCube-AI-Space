"use client";

import { useEffect, useState } from "react";
import { MessageCircle, Repeat2, Heart, BarChart2, Bookmark, Share, Lightbulb, Copy, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/lib/settings-context";

interface TipsFeedProps {
  weekId: string;
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

export function TipsFeed({ weekId }: TipsFeedProps) {
  const { language, t } = useSettings();
  const [posts, setPosts] = useState<TipPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/data/${weekId}/tips.json`)
      .then((res) => res.json())
      .then((data) => {
        setPosts(data[language] || data["de"] || []);
        setLoading(false);
      })
      .catch(() => {
        setPosts([]);
        setLoading(false);
      });
  }, [weekId, language]);

  const handleCopy = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const weekNum = weekId.split("-kw")[1];

  return (
    <div className="divide-y divide-border">
      {/* Section Header */}
      <div className="bg-secondary/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-chart-3" />
          <h3 className="font-semibold text-foreground">{t("practicalTipsTitle")}</h3>
          <Badge variant="secondary" className="ml-auto">
            {t("week")} {weekNum}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("handsOnTipsFrom")}
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {/* Empty State */}
      {!loading && posts.length === 0 && (
        <div className="px-4 py-12 text-center text-muted-foreground">
          {language === "de" ? "Keine Daten für diese Woche verfügbar." : "No data available for this week."}
        </div>
      )}

      {/* Tips Posts */}
      {posts.map((post) => (
        <article
          key={post.id}
          className="px-4 py-4 transition-colors hover:bg-secondary/30 cursor-pointer"
        >
          <div className="flex gap-3">
            {/* Avatar */}
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-chart-3/20 text-chart-3 font-bold">
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
              <p className="mt-2 text-foreground leading-relaxed">{post.content}</p>

              {/* Tip Code Block */}
              <div className="mt-3 rounded-lg border border-border bg-secondary/50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <pre className="flex-1 overflow-x-auto whitespace-pre-wrap text-sm font-mono text-foreground">
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

              {/* Metrics */}
              <div className="mt-3 flex items-center justify-between max-w-md">
                <button className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors group">
                  <div className="rounded-full p-2 group-hover:bg-primary/10">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  <span className="text-sm">{post.metrics.comments}</span>
                </button>
                <button className="flex items-center gap-2 text-muted-foreground hover:text-accent transition-colors group">
                  <div className="rounded-full p-2 group-hover:bg-accent/10">
                    <Repeat2 className="h-4 w-4" />
                  </div>
                  <span className="text-sm">{post.metrics.retweets}</span>
                </button>
                <button className="flex items-center gap-2 text-muted-foreground hover:text-destructive transition-colors group">
                  <div className="rounded-full p-2 group-hover:bg-destructive/10">
                    <Heart className="h-4 w-4" />
                  </div>
                  <span className="text-sm">{post.metrics.likes}</span>
                </button>
                <button className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors group">
                  <div className="rounded-full p-2 group-hover:bg-primary/10">
                    <BarChart2 className="h-4 w-4" />
                  </div>
                  <span className="text-sm">{post.metrics.views}</span>
                </button>
                <div className="flex items-center gap-1">
                  <button className="rounded-full p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                    <Bookmark className="h-4 w-4" />
                  </button>
                  <button className="rounded-full p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                    <Share className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
