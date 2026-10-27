import { createOpenAI } from "@ai-sdk/openai";

const DEEPSEEK = "deepseek/deepseek-v4.1-flash-1017";
const QWEN = "qwen/qwen3.7-flash";

export function modelChain(task: "chat" | "report"): string[] {
  const profile = process.env.LLM_MODEL_PROFILE || "balanced";
  if (profile === "legacy") return ["openrouter/free"];
  if (profile !== "balanced") throw new Error("Invalid LLM_MODEL_PROFILE");
  // User messages never fall back to a random free provider.
  return task === "chat" ? [QWEN, DEEPSEEK] : [DEEPSEEK, QWEN];
}

// OpenAI's SDK schema strips OpenRouter-specific fields. Add them at the
// transport boundary so server-side failover also works before streaming starts.
export const openrouterFetch: typeof fetch = async (input, init) => {
  if (typeof init?.body !== "string") throw new Error("Expected OpenRouter JSON body");
  const body = JSON.parse(init.body);
  if (![DEEPSEEK, QWEN, "openrouter/free"].includes(body.model)) {
    throw new Error("Unexpected OpenRouter model");
  }
  body.models = body.model === "openrouter/free" ? [body.model]
    : body.model === QWEN ? [QWEN, DEEPSEEK] : [DEEPSEEK, QWEN];
  body.reasoning = { enabled: false };
  if (body.model !== "openrouter/free") {
    body.provider = {
      allow_fallbacks: true,
      max_price: { prompt: 0.23, completion: 0.92 },
      ...(body.model === DEEPSEEK ? { order: ["deepinfra/fp8"] } : {}),
    };
  }
  return fetch(input, { ...init, body: JSON.stringify(body) });
};

export function taskModel(task: "chat" | "report") {
  const openrouter = createOpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    fetch: openrouterFetch,
  });
  return openrouter.chat(modelChain(task)[0]);
}
