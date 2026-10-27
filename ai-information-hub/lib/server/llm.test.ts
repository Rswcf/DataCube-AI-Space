import { afterEach, describe, expect, it, vi } from "vitest";
import { modelChain, openrouterFetch, taskModel } from "./llm";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("task model transport", () => {
  it("pins tasks and supports a legacy rollback", () => {
    expect(modelChain("chat")[0]).toBe("qwen/qwen3.7-flash");
    expect(modelChain("report")[0]).toBe("deepseek/deepseek-v4.1-flash-1017");
    vi.stubEnv("LLM_MODEL_PROFILE", "legacy");
    expect(modelChain("report")).toEqual(["openrouter/free"]);
    vi.stubEnv("LLM_MODEL_PROFILE", "typo");
    expect(() => modelChain("chat")).toThrow();
  });

  it("adds failover, price limits and reasoning off on real SDK requests", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    const wire = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: "test", object: "chat.completion", created: 1, model: "qwen/qwen3.7-flash",
      choices: [{ index: 0, message: { role: "assistant", content: "ok" }, finish_reason: "stop" }],
      usage: { prompt_tokens: 2, completion_tokens: 1, total_tokens: 3 },
    }), { headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", wire);
    const { generateText } = await import("ai");
    const result = await generateText({ model: taskModel("report"), prompt: "test", maxOutputTokens: 4096, maxRetries: 0 });
    expect(result.text).toBe("ok");
    const body = JSON.parse(wire.mock.calls[0][1].body);
    expect(body.models).toEqual(modelChain("report"));
    expect(body.reasoning).toEqual({ enabled: false });
    expect(body.provider.order).toEqual(["deepinfra/fp8"]);
    expect(body.provider.allow_fallbacks).toBe(true);
    expect(body.provider.max_price).toEqual({ prompt: .23, completion: .92 });
    expect(body.max_tokens ?? body.max_completion_tokens).toBe(4096);
    expect(body.models).not.toContain("openrouter/free");
  });

  it("keeps legacy routing free and rejects unexpected request shapes", async () => {
    const wire = vi.fn().mockResolvedValue(new Response("ok"));
    vi.stubGlobal("fetch", wire);
    await openrouterFetch("https://example.test", { body: JSON.stringify({ model: "openrouter/free" }) });
    const body = JSON.parse(wire.mock.calls[0][1].body);
    expect(body.models).toEqual(["openrouter/free"]);
    expect(body.provider).toBeUndefined();
    await expect(openrouterFetch("https://example.test")).rejects.toThrow();
  });
});
