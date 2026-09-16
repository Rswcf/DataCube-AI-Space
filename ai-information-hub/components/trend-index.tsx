"use client";

import Link from "next/link";
import { useId } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import { trendTopicSlug } from "@/lib/topic-utils";
import type { TrendItem } from "@/lib/types";

type TrendLabels = {
  filter: string;
  open: string;
  empty: string;
  issueIndex: string;
  posts: string;
  momentumNew: string;
  momentumRising: string;
  momentumReturning: string;
};

const labels: Record<string, TrendLabels> = {
  de: {
    filter: "Aktuelle Ansicht filtern",
    open: "Topic öffnen",
    empty: "Keine Trends verfügbar.",
    issueIndex: "Issue Index",
    posts: "Beiträge",
    momentumNew: "NEU",
    momentumRising: "Im Trend",
    momentumReturning: "Zurück",
  },
  en: {
    filter: "Filter current view",
    open: "Open topic",
    empty: "No trends available.",
    issueIndex: "Issue Index",
    posts: "posts",
    momentumNew: "NEW",
    momentumRising: "Rising",
    momentumReturning: "Back",
  },
  zh: {
    filter: "筛选当前视图",
    open: "打开话题",
    empty: "暂无趋势。",
    issueIndex: "选题索引",
    posts: "条",
    momentumNew: "新",
    momentumRising: "持续升温",
    momentumReturning: "回归",
  },
  fr: {
    filter: "Filtrer la vue actuelle",
    open: "Ouvrir le sujet",
    empty: "Aucune tendance disponible.",
    issueIndex: "Index",
    posts: "publications",
    momentumNew: "NOUVEAU",
    momentumRising: "En hausse",
    momentumReturning: "De retour",
  },
  es: {
    filter: "Filtrar vista actual",
    open: "Abrir tema",
    empty: "No hay tendencias.",
    issueIndex: "Índice",
    posts: "publicaciones",
    momentumNew: "NUEVO",
    momentumRising: "En alza",
    momentumReturning: "De vuelta",
  },
  pt: {
    filter: "Filtrar vista atual",
    open: "Abrir tópico",
    empty: "Sem tendências.",
    issueIndex: "Índice",
    posts: "publicações",
    momentumNew: "NOVO",
    momentumRising: "Em alta",
    momentumReturning: "De volta",
  },
  ja: {
    filter: "現在の表示を絞り込む",
    open: "トピックを開く",
    empty: "トレンドはありません。",
    issueIndex: "索引",
    posts: "件",
    momentumNew: "新着",
    momentumRising: "上昇中",
    momentumReturning: "再浮上",
  },
  ko: {
    filter: "현재 보기 필터링",
    open: "토픽 열기",
    empty: "트렌드가 없습니다.",
    issueIndex: "이슈 색인",
    posts: "개",
    momentumNew: "신규",
    momentumRising: "상승",
    momentumReturning: "재등장",
  },
};

/**
 * The momentum badge stays hidden until the backend computes the signal from
 * entities instead of whole trend headlines. Headlines never repeat across
 * days, so every item scored "new" on each of the six days checked
 * (2026-09-16): a badge whose whole purpose is to separate rising from new has
 * never once separated anything. Flip this back to true when
 * `_compute_momentum` keys on entities.
 */
const SHOW_MOMENTUM_BADGE: boolean = false;

function getLabels(language: string): TrendLabels {
  return labels[language] || labels.en;
}

function cleanCategory(value: string): string {
  const [category] = value.split("·");
  return (category || value).trim();
}

function fallbackCategory(title: string): string {
  if (/fund|invest|stock|finanz|capital|valuation|ipo|融资|投资|株|증시/i.test(title)) return "Capital";
  if (/policy|order|regulat|congress|trump|监管|政策|議会|규제/i.test(title)) return "Policy";
  if (/code|developer|workflow|agent|coding|编程|开发|コード|개발/i.test(title)) return "Workflows";
  return "AI";
}

function trendCategory(trend: TrendItem): string {
  const cleaned = cleanCategory(trend.category || "");
  return cleaned || fallbackCategory(trend.title || "");
}

/**
 * Where a trend chip links, or null when it should render as plain text.
 *
 * The hub is the entity the headline is about, never the headline itself: a
 * topic page needs every term of its slug to appear in one article, so
 * "/topic/nvidia-ceo-rejects-ai-slowdown-calls" could never resolve and 6 of
 * the 8 homepage chips answered 404 (2026-09-16). No `q` and no `period`
 * either — `q` overrides the slug as the match terms, and pinning the period
 * narrows the hub to a single day for no gain.
 */
function trendHref(language: string, trend: TrendItem): string | null {
  const slug = trendTopicSlug(trend.titleEn || trend.title || "");
  return slug ? `/${language}/topic/${slug}` : null;
}

type TrendIndexProps = {
  trends: TrendItem[];
  heading: string;
  language: string;
  limit?: number;
  loading?: boolean;
  compact?: boolean;
  onFilter: (query: string) => void;
};

export function TrendIndex({
  trends,
  heading,
  language,
  limit = 6,
  loading = false,
  compact = false,
  onFilter,
}: TrendIndexProps) {
  const headingId = useId();
  const copy = getLabels(language);
  const visibleTrends = trends.slice(0, limit);

  return (
    <section className={compact ? "" : "mt-4 border-t-2 border-foreground bg-card p-4"} aria-labelledby={headingId}>
      <div className={compact ? "mb-3 flex items-center justify-between gap-3" : "flex items-center justify-between gap-3 border-b border-border pb-3"}>
        <div className="min-w-0">
          <p className="font-sans text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">
            {copy.issueIndex}
          </p>
          <h2 id={headingId} className="font-sans text-[11px] font-extrabold uppercase tracking-[0.16em] text-primary">
            {heading}
          </h2>
        </div>
        <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
      </div>

      {loading && visibleTrends.length === 0 ? (
        <div className="mt-3 space-y-2" aria-hidden="true">
          {Array.from({ length: compact ? 4 : 6 }).map((_, index) => (
            <div key={index} className="h-12 animate-pulse border-b border-border bg-secondary/50" />
          ))}
        </div>
      ) : visibleTrends.length === 0 ? (
        <p className="py-6 text-sm text-muted-foreground">{copy.empty}</p>
      ) : (
        <ol className={compact ? "space-y-1" : "mt-1"}>
          {visibleTrends.map((trend, index) => {
            const title = trend.title || "";
            const href = trendHref(language, trend);
            const isLead = index === 0 && !compact;
            const category = trendCategory(trend);
            const posts = typeof trend.posts === "number" && trend.posts > 0 ? trend.posts : null;

            return (
              <li key={`${title}-${index}`}>
                <div
                  className={[
                    "group grid grid-cols-[2.9rem_minmax(0,1fr)_2.25rem] items-start gap-3 border-b border-border py-3 transition-colors hover:bg-secondary/65",
                    compact ? "px-0" : "px-0",
                    isLead ? "bg-secondary/50" : "",
                  ].join(" ")}
                >
                  <span className="select-none font-display text-3xl font-normal leading-none tabular-nums text-primary">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <div className="min-w-0">
                    <div className="mb-1 flex min-w-0 items-center gap-2">
                      <p className="truncate font-sans text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">
                        {category}
                      </p>
                      {posts ? (
                        <span className="shrink-0 border border-border px-1.5 py-0.5 font-sans text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                          {posts} {copy.posts}
                        </span>
                      ) : null}
                      {SHOW_MOMENTUM_BADGE && trend.momentum === "rising" ? (
                        <span className="shrink-0 border border-primary/50 px-1.5 py-0.5 font-sans text-[9px] font-bold uppercase tracking-[0.08em] text-primary">
                          ↑ {copy.momentumRising}
                          {typeof trend.streak === "number" && trend.streak > 1 ? ` ·${trend.streak}` : ""}
                        </span>
                      ) : SHOW_MOMENTUM_BADGE && trend.momentum === "new" ? (
                        <span className="shrink-0 border border-tips-accent/50 px-1.5 py-0.5 font-sans text-[9px] font-bold uppercase tracking-[0.08em] text-tips-accent">
                          {copy.momentumNew}
                        </span>
                      ) : SHOW_MOMENTUM_BADGE && trend.momentum === "returning" ? (
                        <span className="shrink-0 border border-border px-1.5 py-0.5 font-sans text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                          ↩ {copy.momentumReturning}
                        </span>
                      ) : null}
                    </div>
                    {/*
                      Without a resolvable hub the headline is plain text. A
                      chip that reliably answers 404 is worse for a reader than
                      one that simply does not navigate, and the filter button
                      beside it still works.
                    */}
                    {href ? (
                      <Link
                        href={href}
                        className={[
                          "block break-words font-display font-normal leading-[1.08] text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                          compact ? "text-lg" : "text-[1.35rem]",
                        ].join(" ")}
                        aria-label={`${copy.open}: ${title}`}
                      >
                        <span className="overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                          {title}
                        </span>
                      </Link>
                    ) : (
                      <p
                        className={[
                          "block break-words font-display font-normal leading-[1.08] text-foreground",
                          compact ? "text-lg" : "text-[1.35rem]",
                        ].join(" ")}
                      >
                        <span className="overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                          {title}
                        </span>
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onFilter(title)}
                    className="mt-4 flex h-8 w-8 shrink-0 items-center justify-center border border-border bg-card text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                    aria-label={`${copy.filter}: ${title}`}
                    title={copy.filter}
                  >
                    <Search aria-hidden="true" className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
