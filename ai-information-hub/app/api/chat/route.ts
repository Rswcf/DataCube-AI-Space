import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

// SEC-H2: Rate limiting note - For production, consider adding rate limiting
// via Vercel Edge Config, middleware, or a service like Upstash Redis.
// This is currently not implemented as this is an internal tool.

// SEC-H3: Allowed message roles - filter out any other roles (e.g., "system")
const ALLOWED_ROLES = new Set(["user", "assistant"]);

export async function POST(req: Request) {
  try {
    const { messages, weekContext, language } = await req.json();

    const systemPrompt = `You are the DataCube AI Hub Assistant — a concise helper for the Data Cube AI Information Hub platform.

SCOPE:
- Answer questions about this week's AI news, trends, investments, and tips shown on the platform.
- Discuss general AI industry topics (models, companies, research, tools).
- Help users navigate the platform (feeds, week selector, settings).

OFF-TOPIC:
- If a user asks about something unrelated (weather, sports, cooking, etc.), respond: "I'm focused on AI news and this platform's content. How can I help you with AI topics?"

STYLE:
- Be concise: 2-3 short paragraphs max, never exceed 300 words.
- Cite specific news items from the context when relevant.
- Respond in ${language === "de" ? "German" : "English"}.

CONTEXT — This week's AI data:
${weekContext || "No data available for this week."}`;

    // Cap message history to last 10 messages for token budget
    // SEC-H3: Filter message roles to only allow "user" and "assistant"
    const coreMessages = (messages || [])
      .filter((msg: { role: string }) => ALLOWED_ROLES.has(msg.role))
      .slice(-10)
      .map((msg: { role: string; content: string }) => ({
        role: msg.role as "user" | "assistant",
        content: typeof msg.content === "string" ? msg.content.slice(0, 10000) : "", // SEC-H2: Limit content size
      }));

    const result = streamText({
      model: openrouter.chat("z-ai/glm-4.5-air:free"),
      system: systemPrompt,
      messages: coreMessages,
      maxOutputTokens: 500,
      temperature: 0.7,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response("Error processing request", { status: 500 });
  }
}
