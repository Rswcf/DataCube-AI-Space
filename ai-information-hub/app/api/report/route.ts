import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

function condenseWeekData(
  tech: any,
  investment: any,
  tips: any,
  trends: any,
  lang: "de" | "en"
): string {
  const lines: string[] = [];

  const techItems = tech?.[lang] ?? tech?.de ?? [];
  if (techItems.length) {
    lines.push("## Tech News");
    for (const item of techItems) {
      lines.push(
        `- [${item.category || "General"}] (${item.impact || "medium"}) ${item.content ?? ""}${item.source ? ` (Source: ${item.source})` : ""}`
      );
    }
  }

  const primary =
    investment?.primaryMarket?.[lang] ?? investment?.primaryMarket?.de ?? [];
  if (primary.length) {
    lines.push("## Primary Market");
    for (const item of primary) {
      lines.push(
        `- ${item.company}: ${item.amount || "undisclosed"} (${item.round || "N/A"})`
      );
    }
  }

  const secondary =
    investment?.secondaryMarket?.[lang] ??
    investment?.secondaryMarket?.de ??
    [];
  if (secondary.length) {
    lines.push("## Secondary Market");
    for (const item of secondary) {
      lines.push(
        `- ${item.ticker}: ${item.price} (${item.direction === "up" ? "+" : ""}${item.change})`
      );
    }
  }

  const ma = investment?.ma?.[lang] ?? investment?.ma?.de ?? [];
  if (ma.length) {
    lines.push("## M&A");
    for (const item of ma) {
      lines.push(
        `- ${item.acquirer} → ${item.target}: ${item.dealValue || "undisclosed"}`
      );
    }
  }

  const tipItems = tips?.[lang] ?? tips?.de ?? [];
  if (tipItems.length) {
    lines.push("## Tips");
    for (const item of tipItems) {
      lines.push(
        `- [${item.difficulty || "General"}] ${item.tip ?? item.content ?? ""} (${item.platform || ""})`
      );
    }
  }

  const trendItems = trends?.trends?.[lang] ?? trends?.trends?.de ?? [];
  if (trendItems.length) {
    lines.push("## Trends");
    for (const item of trendItems) {
      lines.push(`- ${item.title} (${item.category || ""})`);
    }
  }

  return lines.join("\n");
}

async function fetchPeriodData(weekId: string) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL;

  const fetchOne = async (apiPath: string, staticPath: string) => {
    if (apiBase) {
      try {
        const res = await fetch(`${apiBase}${apiPath}`);
        if (res.ok) return res.json();
      } catch {
        /* fall through to static */
      }
    }
    // Static fallback — construct absolute URL from headers not available server-side,
    // so we use the API base as the primary source. Return null if unavailable.
    return null;
  };

  const [tech, investment, tips, trends] = await Promise.all([
    fetchOne(`/tech/${weekId}`, `/data/${weekId}/tech.json`),
    fetchOne(`/investment/${weekId}`, `/data/${weekId}/investment.json`),
    fetchOne(`/tips/${weekId}`, `/data/${weekId}/tips.json`),
    fetchOne(`/trends/${weekId}`, `/data/${weekId}/trends.json`),
  ]);

  return { tech, investment, tips, trends };
}

export async function POST(req: Request) {
  try {
    const { weekId, language } = await req.json();

    if (!weekId || typeof weekId !== "string") {
      return new Response("Missing or invalid weekId", { status: 400 });
    }

    const lang: "de" | "en" =
      language === "en" ? "en" : "de";

    const { tech, investment, tips, trends } = await fetchPeriodData(weekId);
    const context = condenseWeekData(tech, investment, tips, trends, lang);

    if (!context.trim()) {
      return new Response("No data available for this period", { status: 404 });
    }

    const systemPrompt = `You are a senior AI industry analyst writing a comprehensive weekly briefing report. Write in ${lang === "de" ? "German" : "English"}.

Generate a well-structured Markdown report based on the provided data. Use the following sections:

## Executive Summary
Write 2-3 paragraphs providing a high-level overview of the most significant developments this period. Highlight the key themes and their potential impact on the AI industry.

## Technology Breakthroughs
Analyze the tech news in detail. Group related developments, explain their significance, and note the impact level. Reference specific sources where available.

## Investment & Market Activity

### Primary Market (Funding Rounds)
Summarize funding rounds, noting amounts, stages, and what the companies do.

### Secondary Market (Stock Movements)
Analyze notable stock price movements and what they signal about market sentiment.

### Mergers & Acquisitions
Cover M&A activity, discussing strategic rationale and industry implications.

## Practical AI Tips
Curate the most valuable tips, adding context about when and why each tip is useful. Group by difficulty level if applicable.

## Key Trends & Outlook
Synthesize the trending topics into a forward-looking analysis. Identify patterns across the data and provide perspective on where the AI industry is heading.

---

IMPORTANT GUIDELINES:
- Base your report ONLY on the provided data. Do not fabricate information.
- If a section has no data, write "No data available for this section." and move on.
- Use professional, analytical tone suitable for business executives and tech leaders.
- Include specific numbers, company names, and details from the data.
- Keep the report comprehensive but focused — aim for quality analysis over quantity.

DATA:
${context}`;

    const result = streamText({
      model: openrouter.chat("openrouter/pony-alpha"),
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Generate the comprehensive AI briefing report for period ${weekId}.`,
        },
      ],
      maxOutputTokens: 4096,
      temperature: 0.3,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Report API error:", error);
    return new Response("Error generating report", { status: 500 });
  }
}
