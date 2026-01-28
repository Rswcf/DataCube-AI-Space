"use client";

import { useState } from "react";
import {
  Brain,
  Cpu,
  Layers,
  Rocket,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const techUpdates = [
  {
    id: 1,
    category: "Large Language Models",
    icon: Brain,
    title: "GPT-5 Achieves New Benchmark Records",
    description:
      "OpenAI's latest model demonstrates 40% improvement in reasoning tasks and introduces native multimodal capabilities with real-time processing.",
    source: "OpenAI Blog",
    date: "Jan 24, 2026",
    impact: "High",
    tags: ["LLM", "Reasoning", "Multimodal"],
  },
  {
    id: 2,
    category: "Computer Vision",
    icon: Layers,
    title: "Meta Releases Segment Anything 3",
    description:
      "New foundation model for image segmentation achieves SOTA performance with 10x inference speed improvement, enabling real-time video applications.",
    source: "Meta AI Research",
    date: "Jan 23, 2026",
    impact: "High",
    tags: ["Vision", "Segmentation", "Real-time"],
  },
  {
    id: 3,
    category: "AI Infrastructure",
    icon: Cpu,
    title: "NVIDIA Blackwell Ultra Ships to Data Centers",
    description:
      "Next-gen AI accelerators begin mass deployment with 2.5x performance per watt improvement and enhanced memory bandwidth for trillion-parameter models.",
    source: "NVIDIA Newsroom",
    date: "Jan 22, 2026",
    impact: "Medium",
    tags: ["Hardware", "GPU", "Training"],
  },
  {
    id: 4,
    category: "AI Agents",
    icon: Rocket,
    title: "Anthropic Launches Claude Operator for Enterprise",
    description:
      "Autonomous AI agent framework enables complex multi-step workflows with built-in safety constraints and audit capabilities for regulated industries.",
    source: "Anthropic Research",
    date: "Jan 21, 2026",
    impact: "High",
    tags: ["Agents", "Enterprise", "Automation"],
  },
];

const impactColors: Record<string, string> = {
  High: "bg-accent/10 text-accent border-accent/30",
  Medium: "bg-primary/10 text-primary border-primary/30",
  Low: "bg-muted text-muted-foreground border-border",
};

export function TechProgressSection() {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <section id="tech" className="border-b border-border bg-background py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-12">
          <div className="flex items-center gap-2">
            <div className="h-1 w-8 rounded-full bg-primary" />
            <span className="text-sm font-medium uppercase tracking-wider text-primary">
              Section 01
            </span>
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Technology Progress
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Key AI research breakthroughs and technical advancements from the past week, curated for strategic relevance.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {techUpdates.map((update) => {
            const Icon = update.icon;
            const isExpanded = expandedId === update.id;

            return (
              <Card
                key={update.id}
                className={`group cursor-pointer transition-all duration-300 ${
                  isExpanded
                    ? "border-primary/50 bg-card/80"
                    : "hover:border-border/80"
                }`}
                onClick={() => setExpandedId(isExpanded ? null : update.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          {update.category}
                        </span>
                        <CardTitle className="mt-1 text-lg leading-tight text-foreground">
                          {update.title}
                        </CardTitle>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={impactColors[update.impact]}
                    >
                      {update.impact} Impact
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed text-muted-foreground">
                    {update.description}
                  </CardDescription>

                  {/* Tags */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {update.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="bg-secondary text-secondary-foreground"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="mt-6 border-t border-border pt-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {update.source}
                          </span>{" "}
                          · {update.date}
                        </div>
                        <Button variant="ghost" size="sm" className="gap-2">
                          Read Full Report
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Expand Indicator */}
                  <div className="mt-4 flex items-center gap-1 text-xs text-muted-foreground">
                    <ChevronRight
                      className={`h-4 w-4 transition-transform ${
                        isExpanded ? "rotate-90" : ""
                      }`}
                    />
                    <span>
                      {isExpanded ? "Click to collapse" : "Click to expand"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
