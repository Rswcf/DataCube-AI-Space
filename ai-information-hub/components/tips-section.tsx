"use client";

import { useState } from "react";
import {
  Lightbulb,
  Twitter,
  MessageCircle,
  ExternalLink,
  Heart,
  MessageSquare,
  Repeat2,
  Copy,
  Check,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const tips = [
  {
    id: 1,
    source: "X (Twitter)",
    sourceIcon: Twitter,
    author: "@karpathy",
    authorName: "Andrej Karpathy",
    title: "Prompt Engineering for Code Generation",
    content:
      "When using Claude/GPT for code, always provide: 1) Clear context about the codebase 2) Specific error messages if debugging 3) Expected vs actual behavior. Ask for explanations, not just solutions. Your learning compounds.",
    likes: 12400,
    comments: 892,
    reposts: 3200,
    category: "Prompting",
    difficulty: "Beginner",
  },
  {
    id: 2,
    source: "Reddit",
    sourceIcon: MessageCircle,
    author: "u/localllama",
    authorName: "r/LocalLLaMA",
    title: "Running Llama 3.1 70B on Consumer Hardware",
    content:
      "GGUF quantization with Q4_K_M gives 90% of full precision quality. Use llama.cpp with CUDA offloading. 32GB VRAM = full 70B inference. 24GB = partial offload + RAM. Context length is the real bottleneck, not model size.",
    likes: 4500,
    comments: 234,
    reposts: 890,
    category: "Local AI",
    difficulty: "Advanced",
  },
  {
    id: 3,
    source: "X (Twitter)",
    sourceIcon: Twitter,
    author: "@swyx",
    authorName: "swyx",
    title: "AI-First Development Workflow",
    content:
      "My 2026 dev stack: Cursor for code, Claude for architecture, Perplexity for research, NotebookLM for docs. Key insight: AI tools work better when you feed them YOUR context, not generic questions. Build a personal knowledge base.",
    likes: 8900,
    comments: 567,
    reposts: 2100,
    category: "Productivity",
    difficulty: "Intermediate",
  },
  {
    id: 4,
    source: "Reddit",
    sourceIcon: MessageCircle,
    author: "u/mlops_engineer",
    authorName: "r/MachineLearning",
    title: "RAG Pipeline Optimization",
    content:
      "Hybrid search (BM25 + semantic) outperforms pure vector search by 15-20%. Use chunk overlap of 10-15%. Re-ranking with cross-encoders is worth the latency cost. Cache embeddings aggressively. Test with real user queries, not synthetic ones.",
    likes: 3200,
    comments: 189,
    reposts: 670,
    category: "Engineering",
    difficulty: "Advanced",
  },
  {
    id: 5,
    source: "X (Twitter)",
    sourceIcon: Twitter,
    author: "@emollick",
    authorName: "Ethan Mollick",
    title: "Structured Output Techniques",
    content:
      "For consistent AI outputs: Use explicit schemas, provide examples in your prompt, ask for JSON/markdown formatting, add validation steps. Most 'inconsistent AI' problems are actually prompt engineering problems.",
    likes: 6700,
    comments: 423,
    reposts: 1800,
    category: "Prompting",
    difficulty: "Beginner",
  },
  {
    id: 6,
    source: "X (Twitter)",
    sourceIcon: Twitter,
    author: "@simonw",
    authorName: "Simon Willison",
    title: "LLM Context Window Management",
    content:
      "Long context windows are expensive. Solution: summarize as you go, use sliding windows with overlap, store critical info at start AND end of prompt (due to attention patterns). Context engineering > context stuffing.",
    likes: 5400,
    comments: 312,
    reposts: 1400,
    category: "Engineering",
    difficulty: "Intermediate",
  },
];

const difficultyColors: Record<string, string> = {
  Beginner: "bg-accent/10 text-accent border-accent/30",
  Intermediate: "bg-primary/10 text-primary border-primary/30",
  Advanced: "bg-chart-4/20 text-chart-4 border-chart-4/30",
};

function formatNumber(num: number): string {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}

export function TipsSection() {
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const handleCopy = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <section id="tips" className="bg-background py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-12">
          <div className="flex items-center gap-2">
            <div className="h-1 w-8 rounded-full bg-chart-3" />
            <span className="text-sm font-medium uppercase tracking-wider text-chart-3">
              Section 03
            </span>
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Hands-on AI Tips
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Practical implementation insights curated from X, Reddit, and other developer communities. Battle-tested by practitioners.
          </p>
        </div>

        {/* Tips Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tips.map((tip) => {
            const SourceIcon = tip.sourceIcon;

            return (
              <Card
                key={tip.id}
                className="group flex flex-col transition-all hover:border-border/80"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <SourceIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">
                        {tip.source}
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className={difficultyColors[tip.difficulty]}
                    >
                      {tip.difficulty}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                      {tip.authorName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {tip.authorName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tip.author}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <CardTitle className="mb-3 text-base leading-tight text-foreground">
                    {tip.title}
                  </CardTitle>
                  <CardDescription className="text-sm leading-relaxed text-muted-foreground">
                    {tip.content}
                  </CardDescription>
                  <Badge className="mt-4 bg-secondary text-secondary-foreground">
                    {tip.category}
                  </Badge>
                </CardContent>
                <CardFooter className="border-t border-border pt-4">
                  <div className="flex w-full items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Heart className="h-3.5 w-3.5" />
                        {formatNumber(tip.likes)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3.5 w-3.5" />
                        {formatNumber(tip.comments)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Repeat2 className="h-3.5 w-3.5" />
                        {formatNumber(tip.reposts)}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                      onClick={() => handleCopy(tip.content, tip.id)}
                    >
                      {copiedId === tip.id ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Source Links */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
          <span className="text-sm text-muted-foreground">
            Curated from:
          </span>
          <Button variant="outline" size="sm" className="gap-2 bg-transparent">
            <Twitter className="h-4 w-4" />
            X / Twitter
            <ExternalLink className="h-3 w-3" />
          </Button>
          <Button variant="outline" size="sm" className="gap-2 bg-transparent">
            <MessageCircle className="h-4 w-4" />
            Reddit
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </section>
  );
}
