import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { messages, weekContext, language } = await req.json();

    const systemPrompt = `You are a helpful AI assistant for the Data Cube AI Information Hub. You help users understand the weekly AI news and trends.

Current week data context:
${weekContext || "No data available"}

IMPORTANT: Always respond in ${language === "de" ? "German" : "English"}.
Be concise and helpful. When referring to specific news items, cite them clearly.`;

    // Messages are already in {role, content} format from our custom hook
    const coreMessages = (messages || []).map((msg: { role: string; content: string }) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));

    const result = streamText({
      model: openrouter("deepseek/deepseek-chat"),
      system: systemPrompt,
      messages: coreMessages,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response("Error processing request", { status: 500 });
  }
}
